"""
InsightFlow — pytest fixtures

Provides reusable fixtures for all test modules.
Fixtures are ordered so dependent ones build on simpler ones.

Usage in test files:
    def test_something(self, auth_student, student_user):
        ...
"""
import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

User = get_user_model()


# ── API Client ──────────────────────────────────────────────

@pytest.fixture
def api_client():
    """Unauthenticated API client."""
    return APIClient()


# ── User Fixtures ───────────────────────────────────────────

@pytest.fixture
def student_user(db):
    """A student user with a complete StudentProfile."""
    from apps.accounts.models import StudentProfile
    user = User.objects.create_user(
        email='student@insightflow.test',
        password='TestPass@123',
        full_name='Priya Sharma',
        role='student',
    )
    StudentProfile.objects.create(
        user=user,
        roll_number='MCA2024001',
        programme='MCA',
        semester=3,
        division='A',
    )
    return user


@pytest.fixture
def student_user_2(db):
    """A second student — used for cross-ownership isolation tests."""
    from apps.accounts.models import StudentProfile
    user = User.objects.create_user(
        email='student2@insightflow.test',
        password='TestPass@123',
        full_name='Rahul Verma',
        role='student',
    )
    StudentProfile.objects.create(
        user=user,
        roll_number='MCA2024002',
        programme='MCA',
        semester=3,
        division='B',
    )
    return user


@pytest.fixture
def department(db):
    """A single department — used by staff fixtures."""
    from apps.departments.models import Department
    return Department.objects.create(
        name='Academic Section',
        code='ACAD',
        description='Handles all academic service requests.',
        is_active=True,
    )


@pytest.fixture
def staff_user(db, department):
    """A staff user with a complete StaffProfile linked to the test department."""
    from apps.accounts.models import StaffProfile
    user = User.objects.create_user(
        email='staff@insightflow.test',
        password='TestPass@123',
        full_name='Anjali Mehta',
        role='staff',
    )
    StaffProfile.objects.create(
        user=user,
        department=department,
        employee_id='EMP001',
        designation='Academic Clerk',
    )
    return user


@pytest.fixture
def staff_user_other_dept(db):
    """A staff user in a different department — for isolation tests."""
    from apps.accounts.models import StaffProfile
    from apps.departments.models import Department
    dept = Department.objects.create(
        name='IT Department',
        code='IT',
        description='Handles IT infrastructure requests.',
    )
    user = User.objects.create_user(
        email='it_staff@insightflow.test',
        password='TestPass@123',
        full_name='Ravi Kumar',
        role='staff',
    )
    StaffProfile.objects.create(
        user=user,
        department=dept,
        employee_id='EMP002',
        designation='IT Officer',
    )
    return user


@pytest.fixture
def admin_user(db):
    """An admin user with no profile extension (admin role is self-contained)."""
    return User.objects.create_user(
        email='admin@insightflow.test',
        password='TestPass@123',
        full_name='Dr. Admin',
        role='admin',
    )


@pytest.fixture
def inactive_user(db):
    """An inactive user — login must be rejected."""
    user = User.objects.create_user(
        email='inactive@insightflow.test',
        password='TestPass@123',
        full_name='Inactive User',
        role='student',
    )
    user.is_active = False
    user.save()
    return user


# ── Authenticated Client Fixtures ───────────────────────────

@pytest.fixture
def auth_student(api_client, student_user):
    """API client force-authenticated as a student."""
    api_client.force_authenticate(user=student_user)
    return api_client


@pytest.fixture
def auth_student_2(api_client, student_user_2):
    """API client force-authenticated as the second student."""
    api_client.force_authenticate(user=student_user_2)
    return api_client


@pytest.fixture
def auth_staff(api_client, staff_user):
    """API client force-authenticated as a staff member."""
    api_client.force_authenticate(user=staff_user)
    return api_client


@pytest.fixture
def auth_admin(api_client, admin_user):
    """API client force-authenticated as an admin."""
    api_client.force_authenticate(user=admin_user)
    return api_client
