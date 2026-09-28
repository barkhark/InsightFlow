"""
InsightFlow — Accounts Views

LoginView:  POST /api/v1/auth/login/       → access + refresh tokens + user data
LogoutView: POST /api/v1/auth/logout/      → blacklist refresh token
MeView:     GET  /api/v1/auth/me/          → current authenticated user

Token refresh is delegated directly to SimpleJWT's TokenRefreshView (mounted in urls.py).

All responses follow the InsightFlow envelope:
  Success: { "success": true, "data": {...} }
  Error:   { "success": false, "error": { "code": "...", "message": "..." } }
"""
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError

from .serializers import LoginSerializer, UserMeSerializer


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
