# GBS Central System Response, Control and Communication Engine (GBS-RCCE)

**Architecture Version:** `2.0.0-ENTERPRISE`  
**Applicable Products:** `GBS_SCHOOL` (GBS School Management System), `GBS_EXAM` (GBS Examination System), `GBS_REAL_ESTATE` (GBS Real Estate Management System), `GBS_COMPANY` (GBS Company Management System).

---

## 1. Core Architectural Pillars (`backend/src/rcce/`)

1. **Central API & Response Engine (`responseEngine.js` & `responseCatalogue.js`)**
   - Automatically normalizes every `/api/v1/*` JSON response into the canonical envelope:
     ```json
     {
       "success": true,
       "code": "FINANCE_PAYMENT_SUCCESS",
       "message": "Payment received successfully.",
       "data": { ... },
       "errors": null,
       "timestamp": "2026-11-19T19:30:00.000Z",
       "requestId": "REQ-..."
     }
     ```
   - `RESPONSE_CATALOGUE` predefines deterministic operation codes, HTTP status codes, and standardized user-facing messages across Auth, Validation, Tenant Isolation, Admissions, Academics, Finance, School Clinic, University Operations, Direct SMS, Demo Trial Limits, Notifications, Idempotency, and Developer Control.
   - `inferOperationResponse(...)` maps any module endpoint + HTTP method + status code cleanly so no module emits undefined errors or false success confirmations.

2. **Central Business Rules Engine (`businessRulesEngine.js`)**
   - Validates mandatory request fields (`validateRequiredFields`).
   - Enforces strict multi-tenant isolation (`validateTenantIsolation` -> `403 TENANT_CROSS_ACCESS_FORBIDDEN`).
   - Enforces record ownership (`validateRecordOwnership`), roll call completeness (`validateAttendanceRules`), and system-wide maintenance locks (`503 SYSTEM_MAINTENANCE_ACTIVE`) with authorized Developer bypass.

3. **Event & Notification Engine (`eventNotificationEngine.js`)**
   - Broadcasts canonical domain events (`USER_REGISTERED`, `STUDENT_ADMITTED`, `PAYMENT_RECEIVED`, `PAYMENT_REJECTED`, `RECORD_UPDATED`, `REQUEST_SUBMITTED`, `REQUEST_APPROVED`, `REQUEST_REJECTED`, `REPORT_GENERATED`, `ACCOUNT_SUSPENDED`, `SUBSCRIPTION_EXPIRED`, `SYSTEM_ERROR_DETECTED`, `ATTENDANCE_COMPLETED`, `EXAM_SCORED`, `TOPIC_VIDEO_PUBLISHED`) in real time via Socket.IO and persists notifications across PostgreSQL and PersistentStore.

4. **User & Developer Control Engine (`userDeveloperControlEngine.js`)**
   - Publishes the unified 9-role RBAC Permission Matrix (`ROLE_PERMISSION_MATRIX`) and 4 institutional operating tiers (`NURSERY_TO_JHS`, `SENIOR_HIGH_SCHOOL`, `TECHNICAL`, `UNIVERSITY`).
   - Applies Developer Privacy Guard (`sanitizeRecordForDeveloper` + `logDeveloperSensitiveAccess`), redacting credentials/PINs/cards and requiring an explicit diagnostic reason before inspecting masked user records.

5. **Activity Tracking & Immutable Audit Engine (`auditTracker.js`)**
   - Records every mutating API request and security/system failure (`userId`, `userRole`, `tenantId`, `action`, `module`, `affectedRecord`, `outcome`, `details`, `ipAddress`, `requestId`, `createdAt`) across PostgreSQL `audit_logs` and PersistentStore `auditTrail`.

6. **Duplicate Operation & Idempotency Sentinel (`idempotencyProtection.js`)**
   - Protects payments, registrations, admissions, subscriptions, clinic visits, and university internship submissions against concurrent double-clicks (`409 DUPLICATE_SUBMISSION_DETECTED`) and duplicate client retries via `X-Idempotency-Key` (`200 IDEMPOTENT_TRANSACTION_REPLAYED`).

7. **System-Wide Central Error Handler (`systemErrorHandler.js`)**
   - Normalizes uncaught runtime errors, Prisma/PostgreSQL faults, 401/403/404/409/503 statuses without leaking internal SQL/credentials to ordinary users, while equipping verified `DEVELOPER` / `SUPER_ADMIN` accounts with endpoint diagnostics.

8. **Demo Sandbox Parity (`demoLimit.middleware.js` + `demoLimitGuard.js`)**
   - Runs identical production APIs and business rules for Demo Sandbox learners while enforcing a strict **10-entry trial cap per module** (`403 DEMO_TRIAL_LIMIT_REACHED` with per-module counters and live reset support).

---

## 2. Central RCCE API Endpoints (`/api/v1/rcce`)

| Method | Endpoint | Auth / Clearance | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/rcce/health` | Public | RCCE engine health & product metadata |
| `GET` | `/api/v1/rcce/catalogue` (`/response-catalogue`) | Public | Full predefined Response Catalogue filterable by category |
| `GET` | `/api/v1/rcce/demo-limits` | Public | Demo Sandbox 10-entry cap counters per module |
| `GET` | `/api/v1/rcce/system-status` | `DEVELOPER`, `SUPER_ADMIN`, `ADMIN` | Un-fabricated server, DB, tenancy, & Demo telemetry |
| `POST` | `/api/v1/rcce/maintenance-mode` | `DEVELOPER`, `SUPER_ADMIN` | Enable/disable global HTTP 503 maintenance mode |
| `GET` | `/api/v1/rcce/audit-trail` | Management Roles (tenant-scoped) / `DEVELOPER` | Filterable activity & outcome audit logs |
| `GET` | `/api/v1/rcce/error-monitor` | `DEVELOPER`, `SUPER_ADMIN` | Live `FAILED` and `BLOCKED` operation monitor |
| `GET` | `/api/v1/rcce/permission-matrix` | Authenticated (`protect`) | 9-role RBAC & 4-tier institution matrix |
| `POST` | `/api/v1/rcce/privacy-inspect` | `DEVELOPER` (explicit `reason` required) | Privacy-redacted user lookup with mandatory audit seal |
| `GET` | `/api/v1/rcce/notifications` | Authenticated (`protect`) | Tenant/user scoped notification queue |
| `PATCH` | `/api/v1/rcce/notifications/:id/read` | Authenticated (`protect`) | Mark notification as read |
| `POST` | `/api/v1/rcce/events` (`/events/emit`) | Authenticated (`protect`) | Dispatch canonical domain event & notification |
| `POST` | `/api/v1/rcce/validate-operation` | Authenticated (`protect`) | Pre-flight validation & tenant isolation check |

---

## 3. Reusing GBS-RCCE Across Future GBS Applications

```js
const { setupRcce, rcceCentralErrorHandler } = require('./rcce');

setupRcce(app, {
  productId: 'GBS_REAL_ESTATE', // or 'GBS_EXAM', 'GBS_COMPANY'
  productName: 'GBS Real Estate Management System'
});
// Mount product routes...
app.use(rcceCentralErrorHandler);
```
