import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import apiClient from "../../../../../api/client/apiClient";
import TopCenterSystemBanner from "../../../../../components/common/TopCenterSystemBanner";
import WindowControlsBar from "../../../../../components/common/WindowControlsBar";
import StaffAttendanceClockWidget from "../../../../../components/common/StaffAttendanceClockWidget";
import SchoolClinicHubPanel from "../../../../../components/common/SchoolClinicHubPanel";
import SchoolStationeryHubPanel from "../../../../../components/common/SchoolStationeryHubPanel";
import LiveCallLauncherAndReceiver from "../../../../../components/common/LiveCallLauncherAndReceiver";
import DirectSMSInboxPanel from "../../../../../components/common/DirectSMSInboxPanel";
import VoiceNoteRecorder from "../../../../../components/common/VoiceNoteRecorder";
import { useDashboardTabSync } from "../../../../../hooks/useDashboardTabSync";
import { getDashboardTheme } from "../../../../../utils/dashboardTheme";
import { getActiveSchoolName, getActiveSchoolLogo } from "../../../../../utils/schoolBranding";
import { getUserAvatar, rotateUserAvatar, getLocalFallbackAvatar } from "../../../../../utils/userAvatars";
import "../teacher/TeacherDashboard.css";

const CLINIC_TAB_TO_SECTION = {
  directory: "DIRECTORY_PROFILES",
  treat: "TREAT_ADMIT",
  registrations: "REGISTRATIONS",
  visits: "VISITS",
  pharmacy: "INVENTORY"
};

export default function ClinicDashboard() {
  const navigate = useNavigate();

  const currentUser = useMemo(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("gbs_user") || "null");
      if (saved) return saved;
    } catch { }
    return {
      id: "usr_clinic_doctor_master",
      firstName: "Dr. Kwame",
      lastName: "Mensah",
      email: "doctor@gbs.com",
      role: "CLINIC_DOCTOR"
    };
  }, []);

  const normalizedRole = String(currentUser?.role || "CLINIC_DOCTOR").toUpperCase();
  const isNurse = normalizedRole === "CLINIC_NURSE" || normalizedRole === "NURSE";
  const clinicianTitle = isNurse ? "School Clinic Nurse" : "School Clinic Doctor";

  const { activeTab, setActiveTab } = useDashboardTabSync("directory", "gbs_clinic_active_tab");
  const [avatarUrl, setAvatarUrl] = useState(() => getUserAvatar(isNurse ? "CLINIC_NURSE" : "CLINIC_DOCTOR"));
  const [isNavyMode, setIsNavyMode] = useState(() => getDashboardTheme() === "navy");
  const [schoolName, setSchoolName] = useState(() => getActiveSchoolName({ isDeveloperContext: false }));
  const [schoolLogo, setSchoolLogo] = useState(() => getActiveSchoolLogo({ isDeveloperContext: false }));
  const [feedback, setFeedback] = useState(null);
  const [clinicKpis, setClinicKpis] = useState({
    totalRegisteredProfiles: 0,
    studentMedicalProfiles: 0,
    teacherAndStaffMedicalProfiles: 0,
    totalClinicVisits: 0,
    activeSickbayCount: 0,
    lowStockItemsCount: 0
  });

  useEffect(() => {
    const syncTheme = () => setIsNavyMode(getDashboardTheme() === "navy");
    const syncBranding = () => {
      setSchoolName(getActiveSchoolName({ isDeveloperContext: false }));
      setSchoolLogo(getActiveSchoolLogo({ isDeveloperContext: false }));
    };
    const tabHandler = (e) => {
      if (e?.detail?.tab) setActiveTab(e.detail.tab);
    };
    window.addEventListener("gbs_theme_changed", syncTheme);
    window.addEventListener("gbs_ui_theme_changed", syncTheme);
    window.addEventListener("gbs_school_branding_updated", syncBranding);
    window.addEventListener("gbs_open_dashboard_tab", tabHandler);
    return () => {
      window.removeEventListener("gbs_theme_changed", syncTheme);
      window.removeEventListener("gbs_ui_theme_changed", syncTheme);
      window.removeEventListener("gbs_school_branding_updated", syncBranding);
      window.removeEventListener("gbs_open_dashboard_tab", tabHandler);
    };
  }, [setActiveTab]);

  const loadClinicOverview = useCallback(async () => {
    try {
      const [profRes, visRes] = await Promise.all([
        apiClient.get("/clinic/profiles").catch(() => null),
        apiClient.get("/clinic/visits").catch(() => null)
      ]);
      const sum = visRes?.data?.data?.summary;
      const profs = profRes?.data?.data?.profiles || [];
      const vis = visRes?.data?.data?.visits || [];
      setClinicKpis({
        totalRegisteredProfiles: sum?.totalRegisteredProfiles ?? profs.length,
        studentMedicalProfiles: sum?.studentMedicalProfiles ?? profs.filter((p) => String(p.personRole || "").toUpperCase() === "STUDENT").length,
        teacherAndStaffMedicalProfiles: sum?.teacherAndStaffMedicalProfiles ?? profs.filter((p) => String(p.personRole || "").toUpperCase() !== "STUDENT").length,
        totalClinicVisits: sum?.totalClinicVisits ?? vis.length,
        activeSickbayCount: sum?.activeSickbayCount ?? vis.filter((v) => v.disposition === "ADMITTED_TO_SICKBAY" && !v.dischargedAt).length,
        lowStockItemsCount: sum?.lowStockItemsCount ?? 0
      });
    } catch { }
  }, []);

  useEffect(() => {
    loadClinicOverview();
  }, [loadClinicOverview]);

  const handleLogout = () => {
    try {
      localStorage.removeItem("gbs_token");
      localStorage.removeItem("gbs_access_token");
      localStorage.removeItem("gbs_user");
      localStorage.removeItem("gbs_auth_role");
      sessionStorage.clear();
    } catch { }
    navigate("/login/clinic");
  };

  const activeClinicSection = CLINIC_TAB_TO_SECTION[activeTab] || "DIRECTORY_PROFILES";

  return (
    <div
      className={`role-dashboard-wrapper clinic-theme ${isNavyMode ? "theme-navy" : ""}`}
      data-testid="clinic-dashboard-root"
    >
      <div
        className="role-dashboard-bg"
        style={{ backgroundImage: "url('/assets/real/school_clinic_medical.jpg')" }}
      />
      <div className="role-dashboard-overlay" />

      <div className="role-dashboard-content">
        <TopCenterSystemBanner roleTitle={`School Clinic & Sickbay (${clinicianTitle})`} />
        <LiveCallLauncherAndReceiver
          variant="GLOBAL_RECEIVER"
          userRole={isNurse ? "CLINIC_NURSE" : "CLINIC_DOCTOR"}
          currentUser={currentUser}
          onFeedback={(msg, isErr) => setFeedback({ type: isErr ? "error" : "success", message: msg })}
        />

        <header className="role-header">
          <div className="role-header-brand">
            <img
              src={schoolLogo || "/assets/gbs_crest_badge.jpg"}
              alt="School Crest"
              className="role-crest"
              onError={(e) => { e.target.src = "/assets/gbs_crest_badge.jpg"; }}
            />
            <div className="role-brand-text">
              <span className="role-brand-title">{String(schoolName || "OFFICIAL SCHOOL").toUpperCase()}</span>
              <span className="role-portal-badge" style={{ color: "#34d399" }}>
                🏥 SCHOOL CLINIC &amp; MEDICAL COMMAND ({clinicianTitle.toUpperCase()})
              </span>
            </div>
          </div>

          <div className="role-status-ticker">
            <span className="ticker-dot" />
            <span>STRICT MEDICAL CONFIDENTIALITY • DOCTORS &amp; NURSES ONLY</span>
          </div>

          <div className="role-header-actions">
            <button
              type="button"
              className="role-action-btn"
              onClick={() => setActiveTab("treat")}
            >
              🩺 Admit / Treat Patient
            </button>
            <button
              type="button"
              className="role-action-btn"
              onClick={() => setActiveTab("pharmacy")}
            >
              💊 Pharmacy Stock
            </button>
            <button
              type="button"
              className="role-action-btn logout"
              onClick={handleLogout}
            >
              🚪 Sign Out
            </button>
          </div>
        </header>

        <main className="role-main">
          <WindowControlsBar title="School Clinic & Medical Portal" />

          {/* Hero Showcase Banner — Authentic Real-Life School Clinic & Doctors/Nurses */}
          <section className="role-hero-banner" data-testid="clinic-hero-banner">
            <div className="role-hero-text">
              <div style={{ display: "flex", alignItems: "center", gap: "14px", marginBottom: "10px", flexWrap: "wrap" }}>
                <img
                  src={avatarUrl}
                  alt={clinicianTitle}
                  onClick={() => setAvatarUrl(rotateUserAvatar(isNurse ? "CLINIC_NURSE" : "CLINIC_DOCTOR"))}
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = getLocalFallbackAvatar("CLINIC_DOCTOR");
                  }}
                  style={{
                    width: "66px",
                    height: "66px",
                    borderRadius: "50%",
                    objectFit: "cover",
                    border: "2.5px solid #34d399",
                    boxShadow: "0 0 16px rgba(52, 211, 153, 0.45)",
                    cursor: "pointer"
                  }}
                />
                <div>
                  <span style={{ display: "inline-block", fontSize: "0.72rem", fontWeight: 800, color: "#6ee7b7", letterSpacing: "1px", textTransform: "uppercase", background: "rgba(16, 185, 129, 0.16)", border: "1px solid rgba(52, 211, 153, 0.45)", padding: "3px 10px", borderRadius: "999px" }}>
                    🏥 DEDICATED INSTITUTIONAL SCHOOL CLINIC PORTAL
                  </span>
                  <h1 style={{ margin: "6px 0 2px" }}>
                    Welcome, {currentUser?.firstName || "Clinic"} {currentUser?.lastName || "Officer"}!
                  </h1>
                </div>
              </div>
              <p className="role-hero-sub">
                Operated exclusively by authorized School Doctors &amp; Nurses. Manage student &amp; staff medical dossiers, clinical consultations, sickbay admissions, pharmacy stock, and emergency alerts while enforcing read-only medical privacy for other staff.
              </p>

              <div className="role-kpi-row">
                <div
                  className="role-kpi-box"
                  onClick={() => setActiveTab("directory")}
                  style={{ cursor: "pointer" }}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setActiveTab("directory"); }}
                >
                  <span className="role-kpi-icon">👥</span>
                  <div className="role-kpi-data">
                    <span className="role-kpi-title">Medical Profiles</span>
                    <strong className="role-kpi-num">{clinicKpis.totalRegisteredProfiles}</strong>
                  </div>
                </div>

                <div
                  className="role-kpi-box"
                  onClick={() => setActiveTab("visits")}
                  style={{ cursor: "pointer" }}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setActiveTab("visits"); }}
                >
                  <span className="role-kpi-icon">🛏️</span>
                  <div className="role-kpi-data">
                    <span className="role-kpi-title">Active Sickbay</span>
                    <strong className="role-kpi-num" style={{ color: clinicKpis.activeSickbayCount > 0 ? "#fb7185" : "#34d399" }}>
                      {clinicKpis.activeSickbayCount}
                    </strong>
                  </div>
                </div>

                <div
                  className="role-kpi-box"
                  onClick={() => setActiveTab("treat")}
                  style={{ cursor: "pointer" }}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setActiveTab("treat"); }}
                >
                  <span className="role-kpi-icon">🩺</span>
                  <div className="role-kpi-data">
                    <span className="role-kpi-title">Clinic Visits</span>
                    <strong className="role-kpi-num">{clinicKpis.totalClinicVisits}</strong>
                  </div>
                </div>

                <div
                  className="role-kpi-box"
                  onClick={() => setActiveTab("pharmacy")}
                  style={{ cursor: "pointer" }}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setActiveTab("pharmacy"); }}
                >
                  <span className="role-kpi-icon">💊</span>
                  <div className="role-kpi-data">
                    <span className="role-kpi-title">Low Stock Alerts</span>
                    <strong className="role-kpi-num" style={{ color: clinicKpis.lowStockItemsCount > 0 ? "#fbbf24" : "#34d399" }}>
                      {clinicKpis.lowStockItemsCount}
                    </strong>
                  </div>
                </div>
              </div>
            </div>

            <div className="role-hero-photo-frame" style={{ minHeight: "340px" }}>
              <img
                src="/assets/real/school_clinic_medical.jpg"
                alt="School Clinic Doctors and Nurses Medical Office"
                style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center" }}
              />
              <div className="photo-live-pill">
                <span className="ticker-dot" />
                <span>SCHOOL CLINIC LIVE DUTY</span>
              </div>
              <div className="photo-caption-tag">
                <strong>School Medical Office &amp; Sickbay</strong>
                <span>Doctors &amp; Nurses Clinical Operations</span>
              </div>
            </div>
          </section>

          {feedback && (
            <div
              style={{
                padding: "12px 18px",
                borderRadius: "10px",
                marginBottom: "1.25rem",
                fontSize: "0.9rem",
                fontWeight: "700",
                backgroundColor: feedback.type === "error" ? "rgba(239, 68, 68, 0.16)" : "rgba(16, 185, 129, 0.16)",
                border: `1px solid ${feedback.type === "error" ? "#ef4444" : "#10b981"}`,
                color: feedback.type === "error" ? "#fca5a5" : "#6ee7b7"
              }}
            >
              {feedback.type === "error" ? "⚠️ " : "✅ "}
              {feedback.message}
            </div>
          )}

          {/* Clinic Doctor & Nurse Duty Clock-In / Auto-Clock-Out */}
          <StaffAttendanceClockWidget
            isClinicDesk={true}
            roleOverride={isNurse ? "CLINIC_NURSE" : "CLINIC_DOCTOR"}
            currentUser={currentUser}
            onFeedback={(msg, isErr) => setFeedback({ type: isErr ? "error" : "success", message: msg })}
          />

          {/* Primary Dashboard Module Navigation */}
          <nav className="role-tab-nav">
            <button
              type="button"
              className={`role-tab-btn ${activeTab === "directory" ? "active" : ""}`}
              onClick={() => setActiveTab("directory")}
            >
              👥 All Patient Profiles ({clinicKpis.totalRegisteredProfiles})
            </button>
            <button
              type="button"
              className={`role-tab-btn ${activeTab === "treat" ? "active" : ""}`}
              onClick={() => setActiveTab("treat")}
            >
              🩺 Admit / Treat Patient
            </button>
            <button
              type="button"
              className={`role-tab-btn ${activeTab === "visits" ? "active" : ""}`}
              onClick={() => setActiveTab("visits")}
            >
              🏥 Sickbay &amp; Visit Log ({clinicKpis.totalClinicVisits})
            </button>
            <button
              type="button"
              className={`role-tab-btn ${activeTab === "registrations" ? "active" : ""}`}
              onClick={() => setActiveTab("registrations")}
            >
              📋 Register / Update Medical Profile
            </button>
            <button
              type="button"
              className={`role-tab-btn ${activeTab === "pharmacy" ? "active" : ""}`}
              onClick={() => setActiveTab("pharmacy")}
            >
              💊 Clinic Pharmacy Stock
            </button>
            <button
              type="button"
              className={`role-tab-btn ${activeTab === "calls" ? "active" : ""}`}
              onClick={() => setActiveTab("calls")}
            >
              📞 Emergency Calls &amp; Direct SMS
            </button>
            <button
              type="button"
              className={`role-tab-btn ${activeTab === "stationery" ? "active" : ""}`}
              onClick={() => setActiveTab("stationery")}
              style={{ borderLeft: "3px solid #d4af37" }}
            >
              🎒 Stationery Price List
            </button>
          </nav>

          {/* Clinical Operational Tabs */}
          {["directory", "treat", "visits", "registrations", "pharmacy"].includes(activeTab) && (
            <SchoolClinicHubPanel
              mode={isNurse ? "CLINIC_NURSE" : "CLINIC_DOCTOR"}
              currentUser={currentUser}
              forcedSubTab={activeClinicSection}
              hideInternalClockWidget={true}
              onSubTabChange={(nextSub) => {
                const mapBack = {
                  DIRECTORY_PROFILES: "directory",
                  TREAT_ADMIT: "treat",
                  REGISTRATIONS: "registrations",
                  VISITS: "visits",
                  INVENTORY: "pharmacy"
                };
                if (mapBack[nextSub]) setActiveTab(mapBack[nextSub]);
              }}
              onFeedback={(msg) => {
                setFeedback({ type: "success", message: msg });
                loadClinicOverview();
              }}
            />
          )}

          {/* Clinic Emergency Voice/Video Calls & SMS */}
          {activeTab === "calls" && (
            <div className="role-workspace-card" style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
              <LiveCallLauncherAndReceiver
                variant="FULL_STUDIO"
                userRole={isNurse ? "CLINIC_NURSE" : "CLINIC_DOCTOR"}
                currentUser={currentUser}
                onFeedback={(msg, isErr) => setFeedback({ type: isErr ? "error" : "success", message: msg })}
              />
              <DirectSMSInboxPanel currentUser={currentUser} />
              <VoiceNoteRecorder currentUser={currentUser} />
            </div>
          )}

          {/* Read-Only Stationery Price List (Headmaster Sets Prices) */}
          {activeTab === "stationery" && (
            <div className="role-workspace-card">
              <SchoolStationeryHubPanel
                currentUser={currentUser}
                mode="CLINIC_DOCTOR"
                isDark={isNavyMode}
              />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
