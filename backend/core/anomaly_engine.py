"""
InsightFlow — Anomaly Detection Engine

Uses statistical analysis (mean ± 2σ standard deviation) to automatically
detect and surface abnormal patterns in institutional workflow data.

Detected anomaly types:
  1. SLA Outliers       — Requests processing 2× the historical stage average
  2. Volume Spikes      — Days with unusually high intake (mean + 2σ)
  3. Staff Throughput   — Staff with sudden drops in request completion rate
  4. Department Surges  — Departments with abnormal queue growth
  5. Repeat Requestors  — Students submitting unusually high request counts

All findings include:
  - anomaly_type: str
  - severity: 'critical' | 'warning' | 'info'
  - title: str (human-readable headline)
  - description: str (empirical evidence)
  - evidence: dict (raw numbers)
  - recommended_action: str
"""
import math
from django.utils import timezone
from datetime import timedelta
from django.db.models import Count, Avg, Q
from django.db.models.functions import TruncDate


class AnomalyEngine:
    """
    Detects statistical anomalies in InsightFlow workflow data.
    All computation is deterministic — no ML libraries needed.
    Uses standard z-score and mean ± 2σ threshold methodology.
    """

    @classmethod
    def detect_all_anomalies(cls, days: int = 30) -> list:
        """
        Run all anomaly detectors and return a unified list of findings.
        """
        findings = []

        findings.extend(cls._detect_sla_outliers(days))
        findings.extend(cls._detect_volume_spikes(days))
        findings.extend(cls._detect_staff_throughput_drops(days))
        findings.extend(cls._detect_department_surges(days))
        findings.extend(cls._detect_repeat_requestors(days))

        # Sort: critical first, then warning, then info
        severity_order = {'critical': 0, 'warning': 1, 'info': 2}
        findings.sort(key=lambda x: severity_order.get(x.get('severity', 'info'), 2))

        return findings

    # ── 1. SLA Outliers ──────────────────────────────────────────────────────

    @classmethod
    def _detect_sla_outliers(cls, days: int) -> list:
        """
        Flags requests where the current stage dwell time is >2× the historical
        average for that stage. Uses z-score to avoid noise.
        """
        from apps.requests.models import ServiceRequest, RequestStageHistory
        from django.db.models import StdDev

        findings = []
        since = timezone.now() - timedelta(days=days)

        # Get all active (non-terminal) requests
        active = ServiceRequest.objects.exclude(
            status__in=['resolved', 'rejected', 'closed', 'cancelled']
        ).select_related('current_stage', 'student')

        for req in active:
            stage = req.current_stage
            if not stage:
                continue

            # Historical average for this specific stage
            hist = RequestStageHistory.objects.filter(
                stage=stage,
                exited_at__isnull=False,
                duration_minutes__isnull=False,
                entered_at__gte=since,
            ).aggregate(
                avg_d=Avg('duration_minutes'),
                std_d=StdDev('duration_minutes'),
                count=Count('id'),
            )

            if not hist['avg_d'] or hist['count'] < 3:
                continue  # Not enough data

            avg = hist['avg_d']
            std = hist['std_d'] or avg * 0.3  # fallback std
            threshold = avg + (2 * std)  # mean + 2σ

            # Current dwell in this stage
            elapsed = req.elapsed_seconds_in_stage / 60  # minutes

            if elapsed >= threshold:
                z_score = round((elapsed - avg) / std, 1) if std > 0 else 0
                severity = 'critical' if z_score >= 3 else 'warning'
                findings.append({
                    'anomaly_type': 'SLA Outlier',
                    'severity': severity,
                    'title': f'Stage Dwell Anomaly: {req.reference_number}',
                    'description': (
                        f'Request "{req.title}" (by {req.student.full_name}) '
                        f'has been in stage "{stage.name}" for '
                        f'{cls._fmt(int(elapsed))} — {round(elapsed / avg, 1)}× '
                        f'the historical average of {cls._fmt(int(avg))} '
                        f'(z-score: {z_score}σ).'
                    ),
                    'evidence': {
                        'reference_number': req.reference_number,
                        'stage_name': stage.name,
                        'elapsed_minutes': round(elapsed),
                        'historical_avg_minutes': round(avg),
                        'z_score': z_score,
                        'threshold_minutes': round(threshold),
                    },
                    'recommended_action': (
                        f'Escalate "{req.reference_number}" to department head. '
                        f'Stage "{stage.name}" may be blocked or awaiting external input.'
                    ),
                })

        return findings[:5]  # Top 5 worst outliers

    # ── 2. Volume Spikes ─────────────────────────────────────────────────────

    @classmethod
    def _detect_volume_spikes(cls, days: int) -> list:
        """
        Identifies days where intake volume exceeded mean + 2σ.
        """
        from apps.requests.models import ServiceRequest

        findings = []
        since = timezone.now() - timedelta(days=days)

        daily_counts = list(
            ServiceRequest.objects
            .filter(created_at__gte=since)
            .annotate(date=TruncDate('created_at'))
            .values('date')
            .annotate(count=Count('id'))
            .order_by('date')
        )

        if len(daily_counts) < 5:
            return findings  # Need enough data

        counts = [d['count'] for d in daily_counts]
        mean = sum(counts) / len(counts)
        variance = sum((c - mean) ** 2 for c in counts) / len(counts)
        std = math.sqrt(variance)
        threshold = mean + (2 * std)

        for day in daily_counts:
            if day['count'] >= threshold and day['count'] > mean * 1.5:
                z = round((day['count'] - mean) / std, 1) if std > 0 else 0
                findings.append({
                    'anomaly_type': 'Volume Spike',
                    'severity': 'warning' if z < 3 else 'critical',
                    'title': f'Intake Volume Spike: {day["date"]}',
                    'description': (
                        f'{day["count"]} requests were submitted on {day["date"]} — '
                        f'{round(day["count"] / mean, 1)}× the period average of '
                        f'{round(mean, 1)} requests/day (z-score: {z}σ). '
                        f'This may indicate a batch deadline or system event.'
                    ),
                    'evidence': {
                        'spike_date': str(day['date']),
                        'count': day['count'],
                        'period_average': round(mean, 1),
                        'z_score': z,
                        'threshold': round(threshold, 1),
                    },
                    'recommended_action': (
                        'Ensure adequate staff coverage on similar days. '
                        'Check if this correlates with academic calendar events (exam registration, etc.).'
                    ),
                })

        return findings[:3]

    # ── 3. Staff Throughput Drops ────────────────────────────────────────────

    @classmethod
    def _detect_staff_throughput_drops(cls, days: int) -> list:
        """
        Detects staff members whose recent completion rate is significantly
        lower than the department average.
        """
        from apps.requests.models import RequestStageHistory
        from apps.accounts.models import User

        findings = []
        since = timezone.now() - timedelta(days=days)
        recent = timezone.now() - timedelta(days=7)

        staff_members = User.objects.filter(role='staff', is_active=True)

        for staff in staff_members:
            # Count transitions in the full period vs recent 7 days
            full_count = RequestStageHistory.objects.filter(
                transitioned_by=staff,
                exited_at__gte=since,
            ).count()

            recent_count = RequestStageHistory.objects.filter(
                transitioned_by=staff,
                exited_at__gte=recent,
            ).count()

            if full_count < 5:
                continue  # Not enough history

            # Expected rate: assume linear distribution
            expected_weekly = full_count * 7 / days
            if expected_weekly < 2:
                continue

            if recent_count == 0 and expected_weekly >= 3:
                severity = 'warning'
                drop_pct = 100
            elif recent_count < expected_weekly * 0.3 and expected_weekly >= 3:
                severity = 'warning'
                drop_pct = round((1 - recent_count / expected_weekly) * 100)
            else:
                continue

            findings.append({
                'anomaly_type': 'Staff Throughput Drop',
                'severity': severity,
                'title': f'Low Activity: {staff.full_name}',
                'description': (
                    f'{staff.full_name} ({staff.email}) processed {recent_count} stage transitions '
                    f'in the last 7 days, vs an expected {round(expected_weekly, 1)} based on '
                    f'their {days}-day average. Throughput is down {drop_pct}%.'
                ),
                'evidence': {
                    'staff_name': staff.full_name,
                    'staff_email': staff.email,
                    'recent_7d_count': recent_count,
                    'expected_weekly': round(expected_weekly, 1),
                    'full_period_count': full_count,
                    'drop_pct': drop_pct,
                },
                'recommended_action': (
                    f'Follow up with {staff.full_name}. '
                    'This may indicate leave, reassignment, or blocked requests requiring attention.'
                ),
            })

        return findings[:3]

    # ── 4. Department Queue Surges ───────────────────────────────────────────

    @classmethod
    def _detect_department_surges(cls, days: int) -> list:
        """
        Detects departments with unexpectedly high active queue load.
        """
        from apps.requests.models import ServiceRequest
        from apps.departments.models import Department

        findings = []

        depts = Department.objects.filter(is_active=True)
        queue_sizes = []

        for dept in depts:
            count = ServiceRequest.objects.filter(
                current_stage__responsible_department=dept,
                status__in=['open', 'in_progress']
            ).count()
            queue_sizes.append((dept, count))

        if len(queue_sizes) < 3:
            return findings

        counts = [c for _, c in queue_sizes]
        mean = sum(counts) / len(counts)
        variance = sum((c - mean) ** 2 for c in counts) / len(counts)
        std = math.sqrt(variance)
        threshold = mean + (1.5 * std)

        for dept, count in queue_sizes:
            if count >= threshold and count > mean * 1.5 and count >= 3:
                z = round((count - mean) / std, 1) if std > 0 else 0
                findings.append({
                    'anomaly_type': 'Department Queue Surge',
                    'severity': 'critical' if z >= 2.5 else 'warning',
                    'title': f'Queue Surge: {dept.name}',
                    'description': (
                        f'{dept.name} currently has {count} active requests — '
                        f'{round(count / mean, 1)}× the institutional average of {round(mean, 1)}. '
                        f'This may indicate understaffing or an external event driving demand.'
                    ),
                    'evidence': {
                        'department': dept.name,
                        'active_count': count,
                        'institutional_average': round(mean, 1),
                        'z_score': z,
                    },
                    'recommended_action': (
                        f'Consider temporarily reassigning staff to {dept.name} or '
                        f'notifying students of expected delays.'
                    ),
                })

        return findings[:3]

    # ── 5. Repeat Requestors ─────────────────────────────────────────────────

    @classmethod
    def _detect_repeat_requestors(cls, days: int) -> list:
        """
        Flags students who submitted an unusually high number of requests.
        May indicate duplicate submissions or guidance needed.
        """
        from apps.requests.models import ServiceRequest

        findings = []
        since = timezone.now() - timedelta(days=days)

        student_counts = list(
            ServiceRequest.objects
            .filter(created_at__gte=since)
            .values('student__full_name', 'student__email', 'student__id')
            .annotate(count=Count('id'))
            .order_by('-count')
        )

        if len(student_counts) < 3:
            return findings

        counts = [s['count'] for s in student_counts]
        mean = sum(counts) / len(counts)
        std_val = math.sqrt(sum((c - mean) ** 2 for c in counts) / len(counts))
        threshold = mean + (2 * std_val)

        for student in student_counts:
            if student['count'] >= threshold and student['count'] >= 5:
                z = round((student['count'] - mean) / std_val, 1) if std_val > 0 else 0
                findings.append({
                    'anomaly_type': 'Repeat Requestor',
                    'severity': 'info',
                    'title': f'High Submission Volume: {student["student__full_name"]}',
                    'description': (
                        f'{student["student__full_name"]} ({student["student__email"]}) '
                        f'has submitted {student["count"]} requests in {days} days — '
                        f'{round(student["count"] / mean, 1)}× the student average of {round(mean, 1)}. '
                        f'May need guidance on self-service resources.'
                    ),
                    'evidence': {
                        'student_name': student['student__full_name'],
                        'student_email': student['student__email'],
                        'submission_count': student['count'],
                        'average_count': round(mean, 1),
                        'z_score': z,
                    },
                    'recommended_action': (
                        'Reach out to this student to offer guidance or check for duplicate submissions.'
                    ),
                })

        return findings[:2]

    # ── Utilities ─────────────────────────────────────────────────────────────

    @staticmethod
    def _fmt(minutes: int) -> str:
        """Format minutes as human-readable duration."""
        if minutes < 60:
            return f'{minutes}m'
        h = minutes // 60
        m = minutes % 60
        return f'{h}h {m}m' if m else f'{h}h'
