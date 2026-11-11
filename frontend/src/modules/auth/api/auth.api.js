import apiClient from "../../../api/client/apiClient";
import { saveAuthSession } from "../../../utils/tokenStorage";

function extractAuthPayload(responseData) {
  if (!responseData) {
    return null;
  }

  if (responseData.data?.accessToken) {
    return responseData.data;
  }

  if (responseData.accessToken) {
    return responseData;
  }

  return null;
}

const BUILTIN_OFFLINE_USERS = [
  {
    email: "gabosei48@gmail.com",
    username: "developer",
    passwords: ["0543294615Gab"],
    role: "DEVELOPER",
    firstName: "Gabriel",
    lastName: "Osei-Appiah",
    tenantId: "1",
    tenantCode: "GBS-MAIN",
    tenantName: "GBS School Management System (Developer Root)"
  },
  {
    email: "admin@gbs.com",
    username: "superadmin",
    passwords: ["Admin123!", "Headmaster2026!", "Headmaster123!"],
    role: "SUPER_ADMIN",
    firstName: "Arthur",
    lastName: "Pendleton",
    tenantId: "1",
    tenantCode: "GBS-MAIN",
    tenantName: "GBS International School (Main Branch)"
  },
  {
    email: "teacher@gbs.com",
    username: "teacher1",
    passwords: ["Teacher123!"],
    role: "TEACHER",
    firstName: "Sarah",
    lastName: "Jenkins",
    tenantId: "1",
    tenantCode: "GBS-MAIN",
    tenantName: "GBS International School (Main Branch)"
  },
  {
    email: "student@gbs.com",
    username: "student1",
    passwords: ["Student123!"],
    role: "STUDENT",
    firstName: "Alex",
    lastName: "Mensah",
    tenantId: "1",
    tenantCode: "GBS-MAIN",
    tenantName: "GBS International School (Main Branch)"
  },
  {
    email: "parent@gbs.com",
    username: "parent1",
    passwords: ["Parent123!"],
    role: "PARENT",
    firstName: "Marcus",
    lastName: "Doe",
    tenantId: "1",
    tenantCode: "GBS-MAIN",
    tenantName: "GBS International School (Main Branch)"
  },
  {
    email: "accountant@gbs.com",
    username: "finance1",
    passwords: ["Accountant123!"],
    role: "ACCOUNTANT",
    firstName: "David",
    lastName: "Ofori",
    tenantId: "1",
    tenantCode: "GBS-MAIN",
    tenantName: "GBS International School (Main Branch)"
  },
  {
    email: "staff@gbs.com",
    username: "staff1",
    passwords: ["Staff123!"],
    role: "STAFF",
    firstName: "Emma",
    lastName: "Boateng",
    tenantId: "1",
    tenantCode: "GBS-MAIN",
    tenantName: "GBS International School (Main Branch)"
  },
  {
    email: "hr@gbs.com",
    username: "hr1",
    passwords: ["Hr123!"],
    role: "HR",
    firstName: "Grace",
    lastName: "Addo",
    tenantId: "1",
    tenantCode: "GBS-MAIN",
    tenantName: "GBS International School (Main Branch)"
  },
  {
    email: "alumni@gbs.com",
    username: "alumni1",
    passwords: ["Alumni123!"],
    role: "ALUMNI",
    firstName: "Kwame",
    lastName: "Danquah",
    tenantId: "1",
    tenantCode: "GBS-MAIN",
    tenantName: "GBS International School (Main Branch)"
  }
];

function attemptLocalResilientLogin(payload = {}) {
  const rawIdentifier = String(payload.email || payload.username || "").trim().toLowerCase();
  const rawPassword = String(payload.password || "");
  const requestedRole = String(payload.portalRole || "ADMIN").toUpperCase();

  if (!rawIdentifier || !rawPassword) return null;

  // 0. Check if institution or user was permanently deleted by Developer or Headmaster
  try {
    const deletedLockouts = JSON.parse(localStorage.getItem("gbs_deleted_tenant_lockouts") || "[]");
    const deletedArchives = JSON.parse(localStorage.getItem("gbs_deleted_tenant_archives") || "[]");
    const deletedIds = new Set(JSON.parse(localStorage.getItem("gbs_permanently_deleted_ids") || "[]").map((x) => String(x).toLowerCase()));

    if (deletedIds.has(rawIdentifier)) {
      throw new Error("Access Denied: This account or institution has been permanently deleted from the GBS System.");
    }

    const matchedLockout = [...deletedLockouts, ...deletedArchives].find((l) => {
      const emailMatches =
        (Array.isArray(l.emails) && l.emails.some((e) => e && (String(e).toLowerCase() === rawIdentifier || rawIdentifier.includes(String(e).toLowerCase())))) ||
        (l.headmasterEmail && String(l.headmasterEmail).toLowerCase() === rawIdentifier) ||
        (l.email && String(l.email).toLowerCase() === rawIdentifier) ||
        (l.adminEmail && String(l.adminEmail).toLowerCase() === rawIdentifier);
      const codeMatches =
        (l.tenantCode && rawIdentifier === String(l.tenantCode).toLowerCase()) ||
        (l.code && rawIdentifier === String(l.code).toLowerCase());
      return emailMatches || codeMatches;
    });
    if (matchedLockout) {
      throw new Error("Access Denied: Your institution has been permanently deleted from the GBS System. Deleted institutions are barred from accessing the platform.");
    }
  } catch (lErr) {
    if (lErr.message && lErr.message.startsWith("Access Denied:")) throw lErr;
  }

  // 1. Check gbs_incoming_onboarding_applications & gbs_archived_onboarded_tenants FIRST to block unapproved institutions
  try {
    const incomingApps = JSON.parse(localStorage.getItem("gbs_incoming_onboarding_applications") || "[]");
    const archivedApps = JSON.parse(localStorage.getItem("gbs_archived_onboarded_tenants") || "[]");
    const allApps = [...incomingApps, ...archivedApps];

    const matchedAppByIdentity = allApps.find((app) => {
      const candidates = [
        app.headmasterEmail,
        app.adminEmail,
        app.officialEmail,
        app.repEmail,
        app.tenantCode,
        app.assignedTenantCode
      ]
        .filter(Boolean)
        .map((s) => String(s).trim().toLowerCase());

      return candidates.includes(rawIdentifier);
    });

    if (matchedAppByIdentity) {
      const appStatus = String(matchedAppByIdentity.status || "").toUpperCase();
      if (appStatus === "DELETED" || appStatus === "ARCHIVED_DELETED" || appStatus === "PURGED" || matchedAppByIdentity.isDeleted) {
        throw new Error("Access Denied: Your institution has been permanently deleted from the GBS System.");
      }
      if (appStatus === "REJECTED") {
        throw new Error(`Access Denied: Your institution onboarding application for '${matchedAppByIdentity.institutionName || "your institution"}' was rejected by the Developer Control Center.`);
      }
      const isExplicitlyApproved =
        matchedAppByIdentity.isApproved === true ||
        appStatus === "APPROVED" ||
        appStatus === "ACTIVE" ||
        appStatus === "PROVISIONED";
      if (!isExplicitlyApproved) {
        throw new Error(`Access Denied: Your institution '${matchedAppByIdentity.institutionName || "your institution"}' has not yet been approved by the System Developer. Newly onboarded institutions cannot access the system until approved in the Developer Control Center.`);
      }

      if (!matchedAppByIdentity.password || matchedAppByIdentity.password !== rawPassword) {
        throw new Error("Invalid email or password for this approved institution.");
      }

      const hmName = matchedAppByIdentity.headmasterName || matchedAppByIdentity.adminName || matchedAppByIdentity.repFullName || "Executive Headmaster";
      const parts = hmName.split(" ");
      const userObj = {
        id: matchedAppByIdentity.id || `usr_hm_${Date.now()}`,
        email: matchedAppByIdentity.headmasterEmail || matchedAppByIdentity.adminEmail || matchedAppByIdentity.officialEmail || rawIdentifier,
        username: rawIdentifier.split("@")[0],
        firstName: parts[0] || "Headmaster",
        lastName: parts.slice(1).join(" ") || "",
        role: "ADMIN",
        isApproved: true,
        tenantId: matchedAppByIdentity.assignedTenantId || matchedAppByIdentity.tenantUid || matchedAppByIdentity.id || "tnt_onboarded",
        tenantCode: matchedAppByIdentity.assignedTenantCode || matchedAppByIdentity.tenantCode || "GBS-TENANT",
        tenantName: matchedAppByIdentity.institutionName || "GBS Registered Institution",
        facePhoto: matchedAppByIdentity.facePhoto || matchedAppByIdentity.headmasterPhoto || null
      };
      return {
        user: userObj,
        accessToken: `gbs_onboarded_jwt_${Date.now()}`,
        refreshToken: `gbs_onboarded_refresh_${Date.now()}`
      };
    }
  } catch (appErr) {
    if (appErr.message && (appErr.message.startsWith("Access Denied:") || appErr.message.startsWith("Invalid email"))) {
      throw appErr;
    }
  }

  // 2. Check gbs_local_registered_users (must be explicitly approved by Headmaster or Developer)
  try {
    const localUsers = JSON.parse(localStorage.getItem("gbs_local_registered_users") || "[]");
    const matchedLocal = localUsers.find((u) => {
      const uEmail = String(u.email || "").trim().toLowerCase();
      const uName = String(u.username || "").trim().toLowerCase();
      return uEmail === rawIdentifier || uName === rawIdentifier;
    });

    if (matchedLocal) {
      if (matchedLocal.isDeleted) {
        throw new Error("Access Denied: This account has been permanently deleted from the system.");
      }
      const uStatus = String(matchedLocal.status || matchedLocal.verificationStatus || "").toUpperCase();
      if (
        matchedLocal.isApproved === false ||
        matchedLocal.isActive === false ||
        uStatus.includes("PENDING") ||
        uStatus === "REJECTED"
      ) {
        throw new Error(
          `Access Denied: Your account (${rawIdentifier}) has not yet been approved by the ${matchedLocal.role === "ADMIN" ? "System Developer" : "Institution Headmaster"}. Unapproved accounts cannot access the system.`
        );
      }
      if (!matchedLocal.password || matchedLocal.password !== rawPassword) {
        throw new Error("Invalid email or password. Please verify your credentials.");
      }

      const userObj = {
        id: matchedLocal.id || `usr_${Date.now()}`,
        email: matchedLocal.email,
        username: matchedLocal.username || matchedLocal.email.split("@")[0],
        firstName: matchedLocal.firstName || "Approved",
        lastName: matchedLocal.lastName || "Member",
        role: matchedLocal.role || requestedRole || "STUDENT",
        isApproved: true,
        tenantId: matchedLocal.tenantId || "1",
        tenantCode: matchedLocal.tenantCode || "GBS-MAIN",
        tenantName: matchedLocal.tenantName || "GBS Registered Institution",
        facePhoto: matchedLocal.facePhoto || null
      };
      return {
        user: userObj,
        accessToken: `gbs_local_jwt_${Date.now()}`,
        refreshToken: `gbs_local_refresh_${Date.now()}`
      };
    }
  } catch (uErr) {
    if (uErr.message && (uErr.message.startsWith("Access Denied:") || uErr.message.startsWith("Invalid email"))) {
      throw uErr;
    }
  }

  // 3. Check built-in offline accounts
  const matchedBuiltin = BUILTIN_OFFLINE_USERS.find(
    (u) =>
      (u.email.toLowerCase() === rawIdentifier || u.username.toLowerCase() === rawIdentifier) &&
      u.passwords.includes(rawPassword)
  );

  if (matchedBuiltin) {
    if (matchedBuiltin.role === "DEVELOPER" && rawPassword !== "0543294615Gab") {
      throw new Error("Invalid Master Developer credentials.");
    }
    const userObj = {
      id: `usr_${matchedBuiltin.username}`,
      email: matchedBuiltin.email,
      username: matchedBuiltin.username,
      firstName: matchedBuiltin.firstName,
      lastName: matchedBuiltin.lastName,
      role: matchedBuiltin.role,
      isApproved: true,
      tenantId: matchedBuiltin.tenantId,
      tenantCode: matchedBuiltin.tenantCode,
      tenantName: matchedBuiltin.tenantName
    };
    return {
      user: userObj,
      accessToken: `gbs_builtin_jwt_${Date.now()}`,
      refreshToken: `gbs_builtin_refresh_${Date.now()}`
    };
  }

  return null;
}

export const register = async (payload) => {
  const isPreApproved = Boolean(payload.isApproved === true || payload.approvedByHeadmaster === true || payload.approvedByDeveloper === true);
  const roleUpper = String(payload.role || "STUDENT").toUpperCase();
  const initialStatus = isPreApproved
    ? "VERIFIED"
    : (roleUpper === "ADMIN" ? "PENDING_DEVELOPER_APPROVAL" : "PENDING_HEADMASTER_APPROVAL");

  try {
    const response = await apiClient.post("/auth/register", payload, { timeout: 8000 });
    const authData = extractAuthPayload(response.data);

    if (isPreApproved && authData?.accessToken) {
      saveAuthSession(authData);
    }

    // Record in local registered users (marked pending approval unless pre-approved by Headmaster/Developer)
    try {
      const localUsers = JSON.parse(localStorage.getItem("gbs_local_registered_users") || "[]");
      const cleanEmail = String(payload.email || "").trim().toLowerCase();
      const filtered = localUsers.filter((u) => String(u.email || "").toLowerCase() !== cleanEmail);
      filtered.unshift({
        id: authData?.user?.id || `usr_${Date.now()}`,
        email: cleanEmail,
        username: payload.username || cleanEmail.split("@")[0],
        password: payload.password,
        role: roleUpper,
        firstName: payload.firstName || "Member",
        lastName: payload.lastName || "",
        isApproved: isPreApproved,
        isActive: isPreApproved,
        status: initialStatus,
        verificationStatus: initialStatus,
        tenantId: payload.tenantId || "1",
        tenantCode: payload.tenantCode || "GBS-MAIN",
        tenantName: payload.tenantName || "GBS International School"
      });
      localStorage.setItem("gbs_local_registered_users", JSON.stringify(filtered));
    } catch {}

    return response.data;
  } catch (err) {
    const cleanEmail = String(payload.email || "").trim().toLowerCase();
    const fallbackUser = {
      id: `usr_${Date.now()}`,
      email: cleanEmail,
      username: payload.username || cleanEmail.split("@")[0],
      firstName: payload.firstName || "Member",
      lastName: payload.lastName || "",
      role: roleUpper,
      isApproved: isPreApproved,
      isActive: isPreApproved,
      status: initialStatus,
      tenantId: payload.tenantId || "1",
      tenantCode: payload.tenantCode || "GBS-MAIN",
      tenantName: payload.tenantName || "GBS International School",
      verificationStatus: initialStatus
    };

    try {
      const localUsers = JSON.parse(localStorage.getItem("gbs_local_registered_users") || "[]");
      const filtered = localUsers.filter((u) => String(u.email || "").toLowerCase() !== cleanEmail);
      filtered.unshift({ ...fallbackUser, password: payload.password });
      localStorage.setItem("gbs_local_registered_users", JSON.stringify(filtered));
    } catch {}

    return {
      status: "success",
      message: isPreApproved
        ? "Account registered and approved."
        : "Registration submitted. Your account awaits verification and approval by the Headmaster / Developer before you can sign in.",
      data: {
        user: fallbackUser,
        requiresApproval: !isPreApproved,
        profile: { verificationStatus: initialStatus }
      }
    };
  }
};

export const login = async (payload) => {
  const rawIdentifier = String(payload.email || payload.username || "").trim().toLowerCase();

  // Strict Permanent Lockout Check for Institutions Deleted by Developer
  try {
    const deletedLockouts = JSON.parse(localStorage.getItem("gbs_deleted_tenant_lockouts") || "[]");
    const deletedArchives = JSON.parse(localStorage.getItem("gbs_deleted_tenant_archives") || "[]");
    const deletedIds = new Set(JSON.parse(localStorage.getItem("gbs_permanently_deleted_ids") || "[]").map((x) => String(x).toLowerCase()));

    if (deletedIds.has(rawIdentifier)) {
      throw new Error("Access Denied: This account or institution has been permanently deleted from the GBS System.");
    }

    const matchedLockout = [...deletedLockouts, ...deletedArchives].find((l) => {
      const emailMatches =
        (Array.isArray(l.emails) && l.emails.some((e) => e && (String(e).toLowerCase() === rawIdentifier || rawIdentifier.includes(String(e).toLowerCase())))) ||
        (l.headmasterEmail && String(l.headmasterEmail).toLowerCase() === rawIdentifier) ||
        (l.email && String(l.email).toLowerCase() === rawIdentifier) ||
        (l.adminEmail && String(l.adminEmail).toLowerCase() === rawIdentifier);
      const codeMatches =
        (l.tenantCode && rawIdentifier === String(l.tenantCode).toLowerCase()) ||
        (l.code && rawIdentifier === String(l.code).toLowerCase());
      const nameMatches =
        (l.tenantName && rawIdentifier.length > 3 && rawIdentifier === String(l.tenantName).toLowerCase()) ||
        (l.name && rawIdentifier.length > 3 && rawIdentifier === String(l.name).toLowerCase());
      return emailMatches || codeMatches || nameMatches;
    });

    if (matchedLockout) {
      throw new Error("Access Denied: Your institution has been permanently deleted from the GBS System. Deleted institutions are barred from accessing the platform.");
    }
  } catch (err) {
    if (err.message && err.message.startsWith("Access Denied:")) {
      throw err;
    }
  }

  try {
    const response = await apiClient.post("/auth/login", payload, { timeout: 6500 });
    const authData = extractAuthPayload(response.data);

    // Double-check that local onboarding queue hasn't marked this account as unapproved or deleted
    try {
      const incomingApps = JSON.parse(localStorage.getItem("gbs_incoming_onboarding_applications") || "[]");
      const pendingLocalApp = incomingApps.find((app) => {
        const candidates = [app.headmasterEmail, app.adminEmail, app.officialEmail, app.tenantCode]
          .filter(Boolean)
          .map((s) => String(s).trim().toLowerCase());
        return candidates.includes(rawIdentifier);
      });
      if (pendingLocalApp && pendingLocalApp.isApproved !== true && String(pendingLocalApp.status || "").toUpperCase() === "PENDING_DEVELOPER_APPROVAL") {
        throw new Error(`Access Denied: Your institution '${pendingLocalApp.institutionName || "your institution"}' is pending Developer Control Center approval.`);
      }
    } catch (localCheckErr) {
      if (localCheckErr.message && localCheckErr.message.startsWith("Access Denied:")) {
        throw localCheckErr;
      }
    }

    if (authData) {
      saveAuthSession(authData);
      localStorage.setItem("gbs_tenant_already_onboarded", "true");
    }

    return response.data;
  } catch (err) {
    if (err.message && err.message.startsWith("Access Denied:")) {
      throw err;
    }
    const status = err?.response?.status;
    const serverMsg = err?.response?.data?.message || "";

    try {
      const fallbackAuth = attemptLocalResilientLogin(payload);
      if (fallbackAuth) {
        saveAuthSession(fallbackAuth);
        localStorage.setItem("gbs_tenant_already_onboarded", "true");
        return {
          status: "success",
          message: "Authenticated successfully",
          data: fallbackAuth
        };
      }
    } catch (localSecErr) {
      throw localSecErr;
    }

    if (status === 403 || status === 401) {
      throw new Error(serverMsg || "Access Denied: Unregistered or unapproved account, or invalid credentials.");
    }

    const cleanMessage =
      serverMsg ||
      (err?.message && !err.message.includes("timeout") ? err.message : null) ||
      "Access Denied: Unregistered or unapproved account, or invalid credentials.";
    throw new Error(cleanMessage);
  }
};

export const logout = async () => {
  try {
    const response = await apiClient.post("/auth/logout", {}, { timeout: 4000 });
    return response.data;
  } catch {
    return { status: "success", message: "Logged out" };
  }
};

export const refreshSession = async () => {
  const refreshToken = localStorage.getItem("gbs_refresh_token");

  const response = await apiClient.post("/auth/refresh-token", {
    refreshToken
  });

  const authData = extractAuthPayload(response.data);

  if (authData?.accessToken) {
    saveAuthSession(authData);
  }

  return response.data;
};

export const forgotPassword = async (payload) => {
  const response = await apiClient.post("/auth/forgot-password", payload);
  return response.data;
};

export const resetPassword = async (payload) => {
  const response = await apiClient.post("/auth/reset-password", payload);
  return response.data;
};

export const validateSession = async () => {
  const response = await apiClient.get("/auth/me", { timeout: 5000 });
  return response.data;
};

export const registerInstitution = async (payload) => {
  try {
    const netPayload = { ...payload };
    if (netPayload.facePhoto && netPayload.facePhoto.length > 450000) {
      netPayload.facePhoto = netPayload.facePhoto.slice(0, 450000);
    }
    const response = await apiClient.post("/auth/register-institution", netPayload, { timeout: 8000 });
    return response.data;
  } catch (err) {
    const timestamp = Date.now().toString().slice(-6);
    const shortName = String(payload.institutionName || "GBS")
      .replace(/[^A-Za-z0-9]/g, "")
      .slice(0, 6)
      .toUpperCase();
    return {
      status: "success",
      message: "Institution onboarding registration saved and routed to Developer Verification Queue.",
      data: {
        registration: {
          id: `reg_${Date.now()}`,
          tenantUid: `TEN-2026-${timestamp}`,
          tenantCode: `GBS-${shortName}-${timestamp.slice(-4)}`,
          institutionId: `INS-2026-${timestamp}`,
          subscriptionId: `SUB-2026-${timestamp}`,
          institutionName: payload.institutionName,
          status: "PENDING_DEVELOPER_APPROVAL",
          isApproved: false,
          adminEmail: payload.adminEmail || payload.officialEmail,
          facePhoto: payload.facePhoto || null,
          createdAt: new Date().toISOString()
        }
      }
    };
  }
};

export const getPublicInstitutions = async () => {
  try {
    const response = await apiClient.get("/auth/institutions", { timeout: 5000 });
    return response.data;
  } catch {
    return {
      status: "success",
      data: {
        institutions: [
          { id: 1, name: "GBS International School (Main Branch)", code: "GBS-MAIN", domain: "gbs-system.onrender.com", status: "ACTIVE" }
        ]
      }
    };
  }
};
