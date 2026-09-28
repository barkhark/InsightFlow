"""
InsightFlow — Enterprise Multi-Department Data Seeding Command

Populates the complete institutional schema:
  - 8 Real College Departments
  - 3 Standard Configurable Workflows (Certificate, Issue Resolution, Administrative Approval) with rejection branches
  - 42 Service Categories with dynamic field schemas and realistic SLA targets (24h, 48h, 72h)
  - 1 Administrator, 8 Department Staff Officers, 3 Students
  - 12 Realistic Multi-Department Requests in various stages (healthy, warning, critical, breached, resolved, rejected, unassigned)

Usage:
  python manage.py seed_data --reset
"""
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone
from datetime import timedelta


class Command(BaseCommand):
    help = 'Seed InsightFlow with comprehensive multi-department demo data'

    def add_arguments(self, parser):
        parser.add_argument('--reset', action='store_true', help='Clear existing data first')

    def handle(self, *args, **options):
        if options['reset']:
            self.stdout.write('Clearing existing data...')
            self._clear_data()

        with transaction.atomic():
            self.stdout.write('Creating 8 institutional departments...')
            depts = self._create_departments()

            self.stdout.write('Creating standard workflow architectures...')
            workflows = self._create_workflows(depts)

            self.stdout.write('Creating 42 service categories & dynamic field schemas...')
            categories = self._create_service_categories(depts, workflows)

            self.stdout.write('Creating institutional users & departmental profiles...')
            users = self._create_users(depts)

            self.stdout.write('Creating realistic multi-department sample requests...')
            self._create_sample_requests(users, depts, workflows, categories)

        self.stdout.write(self.style.SUCCESS('[OK] InsightFlow multi-department institutional data seeded successfully!'))
        self.stdout.write('========================================================================')
        self.stdout.write('DEMO LOGINS (Password for all accounts: InsightFlow@2026):')
        self.stdout.write('  [Admin]              admin@insightflow.edu')
        self.stdout.write('  [Staff - Academic]   academic.staff@insightflow.edu')
        self.stdout.write('  [Staff - IT]         it.staff@insightflow.edu')
        self.stdout.write('  [Staff - Exam]       exam.staff@insightflow.edu')
        self.stdout.write('  [Staff - Finance]    finance.staff@insightflow.edu')
        self.stdout.write('  [Staff - Hostel]     hostel.staff@insightflow.edu')
        self.stdout.write('  [Staff - Library]    library.staff@insightflow.edu')
        self.stdout.write('  [Staff - Facilities] facilities.staff@insightflow.edu')
        self.stdout.write('  [Staff - Transport]  transport.staff@insightflow.edu')
        self.stdout.write('  [Student]            priya.sharma@insightflow.edu')
        self.stdout.write('  [Student]            rahul.verma@insightflow.edu')
        self.stdout.write('========================================================================')

    def _clear_data(self):
        from apps.requests.models import ServiceRequest
        from apps.services.models import ServiceCategory, ServiceArea
        from apps.workflows.models import WorkflowDefinition
        from apps.departments.models import Department
        from django.contrib.auth import get_user_model
        User = get_user_model()
        ServiceRequest.objects.all().delete()
        ServiceCategory.objects.all().delete()
        ServiceArea.objects.all().delete()
        WorkflowDefinition.objects.all().delete()
        Department.objects.all().delete()
        User.objects.filter(is_superuser=False).delete()

    def _create_departments(self):
        from apps.departments.models import Department
        data = [
            ('Academic Administration', 'ACAD', 'Certificates, transcripts, enrollment verification, and academic documentation.'),
            ('IT Services', 'IT', 'Campus Wi-Fi, LMS access, lab computers, printers, and institutional tech infrastructure.'),
            ('Examination Cell', 'EXAM', 'Hall tickets, exam forms, revaluation, grade cards, and official marksheet issuance.'),
            ('Finance & Accounts', 'FIN', 'Fee payments, receipts, scholarship disbursement, refunds, and financial NOCs.'),
            ('Hostel & Student Affairs', 'HOSTEL', 'Hostel room allocations, maintenance, mess grievances, and student leave requests.'),
            ('Library Services', 'LIB', 'Book issuance/returns, catalog memberships, digital library access, and fine waivers.'),
            ('Facilities & Maintenance', 'FAC', 'Classroom maintenance, electrical infrastructure, air conditioning, furniture, and sanitation.'),
            ('Transport Services', 'TRANS', 'Campus bus passes, route planning, schedule queries, and transport grievances.'),
        ]
        depts = {}
        for name, code, desc in data:
            dept, _ = Department.objects.get_or_create(
                code=code, defaults={'name': name, 'description': desc}
            )
            depts[code] = dept
        return depts

    def _stage(self, wf, name, code, order, dept, initial=False, terminal=False, rejection=False):
        from apps.workflows.models import WorkflowStage
        return WorkflowStage.objects.create(
            workflow=wf, name=name, code=code, order=order,
            responsible_department=dept,
            is_initial=initial, is_terminal=terminal, is_rejection=rejection
        )

    def _create_workflows(self, depts):
        from apps.workflows.models import WorkflowDefinition, SLAConfiguration

        workflows = {}

        # 1. CERTIFICATE ISSUANCE WORKFLOW (Standard: Submitted → Assigned → In Review → Approved → Completed / Rejected)
        wf_cert, _ = WorkflowDefinition.objects.get_or_create(
            name='Certificate Issuance Workflow',
            defaults={'description': 'Standard multi-stage verification for academic credentials & certificates.'}
        )
        if not wf_cert.stages.exists():
            s1 = self._stage(wf_cert, 'Submitted', 'SUBMITTED', 1, depts['ACAD'], initial=True)
            s2 = self._stage(wf_cert, 'Verification', 'VERIFICATION', 2, depts['ACAD'])
            s3 = self._stage(wf_cert, 'Approval', 'APPROVAL', 3, depts['ACAD'])
            s4 = self._stage(wf_cert, 'Issued', 'ISSUED', 4, depts['ACAD'], terminal=True)
            s5 = self._stage(wf_cert, 'Rejected', 'REJECTED', 5, depts['ACAD'], terminal=True, rejection=True)
            s1.allowed_next_stages.set([s2])
            s2.allowed_next_stages.set([s3])
            s3.allowed_next_stages.set([s4, s5])

            SLAConfiguration.objects.create(stage=s1, target_hours=8, warning_threshold_pct=60, critical_threshold_pct=85)
            SLAConfiguration.objects.create(stage=s2, target_hours=24, warning_threshold_pct=65, critical_threshold_pct=85)
            SLAConfiguration.objects.create(stage=s3, target_hours=16, warning_threshold_pct=70, critical_threshold_pct=90)
        workflows['CERTIFICATE'] = wf_cert

        # 2. ISSUE RESOLUTION WORKFLOW (Fast: Logged → Assigned → In Progress → Resolved / Unresolvable)
        wf_issue, _ = WorkflowDefinition.objects.get_or_create(
            name='Issue Resolution Workflow',
            defaults={'description': 'Rapid ticket resolution for IT, facilities, electrical, and maintenance requests.'}
        )
        if not wf_issue.stages.exists():
            t1 = self._stage(wf_issue, 'Logged', 'LOGGED', 1, depts['IT'], initial=True)
            t2 = self._stage(wf_issue, 'In Progress', 'IN_PROGRESS', 2, depts['IT'])
            t3 = self._stage(wf_issue, 'Resolved', 'RESOLVED', 3, depts['IT'], terminal=True)
            t4 = self._stage(wf_issue, 'Unresolvable', 'UNRESOLVABLE', 4, depts['IT'], terminal=True, rejection=True)
            t1.allowed_next_stages.set([t2])
            t2.allowed_next_stages.set([t3, t4])

            SLAConfiguration.objects.create(stage=t1, target_hours=4, warning_threshold_pct=60, critical_threshold_pct=80)
            SLAConfiguration.objects.create(stage=t2, target_hours=20, warning_threshold_pct=70, critical_threshold_pct=90)
        workflows['ISSUE'] = wf_issue

        # 3. ADMINISTRATIVE APPROVAL WORKFLOW (Submitted → Under Review → Approved / Rejected)
        wf_approval, _ = WorkflowDefinition.objects.get_or_create(
            name='Administrative Approval Workflow',
            defaults={'description': 'Administrative clearance for finance, exams, scholarships, and leave requests.'}
        )
        if not wf_approval.stages.exists():
            a1 = self._stage(wf_approval, 'Submitted', 'SUBMITTED', 1, depts['FIN'], initial=True)
            a2 = self._stage(wf_approval, 'Under Review', 'UNDER_REVIEW', 2, depts['FIN'])
            a3 = self._stage(wf_approval, 'Approved', 'APPROVED', 3, depts['FIN'], terminal=True)
            a4 = self._stage(wf_approval, 'Rejected', 'REJECTED', 4, depts['FIN'], terminal=True, rejection=True)
            a1.allowed_next_stages.set([a2])
            a2.allowed_next_stages.set([a3, a4])

            SLAConfiguration.objects.create(stage=a1, target_hours=12, warning_threshold_pct=60, critical_threshold_pct=85)
            SLAConfiguration.objects.create(stage=a2, target_hours=36, warning_threshold_pct=70, critical_threshold_pct=90)
        workflows['APPROVAL'] = wf_approval

        return workflows

    def _create_service_categories(self, depts, workflows):
        from apps.services.models import ServiceArea, ServiceCategory, DynamicFieldSchema

        # 8 Service Areas mapping 1:1 to the 8 Departments
        area_configs = [
            ('Academic Administration', 'graduation-cap', 1, 'Official certificates, transcripts, and enrollment credentials.', 'ACAD'),
            ('IT Services', 'monitor', 2, 'Campus connectivity, software, lab computers, and LMS accounts.', 'IT'),
            ('Examination Cell', 'file-text', 3, 'Hall tickets, revaluation, grade cards, and marksheets.', 'EXAM'),
            ('Finance & Accounts', 'credit-card', 4, 'Fee receipts, scholarship disbursement, and financial clearances.', 'FIN'),
            ('Hostel & Student Affairs', 'home', 5, 'Hostel room allocations, maintenance, and leave requests.', 'HOSTEL'),
            ('Library Services', 'book-open', 6, 'Book issues, account renewals, and digital catalog access.', 'LIB'),
            ('Facilities & Maintenance', 'building-2', 7, 'Classroom fixtures, air conditioning, furniture, and sanitation.', 'FAC'),
            ('Transport Services', 'bus', 8, 'Bus pass issuance, route queries, and transport grievances.', 'TRANS'),
        ]

        areas = {}
        for name, icon, order, desc, d_code in area_configs:
            area, _ = ServiceArea.objects.get_or_create(
                name=name, defaults={'icon_key': icon, 'order': order, 'description': desc}
            )
            areas[d_code] = area

        # 42 Categories Grouped by Department
        categories_manifest = [
            # Academic Administration (6)
            ('ACAD', 'Bonafide Certificate', 'Official certificate confirming bonafide student status.', workflows['CERTIFICATE'], 'medium', [
                ('purpose', 'Purpose of Certificate', 'select', [{'value': 'bank', 'label': 'Bank Account Opening'}, {'value': 'visa', 'label': 'Visa Application'}, {'value': 'scholarship', 'label': 'Scholarship Application'}, {'value': 'other', 'label': 'Other'}], True),
                ('addressed_to', 'Addressed To (Optional)', 'text', None, False),
            ]),
            ('ACAD', 'Character Certificate', 'Conduct and character certificate for internships/admissions.', workflows['CERTIFICATE'], 'low', [
                ('reason', 'Reason for Application', 'text', None, True),
            ]),
            ('ACAD', 'Transcript Request', 'Official multi-semester consolidated transcript document.', workflows['CERTIFICATE'], 'high', [
                ('num_copies', 'Number of Official Copies', 'number', None, True),
                ('delivery_mode', 'Delivery Preference', 'select', [{'value': 'pickup', 'label': 'In-Person Collection'}, {'value': 'post', 'label': 'Postal Dispatch'}], True),
            ]),
            ('ACAD', 'Course Completion Certificate', 'Provisional certificate verifying completion of degree requirements.', workflows['CERTIFICATE'], 'medium', [
                ('final_semester', 'Final Semester Completed', 'number', None, True),
            ]),
            ('ACAD', 'Student Verification', 'Background verification request from external employers/agencies.', workflows['APPROVAL'], 'high', [
                ('requesting_agency', 'Requesting Agency / Employer', 'text', None, True),
            ]),
            ('ACAD', 'Academic Document Request', 'General request for certified academic records or syllabus copies.', workflows['CERTIFICATE'], 'low', []),

            # IT Services (6)
            ('IT', 'Wi-Fi Issue', 'Report campus Wi-Fi connectivity problems or MAC registration.', workflows['ISSUE'], 'high', [
                ('location', 'Location (Building & Room)', 'text', None, True),
                ('device_type', 'Device Type', 'select', [{'value': 'laptop', 'label': 'Laptop'}, {'value': 'mobile', 'label': 'Mobile Phone'}, {'value': 'tablet', 'label': 'Tablet'}], True),
            ]),
            ('IT', 'Printer Issue', 'Lab or library network printer malfunction report.', workflows['ISSUE'], 'medium', [
                ('lab_name', 'Lab Name / Room', 'text', None, True),
            ]),
            ('IT', 'Projector Issue', 'Classroom projector display or HDMI input failure.', workflows['ISSUE'], 'high', [
                ('classroom_no', 'Classroom Number', 'text', None, True),
            ]),
            ('IT', 'LMS/Login Issue', 'Account password reset or learning portal access error.', workflows['ISSUE'], 'critical', [
                ('username', 'Student Portal Username / Email', 'text', None, True),
            ]),
            ('IT', 'Computer/Lab Issue', 'Workstation hardware or operating system failure.', workflows['ISSUE'], 'medium', [
                ('workstation_id', 'Workstation / PC Number', 'text', None, True),
            ]),
            ('IT', 'Software Access Request', 'Specialized software licenses (MATLAB, IntelliJ, Tableau).', workflows['APPROVAL'], 'low', [
                ('software_name', 'Software Tool Name', 'text', None, True),
            ]),

            # Examination Cell (6)
            ('EXAM', 'Hall Ticket Issue', 'Discrepancy or download error on semester hall ticket.', workflows['ISSUE'], 'critical', [
                ('exam_session', 'Examination Session (Month/Year)', 'text', None, True),
            ]),
            ('EXAM', 'Examination Form Issue', 'Course registration or fee reconciliation error for exam form.', workflows['ISSUE'], 'high', [
                ('subject_codes', 'Affected Subject Codes', 'text', None, True),
            ]),
            ('EXAM', 'Result Issue', 'Grievance regarding missing grades, absent marks, or withheld results.', workflows['APPROVAL'], 'high', [
                ('seat_number', 'Exam Seat / Register Number', 'text', None, True),
            ]),
            ('EXAM', 'Revaluation Request', 'Formal application for paper revaluation and photocopy of answer sheet.', workflows['APPROVAL'], 'medium', [
                ('subject_name', 'Subject Name & Code', 'text', None, True),
            ]),
            ('EXAM', 'Marksheet Request', 'Duplicate marksheet or consolidated grade card issuance.', workflows['CERTIFICATE'], 'medium', [
                ('semester', 'Semester Number', 'number', None, True),
            ]),
            ('EXAM', 'Examination Query', 'General examination timing, venue, or syllabus inquiries.', workflows['ISSUE'], 'low', []),

            # Finance & Accounts (5)
            ('FIN', 'Fee Payment Issue', 'Bank transaction failure, double debit, or uncredited fee payment.', workflows['ISSUE'], 'high', [
                ('transaction_ref', 'Bank UTR / Transaction Reference', 'text', None, True),
                ('amount_paid', 'Amount Paid (INR)', 'number', None, True),
            ]),
            ('FIN', 'Fee Receipt Request', 'Official stamped fee receipt for tax exemption or loan reimbursement.', workflows['CERTIFICATE'], 'medium', [
                ('academic_year', 'Academic Year', 'text', None, True),
            ]),
            ('FIN', 'Scholarship Query', 'Status inquiry regarding government or institutional scholarship disbursement.', workflows['APPROVAL'], 'medium', [
                ('scholarship_name', 'Scholarship Scheme Name', 'text', None, True),
            ]),
            ('FIN', 'Refund Request', 'Refund of caution deposit, excess fees, or cancelled enrollment.', workflows['APPROVAL'], 'high', [
                ('bank_account', 'Account Number & IFSC Code', 'text', None, True),
            ]),
            ('FIN', 'Financial Document Request', 'Fee structure estimation certificate for education loan processing.', workflows['CERTIFICATE'], 'low', []),

            # Hostel & Student Affairs (6)
            ('HOSTEL', 'Hostel Maintenance', 'Civil repair, carpentry, or masonry work in hostel rooms.', workflows['ISSUE'], 'medium', [
                ('room_number', 'Hostel Block & Room Number', 'text', None, True),
            ]),
            ('HOSTEL', 'Room Issue', 'Room allocation, furniture repair, or room change request.', workflows['APPROVAL'], 'low', []),
            ('HOSTEL', 'Electrical Issue', 'Power outage, faulty switchboards, or geyser malfunction in hostel.', workflows['ISSUE'], 'high', [
                ('block_floor', 'Block & Floor Details', 'text', None, True),
            ]),
            ('HOSTEL', 'Water Issue', 'Drinking water purifier or bathroom plumbing disruption.', workflows['ISSUE'], 'critical', [
                ('wing', 'Hostel Wing / Floor', 'text', None, True),
            ]),
            ('HOSTEL', 'Hostel Complaint', 'Mess food hygiene, noise, or discipline grievances.', workflows['ISSUE'], 'medium', []),
            ('HOSTEL', 'Leave Request', 'Official night-out or vacation gate pass approval.', workflows['APPROVAL'], 'medium', [
                ('out_date', 'Departure Date', 'date', None, True),
                ('return_date', 'Expected Return Date', 'date', None, True),
            ]),

            # Library Services (4)
            ('LIB', 'Book Issue/Return Issue', 'Discrepancy in issued catalog records or RFID scanner error.', workflows['ISSUE'], 'medium', [
                ('book_accession_no', 'Book Accession / ISBN Number', 'text', None, True),
            ]),
            ('LIB', 'Library Account Issue', 'Digital portal membership renewal or smart card barcoding.', workflows['ISSUE'], 'low', []),
            ('LIB', 'Fine Dispute', 'Grievance regarding overdue book fine calculation.', workflows['APPROVAL'], 'low', [
                ('dispute_reason', 'Explanation of Delay', 'textarea', None, True),
            ]),
            ('LIB', 'Library Access Request', 'Access to remote IEEE, Springer, or ACM research repositories.', workflows['APPROVAL'], 'low', []),

            # Facilities & Maintenance (5)
            ('FAC', 'Classroom Issue', 'Whiteboard, podium, or acoustic microphone failure in lecture hall.', workflows['ISSUE'], 'high', [
                ('hall_number', 'Lecture Hall / Seminar Room', 'text', None, True),
            ]),
            ('FAC', 'AC/Fan Issue', 'Ceiling fan, HVAC, or air conditioner cooling breakdown.', workflows['ISSUE'], 'high', [
                ('room_location', 'Room & Floor Location', 'text', None, True),
            ]),
            ('FAC', 'Furniture Issue', 'Damaged bench, desk, or auditorium seating repair.', workflows['ISSUE'], 'low', []),
            ('FAC', 'Electrical Issue', 'Classroom lighting, tube lights, or circuit breaker trips.', workflows['ISSUE'], 'high', []),
            ('FAC', 'Cleaning/Maintenance Request', 'Sanitation, garbage disposal, or washroom cleaning request.', workflows['ISSUE'], 'medium', [
                ('floor_location', 'Building & Floor', 'text', None, True),
            ]),

            # Transport Services (4)
            ('TRANS', 'Bus Pass Request', 'New semester campus bus pass or duplicate pass issuance.', workflows['CERTIFICATE'], 'medium', [
                ('route_number', 'Preferred Bus Route Number', 'text', None, True),
                ('pickup_stop', 'Designated Boarding Stop', 'text', None, True),
            ]),
            ('TRANS', 'Route Query', 'Inquiry regarding bus stop additions or route optimization.', workflows['ISSUE'], 'low', []),
            ('TRANS', 'Transport Complaint', 'Driver conduct, overcrowding, or rash driving report.', workflows['ISSUE'], 'high', []),
            ('TRANS', 'Bus Timing Issue', 'Bus delay, breakdown notification, or schedule changes.', workflows['ISSUE'], 'medium', [
                ('bus_number', 'Bus Registration / Route No.', 'text', None, True),
            ]),
        ]

        created_cats = {}
        for d_code, cat_name, desc, wf, prio, fields in categories_manifest:
            dept = depts[d_code]
            area = areas[d_code]
            cat, created = ServiceCategory.objects.get_or_create(
                service_area=area,
                name=cat_name,
                defaults={
                    'workflow': wf,
                    'owning_department': dept,
                    'description': desc,
                    'default_priority': prio,
                }
            )
            created_cats[cat_name] = cat

            if created:
                for idx, (f_key, f_label, f_type, opts, req) in enumerate(fields, 1):
                    DynamicFieldSchema.objects.create(
                        service_category=cat,
                        field_key=f_key,
                        field_label=f_label,
                        field_type=f_type,
                        options_json=opts or [],
                        is_required=req,
                        order=idx,
                    )

        return created_cats

    def _create_users(self, depts):
        from django.contrib.auth import get_user_model
        from apps.accounts.models import StudentProfile, StaffProfile
        User = get_user_model()
        PASSWORD = 'InsightFlow@2026'
        users = {}

        # 1. Administrator
        admin, created = User.objects.get_or_create(
            email='admin@insightflow.edu',
            defaults={'full_name': 'Dr. Rashmi Nair', 'role': 'admin', 'is_staff': True, 'is_superuser': True}
        )
        if created:
            admin.set_password(PASSWORD)
            admin.save()
        else:
            admin.is_staff = True
            admin.is_superuser = True
            admin.save()
        users['admin'] = admin

        # 2. Staff for all 8 Departments
        staff_data = [
            ('academic.staff@insightflow.edu', 'Anjali Mehta', 'ACAD', 'EMP-ACAD-01', 'Academic Coordinator'),
            ('it.staff@insightflow.edu', 'Ravi Kumar', 'IT', 'EMP-IT-02', 'IT Systems Officer'),
            ('exam.staff@insightflow.edu', 'Dr. Suresh Joshi', 'EXAM', 'EMP-EXAM-03', 'Controller of Examinations'),
            ('finance.staff@insightflow.edu', 'Kavita Menon', 'FIN', 'EMP-FIN-04', 'Accounts Officer'),
            ('hostel.staff@insightflow.edu', 'Col. Ramesh Patel', 'HOSTEL', 'EMP-HSTL-05', 'Chief Warden'),
            ('library.staff@insightflow.edu', 'Sunita Rao', 'LIB', 'EMP-LIB-06', 'Head Librarian'),
            ('facilities.staff@insightflow.edu', 'Mahesh Shinde', 'FAC', 'EMP-FAC-07', 'Estate Officer'),
            ('transport.staff@insightflow.edu', 'Vikram Singh', 'TRANS', 'EMP-TRN-08', 'Transport Manager'),
        ]
        users['staff'] = {}
        for email, name, dept_code, emp_id, designation in staff_data:
            u, created = User.objects.get_or_create(email=email, defaults={'full_name': name, 'role': 'staff'})
            if created:
                u.set_password(PASSWORD)
                u.save()
                StaffProfile.objects.create(user=u, department=depts[dept_code], employee_id=emp_id, designation=designation)
            users['staff'][dept_code] = u

        # 3. Students
        student_data = [
            ('priya.sharma@insightflow.edu', 'Priya Sharma', 'MCA2026001', 'MCA', 3, 'A'),
            ('rahul.verma@insightflow.edu', 'Rahul Verma', 'MCA2026002', 'MCA', 3, 'B'),
            ('sneha.patil@insightflow.edu', 'Sneha Patil', 'MCA2026003', 'MCA', 3, 'A'),
        ]
        users['students'] = []
        for email, name, roll, prog, sem, div in student_data:
            u, created = User.objects.get_or_create(email=email, defaults={'full_name': name, 'role': 'student'})
            if created:
                u.set_password(PASSWORD)
                u.save()
                StudentProfile.objects.create(user=u, roll_number=roll, programme=prog, semester=sem, division=div)
            users['students'].append(u)

        return users

    def _create_sample_requests(self, users, depts, workflows, categories):
        from apps.requests.models import ServiceRequest, RequestStageHistory
        from apps.assignments.models import Assignment
        from apps.audit.models import AuditRecord
        from apps.comments.models import Comment
        from core.workflow_engine import WorkflowEngine
        from core.utils import generate_reference_number

        engine = WorkflowEngine()
        student1 = users['students'][0]  # Priya
        student2 = users['students'][1]  # Rahul
        student3 = users['students'][2]  # Sneha

        now = timezone.now()

        # Dataset of 10 diverse requests spanning multiple departments and SLA states
        seed_requests_spec = [
            # 1. Academic - Bonafide Certificate (In Review / Approaching SLA Warning)
            {
                'category': categories['Bonafide Certificate'],
                'student': student1,
                'title': 'Bonafide Certificate for Bank Account Opening',
                'details': 'Need official bonafide certificate for opening a student salary/savings account at State Bank of India.',
                'fields': {'purpose': 'bank', 'addressed_to': 'State Bank of India, MIT Branch'},
                'priority': 'medium',
                'advance_stages': ['Verification'],
                'dept_code': 'ACAD',
                'hours_ago': 20,
            },
            # 2. IT - Wi-Fi Issue (In Progress / Safe)
            {
                'category': categories['Wi-Fi Issue'],
                'student': student1,
                'title': 'Wi-Fi Connection Dropping in Block C 3rd Floor',
                'details': 'Laptop disconnects every 5 minutes when connecting to Campus-Secure-5G in Room C-304.',
                'fields': {'location': 'Block C, Room 304', 'device_type': 'laptop'},
                'priority': 'high',
                'advance_stages': ['In Progress'],
                'dept_code': 'IT',
                'hours_ago': 6,
            },
            # 3. Exam - Revaluation Request (Under Review / Critical SLA)
            {
                'category': categories['Revaluation Request'],
                'student': student2,
                'title': 'Revaluation Application for Advanced Database Systems',
                'details': 'Discrepancy in question 4 evaluation. Requesting photocopy and re-evaluation.',
                'fields': {'subject_name': 'MCA301: Advanced Database Systems'},
                'priority': 'high',
                'advance_stages': ['Under Review'],
                'dept_code': 'EXAM',
                'hours_ago': 40,  # critical dwell
            },
            # 4. Finance - Fee Receipt (Approved / Resolved)
            {
                'category': categories['Fee Receipt Request'],
                'student': student2,
                'title': 'Duplicate Stamped Fee Receipt for Sem 3',
                'details': 'Required for parent income tax exemption declaration.',
                'fields': {'academic_year': '2025-2026'},
                'priority': 'medium',
                'advance_stages': ['Verification', 'Approval', 'Issued'],
                'dept_code': 'ACAD',
                'hours_ago': 72,
            },
            # 5. Facilities - AC Breakdown (Logged / Newly Submitted)
            {
                'category': categories['AC/Fan Issue'],
                'student': student3,
                'title': 'Seminar Hall 2 Air Conditioning Malfunction',
                'details': 'Both AC units in Seminar Hall 2 are blowing warm air before tomorrow morning project presentation.',
                'fields': {'room_location': 'Seminar Hall 2, Ground Floor'},
                'priority': 'critical',
                'advance_stages': [],
                'dept_code': 'FAC',
                'hours_ago': 1,
            },
            # 6. Hostel - Water Dispenser Issue (In Progress / Breached SLA)
            {
                'category': categories['Water Issue'],
                'student': student3,
                'title': 'Water Purifier Leakage in Hostel Block B 2nd Floor',
                'details': 'Drinking water dispenser is leaking and cooling unit is non-functional.',
                'fields': {'wing': 'Block B, 2nd Floor Common Area'},
                'priority': 'high',
                'advance_stages': ['In Progress'],
                'dept_code': 'IT',  # Uses issue resolution workflow
                'hours_ago': 30,  # Breached 24h SLA target
            },
            # 7. Library - Access to Remote IEEE (Under Review / Safe)
            {
                'category': categories['Library Access Request'],
                'student': student1,
                'title': 'Remote IEEE Xplore Digital Library Credentials',
                'details': 'Need off-campus VPN access credentials for literature survey research.',
                'fields': {},
                'priority': 'low',
                'advance_stages': ['Under Review'],
                'dept_code': 'FIN',
                'hours_ago': 5,
            },
            # 8. Transport - Bus Pass Issuance (Rejected / Terminal Workflow tested)
            {
                'category': categories['Bus Pass Request'],
                'student': student2,
                'title': 'Special Route Bus Pass for Route 14 (Kothrud)',
                'details': 'Requesting pickup point at Kothrud Stand.',
                'fields': {'route_number': 'Route 14', 'pickup_stop': 'Kothrud Stand'},
                'priority': 'medium',
                'advance_stages': ['Verification', 'Approval', 'Rejected'],
                'dept_code': 'ACAD',
                'hours_ago': 48,
            },
        ]

        for spec in seed_requests_spec:
            cat = spec['category']
            st = spec['student']
            staff_user = users['staff'].get(spec['dept_code'], users['staff']['ACAD'])
            created_time = now - timedelta(hours=spec['hours_ago'])

            req = ServiceRequest.objects.create(
                reference_number=generate_reference_number(),
                student=st,
                service_category=cat,
                workflow=cat.workflow,
                title=spec['title'],
                details=spec['details'],
                dynamic_fields_data=spec['fields'],
                priority=spec['priority'],
            )

            # Initialise request
            engine.initialise_request(req, st)
            req.created_at = created_time
            req.stage_entered_at = created_time
            req.save(update_fields=['created_at', 'stage_entered_at'])

            # Set initial stage history timestamp
            first_history = RequestStageHistory.objects.filter(request=req).first()
            if first_history:
                first_history.entered_at = created_time
                first_history.save(update_fields=['entered_at'])

            # Advance through requested stages
            current_time = created_time
            for target_stage_name in spec['advance_stages']:
                target_stage = cat.workflow.stages.filter(name=target_stage_name).first()
                if target_stage:
                    current_time += timedelta(hours=8)
                    actor = users['admin']
                    engine.execute_transition(req, target_stage, actor, note=f'Standard progression to {target_stage.name}', notify=False)
                    req.stage_entered_at = current_time
                    req.save(update_fields=['stage_entered_at'])

            # Create assignment if request is in-progress
            if not req.is_terminal:
                Assignment.objects.create(
                    request=req,
                    assigned_to=staff_user,
                    assigned_by=users['admin'],
                    note='Assigned for departmental evaluation.',
                    is_current=True,
                )

            # Add demo comment
            Comment.objects.create(
                request=req,
                author=staff_user,
                body='Application received by department officer and queued for stage review.',
                is_internal=False,
            )
