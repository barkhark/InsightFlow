"""
InsightFlow — Authentication Tests (Phase 1)

Tests every login, logout, token refresh, and /me/ scenario.
All response envelopes are verified for structural consistency.

Test count: 16 test cases
"""
import pytest

pytestmark = pytest.mark.django_db

AUTH_LOGIN_URL = '/api/v1/auth/login/'
AUTH_LOGOUT_URL = '/api/v1/auth/logout/'
AUTH_ME_URL = '/api/v1/auth/me/'
AUTH_REFRESH_URL = '/api/v1/auth/token/refresh/'


# ── Login Tests ─────────────────────────────────────────────

class TestLogin:

    def test_login_with_valid_credentials_returns_200(self, api_client, student_user):
        response = api_client.post(AUTH_LOGIN_URL, {
            'email': 'student@insightflow.test',
            'password': 'TestPass@123',
        })
        assert response.status_code == 200

    def test_login_response_contains_access_token(self, api_client, student_user):
        response = api_client.post(AUTH_LOGIN_URL, {
            'email': 'student@insightflow.test',
            'password': 'TestPass@123',
        })
        data = response.json()
        assert data['success'] is True
        assert 'access' in data['data']
        assert len(data['data']['access']) > 0

    def test_login_response_contains_refresh_token(self, api_client, student_user):
        response = api_client.post(AUTH_LOGIN_URL, {
            'email': 'student@insightflow.test',
            'password': 'TestPass@123',
        })
        data = response.json()
        assert 'refresh' in data['data']

    def test_login_response_contains_user_object(self, api_client, student_user):
        response = api_client.post(AUTH_LOGIN_URL, {
            'email': 'student@insightflow.test',
            'password': 'TestPass@123',
        })
        user_data = response.json()['data']['user']
        assert user_data['email'] == 'student@insightflow.test'
        assert user_data['full_name'] == 'Priya Sharma'
        assert user_data['role'] == 'student'

    def test_login_wrong_password_returns_400(self, api_client, student_user):
        response = api_client.post(AUTH_LOGIN_URL, {
            'email': 'student@insightflow.test',
            'password': 'WrongPassword!',
        })
        assert response.status_code == 400
        body = response.json()
        assert body['success'] is False
        assert 'error' in body

    def test_login_nonexistent_email_returns_400(self, api_client, db):
        response = api_client.post(AUTH_LOGIN_URL, {
            'email': 'nobody@insightflow.test',
            'password': 'TestPass@123',
        })
        assert response.status_code == 400
        assert response.json()['success'] is False

    def test_login_inactive_user_returns_400(self, api_client, inactive_user):
        response = api_client.post(AUTH_LOGIN_URL, {
            'email': 'inactive@insightflow.test',
            'password': 'TestPass@123',
        })
        assert response.status_code == 400
        body = response.json()
        assert body['success'] is False

    def test_login_missing_password_returns_400(self, api_client, db):
        response = api_client.post(AUTH_LOGIN_URL, {'email': 'test@test.com'})
        assert response.status_code == 400

    def test_login_missing_email_returns_400(self, api_client, db):
        response = api_client.post(AUTH_LOGIN_URL, {'password': 'TestPass@123'})
        assert response.status_code == 400

    def test_login_empty_body_returns_400(self, api_client, db):
        response = api_client.post(AUTH_LOGIN_URL, {})
        assert response.status_code == 400

    def test_login_error_has_consistent_envelope(self, api_client, db):
        """Error responses must always follow the InsightFlow envelope."""
        response = api_client.post(AUTH_LOGIN_URL, {
            'email': 'bad@test.com',
            'password': 'wrongpass',
        })
        body = response.json()
        assert 'success' in body
        assert 'data' in body
        assert 'error' in body
        assert body['data'] is None
        assert 'code' in body['error']
        assert 'message' in body['error']


# ── /me/ Tests ──────────────────────────────────────────────

class TestMe:

    def test_me_authenticated_returns_200(self, auth_student):
        response = auth_student.get(AUTH_ME_URL)
        assert response.status_code == 200

    def test_me_returns_correct_email(self, auth_student, student_user):
        response = auth_student.get(AUTH_ME_URL)
        assert response.json()['data']['email'] == student_user.email

    def test_me_returns_correct_role_for_student(self, auth_student):
        response = auth_student.get(AUTH_ME_URL)
        assert response.json()['data']['role'] == 'student'

    def test_me_returns_correct_role_for_staff(self, auth_staff):
        response = auth_staff.get(AUTH_ME_URL)
        assert response.json()['data']['role'] == 'staff'

    def test_me_returns_correct_role_for_admin(self, auth_admin):
        response = auth_admin.get(AUTH_ME_URL)
        assert response.json()['data']['role'] == 'admin'

    def test_me_student_includes_profile_data(self, auth_student):
        response = auth_student.get(AUTH_ME_URL)
        profile = response.json()['data']['profile']
        assert profile is not None
        assert profile['roll_number'] == 'MCA2024001'
        assert profile['programme'] == 'MCA'
        assert profile['semester'] == 3

    def test_me_staff_includes_department_data(self, auth_staff):
        response = auth_staff.get(AUTH_ME_URL)
        profile = response.json()['data']['profile']
        assert profile is not None
        assert profile['employee_id'] == 'EMP001'
        assert profile['department_name'] == 'Academic Section'

    def test_me_unauthenticated_returns_401(self, api_client):
        response = api_client.get(AUTH_ME_URL)
        assert response.status_code == 401

    def test_me_success_envelope(self, auth_student):
        response = auth_student.get(AUTH_ME_URL)
        body = response.json()
        assert body['success'] is True
        assert body['data'] is not None


# ── Token Refresh Tests ─────────────────────────────────────

class TestTokenRefresh:

    def test_valid_refresh_token_returns_new_access(self, api_client, student_user):
        # Login to get tokens
        login_resp = api_client.post(AUTH_LOGIN_URL, {
            'email': 'student@insightflow.test',
            'password': 'TestPass@123',
        })
        refresh = login_resp.json()['data']['refresh']

        # Use refresh to get new access
        resp = api_client.post(AUTH_REFRESH_URL, {'refresh': refresh})
        assert resp.status_code == 200
        assert 'access' in resp.json()

    def test_invalid_refresh_token_returns_401(self, api_client, db):
        resp = api_client.post(AUTH_REFRESH_URL, {'refresh': 'this.is.not.valid'})
        assert resp.status_code == 401

    def test_missing_refresh_token_returns_400(self, api_client, db):
        resp = api_client.post(AUTH_REFRESH_URL, {})
        assert resp.status_code == 400


# ── Logout Tests ────────────────────────────────────────────

class TestLogout:

    def test_logout_returns_200(self, api_client, student_user):
        login_resp = api_client.post(AUTH_LOGIN_URL, {
            'email': 'student@insightflow.test',
            'password': 'TestPass@123',
        })
        tokens = login_resp.json()['data']
        api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['access']}")

        resp = api_client.post(AUTH_LOGOUT_URL, {'refresh': tokens['refresh']})
        assert resp.status_code == 200
        assert resp.json()['success'] is True

    def test_logout_blacklists_refresh_token(self, api_client, student_user):
        """After logout, the refresh token must no longer work."""
        login_resp = api_client.post(AUTH_LOGIN_URL, {
            'email': 'student@insightflow.test',
            'password': 'TestPass@123',
        })
        tokens = login_resp.json()['data']
        api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['access']}")

        # Logout
        api_client.post(AUTH_LOGOUT_URL, {'refresh': tokens['refresh']})

        # Attempt to refresh with the now-blacklisted token
        refresh_resp = api_client.post(AUTH_REFRESH_URL, {'refresh': tokens['refresh']})
        assert refresh_resp.status_code == 401

    def test_logout_without_refresh_token_returns_400(self, auth_student):
        resp = auth_student.post(AUTH_LOGOUT_URL, {})
        assert resp.status_code == 400

    def test_logout_unauthenticated_returns_401(self, api_client, db):
        resp = api_client.post(AUTH_LOGOUT_URL, {'refresh': 'sometoken'})
        assert resp.status_code == 401
