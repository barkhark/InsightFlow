from django.contrib import admin
from .models import Assignment

@admin.register(Assignment)
class AssignmentAdmin(admin.ModelAdmin):
    list_display = ['request', 'assigned_to', 'assigned_by', 'is_current', 'assigned_at']
    list_filter = ['is_current']
    search_fields = ['request__reference_number', 'assigned_to__email']
    ordering = ['-assigned_at']
    readonly_fields = ['id', 'assigned_at']
