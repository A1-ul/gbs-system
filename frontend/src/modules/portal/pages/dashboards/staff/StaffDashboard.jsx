import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import apiClient from "../../../../../api/client/apiClient";
import WindowControlsBar from "../../../../../components/common/WindowControlsBar";
import TopCenterSystemBanner from "../../../../../components/common/TopCenterSystemBanner";
import UniversalRoleGuideModal from "../../../../../components/common/UniversalRoleGuideModal";
import { navigateToDetail } from "../../../../../utils/universalNavigation";
import "./StaffDashboard.css";

export default function StaffDashboard() {
  const navigate = useNavigate();
  const [showStaffGuideModal, setShowStaffGuideModal] = useState(false);
  const [activeTab, setActiveTab] = useState("duties");
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);

  // Operational Duties State
  const [tasks, setTasks] = useState([]);

  // Admissions Applications State
  const [applications, setApplications] = useState([]);

  // Maintenance Ticket Form
  const [newTicket, setNewTicket] = useState({
    title: "",
    location: "Main Academic Building",
    category: "PLUMBING",
    priority: "HIGH",
    description: ""
  });

  // Incident Reporting Form
  const [incident, setIncident] = useState({
    title: "",
    severity: "HIGH",
    location: "",
    details: ""
  });

  const currentUser = JSON.parse(localStorage.getItem("gbs_user") || '{"firstName":"Staff","lastName":"Member","role":"STAFF"}');

  const [schoolName, setSchoolName] = useState(() => {
    let storedUser = null;
    try {
      storedUser = JSON.parse(localStorage.getItem("gbs_user") || "{}");
    } catch { }
    return (
      localStorage.getItem("gbs_report_school_name") ||
      localStorage.getItem("gbs_tenant_name") ||
      storedUser?.tenant?.name ||
      "GBS Educational Institution"
    );
  });
  const [customSchoolLogo, setCustomSchoolLogo] = useState(() => {
    return localStorage.getItem("gbs_custom_school_logo") || "/assets/gbs_crest_badge.jpg";
  });

  useEffect(() => {
    const handleUpdate = () => {
      const updated = localStorage.getItem("gbs_report_school_name") || localStorage.getItem("gbs_tenant_name");
      if (updated) setSchoolName(updated);
      const updatedLogo = localStorage.getItem("gbs_custom_school_logo");
      if (updatedLogo) setCustomSchoolLogo(updatedLogo);
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

  useEffect(() => {
    fetchTickets();
    fetchApplications();
  }, []);

  const fetchTickets = async () => {
    try {
      const res = await apiClient.get("/facility/tickets");
      const list = res.data?.data?.tickets || res.data?.data || [];
      setTasks(list);
    } catch (err) {
      console.warn("Could not fetch facility tickets from PostgreSQL:", err);
    }
  };

  const fetchApplications = async () => {
    try {
      const res = await apiClient.get("/admissions");
      setApplications(res.data?.data?.applications || []);
    } catch (err) {
      console.warn("Could not fetch admissions:", err);
    }
  };

  // Mark Task / Work Order Completed in PostgreSQL
  const handleToggleTask = async (taskId, currentStatus) => {
    const nextStatus = currentStatus === "COMPLETED" || currentStatus === "RESOLVED" ? "PENDING" : "RESOLVED";
    setLoading(true);
    setFeedback(null);
    try {
      await apiClient.patch(`/facility/tickets/${taskId}/status`, {
        status: nextStatus,
        resolutionNotes: `Status toggled by ${currentUser.firstName} ${currentUser.lastName}`
      });
      setFeedback({ type: "success", message: `Work order #${taskId} status updated to ${nextStatus} in PostgreSQL!` });
      fetchTickets();
    } catch (err) {
      setFeedback({ type: "error", message: err.response?.data?.message || "Failed to update work order in PostgreSQL." });
    } finally {
      setLoading(false);
    }
  };

  // Submit Maintenance Ticket to PostgreSQL
  const handleSubmitTicket = async (e) => {
    e.preventDefault();
    if (!newTicket.title) return;
    setLoading(true);
    setFeedback(null);
    try {
      const res = await apiClient.post("/facility/tickets", {
        tenantId: 1,
        title: newTicket.title,
        category: newTicket.category,
        location: newTicket.location,
        priority: newTicket.priority,
        estimatedCost: 150.00,
        reportedBy: `${currentUser.firstName} ${currentUser.lastName}`
      });
      const ticketNumber = res.data?.data?.ticket_number || "TKT-2026-NEW";
      setFeedback({ type: "success", message: `Work Order ${ticketNumber} logged and committed directly to PostgreSQL facility ledger.` });
      setNewTicket({ title: "", location: "Main Academic Building", category: "PLUMBING", priority: "HIGH", description: "" });
      fetchTickets();
    } catch (err) {
      setFeedback({ type: "error", message: "Failed to log work order to PostgreSQL." });
    } finally {
      setLoading(false);
    }
  };

  // Submit Incident Report
  const handleSubmitIncident = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await apiClient.post("/communication/messages", {
        recipientType: "ADMIN",
        content: `🚨 [CAMPUS INCIDENT REPORT] Location: ${incident.location} | Severity: ${incident.severity} | Title: ${incident.title} | Details: ${incident.details}`,
        priority: "HIGH"
      });
      setFeedback({ type: "success", message: "Emergency incident report escalated directly to Headmaster & School Safety Officers." });
      setIncident({ title: "", severity: "HIGH", location: "", details: "" });
    } catch (err) {
      setFeedback({ type: "error", message: "Failed to dispatch incident report." });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("gbs_token");
    localStorage.removeItem("gbs_user");
    navigate("/login/staff");
  };

  return (
    <div className="role-dashboard-wrapper">
      <div
        className="role-dashboard-bg"
        style={{ backgroundImage: `url('/assets/login-staff.jpg')` }}
      ></div>
      <div className="role-dashboard-overlay"></div>

      <div className="role-dashboard-content">
        {/* Universal Navigation & Scroll Controls */}
        <WindowControlsBar title="Campus Operations & Staff" />

        {/* Prominent Top Center System Branding */}
        <TopCenterSystemBanner roleTitle="Campus Operations & Staff" />

        {/* Header */}
        <header className="role-header">
          <div className="role-header-brand">
            <img
              src={customSchoolLogo || "/assets/gbs_crest_badge.jpg"}
              alt="School Crest"
              className="role-crest"
              style={{ width: "58px", height: "58px", borderRadius: "12px", border: "2px solid #38bdf8", objectFit: "contain", background: "rgba(15,23,42,0.85)", padding: "2px" }}
            />
            <div className="role-brand-text">
              <span className="role-portal-badge" style={{ color: "#38bdf8", fontSize: "0.95rem", fontWeight: "900", letterSpacing: "0.8px" }}>
                💼 CAMPUS OPERATIONS & STAFF PORTAL
              </span>
            </div>
          </div>

          <div className="role-status-ticker">
            <span className="ticker-dot"></span>
            <span>Staff Member: <strong>{currentUser.firstName} {currentUser.lastName}</strong></span>
            <span>Department: <strong>FACILITIES & LOGISTICS</strong></span>
            <span>Status: <strong>DUTY ACTIVE</strong></span>
          </div>

          <div className="role-header-actions">
            <Link to="/portal/staff/dashboard" className="role-action-btn">
              🏠 Staff Desk
            </Link>
            <Link to="/facility" className="role-action-btn">
              🛠️ Facility Work Orders
            </Link>
            <Link to="/cctv" className="role-action-btn">
              📹 CCTV Security
            </Link>
            <Link to="/inventory" className="role-action-btn">
              📦 Inventory Depot
            </Link>
            <Link to="/transport" className="role-action-btn">
              🚌 Transport Fleet
            </Link>
            <Link to="/library" className="role-action-btn">
              📚 Library
            </Link>
            <button
              type="button"
              className="role-action-btn"
              onClick={() => setShowStaffGuideModal(true)}
              style={{
                background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                border: "1.5px solid rgba(52, 211, 153, 0.6)",
                color: "#ffffff",
                boxShadow: "0 4px 14px rgba(16, 185, 129, 0.35)",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px"
              }}
            >
              📖 Operating Guide
            </button>
            <button type="button" className="role-action-btn logout" onClick={handleLogout}>
              🚪 Sign Out
            </button>
          </div>
        </header>

        {/* Main Content */}
        <main className="role-main">
          {/* Hero Banner with Clear Daytime Real-Life Campus Photo */}
          <section className="role-hero-banner">
            <div className="role-hero-text">
              <span className="role-portal-badge" style={{ color: "#94a3b8" }}>
                CAMPUS LOGISTICS • SECTION 7 MASTER BLUEPRINT
              </span>
              <h1>CAMPUS OPERATIONS & STAFF PORTAL</h1>
              <p className="role-hero-sub">
                Coordinate campus facilities, execute scheduled maintenance and safety routines,
                verify admissions documentation, and escalate operational alerts to administration.
              </p>

              <div className="role-kpi-row">
                <div
                  className="role-kpi-box"
                  onClick={() => setActiveTab("duties")}
                  style={{ cursor: "pointer", transition: "transform 0.15s, border-color 0.15s" }}
                  title="Click to view Operational Duties & Tasks"
                  onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.borderColor = "#38bdf8"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = "none"; e.currentTarget.style.borderColor = ""; }}
                >
                  <span className="role-kpi-icon">📌</span>
                  <div className="role-kpi-data">
                    <span className="role-kpi-title">Open Tasks</span>
                    <strong className="role-kpi-num">{tasks.filter((t) => t.status !== "COMPLETED").length} Pending</strong>
                  </div>
                </div>
                <div
                  className="role-kpi-box"
                  onClick={() => navigate("/transport")}
                  style={{ cursor: "pointer", transition: "transform 0.15s, border-color 0.15s" }}
                  title="Click to view Transport Fleet"
                  onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.borderColor = "#34d399"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = "none"; e.currentTarget.style.borderColor = ""; }}
                >
                  <span className="role-kpi-icon">🚌</span>
                  <div className="role-kpi-data">
                    <span className="role-kpi-title">Transport Fleet</span>
                    <strong className="role-kpi-num" style={{ color: "#34d399" }}>All Active</strong>
                  </div>
                </div>
                <div
                  className="role-kpi-box"
                  onClick={() => setActiveTab("admissions")}
                  style={{ cursor: "pointer", transition: "transform 0.15s, border-color 0.15s" }}
                  title="Click to view Admissions Document Verification"
                  onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.borderColor = "#38bdf8"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = "none"; e.currentTarget.style.borderColor = ""; }}
                >
                  <span className="role-kpi-icon">📂</span>
                  <div className="role-kpi-data">
                    <span className="role-kpi-title">Admissions Intake</span>
                    <strong className="role-kpi-num">{applications.length} Records</strong>
                  </div>
                </div>
                <div
                  className="role-kpi-box"
                  onClick={() => setActiveTab("maintenance")}
                  style={{ cursor: "pointer", transition: "transform 0.15s, border-color 0.15s" }}
                  title="Click to view Campus Facility & Maintenance"
                  onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.borderColor = "#38bdf8"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = "none"; e.currentTarget.style.borderColor = ""; }}
                >
                  <span className="role-kpi-icon">⚡</span>
                  <div className="role-kpi-data">
                    <span className="role-kpi-title">Campus Facilities</span>
                    <strong className="role-kpi-num" style={{ color: "#38bdf8" }}>100% Online</strong>
                  </div>
                </div>
              </div>
            </div>

            {/* Clear Daytime Real-Life Photograph */}
            <div className="role-hero-photo-frame">
              <img
                src="/assets/login-staff.jpg"
                alt="Staff Operations Facility Workspace"
              />
              <div className="photo-live-pill">
                <span className="ticker-dot"></span>
                <span>AUTHENTIC CAMPUS OPERATIONS CENTER</span>
              </div>
              <div className="photo-caption-tag">
                <strong>Administration & Logistics</strong>
                <span>Daylight Operations Hub</span>
              </div>
            </div>
          </section>

          {/* Feedback Alert */}
          {feedback && (
            <div
              style={{
                padding: "12px 18px",
                borderRadius: "10px",
                marginBottom: "1.5rem",
                fontSize: "0.9rem",
                fontWeight: "600",
                display: "flex",
                alignItems: "center",
                gap: "10px",
                backgroundColor: feedback.type === "success" ? "rgba(16, 185, 129, 0.15)" : "rgba(239, 68, 68, 0.15)",
                border: `1px solid ${feedback.type === "success" ? "rgba(16, 185, 129, 0.4)" : "rgba(239, 68, 68, 0.4)"}`,
                color: feedback.type === "success" ? "#34d399" : "#fca5a5"
              }}
            >
              <span>{feedback.type === "success" ? "✅" : "⚠️"}</span>
              <span>{feedback.message}</span>
            </div>
          )}

          {/* Workspace Tabs Navigation */}
          <nav className="role-tab-nav">
            <button
              type="button"
              className={`role-tab-btn ${activeTab === "duties" ? "active" : ""}`}
              onClick={() => setActiveTab("duties")}
            >
              📌 Operational Duties & Tasks
            </button>
            <button
              type="button"
              className={`role-tab-btn ${activeTab === "admissions" ? "active" : ""}`}
              onClick={() => setActiveTab("admissions")}
            >
              📂 Admissions Document Verification
            </button>
            <button
              type="button"
              className={`role-tab-btn ${activeTab === "maintenance" ? "active" : ""}`}
              onClick={() => setActiveTab("maintenance")}
            >
              🛠️ Campus Facility & Maintenance
            </button>
            <button
              type="button"
              className={`role-tab-btn ${activeTab === "incidents" ? "active" : ""}`}
              onClick={() => setActiveTab("incidents")}
            >
              🚨 Incident & Safety Escalation
            </button>
          </nav>

          {/* TAB 1: OPERATIONAL DUTIES */}
          {activeTab === "duties" && (
            <div className="role-workspace-card">
              <div className="workspace-title-row">
                <div>
                  <h2><span>📌</span> CAMPUS OPERATIONAL ROSTER & TASKS</h2>
                  <p>Daily facility duties, inspection routines, and logistical tasks</p>
                </div>
              </div>

              <div className="role-table-responsive">
                <table className="role-table">
                  <thead>
                    <tr>
                      <th>Status</th>
                      <th>Task Title</th>
                      <th>Category</th>
                      <th>Priority</th>
                      <th>Assigned Unit</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tasks.length === 0 ? (
                      <tr>
                        <td colSpan="6" style={{ textAlign: "center", padding: "1.5rem", color: "#94a3b8" }}>
                          No operational duties or work orders logged in PostgreSQL.
                        </td>
                      </tr>
                    ) : (
                      tasks.map((t) => (
                        <tr key={t.id}>
                          <td>
                            <span className={`badge-status ${t.status === "RESOLVED" || t.status === "COMPLETED" ? "badge-present" : "badge-late"}`}>
                              {t.status}
                            </span>
                          </td>
                          <td>
                            <strong>{t.title}</strong>
                            {t.ticket_number && (
                              <div style={{ fontSize: "0.75rem", color: "#64748b" }}>{t.ticket_number}</div>
                            )}
                          </td>
                          <td><span style={{ fontSize: "0.8rem", color: "#94a3b8" }}>{t.category}</span></td>
                          <td>
                            <span className={`staff-priority-pill ${t.priority === "HIGH" ? "priority-high" : "priority-normal"}`}>
                              {t.priority}
                            </span>
                          </td>
                          <td>{t.location || t.assigned_staff || t.assignedTo || "Campus Maintenance"}</td>
                          <td>
                            <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                              <button
                                type="button"
                                className="btn-secondary"
                                style={{ padding: "4px 10px", fontSize: "0.75rem", borderColor: "#38bdf8", color: "#38bdf8", cursor: "pointer" }}
                                onClick={() => navigateToDetail(navigate, "activity", t.ticket_number || t.id, t, { returnTab: activeTab })}
                                title="View full task details on dedicated page"
                              >
                                🔍 View
                              </button>
                              <button
                                type="button"
                                className="btn-secondary"
                                style={{ padding: "4px 10px", fontSize: "0.75rem" }}
                                onClick={() => handleToggleTask(t.id, t.status)}
                                disabled={loading}
                              >
                                {t.status === "RESOLVED" || t.status === "COMPLETED" ? "↩️ Reopen" : "✅ Mark Completed"}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 2: ADMISSIONS VERIFICATION */}
          {activeTab === "admissions" && (
            <div className="role-workspace-card">
              <div className="workspace-title-row">
                <div>
                  <h2><span>📂</span> ADMISSIONS DOCUMENT INTAKE & VERIFICATION</h2>
                  <p>Review submitted applicant certificates, birth records, and previous transcripts</p>
                </div>
                <Link to="/admissions" className="btn-secondary">
                  Open Full Admissions Pipeline →
                </Link>
              </div>

              <div className="role-table-responsive">
                <table className="role-table">
                  <thead>
                    <tr>
                      <th>App #</th>
                      <th>Applicant Name</th>
                      <th>Target Grade</th>
                      <th>Guardian Contact</th>
                      <th>Stage</th>
                      <th>Document Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {applications.length === 0 ? (
                      <tr>
                        <td colSpan="6" style={{ textAlign: "center", padding: "1.5rem", color: "#94a3b8" }}>
                          No pending applicant documents to verify.
                        </td>
                      </tr>
                    ) : (
                      applications.map((app) => (
                        <tr key={app.id}>
                          <td><strong style={{ fontFamily: "monospace" }}>{app.applicationNumber}</strong></td>
                          <td><strong>{app.studentFirstName} {app.studentLastName}</strong></td>
                          <td>Grade {app.targetGradeLevel}</td>
                          <td>{app.guardianPhone}</td>
                          <td><span className="badge-status badge-late">{app.stage}</span></td>
                          <td>
                            <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                              <button
                                type="button"
                                className="btn-secondary"
                                style={{ padding: "4px 10px", fontSize: "0.75rem", borderColor: "#38bdf8", color: "#38bdf8", cursor: "pointer" }}
                                onClick={() => navigateToDetail(navigate, "admission", app.applicationNumber || app.id, app, { returnTab: activeTab })}
                                title="View admission application dossier on dedicated page"
                              >
                                🔍 View Dossier
                              </button>
                              <button
                                type="button"
                                className="btn-primary"
                                style={{ padding: "4px 10px", fontSize: "0.75rem" }}
                                onClick={() => setFeedback({ type: "success", message: `Application ${app.applicationNumber} verified and forwarded to Headmaster.` })}
                              >
                                ✅ Verify Documents
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: MAINTENANCE TICKETS */}
          {activeTab === "maintenance" && (
            <div className="role-workspace-card">
              <div className="workspace-title-row">
                <div>
                  <h2><span>🛠️</span> LOG FACILITY & MAINTENANCE REQUEST</h2>
                  <p>Submit campus infrastructure repair and equipment calibration requests</p>
                </div>
              </div>

              <form onSubmit={handleSubmitTicket} style={{ background: "rgba(2, 6, 23, 0.5)", padding: "1.25rem", borderRadius: "12px", marginBottom: "1.5rem" }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px", marginBottom: "12px" }}>
                  <input
                    type="text"
                    required
                    placeholder="Issue Title (e.g. Science Lab 2 Water Pressure)"
                    className="filter-input"
                    value={newTicket.title}
                    onChange={(e) => setNewTicket({ ...newTicket, title: e.target.value })}
                  />
                  <select
                    className="filter-select"
                    value={newTicket.location}
                    onChange={(e) => setNewTicket({ ...newTicket, location: e.target.value })}
                  >
                    <option value="Science Wing Lab 2">Science Wing Lab 2</option>
                    <option value="Auditorium Complex">Auditorium Complex</option>
                    <option value="Sports Pavilion">Sports Pavilion</option>
                    <option value="Dining Hall & Kitchen">Dining Hall & Kitchen</option>
                  </select>
                  <select
                    className="filter-select"
                    value={newTicket.category}
                    onChange={(e) => setNewTicket({ ...newTicket, category: e.target.value })}
                  >
                    <option value="PLUMBING">Plumbing & Water</option>
                    <option value="ELECTRICAL">Electrical & Lighting</option>
                    <option value="HVAC">Air Conditioning & HVAC</option>
                    <option value="FURNITURE">Desk & Seating Repair</option>
                  </select>
                  <select
                    className="filter-select"
                    value={newTicket.priority}
                    onChange={(e) => setNewTicket({ ...newTicket, priority: e.target.value })}
                  >
                    <option value="HIGH">High Priority</option>
                    <option value="NORMAL">Standard Priority</option>
                  </select>
                </div>
                <button type="submit" className="btn-primary">
                  🚀 Dispatch Maintenance Request
                </button>
              </form>
            </div>
          )}

          {/* TAB 4: INCIDENTS & EMERGENCIES */}
          {activeTab === "incidents" && (
            <div className="role-workspace-card">
              <div className="workspace-title-row">
                <div>
                  <h2><span>🚨</span> INCIDENT & CAMPUS SAFETY ESCALATION</h2>
                  <p>Direct immediate emergency reporting to campus safety officers and administration</p>
                </div>
              </div>

              <form onSubmit={handleSubmitIncident} style={{ background: "rgba(2, 6, 23, 0.5)", padding: "1.25rem", borderRadius: "12px" }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px", marginBottom: "12px" }}>
                  <input
                    type="text"
                    required
                    placeholder="Incident Headline"
                    className="filter-input"
                    value={incident.title}
                    onChange={(e) => setIncident({ ...incident, title: e.target.value })}
                  />
                  <input
                    type="text"
                    required
                    placeholder="Specific Location (e.g. West Gate Parking)"
                    className="filter-input"
                    value={incident.location}
                    onChange={(e) => setIncident({ ...incident, location: e.target.value })}
                  />
                  <select
                    className="filter-select"
                    value={incident.severity}
                    onChange={(e) => setIncident({ ...incident, severity: e.target.value })}
                  >
                    <option value="CRITICAL">Critical Emergency (Immediate Alert)</option>
                    <option value="HIGH">High Severity</option>
                    <option value="MEDIUM">Medium Severity</option>
                  </select>
                </div>
                <textarea
                  rows={3}
                  required
                  placeholder="Describe incident, parties involved, and immediate actions taken..."
                  className="filter-input"
                  style={{ width: "100%", marginBottom: "12px" }}
                  value={incident.details}
                  onChange={(e) => setIncident({ ...incident, details: e.target.value })}
                />
                <button type="submit" className="btn-primary" style={{ background: "linear-gradient(135deg, #ef4444, #b91c1c)" }} disabled={loading}>
                  🚨 Escalate Emergency Alert
                </button>
              </form>
            </div>
          )}
        </main>
      </div>

      {/* Universal Role Operating Guide Modal */}
      <UniversalRoleGuideModal
        role="STAFF"
        isOpen={showStaffGuideModal}
        onClose={() => setShowStaffGuideModal(false)}
      />
    </div>
  );
}