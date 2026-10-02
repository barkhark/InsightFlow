"""
InsightFlow — Tests for CSAT Feedback, Predictive Analytics Engine, and ERP Integration
"""
import pytest
from rest_framework import status
from django.utils import timezone

from apps.accounts.models import User
from apps.requests.models import ServiceRequest, RequestFeedback
from apps.workflows.models import WorkflowDefinition, WorkflowStage, SLAConfiguration
from apps.services.models import ServiceArea, ServiceCategory
from apps.audit.models import AuditRecord
from apps.notifications.models import Notification
from apps.notifications.service import NotificationService
from core.predictive_engine import PredictiveEngine
from core.erp_service import ERPIntegrationService
from core.workflow_engine import WorkflowEngine
from core.utils import generate_reference_number


@pytest.fixture
def test_workflow_setup(db, department):
    """Build a complete workflow with stages."""
    wf = WorkflowDefinition.objects.create(name='Academic Workflow', is_active=True)
    submission = WorkflowStage.objects.create(
        workflow=wf, name='Submission', code='SUBMISSION', order=1,
        responsible_department=department, is_initial=True,
    )
    processing = WorkflowStage.objects.create(
        workflow=wf, name='Processing', code='PROCESSING', order=2,
        responsible_department=department,
    )
    completion = WorkflowStage.objects.create(
        workflow=wf, name='Completion', code='COMPLETION', order=3,
        responsible_department=department, is_terminal=True,
    )
    submission.allowed_next_stages.set([processing])
    processing.allowed_next_stages.set([completion])

    SLAConfiguration.objects.create(stage=submission, target_hours=4)
    SLAConfiguration.objects.create(stage=processing, target_hours=8)

    area = ServiceArea.objects.create(name='Academic Domain', order=1)
    category = ServiceCategory.objects.create(
        service_area=area, name='Transcript Service',
        workflow=wf, owning_department=department,
    )

    return {'wf': wf, 'category': category, 'stages': [submission, processing, completion]}


@pytest.fixture
def active_service_request(db, student_user, test_workflow_setup):
    """Create and initialise a service request."""
    category = test_workflow_setup['category']
    req = ServiceRequest.objects.create(
        reference_number=generate_reference_number(),
        student=student_user,
        service_category=category,
        workflow=category.workflow,
        title='Transcript Request',
        details='Official transcript for higher studies application.',
    )
    WorkflowEngine().initialise_request(req, student_user)
    return req


@pytest.mark.django_db
class TestCSATFeedbackSystem:

    def test_submit_feedback_on_resolved_request(self, api_client, student_user, active_service_request):
        """Student can submit 1-5 star CSAT feedback on a resolved request."""
        active_service_request.status = ServiceRequest.Status.RESOLVED
        active_service_request.resolved_at = timezone.now()
        active_service_request.save()

        api_client.force_authenticate(user=student_user)
        url = f'/api/v1/requests/{active_service_request.id}/feedback/'

        payload = {
            'rating': 5,
            'speed_rating': 5,
            'helpfulness_rating': 4,
            'clarity_rating': 5,
            'comment': 'Exceptional service by the academic section! Transcript issued in record time.',
            'tags': ['Prompt Resolution', 'Helpful Staff', 'Clear Instructions'],
        }

        response = api_client.post(url, payload, format='json')
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data['success'] is True
        assert response.data['data']['rating'] == 5
        assert 'Prompt Resolution' in response.data['data']['tags']

        # Verify DB feedback record
        fb = RequestFeedback.objects.get(request=active_service_request)
        assert fb.student == student_user
        assert fb.rating == 5

        # Verify audit trail
        audit = AuditRecord.objects.filter(
            request=active_service_request,
            action=AuditRecord.Action.FEEDBACK_SUBMITTED
        ).first()
        assert audit is not None
        assert '5★' in audit.description

    def test_prevent_feedback_on_active_request(self, api_client, student_user, active_service_request):
        """Student cannot submit feedback while request is still open/in-progress."""
        active_service_request.status = ServiceRequest.Status.IN_PROGRESS
        active_service_request.save()

        api_client.force_authenticate(user=student_user)
        url = f'/api/v1/requests/{active_service_request.id}/feedback/'
        response = api_client.post(url, {'rating': 5}, format='json')

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert response.data['error']['code'] == 'REQUEST_NOT_TERMINAL'

    def test_prevent_duplicate_feedback(self, api_client, student_user, active_service_request):
        """Student cannot submit feedback twice for the same request."""
        active_service_request.status = ServiceRequest.Status.RESOLVED
        active_service_request.resolved_at = timezone.now()
        active_service_request.save()

        RequestFeedback.objects.create(
            request=active_service_request,
            student=student_user,
            rating=4,
            comment='Good job'
        )

        api_client.force_authenticate(user=student_user)
        url = f'/api/v1/requests/{active_service_request.id}/feedback/'
        response = api_client.post(url, {'rating': 5}, format='json')

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert response.data['error']['code'] == 'FEEDBACK_ALREADY_EXISTS'


@pytest.mark.django_db
class TestPredictiveEngineAndERP:

    def test_predictive_engine_on_active_request(self, active_service_request):
        """PredictiveEngine computes estimated hours, risk score, and risk factors."""
        forecast = PredictiveEngine.predict_request_completion(active_service_request)

        assert forecast['status'] == 'active'
        assert 'predicted_completion_hours' in forecast
        assert 'sla_risk_score' in forecast
        assert forecast['sla_risk_score'] >= 0
        assert forecast['risk_tier'] in ['LOW', 'MODERATE', 'HIGH']
        assert isinstance(forecast['risk_factors'], list)

    def test_erp_student_profile_generation(self, student_user):
        """ERPIntegrationService produces verified student record with academic standing."""
        profile = ERPIntegrationService.get_student_erp_profile(student_user)

        assert profile['email'] == student_user.email
        assert profile['fee_dues_status'] == 'CLEARED'
        assert profile['active_enrollment'] is True
        assert 'MIT-MCA2025' in profile['erp_student_id']

    def test_verification_digest_generation(self, active_service_request):
        """ERPIntegrationService generates cryptographic SHA-256 verification token."""
        digest = ERPIntegrationService.generate_verification_digest(active_service_request)

        assert 'VER-' in digest['verification_code']
        assert len(digest['full_hash']) == 64
        assert digest['issuer'] != ''

    def test_multi_channel_notification_dispatch(self, student_user, active_service_request):
        """NotificationService populates simulated multi-channel dispatch audit metadata."""
        notif_service = NotificationService()
        channels = notif_service._build_dispatch_channels(
            student_user,
            'Request Approved',
            'Your request has been approved.',
            Notification.NotificationType.STAGE_UPDATE
        )

        assert channels['in_app']['status'] == 'delivered'
        assert channels['email']['recipient'] == student_user.email
        assert '+91' in channels['sms']['phone']
        assert channels['erp_sync']['status'] == 'synced'

    def test_admin_predictive_forecast_endpoint(self, api_client, admin_user, active_service_request):
        """Admin can access /api/v1/admin/predictive-forecast/."""
        api_client.force_authenticate(user=admin_user)
        response = api_client.get('/api/v1/admin/predictive-forecast/')

        assert response.status_code == status.HTTP_200_OK
        assert response.data['success'] is True
        assert len(response.data['data']) >= 1

    def test_admin_csv_export_endpoint(self, api_client, admin_user, active_service_request):
        """Admin can download CSV export of service requests."""
        api_client.force_authenticate(user=admin_user)
        response = api_client.get('/api/v1/admin/export/csv/')

        assert response.status_code == status.HTTP_200_OK
        assert response['Content-Type'] == 'text/csv'
        assert 'attachment; filename=' in response['Content-Disposition']
        assert 'Reference Number,Title,Student Name' in response.content.decode('utf-8')

    def test_admin_csat_analytics_endpoint(self, api_client, admin_user, active_service_request, student_user):
        """Admin can retrieve aggregated CSAT analytics and department ratings."""
        from apps.requests.models import RequestFeedback, ServiceRequest
        active_service_request.status = ServiceRequest.Status.RESOLVED
        active_service_request.save()

        RequestFeedback.objects.create(
            request=active_service_request,
            student=student_user,
            rating=5,
            comment='Excellent fast resolution',
            tags=['Fast Resolution', 'Polite Staff']
        )
        api_client.force_authenticate(user=admin_user)
        response = api_client.get('/api/v1/admin/csat-analytics/')

        assert response.status_code == status.HTTP_200_OK
        assert response.data['success'] is True
        data = response.data['data']
        assert 'overview' in data
        assert data['overview']['total_responses'] >= 1
        assert 'department_breakdown' in data
        assert 'distribution' in data
        assert 'top_tags' in data
