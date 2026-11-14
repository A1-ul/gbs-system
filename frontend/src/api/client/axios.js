import axios from "axios";

const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "/api/v1",
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
        if (serverMsg && typeof serverMsg === "string") {
          window.showGBSOpenNotice(
            serverMsg,
            "success",
            "SERVER COMMAND CONFIRMED"
          );
        }
      }
    } catch {
      // ignore HUD notification errors
    }
    return response;
  },
  (error) => {
    const status = error.response?.status;
    const method = String(error.config?.method || "get").toLowerCase();
    const isMutating = ["post", "put", "patch", "delete"].includes(method);
    const serverErrMsg =
      error.response?.data?.message ||
      error.response?.data?.error ||
      error.message;

    if (status === 401) {
      console.warn("Unauthorized request - session may have expired.");
    }

    if (
      isMutating &&
      serverErrMsg &&
      typeof window !== "undefined" &&
      typeof window.showGBSOpenNotice === "function"
    ) {
      const url = String(error.config?.url || "");
      if (!url.includes("/auth/login")) {
        window.showGBSOpenNotice(
          String(serverErrMsg),
          status === 403 ? "error" : "warning",
          status === 403 ? "SECURITY / ACCESS RESTRICTION" : "COMMAND FEEDBACK NOTICE"
        );
      }
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;
