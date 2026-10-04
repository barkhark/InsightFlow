"""
InsightFlow — Staff Queue ViewSet + Notification ViewSet

Staff endpoints:
  GET  /api/v1/staff/queue/              → requests in staff's department stages
  GET  /api/v1/staff/queue/{id}/         → full request detail
  POST /api/v1/staff/queue/{id}/transition/ → advance/reject a request
  POST /api/v1/staff/queue/{id}/comments/  → add comment (can be internal)
  POST /api/v1/staff/queue/{id}/assign/    → reassign to another staff

Notification endpoints (student + staff):
  GET  /api/v1/notifications/           → unread + recent notifications
  POST /api/v1/notifications/mark-read/ → mark notification IDs as read
  GET  /api/v1/notifications/count/     → unread count (for polling, 60s)

Service Category endpoints (public, for form rendering):
  GET  /api/v1/service-areas/           → list active areas
  GET  /api/v1/service-categories/      → list active categories
  GET  /api/v1/service-categories/{id}/ → detail + dynamic field schema
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated

from core.permissions import IsStaff, IsStaffOrAdmin
from core.workflow_engine import WorkflowEngine, WorkflowValidationError
from apps.requests.models import ServiceRequest
from apps.assignments.models import Assignment
from apps.comments.models import Comment
from apps.audit.models import AuditRecord
from apps.notifications.models import Notification
from apps.notifications.service import NotificationService
from apps.services.models import ServiceArea, ServiceCategory
from .serializers.request_serializers import (
    RequestListSerializer, RequestDetailSerializer,
    TransitionSerializer, CommentSerializer,
    ServiceAreaSerializer, ServiceCategoryListSerializer, ServiceCategoryDetailSerializer,
    NotificationSerializer
)


class StaffQueueViewSet(viewsets.GenericViewSet):
    """
    Staff-scoped request queue.
    Scope: Only requests whose current_stage.responsible_department == actor's department.
    """
    permission_classes = [IsStaffOrAdmin]

    def _get_staff_department(self, user):
        if user.role == 'admin':
            return None  # Admin sees all
        try:
            return user.staff_profile.department
        except Exception:
            return None

    def get_queryset(self):
        user = self.request.user
        dept = self._get_staff_department(user)
        qs = ServiceRequest.objects.select_related(
            'service_category__service_area',
            'current_stage__responsible_department',
            'student',
        ).prefetch_related('assignments').order_by('-created_at')

        if dept is not None:
            qs = qs.filter(current_stage__responsible_department=dept)

        # Staff queue shows active (non-terminal) requests by default
        show_terminal = self.request.query_params.get('include_terminal', '').lower() == 'true'
        if not show_terminal:
            qs = qs.exclude(status__in=['resolved', 'rejected', 'closed', 'cancelled'])

        return qs

    def list(self, request):
        """GET /api/v1/staff/queue/"""
        qs = self.get_queryset()

        # Filtering
        for param, field in [('status', 'status'), ('priority', 'priority')]:
            val = request.query_params.get(param)
            if val:
                qs = qs.filter(**{field: val})

        from core.pagination import StandardPagination
        paginator = StandardPagination()
        page = paginator.paginate_queryset(qs, request)
        if page is not None:
            return paginator.get_paginated_response(
                RequestListSerializer(page, many=True, context={'request': request}).data
            )
        return Response({'success': True, 'data': RequestListSerializer(qs, many=True, context={'request': request}).data})

    def retrieve(self, request, pk=None):
        """GET /api/v1/staff/queue/{id}/"""
        try:
            qs = ServiceRequest.objects.select_related(
                'service_category', 'current_stage__responsible_department',
                'student__student_profile', 'workflow'
            ).prefetch_related(
                'stage_history__stage', 'audit_records__actor',
                'comments__author', 'attachments',
                'current_stage__allowed_next_stages__responsible_department',
                'assignments',
            )
            dept = self._get_staff_department(request.user)
            if dept:
                obj = qs.get(id=pk, current_stage__responsible_department=dept)
            else:
                obj = qs.get(id=pk)
        except ServiceRequest.DoesNotExist:
            return Response({
                'success': False, 'data': None,
                'error': {'code': 'NOT_FOUND', 'message': 'Request not found.', 'details': None}
            }, status=status.HTTP_404_NOT_FOUND)

        return Response({'success': True, 'data': RequestDetailSerializer(obj, context={'request': request}).data})

    @action(detail=True, methods=['post'], url_path='transition')
    def transition(self, request, pk=None):
        """POST /api/v1/staff/queue/{id}/transition/"""
        try:
            service_request = ServiceRequest.objects.select_related(
                'current_stage__responsible_department',
                'current_stage__sla_config',
                'workflow', 'student',
            ).get(id=pk)
        except ServiceRequest.DoesNotExist:
            return Response({
                'success': False, 'data': None,
                'error': {'code': 'NOT_FOUND', 'message': 'Request not found.', 'details': None}
            }, status=status.HTTP_404_NOT_FOUND)

        dept = self._get_staff_department(request.user)
        if dept and service_request.current_stage and service_request.current_stage.responsible_department_id != dept.id:
            return Response({
                'success': False, 'data': None,
                'error': {
                    'code': 'FORBIDDEN',
                    'message': 'You do not have permission to manage requests outside your department.',
                    'details': None
                }
            }, status=status.HTTP_403_FORBIDDEN)

        serializer = TransitionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        target_stage = serializer.validated_data['target_stage_id']
        note = serializer.validated_data.get('note', '')

        engine = WorkflowEngine()
        try:
            engine.execute_transition(service_request, target_stage, request.user, note=note)
        except WorkflowValidationError as e:
            return Response({
                'success': False, 'data': None,
                'error': {'code': 'TRANSITION_INVALID', 'message': str(e), 'details': None}
            }, status=status.HTTP_400_BAD_REQUEST)

        service_request.refresh_from_db()
        return Response({
            'success': True,
            'data': {
                'reference_number': service_request.reference_number,
                'new_status': service_request.status,
                'new_stage': service_request.current_stage.name,
            },
            'message': f'Request transitioned to "{service_request.current_stage.name}" successfully.'
        })

    @action(detail=True, methods=['get', 'post'], url_path='comments')
    def comments(self, request, pk=None):
        """GET/POST /api/v1/staff/queue/{id}/comments/ — staff can post internal comments."""
        try:
            service_request = ServiceRequest.objects.select_related(
                'current_stage__responsible_department'
            ).get(id=pk)
        except ServiceRequest.DoesNotExist:
            return Response({'success': False, 'data': None,
                             'error': {'code': 'NOT_FOUND', 'message': 'Not found.', 'details': None}},
                            status=status.HTTP_404_NOT_FOUND)

        dept = self._get_staff_department(request.user)
        if dept and service_request.current_stage and service_request.current_stage.responsible_department_id != dept.id:
            return Response({
                'success': False, 'data': None,
                'error': {
                    'code': 'FORBIDDEN',
                    'message': 'You do not have permission to access requests outside your department.',
                    'details': None
                }
            }, status=status.HTTP_403_FORBIDDEN)

        if request.method == 'GET':
            qs = service_request.comments.filter(is_deleted=False)
            return Response({'success': True, 'data': CommentSerializer(qs, many=True).data})

        serializer = CommentSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        comment = Comment.objects.create(
            request=service_request,
            author=request.user,
            body=serializer.validated_data['body'],
            is_internal=serializer.validated_data.get('is_internal', False),
        )
        AuditRecord.objects.create(
            request=service_request, actor=request.user,
            action=AuditRecord.Action.COMMENT_ADDED,
            description=f'{request.user.full_name} added a {"internal " if comment.is_internal else ""}comment.',
            is_student_visible=not comment.is_internal,
        )
        NotificationService().notify_comment_added(comment)
        return Response({'success': True, 'data': CommentSerializer(comment).data}, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'], url_path='assign')
    def assign(self, request, pk=None):
        """POST /api/v1/staff/queue/{id}/assign/ — reassign to another staff member."""
        from apps.accounts.models import User
        try:
            service_request = ServiceRequest.objects.select_related(
                'current_stage__responsible_department'
            ).get(id=pk)
        except ServiceRequest.DoesNotExist:
            return Response({'success': False, 'data': None,
                             'error': {'code': 'NOT_FOUND', 'message': 'Not found.', 'details': None}},
                            status=status.HTTP_404_NOT_FOUND)

        dept = self._get_staff_department(request.user)
        if dept and service_request.current_stage and service_request.current_stage.responsible_department_id != dept.id:
            return Response({
                'success': False, 'data': None,
                'error': {
                    'code': 'FORBIDDEN',
                    'message': 'You do not have permission to assign requests outside your department.',
                    'details': None
                }
            }, status=status.HTTP_403_FORBIDDEN)

        assignee_id = request.data.get('assignee_id')
        try:
            assignee = User.objects.get(id=assignee_id, role='staff', is_active=True)
        except User.DoesNotExist:
            return Response({'success': False, 'data': None,
                             'error': {'code': 'INVALID_ASSIGNEE', 'message': 'Staff member not found.', 'details': None}},
                            status=status.HTTP_400_BAD_REQUEST)

        if dept:
            try:
                if assignee.staff_profile.department_id != dept.id:
                    return Response({
                        'success': False, 'data': None,
                        'error': {'code': 'INVALID_ASSIGNEE', 'message': 'Staff member must belong to your department.', 'details': None}
                    }, status=status.HTTP_400_BAD_REQUEST)
            except Exception:
                return Response({
                    'success': False, 'data': None,
                    'error': {'code': 'INVALID_ASSIGNEE', 'message': 'Staff member has no department assigned.', 'details': None}
                }, status=status.HTTP_400_BAD_REQUEST)

        # Close current assignment
        Assignment.objects.filter(request=service_request, is_current=True).update(is_current=False)
        Assignment.objects.create(
            request=service_request,
            assigned_to=assignee,
            assigned_by=request.user,
            note=request.data.get('note', ''),
            is_current=True,
        )
        AuditRecord.objects.create(
            request=service_request, actor=request.user,
            action=AuditRecord.Action.REASSIGNMENT,
            description=f'Request reassigned to {assignee.full_name} by {request.user.full_name}.',
            is_student_visible=False,
        )
        NotificationService().notify_assignment(service_request, assignee, request.user)
        return Response({'success': True, 'data': None, 'message': f'Assigned to {assignee.full_name}.'})


# ── Service Category Views (Public — for student form rendering) ────────────

class ServiceAreaListView(APIView):
    """GET /api/v1/service-areas/ — list active service areas."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        areas = ServiceArea.objects.filter(is_active=True).order_by('order', 'name')
        return Response({'success': True, 'data': ServiceAreaSerializer(areas, many=True).data})


class ServiceCategoryListView(APIView):
    """GET /api/v1/service-categories/ — list active categories, filter by area."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = ServiceCategory.objects.filter(is_active=True).select_related('service_area', 'owning_department')
        area_id = request.query_params.get('area_id')
        if area_id:
            qs = qs.filter(service_area_id=area_id)
        return Response({'success': True, 'data': ServiceCategoryListSerializer(qs, many=True).data})


class ServiceCategoryDetailView(APIView):
    """GET /api/v1/service-categories/{id}/ — full detail with dynamic fields."""
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        try:
            cat = ServiceCategory.objects.select_related(
                'service_area', 'owning_department', 'workflow'
            ).prefetch_related('dynamic_fields').get(id=pk, is_active=True)
        except ServiceCategory.DoesNotExist:
            return Response({'success': False, 'data': None,
                             'error': {'code': 'NOT_FOUND', 'message': 'Not found.', 'details': None}},
                            status=status.HTTP_404_NOT_FOUND)
        return Response({'success': True, 'data': ServiceCategoryDetailSerializer(cat).data})


# ── Notification Views ──────────────────────────────────────

class NotificationListView(APIView):
    """
    GET /api/v1/notifications/
    Returns last 50 notifications for the authenticated user.
    Designed for 60-second polling (Q3 decision).
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = Notification.objects.filter(
            recipient=request.user
        ).select_related('request').order_by('-created_at')[:50]

        unread_count = Notification.objects.filter(
            recipient=request.user, is_read=False
        ).count()

        return Response({
            'success': True,
            'data': NotificationSerializer(qs, many=True).data,
            'meta': {'unread_count': unread_count}
        })


class NotificationMarkReadView(APIView):
    """POST /api/v1/notifications/mark-read/ → mark notification IDs as read."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        ids = request.data.get('ids', [])
        if ids == 'all':
            Notification.objects.filter(recipient=request.user, is_read=False).update(is_read=True)
            return Response({'success': True, 'data': None, 'message': 'All notifications marked read.'})

        if isinstance(ids, list) and ids:
            Notification.objects.filter(
                recipient=request.user, id__in=ids
            ).update(is_read=True)
            return Response({'success': True, 'data': None, 'message': f'{len(ids)} notification(s) marked read.'})

        return Response({'success': False, 'data': None,
                         'error': {'code': 'INVALID_INPUT', 'message': 'Provide "ids" list or "all".', 'details': None}},
                        status=status.HTTP_400_BAD_REQUEST)


class NotificationCountView(APIView):
    """
    GET /api/v1/notifications/count/
    Lightweight polling endpoint — returns only unread count.
    Frontend calls this every 60 seconds.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        count = Notification.objects.filter(recipient=request.user, is_read=False).count()
        return Response({'success': True, 'data': {'unread_count': count}})
