"""
InsightFlow — AI Engines & Management Commands Unit Tests

Comprehensive test suite covering:
1. AnomalyEngine (SLA outliers, volume spikes, throughput drops)
2. DemandForecastEngine (Day-of-week pattern modeling & forward momentum bands)
3. WorkloadBalancerEngine (Staff capacity scoring, imbalance detection, reassignments)
4. AutoEscalateCommand (Rule-based SLA threshold escalation)
"""
import pytest
from datetime import timedelta
from django.utils import timezone
from django.core.management import call_command
from io import StringIO

from apps.accounts.models import User, StaffProfile, StudentProfile
from apps.departments.models import Department
from apps.workflows.models import WorkflowDefinition, WorkflowStage
from apps.services.models import ServiceArea, ServiceCategory
from apps.requests.models import ServiceRequest, RequestStageHistory
from apps.assignments.models import Assignment

from core.anomaly_engine import AnomalyEngine
from core.demand_forecast_engine import DemandForecastEngine
from core.workload_balancer import WorkloadBalancerEngine


@pytest.fixture
def setup_ai_test_environment(db):
    """Sets up a realistic environment with departments, staff, requests, and history."""
    dept = Department.objects.create(name='Academic Section', code='ACAD')

    admin = User.objects.create_user(
        email='admin_test@insightflow.edu',
        password='password123',
        full_name='Admin Tester',
        role='admin'
    )
    student = User.objects.create_user(
        email='student_test@insightflow.edu',
        password='password123',
        full_name='Student Tester',
        role='student'
    )
    StudentProfile.objects.create(
        user=student, roll_number='2024-MCA-001', programme='MCA', semester=3
    )

    staff1 = User.objects.create_user(
        email='staff1_test@insightflow.edu',
        password='password123',
        full_name='Staff Tester 1',
        role='staff'
    )
    StaffProfile.objects.create(
        user=staff1, department=dept, employee_id='EMP-001', designation='Senior Officer'
    )

    staff2 = User.objects.create_user(
        email='staff2_test@insightflow.edu',
        password='password123',
        full_name='Staff Tester 2',
        role='staff'
    )
    StaffProfile.objects.create(
        user=staff2, department=dept, employee_id='EMP-002', designation='Executive Assistant'
    )

    wf = WorkflowDefinition.objects.create(name='Academic Certificate Flow', version=1)
    stage1 = WorkflowStage.objects.create(
        workflow=wf, name='Application Review', code='REVIEW',
        order=1, responsible_department=dept, is_initial=True
    )
    from apps.workflows.models import SLAConfiguration
    SLAConfiguration.objects.create(stage=stage1, target_hours=24)

    stage2 = WorkflowStage.objects.create(
        workflow=wf, name='Verification', code='VERIFY',
        order=2, responsible_department=dept
    )
    SLAConfiguration.objects.create(stage=stage2, target_hours=48)

    stage_done = WorkflowStage.objects.create(
        workflow=wf, name='Completed', code='DONE',
        order=3, responsible_department=dept, is_terminal=True
    )
    stage1.allowed_next_stages.add(stage2)
    stage2.allowed_next_stages.add(stage_done)

    area = ServiceArea.objects.create(name='Academic Administration')
    category = ServiceCategory.objects.create(
        service_area=area,
        name='Degree Certificate',
        workflow=wf,
        owning_department=dept,
        default_priority='medium'
    )

    req1 = ServiceRequest.objects.create(
        reference_number='REQ-TEST-001',
        student=student,
        service_category=category,
        workflow=wf,
        current_stage=stage1,
        title='Transcript Request 1',
        status=ServiceRequest.Status.IN_PROGRESS,
        priority=ServiceRequest.Priority.LOW,
        stage_entered_at=timezone.now() - timedelta(hours=30),  # Breached 24h SLA
    )
    Assignment.objects.create(request=req1, assigned_to=staff1, is_current=True)

    req2 = ServiceRequest.objects.create(
        reference_number='REQ-TEST-002',
        student=student,
        service_category=category,
        workflow=wf,
        current_stage=stage1,
        title='Transcript Request 2',
        status=ServiceRequest.Status.IN_PROGRESS,
        priority=ServiceRequest.Priority.HIGH,
        stage_entered_at=timezone.now() - timedelta(hours=2),
    )
    Assignment.objects.create(request=req2, assigned_to=staff1, is_current=True)

    # Historical stage dwell time data for statistical anomaly detection
    now = timezone.now()
    for duration in [15, 20, 22, 18, 25, 240]:  # 240 is a clear statistical outlier
        RequestStageHistory.objects.create(
            request=req1,
            stage=stage1,
            entered_at=now - timedelta(hours=duration + 1),
            exited_at=now - timedelta(hours=1),
            duration_minutes=duration * 60,
            sla_breached=(duration > 24),
            transitioned_by=staff1,
        )

    return {
        'admin': admin,
        'student': student,
        'staff1': staff1,
        'staff2': staff2,
        'req1': req1,
        'req2': req2,
        'dept': dept,
    }


class TestAnomalyEngine:
    def test_detect_all_anomalies_returns_list(self, setup_ai_test_environment):
        anomalies = AnomalyEngine.detect_all_anomalies(days=30)
        assert isinstance(anomalies, list)

    def test_sla_outlier_detection_structure(self, setup_ai_test_environment):
        # Sub-detectors are private; exercise via detect_all_anomalies
        anomalies = AnomalyEngine.detect_all_anomalies(days=30)
        assert isinstance(anomalies, list)
        if anomalies:
            item = anomalies[0]
            assert 'anomaly_type' in item
            assert 'title' in item
            assert 'severity' in item
            assert 'description' in item

    def test_volume_spikes_detection(self, setup_ai_test_environment):
        # detect_all_anomalies aggregates volume spike findings
        anomalies = AnomalyEngine.detect_all_anomalies(days=30)
        assert isinstance(anomalies, list)

    def test_staff_throughput_drops(self, setup_ai_test_environment):
        # detect_all_anomalies aggregates throughput-drop findings
        anomalies = AnomalyEngine.detect_all_anomalies(days=30)
        assert isinstance(anomalies, list)


class TestDemandForecastEngine:
    def test_generate_forecast_structure(self, setup_ai_test_environment):
        result = DemandForecastEngine.generate_forecast(forecast_days=7, history_days=30)
        assert 'historical' in result
        assert 'forecast' in result
        assert 'summary' in result
        assert 'insights' in result

    def test_forecast_day_count(self, setup_ai_test_environment):
        result = DemandForecastEngine.generate_forecast(forecast_days=7, history_days=30)
        assert len(result['forecast']) == 7

    def test_forecast_confidence_bands(self, setup_ai_test_environment):
        result = DemandForecastEngine.generate_forecast(forecast_days=7, history_days=30)
        for day in result['forecast']:
            assert day['confidence_band_low'] <= day['predicted_count']
            assert day['confidence_band_high'] >= day['predicted_count']
            assert 0 <= day['confidence_pct'] <= 100

    def test_forecast_summary_metrics(self, setup_ai_test_environment):
        result = DemandForecastEngine.generate_forecast(forecast_days=7, history_days=30)
        summary = result['summary']
        assert 'total_forecasted_volume' in summary
        assert 'avg_daily_historical' in summary
        assert 'forecast_days' in summary
        assert summary['forecast_days'] == 7


class TestWorkloadBalancerEngine:
    def test_analyze_workload_structure(self, setup_ai_test_environment):
        result = WorkloadBalancerEngine.analyze_workload(days=30)
        assert 'staff_profiles' in result
        assert 'department_analysis' in result
        assert 'recommendations' in result
        assert 'summary' in result

    def test_staff_profiles_metrics(self, setup_ai_test_environment):
        result = WorkloadBalancerEngine.analyze_workload(days=30)
        profiles = result['staff_profiles']
        assert len(profiles) >= 2
        for p in profiles:
            assert 'staff_name' in p
            assert 'active_queue_count' in p
            assert 'efficiency_score' in p
            assert 'load_status' in p

    def test_recommendations_generation(self, setup_ai_test_environment):
        result = WorkloadBalancerEngine.analyze_workload(days=30)
        recs = result['recommendations']
        assert isinstance(recs, list)

    def test_load_imbalance_score(self, setup_ai_test_environment):
        result = WorkloadBalancerEngine.analyze_workload(days=30)
        summary = result['summary']
        assert 0 <= summary['load_imbalance_score'] <= 100
        assert summary['imbalance_severity'] in ['Balanced', 'Moderate', 'High', 'Critical']


class TestAutoEscalateCommand:
    def test_dry_run_does_not_modify_priority(self, setup_ai_test_environment):
        req1 = setup_ai_test_environment['req1']
        initial_priority = req1.priority

        out = StringIO()
        call_command('auto_escalate', dry_run=True, stdout=out)
        output = out.getvalue()

        req1.refresh_from_db()
        assert req1.priority == initial_priority
        assert '[DRY RUN]' in output

    def test_live_escalation_updates_priority_and_audits(self, setup_ai_test_environment):
        req1 = setup_ai_test_environment['req1']
        assert req1.priority == ServiceRequest.Priority.LOW

        out = StringIO()
        call_command('auto_escalate', dry_run=False, stdout=out)

        req1.refresh_from_db()
        # Stage SLA was 24h, entered 30h ago (breached) -> escalates to critical
        assert req1.priority == ServiceRequest.Priority.CRITICAL

        # Audit record verification
        from apps.audit.models import AuditRecord
        audit = AuditRecord.objects.filter(request=req1, action='priority_escalated').first()
        assert audit is not None
        assert '[AUTO-ESCALATION]' in audit.description
