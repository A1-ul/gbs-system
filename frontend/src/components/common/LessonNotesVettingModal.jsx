import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { printHtmlSafely } from "../../utils/safeWindow";
import { buildPrintableLessonNoteHtml, getStatusDisplay, NACCA_SECTION_DEFINITIONS } from "../../utils/lessonPlanPrintHelper";

/**
 * Portaled Headmaster / Academic Supervisor Structured NaCCA Lesson Notes Vetting Modal.
 * Displays all 16 required Ghana NaCCA educational elements, automated pedagogical alignment
 * quality summary, chronological review history, itemized section comments, overall remarks,
 * decision controls (Approve / Request Corrections / Keep Under Review), and Printable PDF export.
 */
export default function LessonNotesVettingModal({
  plan,
  schoolName = "GBS School Management System",
  onClose,
  onCommitVetting
}) {
  const [decision, setDecision] = useState("VETTED_APPROVED");
  const [overallRemarks, setOverallRemarks] = useState("");
  const [sectionComments, setSectionComments] = useState({});
  const [activeCommentKey, setActiveCommentKey] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!plan) return;
    setDecision(plan.status === "REVISION_REQUIRED" ? "REVISION_REQUIRED" : "VETTED_APPROVED");
    setOverallRemarks(
      plan.headmasterRemarks ||
      "Vetted, endorsed, and officially authorized for classroom instruction."
    );
    setSectionComments(plan.sectionComments && typeof plan.sectionComments === "object" ? { ...plan.sectionComments } : {});
    setActiveCommentKey(null);
  }, [plan]);

  if (!plan || typeof document === "undefined") return null;

  const st = getStatusDisplay(plan.status);
  const quality = plan.qualityReport || null;
  const history = Array.isArray(plan.reviewHistory) ? plan.reviewHistory : [];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      await onCommitVetting({
        plan,
        vettingStatus: decision,
        headmasterRemarks: overallRemarks.trim(),
        sectionComments
      });
    } finally {
      setSubmitting(false);
    }
  };

  return createPortal(
    <div className="role-modal-backdrop" style={{ zIndex: 100001 }} onClick={onClose}>
      <div
        className="role-modal-card"
        data-testid="headmaster-nacca-vetting-modal"
        style={{
          maxWidth: "920px",
          width: "96%",
          maxHeight: "92vh",
          overflowY: "auto",
          background: "#0b1426",
          border: "2px solid #38bdf8",
          borderRadius: "16px",
          padding: "22px",
          boxShadow: "0 25px 70px rgba(0, 0, 0, 0.9)"
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px", flexWrap: "wrap", borderBottom: "1px solid rgba(255,255,255,0.12)", paddingBottom: "12px", marginBottom: "14px" }}>
          <div>
            <h3 style={{ margin: 0, color: "#38bdf8", fontSize: "1.12rem", fontWeight: 900 }}>
              📑 HEADMASTER VETTING DESK • GHANA NaCCA LESSON NOTES INSPECTION
            </h3>
            <span style={{ fontSize: "0.78rem", color: "#94a3b8" }}>
              Teacher: <strong style={{ color: "#f8fafc" }}>{plan.teacherName}</strong> • {plan.subjectName} • {plan.className} • Rev #{plan.revisionNumber || 1}
            </span>
          </div>
          <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
            <span style={{ background: st.bg, color: st.color, border: `1px solid ${st.border}`, padding: "4px 10px", borderRadius: "999px", fontSize: "0.74rem", fontWeight: 900 }}>
              {st.label}
            </span>
            <button
              type="button"
              onClick={() => printHtmlSafely(buildPrintableLessonNoteHtml(plan, schoolName), `${plan.title} — Vetting Copy`)}
              style={{ background: "linear-gradient(135deg, #f6dd84, #d4af37)", color: "#081833", border: "none", borderRadius: "8px", padding: "6px 12px", fontSize: "0.76rem", fontWeight: 900, cursor: "pointer" }}
            >
              🖨️ Print / Export PDF
            </button>
            <button type="button" className="modal-close-btn" onClick={onClose}>✕</button>
          </div>
        </div>

        {/* Identification Strip */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: "8px", background: "rgba(2,6,23,0.75)", border: "1px solid rgba(56,189,248,0.3)", borderRadius: "10px", padding: "12px", marginBottom: "14px", fontSize: "0.8rem", color: "#e2e8f0" }}>
          <div><strong>Document Title:</strong> {plan.title}</div>
          <div><strong>Topic:</strong> {plan.topic || "—"}</div>
          <div><strong>Strand / Sub-Strand:</strong> {[plan.strand, plan.subStrand].filter(Boolean).join(" / ") || "—"}</div>
          <div><strong>Period &amp; Duration:</strong> {plan.term} • {plan.weekNumber} • {plan.durationMinutes || 60} mins</div>
          <div><strong>Lesson Date:</strong> {plan.lessonDate || "—"}</div>
          {plan.resourcesAttached && <div><strong>Attached File:</strong> <span style={{ color: "#fbbf24" }}>📎 {plan.resourcesAttached}</span></div>}
        </div>

        {/* Automated Pedagogical Quality & Alignment Audit Card */}
        {quality && (
          <div style={{ background: "rgba(8,24,51,0.85)", border: "1px solid rgba(212,175,55,0.4)", borderRadius: "10px", padding: "12px", marginBottom: "14px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px", marginBottom: "8px" }}>
              <strong style={{ color: "#f6dd84", fontSize: "0.84rem" }}>
                🔎 Automated NaCCA Completeness &amp; Pedagogical Alignment Aid (Supports Supervisor Review)
              </strong>
              <span style={{ fontSize: "0.78rem", fontWeight: 800, color: quality.readyForVetting ? "#34d399" : "#fbbf24" }}>
                Readiness: {quality.readinessScore}% • Completed: {quality.completedCount}/{quality.totalRequiredCount}
              </span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "6px" }}>
              {(quality.alignmentChecks || []).map((chk) => (
                <div key={chk.id} style={{
                  fontSize: "0.74rem",
                  padding: "6px 8px",
                  borderRadius: "6px",
                  background: chk.status === "PASS" ? "rgba(16,185,129,0.12)" : chk.status === "REVIEW" ? "rgba(245,158,11,0.12)" : "rgba(239,68,68,0.12)",
                  color: chk.status === "PASS" ? "#6ee7b7" : chk.status === "REVIEW" ? "#fcd34d" : "#fca5a5"
                }}>
                  <strong>{chk.status === "PASS" ? "✓" : chk.status === "REVIEW" ? "⚠️" : "✕"} {chk.title}</strong>
                </div>
              ))}
            </div>
            {Array.isArray(quality.integrityNotices) && quality.integrityNotices.length > 0 && (
              <div style={{ marginTop: "8px", fontSize: "0.73rem", color: "#fde68a" }}>
                {quality.integrityNotices.map((n, i) => <div key={i}>ℹ️ {n}</div>)}
              </div>
            )}
          </div>
        )}

        {/* All 16 Structured NaCCA Sections with Itemized Commenting */}
        <div style={{ marginBottom: "16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
            <strong style={{ color: "#f8fafc", fontSize: "0.9rem" }}>📋 Full Lesson Plan Content (Click "Add Comment" on any section to give targeted feedback)</strong>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(380px, 1fr))", gap: "10px", maxHeight: "340px", overflowY: "auto", paddingRight: "4px" }}>
            {NACCA_SECTION_DEFINITIONS.map((sec) => {
              const rawVal = plan[sec.key];
              const displayText = Array.isArray(rawVal) ? rawVal.join(" • ") : String(rawVal || "").trim();
              const existingComment = sectionComments[sec.label] || sectionComments[sec.key] || "";
              const isCommenting = activeCommentKey === sec.key;

              return (
                <div key={sec.key} style={{
                  background: "rgba(15, 23, 42, 0.85)",
                  border: existingComment ? "1px solid #f59e0b" : "1px solid rgba(148,163,184,0.22)",
                  borderRadius: "9px",
                  padding: "10px 12px"
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
                    <span style={{ fontSize: "0.76rem", fontWeight: 800, color: "#f6dd84" }}>{sec.label}</span>
                    <button
                      type="button"
                      onClick={() => setActiveCommentKey(isCommenting ? null : sec.key)}
                      style={{
                        background: existingComment ? "rgba(245,158,11,0.2)" : "rgba(56,189,248,0.14)",
                        border: `1px solid ${existingComment ? "#f59e0b" : "rgba(56,189,248,0.35)"}`,
                        color: existingComment ? "#fcd34d" : "#7dd3fc",
                        borderRadius: "5px",
                        padding: "2px 7px",
                        fontSize: "0.68rem",
                        fontWeight: 700,
                        cursor: "pointer"
                      }}
                    >
                      {existingComment ? "💬 Edit Note" : "+ Comment"}
                    </button>
                  </div>
                  <div style={{ fontSize: "0.8rem", color: displayText ? "#e2e8f0" : "#64748b", whiteSpace: "pre-wrap", lineHeight: "1.4" }}>
                    {displayText || (sec.key === "teacherReflection" ? "Post-lesson reflection (blank until taught)." : "Not provided")}
                  </div>
                  {existingComment && !isCommenting && (
                    <div style={{ marginTop: "6px", padding: "5px 8px", borderRadius: "6px", background: "rgba(245,158,11,0.14)", color: "#fde68a", fontSize: "0.73rem" }}>
                      <strong>Supervisor Note:</strong> {existingComment}
                    </div>
                  )}
                  {isCommenting && (
                    <div style={{ marginTop: "6px" }}>
                      <input
                        type="text"
                        data-testid={`vetting-section-comment-${sec.key}`}
                        className="filter-input"
                        placeholder={`Specific feedback on ${sec.label}...`}
                        value={sectionComments[sec.label] || ""}
                        onChange={(e) => setSectionComments((prev) => ({ ...prev, [sec.label]: e.target.value }))}
                        style={{ width: "100%", padding: "6px 8px", fontSize: "0.76rem" }}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Chronological Review History */}
        {history.length > 0 && (
          <div style={{ background: "rgba(2,6,23,0.7)", border: "1px solid rgba(148,163,184,0.2)", borderRadius: "10px", padding: "10px 12px", marginBottom: "14px" }}>
            <strong style={{ color: "#cbd5e1", fontSize: "0.8rem", display: "block", marginBottom: "6px" }}>
              🕒 Review &amp; Revision History ({history.length} event{history.length === 1 ? "" : "s"})
            </strong>
            <div style={{ maxHeight: "110px", overflowY: "auto", fontSize: "0.74rem" }}>
              {history.map((ev, idx) => (
                <div key={ev.id || idx} style={{ padding: "4px 0", borderBottom: idx < history.length - 1 ? "1px solid rgba(255,255,255,0.06)" : "none" }}>
                  <span style={{ color: "#38bdf8", fontWeight: 800 }}>Rev #{ev.revisionNumber || 1} • {ev.action}</span>
                  <span style={{ color: "#94a3b8" }}> — {ev.actorName} ({ev.actorRole}) • {ev.timestamp ? new Date(ev.timestamp).toLocaleString() : ""}</span>
                  {ev.remarks && <div style={{ color: "#e2e8f0" }}>"{ev.remarks}"</div>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Executive Vetting Decision Form */}
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: "12px" }}>
            <label style={{ display: "block", fontSize: "0.8rem", color: "#f6dd84", fontWeight: 800, marginBottom: "6px" }}>
              Supervisor Vetting Decision *
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: "8px" }}>
              {[
                { key: "VETTED_APPROVED", label: "🟢 Endorse & Approve", activeBg: "rgba(16,185,129,0.25)", activeBorder: "#10b981", activeColor: "#34d399" },
                { key: "REVISION_REQUIRED", label: "🔴 Request Corrections", activeBg: "rgba(239,68,68,0.25)", activeBorder: "#ef4444", activeColor: "#fca5a5" },
                { key: "UNDER_REVIEW", label: "🟡 Keep Under Review", activeBg: "rgba(245,158,11,0.25)", activeBorder: "#f59e0b", activeColor: "#fcd34d" }
              ].map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  data-testid={`vet-decision-${opt.key}`}
                  onClick={() => setDecision(opt.key)}
                  style={{
                    background: decision === opt.key ? opt.activeBg : "rgba(255,255,255,0.05)",
                    border: decision === opt.key ? `2px solid ${opt.activeBorder}` : "1px solid rgba(255,255,255,0.12)",
                    color: decision === opt.key ? opt.activeColor : "#94a3b8",
                    padding: "9px",
                    borderRadius: "8px",
                    fontWeight: 800,
                    fontSize: "0.82rem",
                    cursor: "pointer"
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: "10px", display: "flex", gap: "6px", flexWrap: "wrap" }}>
            {[
              "Vetted, endorsed, and officially authorized for classroom delivery. Strong learner-centred structure.",
              "Corrections requested: Please strengthen Differentiated Learning support and align Assessment questions with Expected Learning Outcomes.",
              "Please verify the official NaCCA Content Standard & Curriculum Reference pages and resubmit."
            ].map((preset, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setOverallRemarks(preset)}
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", color: "#cbd5e1", borderRadius: "6px", padding: "3px 8px", fontSize: "0.71rem", cursor: "pointer" }}
              >
                ⚡ "{preset.slice(0, 48)}..."
              </button>
            ))}
          </div>

          <div style={{ marginBottom: "14px" }}>
            <label style={{ display: "block", fontSize: "0.78rem", color: "#cbd5e1", fontWeight: 700, marginBottom: "4px" }}>
              Overall Headmaster / Supervisor Remarks to {plan.teacherName} *
            </label>
            <textarea
              rows={3}
              required
              data-testid="vetting-overall-remarks"
              className="filter-input"
              value={overallRemarks}
              onChange={(e) => setOverallRemarks(e.target.value)}
              placeholder={`Enter clear feedback, commendation, or specific correction instructions for ${plan.teacherName}...`}
              style={{ width: "100%", padding: "9px 12px", fontSize: "0.84rem" }}
            />
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", flexWrap: "wrap" }}>
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            <button
              type="submit"
              data-testid="commit-vetting-decision-btn"
              disabled={submitting}
              className="btn-primary"
              style={{
                background: decision === "VETTED_APPROVED"
                  ? "linear-gradient(135deg, #10b981, #059669)"
                  : decision === "REVISION_REQUIRED"
                    ? "linear-gradient(135deg, #ef4444, #dc2626)"
                    : "linear-gradient(135deg, #d97706, #b45309)",
                padding: "9px 22px",
                fontWeight: 900,
                fontSize: "0.85rem"
              }}
            >
              {submitting ? "⏳ Saving Decision..." : "✅ Commit Vetting Decision & Notify Teacher"}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
