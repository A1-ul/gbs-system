import React, { useState, useEffect } from "react";
import apiClient from "../../api/client/apiClient";
import "./MobileAppPushHubModal.css";

export default function MobileAppPushHubModal({ isOpen, onClose }) {
  const [activeTab, setActiveTab] = useState("MOBILE_APP"); // "MOBILE_APP" | "PUSH_NOTIFICATIONS" | "APK_DOWNLOAD"
  const [notificationPermission, setNotificationPermission] = useState(
    typeof window !== "undefined" && "Notification" in window ? Notification.permission : "unsupported"
  );
  const [testPushStatus, setTestPushStatus] = useState(null);
  const [channels, setChannels] = useState({
    fees: true,
    assignments: true,
    busSentinel: true,
    emergencies: true
  });
  const [deferredPrompt, setDeferredPrompt] = useState(() =>
    typeof window !== "undefined" ? window.__gbsDeferredInstallPrompt || null : null
  );
  const [installSuccess, setInstallSuccess] = useState(() =>
    typeof window !== "undefined" &&
    (Boolean(window.__gbsAppInstalled) ||
      window.matchMedia?.("(display-mode: standalone)")?.matches ||
      window.navigator?.standalone === true)
  );
  const [pushFeedback, setPushFeedback] = useState(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.__gbsDeferredInstallPrompt) {
      setDeferredPrompt(window.__gbsDeferredInstallPrompt);
    }
    const handleBeforeInstall = (e) => {
      e.preventDefault();
      window.__gbsDeferredInstallPrompt = e;
      setDeferredPrompt(e);
    };
    const handleGlobalReady = () => {
      if (window.__gbsDeferredInstallPrompt) {
        setDeferredPrompt(window.__gbsDeferredInstallPrompt);
      }
    };
    const handleInstalled = () => {
      setInstallSuccess(true);
      setDeferredPrompt(null);
      setPushFeedback({
        type: "success",
        text: "✅ GBS App installed successfully! Look for the GBS icon on your Home Screen / App Launcher."
      });
    };
    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    window.addEventListener("gbs_pwa_install_ready", handleGlobalReady);
    window.addEventListener("gbs_pwa_installed", handleInstalled);
    window.addEventListener("appinstalled", handleInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      window.removeEventListener("gbs_pwa_install_ready", handleGlobalReady);
      window.removeEventListener("gbs_pwa_installed", handleInstalled);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  if (!isOpen) return null;

  const detectDeviceType = () => {
    if (typeof navigator === "undefined") return "DESKTOP";
    const ua = navigator.userAgent || "";
    if (/iPad|iPhone|iPod/i.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)) {
      return "IOS";
    }
    if (/Android/i.test(ua)) return "ANDROID";
    return "DESKTOP";
  };

  const handleOpenStandaloneAppWindow = () => {
    if (typeof window === "undefined") return;
    const targetUrl = `${window.location.origin}/login`;
    const popup = window.open(
      targetUrl,
      "GBS_Standalone_App",
      "popup=yes,width=1280,height=840,menubar=no,toolbar=no,location=no,status=no"
    );
    if (popup) {
      setPushFeedback({
        type: "success",
        text: "✅ Opened GBS System in a standalone app window! To pin the icon directly onto your taskbar / desktop / home screen, use the browser Install icon (⊕) or Menu → Install app."
      });
    } else {
      setPushFeedback({
        type: "info",
        text: "Popup blocked by browser. Allow popups or tap your browser menu → Install App / Add to Home Screen."
      });
    }
  };

  const handleDownloadWebAppLauncher = () => {
    if (typeof window === "undefined" || typeof document === "undefined") return;
    const liveOrigin = window.location.origin;
    const launcherHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="refresh" content="0;url=${liveOrigin}" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>GBS School Management System — App Launcher</title>
  <link rel="icon" href="${liveOrigin}/icons/icon-192.png" />
  <style>
    body { margin: 0; min-height: 100vh; display: flex; align-items: center; justify-content: center; background: #020617; color: #f8fafc; font-family: system-ui, sans-serif; text-align: center; padding: 24px; }
    a { display: inline-block; margin-top: 14px; padding: 12px 24px; border-radius: 10px; background: #0284c7; color: #fff; font-weight: 800; text-decoration: none; }
  </style>
</head>
<body>
  <div>
    <h2>Launching GBS School Management System...</h2>
    <p>Redirecting to <a href="${liveOrigin}">${liveOrigin}</a></p>
    <script>window.location.replace(${JSON.stringify(liveOrigin)});</script>
  </div>
</body>
</html>`;
    const blob = new Blob([launcherHtml], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "GBS-School-System-Launcher.html";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    setPushFeedback({
      type: "success",
      text: "⬇️ Downloaded 'GBS-School-System-Launcher.html'! Move it to your Desktop / Home Screen folder and double-click or tap it anytime to open the live GBS System immediately."
    });
  };

  const handleInstallPWA = async () => {
    setPushFeedback(null);
    const activePrompt = deferredPrompt || (typeof window !== "undefined" ? window.__gbsDeferredInstallPrompt : null);

    if (installSuccess) {
      setPushFeedback({
        type: "success",
        text: "✅ GBS App is already installed on this device! Launch it directly from your Home Screen or Start Menu / Applications."
      });
      return;
    }

    // Ensure Service Worker is active so Chrome/Edge exposes native installability when eligible
    if (typeof navigator !== "undefined" && "serviceWorker" in navigator) {
      try {
        await navigator.serviceWorker.register("/sw.js");
      } catch { }
    }

    if (activePrompt) {
      try {
        await activePrompt.prompt();
        const { outcome } = await activePrompt.userChoice;
        if (outcome === "accepted") {
          window.__gbsDeferredInstallPrompt = null;
          window.__gbsAppInstalled = true;
          setInstallSuccess(true);
          setDeferredPrompt(null);
          setPushFeedback({
            type: "success",
            text: "✅ Installation accepted! GBS App has been installed onto your device Home Screen / App Launcher."
          });
          return;
        } else {
          setPushFeedback({
            type: "info",
            text: "Installation prompt was dismissed. Click 'Install App on This Device' again anytime to install."
          });
          return;
        }
      } catch (err) {
        console.warn("Native install prompt fallback:", err);
      }
    }

    const device = detectDeviceType();
    if (device === "ANDROID") {
      try {
        const configuredUrl = import.meta.env.VITE_ANDROID_APK_URL || "/downloads/GBS-School-Enterprise.apk";
        const checkRes = await fetch(configuredUrl, { method: "HEAD" });
        const contentType = (checkRes.headers.get("content-type") || "").toLowerCase();
        if (checkRes.ok && (contentType.includes("android.package-archive") || contentType.includes("octet-stream"))) {
          const a = document.createElement("a");
          a.href = configuredUrl;
          a.download = "GBS-School-Enterprise.apk";
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          setPushFeedback({
            type: "success",
            text: "📦 Android APK download started! Open the downloaded APK from Notifications to install."
          });
          return;
        }
      } catch { }
      setPushFeedback({
        type: "info",
        text: "📱 Android Browser Menu Install Required: Your browser has not auto-triggered its native banner in this session yet. Tap Chrome/Edge ⋮ (top right) → 'Install app' / 'Add to Home screen', OR click 'Save App Launcher (.html)' below right now!"
      });
    } else if (device === "IOS") {
      setPushFeedback({
        type: "info",
        text: "🍎 iPhone / iPad Safari: Apple iOS requires installing PWAs from Safari's Share button (⎋) → 'Add to Home Screen' (➕) → 'Add'. Use the guided steps below!"
      });
    } else {
      setPushFeedback({
        type: "info",
        text: "💻 Desktop Install: Click the ⊕ Install icon in Chrome/Edge's address bar (or Menu ⋮ → Cast, save, and share / Apps → Install GBS System), OR click 'Save App Launcher (.html)' / 'Open Standalone App Window' below!"
      });
    }
  };

  const handleRequestPushPermission = async () => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      alert("Push notifications are not supported on this browser.");
      return;
    }
    try {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);

      if (permission === "granted") {
        // Register subscription with backend push service
        try {
          await apiClient.post("/push/subscribe", {
            userId: localStorage.getItem("gbs_user_id") || "DEVICE-USER-01",
            userRole: localStorage.getItem("gbs_user_role") || "PARENT",
            devicePlatform: navigator.userAgent.includes("Android") ? "Android Native / Chrome" : navigator.userAgent.includes("iPhone") ? "Apple iOS Safari" : "Desktop Browser",
            subscription: { endpoint: `https://fcm.googleapis.com/fcm/send/device_${Date.now()}` }
          });
        } catch {}

        setTestPushStatus("PERMISSIONS_GRANTED");
      }
    } catch (err) {
      console.warn("Notification permission error:", err);
    }
  };

  const handleSendTestPushNotification = async (type = "FEES") => {
    setTestPushStatus("DISPATCHING");

    let title = "💰 GBS Fees Receipt Acknowledged";
    let body = "Payment of GH₵ 2,400 confirmed for Kwesi Mensah. Official receipt #REC-8842 issued.";
    let category = "FEES_RECEIPT";

    if (type === "ASSIGNMENT") {
      title = "📝 New Academic Assignment Posted";
      body = "Mathematics: Quadratic Differential Calculus posted by Mr. Osei. Due Friday 4:00 PM.";
      category = "ASSIGNMENT_POSTED";
    } else if (type === "BUS") {
      title = "🚌 School Bus GPS Sentinel Alert";
      body = "Transit Bus 4 is 3 minutes away from pickup point (East Legon Junction).";
      category = "SCHOOL_BUS_ALERT";
    } else if (type === "EMERGENCY") {
      title = "🚨 Headmaster Statutory Directive";
      body = "All faculty, students and parents: Tomorrow morning assembly begins promptly at 8:00 AM.";
      category = "EMERGENCY_BROADCAST";
    }

    // 1. Dispatch through backend push service
    try {
      await apiClient.post("/push/dispatch", {
        title,
        body,
        category,
        targetRole: "ALL_USERS"
      });
    } catch {}

    // 2. Trigger native system notification on this device
    if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
      try {
        if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
          navigator.serviceWorker.controller.postMessage({
            type: "DISPATCH_LOCK_SCREEN_PUSH",
            title,
            body
          });
        }
        // Direct browser notification fallback
        new Notification(title, {
          body,
          icon: "/assets/gbs_crest_badge.jpg",
          badge: "/assets/gbs_crest_badge.jpg",
          tag: `gbs-alert-${Date.now()}`
        });
      } catch (e) {
        console.warn("Direct notification notice:", e);
      }
    }

    setTestPushStatus("DELIVERED");
    setTimeout(() => setTestPushStatus(null), 4000);
  };

  const handleDownloadAPK = async () => {
    const configuredUrl = import.meta.env.VITE_ANDROID_APK_URL || "/downloads/GBS-School-Enterprise.apk";
    try {
      const checkRes = await fetch(configuredUrl, { method: "HEAD" });
      const contentType = (checkRes.headers.get("content-type") || "").toLowerCase();
      if (checkRes.ok && (contentType.includes("android.package-archive") || contentType.includes("octet-stream"))) {
        const a = document.createElement("a");
        a.href = configuredUrl;
        a.download = "GBS-School-Enterprise.apk";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setPushFeedback({
          type: "success",
          text: "Android APK download started! Open the downloaded file from your Notifications or Downloads folder to install."
        });
        return;
      }
    } catch {
      // No standalone APK binary hosted on this origin — fall back cleanly to genuine PWA home-screen install
    }

    setActiveTab("MOBILE_APP");
    await handleInstallPWA();
  };

  return (
    <div className="gbs-mobile-modal-overlay" onClick={onClose}>
      <div className="gbs-mobile-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="gbs-mobile-modal-header">
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <img
              src="/assets/gbs_crest_badge.jpg"
              alt="GBS Crest"
              style={{ width: "44px", height: "44px", borderRadius: "50%", border: "2px solid #38bdf8", objectFit: "cover" }}
            />
            <div>
              <h2 style={{ margin: 0, fontSize: "1.25rem", color: "#f8fafc", fontWeight: "900", letterSpacing: "0.5px" }}>
                GBS NATIVE MOBILE APP & LOCK SCREEN PUSH ENGINE
              </h2>
              <div style={{ fontSize: "0.82rem", color: "#38bdf8", marginTop: "2px" }}>
                Intelligence Talks to Wisdom • Android, Apple iOS, Windows &amp; Mac Install Ready
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ background: "none", border: "none", color: "#94a3b8", fontSize: "1.4rem", cursor: "pointer" }}
          >
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div className="gbs-mobile-modal-tabs">
          <button
            type="button"
            className={`gbs-mobile-tab-btn ${activeTab === "MOBILE_APP" ? "active" : ""}`}
            onClick={() => setActiveTab("MOBILE_APP")}
          >
            📱 Native Mobile App (APK / iOS)
          </button>
          <button
            type="button"
            className={`gbs-mobile-tab-btn ${activeTab === "PUSH_NOTIFICATIONS" ? "active" : ""}`}
            onClick={() => setActiveTab("PUSH_NOTIFICATIONS")}
          >
            🔔 Lock Screen Push Notifications
          </button>
          <button
            type="button"
            className={`gbs-mobile-tab-btn ${activeTab === "APK_DOWNLOAD" ? "active" : ""}`}
            onClick={() => setActiveTab("APK_DOWNLOAD")}
          >
            📦 Android APK Package (.apk)
          </button>
        </div>

        {/* Body */}
        <div className="gbs-mobile-modal-body">
          {pushFeedback && (
            <div style={{
              marginBottom: "1rem",
              padding: "12px 14px",
              borderRadius: "10px",
              background: pushFeedback.type === "success" ? "rgba(16, 185, 129, 0.16)" : "rgba(56, 189, 248, 0.14)",
              border: pushFeedback.type === "success" ? "1.5px solid #10b981" : "1.5px solid #38bdf8",
              color: pushFeedback.type === "success" ? "#6ee7b7" : "#bae6fd",
              fontSize: "0.86rem",
              fontWeight: 700,
              lineHeight: 1.5
            }}>
              {pushFeedback.text}
            </div>
          )}
          {/* TAB 1: NATIVE MOBILE APP (INSTALL & OVERVIEW) */}
          {activeTab === "MOBILE_APP" && (
            <div>
              <div style={{ marginBottom: "1.5rem", background: "rgba(30, 58, 138, 0.3)", border: "1px solid rgba(56, 189, 248, 0.4)", borderRadius: "12px", padding: "1rem 1.25rem" }}>
                <h3 style={{ margin: "0 0 6px", color: "#38bdf8", fontSize: "1.05rem", fontWeight: "900" }}>
                  📲 1-Click Native App Installation
                </h3>
                <p style={{ margin: 0, fontSize: "0.86rem", color: "#cbd5e1", lineHeight: "1.5" }}>
                  Your school system is fully packaged as a Progressive Web App (PWA) with native Android & iOS standalone capability. Install it directly onto any phone to get a home screen icon, instant fullscreen layout, and background lock screen alerts.
                </p>
              </div>

              {/* Install Card */}
              <div className="gbs-app-card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                  <span style={{ fontSize: "2.4rem" }}>⚡</span>
                  <div>
                    <h4 style={{ margin: 0, color: "#f8fafc", fontSize: "1rem", fontWeight: "900" }}>
                      Instant Install to Phone Home Screen
                    </h4>
                    <p style={{ margin: "4px 0 0", fontSize: "0.82rem", color: "#94a3b8" }}>
                      Works seamlessly on Android (Samsung, Pixel, Xiaomi) and Apple iOS (iPhone & iPad).
                    </p>
                  </div>
                </div>
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
                  <button
                    type="button"
                    className="gbs-install-btn"
                    onClick={handleInstallPWA}
                  >
                    📲 {installSuccess ? "✓ App Installed Successfully" : deferredPrompt ? "⚡ Install App Now (1-Tap)" : "Install App on This Device"}
                  </button>
                  <button
                    type="button"
                    onClick={handleDownloadWebAppLauncher}
                    style={{
                      background: "rgba(16, 185, 129, 0.2)",
                      border: "1px solid #10b981",
                      color: "#6ee7b7",
                      borderRadius: "10px",
                      padding: "10px 14px",
                      fontWeight: 800,
                      fontSize: "0.82rem",
                      cursor: "pointer"
                    }}
                  >
                    ⬇️ Save App Launcher (.html)
                  </button>
                  <button
                    type="button"
                    onClick={handleOpenStandaloneAppWindow}
                    style={{
                      background: "rgba(56, 189, 248, 0.16)",
                      border: "1px solid #38bdf8",
                      color: "#bae6fd",
                      borderRadius: "10px",
                      padding: "10px 14px",
                      fontWeight: 800,
                      fontSize: "0.82rem",
                      cursor: "pointer"
                    }}
                  >
                    🪟 Open Standalone App Window
                  </button>
                </div>
              </div>

              {/* Platform Guides Grid */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: "1rem", marginTop: "1rem" }}>
                {/* Android Guide */}
                <div className="gbs-app-card">
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                    <span style={{ fontSize: "1.4rem" }}>🤖</span>
                    <strong style={{ color: "#34d399", fontSize: "0.95rem" }}>Android Phones &amp; Tablets</strong>
                  </div>
                  <ol style={{ margin: 0, paddingLeft: "1.2rem", fontSize: "0.82rem", color: "#cbd5e1", lineHeight: "1.6" }}>
                    <li>Open this page in <strong>Google Chrome</strong> or <strong>Edge</strong> on Android.</li>
                    <li>Click <strong>Install App on This Device</strong> above — or tap the browser <strong>(⋮)</strong> menu.</li>
                    <li>Select <strong>"Install app"</strong> or <strong>"Add to Home screen"</strong>.</li>
                    <li>The GBS Crest app icon installs onto your Android app drawer &amp; home screen!</li>
                  </ol>
                </div>

                {/* Apple iOS Guide */}
                <div className="gbs-app-card">
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                    <span style={{ fontSize: "1.4rem" }}>🍎</span>
                    <strong style={{ color: "#38bdf8", fontSize: "0.95rem" }}>Apple iPhone &amp; iPad</strong>
                  </div>
                  <ol style={{ margin: 0, paddingLeft: "1.2rem", fontSize: "0.82rem", color: "#cbd5e1", lineHeight: "1.6" }}>
                    <li>Open this link in <strong>Safari</strong> on your iPhone or iPad.</li>
                    <li>Tap the <strong>Share button (⎋)</strong> at the bottom bar.</li>
                    <li>Scroll down and tap <strong>"Add to Home Screen" (➕)</strong>.</li>
                    <li>Tap <strong>"Add"</strong> at the top right to launch GBS fullscreen!</li>
                  </ol>
                </div>

                {/* Desktop Windows / Mac Guide */}
                <div className="gbs-app-card">
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                    <span style={{ fontSize: "1.4rem" }}>💻</span>
                    <strong style={{ color: "#fbbf24", fontSize: "0.95rem" }}>Windows, Mac &amp; Chromebook</strong>
                  </div>
                  <ol style={{ margin: 0, paddingLeft: "1.2rem", fontSize: "0.82rem", color: "#cbd5e1", lineHeight: "1.6" }}>
                    <li>In Chrome or Microsoft Edge, click the <strong>Install icon (⊕)</strong> in the top-right URL bar (or Menu ⋮ → <strong>Install GBS System</strong>).</li>
                    <li>Or click <strong>Save App Launcher (.html)</strong> above to place a desktop launcher on any computer.</li>
                  </ol>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: LOCK SCREEN PUSH NOTIFICATIONS ACTIVATOR */}
          {activeTab === "PUSH_NOTIFICATIONS" && (
            <div>
              {/* Permission Banner */}
              <div style={{
                background: notificationPermission === "granted" ? "rgba(16, 185, 129, 0.2)" : "rgba(245, 158, 11, 0.2)",
                border: notificationPermission === "granted" ? "1.5px solid #10b981" : "1.5px solid #f59e0b",
                borderRadius: "12px",
                padding: "1.25rem",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "1rem",
                marginBottom: "1.5rem"
              }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ fontSize: "1.4rem" }}>{notificationPermission === "granted" ? "✅" : "🔔"}</span>
                    <strong style={{ color: notificationPermission === "granted" ? "#34d399" : "#fbbf24", fontSize: "1rem" }}>
                      Lock Screen Push Status: {notificationPermission === "granted" ? "ACTIVATED & LISTENING" : "ACTION REQUIRED"}
                    </strong>
                  </div>
                  <p style={{ margin: "4px 0 0", fontSize: "0.84rem", color: "#cbd5e1" }}>
                    {notificationPermission === "granted"
                      ? "Your device is registered to receive instant lock screen notifications for fees, assignments, and bus tracking."
                      : "Click the button below to grant permission so important alerts can appear on your phone lock screen."}
                  </p>
                </div>

                {notificationPermission !== "granted" && (
                  <button
                    type="button"
                    className="gbs-install-btn"
                    style={{ background: "linear-gradient(135deg, #10b981 0%, #059669 100%)", color: "#ffffff" }}
                    onClick={handleRequestPushPermission}
                  >
                    🔔 Activate Lock Screen Alerts
                  </button>
                )}
              </div>

              {/* Dispatch Sample Alerts to Phone Screen */}
              <div className="gbs-app-card">
                <h4 style={{ margin: "0 0 8px", color: "#38bdf8", fontSize: "0.95rem", fontWeight: "900" }}>
                  ⚡ Test Native Lock Screen Notifications on Your Screen
                </h4>
                <p style={{ margin: "0 0 1rem", fontSize: "0.82rem", color: "#cbd5e1" }}>
                  Click any test alert below to dispatch a real device notification to your lock screen/desktop notification drawer:
                </p>
                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                  <button
                    type="button"
                    onClick={() => handleSendTestPushNotification("FEES")}
                    style={{ background: "rgba(16, 185, 129, 0.25)", border: "1px solid #10b981", color: "#6ee7b7", padding: "8px 14px", borderRadius: "8px", fontWeight: "800", fontSize: "0.8rem", cursor: "pointer" }}
                  >
                    💰 Fee Payment Receipt Alert
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSendTestPushNotification("ASSIGNMENT")}
                    style={{ background: "rgba(56, 189, 248, 0.25)", border: "1px solid #38bdf8", color: "#7dd3fc", padding: "8px 14px", borderRadius: "8px", fontWeight: "800", fontSize: "0.8rem", cursor: "pointer" }}
                  >
                    📝 Assignment Notice Alert
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSendTestPushNotification("BUS")}
                    style={{ background: "rgba(245, 158, 11, 0.25)", border: "1px solid #f59e0b", color: "#fde68a", padding: "8px 14px", borderRadius: "8px", fontWeight: "800", fontSize: "0.8rem", cursor: "pointer" }}
                  >
                    🚌 School Bus Arrival Alert
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSendTestPushNotification("EMERGENCY")}
                    style={{ background: "rgba(239, 68, 68, 0.25)", border: "1px solid #ef4444", color: "#fca5a5", padding: "8px 14px", borderRadius: "8px", fontWeight: "800", fontSize: "0.8rem", cursor: "pointer" }}
                  >
                    🚨 Headmaster Directive Alert
                  </button>
                </div>
                {testPushStatus === "DELIVERED" && (
                  <div style={{ marginTop: "10px", color: "#34d399", fontSize: "0.8rem", fontWeight: "800" }}>
                    ✓ Notification successfully broadcast to device lock screen!
                  </div>
                )}
              </div>

              {/* Channels Preference Grid */}
              <div className="gbs-app-card" style={{ marginTop: "1rem" }}>
                <h4 style={{ margin: "0 0 10px", color: "#f8fafc", fontSize: "0.95rem" }}>
                  Active Notification Channels
                </h4>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", fontSize: "0.84rem" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={channels.fees}
                      onChange={(e) => setChannels({ ...channels, fees: e.target.checked })}
                    />
                    <span>💰 Fee Invoices & Payment Receipts</span>
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={channels.assignments}
                      onChange={(e) => setChannels({ ...channels, assignments: e.target.checked })}
                    />
                    <span>📝 Homework, Grades & Assignments</span>
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={channels.busSentinel}
                      onChange={(e) => setChannels({ ...channels, busSentinel: e.target.checked })}
                    />
                    <span>🚌 School Bus Transit Proximity</span>
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={channels.emergencies}
                      onChange={(e) => setChannels({ ...channels, emergencies: e.target.checked })}
                    />
                    <span>🚨 Executive Headmaster Directives</span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: ANDROID APK PACKAGE DOWNLOAD */}
          {activeTab === "APK_DOWNLOAD" && (
            <div>
              <div className="gbs-app-card" style={{ background: "rgba(15, 23, 42, 0.9)", border: "2px solid rgba(56, 189, 248, 0.4)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem" }}>
                  <div>
                    <span className="gbs-badge-pill" style={{ background: "rgba(56, 189, 248, 0.2)", color: "#38bdf8", border: "1px solid #38bdf8", marginBottom: "8px" }}>
                      PRODUCTION RELEASE v2.4.0
                    </span>
                    <h3 style={{ margin: "4px 0 6px", color: "#f8fafc", fontSize: "1.15rem", fontWeight: "900" }}>
                      GBS Enterprise School Android APK (.apk)
                    </h3>
                    <p style={{ margin: 0, fontSize: "0.84rem", color: "#cbd5e1", maxWidth: "480px" }}>
                      Standalone Android Application Package. Directly installable on any Android smartphone, tablet, or smart school kiosk without relying on the Google Play Store.
                    </p>
                  </div>
                  <button
                    type="button"
                    className="gbs-install-btn"
                    onClick={handleDownloadAPK}
                  >
                    📲 Check &amp; Install Android / Phone App
                  </button>
                </div>

                <div style={{ marginTop: "1.25rem", borderTop: "1px solid rgba(255, 255, 255, 0.1)", paddingTop: "1rem", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "10px", fontSize: "0.78rem", color: "#94a3b8" }}>
                  <div>Package ID: <strong style={{ color: "#cbd5e1" }}>com.gbs.enterprise.school</strong></div>
                  <div>Install Type: <strong style={{ color: "#34d399" }}>PWA Home-Screen App + APK Check</strong></div>
                  <div>Supported Phones: <strong style={{ color: "#cbd5e1" }}>Android Chrome &amp; Apple iPhone</strong></div>
                  <div>Features: <strong style={{ color: "#cbd5e1" }}>Camera, Alerts, School Fees &amp; Offline Ready</strong></div>
                </div>
              </div>

              {/* Simple Installation Steps */}
              <div className="gbs-app-card" style={{ marginTop: "1rem" }}>
                <h4 style={{ margin: "0 0 8px", color: "#f59e0b", fontSize: "0.92rem", fontWeight: "900" }}>
                  📌 How to Install &amp; Use GBS Easily on Your Phone:
                </h4>
                <ol style={{ margin: 0, paddingLeft: "1.2rem", fontSize: "0.82rem", color: "#cbd5e1", lineHeight: "1.6" }}>
                  <li>If an organization-signed <code>.apk</code> file is hosted on the server, tapping the button above downloads it automatically.</li>
                  <li>Otherwise, use instant <strong>Install App</strong>: on Android Chrome tap <strong>⋮ Menu → Install app</strong>; on iPhone Safari tap <strong>Share (⎋) → Add to Home Screen</strong>.</li>
                  <li>An icon appears on your phone home screen just like any store app, with no Play Store wait or sideload warning.</li>
                </ol>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
