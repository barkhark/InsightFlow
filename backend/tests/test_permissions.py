"""
InsightFlow — RBAC Permission Tests (Phase 1)

Phase 1 tests cover the foundational role/endpoint enforcement.
Additional permission tests are added in Phase 5 when all endpoints exist.

Tests verify:
- Unauthenticated access is rejected (401, not 403)
- Each role receives the correct role field
- Error envelopes are structurally consistent
- Password is never returned in any response

Test count: 10 test cases
"""
import pytest

pytestmark = pytest.mark.django_db

AUTH_LOGIN_URL = '/api/v1/auth/login/'
AUTH_ME_URL = '/api/v1/auth/me/'


class TestUnauthenticatedAccess:

    def test_unauthenticated_cannot_access_me(self, api_client):
        """Protected endpoints must reject unauthenticated requests with 401."""
        response = api_client.get(AUTH_ME_URL)
        assert response.status_code == 401

    def test_unauthenticated_gets_no_user_data(self, api_client):
        """No user data must leak to unauthenticated callers."""
        response = api_client.get(AUTH_ME_URL)
        assert response.json().get('data') is None


class TestRoleEnforcement:

    def test_student_role_is_correct_in_me(self, auth_student):
        response = auth_student.get(AUTH_ME_URL)
        assert response.json()['data']['role'] == 'student'

    def test_staff_role_is_correct_in_me(self, auth_staff):
        response = auth_staff.get(AUTH_ME_URL)
        assert response.json()['data']['role'] == 'staff'

    def test_admin_role_is_correct_in_me(self, auth_admin):
        response = auth_admin.get(AUTH_ME_URL)
        assert response.json()['data']['role'] == 'admin'


class TestResponseEnvelopeConsistency:

    def test_success_response_has_success_true(self, auth_student):
        response = auth_student.get(AUTH_ME_URL)
        assert response.json()['success'] is True

    def test_error_response_has_success_false(self, api_client, db):
        response = api_client.post(AUTH_LOGIN_URL, {'email': 'x@x.com', 'password': 'wrong'})
        assert response.json()['success'] is False

    def test_error_response_has_error_object(self, api_client, db):
        response = api_client.post(AUTH_LOGIN_URL, {'email': 'x@x.com', 'password': 'wrong'})
        error = response.json().get('error')
        assert error is not None
        assert 'code' in error
        assert 'message' in error

    def test_password_never_returned_in_me(self, auth_student):
        """Passwords must never appear in API responses."""
        response = auth_student.get(AUTH_ME_URL)
        body = str(response.json())
        assert 'password' not in body.lower()

    def test_password_never_returned_in_login(self, api_client, student_user):
        response = api_client.post(AUTH_LOGIN_URL, {
            'email': 'student@insightflow.test',
            'password': 'TestPass@123',
        })
        body = str(response.json())
        # 'password' keyword should not appear in response keys/values
        assert 'TestPass@123' not in body
