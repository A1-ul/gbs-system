# GBS SCHOOL MANAGEMENT SYSTEM — Permanent Workspace Rules & Auto-Memory Protocol

These rules apply automatically in every session inside `d:\version1\GBS_SYSTEM`.

## 1. Mandatory Automatic Memory Save After Every Completed Job
Whenever you finish and verify any upgrade, bug fix, architectural change, or deployment in this repository, you MUST **automatically save the completed work into project memory without waiting for the user to remind you** before finishing your final response (and commit it with the job or immediately after):

1. **`backend/data/gbs_system_memory_snapshot.json`** (live JSON memory wired into `/api/v1/dev-control/system-memory` & Voice AI):
   - Update `version` and `savedAt` (UTC ISO timestamp).
   - Append a structured entry to `diagnosticCauseAndFixKnowledgeBase` (`issueCode`, `symptom`, `rootCause`, `resolution`, `status: "PERMANENTLY_GUARDED"`).
   - Update `verificationSummary` with the latest passing local & live checks and commit hash.
2. **`SYSTEM_MEMORY_AND_DIAGNOSTIC_REGISTRY.md`**:
   - Append a concise, dated section recording the completed feature/fix, root cause, modified files, commit hash, and exact test/verification results.
3. **`MASTER_SYSTEM_MEMORY_LEDGER.md`**:
   - Append a chronological Phase entry summarizing the delivered milestone and verification verdict.

## 2. Core Engineering & Safety Invariants
- **Do Not Break Working Code:** Keep every edit minimal, surgical, and backward-compatible. Never remove or regress existing working modules, routes, RBAC checks, Exam Vetting, Payment Gateways, Demo 10-entry parity, or Global Page Navigation & Scroll Restoration.
- **Zero Tooltips:** Never add HTML `title=` attributes or hover tooltip overlays anywhere in `frontend/src`.
- **Preserve Real Authentication & Security:** Never weaken `protect`, `tenantStatusGuard`, `tenantIsolationGuard`, or `restrictTo` to silence errors. Unauthenticated or tampered requests to protected endpoints (such as `/api/v1/video/calls/incoming`) must strictly remain `401 Unauthorized`, while authenticated users across all 10 dashboards must seamlessly receive `200 OK`.
- **Developer Portal Isolation:** Keep the Developer Dashboard excluded from institutional page-routing/scroll overrides and institutional language translation; never expose or prefill Developer credentials in UI inputs.

## 3. Build, Verification & Deployment SOP
- **Hosting Target:** Render ONLY (`https://gbs-system.onrender.com`), GitHub remote `https://github.com/A1-ul/gbs-system.git` (`origin/main`).
- **Frontend Build & Asset Sync:** After frontend changes, run `npm run build --prefix frontend` and sync `frontend/dist/*` into `backend/public/` so Express serves the unified SPA bundle.
- **Windows Shell:** PowerShell 5.1 does not support `&&`; chain commands with `; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE } ;`. Do not run `prisma generate` on Windows unless `schema.prisma` changed.
- **Clean Git Hygiene:** Never commit untracked `docs/GBS_SCHOOL_SYSTEM_GLOBAL_PROPOSAL.md` or local test mutations to `backend/data/gbs_persistent_store.json`.
- **Honest End-to-End Verification:** Verify backend syntax (`node --check`), API/browser behavior locally, and live HTTP status on `https://gbs-system.onrender.com` after pushing.
