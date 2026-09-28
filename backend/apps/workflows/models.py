"""
InsightFlow — Workflow Models

Core design principle:
  Different institutional services have different workflows.
  A workflow is a named, ordered graph of stages.
  Each stage is owned by a department, has an SLA, and declares
  which stages it may legally transition to (including rejection terminals).

This replaces a single hard-coded status enum with a flexible,
database-driven workflow definition system.

Models:
  WorkflowDefinition  → named workflow (e.g. "Bonafide Certificate Workflow")
  WorkflowStage       → one step in a workflow (e.g. "Verification")
  SLAConfiguration    → time targets and risk thresholds per stage

Architectural decisions:
  - Stage.allowed_next_stages is M2M (self-referential) to support both
    linear progressions and rejection branches without changing the schema.
  - Stage.code is a slug used in WorkflowEngine logic for reliable lookups.
  - SLAConfiguration is a separate OneToOne to keep Stage lean and
    SLA logic independently testable.
  - is_initial / is_terminal flags enforce workflow boundaries.
    Business logic (WorkflowEngine) validates exactly one initial stage per workflow.
"""
import uuid
from django.db import models


class WorkflowDefinition(models.Model):
    """
    A named, reusable workflow template.

    Multiple ServiceCategories can share the same WorkflowDefinition
    (e.g. all certificate types share a common approval workflow).

    version: Reserved for future workflow versioning.
    When a workflow changes, old requests preserve their original stages
    via RequestStageHistory snapshots. (Phase 3)
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(
        max_length=150,
        unique=True,
        help_text='e.g. "Bonafide Certificate Workflow"'
    )
    description = models.TextField(
        blank=True,
        help_text='Purpose and scope of this workflow.'
    )
    is_active = models.BooleanField(
        default=True,
        help_text='Inactive workflows cannot be assigned to new service categories.'
    )
    version = models.PositiveSmallIntegerField(
        default=1,
        help_text='Reserved for future versioning. Increment when stages change significantly.'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'workflows_definition'
        verbose_name = 'Workflow Definition'
        verbose_name_plural = 'Workflow Definitions'
        ordering = ['name']

    def __str__(self):
        return f'{self.name} (v{self.version})'

    @property
    def stage_count(self) -> int:
        return self.stages.count()

    def get_initial_stage(self):
        """Return the single initial stage for this workflow."""
        return self.stages.filter(is_initial=True).first()

    def get_terminal_stages(self):
        """Return all terminal stages for this workflow."""
        return self.stages.filter(is_terminal=True)


class WorkflowStage(models.Model):
    """
    A single step within a WorkflowDefinition.

    The allowed_next_stages M2M field defines the transition graph.
    For a linear workflow: each stage points to exactly one next stage.
    For branching (e.g. rejection): a stage points to two next stages —
    one for forward progression, one for the rejection terminal.

    Example for Bonafide Certificate:
      Submission (initial) → Verification → Approval → Generation → Completion (terminal)
                                                     ↘ Rejected (terminal)

    responsible_department: The department that owns this stage.
    Only staff from this department may act on requests in this stage.
    (Enforced in WorkflowEngine — Phase 3)
    """

    class StageStatus(models.TextChoices):
        ACTIVE = 'active', 'Active'
        DEPRECATED = 'deprecated', 'Deprecated'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    workflow = models.ForeignKey(
        WorkflowDefinition,
        on_delete=models.CASCADE,
        related_name='stages'
    )
    name = models.CharField(
        max_length=100,
        help_text='Display name shown to users, e.g. "Verification"'
    )
    code = models.CharField(
        max_length=30,
        help_text='Machine-readable slug used in WorkflowEngine logic, e.g. "VERIFICATION"'
    )
    description = models.TextField(
        blank=True,
        help_text='What happens during this stage. Shown in accountability timeline.'
    )
    order = models.PositiveSmallIntegerField(
        help_text='Display/progression order within the workflow. Lower = earlier.'
    )
    responsible_department = models.ForeignKey(
        'departments.Department',
        on_delete=models.PROTECT,
        related_name='owned_stages',
        help_text='Staff from this department can act on requests in this stage.'
    )
    is_initial = models.BooleanField(
        default=False,
        help_text='Exactly one stage per workflow should be marked initial.'
    )
    is_terminal = models.BooleanField(
        default=False,
        help_text='Terminal stages mark the end of a workflow (resolved or rejected).'
    )
    is_rejection = models.BooleanField(
        default=False,
        help_text='Terminal stage specifically representing a rejected/declined outcome.'
    )
    allowed_next_stages = models.ManyToManyField(
        'self',
        symmetrical=False,
        blank=True,
        related_name='reachable_from',
        help_text='Stages that this stage may legally transition to. '
                  'Empty for terminal stages.'
    )
    status = models.CharField(
        max_length=15,
        choices=StageStatus.choices,
        default=StageStatus.ACTIVE
    )

    class Meta:
        db_table = 'workflows_stage'
        verbose_name = 'Workflow Stage'
        verbose_name_plural = 'Workflow Stages'
        ordering = ['workflow', 'order']
        unique_together = [('workflow', 'order'), ('workflow', 'code')]

    def __str__(self):
        kind = ''
        if self.is_initial:
            kind = ' [INITIAL]'
        elif self.is_terminal:
            kind = ' [TERMINAL/REJECTED]' if self.is_rejection else ' [TERMINAL]'
        return f'{self.workflow.name} → {self.name} (order {self.order}){kind}'

    @property
    def is_forward_progressable(self) -> bool:
        """Returns True if this stage can move to a non-rejection next stage."""
        return self.allowed_next_stages.filter(is_rejection=False).exists()


class SLAConfiguration(models.Model):
    """
    Time-based service level agreement targets per workflow stage.

    target_hours: How long a request should spend in this stage at most.
    warning_threshold_pct: At what % of target_hours to flag as 'warning'.
    critical_threshold_pct: At what % of target_hours to flag as 'critical'.

    SLAEngine (Phase 6) uses these values to compute:
      elapsed_pct = (elapsed_hours / target_hours) * 100
      risk_level  = safe | warning | critical | breached

    Storing thresholds here (instead of hardcoding) means SLA behaviour
    can be tuned per stage without code changes.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    stage = models.OneToOneField(
        WorkflowStage,
        on_delete=models.CASCADE,
        related_name='sla_config',
        help_text='Each stage has at most one SLA configuration.'
    )
    target_hours = models.DecimalField(
        max_digits=6,
        decimal_places=2,
        help_text='Maximum hours a request should remain in this stage.'
    )
    warning_threshold_pct = models.PositiveSmallIntegerField(
        default=75,
        help_text='Percentage of target_hours elapsed before risk = warning. Default 75%.'
    )
    critical_threshold_pct = models.PositiveSmallIntegerField(
        default=90,
        help_text='Percentage of target_hours elapsed before risk = critical. Default 90%.'
    )

    class Meta:
        db_table = 'workflows_sla_configuration'
        verbose_name = 'SLA Configuration'
        verbose_name_plural = 'SLA Configurations'

    def __str__(self):
        return (
            f'{self.stage.name} — '
            f'{self.target_hours}h target '
            f'(warn @{self.warning_threshold_pct}%, critical @{self.critical_threshold_pct}%)'
        )

    def clean(self):
        from django.core.exceptions import ValidationError
        if self.warning_threshold_pct >= self.critical_threshold_pct:
            raise ValidationError(
                'Warning threshold must be less than critical threshold.'
            )
        if self.critical_threshold_pct >= 100:
            raise ValidationError(
                'Critical threshold must be less than 100% (breach = 100%).'
            )
