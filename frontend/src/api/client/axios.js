import axios from "axios";
import { getApiBaseUrl } from "./apiConfig";
import { isDemoSandboxMode } from "../../utils/tokenStorage";

const axiosInstance = axios.create({
  baseURL: getApiBaseUrl(),
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
  },
});

let refreshInFlightPromise = null;
let lastAuthRedirectNoticeAt = 0;

function readCleanToken(key) {
  try {
    const val = localStorage.getItem(key);
    if (!val || val === "null" || val === "undefined") return null;
    return val;
  } catch {
    return null;
  }
}

async function refreshSessionTokenOnce() {
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
        if (localStorage.getItem("gbs_dev_token")) {
          localStorage.setItem("gbs_dev_token", nextAccess);
        }
        if (nextRefresh) {
          localStorage.setItem("gbs_refresh_token", nextRefresh);
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

axiosInstance.interceptors.request.use(
  (config) => {
    const isDevRoute =
      (typeof window !== "undefined" &&
        window.location?.pathname?.startsWith("/developer")) ||
      String(config.url || "").includes("/dev-control") ||
      String(config.url || "").includes("/developer");

    const token = isDevRoute
      ? readCleanToken("gbs_dev_token") || readCleanToken("gbs_token")
      : readCleanToken("gbs_token") || readCleanToken("gbs_dev_token");

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    config.headers["X-GBS-Mode"] = isDemoSandboxMode() ? "DEMO_SANDBOX" : "LIVE_PRODUCTION";

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

    return config;
  },
  (error) => Promise.reject(error)
);

axiosInstance.interceptors.response.use(
  (response) => {
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

      if (
        isMutating &&
        !isSilentEndpoint &&
        typeof window !== "undefined" &&
        typeof window.showGBSOpenNotice === "function"
      ) {
        const serverMsg =
          response?.data?.message ||
          response?.data?.data?.message ||
          response?.data?.notice;
        const code = response?.data?.code;

        let title = "SERVER COMMAND CONFIRMED";
        if (code) {
          const prefix = code.split("_")[0];
          const titles = {
            AUTH: "AUTHENTICATION VERIFIED",
            VALIDATION: "INPUT VALIDATED",
            TENANT: "TENANT ENCLAVE CONFIRMED",
            ADMISSION: "ADMISSION DESK CONFIRMED",
            ACADEMIC: "ACADEMIC OPERATION CONFIRMED",
            FINANCE: "FINANCIAL TRANSACTION CONFIRMED",
            DEV: "DEVELOPER CONTROL EXECUTED",
            RECORD: "DATABASE RECORD UPDATED",
            NOTIFICATION: "COMMUNICATION DISPATCHED",
            SYSTEM: "SYSTEM CORE CONFIRMED",
            IDEMPOTENCY: "IDEMPOTENCY KEY LOCKED"
          };
          if (titles[prefix]) title = titles[prefix];
        }

        if (serverMsg && typeof serverMsg === "string") {
          window.showGBSOpenNotice(
            serverMsg,
            "success",
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
      const freshAccessToken = await refreshSessionTokenOnce();
      if (freshAccessToken) {
        originalRequest.headers = {
          ...(originalRequest.headers || {}),
          Authorization: `Bearer ${freshAccessToken}`
        };
        return axiosInstance(originalRequest);
      }

      // Refresh failed or absent: clear stale broken tokens cleanly instead of looping 401 popups
      try {
        localStorage.removeItem("gbs_token");
        localStorage.removeItem("gbs_access_token");
        localStorage.removeItem("gbs_refresh_token");
        if (typeof window !== "undefined" && window.location?.pathname?.startsWith("/developer")) {
          localStorage.removeItem("gbs_dev_token");
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

    const suppressDemoPermissionNotice = status === 403 && isDemoSandboxMode() && rcceCode !== "DEMO_TRIAL_LIMIT_REACHED";

    if (
      !suppressDemoPermissionNotice &&
      typeof window !== "undefined" &&
      typeof window.showGBSOpenNotice === "function"
    ) {
      if (!url.includes("/auth/login") && !url.includes("/health")) {
        let title = "COMMAND FEEDBACK NOTICE";
        if (rcceCode === "DEMO_TRIAL_LIMIT_REACHED") title = "DEMO TRIAL LIMIT REACHED (10/10)";
        else if (status === 403) title = "SECURITY / ACCESS RESTRICTION";
        else if (status === 503 || rcceCode === "SYSTEM_MAINTENANCE_MODE") title = "SYSTEM MAINTENANCE ACTIVE";
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
            DEV: "DEVELOPER ACCESS RESTRICTION",
            DEMO: "DEMO TRIAL LIMIT NOTICE",
            RECORD: "RECORD INTEGRITY NOTICE",
            IDEMPOTENCY: "DUPLICATE SUBMISSION PREVENTED"
          };
          if (titles[prefix]) title = titles[prefix];
        }

        window.showGBSOpenNotice(
          String(serverErrMsg),
          status === 403 || status === 503 ? "error" : "warning",
          title
        );
      }
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;
