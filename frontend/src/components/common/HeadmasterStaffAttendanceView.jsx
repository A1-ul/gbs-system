import React, { useState, useEffect, useCallback } from "react";
import apiClient from "../../api/client/apiClient";
import StaffAttendanceClockWidget from "./StaffAttendanceClockWidget";

export default function HeadmasterStaffAttendanceView({ currentUser = null, onFeedback = null }) {
  const [logs, setLogs] = useState([]);
  const [availableTerms, setAvailableTerms] = useState(["Term 1 (2026/2027)"]);
  const [policyDraft, setPolicyDraft] = useState({
    closingTime: "16:00",
    lateCutoffTime: "08:15",
    autoClockOutDelayMinutes: 120,
    activeTerm: "Term 1 (2026/2027)",
    academicYear: "2026-2027",
    enforceClockOutReasonBeforeClose: true
  });
  const [summary, setSummary] = useState({
    totalLogs: 0,
    onDutyCount: 0,
    clockedOutCount: 0,
    autoClockedOutCount: 0,
    bypassedCount: 0,
    clinicStaffCount: 0
  });
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [termFilter, setTermFilter] = useState("ALL");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [savingPolicy, setSavingPolicy] = useState(false);

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
            clinicStaffCount: data.summary.clinicStaffCount ?? data.summary.clinicMedicalCount ?? 0
          });
        }
      }
    } catch (err) {
      if (typeof onFeedback === "function") {
        onFeedback(err?.response?.data?.message || "Could not load staff & clinic attendance ledger.", true);
      }
    } finally {
      setLoading(false);
    }
  }, [categoryFilter, statusFilter, termFilter, dateFrom, dateTo, searchQuery, onFeedback]);

  useEffect(() => {
    fetchAllAttendance();
  }, [fetchAllAttendance]);

  const handleSavePolicy = async (e) => {
    e.preventDefault();
    setSavingPolicy(true);
    try {
      const res = await apiClient.put("/staff-attendance/settings", policyDraft);
      if (typeof onFeedback === "function") {
        onFeedback(res?.data?.message || "Attendance closing time & term policy updated cleanly.");
      }
      await fetchAllAttendance();
    } catch (err) {
      if (typeof onFeedback === "function") {
        onFeedback(err?.response?.data?.message || "Could not save attendance settings.", true);
      }
    } finally {
      setSavingPolicy(false);
    }
  };

  const handleExportCsv = () => {
    const headers = ["Staff Name", "Email", "Role", "Department", "Term", "Shift Date", "Clock In", "Clock Out", "Duration", "Status", "Reason / Notes"];
    const rows = logs.map((r) => [
      r.staffName || "",
      r.staffEmail || "",
      r.staffRole || "",
      r.department || "",
      r.termLabel || "",
      r.shiftDate || "",
      r.clockInAt ? new Date(r.clockInAt).toLocaleString() : "Bypassed",
      r.clockOutAt ? new Date(r.clockOutAt).toLocaleString() : "—",
      r.hoursWorkedLabel || "",
      r.status || "",
      (r.clockOutReason || r.clockInNote || "").replace(/"/g, '""')
    ]);
    const csv = [headers.join(","), ...rows.map((cols) => cols.map((c) => `"${c}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `gbs_staff_term_attendance_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const formatTime = (iso, bypassed = false) => {
    if (bypassed) return "Not Clocked In (Bypassed)";
    if (!iso) return "—";
    try {
      return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    } catch {
      return iso;
    }
  };

  const getStatusBadge = (status) => {
    if (status === "CLOCKED_IN") {
      return { bg: "rgba(16, 185, 129, 0.22)", color: "#6ee7b7", border: "#10b981", label: "🟢 ON DUTY (PRESENT)" };
    }
    if (status === "AUTO_CLOCKED_OUT") {
      return { bg: "rgba(56, 189, 248, 0.2)", color: "#7dd3fc", border: "#38bdf8", label: "⏱️ AUTO CLOCKED OUT (+2h)" };
    }
    if (status === "BYPASSED_UNMARKED") {
      return { bg: "rgba(239, 68, 68, 0.2)", color: "#fca5a5", border: "#ef4444", label: "⚠️ BYPASSED (NOT PRESENT)" };
    }
    return { bg: "rgba(212, 175, 55, 0.2)", color: "#f6dd84", border: "#d4af37", label: "✅ CLOCKED OUT" };
  };

  return (
    <div className="role-workspace-card" data-testid="headmaster-staff-attendance-view" style={{ padding: "22px", borderRadius: "16px", background: "linear-gradient(145deg, rgba(8, 24, 51, 0.96) 0%, rgba(13, 34, 71, 0.96) 100%)", border: "1.5px solid #d4af37", color: "#f8fafc" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px", marginBottom: "16px" }}>
        <div>
          <span style={{ fontSize: "0.75rem", fontWeight: 800, color: "#f6dd84", letterSpacing: "1px", textTransform: "uppercase" }}>
            ⏱️ HEADMASTER OVERSIGHT • FULL-TERM INSTITUTIONAL DUTY MONITOR
          </span>
          <h2 style={{ margin: "4px 0 0", color: "#ffffff", fontSize: "1.35rem" }}>
            Staff, Teachers, Accountants, HR &amp; Clinic Attendance &amp; Auto Clock-Out Register
          </h2>
          <p style={{ margin: "4px 0 0", fontSize: "0.82rem", color: "#cbd5e1" }}>
            Verify exact arrival clock-in times, departure reasons, bypassed logins (not marked present), and 2-hour post-close auto clock-outs through end of term.
          </p>
        </div>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={handleExportCsv}
            style={{
              background: "rgba(56, 189, 248, 0.16)",
              color: "#7dd3fc",
              border: "1px solid #38bdf8",
              borderRadius: "10px",
              padding: "9px 14px",
              fontWeight: 800,
              cursor: "pointer"
            }}
          >
            📥 Export Term Attendance CSV
          </button>
          <button
            type="button"
            onClick={fetchAllAttendance}
            disabled={loading}
            style={{
              background: "linear-gradient(135deg, #f6dd84, #d4af37)",
              color: "#081833",
              border: "1.5px solid #f6dd84",
              borderRadius: "10px",
              padding: "9px 16px",
              fontWeight: 900,
              cursor: "pointer"
            }}
          >
            {loading ? "⏳ Syncing Logs..." : "🔄 Refresh Register"}
          </button>
        </div>
      </div>

      {/* Headmaster School Closing Time & Auto Clock-Out Policy Form */}
      <form
        onSubmit={handleSavePolicy}
        style={{
          background: "rgba(5, 15, 35, 0.85)",
          border: "1px solid rgba(212, 175, 55, 0.4)",
          borderRadius: "12px",
          padding: "14px",
          marginBottom: "16px",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(175px, 1fr))",
          gap: "10px",
          alignItems: "end"
        }}
      >
        <div>
          <label style={{ display: "block", fontSize: "0.72rem", color: "#f6dd84", fontWeight: 700, marginBottom: "4px" }}>
            School / Work Closing Time
          </label>
          <input
            type="time"
            value={policyDraft.closingTime}
            onChange={(e) => setPolicyDraft({ ...policyDraft, closingTime: e.target.value })}
            style={{ width: "100%", padding: "7px 10px", borderRadius: "7px", background: "#081833", color: "#fff", border: "1px solid #d4af37" }}
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
        <label style={{ display: "flex", alignItems: "center", gap: "7px", fontSize: "0.76rem", color: "#cbd5e1", paddingBottom: "8px" }}>
          <input
            type="checkbox"
            checked={Boolean(policyDraft.enforceClockOutReasonBeforeClose)}
            onChange={(e) => setPolicyDraft({ ...policyDraft, enforceClockOutReasonBeforeClose: e.target.checked })}
          />
          Require Reason Before Close
        </label>
        <button
          type="submit"
          disabled={savingPolicy}
          style={{
            background: "#059669",
            color: "#fff",
            border: "1px solid #34d399",
            borderRadius: "8px",
            padding: "8px 14px",
            fontWeight: 800,
            cursor: "pointer"
          }}
        >
          {savingPolicy ? "Saving..." : "💾 Save Closing & Term Policy"}
        </button>
      </form>

      {/* Live Headmaster Clock-In Desk (Supervisor widget, without welcome blocking popup) */}
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
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "10px", marginBottom: "16px" }}>
        <div style={{ background: "rgba(5, 15, 35, 0.85)", border: "1px solid rgba(212, 175, 55, 0.4)", borderRadius: "12px", padding: "12px 14px" }}>
          <span style={{ fontSize: "0.72rem", color: "#cbd5e1", display: "block" }}>Total Term Logs</span>
          <strong style={{ fontSize: "1.45rem", color: "#f6dd84" }}>{summary.totalLogs}</strong>
        </div>
        <div style={{ background: "rgba(5, 15, 35, 0.85)", border: "1px solid rgba(16, 185, 129, 0.45)", borderRadius: "12px", padding: "12px 14px" }}>
          <span style={{ fontSize: "0.72rem", color: "#cbd5e1", display: "block" }}>On Duty (Present)</span>
          <strong style={{ fontSize: "1.45rem", color: "#6ee7b7" }}>{summary.onDutyCount}</strong>
        </div>
        <div style={{ background: "rgba(5, 15, 35, 0.85)", border: "1px solid rgba(212, 175, 55, 0.4)", borderRadius: "12px", padding: "12px 14px" }}>
          <span style={{ fontSize: "0.72rem", color: "#cbd5e1", display: "block" }}>Clocked Out</span>
          <strong style={{ fontSize: "1.45rem", color: "#f6dd84" }}>{summary.clockedOutCount}</strong>
        </div>
        <div style={{ background: "rgba(5, 15, 35, 0.85)", border: "1px solid rgba(56, 189, 248, 0.45)", borderRadius: "12px", padding: "12px 14px" }}>
          <span style={{ fontSize: "0.72rem", color: "#cbd5e1", display: "block" }}>Auto Clocked Out (+2h)</span>
          <strong style={{ fontSize: "1.45rem", color: "#7dd3fc" }}>{summary.autoClockedOutCount}</strong>
        </div>
        <div style={{ background: "rgba(5, 15, 35, 0.85)", border: "1px solid rgba(239, 68, 68, 0.45)", borderRadius: "12px", padding: "12px 14px" }}>
          <span style={{ fontSize: "0.72rem", color: "#cbd5e1", display: "block" }}>Bypassed (Not Present)</span>
          <strong style={{ fontSize: "1.45rem", color: "#fca5a5" }}>{summary.bypassedCount}</strong>
        </div>
        <div style={{ background: "rgba(5, 15, 35, 0.85)", border: "1px solid rgba(212, 175, 55, 0.45)", borderRadius: "12px", padding: "12px 14px" }}>
          <span style={{ fontSize: "0.72rem", color: "#cbd5e1", display: "block" }}>🩺 Clinic Staff Logs</span>
          <strong style={{ fontSize: "1.45rem", color: "#f6dd84" }}>{summary.clinicStaffCount}</strong>
        </div>
      </div>

      {/* Department, Term, Date Range & Status Filters */}
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
          <option value="ALL">All Terms (Full Academic Session)</option>
          {availableTerms.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>

        <select className="filter-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="ALL">All Duty Statuses</option>
          <option value="CLOCKED_IN">Currently On Duty (Present)</option>
          <option value="CLOCKED_OUT">Manual Clock Out</option>
          <option value="AUTO_CLOCKED_OUT">Auto Clocked Out (+2h After Close)</option>
          <option value="BYPASSED_UNMARKED">Bypassed (Not Marked Present)</option>
        </select>

        <input type="date" className="filter-input" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} style={{ width: "135px" }} />
        <input type="date" className="filter-input" value={dateTo} onChange={(e) => setDateTo(e.target.value)} style={{ width: "135px" }} />

        <input
          type="text"
          className="filter-input"
          placeholder="Search staff, role, department, reason..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ minWidth: "210px", flex: 1 }}
        />
      </div>

      {/* Attendance Table */}
      <div style={{ overflowX: "auto", background: "rgba(5, 15, 35, 0.78)", borderRadius: "12px", border: "1px solid rgba(212, 175, 55, 0.35)" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
          <thead>
            <tr style={{ background: "rgba(13, 34, 71, 0.95)", color: "#f6dd84", fontSize: "0.75rem", textTransform: "uppercase" }}>
              <th style={{ padding: "11px 14px" }}>Personnel Name &amp; Role</th>
              <th style={{ padding: "11px 14px" }}>Department / Term</th>
              <th style={{ padding: "11px 14px" }}>Date</th>
              <th style={{ padding: "11px 14px" }}>Clock-In Time</th>
              <th style={{ padding: "11px 14px" }}>Clock-Out Time</th>
              <th style={{ padding: "11px 14px" }}>Reason / Auto-Close Detail</th>
              <th style={{ padding: "11px 14px" }}>Duty Status</th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 ? (
              <tr>
                <td colSpan="7" style={{ textAlign: "center", padding: "26px", color: "#94a3b8", fontSize: "0.86rem" }}>
                  No staff, teacher, or school clinic doctor/nurse shift records match this filter yet. Personnel logs appear automatically as staff clock in, bypass, clock out, or auto-close.
                </td>
              </tr>
            ) : (
              logs.map((row) => {
                const badge = getStatusBadge(row.status);
                return (
                  <tr key={row.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.07)", fontSize: "0.82rem" }}>
                    <td style={{ padding: "10px 14px" }}>
                      <strong style={{ color: "#ffffff", display: "block" }}>{row.staffName}</strong>
                      <span style={{ fontSize: "0.72rem", color: "#f6dd84" }}>
                        {row.staffRole} {row.staffEmail ? `• ${row.staffEmail}` : ""}
                      </span>
                    </td>
                    <td style={{ padding: "10px 14px", color: "#cbd5e1" }}>
                      <div>{row.department}</div>
                      <div style={{ fontSize: "0.7rem", color: "#94a3b8" }}>{row.termLabel || policyDraft.activeTerm}</div>
                    </td>
                    <td style={{ padding: "10px 14px", color: "#cbd5e1" }}>{row.shiftDate}</td>
                    <td style={{ padding: "10px 14px", fontWeight: 700, color: row.bypassedClockIn ? "#fca5a5" : "#6ee7b7" }}>
                      {formatTime(row.clockInAt, row.bypassedClockIn)}
                    </td>
                    <td style={{ padding: "10px 14px", fontWeight: 700, color: row.clockOutAt ? "#f6dd84" : "#94a3b8" }}>
                      {formatTime(row.clockOutAt)}
                      {row.durationMinutes !== null && row.durationMinutes !== undefined && row.status !== "BYPASSED_UNMARKED" && (
                        <div style={{ fontSize: "0.7rem", color: "#94a3b8" }}>
                          {Math.floor(row.durationMinutes / 60)}h {row.durationMinutes % 60}m
                        </div>
                      )}
                    </td>
                    <td style={{ padding: "10px 14px", color: "#cbd5e1", maxWidth: "260px" }}>
                      {row.clockOutReason || row.clockOutNote || row.clockInNote || "—"}
                    </td>
                    <td style={{ padding: "10px 14px" }}>
                      <span
                        style={{
                          padding: "3px 9px",
                          borderRadius: "999px",
                          fontSize: "0.7rem",
                          fontWeight: 800,
                          background: badge.bg,
                          color: badge.color,
                          border: `1px solid ${badge.border}`,
                          whiteSpace: "nowrap"
                        }}
                      >
                        {badge.label}
                      </span>
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
