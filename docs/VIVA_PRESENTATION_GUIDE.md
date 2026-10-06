# InsightFlow — Viva Voce Defense Guide
### MCA Semester 3 Mini-Project | Barkha Khurana

---

## Quick Reference Card

| Aspect | Value |
|---|---|
| **Project Title** | InsightFlow — Institutional Service Request Management System |
| **Tech Stack** | Django 4.2 · React 18 · PostgreSQL/SQLite · Vite · Docker |
| **Total Modules** | 9 Django apps + 3 AI engines + 1 management command |
| **Frontend Pages** | 15 (Login, Student x3, Staff x2, Admin x9) |
| **Test Coverage** | 14 automated tests (AI engines + workflows) |
| **AI Features** | Anomaly Detection · Demand Forecast · Workload Balancer · Auto-Escalation |
| **GitHub** | Committed & pushed to origin/master |

---

## 1. Project Overview — 60-Second Pitch

"InsightFlow is a full-stack, AI-augmented institutional service management platform
designed to replace the inefficient paper-based request system used in colleges.
Students submit service requests digitally. Staff process them through structured workflows.
And administrators get real-time AI-powered insights — detecting anomalies, forecasting demand,
and automatically escalating SLA breaches. Everything is role-based, audited, and production-ready."

---

## 2. System Architecture

FRONTEND (React 18 + Vite)
  ├── Student Portal  (Request wizard, tracking, timeline)
  ├── Staff Queue     (Process, transition, assign)
  └── Admin Console   (9 analytics dashboards + AI modules)
           |
         REST API (Axios + JWT)
           |
BACKEND (Django 4.2 + DRF)
  ├── apps/accounts      -- JWT auth, roles, profiles
  ├── apps/departments   -- Department CRUD
  ├── apps/services      -- ServiceArea, ServiceCategory
  ├── apps/workflows     -- WorkflowDefinition, stages, SLA
  ├── apps/requests      -- ServiceRequest lifecycle
  ├── apps/assignments   -- Staff-request assignment
  ├── apps/notifications -- Real-time in-app alerts
  ├── apps/audit         -- Immutable audit trail
  └── core/              -- AI engines + management commands
           |
         ORM
           |
DATABASE (SQLite dev / PostgreSQL prod)

---

## 3. AI Modules Deep Dive

### 3.1 Anomaly Detection Engine
Algorithm: Z-score / Mean +/- 2sigma statistical outlier detection
File: core/anomaly_engine.py
Detects:
  - SLA Outliers: Request stage dwell time > 2x historical mean
  - Volume Spikes: Daily intake > (mean + 2sigma) in rolling window
  - Staff Throughput Drops: Staff completion rate falls significantly
  - Department Surges: Abnormal queue growth in a department
  - Repeat Requestors: Students submitting unusually high volumes

Output format:
  anomaly_type, severity (critical/warning/info), title, description, evidence dict, recommended_action

### 3.2 Demand Forecast Engine
File: core/demand_forecast_engine.py
Algorithm: Day-of-week weighted historical averaging + momentum factor
Steps:
  1. Fetch last history_days of request intake per day
  2. Group by day-of-week to identify weekly patterns
  3. Apply momentum factor (recent 7-day trend vs 30-day average)
  4. Generate 7-day forward forecast with +/-1sigma confidence bands
Output keys: forecast, historical, summary, insights

### 3.3 Workload Balancer Engine
File: core/workload_balancer.py
Formula: efficiency_score = completed / (active + completed + 1) * 100
Computes: per-staff metrics, per-department imbalance, reassignment recommendations

### 3.4 Auto-Escalation Command
File: core/management/commands/auto_escalate.py
Run: python manage.py auto_escalate [--dry-run]
Logic: If elapsed_hours > SLA_target_hours * threshold -> upgrade priority -> write audit record

---

## 4. Role-Based Access Control

| Role    | Access                                                        |
|---------|---------------------------------------------------------------|
| Student | Submit requests, track own requests, view timeline            |
| Staff   | View assigned queue, process/transition, add remarks          |
| Admin   | Full system access, all analytics, AI dashboards, reports     |

Implementation: JWT (SimpleJWT). Role stored on User.role. ProtectedRoute enforces frontend access.
DRF custom permission classes enforce backend access.

---

## 5. Key Database Design Decisions

1. UUID Primary Keys -- All models use UUIDField for security
2. WorkflowDefinition + WorkflowStage -- Flexible many-to-many stage ordering
3. Assignment.is_current pattern -- Tracks active assignee while preserving history
4. RequestStageHistory -- Every transition recorded with duration_minutes and sla_breached
5. DynamicFieldSchema -- Per-category form fields stored as JSON config, not EAV tables

---

## 6. Expected Examiner Questions & Model Answers

Q: Why Django for the backend?
A: Django provides mature ORM, built-in admin, and excellent REST framework (DRF). Batteries-included
   philosophy ideal for mini-project time constraints while remaining production-grade.

Q: Why React with Vite?
A: SPA enables dynamic experience -- real-time updates, animated dashboards, role-specific UI --
   without full page reloads. Vite provides sub-second HMR.

Q: How does authentication work?
A: JWT via djangorestframework-simplejwt. Login returns access token (15min) + refresh token (7day).
   React stores access token in memory; Axios interceptor auto-refreshes.

Q: Is there actual ML?
A: Statistical analysis using z-score and standard deviation -- deterministic, explainable, and
   requires no ML libraries. Interpretability matters in institutional contexts. Future work:
   scikit-learn ARIMA or Prophet for time-series forecasting.

Q: What is a Z-score?
A: Z = (x - mean) / sigma. Values with |z| > 2 are statistical outliers, covering 95% of normal
   variation and minimizing false positives.

Q: How does SLA tracking work without a scheduler?
A: stage_entered_at timestamp recorded on ServiceRequest on each transition. SLA breach computed
   on-demand: timezone.now() - stage_entered_at vs SLAConfiguration.target_hours.

Q: What is the Assignment.is_current pattern?
A: Multiple assignment records per request preserve full history. Only one has is_current=True --
   the active assignee. Reassignment sets current to False and creates a new record.

Q: How do you run the tests?
A: cd backend && python -m pytest tests/test_ai_engines.py -v

---

## 7. Live Demo Script (5-7 minutes)

1. Login as Student -> submit new request using wizard
2. Show AIHelpWidget (InsightBot) -> ask "How do I track my request?"
3. Login as Staff -> process request -> add remark -> transition stage
4. Login as Admin -> Dashboard -> Anomaly Detection -> explain a finding
5. Admin -> Demand Forecast -> walk through 7-day chart and confidence bands
6. Admin -> Workload Balancer -> show staff efficiency scores and recommendations
7. Show GitHub -> commits, project structure

Key points to emphasize:
  - Role-based UI changes completely per user
  - Real-time notifications appear when requests are updated
  - AI dashboards load live data from the database
  - InsightBot floating assistant always accessible to students

---

## 8. Difficult Questions Recovery

If asked about limitations: "SQLite has partial index limitations, so we enforce uniqueness
  in application logic via WorkflowEngine. In production, PostgreSQL handles this natively."

If asked about security: "CSRF via DRF, JWT expiry, PBKDF2 password hashing,
  role-based permission classes on every API endpoint."

If asked about scalability: "Stateless REST API scales horizontally. AI engines are
  query-based with no in-memory state. Redis + Celery can be added for async tasks."

If asked about real ML: "Statistical approach is interpretable and production-safe.
  Extending to scikit-learn ARIMA or Prophet is the defined next step."

---

## 9. Technologies Checklist

- Django: MVT, ORM, DRF, Signals, Management Commands
- React: Functional components, Hooks, Context API
- JWT: Access + refresh token flow, Axios interceptors
- REST API: CRUD endpoints, serializers, permission classes
- Statistics: Z-score, mean, standard deviation, confidence bands
- Docker: docker-compose, Gunicorn, Nginx
- Testing: pytest-django, fixtures, assertions
- Git: Commits, branches, .gitignore
- Design Patterns: Repository (ORM), Observer (signals), Command (management commands)

---

## 10. Closing Statement

"InsightFlow demonstrates that even without large ML frameworks, statistical intelligence
can deliver significant operational value in an institutional setting. The project covers
the complete software development lifecycle: requirements analysis, system design,
full-stack implementation, AI integration, testing, and deployment.
It is not just a mini-project -- it is a production-ready system."

Good luck! You built something impressive.
