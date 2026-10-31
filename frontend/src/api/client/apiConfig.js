/**
 * apiConfig.js
 * Centralized API & Server URL detection for Desktop, Mobile Phone Browsers, Cloud deployments, and LAN clients.
 * Automatically uses same-origin HTTPS in production/cloud, and port 5001 only during local Vite development.
 */

export const getServerHost = () => {
  if (typeof window !== "undefined" && window.location) {
    return window.location.hostname || "localhost";
  }
  return "localhost";
};

export const getServerBaseUrl = () => {
  if (typeof window !== "undefined" && window.location) {
    // When running in production/cloud or served by backend (port is not local Vite dev 3000/5173)
    if (window.location.port !== "3000" && window.location.port !== "5173") {
      return window.location.origin;
    }
    // Local development: frontend on 3000, backend on 5001
    const host = window.location.hostname;
    const port = import.meta.env.VITE_BACKEND_PORT || "5001";
    return `${window.location.protocol}//${host}:${port}`;
  }
  return "http://localhost:5001";
};

export const getApiBaseUrl = () => {
  if (typeof window !== "undefined" && window.location) {
    // When running in production/cloud or served by backend, use same-origin HTTPS /api/v1
    if (window.location.port !== "3000" && window.location.port !== "5173") {
      return `${window.location.origin}/api/v1`;
    }
    // Local Vite dev:
    const host = window.location.hostname;
    const port = import.meta.env.VITE_BACKEND_PORT || "5001";
    return `${window.location.protocol}//${host}:${port}/api/v1`;
  }
  return import.meta.env.VITE_API_BASE_URL || "http://localhost:5001/api/v1";
};

export const getWebSocketUrl = () => {
  if (typeof window !== "undefined" && window.location) {
    const wsProto = window.location.protocol === "https:" ? "wss:" : "ws:";
    if (window.location.port !== "3000" && window.location.port !== "5173") {
      return `${wsProto}//${window.location.host}`;
    }
    const host = window.location.hostname;
    const port = import.meta.env.VITE_BACKEND_PORT || "5001";
    return `${wsProto}//${host}:${port}`;
  }
  return "ws://localhost:5001";
};
