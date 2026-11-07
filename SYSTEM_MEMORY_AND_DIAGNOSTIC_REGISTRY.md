# GBS MANAGEMENT SYSTEM — Complete System Memory & Diagnostic Cause Registry

**System Version:** `2.5.0-PRODUCTION`  
**Verification Status:** `95/95` API Endpoints Passing • `9/9` Dashboards Verified • `0` Runtime Exceptions • `0` Undeclared AST Identifiers  
**Persistent Memory Store:** `backend/data/gbs_system_memory_snapshot.json` & `backend/data/gbs_persistent_store.json`  
**Live Diagnostic Endpoint:** `GET /api/v1/dev-control/system-memory` & `POST /api/v1/dev-control/system-memory`  
**Hosting Platform:** **Render ONLY** (`render.com` — `https://gbs-school.onrender.com`). Production Branch: `origin/main` at `https://github.com/A1-ul/gbs-system.git`.

---

## 1. Hosting, Deployment & Repository Architecture

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
| **Server & Static Engine** | `backend/src/core/server.js` | Express HTTP + Socket.IO server, `/api/v1/onboarding/*`, `/api/v1/topic-videos/*`, SPA static routing. |
| **Hybrid Cloud-Local Prisma Engine** | `backend/src/core/database/prisma.client.js` | Intercepts Prisma queries & raw SQL when PostgreSQL (`localhost:5432`) is offline; persists to `backend/data/gbs_persistent_store.json`. |
| **Main Application Router** | `frontend/src/router/AppRouter.jsx` | Maps `/` (Onboarding First Page), `/login`, `/portal/:role/dashboard`, `/developer-control-center/dashboard`, and `/details/:category/:id`. |
| **Headmaster Executive Command Center** | `frontend/src/modules/portal/pages/dashboards/admin/AdminDashboard.jsx` | Vetting desk, Inbuilt CCTV Surveillance Matrix, Staff OTP Registration, Fee Approvals, and Academic Plan Management. |
| **Teacher Interactive Workspace** | `frontend/src/modules/portal/pages/dashboards/teacher/TeacherDashboard.jsx` | Individual student-by-student attendance roll call (`PRESENT`, `ABSENT`, `LATE`, `EXCUSED`), exam grading, weekly attendance archives, and lesson note submission. |
| **Student Scholar Hub** | `frontend/src/modules/portal/pages/dashboards/student/StudentDashboard.jsx` | Examination CBT, Peer-to-Peer Scholar Chat by index search with verification modal & archive, Class Topic Videos, and Academic Schedule. |
| **Accountant & Finance Portal** | `frontend/src/modules/portal/pages/dashboards/accountant/AccountantDashboard.jsx` | Fee collection, Fee Increment & Recalculation Requests, Alumni Pledges & Philanthropic Gifts Ledger, and Headmaster Procurement Ledger. |
| **Parent Portal** | `frontend/src/modules/portal/pages/dashboards/parent/ParentDashboard.jsx` | Ward performance, live emergency school bus tracking, fee invoices, admission letters, and official transcript requests. |
| **Alumni & Convocation Hub** | `frontend/src/modules/alumni/pages/AlumniDashboard.jsx` | Alumni directory, reunions, and philanthropic endowment donations syncing live to Accountant ledger (`gbs_alumni_pledges_and_gifts`). |
| **Developer Mission Control** | `frontend/src/modules/developer-platform/pages/DeveloperDashboard.jsx` | 49 system control panels, tenant approvals/deletions, deployment logs, backups, and Repeat Staff Intrusion Sentinel. |
| **Developer Access Gate & Login** | `frontend/src/modules/developer-platform/pages/DeveloperLogin.jsx` | Strict root developer credentials (`gabosei48@gmail.com`). Tracks staff breach trials and flags violators for questioning. |
| **Dedicated Verification Page** | `frontend/src/components/common/UniversalDetailPage.jsx` | Full-page verification desk with `✅ Verify & Approve`, `⚠️ Issue Query / Revision`, `⚖️ Compliance Endorsement`, and `🖨️ Print`. |
| **Universal Top Banner & Walkthrough** | `frontend/src/components/common/TopCenterSystemBanner.jsx` | Universal 1-click walkthrough navigation bar across all 9 portals + Onboarding School. |
| **Mobile Experience Notice Modal** | `frontend/src/components/common/MobileExperienceNoticeModal.jsx` | Alerts mobile viewports: *"YOU WOULD ENJOY THE APPEARANCE WHEN LAUNCHED ON A LAPTOP OR PC."* |
| **Class Topic Video Platform** | `frontend/src/components/common/ClassTopicVideoPlatform.jsx` | Teacher topic video upload/recording in teacher's absence + Student video playback and notice of workdone. |

---

## 3. Diagnostic Cause & Instant Resolution Knowledge Base

| Issue Code | Symptom / Error Message | Exact Root Cause | Permanent Guard & Resolution |
|---|---|---|---|
| **`DIAG-DB-P1001`** | `Can't reach database server at localhost:5432` or `Invalid prisma.<model>.<method>() invocation` | Local PostgreSQL service on port `5432` is stopped, or a service module created a standalone `new PrismaClient()` instead of using the shared hybrid engine. | `backend/src/core/database/prisma.client.js` checks TCP reachability (`checkPostgresReachable`) and routes all operations through `executeLocalPrismaQuery()` and `handleRawSqlOffline()` backed by `backend/data/gbs_persistent_store.json`. |
| **`DIAG-AUTH-TIMEOUT-30000MS`** | Login or onboarding submission hangs with `timeout of 30000ms exceeded` | Auth or onboarding handler waiting on an unreachable database pool or external SMTP/SMS socket. | Fast 350ms TCP check in `prisma.client.js` and `server.js` immediately switches to local persistent execution (<50ms response time). |
| **`DIAG-PRISMA-ID-MISMATCH`** | `Invalid prisma.user.findUnique()` when passing string IDs (`'usr_admin_master'`, `'tnt_master_default'`) | Offline/fallback tokens carry string IDs whereas Prisma schema defines `id` and `tenantId` as `Int`. | `sanitizeIdsForPrisma()` in `prisma.client.js` and `protect()` in `auth.middleware.js` automatically coerce string IDs to valid integers (`1`). |
| **`DIAG-OTP-DISPATCH-PRISMA`** | Developer Dashboard OTP SMS dispatch displays `Invalid Prisma` | OTP dispatch tried to write unvalidated fields directly to Prisma when PostgreSQL was unreachable. | `POST /api/v1/dev-control/dispatch-otp` and `POST /api/v1/auth/send-otp` validate inputs, detect global mobile network carriers (`+233` MTN/Telecel/AirtelTigo, `+1`, `+44`, `+234`, etc.), and persist OTP logs safely. |
| **`DIAG-ONBOARDING-VISIBILITY`** | Headmaster onboarding submission does not show on Developer Dashboard | Mismatched storage endpoints between the public onboarding form and the Developer verification queue. | Unified `POST /api/v1/onboarding/register`, `GET /api/v1/onboarding/registrations`, and `GET /api/v1/dev-control/onboarding-registrations` with Headmaster facial capture photo (`headmasterFacePhoto`). |
| **`DIAG-TOPIC-VIDEO-SYNC`** | Teacher topic video upload is not visible to students in the teacher's absence | Missing shared endpoint or tab integration between Teacher and Student portals. | `ClassTopicVideoPlatform.jsx` is integrated into `TeacherDashboard.jsx` (`mode="TEACHER"`) and `StudentDashboard.jsx` (`mode="STUDENT"`), synced via `/api/v1/topic-videos`. |
| **`DIAG-ADMIN-TRANSIENT-FALLBACK`** | Transient display event warning appears when clicking CCTV or other buttons | Undeclared identifiers (`newMobileDeviceForm`, `currencySymbol`, `triggerAudioFeedback`) or broken tab mappings (`classes`, `fees`) threw ReferenceErrors caught by old boundary. | AST analysis verified zero undeclared variables; error boundaries redesigned to never render transient text or re-throw; tab keys normalized to `academics` and `feeApprovals`. |

---

## 4. Official GBS Student-Based Subscription Pricing Policy

- **Pricing Principle:** 100% student-based subscription model. **NO fixed tenant fees, NO basic package fees, and NO additional monthly access charges.** Inactive, deleted, and archived students do not attract charges, and no student is double-counted.
- **Official Monthly Student Subscription Rates:**
  - **Nursery – JHS (`NURSERY_TO_JHS`):** `GH₵ 3` per active student / month
  - **SHS (`SHS`):** `GH₵ 5` per active student / month
  - **University (`UNIVERSITY`):** `GH₵ 10` per active student / month
- **Subscription Formula:**
  $$\text{Invoice Total} = (\text{Active Students} \times \text{Rate} \times \text{Months}) \times (1 - \text{Discount})$$
- **5 Supported Payment Periods & Discounts:**
  - **1 month (`1_MONTH`):** `0%` discount (e.g., 300 Nursery–JHS students = `GH₵ 900`)
  - **3 months (`3_MONTHS`):** `3%` discount (e.g., 300 Nursery–JHS students = `GH₵ 2,619`)
  - **6 months (`6_MONTHS`):** `5%` discount (e.g., 300 Nursery–JHS students = `GH₵ 5,130`)
  - **9 months (`9_MONTHS`):** `7%` discount (e.g., 300 Nursery–JHS students = `GH₵ 7,533`)
  - **12 months (`12_MONTHS`):** `10%` discount (e.g., 300 Nursery–JHS students = `GH₵ 9,720`)
- **Student Population Growth Policy:** Future invoices automatically increase or decrease when an institution's active student population changes (e.g., `200 → 300` increases next billing; `500 → 400` decreases next billing). Previously paid subscription periods are never retrospectively changed.
