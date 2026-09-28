"""
InsightFlow — Student Request ViewSet

Endpoints accessible by students:
  GET    /api/v1/requests/               → list own requests
  POST   /api/v1/requests/               → submit new request
  GET    /api/v1/requests/{id}/          → request detail + timeline
  GET    /api/v1/requests/{id}/comments/ → comments (public only)
  POST   /api/v1/requests/{id}/comments/ → add comment
  POST   /api/v1/requests/{id}/attachments/ → upload attachment (while active, Q5)

All data is scoped to the authenticated student — never returns other students' requests.
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django.db import transaction

from core.permissions import IsStudent
from core.workflow_engine import WorkflowEngine
from core.utils import generate_reference_number
from apps.requests.models import ServiceRequest
from apps.comments.models import Comment
from apps.attachments.models import Attachment
from apps.audit.models import AuditRecord
from apps.notifications.service import NotificationService
from .serializers.request_serializers import (
    CreateRequestSerializer, RequestListSerializer,
    RequestDetailSerializer, CommentSerializer, AttachmentSerializer
)


class StudentRequestViewSet(viewsets.GenericViewSet):
    """Student-scoped request operations."""
    permission_classes = [IsStudent]

    def get_queryset(self):
        return ServiceRequest.objects.filter(
            student=self.request.user
        ).select_related(
            'service_category__service_area',
            'service_category__owning_department',
            'current_stage__responsible_department',
            'workflow',
        ).prefetch_related(
            'stage_history__stage', 'attachments', 'comments__author'
        ).order_by('-created_at')

    def list(self, request):
        """GET /api/v1/requests/ — paginated list of own requests with live SLA."""
        qs = self.get_queryset()

        # Filtering
        status_filter = request.query_params.get('status')
        if status_filter:
            qs = qs.filter(status=status_filter)

        page = self.paginator.paginate_queryset(qs, request)
        if page is not None:
            serializer = RequestListSerializer(page, many=True, context={'request': request})
            return self.paginator.get_paginated_response(serializer.data)

        serializer = RequestListSerializer(qs, many=True, context={'request': request})
        return Response({'success': True, 'data': serializer.data})

    @property
    def paginator(self):
        if not hasattr(self, '_paginator'):
            from core.pagination import StandardPagination
            self._paginator = StandardPagination()
        return self._paginator

    def retrieve(self, request, pk=None):
        """GET /api/v1/requests/{id}/ — full detail with timeline."""
        try:
            obj = ServiceRequest.objects.select_related(
                'service_category__service_area',
                'service_category__owning_department',
                'current_stage__responsible_department__head',
                'student__student_profile',
                'workflow',
            ).prefetch_related(
                'stage_history__stage__responsible_department',
                'stage_history__transitioned_by',
                'audit_records__actor',
                'comments__author',
                'attachments__uploaded_by',
                'current_stage__allowed_next_stages',
            ).get(id=pk, student=request.user)
        except ServiceRequest.DoesNotExist:
            return Response({
                'success': False, 'data': None,
                'error': {'code': 'NOT_FOUND', 'message': 'Request not found.', 'details': None}
            }, status=status.HTTP_404_NOT_FOUND)

        serializer = RequestDetailSerializer(obj, context={'request': request})
        return Response({'success': True, 'data': serializer.data})

    @transaction.atomic
    def create(self, request):
        """POST /api/v1/requests/ — submit a new service request."""
        serializer = CreateRequestSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)

        category = serializer.validated_data['service_category']
        ref = generate_reference_number()

        service_request = ServiceRequest.objects.create(
            reference_number=ref,
            student=request.user,
            service_category=category,
            workflow=category.workflow,
            title=serializer.validated_data['title'],
            details=serializer.validated_data['details'],
            dynamic_fields_data=serializer.validated_data.get('dynamic_fields_data', {}),
            priority=category.default_priority,
        )

        engine = WorkflowEngine()
        engine.initialise_request(service_request, request.user)

        return Response({
            'success': True,
            'data': {'id': str(service_request.id), 'reference_number': ref},
            'message': f'Request {ref} submitted successfully.'
        }, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['get', 'post'], url_path='comments')
    def comments(self, request, pk=None):
        """GET/POST /api/v1/requests/{id}/comments/"""
        service_request = self._get_own_request(request, pk)
        if service_request is None:
            return self._not_found()

        if request.method == 'GET':
            qs = service_request.comments.filter(is_deleted=False, is_internal=False)
            return Response({
                'success': True,
                'data': CommentSerializer(qs, many=True).data
            })

        # POST — add comment
        serializer = CommentSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)

        comment = Comment.objects.create(
            request=service_request,
            author=request.user,
            body=serializer.validated_data['body'],
            is_internal=False,  # students cannot post internal comments
        )

        AuditRecord.objects.create(
            request=service_request,
            actor=request.user,
            action=AuditRecord.Action.COMMENT_ADDED,
            description=f'{request.user.full_name} added a comment.',
            is_student_visible=True,
        )

        NotificationService().notify_comment_added(comment)

        return Response({
            'success': True,
            'data': CommentSerializer(comment).data
        }, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'], url_path='attachments',
            parser_classes=[MultiPartParser, FormParser])
    def attachments(self, request, pk=None):
        """POST /api/v1/requests/{id}/attachments/ — upload file (Q5: while active only)."""
        service_request = self._get_own_request(request, pk)
        if service_request is None:
            return self._not_found()

        if not service_request.is_open_for_attachments:
            return Response({
                'success': False, 'data': None,
                'error': {
                    'code': 'REQUEST_CLOSED',
                    'message': 'Attachments cannot be added to a closed or resolved request.',
                    'details': None
                }
            }, status=status.HTTP_400_BAD_REQUEST)

        uploaded_file = request.FILES.get('file')
        if not uploaded_file:
            return Response({
                'success': False, 'data': None,
                'error': {'code': 'NO_FILE', 'message': 'No file provided.', 'details': None}
            }, status=status.HTTP_400_BAD_REQUEST)

        import os
        ext = os.path.splitext(uploaded_file.name)[1].lower()
        if ext not in Attachment.ALLOWED_EXTENSIONS:
            return Response({
                'success': False, 'data': None,
                'error': {
                    'code': 'INVALID_FILE_TYPE',
                    'message': f'File type {ext} not allowed. '
                               f'Allowed: {", ".join(Attachment.ALLOWED_EXTENSIONS)}',
                    'details': None
                }
            }, status=status.HTTP_400_BAD_REQUEST)

        if uploaded_file.size > Attachment.MAX_SIZE_MB * 1024 * 1024:
            return Response({
                'success': False, 'data': None,
                'error': {
                    'code': 'FILE_TOO_LARGE',
                    'message': f'File exceeds the {Attachment.MAX_SIZE_MB}MB limit.',
                    'details': None
                }
            }, status=status.HTTP_400_BAD_REQUEST)

        attachment = Attachment.objects.create(
            request=service_request,
            uploaded_by=request.user,
            file=uploaded_file,
            original_filename=uploaded_file.name,
            file_size_bytes=uploaded_file.size,
            mime_type=uploaded_file.content_type or '',
        )

        AuditRecord.objects.create(
            request=service_request,
            actor=request.user,
            action=AuditRecord.Action.ATTACHMENT_UPLOADED,
            description=f'{request.user.full_name} uploaded "{uploaded_file.name}".',
            is_student_visible=True,
        )

        return Response({
            'success': True,
            'data': AttachmentSerializer(attachment).data
        }, status=status.HTTP_201_CREATED)

    # ── Private helpers ─────────────────────────────────────

    def _get_own_request(self, request, pk):
        try:
            return ServiceRequest.objects.get(id=pk, student=request.user)
        except ServiceRequest.DoesNotExist:
            return None

    def _not_found(self):
        return Response({
            'success': False, 'data': None,
            'error': {'code': 'NOT_FOUND', 'message': 'Request not found.', 'details': None}
        }, status=status.HTTP_404_NOT_FOUND)
