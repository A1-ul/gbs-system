import React, { useState, useEffect, useCallback } from "react";
import apiClient from "../../api/client/apiClient";
import StaffAttendanceClockWidget from "./StaffAttendanceClockWidget";

export default function HeadmasterStaffAttendanceView({ currentUser = null, onFeedback = null }) {
  const [logs, setLogs] = useState([]);
  const [summary, setSummary] = useState({ totalLogs: 0, onDutyCount: 0, clockedOutCount: 0, clinicStaffCount: 0 });
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);

  const fetchAllAttendance = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get("/staff-attendance/all", {
        params: {
          category: categoryFilter,
          status: statusFilter,
          search: searchQuery.trim()
        }
      });
      const data = res?.data?.data;
      if (data) {
        const list = Array.isArray(data.logs) ? data.logs : (Array.isArray(data.records) ? data.records : []);
        setLogs(list);
        if (data.summary) {
          setSummary({
            totalLogs: data.summary.totalLogs ?? data.summary.totalRecords ?? list.length,
            onDutyCount: data.summary.onDutyCount ?? data.summary.clockedInNow ?? 0,
            clockedOutCount: data.summary.clockedOutCount ?? data.summary.clockedOutToday ?? 0,
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
  }, [categoryFilter, statusFilter, searchQuery, onFeedback]);

  useEffect(() => {
    fetchAllAttendance();
  }, [fetchAllAttendance]);

  const formatTime = (iso) => {
    if (!iso) return "—";
    try {
      return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    } catch {
      return iso;
    }
  };

  return (
    <div className="role-workspace-card" data-testid="headmaster-staff-attendance-view" style={{ padding: "22px", borderRadius: "16px", background: "linear-gradient(145deg, rgba(8, 24, 51, 0.96) 0%, rgba(13, 34, 71, 0.96) 100%)", border: "1.5px solid #d4af37", color: "#f8fafc" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px", marginBottom: "16px" }}>
        <div>
          <span style={{ fontSize: "0.75rem", fontWeight: 800, color: "#f6dd84", letterSpacing: "1px", textTransform: "uppercase" }}>
            ⏱️ HEADMASTER OVERSIGHT • INSTITUTIONAL DUTY ROSTER
          </span>
          <h2 style={{ margin: "4px 0 0", color: "#ffffff", fontSize: "1.35rem" }}>
            Staff, Teachers, Accountants, HR &amp; School Clinic Doctors / Nurses Attendance
          </h2>
          <p style={{ margin: "4px 0 0", fontSize: "0.82rem", color: "#cbd5e1" }}>
            Real-time arrival clock-in and departure clock-out records across every department including Medical Clinic Doctors &amp; Nurses.
          </p>
        </div>
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
          {loading ? "⏳ Syncing Logs..." : "🔄 Refresh Attendance Ledger"}
        </button>
      </div>

      {/* Live Headmaster Clock-In Desk (also lets Headmaster log or supervise shifts directly) */}
      <StaffAttendanceClockWidget
        roleOverride="ADMIN"
        currentUser={currentUser}
        onFeedback={(msg, isErr) => {
          fetchAllAttendance();
          if (typeof onFeedback === "function") onFeedback(msg, isErr);
        }}
      />

      {/* KPI Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(175px, 1fr))", gap: "12px", marginBottom: "16px" }}>
        <div style={{ background: "rgba(5, 15, 35, 0.85)", border: "1px solid rgba(212, 175, 55, 0.4)", borderRadius: "12px", padding: "12px 14px" }}>
          <span style={{ fontSize: "0.74rem", color: "#cbd5e1", display: "block" }}>Total Shift Logs</span>
          <strong style={{ fontSize: "1.5rem", color: "#f6dd84" }}>{summary.totalLogs}</strong>
        </div>
        <div style={{ background: "rgba(5, 15, 35, 0.85)", border: "1px solid rgba(16, 185, 129, 0.45)", borderRadius: "12px", padding: "12px 14px" }}>
          <span style={{ fontSize: "0.74rem", color: "#cbd5e1", display: "block" }}>Currently On Duty (Clocked In)</span>
          <strong style={{ fontSize: "1.5rem", color: "#6ee7b7" }}>{summary.onDutyCount}</strong>
        </div>
        <div style={{ background: "rgba(5, 15, 35, 0.85)", border: "1px solid rgba(212, 175, 55, 0.4)", borderRadius: "12px", padding: "12px 14px" }}>
          <span style={{ fontSize: "0.74rem", color: "#cbd5e1", display: "block" }}>Completed Shifts (Clocked Out)</span>
          <strong style={{ fontSize: "1.5rem", color: "#f6dd84" }}>{summary.clockedOutCount}</strong>
        </div>
        <div style={{ background: "rgba(5, 15, 35, 0.85)", border: "1px solid rgba(212, 175, 55, 0.45)", borderRadius: "12px", padding: "12px 14px" }}>
          <span style={{ fontSize: "0.74rem", color: "#cbd5e1", display: "block" }}>🩺 Clinic Doctors &amp; Nurses Logs</span>
          <strong style={{ fontSize: "1.5rem", color: "#f6dd84" }}>{summary.clinicStaffCount}</strong>
        </div>
      </div>

      {/* Category & Status Filters */}
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

        <select
          className="filter-select"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{ marginLeft: "auto" }}
        >
          <option value="ALL">All Duty Statuses</option>
          <option value="CLOCKED_IN">Currently On Duty</option>
          <option value="CLOCKED_OUT">Shift Closed (Clocked Out)</option>
        </select>

        <input
          type="text"
          className="filter-input"
          placeholder="Search staff, doctor, nurse, department..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ minWidth: "230px" }}
        />
      </div>

      {/* Attendance Table */}
      <div style={{ overflowX: "auto", background: "rgba(5, 15, 35, 0.78)", borderRadius: "12px", border: "1px solid rgba(212, 175, 55, 0.35)" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
          <thead>
            <tr style={{ background: "rgba(13, 34, 71, 0.95)", color: "#f6dd84", fontSize: "0.76rem", textTransform: "uppercase" }}>
              <th style={{ padding: "11px 14px" }}>Personnel Name &amp; Role</th>
              <th style={{ padding: "11px 14px" }}>Department / Duty Unit</th>
              <th style={{ padding: "11px 14px" }}>Date</th>
              <th style={{ padding: "11px 14px" }}>Clock-In Time</th>
              <th style={{ padding: "11px 14px" }}>Clock-Out Time</th>
              <th style={{ padding: "11px 14px" }}>Duration</th>
              <th style={{ padding: "11px 14px" }}>Duty Status</th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 ? (
              <tr>
                <td colSpan="7" style={{ textAlign: "center", padding: "26px", color: "#94a3b8", fontSize: "0.86rem" }}>
                  No staff, teacher, or school clinic doctor/nurse shift records match this filter yet. Personnel logs appear automatically as staff clock in and out.
                </td>
              </tr>
            ) : (
              logs.map((row) => (
                <tr key={row.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.07)", fontSize: "0.84rem" }}>
                  <td style={{ padding: "10px 14px" }}>
                    <strong style={{ color: "#ffffff", display: "block" }}>{row.staffName}</strong>
                    <span style={{ fontSize: "0.72rem", color: "#f6dd84" }}>
                      {row.staffRole} {row.staffEmail ? `• ${row.staffEmail}` : ""}
                    </span>
                  </td>
                  <td style={{ padding: "10px 14px", color: "#cbd5e1" }}>
                    {row.department}
                    {(row.clockInNote || row.clockOutNote || row.notes) && (
                      <div style={{ fontSize: "0.72rem", color: "#94a3b8" }}>{row.clockInNote || row.clockOutNote || row.notes}</div>
                    )}
                  </td>
                  <td style={{ padding: "10px 14px", color: "#cbd5e1" }}>{row.shiftDate}</td>
                  <td style={{ padding: "10px 14px", fontWeight: 700, color: "#6ee7b7" }}>{formatTime(row.clockInAt)}</td>
                  <td style={{ padding: "10px 14px", fontWeight: 700, color: row.clockOutAt ? "#f6dd84" : "#94a3b8" }}>
                    {formatTime(row.clockOutAt)}
                  </td>
                  <td style={{ padding: "10px 14px", color: "#cbd5e1" }}>
                    {row.durationMinutes !== null && row.durationMinutes !== undefined
                      ? `${Math.floor(row.durationMinutes / 60)}h ${row.durationMinutes % 60}m`
                      : "Active"}
                  </td>
                  <td style={{ padding: "10px 14px" }}>
                    <span style={{
                      padding: "3px 9px",
                      borderRadius: "999px",
                      fontSize: "0.72rem",
                      fontWeight: 800,
                      background: row.status === "CLOCKED_IN" ? "rgba(16, 185, 129, 0.22)" : "rgba(212, 175, 55, 0.2)",
                      color: row.status === "CLOCKED_IN" ? "#6ee7b7" : "#f6dd84",
                      border: `1px solid ${row.status === "CLOCKED_IN" ? "#10b981" : "#d4af37"}`
                    }}>
                      {row.status === "CLOCKED_IN" ? "🟢 ON DUTY" : "✅ CLOCKED OUT"}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
