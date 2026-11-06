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
      "GBS EDUCATIONAL INSTITUTION"
    );
  });
  const [customLogo, setCustomLogo] = useState(() => {
    return localStorage.getItem("gbs_custom_school_logo") || "/assets/gbs_crest_badge.jpg";
  });
  const [cleaned, setCleaned] = useState(false);

  const isDevMode = isDeveloper || roleTitle.toLowerCase().includes("developer");

  useEffect(() => {
    const handleUpdate = () => {
      const updated = localStorage.getItem("gbs_report_school_name") || localStorage.getItem("gbs_tenant_name");
      if (updated) setSchoolName(updated);
      const updatedLogo = localStorage.getItem("gbs_custom_school_logo");
      if (updatedLogo) setCustomLogo(updatedLogo);
    };
    window.addEventListener("gbs_school_name_updated", handleUpdate);
    window.addEventListener("gbs_custom_logo_updated", handleUpdate);
    window.addEventListener("storage", handleUpdate);
    return () => {
      window.removeEventListener("gbs_school_name_updated", handleUpdate);
      window.removeEventListener("gbs_custom_logo_updated", handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, []);

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
        <span>
          Portal Status: <strong style={{ color: "#34d399" }}>ONLINE & VERIFIED</strong>
        </span>
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

      {/* DASHBOARD-TO-DASHBOARD WALKTHROUGH & INSTANT PORTAL SWITCHER */}
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
          <span>🧭 Dashboard-to-Dashboard Portal Navigation & Walkthrough:</span>
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
    </div>
  );
}
