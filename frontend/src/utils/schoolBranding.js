const GENERIC_PLACEHOLDER_NAMES = new Set([
  "st. augustine international academy",
  "st. augustine science academy",
  "within de brain academy",
  "gbs international school",
  "gbs educational institution (main campus)",
  "gbs school management system"
]);

export function getStoredUser() {
  try {
    const raw = localStorage.getItem("gbs_user");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function isDeveloperUser(userOverride = null) {
  const u = userOverride || getStoredUser();
  const role = String(u?.role || localStorage.getItem("gbs_auth_role") || "").toUpperCase();
  const path = typeof window !== "undefined" ? String(window.location?.pathname || "").toLowerCase() : "";
  if (path.includes("/developer")) return true;
  return role === "DEVELOPER";
}

/**
 * Resolves the exact registered school name for the active tenant.
 * - On the Developer Dashboard, always returns "GBS SCHOOL MANAGEMENT SYSTEM".
 * - On all Tenant Dashboards (Headmaster/Admin, Teacher, Student, Parent, Accountant, Staff, HR, Alumni)
 *   and on all Official School Documents, returns the exact school name registered by the tenant (e.g., "BEST KIDS").
 */
export function getActiveSchoolName(options = {}) {
  const { isDeveloper = false, user = null, fallback = "GBS REGISTERED INSTITUTION" } = options;

  if (isDeveloper || isDeveloperUser(user)) {
    return "GBS SCHOOL MANAGEMENT SYSTEM";
  }

  const u = user || getStoredUser();
  const userTenantCode = String(u?.tenantCode || u?.tenant?.code || "").trim().toUpperCase();
  const userEmail = String(u?.email || "").trim().toLowerCase();

  // 1. Check tenant-specific custom school name saved by Admin
  if (userTenantCode) {
    const byCode = localStorage.getItem(`gbs_school_name_${userTenantCode}`);
    if (byCode && byCode.trim()) return byCode.trim();
  }

  // 2. Check explicit school name on the logged-in user object
  const fromUser =
    u?.schoolName ||
    u?.institutionName ||
    u?.tenantName ||
    u?.tenant?.name ||
    u?.institution;

  if (fromUser && String(fromUser).trim()) {
    const cleanFromUser = String(fromUser).trim();
    if (!GENERIC_PLACEHOLDER_NAMES.has(cleanFromUser.toLowerCase()) || userTenantCode === "GBS-MAIN") {
      return cleanFromUser;
    }
  }

  // 3. Look up in onboarding applications / archived tenants by user email or tenantCode
  try {
    const incoming = JSON.parse(localStorage.getItem("gbs_incoming_onboarding_applications") || "[]");
    const archived = JSON.parse(localStorage.getItem("gbs_archived_onboarded_tenants") || "[]");
    const allApps = [...incoming, ...archived];
    const matchedApp = allApps.find((app) => {
      const codeHit =
        userTenantCode &&
        (String(app.tenantCode || "").toUpperCase() === userTenantCode ||
          String(app.assignedTenantCode || "").toUpperCase() === userTenantCode);
      const emailHit =
        userEmail &&
        [app.headmasterEmail, app.adminEmail, app.officialEmail, app.repEmail]
          .filter(Boolean)
          .some((e) => String(e).trim().toLowerCase() === userEmail);
      return codeHit || emailHit;
    });
    if (matchedApp?.institutionName && String(matchedApp.institutionName).trim()) {
      return String(matchedApp.institutionName).trim();
    }
  } catch {}

  // 4. Check global gbs_report_school_name or gbs_tenant_name
  const storedReportName = localStorage.getItem("gbs_report_school_name");
  if (storedReportName && storedReportName.trim()) {
    return storedReportName.trim();
  }

  const storedTenantName = localStorage.getItem("gbs_tenant_name");
  if (storedTenantName && storedTenantName.trim()) {
    return storedTenantName.trim();
  }

  if (fromUser && String(fromUser).trim()) {
    return String(fromUser).trim();
  }

  return fallback;
}

export function getActiveSchoolLogo(userOverride = null) {
  const u = userOverride || getStoredUser();
  const userTenantCode = String(u?.tenantCode || u?.tenant?.code || "").trim().toUpperCase();
  if (userTenantCode) {
    const tenantLogo = localStorage.getItem(`gbs_custom_school_logo_${userTenantCode}`);
    if (tenantLogo) return tenantLogo;
  }
  return (
    localStorage.getItem("gbs_custom_school_logo") ||
    u?.schoolLogo ||
    u?.institutionLogo ||
    u?.tenant?.logo ||
    null
  );
}

export function saveActiveSchoolBranding({ schoolName, schoolLogo, userOverride = null }) {
  const u = userOverride || getStoredUser();
  const userTenantCode = String(u?.tenantCode || u?.tenant?.code || "").trim().toUpperCase();

  if (schoolName && String(schoolName).trim()) {
    const cleanName = String(schoolName).trim();
    localStorage.setItem("gbs_report_school_name", cleanName);
    localStorage.setItem("gbs_tenant_name", cleanName);
    if (userTenantCode) {
      localStorage.setItem(`gbs_school_name_${userTenantCode}`, cleanName);
      localStorage.setItem(`gbs_school_name_confirmed_${userTenantCode}`, "true");
    }
    localStorage.setItem("gbs_school_name_confirmed", "true");

    if (u) {
      const updatedUser = {
        ...u,
        schoolName: cleanName,
        institutionName: cleanName,
        tenantName: cleanName,
        tenant: {
          ...(u.tenant || {}),
          name: cleanName
        }
      };
      localStorage.setItem("gbs_user", JSON.stringify(updatedUser));
    }

    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("gbs_school_name_updated", { detail: cleanName }));
    }
  }

  if (schoolLogo !== undefined) {
    if (schoolLogo) {
      localStorage.setItem("gbs_custom_school_logo", schoolLogo);
      if (userTenantCode) {
        localStorage.setItem(`gbs_custom_school_logo_${userTenantCode}`, schoolLogo);
        localStorage.setItem(`gbs_school_logo_confirmed_${userTenantCode}`, "true");
      }
      localStorage.setItem("gbs_school_logo_confirmed", "true");
    } else {
      localStorage.removeItem("gbs_custom_school_logo");
      if (userTenantCode) {
        localStorage.removeItem(`gbs_custom_school_logo_${userTenantCode}`);
      }
    }
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("gbs_school_logo_updated", { detail: schoolLogo }));
    }
  }
}

export function getSchoolBrandingNotificationState(userOverride = null) {
  const u = userOverride || getStoredUser();
  const userTenantCode = String(u?.tenantCode || u?.tenant?.code || "").trim().toUpperCase();
  const hasLogo = Boolean(
    (userTenantCode && localStorage.getItem(`gbs_custom_school_logo_${userTenantCode}`)) ||
      localStorage.getItem("gbs_custom_school_logo")
  );
  const hasConfirmedName = Boolean(
    (userTenantCode && localStorage.getItem(`gbs_school_name_confirmed_${userTenantCode}`) === "true") ||
      localStorage.getItem("gbs_school_name_confirmed") === "true"
  );
  return {
    hasLogo,
    hasConfirmedName,
    needsSetup: !hasLogo || !hasConfirmedName
  };
}

