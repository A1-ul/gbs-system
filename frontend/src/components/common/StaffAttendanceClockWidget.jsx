import React, { useState, useEffect, useCallback } from "react";
import apiClient from "../../api/client/apiClient";

const CLINICAL_ROLES = [
  { value: "CLINIC_DOCTOR", label: "🩺 School Clinic Doctor", department: "School Clinic (Medical)", designation: "Resident School Clinic Doctor" },
  { value: "CLINIC_NURSE", label: "💉 School Clinic Nurse", department: "School Clinic (Medical)", designation: "Senior School Clinic Nurse" }
];

export default function StaffAttendanceClockWidget({
  roleOverride = "",
  isClinicDesk = false,
  autoShowWelcomePrompt = true,
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

  const defaultName =
    storedUser.fullName ||
    `${storedUser.firstName || ""} ${storedUser.lastName || ""}`.trim() ||
    storedUser.name ||
    storedUser.email ||
    "Institutional Staff";
  const defaultRole = String(roleOverride || storedUser.role || "STAFF").toUpperCase();
  const isAdminSupervisor = ["ADMIN", "SUPER_ADMIN", "HEADMASTER", "PRINCIPAL"].includes(defaultRole);

  const [statusData, setStatusData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [shiftNote, setShiftNote] = useState("");
  const [clockOutReason, setClockOutReason] = useState("");
  const [clinicStaffName, setClinicStaffName] = useState(defaultName);
  const [clinicStaffEmail, setClinicStaffEmail] = useState(storedUser.email || "");
  const [clinicStaffRole, setClinicStaffRole] = useState("CLINIC_DOCTOR");
  const [feedback, setFeedback] = useState(null);
  const [welcomeDismissed, setWelcomeDismissed] = useState(false);

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
            notes: shiftNote.trim() || "Reported to school and clocked in cleanly."
          }
        : {
            staffRole: defaultRole,
            notes: shiftNote.trim() || "Reported to school and clocked in to begin duties."
          };

      const res = await apiClient.post("/staff-attendance/clock-in", payload);
      notify(res?.data?.message || "✅ Clocked in successfully! Arrival time recorded for Headmaster monitoring.");
      setShiftNote("");
      setWelcomeDismissed(true);
      await fetchMyAttendanceStatus();
      window.dispatchEvent(new Event("gbs_staff_attendance_updated"));
    } catch (err) {
      notify(err?.response?.data?.message || err.message || "Could not clock in right now.", true);
    } finally {
      setLoading(false);
    }
  };

  const handleBypassWithoutClockIn = async () => {
    setLoading(true);
    try {
      const res = await apiClient.post("/staff-attendance/bypass", {
        staffRole: defaultRole,
        notes: "Bypassed welcome clock-in prompt — NOT marked present at work."
      });
      notify(
        res?.data?.message ||
          "Bypassed clock-in prompt. Note: You are NOT marked present at work or on duty until you clock in.",
        false
      );
      setWelcomeDismissed(true);
      await fetchMyAttendanceStatus();
      window.dispatchEvent(new Event("gbs_staff_attendance_updated"));
    } catch (err) {
      notify(err?.response?.data?.message || "Could not bypass clock-in prompt right now.", true);
    } finally {
      setLoading(false);
    }
  };

  const handleClockOut = async () => {
    const isBeforeClose = Boolean(statusData?.isBeforeClosingTime);
    const trimmedReason = clockOutReason.trim();
    if (isBeforeClose && statusData?.settings?.enforceClockOutReasonBeforeClose !== false && trimmedReason.length < 4) {
      notify(
        `School closing time is ${statusData?.settings?.closingTime || "16:00"}. Please enter your Clock-Out Reason before clocking out early.`,
        true
      );
      return;
    }

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
            reason: trimmedReason || "End of scheduled school/clinic closing time.",
            notes: shiftNote.trim() || trimmedReason || "Clinic shift closed and clocked out cleanly."
          }
        : {
            shiftId: statusData?.activeShift?.id || null,
            staffRole: defaultRole,
            reason: trimmedReason || "End of school/work closing time.",
            notes: shiftNote.trim() || trimmedReason || "Closing duty clocked out cleanly."
          };

      const res = await apiClient.post("/staff-attendance/clock-out", payload);
      notify(res?.data?.message || "✅ Clocked out cleanly at close of work.");
      setShiftNote("");
      setClockOutReason("");
      await fetchMyAttendanceStatus();
      window.dispatchEvent(new Event("gbs_staff_attendance_updated"));
    } catch (err) {
      notify(err?.response?.data?.message || err.message || "Could not clock out right now.", true);
    } finally {
      setLoading(false);
    }
  };

  const isClockedIn = statusData?.currentStatus === "CLOCKED_IN";
  const isBypassed = !isClockedIn && (statusData?.currentStatus === "BYPASSED_UNMARKED" || statusData?.bypassedToday);
  const isAutoClockedOut = statusData?.currentStatus === "AUTO_CLOCKED_OUT";
  const activeShift = statusData?.activeShift;
  const institutionName = statusData?.institutionName || storedUser.institutionName || "GBS Registered Institution";
  const closingTimeLabel = statusData?.settings?.closingTime || "16:00";
  const showWelcomeModal =
    Boolean(autoShowWelcomePrompt) &&
    !isAdminSupervisor &&
    !isClinicDesk &&
    !welcomeDismissed &&
    Boolean(statusData?.needsWelcomePrompt);

  return (
    <>
      {showWelcomeModal && (
        <div
          data-testid="staff-welcome-clockin-modal"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 99990,
            background: "rgba(4, 10, 24, 0.86)",
            backdropFilter: "blur(8px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px"
          }}
        >
          <div
            style={{
              maxWidth: "560px",
              width: "100%",
              background: "linear-gradient(145deg, #081833 0%, #0d2247 100%)",
              border: "2px solid #d4af37",
              borderRadius: "20px",
              padding: "28px",
              color: "#f8fafc",
              boxShadow: "0 24px 60px rgba(0, 0, 0, 0.65)"
            }}
          >
            <div style={{ fontSize: "0.75rem", fontWeight: 900, color: "#f6dd84", letterSpacing: "1.2px", textTransform: "uppercase", marginBottom: "6px" }}>
              🏫 STAFF REPORTING &amp; DAILY ATTENDANCE CHECK-IN
            </div>
            <h2 style={{ margin: "0 0 8px", fontSize: "1.45rem", color: "#ffffff", fontWeight: 900 }}>
              WELCOME TO SCHOOL — {institutionName.toUpperCase()}
            </h2>
            <p style={{ margin: "0 0 14px", fontSize: "0.88rem", color: "#cbd5e1", lineHeight: 1.5 }}>
              Hello <strong style={{ color: "#f6dd84" }}>{defaultName}</strong> ({defaultRole}). Recording your arrival marks you <strong>Present on Duty</strong> with your exact arrival timestamp for Headmaster monitoring through the end of term ({statusData?.settings?.activeTerm || "Current Term"}). Closing time is <strong>{closingTimeLabel}</strong> (auto clock-out triggers 2 hours after close if forgotten).
            </p>

            <div style={{ marginBottom: "14px" }}>
              <label style={{ display: "block", fontSize: "0.78rem", color: "#f6dd84", fontWeight: 700, marginBottom: "5px" }}>
                Duty Start Note / Classroom / Department (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Reported to campus — JHS 2 Mathematics morning lesson"
                value={shiftNote}
                onChange={(e) => setShiftNote(e.target.value)}
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  padding: "10px 12px",
                  borderRadius: "9px",
                  border: "1px solid rgba(212,175,55,0.5)",
                  background: "#050f23",
                  color: "#ffffff",
                  fontSize: "0.86rem"
                }}
              />
            </div>

            <div style={{
              background: "rgba(239, 68, 68, 0.14)",
              border: "1px solid rgba(248, 113, 113, 0.45)",
              borderRadius: "10px",
              padding: "10px 12px",
              fontSize: "0.78rem",
              color: "#fecaca",
              marginBottom: "16px"
            }}>
              <strong>⚠️ Notice on Bypass:</strong> Choosing <em>Bypass Without Clocking In</em> lets you work on your dashboard, but <strong>you will NOT be marked present at work or on duty</strong> on the Headmaster&apos;s attendance register.
            </div>

            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
              <button
                type="button"
                disabled={loading}
                data-testid="welcome-clockin-confirm-btn"
                onClick={handleClockIn}
                style={{
                  flex: 1,
                  minWidth: "200px",
                  padding: "12px 16px",
                  borderRadius: "10px",
                  border: "1.5px solid #f6dd84",
                  background: "linear-gradient(135deg, #065f46 0%, #10b981 100%)",
                  color: "#ffffff",
                  fontWeight: 900,
                  fontSize: "0.9rem",
                  cursor: loading ? "wait" : "pointer"
                }}
              >
                ⏰ Clock In &amp; Mark Present
              </button>
              <button
                type="button"
                disabled={loading}
                data-testid="welcome-bypass-btn"
                onClick={handleBypassWithoutClockIn}
                style={{
                  padding: "12px 16px",
                  borderRadius: "10px",
                  border: "1px solid rgba(248, 113, 113, 0.5)",
                  background: "rgba(120, 29, 43, 0.45)",
                  color: "#fecaca",
                  fontWeight: 800,
                  fontSize: "0.84rem",
                  cursor: loading ? "wait" : "pointer"
                }}
              >
                ⏭️ Bypass (Not Marked Present)
              </button>
            </div>
          </div>
        </div>
      )}

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
              {isClinicDesk
                ? "🩺 SCHOOL CLINIC DOCTOR & NURSE SHIFT ATTENDANCE"
                : `🏫 WELCOME TO SCHOOL — ${institutionName.toUpperCase()} • DUTY CLOCK-IN & OUT`}
            </span>
            <h4 style={{ margin: "4px 0 0", fontSize: "1.02rem", color: "#ffffff" }}>
              {isClinicDesk ? "Clinic Doctor & Nurse Clock-In / Clock-Out Desk" : `${defaultName} (${defaultRole})`}
            </h4>
            <div style={{ fontSize: "0.72rem", color: "#cbd5e1", marginTop: "2px" }}>
              Closing Time: <strong style={{ color: "#f6dd84" }}>{closingTimeLabel}</strong> • Auto Clock-Out: <strong>+2 Hours After Close</strong> • Term: <strong>{statusData?.settings?.activeTerm || "Current Term"}</strong>
            </div>
          </div>

          <div
            style={{
              padding: "5px 12px",
              borderRadius: "999px",
              fontSize: "0.78rem",
              fontWeight: 800,
              background: isClockedIn
                ? "rgba(16, 185, 129, 0.22)"
                : isBypassed
                  ? "rgba(239, 68, 68, 0.2)"
                  : "rgba(212, 175, 55, 0.16)",
              border: `1.5px solid ${isClockedIn ? "#10b981" : isBypassed ? "#f87171" : "#d4af37"}`,
              color: isClockedIn ? "#6ee7b7" : isBypassed ? "#fecaca" : "#f6dd84"
            }}
          >
            {isClockedIn && activeShift
              ? `🟢 ON DUTY (PRESENT) • Clocked in ${new Date(activeShift.clockInAt).toLocaleTimeString()}`
              : isBypassed
                ? "⚠️ Bypassed Clock-In — NOT Marked Present"
                : isAutoClockedOut
                  ? "⏱️ Auto Clocked Out (+2h After Close)"
                  : statusData?.currentStatus === "CLOCKED_OUT"
                    ? "🔵 Shift Closed (Clocked Out Today)"
                    : "⚪ Not Clocked In Yet"}
          </div>
        </div>

        {feedback && (
          <div
            style={{
              marginBottom: "10px",
              padding: "8px 12px",
              borderRadius: "8px",
              fontSize: "0.8rem",
              fontWeight: 700,
              background: feedback.isError ? "rgba(239, 68, 68, 0.18)" : "rgba(16, 185, 129, 0.18)",
              border: `1px solid ${feedback.isError ? "#ef4444" : "#10b981"}`,
              color: feedback.isError ? "#fecaca" : "#a7f3d0"
            }}
          >
            {feedback.text}
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: isClinicDesk ? "repeat(auto-fit, minmax(180px, 1fr))" : isClockedIn ? "1fr 1fr auto" : "1fr auto", gap: "10px", alignItems: "center" }}>
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
            placeholder={isClockedIn ? "Departure summary note (optional)..." : "Duty location / arrival note (optional)..."}
            value={shiftNote}
            onChange={(e) => setShiftNote(e.target.value)}
            style={{ background: "#050f23", color: "#f8fafc", border: "1px solid rgba(212,175,55,0.45)", borderRadius: "8px", padding: "8px 12px", fontSize: "0.82rem" }}
          />

          {isClockedIn && (
            <input
              type="text"
              data-testid="clockout-reason-input"
              placeholder={
                statusData?.isBeforeClosingTime
                  ? `Clock-Out Reason REQUIRED before ${closingTimeLabel}...`
                  : "Reason for clocking out (or end of school closing)..."
              }
              value={clockOutReason}
              onChange={(e) => setClockOutReason(e.target.value)}
              style={{
                background: "#050f23",
                color: "#f8fafc",
                border: statusData?.isBeforeClosingTime ? "1.5px solid #f59e0b" : "1px solid rgba(212,175,55,0.45)",
                borderRadius: "8px",
                padding: "8px 12px",
                fontSize: "0.82rem"
              }}
            />
          )}

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
            Latest Log: <strong style={{ color: "#f6dd84" }}>{statusData.recentLogs[0].staffName}</strong> ({statusData.recentLogs[0].designation}) •{" "}
            {statusData.recentLogs[0].clockInAt
              ? `In: ${new Date(statusData.recentLogs[0].clockInAt).toLocaleTimeString()}`
              : "Bypassed (Not Marked Present)"}
            {statusData.recentLogs[0].clockOutAt && ` • Out: ${new Date(statusData.recentLogs[0].clockOutAt).toLocaleTimeString()} (${statusData.recentLogs[0].hoursWorkedLabel})`}
            {statusData.recentLogs[0].clockOutReason && ` • Reason: ${statusData.recentLogs[0].clockOutReason}`}
            {" "}• Synced to Headmaster Attendance Register
          </div>
        )}
      </div>
    </>
  );
}
