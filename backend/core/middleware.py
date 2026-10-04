# InsightFlow - Industry Middleware and Custom Throttle Classes
# Adds API version headers to every response and custom throttle scopes.
from django.conf import settings


class APIVersionMiddleware:
    """Injects X-API-Version, X-Powered-By, and security headers on every response."""

    def __init__(self, get_response):
        self.get_response = get_response
        self.api_version = getattr(settings, 'API_VERSION', '1.0.0')

    def __call__(self, request):
        response = self.get_response(request)
        response['X-API-Version'] = self.api_version
        response['X-Powered-By'] = 'InsightFlow/1.0'
        response['X-Content-Type-Options'] = 'nosniff'
        response['X-Frame-Options'] = 'DENY'
        response['Referrer-Policy'] = 'strict-origin-when-cross-origin'
        return response


# ---- Custom Throttle Scopes ----------------------------------------
from rest_framework.throttling import AnonRateThrottle, UserRateThrottle


class LoginRateThrottle(AnonRateThrottle):
    """Strict per-IP throttle for the login endpoint (10 per minute).
    Returns None (no throttling) when scope rate is not configured,
    making it safe in dev/test environments.
    """
    scope = 'login'

    def get_rate(self):
        try:
            return super().get_rate()
        except Exception:
            return None


class UploadRateThrottle(UserRateThrottle):
    """Per-user throttle for file upload endpoint (20 per hour).
    Returns None (no throttling) when scope rate is not configured,
    making it safe in dev/test environments.
    """
    scope = 'upload'

    def get_rate(self):
        try:
            return super().get_rate()
        except Exception:
            return None
