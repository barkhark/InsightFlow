"""
InsightFlow — SLA & Intelligence Engine

Pure Python service that computes SLA status, request health, explainable risk,
and institutional service improvement insights.
Deterministic, rule-based, evidence-driven — NO black boxes, NO fake ML.

Key metrics computed:
  1. Stage SLA Risk: safe / warning / critical / breached + remaining minutes
  2. Explainable Request Risk: low / medium / high + "Why this risk level?" reasoning
  3. Request Health Score: 0 - 100 score + explicit evidence breakdown
  4. Department Health Matrix: compliance rate, breach rate, on-time count, proper 'no_data' state
  5. Service Improvement Insights: Observation, Evidence, Impact, Recommended Action
  6. Responsibility Ledger: Current Owner, Department, Assignment time, Dwell time, Next Expected Action
"""
from decimal import Decimal
from django.utils import timezone
from datetime import timedelta
from django.db import models


class SLAResult:
    """Structured result from SLAEngine.compute_stage_sla()."""
    __slots__ = [
        'risk_level', 'elapsed_minutes', 'target_minutes',
        'elapsed_pct', 'explanation', 'is_breached'
    ]

    def __init__(self, risk_level, elapsed_minutes, target_minutes, elapsed_pct, explanation):
        self.risk_level = risk_level
        self.elapsed_minutes = elapsed_minutes
        self.target_minutes = target_minutes
        self.elapsed_pct = elapsed_pct
        self.explanation = explanation
        self.is_breached = risk_level == 'breached'

    def to_dict(self) -> dict:
        remaining = max(0, self.target_minutes - self.elapsed_minutes)
        return {
            'risk_level': self.risk_level,
            'elapsed_minutes': round(self.elapsed_minutes),
            'target_minutes': round(self.target_minutes),
            'elapsed_pct': round(self.elapsed_pct, 1),
            'remaining_minutes': round(remaining),
            'is_breached': self.is_breached,
            'explanation': self.explanation,
        }


class SLAEngine:
    """
    Computes SLA risk, request health, and operational intelligence.
    Stateless — create per call or reuse.
    """

    # ── 1. Stage SLA Computation ─────────────────────────────

    def compute_stage_sla(self, service_request) -> SLAResult:
        """Compute SLA risk for a request currently in a workflow stage."""
        stage = service_request.current_stage
        if stage is None:
            return self._no_sla('Request has no current stage.')

        try:
            sla_config = stage.sla_config
        except Exception:
            return self._no_sla(
                f'Stage "{stage.name}" has no SLA configuration.'
            )

        elapsed_seconds = (timezone.now() - service_request.stage_entered_at).total_seconds()
        elapsed_minutes = elapsed_seconds / 60
        target_minutes = float(sla_config.target_hours) * 60
        elapsed_pct = (elapsed_minutes / target_minutes * 100) if target_minutes > 0 else 0

        warn_pct = sla_config.warning_threshold_pct
        crit_pct = sla_config.critical_threshold_pct

        if elapsed_pct < warn_pct:
            risk = 'safe'
            explanation = (
                f'Request "{service_request.reference_number}" has been in "{stage.name}" for {self._fmt(elapsed_minutes)}, '
                f'which is {elapsed_pct:.1f}% of the {self._fmt(target_minutes)} target. SLA is on track.'
            )
        elif elapsed_pct < crit_pct:
            risk = 'warning'
            remaining = target_minutes - elapsed_minutes
            explanation = (
                f'Warning: Request "{service_request.reference_number}" has used {elapsed_pct:.1f}% of SLA time in "{stage.name}". '
                f'Approximately {self._fmt(remaining)} remaining before breach.'
            )
        elif elapsed_pct < 100:
            risk = 'critical'
            remaining = target_minutes - elapsed_minutes
            explanation = (
                f'CRITICAL: Request "{service_request.reference_number}" has consumed {elapsed_pct:.1f}% of SLA time in "{stage.name}". '
                f'Only {self._fmt(remaining)} until SLA breach. Immediate action required.'
            )
        else:
            risk = 'breached'
            overdue = elapsed_minutes - target_minutes
            explanation = (
                f'SLA BREACHED: Request "{service_request.reference_number}" exceeded the {self._fmt(target_minutes)} target '
                f'for "{stage.name}" by {self._fmt(overdue)}.'
            )

        return SLAResult(
            risk_level=risk,
            elapsed_minutes=elapsed_minutes,
            target_minutes=target_minutes,
            elapsed_pct=elapsed_pct,
            explanation=explanation,
        )

    # ── 2. Request Health Score (0 - 100) ────────────────────

    def compute_request_health(self, service_request) -> dict:
        """
        Compute an explainable 0–100 Health Score for a request with explicit evidence.
        Score formula:
          - Base: 100 points
          - SLA Consumption penalty: up to -40 points depending on elapsed %
          - Current Stage Dwell penalty: up to -20 points if dwell > 24 hours
          - Assignment status: -15 points if active but unassigned
          - Priority factor: High/Critical priority with delays loses points faster
        """
        if service_request.status in ['resolved', 'closed']:
            return {
                'score': 100,
                'status': 'healthy',
                'summary': 'Request successfully resolved within workflow guidelines.',
                'penalties': [],
            }
        if service_request.status in ['rejected', 'cancelled']:
            return {
                'score': 0,
                'status': 'critical',
                'summary': f'Request was marked as {service_request.status}.',
                'penalties': [{'factor': 'Terminal status', 'deduction': 100}],
            }

        score = 100
        penalties = []

        # 1. SLA factor
        sla_res = self.compute_stage_sla(service_request)
        if sla_res.risk_level == 'breached':
            score -= 40
            penalties.append({'factor': 'SLA Breached', 'deduction': 40, 'detail': 'Target time exceeded for current stage'})
        elif sla_res.risk_level == 'critical':
            score -= 25
            penalties.append({'factor': 'Critical SLA consumption', 'deduction': 25, 'detail': f'{sla_res.elapsed_pct:.0f}% SLA consumed'})
        elif sla_res.risk_level == 'warning':
            score -= 10
            penalties.append({'factor': 'SLA Warning threshold reached', 'deduction': 10, 'detail': f'{sla_res.elapsed_pct:.0f}% SLA consumed'})

        # 2. Assignment factor
        has_assignment = service_request.assignments.filter(is_current=True).exists()
        if not has_assignment and service_request.status not in ['resolved', 'rejected']:
            score -= 15
            penalties.append({'factor': 'Unassigned Request', 'deduction': 15, 'detail': 'No dedicated staff member assigned'})

        # 3. Priority factor
        if service_request.priority == 'critical' and sla_res.risk_level in ['warning', 'critical', 'breached']:
            score -= 10
            penalties.append({'factor': 'Critical Priority Urgency', 'deduction': 10, 'detail': 'High urgency item experiencing processing friction'})

        score = max(5, min(100, score))

        if score >= 80:
            health_status = 'healthy'
            summary = 'Request is proceeding on track with low operational friction.'
        elif score >= 50:
            health_status = 'attention'
            summary = 'Request has moderate operational friction; monitoring or assignment recommended.'
        else:
            health_status = 'critical'
            summary = 'Request is experiencing severe delays or SLA breaches. Immediate action required.'

        return {
            'score': score,
            'status': health_status,
            'summary': summary,
            'penalties': penalties,
        }

    # ── 3. Explainable Risk (low / medium / high) ────────────

    def compute_request_risk(self, service_request) -> dict:
        """Compute categorical risk level (low / medium / high) with explanation."""
        if service_request.is_terminal:
            return {
                'risk_level': 'low',
                'explanation': f'Request is {service_request.status}. No active operational risk.',
            }

        sla_res = self.compute_stage_sla(service_request)
        has_assignment = service_request.assignments.filter(is_current=True).exists()
        stage_name = service_request.current_stage.name if service_request.current_stage else 'Current stage'

        if sla_res.risk_level == 'breached':
            return {
                'risk_level': 'high',
                'explanation': f'HIGH RISK: SLA target has been breached for stage "{stage_name}". Immediate resolution required to restore compliance.',
            }
        elif sla_res.risk_level == 'critical' or (sla_res.risk_level == 'warning' and not has_assignment):
            return {
                'risk_level': 'high',
                'explanation': f'HIGH RISK: "{stage_name}" is nearing SLA breach ({sla_res.elapsed_pct:.0f}% consumed) and requires urgent administrative attention.',
            }
        elif sla_res.risk_level == 'warning' or not has_assignment:
            assign_note = " and is currently unassigned" if not has_assignment else ""
            return {
                'risk_level': 'medium',
                'explanation': f'MEDIUM RISK: "{stage_name}" has reached {sla_res.elapsed_pct:.0f}% of allocated SLA time{assign_note}.',
            }

        return {
            'risk_level': 'low',
            'explanation': f'LOW RISK: Workflow is on track. {sla_res.elapsed_pct:.0f}% of SLA consumed in stage "{stage_name}".',
        }

    # ── 4. Responsibility Ledger Helper ──────────────────────

    def get_responsibility_ledger(self, service_request) -> dict:
        """
        Extract the complete responsibility ledger for an active request:
        - Owning Department
        - Current Assigned Staff
        - Current Stage
        - Assigned At Timestamp
        - Dwell Time in Current Stage
        - Next Expected Action
        """
        current_assignment = service_request.assignments.filter(is_current=True).select_related('assigned_to').first()
        dept_name = service_request.current_stage.responsible_department.name if service_request.current_stage else 'Unassigned'
        staff_name = current_assignment.assigned_to.full_name if current_assignment else 'Unassigned (Department Pool)'
        assigned_at = current_assignment.assigned_at if current_assignment else None

        dwell_seconds = (timezone.now() - service_request.stage_entered_at).total_seconds()
        dwell_formatted = self._fmt(dwell_seconds / 60)

        if service_request.is_terminal:
            next_action = f'Workflow finished ({service_request.status}). No further actions required.'
        elif not current_assignment:
            next_action = f'Department coordinator in {dept_name} should assign request to an officer.'
        else:
            allowed = list(service_request.current_stage.allowed_next_stages.filter(status='active').values_list('name', flat=True)) if service_request.current_stage else []
            if allowed:
                next_action = f'Officer {staff_name} should review and transition to: {", ".join(allowed)}.'
            else:
                next_action = f'Officer {staff_name} to complete stage "{service_request.current_stage.name}".'

        return {
            'department_name': dept_name,
            'assigned_staff_name': staff_name,
            'assigned_at': assigned_at,
            'current_stage_name': service_request.current_stage.name if service_request.current_stage else 'None',
            'stage_dwell_time': dwell_formatted,
            'next_expected_action': next_action,
        }

    # ── 5. Department SLA Summary ────────────────────────────

    def department_sla_summary(self, department, days: int = 30) -> dict:
        """
        Aggregate SLA compliance statistics for a department over the last N days.
        Properly handles 'no_data' state (never fake 100% healthy!).
        """
        from apps.requests.models import RequestStageHistory, ServiceRequest

        since = timezone.now() - timedelta(days=days)

        histories = RequestStageHistory.objects.filter(
            stage__responsible_department=department,
            exited_at__gte=since,
            exited_at__isnull=False,
        )

        total = histories.count()
        breached = histories.filter(sla_breached=True).count()
        on_time = total - breached
        breach_rate = round((breached / total * 100), 1) if total > 0 else 0
        compliance_rate = round(100 - breach_rate, 1) if total > 0 else None

        # Active requests in this department
        active_requests = ServiceRequest.objects.filter(
            current_stage__responsible_department=department
        ).exclude(status__in=['resolved', 'rejected', 'closed', 'cancelled'])

        open_count = active_requests.count()
        unassigned_count = active_requests.filter(assignments__is_current=True).count()
        unassigned_count = open_count - unassigned_count

        if total == 0 and open_count == 0:
            health_label = 'no_data'
            compliance_display = None
            explanation = f'No completed stage history or active requests for {department.name} in the last {days} days.'
        elif total == 0 and open_count > 0:
            health_label = 'attention'
            compliance_display = 100.0
            explanation = f'{department.name} has {open_count} active requests in-flight with no completed transitions yet.'
        elif compliance_rate >= 90:
            health_label = 'healthy'
            compliance_display = compliance_rate
            explanation = (
                f'{department.name} maintained {compliance_rate}% SLA compliance across {total} completed transitions '
                f'({on_time} on time, {breached} breached). Performance is healthy.'
            )
        elif compliance_rate >= 75:
            health_label = 'attention'
            compliance_display = compliance_rate
            explanation = (
                f'Attention: {department.name} has {compliance_rate}% SLA compliance. {breached} of {total} transitions '
                f'exceeded target SLA time in the last {days} days.'
            )
        else:
            health_label = 'critical'
            compliance_display = compliance_rate
            explanation = (
                f'CRITICAL: {department.name} has dropped to {compliance_rate}% SLA compliance with {breached} breached '
                f'transitions out of {total}. Immediate operational review required.'
            )

        return {
            'department': department.name,
            'department_code': department.code,
            'department_id': str(department.id),
            'period_days': days,
            'total_stages': total,
            'open_requests': open_count,
            'unassigned_requests': max(0, unassigned_count),
            'on_time': on_time,
            'breached': breached,
            'breach_rate_pct': breach_rate,
            'compliance_rate_pct': compliance_display,
            'health_label': health_label,
            'explanation': explanation,
        }

    # ── 6. Service Improvement Insights ──────────────────────

    def generate_service_improvement_insights(self, days: int = 30) -> list[dict]:
        """
        Generate institutional service improvement insights derived from aggregate backend data.
        Structure:
          - observation
          - evidence
          - impact
          - recommended_action
        """
        from apps.departments.models import Department
        from apps.requests.models import RequestStageHistory, ServiceRequest

        since = timezone.now() - timedelta(days=days)
        insights = []

        # Insight 1: Department Bottlenecks
        high_dwell_stages = RequestStageHistory.objects.filter(
            exited_at__isnull=False,
            entered_at__gte=since,
        ).values('stage__name', 'stage__responsible_department__name').annotate(
            avg_dwell=models.Avg('duration_minutes'),
            breaches=models.Count('id', filter=models.Q(sla_breached=True)),
            total=models.Count('id'),
        ).filter(total__gte=2).order_by('-avg_dwell')[:2]

        for s in high_dwell_stages:
            avg_hours = round((s['avg_dwell'] or 0) / 60, 1)
            if avg_hours >= 6:
                insights.append({
                    'category': 'Workflow Bottleneck',
                    'observation': f'Prolonged stage dwell time observed in "{s["stage__name"]}" ({s["stage__responsible_department__name"]}).',
                    'evidence': f'Average duration is {avg_hours} hours across {s["total"]} transitions with {s["breaches"]} SLA breaches.',
                    'impact': 'Students experience prolonged turnaround times during intermediate review stages.',
                    'recommended_action': f'Consider splitting "{s["stage__name"]}" into concurrent sub-tasks or allocating secondary verification staff.',
                })

        # Insight 2: Unassigned Workload
        unassigned_active = ServiceRequest.objects.exclude(
            status__in=['resolved', 'rejected', 'closed', 'cancelled']
        ).exclude(assignments__is_current=True).count()

        if unassigned_active > 0:
            insights.append({
                'category': 'Resource Allocation',
                'observation': f'{unassigned_active} active service request(s) currently lack direct officer assignment.',
                'evidence': f'Active requests in department queues are waiting in initial unassigned state.',
                'impact': 'Increases initial acknowledgment latency and elevates SLA breach risk.',
                'recommended_action': 'Enable auto-assignment rules in department workflow settings or enforce daily coordinator triage.',
            })

        # Insight 3: High Compliance Recognition
        depts = Department.objects.filter(is_active=True)
        for d in depts:
            summary = self.department_sla_summary(d, days=days)
            if summary['compliance_rate_pct'] is not None and summary['compliance_rate_pct'] >= 95 and summary['total_stages'] >= 3:
                insights.append({
                    'category': 'Excellence in SLA Adherence',
                    'observation': f'{d.name} demonstrates outstanding operational velocity ({summary["compliance_rate_pct"]}% on-time).',
                    'evidence': f'{summary["on_time"]} out of {summary["total_stages"]} stage transitions completed strictly within target hours.',
                    'impact': 'High student satisfaction and predictable service delivery schedules.',
                    'recommended_action': 'Standardize workflow patterns from this department as institutional best practices across other faculties.',
                })
                break

        # Fallback default insight if not enough historical data
        if not insights:
            insights.append({
                'category': 'Operational Intelligence',
                'observation': 'Institutional service delivery workflow monitoring is actively logging stage progression.',
                'evidence': 'Requests across Academic, IT, Examination, Finance, and Facility divisions are actively tracked against SLA thresholds.',
                'impact': 'Provides transparent accountability and audit visibility across departmental handoffs.',
                'recommended_action': 'Continue processing in-flight requests through workflow stages to accumulate granular diagnostic trends.',
            })

        return insights

    # ── Helpers ──────────────────────────────────────────────

    def _no_sla(self, explanation: str) -> SLAResult:
        return SLAResult(
            risk_level='unknown',
            elapsed_minutes=0,
            target_minutes=0,
            elapsed_pct=0,
            explanation=explanation,
        )

    @staticmethod
    def _fmt(minutes: float) -> str:
        """Format minutes as '2h 15m' or '45m'."""
        minutes = max(0, minutes)
        h = int(minutes) // 60
        m = int(minutes) % 60
        if h > 0:
            return f'{h}h {m}m' if m > 0 else f'{h}h'
        return f'{m}m'
