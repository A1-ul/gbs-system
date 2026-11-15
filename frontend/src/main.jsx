import React from "react";
import ReactDOM from "react-dom/client";
import { Provider } from "react-redux";
import store from "./platform/store/store";
import App from "./app/App.jsx";

import "./styles/globals.css";
import "./styles/theme.css";
import "./styles/responsive.css";
import "./styles/animations.css";
import "./styles/glass.css";

// Live Internet Cache-Busting & Stale ServiceWorker/Chunk Recovery
const GBS_BUILD_RELEASE_ID = "2026-11-15-LIVE-V3";
if (typeof window !== "undefined") {
  try {
    const prevRelease = localStorage.getItem("gbs_live_release_id");
    if (prevRelease !== GBS_BUILD_RELEASE_ID) {
      localStorage.setItem("gbs_live_release_id", GBS_BUILD_RELEASE_ID);
      if ("serviceWorker" in navigator) {
        navigator.serviceWorker.getRegistrations().then((regs) => {
          regs.forEach((r) => r.unregister());
        }).catch(() => {});
      }
      if ("caches" in window) {
        caches.keys().then((keys) => {
          keys.forEach((k) => caches.delete(k));
        }).catch(() => {});
      }
    }
  } catch { }

  window.addEventListener("vite:preloadError", () => {
    window.location.reload();
  });
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Provider store={store}>
      <App />
    </Provider>
  </React.StrictMode>
);
