"""
InsightFlow — Security Hardening, Object-Level Permissions & Health Tests

Tests cover:
  1. Login authentication without backdoor bypass.
  2. Object-level departmental isolation for staff actions (transition, comment, assign).
  3. Controlled attachment download security (student ownership, staff department, admin).
  4. Attachment upload validation (empty file rejection, invalid extension rejection).
  5. Health check endpoint (application & database status).
"""
import pytest
import io
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APIClient
from core.workflow_engine import WorkflowEngine
from core.utils import generate_reference_number

pytestmark = pytest.mark.django_db


# ── Fixtures ─────────────────────────────────────────────────────────────

@pytest.fixture
def other_department(db):
    from apps.departments.models import Department
    return Department.objects.create(name='Hostel & Logistics', code='HOSTEL')


@pytest.fixture
def other_staff_user(db, other_department):
    from apps.accounts.models import User, StaffProfile
    user = User.objects.create_user(
        email='hostel.warden@insightflow.test',
        password='TestPass@123',
        full_name='Warden Rao',
        role='staff',
    )
    StaffProfile.objects.create(
        user=user,
        department=other_department,
        employee_id='STF-HOSTEL-001',
        designation='Hostel Supervisor'
    )
    return user


@pytest.fixture
def second_student_user(db):
    from apps.accounts.models import User, StudentProfile
    user = User.objects.create_user(
        email='second.student@insightflow.test',
        password='TestPass@123',
        full_name='Aarav Mehta',
        role='student',
    )
    StudentProfile.objects.create(
        user=user,
        roll_number='MCA-2025-099',
        programme='MCA',
        semester=3,
        division='D'
    )
    return user


@pytest.fixture
def active_request(db, student_user, api_setup):
    from apps.requests.models import ServiceRequest
    req = ServiceRequest.objects.create(
        reference_number=generate_reference_number(),
        student=student_user,
        service_category=api_setup['category'],
        workflow=api_setup['workflow'],
        title='Hardening Test Request',
        details='Testing security and permissions',
    )
    WorkflowEngine().initialise_request(req, student_user)
    return req


@pytest.fixture
def test_attachment(db, student_user, active_request):
    from apps.attachments.models import Attachment
    file_content = b"%PDF-1.4 test document content for download security"
    uploaded = SimpleUploadedFile(
        "verification_doc.pdf",
        file_content,
        content_type="application/pdf"
    )
    return Attachment.objects.create(
        request=active_request,
        uploaded_by=student_user,
        file=uploaded,
        original_filename="verification_doc.pdf",
        file_size_bytes=len(file_content),
        mime_type="application/pdf",
    )


# ── 1. Authentication Hardening Tests ────────────────────────────────────

class TestAuthSecurityHardening:

    def test_login_rejects_arbitrary_passwords_without_backdoor(self, api_client, student_user):
        """Verifies that arbitrary bypass passwords like 'password' or 'test1234' are strictly rejected."""
        bypass_attempts = ['password', 'test1234', 'insightflow@2026', 'admin123']
        for bad_pass in bypass_attempts:
            response = api_client.post('/api/v1/auth/login/', {
                'email': student_user.email,
                'password': bad_pass,
            })
            assert response.status_code == 400
            assert response.json()['success'] is False
            assert response.json()['error']['code'] == 'INVALID_CREDENTIALS'

    def test_login_succeeds_with_actual_password(self, api_client, student_user):
        """Standard valid credentials must authenticate successfully."""
        response = api_client.post('/api/v1/auth/login/', {
            'email': student_user.email,
            'password': 'TestPass@123',
        })
        assert response.status_code == 200
        assert response.json()['success'] is True
        assert 'access' in response.json()['data']


# ── 2. Object-Level Departmental Isolation Tests ─────────────────────────

class TestObjectLevelDepartmentIsolation:

    def test_wrong_department_staff_forbidden_on_transition(self, other_staff_user, active_request, api_setup):
        """Staff from another department cannot advance or transition a request."""
        client = APIClient()
        client.force_authenticate(user=other_staff_user)

        target_stage_id = str(api_setup['stages']['review'].id)
        resp = client.post(f'/api/v1/staff/queue/{active_request.id}/transition/', {
            'target_stage_id': target_stage_id,
            'note': 'Unauthorized attempt',
        }, format='json')

        assert resp.status_code == 403
        assert resp.json()['success'] is False
        assert resp.json()['error']['code'] == 'FORBIDDEN'

    def test_wrong_department_staff_forbidden_on_comments(self, other_staff_user, active_request):
        """Staff from another department cannot comment on requests outside their queue."""
        client = APIClient()
        client.force_authenticate(user=other_staff_user)

        resp = client.post(f'/api/v1/staff/queue/{active_request.id}/comments/', {
            'body': 'Unauthorized comment attempt',
            'is_internal': True,
        }, format='json')

        assert resp.status_code == 403
        assert resp.json()['success'] is False
        assert resp.json()['error']['code'] == 'FORBIDDEN'

    def test_wrong_department_staff_forbidden_on_assign(self, other_staff_user, active_request, staff_user):
        """Staff from another department cannot assign requests outside their queue."""
        client = APIClient()
        client.force_authenticate(user=other_staff_user)

        resp = client.post(f'/api/v1/staff/queue/{active_request.id}/assign/', {
            'assignee_id': str(staff_user.id),
        }, format='json')

        assert resp.status_code == 403
        assert resp.json()['success'] is False
        assert resp.json()['error']['code'] == 'FORBIDDEN'

    def test_staff_cannot_assign_to_other_department_staff(self, auth_staff, active_request, other_staff_user):
        """Staff cannot assign their department request to a staff member in another department."""
        resp = auth_staff.post(f'/api/v1/staff/queue/{active_request.id}/assign/', {
            'assignee_id': str(other_staff_user.id),
        }, format='json')

        assert resp.status_code == 400
        assert resp.json()['success'] is False
        assert resp.json()['error']['code'] == 'INVALID_ASSIGNEE'


# ── 3. Attachment Upload & Controlled Download Tests ─────────────────────

class TestAttachmentSecurity:

    def test_attachment_upload_rejects_empty_file(self, auth_student, active_request):
        """Uploading an empty 0-byte file must be rejected with 400."""
        empty_file = SimpleUploadedFile("empty.pdf", b"", content_type="application/pdf")
        resp = auth_student.post(
            f'/api/v1/requests/{active_request.id}/attachments/',
            {'file': empty_file},
            format='multipart'
        )
        assert resp.status_code == 400
        assert resp.json()['success'] is False
        assert resp.json()['error']['code'] == 'EMPTY_FILE'

    def test_attachment_upload_rejects_disallowed_extension(self, auth_student, active_request):
        """Uploading executable or script files must be rejected."""
        script_file = SimpleUploadedFile("malicious.sh", b"#!/bin/bash echo hacked", content_type="text/x-sh")
        resp = auth_student.post(
            f'/api/v1/requests/{active_request.id}/attachments/',
            {'file': script_file},
            format='multipart'
        )
        assert resp.status_code == 400
        assert resp.json()['success'] is False
        assert resp.json()['error']['code'] == 'INVALID_FILE_TYPE'

    def test_attachment_download_permitted_for_student_owner(self, auth_student, test_attachment):
        """Student owner can download their own request attachment."""
        resp = auth_student.get(f'/api/v1/attachments/{test_attachment.id}/download/')
        assert resp.status_code == 200
        assert 'attachment; filename=' in resp['Content-Disposition']

    def test_attachment_download_forbidden_for_other_student(self, second_student_user, test_attachment):
        """Another student attempting to download an attachment gets 403 Forbidden."""
        client = APIClient()
        client.force_authenticate(user=second_student_user)

        resp = client.get(f'/api/v1/attachments/{test_attachment.id}/download/')
        assert resp.status_code == 403
        assert resp.json()['success'] is False
        assert resp.json()['error']['code'] == 'FORBIDDEN'

    def test_attachment_download_permitted_for_department_staff(self, auth_staff, test_attachment):
        """Staff in the responsible department can download the attachment."""
        resp = auth_staff.get(f'/api/v1/attachments/{test_attachment.id}/download/')
        assert resp.status_code == 200

    def test_attachment_download_forbidden_for_other_department_staff(self, other_staff_user, test_attachment):
        """Staff in an unrelated department cannot download the attachment."""
        client = APIClient()
        client.force_authenticate(user=other_staff_user)

        resp = client.get(f'/api/v1/attachments/{test_attachment.id}/download/')
        assert resp.status_code == 403
        assert resp.json()['error']['code'] == 'FORBIDDEN'

    def test_attachment_download_permitted_for_admin(self, auth_admin, test_attachment):
        """Admin has oversight access to download any attachment."""
        resp = auth_admin.get(f'/api/v1/attachments/{test_attachment.id}/download/')
        assert resp.status_code == 200


# ── 4. Health Check Tests ────────────────────────────────────────────────

class TestHealthCheckEndpoint:

    def test_root_health_check_returns_200(self, api_client):
        """GET /api/health/ returns 200 with operational metrics."""
        resp = api_client.get('/api/health/')
        assert resp.status_code == 200
        data = resp.json()
        assert data['success'] is True
        assert data['status'] == 'healthy'
        assert data['services']['application'] == 'operational'
        assert data['services']['database'] == 'connected'

    def test_v1_health_check_returns_200(self, api_client):
        """GET /api/v1/health/ returns 200."""
        resp = api_client.get('/api/v1/health/')
        assert resp.status_code == 200
        assert resp.json()['status'] == 'healthy'
