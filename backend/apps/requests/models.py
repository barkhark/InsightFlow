"""
InsightFlow — Service Request Models

ServiceRequest: The core transactional record. Created by a student,
  progresses through WorkflowStages owned by departments.

RequestStageHistory: Append-only record of every stage a request passes through.
  duration_minutes is computed on stage exit for fast analytics aggregation.
  sla_breached is recorded at exit time — never recomputed retroactively.

Architectural decisions:
  - reference_number: Human-readable REQ-YYYY-NNNNN for display and search.
  - current_stage + stage_entered_at: On-request SLA calculation without joins.
  - dynamic_fields_data JSONB: Stores the creation-time form values (Q1: creation-only).
  - status is a coarse lifecycle state (open/in_progress/resolved/closed).
    Fine-grained position is tracked by current_stage (WorkflowStage).
  - RequestStageHistory is APPEND-ONLY. Never update or delete rows here.
"""
import uuid
from django.db import models
from django.utils import timezone


class ServiceRequest(models.Model):
    """
    A student's institutional service request.

    Lifecycle:
      Student submits → WorkflowEngine assigns initial stage →
      Staff progress through stages → Terminal stage → resolved/rejected
    """

    class Status(models.TextChoices):
        OPEN = 'open', 'Open'
        IN_PROGRESS = 'in_progress', 'In Progress'
        ON_HOLD = 'on_hold', 'On Hold'
        RESOLVED = 'resolved', 'Resolved'
        REJECTED = 'rejected', 'Rejected'
        CLOSED = 'closed', 'Closed'
        CANCELLED = 'cancelled', 'Cancelled'

    class Priority(models.TextChoices):
        LOW = 'low', 'Low'
        MEDIUM = 'medium', 'Medium'
        HIGH = 'high', 'High'
        CRITICAL = 'critical', 'Critical'

    TERMINAL_STATUSES = {Status.RESOLVED, Status.REJECTED, Status.CLOSED, Status.CANCELLED}

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    reference_number = models.CharField(
        max_length=20,
        unique=True,
        help_text='Human-readable identifier, e.g. REQ-2026-00042'
    )
    student = models.ForeignKey(
        'accounts.User',
        on_delete=models.PROTECT,
        related_name='service_requests',
        limit_choices_to={'role': 'student'},
        help_text='Only student-role users can own requests.'
    )
    service_category = models.ForeignKey(
        'services.ServiceCategory',
        on_delete=models.PROTECT,
        related_name='requests'
    )
    workflow = models.ForeignKey(
        'workflows.WorkflowDefinition',
        on_delete=models.PROTECT,
        related_name='requests',
        help_text='Snapshot of the workflow at creation time.'
    )
    current_stage = models.ForeignKey(
        'workflows.WorkflowStage',
        on_delete=models.PROTECT,
        related_name='active_requests',
        null=True,
        help_text='Current stage in the workflow. Used for SLA calculation.'
    )
    title = models.CharField(max_length=250)
    details = models.TextField(help_text='Full description from the student.')
    priority = models.CharField(
        max_length=10,
        choices=Priority.choices,
        default=Priority.MEDIUM
    )
    status = models.CharField(
        max_length=15,
        choices=Status.choices,
        default=Status.OPEN,
        help_text='Coarse lifecycle status. Fine position = current_stage.'
    )
    dynamic_fields_data = models.JSONField(
        default=dict,
        blank=True,
        help_text='Values captured from DynamicFieldSchema at creation (Q1: creation-only).'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    resolved_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text='Set when request reaches a terminal stage.'
    )
    stage_entered_at = models.DateTimeField(
        default=timezone.now,
        help_text='When the current_stage was entered. Used for live SLA calculation.'
    )

    class Meta:
        db_table = 'service_requests'
        verbose_name = 'Service Request'
        verbose_name_plural = 'Service Requests'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['student'], name='idx_request_student'),
            models.Index(fields=['current_stage', 'stage_entered_at'], name='idx_request_sla'),
            models.Index(fields=['status', 'created_at'], name='idx_request_status'),
        ]

    def __str__(self):
        return f'{self.reference_number} — {self.title} [{self.status}]'

    @property
    def is_terminal(self) -> bool:
        return self.status in self.TERMINAL_STATUSES

    @property
    def is_open_for_attachments(self) -> bool:
        """Q5: Students can add attachments while request is active (not terminal)."""
        return not self.is_terminal

    @property
    def elapsed_seconds_in_stage(self) -> float:
        """Seconds since the current stage was entered. Used by SLAEngine."""
        return (timezone.now() - self.stage_entered_at).total_seconds()


class RequestStageHistory(models.Model):
    """
    Append-only record of every stage transition for a ServiceRequest.

    One row is created when a stage is entered (exited_at=None).
    On the next transition, that row is updated: exited_at, duration_minutes, sla_breached.
    A new row is then created for the new stage.

    This provides the complete accountability timeline for a request.
    duration_minutes is pre-computed on exit for fast analytics — never recalculate in Python loops.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    request = models.ForeignKey(
        ServiceRequest,
        on_delete=models.CASCADE,
        related_name='stage_history'
    )
    stage = models.ForeignKey(
        'workflows.WorkflowStage',
        on_delete=models.PROTECT,
        related_name='history_entries'
    )
    entered_at = models.DateTimeField(
        help_text='When the request entered this stage.'
    )
    exited_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text='When the request left this stage. NULL = still in this stage.'
    )
    duration_minutes = models.IntegerField(
        null=True,
        blank=True,
        help_text='Pre-computed on exit: (exited_at - entered_at) in minutes.'
    )
    transitioned_by = models.ForeignKey(
        'accounts.User',
        on_delete=models.SET_NULL,
        null=True,
        related_name='transitions_made',
        help_text='Staff member who triggered this transition.'
    )
    transition_note = models.TextField(
        blank=True,
        help_text='Optional note recorded when transitioning stages.'
    )
    sla_breached = models.BooleanField(
        default=False,
        help_text='True if duration_minutes exceeded the stage SLA target.'
    )

    class Meta:
        db_table = 'service_request_stage_history'
        verbose_name = 'Request Stage History'
        verbose_name_plural = 'Request Stage Histories'
        ordering = ['request', 'entered_at']
        indexes = [
            models.Index(fields=['request', 'entered_at'], name='idx_history_request_time'),
        ]

    def __str__(self):
        status = 'current' if self.exited_at is None else f'{self.duration_minutes}min'
        return f'{self.request.reference_number} → {self.stage.name} ({status})'


class RequestFeedback(models.Model):
    """
    Post-resolution Student Satisfaction (CSAT) rating & review.
    Submitted by the request's student once resolved or closed.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    request = models.OneToOneField(
        ServiceRequest,
        on_delete=models.CASCADE,
        related_name='feedback',
        help_text='The service request this feedback belongs to.'
    )
    student = models.ForeignKey(
        'accounts.User',
        on_delete=models.CASCADE,
        related_name='feedbacks_given'
    )
    rating = models.PositiveSmallIntegerField(
        help_text='Overall rating from 1 to 5 stars.'
    )
    speed_rating = models.PositiveSmallIntegerField(
        default=5,
        help_text='Rating for resolution speed (1-5).'
    )
    helpfulness_rating = models.PositiveSmallIntegerField(
        default=5,
        help_text='Rating for staff helpfulness (1-5).'
    )
    clarity_rating = models.PositiveSmallIntegerField(
        default=5,
        help_text='Rating for process clarity (1-5).'
    )
    comment = models.TextField(
        blank=True,
        help_text='Optional review comment or feedback.'
    )
    tags = models.JSONField(
        default=list,
        blank=True,
        help_text='Aspect tags selected by the student (e.g. "Prompt Resolution", "Helpful Staff").'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'service_request_feedback'
        verbose_name = 'Request Feedback'
        verbose_name_plural = 'Request Feedbacks'
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.request.reference_number} Feedback ({self.rating}★ by {self.student.email})'

