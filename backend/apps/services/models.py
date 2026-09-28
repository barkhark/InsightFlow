"""
InsightFlow — Service Models

ServiceArea: Top-level grouping visible to students, e.g. "Academic", "Infrastructure".
ServiceCategory: A specific requestable service, e.g. "Bonafide Certificate".
  Each category links to a WorkflowDefinition and an owning Department.
DynamicFieldSchema: Per-category form fields shown at request creation (creation-only, Q1).

Architectural decisions:
  - ServiceArea provides the first navigation step for students.
  - ServiceCategory stores default_priority as a hint — staff can override.
  - DynamicFieldSchema uses field_type + options_json instead of EAV tables
    because the schema varies per category but the values are captured once
    at request creation (stored as JSONB on ServiceRequest in Phase 3).
  - is_required, order, and help_text are per-field to produce professional forms.
"""
import uuid
from django.db import models


class ServiceArea(models.Model):
    """
    Top-level service grouping shown to students during request creation.
    Examples: Academic, Infrastructure, Library, Finance, Student Affairs
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(
        max_length=100,
        unique=True,
        help_text='e.g. "Academic", "Infrastructure"'
    )
    description = models.TextField(
        blank=True,
        help_text='Shown to students when they hover/select this area.'
    )
    icon_key = models.CharField(
        max_length=50,
        blank=True,
        help_text='Frontend icon identifier, e.g. "graduation-cap", "wifi", "book"'
    )
    order = models.PositiveSmallIntegerField(
        default=0,
        help_text='Display order on the student request creation page.'
    )
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = 'services_area'
        verbose_name = 'Service Area'
        verbose_name_plural = 'Service Areas'
        ordering = ['order', 'name']

    def __str__(self):
        return self.name


class ServiceCategory(models.Model):
    """
    A specific institutional service that students can request.

    workflow: The WorkflowDefinition that defines how this request progresses.
    owning_department: The primary department responsible for this category.
                       Used for routing and staff access scoping.
    default_priority: A hint to staff. Students cannot set priority directly.
    """

    class Priority(models.TextChoices):
        LOW = 'low', 'Low'
        MEDIUM = 'medium', 'Medium'
        HIGH = 'high', 'High'
        CRITICAL = 'critical', 'Critical'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    service_area = models.ForeignKey(
        ServiceArea,
        on_delete=models.PROTECT,
        related_name='categories'
    )
    name = models.CharField(
        max_length=150,
        help_text='e.g. "Bonafide Certificate", "Wi-Fi Issue"'
    )
    description = models.TextField(
        blank=True,
        help_text='Shown to students to help them choose the right category.'
    )
    workflow = models.ForeignKey(
        'workflows.WorkflowDefinition',
        on_delete=models.PROTECT,
        related_name='service_categories',
        help_text='The workflow that all requests in this category follow.'
    )
    owning_department = models.ForeignKey(
        'departments.Department',
        on_delete=models.PROTECT,
        related_name='service_categories',
        help_text='Primary department responsible. Determines initial routing.'
    )
    default_priority = models.CharField(
        max_length=10,
        choices=Priority.choices,
        default=Priority.MEDIUM,
        help_text='Default priority assigned to new requests in this category.'
    )
    requires_attachment = models.BooleanField(
        default=False,
        help_text='If True, at least one attachment is required at request creation.'
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'services_category'
        verbose_name = 'Service Category'
        verbose_name_plural = 'Service Categories'
        ordering = ['service_area', 'name']
        unique_together = [('service_area', 'name')]

    def __str__(self):
        return f'{self.service_area.name} › {self.name}'


class DynamicFieldSchema(models.Model):
    """
    Defines the form fields presented to students at request creation.

    Decision Q1: These fields are CREATION-ONLY.
    Once a request is submitted, student cannot modify the captured values.
    Values are stored as JSONB on ServiceRequest.dynamic_fields_data (Phase 3).

    field_type determines what HTML input is rendered:
      text      → <input type="text">
      textarea  → <textarea>
      select    → <select> with options from options_json
      date      → <input type="date">
      number    → <input type="number">
      checkbox  → multiple <input type="checkbox"> from options_json

    options_json format for select/checkbox:
      [{"value": "semester_fee", "label": "Semester Fee"}, ...]
    """

    class FieldType(models.TextChoices):
        TEXT = 'text', 'Text Input'
        TEXTAREA = 'textarea', 'Text Area'
        SELECT = 'select', 'Dropdown Select'
        DATE = 'date', 'Date Picker'
        NUMBER = 'number', 'Number Input'
        CHECKBOX = 'checkbox', 'Checkbox Group'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    service_category = models.ForeignKey(
        ServiceCategory,
        on_delete=models.CASCADE,
        related_name='dynamic_fields'
    )
    field_key = models.CharField(
        max_length=50,
        help_text='Machine-readable key, e.g. "purpose_of_certificate". '
                  'Used as the key in ServiceRequest.dynamic_fields_data JSON.'
    )
    field_label = models.CharField(
        max_length=100,
        help_text='Display label shown to the student, e.g. "Purpose of Certificate"'
    )
    field_type = models.CharField(
        max_length=10,
        choices=FieldType.choices,
        default=FieldType.TEXT
    )
    options_json = models.JSONField(
        null=True,
        blank=True,
        help_text='For select/checkbox types. Format: [{"value": "...", "label": "..."}]'
    )
    is_required = models.BooleanField(default=True)
    order = models.PositiveSmallIntegerField(
        default=0,
        help_text='Display order within the category form. Lower = shown first.'
    )
    help_text = models.CharField(
        max_length=200,
        blank=True,
        help_text='Hint shown below the field to guide the student.'
    )
    placeholder = models.CharField(
        max_length=100,
        blank=True,
        help_text='Placeholder text for text/textarea inputs.'
    )

    class Meta:
        db_table = 'services_dynamic_field'
        verbose_name = 'Dynamic Field Schema'
        verbose_name_plural = 'Dynamic Field Schemas'
        ordering = ['service_category', 'order']
        unique_together = [('service_category', 'field_key')]

    def __str__(self):
        return f'{self.service_category.name} → {self.field_label} ({self.field_type})'
