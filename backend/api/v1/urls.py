"""
InsightFlow API v1 — Complete URL Configuration

All API routes are mounted under /api/v1/ by the root urls.py.

Route map:
  /api/v1/auth/...                      → JWT auth (Phase 1)
  /api/v1/requests/                     → StudentRequestViewSet
  /api/v1/staff/queue/                  → StaffQueueViewSet
  /api/v1/service-areas/                → ServiceAreaListView
  /api/v1/service-categories/           → ServiceCategoryListView / DetailView
  /api/v1/notifications/                → NotificationListView
  /api/v1/notifications/count/          → NotificationCountView
  /api/v1/notifications/mark-read/      → NotificationMarkReadView
  /api/v1/admin/dashboard/              → AdminDashboardView
  /api/v1/admin/department-health/      → DepartmentHealthView
  /api/v1/admin/bottlenecks/            → BottleneckAnalysisView
  /api/v1/admin/trends/                 → TrendsView
  /api/v1/admin/requests/               → AdminRequestListView
"""
from django.urls import path, include

from .student_views import StudentRequestViewSet
from .staff_views import (
    StaffQueueViewSet,
    ServiceAreaListView, ServiceCategoryListView, ServiceCategoryDetailView,
    NotificationListView, NotificationMarkReadView, NotificationCountView,
)
from .admin_views import (
    AdminDashboardView, DepartmentHealthView,
    BottleneckAnalysisView, TrendsView, AdminRequestListView,
    AdminInsightsView,
)

# ── Student Request routes (manual — ViewSet without router) ────────────────
student_request_list = StudentRequestViewSet.as_view({
    'get': 'list',
    'post': 'create',
})
student_request_detail = StudentRequestViewSet.as_view({
    'get': 'retrieve',
})
student_comments = StudentRequestViewSet.as_view({
    'get': 'comments',
    'post': 'comments',
})
student_attachments = StudentRequestViewSet.as_view({
    'post': 'attachments',
})

# ── Staff Queue routes ──────────────────────────────────────────────────────
staff_queue_list = StaffQueueViewSet.as_view({'get': 'list'})
staff_queue_detail = StaffQueueViewSet.as_view({'get': 'retrieve'})
staff_transition = StaffQueueViewSet.as_view({'post': 'transition'})
staff_comments = StaffQueueViewSet.as_view({'get': 'comments', 'post': 'comments'})
staff_assign = StaffQueueViewSet.as_view({'post': 'assign'})

urlpatterns = [
    # Auth (Phase 1)
    path('auth/', include('apps.accounts.urls')),

    # Student request endpoints
    path('requests/', student_request_list, name='student-request-list'),
    path('requests/<uuid:pk>/', student_request_detail, name='student-request-detail'),
    path('requests/<uuid:pk>/comments/', student_comments, name='student-request-comments'),
    path('requests/<uuid:pk>/attachments/', student_attachments, name='student-request-attachments'),

    # Staff queue endpoints
    path('staff/queue/', staff_queue_list, name='staff-queue-list'),
    path('staff/queue/<uuid:pk>/', staff_queue_detail, name='staff-queue-detail'),
    path('staff/queue/<uuid:pk>/transition/', staff_transition, name='staff-transition'),
    path('staff/queue/<uuid:pk>/comments/', staff_comments, name='staff-queue-comments'),
    path('staff/queue/<uuid:pk>/assign/', staff_assign, name='staff-assign'),

    # Service category discovery (for student form rendering)
    path('service-areas/', ServiceAreaListView.as_view(), name='service-area-list'),
    path('service-categories/', ServiceCategoryListView.as_view(), name='service-category-list'),
    path('service-categories/<uuid:pk>/', ServiceCategoryDetailView.as_view(), name='service-category-detail'),

    # Notifications (60s polling, Q3)
    path('notifications/', NotificationListView.as_view(), name='notification-list'),
    path('notifications/count/', NotificationCountView.as_view(), name='notification-count'),
    path('notifications/mark-read/', NotificationMarkReadView.as_view(), name='notification-mark-read'),

    # Admin analytics dashboard
    path('admin/dashboard/', AdminDashboardView.as_view(), name='admin-dashboard'),
    path('admin/department-health/', DepartmentHealthView.as_view(), name='admin-dept-health'),
    path('admin/bottlenecks/', BottleneckAnalysisView.as_view(), name='admin-bottlenecks'),
    path('admin/trends/', TrendsView.as_view(), name='admin-trends'),
    path('admin/requests/', AdminRequestListView.as_view(), name='admin-request-list'),
    path('admin/insights/', AdminInsightsView.as_view(), name='admin-insights'),
]
