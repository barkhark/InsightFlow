"""
InsightFlow — Workload Balancer Engine

Analyzes current staff workload distribution and generates
intelligent reassignment recommendations to optimize queue performance.

Analysis includes:
  1. Per-staff active request count (current load)
  2. Per-staff average completion time (efficiency metric)
  3. Load imbalance detection (coefficient of variation)
  4. Specific reassignment suggestions (from overloaded → underutilized)
  5. Department capacity score (0-100)
"""
from django.utils import timezone
from datetime import timedelta
from django.db.models import Count, Avg, Q


class WorkloadBalancerEngine:
    """
    Analyzes staff workload distribution and generates smart balancing recommendations.
    Stateless class — call class methods directly.
    """

    @classmethod
    def analyze_workload(cls, days: int = 30) -> dict:
        """
        Main analysis entry point. Returns a complete workload analysis report.
        """
        from apps.accounts.models import User
        from apps.requests.models import ServiceRequest, RequestStageHistory
        from apps.departments.models import Department

        since = timezone.now() - timedelta(days=days)

        # ── Staff Load Analysis ───────────────────────────────────────────────
        staff_profiles = []

        staff_members = User.objects.filter(
            role='staff', is_active=True
        ).select_related('staff_profile__department')

        for staff in staff_members:
            # Current active assignments
            active_count = ServiceRequest.objects.filter(
                assignments__assigned_to=staff,
                assignments__is_current=True,
                status__in=['open', 'in_progress']
            ).count()

            # Historical throughput (transitions made)
            transitions = RequestStageHistory.objects.filter(
                transitioned_by=staff,
                exited_at__gte=since,
            )
            transition_count = transitions.count()

            # Average resolution speed
            avg_duration = transitions.filter(
                duration_minutes__isnull=False
            ).aggregate(avg=Avg('duration_minutes'))['avg']

            # SLA breach rate for this staff
            breach_count = transitions.filter(sla_breached=True).count()
            breach_rate = round(breach_count / max(1, transition_count) * 100, 1)

            dept_name = (
                staff.staff_profile.department.name
                if hasattr(staff, 'staff_profile') and staff.staff_profile and staff.staff_profile.department
                else 'Unassigned'
            )

            staff_profiles.append({
                'staff_id': str(staff.id),
                'staff_name': staff.full_name,
                'staff_email': staff.email,
                'department': dept_name,
                'active_queue_count': active_count,
                'transitions_completed': transition_count,
                'avg_completion_minutes': round(avg_duration, 0) if avg_duration else None,
                'sla_breach_rate_pct': breach_rate,
                'efficiency_score': cls._compute_efficiency_score(
                    active_count, transition_count, breach_rate, avg_duration
                ),
                'load_status': cls._classify_load(active_count, transition_count),
            })

        # ── Department Capacity Analysis ──────────────────────────────────────
        dept_analysis = []
        departments = Department.objects.filter(is_active=True)

        for dept in departments:
            dept_staff = [s for s in staff_profiles if s['department'] == dept.name]
            total_active = sum(s['active_queue_count'] for s in dept_staff)
            staff_count = len(dept_staff)
            avg_load = total_active / max(1, staff_count)

            dept_analysis.append({
                'department': dept.name,
                'staff_count': staff_count,
                'total_active_requests': total_active,
                'avg_load_per_staff': round(avg_load, 1),
                'capacity_status': (
                    'critical' if avg_load >= 8
                    else 'strained' if avg_load >= 5
                    else 'normal' if avg_load >= 2
                    else 'underutilized'
                ),
            })

        # ── Generate Reassignment Recommendations ────────────────────────────
        recommendations = cls._generate_recommendations(staff_profiles)

        # ── Global Load Imbalance Score ───────────────────────────────────────
        active_counts = [s['active_queue_count'] for s in staff_profiles if s['active_queue_count'] >= 0]
        imbalance_score = cls._compute_imbalance_score(active_counts)

        # ── Summary ──────────────────────────────────────────────────────────
        overloaded = [s for s in staff_profiles if s['load_status'] == 'overloaded']
        underutilized = [s for s in staff_profiles if s['load_status'] == 'underutilized']

        return {
            'staff_profiles': sorted(staff_profiles, key=lambda x: -x['active_queue_count']),
            'department_analysis': sorted(dept_analysis, key=lambda x: -x['total_active_requests']),
            'recommendations': recommendations,
            'summary': {
                'total_staff_analyzed': len(staff_profiles),
                'overloaded_staff_count': len(overloaded),
                'underutilized_staff_count': len(underutilized),
                'load_imbalance_score': imbalance_score,
                'imbalance_severity': (
                    'Critical' if imbalance_score > 70
                    else 'High' if imbalance_score > 50
                    else 'Moderate' if imbalance_score > 30
                    else 'Balanced'
                ),
                'period_days': days,
                'recommendation_count': len(recommendations),
            },
        }

    @classmethod
    def _generate_recommendations(cls, staff_profiles: list) -> list:
        """
        Generate specific reassignment recommendations.
        """
        recommendations = []

        overloaded = [
            s for s in staff_profiles
            if s['load_status'] in ('overloaded', 'strained')
        ]
        available = [
            s for s in staff_profiles
            if s['load_status'] in ('underutilized', 'balanced')
               and s['transitions_completed'] >= 2  # Has some experience
        ]

        if not overloaded or not available:
            if not overloaded:
                recommendations.append({
                    'type': 'balanced',
                    'priority': 'info',
                    'title': 'Workload Is Balanced',
                    'description': 'No significant imbalances detected across staff members.',
                    'action': 'Continue monitoring. Consider proactive cross-training.',
                })
            return recommendations

        for over in overloaded[:3]:  # Top 3 most overloaded
            for avail in available[:2]:  # Top 2 most available
                if over['department'] == avail['department']:
                    # Same department — ideal for reassignment
                    recommended_transfer = max(1, (over['active_queue_count'] - avail['active_queue_count']) // 2)
                    recommendations.append({
                        'type': 'reassignment',
                        'priority': 'high' if over['load_status'] == 'overloaded' else 'medium',
                        'title': f'Reassign {recommended_transfer} request(s) from {over["staff_name"]}',
                        'description': (
                            f'{over["staff_name"]} has {over["active_queue_count"]} active requests '
                            f'({over["load_status"]}), while {avail["staff_name"]} has only '
                            f'{avail["active_queue_count"]} ({avail["load_status"]}). '
                            f'Both are in {over["department"]}.'
                        ),
                        'from_staff': {
                            'name': over['staff_name'],
                            'email': over['staff_email'],
                            'active_count': over['active_queue_count'],
                        },
                        'to_staff': {
                            'name': avail['staff_name'],
                            'email': avail['staff_email'],
                            'active_count': avail['active_queue_count'],
                        },
                        'suggested_transfer_count': recommended_transfer,
                        'action': f'Use the Assign button on {recommended_transfer} requests in the staff queue.',
                    })
                    break

        # Cross-department recommendation if needed
        cross_dept = [
            s for s in available
            if not any(r.get('to_staff', {}).get('email') == s['staff_email']
                       for r in recommendations)
        ]
        if overloaded and cross_dept:
            over = overloaded[0]
            avail = cross_dept[0]
            if over['department'] != avail['department']:
                recommendations.append({
                    'type': 'cross_department',
                    'priority': 'medium',
                    'title': f'Cross-Department Assistance: {avail["department"]} → {over["department"]}',
                    'description': (
                        f'{over["department"]} is under heavy load with {over["active_queue_count"]} '
                        f'requests queued to {over["staff_name"]}. '
                        f'{avail["staff_name"]} ({avail["department"]}) has capacity to assist.'
                    ),
                    'from_staff': {'name': over['staff_name'], 'email': over['staff_email']},
                    'to_staff': {'name': avail['staff_name'], 'email': avail['staff_email']},
                    'action': 'Coordinate with department heads before cross-department assignment.',
                })

        return recommendations[:5]

    @staticmethod
    def _classify_load(active_count: int, throughput: int) -> str:
        """Classify a staff member's current load status."""
        if active_count >= 8:
            return 'overloaded'
        elif active_count >= 5:
            return 'strained'
        elif active_count >= 2:
            return 'balanced'
        elif throughput >= 3:
            return 'underutilized'
        else:
            return 'balanced'

    @staticmethod
    def _compute_efficiency_score(active: int, throughput: int, breach_rate: float, avg_dur) -> int:
        """
        Compute a 0-100 efficiency score for a staff member.
        Higher = more efficient. Based on throughput, breach rate, and dwell time.
        """
        score = 50  # baseline

        # Throughput bonus (up to +30)
        score += min(30, throughput * 2)

        # Breach rate penalty (up to -30)
        score -= min(30, breach_rate * 0.6)

        # Active queue penalty (overloaded reduces score)
        if active >= 8:
            score -= 15
        elif active >= 5:
            score -= 5

        return max(0, min(100, round(score)))

    @staticmethod
    def _compute_imbalance_score(counts: list) -> int:
        """
        Compute load imbalance score (0-100) using coefficient of variation.
        0 = perfectly balanced, 100 = extreme imbalance.
        """
        if not counts or len(counts) < 2:
            return 0
        mean = sum(counts) / len(counts)
        if mean == 0:
            return 0
        import math
        variance = sum((c - mean) ** 2 for c in counts) / len(counts)
        std = math.sqrt(variance)
        cv = (std / mean) * 100  # Coefficient of Variation (%)
        return min(100, round(cv))
