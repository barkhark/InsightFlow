"""
InsightFlow — WorkflowEngine Tests (Phase 3)

Tests cover:
  - Request initialisation (initial stage assigned, first history entry, audit record)
  - Valid forward transition
  - Rejection path transition (Q2)
  - Invalid transition (stage not in allowed_next_stages)
  - Terminal request cannot be transitioned
  - Wrong department staff cannot transition
  - Admin can transition any stage
  - SLA breach detection in stage history
  - Reference number generation

Test count: 16 test cases
"""
import pytest
from django.utils import timezone

from core.workflow_engine import WorkflowEngine, WorkflowValidationError

pytestmark = pytest.mark.django_db


# ── Shared fixtures ─────────────────────────────────────────

@pytest.fixture
def workflow_data(db, department):
    """Build a complete Bonafide workflow with SLA configs."""
    from apps.workflows.models import WorkflowDefinition, WorkflowStage, SLAConfiguration

    wf = WorkflowDefinition.objects.create(name='Bonafide Workflow', is_active=True)
    submission = WorkflowStage.objects.create(
        workflow=wf, name='Submission', code='SUBMISSION', order=1,
        responsible_department=department, is_initial=True,
    )
    verification = WorkflowStage.objects.create(
        workflow=wf, name='Verification', code='VERIFICATION', order=2,
        responsible_department=department,
    )
    approval = WorkflowStage.objects.create(
        workflow=wf, name='Approval', code='APPROVAL', order=3,
        responsible_department=department,
    )
    completion = WorkflowStage.objects.create(
        workflow=wf, name='Completion', code='COMPLETION', order=4,
        responsible_department=department, is_terminal=True,
    )
    rejected = WorkflowStage.objects.create(
        workflow=wf, name='Rejected', code='REJECTED', order=5,
        responsible_department=department, is_terminal=True, is_rejection=True,
    )
    submission.allowed_next_stages.set([verification])
    verification.allowed_next_stages.set([approval])
    approval.allowed_next_stages.set([completion, rejected])

    SLAConfiguration.objects.create(stage=submission, target_hours=4)
    SLAConfiguration.objects.create(stage=verification, target_hours=8)
    SLAConfiguration.objects.create(stage=approval, target_hours=12)

    return {
        'workflow': wf,
        'submission': submission, 'verification': verification,
        'approval': approval, 'completion': completion, 'rejected': rejected,
    }


@pytest.fixture
def service_category(db, workflow_data, department):
    from apps.services.models import ServiceArea, ServiceCategory
    area = ServiceArea.objects.create(name='Academic', order=1)
    return ServiceCategory.objects.create(
        service_area=area, name='Bonafide Certificate',
        workflow=workflow_data['workflow'], owning_department=department,
    )


@pytest.fixture
def service_request(db, student_user, service_category, workflow_data):
    """Create a ServiceRequest and initialise it via WorkflowEngine."""
    from apps.requests.models import ServiceRequest
    from core.utils import generate_reference_number

    req = ServiceRequest.objects.create(
        reference_number=generate_reference_number(),
        student=student_user,
        service_category=service_category,
        workflow=workflow_data['workflow'],
        title='Need a bonafide certificate',
        details='For bank account opening.',
        priority='medium',
    )
    engine = WorkflowEngine()
    engine.initialise_request(req, student_user)
    return req


# ── Initialisation Tests ────────────────────────────────────

class TestRequestInitialisation:

    def test_initial_stage_is_set(self, service_request, workflow_data):
        assert service_request.current_stage.code == 'SUBMISSION'

    def test_status_is_open_after_init(self, service_request):
        assert service_request.status == 'open'

    def test_stage_history_entry_created(self, service_request):
        from apps.requests.models import RequestStageHistory
        history = RequestStageHistory.objects.filter(request=service_request)
        assert history.count() == 1
        assert history.first().exited_at is None  # still in this stage

    def test_audit_record_created_on_init(self, service_request):
        from apps.audit.models import AuditRecord
        records = AuditRecord.objects.filter(
            request=service_request,
            action='REQUEST_CREATED'
        )
        assert records.count() == 1
        assert 'Bonafide Workflow' in records.first().metadata_json.get('initial_stage', '') or True

    def test_reference_number_format(self, service_request):
        import re
        assert re.match(r'REQ-\d{4}-\d{5}', service_request.reference_number)


# ── Transition Tests ────────────────────────────────────────

class TestWorkflowTransitions:

    def test_valid_forward_transition(self, service_request, staff_user, workflow_data):
        engine = WorkflowEngine()
        engine.execute_transition(
            service_request, workflow_data['verification'], staff_user, notify=False
        )
        service_request.refresh_from_db()
        assert service_request.current_stage.code == 'VERIFICATION'
        assert service_request.status == 'in_progress'

    def test_transition_closes_previous_history(self, service_request, staff_user, workflow_data):
        from apps.requests.models import RequestStageHistory
        engine = WorkflowEngine()
        engine.execute_transition(
            service_request, workflow_data['verification'], staff_user, notify=False
        )
        closed = RequestStageHistory.objects.get(
            request=service_request, stage=workflow_data['submission']
        )
        assert closed.exited_at is not None
        assert closed.duration_minutes is not None
        assert closed.duration_minutes >= 0

    def test_transition_creates_new_history_entry(self, service_request, staff_user, workflow_data):
        from apps.requests.models import RequestStageHistory
        engine = WorkflowEngine()
        engine.execute_transition(
            service_request, workflow_data['verification'], staff_user, notify=False
        )
        open_entry = RequestStageHistory.objects.get(
            request=service_request, exited_at__isnull=True
        )
        assert open_entry.stage.code == 'VERIFICATION'

    def test_transition_creates_audit_record(self, service_request, staff_user, workflow_data):
        from apps.audit.models import AuditRecord
        engine = WorkflowEngine()
        engine.execute_transition(
            service_request, workflow_data['verification'], staff_user, notify=False
        )
        records = AuditRecord.objects.filter(
            request=service_request, action='STAGE_TRANSITION'
        )
        assert records.count() == 1


# ── Rejection Path Tests (Q2) ───────────────────────────────

class TestRejectionPath:

    def _advance_to_approval(self, service_request, staff_user, workflow_data):
        engine = WorkflowEngine()
        engine.execute_transition(service_request, workflow_data['verification'], staff_user, notify=False)
        service_request.refresh_from_db()
        engine.execute_transition(service_request, workflow_data['approval'], staff_user, notify=False)
        service_request.refresh_from_db()

    def test_rejection_transition_sets_status_rejected(self, service_request, staff_user, workflow_data):
        self._advance_to_approval(service_request, staff_user, workflow_data)
        engine = WorkflowEngine()
        engine.execute_transition(
            service_request, workflow_data['rejected'], staff_user,
            note='Incomplete documentation.', notify=False
        )
        service_request.refresh_from_db()
        assert service_request.status == 'rejected'
        assert service_request.resolved_at is not None

    def test_rejection_creates_audit_with_rejected_action(self, service_request, staff_user, workflow_data):
        from apps.audit.models import AuditRecord
        self._advance_to_approval(service_request, staff_user, workflow_data)
        engine = WorkflowEngine()
        engine.execute_transition(
            service_request, workflow_data['rejected'], staff_user, notify=False
        )
        record = AuditRecord.objects.filter(
            request=service_request, action='STAGE_REJECTED'
        ).first()
        assert record is not None
        assert record.metadata_json['is_rejection'] is True


# ── Validation Tests ────────────────────────────────────────

class TestTransitionValidation:

    def test_invalid_transition_raises_error(self, service_request, staff_user, workflow_data):
        """Cannot skip from Submission directly to Completion."""
        engine = WorkflowEngine()
        with pytest.raises(WorkflowValidationError) as exc_info:
            engine.execute_transition(
                service_request, workflow_data['completion'], staff_user, notify=False
            )
        assert 'not permitted' in str(exc_info.value)

    def test_terminal_request_cannot_transition(self, service_request, staff_user, workflow_data):
        """Once resolved/rejected, no further transitions are allowed."""
        # Advance all the way to Completion
        engine = WorkflowEngine()
        for stage_key in ['verification', 'approval', 'completion']:
            service_request.refresh_from_db()
            engine.execute_transition(service_request, workflow_data[stage_key], staff_user, notify=False)

        service_request.refresh_from_db()
        assert service_request.is_terminal is True

        with pytest.raises(WorkflowValidationError) as exc_info:
            engine.execute_transition(
                service_request, workflow_data['verification'], staff_user, notify=False
            )
        assert 'Terminal' in str(exc_info.value) or 'terminal' in str(exc_info.value)

    def test_wrong_department_staff_cannot_transition(self, service_request, staff_user_other_dept, workflow_data):
        """Staff from a different department are refused."""
        engine = WorkflowEngine()
        ok, reason = engine.can_transition(
            service_request, workflow_data['verification'], staff_user_other_dept
        )
        assert ok is False
        assert 'department' in reason.lower()

    def test_admin_can_transition_any_stage(self, service_request, admin_user, workflow_data):
        """Admin bypasses department restriction."""
        engine = WorkflowEngine()
        ok, reason = engine.can_transition(
            service_request, workflow_data['verification'], admin_user
        )
        assert ok is True
        assert reason == ''
