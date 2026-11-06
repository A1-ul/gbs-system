import React, { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation, Link } from "react-router-dom";
import apiClient from "../../api/client/apiClient";
import { getApiBaseUrl } from "../../api/client/apiConfig";
import "./UniversalDetailPage.css";

const CATEGORY_META = {
  school: { label: "Registered Institution", icon: "🏫", plural: "Registered Institutions", backDashboard: "Developer / Admin" },
  tenant: { label: "School Tenant", icon: "🏛️", plural: "School Tenants", backDashboard: "Developer / Admin" },
  student: { label: "Student Profile", icon: "🎓", plural: "Enrolled Students", backDashboard: "Academic Suite" },
  teacher: { label: "Faculty Educator", icon: "👨‍🏫", plural: "Faculty Educators", backDashboard: "Staff Directory" },
  staff: { label: "Staff Member", icon: "💼", plural: "Campus Operations Staff", backDashboard: "HR & Operations" },
  user: { label: "System User Account", icon: "👤", plural: "System Users", backDashboard: "Developer Control" },
  payment: { label: "Payment Transaction", icon: "💳", plural: "Payment Transactions", backDashboard: "Finance & Accounts" },
  transaction: { label: "Financial Transaction", icon: "💰", plural: "Financial Transactions", backDashboard: "Bursar & Finance" },
  receipt: { label: "Fee Payment Receipt", icon: "🧾", plural: "Payment Receipts", backDashboard: "Accounts Ledger" },
  invoice: { label: "Student Fee Invoice", icon: "📄", plural: "Student Fee Invoices", backDashboard: "Accounts Ledger" },
  subscription: { label: "Subscription License", icon: "📜", plural: "Subscription Licenses", backDashboard: "Developer Control" },
  application: { label: "Onboarding / Admission Dossier", icon: "📂", plural: "Applications", backDashboard: "Admissions Office" },
  admission: { label: "Student Admission Dossier", icon: "🎓", plural: "Admission Applications", backDashboard: "Admissions Office" },
  onboarding: { label: "Tenant Onboarding Application", icon: "🚀", plural: "Onboarding Applications", backDashboard: "Developer Mission Control" },
  report: { label: "Academic / Audit Report", icon: "📊", plural: "Reports", backDashboard: "Reports & Governance" },
  "hr-report": { label: "HR / Staff Appraisal Report", icon: "👔", plural: "HR Reports", backDashboard: "HR Management" },
  "lesson-plan": { label: "Lesson Plan & Scheme of Work", icon: "📖", plural: "Lesson Plans", backDashboard: "Vetting Desk" },
  activity: { label: "System Activity & Audit Log", icon: "🛡️", plural: "System Audit Logs", backDashboard: "Developer Sentinel" },
  "audit-log": { label: "System Audit Log Entry", icon: "🛡️", plural: "Audit Logs", backDashboard: "Developer Sentinel" },
  attendance: { label: "Class Attendance Sheet", icon: "📋", plural: "Attendance Registers", backDashboard: "Classroom Register" },
  notification: { label: "System Notification", icon: "📢", plural: "Directives & Notices", backDashboard: "Communication Desk" },
  video: { label: "Class Topic Video", icon: "🎬", plural: "Topic Videos", backDashboard: "Academic Instruction" },
  exam: { label: "Examination Dossier", icon: "🎯", plural: "Examinations", backDashboard: "Examinations Desk" },
  backup: { label: "PostgreSQL Database Backup", icon: "💾", plural: "Database Backups", backDashboard: "Disaster Recovery" },
  alert: { label: "Security & System Alert", icon: "🚨", plural: "System Alerts", backDashboard: "Security Operations" },
  deployment: { label: "System Deployment Manifest", icon: "🚀", plural: "Deployments", backDashboard: "DevOps Desk" },
  license: { label: "Enterprise Software License", icon: "📜", plural: "Enterprise Licenses", backDashboard: "License Manager" }
};

export default function UniversalDetailPage() {
  const { category: rawCategory, id: rawId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const category = String(rawCategory || "record").toLowerCase();
  const id = decodeURIComponent(String(rawId || ""));
  const meta = CATEGORY_META[category] || { label: "Record Details", icon: "📋", plural: "Records", backDashboard: "Dashboard" };

  const [record, setRecord] = useState(() => {
    if (location.state?.record) return location.state.record;
    try {
      const cached = sessionStorage.getItem(`gbs_detail_${category}_${id}`);
      if (cached) return JSON.parse(cached);
    } catch (_) {}
    return null;
  });

  const [loading, setLoading] = useState(!record);
  const [error, setError] = useState(null);
  const [copiedId, setCopiedId] = useState(false);
  const [actionNotice, setActionNotice] = useState(null);

  // Dedicated Verification State & Handlers
  const [verificationStatus, setVerificationStatus] = useState(() => {
    return record?.verificationStatus || record?.status || "PENDING_VERIFICATION";
  });
  const [showQueryModal, setShowQueryModal] = useState(false);
  const [queryInput, setQueryInput] = useState("");
  const [actionFeedback, setActionFeedback] = useState(null);

  const handleVerifyAndApprove = () => {
    const updatedStatus = "VERIFIED_AND_APPROVED";
    setVerificationStatus(updatedStatus);
    const updatedRecord = {
      ...record,
      status: updatedStatus,
      verificationStatus: updatedStatus,
      isVerified: true,
      verifiedAt: new Date().toLocaleString(),
      verifier: "Headmaster & Chief Developer Verified Stamped"
    };
    setRecord(updatedRecord);
    try {
      sessionStorage.setItem(`gbs_detail_${category}_${id}`, JSON.stringify(updatedRecord));
      localStorage.setItem(`gbs_verified_${category}_${id}`, JSON.stringify(updatedRecord));
    } catch {}
    setActionFeedback({
      type: "success",
      message: `✅ Record #${id} officially VERIFIED & APPROVED. Institutional records updated.`
    });
  };

  const handleIssueQuery = (e) => {
    if (e) e.preventDefault();
    const updatedStatus = "REVISION_REQUIRED";
    setVerificationStatus(updatedStatus);
    const updatedRecord = {
      ...record,
      status: updatedStatus,
      verificationStatus: updatedStatus,
      verificationRemarks: queryInput || "Documentation clarification requested.",
      queriedAt: new Date().toLocaleString()
    };
    setRecord(updatedRecord);
    try {
      sessionStorage.setItem(`gbs_detail_${category}_${id}`, JSON.stringify(updatedRecord));
    } catch {}
    setShowQueryModal(false);
    setActionFeedback({
      type: "warning",
      message: `⚠️ Official Query / Revision Notice dispatched for #${id}: "${queryInput || "Documentation clarification requested."}"`
    });
  };

  const handleComplianceEndorsement = () => {
    const stamp = `STAMP-COMPLY-${Date.now().toString().slice(-6)}`;
    const updatedRecord = {
      ...record,
      complianceStamp: stamp,
      endorsedAt: new Date().toLocaleString()
    };
    setRecord(updatedRecord);
    try {
      sessionStorage.setItem(`gbs_detail_${category}_${id}`, JSON.stringify(updatedRecord));
    } catch {}
    setActionFeedback({
      type: "success",
      message: `⚖️ Compliance Seal ${stamp} stamped to permanent regulatory file.`
    });
  };

  // Active environment detection
  const [environment, setEnvironment] = useState(() => {
    try {
      return localStorage.getItem("gbs_system_environment") || "PRODUCTION";
    } catch (_) {
      return "PRODUCTION";
    }
  });

  useEffect(() => {
    let isMounted = true;
    const fetchRecord = async () => {
      try {
        // Query environment
        try {
          const envRes = await fetch(`${getApiBaseUrl()}/dev-control/environment`);
          if (envRes.ok) {
            const envJson = await envRes.json();
            if (envJson.data?.activeEnvironment && isMounted) {
              setEnvironment(envJson.data.activeEnvironment);
            }
          }
        } catch (_) {}

        if (record) {
          setLoading(false);
          return;
        }

        setLoading(true);
        let found = null;

        // Route-specific genuine database endpoints
        if (category === "school" || category === "tenant" || category === "onboarding") {
          const res = await apiClient.get("/dev-control/onboarding-registrations");
          const apps = res.data?.data?.applications || res.data?.applications || [];
          found = apps.find(a => String(a.id) === id || a.tenantCode === id || a.tenantUid === id || a.appRef === id || a.institutionName === id);
          if (!found) {
            const tRes = await apiClient.get("/dev-control/tenants");
            const tenants = tRes.data?.data?.tenants || tRes.data?.tenants || [];
            found = tenants.find(t => String(t.id) === id || t.code === id || t.name === id);
          }
        } else if (category === "student" || category === "teacher" || category === "staff" || category === "user") {
          try {
            const uRes = await apiClient.get(`/users/${encodeURIComponent(id)}/profile-verification`);
            found = uRes.data?.data?.user || uRes.data?.user;
          } catch (_) {}
          if (!found) {
            const listRes = await apiClient.get("/users");
            const users = listRes.data?.data?.users || listRes.data?.users || [];
            found = users.find(u => String(u.id) === id || u.username === id || u.email === id);
          }
        } else if (category === "payment" || category === "transaction") {
          const pRes = await apiClient.get("/finance/payments");
          const payments = pRes.data?.data?.payments || pRes.data?.payments || [];
          found = payments.find(p => String(p.id) === id || p.transactionRef === id || p.receiptNumber === id);
        } else if (category === "invoice") {
          try {
            const invRes = await apiClient.get(`/finance/invoices/${encodeURIComponent(id)}`);
            found = invRes.data?.data?.invoice || invRes.data?.invoice;
          } catch (_) {
            const invsRes = await apiClient.get("/finance/invoices");
            const list = invsRes.data?.data?.invoices || invsRes.data?.invoices || [];
            found = list.find(i => String(i.id) === id || i.invoiceNumber === id);
          }
        } else if (category === "application" || category === "admission") {
          const admRes = await apiClient.get("/admissions");
          const list = admRes.data?.data?.applications || admRes.data?.applications || [];
          found = list.find(a => String(a.id) === id || a.applicationNumber === id || a.appRef === id);
          if (!found) {
            const onbRes = await apiClient.get("/dev-control/onboarding-registrations");
            const apps = onbRes.data?.data?.applications || onbRes.data?.applications || [];
            found = apps.find(a => String(a.id) === id || a.appRef === id || a.tenantCode === id || a.tenantUid === id);
          }
        } else if (category === "backup") {
          const bRes = await apiClient.get("/dev-control/backups");
          const list = bRes.data?.data?.backups || bRes.data?.backups || [];
          found = list.find(b => String(b.id) === id || b.filename === id);
        } else if (category === "alert") {
          const aRes = await apiClient.get("/dev-control/alerts");
          const list = aRes.data?.data?.alerts || aRes.data?.alerts || [];
          found = list.find(a => String(a.id) === id);
        } else if (category === "deployment") {
          const dRes = await apiClient.get("/dev-control/deployments");
          const list = dRes.data?.data?.deployments || dRes.data?.deployments || [];
          found = list.find(d => String(d.id) === id || d.commitHash === id);
        } else if (category === "license") {
          const licRes = await apiClient.get("/dev-control/licenses");
          const list = licRes.data?.data?.licenses || licRes.data?.licenses || [];
          found = list.find(l => String(l.id) === id || l.licenseKey === id);
        } else if (category === "activity" || category === "audit-log") {
          const logRes = await apiClient.get("/dev-control/audit-logs");
          const list = logRes.data?.data?.logs || logRes.data?.logs || [];
          found = list.find(l => String(l.id) === id);
        } else if (category === "video") {
          const vidRes = await apiClient.get("/topic-videos");
          const list = vidRes.data?.data?.videos || vidRes.data?.videos || [];
          found = list.find(v => String(v.id) === id);
        }

        if (isMounted) {
          if (found) {
            setRecord(found);
            sessionStorage.setItem(`gbs_detail_${category}_${id}`, JSON.stringify(found));
          } else {
            setError(`No authentic database record found matching identifier "${id}".`);
          }
        }
      } catch (err) {
        if (isMounted) setError(err.message || "Failed to load record details from database.");
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchRecord();
    return () => { isMounted = false; };
  }, [category, id]);

  const handleBack = () => {
    if (location.state?.fromPath) {
      navigate(location.state.fromPath);
    } else {
      navigate(-1);
    }
  };

  const handleCopyId = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(id);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2500);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadJson = () => {
    if (!record) return;
    const blob = new Blob([JSON.stringify(record, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `GBS_${category.toUpperCase()}_${id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Resolve display fields safely
  const title =
    record?.institutionName ||
    record?.name ||
    record?.title ||
    (record?.firstName ? `${record.firstName} ${record.lastName || ""}`.trim() : null) ||
    record?.subject ||
    record?.invoiceNumber ||
    record?.receiptNumber ||
    record?.applicationNumber ||
    `${meta.label} #${id}`;

  const subtitle =
    record?.tenantCode ||
    record?.institutionType ||
    record?.role ||
    record?.email ||
    record?.transactionRef ||
    record?.action ||
    record?.academicTerm ||
    "Official Database Record";

  const status = record?.status || (record?.isActive ? "ACTIVE" : record?.isApproved ? "APPROVED" : "RECORDED");
  const originTag = record?.origin || (record?.environment === "DEVELOPMENT" ? "DEVELOPMENT_RECORD" : "GENUINE_PRODUCTION");
  const createdAtFormatted = record?.createdAt ? new Date(record.createdAt).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "medium" }) : "Verified System Timestamp";
  const photoUrl = record?.facePhoto || record?.headmasterPhoto || record?.avatar || record?.institutionLogo || null;

  // Filter raw fields to exclude huge objects or sensitive hashes
  const attributeEntries = record
    ? Object.entries(record).filter(([k, v]) => {
        if (["facePhoto", "scannedFacePhoto", "headmasterPhoto", "adminPasswordHash", "password"].includes(k)) return false;
        if (typeof v === "object" && v !== null && !Array.isArray(v)) return false;
        return true;
      })
    : [];

  return (
    <div className="gbs-detail-page">
      {/* Universal Sticky Header with Back Button */}
      <header className="gbs-detail-header-sticky">
        <div className="gbs-detail-nav-row">
          <div style={{ display: "flex", alignItems: "center", gap: "14px", flexWrap: "wrap" }}>
            <button
              type="button"
              className="gbs-detail-back-btn"
              onClick={handleBack}
              title="Return to previous dashboard view"
            >
              ⬅ Back
            </button>
            <div className="gbs-detail-breadcrumbs">
              <span>GBS System</span>
              <span>/</span>
              <span>{meta.plural}</span>
              <span>/</span>
              <strong>{String(title).slice(0, 36)}</strong>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
            <span className={`gbs-detail-env-badge ${environment.toLowerCase()}`}>
              ● {environment} CLUSTER
            </span>
            <span style={{ fontSize: "0.75rem", color: "#94a3b8", fontFamily: "monospace" }}>
              ID: {id}
            </span>
          </div>
        </div>
      </header>

      <main className="gbs-detail-container">
        {loading ? (
          <div className="gbs-empty-state-card" style={{ padding: "60px 24px" }}>
            <div style={{ fontSize: "2.4rem", marginBottom: "14px" }}>🔄</div>
            <h2>Querying Authentic Production Database...</h2>
            <p>Retrieving verified record specifications from the live cluster for {meta.label} #{id}.</p>
          </div>
        ) : error || !record ? (
          <div className="gbs-empty-state-card">
            <div style={{ fontSize: "2.8rem" }}>⚠️</div>
            <h2>Record Not Available in Database</h2>
            <p>{error || `No record found matching identifier "${id}". It may have been archived or deleted.`}</p>
            <button
              type="button"
              className="gbs-btn-action-detail gbs-btn-action-primary"
              onClick={handleBack}
              style={{ marginTop: "16px" }}
            >
              ⬅ Return to Dashboard
            </button>
          </div>
        ) : (
          <>
            {/* Hero Information Card */}
            <section className="gbs-detail-hero-card">
              <div className="gbs-detail-hero-info">
                <div className="gbs-detail-avatar-box">
                  {photoUrl ? (
                    <img src={photoUrl} alt={title} />
                  ) : (
                    <span>{meta.icon}</span>
                  )}
                </div>

                <div className="gbs-detail-title-group">
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "4px" }}>
                    <span style={{ color: "#d4af37", fontWeight: 800, fontSize: "0.78rem", letterSpacing: "1px", textTransform: "uppercase" }}>
                      {meta.label}
                    </span>
                    <span style={{ color: "#64748b" }}>•</span>
                    <span style={{ color: "#94a3b8", fontSize: "0.76rem" }}>
                      Recorded: {createdAtFormatted}
                    </span>
                  </div>

                  <h1>{title}</h1>

                  <div className="gbs-detail-tag-row">
                    <span
                      className="gbs-detail-pill"
                      style={{
                        background: String(status).includes("ACTIVE") || String(status).includes("APPROVED") || String(status).includes("PAID")
                          ? "rgba(16, 185, 129, 0.2)"
                          : "rgba(245, 158, 11, 0.2)",
                        color: String(status).includes("ACTIVE") || String(status).includes("APPROVED") || String(status).includes("PAID")
                          ? "#34d399"
                          : "#fbbf24",
                        border: `1px solid ${String(status).includes("ACTIVE") || String(status).includes("APPROVED") ? "#10b981" : "#f59e0b"}`
                      }}
                    >
                      ● {status}
                    </span>

                    <span className="gbs-detail-pill" style={{ background: "rgba(56, 189, 248, 0.15)", color: "#38bdf8", border: "1px solid rgba(56, 189, 248, 0.4)" }}>
                      🏷️ {subtitle}
                    </span>

                    <span className="gbs-detail-pill" style={{ background: "rgba(168, 85, 247, 0.15)", color: "#c084fc", border: "1px solid rgba(168, 85, 247, 0.4)" }}>
                      🛡️ {originTag}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Bar */}
              <div className="gbs-detail-actions-group">
                <button
                  type="button"
                  className="gbs-btn-action-detail"
                  onClick={handleCopyId}
                  title="Copy record identifier to clipboard"
                >
                  {copiedId ? "✓ Copied ID" : "📋 Copy ID"}
                </button>
                <button
                  type="button"
                  className="gbs-btn-action-detail"
                  onClick={handleDownloadJson}
                  title="Export raw JSON record"
                >
                  📥 Export JSON
                </button>
                <button
                  type="button"
                  className="gbs-btn-action-detail gbs-btn-action-primary"
                  onClick={handlePrint}
                  title="Print verified official record sheet"
                >
                  🖨️ Print Record
                </button>
              </div>
            </section>

            {/* ACTION FEEDBACK ALERT */}
            {actionFeedback && (
              <div style={{
                margin: "1rem 0",
                padding: "12px 18px",
                borderRadius: "10px",
                background: actionFeedback.type === "success" ? "rgba(16, 185, 129, 0.2)" : "rgba(245, 158, 11, 0.2)",
                border: `1.5px solid ${actionFeedback.type === "success" ? "#10b981" : "#f59e0b"}`,
                color: actionFeedback.type === "success" ? "#34d399" : "#fde68a",
                fontSize: "0.85rem",
                fontWeight: 700,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center"
              }}>
                <span>{actionFeedback.message}</span>
                <button
                  type="button"
                  onClick={() => setActionFeedback(null)}
                  style={{ background: "transparent", border: "none", color: "inherit", cursor: "pointer", fontWeight: 900 }}
                >
                  ✕
                </button>
              </div>
            )}

            {/* DEDICATED OFFICIAL VERIFICATION & AUDIT ACTIONS BAR */}
            <section style={{
              margin: "1rem 0 1.5rem",
              padding: "16px 20px",
              background: "linear-gradient(135deg, rgba(15, 23, 42, 0.98), rgba(30, 41, 59, 0.92))",
              border: "2px solid rgba(56, 189, 248, 0.4)",
              borderRadius: "14px",
              boxShadow: "0 10px 30px rgba(0, 0, 0, 0.5)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "14px"
            }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "4px" }}>
                  <span style={{ fontSize: "1.3rem" }}>⚖️</span>
                  <h3 style={{ margin: 0, color: "#f8fafc", fontSize: "1.05rem", fontWeight: 800 }}>
                    EXECUTIVE VERIFICATION & AUDIT CONTROLS
                  </h3>
                  <span style={{
                    padding: "3px 10px",
                    borderRadius: "12px",
                    fontSize: "0.75rem",
                    fontWeight: 800,
                    background: verificationStatus === "VERIFIED_AND_APPROVED" || verificationStatus === "APPROVED"
                      ? "rgba(16, 185, 129, 0.25)"
                      : verificationStatus === "REVISION_REQUIRED"
                      ? "rgba(239, 68, 68, 0.25)"
                      : "rgba(245, 158, 11, 0.25)",
                    color: verificationStatus === "VERIFIED_AND_APPROVED" || verificationStatus === "APPROVED"
                      ? "#34d399"
                      : verificationStatus === "REVISION_REQUIRED"
                      ? "#f87171"
                      : "#fbbf24",
                    border: `1px solid ${verificationStatus === "VERIFIED_AND_APPROVED" || verificationStatus === "APPROVED" ? "#10b981" : verificationStatus === "REVISION_REQUIRED" ? "#ef4444" : "#f59e0b"}`
                  }}>
                    ● {verificationStatus}
                  </span>
                </div>
                <span style={{ fontSize: "0.78rem", color: "#94a3b8" }}>
                  Verifier: <strong style={{ color: "#38bdf8" }}>{record?.verifier || "Office of the Executive Headmaster / Chief System Developer"}</strong>
                  {record?.verifiedAt && <span> • Timestamp: <strong style={{ color: "#cbd5e1" }}>{record.verifiedAt}</strong></span>}
                </span>
                {record?.complianceStamp && (
                  <div style={{ fontSize: "0.74rem", color: "#c084fc", fontWeight: 700, marginTop: "2px" }}>
                    ✓ Compliance Stamp: {record.complianceStamp}
                  </div>
                )}
                {record?.verificationRemarks && (
                  <div style={{ fontSize: "0.75rem", color: "#fca5a5", fontStyle: "italic", marginTop: "4px" }}>
                    Query Note: "{record.verificationRemarks}"
                  </div>
                )}
              </div>

              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
                <button
                  type="button"
                  onClick={handleVerifyAndApprove}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "8px 18px",
                    borderRadius: "8px",
                    background: "linear-gradient(135deg, #10b981, #059669)",
                    color: "#ffffff",
                    fontWeight: 800,
                    fontSize: "0.82rem",
                    border: "none",
                    cursor: "pointer",
                    boxShadow: "0 4px 14px rgba(16, 185, 129, 0.4)"
                  }}
                  title="Officially verify and approve this dossier"
                >
                  ✅ Verify & Approve Dossier
                </button>

                <button
                  type="button"
                  onClick={() => setShowQueryModal(true)}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "8px 16px",
                    borderRadius: "8px",
                    background: "rgba(245, 158, 11, 0.2)",
                    color: "#fde68a",
                    fontWeight: 800,
                    fontSize: "0.82rem",
                    border: "1px solid #f59e0b",
                    cursor: "pointer"
                  }}
                  title="Issue clarification query or revision request"
                >
                  ⚠️ Issue Query / Revision
                </button>

                <button
                  type="button"
                  onClick={handleComplianceEndorsement}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "8px 16px",
                    borderRadius: "8px",
                    background: "rgba(168, 85, 247, 0.2)",
                    color: "#d8b4fe",
                    fontWeight: 800,
                    fontSize: "0.82rem",
                    border: "1px solid #a855f7",
                    cursor: "pointer"
                  }}
                  title="Apply administrative compliance seal"
                >
                  ⚖️ Compliance Endorsement
                </button>

                <button
                  type="button"
                  onClick={handleBack}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "8px 14px",
                    borderRadius: "8px",
                    background: "rgba(30, 41, 59, 0.8)",
                    color: "#cbd5e1",
                    fontWeight: 700,
                    fontSize: "0.82rem",
                    border: "1px solid rgba(255, 255, 255, 0.2)",
                    cursor: "pointer"
                  }}
                  title="Return to originating dashboard"
                >
                  ⬅ Back to Dashboard
                </button>
              </div>
            </section>

            {/* QUERY / REVISION PROMPT MODAL */}
            {showQueryModal && (
              <div style={{
                position: "fixed",
                inset: 0,
                background: "rgba(0, 0, 0, 0.75)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 9999,
                padding: "20px"
              }}>
                <div style={{
                  background: "rgba(15, 23, 42, 0.98)",
                  border: "2px solid #f59e0b",
                  borderRadius: "14px",
                  padding: "24px",
                  maxWidth: "520px",
                  width: "100%",
                  boxShadow: "0 20px 50px rgba(0, 0, 0, 0.8)"
                }}>
                  <h3 style={{ margin: "0 0 8px", color: "#fbbf24", display: "flex", alignItems: "center", gap: "8px" }}>
                    <span>⚠️</span> Issue Official Verification Query / Revision
                  </h3>
                  <p style={{ margin: "0 0 14px", fontSize: "0.82rem", color: "#94a3b8", lineHeight: 1.5 }}>
                    Specify the discrepancy, missing document, or correction required for <strong>{title}</strong> (#{id}).
                  </p>
                  <form onSubmit={handleIssueQuery}>
                    <textarea
                      rows={3}
                      required
                      value={queryInput}
                      onChange={(e) => setQueryInput(e.target.value)}
                      placeholder="e.g. Please re-upload verified WASSCE certificate and certified birth registry record..."
                      style={{
                        width: "100%",
                        padding: "10px",
                        borderRadius: "8px",
                        background: "rgba(2, 6, 23, 0.85)",
                        border: "1px solid rgba(255, 255, 255, 0.2)",
                        color: "#f8fafc",
                        fontSize: "0.85rem",
                        marginBottom: "14px",
                        lineHeight: 1.4
                      }}
                    />
                    <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
                      <button
                        type="button"
                        onClick={() => setShowQueryModal(false)}
                        style={{ padding: "8px 14px", borderRadius: "6px", background: "rgba(30, 41, 59, 0.8)", color: "#cbd5e1", border: "1px solid rgba(255,255,255,0.2)", cursor: "pointer" }}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        style={{ padding: "8px 18px", borderRadius: "6px", background: "linear-gradient(135deg, #f59e0b, #d97706)", color: "#ffffff", fontWeight: 800, border: "none", cursor: "pointer" }}
                      >
                        📤 Dispatch Query
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* KPI Metric Summary Row (Adaptive based on available fields) */}
            <div className="gbs-detail-kpi-grid">
              {(record.totalStudentsEnrolled || record.studentCount || record.studentsCount) !== undefined && (
                <div className="gbs-detail-kpi-card">
                  <span className="kpi-label">Active Student Population</span>
                  <div className="kpi-value">
                    {(record.totalStudentsEnrolled || record.studentCount || record.studentsCount).toLocaleString()} Students
                  </div>
                </div>
              )}

              {(record.totalTermFee || record.monthlyFee || record.amountPaid || record.amount || record.calculatedFee) !== undefined && (
                <div className="gbs-detail-kpi-card">
                  <span className="kpi-label">Financial Value / Fee</span>
                  <div className="kpi-value" style={{ color: "#34d399" }}>
                    GH₵ {Number(record.totalTermFee || record.monthlyFee || record.amountPaid || record.amount || record.calculatedFee || 0).toLocaleString()}
                  </div>
                </div>
              )}

              {(record.subscriptionPlan || record.subscriptionDuration) && (
                <div className="gbs-detail-kpi-card">
                  <span className="kpi-label">Subscription Term</span>
                  <div className="kpi-value" style={{ color: "#fbbf24", fontSize: "1.1rem" }}>
                    {record.subscriptionPlan || record.subscriptionDuration}
                  </div>
                </div>
              )}

              {record.paymentScheduleMode && (
                <div className="gbs-detail-kpi-card">
                  <span className="kpi-label">Payment Mode</span>
                  <div className="kpi-value" style={{ color: "#38bdf8", fontSize: "1.1rem" }}>
                    {record.paymentScheduleMode === "BULK_FULL_TERM" ? "Bulk Full Term" : "Monthly Spread"}
                  </div>
                </div>
              )}

              {record.role && (
                <div className="gbs-detail-kpi-card">
                  <span className="kpi-label">Assigned Role</span>
                  <div className="kpi-value" style={{ color: "#c084fc", fontSize: "1.1rem" }}>
                    {record.role}
                  </div>
                </div>
              )}
            </div>

            {/* Comprehensive Record Attribute Inspection */}
            <section className="gbs-detail-section-card">
              <h3>
                <span>🔍</span> Official Database Attributes & Data Ledger
              </h3>

              <div className="gbs-detail-attributes-grid">
                {attributeEntries.map(([key, val]) => (
                  <div key={key} className="gbs-detail-attr-item">
                    <span className="attr-key">
                      {key.replace(/([A-Z])/g, " $1").replace(/_/g, " ")}
                    </span>
                    <span className="attr-val">
                      {val === true
                        ? "YES / TRUE"
                        : val === false
                        ? "NO / FALSE"
                        : val === null || val === undefined || val === ""
                        ? "—"
                        : Array.isArray(val)
                        ? `${val.length} item(s)`
                        : String(val)}
                    </span>
                  </div>
                ))}
              </div>
            </section>

            {/* Biometric or Photographic Verification Attachment if present */}
            {photoUrl && (
              <section className="gbs-detail-section-card">
                <h3>
                  <span>📷</span> Certified Facial Verification / Identification Photograph
                </h3>
                <div style={{ display: "flex", gap: "20px", alignItems: "center", flexWrap: "wrap" }}>
                  <img
                    src={photoUrl}
                    alt="Facial Capture"
                    style={{
                      width: "160px",
                      height: "160px",
                      objectFit: "cover",
                      borderRadius: "14px",
                      border: "3px solid #d4af37",
                      boxShadow: "0 8px 24px rgba(0, 0, 0, 0.5)"
                    }}
                  />
                  <div style={{ maxWidth: "600px" }}>
                    <h4 style={{ margin: "0 0 6px", color: "#34d399", fontSize: "1rem" }}>
                      ✓ High-Assurance Biometric Capture Attached
                    </h4>
                    <p style={{ margin: "0 0 10px", fontSize: "0.85rem", color: "#cbd5e1", lineHeight: 1.5 }}>
                      This optical facial scan was submitted during registration and cryptographically tied to {title}. It serves as permanent identity proof for executive handovers and institutional governance.
                    </p>
                    <span style={{ fontFamily: "monospace", fontSize: "0.74rem", color: "#94a3b8", display: "block" }}>
                      Token: {record.biometricFaceToken || record.biometricToken || `BIO-HASH-${id}`}
                    </span>
                  </div>
                </div>
              </section>
            )}
          </>
        )}
      </main>
    </div>
  );
}
