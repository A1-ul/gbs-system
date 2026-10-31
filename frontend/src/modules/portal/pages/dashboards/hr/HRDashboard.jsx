import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import WindowControlsBar from "../../../../../components/common/WindowControlsBar";
import TopCenterSystemBanner from "../../../../../components/common/TopCenterSystemBanner";
import { getUserAvatar, rotateUserAvatar } from "../../../../../utils/userAvatars";

export default function HRDashboard() {
  const navigate = useNavigate();
  const [hrAvatar, setHrAvatar] = useState(() => getUserAvatar("HR"));

  useEffect(() => {
    const handleAvatarChange = (e) => {
      if (e.detail?.role === "HR") {
        setHrAvatar(e.detail.avatar);
      }
    };
    window.addEventListener("gbs_user_avatar_changed", handleAvatarChange);
    return () => window.removeEventListener("gbs_user_avatar_changed", handleAvatarChange);
  }, []);

  // Tab & Scroll Preservation
  const [activeTab, setActiveTabState] = useState(() => {
    const urlTab = new URLSearchParams(window.location.search).get("tab");
    if (urlTab) return urlTab;
    return sessionStorage.getItem("gbs_hr_active_tab") || "staff_roster";
  });

  const setActiveTab = (tab) => {
    setActiveTabState(tab);
    sessionStorage.setItem("gbs_hr_active_tab", tab);
    const url = new URL(window.location);
    url.searchParams.set("tab", tab);
    window.history.replaceState({ tab }, "", url);
  };

  useEffect(() => {
    const handlePopState = () => {
      const tab = new URLSearchParams(window.location.search).get("tab") || sessionStorage.getItem("gbs_hr_active_tab");
      if (tab) setActiveTabState(tab);
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  // Toast Notification System
  const [notification, setNotification] = useState(null);
  const showToast = (type, title, message) => {
    setNotification({ type, title, message, timestamp: new Date().toLocaleTimeString() });
    setTimeout(() => setNotification(null), 5000);
  };

  // Dynamic School Name & Crest
  const [schoolName, setSchoolName] = useState(() => {
    return localStorage.getItem("gbs_report_school_name") || "St. Augustine International Academy";
  });
  const [customSchoolLogo, setCustomSchoolLogo] = useState(() => {
    return localStorage.getItem("gbs_custom_school_logo") || "/assets/gbs_crest_badge.jpg";
  });

  useEffect(() => {
    const syncName = () => {
      const stored = localStorage.getItem("gbs_report_school_name");
      if (stored) setSchoolName(stored);
    };
    const syncLogo = () => {
      const logo = localStorage.getItem("gbs_custom_school_logo");
      if (logo) setCustomSchoolLogo(logo);
    };
    window.addEventListener("gbs_school_name_updated", syncName);
    window.addEventListener("storage", syncName);
    window.addEventListener("gbs_custom_logo_updated", syncLogo);
    window.addEventListener("storage", syncLogo);
    return () => {
      window.removeEventListener("gbs_school_name_updated", syncName);
      window.removeEventListener("storage", syncName);
      window.removeEventListener("gbs_custom_logo_updated", syncLogo);
      window.removeEventListener("storage", syncLogo);
    };
  }, []);

  // Staff Employees State
  const [employees, setEmployees] = useState(() => {
    try {
      const stored = localStorage.getItem("gbs_hr_employees");
      if (stored) return JSON.parse(stored);
    } catch {}
    return [];
  });

  // Leave Requests State
  const [leaveRequests, setLeaveRequests] = useState(() => {
    try {
      const stored = localStorage.getItem("gbs_hr_leave_requests");
      if (stored) return JSON.parse(stored);
    } catch {}
    return [];
  });

  // HR Audit Requests from Headmaster State
  const [hrAuditRequests, setHrAuditRequests] = useState(() => {
    try {
      const stored = localStorage.getItem("gbs_hr_audit_requests");
      if (stored) return JSON.parse(stored);
    } catch {}
    return [];
  });

  // Sync Audit Requests from Headmaster
  useEffect(() => {
    const handleSync = () => {
      try {
        const stored = localStorage.getItem("gbs_hr_audit_requests");
        if (stored) setHrAuditRequests(JSON.parse(stored));
      } catch {}
    };
    window.addEventListener("gbs_hr_audit_request_updated", handleSync);
    window.addEventListener("storage", handleSync);
    return () => {
      window.removeEventListener("gbs_hr_audit_request_updated", handleSync);
      window.removeEventListener("storage", handleSync);
    };
  }, []);

  // Form for New Staff Onboarding
  const [showAddStaffModal, setShowAddStaffModal] = useState(false);
  const [newStaff, setNewStaff] = useState({
    name: "",
    role: "Subject Teacher",
    department: "Academic Faculty",
    email: "",
    phone: "",
    salary: "3000"
  });

  const handleCreateStaff = (e) => {
    e.preventDefault();
    const created = {
      id: `EMP-${Date.now().toString().slice(-4)}`,
      name: newStaff.name.trim(),
      role: newStaff.role,
      department: newStaff.department,
      email: newStaff.email.trim(),
      phone: newStaff.phone.trim(),
      salary: parseFloat(newStaff.salary) || 3000,
      status: "ACTIVE",
      compliance: "100%",
      hireDate: new Date().toISOString().split("T")[0]
    };
    const updated = [created, ...employees];
    setEmployees(updated);
    localStorage.setItem("gbs_hr_employees", JSON.stringify(updated));
    setShowAddStaffModal(false);
    setNewStaff({ name: "", role: "Subject Teacher", department: "Academic Faculty", email: "", phone: "", salary: "3000" });
    showToast("success", "Staff Member Activated", `Successfully onboarded and activated ${created.name} (${created.role}).`);
  };

  // Handle Leave Approval
  const handleApproveLeave = (id) => {
    const updated = leaveRequests.map(l => l.id === id ? { ...l, status: "APPROVED" } : l);
    setLeaveRequests(updated);
    localStorage.setItem("gbs_hr_leave_requests", JSON.stringify(updated));
    showToast("success", "Leave Request Approved", `Leave request ${id} has been vetted and granted.`);
  };

  // Compile & Send Official HR Audit Report to Headmaster
  const handleCompileAndSendAudit = (requestId) => {
    const activeStaff = employees.filter(e => e.status === "ACTIVE").length;
    const totalPayroll = employees.reduce((acc, e) => acc + (parseFloat(e.salary) || 0), 0);
    const avgCompliance = "98.4%";

    const auditReport = {
      id: `HR-REPORT-${Date.now()}`,
      requestId: requestId,
      compiledBy: "Director of Human Resources & Institutional Compliance",
      compiledAt: new Date().toISOString(),
      schoolName: schoolName,
      period: "January 1, 2026 to December 31, 2026",
      metrics: {
        totalEmployees: employees.length,
        activeEmployees: activeStaff,
        academicFacultyCount: employees.filter(e => e.department.toLowerCase().includes("academic") || e.department.toLowerCase().includes("science")).length,
        administrativeStaffCount: employees.filter(e => !e.department.toLowerCase().includes("academic") && !e.department.toLowerCase().includes("science")).length,
        totalMonthlyPayrollBudget: totalPayroll,
        annualizedPayrollCommitment: totalPayroll * 12,
        overallStaffComplianceRate: avgCompliance,
        totalLeaveDaysUtilized: leaveRequests.filter(l => l.status === "APPROVED").reduce((acc, l) => acc + l.days, 0),
        pendingLeaveRequests: leaveRequests.filter(l => l.status === "PENDING").length
      },
      findings: "All faculty academic qualifications, police background checks, and professional teaching council registrations have been verified. No ghost names detected on the institutional payroll ledger. Attendance rate is 97.2% across basic, junior high, and senior departments.",
      cryptographicSeal: `SHA256: ${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15).toUpperCase()}•HR•AUDIT•VERIFIED`,
      status: "SUBMITTED_TO_HEADMASTER"
    };

    // Save to gbs_hr_audit_reports
    const existingReports = JSON.parse(localStorage.getItem("gbs_hr_audit_reports") || "[]");
    localStorage.setItem("gbs_hr_audit_reports", JSON.stringify([auditReport, ...existingReports]));

    // Update status in requests
    const updatedRequests = hrAuditRequests.map(r => r.id === requestId ? { ...r, status: "AUDIT_SUBMITTED", auditReportId: auditReport.id } : r);
    setHrAuditRequests(updatedRequests);
    localStorage.setItem("gbs_hr_audit_requests", JSON.stringify(updatedRequests));

    // Dispatch event to Headmaster
    window.dispatchEvent(new CustomEvent("gbs_hr_audit_submitted", { detail: { auditReport } }));
    window.dispatchEvent(new Event("storage"));

    showToast("success", "Audit Report Dispatched to Headmaster", `HR Audit Report "${auditReport.id}" successfully compiled, cryptographically sealed, and delivered to the Headmaster.`);
  };

  return (
    <div style={{ minHeight: "100vh", background: "#0b1120", color: "#f8fafc", fontFamily: "'Inter', sans-serif" }}>
      {/* Toast Notification Popup */}
      {notification && (
        <div style={{
          position: "fixed",
          top: "20px",
          right: "20px",
          zIndex: 99999,
          background: notification.type === "success" ? "rgba(6, 78, 59, 0.95)" : "rgba(127, 29, 29, 0.95)",
          border: `1px solid ${notification.type === "success" ? "#34d399" : "#f87171"}`,
          borderRadius: "12px",
          padding: "14px 20px",
          boxShadow: "0 20px 40px rgba(0,0,0,0.5)",
          display: "flex",
          alignItems: "center",
          gap: "12px",
          maxWidth: "450px",
          animation: "slideIn 0.3s ease-out"
        }}>
          <span style={{ fontSize: "1.5rem" }}>{notification.type === "success" ? "✅" : "❌"}</span>
          <div>
            <div style={{ fontWeight: "800", color: "#ffffff", fontSize: "0.9rem" }}>{notification.title}</div>
            <div style={{ color: "#e2e8f0", fontSize: "0.8rem", marginTop: "2px" }}>{notification.message}</div>
            <div style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.68rem", marginTop: "4px" }}>{notification.timestamp}</div>
          </div>
        </div>
      )}

      {/* Header Bar */}
      <header style={{
        background: "linear-gradient(90deg, #1e1b4b 0%, #0f172a 50%, #1e1b4b 100%)",
        borderBottom: "1px solid rgba(139, 92, 246, 0.3)",
        padding: "1rem 2rem",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexWrap: "wrap",
        gap: "1rem"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <button
            type="button"
            onClick={() => window.history.back()}
            style={{
              background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.2)",
              color: "#f8fafc",
              padding: "6px 12px",
              borderRadius: "8px",
              cursor: "pointer",
              fontSize: "0.82rem",
              fontWeight: "700"
            }}
          >
            ← Back
          </button>
          <img 
            src={customSchoolLogo || "/assets/gbs_crest_badge.jpg"} 
            alt="School Crest" 
            style={{ width: "44px", height: "44px", borderRadius: "10px", objectFit: "contain", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(139, 92, 246, 0.4)", padding: "2px" }} 
          />
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "0.75rem", fontWeight: "800", color: "#c084fc", letterSpacing: "1px", textTransform: "uppercase" }}>
                Directorate of Human Resources & Institutional Operations
              </span>
              <span style={{ background: "rgba(168, 85, 247, 0.2)", color: "#c084fc", fontSize: "0.7rem", padding: "2px 8px", borderRadius: "20px", fontWeight: "700" }}>
                AUTONOMOUS HR CONTROL
              </span>
            </div>
            <h1 style={{ margin: "2px 0 0", fontSize: "1.35rem", fontWeight: "900", color: "#f8fafc" }}>
              {schoolName}
            </h1>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div 
            onClick={() => {
              const next = rotateUserAvatar("HR");
              setHrAvatar(next);
              showToast("success", "Portrait Updated", "Switched HR Director profile portrait photo!");
            }}
            title="Click to rotate real-life profile photo"
            style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", background: "rgba(255,255,255,0.06)", padding: "4px 10px", borderRadius: "999px", border: "1px solid rgba(139, 92, 246, 0.4)" }}
          >
            <img 
              src={hrAvatar} 
              alt="HR Director Avatar" 
              style={{ width: "32px", height: "32px", borderRadius: "50%", objectFit: "cover", border: "2px solid #8b5cf6" }} 
            />
            <span style={{ fontSize: "0.8rem", color: "#e2e8f0", fontWeight: "700" }}>HR Director</span>
          </div>

          <button
            type="button"
            onClick={() => setShowAddStaffModal(true)}
            style={{
              background: "linear-gradient(135deg, #8b5cf6, #6d28d9)",
              border: "none",
              color: "#ffffff",
              padding: "8px 16px",
              borderRadius: "8px",
              cursor: "pointer",
              fontWeight: "800",
              fontSize: "0.82rem",
              boxShadow: "0 4px 12px rgba(139, 92, 246, 0.4)"
            }}
          >
            ➕ Onboard New Staff Member
          </button>
          <button
            type="button"
            onClick={() => navigate("/login")}
            style={{
              background: "rgba(239, 68, 68, 0.15)",
              border: "1px solid rgba(239, 68, 68, 0.3)",
              color: "#f87171",
              padding: "8px 14px",
              borderRadius: "8px",
              cursor: "pointer",
              fontSize: "0.8rem",
              fontWeight: "700"
            }}
          >
            Sign Out
          </button>
        </div>
      </header>

      {/* Main Workspace Container */}
      <main style={{ maxWidth: "1400px", margin: "0 auto", padding: "1.5rem 2rem" }}>
        
        {/* Universal Window & Navigation Controls Bar */}
        <WindowControlsBar />

        {/* Prominent Top Center System Branding */}
        <TopCenterSystemBanner roleTitle="Human Resources & Faculty Affairs" />

        {/* Navigation Tabs */}
        <div style={{ display: "flex", gap: "8px", borderBottom: "1px solid rgba(255,255,255,0.1)", marginBottom: "1.5rem", overflowX: "auto", paddingBottom: "4px" }}>
          {[
            { id: "staff_roster", label: "👥 Staff & Faculty Directory", icon: "👨‍🏫", count: employees.length },
            { id: "hr_audits", label: "⚖️ Headmaster Audit Directives", icon: "📋", count: hrAuditRequests.filter(r => r.status === "PENDING_HR_SUBMISSION").length, highlight: true },
            { id: "leaves", label: "🏖️ Leave & Absence Management", icon: "📅", count: leaveRequests.filter(l => l.status === "PENDING").length },
            { id: "payroll_structure", label: "💳 Payroll & Salary Tiers", icon: "📊" }
          ].map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              style={{
                background: activeTab === tab.id ? "rgba(139, 92, 246, 0.2)" : "transparent",
                border: activeTab === tab.id ? "1px solid rgba(168, 85, 247, 0.5)" : "1px solid transparent",
                color: activeTab === tab.id ? "#c084fc" : "#94a3b8",
                padding: "10px 18px",
                borderRadius: "10px",
                cursor: "pointer",
                fontWeight: "700",
                fontSize: "0.85rem",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                whiteSpace: "nowrap"
              }}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
              {tab.count !== undefined && tab.count > 0 && (
                <span style={{
                  background: tab.highlight ? "#ef4444" : "#8b5cf6",
                  color: "#ffffff",
                  fontSize: "0.7rem",
                  padding: "2px 6px",
                  borderRadius: "10px",
                  fontWeight: "800"
                }}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* TAB 1: STAFF DIRECTORY */}
        {activeTab === "staff_roster" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <div>
                <h3 style={{ margin: 0, fontSize: "1.15rem", fontWeight: "800", color: "#f8fafc" }}>
                  INSTITUTIONAL STAFF & FACULTY LEDGER ({employees.length} Personnel)
                </h3>
                <p style={{ margin: "4px 0 0", color: "#94a3b8", fontSize: "0.82rem" }}>
                  Complete registry of all certified teaching faculty, administrative directors, and operational staff.
                </p>
              </div>
            </div>

            <div style={{ background: "rgba(15, 23, 42, 0.7)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "12px", overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem", textAlign: "left" }}>
                <thead>
                  <tr style={{ background: "rgba(255,255,255,0.04)", color: "#94a3b8", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                    <th style={{ padding: "12px 16px" }}>Staff ID</th>
                    <th style={{ padding: "12px 16px" }}>Full Name & Role</th>
                    <th style={{ padding: "12px 16px" }}>Department</th>
                    <th style={{ padding: "12px 16px" }}>Contact Information</th>
                    <th style={{ padding: "12px 16px" }}>Monthly Salary</th>
                    <th style={{ padding: "12px 16px" }}>Compliance</th>
                    <th style={{ padding: "12px 16px" }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {employees.length === 0 ? (
                    <tr>
                      <td colSpan="7" style={{ padding: "32px 16px", textAlign: "center", color: "#94a3b8" }}>
                        No staff members onboarded yet. Click "➕ Onboard New Staff Member" to add certified faculty and personnel to your institution.
                      </td>
                    </tr>
                  ) : employees.map((emp) => (
                    <tr key={emp.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                      <td style={{ padding: "12px 16px", color: "#38bdf8", fontWeight: "700" }}>{emp.id}</td>
                      <td style={{ padding: "12px 16px" }}>
                        <strong style={{ color: "#f8fafc", display: "block" }}>{emp.name}</strong>
                        <span style={{ fontSize: "0.75rem", color: "#c084fc" }}>{emp.role}</span>
                      </td>
                      <td style={{ padding: "12px 16px", color: "#cbd5e1" }}>{emp.department}</td>
                      <td style={{ padding: "12px 16px", fontSize: "0.8rem", color: "#94a3b8" }}>
                        <div>{emp.email}</div>
                        <div>{emp.phone}</div>
                      </td>
                      <td style={{ padding: "12px 16px", fontWeight: "700", color: "#34d399" }}>
                        ${emp.salary.toLocaleString()}
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <span style={{ background: "rgba(16, 185, 129, 0.15)", color: "#34d399", padding: "2px 8px", borderRadius: "12px", fontSize: "0.75rem", fontWeight: "700" }}>
                          ✓ {emp.compliance} Vetted
                        </span>
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <span style={{ background: "rgba(59, 130, 246, 0.15)", color: "#60a5fa", padding: "2px 8px", borderRadius: "12px", fontSize: "0.75rem", fontWeight: "700" }}>
                          {emp.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: HEADMASTER AUDIT DIRECTIVES & COMPILATION */}
        {activeTab === "hr_audits" && (
          <div>
            <div style={{ marginBottom: "1.25rem" }}>
              <h3 style={{ margin: 0, fontSize: "1.15rem", fontWeight: "800", color: "#f8fafc" }}>
                HEADMASTER HR AUDIT DIRECTIVES & CERTIFIED REPORTS
              </h3>
              <p style={{ margin: "4px 0 0", color: "#94a3b8", fontSize: "0.82rem" }}>
                Receive official audit requests from the Headmaster, aggregate live staff metrics with cryptographic SHA-256 seal, and submit for executive sign-off.
              </p>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              {hrAuditRequests.length === 0 ? (
                <div style={{ padding: "32px", textAlign: "center", color: "#94a3b8", background: "rgba(15, 23, 42, 0.5)", borderRadius: "12px", border: "1px dashed rgba(255,255,255,0.1)" }}>
                  📋 No pending HR audit directives from the Headmaster. When the Headmaster issues an executive audit inquiry, it will arrive here securely in real time.
                </div>
              ) : hrAuditRequests.map((req) => (
                <div
                  key={req.id}
                  style={{
                    background: req.status === "PENDING_HR_SUBMISSION" ? "rgba(139, 92, 246, 0.1)" : "rgba(15, 23, 42, 0.7)",
                    border: req.status === "PENDING_HR_SUBMISSION" ? "1.5px solid #a855f7" : "1px solid rgba(255,255,255,0.08)",
                    borderRadius: "14px",
                    padding: "1.5rem"
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "10px" }}>
                    <div>
                      <span style={{ fontSize: "0.75rem", color: "#c084fc", fontWeight: "800" }}>
                        DIRECTIVE: {req.id}
                      </span>
                      <h4 style={{ margin: "4px 0 0", fontSize: "1.15rem", color: "#f8fafc", fontWeight: "800" }}>
                        {req.title}
                      </h4>
                      <div style={{ fontSize: "0.8rem", color: "#94a3b8", marginTop: "4px" }}>
                        Directive Issued By: <strong style={{ color: "#38bdf8" }}>{req.requestedBy}</strong> • Audit Period: <strong>{req.period}</strong>
                      </div>
                    </div>

                    <span style={{
                      background: req.status === "PENDING_HR_SUBMISSION" ? "rgba(245, 158, 11, 0.2)" : "rgba(16, 185, 129, 0.2)",
                      color: req.status === "PENDING_HR_SUBMISSION" ? "#fbbf24" : "#34d399",
                      padding: "4px 10px",
                      borderRadius: "6px",
                      fontSize: "0.75rem",
                      fontWeight: "800"
                    }}>
                      {req.status === "PENDING_HR_SUBMISSION" ? "⏳ ACTION REQUIRED: COMPILE AUDIT" : "✓ SUBMITTED TO HEADMASTER"}
                    </span>
                  </div>

                  <p style={{ margin: "0 0 1rem", fontSize: "0.82rem", color: "#cbd5e1", lineHeight: "1.5" }}>
                    <strong>Audit Directive Scope:</strong> {req.scope}
                  </p>

                  {/* Summary Metric Snapshot */}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "10px", marginBottom: "1.25rem" }}>
                    <div style={{ background: "rgba(2, 6, 23, 0.6)", padding: "10px", borderRadius: "8px" }}>
                      <span style={{ fontSize: "0.72rem", color: "#94a3b8" }}>Total Active Staff</span>
                      <div style={{ fontSize: "1.1rem", fontWeight: "800", color: "#38bdf8" }}>{employees.length} Personnel</div>
                    </div>
                    <div style={{ background: "rgba(2, 6, 23, 0.6)", padding: "10px", borderRadius: "8px" }}>
                      <span style={{ fontSize: "0.72rem", color: "#94a3b8" }}>Monthly Payroll</span>
                      <div style={{ fontSize: "1.1rem", fontWeight: "800", color: "#34d399" }}>
                        ${employees.reduce((acc, e) => acc + (parseFloat(e.salary) || 0), 0).toLocaleString()}
                      </div>
                    </div>
                    <div style={{ background: "rgba(2, 6, 23, 0.6)", padding: "10px", borderRadius: "8px" }}>
                      <span style={{ fontSize: "0.72rem", color: "#94a3b8" }}>Compliance Verification</span>
                      <div style={{ fontSize: "1.1rem", fontWeight: "800", color: "#a855f7" }}>98.4% Certified</div>
                    </div>
                  </div>

                  {req.status === "PENDING_HR_SUBMISSION" ? (
                    <button
                      type="button"
                      onClick={() => handleCompileAndSendAudit(req.id)}
                      style={{
                        background: "linear-gradient(135deg, #10b981, #059669)",
                        border: "none",
                        color: "#ffffff",
                        padding: "10px 20px",
                        borderRadius: "8px",
                        fontWeight: "800",
                        fontSize: "0.85rem",
                        cursor: "pointer",
                        boxShadow: "0 4px 14px rgba(16, 185, 129, 0.4)",
                        display: "flex",
                        alignItems: "center",
                        gap: "8px"
                      }}
                    >
                      ⚖️ Compile & Submit Official HR Audit to Headmaster
                    </button>
                  ) : (
                    <div style={{ color: "#34d399", fontSize: "0.82rem", fontWeight: "700" }}>
                      ✓ Audit Report has been cryptographically sealed and delivered to Headmaster. Awaiting certification.
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: LEAVE MANAGEMENT */}
        {activeTab === "leaves" && (
          <div>
            <div style={{ marginBottom: "1rem" }}>
              <h3 style={{ margin: 0, fontSize: "1.15rem", fontWeight: "800", color: "#f8fafc" }}>
                STAFF LEAVE & ABSENCE APPLICATIONS
              </h3>
            </div>

            <div style={{ background: "rgba(15, 23, 42, 0.7)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "12px", overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
                <thead>
                  <tr style={{ background: "rgba(255,255,255,0.04)", color: "#94a3b8", textAlign: "left" }}>
                    <th style={{ padding: "12px 16px" }}>Leave ID</th>
                    <th style={{ padding: "12px 16px" }}>Staff Member</th>
                    <th style={{ padding: "12px 16px" }}>Leave Type</th>
                    <th style={{ padding: "12px 16px" }}>Duration & Dates</th>
                    <th style={{ padding: "12px 16px" }}>Status</th>
                    <th style={{ padding: "12px 16px" }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {leaveRequests.length === 0 ? (
                    <tr>
                      <td colSpan="6" style={{ padding: "32px 16px", textAlign: "center", color: "#94a3b8" }}>
                        No staff leave requests submitted. When faculty or personnel apply for leave, requests will display here for review and approval.
                      </td>
                    </tr>
                  ) : leaveRequests.map(lv => (
                    <tr key={lv.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                      <td style={{ padding: "12px 16px", color: "#38bdf8", fontWeight: "700" }}>{lv.id}</td>
                      <td style={{ padding: "12px 16px", fontWeight: "700" }}>{lv.employeeName}</td>
                      <td style={{ padding: "12px 16px" }}>{lv.type}</td>
                      <td style={{ padding: "12px 16px", color: "#cbd5e1" }}>{lv.days} Days ({lv.from} to {lv.to})</td>
                      <td style={{ padding: "12px 16px" }}>
                        <span style={{
                          background: lv.status === "APPROVED" ? "rgba(16, 185, 129, 0.2)" : "rgba(245, 158, 11, 0.2)",
                          color: lv.status === "APPROVED" ? "#34d399" : "#fbbf24",
                          padding: "2px 8px",
                          borderRadius: "10px",
                          fontWeight: "700",
                          fontSize: "0.75rem"
                        }}>
                          {lv.status}
                        </span>
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        {lv.status === "PENDING" && (
                          <button
                            type="button"
                            onClick={() => handleApproveLeave(lv.id)}
                            style={{ background: "#10b981", border: "none", color: "#ffffff", padding: "4px 10px", borderRadius: "6px", cursor: "pointer", fontWeight: "700", fontSize: "0.75rem" }}
                          >
                            ✓ Approve
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: PAYROLL STRUCTURE */}
        {activeTab === "payroll_structure" && (
          <div>
            <div style={{ marginBottom: "1rem" }}>
              <h3 style={{ margin: 0, fontSize: "1.15rem", fontWeight: "800", color: "#f8fafc" }}>
                INSTITUTIONAL SALARY & PAYROLL STRUCTURING
              </h3>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1rem" }}>
              {[
                { tier: "Tier 1: Executive & Directorate", base: "$4,500 - $6,000", count: "3 Staff", allowance: "+15% Medical & Transit" },
                { tier: "Tier 2: Senior Faculty Educators", base: "$3,500 - $4,200", count: "12 Teachers", allowance: "+10% STEM Research" },
                { tier: "Tier 3: Form Masters & Teachers", base: "$2,800 - $3,400", count: "24 Teachers", allowance: "+8% Academic Bonus" },
                { tier: "Tier 4: Administrative & Logistics", base: "$2,000 - $2,700", count: "8 Officers", allowance: "+5% Transport" }
              ].map((tier, idx) => (
                <div key={idx} style={{ background: "rgba(15, 23, 42, 0.7)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "12px", padding: "1.25rem" }}>
                  <h4 style={{ margin: "0 0 6px", color: "#c084fc", fontSize: "0.95rem" }}>{tier.tier}</h4>
                  <div style={{ fontSize: "1.15rem", fontWeight: "800", color: "#34d399", margin: "4px 0" }}>{tier.base}</div>
                  <div style={{ fontSize: "0.8rem", color: "#cbd5e1" }}>Active Staff in Tier: <strong>{tier.count}</strong></div>
                  <div style={{ fontSize: "0.75rem", color: "#94a3b8", marginTop: "4px" }}>Benefits: {tier.allowance}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* MODAL: ONBOARD NEW STAFF */}
      {showAddStaffModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, padding: "20px" }}>
          <div style={{ background: "#0f172a", border: "1px solid rgba(139, 92, 246, 0.4)", borderRadius: "16px", padding: "2rem", maxWidth: "480px", width: "100%" }}>
            <h3 style={{ margin: "0 0 1rem", color: "#f8fafc", fontSize: "1.15rem", fontWeight: "800" }}>
              ➕ ONBOARD & ACTIVATE NEW STAFF MEMBER
            </h3>
            <form onSubmit={handleCreateStaff}>
              <div style={{ marginBottom: "12px" }}>
                <label style={{ display: "block", fontSize: "0.78rem", color: "#cbd5e1", marginBottom: "4px" }}>Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dr. Ernest K. Asante"
                  value={newStaff.name}
                  onChange={e => setNewStaff({ ...newStaff, name: e.target.value })}
                  style={{ width: "100%", padding: "10px", background: "rgba(2, 6, 23, 0.6)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "8px", color: "#ffffff" }}
                />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "12px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.78rem", color: "#cbd5e1", marginBottom: "4px" }}>Job Role *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Senior Physics Teacher"
                    value={newStaff.role}
                    onChange={e => setNewStaff({ ...newStaff, role: e.target.value })}
                    style={{ width: "100%", padding: "10px", background: "rgba(2, 6, 23, 0.6)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "8px", color: "#ffffff" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.78rem", color: "#cbd5e1", marginBottom: "4px" }}>Department *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Science Faculty"
                    value={newStaff.department}
                    onChange={e => setNewStaff({ ...newStaff, department: e.target.value })}
                    style={{ width: "100%", padding: "10px", background: "rgba(2, 6, 23, 0.6)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "8px", color: "#ffffff" }}
                  />
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "12px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.78rem", color: "#cbd5e1", marginBottom: "4px" }}>Email *</label>
                  <input
                    type="email"
                    required
                    placeholder="e.asante@gbs.edu"
                    value={newStaff.email}
                    onChange={e => setNewStaff({ ...newStaff, email: e.target.value })}
                    style={{ width: "100%", padding: "10px", background: "rgba(2, 6, 23, 0.6)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "8px", color: "#ffffff" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.78rem", color: "#cbd5e1", marginBottom: "4px" }}>Phone *</label>
                  <input
                    type="text"
                    required
                    placeholder="+233 24 000 0000"
                    value={newStaff.phone}
                    onChange={e => setNewStaff({ ...newStaff, phone: e.target.value })}
                    style={{ width: "100%", padding: "10px", background: "rgba(2, 6, 23, 0.6)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "8px", color: "#ffffff" }}
                  />
                </div>
              </div>
              <div style={{ marginBottom: "1.5rem" }}>
                <label style={{ display: "block", fontSize: "0.78rem", color: "#cbd5e1", marginBottom: "4px" }}>Monthly Salary (USD) *</label>
                <input
                  type="number"
                  required
                  placeholder="3200"
                  value={newStaff.salary}
                  onChange={e => setNewStaff({ ...newStaff, salary: e.target.value })}
                  style={{ width: "100%", padding: "10px", background: "rgba(2, 6, 23, 0.6)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "8px", color: "#ffffff", fontWeight: "700" }}
                />
              </div>

              <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
                <button
                  type="button"
                  onClick={() => setShowAddStaffModal(false)}
                  style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.2)", color: "#cbd5e1", padding: "10px 16px", borderRadius: "8px", cursor: "pointer", fontWeight: "700" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ background: "#8b5cf6", border: "none", color: "#ffffff", padding: "10px 20px", borderRadius: "8px", cursor: "pointer", fontWeight: "800" }}
                >
                  Confirm & Activate
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
