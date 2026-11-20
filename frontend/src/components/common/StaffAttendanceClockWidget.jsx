import React, { useState, useEffect, useCallback } from "react";
import apiClient from "../../api/client/apiClient";

const CLINICAL_ROLES = [
  { value: "CLINIC_DOCTOR", label: "🩺 School Clinic Doctor", department: "School Clinic (Medical)", designation: "Resident School Clinic Doctor" },
  { value: "CLINIC_NURSE", label: "💉 School Clinic Nurse", department: "School Clinic (Medical)", designation: "Senior School Clinic Nurse" }
];

export default function StaffAttendanceClockWidget({
  roleOverride = "",
  isClinicDesk = false,
  currentUser = null,
  onNotice = null,
  onFeedback = null
}) {
  const storedUser = (() => {
    if (currentUser && typeof currentUser === "object") return currentUser;
    try {
      return JSON.parse(localStorage.getItem("gbs_user") || "{}");
    } catch {
      return {};
    }
  })();

  const defaultName = storedUser.fullName || `${storedUser.firstName || ""} ${storedUser.lastName || ""}`.trim() || storedUser.name || storedUser.email || "Institutional Staff";
  const defaultRole = String(roleOverride || storedUser.role || "STAFF").toUpperCase();

  const [statusData, setStatusData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [shiftNote, setShiftNote] = useState("");
  const [clinicStaffName, setClinicStaffName] = useState(defaultName);
  const [clinicStaffEmail, setClinicStaffEmail] = useState(storedUser.email || "");
  const [clinicStaffRole, setClinicStaffRole] = useState("CLINIC_DOCTOR");
  const [feedback, setFeedback] = useState(null);

  const notify = (text, isError = false) => {
    setFeedback({ text, isError });
    if (typeof onNotice === "function") onNotice({ type: isError ? "error" : "success", message: text });
    if (typeof onFeedback === "function") onFeedback(text, isError);
    if (typeof window !== "undefined" && typeof window.showGBSOpenNotice === "function") {
      window.showGBSOpenNotice(text, isError ? "error" : "success", "STAFF ATTENDANCE CLOCK DESK");
    }
  };

  const fetchMyAttendanceStatus = useCallback(async () => {
    try {
      const params = isClinicDesk
        ? {
            isClinicStaff: "true",
            staffName: clinicStaffName,
            staffEmail: clinicStaffEmail,
            staffRole: clinicStaffRole
          }
        : {};
      const res = await apiClient.get("/staff-attendance/my-status", { params });
      if (res?.data?.data) {
        setStatusData(res.data.data);
      }
    } catch { }
  }, [isClinicDesk, clinicStaffName, clinicStaffEmail, clinicStaffRole]);

  useEffect(() => {
    fetchMyAttendanceStatus();
  }, [fetchMyAttendanceStatus]);

  const handleClockIn = async () => {
    setLoading(true);
    try {
      const clinicMeta = CLINICAL_ROLES.find((r) => r.value === clinicStaffRole) || CLINICAL_ROLES[0];
      const payload = isClinicDesk
        ? {
            isClinicStaff: true,
            staffName: clinicStaffName.trim() || defaultName,
            staffEmail: clinicStaffEmail.trim() || storedUser.email || "",
            staffRole: clinicMeta.value,
            department: clinicMeta.department,
            designation: clinicMeta.designation,
            notes: shiftNote.trim() || "Clinic shift clocked in cleanly."
          }
        : {
            staffRole: defaultRole,
            notes: shiftNote.trim() || "Daily duty clocked in cleanly."
          };

      const res = await apiClient.post("/staff-attendance/clock-in", payload);
      notify(res?.data?.message || "✅ Clocked in successfully! Recorded for Headmaster monitoring.");
      setShiftNote("");
      await fetchMyAttendanceStatus();
      window.dispatchEvent(new Event("gbs_staff_attendance_updated"));
    } catch (err) {
      notify(err?.response?.data?.message || err.message || "Could not clock in right now.", true);
    } finally {
      setLoading(false);
    }
  };

  const handleClockOut = async () => {
    setLoading(true);
    try {
      const clinicMeta = CLINICAL_ROLES.find((r) => r.value === clinicStaffRole) || CLINICAL_ROLES[0];
      const payload = isClinicDesk
        ? {
            isClinicStaff: true,
            staffName: clinicStaffName.trim() || defaultName,
            staffEmail: clinicStaffEmail.trim() || storedUser.email || "",
            staffRole: clinicMeta.value,
            shiftId: statusData?.activeShift?.id || null,
            notes: shiftNote.trim() || "Clinic shift closed and clocked out cleanly."
          }
        : {
            shiftId: statusData?.activeShift?.id || null,
            staffRole: defaultRole,
            notes: shiftNote.trim() || "Closing duty clocked out cleanly."
          };

      const res = await apiClient.post("/staff-attendance/clock-out", payload);
      notify(res?.data?.message || "✅ Clocked out at close of duty cleanly.");
      setShiftNote("");
      await fetchMyAttendanceStatus();
      window.dispatchEvent(new Event("gbs_staff_attendance_updated"));
    } catch (err) {
      notify(err?.response?.data?.message || err.message || "Could not clock out right now.", true);
    } finally {
      setLoading(false);
    }
  };

  const isClockedIn = statusData?.currentStatus === "CLOCKED_IN";
  const activeShift = statusData?.activeShift;

  return (
    <div
      data-testid={isClinicDesk ? "clinic-staff-clock-widget" : "staff-attendance-clock-widget"}
      style={{
        background: "linear-gradient(135deg, rgba(8, 24, 51, 0.96) 0%, rgba(13, 34, 71, 0.96) 100%)",
        border: "1.5px solid #d4af37",
        borderRadius: "14px",
        padding: "16px 18px",
        marginBottom: "18px",
        color: "#f8fafc"
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px", marginBottom: "12px" }}>
        <div>
          <span style={{ fontSize: "0.72rem", fontWeight: 800, color: "#f6dd84", letterSpacing: "0.8px", textTransform: "uppercase" }}>
            {isClinicDesk ? "🩺 SCHOOL CLINIC DOCTOR & NURSE SHIFT ATTENDANCE" : "⏱️ DAILY STAFF DUTY ATTENDANCE (CLOCK IN & CLOCK OUT)"}
          </span>
          <h4 style={{ margin: "4px 0 0", fontSize: "1.02rem", color: "#ffffff" }}>
            {isClinicDesk ? "Clinic Doctor & Nurse Clock-In / Clock-Out Desk" : `${defaultName} (${defaultRole})`}
          </h4>
        </div>

        <div style={{
          padding: "5px 12px",
          borderRadius: "999px",
          fontSize: "0.78rem",
          fontWeight: 800,
          background: isClockedIn ? "rgba(16, 185, 129, 0.22)" : "rgba(212, 175, 55, 0.16)",
          border: `1.5px solid ${isClockedIn ? "#10b981" : "#d4af37"}`,
          color: isClockedIn ? "#6ee7b7" : "#f6dd84"
        }}>
          {isClockedIn && activeShift
            ? `🟢 ON DUTY • Clocked in at ${new Date(activeShift.clockInAt).toLocaleTimeString()}`
            : statusData?.currentStatus === "CLOCKED_OUT"
              ? "🔵 Shift Closed (Clocked Out Today)"
              : "⚪ Not Clocked In Yet"}
        </div>
      </div>

      {feedback && (
        <div style={{
          marginBottom: "10px",
          padding: "8px 12px",
          borderRadius: "8px",
          fontSize: "0.8rem",
          fontWeight: 700,
          background: feedback.isError ? "rgba(239, 68, 68, 0.18)" : "rgba(16, 185, 129, 0.18)",
          border: `1px solid ${feedback.isError ? "#ef4444" : "#10b981"}`,
          color: feedback.isError ? "#fecaca" : "#a7f3d0"
        }}>
          {feedback.text}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: isClinicDesk ? "repeat(auto-fit, minmax(180px, 1fr))" : "1fr auto auto", gap: "10px", alignItems: "center" }}>
        {isClinicDesk && (
          <>
            <select
              value={clinicStaffRole}
              onChange={(e) => setClinicStaffRole(e.target.value)}
              style={{ background: "#050f23", color: "#f6dd84", border: "1px solid #d4af37", borderRadius: "8px", padding: "8px 10px", fontWeight: 700, fontSize: "0.82rem" }}
            >
              {CLINICAL_ROLES.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
            <input
              type="text"
              placeholder="Doctor / Nurse Full Name"
              value={clinicStaffName}
              onChange={(e) => setClinicStaffName(e.target.value)}
              style={{ background: "#050f23", color: "#f8fafc", border: "1px solid rgba(212,175,55,0.45)", borderRadius: "8px", padding: "8px 10px", fontSize: "0.82rem" }}
            />
            <input
              type="email"
              placeholder="Medical Staff Email (optional)"
              value={clinicStaffEmail}
              onChange={(e) => setClinicStaffEmail(e.target.value)}
              style={{ background: "#050f23", color: "#f8fafc", border: "1px solid rgba(212,175,55,0.45)", borderRadius: "8px", padding: "8px 10px", fontSize: "0.82rem" }}
            />
          </>
        )}

        <input
          type="text"
          placeholder={isClockedIn ? "Closing summary note before clock out..." : "Duty location / arrival note (optional)..."}
          value={shiftNote}
          onChange={(e) => setShiftNote(e.target.value)}
          style={{ background: "#050f23", color: "#f8fafc", border: "1px solid rgba(212,175,55,0.45)", borderRadius: "8px", padding: "8px 12px", fontSize: "0.82rem" }}
        />

        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          <button
            type="button"
            disabled={loading || isClockedIn}
            onClick={handleClockIn}
            style={{
              background: isClockedIn ? "rgba(100,116,139,0.28)" : "linear-gradient(135deg, #065f46 0%, #10b981 100%)",
              color: "#ffffff",
              border: "1px solid #d4af37",
              borderRadius: "8px",
              padding: "8px 14px",
              fontSize: "0.8rem",
              fontWeight: 800,
              cursor: loading || isClockedIn ? "not-allowed" : "pointer",
              opacity: isClockedIn ? 0.55 : 1
            }}
          >
            ⏰ Clock In
          </button>

          <button
            type="button"
            disabled={loading || !isClockedIn}
            onClick={handleClockOut}
            style={{
              background: !isClockedIn ? "rgba(100,116,139,0.28)" : "linear-gradient(135deg, #781d2b 0%, #d4af37 100%)",
              color: "#ffffff",
              border: "1px solid #d4af37",
              borderRadius: "8px",
              padding: "8px 14px",
              fontSize: "0.8rem",
              fontWeight: 800,
              cursor: loading || !isClockedIn ? "not-allowed" : "pointer",
              opacity: !isClockedIn ? 0.55 : 1
            }}
          >
            🏁 Clock Out
          </button>
        </div>
      </div>

      {Array.isArray(statusData?.recentLogs) && statusData.recentLogs.length > 0 && (
        <div style={{ marginTop: "10px", fontSize: "0.75rem", color: "#cbd5e1", borderTop: "1px solid rgba(212,175,55,0.25)", paddingTop: "8px" }}>
          Latest Shift: <strong style={{ color: "#f6dd84" }}>{statusData.recentLogs[0].staffName}</strong> ({statusData.recentLogs[0].designation}) •{" "}
          In: {new Date(statusData.recentLogs[0].clockInAt).toLocaleTimeString()}
          {statusData.recentLogs[0].clockOutAt && ` • Out: ${new Date(statusData.recentLogs[0].clockOutAt).toLocaleTimeString()} (${statusData.recentLogs[0].hoursWorkedLabel})`}
          {" "}• Synced to Headmaster Staff Attendance Register
        </div>
      )}
    </div>
  );
}
