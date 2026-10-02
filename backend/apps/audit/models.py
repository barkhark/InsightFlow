"""
InsightFlow — Audit / Accountability Record Model

AuditRecord is the unified accountability timeline for a ServiceRequest.

Unlike RequestStageHistory (which only records stage transitions),
AuditRecord captures ALL significant events on a request:
  - Stage transitions
  - Assignments and reassignments
  - Comments added
  - Attachments uploaded
  - Status changes
  - On-hold / cancellation actions

This produces the full chronological accountability timeline
shown to students, staff, and admins on the request detail page.

Architectural principles:
  - APPEND-ONLY: records are never updated or deleted.
  - Every record has an actor (who), action (what), and description (why/detail).
  - metadata_json stores machine-readable context for analytics and display.
  - description is always human-readable — this is the explainability layer.
"""
import uuid
from django.db import models


class AuditRecord(models.Model):
    """
    An immutable event record on a ServiceRequest.
    Created by WorkflowEngine, NotificationService, and other services — never by views directly.
    """

    class Action(models.TextChoices):
        REQUEST_CREATED = 'REQUEST_CREATED', 'Request Created'
        STAGE_TRANSITION = 'STAGE_TRANSITION', 'Stage Transition'
        STAGE_REJECTED = 'STAGE_REJECTED', 'Request Rejected'
        ASSIGNMENT = 'ASSIGNMENT', 'Assignment'
        REASSIGNMENT = 'REASSIGNMENT', 'Reassignment'
        COMMENT_ADDED = 'COMMENT_ADDED', 'Comment Added'
        ATTACHMENT_UPLOADED = 'ATTACHMENT_UPLOADED', 'Attachment Uploaded'
        STATUS_CHANGED = 'STATUS_CHANGED', 'Status Changed'
        ON_HOLD = 'ON_HOLD', 'Placed On Hold'
        CANCELLED = 'CANCELLED', 'Cancelled'
        RESOLVED = 'RESOLVED', 'Resolved'
        SLA_BREACHED = 'SLA_BREACHED', 'SLA Breached'
        FEEDBACK_SUBMITTED = 'FEEDBACK_SUBMITTED', 'Feedback Submitted'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    request = models.ForeignKey(
        'service_requests.ServiceRequest',
        on_delete=models.CASCADE,
        related_name='audit_records'
    )
    actor = models.ForeignKey(
        'accounts.User',
        on_delete=models.SET_NULL,
        null=True,
        related_name='audit_actions',
        help_text='User who performed this action. Null for system-generated events.'
    )
    action = models.CharField(
        max_length=30,
        choices=Action.choices,
        help_text='Machine-readable action type for filtering and display.'
    )
    description = models.TextField(
        help_text='Human-readable explanation of what happened and why. '
                  'This is the explainability layer — always write something meaningful.'
    )
    metadata_json = models.JSONField(
        default=dict,
        blank=True,
        help_text='Machine-readable context: stage names, durations, user IDs, etc.'
    )
    timestamp = models.DateTimeField(auto_now_add=True)
    is_student_visible = models.BooleanField(
        default=True,
        help_text='Internal-only audit entries (e.g. system events) are hidden from students.'
    )

    class Meta:
        db_table = 'audit_records'
        verbose_name = 'Audit Record'
        verbose_name_plural = 'Audit Records'
        ordering = ['request', 'timestamp']
        indexes = [
            models.Index(fields=['request', 'timestamp'], name='idx_audit_request_time'),
            models.Index(fields=['request', 'is_student_visible'], name='idx_audit_visibility'),
        ]

    def __str__(self):
        actor_name = self.actor.full_name if self.actor else 'System'
        return f'{self.request.reference_number} | {self.action} by {actor_name} @ {self.timestamp:%Y-%m-%d %H:%M}'
