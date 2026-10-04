"""
Development settings for InsightFlow.
Uses SQLite for zero-install local development.
"""
from .base import *  # noqa: F401, F403

DEBUG = True

# Database configuration is defined in base.py (defaults to SQLite, PostgreSQL-ready via DB_ENGINE)

# Open CORS for local frontend development (Vite runs on port 5173)
CORS_ALLOW_ALL_ORIGINS = True
CORS_ALLOW_CREDENTIALS = True

# Disable strict host checking in development
ALLOWED_HOSTS = ['*']

# Disable API throttling in development/test to prevent test suite 429s.
# Throttling is enforced in production settings only.
REST_FRAMEWORK = {
    **REST_FRAMEWORK,  # noqa: F405
    'DEFAULT_THROTTLE_CLASSES': [],
    'DEFAULT_THROTTLE_RATES': {},
}
