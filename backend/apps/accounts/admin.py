"""
InsightFlow — Accounts Django Admin

Registers User, StudentProfile, and StaffProfile for management
via the Django Admin interface (/admin/).

The Django Admin is the configuration interface for InsightFlow.
The custom React UI is for analytics only (as per architectural decision Q4).
"""
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.utils.html import format_html

from .models import User, StudentProfile, StaffProfile


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    """
    Custom admin for the InsightFlow User model.
    Replaces the default username-based admin with email-based fields.
    """
    list_display = ['email', 'full_name', 'role_badge', 'is_active', 'date_joined']
    list_filter = ['role', 'is_active', 'is_staff', 'date_joined']
    search_fields = ['email', 'full_name']
    ordering = ['full_name']
    readonly_fields = ['id', 'date_joined', 'last_login']

    fieldsets = (
        ('Identity', {
            'fields': ('id', 'email', 'password')
        }),
        ('Personal Information', {
            'fields': ('full_name',)
        }),
        ('Role & Access', {
            'fields': ('role', 'is_active', 'is_staff', 'is_superuser')
        }),
        ('Permissions', {
            'fields': ('groups', 'user_permissions'),
            'classes': ('collapse',),
        }),
        ('Timestamps', {
            'fields': ('date_joined', 'last_login'),
        }),
    )

    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('email', 'full_name', 'role', 'password1', 'password2', 'is_active'),
        }),
    )

    # Override username-centric fields from BaseUserAdmin
    filter_horizontal = ('groups', 'user_permissions',)

    @admin.display(description='Role')
    def role_badge(self, obj: User) -> str:
        colors = {
            'student': '#3b82f6',
            'staff': '#8b5cf6',
            'admin': '#ef4444',
        }
        color = colors.get(obj.role, '#6b7280')
        return format_html(
            '<span style="background:{};color:#fff;padding:2px 8px;border-radius:9999px;font-size:11px;font-weight:600;">{}</span>',
            color,
            obj.get_role_display()
        )


@admin.register(StudentProfile)
class StudentProfileAdmin(admin.ModelAdmin):
    list_display = ['roll_number', 'get_full_name', 'programme', 'semester', 'division']
    search_fields = ['roll_number', 'user__email', 'user__full_name']
    list_filter = ['programme', 'semester']
    ordering = ['roll_number']
    readonly_fields = ['id']

    @admin.display(description='Full Name', ordering='user__full_name')
    def get_full_name(self, obj: StudentProfile) -> str:
        return obj.user.full_name


@admin.register(StaffProfile)
class StaffProfileAdmin(admin.ModelAdmin):
    list_display = ['employee_id', 'get_full_name', 'designation', 'department', 'get_email']
    search_fields = ['employee_id', 'user__email', 'user__full_name']
    list_filter = ['department', 'designation']
    ordering = ['employee_id']
    readonly_fields = ['id']
    autocomplete_fields = ['department'] if False else []  # enabled when dept has search

    @admin.display(description='Full Name', ordering='user__full_name')
    def get_full_name(self, obj: StaffProfile) -> str:
        return obj.user.full_name

    @admin.display(description='Email')
    def get_email(self, obj: StaffProfile) -> str:
        return obj.user.email
