# InsightFlow — Final Project Report Verification Checklist & Submission Guide

**Project Title:** InsightFlow: Intelligent Workflow Analytics & Accountability Platform  
**Candidate Name:** Barkha Rajesh Khobragade (PRN: 1272250642)  
**Program:** SY MCA, Semester III, Division D  
**Course Code:** MCA40130 Mini Project  
**Academic Year:** 2026–2027  
**Internal Guide:** Mr. Kaustubh Keer  
**Institution:** Dr. Vishwanath Karad MIT World Peace University, Pune  
**School & Dept:** School of Computer Science and Engineering | Department of Computer Science and Applications  

---

## 1. Quality Control & Guideline Verification Checklist

| Item | Requirement Description | Status | Verification Evidence |
| :--- | :--- | :---: | :--- |
| **Document Order** | First five pages appear in exact required sequence: (1) Cover, (2) Certificate, (3) Acknowledgement, (4) Declaration, (5) Table of Contents | **VERIFIED** | Follows MIT-WPU LCA 3 template exactly. |
| **Title Consistency** | Exact approved title used consistently across all sections: *“InsightFlow: Intelligent Workflow Analytics & Accountability Platform”* | **VERIFIED** | Consistent on Cover, Certificate, Declaration, TOC, and Headings. |
| **Official Structure** | Exactly 10 numbered chapters conforming to the official guidelines without missing or renumbered sections | **VERIFIED** | Chapters 1 to 10 follow official syllabus numbering. |
| **Chen ER Diagram** | Genuine Chen ER notation (Rectangles=Entities, Ovals=Attributes, Underlined=PK, Diamonds=Relationships, Cardinalities 1:1, 1:N, M:N) | **VERIFIED** | Located under Section 3.8 as Figure 3.8.1 (`er_diagram_chen.jpg`). No UML notation mixed. |
| **Object Diagram** | Genuine UML Object Diagram representing runtime object instances (`student1 : User`, `req101 : ServiceRequest`, slot values) | **VERIFIED** | Located in Section 3.1 as Figure 3.1 (`object_diagram.jpg`). |
| **Class Diagram** | Genuine UML Class Diagram with 3-compartment notation (attributes, operations, associations, multiplicities) | **VERIFIED** | Located in Section 3.2 as Figure 3.2 (`class_diagram.jpg`). |
| **Use Case Diagram** | Genuine UML Use Case Diagram with authentic actors (Student, Staff, Administrator), system boundary, and `<<include>>` semantics | **VERIFIED** | Located in Section 3.3 as Figure 3.3 (`use_case_diagram.jpg`). |
| **Sequence Diagram** | Genuine UML Sequence Diagram with lifelines, execution activation bars, synchronous call arrows, and return messages | **VERIFIED** | Located in Section 3.4 as Figure 3.4 (`sequence_diagram.jpg`). |
| **Activity Diagram** | Genuine UML Activity Diagram with initial node, swimlanes, action states, diamond decision gates, and final node | **VERIFIED** | Located in Section 3.5 as Figure 3.5 (`activity_diagram.jpg`). |
| **Module Hierarchy** | Genuine Software Module Decomposition representing actual repository packages across Frontend, Backend, and Data layers | **VERIFIED** | Located in Section 3.6 as Figure 3.6 (`module_hierarchy_diagram.jpg`). |
| **UI Screenshots** | Real screenshots from the live running project with Figure numbers, captions, inputs, processing logic, and output descriptions | **VERIFIED** | Located in Section 4 (Login, Student Dashboard, Request Detail, Staff Process, Admin Dashboard, Dept Health). |
| **Table Specifications** | Schema tables matching actual Django models and database tables (`db.sqlite3`) with Data Types, Keys, Nullability, Defaults | **VERIFIED** | Detailed in Section 3.8 for all core models. |
| **Testing Evidence** | Empirical automated test execution results (exact counts, passed status, duration, runner) and test cases table | **VERIFIED** | Section 5 documents 115 passed / 115 tests under pytest in 105.80s with 15 detailed test cases. |
| **Sample Code** | Authentic code samples extracted directly from codebase with explanations of purpose, logic, and architectural significance | **VERIFIED** | Section 6 includes WorkflowEngine, SLAEngine, SHA-256 digest, JWT settings, and React dynamic form renderer. |
| **Honest Limitations** | Explicit statement of verified project boundaries (SQLite default local scope, polling alerts, rule-based intelligence) | **VERIFIED** | Section 7 lists authentic limitations with zero exaggerated claims. |
| **Realistic Future Scope** | Feasible future roadmap (ML predictive models, WebSockets, live SIS API sync, Docker/K8s cloud deployment, mobile app) | **VERIFIED** | Clearly demarcated as FUTURE in Section 8. |
| **Academic Integrity** | Zero fabricated claims, no fake ML/AI buzzwords, no invented production claims, strict adherence to source code truth | **VERIFIED** | Complies 100% with Absolute Rule #1. |

---

## 2. Personal Action Items: What You Must Sign, Fill & Date

Before submitting the physical printed copy to the department, please ensure you complete these items:

1. **Certificate Page (Page 2):**
   - [ ] Internal Guide Signature: Obtain physical signature from **Mr. Kaustubh Keer**.
   - [ ] Program Head Signature: Obtain physical signature from **Dr. P. S. Metkewar**.
   - [ ] Program Director Signature: Obtain physical signature from **Dr. Anuradha S. Kanade**.
2. **Acknowledgement Page (Page 3):**
   - [ ] Date: Fill in the submission date in the header line (`Date: _____ / _____ / 2026`).
3. **Declaration Page (Page 4):**
   - [ ] Date: Fill in the submission date in the header line (`Date: _____ / _____ / 2026`).
   - [ ] Student Signature: Sign your full physical signature above your printed name (`Barkha Rajesh Khobragade`).

---

## 3. Pre-Viva Technical Verification Checklist

To ensure a seamless viva and faculty demonstration:

- [ ] **Backend Service:** Ensure the backend starts cleanly without errors:
  ```powershell
  cd backend
  .\venv\Scripts\Activate.ps1
  python manage.py runserver
  ```
- [ ] **Frontend Application:** Ensure the Vite frontend starts on port 5173:
  ```powershell
  cd frontend
  npm run dev
  ```
- [ ] **Automated Test Suite:** Verify that the 115 tests pass during demonstration if requested by evaluators:
  ```powershell
  cd backend
  pytest
  ```
- [ ] **Demo Credentials:** Keep ready the pre-seeded accounts:
  - Student: `student1@insightflow.local` / `student123`
  - Staff: `staff.acad@insightflow.local` / `staff123`
  - Admin: `admin@insightflow.local` / `admin123`

---

## 4. Deliverable File Manifest in `docs/`

- 📄 **`InsightFlow_Final_Project_Report.docx`** — Complete editable Microsoft Word report with all embedded figures and tables.
- 📄 **`InsightFlow_Final_Project_Report.pdf`** — High-resolution, print-ready PDF rendered via Microsoft Edge Headless (4.08 MB).
- 🌐 **`InsightFlow_Final_Project_Report.html`** — A4-styled HTML master document.
- 🖼️ **`diagrams/`** — Separate high-resolution vector SVGs and 300-DPI equivalent JPEGs:
  - `object_diagram.jpg` (Figure 3.1)
  - `class_diagram.jpg` (Figure 3.2)
  - `use_case_diagram.jpg` (Figure 3.3)
  - `sequence_diagram.jpg` (Figure 3.4)
  - `activity_diagram.jpg` (Figure 3.5)
  - `module_hierarchy_diagram.jpg` (Figure 3.6)
  - `er_diagram_chen.jpg` (Figure 3.8.1)
- 📸 **`screenshots/`** — High-resolution interface captures from running application (`screen_login.png`, `screen_student_dashboard.png`, `screen_request_detail.png`, `screen_staff_process.png`, `screen_admin_dashboard.png`, `screen_admin_department_health.png`).
