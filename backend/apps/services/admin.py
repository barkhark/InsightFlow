"""
InsightFlow — Services Django Admin

ServiceArea, ServiceCategory, and DynamicFieldSchema are managed here.
The inline DynamicFieldSchema editor lets admins build complete request
forms without touching code.
"""
from django.contrib import admin
from django.utils.html import format_html
from .models import ServiceArea, ServiceCategory, DynamicFieldSchema


class DynamicFieldInline(admin.TabularInline):
    """Inline field schema editor — build the dynamic form directly on category page."""
    model = DynamicFieldSchema
    extra = 1
    fields = ['order', 'field_label', 'field_key', 'field_type', 'is_required', 'help_text']
    ordering = ['order']


class ServiceCategoryInline(admin.TabularInline):
    """Show categories inline on ServiceArea page."""
    model = ServiceCategory
    extra = 0
    fields = ['name', 'workflow', 'owning_department', 'default_priority', 'is_active']
    show_change_link = True


@admin.register(ServiceArea)
class ServiceAreaAdmin(admin.ModelAdmin):
    list_display = ['name', 'order', 'category_count', 'is_active']
    list_filter = ['is_active']
    search_fields = ['name']
    ordering = ['order', 'name']
    readonly_fields = ['id']
    inlines = [ServiceCategoryInline]

    @admin.display(description='Categories')
    def category_count(self, obj: ServiceArea) -> str:
        count = obj.categories.filter(is_active=True).count()
        return f'{count} active'


@admin.register(ServiceCategory)
class ServiceCategoryAdmin(admin.ModelAdmin):
    list_display = [
        'name', 'service_area', 'owning_department',
        'workflow', 'priority_badge', 'requires_attachment', 'is_active'
    ]
    list_filter = ['service_area', 'owning_department', 'default_priority', 'is_active', 'requires_attachment']
    search_fields = ['name', 'service_area__name']
    ordering = ['service_area', 'name']
    readonly_fields = ['id', 'created_at']
    inlines = [DynamicFieldInline]

    fieldsets = (
        ('Category Identity', {
            'fields': ('id', 'service_area', 'name', 'description')
        }),
        ('Workflow & Routing', {
            'fields': ('workflow', 'owning_department', 'default_priority', 'requires_attachment')
        }),
        ('Status', {
            'fields': ('is_active', 'created_at')
        }),
    )

    @admin.display(description='Priority')
    def priority_badge(self, obj: ServiceCategory) -> str:
        colors = {
            'low': '#6b7280',
            'medium': '#3b82f6',
            'high': '#f59e0b',
            'critical': '#ef4444',
        }
        color = colors.get(obj.default_priority, '#6b7280')
        return format_html(
            '<span style="background:{};color:#fff;padding:2px 8px;'
            'border-radius:9999px;font-size:11px;font-weight:600;">{}</span>',
            color, obj.get_default_priority_display()
        )


@admin.register(DynamicFieldSchema)
class DynamicFieldSchemaAdmin(admin.ModelAdmin):
    list_display = [
        'field_label', 'field_key', 'service_category',
        'field_type', 'order', 'is_required'
    ]
    list_filter = ['service_category', 'field_type', 'is_required']
    search_fields = ['field_label', 'field_key', 'service_category__name']
    ordering = ['service_category', 'order']
    readonly_fields = ['id']
