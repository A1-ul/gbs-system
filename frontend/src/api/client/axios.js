import axios from "axios";
import { getApiBaseUrl } from "./apiConfig";
import {
  isDemoSandboxMode,
  isBuiltInDemoUser,
  getActiveAuthToken,
  getUser
} from "../../utils/tokenStorage";

const axiosInstance = axios.create({
  baseURL: getApiBaseUrl(),
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
  },
});

let refreshInFlightPromise = null;
let demoRecoverInFlightPromise = null;
let lastDemoRecoverFailedAt = 0;
let lastAuthRedirectNoticeAt = 0;

const BUILTIN_DEMO_RECOVERY_CREDS = {
  "admin@gbs.com": "Admin123!",
  "teacher@gbs.com": "Teacher123!",
  "student@gbs.com": "Student123!",
  "parent@gbs.com": "Parent123!",
  "accountant@gbs.com": "Accountant123!",
  "finance@gbs.com": "Accountant123!",
  "staff@gbs.com": "Staff123!",
  "hr@gbs.com": "Hr123!",
  "alumni@gbs.com": "Alumni123!",
  "secretary@gbs.com": "Secretary123!",
  "doctor@gbs.com": "Doctor123!",
  "nurse@gbs.com": "Nurse123!"
};

function readCleanToken(key) {
  try {
    const val = localStorage.getItem(key);
    if (!val || val === "null" || val === "undefined") return null;
    const trimmed = String(val).trim();
    return trimmed || null;
  } catch {
    return null;
  }
}

function isJwtExpiredOrExpiringSoon(token, bufferMs = 30000) {
  if (!token || typeof token !== "string") return false;
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  try {
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
    const json = atob(padded);
    const payload = JSON.parse(json);
    if (typeof payload?.exp === "number") {
      return payload.exp * 1000 <= Date.now() + bufferMs;
    }
  } catch {
    return false;
  }
  return false;
}

function isPublicOrAuthEndpoint(url = "") {
  const u = String(url || "");
  return (
    u.includes("/auth/login") ||
    u.includes("/auth/register") ||
    u.includes("/auth/signup") ||
    u.includes("/auth/refresh-token") ||
    u.includes("/auth/forgot-password") ||
    u.includes("/auth/reset-password") ||
    u.includes("/dev-control/auth/login") ||
    u.includes("/dev-control/security/") ||
    u.includes("/developer-control-center/auth/login") ||
    u.includes("/health") ||
    u.includes("/app-version") ||
    u.includes("/locale")
  );
}

async function refreshSessionTokenOnce({ isDeveloperContext = false } = {}) {
  if (refreshInFlightPromise) return refreshInFlightPromise;

  const refreshToken = readCleanToken("gbs_refresh_token");
  if (!refreshToken || refreshToken.startsWith("gbs_local_refresh_") || refreshToken.startsWith("gbs_builtin_refresh_")) {
    return null;
  }

  refreshInFlightPromise = axios
    .post(
      `${getApiBaseUrl()}/auth/refresh-token`,
      { refreshToken },
      { headers: { "Content-Type": "application/json" }, timeout: 10000 }
    )
    .then((res) => {
      const nextAccess = res.data?.data?.accessToken || res.data?.accessToken;
      const nextRefresh = res.data?.data?.refreshToken || res.data?.refreshToken;
      if (nextAccess) {
        localStorage.setItem("gbs_token", nextAccess);
        localStorage.setItem("gbs_access_token", nextAccess);
        const onDevPortal =
          isDeveloperContext ||
          (typeof window !== "undefined" && window.location?.pathname?.startsWith("/developer"));
        if (onDevPortal && localStorage.getItem("gbs_dev_token")) {
          localStorage.setItem("gbs_dev_token", nextAccess);
        }
        if (nextRefresh) {
          localStorage.setItem("gbs_refresh_token", nextRefresh);
        }
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("gbs_auth_session_updated"));
        }
        return nextAccess;
      }
      return null;
    })
    .catch(() => null)
    .finally(() => {
      refreshInFlightPromise = null;
    });

  return refreshInFlightPromise;
}

async function recoverBuiltInDemoTokenOnce() {
  if (demoRecoverInFlightPromise) return demoRecoverInFlightPromise;
  if (Date.now() - lastDemoRecoverFailedAt < 60000) return null;

  const currentUser = getUser();
  if (!currentUser || !isBuiltInDemoUser(currentUser)) return null;

  const cleanEmail = String(currentUser.email || "").trim().toLowerCase();
  const demoPassword = BUILTIN_DEMO_RECOVERY_CREDS[cleanEmail];
  if (!demoPassword) return null;

  demoRecoverInFlightPromise = axios
    .post(
      `${getApiBaseUrl()}/auth/login`,
      {
        email: cleanEmail,
        username: currentUser.username || cleanEmail,
        password: demoPassword,
        portalRole: currentUser.role || undefined
      },
      { headers: { "Content-Type": "application/json" }, timeout: 10000 }
    )
    .then((res) => {
      const payload = res.data?.data || res.data || {};
      const nextAccess = payload.accessToken || payload.token;
      const nextRefresh = payload.refreshToken;
      if (nextAccess) {
        localStorage.setItem("gbs_token", nextAccess);
        localStorage.setItem("gbs_access_token", nextAccess);
        if (nextRefresh) {
          localStorage.setItem("gbs_refresh_token", nextRefresh);
        }
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("gbs_auth_session_updated"));
        }
        return nextAccess;
      }
      lastDemoRecoverFailedAt = Date.now();
      return null;
    })
    .catch(() => {
      lastDemoRecoverFailedAt = Date.now();
      return null;
    })
    .finally(() => {
      demoRecoverInFlightPromise = null;
    });

  return demoRecoverInFlightPromise;
}

const releaseInFlightRequest = (cfg) => {
  if (typeof window !== "undefined" && cfg && cfg.__gbsTrackedInFlight) {
    cfg.__gbsTrackedInFlight = false;
    window.__gbsInFlightRequests = Math.max(0, Number(window.__gbsInFlightRequests || 1) - 1);
    window.__gbsLastNetworkActivityAt = Date.now();
  }
};

axiosInstance.interceptors.request.use(
  async (config) => {
    const isDevRoute =
      (typeof window !== "undefined" &&
        window.location?.pathname?.startsWith("/developer")) ||
      String(config.url || "").includes("/dev-control") ||
      String(config.url || "").includes("/developer");

    let token = getActiveAuthToken({ isDeveloperContext: isDevRoute });

    // Proactive pre-flight token renewal: refresh expired JWTs BEFORE sending so endpoints receive a valid token (HTTP 200) instead of a 401 round-trip
    if (!isPublicOrAuthEndpoint(config.url) && !config._skipPreFlightRefresh) {
      const needsRefresh = !token || isJwtExpiredOrExpiringSoon(token);
      if (needsRefresh) {
        const refreshed = await refreshSessionTokenOnce({ isDeveloperContext: isDevRoute });
        if (refreshed) {
          token = refreshed;
        } else if (!isDevRoute && isBuiltInDemoUser()) {
          const recovered = await recoverBuiltInDemoTokenOnce();
          if (recovered) {
            token = recovered;
          }
        }
      }
    }

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Developer Control Center ALWAYS operates in Original Production Mode — never Demo Sandbox
    const resolvedMode = isDevRoute ? "LIVE_PRODUCTION" : (isDemoSandboxMode() ? "DEMO_SANDBOX" : "LIVE_PRODUCTION");
    config.headers["X-GBS-Mode"] = resolvedMode;
    config.headers["X-System-Mode"] = resolvedMode;

    const instTypeHeader = readCleanToken("gbs_institution_type");
    if (instTypeHeader && !config.headers["X-Demo-Institution-Type"]) {
      config.headers["X-Demo-Institution-Type"] = instTypeHeader;
    }

    const tenantId =
      readCleanToken("gbs_tenant_id") ||
      readCleanToken("gbs_active_tenant");
    if (tenantId && !config.headers["X-Tenant-Id"]) {
      config.headers["X-Tenant-Id"] = tenantId;
    }

    try {
      const rawUser = isDevRoute
        ? localStorage.getItem("gbs_developer") || localStorage.getItem("gbs_user")
        : localStorage.getItem("gbs_user") || localStorage.getItem("gbs_developer");
      if (rawUser) {
        const parsedUser = JSON.parse(rawUser);
        if (parsedUser?.email && !config.headers["X-User-Email"]) {
          config.headers["X-User-Email"] = parsedUser.email;
        }
        if (parsedUser?.role && !config.headers["X-User-Role"]) {
          config.headers["X-User-Role"] = parsedUser.role;
        }
        if (parsedUser?.tenantId && !config.headers["X-Tenant-Id"]) {
          config.headers["X-Tenant-Id"] = parsedUser.tenantId;
        }
      }
    } catch {
      // ignore malformed JSON in localStorage
    }

    if (typeof window !== "undefined" && !config.__gbsTrackedInFlight) {
      config.__gbsTrackedInFlight = true;
      window.__gbsInFlightRequests = Math.max(0, Number(window.__gbsInFlightRequests || 0)) + 1;
      window.__gbsLastNetworkActivityAt = Date.now();
    }

    return config;
  },
  (error) => Promise.reject(error)
);

axiosInstance.interceptors.response.use(
  (response) => {
    releaseInFlightRequest(response?.config);
    try {
      const method = String(response?.config?.method || "get").toLowerCase();
      const url = String(response?.config?.url || "");
      const isMutating = ["post", "put", "patch", "delete"].includes(method);
      const isSilentEndpoint =
        url.includes("/health") ||
        url.includes("/auth/login") ||
        url.includes("/auth/refresh-token") ||
        url.includes("/auth/verify") ||
        url.includes("/translate");
      const envelopeFailed = response?.data?.success === false;

      if (typeof window !== "undefined") {
        const hist = Array.isArray(window.__gbsRcceResponseHistory) ? window.__gbsRcceResponseHistory : [];
        hist.unshift({
          method: method.toUpperCase(),
          url,
          status: response.status,
          success: !envelopeFailed,
          code: response?.data?.code || (envelopeFailed ? "SYSTEM_ERROR_INTERNAL" : "RECORD_FOUND_SUCCESS"),
          message: response?.data?.message || "OK",
          requestId: response?.data?.requestId || response?.headers?.["x-request-id"] || null,
          timestamp: response?.data?.timestamp || new Date().toISOString()
        });
        window.__gbsRcceResponseHistory = hist.slice(0, 25);
        window.dispatchEvent(new CustomEvent("gbs_rcce_response_logged", { detail: window.__gbsRcceResponseHistory[0] }));
      }

      if (
        (isMutating || envelopeFailed) &&
        !isSilentEndpoint &&
        typeof window !== "undefined" &&
        typeof window.showGBSOpenNotice === "function"
      ) {
        const serverMsg =
          response?.data?.message ||
          response?.data?.data?.message ||
          response?.data?.notice;
        const code = response?.data?.code;

        let title = envelopeFailed ? "COMMAND VALIDATION FAILED" : "SERVER COMMAND CONFIRMED";
        if (code) {
          const prefix = code.split("_")[0];
          const titles = {
            AUTH: "AUTHENTICATION VERIFIED",
            VALIDATION: "INPUT VALIDATED",
            TENANT: "TENANT ENCLAVE CONFIRMED",
            ADMISSION: "ADMISSION DESK CONFIRMED",
            ACADEMIC: "ACADEMIC OPERATION CONFIRMED",
            FINANCE: "FINANCIAL TRANSACTION CONFIRMED",
            CLINIC: "SCHOOL CLINIC CONFIRMED",
            UNIVERSITY: "UNIVERSITY SYSTEM CONFIRMED",
            SMS: "DIRECT SMS DISPATCHED",
            STAFF: "STAFF ACCESS UPDATED",
            DEV: "DEVELOPER CONTROL EXECUTED",
            RECORD: "DATABASE RECORD UPDATED",
            NOTIFICATION: "COMMUNICATION DISPATCHED",
            SYSTEM: "SYSTEM CORE CONFIRMED",
            IDEMPOTENCY: "IDEMPOTENCY KEY LOCKED",
            REQUEST: "REQUEST SUBMITTED"
          };
          if (titles[prefix]) title = envelopeFailed ? `${prefix} OPERATION REJECTED` : titles[prefix];
        }

        if (serverMsg && typeof serverMsg === "string") {
          window.showGBSOpenNotice(
            serverMsg,
            envelopeFailed ? "error" : "success",
            title
          );
        }
      }

      if (isMutating && typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("gbs_demo_usage_updated"));
      }
    } catch {
      // ignore HUD notification errors
    }
    return response;
  },
  async (error) => {
    const status = error.response?.status;
    const originalRequest = error.config || {};
    releaseInFlightRequest(originalRequest);
    const url = String(originalRequest.url || "");
    const isAuthAttempt =
      url.includes("/auth/login") ||
      url.includes("/auth/register") ||
      url.includes("/auth/refresh-token") ||
      url.includes("/dev-control/auth/login") ||
      url.includes("/developer-control-center/auth/login");

    // Seamless automatic token refresh and retry on expired JWT (401)
    if (status === 401 && !originalRequest._retry && !isAuthAttempt) {
      originalRequest._retry = true;
      originalRequest._skipPreFlightRefresh = true;
      const isDevRoute =
        (typeof window !== "undefined" &&
          window.location?.pathname?.startsWith("/developer")) ||
        url.includes("/dev-control") ||
        url.includes("/developer");

      let freshAccessToken = await refreshSessionTokenOnce({ isDeveloperContext: isDevRoute });
      if (!freshAccessToken && !isDevRoute && isBuiltInDemoUser()) {
        freshAccessToken = await recoverBuiltInDemoTokenOnce();
      }
      if (freshAccessToken) {
        originalRequest.headers = {
          ...(originalRequest.headers || {}),
          Authorization: `Bearer ${freshAccessToken}`
        };
        return axiosInstance(originalRequest);
      }

      // Refresh failed or absent: clear stale broken tokens cleanly and pause background pollers instead of looping 401s
      try {
        localStorage.removeItem("gbs_token");
        localStorage.removeItem("gbs_access_token");
        localStorage.removeItem("gbs_refresh_token");
        if (typeof window !== "undefined" && window.location?.pathname?.startsWith("/developer")) {
          localStorage.removeItem("gbs_dev_token");
        }
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("gbs_auth_session_expired"));
        }
      } catch { }
    }

    const rcceCode = error.response?.data?.code;
    let serverErrMsg =
      error.response?.data?.message ||
      error.response?.data?.error ||
      error.message;

    if (!error.response) {
      serverErrMsg = "System offline: Unable to reach the GBS Central Engine. Check network connection.";
    }

    if (status === 401 && !isAuthAttempt) {
      const now = Date.now();
      if (now - lastAuthRedirectNoticeAt > 8000 && typeof window !== "undefined" && typeof window.showGBSOpenNotice === "function") {
        lastAuthRedirectNoticeAt = now;
        window.showGBSOpenNotice(
          "Your authentication session expired. Please sign in again to get a fresh token.",
          "warning",
          "SESSION RENEWAL REQUIRED"
        );
      }
      return Promise.reject(error);
    }

    const reqMethod = String(originalRequest.method || "get").toLowerCase();
    const suppressDemoPermissionNotice =
      status === 403 &&
      reqMethod === "get" &&
      isDemoSandboxMode() &&
      rcceCode !== "DEMO_TRIAL_LIMIT_REACHED";

    if (typeof window !== "undefined") {
      try {
        const hist = Array.isArray(window.__gbsRcceResponseHistory) ? window.__gbsRcceResponseHistory : [];
        hist.unshift({
          method: reqMethod.toUpperCase(),
          url,
          status: status || 0,
          success: false,
          code: rcceCode || "SYSTEM_ERROR_INTERNAL",
          message: String(serverErrMsg || "Request failed"),
          requestId: error.response?.data?.requestId || error.response?.headers?.["x-request-id"] || null,
          timestamp: error.response?.data?.timestamp || new Date().toISOString()
        });
        window.__gbsRcceResponseHistory = hist.slice(0, 25);
        window.dispatchEvent(new CustomEvent("gbs_rcce_response_logged", { detail: window.__gbsRcceResponseHistory[0] }));
      } catch { }
    }

    if (
      !suppressDemoPermissionNotice &&
      typeof window !== "undefined" &&
      typeof window.showGBSOpenNotice === "function"
    ) {
      if (!url.includes("/auth/login") && !url.includes("/health")) {
        let title = status ? `HTTP ${status} REQUEST ERROR` : "COMMAND FEEDBACK NOTICE";
        if (rcceCode === "DEMO_TRIAL_LIMIT_REACHED") title = "DEMO TRIAL LIMIT REACHED (10/10)";
        else if (status === 400) title = "INVALID REQUEST (400)";
        else if (status === 403) title = "ACCESS DENIED (403)";
        else if (status === 404) title = "RESOURCE NOT FOUND (404)";
        else if (status === 405) title = "METHOD NOT ALLOWED (405)";
        else if (status === 408) title = "REQUEST TIMEOUT (408)";
        else if (status === 409) title = "RECORD CONFLICT (409)";
        else if (status === 422) title = "VALIDATION FAILED (422)";
        else if (status === 423) title = "SECURITY LOCKDOWN ACTIVE (423)";
        else if (status === 429) title = "RATE LIMIT EXCEEDED (429)";
        else if (status === 501) title = "NOT IMPLEMENTED (501)";
        else if (status === 502) title = "UPSTREAM BAD GATEWAY (502)";
        else if (status === 503 || rcceCode === "SYSTEM_MAINTENANCE_ACTIVE") title = "SERVICE UNAVAILABLE (503)";
        else if (status === 504) title = "GATEWAY TIMEOUT (504)";
        else if (status >= 500) title = `SERVER ERROR (${status})`;
        else if (!error.response) title = "NETWORK OFFLINE WARNING";
        else if (rcceCode) {
          const prefix = rcceCode.split("_")[0];
          const titles = {
            AUTH: "AUTHENTICATION RESTRICTION",
            VALIDATION: "INPUT VALIDATION NOTICE",
            TENANT: "TENANT ISOLATION BARRIER",
            ADMISSION: "ADMISSION REGISTRATION NOTICE",
            ACADEMIC: "ACADEMIC SYSTEM NOTICE",
            FINANCE: "FINANCIAL TRANSACTION NOTICE",
            CLINIC: "SCHOOL CLINIC RESTRICTION",
            UNIVERSITY: "UNIVERSITY TIER RESTRICTION",
            SMS: "SMS DELIVERY NOTICE",
            STAFF: "STAFF APPROVAL REQUIRED",
            DEV: "DEVELOPER ACCESS RESTRICTION",
            DEMO: "DEMO TRIAL LIMIT NOTICE",
            RECORD: "RECORD INTEGRITY NOTICE",
            IDEMPOTENCY: "DUPLICATE SUBMISSION PREVENTED"
          };
          if (titles[prefix]) title = titles[prefix];
        }

        const isHardError = !error.response || status === 401 || status === 403 || status === 404 || status === 405 || status === 409 || status === 423 || status >= 500;
        window.showGBSOpenNotice(
          String(serverErrMsg),
          isHardError ? "error" : "warning",
          title
        );
      }
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;
