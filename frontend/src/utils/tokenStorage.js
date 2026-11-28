import { getApiBaseUrl } from "../api/client/apiConfig";

function readCleanStorageValue(key) {
  try {
    const val = localStorage.getItem(key);
    if (!val || val === "null" || val === "undefined") return null;
    const trimmed = String(val).trim();
    return trimmed || null;
  } catch {
    return null;
  }
}

export function getActiveAuthToken({ isDeveloperContext = false } = {}) {
  const inDevPath =
    isDeveloperContext ||
    (typeof window !== "undefined" &&
      String(window.location?.pathname || "").startsWith("/developer"));

  if (inDevPath) {
    return (
      readCleanStorageValue("gbs_dev_token") ||
      readCleanStorageValue("gbs_token") ||
      readCleanStorageValue("gbs_access_token") ||
      null
    );
  }
  return (
    readCleanStorageValue("gbs_token") ||
    readCleanStorageValue("gbs_access_token") ||
    readCleanStorageValue("gbs_dev_token") ||
    null
  );
}

export function hasActiveAuthSession({ isDeveloperContext = false } = {}) {
  if (getActiveAuthToken({ isDeveloperContext })) return true;
  const refresh = readCleanStorageValue("gbs_refresh_token");
  if (refresh && !refresh.startsWith("gbs_local_refresh_") && !refresh.startsWith("gbs_builtin_refresh_")) {
    return true;
  }
  if (!isDeveloperContext && isBuiltInDemoUser()) {
    return true;
  }
  return false;
}

export function getAccessToken() {
  return getActiveAuthToken({ isDeveloperContext: false });
}

export function getRefreshToken() {
  return readCleanStorageValue("gbs_refresh_token");
}

export function getUser() {
  try {
    const raw = localStorage.getItem("gbs_user");
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

export function saveAuthSession(data = {}) {
  const accessToken = data.accessToken || data.token || null;
  const refreshToken = data.refreshToken || null;
  const user = data.user || null;

  if (accessToken) {
    localStorage.setItem("gbs_token", accessToken);
    localStorage.setItem("gbs_access_token", accessToken);
  }

  if (refreshToken) {
    localStorage.setItem("gbs_refresh_token", refreshToken);
  }

  const previousTenantId = localStorage.getItem("gbs_tenant_id");
  const newTenantId = user?.tenantId ? String(user.tenantId) : null;

  if (newTenantId) {
    localStorage.setItem("gbs_tenant_id", newTenantId);
  }

  if (user) {
    // Clear any stale Developer token when signing into a non-Developer school portal
    if (String(user.role || "").toUpperCase() !== "DEVELOPER") {
      try {
        localStorage.removeItem("gbs_dev_token");
        localStorage.removeItem("gbs_developer");
      } catch { }
    }
    // Exact school name propagation to all dashboards, reports, and banners
    const schoolName =
      user.institutionName ||
      user.schoolName ||
      user.tenantName ||
      user.tenant?.name ||
      user.institution;
    const isDeveloper = String(user.role || "").toUpperCase() === "DEVELOPER";

    if (schoolName && String(schoolName).trim() && !isDeveloper) {
      const cleanName = String(schoolName).trim();
      user.schoolName = cleanName;
      user.institutionName = cleanName;
      user.tenantName = cleanName;
      user.tenant = {
        ...(user.tenant || {}),
        name: cleanName
      };
      localStorage.setItem("gbs_report_school_name", cleanName);
      localStorage.setItem("gbs_tenant_name", cleanName);
      const tCode = String(user.tenantCode || user.tenant?.code || "").trim().toUpperCase();
      if (tCode) {
        localStorage.setItem(`gbs_school_name_${tCode}`, cleanName);
      }
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("gbs_school_name_updated", { detail: cleanName }));
      }
    }

    localStorage.setItem("gbs_user", JSON.stringify(user));

    if (user.role) {
      localStorage.setItem("gbs_auth_role", user.role);
    }

    const rawInstType = user.institutionType || user.tenant?.institutionType;
    if (rawInstType) {
      const upperInst = String(rawInstType).trim().toUpperCase();
      const normInst = upperInst.includes("UNIV") || upperInst.includes("TERTIARY")
        ? "UNIVERSITY"
        : upperInst.includes("TECH") || upperInst.includes("TVET") || upperInst.includes("VOCAT")
          ? "TECHNICAL"
          : upperInst.includes("SHS") || upperInst.includes("SENIOR")
            ? "SENIOR_HIGH_SCHOOL"
            : "NURSERY_TO_JHS";
      localStorage.setItem("gbs_institution_type", normInst);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("gbs_institution_type_changed", { detail: { type: normInst } }));
      }
    }

    // Determine and enforce unified system mode across all mode keys
    const previousMode = localStorage.getItem("gbs_system_mode") || localStorage.getItem("gbs_tenant_mode") || "";
    const isDemoUser = isBuiltInDemoUser(user);
    const nextMode = syncSystemModeFlags(isDemoUser ? "DEMO_SANDBOX" : "LIVE_PRODUCTION");

    if (accessToken) {
      localStorage.setItem("gbs_access_token", accessToken);
    }

    // If switching modes (Live <-> Demo) or switching tenants (Tenant A <-> Tenant B):
    // Purge shared un-scoped operational caches so institutions and modes stay 100% isolated.
    if ((previousMode && previousMode !== nextMode) || (previousTenantId && newTenantId && previousTenantId !== newTenantId)) {
      clearWorkspaceMutableKeys({
        clearBranding: Boolean(previousTenantId && newTenantId && previousTenantId !== newTenantId)
      });
    }
  }

  if (typeof window !== "undefined" && (accessToken || user)) {
    window.dispatchEvent(new CustomEvent("gbs_auth_session_updated"));
  }
}

export const DEMO_ACCOUNT_EMAILS = new Set([
  "admin@gbs.com",
  "teacher@gbs.com",
  "student@gbs.com",
  "parent@gbs.com",
  "accountant@gbs.com",
  "finance@gbs.com",
  "staff@gbs.com",
  "hr@gbs.com",
  "alumni@gbs.com",
  "secretary@gbs.com",
  "doctor@gbs.com",
  "nurse@gbs.com"
]);

export const DEMO_ACCOUNT_USERNAMES = new Set([
  "superadmin",
  "teacher1",
  "student1",
  "parent1",
  "finance1",
  "staff1",
  "hr1",
  "alumni1",
  "secretary1",
  "doctor1",
  "nurse1"
]);

export const DEMO_ACCOUNT_IDS = new Set([
  "usr_super_admin",
  "usr_superadmin",
  "usr_admin",
  "usr_admin_master",
  "usr_teacher_master",
  "usr_teacher1",
  "usr_student_master",
  "usr_student1",
  "usr_parent_master",
  "usr_parent1",
  "usr_accountant_master",
  "usr_accountant_alt",
  "usr_finance1",
  "usr_staff_master",
  "usr_staff1",
  "usr_hr_master",
  "usr_hr1",
  "usr_alumni_master",
  "usr_alumni1",
  "usr_secretary_master",
  "usr_secretary1",
  "usr_clinic_doctor_master",
  "usr_clinic_nurse_master"
]);

export const WORKSPACE_MUTABLE_KEYS = [
  "gbs_enrolled_students",
  "gbs_transport_assigned_students",
  "gbs_student_submissions",
  "gbs_student_submitted_exams",
  "gbs_daily_attendance_archives",
  "gbs_teacher_archived_weekly_attendance",
  "gbs_reconciled_payments",
  "gbs_classes",
  "gbs_hr_employees",
  "gbs_hr_leave_requests",
  "gbs_hr_audit_requests",
  "gbs_hr_audit_reports",
  "gbs_alumni_directory",
  "gbs_alumni_pledges_and_gifts",
  "gbs_saved_meetings",
  "gbs_admissions",
  "gbs_submitted_admissions",
  "gbs_exams",
  "gbs_teacher_published_exams",
  "gbs_teacher_exam_timetable",
  "gbs_teacher_lesson_plans",
  "gbs_assignments",
  "gbs_fee_structures",
  "gbs_student_invoices",
  "gbs_parent_teacher_messages",
  "gbs_admin_parent_messages",
  "gbs_universal_voice_notes",
  "gbs_parent_feedback_inbox",
  "gbs_accountant_increment_requests",
  "gbs_facility_tasks",
  "gbs_pending_staff_registrations",
  "gbs_offline_mutation_queue",
  "gbs_demo_entry_counters"
];

export function isBuiltInDemoUser(userOverride = null) {
  try {
    const u = userOverride || getUser() || {};
    if (!u || typeof u !== "object") return false;
    if (u.isDemo === true) return true;
    const email = String(u.email || "").trim().toLowerCase();
    const username = String(u.username || "").trim().toLowerCase();
    const id = String(u.id || u.userId || "").trim().toLowerCase();
    return DEMO_ACCOUNT_EMAILS.has(email) || DEMO_ACCOUNT_USERNAMES.has(username) || DEMO_ACCOUNT_IDS.has(id);
  } catch {
    return false;
  }
}

export function isDemoSandboxMode(userOverride = null) {
  try {
    const u = userOverride || getUser() || null;
    if (isBuiltInDemoUser(u)) return true;
    const role = String(u?.role || "").toUpperCase();
    if (u && (u.email || u.id) && role !== "DEVELOPER") {
      return false;
    }
    const sysMode = localStorage.getItem("gbs_system_mode");
    const tenantMode = localStorage.getItem("gbs_tenant_mode");
    const envMode = localStorage.getItem("gbs_environment_mode");
    if (sysMode === "DEMO_SANDBOX" || tenantMode === "DEMO_SANDBOX" || envMode === "SANDBOX") {
      return true;
    }
    if (sysMode === "LIVE_PRODUCTION" || tenantMode === "LIVE_PRODUCTION" || envMode === "PRODUCTION") {
      return false;
    }
    return localStorage.getItem("gbs_system_data_mode") === "DEMO_SANDBOX";
  } catch {
    return false;
  }
}

export function syncSystemModeFlags(mode = "LIVE_PRODUCTION") {
  const isDemo = mode === "DEMO_SANDBOX" || mode === "SANDBOX";
  const canonical = isDemo ? "DEMO_SANDBOX" : "LIVE_PRODUCTION";
  localStorage.setItem("gbs_system_mode", canonical);
  localStorage.setItem("gbs_tenant_mode", canonical);
  localStorage.setItem("gbs_environment_mode", isDemo ? "SANDBOX" : "PRODUCTION");
  return canonical;
}

export function clearWorkspaceMutableKeys({ clearBranding = false } = {}) {
  WORKSPACE_MUTABLE_KEYS.forEach((k) => {
    try { localStorage.removeItem(k); } catch { }
  });
  if (clearBranding) {
    ["gbs_custom_school_logo", "gbs_report_school_name", "gbs_tenant_name", "gbs_tenant"].forEach((k) => {
      try { localStorage.removeItem(k); } catch { }
    });
  }
}

export async function resetDemoSandboxData({ reloadPage = true } = {}) {
  clearWorkspaceMutableKeys({ clearBranding: false });
  syncSystemModeFlags("DEMO_SANDBOX");
  try {
    const base = getApiBaseUrl();
    await fetch(`${base}/auth/demo-reset`, { method: "POST" }).catch(() => { });
  } catch { }
  window.dispatchEvent(new CustomEvent("gbs_demo_reset"));
  window.dispatchEvent(new CustomEvent("gbs_demo_usage_updated"));
  if (reloadPage && typeof window !== "undefined") {
    window.location.reload();
  }
}

export function clearAuthStorage({ includeDeveloper = false } = {}) {
  try {
    const activeToken = getActiveAuthToken({ isDeveloperContext: includeDeveloper });
    const base = getApiBaseUrl();
    fetch(`${base}/auth/logout`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...(activeToken ? { Authorization: `Bearer ${activeToken}` } : {})
      },
      body: "{}"
    }).catch(() => { });
  } catch { }
  localStorage.removeItem("gbs_token");
  localStorage.removeItem("gbs_access_token");
  localStorage.removeItem("gbs_refresh_token");
  localStorage.removeItem("gbs_user");
  localStorage.removeItem("gbs_auth_role");
  localStorage.removeItem("gbs_tenant_id");
  localStorage.removeItem("gbs_tenant");
  if (includeDeveloper) {
    localStorage.removeItem("gbs_dev_token");
    localStorage.removeItem("gbs_developer");
    localStorage.removeItem("gbs_dev_console_locked");
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("gbs_auth_session_cleared"));
  }
}
