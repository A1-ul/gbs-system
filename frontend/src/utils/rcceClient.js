/**
 * GBS Central System Response, Control and Communication Engine (GBS-RCCE)
 * Frontend Client & Bridge Utility
 *
 * Canonical Envelope:
 * { success: boolean, code: string, message: string, data: any, errors: any, timestamp: string, requestId: string }
 */

import axiosInstance from "../api/client/axios";
import { getApiBaseUrl } from "../api/client/apiConfig";

const RCCE_BASE_URL = `${getApiBaseUrl()}/rcce`;

export const RCCE_DOMAINS = {
  AUTH: "AUTHENTICATION & ACCESS",
  VALIDATION: "INPUT VALIDATION",
  TENANT: "TENANT ISOLATION & ENCLAVE",
  ADMISSION: "ADMISSIONS & ENROLLMENT",
  ACADEMIC: "ACADEMIC & CURRICULUM",
  FINANCE: "FINANCIAL & BILLING",
  CLINIC: "SCHOOL CLINIC & MEDICAL REGISTRY",
  UNIVERSITY: "UNIVERSITY OPERATIONS",
  SMS: "DIRECT SMS & COMMUNICATIONS",
  DEMO: "DEMO SANDBOX TRIAL (10-ENTRY CAP)",
  DEV: "DEVELOPER MISSION CONTROL",
  RECORD: "DATA INTEGRITY & RECORDS",
  NOTIFICATION: "COMMUNICATION & EVENTS",
  SYSTEM: "SYSTEM CORE & INFRASTRUCTURE",
  IDEMPOTENCY: "TRANSACTION PROTECTION",
  REQUEST: "APPROVAL WORKFLOW"
};

export function parseRcceResponse(response) {
  if (!response) {
    return {
      success: false,
      code: "SYSTEM_NULL_RESPONSE",
      message: "The server returned an empty response.",
      data: null,
      errors: [{ message: "Empty response" }],
      requestId: null,
      timestamp: new Date().toISOString()
    };
  }

  const payload = response.data || {};
  const isOk = payload.success ?? (response.status >= 200 && response.status < 300 && payload.status !== "fail" && payload.status !== "error");
  return {
    success: Boolean(isOk),
    code: payload.code || (isOk ? "RECORD_FOUND_SUCCESS" : "SYSTEM_ERROR_INTERNAL"),
    message: payload.message || (isOk ? "Operation completed successfully." : "An error occurred."),
    data: payload.data ?? null,
    errors: payload.errors ?? null,
    requestId: payload.requestId || response.headers?.["x-request-id"] || null,
    timestamp: payload.timestamp || new Date().toISOString()
  };
}

export function parseRcceError(error) {
  if (!error) {
    return {
      success: false,
      code: "SYSTEM_ERROR_INTERNAL",
      message: "An unknown system error occurred.",
      status: 500,
      data: null,
      errors: [{ message: "Unknown system error" }],
      requestId: null,
      timestamp: new Date().toISOString()
    };
  }

  if (!error.response) {
    return {
      success: false,
      code: "SYSTEM_NETWORK_DISCONNECTED",
      message: "System offline: Unable to reach the GBS Central Engine. Please check your network connection.",
      status: 0,
      data: null,
      errors: [{ message: error.message || "Network disconnected" }],
      requestId: null,
      timestamp: new Date().toISOString()
    };
  }

  const res = error.response;
  const payload = res.data || {};
  const status = res.status || 500;

  let fallbackCode = "SYSTEM_ERROR_INTERNAL";
  if (status === 400) fallbackCode = "VALIDATION_MISSING_REQUIRED";
  else if (status === 401) fallbackCode = "AUTH_UNAUTHORIZED";
  else if (status === 403) fallbackCode = "AUTH_FORBIDDEN";
  else if (status === 404) fallbackCode = "RECORD_NOT_FOUND";
  else if (status === 409) fallbackCode = "DUPLICATE_SUBMISSION_DETECTED";
  else if (status === 429) fallbackCode = "SYSTEM_RATE_LIMIT_EXCEEDED";
  else if (status === 503) fallbackCode = "SYSTEM_MAINTENANCE_ACTIVE";

  return {
    success: false,
    code: payload.code || fallbackCode,
    message: payload.message || error.message || "An error occurred while processing the request.",
    status,
    data: payload.data ?? null,
    errors: payload.errors || [{ message: payload.message || "Request failed" }],
    diagnostics: payload.diagnostics || null,
    requestId: payload.requestId || res.headers?.["x-request-id"] || null,
    timestamp: payload.timestamp || new Date().toISOString()
  };
}

export function displayRcceNotice(rcceResult, defaultTitle = null) {
  if (typeof window === "undefined" || typeof window.showGBSOpenNotice !== "function") {
    return;
  }

  const { success, code, message } = rcceResult || {};
  if (!message) return;

  let domainTitle = defaultTitle;
  if (!domainTitle && code) {
    const prefix = String(code).split("_")[0];
    domainTitle = RCCE_DOMAINS[prefix] || "GBS CENTRAL ENGINE FEEDBACK";
  }
  if (!domainTitle) domainTitle = success ? "COMMAND CONFIRMED" : "SYSTEM RESTRICTION";

  const noticeType = success ? "success" : (rcceResult.status === 403 || rcceResult.status === 503 ? "error" : "warning");
  window.showGBSOpenNotice(message, noticeType, domainTitle);
}

/**
 * Execute an idempotent transaction with an explicit client X-Idempotency-Key
 */
export async function sendWithIdempotency(method, url, data = {}, idempotencyKey = null, extraHeaders = {}) {
  const key = idempotencyKey || `IDEM-UI-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  try {
    const res = await axiosInstance({
      method,
      url,
      data,
      headers: {
        "X-Idempotency-Key": key,
        ...extraHeaders
      }
    });
    return parseRcceResponse(res);
  } catch (err) {
    return parseRcceError(err);
  }
}

export const rcceApi = {
  async getHealth() {
    try {
      const res = await axiosInstance.get(`${RCCE_BASE_URL}/health`);
      return parseRcceResponse(res);
    } catch (err) {
      return parseRcceError(err);
    }
  },

  async getCatalogue(category = null) {
    try {
      const url = category && category !== "ALL"
        ? `${RCCE_BASE_URL}/catalogue?category=${encodeURIComponent(category)}`
        : `${RCCE_BASE_URL}/catalogue`;
      const res = await axiosInstance.get(url);
      return parseRcceResponse(res);
    } catch (err) {
      return parseRcceError(err);
    }
  },

  async getSystemStatus() {
    try {
      const res = await axiosInstance.get(`${RCCE_BASE_URL}/system-status`);
      return parseRcceResponse(res);
    } catch (err) {
      return parseRcceError(err);
    }
  },

  async setMaintenanceMode(enabled, reason = "", bypassRoles = ["DEVELOPER", "SUPER_ADMIN"]) {
    try {
      const active = Boolean(enabled);
      const res = await axiosInstance.post(`${RCCE_BASE_URL}/maintenance-mode`, {
        active,
        enabled: active,
        reason,
        bypassRoles
      });
      return parseRcceResponse(res);
    } catch (err) {
      return parseRcceError(err);
    }
  },

  async getAuditTrail(params = {}) {
    try {
      const cleanParams = {};
      Object.entries(params || {}).forEach(([k, v]) => {
        if (v !== undefined && v !== null && String(v).trim() !== "") {
          cleanParams[k] = v;
        }
      });
      const res = await axiosInstance.get(`${RCCE_BASE_URL}/audit-trail`, { params: cleanParams });
      return parseRcceResponse(res);
    } catch (err) {
      return parseRcceError(err);
    }
  },

  async getErrorMonitor() {
    try {
      const res = await axiosInstance.get(`${RCCE_BASE_URL}/error-monitor`);
      return parseRcceResponse(res);
    } catch (err) {
      return parseRcceError(err);
    }
  },

  async getPermissionMatrix() {
    try {
      const res = await axiosInstance.get(`${RCCE_BASE_URL}/permission-matrix`);
      return parseRcceResponse(res);
    } catch (err) {
      return parseRcceError(err);
    }
  },

  async inspectPrivacyUsers(reason, query = "") {
    try {
      const res = await axiosInstance.post(`${RCCE_BASE_URL}/privacy-inspect`, { reason, query });
      return parseRcceResponse(res);
    } catch (err) {
      return parseRcceError(err);
    }
  },

  async getDemoLimits() {
    try {
      const res = await axiosInstance.get(`${RCCE_BASE_URL}/demo-limits`);
      return parseRcceResponse(res);
    } catch (err) {
      return parseRcceError(err);
    }
  },

  async getNotifications(params = {}) {
    try {
      const res = await axiosInstance.get(`${RCCE_BASE_URL}/notifications`, { params });
      return parseRcceResponse(res);
    } catch (err) {
      return parseRcceError(err);
    }
  },

  async emitEvent(eventType, payload = {}, audience = null) {
    try {
      const res = await axiosInstance.post(`${RCCE_BASE_URL}/events`, {
        eventType,
        payload,
        audience
      });
      return parseRcceResponse(res);
    } catch (err) {
      return parseRcceError(err);
    }
  },

  async validateOperation(data) {
    try {
      const res = await axiosInstance.post(`${RCCE_BASE_URL}/validate-operation`, data);
      return parseRcceResponse(res);
    } catch (err) {
      return parseRcceError(err);
    }
  }
};

export default {
  parseRcceResponse,
  parseRcceError,
  displayRcceNotice,
  sendWithIdempotency,
  rcceApi,
  RCCE_DOMAINS
};
