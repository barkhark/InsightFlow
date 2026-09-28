"""
InsightFlow — Attachment Model

Files uploaded to a ServiceRequest.
Architectural decision Q5: Students may add attachments while the request
is active (not terminal). Once resolved/closed, no further uploads.

Security: Files are NEVER served from static URLs.
They are served via a controlled Django view that enforces:
  - The requester is authenticated
  - The requester has access to the parent ServiceRequest
  - The file path is resolved from the DB record (no path traversal)
"""
import uuid
import os
from django.db import models


def attachment_upload_path(instance, filename: str) -> str:
    """
    Store attachments under: attachments/{request_id}/{uuid}{ext}
    Using UUIDs prevents filename collisions and enumeration.
    """
    ext = os.path.splitext(filename)[1].lower()
    return f'attachments/{instance.request_id}/{uuid.uuid4()}{ext}'


class Attachment(models.Model):

    ALLOWED_EXTENSIONS = {'.pdf', '.jpg', '.jpeg', '.png', '.doc', '.docx', '.txt'}
    MAX_SIZE_MB = 10

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    request = models.ForeignKey(
        'service_requests.ServiceRequest',
        on_delete=models.CASCADE,
        related_name='attachments'
    )
    uploaded_by = models.ForeignKey(
        'accounts.User',
        on_delete=models.PROTECT,
        related_name='attachments'
    )
    file = models.FileField(
        upload_to=attachment_upload_path,
        help_text='Served via controlled view, never directly.'
    )
    original_filename = models.CharField(
        max_length=255,
        help_text='Preserved for display. The stored filename is UUID-based.'
    )
    file_size_bytes = models.PositiveIntegerField()
    mime_type = models.CharField(max_length=100, blank=True)
    uploaded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'attachments'
        verbose_name = 'Attachment'
        verbose_name_plural = 'Attachments'
        ordering = ['uploaded_at']

    def __str__(self):
        return f'{self.request.reference_number} | {self.original_filename}'

    @property
    def file_size_mb(self) -> float:
        return round(self.file_size_bytes / (1024 * 1024), 2)
