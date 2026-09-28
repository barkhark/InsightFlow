from django.contrib import admin
from .models import ServiceRequest, RequestStageHistory


class RequestStageHistoryInline(admin.TabularInline):
    model = RequestStageHistory
    extra = 0
    readonly_fields = ['stage', 'entered_at', 'exited_at', 'duration_minutes', 'sla_breached', 'transitioned_by']
    ordering = ['entered_at']
    can_delete = False

    def has_add_permission(self, request, obj=None):
        return False  # Append-only — never add manually


@admin.register(ServiceRequest)
class ServiceRequestAdmin(admin.ModelAdmin):
    list_display = ['reference_number', 'student', 'service_category', 'current_stage', 'status', 'priority', 'created_at']
    list_filter = ['status', 'priority', 'service_category', 'current_stage']
    search_fields = ['reference_number', 'title', 'student__email', 'student__full_name']
    ordering = ['-created_at']
    readonly_fields = ['id', 'reference_number', 'created_at', 'updated_at', 'resolved_at', 'stage_entered_at']
    inlines = [RequestStageHistoryInline]


@admin.register(RequestStageHistory)
class RequestStageHistoryAdmin(admin.ModelAdmin):
    list_display = ['request', 'stage', 'entered_at', 'exited_at', 'duration_minutes', 'sla_breached']
    list_filter = ['sla_breached', 'stage__workflow']
    search_fields = ['request__reference_number']
    ordering = ['-entered_at']
    readonly_fields = ['id', 'entered_at']

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False  # Append-only
