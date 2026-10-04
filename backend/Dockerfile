# InsightFlow — Backend Dockerfile (Multi-stage: dev + production)
# ─────────────────────────────────────────────────────────────
# Dev  stage: python manage.py runserver (fast feedback loop)
# Prod stage: gunicorn (industry WSGI server, multi-worker)
#
# Build dev:  docker build --target dev -t insightflow-backend:dev .
# Build prod: docker build --target prod -t insightflow-backend:prod .
# ─────────────────────────────────────────────────────────────

FROM python:3.11-slim AS base

# Prevent Python from writing .pyc and buffer stdout
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

# Install system dependencies (libpq-dev for PostgreSQL)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend source code
COPY . .

EXPOSE 8000

# ── Development Stage ─────────────────────────────────────────
FROM base AS dev
CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]

# ── Production Stage (Industry: Gunicorn WSGI server) ─────────
FROM base AS prod

# Collect static files for production serving
RUN python manage.py collectstatic --noinput || true

# Gunicorn: 4 workers, 2 threads each, 30s timeout
# Workers = 2 * CPU_count + 1 (standard formula)
CMD ["gunicorn", \
     "--bind", "0.0.0.0:8000", \
     "--workers", "4", \
     "--threads", "2", \
     "--timeout", "30", \
     "--access-logfile", "-", \
     "--error-logfile", "-", \
     "--log-level", "info", \
     "insightflow.wsgi:application"]
