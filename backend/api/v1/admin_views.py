"""
InsightFlow — Admin Analytics API Views

These endpoints power the custom React Admin Analytics Dashboard.
Not CRUD operations — pure intelligence and analytics.

All responses include:
  - The computed values
  - An `explanation` field describing WHY the value is what it is
    (deterministic, rule-based, no black boxes)

Endpoints:
  GET /api/v1/admin/dashboard/          → aggregate KPIs
  GET /api/v1/admin/department-health/  → per-department SLA health
  GET /api/v1/admin/bottlenecks/        → stages with longest avg duration
  GET /api/v1/admin/trends/             → request volume over time
  GET /api/v1/admin/requests/           → admin view of all requests
"""
from rest_framework.views import APIView
from rest_framework.response import Response
from django.utils import timezone
from datetime import timedelta
from django.db.models import Count, Avg, Q

from core.permissions import IsAdmin
from core.sla_engine import SLAEngine
from apps.requests.models import ServiceRequest, RequestStageHistory
from apps.departments.models import Department
from apps.notifications.models import Notification
from .serializers.request_serializers import RequestListSerializer


class AdminDashboardView(APIView):
    """
    GET /api/v1/admin/dashboard/
    Top-level KPI summary for the admin overview card row.
    """
    permission_classes = [IsAdmin]

    def get(self, request):
        now = timezone.now()
        since_30d = now - timedelta(days=30)
        since_7d = now - timedelta(days=7)

        total_active = ServiceRequest.objects.exclude(
            status__in=['resolved', 'rejected', 'closed', 'cancelled']
        ).count()

        resolved_30d = ServiceRequest.objects.filter(
            status__in=['resolved', 'rejected'],
            resolved_at__gte=since_30d
        ).count()

        sla_breached_active = RequestStageHistory.objects.filter(
            exited_at__isnull=True,
            sla_breached=False  # Currently in stage — check via engine
        ).count()  # Approximate — full computation via SLAEngine in bulk

        new_7d = ServiceRequest.objects.filter(created_at__gte=since_7d).count()

        total_sla_stages = RequestStageHistory.objects.filter(
            exited_at__isnull=False,
            entered_at__gte=since_30d
        ).count()
        breached_stages = RequestStageHistory.objects.filter(
            exited_at__isnull=False,
            entered_at__gte=since_30d,
            sla_breached=True
        ).count()

        compliance_pct = round(
            (1 - breached_stages / total_sla_stages) * 100, 1
        ) if total_sla_stages > 0 else 100.0

        return Response({
            'success': True,
            'data': {
                'total_active_requests': total_active,
                'resolved_last_30_days': resolved_30d,
                'new_last_7_days': new_7d,
                'sla_compliance_pct_30d': compliance_pct,
                'explanation': (
                    f'As of {now.strftime("%Y-%m-%d %H:%M UTC")}: '
                    f'{total_active} requests are actively in-progress. '
                    f'{resolved_30d} were resolved in the last 30 days. '
                    f'SLA compliance stands at {compliance_pct}% across '
                    f'{total_sla_stages} completed stage transitions.'
                )
            }
        })


class DepartmentHealthView(APIView):
    """
    GET /api/v1/admin/department-health/
    Per-department SLA compliance summary.
    Powers the Department Health grid on the admin dashboard.
    """
    permission_classes = [IsAdmin]

    def get(self, request):
        days = int(request.query_params.get('days', 30))
        departments = Department.objects.filter(is_active=True)
        engine = SLAEngine()
        results = [engine.department_sla_summary(dept, days=days) for dept in departments]

        # Sort by compliance ascending (worst first — most actionable)
        results.sort(key=lambda x: x['compliance_rate_pct'])

        return Response({
            'success': True,
            'data': results,
            'meta': {'period_days': days, 'department_count': len(results)}
        })


class BottleneckAnalysisView(APIView):
    """
    GET /api/v1/admin/bottlenecks/
    Identifies workflow stages with the highest average processing time.
    Explainable: each result includes a reason and actionable suggestion.
    """
    permission_classes = [IsAdmin]

    def get(self, request):
        days = int(request.query_params.get('days', 30))
        since = timezone.now() - timedelta(days=days)

        stages_data = RequestStageHistory.objects.filter(
            exited_at__isnull=False,
            entered_at__gte=since,
        ).values(
            'stage__id', 'stage__name', 'stage__workflow__name',
            'stage__responsible_department__name'
        ).annotate(
            avg_duration=Avg('duration_minutes'),
            total_count=Count('id'),
            breach_count=Count('id', filter=Q(sla_breached=True)),
        ).order_by('-avg_duration')[:10]

        results = []
        for row in stages_data:
            avg_d = round(row['avg_duration'] or 0)
            total = row['total_count']
            breaches = row['breach_count']
            breach_rate = round(breaches / total * 100, 1) if total > 0 else 0

            if avg_d > 480:  # > 8 hours
                severity = 'critical'
                suggestion = 'Consider increasing staff capacity or splitting this stage.'
            elif avg_d > 240:  # > 4 hours
                severity = 'warning'
                suggestion = 'Monitor closely. Staff workload may be high.'
            else:
                severity = 'normal'
                suggestion = 'Processing time is within acceptable range.'

            results.append({
                'stage_name': row['stage__name'],
                'workflow_name': row['stage__workflow__name'],
                'department_name': row['stage__responsible_department__name'],
                'avg_duration_minutes': avg_d,
                'avg_duration_formatted': SLAEngine._fmt(avg_d),
                'total_transitions': total,
                'breach_count': breaches,
                'breach_rate_pct': breach_rate,
                'severity': severity,
                'explanation': (
                    f'Stage "{row["stage__name"]}" in {row["stage__workflow__name"]} '
                    f'averaged {SLAEngine._fmt(avg_d)} per request over {total} '
                    f'transitions in the last {days} days. '
                    f'{breach_rate}% breached the SLA target. {suggestion}'
                ),
            })

        return Response({
            'success': True,
            'data': results,
            'meta': {'period_days': days, 'stages_analysed': len(results)}
        })


class TrendsView(APIView):
    """
    GET /api/v1/admin/trends/
    Daily request volume for the last N days.
    Used for the volume trend chart.
    """
    permission_classes = [IsAdmin]

    def get(self, request):
        days = int(request.query_params.get('days', 30))
        since = timezone.now() - timedelta(days=days)

        from django.db.models.functions import TruncDate
        daily = (
            ServiceRequest.objects
            .filter(created_at__gte=since)
            .annotate(date=TruncDate('created_at'))
            .values('date')
            .annotate(count=Count('id'))
            .order_by('date')
        )

        return Response({
            'success': True,
            'data': [
                {'date': str(row['date']), 'count': row['count']}
                for row in daily
            ],
            'meta': {'period_days': days}
        })


class AdminRequestListView(APIView):
    """
    GET /api/v1/admin/requests/
    Admin view of all requests — filterable, paginated.
    """
    permission_classes = [IsAdmin]

    def get(self, request):
        qs = ServiceRequest.objects.select_related(
            'service_category', 'current_stage', 'student'
        ).order_by('-created_at')

        # Filtering
        for param, field in [
            ('status', 'status'), ('priority', 'priority'),
            ('department_id', 'current_stage__responsible_department_id'),
            ('category_id', 'service_category_id'),
        ]:
            val = request.query_params.get(param)
            if val:
                qs = qs.filter(**{field: val})

        search = request.query_params.get('search')
        if search:
            from django.db.models import Q as DQ
            qs = qs.filter(
                DQ(reference_number__icontains=search) |
                DQ(title__icontains=search) |
                DQ(student__full_name__icontains=search)
            )

        from core.pagination import StandardPagination
        paginator = StandardPagination()
        page = paginator.paginate_queryset(qs, request)
        if page is not None:
            return paginator.get_paginated_response(
                RequestListSerializer(page, many=True, context={'request': request}).data
            )
        return Response({'success': True, 'data': RequestListSerializer(qs, many=True, context={'request': request}).data})


class AdminInsightsView(APIView):
    """
    GET /api/v1/admin/insights/
    Returns institutional Service Improvement Insights derived from empirical workflow metrics.
    """
    permission_classes = [IsAdmin]

    def get(self, request):
        days = int(request.query_params.get('days', 30))
        engine = SLAEngine()
        insights = engine.generate_service_improvement_insights(days=days)
        return Response({
            'success': True,
            'data': insights,
            'meta': {'period_days': days, 'total_insights': len(insights)}
        })
