import React, { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { io } from "socket.io-client";
import apiClient from "../../api/client/apiClient";
import { getServerBaseUrl } from "../../api/client/apiConfig";
import StaffAttendanceClockWidget from "./StaffAttendanceClockWidget";

function format12Hour(hhmm = "07:30") {
  const m = String(hhmm || "").trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return hhmm || "07:30 AM";
  const h = parseInt(m[1], 10);
  const min = m[2];
  const suffix = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${String(h12).padStart(2, "0")}:${min} ${suffix}`;
}

export default function HeadmasterStaffAttendanceView({ currentUser = null, onFeedback = null }) {
  const [logs, setLogs] = useState([]);
  const [availableTerms, setAvailableTerms] = useState(["Term 1 (2026/2027)"]);
  const [policyDraft, setPolicyDraft] = useState({
    reportingTime: "07:30",
    lateCutoffTime: "08:00",
    closingTime: "16:00",
    autoClockOutDelayMinutes: 120,
    activeTerm: "Term 1 (2026/2027)",
    academicYear: "2026-2027",
    workplaceLocationName: "Main School Campus",
    enforceClockOutReasonBeforeClose: true,
    requirePhotoProof: true
  });
  const [summary, setSummary] = useState({
    totalLogs: 0,
    onDutyCount: 0,
    clockedOutCount: 0,
    autoClockedOutCount: 0,
    bypassedCount: 0,
    clinicStaffCount: 0,
    pendingVerificationCount: 0,
    verifiedPresentCount: 0,
    lateArrivalsCount: 0
  });
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [termFilter, setTermFilter] = useState("ALL");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [savingPolicy, setSavingPolicy] = useState(false);
  const [verifyingId, setVerifyingId] = useState(null);
  const [inspectingRecord, setInspectingRecord] = useState(null);
  const [inspectRemark, setInspectRemark] = useState("");
  const onFeedbackRef = useRef(onFeedback);
  onFeedbackRef.current = onFeedback;

  const fetchAllAttendance = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get("/staff-attendance/all", {
        params: {
          category: categoryFilter,
          status: statusFilter,
          term: termFilter,
          dateFrom: dateFrom || undefined,
          dateTo: dateTo || undefined,
          search: searchQuery.trim()
        }
      });
      const data = res?.data?.data;
      if (data) {
        const list = Array.isArray(data.logs) ? data.logs : Array.isArray(data.records) ? data.records : [];
        setLogs(list);
        if (data.settings) {
          setPolicyDraft((prev) => ({ ...prev, ...data.settings }));
        }
        if (Array.isArray(data.availableTerms) && data.availableTerms.length > 0) {
          setAvailableTerms(data.availableTerms);
        }
        if (data.summary) {
          setSummary({
            totalLogs: data.summary.totalLogs ?? data.summary.totalRecords ?? list.length,
            onDutyCount: data.summary.onDutyCount ?? data.summary.clockedInNow ?? 0,
            clockedOutCount: data.summary.clockedOutCount ?? data.summary.clockedOutToday ?? 0,
            autoClockedOutCount: data.summary.autoClockedOutCount ?? 0,
            bypassedCount: data.summary.bypassedCount ?? 0,
            clinicStaffCount: data.summary.clinicStaffCount ?? data.summary.clinicMedicalCount ?? 0,
            pendingVerificationCount: data.summary.pendingVerificationCount ?? 0,
            verifiedPresentCount: data.summary.verifiedPresentCount ?? 0,
            lateArrivalsCount: data.summary.lateArrivalsCount ?? 0
          });
        }
      }
    } catch (err) {
      if (typeof onFeedbackRef.current === "function") {
        onFeedbackRef.current(err?.response?.data?.message || "Could not load staff & clinic attendance ledger.", true);
      }
    } finally {
      setLoading(false);
    }
  }, [categoryFilter, statusFilter, termFilter, dateFrom, dateTo, searchQuery]);

  useEffect(() => {
    fetchAllAttendance();
  }, [fetchAllAttendance]);

  // Real-time Socket.IO subscription so Headmaster sees staff clock-ins & photo proofs live
  useEffect(() => {
    let sock = null;
    try {
      const serverUrl = getServerBaseUrl();
      if (serverUrl) {
        const tid = parseInt(currentUser?.tenantId || localStorage.getItem("gbs_tenant_id") || "1", 10) || 1;
        sock = io(serverUrl, { transports: ["websocket", "polling"], withCredentials: true, reconnectionAttempts: 4 });
        sock.on("connect", () => {
          sock.emit("join_tenant", { tenantId: tid, userId: currentUser?.id || currentUser?.email });
        });
        sock.on("staff_clock_in_submitted", () => fetchAllAttendance());
        sock.on("staff_clock_in_verified", () => fetchAllAttendance());
      }
    } catch { }
    return () => {
      if (sock) {
        try { sock.disconnect(); } catch { }
      }
    };
  }, [fetchAllAttendance, currentUser?.tenantId, currentUser?.id, currentUser?.email]);

  const handleSavePolicy = async (e) => {
    e.preventDefault();
    setSavingPolicy(true);
    try {
      const res = await apiClient.put("/staff-attendance/settings", policyDraft);
      if (typeof onFeedback === "function") {
        onFeedback(res?.data?.message || "Official reporting time, closing time & workplace policy saved and synced to all staff dashboards.");
      }
      window.dispatchEvent(new Event("gbs_staff_policy_updated"));
      await fetchAllAttendance();
    } catch (err) {
      if (typeof onFeedback === "function") {
        onFeedback(err?.response?.data?.message || "Could not save attendance settings.", true);
      }
    } finally {
      setSavingPolicy(false);
    }
  };

  const handleVerifyRecord = async (recordId, decision, customNote = "") => {
    setVerifyingId(recordId);
    try {
      const res = await apiClient.patch(`/staff-attendance/${encodeURIComponent(recordId)}/verify`, {
        decision,
        verificationNote: customNote.trim() || undefined
      });
      if (typeof onFeedback === "function") {
        onFeedback(res?.data?.message || `Staff clock-in record marked ${decision}.`);
      }
      setInspectingRecord(null);
      setInspectRemark("");
      await fetchAllAttendance();
    } catch (err) {
      if (typeof onFeedback === "function") {
        onFeedback(err?.response?.data?.message || "Failed to update verification status.", true);
      }
    } finally {
      setVerifyingId(null);
    }
  };

  const handleExportCsv = () => {
    const headers = [
      "Staff Name", "Email", "Role", "Department", "Term",
      "Day", "Date", "Official Reporting Time", "Official Closing Time",
      "Clock-In Time", "Punctuality", "Workplace Location", "GPS Coordinates",
      "Photo Proof Attached", "Headmaster Verification", "Verified By",
      "Clock-Out Time", "Duration", "Duty Status", "Reason / Notes"
    ];
    const rows = logs.map((r) => [
      r.staffName || "",
      r.staffEmail || "",
      r.staffRole || "",
      r.department || "",
      r.termLabel || "",
      r.dayOfWeek || "",
      r.shiftDate || "",
      r.reportingTimeSnapshot || policyDraft.reportingTime || "",
      r.closingTimeSnapshot || policyDraft.closingTime || "",
      r.clockInAt ? (r.clockInTimeLabel || new Date(r.clockInAt).toLocaleTimeString()) : "Bypassed",
      r.lateFlag ? `LATE (+${r.minutesLate || 0}m)` : "ON TIME",
      (r.workplaceLocation || "").replace(/"/g, '""'),
      r.latitude != null && r.longitude != null ? `${r.latitude}, ${r.longitude}` : "—",
      r.clockInPhotoDataUrl ? "YES" : "NO",
      r.verificationStatus || "PENDING_VERIFICATION",
      r.verifiedBy || "—",
      r.clockOutAt ? new Date(r.clockOutAt).toLocaleTimeString() : "—",
      r.hoursWorkedLabel || "",
      r.status || "",
      (r.verificationNote || r.clockOutReason || r.clockInNote || "").replace(/"/g, '""')
    ]);
    const csv = [headers.join(","), ...rows.map((cols) => cols.map((c) => `"${c}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `gbs_staff_verified_attendance_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const formatTime = (iso, bypassed = false, label = null) => {
    if (bypassed) return "Not Clocked In (Bypassed)";
    if (label) return label;
    if (!iso) return "—";
    try {
      return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    } catch {
      return iso;
    }
  };

  const getStatusBadge = (status) => {
    if (status === "CLOCKED_IN") return { bg: "rgba(16, 185, 129, 0.22)", color: "#6ee7b7", border: "#10b981", label: "🟢 ON DUTY" };
    if (status === "AUTO_CLOCKED_OUT") return { bg: "rgba(56, 189, 248, 0.2)", color: "#7dd3fc", border: "#38bdf8", label: "⏱️ AUTO OUT (+2h)" };
    if (status === "BYPASSED_UNMARKED") return { bg: "rgba(239, 68, 68, 0.2)", color: "#fca5a5", border: "#ef4444", label: "⚠️ BYPASSED" };
    return { bg: "rgba(212, 175, 55, 0.2)", color: "#f6dd84", border: "#d4af37", label: "✅ CLOCKED OUT" };
  };

  const getVerificationBadge = (vStatus) => {
    const s = String(vStatus || "PENDING_VERIFICATION").toUpperCase();
    if (s === "VERIFIED") return { bg: "rgba(16, 185, 129, 0.22)", color: "#6ee7b7", border: "#10b981", label: "✅ VERIFIED PRESENT" };
    if (s === "QUERIED") return { bg: "rgba(245, 158, 11, 0.22)", color: "#fde68a", border: "#f59e0b", label: "⚠️ QUERIED" };
    if (s === "REJECTED") return { bg: "rgba(239, 68, 68, 0.22)", color: "#fca5a5", border: "#ef4444", label: "❌ FLAGGED" };
    return { bg: "rgba(56, 189, 248, 0.2)", color: "#7dd3fc", border: "#38bdf8", label: "⏳ AWAITING VERIFICATION" };
  };

  const evidenceModal = inspectingRecord ? (
    <div
      data-testid="headmaster-proof-inspection-modal"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100040,
        background: "rgba(2, 6, 23, 0.9)",
        backdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
        overflowY: "auto"
      }}
    >
      <div
        style={{
          maxWidth: "700px",
          width: "100%",
          background: "linear-gradient(145deg, #081833 0%, #0d2247 100%)",
          border: "2px solid #d4af37",
          borderRadius: "16px",
          padding: "20px",
          color: "#f8fafc",
          boxShadow: "0 24px 64px rgba(0, 0, 0, 0.75)"
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", borderBottom: "1px solid rgba(212,175,55,0.3)", paddingBottom: "10px" }}>
          <div>
            <div style={{ fontSize: "0.72rem", fontWeight: 900, color: "#f6dd84", textTransform: "uppercase" }}>
              🛡️ HEADMASTER PRESENT STAFF WORKPLACE EVIDENCE VERIFICATION
            </div>
            <h3 style={{ margin: "3px 0 0", fontSize: "1.15rem", color: "#ffffff" }}>
              {inspectingRecord.staffName} ({inspectingRecord.staffRole} • {inspectingRecord.department})
            </h3>
          </div>
          <button
            type="button"
            onClick={() => setInspectingRecord(null)}
            style={{ background: "rgba(239,68,68,0.2)", color: "#fca5a5", border: "1px solid #ef4444", borderRadius: "8px", padding: "6px 12px", fontWeight: 800, cursor: "pointer" }}
          >
            ✕ Close
          </button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "8px", marginBottom: "12px", fontSize: "0.8rem" }}>
          <div style={{ background: "#050f23", padding: "9px 11px", borderRadius: "8px", border: "1px solid #334155" }}>
            <div style={{ fontSize: "0.68rem", color: "#94a3b8", fontWeight: 700 }}>DAY &amp; DATE</div>
            <strong>{inspectingRecord.dayOfWeek || "—"}, {inspectingRecord.shiftDate}</strong>
          </div>
          <div style={{ background: "#050f23", padding: "9px 11px", borderRadius: "8px", border: "1px solid #334155" }}>
            <div style={{ fontSize: "0.68rem", color: "#94a3b8", fontWeight: 700 }}>EXACT CLOCK-IN TIME</div>
            <strong style={{ color: inspectingRecord.lateFlag ? "#fca5a5" : "#6ee7b7" }}>
              {formatTime(inspectingRecord.clockInAt, inspectingRecord.bypassedClockIn, inspectingRecord.clockInTimeLabel)}
            </strong>
            <div style={{ fontSize: "0.7rem", color: "#94a3b8" }}>
              Expected: {format12Hour(inspectingRecord.reportingTimeSnapshot || policyDraft.reportingTime)}
            </div>
          </div>
          <div style={{ background: "#050f23", padding: "9px 11px", borderRadius: "8px", border: "1px solid #334155" }}>
            <div style={{ fontSize: "0.68rem", color: "#94a3b8", fontWeight: 700 }}>WORKPLACE LOCATION</div>
            <strong style={{ color: "#7dd3fc" }}>{inspectingRecord.workplaceLocation || "Not provided"}</strong>
            {inspectingRecord.latitude != null && inspectingRecord.longitude != null && (
              <div style={{ marginTop: "3px" }}>
                <a
                  href={`https://maps.google.com/?q=${inspectingRecord.latitude},${inspectingRecord.longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: "#38bdf8", fontSize: "0.72rem", fontWeight: 800, textDecoration: "underline" }}
                >
                  🗺️ Open GPS Pin ({inspectingRecord.latitude}, {inspectingRecord.longitude})
                </a>
              </div>
            )}
          </div>
        </div>

        {/* Captured Live Workplace Picture Proof */}
        <div style={{ marginBottom: "12px", background: "#020617", borderRadius: "10px", padding: "10px", border: "1px solid rgba(56, 189, 248, 0.4)", textAlign: "center" }}>
          {inspectingRecord.clockInPhotoDataUrl ? (
            <img
              src={inspectingRecord.clockInPhotoDataUrl}
              alt="Staff workplace proof evidence"
              style={{ maxWidth: "100%", maxHeight: "340px", borderRadius: "8px", border: "1px solid #d4af37" }}
            />
          ) : (
            <div style={{ padding: "24px", color: "#94a3b8", fontSize: "0.84rem" }}>
              📷 No workplace camera photo was attached to this legacy record.
            </div>
          )}
        </div>

        <div style={{ marginBottom: "12px" }}>
          <label style={{ display: "block", fontSize: "0.75rem", color: "#f6dd84", fontWeight: 700, marginBottom: "4px" }}>
            Headmaster Verification Remark (Optional)
          </label>
          <input
            type="text"
            value={inspectRemark}
            onChange={(e) => setInspectRemark(e.target.value)}
            placeholder="e.g. Confirmed present at Main Campus Gate on time."
            style={{ width: "100%", boxSizing: "border-box", padding: "9px 11px", borderRadius: "8px", border: "1px solid #d4af37", background: "#050f23", color: "#fff", fontSize: "0.84rem" }}
          />
        </div>

        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <button
            type="button"
            disabled={verifyingId === inspectingRecord.id}
            data-testid="headmaster-verify-present-confirm-btn"
            onClick={() => handleVerifyRecord(inspectingRecord.id, "VERIFIED", inspectRemark)}
            style={{ flex: 1, background: "linear-gradient(135deg, #065f46, #10b981)", color: "#fff", border: "1px solid #6ee7b7", borderRadius: "9px", padding: "10px 16px", fontWeight: 900, cursor: "pointer" }}
          >
            ✅ Verify Staff Present
          </button>
          <button
            type="button"
            disabled={verifyingId === inspectingRecord.id}
            onClick={() => handleVerifyRecord(inspectingRecord.id, "QUERIED", inspectRemark || "Please confirm your exact workplace location.")}
            style={{ background: "rgba(245, 158, 11, 0.22)", color: "#fde68a", border: "1px solid #f59e0b", borderRadius: "9px", padding: "10px 16px", fontWeight: 800, cursor: "pointer" }}
          >
            ⚠️ Query Location / Proof
          </button>
        </div>
      </div>
    </div>
  ) : null;

  return (
    <div className="role-workspace-card" data-testid="headmaster-staff-attendance-view" style={{ padding: "22px", borderRadius: "16px", background: "linear-gradient(145deg, rgba(8, 24, 51, 0.96) 0%, rgba(13, 34, 71, 0.96) 100%)", border: "1.5px solid #d4af37", color: "#f8fafc" }}>
      {evidenceModal && (typeof document !== "undefined" && document.body ? createPortal(evidenceModal, document.body) : evidenceModal)}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px", marginBottom: "14px" }}>
        <div>
          <span style={{ fontSize: "0.75rem", fontWeight: 800, color: "#f6dd84", letterSpacing: "1px", textTransform: "uppercase" }}>
            ⏱️ HEADMASTER OVERSIGHT • WORKPLACE LOCATION, PHOTO PROOF &amp; PUNCTUALITY MONITOR
          </span>
          <h2 style={{ margin: "4px 0 0", color: "#ffffff", fontSize: "1.35rem" }}>
            Staff Clock-In / Clock-Out Register &amp; Headmaster Verification Desk
          </h2>
          <p style={{ margin: "4px 0 0", fontSize: "0.82rem", color: "#cbd5e1" }}>
            Set exact official Reporting Time &amp; Closing Time (synced live to every Staff Dashboard) and verify staff workplace location, day, date, time, and live picture proof.
          </p>
        </div>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={handleExportCsv}
            style={{ background: "rgba(56, 189, 248, 0.16)", color: "#7dd3fc", border: "1px solid #38bdf8", borderRadius: "10px", padding: "9px 14px", fontWeight: 800, cursor: "pointer" }}
          >
            📥 Export Verified CSV
          </button>
          <button
            type="button"
            onClick={fetchAllAttendance}
            disabled={loading}
            style={{ background: "linear-gradient(135deg, #f6dd84, #d4af37)", color: "#081833", border: "1.5px solid #f6dd84", borderRadius: "10px", padding: "9px 16px", fontWeight: 900, cursor: "pointer" }}
          >
            {loading ? "⏳ Syncing Logs..." : "🔄 Refresh Register"}
          </button>
        </div>
      </div>

      {/* Prominent Official Reporting & Closing Time Display Banner on Clock-In / Clock-Out Dashboard */}
      <div
        data-testid="headmaster-schedule-banner"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "12px",
          background: "linear-gradient(135deg, rgba(6, 95, 70, 0.25) 0%, rgba(13, 34, 71, 0.9) 100%)",
          border: "1.5px solid #10b981",
          borderRadius: "12px",
          padding: "11px 15px",
          marginBottom: "14px",
          fontSize: "0.84rem"
        }}
      >
        <div style={{ display: "flex", gap: "18px", flexWrap: "wrap", alignItems: "center" }}>
          <span>
            ⏰ Official Reporting Time:{" "}
            <strong data-testid="headmaster-reporting-time-badge" style={{ color: "#6ee7b7", fontSize: "0.96rem" }}>
              {format12Hour(policyDraft.reportingTime)}
            </strong>
          </span>
          <span>
            ⏳ Late Cutoff:{" "}
            <strong style={{ color: "#fde68a" }}>{format12Hour(policyDraft.lateCutoffTime)}</strong>
          </span>
          <span>
            🏁 Official Closing Time:{" "}
            <strong data-testid="headmaster-closing-time-badge" style={{ color: "#f6dd84", fontSize: "0.96rem" }}>
              {format12Hour(policyDraft.closingTime)}
            </strong>
          </span>
        </div>
        {summary.pendingVerificationCount > 0 && (
          <span style={{ background: "rgba(56, 189, 248, 0.22)", border: "1px solid #38bdf8", color: "#7dd3fc", padding: "4px 12px", borderRadius: "999px", fontWeight: 900, fontSize: "0.78rem" }}>
            🔔 {summary.pendingVerificationCount} Staff Clock-In Proof(s) Pending Headmaster Verification
          </span>
        )}
      </div>

      {/* Headmaster Exact Reporting Time, Closing Time & Workplace Verification Policy Form */}
      <form
        onSubmit={handleSavePolicy}
        data-testid="headmaster-attendance-policy-form"
        style={{
          background: "rgba(5, 15, 35, 0.85)",
          border: "1px solid rgba(212, 175, 55, 0.45)",
          borderRadius: "12px",
          padding: "14px",
          marginBottom: "16px",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(165px, 1fr))",
          gap: "10px",
          alignItems: "end"
        }}
      >
        <div>
          <label style={{ display: "block", fontSize: "0.72rem", color: "#6ee7b7", fontWeight: 800, marginBottom: "4px" }}>
            ⏰ Official Reporting Time
          </label>
          <input
            type="time"
            data-testid="headmaster-reporting-time-input"
            value={policyDraft.reportingTime || "07:30"}
            onChange={(e) => setPolicyDraft({ ...policyDraft, reportingTime: e.target.value })}
            style={{ width: "100%", padding: "7px 10px", borderRadius: "7px", background: "#081833", color: "#fff", border: "1.5px solid #10b981" }}
          />
        </div>
        <div>
          <label style={{ display: "block", fontSize: "0.72rem", color: "#fde68a", fontWeight: 700, marginBottom: "4px" }}>
            ⏳ Late Cutoff Time
          </label>
          <input
            type="time"
            value={policyDraft.lateCutoffTime || "08:00"}
            onChange={(e) => setPolicyDraft({ ...policyDraft, lateCutoffTime: e.target.value })}
            style={{ width: "100%", padding: "7px 10px", borderRadius: "7px", background: "#081833", color: "#fff", border: "1px solid #d4af37" }}
          />
        </div>
        <div>
          <label style={{ display: "block", fontSize: "0.72rem", color: "#f6dd84", fontWeight: 800, marginBottom: "4px" }}>
            🏁 Official Closing Time
          </label>
          <input
            type="time"
            data-testid="headmaster-closing-time-input"
            value={policyDraft.closingTime || "16:00"}
            onChange={(e) => setPolicyDraft({ ...policyDraft, closingTime: e.target.value })}
            style={{ width: "100%", padding: "7px 10px", borderRadius: "7px", background: "#081833", color: "#fff", border: "1.5px solid #d4af37" }}
          />
        </div>
        <div>
          <label style={{ display: "block", fontSize: "0.72rem", color: "#7dd3fc", fontWeight: 700, marginBottom: "4px" }}>
            📍 Official Campus / Workplace
          </label>
          <input
            type="text"
            value={policyDraft.workplaceLocationName || ""}
            onChange={(e) => setPolicyDraft({ ...policyDraft, workplaceLocationName: e.target.value })}
            placeholder="Main School Campus"
            style={{ width: "100%", padding: "7px 10px", borderRadius: "7px", background: "#081833", color: "#fff", border: "1px solid rgba(56,189,248,0.5)" }}
          />
        </div>
        <div>
          <label style={{ display: "block", fontSize: "0.72rem", color: "#f6dd84", fontWeight: 700, marginBottom: "4px" }}>
            Auto Clock-Out Delay (Mins)
          </label>
          <input
            type="number"
            min="30"
            max="480"
            value={policyDraft.autoClockOutDelayMinutes}
            onChange={(e) => setPolicyDraft({ ...policyDraft, autoClockOutDelayMinutes: parseInt(e.target.value, 10) || 120 })}
            style={{ width: "100%", padding: "7px 10px", borderRadius: "7px", background: "#081833", color: "#fff", border: "1px solid #d4af37" }}
          />
        </div>
        <div>
          <label style={{ display: "block", fontSize: "0.72rem", color: "#f6dd84", fontWeight: 700, marginBottom: "4px" }}>
            Active Monitoring Term
          </label>
          <input
            type="text"
            value={policyDraft.activeTerm}
            onChange={(e) => setPolicyDraft({ ...policyDraft, activeTerm: e.target.value })}
            style={{ width: "100%", padding: "7px 10px", borderRadius: "7px", background: "#081833", color: "#fff", border: "1px solid #d4af37" }}
          />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "5px", fontSize: "0.74rem", color: "#cbd5e1", paddingBottom: "4px" }}>
          <label style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <input
              type="checkbox"
              checked={policyDraft.requirePhotoProof !== false}
              onChange={(e) => setPolicyDraft({ ...policyDraft, requirePhotoProof: e.target.checked })}
            />
            Require Photo Proof
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <input
              type="checkbox"
              checked={Boolean(policyDraft.enforceClockOutReasonBeforeClose)}
              onChange={(e) => setPolicyDraft({ ...policyDraft, enforceClockOutReasonBeforeClose: e.target.checked })}
            />
            Early Out Reason
          </label>
        </div>
        <button
          type="submit"
          data-testid="headmaster-save-policy-btn"
          disabled={savingPolicy}
          style={{
            background: "linear-gradient(135deg, #059669, #10b981)",
            color: "#fff",
            border: "1px solid #6ee7b7",
            borderRadius: "8px",
            padding: "9px 14px",
            fontWeight: 900,
            cursor: "pointer"
          }}
        >
          {savingPolicy ? "Saving..." : "💾 Save Reporting & Closing Times"}
        </button>
      </form>

      {/* Live Headmaster Clock-In Desk */}
      <StaffAttendanceClockWidget
        roleOverride="ADMIN"
        autoShowWelcomePrompt={false}
        currentUser={currentUser}
        onFeedback={(msg, isErr) => {
          fetchAllAttendance();
          if (typeof onFeedback === "function") onFeedback(msg, isErr);
        }}
      />

      {/* KPI Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(145px, 1fr))", gap: "10px", marginBottom: "16px" }}>
        <div style={{ background: "rgba(5, 15, 35, 0.85)", border: "1px solid rgba(212, 175, 55, 0.4)", borderRadius: "12px", padding: "12px 14px" }}>
          <span style={{ fontSize: "0.7rem", color: "#cbd5e1", display: "block" }}>Total Term Logs</span>
          <strong style={{ fontSize: "1.4rem", color: "#f6dd84" }}>{summary.totalLogs}</strong>
        </div>
        <div style={{ background: "rgba(5, 15, 35, 0.85)", border: "1px solid rgba(16, 185, 129, 0.45)", borderRadius: "12px", padding: "12px 14px" }}>
          <span style={{ fontSize: "0.7rem", color: "#cbd5e1", display: "block" }}>On Duty (Present)</span>
          <strong style={{ fontSize: "1.4rem", color: "#6ee7b7" }}>{summary.onDutyCount}</strong>
        </div>
        <div style={{ background: "rgba(5, 15, 35, 0.85)", border: "1px solid rgba(56, 189, 248, 0.5)", borderRadius: "12px", padding: "12px 14px" }}>
          <span style={{ fontSize: "0.7rem", color: "#cbd5e1", display: "block" }}>Pending Verification</span>
          <strong style={{ fontSize: "1.4rem", color: "#7dd3fc" }}>{summary.pendingVerificationCount}</strong>
        </div>
        <div style={{ background: "rgba(5, 15, 35, 0.85)", border: "1px solid rgba(16, 185, 129, 0.5)", borderRadius: "12px", padding: "12px 14px" }}>
          <span style={{ fontSize: "0.7rem", color: "#cbd5e1", display: "block" }}>Headmaster Verified</span>
          <strong style={{ fontSize: "1.4rem", color: "#34d399" }}>{summary.verifiedPresentCount}</strong>
        </div>
        <div style={{ background: "rgba(5, 15, 35, 0.85)", border: "1px solid rgba(245, 158, 11, 0.45)", borderRadius: "12px", padding: "12px 14px" }}>
          <span style={{ fontSize: "0.7rem", color: "#cbd5e1", display: "block" }}>Late Arrivals</span>
          <strong style={{ fontSize: "1.4rem", color: "#fbbf24" }}>{summary.lateArrivalsCount}</strong>
        </div>
        <div style={{ background: "rgba(5, 15, 35, 0.85)", border: "1px solid rgba(239, 68, 68, 0.45)", borderRadius: "12px", padding: "12px 14px" }}>
          <span style={{ fontSize: "0.7rem", color: "#cbd5e1", display: "block" }}>Bypassed (Not Present)</span>
          <strong style={{ fontSize: "1.4rem", color: "#fca5a5" }}>{summary.bypassedCount}</strong>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "14px", alignItems: "center" }}>
        {[
          { id: "ALL", label: "All Departments" },
          { id: "CLINIC", label: "🩺 Clinic Doctors & Nurses" },
          { id: "FACULTY", label: "👨‍🏫 Teaching Faculty" },
          { id: "ADMIN_OPS", label: "💼 Staff / Finance / HR" }
        ].map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => setCategoryFilter(cat.id)}
            style={{
              background: categoryFilter === cat.id ? "linear-gradient(135deg, #f6dd84, #d4af37)" : "rgba(5, 15, 35, 0.85)",
              color: categoryFilter === cat.id ? "#081833" : "#f6dd84",
              border: "1.5px solid #d4af37",
              borderRadius: "8px",
              padding: "6px 12px",
              fontSize: "0.78rem",
              fontWeight: 800,
              cursor: "pointer"
            }}
          >
            {cat.label}
          </button>
        ))}

        <select className="filter-select" value={termFilter} onChange={(e) => setTermFilter(e.target.value)}>
          <option value="ALL">All Terms (Full Session)</option>
          {availableTerms.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>

        <select className="filter-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="ALL">All Duty Statuses</option>
          <option value="CLOCKED_IN">Currently On Duty (Present)</option>
          <option value="CLOCKED_OUT">Manual Clock Out</option>
          <option value="AUTO_CLOCKED_OUT">Auto Clocked Out (+2h)</option>
          <option value="BYPASSED_UNMARKED">Bypassed (Not Present)</option>
        </select>

        <input type="date" className="filter-input" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} style={{ width: "135px" }} />
        <input type="date" className="filter-input" value={dateTo} onChange={(e) => setDateTo(e.target.value)} style={{ width: "135px" }} />

        <input
          type="text"
          className="filter-input"
          placeholder="Search staff, role, department, location..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ minWidth: "200px", flex: 1 }}
        />
      </div>

      {/* Headmaster Present Staff Verification & Attendance Table */}
      <div style={{ overflowX: "auto", background: "rgba(5, 15, 35, 0.78)", borderRadius: "12px", border: "1px solid rgba(212, 175, 55, 0.35)" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
          <thead>
            <tr style={{ background: "rgba(13, 34, 71, 0.95)", color: "#f6dd84", fontSize: "0.72rem", textTransform: "uppercase" }}>
              <th style={{ padding: "11px 12px" }}>Staff &amp; Role</th>
              <th style={{ padding: "11px 12px" }}>Day &amp; Date</th>
              <th style={{ padding: "11px 12px" }}>Clock-In / Out</th>
              <th style={{ padding: "11px 12px" }}>Workplace Location &amp; GPS</th>
              <th style={{ padding: "11px 12px" }}>Photo Proof</th>
              <th style={{ padding: "11px 12px" }}>Headmaster Verification</th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ textAlign: "center", padding: "26px", color: "#94a3b8", fontSize: "0.86rem" }}>
                  No staff clock-in records match this filter yet. Submitted workplace proofs appear here live for Headmaster verification.
                </td>
              </tr>
            ) : (
              logs.map((row) => {
                const badge = getStatusBadge(row.status);
                const vBadge = getVerificationBadge(row.verificationStatus);
                return (
                  <tr key={row.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.07)", fontSize: "0.8rem" }}>
                    <td style={{ padding: "10px 12px" }}>
                      <strong style={{ color: "#ffffff", display: "block" }}>{row.staffName}</strong>
                      <span style={{ fontSize: "0.7rem", color: "#f6dd84" }}>{row.staffRole} • {row.department}</span>
                      <div style={{ marginTop: "3px" }}>
                        <span style={{ padding: "2px 7px", borderRadius: "999px", fontSize: "0.66rem", fontWeight: 800, background: badge.bg, color: badge.color, border: `1px solid ${badge.border}` }}>
                          {badge.label}
                        </span>
                      </div>
                    </td>
                    <td style={{ padding: "10px 12px", color: "#cbd5e1", whiteSpace: "nowrap" }}>
                      <strong style={{ color: "#ffffff", display: "block" }}>{row.dayOfWeek || "Weekday"}</strong>
                      <span style={{ fontSize: "0.74rem", color: "#94a3b8" }}>{row.shiftDate}</span>
                    </td>
                    <td style={{ padding: "10px 12px" }}>
                      <div style={{ fontWeight: 800, color: row.bypassedClockIn ? "#fca5a5" : row.lateFlag ? "#fbbf24" : "#6ee7b7" }}>
                        In: {formatTime(row.clockInAt, row.bypassedClockIn, row.clockInTimeLabel)}
                      </div>
                      {!row.bypassedClockIn && (
                        <div style={{ fontSize: "0.68rem", color: row.lateFlag ? "#fca5a5" : "#34d399", fontWeight: 800 }}>
                          {row.lateFlag ? `🔴 LATE (+${row.minutesLate || 0}m after ${row.reportingTimeSnapshot || policyDraft.reportingTime})` : `🟢 ON TIME (Target ${row.reportingTimeSnapshot || policyDraft.reportingTime})`}
                        </div>
                      )}
                      {row.clockOutAt && (
                        <div style={{ fontSize: "0.72rem", color: "#f6dd84", marginTop: "2px" }}>
                          Out: {formatTime(row.clockOutAt)} ({row.hoursWorkedLabel || ""})
                        </div>
                      )}
                    </td>
                    <td style={{ padding: "10px 12px", color: "#cbd5e1", maxWidth: "220px" }}>
                      <div style={{ fontWeight: 700, color: "#e2e8f0" }}>📍 {row.workplaceLocation || "—"}</div>
                      {row.latitude != null && row.longitude != null && (
                        <a
                          href={`https://maps.google.com/?q=${row.latitude},${row.longitude}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: "#38bdf8", fontSize: "0.7rem", fontWeight: 800, textDecoration: "underline" }}
                        >
                          🗺️ {row.latitude}, {row.longitude}{row.accuracyMeters != null ? ` (±${row.accuracyMeters}m)` : ""}
                        </a>
                      )}
                    </td>
                    <td style={{ padding: "10px 12px" }}>
                      {row.clockInPhotoDataUrl ? (
                        <button
                          type="button"
                          data-testid={`inspect-proof-btn-${row.id}`}
                          onClick={() => {
                            setInspectingRecord(row);
                            setInspectRemark(row.verificationNote || "");
                          }}
                          style={{ background: "none", border: "none", padding: 0, cursor: "pointer", textAlign: "left" }}
                        >
                          <img
                            src={row.clockInPhotoDataUrl}
                            alt="Workplace clock-in photo"
                            style={{ width: "68px", height: "48px", objectFit: "cover", borderRadius: "7px", border: "1.5px solid #38bdf8", display: "block" }}
                          />
                          <span style={{ fontSize: "0.66rem", color: "#7dd3fc", fontWeight: 800 }}>🔍 Inspect Proof</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setInspectingRecord(row);
                            setInspectRemark(row.verificationNote || "");
                          }}
                          style={{ background: "rgba(148,163,184,0.16)", color: "#cbd5e1", border: "1px solid rgba(148,163,184,0.35)", borderRadius: "6px", padding: "4px 8px", fontSize: "0.7rem", fontWeight: 700, cursor: "pointer" }}
                        >
                          View Details
                        </button>
                      )}
                    </td>
                    <td style={{ padding: "10px 12px" }}>
                      <div style={{ marginBottom: "5px" }}>
                        <span style={{ padding: "2px 8px", borderRadius: "999px", fontSize: "0.68rem", fontWeight: 800, background: vBadge.bg, color: vBadge.color, border: `1px solid ${vBadge.border}`, whiteSpace: "nowrap" }}>
                          {vBadge.label}
                        </span>
                      </div>
                      {row.verifiedBy && (
                        <div style={{ fontSize: "0.68rem", color: "#94a3b8", marginBottom: "4px" }}>
                          By {row.verifiedBy}
                        </div>
                      )}
                      {!row.bypassedClockIn && (
                        <div style={{ display: "flex", gap: "5px", flexWrap: "wrap" }}>
                          {row.verificationStatus !== "VERIFIED" && (
                            <button
                              type="button"
                              disabled={verifyingId === row.id}
                              data-testid={`quick-verify-btn-${row.id}`}
                              onClick={() => handleVerifyRecord(row.id, "VERIFIED")}
                              style={{ background: "#059669", color: "#fff", border: "1px solid #6ee7b7", borderRadius: "6px", padding: "4px 9px", fontSize: "0.7rem", fontWeight: 800, cursor: "pointer" }}
                            >
                              ✅ Verify
                            </button>
                          )}
                          {row.verificationStatus !== "QUERIED" && (
                            <button
                              type="button"
                              disabled={verifyingId === row.id}
                              onClick={() => {
                                setInspectingRecord(row);
                                setInspectRemark(row.verificationNote || "");
                              }}
                              style={{ background: "rgba(245,158,11,0.2)", color: "#fde68a", border: "1px solid #f59e0b", borderRadius: "6px", padding: "4px 8px", fontSize: "0.7rem", fontWeight: 800, cursor: "pointer" }}
                            >
                              ⚠️ Query
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
