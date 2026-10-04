"""
InsightFlow — Health Check Endpoint

Validates the operational health of the backend application and its
underlying database connection.
Accessible without authentication for monitoring probes and Docker healthchecks.
"""
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from rest_framework import status
from django.db import connection
from django.utils import timezone
import logging

logger = logging.getLogger('insightflow')


class HealthCheckView(APIView):
    """
    GET /api/health/ or /api/v1/health/

    Response:
      200 OK:
        {
          "success": true,
          "status": "healthy",
          "timestamp": "2026-10-03T...",
          "version": "1.0.0",
          "services": {
            "application": "operational",
            "database": "connected"
          },
          "database_engine": "sqlite3" (or "postgresql")
        }
      503 Service Unavailable:
        {
          "success": false,
          "status": "unhealthy",
          "services": {
            "application": "operational",
            "database": "disconnected"
          },
          "error": "..."
        }
    """
    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request):
        db_status = 'connected'
        db_error = None
        http_status = status.HTTP_200_OK

        try:
            with connection.cursor() as cursor:
                cursor.execute('SELECT 1')
                cursor.fetchone()
        except Exception as e:
            db_status = 'disconnected'
            db_error = str(e)
            http_status = status.HTTP_503_SERVICE_UNAVAILABLE
            logger.error('Health check probe database connection error: %s', str(e))

        is_healthy = db_status == 'connected'

        return Response({
            'success': is_healthy,
            'status': 'healthy' if is_healthy else 'unhealthy',
            'timestamp': timezone.now().isoformat(),
            'version': '1.0.0',
            'services': {
                'application': 'operational',
                'database': db_status,
            },
            'database_engine': connection.vendor,
            'error': db_error,
        }, status=http_status)
