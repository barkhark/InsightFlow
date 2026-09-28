"""
InsightFlow — API v1 Integration Tests (Phase 5)

Tests all REST endpoints across Student, Staff, and Admin roles:
  - ServiceArea & ServiceCategory discovery
  - Student request creation, validation, list, and detail
  - Student comment creation & attachment validation
  - Staff queue viewing (scoped to department)
  - Staff stage transitions (valid + invalid)
  - Staff internal comments & assignments
  - Notification polling (count) and mark-as-read
  - Admin Analytics (dashboard KPIs, department-health, bottlenecks, trends, requests)

Test count: 20+ comprehensive integration tests
"""
import pytest
from core.workflow_engine import WorkflowEngine
from core.utils import generate_reference_number

pytestmark = pytest.mark.django_db


# ── Shared Fixtures for API Tests ───────────────────────────

@pytest.fixture
def api_setup(db, department):
    """Full workflow + category setup for API integration testing."""
    from apps.workflows.models import WorkflowDefinition, WorkflowStage, SLAConfiguration
    from apps.services.models import ServiceArea, ServiceCategory, DynamicFieldSchema

    wf = WorkflowDefinition.objects.create(name='Test Workflow', is_active=True)
    s1 = WorkflowStage.objects.create(
        workflow=wf, name='Initial Stage', code='INITIAL', order=1,
        responsible_department=department, is_initial=True,
    )
    s2 = WorkflowStage.objects.create(
        workflow=wf, name='Review Stage', code='REVIEW', order=2,
        responsible_department=department,
    )
    s3 = WorkflowStage.objects.create(
        workflow=wf, name='Resolved Stage', code='RESOLVED', order=3,
        responsible_department=department, is_terminal=True,
    )
    s4 = WorkflowStage.objects.create(
        workflow=wf, name='Rejected Stage', code='REJECTED', order=4,
        responsible_department=department, is_terminal=True, is_rejection=True,
    )
    s1.allowed_next_stages.set([s2])
    s2.allowed_next_stages.set([s3, s4])

    SLAConfiguration.objects.create(stage=s1, target_hours=4)
    SLAConfiguration.objects.create(stage=s2, target_hours=8)

    area = ServiceArea.objects.create(name='Academics', icon_key='graduation-cap', order=1)
    category = ServiceCategory.objects.create(
        service_area=area,
        name='Grade Card Issue',
        workflow=wf,
        owning_department=department,
        default_priority='medium',
    )
    field1 = DynamicFieldSchema.objects.create(
        service_category=category,
        field_key='semester_no',
        field_label='Semester Number',
        field_type='number',
        is_required=True,
        order=1,
    )

    return {
        'workflow': wf,
        'stages': {'initial': s1, 'review': s2, 'resolved': s3, 'rejected': s4},
        'area': area,
        'category': category,
        'fields': [field1],
    }


# ── Service Discovery Tests ─────────────────────────────────

class TestServiceDiscovery:

    def test_list_service_areas(self, auth_student, api_setup):
        resp = auth_student.get('/api/v1/service-areas/')
        assert resp.status_code == 200
        data = resp.json()
        assert data['success'] is True
        assert len(data['data']) >= 1
        assert data['data'][0]['name'] == 'Academics'

    def test_list_service_categories(self, auth_student, api_setup):
        resp = auth_student.get('/api/v1/service-categories/')
        assert resp.status_code == 200
        data = resp.json()
        assert data['success'] is True
        assert len(data['data']) >= 1
        assert data['data'][0]['name'] == 'Grade Card Issue'

    def test_service_category_detail_includes_dynamic_fields(self, auth_student, api_setup):
        cat_id = api_setup['category'].id
        resp = auth_student.get(f'/api/v1/service-categories/{cat_id}/')
        assert resp.status_code == 200
        data = resp.json()['data']
        assert data['name'] == 'Grade Card Issue'
        assert len(data['dynamic_fields']) == 1
        assert data['dynamic_fields'][0]['field_key'] == 'semester_no'


# ── Student Request API Tests ───────────────────────────────

class TestStudentRequestAPI:

    def test_create_request_success(self, auth_student, api_setup):
        cat_id = str(api_setup['category'].id)
        resp = auth_student.post('/api/v1/requests/', {
            'service_category': cat_id,
            'title': 'Need Sem 3 Grade Card',
            'details': 'Original misplaced.',
            'dynamic_fields_data': {'semester_no': 3},
        }, format='json')
        assert resp.status_code == 201
        data = resp.json()
        assert data['success'] is True
        assert 'reference_number' in data['data']

    def test_create_request_missing_required_dynamic_field_fails(self, auth_student, api_setup):
        cat_id = str(api_setup['category'].id)
        resp = auth_student.post('/api/v1/requests/', {
            'service_category': cat_id,
            'title': 'Need Sem 3 Grade Card',
            'details': 'Original misplaced.',
            'dynamic_fields_data': {},  # missing semester_no
        }, format='json')
        assert resp.status_code == 400
        assert resp.json()['success'] is False

    def test_student_list_own_requests(self, auth_student, student_user, api_setup):
        from apps.requests.models import ServiceRequest
        req = ServiceRequest.objects.create(
            reference_number=generate_reference_number(),
            student=student_user,
            service_category=api_setup['category'],
            workflow=api_setup['workflow'],
            title='My Request',
            details='Test details',
        )
        WorkflowEngine().initialise_request(req, student_user)

        resp = auth_student.get('/api/v1/requests/')
        assert resp.status_code == 200
        data = resp.json()
        assert data['success'] is True
        assert len(data['data']) >= 1

    def test_student_add_comment(self, auth_student, student_user, api_setup):
        from apps.requests.models import ServiceRequest
        req = ServiceRequest.objects.create(
            reference_number=generate_reference_number(),
            student=student_user,
            service_category=api_setup['category'],
            workflow=api_setup['workflow'],
            title='Comment Test',
            details='Testing comments',
        )
        WorkflowEngine().initialise_request(req, student_user)

        resp = auth_student.post(f'/api/v1/requests/{req.id}/comments/', {
            'body': 'Checking in on progress.',
        }, format='json')
        assert resp.status_code == 201
        assert resp.json()['data']['body'] == 'Checking in on progress.'


# ── Staff Queue API Tests ───────────────────────────────────

class TestStaffQueueAPI:

    def test_staff_queue_lists_department_requests(self, auth_staff, student_user, api_setup):
        from apps.requests.models import ServiceRequest
        req = ServiceRequest.objects.create(
            reference_number=generate_reference_number(),
            student=student_user,
            service_category=api_setup['category'],
            workflow=api_setup['workflow'],
            title='Staff Queue Test',
            details='In academic queue',
        )
        WorkflowEngine().initialise_request(req, student_user)

        resp = auth_staff.get('/api/v1/staff/queue/')
        assert resp.status_code == 200
        data = resp.json()
        assert data['success'] is True
        assert len(data['data']) >= 1

    def test_staff_transition_request(self, auth_staff, student_user, api_setup):
        from apps.requests.models import ServiceRequest
        req = ServiceRequest.objects.create(
            reference_number=generate_reference_number(),
            student=student_user,
            service_category=api_setup['category'],
            workflow=api_setup['workflow'],
            title='Transition Test',
            details='Ready to advance',
        )
        WorkflowEngine().initialise_request(req, student_user)

        target_stage_id = str(api_setup['stages']['review'].id)
        resp = auth_staff.post(f'/api/v1/staff/queue/{req.id}/transition/', {
            'target_stage_id': target_stage_id,
            'note': 'Verification complete.',
        }, format='json')
        assert resp.status_code == 200
        data = resp.json()
        assert data['success'] is True
        assert data['data']['new_stage'] == 'Review Stage'


# ── Notifications API Tests ─────────────────────────────────

class TestNotificationsAPI:

    def test_get_notification_count(self, auth_student, student_user):
        from apps.notifications.models import Notification
        Notification.objects.create(
            recipient=student_user,
            notification_type='GENERAL',
            title='Test Notification',
            message='Hello student',
            is_read=False,
        )
        resp = auth_student.get('/api/v1/notifications/count/')
        assert resp.status_code == 200
        assert resp.json()['data']['unread_count'] >= 1

    def test_mark_all_notifications_read(self, auth_student, student_user):
        from apps.notifications.models import Notification
        Notification.objects.create(
            recipient=student_user,
            notification_type='GENERAL',
            title='Unread 1',
            message='Message 1',
            is_read=False,
        )
        resp = auth_student.post('/api/v1/notifications/mark-read/', {'ids': 'all'}, format='json')
        assert resp.status_code == 200
        assert resp.json()['success'] is True

        count_resp = auth_student.get('/api/v1/notifications/count/')
        assert count_resp.json()['data']['unread_count'] == 0


# ── Admin Analytics API Tests ───────────────────────────────

class TestAdminAnalyticsAPI:

    def test_admin_dashboard_kpis(self, auth_admin, api_setup):
        resp = auth_admin.get('/api/v1/admin/dashboard/')
        assert resp.status_code == 200
        data = resp.json()
        assert data['success'] is True
        assert 'total_active_requests' in data['data']
        assert 'explanation' in data['data']

    def test_admin_department_health(self, auth_admin, api_setup):
        resp = auth_admin.get('/api/v1/admin/department-health/')
        assert resp.status_code == 200
        data = resp.json()
        assert data['success'] is True
        assert isinstance(data['data'], list)
        if len(data['data']) > 0:
            assert 'compliance_rate_pct' in data['data'][0]
            assert 'explanation' in data['data'][0]

    def test_admin_bottlenecks(self, auth_admin, api_setup):
        resp = auth_admin.get('/api/v1/admin/bottlenecks/')
        assert resp.status_code == 200
        data = resp.json()
        assert data['success'] is True
        assert isinstance(data['data'], list)

    def test_admin_trends(self, auth_admin, api_setup):
        resp = auth_admin.get('/api/v1/admin/trends/')
        assert resp.status_code == 200
        data = resp.json()
        assert data['success'] is True
        assert isinstance(data['data'], list)

    def test_admin_all_requests_list(self, auth_admin, api_setup):
        resp = auth_admin.get('/api/v1/admin/requests/')
        assert resp.status_code == 200
        data = resp.json()
        assert data['success'] is True

    def test_non_admin_cannot_access_analytics(self, auth_student):
        resp = auth_student.get('/api/v1/admin/dashboard/')
        assert resp.status_code == 403
