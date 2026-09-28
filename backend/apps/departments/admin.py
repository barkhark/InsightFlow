"""
InsightFlow — Departments Django Admin

Departments are configured here in Django Admin (architectural decision Q4).
The custom React UI never provides Department CRUD — only analytics.
"""
from django.contrib import admin
from .models import Department


@admin.register(Department)
class DepartmentAdmin(admin.ModelAdmin):
    list_display = ['name', 'code', 'head', 'active_staff_count_display', 'is_active', 'created_at']
    list_filter = ['is_active']
    search_fields = ['name', 'code']
    ordering = ['name']
    readonly_fields = ['id', 'created_at']

    fieldsets = (
        ('Department Identity', {
            'fields': ('id', 'name', 'code', 'description')
        }),
        ('Management', {
            'fields': ('head', 'is_active')
        }),
        ('Timestamps', {
            'fields': ('created_at',)
        }),
    )

    @admin.display(description='Staff Count')
    def active_staff_count_display(self, obj: Department) -> str:
        count = obj.active_staff_count
        return f'{count} staff'
