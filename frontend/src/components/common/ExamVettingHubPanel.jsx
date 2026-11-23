import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import apiClient from "../../api/client/apiClient";
import {
  getActiveInstitutionType,
  getInstitutionRoleProfile,
  getAllowedClassesForCurrentTier,
  getAllowedSubjectsForCurrentTier
} from "../../utils/institutionScope";
import { checkDemoEntryLimit, trackDemoEntryCreated } from "../../utils/demoLimitGuard";
import { navigateToDetail } from "../../utils/universalNavigation";
import FileUploadVerificationCard from "./FileUploadVerificationCard";

const STATUS_BADGES = {
  PENDING_HEADMASTER_VETTING: {
    label: "Pending Headmaster Vetting",
    bg: "rgba(245, 158, 11, 0.16)",
    border: "#f59e0b",
    color: "#fbbf24"
  },
  CONFIRMED_ONGOING: {
    label: "Confirmed for Ongoing Exams",
    bg: "rgba(16, 185, 129, 0.16)",
    border: "#10b981",
    color: "#34d399"
  },
  REVISION_REQUESTED: {
    label: "Revision Requested",
    bg: "rgba(249, 115, 22, 0.16)",
    border: "#f97316",
    color: "#fdba74"
  },
  REJECTED: {
    label: "Rejected by Vetting",
    bg: "rgba(239, 68, 68, 0.16)",
    border: "#ef4444",
    color: "#fca5a5"
  }
};

const TIER_LABELS = {
  NURSERY_TO_JHS: "Basic School (Nursery – JHS)",
  SENIOR_HIGH_SCHOOL: "Senior High School (SHS)",
  TECHNICAL: "Technical & Vocational (TVET)",
  UNIVERSITY: "University / Tertiary"
};

/**
 * ExamVettingHubPanel.jsx
 * Unified End-of-Term & Semester Examination Vetting & Confirmation Engine
 * Works across ALL 4 Institution Tiers (Basic/JHS, SHS, TVET, University).
 * - mode="TEACHER": Teachers/Lecturers draft & submit end-of-term or semester exams
 *   to the Headmaster / Principal / Rector / Vice Chancellor for vetting and confirmation,
 *   inspect remarks, and revise & resubmit if requested.
 * - mode="HEADMASTER": Headmasters / Principals / Deans inspect full question papers,
 *   confirm exams for ongoing examinations (automatically unlocking them on Student portals),
 *   request revisions with remarks, or reject unready papers.
 * Strictly zero tooltips.
 */
export default function ExamVettingHubPanel({
  mode = "TEACHER", // "TEACHER" | "HEADMASTER"
  currentUser = null,
  availableClasses = [],
  existingExams = [],
  returnTab = "exams",
  onExamConfirmed = null,
  onFeedback = null
}) {
  const navigate = useNavigate();
  const [institutionType, setInstitutionType] = useState(() => getActiveInstitutionType());
  const profile = getInstitutionRoleProfile(institutionType);
  const tierClasses = getAllowedClassesForCurrentTier(institutionType);
  const tierSubjects = getAllowedSubjectsForCurrentTier(institutionType);

  const isSemesterTier = institutionType === "UNIVERSITY" || institutionType === "SENIOR_HIGH_SCHOOL";
  const periodOptions =
    institutionType === "UNIVERSITY"
      ? ["Semester 1 (End of Semester)", "Semester 2 (End of Semester)", "Supplementary / Resit Semester"]
      : institutionType === "TECHNICAL"
        ? ["Semester 1 — CBT & Trade Exam", "Semester 2 — CBT & Trade Exam", "End of Term Practical & Theory Exam"]
        : institutionType === "SENIOR_HIGH_SCHOOL"
          ? ["Semester 1 End-of-Semester Exam", "Semester 2 End-of-Semester Exam", "End of Term Mock / WASSCE Prep"]
          : ["Term 1 End-of-Term Exam", "Term 2 End-of-Term Exam", "Term 3 End-of-Term / Promotion Exam"];

  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [inspectingItem, setInspectingItem] = useState(null);
  const [reviewRemarks, setReviewRemarks] = useState("");
  const [editingRevisionId, setEditingRevisionId] = useState(null);
  const [resubmitNote, setResubmitNote] = useState("");
  const [fileVerified, setFileVerified] = useState(false);

  const defaultClassName =
    availableClasses?.[0]?.name || tierClasses?.[0]?.name || "Assigned Class Cohort";
  const defaultSubject = tierSubjects?.[0] || "Core Mathematics";

  const [form, setForm] = useState({
    title: "",
    examCategory: isSemesterTier ? "END_OF_SEMESTER" : "END_OF_TERM",
    academicTerm: periodOptions[0],
    academicYear: "2026-2027",
    subjectCode: "CORE-101",
    subjectName: defaultSubject,
    className: defaultClassName,
    examDate: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
    startTime: "09:00 AM",
    endTime: "11:30 AM",
    durationMinutes: 120,
    totalMarks: 100,
    passMarks: 50,
    examMode: "HYBRID",
    syllabusScope: "Complete End-of-Term / Semester Syllabus Units",
    instructions: "Read every section carefully. No unauthorized materials permitted.",
    markingSchemeNotes: "Section A: Objective (40 marks) • Section B: Structured Theory / Essay (60 marks)",
    typedQuestionText: "",
    uploadedDocName: "",
    uploadedDocData: "",
    uploadedDocSize: 0
  });

  const [questions, setQuestions] = useState([
    {
      questionNumber: 1,
      questionType: "MULTIPLE_CHOICE",
      questionText: "",
      optionA: "",
      optionB: "",
      optionC: "",
      optionD: "",
      correctOption: "A",
      marks: 10
    }
  ]);

  const emitFeedback = (type, message) => {
    setFeedback({ type, message });
    if (typeof onFeedback === "function") {
      onFeedback({ type, message });
    }
  };

  useEffect(() => {
    const syncTier = () => setInstitutionType(getActiveInstitutionType());
    window.addEventListener("gbs_institution_type_changed", syncTier);
    window.addEventListener("storage", syncTier);
    return () => {
      window.removeEventListener("gbs_institution_type_changed", syncTier);
      window.removeEventListener("storage", syncTier);
    };
  }, []);

  const loadSubmissions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get("/ai-exam/vetting");
      const list = res.data?.data?.submissions || [];
      setSubmissions(list);
      localStorage.setItem("gbs_exam_vetting_submissions", JSON.stringify(list));
    } catch (err) {
      try {
        const cached = JSON.parse(localStorage.getItem("gbs_exam_vetting_submissions") || "[]");
        if (Array.isArray(cached)) setSubmissions(cached);
      } catch { }
      if (err?.response?.status >= 400) {
        emitFeedback("error", err?.response?.data?.message || "Could not load exam vetting submissions.");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSubmissions();
    const onUpdated = () => loadSubmissions();
    window.addEventListener("gbs_exam_vetting_updated", onUpdated);
    return () => window.removeEventListener("gbs_exam_vetting_updated", onUpdated);
  }, [loadSubmissions]);

  const handleLoadFromExistingExam = (examId) => {
    const found = (existingExams || []).find((ex) => String(ex.id) === String(examId));
    if (!found) return;
    setForm((prev) => ({
      ...prev,
      title: found.title || prev.title,
      subjectCode: found.subjectCode || prev.subjectCode,
      subjectName: found.subjectName || prev.subjectName,
      className: found.class?.name || found.className || prev.className,
      examDate: found.examDate || prev.examDate,
      startTime: found.startTime || prev.startTime,
      endTime: found.endTime || prev.endTime,
      durationMinutes: Number(found.durationMinutes || 120),
      totalMarks: Number(found.totalMarks || 100),
      passMarks: Number(found.passMarks || 50),
      instructions: found.instructions || prev.instructions,
      typedQuestionText: found.typedQuestionText || prev.typedQuestionText
    }));
    if (Array.isArray(found.questionBank) && found.questionBank.length > 0) {
      setQuestions(
        found.questionBank.map((q, idx) => ({
          questionNumber: idx + 1,
          questionType: q.questionType || "MULTIPLE_CHOICE",
          questionText: q.questionText || "",
          optionA: q.optionA || q.options?.[0] || "",
          optionB: q.optionB || q.options?.[1] || "",
          optionC: q.optionC || q.options?.[2] || "",
          optionD: q.optionD || q.options?.[3] || "",
          correctOption: q.correctOption || q.correctAnswer || "A",
          acceptedAnswer: q.acceptedAnswer || "",
          markingGuide: q.markingGuide || "",
          marks: Number(q.marks || 10)
        }))
      );
    }
    emitFeedback("success", `Loaded "${found.title}" into the vetting submission form. Review and send to ${profile.leadershipRoleTitle}.`);
  };

  const handleAddQuestionRow = () => {
    setQuestions((prev) => [
      ...prev,
      {
        questionNumber: prev.length + 1,
        questionType: "MULTIPLE_CHOICE",
        questionText: "",
        optionA: "",
        optionB: "",
        optionC: "",
        optionD: "",
        correctOption: "A",
        acceptedAnswer: "",
        markingGuide: "",
        marks: 10
      }
    ]);
  };

  const handleUpdateQuestion = (index, field, value) => {
    setQuestions((prev) =>
      prev.map((q, i) => (i === index ? { ...q, [field]: value } : q))
    );
  };

  const handleRemoveQuestion = (index) => {
    setQuestions((prev) =>
      prev.length <= 1
        ? prev
        : prev.filter((_, i) => i !== index).map((q, i) => ({ ...q, questionNumber: i + 1 }))
    );
  };

  const handleAttachPaperFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) {
      emitFeedback("error", "Attached exam paper must be 4 MB or smaller.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setForm((prev) => ({
        ...prev,
        uploadedDocName: file.name,
        uploadedDocData: typeof reader.result === "string" ? reader.result : "",
        uploadedDocSize: file.size
      }));
      setFileVerified(false);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmitExamForVetting = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) {
      emitFeedback("error", "Enter an End-of-Term or Semester Examination Title first.");
      return;
    }

    const cleanedQuestions = questions.filter((q) => String(q.questionText || "").trim().length > 0);
    if (cleanedQuestions.length === 0 && !form.typedQuestionText.trim() && !form.uploadedDocName) {
      emitFeedback("error", "Add at least one exam question, typed exam paper text, or attach a verified exam paper before submitting.");
      return;
    }

    if (form.uploadedDocName && !fileVerified) {
      emitFeedback("error", "Please inspect and tick 'Verify File Content' on the uploaded exam paper before submitting to the Headmaster.");
      return;
    }

    if (!editingRevisionId) {
      const demoCheck = checkDemoEntryLimit("exams", "Exam Vetting Submissions", submissions.length);
      if (!demoCheck.allowed) {
        emitFeedback("error", demoCheck.message);
        return;
      }
    }

    setSubmitting(true);
    try {
      const payload = {
        ...form,
        institutionType,
        questionBank: cleanedQuestions,
        submittedByName: currentUser
          ? `${currentUser.firstName || ""} ${currentUser.lastName || ""}`.trim() || currentUser.email
          : "Subject Educator",
        submittedByEmail: currentUser?.email || ""
      };

      let res;
      if (editingRevisionId) {
        res = await apiClient.put(`/ai-exam/vetting/${encodeURIComponent(editingRevisionId)}/resubmit`, {
          ...payload,
          resubmittedNote: resubmitNote || "Revised according to Headmaster vetting remarks."
        });
      } else {
        res = await apiClient.post("/ai-exam/vetting/submit", payload);
        trackDemoEntryCreated("exams");
      }

      const saved = res.data?.data?.submission;
      if (saved) {
        setSubmissions((prev) => [saved, ...prev.filter((x) => String(x.id) !== String(saved.id))]);
      }
      setEditingRevisionId(null);
      setResubmitNote("");
      setForm((prev) => ({
        ...prev,
        title: "",
        typedQuestionText: "",
        uploadedDocName: "",
        uploadedDocData: "",
        uploadedDocSize: 0
      }));
      setQuestions([
        {
          questionNumber: 1,
          questionType: "MULTIPLE_CHOICE",
          questionText: "",
          optionA: "",
          optionB: "",
          optionC: "",
          optionD: "",
          correctOption: "A",
          marks: 10
        }
      ]);
      setFileVerified(false);
      window.dispatchEvent(new Event("gbs_exam_vetting_updated"));
      emitFeedback(
        "success",
        res.data?.message ||
          `Exam submitted to ${profile.leadershipRoleTitle} for vetting & ongoing exam confirmation.`
      );
      await loadSubmissions();
    } catch (err) {
      emitFeedback("error", err?.response?.data?.message || "Failed to submit exam for Headmaster vetting.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleStartRevision = (item) => {
    setEditingRevisionId(item.id);
    setResubmitNote("");
    setForm({
      title: item.title || "",
      examCategory: item.examCategory || (isSemesterTier ? "END_OF_SEMESTER" : "END_OF_TERM"),
      academicTerm: item.academicTerm || periodOptions[0],
      academicYear: item.academicYear || "2026-2027",
      subjectCode: item.subjectCode || "CORE-101",
      subjectName: item.subjectName || defaultSubject,
      className: item.className || defaultClassName,
      examDate: item.examDate || new Date().toISOString().slice(0, 10),
      startTime: item.startTime || "09:00 AM",
      endTime: item.endTime || "11:30 AM",
      durationMinutes: Number(item.durationMinutes || 120),
      totalMarks: Number(item.totalMarks || 100),
      passMarks: Number(item.passMarks || 50),
      examMode: item.examMode || "HYBRID",
      syllabusScope: item.syllabusScope || "",
      instructions: item.instructions || "",
      markingSchemeNotes: item.markingSchemeNotes || "",
      typedQuestionText: item.typedQuestionText || "",
      uploadedDocName: item.uploadedDocName || "",
      uploadedDocData: item.uploadedDocData || "",
      uploadedDocSize: 0
    });
    if (Array.isArray(item.questionBank) && item.questionBank.length > 0) {
      setQuestions(item.questionBank);
    }
    setFileVerified(Boolean(item.uploadedDocName));
    emitFeedback("info", `Loaded "${item.title}" for revision. Update the paper and resubmit to ${profile.leadershipRoleTitle}.`);
  };

  const handleHeadmasterDecision = async (item, decision) => {
    const trimmedRemarks = reviewRemarks.trim();
    if ((decision === "REVISION_REQUESTED" || decision === "REJECTED") && !trimmedRemarks) {
      emitFeedback("error", "Please write clear vetting remarks explaining what the teacher must revise or why the exam is rejected.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await apiClient.put(`/ai-exam/vetting/${encodeURIComponent(item.id)}/review`, {
        decision,
        headmasterRemarks:
          trimmedRemarks ||
          "Vetted, verified, and officially confirmed for ongoing institutional examinations.",
        vettedByName: currentUser
          ? `${currentUser.firstName || ""} ${currentUser.lastName || ""}`.trim() || profile.leadershipRoleTitle
          : profile.leadershipRoleTitle
      });

      const updatedSub = res.data?.data?.submission;
      const publishedExam = res.data?.data?.publishedExam;
      if (updatedSub) {
        setSubmissions((prev) => prev.map((x) => (String(x.id) === String(updatedSub.id) ? updatedSub : x)));
      }
      if (publishedExam) {
        try {
          const prevExams = JSON.parse(localStorage.getItem("gbs_teacher_published_exams") || "[]");
          const merged = [
            { ...publishedExam, vettingStatus: "CONFIRMED_ONGOING" },
            ...prevExams.filter((x) => String(x.id) !== String(publishedExam.id))
          ];
          localStorage.setItem("gbs_teacher_published_exams", JSON.stringify(merged));
          localStorage.setItem("gbs_published_exams", JSON.stringify(merged));
          window.dispatchEvent(new Event("gbs_exams_updated"));
          window.dispatchEvent(new CustomEvent("gbs_teacher_exam_published", { detail: { exam: publishedExam } }));
        } catch { }
        if (typeof onExamConfirmed === "function") {
          onExamConfirmed(publishedExam, updatedSub);
        }
      }
      window.dispatchEvent(new Event("gbs_exam_vetting_updated"));
      setInspectingItem(null);
      setReviewRemarks("");
      emitFeedback("success", res.data?.message || `Exam vetting decision (${decision}) recorded cleanly.`);
      await loadSubmissions();
    } catch (err) {
      emitFeedback("error", err?.response?.data?.message || "Could not submit Headmaster vetting decision.");
    } finally {
      setSubmitting(false);
    }
  };

  const pendingCount = submissions.filter((s) => s.vettingStatus === "PENDING_HEADMASTER_VETTING").length;
  const confirmedCount = submissions.filter((s) => s.vettingStatus === "CONFIRMED_ONGOING").length;
  const revisionCount = submissions.filter((s) => s.vettingStatus === "REVISION_REQUESTED").length;
  const rejectedCount = submissions.filter((s) => s.vettingStatus === "REJECTED").length;

  const filteredSubmissions = submissions.filter((item) => {
    if (statusFilter !== "ALL" && item.vettingStatus !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const hay = `${item.title} ${item.subjectName} ${item.subjectCode} ${item.className} ${item.academicTerm} ${item.submittedByName} ${item.institutionType}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
      {/* Header Banner */}
      <div
        style={{
          background: "linear-gradient(135deg, rgba(15, 23, 42, 0.92), rgba(30, 41, 59, 0.85))",
          border: "1.5px solid rgba(212, 175, 55, 0.45)",
          borderRadius: "14px",
          padding: "18px 20px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "12px"
        }}
      >
        <div>
          <span style={{ fontSize: "0.74rem", fontWeight: 800, color: "#f6dd84", letterSpacing: "0.8px", textTransform: "uppercase" }}>
            {profile.icon} {profile.name} • Cross-Institution Academic Quality Assurance
          </span>
          <h3 style={{ margin: "4px 0 2px", color: "#ffffff", fontSize: "1.2rem" }}>
            {mode === "HEADMASTER"
              ? `End-of-Term & Semester Examination Vetting & Confirmation Desk (${profile.leadershipRoleTitle})`
              : `Send End-of-Term / Semester Exam to ${profile.leadershipRoleTitle} for Vetting & Confirmation`}
          </h3>
          <p style={{ margin: 0, fontSize: "0.82rem", color: "#cbd5e1" }}>
            {mode === "HEADMASTER"
              ? "Inspect submitted end-of-term and semester exam papers across all classes/levels. Confirm approved papers to unlock them for ongoing exams, or return papers with revision notes."
              : "Submit complete end-of-term or semester examination papers (questions, marking scheme, syllabus scope, and schedule) to institutional leadership for vetting before ongoing exams start."}
          </p>
        </div>
        <button
          type="button"
          onClick={loadSubmissions}
          disabled={loading}
          style={{
            background: "rgba(56, 189, 248, 0.16)",
            border: "1px solid #38bdf8",
            color: "#bae6fd",
            borderRadius: "8px",
            padding: "8px 14px",
            fontWeight: 700,
            cursor: "pointer",
            fontSize: "0.8rem"
          }}
        >
          {loading ? "Refreshing..." : "Refresh Vetting Queue"}
        </button>
      </div>

      {feedback && (
        <div
          style={{
            padding: "11px 14px",
            borderRadius: "10px",
            fontSize: "0.85rem",
            fontWeight: 600,
            background:
              feedback.type === "error"
                ? "rgba(239, 68, 68, 0.15)"
                : feedback.type === "info"
                  ? "rgba(56, 189, 248, 0.15)"
                  : "rgba(16, 185, 129, 0.15)",
            border: `1px solid ${
              feedback.type === "error" ? "#ef4444" : feedback.type === "info" ? "#38bdf8" : "#10b981"
            }`,
            color:
              feedback.type === "error" ? "#fecaca" : feedback.type === "info" ? "#bae6fd" : "#6ee7b7"
          }}
        >
          {feedback.message}
        </div>
      )}

      {/* KPI Metrics */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(175px, 1fr))", gap: "10px" }}>
        <div style={{ background: "rgba(15, 23, 42, 0.75)", border: "1px solid rgba(56, 189, 248, 0.3)", borderRadius: "12px", padding: "12px 14px" }}>
          <div style={{ fontSize: "0.74rem", color: "#94a3b8" }}>Total Exam Submissions</div>
          <strong style={{ fontSize: "1.4rem", color: "#fff" }}>{submissions.length}</strong>
        </div>
        <div style={{ background: "rgba(15, 23, 42, 0.75)", border: "1px solid rgba(245, 158, 11, 0.4)", borderRadius: "12px", padding: "12px 14px" }}>
          <div style={{ fontSize: "0.74rem", color: "#94a3b8" }}>Pending Vetting</div>
          <strong style={{ fontSize: "1.4rem", color: "#fbbf24" }}>{pendingCount}</strong>
        </div>
        <div style={{ background: "rgba(15, 23, 42, 0.75)", border: "1px solid rgba(16, 185, 129, 0.4)", borderRadius: "12px", padding: "12px 14px" }}>
          <div style={{ fontSize: "0.74rem", color: "#94a3b8" }}>Confirmed for Ongoing Exams</div>
          <strong style={{ fontSize: "1.4rem", color: "#34d399" }}>{confirmedCount}</strong>
        </div>
        <div style={{ background: "rgba(15, 23, 42, 0.75)", border: "1px solid rgba(249, 115, 22, 0.4)", borderRadius: "12px", padding: "12px 14px" }}>
          <div style={{ fontSize: "0.74rem", color: "#94a3b8" }}>Revision / Rejected</div>
          <strong style={{ fontSize: "1.4rem", color: "#fdba74" }}>{revisionCount + rejectedCount}</strong>
        </div>
      </div>

      {/* TEACHER SUBMISSION FORM */}
      {mode === "TEACHER" && (
        <form
          onSubmit={handleSubmitExamForVetting}
          style={{
            background: "rgba(15, 23, 42, 0.82)",
            border: "1.5px solid rgba(56, 189, 248, 0.35)",
            borderRadius: "14px",
            padding: "18px",
            display: "flex",
            flexDirection: "column",
            gap: "14px"
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
            <h4 style={{ margin: 0, color: "#38bdf8", fontSize: "1.02rem" }}>
              {editingRevisionId
                ? "Revise & Resubmit Examination Paper for Headmaster Vetting"
                : `Submit End-of-Term / Semester Exam to ${profile.leadershipRoleTitle}`}
            </h4>
            {Array.isArray(existingExams) && existingExams.length > 0 && !editingRevisionId && (
              <select
                defaultValue=""
                onChange={(e) => handleLoadFromExistingExam(e.target.value)}
                style={{
                  background: "#020617",
                  color: "#f8fafc",
                  border: "1px solid rgba(212, 175, 55, 0.5)",
                  borderRadius: "8px",
                  padding: "7px 10px",
                  fontSize: "0.8rem"
                }}
              >
                <option value="">Import from an Authored Exam...</option>
                {existingExams.map((ex) => (
                  <option key={ex.id} value={ex.id}>
                    {ex.title} ({ex.class?.name || ex.className || "Class"})
                  </option>
                ))}
              </select>
            )}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: "10px" }}>
            <label style={labelStyle}>
              Examination Title *
              <input
                type="text"
                required
                placeholder="e.g. End of Term 2 Mathematics Examination"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                style={fieldStyle}
              />
            </label>
            <label style={labelStyle}>
              Examination Category
              <select
                value={form.examCategory}
                onChange={(e) => setForm({ ...form, examCategory: e.target.value })}
                style={fieldStyle}
              >
                <option value="END_OF_TERM">End of Term Examination</option>
                <option value="END_OF_SEMESTER">End of Semester Examination</option>
                <option value="MID_TERM">Mid-Term / Mid-Semester Assessment</option>
                <option value="MOCK_EXTERNAL">Mock / External Readiness (BECE / WASSCE / CBT)</option>
              </select>
            </label>
            <label style={labelStyle}>
              Term / Semester Period
              <select
                value={form.academicTerm}
                onChange={(e) => setForm({ ...form, academicTerm: e.target.value })}
                style={fieldStyle}
              >
                {periodOptions.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </label>
            <label style={labelStyle}>
              Target Class / Level / Programme
              <select
                value={form.className}
                onChange={(e) => setForm({ ...form, className: e.target.value })}
                style={fieldStyle}
              >
                {availableClasses.map((c) => (
                  <option key={`cls-${c.id || c.name}`} value={c.name}>{c.name}</option>
                ))}
                {tierClasses.map((c) => (
                  <option key={`tier-${c.id}`} value={c.name}>{c.name}</option>
                ))}
              </select>
            </label>
            <label style={labelStyle}>
              Subject / Course Name
              <input
                type="text"
                required
                value={form.subjectName}
                onChange={(e) => setForm({ ...form, subjectName: e.target.value })}
                style={fieldStyle}
              />
            </label>
            <label style={labelStyle}>
              Subject / Course Code
              <input
                type="text"
                value={form.subjectCode}
                onChange={(e) => setForm({ ...form, subjectCode: e.target.value.toUpperCase() })}
                style={fieldStyle}
              />
            </label>
            <label style={labelStyle}>
              Scheduled Exam Date
              <input
                type="date"
                value={form.examDate}
                onChange={(e) => setForm({ ...form, examDate: e.target.value })}
                style={fieldStyle}
              />
            </label>
            <label style={labelStyle}>
              Start – End Time Window
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px", marginTop: "4px" }}>
                <input
                  type="text"
                  value={form.startTime}
                  onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                  style={{ ...fieldStyle, marginTop: 0 }}
                />
                <input
                  type="text"
                  value={form.endTime}
                  onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                  style={{ ...fieldStyle, marginTop: 0 }}
                />
              </div>
            </label>
            <label style={labelStyle}>
              Duration (Mins) / Total &amp; Pass Marks
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "6px", marginTop: "4px" }}>
                <input
                  type="number"
                  min="15"
                  value={form.durationMinutes}
                  onChange={(e) => setForm({ ...form, durationMinutes: Number(e.target.value) })}
                  style={{ ...fieldStyle, marginTop: 0 }}
                />
                <input
                  type="number"
                  min="10"
                  value={form.totalMarks}
                  onChange={(e) => setForm({ ...form, totalMarks: Number(e.target.value) })}
                  style={{ ...fieldStyle, marginTop: 0 }}
                />
                <input
                  type="number"
                  min="1"
                  value={form.passMarks}
                  onChange={(e) => setForm({ ...form, passMarks: Number(e.target.value) })}
                  style={{ ...fieldStyle, marginTop: 0 }}
                />
              </div>
            </label>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "10px" }}>
            <label style={labelStyle}>
              Syllabus Scope &amp; Topics Covered
              <textarea
                rows={2}
                value={form.syllabusScope}
                onChange={(e) => setForm({ ...form, syllabusScope: e.target.value })}
                style={fieldStyle}
              />
            </label>
            <label style={labelStyle}>
              Marking Scheme &amp; Scoring Guide (For Headmaster Vetting)
              <textarea
                rows={2}
                value={form.markingSchemeNotes}
                onChange={(e) => setForm({ ...form, markingSchemeNotes: e.target.value })}
                style={fieldStyle}
              />
            </label>
          </div>

          {/* Structured Question Bank Editor */}
          <div style={{ background: "rgba(2, 6, 23, 0.55)", border: "1px solid rgba(148, 163, 184, 0.25)", borderRadius: "10px", padding: "12px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px", flexWrap: "wrap", gap: "8px" }}>
              <strong style={{ color: "#f6dd84", fontSize: "0.86rem" }}>
                Examination Questions for Vetting ({questions.length})
              </strong>
              <button
                type="button"
                onClick={handleAddQuestionRow}
                style={{
                  background: "rgba(16, 185, 129, 0.16)",
                  border: "1px solid #10b981",
                  color: "#6ee7b7",
                  borderRadius: "6px",
                  padding: "5px 10px",
                  fontWeight: 700,
                  cursor: "pointer",
                  fontSize: "0.78rem"
                }}
              >
                + Add Question
              </button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {questions.map((q, idx) => (
                <div
                  key={`vet-q-${idx}`}
                  style={{
                    background: "rgba(15, 23, 42, 0.75)",
                    border: "1px solid rgba(148, 163, 184, 0.2)",
                    borderRadius: "8px",
                    padding: "10px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px"
                  }}
                >
                  <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
                    <strong style={{ color: "#38bdf8", fontSize: "0.8rem" }}>Q{idx + 1}</strong>
                    <select
                      value={q.questionType}
                      onChange={(e) => handleUpdateQuestion(idx, "questionType", e.target.value)}
                      style={{ ...fieldStyle, width: "auto", marginTop: 0, padding: "5px 8px" }}
                    >
                      <option value="MULTIPLE_CHOICE">Multiple Choice</option>
                      <option value="THEORY_ESSAY">Theory / Essay</option>
                      <option value="SHORT_ANSWER">Short Answer</option>
                      <option value="TRUE_FALSE">True / False</option>
                      <option value="CASE_STUDY">Practical / Case Study</option>
                    </select>
                    <input
                      type="number"
                      min="1"
                      value={q.marks}
                      onChange={(e) => handleUpdateQuestion(idx, "marks", Number(e.target.value))}
                      style={{ ...fieldStyle, width: "80px", marginTop: 0, padding: "5px 8px" }}
                      placeholder="Marks"
                    />
                    {questions.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveQuestion(idx)}
                        style={{ marginLeft: "auto", background: "rgba(239, 68, 68, 0.16)", border: "1px solid #ef4444", color: "#fca5a5", borderRadius: "6px", padding: "4px 8px", fontSize: "0.74rem", cursor: "pointer" }}
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  <textarea
                    rows={2}
                    placeholder={`Enter Question ${idx + 1} text...`}
                    value={q.questionText}
                    onChange={(e) => handleUpdateQuestion(idx, "questionText", e.target.value)}
                    style={{ ...fieldStyle, marginTop: 0 }}
                  />
                  {q.questionType === "MULTIPLE_CHOICE" && (
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "6px" }}>
                      <input placeholder="Option A" value={q.optionA} onChange={(e) => handleUpdateQuestion(idx, "optionA", e.target.value)} style={{ ...fieldStyle, marginTop: 0 }} />
                      <input placeholder="Option B" value={q.optionB} onChange={(e) => handleUpdateQuestion(idx, "optionB", e.target.value)} style={{ ...fieldStyle, marginTop: 0 }} />
                      <input placeholder="Option C" value={q.optionC} onChange={(e) => handleUpdateQuestion(idx, "optionC", e.target.value)} style={{ ...fieldStyle, marginTop: 0 }} />
                      <input placeholder="Option D" value={q.optionD} onChange={(e) => handleUpdateQuestion(idx, "optionD", e.target.value)} style={{ ...fieldStyle, marginTop: 0 }} />
                      <select value={q.correctOption} onChange={(e) => handleUpdateQuestion(idx, "correctOption", e.target.value)} style={{ ...fieldStyle, marginTop: 0 }}>
                        <option value="A">Correct Answer: A</option>
                        <option value="B">Correct Answer: B</option>
                        <option value="C">Correct Answer: C</option>
                        <option value="D">Correct Answer: D</option>
                      </select>
                    </div>
                  )}
                  {q.questionType !== "MULTIPLE_CHOICE" && q.questionType !== "TRUE_FALSE" && (
                    <input
                      placeholder="Expected Answer / Marking Rubric for Headmaster Vetting..."
                      value={q.markingGuide || q.acceptedAnswer || ""}
                      onChange={(e) => handleUpdateQuestion(idx, "markingGuide", e.target.value)}
                      style={{ ...fieldStyle, marginTop: 0 }}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

          <label style={labelStyle}>
            Additional Typed Paper Text / Section B Instructions (Optional)
            <textarea
              rows={3}
              placeholder="Paste full formatted paper sections or essay instructions if needed..."
              value={form.typedQuestionText}
              onChange={(e) => setForm({ ...form, typedQuestionText: e.target.value })}
              style={fieldStyle}
            />
          </label>

          <div>
            <label style={labelStyle}>
              Attach Exam Paper Document (PDF / DOCX / Image — Optional)
              <input
                type="file"
                accept=".pdf,.doc,.docx,.txt,image/*"
                onChange={handleAttachPaperFile}
                style={{ ...fieldStyle, padding: "7px" }}
              />
            </label>
            {form.uploadedDocName && (
              <div style={{ marginTop: "8px" }}>
                <FileUploadVerificationCard
                  file={{
                    name: form.uploadedDocName,
                    size: form.uploadedDocSize,
                    dataUrl: form.uploadedDocData
                  }}
                  isVerified={fileVerified}
                  onVerify={() => setFileVerified(true)}
                  onRemove={() => {
                    setForm((prev) => ({ ...prev, uploadedDocName: "", uploadedDocData: "", uploadedDocSize: 0 }));
                    setFileVerified(false);
                  }}
                  label="End-of-Term / Semester Exam Paper"
                  category="Examinations"
                />
              </div>
            )}
          </div>

          {editingRevisionId && (
            <label style={labelStyle}>
              Revision Note to {profile.leadershipRoleTitle}
              <input
                type="text"
                placeholder="Summarize the revisions made per vetting feedback..."
                value={resubmitNote}
                onChange={(e) => setResubmitNote(e.target.value)}
                style={fieldStyle}
              />
            </label>
          )}

          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <button
              type="submit"
              disabled={submitting}
              style={{
                background: "linear-gradient(135deg, #059669, #10b981)",
                color: "#fff",
                border: "none",
                borderRadius: "10px",
                padding: "11px 20px",
                fontWeight: 800,
                cursor: submitting ? "wait" : "pointer",
                fontSize: "0.9rem"
              }}
            >
              {submitting
                ? "Sending to Headmaster..."
                : editingRevisionId
                  ? `Resubmit Revised Exam to ${profile.leadershipRoleTitle}`
                  : `Send Exam to ${profile.leadershipRoleTitle} for Vetting & Confirmation`}
            </button>
            {editingRevisionId && (
              <button
                type="button"
                onClick={() => setEditingRevisionId(null)}
                style={{
                  background: "rgba(148, 163, 184, 0.18)",
                  color: "#e2e8f0",
                  border: "1px solid rgba(148, 163, 184, 0.35)",
                  borderRadius: "10px",
                  padding: "11px 16px",
                  fontWeight: 700,
                  cursor: "pointer"
                }}
              >
                Cancel Revision
              </button>
            )}
          </div>
        </form>
      )}

      {/* FILTER & SEARCH BAR */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
          {[
            ["ALL", `All (${submissions.length})`],
            ["PENDING_HEADMASTER_VETTING", `Pending Vetting (${pendingCount})`],
            ["CONFIRMED_ONGOING", `Confirmed Ongoing (${confirmedCount})`],
            ["REVISION_REQUESTED", `Revision Requested (${revisionCount})`],
            ["REJECTED", `Rejected (${rejectedCount})`]
          ].map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setStatusFilter(key)}
              style={{
                padding: "7px 12px",
                borderRadius: "8px",
                border: statusFilter === key ? "1.5px solid #38bdf8" : "1px solid rgba(148, 163, 184, 0.25)",
                background: statusFilter === key ? "rgba(56, 189, 248, 0.18)" : "rgba(15, 23, 42, 0.65)",
                color: "#f8fafc",
                fontWeight: 700,
                fontSize: "0.78rem",
                cursor: "pointer"
              }}
            >
              {label}
            </button>
          ))}
        </div>
        <input
          type="search"
          placeholder="Search exam title, subject, class, teacher..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            background: "#020617",
            color: "#fff",
            border: "1px solid rgba(148, 163, 184, 0.3)",
            borderRadius: "8px",
            padding: "8px 12px",
            minWidth: "240px",
            fontSize: "0.82rem"
          }}
        />
      </div>

      {/* SUBMISSIONS TABLE */}
      <div className="role-table-responsive" style={{ overflowX: "auto" }}>
        <table className="role-table">
          <thead>
            <tr>
              <th>Exam Title &amp; Period</th>
              <th>Institution Tier &amp; Class</th>
              <th>Subject / Schedule</th>
              <th>Submitted By</th>
              <th>Vetting Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredSubmissions.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ textAlign: "center", padding: "24px", color: "#94a3b8" }}>
                  No end-of-term or semester exam vetting submissions match this filter yet.
                </td>
              </tr>
            ) : (
              filteredSubmissions.map((item) => {
                const badge = STATUS_BADGES[item.vettingStatus] || STATUS_BADGES.PENDING_HEADMASTER_VETTING;
                return (
                  <tr key={item.id}>
                    <td>
                      <strong style={{ color: "#f8fafc", display: "block" }}>{item.title}</strong>
                      <span style={{ fontSize: "0.75rem", color: "#38bdf8" }}>
                        {item.academicTerm} • {item.academicYear} ({(item.questionBank || []).length} Qs)
                      </span>
                    </td>
                    <td>
                      <div style={{ color: "#f6dd84", fontWeight: 700, fontSize: "0.78rem" }}>
                        {TIER_LABELS[item.institutionType] || item.institutionType}
                      </div>
                      <span style={{ fontSize: "0.78rem", color: "#cbd5e1" }}>{item.className}</span>
                    </td>
                    <td>
                      <div style={{ color: "#fff", fontWeight: 700 }}>{item.subjectName} ({item.subjectCode})</div>
                      <span style={{ fontSize: "0.75rem", color: "#94a3b8" }}>
                        {item.examDate} • {item.startTime}–{item.endTime} ({item.durationMinutes}m)
                      </span>
                    </td>
                    <td>
                      <div style={{ color: "#e2e8f0", fontWeight: 700 }}>{item.submittedByName}</div>
                      <span style={{ fontSize: "0.72rem", color: "#94a3b8" }}>
                        {new Date(item.submittedAt).toLocaleString()}
                      </span>
                    </td>
                    <td>
                      <span
                        style={{
                          display: "inline-block",
                          padding: "4px 10px",
                          borderRadius: "999px",
                          background: badge.bg,
                          border: `1px solid ${badge.border}`,
                          color: badge.color,
                          fontWeight: 800,
                          fontSize: "0.72rem"
                        }}
                      >
                        {badge.label}
                      </span>
                      {item.headmasterRemarks && (
                        <div style={{ fontSize: "0.74rem", color: "#cbd5e1", marginTop: "4px", maxWidth: "240px" }}>
                          Remark: {item.headmasterRemarks}
                        </div>
                      )}
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                        <button
                          type="button"
                          onClick={() => {
                            setInspectingItem(item);
                            setReviewRemarks(item.headmasterRemarks || "");
                          }}
                          style={{
                            background: "rgba(56, 189, 248, 0.16)",
                            border: "1px solid #38bdf8",
                            color: "#bae6fd",
                            borderRadius: "6px",
                            padding: "5px 10px",
                            fontSize: "0.74rem",
                            fontWeight: 700,
                            cursor: "pointer"
                          }}
                        >
                          {mode === "HEADMASTER" ? "Inspect & Vet Paper" : "Inspect Paper"}
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            navigateToDetail(
                              navigate,
                              "exam",
                              item.id,
                              { ...item, status: item.vettingStatus },
                              { returnTab }
                            )
                          }
                          style={{
                            background: "rgba(139, 92, 246, 0.18)",
                            border: "1px solid #8b5cf6",
                            color: "#ddd6fe",
                            borderRadius: "6px",
                            padding: "5px 10px",
                            fontSize: "0.74rem",
                            fontWeight: 700,
                            cursor: "pointer"
                          }}
                        >
                          Full Page
                        </button>
                        {mode === "TEACHER" && item.vettingStatus === "REVISION_REQUESTED" && (
                          <button
                            type="button"
                            onClick={() => handleStartRevision(item)}
                            style={{
                              background: "rgba(245, 158, 11, 0.2)",
                              border: "1px solid #f59e0b",
                              color: "#fde68a",
                              borderRadius: "6px",
                              padding: "5px 10px",
                              fontSize: "0.74rem",
                              fontWeight: 800,
                              cursor: "pointer"
                            }}
                          >
                            Revise &amp; Resubmit
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* FULL PAPER INSPECTION & HEADMASTER VETTING MODAL */}
      {inspectingItem && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(2, 6, 23, 0.88)",
            backdropFilter: "blur(8px)",
            zIndex: 999998,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px",
            overflowY: "auto"
          }}
        >
          <div
            style={{
              background: "#0f172a",
              border: "2px solid #d4af37",
              borderRadius: "16px",
              width: "100%",
              maxWidth: "820px",
              maxHeight: "90vh",
              overflowY: "auto",
              padding: "22px",
              color: "#f8fafc",
              display: "flex",
              flexDirection: "column",
              gap: "14px"
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px", borderBottom: "1px solid rgba(148,163,184,0.2)", paddingBottom: "12px" }}>
              <div>
                <div style={{ fontSize: "0.74rem", fontWeight: 800, color: "#f6dd84", textTransform: "uppercase" }}>
                  {TIER_LABELS[inspectingItem.institutionType] || inspectingItem.institutionType} • {inspectingItem.academicTerm}
                </div>
                <h3 style={{ margin: "4px 0 0", color: "#fff" }}>{inspectingItem.title}</h3>
                <div style={{ fontSize: "0.8rem", color: "#94a3b8", marginTop: "4px" }}>
                  Class: <strong style={{ color: "#fff" }}>{inspectingItem.className}</strong> • Subject: <strong style={{ color: "#38bdf8" }}>{inspectingItem.subjectName}</strong> • Submitted by <strong style={{ color: "#fff" }}>{inspectingItem.submittedByName}</strong>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setInspectingItem(null)}
                style={{ background: "rgba(148,163,184,0.18)", border: "1px solid rgba(148,163,184,0.35)", color: "#fff", borderRadius: "8px", padding: "6px 12px", fontWeight: 700, cursor: "pointer" }}
              >
                Close
              </button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "8px", background: "rgba(2, 6, 23, 0.55)", padding: "12px", borderRadius: "10px", fontSize: "0.82rem" }}>
              <div>Date: <strong>{inspectingItem.examDate}</strong></div>
              <div>Window: <strong>{inspectingItem.startTime} – {inspectingItem.endTime}</strong></div>
              <div>Duration: <strong>{inspectingItem.durationMinutes} mins</strong></div>
              <div>Total / Pass: <strong>{inspectingItem.totalMarks} / {inspectingItem.passMarks}</strong></div>
            </div>

            {inspectingItem.syllabusScope && (
              <div style={{ fontSize: "0.84rem", color: "#cbd5e1" }}>
                <strong style={{ color: "#38bdf8" }}>Syllabus Scope:</strong> {inspectingItem.syllabusScope}
              </div>
            )}
            {inspectingItem.markingSchemeNotes && (
              <div style={{ fontSize: "0.84rem", color: "#cbd5e1" }}>
                <strong style={{ color: "#34d399" }}>Marking Scheme:</strong> {inspectingItem.markingSchemeNotes}
              </div>
            )}
            {inspectingItem.instructions && (
              <div style={{ fontSize: "0.84rem", color: "#cbd5e1" }}>
                <strong style={{ color: "#fbbf24" }}>Candidate Instructions:</strong> {inspectingItem.instructions}
              </div>
            )}

            {/* Questions List */}
            {Array.isArray(inspectingItem.questionBank) && inspectingItem.questionBank.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <strong style={{ color: "#f6dd84", fontSize: "0.88rem" }}>
                  Submitted Questions ({inspectingItem.questionBank.length})
                </strong>
                {inspectingItem.questionBank.map((q, idx) => (
                  <div key={`insp-q-${idx}`} style={{ background: "rgba(30, 41, 59, 0.7)", border: "1px solid rgba(148,163,184,0.2)", borderRadius: "8px", padding: "10px", fontSize: "0.84rem" }}>
                    <div style={{ fontWeight: 700, color: "#fff" }}>
                      Q{q.questionNumber || idx + 1}. {q.questionText} <span style={{ color: "#38bdf8", fontSize: "0.76rem" }}>({q.marks || 10} marks • {q.questionType})</span>
                    </div>
                    {q.questionType === "MULTIPLE_CHOICE" && (
                      <div style={{ marginTop: "6px", color: "#cbd5e1", fontSize: "0.8rem", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px" }}>
                        <span>A) {q.optionA}</span>
                        <span>B) {q.optionB}</span>
                        <span>C) {q.optionC}</span>
                        <span>D) {q.optionD}</span>
                      </div>
                    )}
                    <div style={{ marginTop: "5px", color: "#34d399", fontSize: "0.78rem", fontWeight: 700 }}>
                      Key / Rubric: {q.correctOption || q.markingGuide || q.acceptedAnswer || q.correctAnswer || "Teacher Rubric"}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {inspectingItem.typedQuestionText && (
              <div style={{ background: "rgba(2, 6, 23, 0.6)", borderRadius: "10px", padding: "12px", fontSize: "0.84rem", whiteSpace: "pre-wrap", color: "#e2e8f0" }}>
                <strong style={{ color: "#38bdf8", display: "block", marginBottom: "4px" }}>Typed Examination Paper Content:</strong>
                {inspectingItem.typedQuestionText}
              </div>
            )}

            {inspectingItem.uploadedDocName && (
              <div style={{ background: "rgba(56, 189, 248, 0.12)", border: "1px solid #38bdf8", borderRadius: "8px", padding: "10px", fontSize: "0.82rem" }}>
                Attached Exam Paper File: <strong>{inspectingItem.uploadedDocName}</strong>
              </div>
            )}

            {/* HEADMASTER VETTING ACTION CONTROLS */}
            {mode === "HEADMASTER" && (
              <div style={{ borderTop: "1.5px solid rgba(212, 175, 55, 0.35)", paddingTop: "14px", display: "flex", flexDirection: "column", gap: "10px" }}>
                <label style={labelStyle}>
                  {profile.leadershipRoleTitle} Official Vetting Remarks &amp; Directives
                  <textarea
                    rows={3}
                    placeholder="Enter approval endorsement or specific revision directives for the teacher..."
                    value={reviewRemarks}
                    onChange={(e) => setReviewRemarks(e.target.value)}
                    style={fieldStyle}
                  />
                </label>
                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => handleHeadmasterDecision(inspectingItem, "CONFIRMED_ONGOING")}
                    style={{
                      flex: 1,
                      minWidth: "200px",
                      background: "linear-gradient(135deg, #059669, #10b981)",
                      color: "#fff",
                      border: "none",
                      borderRadius: "10px",
                      padding: "11px 16px",
                      fontWeight: 800,
                      cursor: "pointer"
                    }}
                  >
                    Confirm &amp; Authorize for Ongoing Exams
                  </button>
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => handleHeadmasterDecision(inspectingItem, "REVISION_REQUESTED")}
                    style={{
                      background: "linear-gradient(135deg, #d97706, #f59e0b)",
                      color: "#0f172a",
                      border: "none",
                      borderRadius: "10px",
                      padding: "11px 16px",
                      fontWeight: 800,
                      cursor: "pointer"
                    }}
                  >
                    Request Revision
                  </button>
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => handleHeadmasterDecision(inspectingItem, "REJECTED")}
                    style={{
                      background: "linear-gradient(135deg, #b91c1c, #ef4444)",
                      color: "#fff",
                      border: "none",
                      borderRadius: "10px",
                      padding: "11px 16px",
                      fontWeight: 800,
                      cursor: "pointer"
                    }}
                  >
                    Reject Paper
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const labelStyle = {
  display: "block",
  fontSize: "0.78rem",
  color: "#cbd5e1",
  fontWeight: 700
};

const fieldStyle = {
  width: "100%",
  marginTop: "4px",
  padding: "9px 11px",
  borderRadius: "8px",
  border: "1px solid rgba(148, 163, 184, 0.35)",
  background: "#020617",
  color: "#f8fafc",
  fontSize: "0.84rem",
  boxSizing: "border-box"
};
