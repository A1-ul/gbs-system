// Shared Ghana NaCCA Lesson Planning section metadata & A4 printable PDF HTML builder

export const NACCA_SECTION_DEFINITIONS = [
  {
    key: "contentStandard",
    label: "Content Standard",
    group: "Curriculum Alignment",
    prompt: "Enter the authentic NaCCA Content Standard from your approved curriculum (never fabricate codes).",
    placeholder: "e.g. B8.2.2.1 Demonstrate understanding of solving linear equations in one variable..."
  },
  {
    key: "learningIndicator",
    label: "Learning Indicator",
    group: "Curriculum Alignment",
    prompt: "State the specific curriculum learning indicator targeted in this lesson.",
    placeholder: "e.g. B8.2.2.1.1 Model and solve linear equations in one variable using balance models..."
  },
  {
    key: "performanceIndicator",
    label: "Performance Indicator",
    group: "Curriculum Alignment",
    prompt: "Describe the observable evidence showing learners have achieved the indicator.",
    placeholder: "e.g. Learners accurately solve at least 4 of 5 two-step linear equations and check solutions."
  },
  {
    key: "coreCompetencies",
    label: "Core Competencies",
    group: "Curriculum Alignment",
    prompt: "Select the Ghana NaCCA core competencies actively developed during this lesson."
  },
  {
    key: "curriculumReferences",
    label: "Relevant Curriculum References",
    group: "Curriculum Alignment",
    prompt: "Cite the exact NaCCA syllabus document, page number, and approved learner textbook pages.",
    placeholder: "e.g. NaCCA Common Core Mathematics Curriculum (JHS 1-3), Strand 2; Approved Learner Book pp. 42-46"
  },
  {
    key: "previousKnowledge",
    label: "Previous Knowledge",
    group: "Preparation & Pedagogy",
    prompt: "What prior concepts, skills, or everyday experiences do learners already bring to this lesson?",
    placeholder: "e.g. Learners can simplify algebraic terms and use inverse arithmetic operations with integers."
  },
  {
    key: "teachingLearningResources",
    label: "Teaching & Learning Resources (TLRs)",
    group: "Preparation & Pedagogy",
    prompt: "List physical manipulatives, charts, local materials, apparatus, or digital tools needed.",
    placeholder: "e.g. Balance-scale visual cards, coloured counters, whiteboard, structured pair worksheets"
  },
  {
    key: "teachingLearningMethods",
    label: "Teaching & Learning Methods",
    group: "Preparation & Pedagogy",
    prompt: "Choose learner-centred methods suited to your subject and explain how they will be applied."
  },
  {
    key: "differentiatedLearning",
    label: "Differentiated Learning",
    group: "Preparation & Pedagogy",
    prompt: "Plan scaffolding for struggling learners, extension tasks for fast finishers, and inclusive/SEN adaptations.",
    placeholder: "Support: worked cue cards & visual prompts. Extension: multi-step word problems. Inclusion: oral explanation & large print."
  },
  {
    key: "expectedLearningOutcomes",
    label: "Expected Learning Outcomes",
    group: "Lesson Delivery",
    prompt: "State clear, measurable outcomes describing what learners will be able to do by the end of the lesson.",
    placeholder: "By the end of the lesson, learners will be able to: (1) ..., (2) ..., (3) ..."
  },
  {
    key: "teacherActivities",
    label: "Teacher Activities (What to Say, Model & Guide)",
    group: "Lesson Delivery",
    prompt: "Detail your starter hook, explanations, demonstrations, key questions, safety checks, and coaching steps.",
    placeholder: "1. Starter (10 mins): ... 2. Demonstration (15 mins): ... 3. Guided Coaching (25 mins): ..."
  },
  {
    key: "learnerActivities",
    label: "Learner Activities (Active Hands-On Tasks)",
    group: "Lesson Delivery",
    prompt: "Specify what learners actively do individually, in pairs, and in groups (investigate, discuss, solve, build, present).",
    placeholder: "1. Pair warm-up discussion... 2. Manipulate materials / solve guided tasks... 3. Present & explain steps..."
  },
  {
    key: "assessmentEvaluation",
    label: "Assessment / Evaluation",
    group: "Closure & Follow-Up",
    prompt: "Specify oral checks, observation checklists, practical tasks, or exit questions verifying Expected Learning Outcomes.",
    placeholder: "Oral probing during modelling, pair-work checklist, and 3-item exit ticket checking accuracy and explanation."
  },
  {
    key: "conclusionPlenary",
    label: "Conclusion / Plenary",
    group: "Closure & Follow-Up",
    prompt: "Explain how you will summarise core ideas, address common misconceptions, and invite learner recap.",
    placeholder: "Learners restate key steps in their own words and analyse one common misconception together."
  },
  {
    key: "assignmentHomework",
    label: "Assignment / Homework",
    group: "Closure & Follow-Up",
    prompt: "Give meaningful, manageable take-home practice or community inquiry linked to the lesson.",
    placeholder: "Solve 4 practice items and create 1 everyday real-life example to share next lesson."
  },
  {
    key: "teacherReflection",
    label: "Teacher's Reflection (Post-Teaching)",
    group: "Post-Teaching Reflection",
    prompt: "Record ONLY after teaching the lesson: What worked well? Which learners needed extra help? What will you adjust next time?",
    placeholder: "Leave blank before teaching. Record honest classroom observations after delivering the lesson."
  }
];

function escapeHtml(val) {
  return String(val ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatTextBlock(val, fallback = "—") {
  const s = String(val ?? "").trim();
  if (!s) return `<span style="color:#64748b;font-style:italic;">${escapeHtml(fallback)}</span>`;
  return escapeHtml(s).replace(/\n/g, "<br/>");
}

function formatListBlock(val, notes = "") {
  const items = Array.isArray(val) ? val.filter(Boolean) : (val ? [String(val)] : []);
  const badges = items.map((item) => `<span class="pill">${escapeHtml(item)}</span>`).join(" ");
  const extra = notes ? `<div style="margin-top:6px;">${formatTextBlock(notes)}</div>` : "";
  return (badges || `<span style="color:#64748b;font-style:italic;">None specified</span>`) + extra;
}

export function getStatusDisplay(status) {
  switch (String(status || "").toUpperCase()) {
    case "VETTED_APPROVED":
      return { label: "Vetted & Approved", color: "#059669", bg: "#ecfdf5", border: "#10b981" };
    case "REVISION_REQUIRED":
      return { label: "Corrections Requested", color: "#dc2626", bg: "#fef2f2", border: "#ef4444" };
    case "UNDER_REVIEW":
      return { label: "Under Supervisor Review", color: "#d97706", bg: "#fffbeb", border: "#f59e0b" };
    case "PENDING_VETTING":
      return { label: "Submitted — Pending Vetting", color: "#0284c7", bg: "#f0f9ff", border: "#0ea5e9" };
    default:
      return { label: "Draft (Not Submitted)", color: "#475569", bg: "#f1f5f9", border: "#94a3b8" };
  }
}

export function buildPrintableLessonNoteHtml(plan = {}, schoolName = "GBS School Management System") {
  const st = getStatusDisplay(plan.status);
  const typeMap = {
    YEARLY_PLAN: "Yearly Academic Scheme of Work",
    TERMLY_PLAN: "Termly Scheme of Work",
    WEEKLY_PLAN: "Weekly Instructional Plan",
    LESSON_NOTES: "NaCCA Learner-Centred Lesson Notes"
  };
  const docLabel = typeMap[plan.planType] || "Lesson Plan / Lesson Notes";
  const sectionComments = plan.sectionComments && typeof plan.sectionComments === "object"
    ? Object.entries(plan.sectionComments).filter(([, v]) => String(v || "").trim())
    : [];
  const reviewHistory = Array.isArray(plan.reviewHistory) ? plan.reviewHistory : [];

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<title>${escapeHtml(plan.title || "Lesson Notes")} — ${escapeHtml(schoolName)}</title>
<style>
  @page { size: A4; margin: 14mm; }
  body { font-family: 'Segoe UI', Arial, sans-serif; color: #0f172a; margin: 0; padding: 0; font-size: 11pt; line-height: 1.45; }
  .header { border-bottom: 3px solid #081833; padding-bottom: 10px; margin-bottom: 14px; display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; }
  .school { font-size: 15pt; font-weight: 900; color: #081833; text-transform: uppercase; letter-spacing: 0.4px; }
  .doc-type { font-size: 10pt; font-weight: 700; color: #1d4ed8; margin-top: 2px; }
  .status-stamp { border: 2px solid ${st.border}; background: ${st.bg}; color: ${st.color}; padding: 6px 12px; border-radius: 6px; font-weight: 800; font-size: 9pt; text-align: right; white-space: nowrap; }
  .meta-table { width: 100%; border-collapse: collapse; margin-bottom: 14px; font-size: 9.5pt; }
  .meta-table td { border: 1px solid #cbd5e1; padding: 6px 8px; vertical-align: top; }
  .meta-label { font-weight: 800; color: #334155; background: #f8fafc; width: 17%; }
  .section-title { background: #081833; color: #f6dd84; font-weight: 800; font-size: 10pt; padding: 6px 10px; margin: 12px 0 6px; border-radius: 4px; text-transform: uppercase; letter-spacing: 0.4px; }
  .content-table { width: 100%; border-collapse: collapse; margin-bottom: 10px; font-size: 9.8pt; }
  .content-table th, .content-table td { border: 1px solid #cbd5e1; padding: 8px 10px; vertical-align: top; text-align: left; }
  .content-table th { width: 26%; background: #f1f5f9; color: #0f172a; font-weight: 800; }
  .pill { display: inline-block; padding: 2px 8px; margin: 2px 4px 2px 0; border-radius: 999px; background: #e0f2fe; color: #0369a1; border: 1px solid #bae6fd; font-size: 8.5pt; font-weight: 700; }
  .vetting-box { border: 2px solid ${st.border}; background: ${st.bg}; border-radius: 8px; padding: 10px 12px; margin-top: 14px; page-break-inside: avoid; }
  .history-table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 8.8pt; }
  .history-table th, .history-table td { border: 1px solid #cbd5e1; padding: 5px 7px; text-align: left; }
  .history-table th { background: #f8fafc; }
  .footer { margin-top: 16px; border-top: 1px solid #cbd5e1; padding-top: 8px; font-size: 8.5pt; color: #475569; display: flex; justify-content: space-between; }
</style>
</head>
<body>
  <div class="header">
    <div>
      <div class="school">${escapeHtml(schoolName)}</div>
      <div class="doc-type">${escapeHtml(docLabel)} • Ghana NaCCA Learner-Centred Format</div>
      <div style="font-size:11.5pt;font-weight:800;margin-top:4px;color:#0f172a;">${escapeHtml(plan.title || "Untitled Lesson Note")}</div>
    </div>
    <div class="status-stamp">
      ${escapeHtml(st.label)}<br/>
      <span style="font-weight:600;font-size:8pt;">Revision #${escapeHtml(plan.revisionNumber || 1)}</span>
    </div>
  </div>

  <table class="meta-table">
    <tr>
      <td class="meta-label">Subject</td><td>${escapeHtml(plan.subjectName || "—")}</td>
      <td class="meta-label">Class / Level</td><td>${escapeHtml(plan.className || "—")}</td>
      <td class="meta-label">Term / Week</td><td>${escapeHtml(plan.term || "—")} • ${escapeHtml(plan.weekNumber || "—")}</td>
    </tr>
    <tr>
      <td class="meta-label">Lesson Date</td><td>${escapeHtml(plan.lessonDate || "—")}</td>
      <td class="meta-label">Duration</td><td>${escapeHtml(plan.durationMinutes || 60)} Minutes</td>
      <td class="meta-label">Teacher</td><td>${escapeHtml(plan.teacherName || "—")}</td>
    </tr>
    <tr>
      <td class="meta-label">Strand</td><td>${escapeHtml(plan.strand || "—")}</td>
      <td class="meta-label">Sub-Strand</td><td>${escapeHtml(plan.subStrand || "—")}</td>
      <td class="meta-label">Topic</td><td><strong>${escapeHtml(plan.topic || "—")}</strong></td>
    </tr>
  </table>

  <div class="section-title">1. Curriculum Standards, Indicators &amp; Competencies (NaCCA)</div>
  <table class="content-table">
    <tr><th>Content Standard</th><td>${formatTextBlock(plan.contentStandard)}</td></tr>
    <tr><th>Learning Indicator</th><td>${formatTextBlock(plan.learningIndicator)}</td></tr>
    <tr><th>Performance Indicator</th><td>${formatTextBlock(plan.performanceIndicator)}</td></tr>
    <tr><th>Core Competencies</th><td>${formatListBlock(plan.coreCompetencies)}</td></tr>
    <tr><th>Relevant Curriculum References</th><td>${formatTextBlock(plan.curriculumReferences || plan.curriculumReference)}</td></tr>
  </table>

  <div class="section-title">2. Preparation, Resources, Methods &amp; Differentiated Learning</div>
  <table class="content-table">
    <tr><th>Previous Knowledge</th><td>${formatTextBlock(plan.previousKnowledge)}</td></tr>
    <tr><th>Teaching &amp; Learning Resources</th><td>${formatTextBlock(plan.teachingLearningResources)}</td></tr>
    <tr><th>Teaching &amp; Learning Methods</th><td>${formatListBlock(plan.teachingLearningMethods, plan.teachingLearningMethodsNotes)}</td></tr>
    <tr><th>Differentiated Learning</th><td>${formatTextBlock(plan.differentiatedLearning)}</td></tr>
  </table>

  <div class="section-title">3. Instructional Delivery, Assessment, Closure &amp; Homework</div>
  <table class="content-table">
    <tr><th>Expected Learning Outcomes</th><td>${formatTextBlock(plan.expectedLearningOutcomes || plan.learningObjectives)}</td></tr>
    <tr><th>Teacher Activities</th><td>${formatTextBlock(plan.teacherActivities)}</td></tr>
    <tr><th>Learner Activities</th><td>${formatTextBlock(plan.learnerActivities)}</td></tr>
    <tr><th>Assessment / Evaluation</th><td>${formatTextBlock(plan.assessmentEvaluation)}</td></tr>
    <tr><th>Conclusion / Plenary</th><td>${formatTextBlock(plan.conclusionPlenary)}</td></tr>
    <tr><th>Assignment / Homework</th><td>${formatTextBlock(plan.assignmentHomework)}</td></tr>
  </table>

  <div class="section-title">4. Teacher's Reflection (Post-Lesson Record)</div>
  <table class="content-table">
    <tr><th>Post-Teaching Reflection</th><td>${formatTextBlock(plan.teacherReflection, "To be recorded by the teacher after delivering the lesson in class.")}</td></tr>
  </table>

  <div class="vetting-box">
    <div style="font-weight:900;color:${st.color};margin-bottom:4px;">SUPERVISOR / HEADMASTER VETTING ENDORSEMENT</div>
    <div><strong>Status:</strong> ${escapeHtml(st.label)} &nbsp;|&nbsp; <strong>Vetted By:</strong> ${escapeHtml(plan.vettedBy || "Awaiting Supervisor Review")} &nbsp;|&nbsp; <strong>Date:</strong> ${plan.vettedAt ? escapeHtml(new Date(plan.vettedAt).toLocaleString()) : "—"}</div>
    <div style="margin-top:6px;"><strong>Supervisor Remarks:</strong> ${formatTextBlock(plan.headmasterRemarks, "No supervisory remarks recorded yet.")}</div>
    ${sectionComments.length > 0 ? `<div style="margin-top:8px;"><strong>Section-Specific Comments:</strong><ul style="margin:4px 0 0 18px;padding:0;">${sectionComments.map(([k, v]) => `<li><strong>${escapeHtml(k)}:</strong> ${escapeHtml(v)}</li>`).join("")}</ul></div>` : ""}
  </div>

  ${reviewHistory.length > 0 ? `
    <div class="section-title">5. Chronological Vetting &amp; Revision Audit Trail</div>
    <table class="history-table">
      <thead><tr><th>Date &amp; Time</th><th>Rev</th><th>Action / Status</th><th>Actor</th><th>Notes</th></tr></thead>
      <tbody>
        ${reviewHistory.map((h) => `
          <tr>
            <td>${h.timestamp ? escapeHtml(new Date(h.timestamp).toLocaleString()) : "—"}</td>
            <td>#${escapeHtml(h.revisionNumber || 1)}</td>
            <td>${escapeHtml(h.action || h.statusAfter || "")}</td>
            <td>${escapeHtml(h.actorName || "")} (${escapeHtml(h.actorRole || "")})</td>
            <td>${escapeHtml(h.remarks || "")}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  ` : ""}

  <div class="footer">
    <span>Ref ID: ${escapeHtml(plan.id || "DRAFT")}</span>
    <span>Generated via GBS School Management System • ${escapeHtml(new Date().toLocaleString())}</span>
  </div>
</body>
</html>`;
}
