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
const GBS_BUILD_RELEASE_ID = "2026-11-16-LIVE-V4";
if (typeof window !== "undefined") {
  try {
    const prevRelease = localStorage.getItem("gbs_live_release_id");
    if (prevRelease !== GBS_BUILD_RELEASE_ID) {
      localStorage.setItem("gbs_live_release_id", GBS_BUILD_RELEASE_ID);
    }
  } catch { }

  // Register Native Mobile & Lock Screen Push Service Worker
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("/sw.js").then((reg) => {
        console.log("[GBS PWA] Service Worker registered for Native Mobile & Push Alerts:", reg.scope);
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
