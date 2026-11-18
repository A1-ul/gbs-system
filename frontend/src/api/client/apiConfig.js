/**
 * apiConfig.js
 * Centralized API & Server URL detection for Desktop, Mobile Phone Browsers, Cloud deployments, and LAN clients.
 * Supports:
 * 1. Vite dev/preview proxy (:3000 / :5173) via same-origin so localhost, LAN mobile devices, and single-port tunnels work cleanly
 * 2. Render static frontend CDN (gbs-frontend.onrender.com -> gbs-school.onrender.com) and explicit VITE_API_BASE_URL overrides
 * 3. Same-origin production hosting and direct Express backend serving
 */

const sanitizeConfiguredUrl = (raw) => {
  const value = String(raw || "").trim();
  if (!value || value.includes("yourdomain.com")) return "";
  return value.replace(/\/+$/, "");
};

const isViteProxyOrigin = () => {
  if (typeof window === "undefined" || !window.location) return false;
  return window.location.port === "3000" || window.location.port === "5173";
};

export const getServerHost = () => {
  if (typeof window !== "undefined" && window.location) {
    return window.location.hostname || "localhost";
  }
  return "localhost";
};

export const getServerBaseUrl = () => {
  if (typeof window !== "undefined" && window.location) {
    if (window.location.hostname.includes("gbs-frontend.onrender.com")) {
      return "https://gbs-system.onrender.com";
    }
    if (isViteProxyOrigin()) {
      return window.location.origin;
    }
    const configuredApi = sanitizeConfiguredUrl(
      import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL
    );
    if (configuredApi && /^https?:\/\//i.test(configuredApi)) {
      return configuredApi.replace(/\/api\/v\d+$/i, "");
    }
    return window.location.origin;
  }
  const configuredApi = sanitizeConfiguredUrl(
    import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL
  );
  if (configuredApi && /^https?:\/\//i.test(configuredApi)) {
    return configuredApi.replace(/\/api\/v\d+$/i, "");
  }
  return "http://localhost:5001";
};

export const getApiBaseUrl = () => {
  if (typeof window !== "undefined" && window.location) {
    if (window.location.hostname.includes("gbs-frontend.onrender.com")) {
      return "https://gbs-system.onrender.com/api/v1";
    }
    if (isViteProxyOrigin()) {
      return `${window.location.origin}/api/v1`;
    }
    const configuredApi = sanitizeConfiguredUrl(
      import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL
    );
    if (configuredApi && /^https?:\/\//i.test(configuredApi)) {
      return configuredApi.endsWith("/api/v1") ? configuredApi : `${configuredApi}/api/v1`;
    }
    return `${window.location.origin}/api/v1`;
  }
  return sanitizeConfiguredUrl(import.meta.env.VITE_API_BASE_URL) || "http://localhost:5001/api/v1";
};

export const getWebSocketUrl = () => {
  const configuredSocket = sanitizeConfiguredUrl(import.meta.env.VITE_SOCKET_URL);
  if (typeof window !== "undefined" && window.location) {
    if (window.location.hostname.includes("gbs-frontend.onrender.com")) {
      return "wss://gbs-system.onrender.com";
    }
    const wsProto = window.location.protocol === "https:" ? "wss:" : "ws:";
    if (isViteProxyOrigin()) {
      return `${wsProto}//${window.location.host}`;
    }
    if (configuredSocket && /^(https?|wss?):\/\//i.test(configuredSocket)) {
      return configuredSocket.replace(/^http/i, "ws");
    }
    return `${wsProto}//${window.location.host}`;
  }
  return configuredSocket ? configuredSocket.replace(/^http/i, "ws") : "ws://localhost:5001";
};

export const resolveApiUrl = (path = "") => {
  const clean = String(path || "").trim();
  if (!clean) return getApiBaseUrl();
  if (/^https?:\/\//i.test(clean)) return clean;
  if (clean.startsWith("/api/v1") || clean.startsWith("/health") || clean.startsWith("/uploads")) {
    return `${getServerBaseUrl()}${clean}`;
  }
  return `${getApiBaseUrl()}${clean.startsWith("/") ? clean : `/${clean}`}`;
};
