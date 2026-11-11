export function getAccessToken() {
  return localStorage.getItem("gbs_token") || null;
}

export function getRefreshToken() {
  return localStorage.getItem("gbs_refresh_token") || null;
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
    localStorage.setItem("gbs_user", JSON.stringify(user));

    if (user.role) {
      localStorage.setItem("gbs_auth_role", user.role);
    }

    // Exact school name propagation to all dashboards, reports, and banners
    const schoolName = user.institutionName || user.tenantName || user.institution || user.schoolName;
    if (schoolName && String(schoolName).trim()) {
      const cleanName = String(schoolName).trim();
      localStorage.setItem("gbs_report_school_name", cleanName);
      localStorage.setItem("gbs_tenant_name", cleanName);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("gbs_school_name_updated", { detail: cleanName }));
      }
    }

    // Determine and enforce system mode
    const isDemoUser = user.email === "admin@gbs.com" || user.email === "teacher@gbs.com" || user.email === "student@gbs.com" || user.isDemo === true;
    if (isDemoUser) {
      localStorage.setItem("gbs_system_mode", "DEMO_SANDBOX");
    } else {
      localStorage.setItem("gbs_system_mode", "LIVE_PRODUCTION");
    }

    // If switching tenants or logging into a real production school:
    // Purge previous tenant's cached data so new school starts with pristine clean state (0 fake data)
    if (previousTenantId && newTenantId && previousTenantId !== newTenantId && !isDemoUser) {
      localStorage.removeItem("gbs_enrolled_students");
      localStorage.removeItem("gbs_transport_assigned_students");
      localStorage.removeItem("gbs_student_submissions");
      localStorage.removeItem("gbs_daily_attendance_archives");
      localStorage.removeItem("gbs_teacher_archived_weekly_attendance");
      localStorage.removeItem("gbs_reconciled_payments");
      localStorage.removeItem("gbs_classes");
    }
  }
}

export function clearAuthStorage() {
  localStorage.removeItem("gbs_token");
  localStorage.removeItem("gbs_refresh_token");
  localStorage.removeItem("gbs_user");
  localStorage.removeItem("gbs_tenant_id");
}
