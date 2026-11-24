import React, { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import apiClient from "../../api/client/apiClient";
import FileUploadVerificationCard from "./FileUploadVerificationCard";
import { printHtmlSafely } from "../../utils/safeWindow";
import { buildPrintableLessonNoteHtml, getStatusDisplay, NACCA_SECTION_DEFINITIONS } from "../../utils/lessonPlanPrintHelper";

const DEFAULT_COMPETENCIES = [
  "Critical Thinking and Problem Solving (CP)",
  "Creativity and Innovation (CI)",
  "Communication and Collaboration (CC)",
  "Cultural Identity and Global Citizenship (CG)",
  "Personal Development and Leadership (PL)",
  "Digital Literacy (DL)"
];

const DEFAULT_METHODS = [
  "Think-Pair-Share",
  "Guided Discovery & Inquiry",
  "Cooperative Group Work",
  "Demonstration & Guided Practice",
  "Problem-Based Learning (PBL)",
  "Hands-On Practical / Experiment",
  "Role-Play & Simulation",
  "Questioning & Socratic Dialogue",
  "Gallery Walk & Peer Critique",
  "Case Study & Real-World Analysis",
  "Project-Based Learning",
  "Brainstorming & Concept Mapping"
];

const AUTOSAVE_STORAGE_KEY = "gbs_teacher_nacca_lesson_autosave_v1";

function createBlankLessonForm(defaultSubject = "Mathematics", defaultClass = "JHS 2 (Basic 8)") {
  return {
    id: null,
    status: "DRAFT",
    planType: "LESSON_NOTES",
    title: "",
    subjectName: defaultSubject,
    className: defaultClass,
    term: "Term 1",
    weekNumber: "Week 1",
    lessonDate: new Date().toISOString().split("T")[0],
    durationMinutes: 60,
    topic: "",
    strand: "",
    subStrand: "",
    educationalLevel: "Basic / Secondary",
    contentStandard: "",
    learningIndicator: "",
    performanceIndicator: "",
    coreCompetencies: [],
    curriculumReferences: "",
    previousKnowledge: "",
    teachingLearningResources: "",
    teachingLearningMethods: [],
    teachingLearningMethodsNotes: "",
    differentiatedLearning: "",
    expectedLearningOutcomes: "",
    teacherActivities: "",
    learnerActivities: "",
    assessmentEvaluation: "",
    conclusionPlenary: "",
    assignmentHomework: "",
    teacherReflection: "",
    resourcesAttached: "",
    revisionNote: ""
  };
}

function computeLocalMissingSections(form) {
  const missing = [];
  const checkText = (key, label, step) => {
    if (!String(form[key] || "").trim() || String(form[key] || "").trim().length < 3) {
      missing.push({ key, label, step });
    }
  };
  checkText("title", "Lesson Title", 1);
  checkText("subjectName", "Subject", 1);
  checkText("className", "Class / Grade", 1);
  checkText("topic", "Topic", 1);
  checkText("contentStandard", "Content Standard (NaCCA)", 1);
  checkText("learningIndicator", "Learning Indicator", 1);
  checkText("performanceIndicator", "Performance Indicator", 1);
  if (!Array.isArray(form.coreCompetencies) || form.coreCompetencies.length === 0) {
    missing.push({ key: "coreCompetencies", label: "Core Competencies", step: 1 });
  }
  checkText("curriculumReferences", "Curriculum References", 1);
  checkText("previousKnowledge", "Previous Knowledge", 2);
  checkText("teachingLearningResources", "Teaching & Learning Resources", 2);
  if ((!Array.isArray(form.teachingLearningMethods) || form.teachingLearningMethods.length === 0) && !String(form.teachingLearningMethodsNotes || "").trim()) {
    missing.push({ key: "teachingLearningMethods", label: "Teaching & Learning Methods", step: 2 });
  }
  checkText("differentiatedLearning", "Differentiated Learning", 2);
  checkText("expectedLearningOutcomes", "Expected Learning Outcomes", 3);
  checkText("teacherActivities", "Teacher Activities", 3);
  checkText("learnerActivities", "Learner Activities", 3);
  checkText("assessmentEvaluation", "Assessment / Evaluation", 4);
  checkText("conclusionPlenary", "Conclusion / Plenary", 4);
  checkText("assignmentHomework", "Assignment / Homework", 4);
  return missing;
}

export default function TeacherLessonPlanStudio({
  teacherPlans = [],
  setTeacherPlans,
  facultyDirectives = [],
  currentUser = {},
  assignedStaffPosition = null,
  schoolName = "GBS School Management System",
  classes = [],
  prefillPlan = null,
  onPrefillConsumed,
  setFeedback,
  onOpenDetailPage,
  onRefreshPlans
}) {
  const defaultClass = classes?.[0]?.name || "JHS 2 (Basic 8)";
  const [form, setForm] = useState(() => createBlankLessonForm("Mathematics", defaultClass));
  const [editingPlanMeta, setEditingPlanMeta] = useState(null); // holds existing headmasterRemarks, sectionComments, revisionNumber when revising
  const [activeStep, setActiveStep] = useState(1); // 1..5 guided tabs
  const [templates, setTemplates] = useState([]);
  const [competencyOptions, setCompetencyOptions] = useState(DEFAULT_COMPETENCIES);
  const [methodOptions, setMethodOptions] = useState(DEFAULT_METHODS);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [savingMode, setSavingMode] = useState(""); // "" | "DRAFT" | "SUBMIT" | "QUALITY" | "REFLECTION"
  const [qualityReport, setQualityReport] = useState(null);
  const [lastAutosavedAt, setLastAutosavedAt] = useState(null);
  const [hasRestorableAutosave, setHasRestorableAutosave] = useState(false);

  // Attachment verification
  const [uploadedFile, setUploadedFile] = useState(null);
  const [isFileVerified, setIsFileVerified] = useState(false);

  // Pipeline filters & modals
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [previewPlan, setPreviewPlan] = useState(null);
  const [reflectionModalPlan, setReflectionModalPlan] = useState(null);
  const [reflectionDraftText, setReflectionDraftText] = useState("");
  const [expandedHistoryId, setExpandedHistoryId] = useState(null);

  // Load templates & NaCCA metadata from backend
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await apiClient.get("/academics/lesson-plans/templates");
        const data = res.data?.data;
        if (!active || !data) return;
        if (Array.isArray(data.templates)) setTemplates(data.templates);
        if (Array.isArray(data.coreCompetencies) && data.coreCompetencies.length > 0) {
          setCompetencyOptions(data.coreCompetencies.map((c) => c.label || c));
        }
        if (Array.isArray(data.learnerCentredMethods) && data.learnerCentredMethods.length > 0) {
          setMethodOptions(data.learnerCentredMethods);
        }
      } catch {
        // Fallback options already set
      }
    })();

    try {
      const savedDraft = localStorage.getItem(AUTOSAVE_STORAGE_KEY);
      if (savedDraft) {
        const parsed = JSON.parse(savedDraft);
        if (parsed && (parsed.title || parsed.topic || parsed.contentStandard)) {
          setHasRestorableAutosave(true);
        }
      }
    } catch { }

    return () => { active = false; };
  }, []);

  // Support Curriculum Blueprint prefill from TeacherDashboard
  useEffect(() => {
    if (!prefillPlan) return;
    setForm((prev) => ({
      ...prev,
      title: prefillPlan.title || prev.title,
      subjectName: prefillPlan.subjectName || prev.subjectName,
      className: prefillPlan.className || prev.className,
      topic: prefillPlan.topic || prev.topic,
      expectedLearningOutcomes: prefillPlan.learningObjectives || prev.expectedLearningOutcomes,
      teachingLearningMethodsNotes: prefillPlan.methodology || prev.teachingLearningMethodsNotes
    }));
    setActiveStep(1);
    if (typeof onPrefillConsumed === "function") onPrefillConsumed();
  }, [prefillPlan]);

  // Automatic local draft autosave (debounced 2s) so teachers never lose work
  useEffect(() => {
    const hasMeaningfulInput = Boolean(
      form.title.trim() || form.topic.trim() || form.contentStandard.trim() || form.teacherActivities.trim()
    );
    if (!hasMeaningfulInput) return;
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(AUTOSAVE_STORAGE_KEY, JSON.stringify({ ...form, _savedAt: new Date().toISOString() }));
        setLastAutosavedAt(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
      } catch { }
    }, 2000);
    return () => clearTimeout(timer);
  }, [form]);

  const missingSections = useMemo(() => computeLocalMissingSections(form), [form]);
  const completedCount = 19 - missingSections.length;
  const completenessPct = Math.round((completedCount / 19) * 100);

  const updateField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const toggleChip = (key, item) => {
    setForm((prev) => {
      const current = Array.isArray(prev[key]) ? prev[key] : [];
      const exists = current.includes(item);
      return {
        ...prev,
        [key]: exists ? current.filter((x) => x !== item) : [...current, item]
      };
    });
  };

  const handleApplyTemplate = (templateId) => {
    setSelectedTemplateId(templateId);
    const tpl = templates.find((t) => t.id === templateId);
    if (!tpl || !tpl.defaults) return;
    setForm((prev) => ({
      ...prev,
      planType: tpl.defaults.planType || prev.planType,
      subjectName: prev.subjectName || tpl.subjectArea,
      durationMinutes: tpl.defaults.durationMinutes || prev.durationMinutes,
      coreCompetencies: tpl.defaults.coreCompetencies || prev.coreCompetencies,
      teachingLearningResources: tpl.defaults.teachingLearningResources || prev.teachingLearningResources,
      teachingLearningMethods: tpl.defaults.teachingLearningMethods || prev.teachingLearningMethods,
      differentiatedLearning: tpl.defaults.differentiatedLearning || prev.differentiatedLearning,
      teacherActivities: tpl.defaults.teacherActivities || prev.teacherActivities,
      learnerActivities: tpl.defaults.learnerActivities || prev.learnerActivities,
      assessmentEvaluation: tpl.defaults.assessmentEvaluation || prev.assessmentEvaluation,
      conclusionPlenary: tpl.defaults.conclusionPlenary || prev.conclusionPlenary,
      assignmentHomework: tpl.defaults.assignmentHomework || prev.assignmentHomework
      // Intentionally leaves contentStandard, learningIndicator, curriculumReferences & teacherReflection untouched so nothing is fabricated!
    }));
    setQualityReport(null);
    setFeedback?.({
      type: "success",
      message: `✨ Applied "${tpl.name}" learner-centred scaffold. Enter your authentic NaCCA Content Standard, Learning Indicator, and Curriculum References in Step 1.`
    });
  };

  const handleRestoreAutosave = () => {
    try {
      const parsed = JSON.parse(localStorage.getItem(AUTOSAVE_STORAGE_KEY) || "null");
      if (parsed) {
        const { _savedAt, ...rest } = parsed;
        setForm({ ...createBlankLessonForm("Mathematics", defaultClass), ...rest });
        setHasRestorableAutosave(false);
        setFeedback?.({ type: "success", message: "♻️ Restored your last autosaved lesson draft." });
      }
    } catch { }
  };

  const handleResetEditor = () => {
    setForm(createBlankLessonForm("Mathematics", defaultClass));
    setEditingPlanMeta(null);
    setQualityReport(null);
    setSelectedTemplateId("");
    setUploadedFile(null);
    setIsFileVerified(false);
    setActiveStep(1);
    try { localStorage.removeItem(AUTOSAVE_STORAGE_KEY); } catch { }
    setHasRestorableAutosave(false);
  };

  const handleLoadPlanForEdit = (plan) => {
    setForm({
      ...createBlankLessonForm(plan.subjectName || "Mathematics", plan.className || defaultClass),
      id: plan.id,
      status: plan.status,
      planType: plan.planType || "LESSON_NOTES",
      title: plan.title || "",
      subjectName: plan.subjectName || "",
      className: plan.className || "",
      term: plan.term || "Term 1",
      weekNumber: String(plan.weekNumber || "Week 1"),
      lessonDate: plan.lessonDate || new Date().toISOString().split("T")[0],
      durationMinutes: Number(plan.durationMinutes || 60),
      topic: plan.topic || "",
      strand: plan.strand || "",
      subStrand: plan.subStrand || "",
      educationalLevel: plan.educationalLevel || "",
      contentStandard: plan.contentStandard || "",
      learningIndicator: plan.learningIndicator || "",
      performanceIndicator: plan.performanceIndicator || "",
      coreCompetencies: Array.isArray(plan.coreCompetencies) ? plan.coreCompetencies : [],
      curriculumReferences: plan.curriculumReferences || plan.curriculumReference || "",
      previousKnowledge: plan.previousKnowledge || "",
      teachingLearningResources: plan.teachingLearningResources || "",
      teachingLearningMethods: Array.isArray(plan.teachingLearningMethods) ? plan.teachingLearningMethods : [],
      teachingLearningMethodsNotes: plan.teachingLearningMethodsNotes || "",
      differentiatedLearning: plan.differentiatedLearning || "",
      expectedLearningOutcomes: plan.expectedLearningOutcomes || plan.learningObjectives || "",
      teacherActivities: plan.teacherActivities || "",
      learnerActivities: plan.learnerActivities || "",
      assessmentEvaluation: plan.assessmentEvaluation || "",
      conclusionPlenary: plan.conclusionPlenary || "",
      assignmentHomework: plan.assignmentHomework || "",
      teacherReflection: plan.teacherReflection || "",
      resourcesAttached: plan.resourcesAttached || "",
      revisionNote: ""
    });
    setEditingPlanMeta({
      id: plan.id,
      status: plan.status,
      revisionNumber: plan.revisionNumber || 1,
      headmasterRemarks: plan.headmasterRemarks,
      sectionComments: plan.sectionComments || {},
      vettedBy: plan.vettedBy
    });
    setQualityReport(plan.qualityReport || null);
    setActiveStep(1);
    setFeedback?.({
      type: "info",
      message: plan.status === "REVISION_REQUIRED"
        ? `✏️ Loaded "${plan.title}" for revision. Address the Headmaster's comments and click Resubmit for Vetting.`
        : `✏️ Loaded "${plan.title}" into the Lesson Planning Studio.`
    });
  };

  const handleRunQualityCheck = async () => {
    setSavingMode("QUALITY");
    try {
      const res = await apiClient.post("/academics/lesson-plans/quality-check", form);
      const report = res.data?.data?.qualityReport;
      if (report) {
        setQualityReport(report);
        setActiveStep(5);
        setFeedback?.({
          type: report.readyForVetting ? "success" : "info",
          message: report.readyForVetting
            ? `✅ Pedagogical Alignment Check: ${report.readinessScore}% readiness — All required NaCCA sections complete!`
            : `📋 Pedagogical Check (${report.readinessScore}% readiness): ${report.missingRequiredSections.length} section(s) need attention before submission.`
        });
      }
    } catch (err) {
      setFeedback?.({ type: "error", message: err?.response?.data?.message || "Could not run pedagogical quality check." });
    } finally {
      setSavingMode("");
    }
  };

  const handleSaveOrSubmit = async (targetStatus) => {
    if (!form.title.trim() || !form.subjectName.trim() || !form.className.trim()) {
      setActiveStep(1);
      setFeedback?.({ type: "error", message: "Please provide at least the Lesson Title, Subject, and Class / Grade Level." });
      return;
    }
    if (uploadedFile && !isFileVerified) {
      setActiveStep(4);
      setFeedback?.({ type: "error", message: "Please verify your attached file in Step 4 before submitting." });
      return;
    }
    if (targetStatus === "PENDING_VETTING" && missingSections.length > 0 && form.planType === "LESSON_NOTES") {
      // Allow submitting with a clear warning only if core essentials exist, or block if key delivery elements missing
      const criticalMissing = missingSections.filter((m) =>
        ["topic", "expectedLearningOutcomes", "teacherActivities", "learnerActivities", "assessmentEvaluation"].includes(m.key)
      );
      if (criticalMissing.length > 0) {
        setActiveStep(criticalMissing[0].step);
        setFeedback?.({
          type: "error",
          message: `Cannot submit incomplete Lesson Notes. Please complete: ${criticalMissing.map((m) => m.label).join(", ")}. (Or click "Save Draft" to continue later.)`
        });
        return;
      }
    }

    setSavingMode(targetStatus === "DRAFT" ? "DRAFT" : "SUBMIT");
    try {
      const payload = {
        ...form,
        status: targetStatus,
        resubmitForVetting: targetStatus === "PENDING_VETTING" && Boolean(form.id),
        resourcesAttached: uploadedFile?.name || form.resourcesAttached || "",
        teacherPosition: assignedStaffPosition?.positionTitle || "Faculty Member"
      };

      let savedPlan = null;
      if (form.id) {
        const res = await apiClient.put(`/academics/lesson-plans/${form.id}`, payload);
        savedPlan = res.data?.data?.plan;
      } else {
        const res = await apiClient.post("/academics/lesson-plans", payload);
        savedPlan = res.data?.data?.plan;
      }

      if (savedPlan) {
        const nextList = [savedPlan, ...teacherPlans.filter((p) => String(p.id) !== String(savedPlan.id))];
        setTeacherPlans?.(nextList);
        try {
          localStorage.setItem("gbs_teacher_lesson_plans", JSON.stringify(nextList));
          window.dispatchEvent(new Event("storage"));
        } catch { }
        if (targetStatus === "DRAFT") {
          setForm((prev) => ({ ...prev, id: savedPlan.id, status: "DRAFT" }));
          setQualityReport(savedPlan.qualityReport || null);
          setFeedback?.({
            type: "success",
            message: `💾 Draft "${savedPlan.title}" saved to database (${savedPlan.qualityReport?.completionPct ?? completenessPct}% complete). You can continue editing anytime.`
          });
        } else {
          handleResetEditor();
          setFeedback?.({
            type: "success",
            message: `📤 "${savedPlan.title}" (Revision #${savedPlan.revisionNumber || 1}) submitted to Headmaster Vetting Desk successfully!`
          });
        }
        if (typeof onRefreshPlans === "function") onRefreshPlans();
      }
    } catch (err) {
      setFeedback?.({
        type: "error",
        message: err?.response?.data?.message || "Failed to save lesson plan to server."
      });
    } finally {
      setSavingMode("");
    }
  };

  const handleDeleteDraft = async (plan) => {
    try {
      await apiClient.delete(`/academics/lesson-plans/${plan.id}`);
      const nextList = teacherPlans.filter((p) => String(p.id) !== String(plan.id));
      setTeacherPlans?.(nextList);
      try { localStorage.setItem("gbs_teacher_lesson_plans", JSON.stringify(nextList)); } catch { }
      if (String(form.id) === String(plan.id)) handleResetEditor();
      setFeedback?.({ type: "success", message: `🗑️ Deleted draft "${plan.title}".` });
    } catch (err) {
      setFeedback?.({ type: "error", message: err?.response?.data?.message || "Only unsubmitted drafts can be deleted." });
    }
  };

  const handleSavePostLessonReflection = async (e) => {
    e.preventDefault();
    if (!reflectionModalPlan) return;
    if (reflectionDraftText.trim().length < 5) {
      setFeedback?.({ type: "error", message: "Please write a brief honest reflection on how the lesson went in class." });
      return;
    }
    setSavingMode("REFLECTION");
    try {
      const res = await apiClient.put(`/academics/lesson-plans/${reflectionModalPlan.id}`, {
        teacherReflection: reflectionDraftText.trim()
      });
      const updated = res.data?.data?.plan;
      if (updated) {
        const nextList = teacherPlans.map((p) => (String(p.id) === String(updated.id) ? updated : p));
        setTeacherPlans?.(nextList);
        try { localStorage.setItem("gbs_teacher_lesson_plans", JSON.stringify(nextList)); } catch { }
        setReflectionModalPlan(null);
        setReflectionDraftText("");
        setFeedback?.({
          type: "success",
          message: `📝 Post-teaching reflection recorded on approved lesson "${updated.title}". Approval status preserved.`
        });
      }
    } catch (err) {
      setFeedback?.({ type: "error", message: err?.response?.data?.message || "Failed to save post-lesson reflection." });
    } finally {
      setSavingMode("");
    }
  };

  const handlePrintLessonPlan = (plan) => {
    const html = buildPrintableLessonNoteHtml(plan, schoolName);
    printHtmlSafely(html, `${plan.title || "Lesson Notes"} — ${schoolName}`);
  };

  const filteredPlans = useMemo(() => {
    return (Array.isArray(teacherPlans) ? teacherPlans : [])
      .filter((p) => typeFilter === "ALL" || p.planType === typeFilter)
      .filter((p) => statusFilter === "ALL" || p.status === statusFilter)
      .filter((p) => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return (
          String(p.title || "").toLowerCase().includes(q) ||
          String(p.subjectName || "").toLowerCase().includes(q) ||
          String(p.className || "").toLowerCase().includes(q) ||
          String(p.topic || "").toLowerCase().includes(q) ||
          String(p.strand || "").toLowerCase().includes(q)
        );
      });
  }, [teacherPlans, typeFilter, statusFilter, searchQuery]);

  const counts = useMemo(() => {
    const list = Array.isArray(teacherPlans) ? teacherPlans : [];
    return {
      total: list.length,
      drafts: list.filter((p) => p.status === "DRAFT").length,
      pending: list.filter((p) => p.status === "PENDING_VETTING" || p.status === "UNDER_REVIEW").length,
      revisions: list.filter((p) => p.status === "REVISION_REQUIRED").length,
      approved: list.filter((p) => p.status === "VETTED_APPROVED").length
    };
  }, [teacherPlans]);

  const STEP_TABS = [
    { id: 1, icon: "📋", label: "1. Identity & NaCCA" },
    { id: 2, icon: "🧰", label: "2. Prep & Inclusion" },
    { id: 3, icon: "👩‍🏫", label: "3. Delivery & Tasks" },
    { id: 4, icon: "✅", label: "4. Assess & Close" },
    { id: 5, icon: "🔎", label: "5. Reflect & Check" }
  ];

  const fieldCardStyle = {
    background: "rgba(15, 23, 42, 0.72)",
    border: "1px solid rgba(148, 163, 184, 0.2)",
    borderRadius: "10px",
    padding: "12px 14px",
    marginBottom: "12px"
  };

  const labelStyle = {
    display: "block",
    fontSize: "0.82rem",
    color: "#f6dd84",
    fontWeight: 800,
    marginBottom: "3px"
  };

  const hintStyle = {
    display: "block",
    fontSize: "0.73rem",
    color: "#94a3b8",
    marginBottom: "6px",
    lineHeight: "1.35"
  };

  return (
    <div className="role-workspace-card" data-testid="nacca-lesson-plan-studio">
      {/* Studio Header & Status KPIs */}
      <div className="workspace-title-row">
        <div>
          <h2><span>📑</span> TEACHER LESSON PLANNING &amp; NaCCA NOTES VETTING STUDIO</h2>
          <p>
            Prepare learner-centred, Ghana NaCCA-aligned <strong>Lesson Notes</strong>, <strong>Weekly Plans</strong>, <strong>Termly Schemes</strong>, and <strong>Yearly Plans</strong> with guided prompts, subject templates, draft autosave, pedagogical alignment checks, printable PDF export, and Headmaster vetting feedback.
          </p>
        </div>
        <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
          <span className="role-portal-badge" style={{ color: "#38bdf8" }}>{counts.total} Total</span>
          <span className="role-portal-badge" style={{ color: "#cbd5e1" }}>{counts.drafts} Drafts</span>
          <span className="role-portal-badge" style={{ color: "#fbbf24" }}>{counts.pending} Pending Vetting</span>
          <span className="role-portal-badge" style={{ color: "#34d399" }}>{counts.approved} Approved</span>
          {counts.revisions > 0 && (
            <span className="role-portal-badge" style={{ color: "#f87171", borderColor: "#ef4444" }}>
              ⚠️ {counts.revisions} Revision(s) Needed
            </span>
          )}
        </div>
      </div>

      {/* Headmaster Official Directives Callout */}
      {Array.isArray(facultyDirectives) && facultyDirectives.length > 0 && (
        <div style={{
          background: "linear-gradient(135deg, rgba(30, 58, 138, 0.42) 0%, rgba(15, 23, 42, 0.85) 100%)",
          border: "1.5px solid rgba(59, 130, 246, 0.4)",
          borderRadius: "12px",
          padding: "1rem 1.25rem",
          marginBottom: "1.4rem"
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px", flexWrap: "wrap", gap: "8px" }}>
            <strong style={{ color: "#60a5fa", fontSize: "0.92rem" }}>
              📢 OFFICIAL HEADMASTER DIRECTIVES ON LESSON NOTES
            </strong>
            <span style={{ fontSize: "0.74rem", color: "#38bdf8", fontWeight: 700 }}>
              {facultyDirectives.length} Active Directive(s)
            </span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(290px, 1fr))", gap: "10px" }}>
            {facultyDirectives.slice(0, 3).map((dir) => (
              <div key={dir.id} style={{ background: "rgba(2, 6, 23, 0.65)", border: "1px solid rgba(56, 189, 248, 0.3)", borderRadius: "8px", padding: "10px 12px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.7rem", marginBottom: "4px" }}>
                  <span style={{ color: dir.target === "ALL" ? "#34d399" : "#c084fc", fontWeight: 800 }}>
                    {dir.target === "ALL" ? "📢 TO ALL TEACHERS" : `🎯 ${dir.targetTeacherName}`}
                  </span>
                  <span style={{ color: "#94a3b8" }}>{dir.issuedAt ? new Date(dir.issuedAt).toLocaleDateString() : ""}</span>
                </div>
                <strong style={{ color: "#f8fafc", fontSize: "0.84rem", display: "block", marginBottom: "3px" }}>{dir.subject}</strong>
                <p style={{ margin: 0, fontSize: "0.78rem", color: "#cbd5e1", lineHeight: "1.4" }}>"{dir.message}"</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Responsive Split: Left Guided Lesson Authoring Studio | Right Submitted & Draft Pipeline */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: "1.5rem", alignItems: "start" }}>
        {/* LEFT PANEL: GUIDED NaCCA LESSON AUTHORING STUDIO */}
        <div style={{
          background: "rgba(2, 6, 23, 0.78)",
          borderRadius: "14px",
          border: "1.5px solid rgba(212, 175, 55, 0.45)",
          padding: "1.25rem",
          boxShadow: "0 12px 30px rgba(0, 0, 0, 0.45)"
        }}>
          {/* Top Authoring Bar: Mode, Autosave, Template Picker */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px", marginBottom: "12px", borderBottom: "1px solid rgba(255,255,255,0.08)", paddingBottom: "10px" }}>
            <div>
              <h3 style={{ margin: 0, color: "#f6dd84", fontSize: "1.02rem", fontWeight: 900 }}>
                {form.id ? `✏️ Editing Lesson Note (Rev #${editingPlanMeta?.revisionNumber || 1})` : "📝 Guided NaCCA Lesson Plan Author"}
              </h3>
              <span style={{ fontSize: "0.73rem", color: "#94a3b8" }}>
                Completeness: <strong style={{ color: completenessPct >= 85 ? "#34d399" : "#fbbf24" }}>{completenessPct}%</strong> ({completedCount}/19 pre-teaching items)
                {lastAutosavedAt ? ` • Autosaved ${lastAutosavedAt}` : ""}
              </span>
            </div>
            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
              {hasRestorableAutosave && !form.id && (
                <button
                  type="button"
                  onClick={handleRestoreAutosave}
                  style={{ background: "rgba(56,189,248,0.18)", border: "1px solid #38bdf8", color: "#7dd3fc", borderRadius: "6px", padding: "4px 10px", fontSize: "0.74rem", fontWeight: 800, cursor: "pointer" }}
                >
                  ♻️ Restore Draft
                </button>
              )}
              <button
                type="button"
                onClick={() => setPreviewPlan({ ...form, teacherName: `${currentUser.firstName || ""} ${currentUser.lastName || ""}`.trim() || "Teacher", revisionNumber: editingPlanMeta?.revisionNumber || 1 })}
                style={{ background: "rgba(139,92,246,0.2)", border: "1px solid #a78bfa", color: "#ddd6fe", borderRadius: "6px", padding: "4px 10px", fontSize: "0.74rem", fontWeight: 800, cursor: "pointer" }}
              >
                👁️ Preview
              </button>
              <button
                type="button"
                onClick={handleResetEditor}
                style={{ background: "rgba(148,163,184,0.15)", border: "1px solid rgba(148,163,184,0.3)", color: "#cbd5e1", borderRadius: "6px", padding: "4px 10px", fontSize: "0.74rem", fontWeight: 700, cursor: "pointer" }}
              >
                ➕ New Blank
              </button>
            </div>
          </div>

          {/* Revision Feedback Banner when Teacher is Revising after Headmaster Comments */}
          {editingPlanMeta?.status === "REVISION_REQUIRED" && (
            <div
              data-testid="teacher-revision-feedback-banner"
              style={{
                background: "rgba(239, 68, 68, 0.14)",
                border: "1.5px solid #ef4444",
                borderRadius: "10px",
                padding: "10px 12px",
                marginBottom: "12px"
              }}
            >
              <strong style={{ color: "#fca5a5", fontSize: "0.84rem", display: "block", marginBottom: "4px" }}>
                ⚠️ Headmaster Requested Corrections ({editingPlanMeta.vettedBy || "Academic Supervisor"}):
              </strong>
              <p style={{ margin: "0 0 6px", color: "#fef2f2", fontSize: "0.82rem", fontStyle: "italic" }}>
                "{editingPlanMeta.headmasterRemarks}"
              </p>
              {editingPlanMeta.sectionComments && Object.keys(editingPlanMeta.sectionComments).length > 0 && (
                <ul style={{ margin: "4px 0 8px 16px", padding: 0, color: "#fecaca", fontSize: "0.76rem" }}>
                  {Object.entries(editingPlanMeta.sectionComments).map(([sec, msg]) => (
                    <li key={sec}><strong>{sec}:</strong> {msg}</li>
                  ))}
                </ul>
              )}
              <input
                type="text"
                className="filter-input"
                placeholder="Optional note to Headmaster explaining what you revised..."
                value={form.revisionNote}
                onChange={(e) => updateField("revisionNote", e.target.value)}
                style={{ width: "100%", padding: "6px 10px", fontSize: "0.78rem" }}
              />
            </div>
          )}

          {/* Subject-Adaptable Template Picker */}
          {templates.length > 0 && (
            <div style={{
              background: "rgba(8, 24, 51, 0.85)",
              border: "1px solid rgba(56, 189, 248, 0.35)",
              borderRadius: "10px",
              padding: "10px 12px",
              marginBottom: "12px"
            }}>
              <label style={{ display: "block", fontSize: "0.76rem", color: "#38bdf8", fontWeight: 800, marginBottom: "5px" }}>
                🧩 Optional Reusable Subject-Adaptable Lesson Scaffold (Editable — Never Fabricates NaCCA Codes)
              </label>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
                <select
                  data-testid="lesson-template-select"
                  className="filter-select"
                  value={selectedTemplateId}
                  onChange={(e) => handleApplyTemplate(e.target.value)}
                  style={{ flex: 1, minWidth: "220px", padding: "7px 10px", fontSize: "0.8rem" }}
                >
                  <option value="">-- Choose a subject scaffold to accelerate preparation --</option>
                  {templates.map((tpl) => (
                    <option key={tpl.id} value={tpl.id}>
                      {tpl.name} ({tpl.durationMinutes} mins)
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Progress Bar + Guided 5-Step Tabs */}
          <div style={{ marginBottom: "12px" }}>
            <div style={{ height: "6px", borderRadius: "999px", background: "rgba(148,163,184,0.2)", overflow: "hidden", marginBottom: "10px" }}>
              <div style={{
                width: `${completenessPct}%`,
                height: "100%",
                background: completenessPct >= 90 ? "linear-gradient(90deg, #10b981, #34d399)" : "linear-gradient(90deg, #d4af37, #38bdf8)",
                transition: "width 0.25s ease"
              }} />
            </div>
            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
              {STEP_TABS.map((tab) => {
                const stepMissingCount = missingSections.filter((m) => m.step === tab.id).length;
                const isActive = activeStep === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    data-testid={`lesson-step-tab-${tab.id}`}
                    onClick={() => setActiveStep(tab.id)}
                    style={{
                      flex: "1 1 110px",
                      padding: "7px 8px",
                      borderRadius: "8px",
                      border: isActive ? "2px solid #f6dd84" : "1px solid rgba(148,163,184,0.25)",
                      background: isActive ? "linear-gradient(135deg, #0d2247, #1d4ed8)" : "rgba(15, 23, 42, 0.7)",
                      color: isActive ? "#ffffff" : "#cbd5e1",
                      fontSize: "0.74rem",
                      fontWeight: 800,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "5px"
                    }}
                  >
                    <span>{tab.icon}</span>
                    <span>{tab.label}</span>
                    {tab.id <= 4 && stepMissingCount > 0 && (
                      <span style={{ background: "rgba(245,158,11,0.25)", color: "#fcd34d", padding: "1px 5px", borderRadius: "999px", fontSize: "0.66rem" }}>
                        {stepMissingCount}
                      </span>
                    )}
                    {tab.id <= 4 && stepMissingCount === 0 && (
                      <span style={{ color: "#34d399", fontSize: "0.72rem" }}>✓</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* STEP 1: LESSON IDENTIFICATION & NaCCA CURRICULUM ALIGNMENT */}
          {activeStep === 1 && (
            <div>
              <div style={fieldCardStyle}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "10px", marginBottom: "10px" }}>
                  <div>
                    <label style={labelStyle}>Document Category *</label>
                    <select
                      data-testid="lesson-plan-type"
                      className="filter-select"
                      value={form.planType}
                      onChange={(e) => updateField("planType", e.target.value)}
                      style={{ width: "100%", padding: "7px 10px", fontSize: "0.82rem" }}
                    >
                      <option value="LESSON_NOTES">📖 Classroom Lesson Notes (NaCCA)</option>
                      <option value="WEEKLY_PLAN">🗓️ Weekly Forecast Plan</option>
                      <option value="TERMLY_PLAN">📆 Termly Scheme of Work</option>
                      <option value="YEARLY_PLAN">📅 Yearly Academic Plan</option>
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Term / Semester *</label>
                    <select
                      className="filter-select"
                      value={form.term}
                      onChange={(e) => updateField("term", e.target.value)}
                      style={{ width: "100%", padding: "7px 10px", fontSize: "0.82rem" }}
                    >
                      <option value="Term 1">Term 1</option>
                      <option value="Term 2">Term 2</option>
                      <option value="Term 3">Term 3</option>
                      <option value="Semester 1">Semester 1</option>
                      <option value="Semester 2">Semester 2</option>
                      <option value="Full Academic Year">Full Academic Year</option>
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Week</label>
                    <input
                      type="text"
                      className="filter-input"
                      value={form.weekNumber}
                      onChange={(e) => updateField("weekNumber", e.target.value)}
                      placeholder="e.g. Week 5"
                      style={{ width: "100%", padding: "7px 10px", fontSize: "0.82rem" }}
                    />
                  </div>
                </div>

                <div style={{ marginBottom: "10px" }}>
                  <label style={labelStyle}>Lesson / Plan Title *</label>
                  <input
                    type="text"
                    data-testid="lesson-title-input"
                    className="filter-input"
                    value={form.title}
                    onChange={(e) => updateField("title", e.target.value)}
                    placeholder="e.g. Solving Linear Equations in One Variable Using Balance Method"
                    style={{ width: "100%", padding: "8px 10px", fontSize: "0.85rem" }}
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "10px", marginBottom: "10px" }}>
                  <div>
                    <label style={labelStyle}>Subject *</label>
                    <input
                      type="text"
                      data-testid="lesson-subject-input"
                      className="filter-input"
                      value={form.subjectName}
                      onChange={(e) => updateField("subjectName", e.target.value)}
                      placeholder="e.g. Mathematics"
                      style={{ width: "100%", padding: "7px 10px", fontSize: "0.82rem" }}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Class / Grade Level *</label>
                    <input
                      type="text"
                      data-testid="lesson-class-input"
                      className="filter-input"
                      value={form.className}
                      onChange={(e) => updateField("className", e.target.value)}
                      placeholder="e.g. JHS 2 (Basic 8)"
                      style={{ width: "100%", padding: "7px 10px", fontSize: "0.82rem" }}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Lesson Date</label>
                    <input
                      type="date"
                      className="filter-input"
                      value={form.lessonDate}
                      onChange={(e) => updateField("lessonDate", e.target.value)}
                      style={{ width: "100%", padding: "7px 10px", fontSize: "0.82rem" }}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Duration (Mins)</label>
                    <input
                      type="number"
                      min="15"
                      max="240"
                      className="filter-input"
                      value={form.durationMinutes}
                      onChange={(e) => updateField("durationMinutes", parseInt(e.target.value, 10) || 60)}
                      style={{ width: "100%", padding: "7px 10px", fontSize: "0.82rem" }}
                    />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "10px" }}>
                  <div>
                    <label style={labelStyle}>Strand (NaCCA)</label>
                    <input
                      type="text"
                      data-testid="lesson-strand-input"
                      className="filter-input"
                      value={form.strand}
                      onChange={(e) => updateField("strand", e.target.value)}
                      placeholder="e.g. Algebra / Diversity of Matter"
                      style={{ width: "100%", padding: "7px 10px", fontSize: "0.82rem" }}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Sub-Strand (NaCCA)</label>
                    <input
                      type="text"
                      data-testid="lesson-substrand-input"
                      className="filter-input"
                      value={form.subStrand}
                      onChange={(e) => updateField("subStrand", e.target.value)}
                      placeholder="e.g. Variables and Equations"
                      style={{ width: "100%", padding: "7px 10px", fontSize: "0.82rem" }}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Lesson Topic *</label>
                    <input
                      type="text"
                      data-testid="lesson-topic-input"
                      className="filter-input"
                      value={form.topic}
                      onChange={(e) => updateField("topic", e.target.value)}
                      placeholder="Specific focus of this lesson"
                      style={{ width: "100%", padding: "7px 10px", fontSize: "0.82rem" }}
                    />
                  </div>
                </div>
              </div>

              {/* NaCCA Standards & Indicators */}
              <div style={fieldCardStyle}>
                <label style={labelStyle}>1. Content Standard (Ghana NaCCA) *</label>
                <span style={hintStyle}>Copy the exact Content Standard from the official NaCCA curriculum for this class &amp; subject.</span>
                <textarea
                  rows={2}
                  data-testid="lesson-content-standard"
                  className="filter-input"
                  value={form.contentStandard}
                  onChange={(e) => updateField("contentStandard", e.target.value)}
                  placeholder="Enter verified NaCCA Content Standard code & statement..."
                  style={{ width: "100%", padding: "8px 10px", fontSize: "0.82rem", marginBottom: "10px" }}
                />

                <label style={labelStyle}>2. Learning Indicator *</label>
                <span style={hintStyle}>State the specific curriculum learning indicator learners will achieve.</span>
                <textarea
                  rows={2}
                  data-testid="lesson-learning-indicator"
                  className="filter-input"
                  value={form.learningIndicator}
                  onChange={(e) => updateField("learningIndicator", e.target.value)}
                  placeholder="Enter specific Learning Indicator from the curriculum..."
                  style={{ width: "100%", padding: "8px 10px", fontSize: "0.82rem", marginBottom: "10px" }}
                />

                <label style={labelStyle}>3. Performance Indicator *</label>
                <span style={hintStyle}>Describe the observable classroom evidence proving learners mastered the indicator.</span>
                <textarea
                  rows={2}
                  data-testid="lesson-performance-indicator"
                  className="filter-input"
                  value={form.performanceIndicator}
                  onChange={(e) => updateField("performanceIndicator", e.target.value)}
                  placeholder="e.g. Learners accurately solve 4 out of 5 exercises and justify steps..."
                  style={{ width: "100%", padding: "8px 10px", fontSize: "0.82rem", marginBottom: "10px" }}
                />

                <label style={labelStyle}>4. Core Competencies (Ghana NaCCA) *</label>
                <span style={hintStyle}>Click to toggle the competencies actively nurtured in this lesson:</span>
                <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "12px" }}>
                  {competencyOptions.map((comp) => {
                    const selected = form.coreCompetencies.includes(comp);
                    return (
                      <button
                        key={comp}
                        type="button"
                        onClick={() => toggleChip("coreCompetencies", comp)}
                        style={{
                          padding: "5px 10px",
                          borderRadius: "999px",
                          border: selected ? "1.5px solid #34d399" : "1px solid rgba(148,163,184,0.3)",
                          background: selected ? "rgba(16,185,129,0.22)" : "rgba(2,6,23,0.65)",
                          color: selected ? "#6ee7b7" : "#cbd5e1",
                          fontSize: "0.73rem",
                          fontWeight: 700,
                          cursor: "pointer"
                        }}
                      >
                        {selected ? "✓ " : "+ "}{comp}
                      </button>
                    );
                  })}
                </div>

                <label style={labelStyle}>5. Relevant Curriculum References *</label>
                <span style={hintStyle}>Cite official NaCCA syllabus section/page and approved textbook pages.</span>
                <input
                  type="text"
                  data-testid="lesson-curriculum-ref"
                  className="filter-input"
                  value={form.curriculumReferences}
                  onChange={(e) => updateField("curriculumReferences", e.target.value)}
                  placeholder="e.g. NaCCA Common Core Curriculum p. 34; Approved Learner Textbook pp. 40–45"
                  style={{ width: "100%", padding: "8px 10px", fontSize: "0.82rem" }}
                />
              </div>
            </div>
          )}

          {/* STEP 2: PREPARATION, RESOURCES, METHODS & DIFFERENTIATED LEARNING */}
          {activeStep === 2 && (
            <div>
              <div style={fieldCardStyle}>
                <label style={labelStyle}>6. Previous Knowledge / Entry Behaviour *</label>
                <span style={hintStyle}>What prior skills, concepts, or everyday community knowledge do learners already possess?</span>
                <textarea
                  rows={2}
                  data-testid="lesson-previous-knowledge"
                  className="filter-input"
                  value={form.previousKnowledge}
                  onChange={(e) => updateField("previousKnowledge", e.target.value)}
                  placeholder="State what learners already know that connects directly to today's topic..."
                  style={{ width: "100%", padding: "8px 10px", fontSize: "0.82rem", marginBottom: "10px" }}
                />

                <label style={labelStyle}>7. Teaching &amp; Learning Resources (TLRs) *</label>
                <span style={hintStyle}>List charts, concrete manipulatives, local improvised aids, lab apparatus, or digital materials.</span>
                <textarea
                  rows={2}
                  data-testid="lesson-tlrs"
                  className="filter-input"
                  value={form.teachingLearningResources}
                  onChange={(e) => updateField("teachingLearningResources", e.target.value)}
                  placeholder="e.g. Labelled chart, local bottle-cap counters, rulers, graph board, worksheet cards..."
                  style={{ width: "100%", padding: "8px 10px", fontSize: "0.82rem", marginBottom: "10px" }}
                />

                <label style={labelStyle}>8. Learner-Centred Teaching &amp; Learning Methods *</label>
                <span style={hintStyle}>Choose methods appropriate for this topic and add brief notes if desired:</span>
                <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "8px" }}>
                  {methodOptions.map((method) => {
                    const selected = form.teachingLearningMethods.includes(method);
                    return (
                      <button
                        key={method}
                        type="button"
                        onClick={() => toggleChip("teachingLearningMethods", method)}
                        style={{
                          padding: "5px 10px",
                          borderRadius: "999px",
                          border: selected ? "1.5px solid #38bdf8" : "1px solid rgba(148,163,184,0.3)",
                          background: selected ? "rgba(56,189,248,0.22)" : "rgba(2,6,23,0.65)",
                          color: selected ? "#7dd3fc" : "#cbd5e1",
                          fontSize: "0.73rem",
                          fontWeight: 700,
                          cursor: "pointer"
                        }}
                      >
                        {selected ? "✓ " : "+ "}{method}
                      </button>
                    );
                  })}
                </div>
                <input
                  type="text"
                  className="filter-input"
                  value={form.teachingLearningMethodsNotes}
                  onChange={(e) => updateField("teachingLearningMethodsNotes", e.target.value)}
                  placeholder="Optional note on how selected methods will be sequenced..."
                  style={{ width: "100%", padding: "7px 10px", fontSize: "0.8rem", marginBottom: "10px" }}
                />

                <label style={labelStyle}>9. Differentiated Learning (Support, Extension &amp; Inclusion) *</label>
                <span style={hintStyle}>Explain how you will scaffold struggling learners, stretch fast finishers, and include SEN/diverse needs.</span>
                <textarea
                  rows={3}
                  data-testid="lesson-differentiated"
                  className="filter-input"
                  value={form.differentiatedLearning}
                  onChange={(e) => updateField("differentiatedLearning", e.target.value)}
                  placeholder="Support (Remedial): ... | Extension (Fast Finishers): ... | Inclusion (SEN/Visual/Hearing): ..."
                  style={{ width: "100%", padding: "8px 10px", fontSize: "0.82rem" }}
                />
              </div>
            </div>
          )}

          {/* STEP 3: EXPECTED OUTCOMES, TEACHER ACTIVITIES & LEARNER ACTIVITIES */}
          {activeStep === 3 && (
            <div>
              <div style={fieldCardStyle}>
                <label style={labelStyle}>10. Expected Learning Outcomes *</label>
                <span style={hintStyle}>State measurable outcomes using action verbs (solve, demonstrate, construct, compare, explain).</span>
                <textarea
                  rows={3}
                  data-testid="lesson-outcomes"
                  className="filter-input"
                  value={form.expectedLearningOutcomes}
                  onChange={(e) => updateField("expectedLearningOutcomes", e.target.value)}
                  placeholder="By the end of the lesson, learners will be able to: (1)..., (2)..., (3)..."
                  style={{ width: "100%", padding: "8px 10px", fontSize: "0.82rem", marginBottom: "10px" }}
                />

                <label style={labelStyle}>11. Teacher Activities — What to Say, Model &amp; Demonstrate *</label>
                <span style={hintStyle}>Guide yourself step-by-step across Starter, Main Demonstration/Facilitation, Guided Coaching, and Questioning.</span>
                <textarea
                  rows={4}
                  data-testid="lesson-teacher-activities"
                  className="filter-input"
                  value={form.teacherActivities}
                  onChange={(e) => updateField("teacherActivities", e.target.value)}
                  placeholder="1. Starter (10 mins): ...&#10;2. Demonstration / Modelling (15 mins): ...&#10;3. Facilitation & Probing Questions (25 mins): ..."
                  style={{ width: "100%", padding: "8px 10px", fontSize: "0.82rem", marginBottom: "10px", lineHeight: "1.45" }}
                />

                <label style={labelStyle}>12. Learner Activities — Active Participation Tasks *</label>
                <span style={hintStyle}>Specify what learners actively do individually, in pairs, and in groups (avoid passive-only "listen and copy").</span>
                <textarea
                  rows={4}
                  data-testid="lesson-learner-activities"
                  className="filter-input"
                  value={form.learnerActivities}
                  onChange={(e) => updateField("learnerActivities", e.target.value)}
                  placeholder="1. Pair warm-up discussion...&#10;2. Hands-on guided group/pair task...&#10;3. Peer explanation & presentation..."
                  style={{ width: "100%", padding: "8px 10px", fontSize: "0.82rem", lineHeight: "1.45" }}
                />
              </div>
            </div>
          )}

          {/* STEP 4: ASSESSMENT, CONCLUSION/PLENARY, HOMEWORK & ATTACHMENT */}
          {activeStep === 4 && (
            <div>
              <div style={fieldCardStyle}>
                <label style={labelStyle}>13. Assessment / Evaluation *</label>
                <span style={hintStyle}>How will you verify every Expected Learning Outcome? (oral checks, rubric, exit ticket, practical checklist)</span>
                <textarea
                  rows={3}
                  data-testid="lesson-assessment"
                  className="filter-input"
                  value={form.assessmentEvaluation}
                  onChange={(e) => updateField("assessmentEvaluation", e.target.value)}
                  placeholder="List exact questions, formative checks, or practical evaluation criteria..."
                  style={{ width: "100%", padding: "8px 10px", fontSize: "0.82rem", marginBottom: "10px" }}
                />

                <label style={labelStyle}>14. Conclusion / Plenary *</label>
                <span style={hintStyle}>How will learners summarise key learning points and clear remaining misconceptions before closing?</span>
                <textarea
                  rows={2}
                  data-testid="lesson-conclusion"
                  className="filter-input"
                  value={form.conclusionPlenary}
                  onChange={(e) => updateField("conclusionPlenary", e.target.value)}
                  placeholder="e.g. Learners restate key rule in pairs and review one common misconception on the board..."
                  style={{ width: "100%", padding: "8px 10px", fontSize: "0.82rem", marginBottom: "10px" }}
                />

                <label style={labelStyle}>15. Assignment / Homework *</label>
                <span style={hintStyle}>Provide clear, doable take-home reinforcement or community inquiry aligned to the lesson.</span>
                <textarea
                  rows={2}
                  data-testid="lesson-homework"
                  className="filter-input"
                  value={form.assignmentHomework}
                  onChange={(e) => updateField("assignmentHomework", e.target.value)}
                  placeholder="e.g. Complete exercises 1-4 on page 44 and bring 1 real-life example from home..."
                  style={{ width: "100%", padding: "8px 10px", fontSize: "0.82rem", marginBottom: "12px" }}
                />

                <div style={{ background: "rgba(2,6,23,0.65)", padding: "10px", borderRadius: "8px", border: "1px dashed rgba(56,189,248,0.35)" }}>
                  <label style={{ display: "block", fontSize: "0.78rem", color: "#38bdf8", fontWeight: 700, marginBottom: "6px" }}>
                    📎 Optional Supporting Worksheet / Diagram / PDF Attachment
                  </label>
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.png,.jpg"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const sz = file.size > 1024 * 1024 ? `${(file.size / (1024 * 1024)).toFixed(2)} MB` : `${(file.size / 1024).toFixed(1)} KB`;
                        setUploadedFile({ name: file.name, size: sz });
                        updateField("resourcesAttached", file.name);
                        setIsFileVerified(false);
                      }
                    }}
                    style={{ fontSize: "0.78rem", color: "#94a3b8" }}
                  />
                  {uploadedFile && (
                    <FileUploadVerificationCard
                      file={uploadedFile}
                      isVerified={isFileVerified}
                      onVerify={() => setIsFileVerified(true)}
                      onRemove={() => {
                        setUploadedFile(null);
                        updateField("resourcesAttached", "");
                        setIsFileVerified(false);
                      }}
                      label="Lesson Supporting Document"
                      category="NaCCA Curriculum & Vetting"
                    />
                  )}
                </div>
              </div>
            </div>
          )}

          {/* STEP 5: POST-TEACHING REFLECTION & PEDAGOGICAL QUALITY CHECK */}
          {activeStep === 5 && (
            <div>
              <div style={fieldCardStyle}>
                <label style={labelStyle}>16. Teacher's Reflection (Record AFTER Teaching in Class)</label>
                <span style={{ ...hintStyle, color: "#fde68a" }}>
                  ⚠️ Authenticity Rule: Leave blank while preparing before class. Complete this honestly after teaching (what went well, learner challenges, adjustments for next lesson). Even after Headmaster approval, you can always add your post-lesson reflection!
                </span>
                <textarea
                  rows={3}
                  data-testid="lesson-reflection"
                  className="filter-input"
                  value={form.teacherReflection}
                  onChange={(e) => updateField("teacherReflection", e.target.value)}
                  placeholder="Record genuine post-lesson reflection after classroom delivery..."
                  style={{ width: "100%", padding: "8px 10px", fontSize: "0.82rem" }}
                />
              </div>

              {/* Missing Sections Notice */}
              <div style={{
                background: missingSections.length === 0 ? "rgba(16,185,129,0.12)" : "rgba(245,158,11,0.12)",
                border: `1px solid ${missingSections.length === 0 ? "#10b981" : "#f59e0b"}`,
                borderRadius: "10px",
                padding: "10px 12px",
                marginBottom: "12px"
              }}>
                <strong style={{ color: missingSections.length === 0 ? "#34d399" : "#fcd34d", fontSize: "0.82rem", display: "block", marginBottom: "6px" }}>
                  {missingSections.length === 0
                    ? "✅ All 19 Pre-Teaching NaCCA & Identification Sections Are Filled!"
                    : `⚠️ ${missingSections.length} Missing Section(s) Detected — Click any pill to jump directly:`}
                </strong>
                {missingSections.length > 0 && (
                  <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                    {missingSections.map((m) => (
                      <button
                        key={m.key}
                        type="button"
                        onClick={() => setActiveStep(m.step)}
                        style={{
                          padding: "3px 9px",
                          borderRadius: "999px",
                          border: "1px solid rgba(251,191,36,0.5)",
                          background: "rgba(2,6,23,0.7)",
                          color: "#fde68a",
                          fontSize: "0.72rem",
                          fontWeight: 700,
                          cursor: "pointer"
                        }}
                      >
                        Step {m.step}: {m.label} →
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Pedagogical Alignment Quality Check */}
              <div style={fieldCardStyle}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px", marginBottom: "8px" }}>
                  <div>
                    <strong style={{ color: "#38bdf8", fontSize: "0.86rem" }}>🔎 Pedagogical Alignment &amp; Quality Assistant</strong>
                    <span style={{ display: "block", fontSize: "0.72rem", color: "#94a3b8" }}>
                      Verifies 7 learner-centred alignment criteria without fabricating curriculum codes or reflections.
                    </span>
                  </div>
                  <button
                    type="button"
                    data-testid="lesson-quality-check-btn"
                    disabled={savingMode === "QUALITY"}
                    onClick={handleRunQualityCheck}
                    style={{
                      background: "linear-gradient(135deg, #0284c7, #2563eb)",
                      color: "#fff",
                      border: "none",
                      borderRadius: "8px",
                      padding: "7px 14px",
                      fontSize: "0.78rem",
                      fontWeight: 800,
                      cursor: "pointer"
                    }}
                  >
                    {savingMode === "QUALITY" ? "⏳ Checking..." : "⚡ Check Pedagogical Alignment"}
                  </button>
                </div>

                {qualityReport && (
                  <div data-testid="lesson-quality-report" style={{ marginTop: "8px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 10px", background: "rgba(2,6,23,0.75)", borderRadius: "8px", marginBottom: "8px" }}>
                      <span style={{ fontSize: "0.8rem", color: "#f8fafc", fontWeight: 800 }}>
                        Readiness Score: <span style={{ color: qualityReport.readyForVetting ? "#34d399" : "#fbbf24" }}>{qualityReport.readinessScore}%</span>
                      </span>
                      <span style={{ fontSize: "0.74rem", color: qualityReport.readyForVetting ? "#34d399" : "#fbbf24", fontWeight: 700 }}>
                        {qualityReport.readyForVetting ? "✓ Ready for Headmaster Vetting" : "Review suggested improvements below"}
                      </span>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                      {(qualityReport.alignmentChecks || []).map((chk) => (
                        <div key={chk.id} style={{
                          padding: "7px 10px",
                          borderRadius: "7px",
                          background: chk.status === "PASS" ? "rgba(16,185,129,0.1)" : chk.status === "REVIEW" ? "rgba(245,158,11,0.1)" : "rgba(239,68,68,0.1)",
                          borderLeft: `3px solid ${chk.status === "PASS" ? "#10b981" : chk.status === "REVIEW" ? "#f59e0b" : "#ef4444"}`
                        }}>
                          <div style={{ fontSize: "0.76rem", fontWeight: 800, color: chk.status === "PASS" ? "#6ee7b7" : chk.status === "REVIEW" ? "#fcd34d" : "#fca5a5" }}>
                            {chk.status === "PASS" ? "✓" : chk.status === "REVIEW" ? "⚠️" : "✕"} {chk.title}
                          </div>
                          <div style={{ fontSize: "0.73rem", color: "#cbd5e1", marginTop: "2px" }}>{chk.feedback}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Bottom Step Navigation + Save Draft & Submit Actions */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px", marginTop: "12px", paddingTop: "12px", borderTop: "1px solid rgba(255,255,255,0.1)" }}>
            <div style={{ display: "flex", gap: "6px" }}>
              <button
                type="button"
                disabled={activeStep <= 1}
                onClick={() => setActiveStep((s) => Math.max(1, s - 1))}
                style={{
                  padding: "7px 12px",
                  borderRadius: "7px",
                  border: "1px solid rgba(148,163,184,0.3)",
                  background: "rgba(15,23,42,0.8)",
                  color: activeStep <= 1 ? "#475569" : "#e2e8f0",
                  fontSize: "0.78rem",
                  fontWeight: 700,
                  cursor: activeStep <= 1 ? "not-allowed" : "pointer"
                }}
              >
                ← Back
              </button>
              {activeStep < 5 && (
                <button
                  type="button"
                  onClick={() => setActiveStep((s) => Math.min(5, s + 1))}
                  style={{
                    padding: "7px 12px",
                    borderRadius: "7px",
                    border: "1px solid #38bdf8",
                    background: "rgba(56,189,248,0.18)",
                    color: "#7dd3fc",
                    fontSize: "0.78rem",
                    fontWeight: 800,
                    cursor: "pointer"
                  }}
                >
                  Next Step →
                </button>
              )}
            </div>

            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              <button
                type="button"
                data-testid="lesson-save-draft-btn"
                disabled={Boolean(savingMode)}
                onClick={() => handleSaveOrSubmit("DRAFT")}
                style={{
                  padding: "8px 14px",
                  borderRadius: "8px",
                  border: "1.5px solid #d4af37",
                  background: "rgba(212, 175, 55, 0.14)",
                  color: "#f6dd84",
                  fontSize: "0.82rem",
                  fontWeight: 800,
                  cursor: "pointer"
                }}
              >
                {savingMode === "DRAFT" ? "⏳ Saving Draft..." : "💾 Save Draft"}
              </button>
              <button
                type="button"
                data-testid="lesson-submit-vetting-btn"
                disabled={Boolean(savingMode)}
                onClick={() => handleSaveOrSubmit("PENDING_VETTING")}
                style={{
                  padding: "8px 16px",
                  borderRadius: "8px",
                  border: "1.5px solid #38bdf8",
                  background: "linear-gradient(135deg, #0284c7, #0369a1)",
                  color: "#ffffff",
                  fontSize: "0.82rem",
                  fontWeight: 900,
                  cursor: "pointer",
                  boxShadow: "0 4px 14px rgba(2, 132, 199, 0.4)"
                }}
              >
                {savingMode === "SUBMIT"
                  ? "⏳ Submitting..."
                  : editingPlanMeta?.status === "REVISION_REQUIRED"
                    ? "🔄 Resubmit Revised Plan for Vetting"
                    : "📤 Submit to Headmaster for Vetting"}
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT PANEL: TEACHER'S DRAFTS, SUBMITTED PLANS & VETTING FEEDBACK LEDGER */}
        <div>
          <div style={{ background: "rgba(15, 23, 42, 0.72)", padding: "12px 14px", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.1)", marginBottom: "12px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px", flexWrap: "wrap", marginBottom: "8px" }}>
              <strong style={{ fontSize: "0.88rem", color: "#f8fafc" }}>
                📚 My Lesson Plans &amp; Vetting Pipeline ({filteredPlans.length})
              </strong>
              <input
                type="text"
                className="filter-input"
                placeholder="🔍 Search title, subject, strand, topic..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ padding: "5px 10px", fontSize: "0.78rem", minWidth: "200px" }}
              />
            </div>

            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "6px" }}>
              {[
                { key: "ALL", label: "All Types" },
                { key: "LESSON_NOTES", label: "📖 Lesson Notes" },
                { key: "WEEKLY_PLAN", label: "🗓️ Weekly" },
                { key: "TERMLY_PLAN", label: "📆 Termly" },
                { key: "YEARLY_PLAN", label: "📅 Yearly" }
              ].map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setTypeFilter(t.key)}
                  style={{
                    background: typeFilter === t.key ? "#0284c7" : "rgba(255,255,255,0.05)",
                    color: typeFilter === t.key ? "#fff" : "#94a3b8",
                    border: typeFilter === t.key ? "1px solid #38bdf8" : "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "6px",
                    padding: "4px 9px",
                    fontSize: "0.73rem",
                    fontWeight: 700,
                    cursor: "pointer"
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
              {[
                { key: "ALL", label: "All Statuses" },
                { key: "DRAFT", label: "📝 Drafts" },
                { key: "PENDING_VETTING", label: "⏳ Pending Vetting" },
                { key: "UNDER_REVIEW", label: "🟡 Under Review" },
                { key: "REVISION_REQUIRED", label: "⚠️ Revisions" },
                { key: "VETTED_APPROVED", label: "🟢 Approved" }
              ].map((s) => (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => setStatusFilter(s.key)}
                  style={{
                    background: statusFilter === s.key ? "#334155" : "transparent",
                    color: statusFilter === s.key ? "#f8fafc" : "#94a3b8",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "6px",
                    padding: "3px 8px",
                    fontSize: "0.72rem",
                    fontWeight: 700,
                    cursor: "pointer"
                  }}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Plans List */}
          <div style={{ display: "flex", flexDirection: "column", gap: "12px", maxHeight: "760px", overflowY: "auto", paddingRight: "4px" }}>
            {filteredPlans.length === 0 ? (
              <div style={{ textAlign: "center", padding: "2.5rem 1.25rem", background: "rgba(15, 23, 42, 0.45)", borderRadius: "12px", border: "1px dashed rgba(148,163,184,0.25)" }}>
                <div style={{ fontSize: "2rem", marginBottom: "6px" }}>📘</div>
                <strong style={{ color: "#f8fafc", display: "block", marginBottom: "4px" }}>No Matching Lesson Plans Yet</strong>
                <span style={{ color: "#94a3b8", fontSize: "0.82rem" }}>
                  Use the Guided NaCCA Lesson Author on the left to prepare a draft or submit your lesson notes for Headmaster vetting.
                </span>
              </div>
            ) : (
              filteredPlans.map((plan) => {
                const st = getStatusDisplay(plan.status);
                const sectionCommentEntries = plan.sectionComments && typeof plan.sectionComments === "object"
                  ? Object.entries(plan.sectionComments).filter(([, v]) => String(v || "").trim())
                  : [];
                const history = Array.isArray(plan.reviewHistory) ? plan.reviewHistory : [];
                const isHistoryOpen = expandedHistoryId === plan.id;

                return (
                  <div
                    key={plan.id}
                    data-testid={`teacher-lesson-card-${plan.id}`}
                    style={{
                      background: "rgba(15, 23, 42, 0.88)",
                      borderRadius: "12px",
                      border: `1.5px solid ${st.border}`,
                      padding: "14px",
                      boxShadow: "0 6px 18px rgba(0,0,0,0.35)"
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px", flexWrap: "wrap", marginBottom: "6px" }}>
                      <div style={{ display: "flex", gap: "6px", alignItems: "center", flexWrap: "wrap" }}>
                        <span style={{ background: "rgba(56,189,248,0.16)", color: "#7dd3fc", fontSize: "0.7rem", fontWeight: 800, padding: "2px 8px", borderRadius: "6px" }}>
                          {plan.planType?.replace("_", " ")}
                        </span>
                        <span style={{ fontSize: "0.74rem", color: "#cbd5e1", fontWeight: 700 }}>
                          {plan.subjectName} • {plan.className}
                        </span>
                        <span style={{ fontSize: "0.7rem", color: "#94a3b8" }}>
                          Rev #{plan.revisionNumber || 1}
                        </span>
                      </div>
                      <span style={{ background: st.bg, color: st.color, border: `1px solid ${st.border}`, fontSize: "0.71rem", fontWeight: 900, padding: "2px 9px", borderRadius: "999px" }}>
                        {st.label}
                      </span>
                    </div>

                    <h4 style={{ margin: "0 0 6px", color: "#f8fafc", fontSize: "0.96rem", fontWeight: 800 }}>
                      {plan.title}
                    </h4>

                    <div style={{ fontSize: "0.78rem", color: "#cbd5e1", display: "flex", flexDirection: "column", gap: "3px", marginBottom: "8px" }}>
                      <div><strong>Topic:</strong> {plan.topic || "—"} {plan.strand ? `• Strand: ${plan.strand}` : ""}</div>
                      <div style={{ color: "#94a3b8" }}>
                        {plan.term} • {plan.weekNumber} • {plan.durationMinutes || 60} mins {plan.lessonDate ? `• ${plan.lessonDate}` : ""}
                        {plan.qualityReport?.readinessScore != null ? ` • Readiness: ${plan.qualityReport.readinessScore}%` : ""}
                      </div>
                      {plan.teacherReflection && (
                        <div style={{ color: "#6ee7b7", fontSize: "0.74rem" }}>
                          ✓ Post-lesson reflection recorded
                        </div>
                      )}
                    </div>

                    {/* Headmaster / Supervisor Feedback Box */}
                    {plan.headmasterRemarks && (
                      <div style={{
                        background: plan.status === "VETTED_APPROVED" ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.12)",
                        borderLeft: `3px solid ${plan.status === "VETTED_APPROVED" ? "#10b981" : "#ef4444"}`,
                        borderRadius: "6px",
                        padding: "8px 10px",
                        marginBottom: "8px"
                      }}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.72rem", marginBottom: "3px" }}>
                          <strong style={{ color: plan.status === "VETTED_APPROVED" ? "#34d399" : "#fca5a5" }}>
                            💬 Supervisor Vetting Remarks:
                          </strong>
                          <span style={{ color: "#94a3b8" }}>{plan.vettedAt ? new Date(plan.vettedAt).toLocaleString() : ""}</span>
                        </div>
                        <p style={{ margin: 0, fontSize: "0.8rem", color: "#f8fafc", fontStyle: "italic" }}>"{plan.headmasterRemarks}"</p>
                        {sectionCommentEntries.length > 0 && (
                          <div style={{ marginTop: "6px", fontSize: "0.74rem", color: "#fde68a" }}>
                            <strong>Itemized Comments:</strong>
                            {sectionCommentEntries.map(([sec, msg]) => (
                              <div key={sec}>• <strong>{sec}:</strong> {msg}</div>
                            ))}
                          </div>
                        )}
                        <div style={{ fontSize: "0.7rem", color: "#94a3b8", marginTop: "3px" }}>— {plan.vettedBy || "Academic Supervisor"}</div>
                      </div>
                    )}

                    {/* Action Bar */}
                    <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", alignItems: "center", paddingTop: "8px", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
                      <button
                        type="button"
                        onClick={() => setPreviewPlan(plan)}
                        style={{ background: "rgba(56,189,248,0.15)", border: "1px solid #38bdf8", color: "#7dd3fc", borderRadius: "6px", padding: "5px 10px", fontSize: "0.74rem", fontWeight: 800, cursor: "pointer" }}
                      >
                        👁️ Preview
                      </button>
                      <button
                        type="button"
                        onClick={() => handlePrintLessonPlan(plan)}
                        style={{ background: "rgba(212,175,55,0.15)", border: "1px solid #d4af37", color: "#f6dd84", borderRadius: "6px", padding: "5px 10px", fontSize: "0.74rem", fontWeight: 800, cursor: "pointer" }}
                      >
                        🖨️ Print / PDF
                      </button>
                      {(plan.status === "DRAFT" || plan.status === "REVISION_REQUIRED" || plan.status === "PENDING_VETTING") && (
                        <button
                          type="button"
                          data-testid={`teacher-edit-lesson-${plan.id}`}
                          onClick={() => handleLoadPlanForEdit(plan)}
                          style={{
                            background: plan.status === "REVISION_REQUIRED" ? "rgba(239,68,68,0.22)" : "rgba(168,85,247,0.2)",
                            border: `1px solid ${plan.status === "REVISION_REQUIRED" ? "#ef4444" : "#a855f7"}`,
                            color: plan.status === "REVISION_REQUIRED" ? "#fca5a5" : "#d8b4fe",
                            borderRadius: "6px",
                            padding: "5px 10px",
                            fontSize: "0.74rem",
                            fontWeight: 800,
                            cursor: "pointer"
                          }}
                        >
                          {plan.status === "REVISION_REQUIRED" ? "✏️ Revise & Resubmit" : "✏️ Edit"}
                        </button>
                      )}
                      {plan.status === "VETTED_APPROVED" && (
                        <button
                          type="button"
                          data-testid={`teacher-reflect-lesson-${plan.id}`}
                          onClick={() => {
                            setReflectionModalPlan(plan);
                            setReflectionDraftText(plan.teacherReflection || "");
                          }}
                          style={{ background: "rgba(16,185,129,0.18)", border: "1px solid #10b981", color: "#6ee7b7", borderRadius: "6px", padding: "5px 10px", fontSize: "0.74rem", fontWeight: 800, cursor: "pointer" }}
                        >
                          📝 {plan.teacherReflection ? "Update Reflection" : "Add Post-Lesson Reflection"}
                        </button>
                      )}
                      {plan.status === "DRAFT" && (
                        <button
                          type="button"
                          onClick={() => handleDeleteDraft(plan)}
                          style={{ background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.45)", color: "#fca5a5", borderRadius: "6px", padding: "5px 9px", fontSize: "0.73rem", fontWeight: 700, cursor: "pointer" }}
                        >
                          🗑️ Delete
                        </button>
                      )}
                      {history.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setExpandedHistoryId(isHistoryOpen ? null : plan.id)}
                          style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.15)", color: "#cbd5e1", borderRadius: "6px", padding: "5px 9px", fontSize: "0.72rem", fontWeight: 700, cursor: "pointer" }}
                        >
                          🕒 History ({history.length})
                        </button>
                      )}
                      {typeof onOpenDetailPage === "function" && (
                        <button
                          type="button"
                          onClick={() => onOpenDetailPage(plan)}
                          style={{ marginLeft: "auto", background: "transparent", border: "1px solid rgba(56,189,248,0.4)", color: "#38bdf8", borderRadius: "6px", padding: "5px 9px", fontSize: "0.72rem", fontWeight: 700, cursor: "pointer" }}
                        >
                          Full Page ↗
                        </button>
                      )}
                    </div>

                    {/* Collapsible Chronological Review History */}
                    {isHistoryOpen && (
                      <div style={{ marginTop: "8px", padding: "8px 10px", borderRadius: "8px", background: "rgba(2,6,23,0.7)", border: "1px solid rgba(148,163,184,0.2)", fontSize: "0.73rem" }}>
                        <strong style={{ color: "#f6dd84", display: "block", marginBottom: "5px" }}>🕒 Chronological Review &amp; Revision History</strong>
                        {history.map((ev, idx) => (
                          <div key={ev.id || idx} style={{ padding: "4px 0", borderBottom: idx < history.length - 1 ? "1px solid rgba(255,255,255,0.06)" : "none" }}>
                            <span style={{ color: "#38bdf8", fontWeight: 800 }}>Rev #{ev.revisionNumber || 1} • {ev.action}</span>
                            <span style={{ color: "#94a3b8" }}> — {ev.actorName} ({ev.actorRole}) • {ev.timestamp ? new Date(ev.timestamp).toLocaleString() : ""}</span>
                            {ev.remarks && <div style={{ color: "#cbd5e1", marginTop: "2px" }}>"{ev.remarks}"</div>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* PORTALED LESSON PREVIEW & PRINT MODAL */}
      {previewPlan && typeof document !== "undefined" && createPortal(
        <div className="role-modal-backdrop" style={{ zIndex: 100001 }} onClick={() => setPreviewPlan(null)}>
          <div
            className="role-modal-card"
            data-testid="lesson-preview-modal"
            style={{ maxWidth: "860px", width: "96%", maxHeight: "90vh", overflowY: "auto", background: "#0b1426", border: "2px solid #d4af37", borderRadius: "16px", padding: "22px" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px", flexWrap: "wrap", borderBottom: "1px solid rgba(255,255,255,0.12)", paddingBottom: "12px", marginBottom: "14px" }}>
              <div>
                <h3 style={{ margin: 0, color: "#f6dd84", fontSize: "1.1rem", fontWeight: 900 }}>
                  📖 FORMATTED NaCCA LESSON NOTE PREVIEW
                </h3>
                <span style={{ fontSize: "0.78rem", color: "#94a3b8" }}>
                  {previewPlan.subjectName} • {previewPlan.className} • {previewPlan.term} ({previewPlan.weekNumber}) • {previewPlan.durationMinutes || 60} mins
                </span>
              </div>
              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  type="button"
                  onClick={() => handlePrintLessonPlan(previewPlan)}
                  style={{ background: "linear-gradient(135deg, #f6dd84, #d4af37)", color: "#081833", border: "none", borderRadius: "8px", padding: "7px 14px", fontSize: "0.8rem", fontWeight: 900, cursor: "pointer" }}
                >
                  🖨️ Print / Export PDF
                </button>
                <button type="button" className="modal-close-btn" onClick={() => setPreviewPlan(null)}>✕</button>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "8px", background: "rgba(2,6,23,0.7)", padding: "12px", borderRadius: "10px", marginBottom: "14px", fontSize: "0.8rem", color: "#e2e8f0" }}>
              <div><strong>Title:</strong> {previewPlan.title || "—"}</div>
              <div><strong>Topic:</strong> {previewPlan.topic || "—"}</div>
              <div><strong>Strand:</strong> {previewPlan.strand || "—"}</div>
              <div><strong>Sub-Strand:</strong> {previewPlan.subStrand || "—"}</div>
              <div><strong>Lesson Date:</strong> {previewPlan.lessonDate || "—"}</div>
              <div><strong>Status:</strong> {getStatusDisplay(previewPlan.status).label}</div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {NACCA_SECTION_DEFINITIONS.map((sec) => {
                const raw = previewPlan[sec.key];
                const displayVal = Array.isArray(raw) ? raw.join(" • ") : String(raw || "").trim();
                return (
                  <div key={sec.key} style={{ background: "rgba(15,23,42,0.8)", border: "1px solid rgba(148,163,184,0.2)", borderRadius: "8px", padding: "10px 12px" }}>
                    <div style={{ fontSize: "0.76rem", fontWeight: 800, color: "#f6dd84", marginBottom: "4px" }}>{sec.label}</div>
                    <div style={{ fontSize: "0.82rem", color: displayVal ? "#f1f5f9" : "#64748b", whiteSpace: "pre-wrap", lineHeight: "1.45" }}>
                      {displayVal || (sec.key === "teacherReflection" ? "To be recorded honestly by teacher after classroom delivery." : "Not yet filled.")}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* PORTALED POST-LESSON REFLECTION MODAL (FOR APPROVED LESSONS) */}
      {reflectionModalPlan && typeof document !== "undefined" && createPortal(
        <div className="role-modal-backdrop" style={{ zIndex: 100001 }} onClick={() => setReflectionModalPlan(null)}>
          <div
            className="role-modal-card"
            data-testid="post-lesson-reflection-modal"
            style={{ maxWidth: "560px", width: "94%", background: "#0b1426", border: "2px solid #10b981", borderRadius: "16px", padding: "22px" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
              <h3 style={{ margin: 0, color: "#34d399", fontSize: "1.05rem", fontWeight: 900 }}>
                📝 Post-Teaching Teacher's Reflection
              </h3>
              <button type="button" className="modal-close-btn" onClick={() => setReflectionModalPlan(null)}>✕</button>
            </div>
            <p style={{ margin: "0 0 10px", fontSize: "0.82rem", color: "#cbd5e1" }}>
              Lesson: <strong>{reflectionModalPlan.title}</strong> ({reflectionModalPlan.className})<br />
              Record authentic classroom observations after teaching (what worked well, misconceptions encountered, learners needing follow-up, and improvements for next time). Your <strong>Vetted &amp; Approved</strong> status stays intact.
            </p>
            <form onSubmit={handleSavePostLessonReflection}>
              <textarea
                rows={5}
                required
                data-testid="post-lesson-reflection-input"
                className="filter-input"
                value={reflectionDraftText}
                onChange={(e) => setReflectionDraftText(e.target.value)}
                placeholder="Write your honest reflection after teaching this lesson..."
                style={{ width: "100%", padding: "10px", fontSize: "0.84rem", marginBottom: "12px" }}
              />
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
                <button type="button" className="btn-secondary" onClick={() => setReflectionModalPlan(null)}>Cancel</button>
                <button
                  type="submit"
                  data-testid="save-post-lesson-reflection-btn"
                  disabled={savingMode === "REFLECTION"}
                  className="btn-primary"
                  style={{ background: "linear-gradient(135deg, #10b981, #059669)", fontWeight: 800 }}
                >
                  {savingMode === "REFLECTION" ? "⏳ Saving..." : "✅ Save Reflection"}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
