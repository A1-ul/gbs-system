/**
 * GBS Central System Response, Control and Communication Engine (GBS-RCCE)
 * Frontend Client & Bridge Utility
 *
 * Provides standardized parsing, API hooks, and HUD notification links
 * for GBS-RCCE payloads across all modules and dashboards.
 *
 * Enforces canonical envelope:
 * { success: boolean, code: string, message: string, data: any, errors: any, timestamp: string, requestId: string }
 */

import axiosInstance from "../api/client/axios";
import { getApiBaseUrl } from "../api/client/apiConfig";

const RCCE_BASE_URL = `${getApiBaseUrl()}/rcce`;

/**
 * Standard System Response Domain Categories
 */
export const RCCE_DOMAINS = {
  AUTH: "AUTHENTICATION & ACCESS",
  VALIDATION: "INPUT VALIDATION",
  TENANT: "TENANT ISOLATION & ENCLAVE",
  ADMISSION: "ADMISSIONS & ENROLLMENT",
  ACADEMIC: "ACADEMIC & CURRICULUM",
  FINANCE: "FINANCIAL & BILLING",
  DEV_CONTROL: "DEVELOPER MISSION CONTROL",
  RECORD: "DATA INTEGRITY & RECORDS",
  NOTIFICATION: "COMMUNICATION & EVENTS",
  SYSTEM: "SYSTEM CORE & INFRASTRUCTURE",
  IDEMPOTENCY: "TRANSACTION PROTECTION"
};

/**
 * Parse an RCCE response envelope safely
 * @param {object} response - Axios response object
 * @returns {object} Standardized payload
 */
export function parseRcceResponse(response) {
  if (!response) {
    return {
      success: false,
      code: "SYSTEM_NULL_RESPONSE",
      message: "The server returned an empty response.",
      data: null,
      errors: null,
      requestId: null,
      timestamp: new Date().toISOString()
    };
  }

  const payload = response.data || {};
  return {
    success: payload.success ?? (response.status >= 200 && response.status < 300),
    code: payload.code || (payload.success ? "RECORD_RETRIEVED" : "SYSTEM_GENERAL_ERROR"),
    message: payload.message || (payload.success ? "Operation completed successfully." : "An error occurred."),
    data: payload.data ?? null,
    errors: payload.errors ?? null,
    requestId: payload.requestId || response.headers?.["x-request-id"] || null,
    timestamp: payload.timestamp || new Date().toISOString()
  };
}

/**
 * Parse an RCCE error into a standardized format
 * @param {object} error - Axios error object
 * @returns {object} Standardized error payload
 */
export function parseRcceError(error) {
  if (!error) {
    return {
      success: false,
      code: "SYSTEM_UNKNOWN_ERROR",
      message: "An unknown system error occurred.",
      status: 500,
      errors: null,
      requestId: null,
      timestamp: new Date().toISOString()
    };
  }

  // Network / Offline Error
  if (!error.response) {
    return {
      success: false,
      code: "SYSTEM_NETWORK_DISCONNECTED",
      message: "System offline: Unable to reach the GBS Central Engine. Please check your network connection.",
      status: 0,
      errors: [error.message],
      requestId: null,
      timestamp: new Date().toISOString()
    };
  }

  const res = error.response;
  const payload = res.data || {};
  const status = res.status || 500;

  // Determine standard code if missing from response
  let fallbackCode = "SYSTEM_INTERNAL_ERROR";
  if (status === 400) fallbackCode = "VALIDATION_REQUIRED_FIELD_MISSING";
  else if (status === 401) fallbackCode = "AUTH_UNAUTHORIZED";
  else if (status === 403) fallbackCode = "AUTH_FORBIDDEN";
  else if (status === 404) fallbackCode = "RECORD_NOT_FOUND";
  else if (status === 409) fallbackCode = "IDEMPOTENCY_DUPLICATE_OPERATION";
  else if (status === 503) fallbackCode = "SYSTEM_MAINTENANCE_MODE";

  return {
    success: false,
    code: payload.code || fallbackCode,
    message: payload.message || error.message || "An error occurred while processing the request.",
    status,
    data: payload.data ?? null,
    errors: payload.errors || (payload.message ? [payload.message] : null),
    requestId: payload.requestId || res.headers?.["x-request-id"] || null,
    timestamp: payload.timestamp || new Date().toISOString()
  };
}

/**
 * Display exact GBS-RCCE feedback via UniversalOpenNoticeHUD
 * @param {object} rcceResult - Result from parseRcceResponse or parseRcceError
 * @param {string} defaultTitle - Optional fallback title
 */
export function displayRcceNotice(rcceResult, defaultTitle = null) {
  if (typeof window === "undefined" || typeof window.showGBSOpenNotice !== "function") {
    return;
  }

  const { success, code, message } = rcceResult || {};
  if (!message) return;

  // Derive domain from code prefix
  let domainTitle = defaultTitle;
  if (!domainTitle && code) {
    const prefix = code.split("_")[0];
    domainTitle = RCCE_DOMAINS[prefix] || "GBS CENTRAL ENGINE FEEDBACK";
  }
  if (!domainTitle) domainTitle = success ? "COMMAND CONFIRMED" : "SYSTEM RESTRICTION";

  const noticeType = success ? "success" : (rcceResult.status === 403 || rcceResult.status === 503 ? "error" : "warning");
  window.showGBSOpenNotice(message, noticeType, domainTitle);
}

/**
 * Central GBS-RCCE API Service
 */
export const rcceApi = {
  /**
   * Health Check: GET /api/v1/rcce/health
   */
  async getHealth() {
    try {
      const res = await axiosInstance.get(`${RCCE_BASE_URL}/health`);
      return parseRcceResponse(res);
    } catch (err) {
      return parseRcceError(err);
    }
  },

  /**
   * Predefined Response Catalogue: GET /api/v1/rcce/catalogue
   */
  async getCatalogue(category = null) {
    try {
      const url = category ? `${RCCE_BASE_URL}/catalogue?category=${category}` : `${RCCE_BASE_URL}/catalogue`;
      const res = await axiosInstance.get(url);
      return parseRcceResponse(res);
    } catch (err) {
      return parseRcceError(err);
    }
  },

  /**
   * Live Telemetry & System Status: GET /api/v1/rcce/system-status
   */
  async getSystemStatus() {
    try {
      const res = await axiosInstance.get(`${RCCE_BASE_URL}/system-status`);
      return parseRcceResponse(res);
    } catch (err) {
      return parseRcceError(err);
    }
  },

  /**
   * Set Maintenance Mode: POST /api/v1/rcce/maintenance-mode
   */
  async setMaintenanceMode(enabled, reason = "", bypassRoles = ["DEVELOPER", "SUPER_ADMIN"]) {
    try {
      const res = await axiosInstance.post(`${RCCE_BASE_URL}/maintenance-mode`, {
        enabled,
        reason,
        bypassRoles
      });
      return parseRcceResponse(res);
    } catch (err) {
      return parseRcceError(err);
    }
  },

  /**
   * Audit Trail: GET /api/v1/rcce/audit-trail
   */
  async getAuditTrail(params = {}) {
    try {
      const res = await axiosInstance.get(`${RCCE_BASE_URL}/audit-trail`, { params });
      return parseRcceResponse(res);
    } catch (err) {
      return parseRcceError(err);
    }
  },

  /**
   * Notifications Queue: GET /api/v1/rcce/notifications
   */
  async getNotifications(params = {}) {
    try {
      const res = await axiosInstance.get(`${RCCE_BASE_URL}/notifications`, { params });
      return parseRcceResponse(res);
    } catch (err) {
      return parseRcceError(err);
    }
  },

  /**
   * Dispatch Domain Event: POST /api/v1/rcce/events
   */
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

  /**
   * Pre-validate Operation: POST /api/v1/rcce/validate-operation
   */
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
  rcceApi,
  RCCE_DOMAINS
};
