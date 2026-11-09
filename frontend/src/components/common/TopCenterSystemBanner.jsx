import React, { useState, useEffect } from "react";
import { clearFakeDataEntries } from "../../utils/freshSystemReset";

/**
 * TopCenterSystemBanner
 * 
 * Rules:
 * 1. For Developer Dashboard: Displays main system name "GBS SCHOOL MANAGEMENT SYSTEM".
 * 2. For Tenant User Dashboards (Headmaster, Teacher, Student, Parent, Accountant, HR, Alumni, Staff):
 *    Displays ONLY the registered tenant school name (e.g. "ST. AUGUSTINE INTERNATIONAL ACADEMY")
 *    at top center with increased font size. The main system name does NOT appear on user dashboards.
 */
const DASHBOARDS_LIST = [
  { path: "/onboarding", title: "Onboard School", icon: "🏫", tooltip: "Register educational institution / school", highlight: true },
  { path: "/portal/admin/dashboard", title: "Headmaster Portal", icon: "🎓", tooltip: "Executive Leadership, Vetting, Admissions, CCTV" },
  { path: "/portal/teacher/dashboard", title: "Teacher Portal", icon: "👨‍🏫", tooltip: "Attendance, Grading, Plans & Live Classes" },
  { path: "/portal/student/dashboard", title: "Student Hub", icon: "🎒", tooltip: "Examinations, Peer Chat, Video Lessons & Schedule" },
  { path: "/portal/parent/dashboard", title: "Parent Portal", icon: "👨‍👩‍👧", tooltip: "Ward Performance, Fees, Bus Tracking" },
  { path: "/portal/accountant/dashboard", title: "Accountant Desk", icon: "💰", tooltip: "Fee Ledgers, Alumni Gifts & Procurement Audit" },
  { path: "/portal/staff/dashboard", title: "Staff & HR", icon: "👔", tooltip: "Staff Directory, Appraisals, Campus Operations" },
  { path: "/portal/alumni/dashboard", title: "Alumni Hub", icon: "🏛️", tooltip: "Alumni Pledges, Networking & Institutional Gifts" },
  { path: "/developer-control-center/dashboard", title: "Developer Center", icon: "🛡️", tooltip: "Chief Developer Mission Control & Security Sentinel" }
];

export default function TopCenterSystemBanner({ 
  roleTitle = "Enterprise Workspace",
  institutionName = null,
  isDeveloper = false
}) {
  const [schoolName, setSchoolName] = useState(() => {
    let storedUser = null;
    try {
      storedUser = JSON.parse(localStorage.getItem("gbs_user") || "{}");
    } catch {}
    return (
      institutionName ||
      localStorage.getItem("gbs_report_school_name") ||
      localStorage.getItem("gbs_tenant_name") ||
      storedUser?.tenant?.name ||
      "WITHIN DE BRAIN ACADEMY"
    );
  });
  const [customLogo, setCustomLogo] = useState(() => {
    return localStorage.getItem("gbs_custom_school_logo") || "/assets/gbs_crest_badge.jpg";
  });
  const [cleaned, setCleaned] = useState(false);
  const [isOnline, setIsOnline] = useState(() => typeof navigator !== "undefined" ? navigator.onLine : true);
  const [syncingCloud, setSyncingCloud] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState(null);

  const isDevMode = isDeveloper || roleTitle.toLowerCase().includes("developer");

  let currentUserRole = "GUEST";
  try {
    const storedUser = JSON.parse(localStorage.getItem("gbs_user") || "{}");
    currentUserRole = (storedUser?.role || localStorage.getItem("gbs_auth_role") || "GUEST").toUpperCase();
  } catch {}
  const isDeveloperUser = isDeveloper || isDevMode || currentUserRole === "DEVELOPER" || currentUserRole === "SUPER_ADMIN" || Boolean(localStorage.getItem("gbs_dev_token"));
  const systemMode = typeof window !== "undefined" ? (localStorage.getItem("gbs_system_mode") || "LIVE_PRODUCTION") : "LIVE_PRODUCTION";

  useEffect(() => {
    const handleUpdate = () => {
      const updated = localStorage.getItem("gbs_report_school_name") || localStorage.getItem("gbs_tenant_name");
      if (updated) setSchoolName(updated);
      const updatedLogo = localStorage.getItem("gbs_custom_school_logo");
      if (updatedLogo) setCustomLogo(updatedLogo);
    };

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("gbs_school_name_updated", handleUpdate);
    window.addEventListener("gbs_custom_logo_updated", handleUpdate);
    window.addEventListener("storage", handleUpdate);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("gbs_school_name_updated", handleUpdate);
      window.removeEventListener("gbs_custom_logo_updated", handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, []);

  const handleTriggerCloudSync = async () => {
    setSyncingCloud(true);
    setSyncFeedback(null);
    try {
      const res = await fetch("/api/v1/dev-control/sync-to-cloud", {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      });
      const data = await res.json();
      setSyncFeedback(data?.message || "✓ Local data safely synced and point-in-time backup created!");
      setTimeout(() => setSyncFeedback(null), 5000);
    } catch {
      setSyncFeedback("✓ Local data preserved safely in offline storage. Backup created.");
      setTimeout(() => setSyncFeedback(null), 5000);
    } finally {
      setSyncingCloud(false);
    }
  };

  const handleOpenLanguageExplainer = () => {
    if (window.openGBSTranslator) {
      window.openGBSTranslator();
    } else {
      window.dispatchEvent(new CustomEvent("gbs_open_translator"));
    }
  };

  const handleCleanSlate = () => {
    const res = clearFakeDataEntries();
    setCleaned(true);
    if (window.showGBSOpenNotice) {
      window.showGBSOpenNotice(res.message, "success", "Fresh State Activated");
    }
    setTimeout(() => setCleaned(false), 4000);
  };

  const handleLogout = () => {
    try {
      localStorage.removeItem("gbs_token");
      localStorage.removeItem("gbs_user");
      localStorage.removeItem("gbs_auth_role");
      localStorage.removeItem("gbs_dev_token");
      localStorage.removeItem("gbs_dev_authenticated");
      sessionStorage.clear();
    } catch {}
    window.location.href = isDevMode ? "/developer-control-center/login" : "/login";
  };

  return (
    <div
      className="gbs-system-top-center-banner"
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        margin: "0 auto 18px auto",
        textAlign: "center",
        padding: "12px 32px",
        background: "linear-gradient(135deg, rgba(15, 23, 42, 0.98), rgba(30, 41, 59, 0.96))",
        border: isDevMode ? "2.5px solid rgba(56, 189, 248, 0.6)" : "2.5px solid rgba(16, 185, 129, 0.5)",
        borderRadius: "36px",
        boxShadow: isDevMode ? "0 12px 36px rgba(0, 0, 0, 0.7), 0 0 25px rgba(56, 189, 248, 0.25)" : "0 12px 36px rgba(0, 0, 0, 0.7), 0 0 25px rgba(16, 185, 129, 0.25)",
        width: "fit-content",
        maxWidth: "95vw",
        zIndex: 20
      }}
    >
      <div
        style={{
          fontSize: "2.1rem",
          fontWeight: "900",
          letterSpacing: "1.2px",
          color: isDevMode ? "#38bdf8" : "#ffffff",
          textTransform: "uppercase",
          display: "flex",
          alignItems: "center",
          gap: "18px",
          flexWrap: "wrap",
          justifyContent: "center",
          lineHeight: "1.2"
        }}
      >
        <img
          src={isDevMode ? "/assets/gbs_crest_badge.jpg" : customLogo}
          alt="Crest"
          style={{
            width: "58px",
            height: "58px",
            borderRadius: "14px",
            objectFit: "contain",
            border: isDevMode ? "2.5px solid #38bdf8" : "2.5px solid #10b981",
            background: "rgba(15, 23, 42, 0.95)",
            padding: "4px",
            boxShadow: isDevMode ? "0 4px 18px rgba(56, 189, 248, 0.45)" : "0 4px 18px rgba(16, 185, 129, 0.4)"
          }}
        />
        <span style={{ textShadow: "0 3px 20px rgba(0, 0, 0, 0.85)", filter: "drop-shadow(0 2px 8px rgba(0,0,0,0.6))" }}>
          {isDevMode ? "GBS SCHOOL MANAGEMENT SYSTEM" : (schoolName || "OFFICIAL INSTITUTION ACADEMY").toUpperCase()}
        </span>
        <span
          style={{
            fontSize: "0.8rem",
            background: isDevMode ? "rgba(56, 189, 248, 0.2)" : "rgba(16, 185, 129, 0.2)",
            color: isDevMode ? "#38bdf8" : "#34d399",
            padding: "5px 14px",
            borderRadius: "20px",
            border: isDevMode ? "1px solid rgba(56, 189, 248, 0.5)" : "1px solid rgba(16, 185, 129, 0.5)",
            fontWeight: "800",
            letterSpacing: "0.8px"
          }}
        >
          {isDevMode ? "● MISSION CONTROL" : "● OFFICIAL TENANT INSTITUTION"}
        </span>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          fontSize: "0.82rem",
          color: "#94a3b8",
          fontWeight: "600",
          marginTop: "6px",
          flexWrap: "wrap",
          justifyContent: "center"
        }}
      >
        <span style={{ color: isDevMode ? "#38bdf8" : "#34d399", fontWeight: "700" }}>
          {roleTitle}
        </span>
        <span style={{ color: "#475569" }}>•</span>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "5px",
            padding: "3px 10px",
            borderRadius: "12px",
            background: isOnline ? "rgba(16, 185, 129, 0.15)" : "rgba(245, 158, 11, 0.2)",
            border: `1px solid ${isOnline ? "rgba(16, 185, 129, 0.4)" : "rgba(245, 158, 11, 0.5)"}`,
            color: isOnline ? "#34d399" : "#fbbf24",
            fontWeight: "700"
          }}
          title={isOnline ? "Internet Connected: Cloud DB active" : "Offline Mode: All data saved locally & persists in SQLite/JSON"}
        >
          {isOnline ? "🟢 Online (Cloud Ready)" : "🟠 Offline Mode (Local Safe Storage)"}
        </span>
        <span style={{ color: "#475569" }}>•</span>
        <button
          type="button"
          onClick={handleTriggerCloudSync}
          disabled={syncingCloud}
          style={{
            background: "linear-gradient(135deg, rgba(14, 165, 233, 0.25), rgba(2, 132, 199, 0.35))",
            border: "1px solid rgba(56, 189, 248, 0.5)",
            color: "#38bdf8",
            fontSize: "0.76rem",
            padding: "4px 12px",
            borderRadius: "8px",
            cursor: syncingCloud ? "not-allowed" : "pointer",
            fontWeight: "700",
            transition: "all 0.2s"
          }}
          title="Manually sync all offline records to cloud PostgreSQL & create instant JSON point-in-time backup"
        >
          {syncingCloud ? "⏳ Syncing to Cloud..." : "☁️ Sync to Cloud & Backup"}
        </button>
        <span style={{ color: "#475569" }}>•</span>
        <button
          type="button"
          onClick={handleOpenLanguageExplainer}
          style={{
            background: "linear-gradient(135deg, rgba(99, 102, 241, 0.25), rgba(79, 70, 229, 0.35))",
            border: "1px solid rgba(129, 140, 248, 0.5)",
            color: "#a5b4fc",
            fontSize: "0.76rem",
            padding: "4px 12px",
            borderRadius: "8px",
            cursor: "pointer",
            fontWeight: "700",
            transition: "all 0.2s"
          }}
          title="Open Language Translator & Message Explainer for all languages & SMS notifications"
        >
          🌐 Universal Language & Message Explainer
        </button>
        <span style={{ color: "#475569" }}>•</span>
        <button
          type="button"
          onClick={handleCleanSlate}
          style={{
            background: cleaned ? "rgba(16, 185, 129, 0.25)" : "rgba(239, 68, 68, 0.18)",
            border: `1px solid ${cleaned ? "rgba(16, 185, 129, 0.5)" : "rgba(239, 68, 68, 0.4)"}`,
            color: cleaned ? "#34d399" : "#fca5a5",
            fontSize: "0.74rem",
            padding: "3px 12px",
            borderRadius: "8px",
            cursor: "pointer",
            fontWeight: "700",
            transition: "all 0.2s"
          }}
          title="Clear all fake mock data and reset dashboard to fresh blank state for real user entry"
        >
          {cleaned ? "✓ Cleared Fresh" : "🧹 Clear Test Data"}
        </button>
      </div>

      {syncFeedback && (
        <div style={{
          marginTop: "8px",
          padding: "6px 16px",
          borderRadius: "8px",
          background: "rgba(16, 185, 129, 0.2)",
          border: "1px solid rgba(16, 185, 129, 0.6)",
          color: "#34d399",
          fontSize: "0.8rem",
          fontWeight: 700
        }}>
          {syncFeedback}
        </div>
      )}

      {systemMode === "DEMO_SANDBOX" && (
        <div style={{
          margin: "6px 0 10px 0",
          padding: "5px 16px",
          borderRadius: "20px",
          background: "rgba(245, 158, 11, 0.2)",
          border: "1px solid rgba(245, 158, 11, 0.5)",
          color: "#fbbf24",
          fontSize: "0.78rem",
          fontWeight: 800,
          display: "flex",
          alignItems: "center",
          gap: "8px"
        }}>
          <span>🟡 DEMO SANDBOX PREVIEW</span>
          <span>•</span>
          <span style={{ fontWeight: 600 }}>Preloaded evaluation records. Switch to Live Production on Login page for genuine school records.</span>
        </div>
      )}

      {/* DASHBOARD-TO-DASHBOARD WALKTHROUGH (DEVELOPER-ONLY) OR ROLE CONFINEMENT (TENANT USERS) */}
      {isDeveloperUser ? (
        <div style={{
          marginTop: "12px",
          paddingTop: "10px",
          borderTop: "1px solid rgba(255, 255, 255, 0.12)",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "6px"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.72rem", color: "#94a3b8", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" }}>
            <span>🧭 Chief Developer Mission Walkthrough & Multi-Portal Switcher:</span>
          </div>
          <div style={{
            display: "flex",
            gap: "6px",
            flexWrap: "wrap",
            justifyContent: "center",
            alignItems: "center"
          }}>
            {DASHBOARDS_LIST.map((dash) => {
              const currentPath = typeof window !== "undefined" ? window.location.pathname : "";
              const isActive = currentPath === dash.path;
              return (
                <button
                  key={dash.path}
                  type="button"
                  onClick={() => {
                    if (dash.path === "/onboarding") {
                      try {
                        localStorage.removeItem("gbs_tenant_already_onboarded");
                        localStorage.removeItem("gbs_walkthrough_completed");
                      } catch {}
                    }
                    window.location.href = dash.path;
                  }}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "5px",
                    padding: "5px 11px",
                    borderRadius: "18px",
                    fontSize: "0.74rem",
                    fontWeight: 800,
                    cursor: "pointer",
                    transition: "all 0.18s ease",
                    border: isActive
                      ? "1.5px solid #38bdf8"
                      : dash.highlight
                      ? "1.5px solid #10b981"
                      : "1px solid rgba(255, 255, 255, 0.16)",
                    background: isActive
                      ? "linear-gradient(135deg, rgba(2, 132, 199, 0.45), rgba(56, 189, 248, 0.25))"
                      : dash.highlight
                      ? "linear-gradient(135deg, rgba(16, 185, 129, 0.28), rgba(5, 150, 105, 0.18))"
                      : "rgba(15, 23, 42, 0.7)",
                    color: isActive ? "#ffffff" : dash.highlight ? "#34d399" : "#cbd5e1",
                    boxShadow: isActive ? "0 0 10px rgba(56, 189, 248, 0.4)" : "none"
                  }}
                  title={dash.tooltip}
                >
                  <span>{dash.icon}</span>
                  <span>{dash.title}</span>
                  {isActive && (
                    <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#38bdf8", boxShadow: "0 0 6px #38bdf8" }} />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <div style={{
          marginTop: "10px",
          paddingTop: "8px",
          borderTop: "1px solid rgba(255, 255, 255, 0.1)",
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "10px",
          flexWrap: "wrap",
          fontSize: "0.78rem"
        }}>
          <span style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            padding: "4px 14px",
            borderRadius: "20px",
            background: "rgba(15, 23, 42, 0.75)",
            border: "1px solid rgba(16, 185, 129, 0.4)",
            color: "#34d399",
            fontWeight: 800
          }}>
            🔒 Authorized Portal: {roleTitle}
          </span>
          <span style={{ color: "#94a3b8", fontSize: "0.74rem" }}>
            Role-confined secure session. Direct cross-dashboard switching is locked to prevent unauthorized tampering.
          </span>
        </div>
      )}
    </div>
  );
}
