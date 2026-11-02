import axios from "axios";
import { getApiBaseUrl } from "./apiConfig";

const axiosInstance = axios.create({
  baseURL: getApiBaseUrl(),
  timeout: 60000,
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

// Response Interceptor: Global Error Handling & Timeout Resilience
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config;
    // Cold start / timeout retry once for critical auth endpoints
    if (error.code === 'ECONNABORTED' && !config._retry && config.url && (config.url.includes('/auth/') || config.url.includes('/login'))) {
      config._retry = true;
      console.warn("Connection delay encountered, retrying auth request...");
      return axiosInstance(config);
    }

    if (error.response && error.response.status === 401) {
      console.warn("Unauthorized access - session expired or invalid credentials");
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;
