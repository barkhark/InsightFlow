"""
InsightFlow — Assignment Model

Tracks who is currently responsible for a ServiceRequest,
and preserves the full reassignment history.

Design:
  - is_current=True: exactly one Assignment per request at any time.
    Enforced by the WorkflowEngine, not by DB constraint (partial indexes
    are not universally supported in SQLite).
  - Every reassignment creates a NEW Assignment row (is_current=True)
    and closes the previous row (is_current=False).
  - This gives a complete accountability trail of who handled the request.

Accountability principle: assignment history is NEVER deleted.
"""
import uuid
from django.db import models


class Assignment(models.Model):
    """
    A single assignment record for a service request.

    The WorkflowEngine creates/updates these atomically
    with stage transitions (Phase 3 core logic).
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    request = models.ForeignKey(
        'service_requests.ServiceRequest',
        on_delete=models.CASCADE,
        related_name='assignments'
    )
    assigned_to = models.ForeignKey(
        'accounts.User',
        on_delete=models.PROTECT,
        related_name='assigned_requests',
        limit_choices_to={'role': 'staff'},
        help_text='The staff member currently responsible.'
    )
    assigned_by = models.ForeignKey(
        'accounts.User',
        on_delete=models.SET_NULL,
        null=True,
        related_name='assignments_made',
        help_text='Who made this assignment. Null if auto-assigned.'
    )
    assigned_at = models.DateTimeField(auto_now_add=True)
    is_current = models.BooleanField(
        default=True,
        help_text='True for the active assignment. False for historical records.'
    )
    note = models.TextField(
        blank=True,
        help_text='Reason for assignment or reassignment.'
    )

    class Meta:
        db_table = 'assignments'
        verbose_name = 'Assignment'
        verbose_name_plural = 'Assignments'
        ordering = ['-assigned_at']
        indexes = [
            models.Index(fields=['request', 'is_current'], name='idx_assignment_current'),
            models.Index(fields=['assigned_to', 'is_current'], name='idx_assignment_staff'),
        ]

    def __str__(self):
        status = 'current' if self.is_current else 'historical'
        return f'{self.request.reference_number} → {self.assigned_to.full_name} ({status})'
