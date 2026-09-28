"""
InsightFlow — Shared Utilities

Helpers used across multiple apps. No Django model imports here
to keep this module importable without Django setup.
"""
import uuid
from django.utils import timezone


def generate_reference_number() -> str:
    """
    Generate a unique human-readable reference number: REQ-{YYYY}-{5-digit-seq}
    Example: REQ-2026-00042

    Uses the total ServiceRequest count + 1 as the sequence.
    Called inside a transaction in WorkflowEngine.initialise_request()
    so the count is stable within the atomic block.
    """
    from apps.requests.models import ServiceRequest
    year = timezone.now().year
    count = ServiceRequest.objects.count() + 1
    return f"REQ-{year}-{count:05d}"


def success_response(data=None, message: str = None, status_code: int = 200) -> dict:
    """
    Build a standard InsightFlow success response body.
    Used by views that don't go through a serializer directly.
    """
    return {
        'success': True,
        'data': data,
        'message': message,
    }
