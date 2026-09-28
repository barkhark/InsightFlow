"""
InsightFlow — Department Model

Department is the core organizational unit of InsightFlow.
Every workflow stage is owned by a department.
Every staff member belongs to a department.
Department membership determines what requests a staff member can see and act on.

This is the foundational model — all workflow ownership traces back here.
"""
import uuid
from django.db import models


class Department(models.Model):
    """
    An institutional department responsible for handling specific service requests.

    Examples: Academic Section, IT Department, Library, Accounts Office,
              Student Affairs, Examination Cell

    The `code` field is used in seeding and logic references (e.g., 'ACAD', 'IT', 'LIB').
    The `head` FK references User via string to avoid circular imports;
    resolved at runtime to a staff user with role='staff'.
    """
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False
    )
    name = models.CharField(
        max_length=100,
        unique=True,
        help_text='Full department name, e.g. "Academic Section"'
    )
    code = models.CharField(
        max_length=10,
        unique=True,
        help_text='Short code used in logic and seeding, e.g. "ACAD"'
    )
    description = models.TextField(
        blank=True,
        help_text='Brief description of the department\'s function and services.'
    )
    head = models.ForeignKey(
        'accounts.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='headed_departments',
        help_text='Department head (staff user). Receives escalation notifications.'
    )
    is_active = models.BooleanField(
        default=True,
        help_text='Inactive departments are hidden from service category selectors.'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'departments_department'
        verbose_name = 'Department'
        verbose_name_plural = 'Departments'
        ordering = ['name']

    def __str__(self):
        return f'{self.name} ({self.code})'

    @property
    def active_staff_count(self) -> int:
        """Number of active staff members in this department."""
        return self.staff_members.filter(user__is_active=True).count()
