"""
InsightFlow API v1 — URL Router

All ViewSets are registered here using DRF's DefaultRouter.
ViewSets are registered incrementally as each phase is completed.

Phase 1: No ViewSets yet (auth uses APIView, not ViewSet)
Phase 5: All ViewSets registered here
"""
from rest_framework.routers import DefaultRouter

router = DefaultRouter(trailing_slash=False)

# ── Phase 5 ViewSet registrations ──────────────────────────
# Uncommented as each phase is implemented:
# router.register(r'service-areas', ServiceAreaViewSet, basename='service-area')
# router.register(r'service-categories', ServiceCategoryViewSet, basename='service-category')
# router.register(r'requests', StudentRequestViewSet, basename='student-request')
# router.register(r'staff/queue', StaffQueueViewSet, basename='staff-queue')
# router.register(r'notifications', NotificationViewSet, basename='notification')
# router.register(r'admin/requests', AdminRequestViewSet, basename='admin-request')
