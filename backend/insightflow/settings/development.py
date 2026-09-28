"""
Development settings for InsightFlow.
Uses SQLite for zero-install local development.
"""
from .base import *  # noqa: F401, F403

DEBUG = True

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',
        'OPTIONS': {
            'timeout': 20,
        },
    }
}

# Open CORS for local frontend development (Vite runs on port 5173)
CORS_ALLOW_ALL_ORIGINS = True
CORS_ALLOW_CREDENTIALS = True

# Disable strict host checking in development
ALLOWED_HOSTS = ['*']
