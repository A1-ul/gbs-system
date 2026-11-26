import React, { useState, useEffect, useCallback } from "react";
import apiClient from "../../api/client/apiClient";

const CATEGORY_LABELS = {
  MISSED_EXAM: { label: "Could Not / Did Not Write Exam", color: "#fca5a5", bg: "rgba(239, 68, 68, 0.16)", border: "rgba(239, 68, 68, 0.45)" },
  UNSUBMITTED_ASSIGNMENT: { label: "Unsubmitted Assignment", color: "#fde68a", bg: "rgba(245, 158, 11, 0.16)", border: "rgba(245, 158, 11, 0.45)" },
  NOT_ATTENDING_SCHOOL: { label: "Not Coming to School (Absent)", color: "#fdba74", bg: "rgba(249, 115, 22, 0.16)", border: "rgba(249, 115, 22, 0.45)" }
};

/**
 * Real-Time Student Compliance & Defaulters Monitor
 * - Lists exact student counts & rosters for:
 *   1) Students who did not / could not write scheduled exams
 *   2) Students who did not submit assignments
 *   3) Students who have not been coming to school (absent)
 * - Alerts the Headmaster to dispatch the defaulters list (with Student & Parent mobile contacts)
 *   to the School Secretary to call and verify reasons, and displays Secretary feedback reports live!
 */
export default function StudentDefaultersCompliancePanel({ onFeedback = null, mode = "", currentUser = null }) {
  const [report, setReport] = useState(null);
  const [followupsData, setFollowupsData] = useState({ totalDispatched: 0, pendingSecretaryCallCount: 0, reportedBackCount: 0, followups: [] });
  const [loading, setLoading] = useState(true);
  const [dispatching, setDispatching] = useState(false);
  const [activeBucket, setActiveBucket] = useState("exams"); // exams | assignments | attendance | followups
  const [headmasterNote, setHeadmasterNote] = useState(
    "Please call the student or parent/guardian on their mobile contact to verify the reason and submit your checkup report back to the Headmaster."
  );
  const [panelFeedback, setPanelFeedback] = useState(null);

  const resolvedRole = String(
    mode ||
    currentUser?.role ||
    (() => {
      try { return JSON.parse(localStorage.getItem("gbs_user") || "{}")?.role || ""; } catch { return ""; }
    })()
  ).toUpperCase();
  const isHeadmaster = ["HEADMASTER", "ADMIN", "SUPER_ADMIN", "PRINCIPAL", "DEVELOPER"].includes(resolvedRole);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [repRes, fupRes] = await Promise.all([
        apiClient.get("/academic/defaulters-report").catch(() => null),
        apiClient.get("/academic/defaulters-followups").catch(() => null)
      ]);
      if (repRes?.data?.data) {
        setReport(repRes.data.data);
      }
      if (fupRes?.data?.data) {
        setFollowupsData(fupRes.data.data);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const examList = report?.didNotTakeExam?.students || [];
  const assignList = report?.didNotSubmitAssignment?.students || [];
  const absentList = report?.notAttendingSchool?.students || [];
  const totalDefaulterEntries = examList.length + assignList.length + absentList.length;

  const currentList =
    activeBucket === "exams"
      ? examList
      : activeBucket === "assignments"
        ? assignList
        : absentList;

  const currentCategoryCode =
    activeBucket === "exams"
      ? "MISSED_EXAM"
      : activeBucket === "assignments"
        ? "UNSUBMITTED_ASSIGNMENT"
        : "NOT_ATTENDING_SCHOOL";

  const dispatchItemsToSecretary = async (itemsToSend = []) => {
    if (!itemsToSend.length) {
      setPanelFeedback({ type: "error", message: "No defaulter students available to dispatch in this list." });
      return;
    }
    setDispatching(true);
    setPanelFeedback(null);
    try {
      const res = await apiClient.post("/academic/defaulters-followups", {
        headmasterNote,
        items: itemsToSend
      });
      const msg = res?.data?.message || `Sent ${itemsToSend.length} defaulter(s) to School Secretary for parent/student phone checkup!`;
      setPanelFeedback({ type: "success", message: msg });
      if (typeof onFeedback === "function") onFeedback(msg);
      await fetchAll();
      setActiveBucket("followups");
    } catch (err) {
      const errMsg = err?.response?.data?.message || "Could not dispatch defaulters list to Secretary.";
      setPanelFeedback({ type: "error", message: errMsg });
    } finally {
      setDispatching(false);
    }
  };

  const handleDispatchAllDefaulters = () => {
    const combined = [
      ...examList.map((st) => ({
        studentId: st.studentId,
        studentName: st.studentName,
        studentEmail: st.email,
        studentPhone: st.phone,
        parentName: st.parentName,
        parentPhone: st.parentPhone,
        classOrLevel: st.classOrLevel,
        category: "MISSED_EXAM",
        issueDetail: st.missedExamTitle || "Did not / could not write scheduled examination"
      })),
      ...assignList.map((st) => ({
        studentId: st.studentId,
        studentName: st.studentName,
        studentEmail: st.email,
        studentPhone: st.phone,
        parentName: st.parentName,
        parentPhone: st.parentPhone,
        classOrLevel: st.classOrLevel,
        category: "UNSUBMITTED_ASSIGNMENT",
        issueDetail: st.missingAssignmentTitle || "Did not submit assigned homework"
      })),
      ...absentList.map((st) => ({
        studentId: st.studentId,
        studentName: st.studentName,
        studentEmail: st.email,
        studentPhone: st.phone,
        parentName: st.parentName,
        parentPhone: st.parentPhone,
        classOrLevel: st.classOrLevel,
        category: "NOT_ATTENDING_SCHOOL",
        issueDetail: st.absentDays ? `${st.absentDays} absent day(s) recorded` : "Has not been coming to school"
      }))
    ];
    dispatchItemsToSecretary(combined);
  };

  return (
    <div className="role-workspace-card" data-testid="student-defaulters-compliance-panel">
      <div className="workspace-title-row" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
        <div>
          <h2><span>📋</span> STUDENT COMPLIANCE, DEFAULTERS &amp; SECRETARY PHONE CHECKUP LOOP</h2>
          <p>
            Live database roster of students who did not write scheduled exams, failed to submit assignments, or have not been coming to school — with direct Headmaster-to-Secretary parent/student mobile call follow-up &amp; feedback reporting.
          </p>
        </div>
        <button
          type="button"
          onClick={fetchAll}
          disabled={loading}
          style={{
            background: "linear-gradient(135deg, #0284c7, #0369a1)",
            color: "#ffffff",
            border: "1px solid #38bdf8",
            borderRadius: "8px",
            padding: "8px 14px",
            fontWeight: 800,
            cursor: "pointer"
          }}
        >
          {loading ? "Refreshing..." : "🔄 Refresh Live Roster"}
        </button>
      </div>

      {/* Headmaster Action Alert Banner to Dispatch List to Secretary */}
      {isHeadmaster && (totalDefaulterEntries > 0 || followupsData.reportedBackCount > 0) && (
        <div
          data-testid="headmaster-defaulters-secretary-alert"
          style={{
            marginTop: "12px",
            marginBottom: "14px",
            padding: "14px 16px",
            borderRadius: "12px",
            background: "linear-gradient(135deg, rgba(180, 83, 9, 0.28), rgba(15, 23, 42, 0.92))",
            border: "2px solid #f59e0b",
            display: "flex",
            flexDirection: "column",
            gap: "10px"
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
            <div>
              <strong style={{ color: "#fde68a", fontSize: "0.95rem", display: "block" }}>
                🔔 HEADMASTER ACTION ALERT: {totalDefaulterEntries} Defaulter Record(s) Detected • {followupsData.reportedBackCount} Secretary Checkup Report(s) Ready
              </strong>
              <span style={{ fontSize: "0.82rem", color: "#e2e8f0" }}>
                Send this list to the School Secretary so she can call the students or their parents via mobile phone, verify the exact reason, and submit feedback directly back to you.
              </span>
            </div>
            {totalDefaulterEntries > 0 && (
              <button
                type="button"
                data-testid="dispatch-all-defaulters-to-secretary-btn"
                disabled={dispatching}
                onClick={handleDispatchAllDefaulters}
                style={{
                  background: "linear-gradient(135deg, #d97706, #f59e0b)",
                  color: "#0f172a",
                  border: "1.5px solid #fef08a",
                  borderRadius: "10px",
                  padding: "10px 16px",
                  fontWeight: 900,
                  cursor: dispatching ? "wait" : "pointer",
                  fontSize: "0.84rem"
                }}
              >
                {dispatching ? "Sending to Secretary..." : `📤 Send All Defaulters (${totalDefaulterEntries}) to Secretary`}
              </button>
            )}
          </div>
          <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
            <label style={{ fontSize: "0.76rem", fontWeight: 800, color: "#fde68a" }}>Directive Note to Secretary:</label>
            <input
              type="text"
              value={headmasterNote}
              onChange={(e) => setHeadmasterNote(e.target.value)}
              style={{
                flex: 1,
                minWidth: "260px",
                background: "rgba(2, 6, 23, 0.78)",
                color: "#f8fafc",
                border: "1px solid rgba(251, 191, 36, 0.45)",
                borderRadius: "8px",
                padding: "7px 10px",
                fontSize: "0.8rem"
              }}
            />
          </div>
        </div>
      )}

      {panelFeedback && (
        <div
          style={{
            marginBottom: "12px",
            padding: "10px 14px",
            borderRadius: "9px",
            background: panelFeedback.type === "error" ? "rgba(239,68,68,0.16)" : "rgba(16,185,129,0.16)",
            border: `1px solid ${panelFeedback.type === "error" ? "#ef4444" : "#10b981"}`,
            color: panelFeedback.type === "error" ? "#fecaca" : "#6ee7b7",
            fontWeight: 700,
            fontSize: "0.84rem"
          }}
        >
          {panelFeedback.message}
        </div>
      )}

      {/* KPI Counter Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: "12px", marginBottom: "1.25rem", marginTop: "0.5rem" }}>
        <button
          type="button"
          onClick={() => setActiveBucket("exams")}
          style={{
            textAlign: "left",
            padding: "14px 16px",
            borderRadius: "12px",
            background: activeBucket === "exams" ? "rgba(239, 68, 68, 0.22)" : "rgba(15, 23, 42, 0.85)",
            border: activeBucket === "exams" ? "2px solid #ef4444" : "1px solid rgba(239, 68, 68, 0.4)",
            color: "#ffffff",
            cursor: "pointer"
          }}
        >
          <div style={{ fontSize: "0.74rem", fontWeight: 800, color: "#fca5a5", textTransform: "uppercase" }}>📝 Did Not Write Exams</div>
          <div style={{ fontSize: "1.8rem", fontWeight: 900, marginTop: "4px" }}>{examList.length}</div>
          <div style={{ fontSize: "0.72rem", color: "#cbd5e1" }}>Students missed scheduled assessments</div>
        </button>

        <button
          type="button"
          onClick={() => setActiveBucket("assignments")}
          style={{
            textAlign: "left",
            padding: "14px 16px",
            borderRadius: "12px",
            background: activeBucket === "assignments" ? "rgba(245, 158, 11, 0.22)" : "rgba(15, 23, 42, 0.85)",
            border: activeBucket === "assignments" ? "2px solid #f59e0b" : "1px solid rgba(245, 158, 11, 0.4)",
            color: "#ffffff",
            cursor: "pointer"
          }}
        >
          <div style={{ fontSize: "0.74rem", fontWeight: 800, color: "#fde68a", textTransform: "uppercase" }}>📚 Unsubmitted Assignments</div>
          <div style={{ fontSize: "1.8rem", fontWeight: 900, marginTop: "4px" }}>{assignList.length}</div>
          <div style={{ fontSize: "0.72rem", color: "#cbd5e1" }}>Students who did not submit homework</div>
        </button>

        <button
          type="button"
          onClick={() => setActiveBucket("attendance")}
          style={{
            textAlign: "left",
            padding: "14px 16px",
            borderRadius: "12px",
            background: activeBucket === "attendance" ? "rgba(249, 115, 22, 0.22)" : "rgba(15, 23, 42, 0.85)",
            border: activeBucket === "attendance" ? "2px solid #f97316" : "1px solid rgba(249, 115, 22, 0.4)",
            color: "#ffffff",
            cursor: "pointer"
          }}
        >
          <div style={{ fontSize: "0.74rem", fontWeight: 800, color: "#fdba74", textTransform: "uppercase" }}>🚨 Not Coming to School</div>
          <div style={{ fontSize: "1.8rem", fontWeight: 900, marginTop: "4px" }}>{absentList.length}</div>
          <div style={{ fontSize: "0.72rem", color: "#cbd5e1" }}>Students with persistent absences</div>
        </button>

        <button
          type="button"
          data-testid="defaulters-secretary-feedback-tab"
          onClick={() => setActiveBucket("followups")}
          style={{
            textAlign: "left",
            padding: "14px 16px",
            borderRadius: "12px",
            background: activeBucket === "followups" ? "rgba(16, 185, 129, 0.22)" : "rgba(15, 23, 42, 0.85)",
            border: activeBucket === "followups" ? "2px solid #10b981" : "1px solid rgba(16, 185, 129, 0.4)",
            color: "#ffffff",
            cursor: "pointer"
          }}
        >
          <div style={{ fontSize: "0.74rem", fontWeight: 800, color: "#6ee7b7", textTransform: "uppercase" }}>📞 Secretary Checkup Feedback</div>
          <div style={{ fontSize: "1.8rem", fontWeight: 900, marginTop: "4px" }}>
            {followupsData.reportedBackCount} / {followupsData.totalDispatched}
          </div>
          <div style={{ fontSize: "0.72rem", color: "#cbd5e1" }}>
            {followupsData.pendingSecretaryCallCount} awaiting call • {followupsData.reportedBackCount} verified reports
          </div>
        </button>
      </div>

      {/* VIEW 1: SECRETARY CHECKUP FEEDBACK REPORTS TABLE */}
      {activeBucket === "followups" ? (
        <div data-testid="headmaster-secretary-feedback-table" className="role-table-responsive" style={{ overflowX: "auto" }}>
          <table className="role-table">
            <thead>
              <tr>
                <th>Student &amp; Class</th>
                <th>Category &amp; Issue</th>
                <th>Mobile Contacts</th>
                <th>Secretary Call Status</th>
                <th>Verified Reason Reported to Headmaster</th>
              </tr>
            </thead>
            <tbody>
              {(followupsData.followups || []).length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ textAlign: "center", padding: "24px", color: "#94a3b8" }}>
                    No defaulters have been dispatched to the School Secretary yet. Select a category above and click "Send to Secretary" to initiate parent/student phone checkups.
                  </td>
                </tr>
              ) : (
                followupsData.followups.map((item) => {
                  const cat = CATEGORY_LABELS[item.category] || CATEGORY_LABELS.NOT_ATTENDING_SCHOOL;
                  const rep = item.secretaryReport;
                  return (
                    <tr key={item.id}>
                      <td>
                        <strong style={{ color: "#ffffff", display: "block" }}>{item.studentName}</strong>
                        <span style={{ fontSize: "0.76rem", color: "#94a3b8" }}>{item.classOrLevel}</span>
                      </td>
                      <td>
                        <span style={{ display: "inline-block", padding: "3px 8px", borderRadius: "999px", background: cat.bg, border: `1px solid ${cat.border}`, color: cat.color, fontSize: "0.72rem", fontWeight: 800 }}>
                          {cat.label}
                        </span>
                        <div style={{ fontSize: "0.76rem", color: "#cbd5e1", marginTop: "3px" }}>{item.issueDetail}</div>
                      </td>
                      <td style={{ fontSize: "0.78rem" }}>
                        <div>Student: <strong style={{ color: "#38bdf8" }}>{item.studentPhone || "—"}</strong></div>
                        <div>Parent ({item.parentName || "Guardian"}): <strong style={{ color: "#fde68a" }}>{item.parentPhone || "—"}</strong></div>
                      </td>
                      <td>
                        {item.status === "REPORTED_TO_HEADMASTER" ? (
                          <span style={{ padding: "4px 10px", borderRadius: "999px", background: "rgba(16,185,129,0.2)", border: "1px solid #10b981", color: "#6ee7b7", fontSize: "0.72rem", fontWeight: 800 }}>
                            ✓ Reported by Secretary
                          </span>
                        ) : (
                          <span style={{ padding: "4px 10px", borderRadius: "999px", background: "rgba(245,158,11,0.2)", border: "1px solid #f59e0b", color: "#fde68a", fontSize: "0.72rem", fontWeight: 800 }}>
                            ⏳ Pending Secretary Call
                          </span>
                        )}
                      </td>
                      <td style={{ fontSize: "0.8rem" }}>
                        {rep ? (
                          <div>
                            <strong style={{ color: "#6ee7b7", display: "block" }}>
                              Called {rep.contactCalled} ({rep.phoneDialed}) • {rep.callOutcome.replace(/_/g, " ")}
                            </strong>
                            <div style={{ color: "#ffffff", marginTop: "3px" }}>{rep.verifiedReason}</div>
                            {rep.expectedReturnDate && (
                              <div style={{ color: "#7dd3fc", fontSize: "0.74rem", marginTop: "2px" }}>Expected Return: {rep.expectedReturnDate}</div>
                            )}
                            <div style={{ color: "#94a3b8", fontSize: "0.72rem", marginTop: "2px" }}>
                              Reported by {rep.reportedByName} • {new Date(rep.reportedAt).toLocaleString()}
                            </div>
                          </div>
                        ) : (
                          <span style={{ color: "#94a3b8" }}>Dispatched to Secretary at {new Date(item.dispatchedAt).toLocaleString()}</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      ) : (
        /* VIEW 2: ACTIVE DEFAULTER CATEGORY ROSTER TABLE */
        <div className="role-table-responsive" style={{ overflowX: "auto" }}>
          <table className="role-table">
            <thead>
              <tr>
                <th>Student Name</th>
                <th>Class / Level</th>
                <th>Student &amp; Parent Mobile Contacts</th>
                <th>
                  {activeBucket === "exams"
                    ? "Missed Examination"
                    : activeBucket === "assignments"
                      ? "Missing Assignment"
                      : "Absence Count & Last Seen"}
                </th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {currentList.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ textAlign: "center", padding: "24px", color: "#34d399", fontWeight: 700 }}>
                    ✅ Excellent compliance — zero students currently flagged in this category!
                  </td>
                </tr>
              ) : (
                currentList.map((st, idx) => (
                  <tr key={`${st.studentId || st.email || idx}`}>
                    <td>
                      <strong style={{ color: "#ffffff" }}>{st.studentName}</strong>
                      {st.email && <div style={{ fontSize: "0.72rem", color: "#94a3b8" }}>{st.email}</div>}
                    </td>
                    <td>{st.classOrLevel || "Assigned Class"}</td>
                    <td style={{ fontSize: "0.78rem" }}>
                      <div>📱 Student: <strong style={{ color: "#38bdf8" }}>{st.phone || "Not listed"}</strong></div>
                      <div>👨‍👩‍👧 Parent ({st.parentName || "Guardian"}): <strong style={{ color: "#fde68a" }}>{st.parentPhone || "Not listed"}</strong></div>
                    </td>
                    <td>
                      {activeBucket === "exams" && (st.missedExamTitle || "Scheduled Examination")}
                      {activeBucket === "assignments" && (st.missingAssignmentTitle || "Coursework Assignment")}
                      {activeBucket === "attendance" && `${st.absentDays || 1} absent day(s)${st.lastSeenDate ? ` • Last seen ${new Date(st.lastSeenDate).toLocaleDateString()}` : ""}`}
                    </td>
                    <td>
                      {isHeadmaster ? (
                        <button
                          type="button"
                          disabled={dispatching}
                          onClick={() =>
                            dispatchItemsToSecretary([
                              {
                                studentId: st.studentId,
                                studentName: st.studentName,
                                studentEmail: st.email,
                                studentPhone: st.phone,
                                parentName: st.parentName,
                                parentPhone: st.parentPhone,
                                classOrLevel: st.classOrLevel,
                                category: currentCategoryCode,
                                issueDetail:
                                  st.missedExamTitle ||
                                  st.missingAssignmentTitle ||
                                  (st.absentDays ? `${st.absentDays} absent day(s)` : "Compliance follow-up needed")
                              }
                            ])
                          }
                          style={{
                            background: "linear-gradient(135deg, #d97706, #f59e0b)",
                            color: "#0f172a",
                            border: "1px solid #fde68a",
                            borderRadius: "7px",
                            padding: "6px 10px",
                            fontWeight: 800,
                            fontSize: "0.75rem",
                            cursor: "pointer"
                          }}
                        >
                          📤 Send to Secretary
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            if (typeof onFeedback === "function") {
                              onFeedback(`Compliance follow-up alert prepared for ${st.studentName}.`);
                            }
                          }}
                          style={{
                            background: "rgba(245, 158, 11, 0.2)",
                            color: "#fde68a",
                            border: "1px solid #f59e0b",
                            borderRadius: "6px",
                            padding: "5px 10px",
                            fontWeight: 700,
                            fontSize: "0.76rem",
                            cursor: "pointer"
                          }}
                        >
                          Alert Headmaster
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
