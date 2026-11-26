# GBS MANAGEMENT SYSTEM — Master System Memory & Diagnostic Cause Reference

> [!IMPORTANT]
> This master system memory is saved across the project repository ([`SYSTEM_MEMORY_AND_DIAGNOSTIC_REGISTRY.md`](file:///d:/version1/GBS_SYSTEM/SYSTEM_MEMORY_AND_DIAGNOSTIC_REGISTRY.md) and [`gbs_system_memory_snapshot.json`](file:///d:/version1/GBS_SYSTEM/backend/data/gbs_system_memory_snapshot.json)) and wired directly into the live backend diagnostic engine (`GET /api/v1/dev-control/system-memory` & `POST /api/v1/dev-control/system-memory`) so the system and Developer AI Assistant can immediately identify and resolve any operational issue.

---

## 1. Hosting, Continuous Deployment & Repository Architecture

| Parameter | Configuration & Enforcement |
|---|---|
| **Hosting Platform** | **Render ONLY** (`render.com` — live: `https://gbs-school.onrender.com`). Never deploy or reference Vercel. |
| **Git Repository** | `https://github.com/A1-ul/gbs-system.git` (Production Branch: `origin/main`). |
| **Build Command** | `npm run build --prefix frontend` (Vite production bundle compiled to `frontend/dist`). |
| **Asset Sync** | `frontend/dist/*` copied to `backend/public/` so Express serves the single unified application bundle. |
| **Start Command** | `npm start` (`node src/core/server.js`) with PostgreSQL pool & offline fallback. |
| **Pre-Deploy Verification** | 1. AST scope checking for undeclared identifiers.<br>2. Full Vite build (`npm run build --prefix frontend`).<br>3. PostgreSQL & ops verification (`node backend/test_ops.js`). |

---

## 2. Core Subsystems & Key Files Memory

| Subsystem | Primary File Path | Responsibility |
|---|---|---|
| **Server & Static Engine** | [`server.js`](file:///d:/version1/GBS_SYSTEM/backend/src/core/server.js) | Express HTTP + Socket.IO server, `/api/v1/onboarding/*`, `/api/v1/topic-videos/*`, SPA static routing. |
| **Hybrid Cloud-Local Prisma Engine** | [`prisma.client.js`](file:///d:/version1/GBS_SYSTEM/backend/src/core/database/prisma.client.js) | Intercepts Prisma queries & raw SQL when PostgreSQL (`localhost:5432`) is offline; persists to [`gbs_persistent_store.json`](file:///d:/version1/GBS_SYSTEM/backend/data/gbs_persistent_store.json). |
| **Main Application Router** | [`AppRouter.jsx`](file:///d:/version1/GBS_SYSTEM/frontend/src/router/AppRouter.jsx) | Maps `/` (Onboarding First Page), `/login`, `/portal/:role/dashboard`, `/developer-control-center/dashboard`, and `/details/:category/:id`. |
| **Headmaster Executive Command Center** | [`AdminDashboard.jsx`](file:///d:/version1/GBS_SYSTEM/frontend/src/modules/portal/pages/dashboards/admin/AdminDashboard.jsx) | Vetting desk, Inbuilt CCTV Surveillance Matrix, Staff OTP Registration, Fee Approvals, and Academic Plan Management. |
| **Teacher Interactive Workspace** | [`TeacherDashboard.jsx`](file:///d:/version1/GBS_SYSTEM/frontend/src/modules/portal/pages/dashboards/teacher/TeacherDashboard.jsx) | Individual student-by-student attendance roll call (`PRESENT`, `ABSENT`, `LATE`, `EXCUSED`), exam grading, weekly attendance archives, and lesson note submission. |
| **Student Scholar Hub** | [`StudentDashboard.jsx`](file:///d:/version1/GBS_SYSTEM/frontend/src/modules/portal/pages/dashboards/student/StudentDashboard.jsx) | Examination CBT, Peer-to-Peer Scholar Chat by index search with verification modal & archive, Class Topic Videos, and Academic Schedule. |
| **Accountant & Finance Portal** | [`AccountantDashboard.jsx`](file:///d:/version1/GBS_SYSTEM/frontend/src/modules/portal/pages/dashboards/accountant/AccountantDashboard.jsx) | Fee collection, Fee Increment & Recalculation Requests, Alumni Pledges & Philanthropic Gifts Ledger, and Headmaster Procurement Ledger. |
| **Parent Portal** | [`ParentDashboard.jsx`](file:///d:/version1/GBS_SYSTEM/frontend/src/modules/portal/pages/dashboards/parent/ParentDashboard.jsx) | Ward performance, live emergency school bus tracking, fee invoices, admission letters, and official transcript requests. |
| **Alumni & Convocation Hub** | [`AlumniDashboard.jsx`](file:///d:/version1/GBS_SYSTEM/frontend/src/modules/alumni/pages/AlumniDashboard.jsx) | Alumni directory, reunions, and philanthropic endowment donations syncing live to Accountant ledger (`gbs_alumni_pledges_and_gifts`). |
| **Developer Mission Control** | [`DeveloperDashboard.jsx`](file:///d:/version1/GBS_SYSTEM/frontend/src/modules/developer-platform/pages/DeveloperDashboard.jsx) | 49 system control panels, tenant approvals/deletions, deployment logs, backups, and Repeat Staff Intrusion Sentinel. |
| **Developer Access Gate & Login** | [`DeveloperLogin.jsx`](file:///d:/version1/GBS_SYSTEM/frontend/src/modules/developer-platform/pages/DeveloperLogin.jsx) | Strict root developer credentials (`gabosei48@gmail.com`). Tracks staff breach trials and flags violators for questioning. |
| **Dedicated Verification Page** | [`UniversalDetailPage.jsx`](file:///d:/version1/GBS_SYSTEM/frontend/src/components/common/UniversalDetailPage.jsx) | Full-page verification desk with `✅ Verify & Approve`, `⚠️ Issue Query / Revision`, `⚖️ Compliance Endorsement`, and `🖨️ Print`. |
| **Universal Top Banner & Walkthrough** | [`TopCenterSystemBanner.jsx`](file:///d:/version1/GBS_SYSTEM/frontend/src/components/common/TopCenterSystemBanner.jsx) | Universal 1-click walkthrough navigation bar across all 9 portals + Onboarding School. |
| **Mobile Experience Notice Modal** | [`MobileExperienceNoticeModal.jsx`](file:///d:/version1/GBS_SYSTEM/frontend/src/components/common/MobileExperienceNoticeModal.jsx) | Alerts mobile viewports: *"YOU WOULD ENJOY THE APPEARANCE WHEN LAUNCHED ON A LAPTOP OR PC."* |
| **Class Topic Video Platform** | [`ClassTopicVideoPlatform.jsx`](file:///d:/version1/GBS_SYSTEM/frontend/src/components/common/ClassTopicVideoPlatform.jsx) | Teacher topic video upload/recording in teacher's absence + Student video playback and notice of workdone. |

---

## 3. Critical Rules, Bug Protections & Resolved Issues

```mermaid
flowchart TD
    A["User Action on Portal"] --> B{"Error Occurred?"}
    B -- No --> C["Render Functional UI & Update State"]
    B -- Yes --> D["Catch in ErrorBoundary"]
    D --> E["Log Warn to Console"]
    D --> F["Preserve Universal Top Navigation Bar"]
    D --> G["Provide Instant Reset / View Restoration Button"]
    D --> H["NEVER display transient error banner or throw secondary error"]
```

### A. Permanent Prohibition of Transient Display Message
* The following error fallback message is strictly prohibited and must **NEVER** appear anywhere in the system:
  > `"🎓 HEADMASTER EXECUTIVE PORTAL The portal encountered a transient display event. Your institutional records and telemetry data are completely secure."`
* All error boundaries (`AdminDashboardErrorBoundary`, `StudentDashboardErrorBoundary`) render non-reentrant safe recovery headers with full top navigation, never crashing into a blank white screen.

### B. Inbuilt CCTV & Mobile Handset Pairing
* Hardware camera stream binds directly to `cctvLiveVideoRef` with IR night vision and thermal AI filters.
* 6-Channel 30FPS simulated feeds maintain active canvas rendering without throwing undefined references.
* Mobile pairing form uses `cctvMobileForm` with pairing token `HM-CCTV-8842` for Headmaster smartphone monitoring.

### C. Teacher Roll Call & Examination Grading
* Attendance requires **tick-by-tick individual student selection** (`PRESENT`, `ABSENT`, `LATE`, `EXCUSED`). No "select-all" button exists.
* Assessment and examination scoring applies the identical individual scholar entry approach with live grade stamps.

### D. Student Registered Mobile Numbers & Peer Chat
* Registered student phone numbers are collected and displayed on rosters for direct contact.
* Peer-to-peer scholar chat permits searching classmates by Index/Admission number, inspecting the candidate in an verification modal, confirming before chatting, and archiving chat threads in `gbs_peer_archived_chats`.

### E. Alumni Gifts & Accountant Ledger Synchronization
* When an alumnus contributes in [`AlumniDashboard.jsx`](file:///d:/version1/GBS_SYSTEM/frontend/src/modules/alumni/pages/AlumniDashboard.jsx), the transaction is recorded in `gbs_alumni_pledges_and_gifts` with receipt IDs and dispatches `gbs_alumni_gift_added`.
* [`AccountantDashboard.jsx`](file:///d:/version1/GBS_SYSTEM/frontend/src/modules/portal/pages/dashboards/accountant/AccountantDashboard.jsx) listens for storage events and updates total pledged, total redeemed, and individual donation rows immediately.

### F. Developer Intrusion Sentinel & Staff Tracking
* Any non-developer staff member attempting to access Developer Mission Control is intercepted by [`DeveloperLogin.jsx`](file:///d:/version1/GBS_SYSTEM/frontend/src/modules/developer-platform/pages/DeveloperLogin.jsx).
* Breach attempts are recorded in `gbs_dev_staff_intrusion_trials` and `gbs_dev_security_violations` with Gmail, IP address, timestamp, and trial count.
* Upon reaching 3 trials, status automatically switches to `SUMMON_FOR_QUESTIONING` for executive questioning by the Chief Developer.

### G. Topic Video Notice of Workdone
* Upon publishing or recording a lesson video in [`ClassTopicVideoPlatform.jsx`](file:///d:/version1/GBS_SYSTEM/frontend/src/components/common/ClassTopicVideoPlatform.jsx), the system displays:
  > `"✅ Notice of Work Done: Topic Video ... Uploaded & Published Successfully to Class!"`

---

## 4. Official Student-Based Subscription Pricing Formula

- **Pricing Model:** 100% student-based subscription. **No fixed tenant fees, no basic package fees, and no monthly platform surcharges.**
- **Monthly Rates:**
  - **Nursery – JHS:** `GH₵ 3` per active student / month
  - **SHS:** `GH₵ 5` per active student / month
  - **University:** `GH₵ 10` per active student / month
- **Billing Duration Discounts:**
  - `1 Month`: 0% discount
  - `3 Months`: 3% discount
  - `6 Months`: 5% discount
  - `9 Months`: 7% discount
  - `12 Months`: 10% discount
- **Formula:**
  $$\text{Invoice Total} = (\text{Active Students} \times \text{Rate} \times \text{Months}) \times (1 - \text{Discount})$$

---

## 5. Enterprise Functional Upgrades & Advanced Workflow Implementations

### A. Walk-in Admissions Desk for Headmaster
- **Physical Parent Walk-in Intake:** Physical admissions desk in [`AdminDashboard.jsx`](file:///d:/version1/GBS_SYSTEM/frontend/src/modules/portal/pages/dashboards/admin/AdminDashboard.jsx) allows immediate student registration when parents visit on-site.
- **Index Number Generation:** System automatically issues institutional index format (`GBS-2026-WKxxx`).
- **Instant Enrollment & Letter Generation:** Immediate enrollment toggle to register the student directly into the active student roster and generate an official printable admission letter.
- **Admission Pipeline Filter Controls:** Interactive filter buttons (`ALL`, `WALK_IN`, `ONLINE`, `PENDING`, `APPROVED`, `REJECTED`) dynamically filter the admissions ledger.

### B. Universal Multilingual Support & Educational Sentence Explainer
- **Country Official Language Picker:** Located in [`UniversalLanguageTranslator.jsx`](file:///d:/version1/GBS_SYSTEM/frontend/src/components/common/UniversalLanguageTranslator.jsx) (mounted in [`App.jsx`](file:///d:/version1/GBS_SYSTEM/frontend/src/App.jsx)) supporting 13 country official languages: Ghana (Twi/Akan), Nigeria (Yoruba, Hausa, Igbo), Kenya (Swahili), France/Francophone (French), Spain/LatAm (Spanish), Germany (German), China (Mandarin), Saudi Arabia/MENA (Arabic), Portugal/Brazil (Portuguese), Japan (Japanese), Russia (Russian), UK/US (English).
- **Interactive Term & Sentence Explainer:** Translates unclear educational phrases and sentences with speech audio pronunciation, dictionary lookups, and pedagogical meaning breakdowns.

### C. Authentic 3-Step Payment Gateway Engine
- **Component:** [`OfficialPaymentGatewayModal.jsx`](file:///d:/version1/GBS_SYSTEM/frontend/src/components/common/OfficialPaymentGatewayModal.jsx) mounted globally for student fee settlement and accountant transaction verification.
- **Supported Payment Methods:**
  - **Mobile Money (MTN MoMo, Telecel Cash, AT Money):** 60-second animated USSD authorization countdown with simulated prompt on subscriber handset (`"Simulated USSD Prompt: Authorize payment by entering PIN on handset"`).
  - **Credit / Debit Cards (Visa, Mastercard, Verve, UnionPay):** Real 3D Secure OTP authentication verification step.
  - **Direct Bank Settlement / Wire:** Live account reference generation and instant settlement clearing.
- **Official Digital Stamped Receipts:** Stamped with `VERIFIED & AUDITED GBS TREASURY` and printable digital tax invoices with universal `← Back` navigation.

### D. Engineering & Facility Command Center Telemetry
- **Component:** [`FacilityManagementPage.jsx`](file:///d:/version1/GBS_SYSTEM/frontend/src/modules/facility/pages/FacilityManagementPage.jsx).
- **Live SLA Countdown Ticker:** Active countdown displaying resolution deadlines for pending tickets.
- **Optimistic State Recalculation:** When a technician changes ticket status (`RESOLVED`, `IN_PROGRESS`, `PENDING`), KPI telemetry counters (Total Work Orders, Open Issues, Resolved, Urgent Escalations) recalculate immediately.

### E. Peer-to-Peer Live Video Call in Scholar Chat
- **Component:** [`StudentDashboard.jsx`](file:///d:/version1/GBS_SYSTEM/frontend/src/modules/portal/pages/dashboards/student/StudentDashboard.jsx).
- **Verified Video Calling:** Students search peer by student index number; upon verification, launches WebRTC-style live video modal with camera stream, microphone mute toggle, video on/off toggle, screen sharing, call timer, and end call control.

### F. Live Class Concluded Notice & Catch-Up Video Player
- **Component:** [`StudentDashboard.jsx`](file:///d:/version1/GBS_SYSTEM/frontend/src/modules/portal/pages/dashboards/student/StudentDashboard.jsx).
- **Post-Session Notice:** Notification banner displaying day, time, duration, instructor name, and topic after online live classes conclude.
- **Catch-Up Playback Modal:** Absent students can open the recording modal to view lecture notes, slides, and recorded video stream.

### G. Student Digital Syllabus Library & Arrears Settlement
- **Digital Textbook Hub:** Students can borrow and order syllabus textbooks with automatic 14-day due date countdown alert banners (`"Due in 14 days"`) and return management synced to `gbs_library_borrowed_records`.
- **Outstanding Arrears Banner:** Displays live balance owed with 1-click launch of [`OfficialPaymentGatewayModal.jsx`](file:///d:/version1/GBS_SYSTEM/frontend/src/components/common/OfficialPaymentGatewayModal.jsx).

### H. Accountant Class Tier Grouping & Philanthropic Alumni Outreach
- **Interactive Class Tier Grouping:** Clicking "Total Registered Classes" on [`AccountantDashboard.jsx`](file:///d:/version1/GBS_SYSTEM/frontend/src/modules/portal/pages/dashboards/accountant/AccountantDashboard.jsx) opens an interactive modal grouping classes into Basic Education, Junior High (JHS), Senior High (SHS), and Tertiary/Pre-University, with stream breakdowns, student headcounts, average tuition, term yield, and annual projections.
- **Direct Alumni Outreach:** Pledges and donations ledger includes 1-click WhatsApp messaging and Zoom meeting invitations to contact donors.

---

## 6. Advanced Mobile Camera AI Exam Scanner & Real-Time Academic Operations

### A. Mobile Camera Integration for AI Exam Scanner (50-Point Specification)
- **Component:** [`MobileCameraAIExamScannerModal.jsx`](file:///d:/version1/GBS_SYSTEM/frontend/src/components/common/MobileCameraAIExamScannerModal.jsx) linked directly from [`TeacherDashboard.jsx`](file:///d:/version1/GBS_SYSTEM/frontend/src/modules/portal/pages/dashboards/teacher/TeacherDashboard.jsx).
- **Mobile Hardware Camera Link:** Accesses phone camera via `navigator.mediaDevices.getUserMedia` with back/front toggles, torch/flashlight controls, document edge detection reticle overlays, and real-time camera quality metrics.
- **Multi-Page Script Capture:** Sequentially captures student examination scripts page-by-page with automatic page ordering, contrast enhancement, shadow removal, and perspective straightening.
- **Teacher Preferred Answer Keys:** Teachers input master answers, question marks, acceptable alternatives (synonyms/alternative phrasing), marking schemes, and AI strictness rules.
- **AI OCR Auto-Marking:** Converts handwritten answers into readable text via OCR, compares against teacher answer keys, awards marks with partial credit, calculates letter grades, and flags unclear handwriting for human review.
- **Teacher Review & Overrides:** Split-screen side-by-side inspection of scanned script and extracted OCR text with 1-click mark overrides, approved marks committed to `gbs_persistent_store.json` and student records.
- **Security & Offline Scanning:** Encrypted script archive with SHA-256 checksums, duplicate upload prevention, and offline scanning queue (`gbs_offline_scanned_exam_scripts`) with automatic cloud synchronization.

### B. Developer Onboarding Queue for Schools and Member Signups
- **Location:** [`DeveloperDashboard.jsx`](file:///d:/version1/GBS_SYSTEM/frontend/src/modules/developer-platform/pages/DeveloperDashboard.jsx).
- **Complete Intake Verification:** Captures and displays every incoming application:
  1. *Institution Applications (`INCOMING`)*: School name, population, administrator contact, MoMo transaction reference, and biometric facial token.
  2. *Member & Staff Signups (`MEMBERS`)*: Teachers, accountants, HR staff, students, and parents with credentials, tenant assignment, and 1-click approval/provisioning.
  3. *Archived Institutions (`ARCHIVED`)*: Searchable audit vault of approved schools with dispatched SMS delivery proofs.

### C. Headmaster Parent-Requested Admission Amendments
- **Location:** [`AdminDashboard.jsx`](file:///d:/version1/GBS_SYSTEM/frontend/src/modules/portal/pages/dashboards/admin/AdminDashboard.jsx).
- **On-Demand Admission Record Editing:** Headmaster can amend student demographics (Name, DOB, Gender, Target Grade), parent/guardian contact info (Phone, WhatsApp, Email, Home GPS Address), and admission stage (`PENDING`, `APPROVED`, `ENROLLED`) with custom parent amendment request notes.

### D. Teacher Faculty Profile & Individual Grading Integrity
- **Location:** [`TeacherDashboard.jsx`](file:///d:/version1/GBS_SYSTEM/frontend/src/modules/portal/pages/dashboards/teacher/TeacherDashboard.jsx).
- **Faculty Profile Suite:** Prominent profile header card and dedicated `👤 Faculty Profile` tab with qualifications, assigned classes, office location, consultation hours, and profile editing.
- **Strict Individual Attendance & Assessment:** Enforces tick-by-tick individual student roll call (`PRESENT`, `ABSENT`, `LATE`, `EXCUSED`) and individual exam score entry with instant grade calculation.

### E. Peer-to-Peer Live Video Calling & In-App Virtual Classroom
- **Location:** [`StudentDashboard.jsx`](file:///d:/version1/GBS_SYSTEM/frontend/src/modules/portal/pages/dashboards/student/StudentDashboard.jsx).
- **Hardware Camera Live Video Call:** Direct WebRTC hardware camera stream binding for local and remote student video feeds.
- **In-App Virtual Classroom Studio:** 1-click `🚀 Join Live Class` immediately joins students and teachers into an interactive classroom with live presentation, picture-in-picture student preview, classroom chat feed, hand-raising, and external Zoom/Meet app launch options.

### F. Extreme System Responsiveness & Instant Click Feedback
- **Prisma Connection Optimizer:** Cached offline PostgreSQL probe in [`prisma.client.js`](file:///d:/version1/GBS_SYSTEM/backend/src/core/database/prisma.client.js) with 45-second TTL eliminates repeated socket timeouts, accelerating backend API response time to under 10ms.
- **Snappy Client Network Policy:** Set Axios client timeout to 5000ms with optimistic state updates on all interactive buttons.

---

## 7. Operational Integrity & Verification Architecture

### A. Headmaster Master Dashboard Amendment Suite
- **Admissions Editing Modal (`editingAdmission`):** Fully mounted in [`AdminDashboard.jsx`](file:///d:/version1/GBS_SYSTEM/frontend/src/modules/portal/pages/dashboards/admin/AdminDashboard.jsx) enabling Headmaster to edit applicant demographics, target grade, gender, guardian phone/WhatsApp/email, residential GPS address, prior school aggregate, and admission stage (`PENDING`, `APPROVED`, `ADMITTED`).
- **Enrolled Student Roster Editing Modal (`editingStudent`):** Added Action column with `✏️ Edit / Amend Details` in the enrolled scholars table. Allows updating scholar first/last name, matric ID, assigned classroom tier, fee arrears balance, and school bus boarding service.

### B. Teacher Individual Attendance & Grading System
- **Roster Guarantee:** Canonical student roster fallback guarantees the classroom roster is never blank, regardless of database or network state.
- **Individual Per-Student Roll Call:** Individual buttons (`Tick Present`, `Tick Absent`, `⏰ Late`, `📝 Excused`) toggle and commit immediately per scholar to `attendanceRecords`, `localStorage`, and background PostgreSQL sync (`/attendance/single`).
- **Persistent Roll Call View:** Preserves ticked student marks on the screen when saving daily archives (`handleSubmitAttendance`) without unexpected auto-advancing or wiping checks. Provides a dedicated `▶ Advance to Next Day` action.
- **Individual Examination Scoring:** Score input (0 - 100), teacher remarks, and custom grade overrides commit student-by-student with instant optimistic student dashboard publication (`publishGradeToStudentDashboard`).

### C. Pre-Submission File Upload Inspection & Verification Card
- **Component:** [`FileUploadVerificationCard.jsx`](file:///d:/version1/GBS_SYSTEM/frontend/src/components/common/FileUploadVerificationCard.jsx).
- **Mandatory Pre-Submit Inspection:** Every uploaded file (Teacher Assignment worksheets, Lesson Plans / Schemes of Work, Headmaster Walk-in applicant dossiers) renders a file inspection card showing format badge, size, clean integrity scan, and an interactive `👁️ Inspect File` preview.
- **Verification Gate:** Submission buttons remain gated until the user clicks `✓ Verify File Content`, ensuring 100% compliance with *"any upload must be seen and verify before submitting."*

### D. Absolute Developer Password Confidentiality
- The master developer password (`0543294615Gab`) is strictly masked and completely excluded from all text inputs, autofill buttons, placeholders, and UI markup across the codebase.

---

## 8. Enterprise Real-Time Attendance & Universal Routed Detail Architecture (Nov 2026)

### A. Dedicated Individual Tick Auto-Save & Attendance Roll Completion
- **Location:** [`TeacherDashboard.jsx`](file:///d:/version1/GBS_SYSTEM/frontend/src/modules/portal/pages/dashboards/teacher/TeacherDashboard.jsx) & [`attendance.service.js`](file:///d:/version1/GBS_SYSTEM/backend/src/modules/attendance/attendance.service.js).
- **Unified One-by-One Student Roll Call Workflow:**
  - In each student's row, a unified, prominent 4-button tick bar allows the teacher to tick each student one by one:
    - `[ ☑ Tick Present ]` (green)
    - `[ ☒ Tick Absent ]` (red)
    - `[ ⏰ Tick Late ]` (amber)
    - `[ 📝 Tick Excused ]` (blue)
    - `[ ⚪ Reset ]` (subtle gray)
  - Ticking any status immediately auto-saves to local cache (`gbs_attendance_${classId}_${date}`), dispatches live real-time sync (`gbs_attendance_updated`) to Student and Parent dashboards (`gbs_student_attendance_summary`), and persists asynchronously to backend `/attendance/single`.
  - Permanent per-student status badge shows `✓ Ticked & Auto-Saved at [HH:MM:SS]` so the teacher has 100% visual certainty of persistence before moving on to the next student.
- **Roll Call Completion Gate Enforcement:**
  - Progress meter dynamically tracks: `Ticked: X / N Students`.
  - If any students remain unticked, attempting to complete displays an explicit alert: *"⚠️ Roll call incomplete: X student(s) have not been ticked yet! A teacher must tick each single student one by one to complete attendance taking."*
  - When all students are ticked, clicking `💾 COMPLETE ROLL CALL & WRAP INTO ARCHIVES` wraps the session into `gbs_daily_attendance_archives`, sends the batch to `/attendance/batch`, and presents the archive in the vault with 1-click full-page inspection via [`UniversalDetailPage.jsx`](file:///d:/version1/GBS_SYSTEM/frontend/src/components/common/UniversalDetailPage.jsx).
- **Backend Prisma Date Normalization & Resilient Batch Sync:**
  - Resolved `Date` object vs ISO string comparison bug in [`prisma.client.js`](file:///d:/version1/GBS_SYSTEM/backend/src/core/database/prisma.client.js) where date matching was failing with strict reference equality. `matchesWhere` now compares ISO date strings (`YYYY-MM-DD`) and supports Prisma range filters (`gte`, `lte`, `gt`, `lt`), ensuring existing attendance records are accurately found and updated instead of creating duplicates.
  - In `attendance.service.js`, batch attendance gracefully handles any status without throwing transaction errors.

---

## 9. Master AI IDE Build Command & Hidden System Blueprint (Nov 2026)

- **Hidden System Directive:** Stored at root [`.GBS_SYSTEM_AI_IDE_MASTER_BUILD_COMMAND.md`](file:///d:/version1/GBS_SYSTEM/.GBS_SYSTEM_AI_IDE_MASTER_BUILD_COMMAND.md) with Windows `HIDDEN` file attributes (`attrib +h`).
- **Owner Credentials & Deployment Target:**
  - GitHub & Render Account: `gabosei48@gmail.com`
  - Master Security & Developer PIN: `0543294615Gab`
  - Hosting: Render (`onrender.com`) via `render.yaml`
  - Web Service: `gbs-school.onrender.com` (Node.js API + Static SPA fallback)
  - Static CDN: `gbs-frontend.onrender.com` (Vite static build)
  - Database: `gbs-db` (`gbs_production` PostgreSQL)
- **Render Cross-Origin API Fix:** `apiConfig.js` automatically maps requests originating from `gbs-frontend.onrender.com` directly to `https://gbs-school.onrender.com/api/v1`, ensuring zero 404s or SPA rewrite issues on the cloud.
- **Replication Prompt:** Contains a single, unified copy-paste prompt enabling any AI IDE to scaffold, build, compile, and deploy an exact replica of the GBS Enterprise System from zero to production.

### B. Universal Full-Page Navigation with Persistent Back Button
- **Component:** [`UniversalDetailPage.jsx`](file:///d:/version1/GBS_SYSTEM/frontend/src/components/common/UniversalDetailPage.jsx) & [`universalNavigation.js`](file:///d:/version1/GBS_SYSTEM/frontend/src/utils/universalNavigation.js).
- **Full-Page Routed Display:**
  - Replaces or augments dropdown popups by routing explainable information to `/details/:category/:id`.
  - Supports categories: `attendance`, `student`, `teacher`, `staff`, `admission`, `application`, `lesson-plan`, `exam`, `payment`, `invoice`, `report`, `hr-report`, `audit-log`, `school`, `onboarding`, `backup`, `alert`, `deployment`, `license`.
  - Prominent sticky `⬅ Back to Previous Page` button preserves originating dashboard tab, search filters, and scroll position via `sessionStorage` and browser history state.
  - Comprehensive inspection features: KPI metric summaries, attribute data ledger, specialized attendance roll tables, candidate admission dossiers, lesson plan assessments, facial identity verification photos, and executive verification controls (`✅ Verify & Approve Dossier`, `⚠️ Issue Query / Revision`, `⚖️ Compliance Seal`, `🖨️ Print Record`).

---

## 10. Exam Vetting, Direct Payments & Global Page Navigation with Scroll Restoration (Nov 2026 — Commit `3f6fa23`)

- **Cross-Institution Teacher → Headmaster Exam Vetting & Ongoing Confirmation:**
  - Component: [`ExamVettingHubPanel.jsx`](file:///d:/version1/GBS_SYSTEM/frontend/src/components/common/ExamVettingHubPanel.jsx) wired to `/api/v1/ai-exam/vetting/*` and `/api/v1/exams/vetting/*`.
  - Supports teacher submission of end-of-term/semester exams, Headmaster revision requests, teacher resubmission, and Headmaster vetting & ongoing-exam confirmation across all 4 institution tiers (`NURSERY_TO_JHS`, `SENIOR_HIGH_SCHOOL`, `TECHNICAL`, `UNIVERSITY`).
- **Direct MoMo App / USSD & Bank-to-School/Developer Payment Gateways:**
  - Verified MTN MoMo, Paystack, Hubtel, and Direct Bank-to-School / Onboarding-to-Developer flows with HMAC webhook validation, idempotency protection, partial payment receipts, refund balance restoration, and zero raw PIN/CVV storage (`18/18` checks passing in [`verify_upgrade_e2e.js`](file:///d:/version1/GBS_SYSTEM/backend/verify_upgrade_e2e.js)).
- **Global Page-Based Module Routing & Exact Scroll Position Restoration:**
  - Implemented across all 9 institutional dashboards (explicitly excluding Developer Dashboard) via [`AppRouter.jsx`](file:///d:/version1/GBS_SYSTEM/frontend/src/router/AppRouter.jsx), [`globalNavigationScrollManager.js`](file:///d:/version1/GBS_SYSTEM/frontend/src/utils/globalNavigationScrollManager.js), [`useDashboardTabSync.js`](file:///d:/version1/GBS_SYSTEM/frontend/src/hooks/useDashboardTabSync.js), and [`DashboardTabPageController.jsx`](file:///d:/version1/GBS_SYSTEM/frontend/src/components/common/DashboardTabPageController.jsx).
  - Opens every dashboard module on its own internal route (`/portal/<role>/dashboard/:moduleId`) and restores exact window + scrollable container positions on browser Back/Forward and application Back buttons (`10/10` Desktop + `10/10` Mobile Chrome CDP verified).

---

## 11. Dashboard Auth HTTP 200 Hardening, Seamless Video ↔ Voice ↔ Video Switching & Automatic Memory Protocol (Nov 2026 — Commit `a243bc5`)

### A. Elimination of Dashboard `401` Polling Errors (Preserving Real Security)
- **Root Causes Resolved:**
  1. Expired/missing JWTs caused `LiveCallLauncherAndReceiver` (`/api/v1/video/calls/incoming`) and `TopCenterSystemBanner` (`/api/v1/sms/inbox`) to keep polling without a valid token after `axios.js` cleared stale tokens.
  2. `auth.middleware.js` lacked `DEV_JWT_SECRET` verification fallback and standby numeric/built-in email lookup; `auth.service.js` `refreshTokenSession()` missed PostgreSQL-standby resolution for built-in numeric IDs (`1..9`), `SECRETARY`, and onboarded Headmasters (`usr_hm_*`).
  3. `OnlineLearningDashboard.jsx` used raw `fetch()` without full auth headers or refresh handling.
- **Fixes Applied:**
  - [`tokenStorage.js`](file:///d:/version1/GBS_SYSTEM/frontend/src/utils/tokenStorage.js): Added `getActiveAuthToken()` & `hasActiveAuthSession()` across `gbs_token`, `gbs_access_token`, `gbs_dev_token`, plus `gbs_auth_session_updated` / `gbs_auth_session_cleared` events.
  - [`axios.js`](file:///d:/version1/GBS_SYSTEM/frontend/src/api/client/axios.js): Added proactive client-side JWT expiration pre-flight renewal (refreshes expired tokens *before* requests leave the browser), built-in Demo Sandbox one-time recovery, and `gbs_auth_session_expired` broadcast on unrecoverable live expiry.
  - [`LiveCallLauncherAndReceiver.jsx`](file:///d:/version1/GBS_SYSTEM/frontend/src/components/common/LiveCallLauncherAndReceiver.jsx) & [`TopCenterSystemBanner.jsx`](file:///d:/version1/GBS_SYSTEM/frontend/src/components/common/TopCenterSystemBanner.jsx): Guarded background polling with `hasActiveAuthSession()` so unauthenticated sessions never spam `401`, resuming automatically on login/refresh.
  - [`auth.middleware.js`](file:///d:/version1/GBS_SYSTEM/backend/src/middleware/auth.middleware.js), [`auth.service.js`](file:///d:/version1/GBS_SYSTEM/backend/src/modules/auth/auth.service.js), [`auth.api.js`](file:///d:/version1/GBS_SYSTEM/frontend/src/modules/auth/api/auth.api.js), [`DeveloperLogin.jsx`](file:///d:/version1/GBS_SYSTEM/frontend/src/modules/developer-platform/pages/DeveloperLogin.jsx): Added `DEV_JWT_SECRET` fallback, standby refresh & built-in resolution, and `secretary@gbs.com` offline support.
  - **Security Guarantee Preserved:** Unauthenticated and tampered requests to `/api/v1/video/calls/incoming` strictly return **`401 Unauthorized`**.

### B. Seamless Video → Voice → Back to Video Switching Across All Dashboards
- **Backend Signaling Persistence:** [`liveCall.service.js`](file:///d:/version1/GBS_SYSTEM/backend/src/modules/video/liveCall.service.js) persists `MEDIA_MODE` (`VIDEO` ↔ `VOICE`) and participant `videoOff` state on `POST /api/v1/video/calls/:callId/signal` and emits `media_mode_changed` over SSE & Socket so polling never reverts the user's selected mode.
- **In-System Live Call Modal (All 10 Dashboards):** [`LiveInSystemCallModal.jsx`](file:///d:/version1/GBS_SYSTEM/frontend/src/components/common/LiveInSystemCallModal.jsx) decoupled `activeMediaMode` from the WebRTC/SSE lifecycle `useEffect`, added an always-available `Switch to Voice Call` / `Switch to Video Call` control (`data-testid="call-switch-media-mode-btn"`), releases camera cleanly on Video → Voice while keeping audio uninterrupted, re-acquires a live camera track into a fresh `new MediaStream([...liveAudioTracks, vidTrack])` on Voice → Video, performs non-blocking transceiver-aware `replaceTrack()` / `addTrack()` + SDP renegotiation `OFFER`, guards initial `getUserMedia` race conditions, and uses `getActiveAuthToken()` for SSE streams.
- **Student Cooperative Conference & Virtual Classroom:** [`StudentCooperativeConferenceModal.jsx`](file:///d:/version1/GBS_SYSTEM/frontend/src/components/common/StudentCooperativeConferenceModal.jsx) and [`OnlineLearningDashboard.jsx`](file:///d:/version1/GBS_SYSTEM/frontend/src/modules/meeting/pages/OnlineLearningDashboard.jsx) preserve audio tracks in refs, re-acquire camera tracks on Voice → Video return, and re-attach `srcObject` + `.play()` cleanly.

### C. Verification & Automatic Memory Persistence
- **Local Verification:** `69 / 69` API & real headless Chrome CDP media-stream checks passed (`0` failures, `0` tooltip regressions) + `18 / 18` upgrade regression checks passed.
- **Live Render Production Verification (`https://gbs-system.onrender.com`, bundle `index-DiuujEUj.js`):** `53 / 53` live HTTP checks passed — green `200`/`201` across all 10 dashboards, token refresh, and `VIDEO → VOICE → VIDEO` signaling; strict `401 Unauthorized` verified on unauthenticated access.
- **Permanent Automatic Memory Rule:** Created [`AGENTS.md`](file:///d:/version1/GBS_SYSTEM/AGENTS.md) at the repository root so every future session automatically saves completed jobs into `backend/data/gbs_system_memory_snapshot.json`, `SYSTEM_MEMORY_AND_DIAGNOSTIC_REGISTRY.md`, and `MASTER_SYSTEM_MEMORY_LEDGER.md` without requiring user reminders.

---

## 12. 10-Dashboard Live Video Camera Display, Production Payment Hardening, Responsive Unclipping & Developer Full-Page Module Routing (Nov 2026 — v2.15.0, Commit `d22e42b`)

### A. Video Calling Camera Display Across All 10 Dashboards
- **Root Causes Resolved:**
  1. Video call modals (`LiveInSystemCallModal`, `StudentCooperativeConferenceModal`, `OnlineLearningDashboard`, Student peer call modal) rendered inside dashboard containers with CSS `backdrop-filter` / `transform`, clipping fixed full-screen overlays.
  2. Initial camera acquisition failed completely if microphone access failed or cold-start camera drivers took >3.5s; browser autoplay policies blocked unmuted remote streams; WebRTC omitted explicit `recvonly` transceivers and `have-local-offer` rollback on peer join.
  3. Accountant, HR, Staff, Alumni, and Student dashboards lacked full `FULL_STUDIO` call launchers, and `liveCall.service.js` omitted Alumni directory & conference routing.
- **Fixes Applied:**
  - Portaled all video/call modals directly to `document.body` via `createPortal`.
  - Upgraded [`LiveInSystemCallModal.jsx`](file:///d:/version1/GBS_SYSTEM/frontend/src/components/common/LiveInSystemCallModal.jsx) with 5 Google STUN servers, cold-start resilient `getUserMediaWithTimeout` (`6500ms` primary + audio-optional video fallback), remote muted autoplay fallback + `Tap to Unmute Speaker Audio` banner, live resolution readout, camera switcher (`enumerateDevices`), explicit `Activate / Retry Camera` control, `recvonly` audio/video transceivers, and `have-local-offer` rollback/ICE restart.
  - Upgraded [`LiveCallLauncherAndReceiver.jsx`](file:///d:/version1/GBS_SYSTEM/frontend/src/components/common/LiveCallLauncherAndReceiver.jsx) and [`liveCall.service.js`](file:///d:/version1/GBS_SYSTEM/backend/src/modules/video/liveCall.service.js) to support all 10 roles (including `ALUMNI` directory & `ALUMNI_CONFERENCE`), and mounted `FULL_STUDIO` studios across Admin, Teacher, Student, Parent, Accountant, Secretary, Staff, HR, Alumni, and Developer dashboards.

### B. Guaranteed Production & Demo Sandbox Payment Processing
- **Root Causes Resolved:**
  1. Public onboarding Step 2 actions (`sandbox-confirm`, `submit-otp`, `fallback`, `cancel`) hit JWT-protected routes and failed with `401` before Headmaster login.
  2. `"GH₵"` currency symbols failed ISO validation; non-numeric mock `invoiceId` values caused lookup errors; raw integer `studentIdentifier` (`19`) violated Prisma `String? studentCode` on live PostgreSQL, causing silent offline store fallback and `404` on confirm/verify.
  3. Paystack direct MoMo `POST /charge` failures had no automatic Hosted Checkout fallback; Live Production accounts without pre-seeded invoices could not settle custom amounts; `OfficialPaymentGatewayModal` re-ran `loadContext()` on async parent re-renders and unmounted active forms mid-checkout.
- **Fixes Applied:**
  - Added public onboarding Step 2 endpoints in [`payments.routes.js`](file:///d:/version1/GBS_SYSTEM/backend/src/modules/payments/payments.routes.js) and [`payments.controller.js`](file:///d:/version1/GBS_SYSTEM/backend/src/modules/payments/payments.controller.js) strictly scoped to `paymentScope === 'SUBSCRIPTION'` (rejecting `SCHOOL_FEES` with `401`).
  - Hardened [`payments.validator.js`](file:///d:/version1/GBS_SYSTEM/backend/src/modules/payments/payments.validator.js), [`payments.service.js`](file:///d:/version1/GBS_SYSTEM/backend/src/modules/payments/payments.service.js), [`payments.reconciler.js`](file:///d:/version1/GBS_SYSTEM/backend/src/modules/payments/payments.reconciler.js), [`paystack.adapter.js`](file:///d:/version1/GBS_SYSTEM/backend/src/modules/payments/adapters/paystack.adapter.js), [`prisma.client.js`](file:///d:/version1/GBS_SYSTEM/backend/src/core/database/prisma.client.js), and [`finance.service.js`](file:///d:/version1/GBS_SYSTEM/backend/src/modules/finance/finance.service.js) with `GH₵ → GHS` normalization, strict `String` `studentCode` coercion, `STU-<tid>-<id>` resolution, unique `reference`-keyed updates, Paystack `/charge → Hosted Checkout` auto-fallback, Live Production auto-invoice issuance, and canonical `/api/v1/finance/payments` receipts.
  - Portaled [`OfficialPaymentGatewayModal.jsx`](file:///d:/version1/GBS_SYSTEM/frontend/src/components/common/OfficialPaymentGatewayModal.jsx) to `document.body`, clamped minimum partial amounts, and locked `loadContext()` to run only on modal open (`!justOpened` guard) so parent refreshes never reset active checkouts. Replaced hardcoded KPIs in [`ParentDashboard.jsx`](file:///d:/version1/GBS_SYSTEM/frontend/src/modules/portal/pages/dashboards/parent/ParentDashboard.jsx) and live fallback leakage in [`AccountantDashboard.jsx`](file:///d:/version1/GBS_SYSTEM/frontend/src/modules/portal/pages/dashboards/accountant/AccountantDashboard.jsx).

### C. Responsive Unclipping, Zero Tooltips & Developer Dedicated Module Routing
- Removed `text-overflow: ellipsis` / `white-space: nowrap` clipping across [`globals.css`](file:///d:/version1/GBS_SYSTEM/frontend/src/styles/globals.css), [`AdminDashboard.css`](file:///d:/version1/GBS_SYSTEM/frontend/src/modules/portal/pages/dashboards/admin/AdminDashboard.css), [`TeacherDashboard.css`](file:///d:/version1/GBS_SYSTEM/frontend/src/modules/portal/pages/dashboards/teacher/TeacherDashboard.css), [`DeveloperPlatform.css`](file:///d:/version1/GBS_SYSTEM/frontend/src/modules/developer-platform/pages/DeveloperPlatform.css), and [`HRDashboard.jsx`](file:///d:/version1/GBS_SYSTEM/frontend/src/modules/portal/pages/dashboards/hr/HRDashboard.jsx); ensured `.role-tab-nav` wraps visibly and `.role-header-brand` stays visible on `390x844` mobile with zero horizontal overflow.
- Added dedicated `:moduleId?` routes for Developer Portal in [`AppRouter.jsx`](file:///d:/version1/GBS_SYSTEM/frontend/src/router/AppRouter.jsx) and built self-contained full-page module navigation with sticky `[data-testid="dev-module-page-bar"]` (`← Back`, `🏠 Developer Overview`, `↗ Open in New Tab`) and per-entry exact Back scroll restoration (`gbs_dev_scroll_snapshots_v2`) in [`DeveloperDashboard.jsx`](file:///d:/version1/GBS_SYSTEM/frontend/src/modules/developer-platform/pages/DeveloperDashboard.jsx), preserving strict Developer Portal English LTR isolation (`data-gbs-developer-portal="true" data-gbs-no-translate="true"`).
- **Verification Verdict (Bundle `index-1ypqqsuB.js`, Commit `d22e42b`):**
  - `37 / 37` full E2E API + real Chrome CDP checks passed (`640x360` portaled live cameras across ALL 10 dashboards, `0` HTML tooltip attributes, `0` clipped labels, `0` 401s, `0` console errors, Parent payment UI checkout -> official receipt, Developer full-page module routing + exact Back scroll restoration `544 → 0 → 544`, and `390x844` mobile layout).
  - `18 / 18` upgrade regression checks passed in [`verify_upgrade_e2e.js`](file:///d:/version1/GBS_SYSTEM/backend/verify_upgrade_e2e.js).
  - `27 / 27` live Render production checks passed on `https://gbs-system.onrender.com` (all 10 roles `200 OK`, public onboarding & parent fee payments `201/200` with receipts, `VIDEO → VOICE → VIDEO` signaling, live SPA routes `200 OK`, and strict `401 Unauthorized` on unauthenticated & cross-scope access).

---

## 13. Student Self-Payment of School Fees & Bills, Official School Bank/MoMo Receiving Accounts, Payee Referencing & Live Accountant Audit Ledger (Nov 2026 — v2.16.0, Commit `2a7d9e4`)

- **Root Causes Resolved:**
  1. [`StudentDashboard.jsx`](file:///d:/version1/GBS_SYSTEM/frontend/src/modules/portal/pages/dashboards/student/StudentDashboard.jsx) `fees-history` tab rendered static placeholder ledger rows instead of live database bills, school receiving accounts, and verified receipts.
  2. School payment configuration lacked dedicated Official School MoMo receiving account fields (`schoolMomoNumber`, `schoolMomoNetwork`, `schoolMomoAccountName`, `schoolMomoMerchantId`) alongside School Bank Account details.
  3. Payment records did not explicitly track and reference `paidByRole` (`STUDENT` Self-Payment vs `PARENT`), `paidByName`, `payeeReference` (attributing the student as payee/beneficiary), or `destinationAccountSummary` (exact school Bank Account / School MoMo credited).
  4. [`AccountantDashboard.jsx`](file:///d:/version1/GBS_SYSTEM/frontend/src/modules/portal/pages/dashboards/accountant/AccountantDashboard.jsx) `payments` tab read from `localStorage` (`reconciledPayments`) instead of merging live database records returned by `GET /api/v1/finance/payments`.
- **Upgrades Applied:**
  - **Backend:** Updated [`payments.registry.js`](file:///d:/version1/GBS_SYSTEM/backend/src/modules/payments/payments.registry.js), [`bankDirect.adapter.js`](file:///d:/version1/GBS_SYSTEM/backend/src/modules/payments/adapters/bankDirect.adapter.js), [`payments.service.js`](file:///d:/version1/GBS_SYSTEM/backend/src/modules/payments/payments.service.js), [`payments.reconciler.js`](file:///d:/version1/GBS_SYSTEM/backend/src/modules/payments/payments.reconciler.js), [`finance.controller.js`](file:///d:/version1/GBS_SYSTEM/backend/src/modules/finance/finance.controller.js), and [`finance.service.js`](file:///d:/version1/GBS_SYSTEM/backend/src/modules/finance/finance.service.js) to store/expose School Official Bank & MoMo receiving accounts, generate canonical Student Payee References (`<Student Name> (<Student Code>) — Paid by Student (Self)` vs `Paid by Parent: <Parent Name>`), record them in immutable `AuditLog` entries, and enrich `GET /api/v1/finance/payments` and `GET /api/v1/payments/admin/overview` with Student Self-Paid vs Parent Paid totals.
  - **Frontend:** Upgraded [`OfficialPaymentGatewayModal.jsx`](file:///d:/version1/GBS_SYSTEM/frontend/src/components/common/OfficialPaymentGatewayModal.jsx), [`StudentDashboard.jsx`](file:///d:/version1/GBS_SYSTEM/frontend/src/modules/portal/pages/dashboards/student/StudentDashboard.jsx), [`ParentDashboard.jsx`](file:///d:/version1/GBS_SYSTEM/frontend/src/modules/portal/pages/dashboards/parent/ParentDashboard.jsx), [`AccountantDashboard.jsx`](file:///d:/version1/GBS_SYSTEM/frontend/src/modules/portal/pages/dashboards/accountant/AccountantDashboard.jsx), and [`PaymentGatewayAdminPanel.jsx`](file:///d:/version1/GBS_SYSTEM/frontend/src/components/common/PaymentGatewayAdminPanel.jsx) so Students can self-pay individual school bills or balances into the school's verified Bank Account / Official MoMo, Parents see both their own payments and their ward's self-payments, and the Accountant Dashboard reflects every Student & Parent payment live from PostgreSQL with Payer filters, audit receipts, and configurable School Bank & MoMo accounts.
- **Verification Verdict (Bundle `index-C4FRB9If.js`, Commit `2a7d9e4`):**
  - `11 / 11` end-to-end real Chrome CDP + PostgreSQL lifecycle checks passed (Accountant bank/MoMo config & Term 2 bill issuance → Student Bank Transfer + Accountant approval → Student MoMo Self-Payment → Parent visibility & Parent MoMo Payment → Accountant live DB audit ledger & immutable audit logs, `0` tooltips).
  - `18 / 18` backend upgrade regression checks passed in [`verify_upgrade_e2e.js`](file:///d:/version1/GBS_SYSTEM/backend/verify_upgrade_e2e.js).
  - `12 / 12` live Render production checks passed on `https://gbs-system.onrender.com` (Student Self-Payment → Parent sees ward self-payment & pays → Accountant live `/finance/payments` & `/payments/admin/overview` reflects both with exact Student Payee & Payer attribution + School Account/MoMo, strict `401` on unauthenticated access, live SPA routes `200 OK`).

---

## 14. 1.0x Real-Time Exam Invigilation Camera, Unlimited Custom Exam Scanner Question Count & Ghana NaCCA Teacher Lesson Planning and Vetting Suite (Nov 2026 — v2.17.0, Commits `678fb69` / `af70b90`)

- **Root Causes Resolved:**
  1. **Slow Exam Invigilation Camera:** [`StudentDashboard.jsx`](file:///d:/version1/GBS_SYSTEM/frontend/src/modules/portal/pages/dashboards/student/StudentDashboard.jsx) sequentially awaited a 1000ms heartbeat+messages timer (~0.5–1 FPS effective), while [`TeacherLiveProctoringPanel.jsx`](file:///d:/version1/GBS_SYSTEM/frontend/src/components/common/TeacherLiveProctoringPanel.jsx) swapped static `<img>` snapshots without WebRTC video or `document.body` portaling.
  2. **100-Question Scanner Cap:** [`TeacherDashboard.jsx`](file:///d:/version1/GBS_SYSTEM/frontend/src/modules/portal/pages/dashboards/teacher/TeacherDashboard.jsx) contained 7 hardcoded `Math.min(100, ...)` / `max="100"` caps, [`ExamScannerDashboard.jsx`](file:///d:/version1/GBS_SYSTEM/frontend/src/modules/exam-scanner/pages/ExamScannerDashboard.jsx) capped at `200`, and [`MobileCameraAIExamScannerModal.jsx`](file:///d:/version1/GBS_SYSTEM/frontend/src/components/common/MobileCameraAIExamScannerModal.jsx) capped `requiredQuestionCount` to the initial 5-item scheme.
  3. **Volatile & Incomplete Lesson Planning / Vetting:** [`academic.service.js`](file:///d:/version1/GBS_SYSTEM/backend/src/modules/academic/academic.service.js) kept `teacherLessonPlansStore` and `facultyDirectivesStore` only in volatile RAM without tenant filtering, draft/revision history, structured Ghana NaCCA 16-element educational fields, pedagogical quality alignment checks, or printable A4 PDF output.
- **Upgrades Applied:**
  - **1.0x Live Exam Invigilation:** Added ultra-fast RAM-only `POST /api/v1/ai-exam/proctor/frame` and protected WebRTC signaling (`POST /proctor/webrtc/signal`, `GET /proctor/webrtc/signals`) in [`aiExam.service.js`](file:///d:/version1/GBS_SYSTEM/backend/src/modules/ai-exam/aiExam.service.js), [`aiExam.controller.js`](file:///d:/version1/GBS_SYSTEM/backend/src/modules/ai-exam/aiExam.controller.js), and [`aiExam.routes.js`](file:///d:/version1/GBS_SYSTEM/backend/src/modules/ai-exam/aiExam.routes.js); upgraded `StudentDashboard.jsx` with 640×360@30fps capture, direct `1.0x` WebRTC responder + adaptive non-blocking ~10fps frame pump; upgraded `TeacherLiveProctoringPanel.jsx` with `playbackRate = 1.0` WebRTC video receiver, real-time `1.0x` speed/FPS badge, and `document.body` portaled modals.
  - **Custom Question Count in Exam Script Scanner:** Raised backend & frontend limits to `2000` custom questions (with decimal `0.25+` marks per question), free numeric input without backspace snap-back, quick preset chips (`20..200`), and 50-questions-per-page pagination in `TeacherDashboard.jsx`, `ExamScannerDashboard.jsx`, and `MobileCameraAIExamScannerModal.jsx`.
  - **Ghana NaCCA Lesson Planning & Vetting Suite:** Created idempotent PostgreSQL table bootstrapper [`ensureLessonPlanTables.js`](file:///d:/version1/GBS_SYSTEM/backend/src/core/database/ensureLessonPlanTables.js) (`teacher_lesson_plans` & `teacher_faculty_directives` with composite tenant indexes + `persistentStore` offline fallback + `AuditLog`), non-fabricating 6-template & 7-point pedagogical alignment engine [`lessonPlanQuality.util.js`](file:///d:/version1/GBS_SYSTEM/backend/src/modules/academic/lessonPlanQuality.util.js), complete tenant-isolated CRUD/Draft/Submit/Vet/Revise/Approve/Post-Lesson-Reflection APIs in [`academic.service.js`](file:///d:/version1/GBS_SYSTEM/backend/src/modules/academic/academic.service.js), [`academic.controller.js`](file:///d:/version1/GBS_SYSTEM/backend/src/modules/academic/academic.controller.js), and [`academic.routes.js`](file:///d:/version1/GBS_SYSTEM/backend/src/modules/academic/academic.routes.js), guided 5-step teacher studio [`TeacherLessonPlanStudio.jsx`](file:///d:/version1/GBS_SYSTEM/frontend/src/components/common/TeacherLessonPlanStudio.jsx), Headmaster structured vetting modal [`LessonNotesVettingModal.jsx`](file:///d:/version1/GBS_SYSTEM/frontend/src/components/common/LessonNotesVettingModal.jsx), and A4 print/PDF generator [`lessonPlanPrintHelper.js`](file:///d:/version1/GBS_SYSTEM/frontend/src/utils/lessonPlanPrintHelper.js).
- **Verification Verdict (Bundle `index-DUkwSuJg.js`):**
  - Local E2E API + PostgreSQL + Real Headless Chrome CDP passed 100%: strict `401` on unauthenticated calls, 10–20 FPS server proctor frame throughput & WebRTC signaling, portaled `1.0x` Live Exam Invigilation modal, 135-question custom answer key + `Q101–Q135` pagination + accurate grading (`91%`), full Ghana NaCCA 16-element lifecycle (`DRAFT` hidden from Admin → `SUBMIT` → `REVISION_REQUIRED` w/ itemized section comments → `RESUBMIT Rev #2` → `VETTED_APPROVED` → post-teaching reflection preserving approval + RBAC `403`s + audit delete protection), Mobile `390x844` responsiveness, `0` HTML tooltips, and `0` uncaught JS errors.
  - `18 / 18` regression checks passed in [`verify_upgrade_e2e.js`](file:///d:/version1/GBS_SYSTEM/backend/verify_upgrade_e2e.js).
  - `26 / 26` live Render production checks passed on `https://gbs-system.onrender.com` (Commits `678fb69` / `af70b90`, bundle `index-DUkwSuJg.js`): live SPA routes `200 OK`, strict `401` on unauthenticated access, live `1.0x` proctor frame + WebRTC signaling, custom `135`-question answer key, RBAC `403`s, 6 templates, quality check, Render PostgreSQL draft create/hide/delete, Headmaster `REVISION_REQUIRED` w/ section comments → Teacher Revise & Resubmit `Rev #2` → Headmaster `VETTED_APPROVED` → Teacher post-lesson reflection preserving `VETTED_APPROVED`.

---

## 15. Production Readiness Upgrade: Headmaster-Only Stationery Pricing RBAC, Separate School Clinic Dashboard (Doctors & Nurses Only), Secretary Real-Life Hero Office, 42 Jolly Phonics & 17-Country Alphabets, Active AI Voice & Global Page Navigation with Exact Scroll Restoration (Nov 2026 — v2.18.0, Commit `a2dc211`)

- **Root Causes Resolved:**
  1. **Stationery Pricing Leakage:** [`SchoolStationeryHubPanel.jsx`](file:///d:/version1/GBS_SYSTEM/frontend/src/components/common/SchoolStationeryHubPanel.jsx) derived role privileges from `currentUser?.role || mode`, leaking Headmaster add/edit price UI onto Teacher/Staff portals during Demo walkthrough; [`stationery.service.js`](file:///d:/version1/GBS_SYSTEM/backend/src/modules/stationery/stationery.service.js) allowed non-Headmaster expense recording.
  2. **School Clinic Separation & Privacy:** School Clinic lacked a dedicated Doctor/Nurse-only dashboard; `rbac.middleware.js` Demo Admin bypass allowed Headmaster demo requests through `restrictTo` onto clinic visit/inventory endpoints without controller-level clinic operator enforcement; [`SchoolClinicHubPanel.jsx`](file:///d:/version1/GBS_SYSTEM/frontend/src/components/common/SchoolClinicHubPanel.jsx) exposed a self-edit form for non-clinic staff.
  3. **Secretary Dashboard Blue Gap:** [`SecretaryDashboard.jsx`](file:///d:/version1/GBS_SYSTEM/frontend/src/modules/portal/pages/dashboards/secretary/SecretaryDashboard.jsx) used undefined CSS classes (`role-hero-showcase`, `role-kpi-strip`, `role-kpi-card`) instead of Blueprint classes, leaving an unstyled blue space.
  4. **42 Jolly Phonics & Country Alphabets Missing:** Language Translator had no 42 Jolly Phonics sounds module or country-organized alphabet/letter-writing practice studio.
  5. **Dull/Sleepy Voice AI Tone & Incomplete Portal Detail:** [`GBSVoiceAssistant.jsx`](file:///d:/version1/GBS_SYSTEM/frontend/src/components/common/GBSVoiceAssistant.jsx) defaulted to `0.88x` rate / `0.78–0.93` pitch and spoke long paragraphs in one flat utterance.
  6. **Global Page Navigation & Scroll Restoration Regressions:** [`globals.css`](file:///d:/version1/GBS_SYSTEM/frontend/src/styles/globals.css) kept the multi-row `.role-tab-nav` wall visible on dedicated module pages pushing module content below the fold; [`useDashboardTabSync.js`](file:///d:/version1/GBS_SYSTEM/frontend/src/hooks/useDashboardTabSync.js) overwrote `overviewTab` when pushing `:moduleId` routes so Back lost exact previous Overview tab/height; [`DashboardTabPageController.jsx`](file:///d:/version1/GBS_SYSTEM/frontend/src/components/common/DashboardTabPageController.jsx) matched nested `.role-tab-nav` bars and lacked touch/keyboard pre-nav capture and a compact module switcher; hardcoded `window.scrollTo(600/300)` calls existed in `TeacherDashboard.jsx` & `AdminDashboard.jsx`.
- **Upgrades Applied:**
  - **Headmaster-Only Stationery Pricing:** Locked [`SchoolStationeryHubPanel.jsx`](file:///d:/version1/GBS_SYSTEM/frontend/src/components/common/SchoolStationeryHubPanel.jsx) to mode-first Read-Only Listed Prices for Teachers, Secretaries, Clinic Doctors/Nurses, HR & Staff (zero add/edit/sale/expense controls), keeping Add Item & Edit Price strictly Headmaster-only alongside `403 Forbidden` enforcement in [`stationery.routes.js`](file:///d:/version1/GBS_SYSTEM/backend/src/modules/stationery/stationery.routes.js) and [`stationery.service.js`](file:///d:/version1/GBS_SYSTEM/backend/src/modules/stationery/stationery.service.js).
  - **Separate School Clinic Dashboard (Doctors & Nurses ONLY):** Added `CLINIC_DOCTOR` / `CLINIC_NURSE` to [`schema.prisma`](file:///d:/version1/GBS_SYSTEM/backend/prisma/schema.prisma), idempotent PostgreSQL `ALTER TYPE` in [`server.js`](file:///d:/version1/GBS_SYSTEM/backend/src/core/server.js), built-in auth in [`auth.middleware.js`](file:///d:/version1/GBS_SYSTEM/backend/src/middleware/auth.middleware.js) & [`auth.service.js`](file:///d:/version1/GBS_SYSTEM/backend/src/modules/auth/auth.service.js), controller+service `403` guards in [`clinic.controller.js`](file:///d:/version1/GBS_SYSTEM/backend/src/modules/clinic/clinic.controller.js), [`clinic.routes.js`](file:///d:/version1/GBS_SYSTEM/backend/src/modules/clinic/clinic.routes.js), [`clinic.service.js`](file:///d:/version1/GBS_SYSTEM/backend/src/modules/clinic/clinic.service.js), dedicated [`ClinicDashboard.jsx`](file:///d:/version1/GBS_SYSTEM/frontend/src/modules/portal/pages/dashboards/clinic/ClinicDashboard.jsx) (`/portal/clinic/dashboard/:moduleId?`) with real-life `/assets/real/school_clinic_medical.jpg`, and stripped self-edit from [`SchoolClinicHubPanel.jsx`](file:///d:/version1/GBS_SYSTEM/frontend/src/components/common/SchoolClinicHubPanel.jsx) (strictly read-only own medical health status for Headmaster, Teachers, Secretaries, Accountant, HR, Staff & Students).
  - **Secretary Real-Life Office Hero:** Rebuilt [`SecretaryDashboard.jsx`](file:///d:/version1/GBS_SYSTEM/frontend/src/modules/portal/pages/dashboards/secretary/SecretaryDashboard.jsx) with Blueprint `.role-hero-banner` + `.role-kpi-row` + full-bleed `/assets/real/secretary_office_desk.jpg` (`1376x768`, `minHeight: 340px`).
  - **42 Jolly Phonics & 17-Country Alphabets:** Created [`phonicsAndAlphabetsData.js`](file:///d:/version1/GBS_SYSTEM/frontend/src/utils/phonicsAndAlphabetsData.js) and [`PhonicsAndAlphabetsLearningStudio.jsx`](file:///d:/version1/GBS_SYSTEM/frontend/src/components/common/PhonicsAndAlphabetsLearningStudio.jsx) inside [`UniversalLanguageTranslatorModal.jsx`](file:///d:/version1/GBS_SYSTEM/frontend/src/components/common/UniversalLanguageTranslatorModal.jsx) covering all 42 Jolly Phonics sounds (Groups 1–7), all 17 system countries (Ghana Twi/Ga/Ewe, Nigeria Hausa/Yoruba, Kenya Kiswahili, South Africa isiZulu, UK, US, Canada, France, Germany, Spain, Brazil, UAE & Saudi Arabia 28-letter Arabic RTL, India Hindi Devanagari, China Pinyin/Hanzi, Japan Hiragana, Global), speech playback, and HTML5 canvas trace/write pad.
  - **Active Clear AI Voice & Detailed 10-Portal Knowledge:** Upgraded [`systemMemoryAssistant.service.js`](file:///d:/version1/GBS_SYSTEM/backend/src/modules/ai/systemMemoryAssistant.service.js) and [`GBSVoiceAssistant.jsx`](file:///d:/version1/GBS_SYSTEM/frontend/src/components/common/GBSVoiceAssistant.jsx) to crisp active non-rushed `1.02x` rate / `1.06` pitch (`Measured 0.94 / Active 1.02 / Brisk 1.08`), Neural/Natural voice priority, sentence-chunked utterances, and end-to-end roles & performance across all 10 portals (preserving Clinic privacy and Developer non-disclosure).
  - **Global Page Navigation & Exact Scroll Position Restoration (All 10 Institutional Dashboards, Strictly Excluding Developer Dashboard):** Hardened [`globalNavigationScrollManager.js`](file:///d:/version1/GBS_SYSTEM/frontend/src/utils/globalNavigationScrollManager.js), [`useDashboardTabSync.js`](file:///d:/version1/GBS_SYSTEM/frontend/src/hooks/useDashboardTabSync.js), [`DashboardTabPageController.jsx`](file:///d:/version1/GBS_SYSTEM/frontend/src/components/common/DashboardTabPageController.jsx), and [`globals.css`](file:///d:/version1/GBS_SYSTEM/frontend/src/styles/globals.css): hid primary overview `nav.role-tab-nav` on dedicated module pages, added compact `☰ Switch Module ▾` menu inside sticky Module Page Bar, preserved outgoing `overviewTab` + safe search/filter state + window & nested container scroll snapshots on `pointerdown`/`touchstart`/keyboard navigation, and removed hardcoded `window.scrollTo(600/300)` jumps in `TeacherDashboard.jsx` & `AdminDashboard.jsx`.
- **Verification Verdict (Bundle `index-Ct8wFWpW.js`, Commit `a2dc211`):**
  - `82 / 82` local API security/RBAC/Stationery/Clinic/AI checks + real Headless Chrome CDP Desktop (`1440x900`) & Mobile (`390x844`) verified across all 10 institutional dashboards + Developer exclusion (`0px` scroll restoration drift on App Back `260→260`, Browser Back `520→520`, Browser Forward `260→260`, nested container `140→140`, Mobile `480→480`; `0` native HTML tooltips; `0` uncaught JS errors).
  - `18 / 18` backend regression checks passed in [`verify_upgrade_e2e.js`](file:///d:/version1/GBS_SYSTEM/backend/verify_upgrade_e2e.js).
  - `29 / 29` live Render production checks passed on `https://gbs-system.onrender.com` (`index-Ct8wFWpW.js`, `0` failures).

---

## 16. Universal Software Reliability Standard, Exact HTTP Status Code Management, Dev-Control RBAC Hardening & Original Production Developer Dashboard (Nov 2026 — v2.19.0, Commit `d40876d`)

- **Full-System Route Audit:** Audited all **1,131 mounted Express API routes across 92 prefixes** and every internal API fetch handler across institutional and Developer dashboards.
- **Root Causes Resolved:**
  1. **Fake `200 OK` Error Masking:** [`error.middleware.js`](file:///d:/version1/GBS_SYSTEM/backend/src/middleware/error.middleware.js) explicitly coerced Prisma errors to `statusCode = 200`; [`devControl.controller.js`](file:///d:/version1/GBS_SYSTEM/backend/src/modules/dev-control/devControl.controller.js) swallowed delete/batch errors into fake `200` and returned a hardcoded fake backup (`gbs_enterprise_master_backup.sql.enc`); [`devControl.routes.js`](file:///d:/version1/GBS_SYSTEM/backend/src/modules/dev-control/devControl.routes.js) returned fake `200` in `/sync-to-cloud` catch; [`analytics.routes.js`](file:///d:/version1/GBS_SYSTEM/backend/src/modules/analytics/analytics.routes.js) silently swallowed DB errors into zero objects; [`server.js`](file:///d:/version1/GBS_SYSTEM/backend/src/core/server.js) lacked `405 Method Not Allowed` differentiation for `/api/*` and masked `/audit/logs` errors.
  2. **Developer Control Center Privilege Boundary Hole:** ~75 sensitive `/api/v1/dev-control/*` routes lacked `protect` + `restrictTo('DEVELOPER')`, and [`rbac.middleware.js`](file:///d:/version1/GBS_SYSTEM/backend/src/middleware/rbac.middleware.js) evaluated Demo Admin walkthrough bypasses before checking `DEVELOPER`-only and `CLINIC_DOCTOR`/`CLINIC_NURSE`-only boundaries, letting `admin@gbs.com` receive `200` on `/api/v1/dev-control/*`.
  3. **Developer Dashboard Mock/Demo Artifacts & Unauthenticated Fetches:** [`DeveloperDashboard.jsx`](file:///d:/version1/GBS_SYSTEM/frontend/src/modules/developer-platform/pages/DeveloperDashboard.jsx) exposed a Demo Trial Quota widget, sent `DEMO_SANDBOX` headers, made ~39 raw `fetch()` calls omitting Developer Bearer JWTs, prefilled fake phone numbers (`+233-24-555-0199`), passwords (`Headmaster2026!`), emails (`admin@gbs.edu` / `admin@school.edu`), names (`Prof. Arthur Sterling`), and biometric hashes (`SHA256-FACE-HM-*`), fabricated fake OTPs/local tenants/24.2 MB snapshots/geocoder enclaves on error, and substituted a fake animated webcam canvas when no camera was connected.
  4. **Hidden Prisma Schema Mismatches & Voice Assistant Build Glitch:** [`clinic.service.js`](file:///d:/version1/GBS_SYSTEM/backend/src/modules/clinic/clinic.service.js) queried non-existent `AdmissionApplication.isDeleted`; [`liveCall.service.js`](file:///d:/version1/GBS_SYSTEM/backend/src/modules/video/liveCall.service.js) selected non-existent `User.phone` instead of `registrationProfile.phone`; [`GBSVoiceAssistant.jsx`](file:///d:/version1/GBS_SYSTEM/frontend/src/components/common/GBSVoiceAssistant.jsx) had merge-duplicated lines blocking clean Vite build.
- **Upgrades Applied:**
  - **Backend HTTP Accuracy & Security:** Upgraded [`error.middleware.js`](file:///d:/version1/GBS_SYSTEM/backend/src/middleware/error.middleware.js), [`systemErrorHandler.js`](file:///d:/version1/GBS_SYSTEM/backend/src/rcce/systemErrorHandler.js), [`server.js`](file:///d:/version1/GBS_SYSTEM/backend/src/core/server.js) (adding Express route introspection for exact `405 Method Not Allowed` with `Allow` header + protecting `/audit/logs` & `/topic-videos` + validating `studentCount`), [`rbac.middleware.js`](file:///d:/version1/GBS_SYSTEM/backend/src/middleware/rbac.middleware.js) (strict non-bypassable `DEVELOPER` & Clinic exclusive guards), [`devControl.routes.js`](file:///d:/version1/GBS_SYSTEM/backend/src/modules/dev-control/devControl.routes.js), [`devControl.controller.js`](file:///d:/version1/GBS_SYSTEM/backend/src/modules/dev-control/devControl.controller.js), [`devControl.service.js`](file:///d:/version1/GBS_SYSTEM/backend/src/modules/dev-control/devControl.service.js), [`analytics.routes.js`](file:///d:/version1/GBS_SYSTEM/backend/src/modules/analytics/analytics.routes.js), [`clinic.service.js`](file:///d:/version1/GBS_SYSTEM/backend/src/modules/clinic/clinic.service.js), and [`liveCall.service.js`](file:///d:/version1/GBS_SYSTEM/backend/src/modules/video/liveCall.service.js).
  - **Original Production Developer Dashboard & Frontend Feedback:** Hardened [`DeveloperDashboard.jsx`](file:///d:/version1/GBS_SYSTEM/frontend/src/modules/developer-platform/pages/DeveloperDashboard.jsx) (`devFetch()` with Bearer JWT + forced `LIVE_PRODUCTION` headers, removed Demo Trial Quota & all hardcoded fake values/fallbacks/fake-success catches), [`axios.js`](file:///d:/version1/GBS_SYSTEM/frontend/src/api/client/axios.js) (forced `LIVE_PRODUCTION` for `isDevRoute` + complete exact HTTP status code feedback map), [`TopCenterSystemBanner.jsx`](file:///d:/version1/GBS_SYSTEM/frontend/src/components/common/TopCenterSystemBanner.jsx), [`UniversalDetailPage.jsx`](file:///d:/version1/GBS_SYSTEM/frontend/src/components/common/UniversalDetailPage.jsx), [`UniversalOpenNoticeHUD.jsx`](file:///d:/version1/GBS_SYSTEM/frontend/src/components/common/UniversalOpenNoticeHUD.jsx), and repaired [`GBSVoiceAssistant.jsx`](file:///d:/version1/GBS_SYSTEM/frontend/src/components/common/GBSVoiceAssistant.jsx).
- **Verification Verdict (Bundle `index-B5f4xRPA.js`, Commit `d40876d`):**
  - **Localhost Verification:** `111 / 111` passed (`96` Universal HTTP Status/RBAC/Dev Original Production/Institutional API checks + `15` Real Headless Chrome CDP checks across Developer Dashboard & all 10 institutional portals including Clinic Doctor & Clinic Nurse, `0` Prisma errors, `0` uncaught JS errors, `0` native HTML tooltips) + `18 / 18` regression checks in [`verify_upgrade_e2e.js`](file:///d:/version1/GBS_SYSTEM/backend/verify_upgrade_e2e.js).
  - **Live Render Production Verification (`https://gbs-system.onrender.com`):** `54 / 54` passed (`0` failures) — serving bundle `index-B5f4xRPA.js`, exact `200`/`400`/`401`/`403`/`404`/`405` (`Allow` header), live Developer Master Login + all 8 live Developer endpoints `200 OK` with zero fake phone/backup, strict `403` blocking Headmaster/Teacher/Secretary/Doctor from `/dev-control/metrics`, and full preservation of Stationery RBAC, School Clinic RBAC, Video Calls, and 42 Jolly Phonics AI Voice.

---

## 17. Purge of All 8 Fake Onboarding Forms & Residual Synthetic Records + Developer Dashboard Dedicated Full-Page Navigation & Exact Scroll Position Restoration (Nov 2026 — v2.20.0, Commit `19baee2`)

- **Root Causes Resolved:**
  1. **8 Fake Pending Onboarding Forms & Residual Test Data on Live & Local:** [`backend/data/gbs_persistent_store.json`](file:///d:/version1/GBS_SYSTEM/backend/data/gbs_persistent_store.json) (deployed directly to Render) contained 9 fake `Oxford Preparatory International Academy` onboarding entries (8 pending `isApproved: false` + 1 approved), 9 fake `oxford-prep.edu` registered users, fake Tenant #2, fake `intruder.chrome@test.com` intrusion/alert, and fake `Demo Student 1–10` clinic entries; local PostgreSQL held 44 historical synthetic `InstitutionRegistration` rows, 7 synthetic tenants, and 39 synthetic alerts; [`DeveloperDashboard.jsx`](file:///d:/version1/GBS_SYSTEM/frontend/src/modules/developer-platform/pages/DeveloperDashboard.jsx) re-merged stale `localStorage` copies onto live API responses and kept residual `DEV SANDBOX` labels and `|| 500` / `|| 2500` / `Sync Lag: 0.00ms` / `Anti-Spoofing: 99.4%` placeholders.
  2. **Developer Dashboard Page Navigation & Scroll-to-Top Bug:** [`DeveloperPlatform.css`](file:///d:/version1/GBS_SYSTEM/frontend/src/modules/developer-platform/pages/DeveloperPlatform.css) kept the multi-row `.dev-tab-navigation` wall, `TopCenterSystemBanner`, and `WindowControlsBar` visible on `.dev-module-page-active` so `window.scrollTo(0, 0)` scrolled users to the top over the navigation wall; [`DashboardTabPageController.jsx`](file:///d:/version1/GBS_SYSTEM/frontend/src/components/common/DashboardTabPageController.jsx) reset `window.history.scrollRestoration = "auto"` on Developer routes; and [`DeveloperDashboard.jsx`](file:///d:/version1/GBS_SYSTEM/frontend/src/modules/developer-platform/pages/DeveloperDashboard.jsx) overwrote saved scroll snapshots with `0` during `POP` transitions without tracking horizontal/nested scrollable containers or separating `overviewTab` from `:moduleId`.
- **Upgrades Applied:**
  - **Full Synthetic Data Purge & Protection:** Cleaned [`gbs_persistent_store.json`](file:///d:/version1/GBS_SYSTEM/backend/data/gbs_persistent_store.json) and local PostgreSQL, added `POST /api/v1/dev-control/maintenance/purge-synthetic-data` (`requireDev`) in [`devControl.routes.js`](file:///d:/version1/GBS_SYSTEM/backend/src/modules/dev-control/devControl.routes.js), added automatic browser `localStorage` synthetic-record purge + authoritative live-DB state hydration in [`DeveloperDashboard.jsx`](file:///d:/version1/GBS_SYSTEM/frontend/src/modules/developer-platform/pages/DeveloperDashboard.jsx), and removed all remaining `DEV SANDBOX` labels and hardcoded placeholder numbers.
  - **True Dedicated Full-Page Navigation & Exact `0px`-Drift Scroll Restoration on Developer Dashboard:** Hid overview sections, banners, and the multi-row `.dev-tab-navigation` wall on dedicated module routes (`/developer-control-center/dashboard/:moduleId`) in [`DeveloperPlatform.css`](file:///d:/version1/GBS_SYSTEM/frontend/src/modules/developer-platform/pages/DeveloperPlatform.css), added sticky `.dev-module-page-bar` with `← Back`, `🏠 Developer Overview`, compact `☰ Switch Module ▾` menu (all 19 modules), and `↗ Open in New Tab`, stopped [`DashboardTabPageController.jsx`](file:///d:/version1/GBS_SYSTEM/frontend/src/components/common/DashboardTabPageController.jsx) from resetting `scrollRestoration = "auto"` on Developer routes, and implemented self-contained `useLayoutEffect` multi-pass + `MutationObserver` vertical/horizontal/nested-container scroll restoration with `isRestoringRef` guard, pre-navigation `pointerdown`/`touchstart`/`keydown` capture, and separate `overviewTab` state.
- **Verification Verdict (Bundle `index-BnsgzZ-h.js`, Commit `19baee2`):**
  - **Localhost Real Chrome CDP (`1440x900` & Mobile `390x844`):** `17 / 17` passed (`0` failures) — `0` fake onboarding forms/intrusions/alerts, stale `localStorage` auto-purged, true dedicated module page (`overviewHidden=true`, `tabNavHidden=true`), `0px` drift on Developer App Back (`280→280`), Browser Back (`640→640`), Browser Forward (`280→280`), Mobile (`520→520`), direct URL refresh, plus Teacher/Headmaster/School Clinic (`380→380`), `0` tooltips, `0` JS errors.
  - **Live Render Production (`https://gbs-system.onrender.com`):** Verified live serving `index-BnsgzZ-h.js`, `POST /dev-control/maintenance/purge-synthetic-data` `200 OK`, `GET /dev-control/onboarding/pending` `count=0`, `GET /dev-control/security/intrusions` `count=0`, `GET /dev-control/tenants/onboarded` `hasOxford=false`, plus Real Headless Chrome CDP navigation & zero-fake-data pass directly against `https://gbs-system.onrender.com`.

---

## 18. Developer Tab Cleanup, 42 Jolly Phonics Exact Phonetic Sounds & Country Stroke-Order Writing Guides, Call Ringtones & Offline Missed-Call Prompts, Headmaster→Secretary Defaulters Checkup Loop, End-of-Term Exam Vetting, Real Canvas OMR Exam Scanner & Alumni Health Status (Nov 2026 — v2.21.0, Commits `610be1b` & `3701bbe`)

- **Root Causes Resolved & Upgrades Delivered:**
  1. **Developer Dashboard Cleanup & Universal Institutional Read-Only Health Status:** Removed `School Clinic Oversight` (`clinic`) & `Defaulters Compliance` (`defaulters`) tabs/panes/imports from [`DeveloperDashboard.jsx`](file:///d:/version1/GBS_SYSTEM/frontend/src/modules/developer-platform/pages/DeveloperDashboard.jsx); added missing read-only `🩺 My Health Status` tab (`<SchoolClinicHubPanel mode="SELF" />`) and fixed live-mode TDZ declaration order (`ALUMNI_LEDGER_DIRECTORY`) in [`AlumniDashboard.jsx`](file:///d:/version1/GBS_SYSTEM/frontend/src/modules/alumni/pages/AlumniDashboard.jsx) so all 10 institutional portals expose read-only personal health status while keeping Developer excluded.
  2. **42 Jolly Phonics Exact Phonetic Sounds + 17-Country Alphabet Visual Stroke-Order Writing Guides + AI Voice Teaching:** Created [`phonicsAudioEngine.js`](file:///d:/version1/GBS_SYSTEM/frontend/src/utils/phonicsAudioEngine.js) (Web Audio acoustic phoneme synthesizer for `/s/`, `/sh/`, `/f/`, `/z/`, `/v/`, `/h/`, `/θ/` + pure phonetic pronunciation engine never reading English letter names + numbered SVG stroke-order writing guides across Latin, Ghana `Ɛ Ɔ Ŋ Ɖ Ƒ Ɣ Ʋ`, Yoruba/Hausa, Arabic RTL, Hindi Devanagari Shirorekha, Chinese Hanzi, Japanese Hiragana) wired into [`phonicsAndAlphabetsData.js`](file:///d:/version1/GBS_SYSTEM/frontend/src/utils/phonicsAndAlphabetsData.js), [`PhonicsAndAlphabetsLearningStudio.jsx`](file:///d:/version1/GBS_SYSTEM/frontend/src/components/common/PhonicsAndAlphabetsLearningStudio.jsx), [`GBSVoiceAssistant.jsx`](file:///d:/version1/GBS_SYSTEM/frontend/src/components/common/GBSVoiceAssistant.jsx), and [`systemMemoryAssistant.service.js`](file:///d:/version1/GBS_SYSTEM/backend/src/modules/ai/systemMemoryAssistant.service.js).
  3. **Video & Voice Calls — Outgoing Ringback, Incoming Ringtone w/ Caller Name & Position, Offline Missed-Call Login Prompt & Live Microphones:** Created [`callRingtoneEngine.js`](file:///d:/version1/GBS_SYSTEM/frontend/src/utils/callRingtoneEngine.js) (`440Hz+480Hz` outgoing ringback, incoming telephone ringtone + mobile vibration + spoken Caller Full Name & Position); upgraded [`liveCall.service.js`](file:///d:/version1/GBS_SYSTEM/backend/src/modules/video/liveCall.service.js), [`video.controller.js`](file:///d:/version1/GBS_SYSTEM/backend/src/modules/video/video.controller.js), [`video.routes.js`](file:///d:/version1/GBS_SYSTEM/backend/src/modules/video/video.routes.js) (`initiatorPosition`/`targetPosition`, automatic `MISSED` status on unanswered hangup or 45s ring timeout, `GET /api/v1/video/calls/missed`, `PATCH /api/v1/video/calls/missed/:callId/acknowledge`), [`LiveCallLauncherAndReceiver.jsx`](file:///d:/version1/GBS_SYSTEM/frontend/src/components/common/LiveCallLauncherAndReceiver.jsx) (`[data-testid="missed-calls-alert-banner"]` login return-call prompt with `Return Video Call`, `Return Voice Call`, `Dismiss`), and [`LiveInSystemCallModal.jsx`](file:///d:/version1/GBS_SYSTEM/frontend/src/components/common/LiveInSystemCallModal.jsx) (`remoteAudioRef`, `availableMics` selector, `acquireAndBindMicTrack` transceiver `replaceTrack` + renegotiation, `{ audio: true }` fallback).
  4. **Headmaster → Secretary Defaulters Phone Checkup & Feedback Loop:** Enriched `getDefaultersReport` with `parentName`/`parentPhone` and added `POST/GET /api/v1/academic/defaulters-followups` & `PATCH /api/v1/academic/defaulters-followups/:id/report` in [`academic.service.js`](file:///d:/version1/GBS_SYSTEM/backend/src/modules/academic/academic.service.js), [`academic.controller.js`](file:///d:/version1/GBS_SYSTEM/backend/src/modules/academic/academic.controller.js), [`academic.routes.js`](file:///d:/version1/GBS_SYSTEM/backend/src/modules/academic/academic.routes.js); wired Headmaster alert/dispatch + live feedback table in [`StudentDefaultersCompliancePanel.jsx`](file:///d:/version1/GBS_SYSTEM/frontend/src/components/common/StudentDefaultersCompliancePanel.jsx) & [`AdminDashboard.jsx`](file:///d:/version1/GBS_SYSTEM/frontend/src/modules/portal/pages/dashboards/admin/AdminDashboard.jsx), and resilient Secretary checkup alert + clickable `tel:` links + report-back form in [`SecretaryDashboard.jsx`](file:///d:/version1/GBS_SYSTEM/frontend/src/modules/portal/pages/dashboards/secretary/SecretaryDashboard.jsx).
  5. **End-of-Term / Semester Exam Vetting & Real Mobile Camera Canvas OMR AI Exam Scanner:** Added `'HEADMASTER', 'PRINCIPAL'` to vetting `restrictTo(...)` in [`aiExam.routes.js`](file:///d:/version1/GBS_SYSTEM/backend/src/modules/ai-exam/aiExam.routes.js) and testids in [`ExamVettingHubPanel.jsx`](file:///d:/version1/GBS_SYSTEM/frontend/src/components/common/ExamVettingHubPanel.jsx). Created [`omrScriptExtractor.js`](file:///d:/version1/GBS_SYSTEM/frontend/src/utils/omrScriptExtractor.js) (HTML5 `<canvas>` optical bubble extraction, printable OMR sheet generator, deterministic evaluator) and upgraded [`aiExam.service.js`](file:///d:/version1/GBS_SYSTEM/backend/src/modules/ai-exam/aiExam.service.js), [`MobileCameraAIExamScannerModal.jsx`](file:///d:/version1/GBS_SYSTEM/frontend/src/components/common/MobileCameraAIExamScannerModal.jsx), [`TeacherDashboard.jsx`](file:///d:/version1/GBS_SYSTEM/frontend/src/modules/portal/pages/dashboards/teacher/TeacherDashboard.jsx) (isolated `scanningScript` busy state from shared background `loading` caught during live Render testing), and [`ExamScannerDashboard.jsx`](file:///d:/version1/GBS_SYSTEM/frontend/src/modules/exam-scanner/pages/ExamScannerDashboard.jsx) so Teachers enter **Preferred Correct Answer Key ONLY** and the scanner optically extracts student choices and lists exact **Questions Marked Correct**, **Questions Marked Wrong**, and **Final Score**.
  6. **PWA & Apple Mobile App Profile:** Bumped Service Worker & `/api/v1/app-version` to `gbs-cache-v2026.22` in [`sw.js`](file:///d:/version1/GBS_SYSTEM/frontend/public/sw.js) and [`server.js`](file:///d:/version1/GBS_SYSTEM/backend/src/core/server.js); verified `/manifest.json`, `/sw.js`, and `/api/v1/app/ios-webclip.mobileconfig` (valid Apple XML plist + crest icon, 103,546 bytes).
- **Verification Verdict (Bundle `index-Sa4PbT-n.js`, Commits `610be1b` & `3701bbe`):**
  - **Localhost Verification:** `36 / 36` passed (`0` failures) across static tooltip audit (`0` hits), PWA/Apple `.mobileconfig`, exact HTTP status codes (`200`/`201`/`401`/`403`/`404`/`405` w/ `Allow`), RBAC, Missed Calls, Defaulters Checkup Loop, Exam Vetting, AI Exam Scanner API & Real Headless Chrome CDP Canvas OMR extraction (`8/10` Correct `Q1, Q2, Q4, Q5, Q6, Q7, Q9, Q10` | `2/10` Wrong `Q3, Q8` | Final Score `8/10 Marks`), Phonics & Country Strokes, Alumni Health Status, `0` uncaught JS errors + `18 / 18` regression checks in [`verify_upgrade_e2e.js`](file:///d:/version1/GBS_SYSTEM/backend/verify_upgrade_e2e.js).
  - **Live Render Production Verification (`https://gbs-system.onrender.com`):** `33 / 33` passed (`0` failures) serving `index-Sa4PbT-n.js` & `gbs-cache-v2026.22`, including Real Chrome CDP optical Canvas OMR marking, Missed Call login Return-Call banner, Secretary Defaulters Phone Checkup alert, 42 Jolly Phonics & Country Stroke Guides, Alumni read-only Health Status, and `0` uncaught JS runtime exceptions.

---

## 19. Real-Time WebRTC Video/Voice Calling Reliability (incl. Developer + TURN Relay) & Complete Multi-Gateway School/Developer Payment Integration (Nov 2026 — v2.22.0)

- **Root Causes Resolved & Upgrades Delivered:**
  1. **WebRTC Real-Time Video & Voice Calling (All Users + Developer):**
     - Added `GET /api/v1/video/calls/ice-servers` in [`liveCall.service.js`](file:///d:/version1/GBS_SYSTEM/backend/src/modules/video/liveCall.service.js), [`video.controller.js`](file:///d:/version1/GBS_SYSTEM/backend/src/modules/video/video.controller.js), and [`video.routes.js`](file:///d:/version1/GBS_SYSTEM/backend/src/modules/video/video.routes.js) providing STUN + TURN relay servers (custom env TURN, Twilio NTS, and OpenRelay TCP/UDP ports 80/443) for reliable NAT/4G/Wi-Fi traversal.
     - Fixed `getCallState` in [`liveCall.service.js`](file:///d:/version1/GBS_SYSTEM/backend/src/modules/video/liveCall.service.js) to include `initiatorEmail` and use `< sinceIso` so same-millisecond ICE candidates are never dropped.
     - Fixed [`LiveInSystemCallModal.jsx`](file:///d:/version1/GBS_SYSTEM/frontend/src/components/common/LiveInSystemCallModal.jsx): Developer-safe `isMeInitiator` (matching `userId`, `email`, or `DEVELOPER` role), 45s non-destructive `getUserMedia` permission timeout, persistent single `remoteStreamRef` so video `ontrack` never drops audio, explicit autoplay-block detection with next-gesture auto-unlock, automatic re-offer when `participants.length` grows during polling, live ICE status indicator + `Reconnect Video/Audio` button, and removed hardcoded fallback phone number.
  2. **Multi-Gateway School & Developer Payment Integration:**
     - Configured designated GBS Developer Payment Destination (`0554594193`, MTN Mobile Money & supported Ghana networks via official merchant gateways, zero MoMo PIN collection) in [`payments.constants.js`](file:///d:/version1/GBS_SYSTEM/backend/src/modules/payments/payments.constants.js), [`payments.service.js`](file:///d:/version1/GBS_SYSTEM/backend/src/modules/payments/payments.service.js), [`OfficialPaymentGatewayModal.jsx`](file:///d:/version1/GBS_SYSTEM/frontend/src/components/common/OfficialPaymentGatewayModal.jsx), and [`PaymentGatewayAdminPanel.jsx`](file:///d:/version1/GBS_SYSTEM/frontend/src/components/common/PaymentGatewayAdminPanel.jsx).
     - Added Bank Deposit / Transfer Proof submission (`POST /api/v1/payments/:reference/bank-proof` & `/onboarding/:reference/bank-proof`) transitioning bank transfers strictly to `UNDER_REVIEW` until verified by an authorized finance officer (never auto-marked `SUCCESSFUL`).
     - Implemented automatic Student Access Management recalculation (`_recalculateStudentAccessClearance` in [`payments.reconciler.js`](file:///d:/version1/GBS_SYSTEM/backend/src/modules/payments/payments.reconciler.js) + `GET /api/v1/payments/student-clearance`) restoring eligible course registration & results viewing strictly from verified DB invoice balances while preserving unrelated disciplinary/academic/administrative holds, plus safe FK-checked `auditLog`/`notificationQueueItem` inserts preventing PostgreSQL `25P02` transaction aborts.
     - Added Developer Subscriptions revenue tracker tab in [`PaymentGatewayAdminPanel.jsx`](file:///d:/version1/GBS_SYSTEM/frontend/src/components/common/PaymentGatewayAdminPanel.jsx) and RFC-4180 CSV financial report export (`GET /api/v1/payments/reports/export`) in [`payments.reports.js`](file:///d:/version1/GBS_SYSTEM/backend/src/modules/payments/payments.reports.js).
- **Verification Verdict (Bundle `index-D9UpQVNf.js`):**
  - **Localhost Verification:** All 9 modified backend files passed `node --check`; end-to-end verification suite passed 6/6 suites (ICE/TURN provisioning, Developer <-> Headmaster signaling + same-ms ICE delivery, `0554594193` destination, MTN/Telecel/AT Money + duplicate webhook idempotency, Bank proof `UNDER_REVIEW` -> finance approval -> automatic student access clearance recalculation, Developer subscription tracker + CSV export); Vite build succeeded (`index-D9UpQVNf.js`), synced to `backend/public/`, `0` `title=` tooltips.









