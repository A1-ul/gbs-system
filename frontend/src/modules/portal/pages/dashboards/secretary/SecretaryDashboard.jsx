import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import apiClient from "../../../../../api/client/apiClient";
import TopCenterSystemBanner from "../../../../../components/common/TopCenterSystemBanner";
import WindowControlsBar from "../../../../../components/common/WindowControlsBar";
import StaffAttendanceClockWidget from "../../../../../components/common/StaffAttendanceClockWidget";
import SchoolStationeryHubPanel from "../../../../../components/common/SchoolStationeryHubPanel";
import SchoolClinicHubPanel from "../../../../../components/common/SchoolClinicHubPanel";
import LiveCallLauncherAndReceiver from "../../../../../components/common/LiveCallLauncherAndReceiver";
import DirectSMSInboxPanel from "../../../../../components/common/DirectSMSInboxPanel";
import VoiceNoteRecorder from "../../../../../components/common/VoiceNoteRecorder";
import { useDashboardTabSync } from "../../../../../hooks/useDashboardTabSync";
import { checkDemoEntryLimit, trackDemoEntryCreated } from "../../../../../utils/demoLimitGuard";
import { getDashboardTheme } from "../../../../../utils/dashboardTheme";
import { getActiveSchoolName, getActiveSchoolLogo } from "../../../../../utils/schoolBranding";
import { getUserAvatar, rotateUserAvatar, getLocalFallbackAvatar } from "../../../../../utils/userAvatars";
import "../staff/StaffDashboard.css";

export default function SecretaryDashboard() {
  const navigate = useNavigate();
  const currentUser = useMemo(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("gbs_user") || "null");
      if (saved) return saved;
    } catch { }
    return {
      id: "usr_secretary_master",
      firstName: "Evelyn",
      lastName: "Secretary",
      email: "secretary@gbs.com",
      role: "SECRETARY"
    };
  }, []);

  const { activeTab, setActiveTab } = useDashboardTabSync("visitors", "gbs_secretary_active_tab");
  const [avatarUrl, setAvatarUrl] = useState(() => getUserAvatar("SECRETARY"));
  const [isNavyMode, setIsNavyMode] = useState(() => getDashboardTheme() === "navy");
  const [schoolName, setSchoolName] = useState(() => getActiveSchoolName({ isDeveloperContext: false }));
  const [schoolLogo, setSchoolLogo] = useState(() => getActiveSchoolLogo({ isDeveloperContext: false }));
  const [overview, setOverview] = useState({
    activeVisitors: 0,
    totalVisitorsLogged: 0,
    totalLettersAndCirculars: 0,
    upcomingAppointments: 0,
    stationeryItemsCount: 0,
    pendingStationeryOrders: 0
  });
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState(null);

  // Forms State
  const [visitorForm, setVisitorForm] = useState({
    counterpartyName: "",
    phone: "",
    counterpartyRole: "Parent / Guardian",
    purpose: ""
  });
  const [letterForm, setLetterForm] = useState({
    recordType: "CIRCULAR",
    title: "",
    subject: "",
    targetAudience: "ALL_PARENTS",
    content: ""
  });
  const [appointmentForm, setAppointmentForm] = useState({
    title: "",
    counterpartyName: "",
    phone: "",
    scheduledAt: "",
    purpose: ""
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

  const handleLogout = () => {
    try {
      localStorage.removeItem("gbs_token");
      localStorage.removeItem("gbs_access_token");
      localStorage.removeItem("gbs_user");
      localStorage.removeItem("gbs_auth_role");
      sessionStorage.clear();
    } catch { }
    navigate("/login/secretary");
  };

  const fetchSecretaryData = useCallback(async () => {
    setLoading(true);
    try {
      const [ovRes, recRes] = await Promise.all([
        apiClient.get("/secretary/overview"),
        apiClient.get("/secretary/records")
      ]);
      if (ovRes.data?.data?.summary) {
        setOverview(ovRes.data.data.summary);
      }
      if (Array.isArray(recRes.data?.data?.records)) {
        setRecords(recRes.data.data.records);
      }
    } catch (err) {
      setFeedback({
        type: "error",
        message: err?.response?.data?.message || "Unable to load Secretary front-office workspace."
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSecretaryData();
  }, [fetchSecretaryData]);

  const handleCheckInVisitor = async (e) => {
    e.preventDefault();
    setFeedback(null);
    const demoCheck = checkDemoEntryLimit("secretary", "Front Office Records", records.length);
    if (!demoCheck.allowed) {
      setFeedback({ type: "error", message: demoCheck.message });
      return;
    }
    try {
      const res = await apiClient.post("/secretary/records", {
        recordType: "VISITOR_LOG",
        title: `Visitor: ${visitorForm.counterpartyName}`,
        counterpartyName: visitorForm.counterpartyName,
        counterpartyRole: visitorForm.counterpartyRole,
        phone: visitorForm.phone,
        purpose: visitorForm.purpose,
        status: "CHECKED_IN"
      });
      trackDemoEntryCreated("secretary");
      setFeedback({ type: "success", message: res.data?.message || "Visitor checked in." });
      setVisitorForm({ counterpartyName: "", phone: "", counterpartyRole: "Parent / Guardian", purpose: "" });
      fetchSecretaryData();
    } catch (err) {
      setFeedback({ type: "error", message: err?.response?.data?.message || "Failed to log visitor." });
    }
  };

  const handleSaveLetter = async (e) => {
    e.preventDefault();
    setFeedback(null);
    const demoCheck = checkDemoEntryLimit("secretary", "Front Office Records", records.length);
    if (!demoCheck.allowed) {
      setFeedback({ type: "error", message: demoCheck.message });
      return;
    }
    try {
      const res = await apiClient.post("/secretary/records", {
        ...letterForm,
        counterpartyName: letterForm.targetAudience,
        status: "SENT"
      });
      trackDemoEntryCreated("secretary");
      setFeedback({ type: "success", message: res.data?.message || "Official correspondence recorded." });
      setLetterForm({ recordType: "CIRCULAR", title: "", subject: "", targetAudience: "ALL_PARENTS", content: "" });
      fetchSecretaryData();
    } catch (err) {
      setFeedback({ type: "error", message: err?.response?.data?.message || "Failed to dispatch letter/circular." });
    }
  };

  const handleCreateAppointment = async (e) => {
    e.preventDefault();
    setFeedback(null);
    const demoCheck = checkDemoEntryLimit("secretary", "Front Office Records", records.length);
    if (!demoCheck.allowed) {
      setFeedback({ type: "error", message: demoCheck.message });
      return;
    }
    try {
      const res = await apiClient.post("/secretary/records", {
        recordType: "APPOINTMENT",
        ...appointmentForm,
        targetAudience: "HEADMASTER",
        status: "SCHEDULED"
      });
      trackDemoEntryCreated("secretary");
      setFeedback({ type: "success", message: res.data?.message || "Appointment scheduled cleanly." });
      setAppointmentForm({ title: "", counterpartyName: "", phone: "", scheduledAt: "", purpose: "" });
      fetchSecretaryData();
    } catch (err) {
      setFeedback({ type: "error", message: err?.response?.data?.message || "Failed to save appointment." });
    }
  };

  const handleUpdateRecordStatus = async (recordId, status) => {
    setFeedback(null);
    try {
      const res = await apiClient.patch(`/secretary/records/${recordId}/status`, { status });
      setFeedback({ type: "success", message: res.data?.message || `Updated status to ${status}.` });
      fetchSecretaryData();
    } catch (err) {
      setFeedback({ type: "error", message: err?.response?.data?.message || "Unable to update record status." });
    }
  };

  const visitorRecords = records.filter((r) => r.recordType === "VISITOR_LOG");
  const letterRecords = records.filter((r) => ["OFFICIAL_LETTER", "CIRCULAR", "MINUTES"].includes(r.recordType));
  const appointmentRecords = records.filter((r) => r.recordType === "APPOINTMENT");

  return (
    <div
      className={`role-dashboard-wrapper staff-theme ${isNavyMode ? "theme-navy" : ""}`}
      data-testid="secretary-dashboard-root"
    >
      {/* Authentic Real-Life Secretarial Office & Document Desk Ambient Backdrop */}
      <div
        className="role-dashboard-bg"
        style={{ backgroundImage: "url('/assets/real/secretary_office_desk.jpg')" }}
      />
      <div className="role-dashboard-overlay" />

      <div className="role-dashboard-content">
        <TopCenterSystemBanner roleTitle="School Secretary & Front Office" />
        <LiveCallLauncherAndReceiver
          variant="GLOBAL_RECEIVER"
          userRole="SECRETARY"
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
              <span className="role-brand-title">{String(schoolName || "OFFICIAL INSTITUTION").toUpperCase()}</span>
              <span className="role-portal-badge" style={{ color: "#38bdf8" }}>
                🗂️ SCHOOL SECRETARY &amp; FRONT OFFICE PORTAL
              </span>
            </div>
          </div>

          <div className="role-status-ticker">
            <span className="ticker-dot" />
            <span>FRONT DESK • OFFICIAL CORRESPONDENCE • APPOINTMENTS</span>
          </div>

          <div className="role-header-actions">
            <button
              type="button"
              className="role-action-btn"
              onClick={() => setActiveTab("visitors")}
            >
              🪪 Visitor Log
            </button>
            <button
              type="button"
              className="role-action-btn"
              onClick={() => setActiveTab("letters")}
            >
              ✉️ Letters &amp; Circulars
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
          <WindowControlsBar
            title="School Secretary & Front Office Portal"
          />

          {/* Blueprint 2-Column Hero Showcase — Real-Life Secretarial Office & Documents Filling the Hero Frame */}
          <section className="role-hero-banner" data-testid="secretary-hero-banner">
            <div className="role-hero-text">
              <div style={{ display: "flex", alignItems: "center", gap: "14px", marginBottom: "10px", flexWrap: "wrap" }}>
                <img
                  src={avatarUrl}
                  alt="School Secretary"
                  onClick={() => setAvatarUrl(rotateUserAvatar("SECRETARY"))}
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = getLocalFallbackAvatar("SECRETARY");
                  }}
                  style={{
                    width: "68px",
                    height: "68px",
                    borderRadius: "50%",
                    objectFit: "cover",
                    border: "2.5px solid #d4af37",
                    boxShadow: "0 0 18px rgba(212, 175, 55, 0.45)",
                    cursor: "pointer"
                  }}
                />
                <div>
                  <span style={{ display: "inline-block", fontSize: "0.72rem", fontWeight: 800, color: "#f6dd84", letterSpacing: "1px", textTransform: "uppercase", background: "rgba(212, 175, 55, 0.18)", border: "1px solid rgba(212, 175, 55, 0.55)", padding: "3px 10px", borderRadius: "999px" }}>
                    🗂️ FRONT OFFICE &amp; SECRETARIAT DESK
                  </span>
                  <h1 style={{ margin: "6px 0 2px" }}>
                    Welcome, {currentUser?.firstName || "School"} {currentUser?.lastName || "Secretary"}!
                  </h1>
                </div>
              </div>
              <p className="role-hero-sub">
                Coordinate Campus Visitors, Official School Letters &amp; Circulars, Headmaster Appointments, Communications, and View Official Headmaster Stationery Prices.
              </p>

              <div className="role-kpi-row">
                <div
                  className="role-kpi-box"
                  onClick={() => setActiveTab("visitors")}
                  style={{ cursor: "pointer" }}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setActiveTab("visitors"); }}
                  aria-label="Open Visitor Front-Desk Log"
                >
                  <span className="role-kpi-icon">🪪</span>
                  <div className="role-kpi-data">
                    <span className="role-kpi-title">Active Visitors</span>
                    <strong className="role-kpi-num">{overview.activeVisitors}</strong>
                  </div>
                </div>

                <div
                  className="role-kpi-box"
                  onClick={() => setActiveTab("letters")}
                  style={{ cursor: "pointer" }}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setActiveTab("letters"); }}
                  aria-label="Open Letters and Circulars"
                >
                  <span className="role-kpi-icon">✉️</span>
                  <div className="role-kpi-data">
                    <span className="role-kpi-title">Letters &amp; Circulars</span>
                    <strong className="role-kpi-num">{overview.totalLettersAndCirculars}</strong>
                  </div>
                </div>

                <div
                  className="role-kpi-box"
                  onClick={() => setActiveTab("appointments")}
                  style={{ cursor: "pointer" }}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setActiveTab("appointments"); }}
                  aria-label="Open Headmaster Appointments"
                >
                  <span className="role-kpi-icon">📅</span>
                  <div className="role-kpi-data">
                    <span className="role-kpi-title">Appointments</span>
                    <strong className="role-kpi-num">{overview.upcomingAppointments}</strong>
                  </div>
                </div>

                <div
                  className="role-kpi-box"
                  onClick={() => setActiveTab("stationery")}
                  style={{ cursor: "pointer" }}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setActiveTab("stationery"); }}
                  aria-label="Open School Stationery Price List"
                >
                  <span className="role-kpi-icon">🎒</span>
                  <div className="role-kpi-data">
                    <span className="role-kpi-title">Stationery Prices</span>
                    <strong className="role-kpi-num">{overview.stationeryItemsCount} Items</strong>
                  </div>
                </div>
              </div>
            </div>

            {/* Full-Bleed Real-Life Secretarial Office & Official Documents Showcase Image */}
            <div
              className="role-hero-photo-frame"
              data-testid="secretary-real-office-image-frame"
              style={{ minHeight: "340px", height: "100%", width: "100%", border: "2px solid rgba(212, 175, 55, 0.58)" }}
            >
              <img
                src="/assets/real/secretary_office_desk.jpg"
                alt="School Secretary at Executive Secretarial Office Desk with Official School Documents"
                data-testid="secretary-real-office-img"
                style={{ width: "100%", height: "100%", minHeight: "340px", objectFit: "cover", objectPosition: "center", display: "block" }}
              />
              <div className="photo-live-pill">
                <span className="ticker-dot" />
                <span>SECRETARIAT LIVE OFFICE</span>
              </div>
              <div className="photo-caption-tag">
                <strong>Executive Secretariat &amp; Document Desk</strong>
                <span>Official Files • Circulars • Front Office</span>
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
                backgroundColor: feedback.type === "success" ? "rgba(16, 185, 129, 0.15)" : "rgba(239, 68, 68, 0.15)",
                border: `1px solid ${feedback.type === "success" ? "#10b981" : "#ef4444"}`,
                color: feedback.type === "success" ? "#059669" : "#dc2626"
              }}
            >
              {feedback.type === "success" ? "✅ " : "⚠️ "}
              {feedback.message}
            </div>
          )}

          {/* Global Staff Welcome Prompt & Duty Clock-In / Auto-Clock-Out */}
          <StaffAttendanceClockWidget
            roleOverride="SECRETARY"
            currentUser={currentUser}
            onFeedback={(msg, isErr) => setFeedback({ type: isErr ? "error" : "success", message: msg })}
          />

          {/* Workspace Tabs Navigation */}
          <nav className="role-tab-nav">
            <button
              type="button"
              className={`role-tab-btn ${activeTab === "visitors" ? "active" : ""}`}
              onClick={() => setActiveTab("visitors")}
            >
              🪪 Visitor Log ({visitorRecords.length})
            </button>
            <button
              type="button"
              className={`role-tab-btn ${activeTab === "letters" ? "active" : ""}`}
              onClick={() => setActiveTab("letters")}
            >
              ✉️ Letters, Circulars &amp; Minutes ({letterRecords.length})
            </button>
            <button
              type="button"
              className={`role-tab-btn ${activeTab === "appointments" ? "active" : ""}`}
              onClick={() => setActiveTab("appointments")}
            >
              📅 Headmaster Appointments ({appointmentRecords.length})
            </button>
            <button
              type="button"
              data-testid="secretary-stationery-tab"
              className={`role-tab-btn ${activeTab === "stationery" ? "active" : ""}`}
              onClick={() => setActiveTab("stationery")}
              style={{ borderLeft: "3px solid #d4af37" }}
            >
              🎒 Stationery Price List
            </button>
            <button
              type="button"
              className={`role-tab-btn ${activeTab === "calls" ? "active" : ""}`}
              onClick={() => setActiveTab("calls")}
            >
              📞 Video / Voice Calls &amp; SMS
            </button>
            <button
              type="button"
              className={`role-tab-btn ${activeTab === "clinic" ? "active" : ""}`}
              onClick={() => setActiveTab("clinic")}
              style={{ borderLeft: "3px solid #10b981" }}
            >
              🩺 My Health Status
            </button>
          </nav>

          {/* TAB 1: VISITOR FRONT-DESK LOG */}
          {activeTab === "visitors" && (
            <div className="role-workspace-card">
              <div className="workspace-title-row">
                <div>
                  <h2><span>🪪</span> CAMPUS VISITOR FRONT-DESK CHECK-IN / CHECK-OUT</h2>
                  <p>Log visitors, guardians, contractors, and ministry officials visiting campus with live check-out status</p>
                </div>
              </div>

              <form onSubmit={handleCheckInVisitor} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "10px", marginBottom: "1.25rem" }}>
                <input
                  type="text"
                  required
                  className="filter-input"
                  placeholder="Visitor Full Name *"
                  value={visitorForm.counterpartyName}
                  onChange={(e) => setVisitorForm({ ...visitorForm, counterpartyName: e.target.value })}
                />
                <input
                  type="text"
                  className="filter-input"
                  placeholder="Phone Number"
                  value={visitorForm.phone}
                  onChange={(e) => setVisitorForm({ ...visitorForm, phone: e.target.value })}
                />
                <select
                  className="filter-select"
                  value={visitorForm.counterpartyRole}
                  onChange={(e) => setVisitorForm({ ...visitorForm, counterpartyRole: e.target.value })}
                >
                  <option value="Parent / Guardian">Parent / Guardian</option>
                  <option value="Education Inspector">Education Inspector / Official</option>
                  <option value="Supplier / Vendor">Supplier / Vendor</option>
                  <option value="Guest / Alumni">Guest / Alumni</option>
                </select>
                <input
                  type="text"
                  required
                  className="filter-input"
                  placeholder="Purpose / Whom to See *"
                  value={visitorForm.purpose}
                  onChange={(e) => setVisitorForm({ ...visitorForm, purpose: e.target.value })}
                />
                <button type="submit" className="btn-primary">
                  + Check In Visitor
                </button>
              </form>

              <div className="role-table-responsive">
                <table className="role-table">
                  <thead>
                    <tr>
                      <th>Ref #</th>
                      <th>Visitor Name</th>
                      <th>Category &amp; Phone</th>
                      <th>Purpose</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr><td colSpan="6">Loading visitor log...</td></tr>
                    ) : visitorRecords.length === 0 ? (
                      <tr><td colSpan="6">No visitors logged yet today.</td></tr>
                    ) : (
                      visitorRecords.map((v) => (
                        <tr key={v.id}>
                          <td><strong>{v.referenceCode}</strong></td>
                          <td>{v.counterpartyName || v.title}</td>
                          <td>{v.counterpartyRole} {v.phone ? `• ${v.phone}` : ""}</td>
                          <td>{v.purpose || "Front Desk Visit"}</td>
                          <td>
                            <span style={{ fontWeight: 800, color: v.status === "CHECKED_IN" ? "#16a34a" : "#64748b" }}>
                              {v.status}
                            </span>
                          </td>
                          <td>
                            {v.status === "CHECKED_IN" ? (
                              <button
                                type="button"
                                className="btn-secondary"
                                onClick={() => handleUpdateRecordStatus(v.id, "CHECKED_OUT")}
                              >
                                Check Out
                              </button>
                            ) : (
                              <span style={{ fontSize: "0.78rem", color: "#64748b" }}>Departed</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 2: OFFICIAL LETTERS, CIRCULARS & MINUTES */}
          {activeTab === "letters" && (
            <div className="role-workspace-card">
              <div className="workspace-title-row">
                <div>
                  <h2><span>✉️</span> OFFICIAL LETTERS, CIRCULARS &amp; MEETING MINUTES</h2>
                  <p>Draft and archive institutional notices, parent circulars, and official secretariat correspondence</p>
                </div>
              </div>

              <form onSubmit={handleSaveLetter} style={{ display: "grid", gap: "10px", marginBottom: "1.25rem" }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "10px" }}>
                  <select
                    className="filter-select"
                    value={letterForm.recordType}
                    onChange={(e) => setLetterForm({ ...letterForm, recordType: e.target.value })}
                  >
                    <option value="CIRCULAR">School Circular / Memo</option>
                    <option value="OFFICIAL_LETTER">Official Letter</option>
                    <option value="MINUTES">Meeting Minutes</option>
                  </select>
                  <input
                    type="text"
                    required
                    className="filter-input"
                    placeholder="Title / Heading *"
                    value={letterForm.title}
                    onChange={(e) => setLetterForm({ ...letterForm, title: e.target.value })}
                  />
                  <select
                    className="filter-select"
                    value={letterForm.targetAudience}
                    onChange={(e) => setLetterForm({ ...letterForm, targetAudience: e.target.value })}
                  >
                    <option value="ALL_PARENTS">All Parents &amp; Guardians</option>
                    <option value="ALL_STAFF">All Faculty &amp; Staff</option>
                    <option value="HEADMASTER">Headmaster Executive Office</option>
                    <option value="STUDENTS">Student Body</option>
                    <option value="EXTERNAL">External / Ministry</option>
                  </select>
                </div>
                <textarea
                  rows={3}
                  required
                  className="filter-input"
                  placeholder="Write official letter / circular message content..."
                  value={letterForm.content}
                  onChange={(e) => setLetterForm({ ...letterForm, content: e.target.value })}
                />
                <div>
                  <button type="submit" className="btn-primary">
                    Publish &amp; Archive Correspondence
                  </button>
                </div>
              </form>

              <div className="role-table-responsive">
                <table className="role-table">
                  <thead>
                    <tr>
                      <th>Ref</th>
                      <th>Type</th>
                      <th>Title</th>
                      <th>Audience</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {letterRecords.length === 0 ? (
                      <tr><td colSpan="5">No official correspondence drafted yet.</td></tr>
                    ) : (
                      letterRecords.map((l) => (
                        <tr key={l.id}>
                          <td><strong>{l.referenceCode}</strong></td>
                          <td>{l.recordType}</td>
                          <td>
                            <strong>{l.title}</strong>
                            {l.content && <div style={{ fontSize: "0.78rem", opacity: 0.8 }}>{l.content}</div>}
                          </td>
                          <td>{l.targetAudience || "GENERAL"}</td>
                          <td style={{ color: "#16a34a", fontWeight: 700 }}>{l.status}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: HEADMASTER APPOINTMENTS */}
          {activeTab === "appointments" && (
            <div className="role-workspace-card">
              <div className="workspace-title-row">
                <div>
                  <h2><span>📅</span> HEADMASTER &amp; FRONT-OFFICE APPOINTMENTS</h2>
                  <p>Schedule and track parent consultations, vendor briefings, and faculty meetings for the Headmaster</p>
                </div>
              </div>

              <form onSubmit={handleCreateAppointment} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "10px", marginBottom: "1.25rem" }}>
                <input
                  type="text"
                  required
                  className="filter-input"
                  placeholder="Appointment Subject *"
                  value={appointmentForm.title}
                  onChange={(e) => setAppointmentForm({ ...appointmentForm, title: e.target.value })}
                />
                <input
                  type="text"
                  required
                  className="filter-input"
                  placeholder="Visitor / Meeting With *"
                  value={appointmentForm.counterpartyName}
                  onChange={(e) => setAppointmentForm({ ...appointmentForm, counterpartyName: e.target.value })}
                />
                <input
                  type="datetime-local"
                  className="filter-input"
                  value={appointmentForm.scheduledAt}
                  onChange={(e) => setAppointmentForm({ ...appointmentForm, scheduledAt: e.target.value })}
                />
                <input
                  type="text"
                  className="filter-input"
                  placeholder="Purpose / Notes"
                  value={appointmentForm.purpose}
                  onChange={(e) => setAppointmentForm({ ...appointmentForm, purpose: e.target.value })}
                />
                <button type="submit" className="btn-primary">
                  + Schedule Appointment
                </button>
              </form>

              <div className="role-table-responsive">
                <table className="role-table">
                  <thead>
                    <tr>
                      <th>Ref #</th>
                      <th>Subject</th>
                      <th>Guest</th>
                      <th>Purpose</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {appointmentRecords.length === 0 ? (
                      <tr><td colSpan="6">No appointments scheduled.</td></tr>
                    ) : (
                      appointmentRecords.map((a) => (
                        <tr key={a.id}>
                          <td><strong>{a.referenceCode}</strong></td>
                          <td>{a.title}</td>
                          <td>{a.counterpartyName || "-"}</td>
                          <td>{a.purpose || "-"}</td>
                          <td style={{ fontWeight: 800, color: a.status === "COMPLETED" ? "#16a34a" : "#0284c7" }}>{a.status}</td>
                          <td>
                            {a.status !== "COMPLETED" && (
                              <button
                                type="button"
                                className="btn-secondary"
                                onClick={() => handleUpdateRecordStatus(a.id, "COMPLETED")}
                              >
                                Mark Completed
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: SCHOOL STATIONERY & EXPENSE SYNC */}
          {activeTab === "stationery" && (
            <div className="role-workspace-card">
              <SchoolStationeryHubPanel
                currentUser={currentUser}
                mode="SECRETARY"
                isDark={isNavyMode}
                onExpenseRecorded={() => fetchSecretaryData()}
              />
            </div>
          )}

          {/* TAB 5: VIDEO/VOICE CALLS & DIRECT SMS */}
          {activeTab === "calls" && (
            <div className="role-workspace-card" style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
              <LiveCallLauncherAndReceiver
                variant="FULL_STUDIO"
                userRole="SECRETARY"
                currentUser={currentUser}
                onFeedback={(msg, isErr) => setFeedback({ type: isErr ? "error" : "success", message: msg })}
              />
              <DirectSMSInboxPanel currentUser={currentUser} />
              <VoiceNoteRecorder currentUser={currentUser} />
            </div>
          )}

          {/* TAB 6: OWN PERSONAL HEALTH & CLINIC DOSSIER (STRICT CONFIDENTIALITY) */}
          {activeTab === "clinic" && (
            <div className="role-workspace-card">
              <SchoolClinicHubPanel currentUser={currentUser} mode="SELF" />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
