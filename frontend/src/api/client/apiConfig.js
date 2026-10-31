/**
 * apiConfig.js
 * Centralized API & Server URL detection for Desktop, Mobile Phone Browsers, and LAN clients.
 * Automatically resolves to the device host IP (e.g. http://192.168.x.x:5001) when accessed from mobile.
 */

export const getServerHost = () => {
  if (typeof window !== "undefined" && window.location) {
    const hostname = window.location.hostname;
    if (hostname && hostname !== "localhost" && hostname !== "127.0.0.1") {
      return hostname;
    }
  }
  return "localhost";
};

export const getServerBaseUrl = () => {
  const host = getServerHost();
  const port = import.meta.env.VITE_BACKEND_PORT || "5001";
  return `http://${host}:${port}`;
};

export const getApiBaseUrl = () => {
  if (typeof window !== "undefined" && window.location) {
    const hostname = window.location.hostname;
    // When accessed from mobile browser via LAN IP, use that same IP for backend port 5001
    if (hostname && hostname !== "localhost" && hostname !== "127.0.0.1") {
      const port = import.meta.env.VITE_BACKEND_PORT || "5001";
      return `http://${hostname}:${port}/api/v1`;
    }
  }
  return import.meta.env.VITE_API_BASE_URL || "http://localhost:5001/api/v1";
};

export const getWebSocketUrl = () => {
  const host = getServerHost();
  const port = import.meta.env.VITE_BACKEND_PORT || "5001";
  return `ws://${host}:${port}`;
};
