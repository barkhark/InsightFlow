"""
InsightFlow — Comment Model

Comments allow students and staff to communicate on a request.
All comments are append-only — they can be marked deleted (is_deleted=True)
but the record is never physically removed for accountability.

Visibility rules:
  - is_internal=False: visible to student, staff, admin
  - is_internal=True:  visible to staff and admin only (inter-department notes)
"""
import uuid
from django.db import models


class Comment(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    request = models.ForeignKey(
        'service_requests.ServiceRequest',
        on_delete=models.CASCADE,
        related_name='comments'
    )
    author = models.ForeignKey(
        'accounts.User',
        on_delete=models.PROTECT,
        related_name='comments'
    )
    body = models.TextField(help_text='The comment text.')
    is_internal = models.BooleanField(
        default=False,
        help_text='Internal comments are visible only to staff and admins.'
    )
    is_deleted = models.BooleanField(
        default=False,
        help_text='Soft-delete. Record is preserved for accountability.'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'comments'
        verbose_name = 'Comment'
        verbose_name_plural = 'Comments'
        ordering = ['created_at']
        indexes = [
            models.Index(fields=['request', 'is_internal'], name='idx_comment_request'),
        ]

    def __str__(self):
        visibility = 'internal' if self.is_internal else 'public'
        return f'{self.request.reference_number} | {self.author.full_name} [{visibility}]'
