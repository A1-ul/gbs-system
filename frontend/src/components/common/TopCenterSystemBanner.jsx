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
export default function TopCenterSystemBanner({ 
  roleTitle = "Enterprise Workspace",
  institutionName = null,
  isDeveloper = false
}) {
  const [schoolName, setSchoolName] = useState(() => {
    return institutionName || localStorage.getItem("gbs_report_school_name") || localStorage.getItem("gbs_tenant_name") || "St. Augustine Science & Arts Academy";
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
          fontSize: "1.65rem",
          fontWeight: "900",
          letterSpacing: "1.5px",
          color: isDevMode ? "#38bdf8" : "#f8fafc",
          textTransform: "uppercase",
          display: "flex",
          alignItems: "center",
          gap: "14px",
          flexWrap: "wrap",
          justifyContent: "center",
          lineHeight: "1.25"
        }}
      >
        <img
          src={isDevMode ? "/assets/gbs_crest_badge.jpg" : customLogo}
          alt="Crest"
          style={{
            width: "42px",
            height: "42px",
            borderRadius: "10px",
            objectFit: "contain",
            border: isDevMode ? "1.5px solid #38bdf8" : "1.5px solid #10b981",
            background: "rgba(15, 23, 42, 0.85)",
            padding: "2px"
          }}
        />
        <span style={{ textShadow: "0 2px 16px rgba(0, 0, 0, 0.7)" }}>
          {isDevMode ? "GBS SCHOOL MANAGEMENT SYSTEM" : schoolName.toUpperCase()}
        </span>
        <span
          style={{
            fontSize: "0.75rem",
            background: isDevMode ? "rgba(56, 189, 248, 0.2)" : "rgba(16, 185, 129, 0.2)",
            color: isDevMode ? "#38bdf8" : "#34d399",
            padding: "4px 12px",
            borderRadius: "16px",
            border: isDevMode ? "1px solid rgba(56, 189, 248, 0.4)" : "1px solid rgba(16, 185, 129, 0.4)",
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
    </div>
  );
}
