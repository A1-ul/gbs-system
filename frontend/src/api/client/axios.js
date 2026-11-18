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

axiosInstance.interceptors.request.use(
  (config) => {
    const isDevRoute =
      (typeof window !== "undefined" &&
        window.location?.pathname?.startsWith("/developer")) ||
      String(config.url || "").includes("/dev-control") ||
      String(config.url || "").includes("/developer");

    const token = isDevRoute
      ? localStorage.getItem("gbs_dev_token") || localStorage.getItem("gbs_token")
      : localStorage.getItem("gbs_token") || localStorage.getItem("gbs_dev_token");

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    config.headers["X-GBS-Mode"] = isDemoSandboxMode() ? "DEMO_SANDBOX" : "LIVE_PRODUCTION";

    const tenantId =
      localStorage.getItem("gbs_tenant_id") ||
      localStorage.getItem("gbs_active_tenant");
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
  (error) => {
    const status = error.response?.status;
    const rcceCode = error.response?.data?.code;
    let serverErrMsg =
      error.response?.data?.message ||
      error.response?.data?.error ||
      error.message;

    // Handle offline / network disconnect natively with RCCE standard notice
    if (!error.response) {
      serverErrMsg = "System offline: Unable to reach the GBS Central Engine. Check network connection.";
    }

    if (status === 401) {
      console.warn("Unauthorized request - session may have expired.");
    }

    if (
      typeof window !== "undefined" &&
      typeof window.showGBSOpenNotice === "function"
    ) {
      const url = String(error.config?.url || "");
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
