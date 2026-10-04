"""
InsightFlow — Custom DRF Exception Handler

Ensures ALL error responses follow a consistent JSON envelope:
{
    "success": false,
    "data": null,
    "error": {
        "code": "VALIDATION_ERROR",
        "message": "Human-readable message",
        "details": { ... }   // field-level errors if applicable
    }
}

This means the frontend can always check `response.data.success`
and `response.data.error.message` without guessing the shape.
"""
from rest_framework.views import exception_handler
from rest_framework import status


def custom_exception_handler(exc, context):
    """
    Call DRF's default handler first to get the standard Response,
    then reshape it into the InsightFlow envelope.
    """
    response = exception_handler(exc, context)

    if response is None:
        # Unexpected server error (500) — log safely without leaking internals to client
        import logging
        logger = logging.getLogger('insightflow')
        logger.exception("Unhandled server exception: %s", str(exc), exc_info=exc)
        from rest_framework.response import Response
        return Response({
            'success': False,
            'data': None,
            'error': {
                'code': 'INTERNAL_SERVER_ERROR',
                'message': 'An unexpected server error occurred. Please contact the system administrator.',
                'details': None,
            }
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    error_detail = response.data
    code = 'ERROR'
    message = 'An unexpected error occurred.'
    details = None

    if isinstance(error_detail, dict):
        if 'detail' in error_detail:
            detail = error_detail['detail']
            message = str(detail)
            raw_code = getattr(detail, 'code', 'error')
            code = str(raw_code).upper() if raw_code else 'ERROR'
        else:
            # Serializer field validation errors
            code = 'VALIDATION_ERROR'
            message = 'One or more fields failed validation.'
            details = {
                field: [str(e) for e in errors]
                for field, errors in error_detail.items()
            }

            # Check non_field_errors for specific error codes (e.g. login failures)
            non_field = error_detail.get('non_field_errors')
            if non_field:
                first_error = non_field[0]
                raw_code = getattr(first_error, 'code', None)
                if raw_code:
                    code = str(raw_code).upper().replace('-', '_')
                message = str(first_error)
            else:
                # Try to extract a readable primary message from first field
                first_field = next(iter(error_detail), None)
                if first_field and error_detail[first_field]:
                    message = str(error_detail[first_field][0])
    elif isinstance(error_detail, list):
        code = 'ERROR'
        message = str(error_detail[0]) if error_detail else 'Error'

    response.data = {
        'success': False,
        'data': None,
        'error': {
            'code': code,
            'message': message,
            'details': details,
        }
    }

    return response
