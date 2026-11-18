# GBS SCHOOL MANAGEMENT SYSTEM — COMPLETE ROLE, COMMAND & VIDEO WALKTHROUGH MANUAL

This manual documents every exact role, dashboard tab, button, action, payment workflow, mobile installation step, and video module across the live **GBS Enterprise School Management System**.

---

## 1. SYSTEM-WIDE TOP NAVIGATION BAR & UNIVERSAL CONTROLS

Every logged-in portal shares a unified top control bar (`WindowControlsBar` + `TopCenterSystemBanner`):
- **Back / Forward / Return Home**: Navigate between workspace views cleanly.
- **Full Display (`⛶`)**: Expands the active workspace to full screen.
- **Presentation Video (`🎬`)**: Opens the Role Walkthrough Video Modal (`CartoonRoleVideoHubModal`) or routes to `/presentation-engine`.
- **Operating Guide (`📖`)**: Opens the interactive step-by-step Role Operating Guide (`UniversalRoleGuideModal`) with tab-by-tab instructions.
- **Mobile App & Alerts (`📲`)**: Opens `MobileAppPushHubModal` for Android/iOS PWA Home-Screen Installation, `.apk` host package check, and Web Push notification setup.
- **Mode Switcher (Developer Sandbox vs Live Production)**: Clearly displays active mode so demo users learn the exact same workflow used in live production.
- **Sign Out (`🚪`)**: Securely clears session tokens and returns to `/login`.

---

## 2. MULTI-GATEWAY SCHOOL FEES PAYMENT WORKFLOW (PARENT, STUDENT, ACCOUNTANT, HEADMASTER, DEVELOPER)

GBS implements a provider-verified multi-gateway payment architecture supporting **Paystack** and **Hubtel** (covering **MTN Mobile Money**, **Telecel Cash**, **AT Money**, **Visa**, **Mastercard**), **Official Institutional Bank Transfer**, and an explicit **Test / Sandbox Mode** for QA and Demo learning:

1. **Fee Account Verification**: Opens `OfficialPaymentGatewayModal`, loads the student's verified institution, academic year, term, and database balance due (`GET /api/v1/payments/student-statement`).
2. **Amount & Channel Selection**: Supports Full Payment or policy-allowed Partial Payment. Only channels actually enabled for that school are shown.
3. **Ghanaian Phone Check & Security Rule**: Validates 10-digit Ghanaian mobile numbers (`024...`, `055...`, `020...`, `027...`, `+233...`). **GBS NEVER collects, stores, or transmits MoMo PINs, card numbers, CVVs, or card PINs.**
4. **Authorization & App-Not-Installed Fallback**:
   - Displays unique transaction reference (`GBS-FEE-...`) and real provider state (`CREATED`, `PENDING`, `REQUIRES_CUSTOMER_ACTION`, `PROCESSING`, `SUCCESSFUL`, `FAILED`, `CANCELLED`, `EXPIRED`, `REVERSED`, `REFUNDED`, `UNDER_REVIEW`).
   - Handset prompt, OTP entry (`POST /api/v1/payments/:ref/submit-otp`), USSD guidance returned by the provider, or **Open Official Secure Checkout Page** in browser if no mobile app is installed.
   - Users can switch cleanly to another supported payment method (`POST /api/v1/payments/:ref/fallback`) or cancel safely (`POST /api/v1/payments/:ref/cancel`).
5. **Server Verification, Signed Webhooks & Atomic Accounting**:
   - Return URLs (`/payment-callback`) never credit accounts on their own; they invoke server-to-server verification (`GET /api/v1/payments/:ref/verify`).
   - Signed webhooks (`x-paystack-signature` HMAC-SHA512 / Hubtel / Sandbox HMAC) deduplicate repeats, cross-check amount/currency/school, update `StudentInvoice` inside a DB transaction, issue an official printable `PaymentReceipt`, notify Parent/Accountant/Admin, and record `AuditLog`.

---

## 3. EXACT ROLES, TABS, COMMANDS & ACTIVITIES (ALL 10 ROLES)

### Role 1: Headmaster / School Administrator (`/portal/admin/dashboard`)
- **Video**: `/videos/video1_headmaster_role_guide.mp4`
- **Tabs**: `roster`, `hr_audits`, `attendanceCrossCheck`, `lessonVetting`, `planner`, `academics`, `admissions`, `communications`, `locator`, `circulars`, `inquiries`, `audits`, `feeApprovals`, `leadership`, `devDirectives`, `busTransport`, `cctv`.
- **Key Actions**: Set school branding & crest, approve staff/student admissions, vet teacher lesson notes, cross-check attendance archives, monitor CCTV feeds & school buses, review **Live Database Fee Collections & Financial Summary** + approve Accountant fee adjustments in `feeApprovals`.

### Role 2: Teacher (`/portal/teacher/dashboard`)
- **Video**: `/videos/video2_teacher_role_guide.mp4`
- **Tabs**: `attendance`, `classes`, `assignments`, `exams`, `scanner`, `communications`, `meetings`, `topicVideos`, `lessonPlans`, `transcripts`, `curriculum`, `profile`.
- **Key Actions**: Tick-by-tick student attendance with absent alerts, Multi-Format Question Bank (MCQ, Theory, True/False, Short Answer, Fill-in-Blank, Case Study), Exam Timetable publishing, Theory script marking, Mobile Camera Exam Script Scanner & marking assistant, Topic Video uploads.

### Role 3: Student (`/portal/student/dashboard`)
- **Video**: `/videos/video3_student_role_guide.mp4`
- **Tabs**: `timetable`, `assignments`, `exams`, `meetings`, `topicVideos`, `report-card`, `courses`, `alumni`, `library`, `fees-history`, `peer-chat`, `cooperative-conferencing`.
- **Key Actions**: View timetable, attend live classes & study groups, complete online exams, inspect real DB fee balance & settle school fees via **Official Multi-Gateway Payment Checkout** (`fees-history`), print receipts, download unlocked report cards.

### Role 4: Parent / Guardian (`/portal/parent/dashboard`)
- **Video**: `/videos/video4_parent_role_guide.mp4`
- **Tabs**: `admissions`, `locator`, `children`, `attendance`, `grades`, `fees`, `communications`, `meetings`.
- **Key Actions**: Switch linked children, check live attendance & grades, settle Term Tuition/Hostel balances via **Paystack / Hubtel MoMo, Card, or Bank Transfer** (`fees` tab) with Official Printable Receipts, share emergency GPS location (`locator`), message teachers.

### Role 5: Accountant / Bursar (`/portal/accountant/dashboard`)
- **Video**: `/videos/video5_accountant_role_guide.mp4`
- **Tabs**: `invoices`, `debtors`, `fee-structures`, `matrix`, `gateways`, `payments`, `expenses`, `statements`, `alumni-gifts`, `headmaster-procurement`.
- **Key Actions**:
  - **Payment Gateways (`gateways`)**: Verify transaction references directly with Paystack/Hubtel, configure school subaccounts/bank details, confirm verified commercial bank slips, record refunds/reversals, retry failed webhooks, and run `Sync Pending Transactions`.
  - **Statements & Audits (`statements`)**: Inspect **Daily / Weekly / Monthly / Termly** DB Financial Reports (Collections by gateway, Outstanding balances, Failed/Cancelled counts, Reversed/Refunded totals) alongside GAAP/IFRS Year-End Wrap.

### Role 6: HR Officer (`/portal/hr/dashboard`) & Role 7: Campus Staff (`/portal/staff/dashboard`)
- **Video**: `/videos/video6_staff_hr_role_guide.mp4`
- **HR Actions**: Staff directory, leave approvals, biometric attendance monitoring, salary grade & loan profiles, disciplinary/appraisal records.
- **Staff Actions**: Campus gate security QR turnstile, transport fleet & route monitoring, facility maintenance tickets, infirmary & hostel logs.

### Role 8: Alumni (`/portal/alumni/dashboard`)
- **Video**: `/videos/gbs_complete_system_roles_master_guide.mp4`
- **Actions**: Request official verified transcripts, verify academic credentials, pledge school endowment gifts (synced to Accountant ledger), alumni mentorship.

### Role 9: Inventory & Stores Officer (`/portal/inventory/dashboard`)
- **Video**: `/videos/gbs_complete_system_roles_master_guide.mp4`
- **Actions**: Real-time stock ledger, low-stock reorder alerts, FEFO batch tracking, departmental requisition approvals, supplier purchase orders.

### Role 10: Developer Control Center (`/developer-control-center/login` -> `/developer-control-center/dashboard`)
- **Video**: `/videos/video7_developer_role_guide.mp4` (and featured in Master Guide `/videos/gbs_complete_system_roles_master_guide.mp4`)
- **All 16 Tabs**:
  1. `onboarding` (**School Signups & Approvals**): Verify Headmaster details/photo/OTP, approve institutions to launch branded dashboards, assign subscription plan.
  2. `headmaster_verifications` (**Headmaster Photo Checks**): Review Headmaster identity replacement requests.
  3. `intrusion_sentinel` (**Login & Security Alerts**): Inspect unauthorized access logs & block hostile IPs.
  4. `headmaster_messages` (**Headmaster Messages**): Two-way direct technical messaging & SMS/WebRTC support with school heads.
  5. `rcce` (**Network & Server Control**): Remote runtime governance and emergency kill/lock switches.
  6. `telemetry` (**Server Health & Subscriptions**): Per-student billing metrics (GH₵ 3 Basic/JHS, GH₵ 5 SHS, GH₵ 10 University), 14-day advance notice, 7-day grace countdown, Auto-Lock enforcement, and **Platform Continuation MoMo `0554594193` (GABRIEL KUBI OSEI-APPIAH)** reconciliation & instant school unlock.
  7. `backups` (**Database Backups**): Create and restore encrypted system snapshots.
  8. `alerts` (**System Alerts**): Resolve server and error alerts.
  9. `deployments` (**App Releases**): Track live deployment versions and CI/CD release logs.
  10. `audit-logs` (**Activity History**): Immutable forensic ledger of sensitive actions.
  11. `licenses` (**School Licenses**): Manage license keys and student capacity quotas.
  12. `biometrics` (**Security & Face Access**): Configure optical biometric policy & PIN rotation.
  13. `locations` (**School Locations**): View registered schools on interactive GPS coordinates map.
  14. `multidb` (**Database & Recovery**): Inspect PostgreSQL primary/fallback connectivity health.
  15. `digitaltwin` (**Campus Map & Sensors**): Launch 3D Spatial Campus telemetry view.
  16. `payment_admin` (**Payment Gateways**): Global & per-school Paystack/Hubtel/Bank gateway mode (`TEST`/`LIVE`), subaccount routing, channel toggles, secret-masking verification, live transaction inspection, failed webhook retries, and missing-notification batch reconciliation.

---

## 4. MOBILE & TABLET USAGE GUIDE

- Responsive breakpoints automatically adapt headers, scrollable tab bars, stacked forms, touch-safe buttons, and horizontally scrollable tables across 360px phones, 768px tablets, and widescreen monitors.
- Install as a standalone app from any browser via **📲 Install / Mobile App** (`MobileAppPushHubModal.jsx`) using Chrome Android (`Install app`) or iPhone Safari (`Add to Home Screen`), or via hosted `.apk` package when `VITE_ANDROID_APK_URL` is deployed.
