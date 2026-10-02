"""
InsightFlow — Notification Model + NotificationService

Architecture decision Q3: In-app notifications with 60-second frontend polling.
No WebSockets. Simple, reliable, appropriate for MCA submission.

Notification: One DB row per notification per recipient.
  - is_read flag: cleared by the frontend after display.
  - The polling endpoint returns unread count + recent notifications.

NotificationService: Pure Python service that creates notifications.
  Called by WorkflowEngine._trigger_notifications() (Phase 3 hook).
  Every significant event creates targeted notifications.
"""
import uuid
from django.db import models


class Notification(models.Model):

    class NotificationType(models.TextChoices):
        STAGE_UPDATE = 'STAGE_UPDATE', 'Stage Updated'
        REQUEST_ASSIGNED = 'REQUEST_ASSIGNED', 'Request Assigned'
        COMMENT_ADDED = 'COMMENT_ADDED', 'Comment Added'
        ATTACHMENT_ADDED = 'ATTACHMENT_ADDED', 'Attachment Added'
        REQUEST_RESOLVED = 'REQUEST_RESOLVED', 'Request Resolved'
        REQUEST_REJECTED = 'REQUEST_REJECTED', 'Request Rejected'
        SLA_WARNING = 'SLA_WARNING', 'SLA Warning'
        SLA_BREACH = 'SLA_BREACH', 'SLA Breached'
        FEEDBACK_RECEIVED = 'FEEDBACK_RECEIVED', 'Feedback Received'
        GENERAL = 'GENERAL', 'General'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    recipient = models.ForeignKey(
        'accounts.User',
        on_delete=models.CASCADE,
        related_name='notifications'
    )
    request = models.ForeignKey(
        'service_requests.ServiceRequest',
        on_delete=models.CASCADE,
        related_name='notifications',
        null=True,
        blank=True,
        help_text='The related request. Null for system-wide notifications.'
    )
    notification_type = models.CharField(
        max_length=25,
        choices=NotificationType.choices
    )
    title = models.CharField(max_length=150)
    message = models.TextField()
    is_read = models.BooleanField(default=False)
    delivery_channels = models.JSONField(
        default=dict,
        blank=True,
        help_text='Simulated multi-channel delivery audit: in_app, email, sms, erp.'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'notifications'
        verbose_name = 'Notification'
        verbose_name_plural = 'Notifications'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['recipient', 'is_read', 'created_at'], name='idx_notif_unread'),
        ]

    def __str__(self):
        status = 'unread' if not self.is_read else 'read'
        return f'{self.recipient.full_name} | {self.notification_type} [{status}]'
