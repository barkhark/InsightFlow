from django.contrib import admin
from .models import AuditRecord

@admin.register(AuditRecord)
class AuditRecordAdmin(admin.ModelAdmin):
    list_display = ['request', 'actor', 'action', 'timestamp', 'is_student_visible']
    list_filter = ['action', 'is_student_visible']
    search_fields = ['request__reference_number', 'description']
    ordering = ['-timestamp']
    readonly_fields = ['id', 'timestamp']

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False  # Append-only
