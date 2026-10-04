"""
InsightFlow — Controlled Attachment Download View

Enforces object-level authorization for document retrieval:
- Students can ONLY download attachments associated with their own requests.
- Staff can ONLY download attachments for requests assigned to their department.
- Administrators have institutional oversight access.

Files are served via Django FileResponse with protective headers:
- X-Content-Type-Options: nosniff
- Content-Disposition: attachment; filename="..."
"""
import os
from django.http import FileResponse
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from apps.attachments.models import Attachment


class AttachmentDownloadView(APIView):
    """
    GET /api/v1/attachments/<uuid:pk>/download/
    Controlled download endpoint with strict object-level access enforcement.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        try:
            attachment = Attachment.objects.select_related(
                'request__student',
                'request__current_stage__responsible_department',
                'request__service_category__owning_department'
            ).get(id=pk)
        except Attachment.DoesNotExist:
            return Response({
                'success': False,
                'data': None,
                'error': {
                    'code': 'NOT_FOUND',
                    'message': 'Attachment not found.',
                    'details': None
                }
            }, status=status.HTTP_404_NOT_FOUND)

        user = request.user
        service_req = attachment.request

        # 1. Student authorization: must be the owner of the request
        if user.role == 'student':
            if service_req.student_id != user.id:
                return Response({
                    'success': False,
                    'data': None,
                    'error': {
                        'code': 'FORBIDDEN',
                        'message': 'You do not have permission to access attachments belonging to another student.',
                        'details': None
                    }
                }, status=status.HTTP_403_FORBIDDEN)

        # 2. Staff authorization: must belong to the department handling this request
        elif user.role == 'staff':
            try:
                staff_dept_id = user.staff_profile.department_id
                stage_dept_id = service_req.current_stage.responsible_department_id if service_req.current_stage else None
                owning_dept_id = service_req.service_category.owning_department_id if service_req.service_category else None

                allowed_depts = {dept for dept in (stage_dept_id, owning_dept_id) if dept is not None}
                if staff_dept_id not in allowed_depts:
                    return Response({
                        'success': False,
                        'data': None,
                        'error': {
                            'code': 'FORBIDDEN',
                            'message': 'You do not have permission to access attachments outside your department.',
                            'details': None
                        }
                    }, status=status.HTTP_403_FORBIDDEN)
            except Exception:
                return Response({
                    'success': False,
                    'data': None,
                    'error': {
                        'code': 'FORBIDDEN',
                        'message': 'Staff member does not have an assigned department profile.',
                        'details': None
                    }
                }, status=status.HTTP_403_FORBIDDEN)

        # 3. Non-admin roles (guard against invalid custom roles)
        elif user.role != 'admin':
            return Response({
                'success': False,
                'data': None,
                'error': {
                    'code': 'FORBIDDEN',
                    'message': 'Access restricted.',
                    'details': None
                }
            }, status=status.HTTP_403_FORBIDDEN)

        # Verify physical file existence
        if not attachment.file or not attachment.file.storage.exists(attachment.file.name):
            return Response({
                'success': False,
                'data': None,
                'error': {
                    'code': 'FILE_NOT_FOUND',
                    'message': 'Attachment file record exists, but physical file is missing from storage.',
                    'details': None
                }
            }, status=status.HTTP_404_NOT_FOUND)

        # Stream file safely
        safe_name = os.path.basename(attachment.original_filename).replace('"', '').replace('..', '')
        mime = attachment.mime_type or 'application/octet-stream'

        response = FileResponse(attachment.file.open('rb'), content_type=mime)
        response['Content-Disposition'] = f'attachment; filename="{safe_name}"'
        response['X-Content-Type-Options'] = 'nosniff'
        return response
