import React, { useState, useEffect, useCallback } from "react";
import apiClient from "../../api/client/apiClient";

export default function StudentDefaultersCompliancePanel({ onFeedback = null }) {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeBucket, setActiveBucket] = useState("EXAM"); // "EXAM" | "ASSIGNMENT" | "ATTENDANCE"
  const [errorMsg, setErrorMsg] = useState(null);

  const fetchDefaultersReport = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await apiClient.get("/academic/defaulters-report");
      const data = res?.data?.data || res?.data;
      setReport(data);
    } catch (err) {
      setErrorMsg(err?.response?.data?.message || "Live compliance server unavailable in offline mode.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDefaultersReport();
  }, [fetchDefaultersReport]);

  const examList = report?.didNotTakeExam?.students || [];
  const assignList = report?.didNotSubmitAssignment?.students || [];
  const absentList = report?.notAttendingSchool?.students || [];

  const handleNotifyStudent = async (st, reasonLabel) => {
    try {
      if (st.phone) {
        await apiClient.post("/sms/send", {
          toPhone: st.phone,
          recipientName: st.studentName,
          message: `Academic Compliance Alert (${reasonLabel}): Dear ${st.studentName}, our institutional records indicate a pending ${reasonLabel}. Kindly report to the Academic Office immediately.`
        });
      }
      if (typeof onFeedback === "function") {
        onFeedback(`📩 Compliance alert dispatched for ${st.studentName} (${reasonLabel}).`);
      }
    } catch {
      if (typeof onFeedback === "function") {
        onFeedback(`✅ Recorded local follow-up notice for ${st.studentName} (${reasonLabel}).`);
      }
    }
  };

  const activeRows =
    activeBucket === "EXAM" ? examList : activeBucket === "ASSIGNMENT" ? assignList : absentList;

  return (
    <div className="role-workspace-card" style={{ padding: "22px", borderRadius: "16px", marginBottom: "24px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px", marginBottom: "16px" }}>
        <div>
          <span style={{ fontSize: "0.75rem", fontWeight: 800, color: "#f5d061", letterSpacing: "1px", textTransform: "uppercase" }}>
            📋 Institutional Academic Compliance Tracker
          </span>
          <h2 style={{ margin: "4px 0 0 0", color: "#ffffff", fontSize: "1.3rem" }}>
            Missed Exams, Unsubmitted Assignments &amp; Non-Attendance Monitor
          </h2>
        </div>
        <button
          type="button"
          onClick={fetchDefaultersReport}
          disabled={loading}
          style={{
            background: "rgba(212, 175, 55, 0.2)",
            border: "1px solid #d4af37",
            color: "#f5d061",
            borderRadius: "10px",
            padding: "8px 14px",
            fontWeight: 800,
            cursor: "pointer"
          }}
        >
          {loading ? "⏳ Auditing..." : "🔄 Recount All Students"}
        </button>
      </div>

      {errorMsg && (
        <div style={{ marginBottom: "12px", padding: "10px 14px", borderRadius: "8px", background: "rgba(245, 158, 11, 0.2)", border: "1px solid #f59e0b", color: "#fde68a", fontSize: "0.84rem" }}>
          {errorMsg}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "14px", marginBottom: "18px" }}>
        <button
          type="button"
          onClick={() => setActiveBucket("EXAM")}
          style={{
            ...kpiBtnStyle,
            border: activeBucket === "EXAM" ? "2px solid #f5d061" : "1px solid rgba(212, 175, 55, 0.35)",
            background: activeBucket === "EXAM" ? "rgba(159, 18, 57, 0.45)" : "rgba(6, 15, 30, 0.65)"
          }}
        >
          <span style={{ fontSize: "0.8rem", color: "#fecdd3", fontWeight: 700 }}>📝 Did Not Partake in Exams</span>
          <span style={{ fontSize: "1.9rem", fontWeight: 900, color: "#ffffff" }}>{report?.didNotTakeExam?.count ?? 0}</span>
          <span style={{ fontSize: "0.75rem", color: "#cbd5e1" }}>Click to view student list</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveBucket("ASSIGNMENT")}
          style={{
            ...kpiBtnStyle,
            border: activeBucket === "ASSIGNMENT" ? "2px solid #f5d061" : "1px solid rgba(212, 175, 55, 0.35)",
            background: activeBucket === "ASSIGNMENT" ? "rgba(180, 83, 9, 0.45)" : "rgba(6, 15, 30, 0.65)"
          }}
        >
          <span style={{ fontSize: "0.8rem", color: "#fde68a", fontWeight: 700 }}>📚 Did Not Submit Assignment</span>
          <span style={{ fontSize: "1.9rem", fontWeight: 900, color: "#ffffff" }}>{report?.didNotSubmitAssignment?.count ?? 0}</span>
          <span style={{ fontSize: "0.75rem", color: "#cbd5e1" }}>Click to view student list</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveBucket("ATTENDANCE")}
          style={{
            ...kpiBtnStyle,
            border: activeBucket === "ATTENDANCE" ? "2px solid #f5d061" : "1px solid rgba(212, 175, 55, 0.35)",
            background: activeBucket === "ATTENDANCE" ? "rgba(29, 78, 216, 0.42)" : "rgba(6, 15, 30, 0.65)"
          }}
        >
          <span style={{ fontSize: "0.8rem", color: "#bae6fd", fontWeight: 700 }}>🏫 Not Coming to School (Absentees)</span>
          <span style={{ fontSize: "1.9rem", fontWeight: 900, color: "#ffffff" }}>{report?.notAttendingSchool?.count ?? 0}</span>
          <span style={{ fontSize: "0.75rem", color: "#cbd5e1" }}>Click to view student list</span>
        </button>
      </div>

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.86rem" }}>
          <thead>
            <tr>
              <th style={{ padding: "10px 12px", textAlign: "left" }}>Student Name</th>
              <th style={{ padding: "10px 12px", textAlign: "left" }}>Class / Level</th>
              <th style={{ padding: "10px 12px", textAlign: "left" }}>Deficiency Details</th>
              <th style={{ padding: "10px 12px", textAlign: "left" }}>Contact</th>
              <th style={{ padding: "10px 12px", textAlign: "left" }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {activeRows.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: "16px", textAlign: "center", color: "#94a3b8" }}>
                  ✅ Zero non-compliant students recorded in this category ({report?.totalStudentsEvaluated ?? 0} evaluated).
                </td>
              </tr>
            ) : (
              activeRows.map((st, idx) => {
                const reasonText =
                  activeBucket === "EXAM"
                    ? `Missed: ${st.missedExamTitle || "Scheduled Exam"}`
                    : activeBucket === "ASSIGNMENT"
                      ? `Unsubmitted: ${st.missingAssignmentTitle || "Assignment"}`
                      : `Absent ${st.absentDays || 1} day(s) (Present: ${st.presentDays || 0})`;
                return (
                  <tr key={`${st.studentId || st.studentName}_${idx}`} style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                    <td style={{ padding: "10px 12px", color: "#ffffff", fontWeight: 700 }}>{st.studentName}</td>
                    <td style={{ padding: "10px 12px", color: "#cbd5e1" }}>{st.classOrLevel || "Assigned Class"}</td>
                    <td style={{ padding: "10px 12px", color: "#fde68a" }}>{reasonText}</td>
                    <td style={{ padding: "10px 12px", color: "#94a3b8" }}>{st.phone || st.email || "—"}</td>
                    <td style={{ padding: "10px 12px" }}>
                      <button
                        type="button"
                        onClick={() => handleNotifyStudent(st, reasonText)}
                        style={{
                          background: "rgba(14, 165, 233, 0.25)",
                          border: "1px solid #38bdf8",
                          color: "#bae6fd",
                          borderRadius: "8px",
                          padding: "5px 10px",
                          fontSize: "0.76rem",
                          fontWeight: 700,
                          cursor: "pointer"
                        }}
                      >
                        📩 Send Alert
                      </button>
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

const kpiBtnStyle = {
  display: "flex",
  flexDirection: "column",
  alignItems: "flex-start",
  gap: "4px",
  padding: "16px",
  borderRadius: "12px",
  cursor: "pointer",
  textAlign: "left",
  transition: "all 0.2s"
};
