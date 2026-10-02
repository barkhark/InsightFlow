"""
InsightFlow — Predictive Analytics & Smart ETA Forecaster Engine

Computes predictive intelligence for active service requests:
  1. Predicted Resolution ETA (timestamp + remaining hours)
  2. SLA Breach Probability / Risk Index (0-100)
  3. Workload & Queue Congestion Latency Impact
  4. Explainable Predictive Factors based on historical stage dwell analytics
"""
from datetime import timedelta
from django.utils import timezone
from django.db import models


class PredictiveEngine:
    """
    Computes deterministic predictive insights for ServiceRequests based on
    historical stage velocity, current dwell time, queue congestion, and stage topology.
    """

    @classmethod
    def predict_request_completion(cls, service_request) -> dict:
        """
        Calculates predicted completion ETA, remaining hours, and SLA breach risk score.
        """
        if service_request.is_terminal:
            return {
                'status': 'completed',
                'predicted_completion_hours': 0,
                'estimated_resolution_time': service_request.resolved_at.isoformat() if service_request.resolved_at else None,
                'sla_risk_score': 0,
                'risk_tier': 'COMPLETED',
                'confidence_pct': 100,
                'risk_factors': ['Request has reached terminal status.'],
                'projected_on_time': True,
            }

        current_stage = service_request.current_stage
        if not current_stage:
            return {
                'status': 'unassigned',
                'predicted_completion_hours': 24.0,
                'estimated_resolution_time': (timezone.now() + timedelta(hours=24)).isoformat(),
                'sla_risk_score': 50,
                'risk_tier': 'MODERATE',
                'confidence_pct': 70,
                'risk_factors': ['Request has not yet been assigned to a workflow stage.'],
                'projected_on_time': True,
            }

        # 1. Historical dwell time for current stage
        from apps.requests.models import RequestStageHistory, ServiceRequest
        hist_avg = RequestStageHistory.objects.filter(
            stage=current_stage,
            duration_minutes__isnull=False
        ).aggregate(avg_dwell=models.Avg('duration_minutes'))['avg_dwell']

        try:
            stage_target = int(float(current_stage.sla_config.target_hours) * 60)
        except Exception:
            stage_target = 240

        baseline_current = hist_avg if hist_avg and hist_avg > 0 else stage_target

        elapsed_current = max(0, service_request.elapsed_seconds_in_stage / 60)
        remaining_in_current = max(10, baseline_current - elapsed_current)

        # 2. Estimate remaining subsequent stages
        workflow = service_request.workflow
        all_stages = list(workflow.stages.filter(is_rejection=False).order_by('order'))
        subsequent_stages = []
        found_current = False
        for stg in all_stages:
            if found_current:
                subsequent_stages.append(stg)
            elif stg.id == current_stage.id:
                found_current = True

        subsequent_minutes = 0
        for stg in subsequent_stages:
            stg_hist = RequestStageHistory.objects.filter(
                stage=stg,
                duration_minutes__isnull=False
            ).aggregate(avg_dwell=models.Avg('duration_minutes'))['avg_dwell']
            if stg_hist and stg_hist > 0:
                subsequent_minutes += stg_hist
            else:
                try:
                    subsequent_minutes += int(float(stg.sla_config.target_hours) * 60)
                except Exception:
                    subsequent_minutes += 180


        # 3. Department queue congestion penalty
        dept = current_stage.responsible_department
        active_in_dept = ServiceRequest.objects.filter(
            current_stage__responsible_department=dept,
            status__in=['open', 'in_progress']
        ).exclude(id=service_request.id).count()

        # Each queued item adds ~8% dwell delay
        congestion_multiplier = 1.0 + min(0.60, active_in_dept * 0.08)

        total_predicted_minutes = (remaining_in_current + subsequent_minutes) * congestion_multiplier
        predicted_hours = round(total_predicted_minutes / 60, 1)

        estimated_resolution = timezone.now() + timedelta(minutes=total_predicted_minutes)

        # 4. SLA Risk Score calculation (0 - 100)
        elapsed_pct = (elapsed_current / stage_target) * 100 if stage_target > 0 else 0
        risk_score = 15  # baseline
        risk_factors = []

        if elapsed_pct >= 100:
            risk_score += 55
            risk_factors.append(f'Current stage has exceeded targeted SLA duration by {round(elapsed_pct - 100)}%.')
        elif elapsed_pct >= 75:
            risk_score += 35
            risk_factors.append(f'Current stage is at {round(elapsed_pct)}% of SLA threshold.')
        else:
            risk_factors.append(f'Current stage progress ({round(elapsed_pct)}%) is within standard operating parameters.')

        if active_in_dept >= 5:
            risk_score += 25
            risk_factors.append(f'High departmental backlog: {active_in_dept} active requests in {dept.name}.')
        elif active_in_dept >= 2:
            risk_score += 10
            risk_factors.append(f'Moderate departmental queue: {active_in_dept} pending requests.')
        else:
            risk_factors.append(f'{dept.name} queue is clear (low congestion).')

        if service_request.priority == 'critical':
            risk_score = min(100, risk_score + 15)
            risk_factors.append('Critical priority item requires expedited administrative sign-off.')
        elif service_request.priority == 'high':
            risk_score = min(100, risk_score + 5)

        risk_score = max(5, min(98, round(risk_score)))

        if risk_score >= 70:
            risk_tier = 'HIGH'
            projected_on_time = False
        elif risk_score >= 40:
            risk_tier = 'MODERATE'
            projected_on_time = True
        else:
            risk_tier = 'LOW'
            projected_on_time = True

        confidence_pct = 88 if hist_avg else 78

        return {
            'status': 'active',
            'current_stage_name': current_stage.name,
            'department_name': dept.name,
            'predicted_completion_hours': predicted_hours,
            'estimated_resolution_time': estimated_resolution.isoformat(),
            'sla_risk_score': risk_score,
            'risk_tier': risk_tier,
            'confidence_pct': confidence_pct,
            'projected_on_time': projected_on_time,
            'remaining_stages_count': len(subsequent_stages),
            'department_backlog_count': active_in_dept,
            'risk_factors': risk_factors,
        }
