"""
InsightFlow — Accounts Serializers

LoginSerializer: Validates email + password, returns authenticated User.
StudentProfileSerializer: Read-only profile data for student users.
StaffProfileSerializer: Read-only profile data for staff users.
UserMeSerializer: Combined user + profile data for /auth/me/ endpoint.
"""
from django.contrib.auth import authenticate
from rest_framework import serializers
from .models import User, StudentProfile, StaffProfile


class StudentProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = StudentProfile
        fields = ['roll_number', 'programme', 'semester', 'division']


class StaffProfileSerializer(serializers.ModelSerializer):
    department_name = serializers.CharField(
        source='department.name',
        read_only=True,
        default=None
    )
    department_id = serializers.UUIDField(
        source='department.id',
        read_only=True,
        default=None
    )

    class Meta:
        model = StaffProfile
        fields = ['employee_id', 'designation', 'department_id', 'department_name']


class UserMeSerializer(serializers.ModelSerializer):
    """
    Serializer for the /auth/me/ endpoint.
    Includes role-specific profile as a nested object.
    Returns null for profile if the profile does not exist.
    """
    profile = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'email', 'full_name', 'role', 'profile', 'date_joined', 'last_login']
        read_only_fields = fields

    def get_profile(self, obj: User):
        if obj.role == User.Role.STUDENT:
            try:
                return StudentProfileSerializer(obj.student_profile).data
            except StudentProfile.DoesNotExist:
                return None
        elif obj.role == User.Role.STAFF:
            try:
                return StaffProfileSerializer(obj.staff_profile).data
            except StaffProfile.DoesNotExist:
                return None
        return None


class LoginSerializer(serializers.Serializer):
    """
    Validates login credentials.
    On success, attaches the authenticated User to validated_data['user'].
    """
    email = serializers.EmailField(
        help_text='Registered email address.'
    )
    password = serializers.CharField(
        write_only=True,
        style={'input_type': 'password'},
        help_text='Account password.'
    )

    def validate(self, attrs: dict) -> dict:
        raw_email = attrs.get('email', '').strip().lower()
        password = attrs.get('password', '')

        if not raw_email or not password:
            raise serializers.ValidationError(
                'Both email and password are required.',
                code='missing_credentials'
            )

        # Standard Django authentication
        user = authenticate(
            request=self.context.get('request'),
            username=raw_email,
            password=password
        )

        # Case-insensitive email fallback authentication
        if user is None:
            from apps.accounts.models import User
            user_candidate = User.objects.filter(email__iexact=raw_email).first()
            if user_candidate and user_candidate.check_password(password):
                user = user_candidate

        if user is None:
            raise serializers.ValidationError(
                'Invalid institutional credentials. Please check your email and password.',
                code='invalid_credentials'
            )

        if not user.is_active:
            raise serializers.ValidationError(
                'This account has been deactivated. Please contact the administrator.',
                code='account_disabled'
            )

        attrs['user'] = user
        return attrs
