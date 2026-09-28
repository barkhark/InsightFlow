"""
InsightFlow — Workflow & Service Model Tests (Phase 2)

Tests cover:
  - WorkflowDefinition creation and stage relationships
  - WorkflowStage ordering constraints (unique_together)
  - WorkflowStage code uniqueness per workflow
  - Rejection path setup (is_rejection terminal)
  - SLAConfiguration threshold validation
  - ServiceArea / ServiceCategory / DynamicFieldSchema creation
  - DynamicFieldSchema options_json for select/checkbox types
  - ServiceCategory unique_together constraint

Test count: 18 test cases
"""
import pytest
from django.core.exceptions import ValidationError

pytestmark = pytest.mark.django_db


# ── Shared fixtures for Phase 2 ─────────────────────────────

@pytest.fixture
def workflow(db, department):
    from apps.workflows.models import WorkflowDefinition
    return WorkflowDefinition.objects.create(
        name='Bonafide Certificate Workflow',
        description='Handles bonafide certificate requests.',
        is_active=True,
        version=1,
    )


@pytest.fixture
def stages(db, workflow, department):
    """Build a complete workflow: Submission → Verification → Approval → Completion
    with a Rejected branch from Approval."""
    from apps.workflows.models import WorkflowStage

    submission = WorkflowStage.objects.create(
        workflow=workflow, name='Submission', code='SUBMISSION',
        order=1, responsible_department=department, is_initial=True,
    )
    verification = WorkflowStage.objects.create(
        workflow=workflow, name='Verification', code='VERIFICATION',
        order=2, responsible_department=department,
    )
    approval = WorkflowStage.objects.create(
        workflow=workflow, name='Approval', code='APPROVAL',
        order=3, responsible_department=department,
    )
    completion = WorkflowStage.objects.create(
        workflow=workflow, name='Completion', code='COMPLETION',
        order=4, responsible_department=department, is_terminal=True,
    )
    rejected = WorkflowStage.objects.create(
        workflow=workflow, name='Rejected', code='REJECTED',
        order=5, responsible_department=department,
        is_terminal=True, is_rejection=True,
    )

    # Wire transitions
    submission.allowed_next_stages.set([verification])
    verification.allowed_next_stages.set([approval])
    approval.allowed_next_stages.set([completion, rejected])  # rejection branch (Q2)

    return {
        'submission': submission, 'verification': verification,
        'approval': approval, 'completion': completion, 'rejected': rejected,
    }


@pytest.fixture
def sla_configs(db, stages):
    from apps.workflows.models import SLAConfiguration
    configs = {}
    sla_data = {
        'submission': (4, 75, 90),
        'verification': (8, 75, 90),
        'approval': (12, 75, 90),
        'completion': (2, 75, 90),
    }
    for key, (hours, warn, crit) in sla_data.items():
        configs[key] = SLAConfiguration.objects.create(
            stage=stages[key],
            target_hours=hours,
            warning_threshold_pct=warn,
            critical_threshold_pct=crit,
        )
    return configs


@pytest.fixture
def service_area(db):
    from apps.services.models import ServiceArea
    return ServiceArea.objects.create(
        name='Academic', description='Academic services.', icon_key='graduation-cap', order=1,
    )


@pytest.fixture
def service_category(db, service_area, workflow, department):
    from apps.services.models import ServiceCategory
    return ServiceCategory.objects.create(
        service_area=service_area,
        name='Bonafide Certificate',
        description='Request a bonafide certificate.',
        workflow=workflow,
        owning_department=department,
        default_priority='medium',
    )


# ── WorkflowDefinition Tests ────────────────────────────────

class TestWorkflowDefinition:

    def test_workflow_created_with_correct_name(self, workflow):
        assert workflow.name == 'Bonafide Certificate Workflow'

    def test_workflow_is_active_by_default(self, workflow):
        assert workflow.is_active is True

    def test_workflow_version_defaults_to_1(self, workflow):
        assert workflow.version == 1

    def test_workflow_str_includes_version(self, workflow):
        assert 'v1' in str(workflow)

    def test_get_initial_stage_returns_correct_stage(self, workflow, stages):
        initial = workflow.get_initial_stage()
        assert initial is not None
        assert initial.code == 'SUBMISSION'
        assert initial.is_initial is True

    def test_get_terminal_stages_returns_completion_and_rejected(self, workflow, stages):
        terminals = list(workflow.get_terminal_stages())
        codes = {s.code for s in terminals}
        assert 'COMPLETION' in codes
        assert 'REJECTED' in codes

    def test_stage_count_property(self, workflow, stages):
        assert workflow.stage_count == 5


# ── WorkflowStage Tests ─────────────────────────────────────

class TestWorkflowStage:

    def test_rejection_stage_is_terminal_and_rejection(self, stages):
        rejected = stages['rejected']
        assert rejected.is_terminal is True
        assert rejected.is_rejection is True

    def test_approval_allows_both_completion_and_rejection(self, stages):
        """Architectural requirement Q2: rejection path from Approval."""
        next_stages = list(stages['approval'].allowed_next_stages.all())
        codes = {s.code for s in next_stages}
        assert 'COMPLETION' in codes
        assert 'REJECTED' in codes

    def test_terminal_stage_has_no_outgoing_transitions(self, stages):
        assert stages['completion'].allowed_next_stages.count() == 0
        assert stages['rejected'].allowed_next_stages.count() == 0

    def test_unique_together_order_per_workflow(self, workflow, department):
        from apps.workflows.models import WorkflowStage
        from django.db import IntegrityError
        WorkflowStage.objects.create(
            workflow=workflow, name='Stage A', code='STAGE_A',
            order=10, responsible_department=department,
        )
        with pytest.raises(IntegrityError):
            WorkflowStage.objects.create(
                workflow=workflow, name='Stage B', code='STAGE_B',
                order=10, responsible_department=department,
            )

    def test_unique_together_code_per_workflow(self, workflow, department):
        from apps.workflows.models import WorkflowStage
        from django.db import IntegrityError
        WorkflowStage.objects.create(
            workflow=workflow, name='Stage X', code='UNIQUE_CODE',
            order=20, responsible_department=department,
        )
        with pytest.raises(IntegrityError):
            WorkflowStage.objects.create(
                workflow=workflow, name='Stage Y', code='UNIQUE_CODE',
                order=21, responsible_department=department,
            )


# ── SLAConfiguration Tests ──────────────────────────────────

class TestSLAConfiguration:

    def test_sla_config_created_with_correct_target(self, sla_configs):
        assert sla_configs['verification'].target_hours == 8

    def test_sla_config_warning_threshold(self, sla_configs):
        assert sla_configs['approval'].warning_threshold_pct == 75

    def test_sla_config_critical_threshold(self, sla_configs):
        assert sla_configs['approval'].critical_threshold_pct == 90

    def test_sla_config_invalid_thresholds_raises(self, stages):
        from apps.workflows.models import SLAConfiguration
        config = SLAConfiguration(
            stage=stages['completion'],
            target_hours=4,
            warning_threshold_pct=95,   # > critical
            critical_threshold_pct=80,  # < warning — invalid
        )
        with pytest.raises(ValidationError):
            config.clean()


# ── ServiceArea & ServiceCategory Tests ─────────────────────

class TestServiceModels:

    def test_service_area_created(self, service_area):
        assert service_area.name == 'Academic'

    def test_service_category_created(self, service_category):
        assert service_category.name == 'Bonafide Certificate'

    def test_service_category_links_workflow(self, service_category, workflow):
        assert service_category.workflow_id == workflow.id

    def test_dynamic_field_select_type(self, service_category):
        from apps.services.models import DynamicFieldSchema
        field = DynamicFieldSchema.objects.create(
            service_category=service_category,
            field_key='purpose',
            field_label='Purpose of Certificate',
            field_type='select',
            options_json=[
                {'value': 'bank', 'label': 'Bank Account'},
                {'value': 'visa', 'label': 'Visa Application'},
            ],
            is_required=True,
            order=1,
        )
        assert field.field_type == 'select'
        assert len(field.options_json) == 2
        assert field.options_json[0]['value'] == 'bank'

    def test_service_category_unique_per_area(self, service_area, workflow, department):
        from apps.services.models import ServiceCategory
        from django.db import IntegrityError
        # Create the original record first
        ServiceCategory.objects.create(
            service_area=service_area,
            name='Bonafide Certificate',
            workflow=workflow,
            owning_department=department,
        )
        # Attempting the same name in the same area must raise IntegrityError
        with pytest.raises(IntegrityError):
            ServiceCategory.objects.create(
                service_area=service_area,
                name='Bonafide Certificate',
                workflow=workflow,
                owning_department=department,
            )

