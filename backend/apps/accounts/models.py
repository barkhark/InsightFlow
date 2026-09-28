"""
InsightFlow — Account Models

User: UUID-based custom user model with email authentication and role enum.
StudentProfile: Extended profile for student users.
StaffProfile: Extended profile for staff users (links to Department).

Design decisions:
- UUID primary keys prevent enumeration attacks on API endpoints.
- Role is stored on the User model for fast permission checks without joins.
- Profiles are separate OneToOne models to keep User lean and extensible.
- StaffProfile.department is nullable at model level; enforced non-null in business logic.
"""
import uuid
from django.db import models
from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin
from .managers import UserManager


class User(AbstractBaseUser, PermissionsMixin):
    """
    Central user model for InsightFlow.
    All three roles (student, staff, admin) share this model.
    Role-specific data is in StudentProfile / StaffProfile.
    """

    class Role(models.TextChoices):
        STUDENT = 'student', 'Student'
        STAFF = 'staff', 'Staff'
        ADMIN = 'admin', 'Administrator'

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
        help_text='UUID primary key — not sequential to prevent enumeration.'
    )
    email = models.EmailField(
        unique=True,
        help_text='Primary login identifier.'
    )
    full_name = models.CharField(max_length=150)
    role = models.CharField(
        max_length=10,
        choices=Role.choices,
        help_text='Determines dashboard, permissions, and data scope.'
    )

    # Django Admin access flag (separate from InsightFlow admin role)
    is_staff = models.BooleanField(
        default=False,
        help_text='Designates whether the user can log into the Django admin site.'
    )
    is_active = models.BooleanField(
        default=True,
        help_text='Inactive users cannot log in. Use this instead of deleting.'
    )
    date_joined = models.DateTimeField(auto_now_add=True)
    last_login = models.DateTimeField(null=True, blank=True)

    # Email is the login field, not username
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['full_name', 'role']

    objects = UserManager()

    class Meta:
        db_table = 'accounts_user'
        verbose_name = 'User'
        verbose_name_plural = 'Users'
        ordering = ['full_name']

    def __str__(self):
        return f'{self.full_name} <{self.email}> [{self.role}]'

    @property
    def is_student(self) -> bool:
        return self.role == self.Role.STUDENT

    @property
    def is_staff_member(self) -> bool:
        """Avoid shadowing Django's is_staff attribute."""
        return self.role == self.Role.STAFF

    @property
    def is_admin(self) -> bool:
        return self.role == self.Role.ADMIN


class StudentProfile(models.Model):
    """
    Extended data for student users.
    Created automatically alongside the User in seeding/registration.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name='student_profile'
    )
    roll_number = models.CharField(max_length=20, unique=True)
    programme = models.CharField(
        max_length=50,
        help_text='e.g. MCA, MBA, BCA'
    )
    semester = models.PositiveSmallIntegerField()
    division = models.CharField(max_length=10, blank=True)

    class Meta:
        db_table = 'accounts_student_profile'
        verbose_name = 'Student Profile'
        verbose_name_plural = 'Student Profiles'

    def __str__(self):
        return f'{self.roll_number} — {self.user.full_name}'


class StaffProfile(models.Model):
    """
    Extended data for staff users.
    department FK is nullable at DB level; business logic enforces it is set.
    Department is imported as a string reference to avoid circular imports.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name='staff_profile'
    )
    department = models.ForeignKey(
        'departments.Department',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='staff_members',
        help_text='Department this staff member belongs to. Determines request access scope.'
    )
    employee_id = models.CharField(max_length=20, unique=True)
    designation = models.CharField(
        max_length=100,
        help_text='e.g. Clerk, HOD, IT Officer, Librarian'
    )

    class Meta:
        db_table = 'accounts_staff_profile'
        verbose_name = 'Staff Profile'
        verbose_name_plural = 'Staff Profiles'

    def __str__(self):
        dept_name = self.department.name if self.department else 'Unassigned'
        return f'{self.employee_id} — {self.user.full_name} ({dept_name})'
