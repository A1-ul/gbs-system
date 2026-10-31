import axios from "axios";
import { getApiBaseUrl } from "./apiConfig";

const axiosInstance = axios.create({
  baseURL: getApiBaseUrl(),
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request Interceptor: Attach JWT Bearer & Tenant ID
axiosInstance.interceptors.request.use(
  (config) => {
    config.baseURL = getApiBaseUrl();
    const token = localStorage.getItem("gbs_token") || localStorage.getItem("gbs_dev_token");
    const tenantId = localStorage.getItem("gbs_tenant_id") || "1";

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    if (tenantId) {
      config.headers["X-Tenant-Id"] = tenantId;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Global Error Handling
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      console.warn("Unauthorized access - redirecting to login");
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;
