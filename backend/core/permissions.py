"""
InsightFlow — Custom DRF Permission Classes

All authorization decisions are enforced here, not in the frontend.
Every endpoint that requires role or resource restrictions must reference
one of these permission classes explicitly.
"""
from rest_framework.permissions import BasePermission


class IsStudent(BasePermission):
    """Allow access only to users with the 'student' role."""
    message = 'Access restricted to students.'

    def has_permission(self, request, view):
        return bool(
            request.user and
            request.user.is_authenticated and
            request.user.role == 'student'
        )


class IsStaff(BasePermission):
    """Allow access only to users with the 'staff' role."""
    message = 'Access restricted to staff members.'

    def has_permission(self, request, view):
        return bool(
            request.user and
            request.user.is_authenticated and
            request.user.role == 'staff'
        )


class IsAdmin(BasePermission):
    """Allow access only to users with the 'admin' role."""
    message = 'Access restricted to administrators.'

    def has_permission(self, request, view):
        return bool(
            request.user and
            request.user.is_authenticated and
            request.user.role == 'admin'
        )


class IsStudentOrAdmin(BasePermission):
    """Allow access to students or admins."""
    message = 'Access restricted to students and administrators.'

    def has_permission(self, request, view):
        return bool(
            request.user and
            request.user.is_authenticated and
            request.user.role in ('student', 'admin')
        )


class IsStaffOrAdmin(BasePermission):
    """Allow access to staff or admins."""
    message = 'Access restricted to staff and administrators.'

    def has_permission(self, request, view):
        return bool(
            request.user and
            request.user.is_authenticated and
            request.user.role in ('staff', 'admin')
        )


# ============================================================
# Object-level permissions — implemented in Phase 5
# when request/department models exist.
# ============================================================

class IsRequestOwner(BasePermission):
    """
    Student can only access their own ServiceRequest objects.
    Stub — fully implemented in Phase 5.
    """
    message = 'You do not have permission to access this request.'

    def has_object_permission(self, request, view, obj):
        if request.user.role == 'admin':
            return True
        return obj.student_id == request.user.id


class IsRequestDepartmentStaff(BasePermission):
    """
    Staff can only access requests belonging to their department.
    Stub — fully implemented in Phase 5.
    """
    message = 'You do not have permission to access requests outside your department.'

    def has_object_permission(self, request, view, obj):
        if request.user.role == 'admin':
            return True
        if request.user.role != 'staff':
            return False
        try:
            staff_dept_id = request.user.staff_profile.department_id
            return obj.service_category.owning_department_id == staff_dept_id
        except AttributeError:
            return False
