"""
InsightFlow — Accounts Views

LoginView:      POST /api/v1/auth/login/          → access + refresh tokens + user data
LogoutView:     POST /api/v1/auth/logout/         → blacklist refresh token
MeView:         GET  /api/v1/auth/me/             → current authenticated user
GoogleAuthView: POST /api/v1/auth/google/         → Sign in with Google OAuth2
RegisterView:   POST /api/v1/auth/register/       → Self-register as a new student

Token refresh is delegated directly to SimpleJWT's TokenRefreshView (mounted in urls.py).

All responses follow the InsightFlow envelope:
  Success: { "success": true, "data": {...} }
  Error:   { "success": false, "error": { "code": "...", "message": "..." } }
"""
import logging
from django.conf import settings
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError

from core.middleware import LoginRateThrottle
from .serializers import LoginSerializer, UserMeSerializer
from .models import User

logger = logging.getLogger('insightflow')


class LoginView(APIView):
    """
    Authenticate a user and return JWT tokens.

    POST /api/v1/auth/login/
    Body: { "email": "...", "password": "..." }

    Returns:
        200: { success, data: { access, refresh, user } }
        400: { success: false, error: { code, message } }
    """
    permission_classes = [AllowAny]
    authentication_classes = []  # No auth required for login
    throttle_classes = [LoginRateThrottle]  # Industry: 10/min brute-force protection

    def post(self, request):
        serializer = LoginSerializer(
            data=request.data,
            context={'request': request}
        )
        serializer.is_valid(raise_exception=True)

        user = serializer.validated_data['user']
        refresh = RefreshToken.for_user(user)

        return Response({
            'success': True,
            'data': {
                'access': str(refresh.access_token),
                'refresh': str(refresh),
                'user': UserMeSerializer(user).data,
            },
            'message': f'Welcome back, {user.full_name}.'
        }, status=status.HTTP_200_OK)


class LogoutView(APIView):
    """
    Blacklist the provided refresh token.
    The access token will expire naturally (60 min).

    POST /api/v1/auth/logout/
    Body: { "refresh": "<refresh_token>" }

    Returns:
        200: { success: true }
        400: Token invalid (already blacklisted or malformed)
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        refresh_token = request.data.get('refresh')

        if not refresh_token:
            return Response({
                'success': False,
                'data': None,
                'error': {
                    'code': 'MISSING_REFRESH_TOKEN',
                    'message': 'Refresh token is required.',
                    'details': None,
                }
            }, status=status.HTTP_400_BAD_REQUEST)

        try:
            token = RefreshToken(refresh_token)
            token.blacklist()
        except TokenError:
            # Token already blacklisted or invalid — treat as logged out
            pass

        return Response({
            'success': True,
            'data': None,
            'message': 'Logged out successfully.'
        }, status=status.HTTP_200_OK)


class MeView(APIView):
    """
    Return the authenticated user's profile.

    GET /api/v1/auth/me/

    Returns:
        200: { success, data: { id, email, full_name, role, profile, ... } }
        401: Unauthenticated
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = UserMeSerializer(request.user)
        return Response({
            'success': True,
            'data': serializer.data,
        }, status=status.HTTP_200_OK)


class GoogleAuthView(APIView):
    """
    Authenticate a user via Google OAuth2 access token.

    POST /api/v1/auth/google/
    Body: { "access_token": "<google_access_token>" }

    Flow:
        1. Use the Google access token to fetch user info from Google's userinfo endpoint.
        2. Extract email from the verified response.
        3. Find the matching InsightFlow user by email.
        4. Issue InsightFlow JWT tokens.

    Note: This does NOT auto-create new users — users must already exist
    in InsightFlow (seeded by admin) and use a matching Google account email.

    Returns:
        200: { success, data: { access, refresh, user } }
        400: Invalid/expired Google token
        404: No InsightFlow account with that Google email
    """
    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = [LoginRateThrottle]

    def post(self, request):
        access_token = request.data.get('access_token')
        if not access_token:
            return Response({
                'success': False,
                'data': None,
                'error': {
                    'code': 'MISSING_TOKEN',
                    'message': 'Google access token is required.',
                    'details': None,
                }
            }, status=status.HTTP_400_BAD_REQUEST)

        # Fetch user info from Google's userinfo endpoint
        try:
            import requests as req_lib
            google_response = req_lib.get(
                'https://www.googleapis.com/oauth2/v3/userinfo',
                headers={'Authorization': f'Bearer {access_token}'},
                timeout=10,
            )
            if google_response.status_code != 200:
                raise ValueError(f'Google returned status {google_response.status_code}')
            id_info = google_response.json()
        except ValueError as exc:
            logger.warning('Google OAuth token verification failed: %s', exc)
            return Response({
                'success': False,
                'data': None,
                'error': {
                    'code': 'INVALID_GOOGLE_TOKEN',
                    'message': 'Google sign-in failed. Token is invalid or expired. Please try again.',
                    'details': str(exc),
                }
            }, status=status.HTTP_400_BAD_REQUEST)
        except Exception as exc:
            logger.error('Unexpected error during Google OAuth: %s', exc)
            return Response({
                'success': False,
                'data': None,
                'error': {
                    'code': 'GOOGLE_AUTH_ERROR',
                    'message': 'Google sign-in is temporarily unavailable. Please use email/password.',
                    'details': None,
                }
            }, status=status.HTTP_400_BAD_REQUEST)

        # Extract user info from Google response
        email = id_info.get('email', '').lower().strip()
        google_name = id_info.get('name', email.split('@')[0].replace('.', ' ').title())

        if not email:
            return Response({
                'success': False,
                'data': None,
                'error': {
                    'code': 'NO_EMAIL_IN_TOKEN',
                    'message': 'Google account does not have a verified email.',
                    'details': None,
                }
            }, status=status.HTTP_400_BAD_REQUEST)

        # Find or auto-create InsightFlow user
        # New users are created as Students (institutional default)
        created = False
        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            # Auto-create a new student account for first-time Google sign-in
            import uuid as uuid_mod
            from apps.accounts.models import StudentProfile
            user = User.objects.create_user(
                email=email,
                full_name=google_name,
                role=User.Role.STUDENT,
                password=None,  # Google users don't need a password
            )
            # Create a minimal StudentProfile
            StudentProfile.objects.create(
                user=user,
                roll_number=f'G-{str(user.id)[:8].upper()}',
                programme='Google SSO',
                semester=1,
                division='A',
            )
            created = True
            logger.info('Auto-created InsightFlow account for Google user: %s (%s)', google_name, email)

        if not user.is_active:
            return Response({
                'success': False,
                'data': None,
                'error': {
                    'code': 'ACCOUNT_INACTIVE',
                    'message': 'Your InsightFlow account has been deactivated.',
                    'details': None,
                }
            }, status=status.HTTP_403_FORBIDDEN)

        # Issue InsightFlow JWT tokens
        refresh = RefreshToken.for_user(user)
        action = 'created and signed in' if created else 'signed in'
        logger.info('Google OAuth %s successfully for %s (%s)', action, user.full_name, email)

        welcome_msg = (
            f'Welcome to InsightFlow, {user.full_name}! Your student account has been created.'
            if created else
            f'Welcome back, {user.full_name}! Signed in with Google.'
        )

        return Response({
            'success': True,
            'data': {
                'access': str(refresh.access_token),
                'refresh': str(refresh),
                'user': UserMeSerializer(user).data,
            },
            'message': welcome_msg,
        }, status=status.HTTP_200_OK)


class RegisterView(APIView):
    """
    Register a new student account.

    POST /api/v1/auth/register/
    Body: {
        "email": "...",
        "full_name": "...",
        "password": "...",
        "roll_number": "...",
        "programme": "MCA",
        "semester": 1,
        "division": "A"
    }

    Returns:
        201: { success, data: { access, refresh, user }, message }
        400: Validation error (duplicate email, missing fields, etc.)
    """
    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = [LoginRateThrottle]

    def post(self, request):
        from .models import StudentProfile
        from django.contrib.auth.password_validation import validate_password
        from django.core.exceptions import ValidationError as DjangoValidationError

        data = request.data

        # --- Required field validation ---
        required = ['email', 'full_name', 'password', 'roll_number', 'programme', 'semester']
        missing = [f for f in required if not data.get(f)]
        if missing:
            return Response({
                'success': False,
                'data': None,
                'error': {
                    'code': 'MISSING_FIELDS',
                    'message': f'Required fields missing: {", ".join(missing)}.',
                    'details': None,
                }
            }, status=status.HTTP_400_BAD_REQUEST)

        email = str(data['email']).strip().lower()
        full_name = str(data['full_name']).strip()
        password = str(data['password'])
        roll_number = str(data['roll_number']).strip().upper()
        programme = str(data['programme']).strip()
        division = str(data.get('division', 'A')).strip()

        try:
            semester = int(data['semester'])
            if semester < 1 or semester > 12:
                raise ValueError()
        except (ValueError, TypeError):
            return Response({
                'success': False,
                'data': None,
                'error': {
                    'code': 'INVALID_SEMESTER',
                    'message': 'Semester must be a number between 1 and 12.',
                    'details': None,
                }
            }, status=status.HTTP_400_BAD_REQUEST)

        # --- Uniqueness checks ---
        if User.objects.filter(email=email).exists():
            return Response({
                'success': False,
                'data': None,
                'error': {
                    'code': 'EMAIL_TAKEN',
                    'message': 'An account with this email already exists. Please sign in instead.',
                    'details': None,
                }
            }, status=status.HTTP_400_BAD_REQUEST)

        if StudentProfile.objects.filter(roll_number=roll_number).exists():
            return Response({
                'success': False,
                'data': None,
                'error': {
                    'code': 'ROLL_NUMBER_TAKEN',
                    'message': 'This roll number is already registered. Contact admin if this is an error.',
                    'details': None,
                }
            }, status=status.HTTP_400_BAD_REQUEST)

        # --- Password strength ---
        try:
            validate_password(password)
        except DjangoValidationError as exc:
            return Response({
                'success': False,
                'data': None,
                'error': {
                    'code': 'WEAK_PASSWORD',
                    'message': ' '.join(exc.messages),
                    'details': None,
                }
            }, status=status.HTTP_400_BAD_REQUEST)

        # --- Create user + profile ---
        try:
            user = User.objects.create_user(
                email=email,
                full_name=full_name,
                role=User.Role.STUDENT,
                password=password,
            )
            StudentProfile.objects.create(
                user=user,
                roll_number=roll_number,
                programme=programme,
                semester=semester,
                division=division,
            )
        except Exception as exc:
            logger.error('Registration failed for %s: %s', email, exc)
            return Response({
                'success': False,
                'data': None,
                'error': {
                    'code': 'REGISTRATION_FAILED',
                    'message': 'Registration failed due to a server error. Please try again.',
                    'details': None,
                }
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        logger.info('New student registered: %s (%s)', full_name, email)

        # Auto-login: issue tokens immediately
        refresh = RefreshToken.for_user(user)
        return Response({
            'success': True,
            'data': {
                'access': str(refresh.access_token),
                'refresh': str(refresh),
                'user': UserMeSerializer(user).data,
            },
            'message': f'Welcome to InsightFlow, {full_name}! Your student account has been created.',
        }, status=status.HTTP_201_CREATED)
