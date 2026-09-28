"""
InsightFlow — Workflows Django Admin

Full CRUD for WorkflowDefinition, WorkflowStage, and SLAConfiguration
is managed here in Django Admin (architectural decision Q4).

The inline configuration allows building complete workflow definitions
with stages and SLA targets in one admin page.
"""
from django.contrib import admin
from django.utils.html import format_html
from .models import WorkflowDefinition, WorkflowStage, SLAConfiguration


class SLAConfigurationInline(admin.StackedInline):
    """Inline SLA config — edited directly on the WorkflowStage page."""
    model = SLAConfiguration
    extra = 1
    max_num = 1
    fields = ['target_hours', 'warning_threshold_pct', 'critical_threshold_pct']


class WorkflowStageInline(admin.TabularInline):
    """Inline stages — show a summary on the WorkflowDefinition page."""
    model = WorkflowStage
    extra = 0
    fields = ['order', 'name', 'code', 'responsible_department', 'is_initial', 'is_terminal', 'is_rejection']
    ordering = ['order']
    show_change_link = True


@admin.register(WorkflowDefinition)
class WorkflowDefinitionAdmin(admin.ModelAdmin):
    list_display = ['name', 'stage_count_display', 'version', 'is_active', 'created_at']
    list_filter = ['is_active']
    search_fields = ['name']
    ordering = ['name']
    readonly_fields = ['id', 'created_at', 'updated_at']
    inlines = [WorkflowStageInline]

    fieldsets = (
        ('Workflow Identity', {
            'fields': ('id', 'name', 'description', 'version', 'is_active')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',),
        }),
    )

    @admin.display(description='Stages')
    def stage_count_display(self, obj: WorkflowDefinition) -> str:
        count = obj.stage_count
        return f'{count} stage{"s" if count != 1 else ""}'


@admin.register(WorkflowStage)
class WorkflowStageAdmin(admin.ModelAdmin):
    list_display = [
        'name', 'workflow', 'order', 'responsible_department',
        'stage_type_badge', 'status'
    ]
    list_filter = ['workflow', 'responsible_department', 'is_initial', 'is_terminal', 'is_rejection', 'status']
    search_fields = ['name', 'code', 'workflow__name']
    ordering = ['workflow', 'order']
    readonly_fields = ['id']
    filter_horizontal = ['allowed_next_stages']
    inlines = [SLAConfigurationInline]

    fieldsets = (
        ('Stage Identity', {
            'fields': ('id', 'workflow', 'name', 'code', 'description', 'order')
        }),
        ('Ownership', {
            'fields': ('responsible_department',)
        }),
        ('Stage Type', {
            'fields': ('is_initial', 'is_terminal', 'is_rejection', 'status')
        }),
        ('Transition Graph', {
            'fields': ('allowed_next_stages',),
            'description': 'Select all stages this stage may legally transition to. '
                           'Leave empty for terminal stages. Include rejection stage '
                           'here to enable the rejection path.'
        }),
    )

    @admin.display(description='Type')
    def stage_type_badge(self, obj: WorkflowStage) -> str:
        if obj.is_initial:
            return format_html('<span style="color:#3b82f6;font-weight:600;">INITIAL</span>')
        elif obj.is_rejection:
            return format_html('<span style="color:#ef4444;font-weight:600;">REJECTED</span>')
        elif obj.is_terminal:
            return format_html('<span style="color:#22c55e;font-weight:600;">TERMINAL</span>')
        return format_html('<span style="color:#6b7280;">NORMAL</span>')


@admin.register(SLAConfiguration)
class SLAConfigurationAdmin(admin.ModelAdmin):
    list_display = ['stage', 'target_hours', 'warning_threshold_pct', 'critical_threshold_pct']
    list_filter = ['stage__workflow']
    search_fields = ['stage__name', 'stage__workflow__name']
    ordering = ['stage__workflow', 'stage__order']
    readonly_fields = ['id']
