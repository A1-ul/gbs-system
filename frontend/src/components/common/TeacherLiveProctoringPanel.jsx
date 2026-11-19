import React, { useState, useEffect, useCallback } from "react";
import apiClient from "../../api/client/apiClient";
import { printHtmlSafely } from "../../utils/safeWindow";
import { getActiveSchoolName } from "../../utils/schoolBranding";

/**
 * TeacherLiveProctoringPanel
 * Real-time AI Exam Proctoring Wall for Teachers:
 * - Displays active/recent student examination camera snapshots, live movement deltas, warnings & lost marks deducted
 * - Lets teachers send instructions or official warnings by student name search, selected camera checkboxes, ALL students, or single camera click
 * - Saves timestamped camera snapshots & violation logs as permanent Reference Evidence for academic integrity audits
 */
export default function TeacherLiveProctoringPanel({
  exams = [],
  roster = [],
  selectedExamId = "",
  onNotice = null
}) {
  const [liveSessions, setLiveSessions] = useState([]);
  const [evidenceList, setEvidenceList] = useState([]);
  const [sentMessagesLog, setSentMessagesLog] = useState([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);
  const [searchStudentQuery, setSearchStudentQuery] = useState("");
  const [targetMode, setTargetMode] = useState("SEARCH"); // 'SEARCH' | 'SELECTED' | 'ALL'
  const [messageText, setMessageText] = useState("");
  const [messageSeverity, setMessageSeverity] = useState("INFO"); // 'INFO' | 'WARNING'
  const [deductMarksInput, setDeductMarksInput] = useState(0);
  const [sendingMsg, setSendingMsg] = useState(false);
  const [savingEvidenceFor, setSavingEvidenceFor] = useState(null);
  const [evidenceSearch, setEvidenceSearch] = useState("");
  const [inspectEvidenceModal, setInspectEvidenceModal] = useState(null);
  const [subView, setSubView] = useState("CAMERAS"); // 'CAMERAS' | 'EVIDENCE' | 'SENT_MESSAGES'
  const [statusFeedback, setStatusFeedback] = useState(null);

  const notify = (msg, type = "success") => {
    setStatusFeedback({ message: msg, type });
    if (typeof onNotice === "function") onNotice({ type, message: msg });
    if (typeof window !== "undefined" && typeof window.showGBSOpenNotice === "function") {
      window.showGBSOpenNotice(msg, type, "LIVE EXAM PROCTORING DESK");
    }
  };

  const fetchProctoringData = useCallback(async () => {
    try {
      const [liveRes, evRes, msgRes] = await Promise.all([
        apiClient.get("/ai-exam/proctor/live", { params: selectedExamId ? { examId: selectedExamId } : {} }).catch(() => null),
        apiClient.get("/ai-exam/proctor/evidence").catch(() => null),
        apiClient.get("/ai-exam/proctor/messages", { params: { view: "TEACHER" } }).catch(() => null)
      ]);
      if (liveRes?.data?.data?.sessions) {
        setLiveSessions(liveRes.data.data.sessions);
      }
      if (evRes?.data?.data?.evidenceList) {
        setEvidenceList(evRes.data.data.evidenceList);
      }
      if (msgRes?.data?.data?.messages) {
        setSentMessagesLog(msgRes.data.data.messages);
      }
    } catch { }
  }, [selectedExamId]);

  useEffect(() => {
    fetchProctoringData();
    const timer = setInterval(fetchProctoringData, 3200);
    return () => clearInterval(timer);
  }, [fetchProctoringData]);

  // Combined search suggestions across live cameras + class roster
  const searchCandidateMatches = (() => {
    const q = searchStudentQuery.trim().toLowerCase();
    if (!q) return [];
    const seen = new Set();
    const hits = [];
    liveSessions.forEach((s) => {
      const hay = `${s.studentName || ""} ${s.studentEmail || ""} ${s.studentId || ""}`.toLowerCase();
      if (hay.includes(q)) {
        const key = String(s.studentId || s.studentName);
        if (!seen.has(key)) {
          seen.add(key);
          hits.push({ studentId: String(s.studentId), name: s.studentName, email: s.studentEmail || "", onCamera: true });
        }
      }
    });
    (roster || []).forEach((r) => {
      const fullName = `${r.firstName || ""} ${r.lastName || ""}`.trim();
      const hay = `${fullName} ${r.email || ""} ${r.id || ""}`.toLowerCase();
      if (hay.includes(q)) {
        const key = String(r.id || fullName);
        if (!seen.has(key)) {
          seen.add(key);
          hits.push({ studentId: String(r.id), name: fullName || r.email, email: r.email || "", onCamera: false });
        }
      }
    });
    return hits.slice(0, 8);
  })();

  const toggleSelectCamera = (studentId) => {
    const sid = String(studentId);
    setSelectedStudentIds((prev) =>
      prev.includes(sid) ? prev.filter((id) => id !== sid) : [...prev, sid]
    );
  };

  const handleSelectAllCameras = () => {
    if (selectedStudentIds.length === liveSessions.length && liveSessions.length > 0) {
      setSelectedStudentIds([]);
    } else {
      setSelectedStudentIds(liveSessions.map((s) => String(s.studentId)));
    }
  };

  const handleDispatchMessage = async ({
    overrideMode = null,
    overrideStudentIds = null,
    overrideQuery = null,
    overrideText = null,
    overrideSeverity = null,
    overrideDeduct = null
  } = {}) => {
    const mode = overrideMode || targetMode;
    const text = (overrideText ?? messageText).trim();
    const sev = overrideSeverity || messageSeverity;
    const deduct = Number(overrideDeduct ?? (sev === "WARNING" ? deductMarksInput : 0)) || 0;

    if (!text) {
      notify("Enter the information or warning message to send to students.", "warning");
      return;
    }
    if (mode === "SELECTED" && !(overrideStudentIds || selectedStudentIds).length) {
      notify("Select one or more student camera cards (or switch to Search Name / ALL).", "warning");
      return;
    }
    if (mode === "SEARCH" && !(overrideQuery ?? searchStudentQuery).trim()) {
      notify("Enter a student name in the search field to locate and message that student.", "warning");
      return;
    }

    setSendingMsg(true);
    try {
      const res = await apiClient.post("/ai-exam/proctor/message", {
        examId: selectedExamId || (exams[0]?.id || ""),
        targetMode: mode,
        recipientStudentIds: overrideStudentIds || selectedStudentIds,
        recipientQuery: overrideQuery ?? searchStudentQuery.trim(),
        message: text,
        severity: sev,
        deductMarks: deduct
      });
      const summary = res?.data?.data?.proctorMessage?.targetSummary || mode;
      notify(
        `✅ Message sent to ${summary}${deduct > 0 ? ` (Warning logged • -${deduct} Marks subtracted)` : ""}`,
        "success"
      );
      if (!overrideText) setMessageText("");
      await fetchProctoringData();
    } catch (err) {
      notify(err?.response?.data?.message || "Failed to send proctoring message.", "error");
    } finally {
      setSendingMsg(false);
    }
  };

  const handleSaveEvidenceSnapshot = async (session, customNote = "") => {
    setSavingEvidenceFor(String(session.studentId));
    try {
      const res = await apiClient.post("/ai-exam/proctor/save-evidence", {
        examId: session.examId,
        examTitle: session.examTitle,
        studentId: session.studentId,
        studentName: session.studentName,
        studentEmail: session.studentEmail,
        snapshotDataUrl: session.snapshotDataUrl,
        movementStatus: session.movementStatus || session.status,
        warningsCount: session.warningsCount || 0,
        penaltyMarksDeducted: session.penaltyMarksDeducted || 0,
        events: session.events || [],
        teacherNote: customNote || `Saved live camera snapshot & movement evidence for ${session.studentName} (${session.warningsCount || 0} warning(s), -${session.penaltyMarksDeducted || 0} Marks).`
      });
      if (res?.data?.data?.evidence) {
        notify(`📸 Reference evidence permanently saved for ${session.studentName}!`, "success");
        await fetchProctoringData();
      }
    } catch {
      notify("Could not save proctoring evidence right now.", "error");
    } finally {
      setSavingEvidenceFor(null);
    }
  };

  const handleDeleteEvidence = async (id) => {
    try {
      await apiClient.delete(`/ai-exam/proctor/evidence/${encodeURIComponent(id)}`);
      notify("Proctoring evidence entry removed from archive.", "info");
      await fetchProctoringData();
    } catch { }
  };

  const handlePrintEvidenceReport = (ev) => {
    const school = getActiveSchoolName() || "GBS School Management System";
    const eventsRows = (ev.events || [])
      .map((item, idx) => `<tr><td>${idx + 1}</td><td>${item.time || item.timeIso || "Recorded"}</td><td>${item.reason || "Violation"}</td></tr>`)
      .join("");
    printHtmlSafely(`
      <html>
        <head><title>Proctoring Evidence Reference - ${ev.studentName}</title>
          <style>
            body { font-family: Georgia, serif; padding: 28px; color: #081833; }
            .hdr { border-bottom: 3px solid #d4af37; padding-bottom: 12px; margin-bottom: 18px; display: flex; justify-content: space-between; align-items: center; }
            .snap { max-width: 340px; border: 2px solid #081833; border-radius: 8px; margin: 12px 0; }
            table { width: 100%; border-collapse: collapse; margin-top: 12px; }
            th, td { border: 1px solid #cbd5e1; padding: 8px; font-size: 13px; text-align: left; }
            th { background: #081833; color: #f6dd84; }
          </style>
        </head>
        <body>
          <div class="hdr">
            <div>
              <h2 style="margin:0;">${school}</h2>
              <div>OFFICIAL AI EXAMINATION PROCTORING EVIDENCE REFERENCE</div>
            </div>
            <div>Evidence ID: <strong>${ev.id}</strong></div>
          </div>
          <p><strong>Student Name:</strong> ${ev.studentName} (${ev.studentEmail || ev.studentId})</p>
          <p><strong>Examination:</strong> ${ev.examTitle}</p>
          <p><strong>Recorded Warnings:</strong> ${ev.warningsCount} &nbsp;|&nbsp; <strong>Exact Lost Marks Subtracted:</strong> -${ev.penaltyMarksDeducted} Marks</p>
          <p><strong>Teacher / Invigilator Note:</strong> ${ev.teacherNote || "Captured during live online exam."}</p>
          ${ev.snapshotDataUrl ? `<div><strong>Captured Webcam Snapshot:</strong><br/><img class="snap" src="${ev.snapshotDataUrl}" /></div>` : "<p><em>No webcam frame attached (focus/tab monitoring mode).</em></p>"}
          <table>
            <thead><tr><th>#</th><th>Timestamp</th><th>Detected Activity / Reason</th></tr></thead>
            <tbody>${eventsRows || '<tr><td colspan="3">Session snapshot archived cleanly.</td></tr>'}</tbody>
          </table>
          <p style="margin-top:20px;font-size:12px;color:#475569;">Archived By: ${ev.savedBy} at ${new Date(ev.savedAt).toLocaleString()}</p>
        </body>
      </html>
    `);
  };

  const filteredEvidence = evidenceList.filter((ev) => {
    const q = evidenceSearch.trim().toLowerCase();
    if (!q) return true;
    return `${ev.studentName || ""} ${ev.studentEmail || ""} ${ev.examTitle || ""}`.toLowerCase().includes(q);
  });

  return (
    <div style={{
      background: "linear-gradient(145deg, rgba(8, 24, 51, 0.96) 0%, rgba(13, 34, 71, 0.96) 100%)",
      border: "1.5px solid rgba(212, 175, 55, 0.65)",
      borderRadius: "14px",
      padding: "16px",
      marginBottom: "1.35rem",
      color: "#f8fafc"
    }}>
      {/* Header Row */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px", borderBottom: "1px solid rgba(212, 175, 55, 0.35)", paddingBottom: "12px", marginBottom: "14px" }}>
        <div>
          <h3 style={{ margin: 0, color: "#f6dd84", fontSize: "1.02rem", fontWeight: 900, display: "flex", alignItems: "center", gap: "8px" }}>
            <span>📹</span> LIVE AI EXAM PROCTORING CAMERAS, STUDENT MESSAGING &amp; EVIDENCE VAULT
          </h3>
          <p style={{ margin: "3px 0 0", fontSize: "0.78rem", color: "#cbd5e1" }}>
            Monitor student head movements live across displayed cameras, message students by name search, selected cameras, or ALL examinees, deduct exact lost marks, and archive timestamped evidence.
          </p>
        </div>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          {[
            { id: "CAMERAS", label: `📹 Live Cameras (${liveSessions.length})` },
            { id: "EVIDENCE", label: `🗂️ Saved Evidence Vault (${evidenceList.length})` },
            { id: "SENT_MESSAGES", label: `📨 Sent Messages (${sentMessagesLog.length})` }
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSubView(tab.id)}
              style={{
                background: subView === tab.id ? "linear-gradient(135deg, #f6dd84, #cfa028)" : "rgba(13, 34, 71, 0.85)",
                color: subView === tab.id ? "#081833" : "#f6dd84",
                border: "1.5px solid #d4af37",
                borderRadius: "8px",
                padding: "6px 12px",
                fontSize: "0.76rem",
                fontWeight: 800,
                cursor: "pointer"
              }}
            >
              {tab.label}
            </button>
          ))}
          <button
            type="button"
            onClick={fetchProctoringData}
            style={{ background: "rgba(16, 185, 129, 0.2)", border: "1px solid #10b981", color: "#6ee7b7", borderRadius: "8px", padding: "6px 12px", fontSize: "0.76rem", fontWeight: 800, cursor: "pointer" }}
          >
            🔄 Refresh Live Feed
          </button>
        </div>
      </div>

      {statusFeedback && (
        <div style={{
          marginBottom: "12px",
          padding: "10px 14px",
          borderRadius: "8px",
          background: statusFeedback.type === "error" ? "rgba(239, 68, 68, 0.2)" : statusFeedback.type === "warning" ? "rgba(245, 158, 11, 0.2)" : "rgba(16, 185, 129, 0.2)",
          border: `1.5px solid ${statusFeedback.type === "error" ? "#ef4444" : statusFeedback.type === "warning" ? "#f59e0b" : "#10b981"}`,
          color: "#f8fafc",
          fontSize: "0.82rem",
          fontWeight: 700
        }}>
          {statusFeedback.message}
        </div>
      )}

      {/* Teacher Broadcast & Student-Search Messaging Control Bar */}
      <div style={{
        background: "rgba(5, 15, 35, 0.72)",
        border: "1px solid rgba(212, 175, 55, 0.42)",
        borderRadius: "10px",
        padding: "12px 14px",
        marginBottom: "14px"
      }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "10px", marginBottom: "10px" }}>
          {/* Target Audience Mode */}
          <div>
            <label style={{ display: "block", fontSize: "0.72rem", color: "#f6dd84", fontWeight: 800, marginBottom: "4px" }}>
              🎯 TARGET RECIPIENTS
            </label>
            <select
              className="filter-select"
              style={{ width: "100%" }}
              value={targetMode}
              onChange={(e) => setTargetMode(e.target.value)}
            >
              <option value="SEARCH">🔍 Specific Student by Name Search</option>
              <option value="SELECTED">☑️ Selected Camera Feeds ({selectedStudentIds.length})</option>
              <option value="ALL">📢 ALL Students Writing Exam ({liveSessions.length} cameras)</option>
            </select>
          </div>

          {/* Search Student Name Input (always visible for quick targeting) */}
          <div style={{ position: "relative" }}>
            <label style={{ display: "block", fontSize: "0.72rem", color: "#f6dd84", fontWeight: 800, marginBottom: "4px" }}>
              🔍 ENTER STUDENT NAME TO SEARCH
            </label>
            <input
              type="text"
              className="filter-input"
              style={{ width: "100%" }}
              placeholder="Type student name (e.g. Kwesi, Abigail)..."
              value={searchStudentQuery}
              onChange={(e) => {
                setSearchStudentQuery(e.target.value);
                if (e.target.value.trim()) setTargetMode("SEARCH");
              }}
            />
            {searchCandidateMatches.length > 0 && targetMode === "SEARCH" && (
              <div style={{
                position: "absolute",
                top: "100%",
                left: 0,
                right: 0,
                zIndex: 50,
                background: "#081833",
                border: "1.5px solid #d4af37",
                borderRadius: "8px",
                marginTop: "4px",
                maxHeight: "160px",
                overflowY: "auto"
              }}>
                {searchCandidateMatches.map((cand) => (
                  <button
                    key={cand.studentId}
                    type="button"
                    onClick={() => {
                      setSearchStudentQuery(cand.name);
                      setSelectedStudentIds((prev) => (prev.includes(cand.studentId) ? prev : [...prev, cand.studentId]));
                    }}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      width: "100%",
                      padding: "7px 10px",
                      background: "transparent",
                      border: "none",
                      borderBottom: "1px solid rgba(255,255,255,0.08)",
                      color: "#f8fafc",
                      fontSize: "0.78rem",
                      cursor: "pointer",
                      textAlign: "left"
                    }}
                  >
                    <span><strong>{cand.name}</strong> {cand.email ? `(${cand.email})` : ""}</span>
                    <span style={{ color: cand.onCamera ? "#34d399" : "#94a3b8", fontSize: "0.7rem", fontWeight: 800 }}>
                      {cand.onCamera ? "📹 On Camera" : "Roster"}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Severity & Exact Marks Deduction */}
          <div style={{ display: "flex", gap: "8px" }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: "block", fontSize: "0.72rem", color: "#f6dd84", fontWeight: 800, marginBottom: "4px" }}>
                ⚡ MESSAGE TYPE
              </label>
              <select
                className="filter-select"
                style={{ width: "100%" }}
                value={messageSeverity}
                onChange={(e) => setMessageSeverity(e.target.value)}
              >
                <option value="INFO">ℹ️ Exam Information / Guidance</option>
                <option value="WARNING">⚠️ Official Proctoring Warning</option>
              </select>
            </div>
            {messageSeverity === "WARNING" && (
              <div style={{ width: "120px" }}>
                <label style={{ display: "block", fontSize: "0.72rem", color: "#fca5a5", fontWeight: 800, marginBottom: "4px" }}>
                  DEDUCT MARKS
                </label>
                <input
                  type="number"
                  min="0"
                  max="50"
                  className="filter-input"
                  style={{ width: "100%" }}
                  value={deductMarksInput}
                  onChange={(e) => setDeductMarksInput(Number(e.target.value) || 0)}
                />
              </div>
            )}
          </div>
        </div>

        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
          <input
            type="text"
            className="filter-input"
            style={{ flex: 1, minWidth: "260px" }}
            placeholder="Write exam instruction, time reminder, or direct movement warning..."
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
          />
          <button
            type="button"
            disabled={sendingMsg}
            onClick={() => handleDispatchMessage()}
            className="btn-primary"
            style={{ padding: "8px 16px", fontSize: "0.8rem" }}
          >
            {sendingMsg ? "Sending..." : targetMode === "ALL" ? "📢 Send to ALL Students" : targetMode === "SELECTED" ? `☑️ Send to Selected (${selectedStudentIds.length})` : "🔍 Send to Student"}
          </button>
          <button
            type="button"
            disabled={sendingMsg}
            onClick={() => handleDispatchMessage({ overrideMode: "ALL" })}
            style={{ background: "rgba(56, 189, 248, 0.2)", border: "1px solid #38bdf8", color: "#bae6fd", borderRadius: "8px", padding: "8px 12px", fontSize: "0.76rem", fontWeight: 800, cursor: "pointer" }}
          >
            📣 Quick Broadcast ALL
          </button>
        </div>
      </div>

      {/* SUBVIEW 1: LIVE DISPLAYED CAMERAS WALL */}
      {subView === "CAMERAS" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px", flexWrap: "wrap", gap: "8px" }}>
            <span style={{ fontSize: "0.82rem", color: "#cbd5e1", fontWeight: 700 }}>
              Active / Recent Examinee Feeds: <strong style={{ color: "#f6dd84" }}>{liveSessions.length}</strong>
              {selectedStudentIds.length > 0 && ` • Checked for messaging: ${selectedStudentIds.length}`}
            </span>
            {liveSessions.length > 0 && (
              <button
                type="button"
                onClick={handleSelectAllCameras}
                style={{ background: "rgba(212, 175, 55, 0.16)", border: "1px solid #d4af37", color: "#f6dd84", borderRadius: "6px", padding: "4px 10px", fontSize: "0.74rem", fontWeight: 700, cursor: "pointer" }}
              >
                {selectedStudentIds.length === liveSessions.length ? "☐ Deselect All Cameras" : "☑️ Select All Cameras"}
              </button>
            )}
          </div>

          {liveSessions.length === 0 ? (
            <div style={{ padding: "1.5rem", textAlign: "center", borderRadius: "10px", border: "1px dashed rgba(212, 175, 55, 0.45)", background: "rgba(5, 15, 35, 0.55)", color: "#cbd5e1", fontSize: "0.84rem" }}>
              No students are currently live in an online AI-proctored examination. As soon as students click <strong>Start Exam</strong> on their portal, their real camera feed, movement status, warnings, and score deductions appear here live.
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(290px, 1fr))", gap: "12px" }}>
              {liveSessions.map((sess) => {
                const isSelected = selectedStudentIds.includes(String(sess.studentId));
                const hasWarn = (sess.warningsCount || 0) > 0 || sess.status === "WARNING_DETECTED";
                const isSaving = savingEvidenceFor === String(sess.studentId);
                return (
                  <div
                    key={sess.sessionKey || sess.studentId}
                    style={{
                      background: "rgba(5, 15, 35, 0.88)",
                      border: isSelected ? "2px solid #f6dd84" : hasWarn ? "1.5px solid #ef4444" : "1.5px solid rgba(56, 189, 248, 0.45)",
                      borderRadius: "12px",
                      padding: "12px",
                      display: "flex",
                      flexDirection: "column",
                      gap: "8px"
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "6px" }}>
                      <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", fontWeight: 800, fontSize: "0.85rem", color: "#f8fafc" }}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectCamera(sess.studentId)}
                        />
                        <span>{sess.studentName}</span>
                      </label>
                      <span style={{
                        fontSize: "0.68rem",
                        fontWeight: 800,
                        padding: "2px 7px",
                        borderRadius: "999px",
                        background: hasWarn ? "rgba(239, 68, 68, 0.25)" : "rgba(16, 185, 129, 0.22)",
                        color: hasWarn ? "#fca5a5" : "#6ee7b7",
                        border: `1px solid ${hasWarn ? "#ef4444" : "#10b981"}`
                      }}>
                        {sess.status === "SUBMITTED" ? "✅ SUBMITTED" : hasWarn ? `⚠️ ${sess.warningsCount} WARN` : "📹 LIVE"}
                      </span>
                    </div>

                    {/* Real Webcam Frame Snapshot or Focus Guard Status */}
                    <div style={{ position: "relative", width: "100%", height: "140px", borderRadius: "8px", overflow: "hidden", background: "#020617", border: "1px solid rgba(255,255,255,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {sess.snapshotDataUrl ? (
                        <img
                          src={sess.snapshotDataUrl}
                          alt={`Live camera feed - ${sess.studentName}`}
                          style={{ width: "100%", height: "100%", objectFit: "cover" }}
                        />
                      ) : (
                        <div style={{ textAlign: "center", padding: "10px", color: "#94a3b8", fontSize: "0.75rem" }}>
                          <div style={{ fontSize: "1.6rem", marginBottom: "4px" }}>🛡️</div>
                          <strong>Focus &amp; Tab-Lock Active</strong>
                          <div>{sess.cameraActive ? "Awaiting next webcam frame..." : "Camera not attached on examinee device"}</div>
                        </div>
                      )}
                      <div style={{ position: "absolute", bottom: "4px", left: "6px", right: "6px", background: "rgba(2,6,23,0.8)", borderRadius: "5px", padding: "3px 6px", fontSize: "0.68rem", display: "flex", justifyContent: "space-between", color: "#e2e8f0" }}>
                        <span>{sess.examTitle || "Active Exam"}</span>
                        <span>{sess.lastHeartbeatAt ? new Date(sess.lastHeartbeatAt).toLocaleTimeString() : ""}</span>
                      </div>
                    </div>

                    {/* Movement & Penalty Readout */}
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", background: "rgba(13, 34, 71, 0.7)", padding: "6px 8px", borderRadius: "6px" }}>
                      <span style={{ color: "#cbd5e1" }}>
                        Warnings: <strong style={{ color: hasWarn ? "#fca5a5" : "#34d399" }}>{sess.warningsCount || 0}</strong>
                      </span>
                      <span style={{ color: "#fca5a5", fontWeight: 800 }}>
                        Lost Marks: -{sess.penaltyMarksDeducted || 0}
                      </span>
                    </div>

                    {sess.latestReason && (
                      <div style={{ fontSize: "0.72rem", color: hasWarn ? "#fca5a5" : "#94a3b8", lineHeight: 1.35 }}>
                        Latest: {sess.latestReason}
                      </div>
                    )}

                    {/* Per-Camera Actions */}
                    <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginTop: "auto" }}>
                      <button
                        type="button"
                        onClick={() => {
                          const txt = messageText.trim() || "Please keep your eyes strictly on your exam screen.";
                          handleDispatchMessage({
                            overrideMode: "SINGLE",
                            overrideStudentIds: [String(sess.studentId)],
                            overrideText: txt,
                            overrideSeverity: "INFO",
                            overrideDeduct: 0
                          });
                        }}
                        style={{ flex: 1, background: "rgba(56, 189, 248, 0.18)", border: "1px solid #38bdf8", color: "#bae6fd", borderRadius: "6px", padding: "5px 8px", fontSize: "0.72rem", fontWeight: 800, cursor: "pointer" }}
                      >
                        💬 Message
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDispatchMessage({
                          overrideMode: "SINGLE",
                          overrideStudentIds: [String(sess.studentId)],
                          overrideText: messageText.trim() || "Suspicious movement detected by invigilator. 2 marks deducted.",
                          overrideSeverity: "WARNING",
                          overrideDeduct: 2
                        })}
                        style={{ background: "rgba(239, 68, 68, 0.2)", border: "1px solid #ef4444", color: "#fca5a5", borderRadius: "6px", padding: "5px 8px", fontSize: "0.72rem", fontWeight: 800, cursor: "pointer" }}
                      >
                        ⚠️ Warn (-2)
                      </button>
                      <button
                        type="button"
                        disabled={isSaving}
                        onClick={() => handleSaveEvidenceSnapshot(sess)}
                        style={{ background: "linear-gradient(135deg, #f6dd84, #cfa028)", border: "1px solid #d4af37", color: "#081833", borderRadius: "6px", padding: "5px 8px", fontSize: "0.72rem", fontWeight: 800, cursor: "pointer" }}
                      >
                        {isSaving ? "Saving..." : "📸 Save Evidence"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* SUBVIEW 2: SAVED EVIDENCE REFERENCE VAULT */}
      {subView === "EVIDENCE" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px", marginBottom: "10px", flexWrap: "wrap" }}>
            <input
              type="text"
              className="filter-input"
              style={{ maxWidth: "320px", width: "100%" }}
              placeholder="Filter evidence by student or exam..."
              value={evidenceSearch}
              onChange={(e) => setEvidenceSearch(e.target.value)}
            />
            <span style={{ fontSize: "0.78rem", color: "#cbd5e1" }}>
              Permanent Evidence Records: <strong style={{ color: "#f6dd84" }}>{filteredEvidence.length}</strong>
            </span>
          </div>

          {filteredEvidence.length === 0 ? (
            <div style={{ padding: "1.4rem", textAlign: "center", borderRadius: "10px", border: "1px dashed rgba(212, 175, 55, 0.45)", color: "#cbd5e1", fontSize: "0.84rem" }}>
              No proctoring evidence snapshots archived yet. Click <strong>📸 Save Evidence</strong> on any student&apos;s camera card or wait for flagged exam submissions to archive automatically.
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(290px, 1fr))", gap: "12px" }}>
              {filteredEvidence.map((ev) => (
                <div key={ev.id} style={{ background: "rgba(5, 15, 35, 0.88)", border: "1px solid rgba(212, 175, 55, 0.45)", borderRadius: "10px", padding: "12px", display: "flex", flexDirection: "column", gap: "8px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <strong style={{ color: "#f6dd84", fontSize: "0.86rem" }}>{ev.studentName}</strong>
                    <span style={{ fontSize: "0.7rem", color: "#fca5a5", fontWeight: 800 }}>-{ev.penaltyMarksDeducted} Marks ({ev.warningsCount} Warn)</span>
                  </div>
                  {ev.snapshotDataUrl && (
                    <img
                      src={ev.snapshotDataUrl}
                      alt={`Evidence - ${ev.studentName}`}
                      style={{ width: "100%", height: "120px", objectFit: "cover", borderRadius: "6px", border: "1px solid rgba(255,255,255,0.18)" }}
                    />
                  )}
                  <div style={{ fontSize: "0.74rem", color: "#cbd5e1" }}>{ev.examTitle}</div>
                  <div style={{ fontSize: "0.72rem", color: "#94a3b8" }}>{ev.teacherNote}</div>
                  <div style={{ fontSize: "0.68rem", color: "#64748b" }}>Saved: {new Date(ev.savedAt).toLocaleString()}</div>
                  <div style={{ display: "flex", gap: "6px", marginTop: "auto" }}>
                    <button
                      type="button"
                      onClick={() => setInspectEvidenceModal(ev)}
                      style={{ flex: 1, background: "rgba(56, 189, 248, 0.18)", border: "1px solid #38bdf8", color: "#bae6fd", borderRadius: "6px", padding: "5px 8px", fontSize: "0.72rem", fontWeight: 800, cursor: "pointer" }}
                    >
                      👁️ View Full Log
                    </button>
                    <button
                      type="button"
                      onClick={() => handlePrintEvidenceReport(ev)}
                      style={{ background: "rgba(212, 175, 55, 0.2)", border: "1px solid #d4af37", color: "#f6dd84", borderRadius: "6px", padding: "5px 8px", fontSize: "0.72rem", fontWeight: 800, cursor: "pointer" }}
                    >
                      🖨️ Print
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteEvidence(ev.id)}
                      style={{ background: "rgba(239, 68, 68, 0.18)", border: "1px solid #ef4444", color: "#fca5a5", borderRadius: "6px", padding: "5px 8px", fontSize: "0.72rem", fontWeight: 800, cursor: "pointer" }}
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SUBVIEW 3: DISPATCHED PROCTOR MESSAGES HISTORY */}
      {subView === "SENT_MESSAGES" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxHeight: "280px", overflowY: "auto" }}>
          {sentMessagesLog.length === 0 ? (
            <div style={{ padding: "1.2rem", textAlign: "center", color: "#94a3b8", fontSize: "0.82rem" }}>
              No proctoring instructions or warnings sent yet.
            </div>
          ) : (
            sentMessagesLog.map((m) => (
              <div key={m.id} style={{ background: "rgba(5, 15, 35, 0.85)", border: `1px solid ${m.severity === "WARNING" ? "#ef4444" : "rgba(56, 189, 248, 0.4)"}`, borderRadius: "8px", padding: "10px 12px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.74rem", marginBottom: "4px" }}>
                  <strong style={{ color: m.severity === "WARNING" ? "#fca5a5" : "#f6dd84" }}>
                    [{m.targetMode}] To: {m.targetSummary} {m.deductMarks > 0 ? `• -${m.deductMarks} Marks` : ""}
                  </strong>
                  <span style={{ color: "#94a3b8" }}>{new Date(m.createdAt).toLocaleString()}</span>
                </div>
                <div style={{ fontSize: "0.82rem", color: "#f8fafc" }}>{m.message}</div>
              </div>
            ))
          )}
        </div>
      )}

      {/* EVIDENCE INSPECTION MODAL */}
      {inspectEvidenceModal && (
        <div className="invoice-pay-modal-overlay" onClick={() => setInspectEvidenceModal(null)}>
          <div style={{ background: "#081833", border: "2px solid #d4af37", borderRadius: "14px", padding: "20px", maxWidth: "600px", width: "95%", color: "#f8fafc" }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
              <h3 style={{ margin: 0, color: "#f6dd84" }}>🗂️ Evidence Reference: {inspectEvidenceModal.studentName}</h3>
              <button type="button" onClick={() => setInspectEvidenceModal(null)} style={{ background: "none", border: "none", color: "#cbd5e1", fontSize: "1.2rem", cursor: "pointer" }}>✕</button>
            </div>
            {inspectEvidenceModal.snapshotDataUrl && (
              <img src={inspectEvidenceModal.snapshotDataUrl} alt="Saved Webcam Frame" style={{ width: "100%", maxHeight: "260px", objectFit: "contain", borderRadius: "8px", border: "1px solid #d4af37", marginBottom: "10px" }} />
            )}
            <div style={{ fontSize: "0.82rem", marginBottom: "8px" }}>
              <strong>Exam:</strong> {inspectEvidenceModal.examTitle} • <strong>Warnings:</strong> {inspectEvidenceModal.warningsCount} • <strong style={{ color: "#fca5a5" }}>Subtracted Marks: -{inspectEvidenceModal.penaltyMarksDeducted}</strong>
            </div>
            <div style={{ maxHeight: "180px", overflowY: "auto", background: "#050f23", padding: "10px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.12)" }}>
              {(inspectEvidenceModal.events || []).length === 0 ? (
                <div style={{ color: "#94a3b8", fontSize: "0.78rem" }}>Manual camera snapshot preserved for invigilator audit.</div>
              ) : (
                inspectEvidenceModal.events.map((ev, idx) => (
                  <div key={ev.id || idx} style={{ fontSize: "0.76rem", padding: "4px 0", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                    <strong style={{ color: "#f6dd84" }}>[{ev.time || ev.timeIso}]</strong> {ev.reason}
                  </div>
                ))
              )}
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "12px" }}>
              <button type="button" onClick={() => handlePrintEvidenceReport(inspectEvidenceModal)} className="btn-primary" style={{ padding: "6px 14px", fontSize: "0.78rem" }}>
                🖨️ Print Evidence Sheet
              </button>
              <button type="button" onClick={() => setInspectEvidenceModal(null)} className="btn-secondary" style={{ padding: "6px 14px", fontSize: "0.78rem" }}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
