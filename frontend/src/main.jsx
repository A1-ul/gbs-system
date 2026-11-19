import React from "react";
import ReactDOM from "react-dom/client";
import { Provider } from "react-redux";
import store from "./platform/store/store";
import App from "./app/App.jsx";
import { applyDocumentLocale } from "./utils/i18nCountryEngine";

import "./styles/globals.css";
import "./styles/theme.css";
import "./styles/responsive.css";
import "./styles/animations.css";
import "./styles/glass.css";

// Apply Global Country/Language norms & Blueprint Light / Royal Navy theme classes immediately on boot
if (typeof window !== "undefined") {
  try {
    const savedTheme = localStorage.getItem("gbs_ui_theme");
    const isNavy = savedTheme === "navy";
    document.body.classList.toggle("gbs-theme-light", !isNavy);
    document.body.classList.toggle("gbs-theme-navy", isNavy);
    applyDocumentLocale();
  } catch { }
}

// Live Internet Cache-Busting & Stale ServiceWorker/Chunk Recovery
const GBS_BUILD_RELEASE_ID = "2026-11-19-BLUEPRINT-AUTOUPDATE";
if (typeof window !== "undefined") {
  try {
    const prevRelease = localStorage.getItem("gbs_live_release_id");
    if (prevRelease !== GBS_BUILD_RELEASE_ID) {
      localStorage.setItem("gbs_live_release_id", GBS_BUILD_RELEASE_ID);
    }
  } catch { }

  // Preserve native browser install prompt captured early in index.html <head>
  window.__gbsDeferredInstallPrompt = window.__gbsDeferredInstallPrompt || null;
  window.__gbsAppInstalled = Boolean(window.__gbsAppInstalled);
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    window.__gbsDeferredInstallPrompt = e;
    window.dispatchEvent(new CustomEvent("gbs_pwa_install_ready"));
  });
  window.addEventListener("appinstalled", () => {
    window.__gbsDeferredInstallPrompt = null;
    window.__gbsAppInstalled = true;
    window.dispatchEvent(new CustomEvent("gbs_pwa_installed"));
  });

  // Register Native Mobile & Lock Screen Push Service Worker with automatic live update checks
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("/sw.js", { updateViaCache: "none" }).then((reg) => {
        console.log("[GBS PWA] Auto-Updating Service Worker registered:", reg.scope);
        reg.update().catch(() => { });
      }).catch((err) => {
        console.warn("[GBS PWA] Service Worker registration:", err);
      });
    });
  }

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
