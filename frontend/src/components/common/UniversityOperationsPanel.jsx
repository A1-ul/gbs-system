import React, { useState, useEffect, useCallback } from "react";
import apiClient from "../../api/client/apiClient";
import {
  getActiveInstitutionType,
  getInstitutionRoleProfile,
  getTenantScopedRecord,
  setTenantScopedRecord
} from "../../utils/institutionScope";
import { isDemoSandboxMode } from "../../utils/tokenStorage";
import { checkDemoEntryLimit, trackDemoEntryCreated } from "../../utils/demoLimitGuard";

const DEFAULT_STREAMS = [
  {
    id: "stream_regular",
    streamCode: "REGULAR",
    streamName: "Regular Students",
    scheduleSummary: "Monday – Friday • 7:30 AM – 4:30 PM (Full-Time Daytime)",
    coordinator: "Office of Academic Affairs",
    feePolicyNote: "Standard Full-Time Semester Schedule",
    activeStudentsCount: 0,
    status: "ACTIVE"
  },
  {
    id: "stream_evening",
    streamCode: "EVENING",
    streamName: "Evening Students",
    scheduleSummary: "Monday – Friday • 5:30 PM – 9:00 PM (Working Professionals)",
    coordinator: "Evening & Executive Studies",
    feePolicyNote: "Evening Semester Tuition Schedule",
    activeStudentsCount: 0,
    status: "ACTIVE"
  },
  {
    id: "stream_sandwich",
    streamCode: "SANDWICH",
    streamName: "Sandwich Students",
    scheduleSummary: "Intensive Vacation Blocks (June – August / December)",
    coordinator: "Sandwich & Continuing Education",
    feePolicyNote: "Modular Block Session Billing",
    activeStudentsCount: 0,
    status: "ACTIVE"
  },
  {
    id: "stream_weekend",
    streamCode: "WEEKEND",
    streamName: "Weekend Students",
    scheduleSummary: "Fridays 5:30 PM – 8:30 PM • Saturdays & Sundays 8:00 AM – 5:00 PM",
    coordinator: "Weekend School Directorate",
    feePolicyNote: "Weekend Modular Semester Billing",
    activeStudentsCount: 0,
    status: "ACTIVE"
  }
];

const DEFAULT_GOVERNANCE = [
  {
    id: "src_pres",
    positionTitle: "SRC President (Student Representative Council)",
    holderName: "Abena Mensah",
    studentId: "UNI-2026-001",
    level: "Level 400",
    stream: "Regular Students",
    duties: "Chairs the SRC Executive Council, represents all student streams in University Senate, and oversees student welfare initiatives.",
    strategicPlan: "Expand digital learning labs, host quarterly career fairs, and strengthen campus shuttle schedules.",
    howToHelpSchool: "Partner with University Management to maintain exam readiness, hostel security, and peer mentorship across Level 100-400.",
    termYear: "2026/2027",
    status: "ACTIVE"
  },
  {
    id: "src_sec",
    positionTitle: "SRC General Secretary",
    holderName: "Kwame Boateng",
    studentId: "UNI-2026-042",
    level: "Level 300",
    stream: "Evening Students",
    duties: "Maintains SRC Assembly minutes, circulars to Regular/Evening/Sandwich/Weekend streams, and student club registry.",
    strategicPlan: "Digitize SRC student petitions and streamline internship clearance communications.",
    howToHelpSchool: "Bridge communication gaps between lecturers, Evening/Weekend students, and the Registrar office.",
    termYear: "2026/2027",
    status: "ACTIVE"
  }
];

export default function UniversityOperationsPanel({
  mode = "ADMIN", // "STUDENT" | "LECTURER" | "ADMIN"
  currentUser = null,
  onFeedback = null
}) {
  const [institutionType, setInstitutionType] = useState(() => getActiveInstitutionType());
  const [activeSubTab, setActiveSubTab] = useState("INTERNSHIPS");
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState(null);

  const [internships, setInternships] = useState([]);
  const [attachments, setAttachments] = useState([]);
  const [streams, setStreams] = useState([]);
  const [governanceRoles, setGovernanceRoles] = useState([]);
  const [exams, setExams] = useState([]);
  const [resultsData, setResultsData] = useState({ results: [], cgpa: 0, totalCredits: 0, graduations: [] });

  // Forms
  const [internForm, setInternForm] = useState({
    studentName: currentUser ? `${currentUser.firstName || ""} ${currentUser.lastName || ""}`.trim() : "",
    studentEmail: currentUser?.email || "",
    programme: "B.Sc. Computer Science & Engineering",
    level: "Level 300",
    stream: "Regular Students",
    companyName: "",
    companyAddress: "",
    industrySector: "Technology / Finance / Engineering",
    supervisorName: "",
    supervisorPhone: "",
    startDate: "",
    endDate: "",
    objectives: ""
  });

  const [attachForm, setAttachForm] = useState({
    studentName: currentUser ? `${currentUser.firstName || ""} ${currentUser.lastName || ""}`.trim() : "",
    studentEmail: currentUser?.email || "",
    programme: "B.Sc. Nursing / Education / Engineering",
    courseCode: "PRAC 302",
    level: "Level 300",
    stream: "Regular Students",
    hostInstitution: "",
    hostAddress: "",
    attachmentFocus: "Clinical / Teaching / Field Practicum",
    supervisorName: "",
    academicSupervisor: "",
    supervisorPhone: "",
    logbookHours: 240,
    startDate: "",
    endDate: "",
    objectives: ""
  });

  const [gradeTargetId, setGradeTargetId] = useState("");
  const [internGradeForm, setInternGradeForm] = useState({
    supervisorScore: 85,
    reportScore: 82,
    courseGradeScore: 80,
    lecturerRemarks: ""
  });

  const [gradeAttachTargetId, setGradeAttachTargetId] = useState("");
  const [attachGradeForm, setAttachGradeForm] = useState({
    supervisorScore: 85,
    reportScore: 82,
    courseGradeScore: 80,
    lecturerRemarks: ""
  });

  const [streamForm, setStreamForm] = useState({
    streamCode: "",
    streamName: "",
    scheduleSummary: "",
    coordinator: "",
    feePolicyNote: ""
  });

  const [govForm, setGovForm] = useState({
    positionTitle: "",
    holderName: "",
    studentId: "",
    level: "Level 300",
    stream: "Regular Students",
    duties: "",
    strategicPlan: "",
    howToHelpSchool: ""
  });

  const [examForm, setExamForm] = useState({
    courseCode: "",
    courseTitle: "",
    creditHours: 3,
    targetLevel: "Level 100",
    semester: "Semester 1",
    stream: "All Streams",
    passMark: 50,
    examDate: new Date().toISOString().slice(0, 10),
    instructions: "Answer all sections carefully."
  });

  const [resultForm, setResultForm] = useState({
    studentName: "",
    studentEmail: "",
    courseCode: "",
    courseTitle: "",
    creditHours: 3,
    score: 78,
    passMark: 50,
    level: "Level 400",
    stream: "Regular Students",
    remarks: ""
  });

  const [advForm, setAdvForm] = useState({
    studentName: "",
    studentEmail: "",
    currentLevel: "Level 400",
    action: "GRADUATE",
    programme: "Bachelor Honours Degree",
    stream: "Regular Students",
    cgpa: 3.65,
    overrideProgression: false
  });

  const notify = (msg, isError = false) => {
    setStatusMsg({ text: msg, isError });
    if (typeof onFeedback === "function") onFeedback(msg);
  };

  useEffect(() => {
    const onTierChanged = () => setInstitutionType(getActiveInstitutionType());
    window.addEventListener("gbs_institution_type_changed", onTierChanged);
    window.addEventListener("storage", onTierChanged);
    return () => {
      window.removeEventListener("gbs_institution_type_changed", onTierChanged);
      window.removeEventListener("storage", onTierChanged);
    };
  }, []);

  const profile = getInstitutionRoleProfile(institutionType);
  const isUniversity = institutionType === "UNIVERSITY";
  const isDemo = isDemoSandboxMode();

  const loadAllUniversityData = useCallback(async () => {
    if (!isUniversity) return;
    setLoading(true);
    try {
      const [intRes, attRes, strRes, govRes, exmRes, resRes] = await Promise.all([
        apiClient.get("/university/internships").catch(() => null),
        apiClient.get("/university/attachments").catch(() => null),
        apiClient.get("/university/streams").catch(() => null),
        apiClient.get("/university/governance").catch(() => null),
        apiClient.get("/university/exams").catch(() => null),
        apiClient.get("/university/results").catch(() => null)
      ]);

      const localInterns = getTenantScopedRecord("uni_internships", []);
      const localAttach = getTenantScopedRecord("uni_attachments", []);
      const localStreams = getTenantScopedRecord("uni_streams", DEFAULT_STREAMS);
      const localGov = getTenantScopedRecord("uni_governance", DEFAULT_GOVERNANCE);
      const localExams = getTenantScopedRecord("uni_exams", []);
      const localResults = getTenantScopedRecord("uni_results_bundle", { results: [], cgpa: 0, totalCredits: 0, graduations: [] });

      setInternships(intRes?.data?.data?.internships ?? localInterns);
      setAttachments(attRes?.data?.data?.attachments ?? localAttach);
      setStreams(strRes?.data?.data?.streams ?? localStreams);
      setGovernanceRoles(govRes?.data?.data?.governanceRoles ?? localGov);
      setExams(exmRes?.data?.data?.exams ?? localExams);
      setResultsData(resRes?.data?.data ?? localResults);
    } finally {
      setLoading(false);
    }
  }, [isUniversity]);

  useEffect(() => {
    loadAllUniversityData();
  }, [loadAllUniversityData]);

  if (!isUniversity) {
    return (
      <div className="role-workspace-card" style={{ padding: "24px", borderRadius: "16px", marginBottom: "20px" }}>
        <h3 style={{ marginTop: 0, color: "#f5d061" }}>
          {profile.icon} Institution Separation Active: {profile.name}
        </h3>
        <p style={{ color: "#e2e8f0", marginBottom: "8px" }}>
          University Industrial Internships, Academic &amp; Field Attachments, SRC Governance Manifestos, Student Streams (Regular / Evening / Sandwich / Weekend), and University Exam-to-Alumni Graduation are <strong>strictly reserved for University institutions</strong>.
        </p>
        <p style={{ color: "#94a3b8", fontSize: "0.86rem", margin: 0 }}>
          Active Role Structure: <strong>{profile.leadershipRoleTitle}</strong> • <strong>{profile.facultyRoleTitle}</strong> • <strong>{profile.studentRoleTitle}</strong> ({profile.academicTermLabel}).
          {isDemo ? " Switch Demo Institution Type in the top banner to 'University / Tertiary' to preview University operations." : ""}
        </p>
      </div>
    );
  }

  const PLACEMENT_KIND_META = {
    internship: {
      endpoint: "/university/internships",
      storageKey: "uni_internships",
      singularKey: "internship",
      label: "Industrial Internship",
      idPrefix: "INT"
    },
    attachment: {
      endpoint: "/university/attachments",
      storageKey: "uni_attachments",
      singularKey: "attachment",
      label: "Academic / Field Attachment",
      idPrefix: "ATT"
    }
  };

  const submitPlacementRecord = async (kind, payload, list, setList, resetForm) => {
    const meta = PLACEMENT_KIND_META[kind];
    const demoCheck = checkDemoEntryLimit("university", "University Records", internships.length + attachments.length);
    if (!demoCheck.allowed) return notify(demoCheck.message, true);
    try {
      const res = await apiClient.post(meta.endpoint, payload);
      const created = res?.data?.data?.[meta.singularKey];
      trackDemoEntryCreated("university");
      const updated = [created, ...list];
      setList(updated);
      setTenantScopedRecord(meta.storageKey, updated);
      resetForm();
      notify(res?.data?.message || `✅ University ${meta.label} form submitted & recorded cleanly.`);
    } catch (err) {
      if (isDemo && !err?.response) {
        trackDemoEntryCreated("university");
        const localRec = { id: `${meta.idPrefix}-${Date.now()}`, ...payload, placementCategory: kind.toUpperCase(), status: "SUBMITTED", createdAt: new Date().toISOString() };
        const updated = [localRec, ...list];
        setList(updated);
        setTenantScopedRecord(meta.storageKey, updated);
        resetForm();
        return notify(`✅ [Offline Demo] University ${meta.label} form queued cleanly.`);
      }
      notify(err?.response?.data?.message || err.message || `Failed to submit ${meta.label} form.`, true);
    }
  };

  const gradePlacementRecord = async (kind, targetId, clearTarget, gradePayload, list, setList) => {
    const meta = PLACEMENT_KIND_META[kind];
    if (!targetId) return notify(`Select an ${meta.label.toLowerCase()} record to grade.`, true);
    try {
      const res = await apiClient.patch(`${meta.endpoint}/${targetId}/grade`, gradePayload);
      const graded = res?.data?.data?.[meta.singularKey];
      const updated = list.map((item) => (String(item.id) === String(targetId) ? graded : item));
      setList(updated);
      setTenantScopedRecord(meta.storageKey, updated);
      clearTarget();
      notify(res?.data?.message || `✅ ${meta.label} graded (${graded.letterGrade}, Score ${graded.finalScore}%) cleanly.`);
    } catch (err) {
      if (isDemo && !err?.response) {
        const avg = Math.round(((Number(gradePayload.supervisorScore) * 0.4) + (Number(gradePayload.reportScore) * 0.4) + (Number(gradePayload.courseGradeScore) * 0.2)) * 10) / 10;
        const letter = avg >= 80 ? "A" : avg >= 70 ? "B" : avg >= 60 ? "C" : "D";
        const updated = list.map((item) => String(item.id) === String(targetId) ? { ...item, ...gradePayload, finalScore: avg, letterGrade: letter, status: "GRADED" } : item);
        setList(updated);
        setTenantScopedRecord(meta.storageKey, updated);
        clearTarget();
        return notify(`✅ [Offline Demo] ${meta.label} graded (${letter}, ${avg}%).`);
      }
      notify(err?.response?.data?.message || err.message || `Failed to grade ${meta.label}.`, true);
    }
  };

  const handleSubmitInternship = async (e) => {
    e.preventDefault();
    if (!internForm.companyName || !internForm.supervisorName || !internForm.startDate || !internForm.endDate) {
      return notify("Please fill Company Name, Supervisor Name, Start Date, and End Date.", true);
    }
    await submitPlacementRecord("internship", internForm, internships, setInternships, () =>
      setInternForm((prev) => ({ ...prev, companyName: "", companyAddress: "", supervisorName: "", supervisorPhone: "", objectives: "" }))
    );
  };

  const handleGradeInternship = async (e) => {
    e.preventDefault();
    await gradePlacementRecord("internship", gradeTargetId, () => setGradeTargetId(""), internGradeForm, internships, setInternships);
  };

  const handleSubmitAttachment = async (e) => {
    e.preventDefault();
    if (!attachForm.hostInstitution || !attachForm.supervisorName || !attachForm.startDate || !attachForm.endDate) {
      return notify("Please fill Host Institution/Site, Field Supervisor, Start Date, and End Date.", true);
    }
    await submitPlacementRecord("attachment", attachForm, attachments, setAttachments, () =>
      setAttachForm((prev) => ({ ...prev, hostInstitution: "", hostAddress: "", supervisorName: "", academicSupervisor: "", supervisorPhone: "", objectives: "" }))
    );
  };

  const handleGradeAttachment = async (e) => {
    e.preventDefault();
    await gradePlacementRecord("attachment", gradeAttachTargetId, () => setGradeAttachTargetId(""), attachGradeForm, attachments, setAttachments);
  };

  const handleAddStream = async (e) => {
    e.preventDefault();
    if (!streamForm.streamName.trim()) return notify("Stream name is required.", true);
    const demoCheck = checkDemoEntryLimit("university", "University Records", streams.length);
    if (!demoCheck.allowed) return notify(demoCheck.message, true);
    try {
      const res = await apiClient.post("/university/streams", streamForm);
      const created = res?.data?.data?.stream;
      trackDemoEntryCreated("university");
      const updated = [created, ...streams];
      setStreams(updated);
      setTenantScopedRecord("uni_streams", updated);
      setStreamForm({ streamCode: "", streamName: "", scheduleSummary: "", coordinator: "", feePolicyNote: "" });
      notify(res?.data?.message || `✅ University Stream '${created.streamName}' registered cleanly.`);
    } catch (err) {
      if (isDemo && !err?.response) {
        trackDemoEntryCreated("university");
        const rec = { id: `stream_${Date.now()}`, ...streamForm, status: "ACTIVE" };
        const updated = [rec, ...streams];
        setStreams(updated);
        setTenantScopedRecord("uni_streams", updated);
        setStreamForm({ streamCode: "", streamName: "", scheduleSummary: "", coordinator: "", feePolicyNote: "" });
        return notify(`✅ [Offline Demo] University Stream '${rec.streamName}' added.`);
      }
      notify(err?.response?.data?.message || err.message || "Failed to add stream.", true);
    }
  };

  const handleAddGovernance = async (e) => {
    e.preventDefault();
    if (!govForm.positionTitle || !govForm.holderName || !govForm.duties) {
      return notify("Position Title, Student Holder Name, and Duties are required.", true);
    }
    const demoCheck = checkDemoEntryLimit("university", "University Records", governanceRoles.length);
    if (!demoCheck.allowed) return notify(demoCheck.message, true);
    try {
      const res = await apiClient.post("/university/governance", govForm);
      const created = res?.data?.data?.governanceRole;
      trackDemoEntryCreated("university");
      const updated = [created, ...governanceRoles];
      setGovernanceRoles(updated);
      setTenantScopedRecord("uni_governance", updated);
      setGovForm({ positionTitle: "", holderName: "", studentId: "", level: "Level 300", stream: "Regular Students", duties: "", strategicPlan: "", howToHelpSchool: "" });
      notify(res?.data?.message || `✅ Student Governance role '${created.positionTitle}' & school improvement plan saved.`);
    } catch (err) {
      if (isDemo && !err?.response) {
        trackDemoEntryCreated("university");
        const rec = { id: `src_${Date.now()}`, ...govForm, status: "ACTIVE" };
        const updated = [rec, ...governanceRoles];
        setGovernanceRoles(updated);
        setTenantScopedRecord("uni_governance", updated);
        return notify(`✅ [Offline Demo] SRC Role '${rec.positionTitle}' added.`);
      }
      notify(err?.response?.data?.message || err.message || "Failed to save SRC governance role.", true);
    }
  };

  const handleSetUniExam = async (e) => {
    e.preventDefault();
    if (!examForm.courseCode || !examForm.courseTitle) return notify("Course Code & Title are required.", true);
    const demoCheck = checkDemoEntryLimit("university", "University Examinations", exams.length);
    if (!demoCheck.allowed) return notify(demoCheck.message, true);
    try {
      const res = await apiClient.post("/university/exams", examForm);
      const exam = res?.data?.data?.exam;
      trackDemoEntryCreated("university");
      const updated = [exam, ...exams];
      setExams(updated);
      setTenantScopedRecord("uni_exams", updated);
      setExamForm((prev) => ({ ...prev, courseCode: "", courseTitle: "" }));
      notify(res?.data?.message || `✅ University Exam '${exam.courseCode}' published for ${exam.targetLevel}.`);
    } catch (err) {
      notify(err?.response?.data?.message || err.message || "Failed to publish University exam.", true);
    }
  };

  const handleRecordResult = async (e) => {
    e.preventDefault();
    if (!resultForm.studentName || !resultForm.courseCode) return notify("Student Name & Course Code are required.", true);
    try {
      const res = await apiClient.post("/university/results", resultForm);
      const rec = res?.data?.data?.result;
      await loadAllUniversityData();
      setResultForm((prev) => ({ ...prev, courseCode: "", courseTitle: "" }));
      notify(`✅ Result recorded for ${rec.studentName}: ${rec.courseCode} = ${rec.score}% (${rec.letterGrade}, ${rec.status}).`);
    } catch (err) {
      notify(err?.response?.data?.message || err.message || "Failed to publish course result.", true);
    }
  };

  const handleAdvanceOrGraduate = async (e) => {
    e.preventDefault();
    if (!advForm.studentName && !advForm.studentEmail) return notify("Provide Student Name or Email.", true);
    try {
      const res = await apiClient.post("/university/advance-student", advForm);
      const outcomeData = res?.data?.data;
      await loadAllUniversityData();
      notify(`🎓 ${outcomeData?.message || "Student progression updated cleanly."}`);
    } catch (err) {
      notify(err?.response?.data?.message || err.message || "Progression check failed.", true);
    }
  };

  const SUB_TABS = [
    { id: "INTERNSHIPS", label: `💼 Industrial Internships (${internships.length})` },
    { id: "ATTACHMENTS", label: `🛠️ Academic & Field Attachments (${attachments.length})` },
    { id: "EXAMS_GRADUATION", label: "🎓 Exams, Results & Alumni Graduation" },
    { id: "STREAMS", label: "🕒 Student Streams (Regular / Evening / Sandwich / Weekend)" },
    { id: "GOVERNANCE", label: "🏛️ Student Positions, Duties & School Plans (SRC)" }
  ];

  return (
    <div className="role-workspace-card" style={{ padding: "22px", borderRadius: "16px", marginBottom: "24px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px", marginBottom: "16px" }}>
        <div>
          <span style={{ fontSize: "0.75rem", fontWeight: 800, color: "#f5d061", letterSpacing: "1px", textTransform: "uppercase" }}>
            🎓 University Operations Suite • Strictly University Institutions Only
          </span>
          <h2 style={{ margin: "4px 0 0 0", color: "#ffffff", fontSize: "1.35rem" }}>
            University Academic, Internship, Attachment, Stream &amp; SRC Hub
          </h2>
        </div>
        <button
          type="button"
          onClick={loadAllUniversityData}
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
          {loading ? "⏳ Refreshing..." : "🔄 Refresh University Ledger"}
        </button>
      </div>

      {statusMsg && (
        <div
          style={{
            padding: "10px 14px",
            borderRadius: "10px",
            marginBottom: "14px",
            fontWeight: 700,
            background: statusMsg.isError ? "rgba(220, 38, 38, 0.25)" : "rgba(16, 185, 129, 0.22)",
            border: `1px solid ${statusMsg.isError ? "#f87171" : "#34d399"}`,
            color: statusMsg.isError ? "#fecaca" : "#a7f3d0"
          }}
        >
          {statusMsg.text}
        </div>
      )}

      <div className="role-tab-nav" style={{ marginBottom: "18px" }}>
        {SUB_TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`role-tab-btn ${activeSubTab === t.id ? "active" : ""}`}
            onClick={() => setActiveSubTab(t.id)}
            style={{ padding: "8px 14px", borderRadius: "10px", fontWeight: 700, cursor: "pointer" }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* TAB 1: INDUSTRIAL INTERNSHIPS (STRICTLY SEPARATED FROM ATTACHMENTS) */}
      {activeSubTab === "INTERNSHIPS" && (
        <div style={{ display: "grid", gap: "18px" }}>
          <form onSubmit={handleSubmitInternship} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: "12px", padding: "16px", background: "rgba(6, 15, 30, 0.55)", borderRadius: "12px", border: "1px solid rgba(212, 175, 55, 0.3)" }}>
            <h4 style={{ gridColumn: "1 / -1", margin: 0, color: "#f5d061" }}>💼 Submit Industrial Internship Placement Form</h4>
            <input placeholder="Student Full Name" value={internForm.studentName} onChange={(e) => setInternForm({ ...internForm, studentName: e.target.value })} style={inputStyle} />
            <input placeholder="Student Email" value={internForm.studentEmail} onChange={(e) => setInternForm({ ...internForm, studentEmail: e.target.value })} style={inputStyle} />
            <input placeholder="Degree Programme (e.g. B.Sc. Computer Science)" value={internForm.programme} onChange={(e) => setInternForm({ ...internForm, programme: e.target.value })} style={inputStyle} />
            <select value={internForm.stream} onChange={(e) => setInternForm({ ...internForm, stream: e.target.value })} style={inputStyle}>
              {streams.map((s) => <option key={s.id} value={s.streamName}>{s.streamName}</option>)}
            </select>
            <input required placeholder="Host Company / Employer Name *" value={internForm.companyName} onChange={(e) => setInternForm({ ...internForm, companyName: e.target.value })} style={inputStyle} />
            <input placeholder="Company Address / City" value={internForm.companyAddress} onChange={(e) => setInternForm({ ...internForm, companyAddress: e.target.value })} style={inputStyle} />
            <input required placeholder="Industry Supervisor Name *" value={internForm.supervisorName} onChange={(e) => setInternForm({ ...internForm, supervisorName: e.target.value })} style={inputStyle} />
            <input placeholder="Supervisor Phone" value={internForm.supervisorPhone} onChange={(e) => setInternForm({ ...internForm, supervisorPhone: e.target.value })} style={inputStyle} />
            <input required type="date" value={internForm.startDate} onChange={(e) => setInternForm({ ...internForm, startDate: e.target.value })} style={inputStyle} />
            <input required type="date" value={internForm.endDate} onChange={(e) => setInternForm({ ...internForm, endDate: e.target.value })} style={inputStyle} />
            <textarea placeholder="Industrial Internship Learning Objectives & Duties..." value={internForm.objectives} onChange={(e) => setInternForm({ ...internForm, objectives: e.target.value })} style={{ ...inputStyle, gridColumn: "1 / -1", minHeight: "64px" }} />
            <button type="submit" style={{ ...primaryBtnStyle, gridColumn: "1 / -1" }}>📤 Submit Industrial Internship Form</button>
          </form>

          {mode !== "STUDENT" && (
            <form onSubmit={handleGradeInternship} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: "12px", padding: "16px", background: "rgba(6, 15, 30, 0.55)", borderRadius: "12px", border: "1px solid rgba(16, 185, 129, 0.35)" }}>
              <h4 style={{ gridColumn: "1 / -1", margin: 0, color: "#6ee7b7" }}>📊 Grade Coursework + Industrial Internship Performance</h4>
              <select value={gradeTargetId} onChange={(e) => setGradeTargetId(e.target.value)} style={inputStyle}>
                <option value="">-- Select Submitted Internship --</option>
                {internships.map((i) => <option key={i.id} value={i.id}>{i.studentName} @ {i.companyName} ({i.status})</option>)}
              </select>
              <input type="number" min="0" max="100" placeholder="Supervisor Score (40%)" value={internGradeForm.supervisorScore} onChange={(e) => setInternGradeForm({ ...internGradeForm, supervisorScore: e.target.value })} style={inputStyle} />
              <input type="number" min="0" max="100" placeholder="Internship Report Score (40%)" value={internGradeForm.reportScore} onChange={(e) => setInternGradeForm({ ...internGradeForm, reportScore: e.target.value })} style={inputStyle} />
              <input type="number" min="0" max="100" placeholder="Coursework Grade (20%)" value={internGradeForm.courseGradeScore} onChange={(e) => setInternGradeForm({ ...internGradeForm, courseGradeScore: e.target.value })} style={inputStyle} />
              <input placeholder="Lecturer Evaluation Remarks" value={internGradeForm.lecturerRemarks} onChange={(e) => setInternGradeForm({ ...internGradeForm, lecturerRemarks: e.target.value })} style={inputStyle} />
              <button type="submit" style={emeraldBtnStyle}>✅ Save Internship Grade</button>
            </form>
          )}

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.86rem" }}>
              <thead>
                <tr>
                  <th style={thStyle}>Student</th>
                  <th style={thStyle}>Host Company</th>
                  <th style={thStyle}>Industry Supervisor</th>
                  <th style={thStyle}>Period</th>
                  <th style={thStyle}>Course / Final Score</th>
                  <th style={thStyle}>Grade &amp; Status</th>
                </tr>
              </thead>
              <tbody>
                {internships.length === 0 ? (
                  <tr><td colSpan={6} style={{ padding: "16px", textAlign: "center", color: "#94a3b8" }}>No industrial internship placements submitted yet.</td></tr>
                ) : internships.map((i) => (
                  <tr key={i.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                    <td style={tdStyle}><strong>{i.studentName}</strong><br /><span style={{ fontSize: "0.75rem", color: "#94a3b8" }}>{i.programme} • {i.stream}</span></td>
                    <td style={tdStyle}>{i.companyName}</td>
                    <td style={tdStyle}>{i.supervisorName}</td>
                    <td style={tdStyle}>{i.startDate} → {i.endDate}</td>
                    <td style={tdStyle}>{i.finalScore != null ? `${i.finalScore}% (Course ${i.academicScore ?? "-"}%)` : "Pending Assessment"}</td>
                    <td style={tdStyle}><span style={{ color: i.letterGrade ? "#6ee7b7" : "#f5d061", fontWeight: 800 }}>{i.letterGrade ? `${i.letterGrade} (${i.status})` : i.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 1B: ACADEMIC & FIELD ATTACHMENTS (SEPARATE COURSE OFFERING WORKFLOW) */}
      {activeSubTab === "ATTACHMENTS" && (
        <div style={{ display: "grid", gap: "18px" }}>
          <form onSubmit={handleSubmitAttachment} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: "12px", padding: "16px", background: "rgba(6, 15, 30, 0.55)", borderRadius: "12px", border: "1px solid rgba(56, 189, 248, 0.4)" }}>
            <h4 style={{ gridColumn: "1 / -1", margin: 0, color: "#7dd3fc" }}>🛠️ Submit Academic / Field Attachment Form (Course-Specific Practicum)</h4>
            <input placeholder="Student Full Name" value={attachForm.studentName} onChange={(e) => setAttachForm({ ...attachForm, studentName: e.target.value })} style={inputStyle} />
            <input placeholder="Student Email" value={attachForm.studentEmail} onChange={(e) => setAttachForm({ ...attachForm, studentEmail: e.target.value })} style={inputStyle} />
            <input placeholder="Course Code (e.g. PRAC 302)" value={attachForm.courseCode} onChange={(e) => setAttachForm({ ...attachForm, courseCode: e.target.value })} style={inputStyle} />
            <select value={attachForm.stream} onChange={(e) => setAttachForm({ ...attachForm, stream: e.target.value })} style={inputStyle}>
              {streams.map((s) => <option key={s.id} value={s.streamName}>{s.streamName}</option>)}
            </select>
            <input required placeholder="Host Institution / Field Site *" value={attachForm.hostInstitution} onChange={(e) => setAttachForm({ ...attachForm, hostInstitution: e.target.value })} style={inputStyle} />
            <input placeholder="Field Site Address / Location" value={attachForm.hostAddress} onChange={(e) => setAttachForm({ ...attachForm, hostAddress: e.target.value })} style={inputStyle} />
            <input required placeholder="Field Supervisor Name *" value={attachForm.supervisorName} onChange={(e) => setAttachForm({ ...attachForm, supervisorName: e.target.value })} style={inputStyle} />
            <input placeholder="University Academic Supervisor" value={attachForm.academicSupervisor} onChange={(e) => setAttachForm({ ...attachForm, academicSupervisor: e.target.value })} style={inputStyle} />
            <input type="number" min="1" placeholder="Required Logbook Hours" value={attachForm.logbookHours} onChange={(e) => setAttachForm({ ...attachForm, logbookHours: e.target.value })} style={inputStyle} />
            <input placeholder="Supervisor Phone" value={attachForm.supervisorPhone} onChange={(e) => setAttachForm({ ...attachForm, supervisorPhone: e.target.value })} style={inputStyle} />
            <input required type="date" value={attachForm.startDate} onChange={(e) => setAttachForm({ ...attachForm, startDate: e.target.value })} style={inputStyle} />
            <input required type="date" value={attachForm.endDate} onChange={(e) => setAttachForm({ ...attachForm, endDate: e.target.value })} style={inputStyle} />
            <textarea placeholder="Course Practicum & Attachment Field Activities..." value={attachForm.objectives} onChange={(e) => setAttachForm({ ...attachForm, objectives: e.target.value })} style={{ ...inputStyle, gridColumn: "1 / -1", minHeight: "64px" }} />
            <button type="submit" style={{ ...primaryBtnStyle, gridColumn: "1 / -1" }}>📤 Submit Academic Attachment Form</button>
          </form>

          {mode !== "STUDENT" && (
            <form onSubmit={handleGradeAttachment} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: "12px", padding: "16px", background: "rgba(6, 15, 30, 0.55)", borderRadius: "12px", border: "1px solid rgba(56, 189, 248, 0.4)" }}>
              <h4 style={{ gridColumn: "1 / -1", margin: 0, color: "#7dd3fc" }}>📊 Grade Academic &amp; Field Attachment Logbook Performance</h4>
              <select value={gradeAttachTargetId} onChange={(e) => setGradeAttachTargetId(e.target.value)} style={inputStyle}>
                <option value="">-- Select Submitted Attachment --</option>
                {attachments.map((a) => <option key={a.id} value={a.id}>{a.studentName} ({a.courseCode || "PRAC"}) @ {a.hostInstitution} ({a.status})</option>)}
              </select>
              <input type="number" min="0" max="100" placeholder="Field Supervisor Score (40%)" value={attachGradeForm.supervisorScore} onChange={(e) => setAttachGradeForm({ ...attachGradeForm, supervisorScore: e.target.value })} style={inputStyle} />
              <input type="number" min="0" max="100" placeholder="Attachment Logbook Score (40%)" value={attachGradeForm.reportScore} onChange={(e) => setAttachGradeForm({ ...attachGradeForm, reportScore: e.target.value })} style={inputStyle} />
              <input type="number" min="0" max="100" placeholder="Academic Seminar Grade (20%)" value={attachGradeForm.courseGradeScore} onChange={(e) => setAttachGradeForm({ ...attachGradeForm, courseGradeScore: e.target.value })} style={inputStyle} />
              <input placeholder="Lecturer Assessment Remarks" value={attachGradeForm.lecturerRemarks} onChange={(e) => setAttachGradeForm({ ...attachGradeForm, lecturerRemarks: e.target.value })} style={inputStyle} />
              <button type="submit" style={emeraldBtnStyle}>✅ Save Attachment Grade</button>
            </form>
          )}

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.86rem" }}>
              <thead>
                <tr>
                  <th style={thStyle}>Student &amp; Course</th>
                  <th style={thStyle}>Field Site / Host</th>
                  <th style={thStyle}>Supervisors &amp; Hours</th>
                  <th style={thStyle}>Period</th>
                  <th style={thStyle}>Final Score</th>
                  <th style={thStyle}>Grade &amp; Status</th>
                </tr>
              </thead>
              <tbody>
                {attachments.length === 0 ? (
                  <tr><td colSpan={6} style={{ padding: "16px", textAlign: "center", color: "#94a3b8" }}>No academic or field attachments submitted yet.</td></tr>
                ) : attachments.map((a) => (
                  <tr key={a.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                    <td style={tdStyle}><strong>{a.studentName}</strong><br /><span style={{ fontSize: "0.75rem", color: "#7dd3fc" }}>{a.courseCode || "PRAC"} • {a.stream}</span></td>
                    <td style={tdStyle}>{a.hostInstitution}</td>
                    <td style={tdStyle}>{a.supervisorName}{a.academicSupervisor ? ` / ${a.academicSupervisor}` : ""}<br /><span style={{ fontSize: "0.74rem", color: "#94a3b8" }}>{a.logbookHours || 240} hrs</span></td>
                    <td style={tdStyle}>{a.startDate} → {a.endDate}</td>
                    <td style={tdStyle}>{a.finalScore != null ? `${a.finalScore}% (Sem ${a.academicScore ?? "-"}%)` : "Pending Assessment"}</td>
                    <td style={tdStyle}><span style={{ color: a.letterGrade ? "#6ee7b7" : "#7dd3fc", fontWeight: 800 }}>{a.letterGrade ? `${a.letterGrade} (${a.status})` : a.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: EXAMS, RESULTS, PROGRESSION -> GRADUATE TO ALUMNI */}
      {activeSubTab === "EXAMS_GRADUATION" && (
        <div style={{ display: "grid", gap: "18px" }}>
          {mode !== "STUDENT" && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "16px" }}>
              <form onSubmit={handleSetUniExam} style={{ display: "grid", gap: "10px", padding: "16px", background: "rgba(6, 15, 30, 0.55)", borderRadius: "12px", border: "1px solid rgba(212, 175, 55, 0.3)" }}>
                <h4 style={{ margin: 0, color: "#f5d061" }}>📝 Set University Course Exam</h4>
                <input required placeholder="Course Code (e.g. CSCD 401)" value={examForm.courseCode} onChange={(e) => setExamForm({ ...examForm, courseCode: e.target.value })} style={inputStyle} />
                <input required placeholder="Course Title" value={examForm.courseTitle} onChange={(e) => setExamForm({ ...examForm, courseTitle: e.target.value })} style={inputStyle} />
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                  <select value={examForm.targetLevel} onChange={(e) => setExamForm({ ...examForm, targetLevel: e.target.value })} style={inputStyle}>
                    <option value="Level 100">Level 100</option>
                    <option value="Level 200">Level 200</option>
                    <option value="Level 300">Level 300</option>
                    <option value="Level 400">Level 400</option>
                  </select>
                  <input type="number" min="40" max="80" placeholder="Pass Mark" value={examForm.passMark} onChange={(e) => setExamForm({ ...examForm, passMark: e.target.value })} style={inputStyle} />
                </div>
                <button type="submit" style={primaryBtnStyle}>📚 Publish University Exam</button>
              </form>

              <form onSubmit={handleRecordResult} style={{ display: "grid", gap: "10px", padding: "16px", background: "rgba(6, 15, 30, 0.55)", borderRadius: "12px", border: "1px solid rgba(56, 189, 248, 0.35)" }}>
                <h4 style={{ margin: 0, color: "#7dd3fc" }}>🏅 Publish Student Result &amp; Pass Check</h4>
                <input required placeholder="Student Full Name" value={resultForm.studentName} onChange={(e) => setResultForm({ ...resultForm, studentName: e.target.value })} style={inputStyle} />
                <input placeholder="Student Email (for Alumni promotion)" value={resultForm.studentEmail} onChange={(e) => setResultForm({ ...resultForm, studentEmail: e.target.value })} style={inputStyle} />
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                  <input required placeholder="Course Code" value={resultForm.courseCode} onChange={(e) => setResultForm({ ...resultForm, courseCode: e.target.value })} style={inputStyle} />
                  <input required type="number" min="0" max="100" placeholder="Score (0-100)" value={resultForm.score} onChange={(e) => setResultForm({ ...resultForm, score: e.target.value })} style={inputStyle} />
                </div>
                <button type="submit" style={emeraldBtnStyle}>✅ Record Course Result</button>
              </form>

              <form onSubmit={handleAdvanceOrGraduate} style={{ display: "grid", gap: "10px", padding: "16px", background: "rgba(6, 15, 30, 0.55)", borderRadius: "12px", border: "1px solid rgba(212, 175, 55, 0.5)" }}>
                <h4 style={{ margin: 0, color: "#f5d061" }}>🎓 Promote Level / Graduate to Alumni</h4>
                <input required placeholder="Student Name" value={advForm.studentName} onChange={(e) => setAdvForm({ ...advForm, studentName: e.target.value })} style={inputStyle} />
                <input placeholder="Student Email" value={advForm.studentEmail} onChange={(e) => setAdvForm({ ...advForm, studentEmail: e.target.value })} style={inputStyle} />
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                  <select value={advForm.currentLevel} onChange={(e) => setAdvForm({ ...advForm, currentLevel: e.target.value })} style={inputStyle}>
                    <option value="Level 100">Level 100 → 200</option>
                    <option value="Level 200">Level 200 → 300</option>
                    <option value="Level 300">Level 300 → 400</option>
                    <option value="Level 400">Level 400 → Alumni</option>
                  </select>
                  <select value={advForm.action} onChange={(e) => setAdvForm({ ...advForm, action: e.target.value })} style={inputStyle}>
                    <option value="ADVANCE">Advance Next Level</option>
                    <option value="GRADUATE">Graduate to ALUMNI</option>
                  </select>
                </div>
                <button type="submit" style={primaryBtnStyle}>🏛️ Execute Progression / Graduate to Alumni</button>
              </form>
            </div>
          )}

          <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", padding: "12px 16px", background: "rgba(6, 15, 30, 0.5)", borderRadius: "10px" }}>
            <span><strong>Published University Exams:</strong> {exams.length}</span>
            <span><strong>Recorded Results:</strong> {resultsData.results?.length || 0}</span>
            <span><strong>Cumulative GPA:</strong> {Number(resultsData.cgpa || 0).toFixed(2)}</span>
            <span style={{ color: "#6ee7b7" }}><strong>Graduated Alumni:</strong> {resultsData.graduations?.length || 0}</span>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.86rem" }}>
              <thead>
                <tr>
                  <th style={thStyle}>Student</th>
                  <th style={thStyle}>Course</th>
                  <th style={thStyle}>Score</th>
                  <th style={thStyle}>Grade (GP)</th>
                  <th style={thStyle}>Progression Status</th>
                </tr>
              </thead>
              <tbody>
                {(resultsData.results || []).length === 0 ? (
                  <tr><td colSpan={5} style={{ padding: "14px", textAlign: "center", color: "#94a3b8" }}>No university course results recorded yet.</td></tr>
                ) : resultsData.results.map((r) => (
                  <tr key={r.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                    <td style={tdStyle}>{r.studentName}</td>
                    <td style={tdStyle}><strong>{r.courseCode}</strong> {r.courseTitle}</td>
                    <td style={tdStyle}>{r.score}%</td>
                    <td style={tdStyle}>{r.letterGrade} ({r.gradePoint})</td>
                    <td style={tdStyle}><span style={{ color: r.passed ? "#6ee7b7" : "#f87171", fontWeight: 800 }}>{r.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: UNIVERSITY STREAMS (REGULAR, EVENING, SANDWICH, WEEKEND) */}
      {activeSubTab === "STREAMS" && (
        <div style={{ display: "grid", gap: "16px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "14px" }}>
            {streams.map((st) => (
              <div key={st.id} style={{ padding: "16px", background: "rgba(6, 15, 30, 0.65)", border: "1.5px solid rgba(212, 175, 55, 0.45)", borderRadius: "12px" }}>
                <div style={{ fontSize: "0.72rem", fontWeight: 800, color: "#f5d061", letterSpacing: "1px" }}>{st.streamCode}</div>
                <h4 style={{ margin: "4px 0", color: "#ffffff" }}>{st.streamName}</h4>
                <p style={{ margin: "4px 0", fontSize: "0.84rem", color: "#cbd5e1" }}>{st.scheduleSummary}</p>
                <div style={{ fontSize: "0.78rem", color: "#94a3b8", marginTop: "6px" }}>Coordinator: {st.coordinator}</div>
              </div>
            ))}
          </div>

          {mode !== "STUDENT" && (
            <form onSubmit={handleAddStream} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "10px", padding: "16px", background: "rgba(6, 15, 30, 0.55)", borderRadius: "12px" }}>
              <h4 style={{ gridColumn: "1 / -1", margin: 0, color: "#f5d061" }}>➕ Add Custom University Stream</h4>
              <input placeholder="Stream Name (e.g. Distance / Online)" value={streamForm.streamName} onChange={(e) => setStreamForm({ ...streamForm, streamName: e.target.value })} style={inputStyle} />
              <input placeholder="Schedule Summary" value={streamForm.scheduleSummary} onChange={(e) => setStreamForm({ ...streamForm, scheduleSummary: e.target.value })} style={inputStyle} />
              <input placeholder="Coordinator Office" value={streamForm.coordinator} onChange={(e) => setStreamForm({ ...streamForm, coordinator: e.target.value })} style={inputStyle} />
              <button type="submit" style={primaryBtnStyle}>➕ Register Stream</button>
            </form>
          )}
        </div>
      )}

      {/* TAB 4: STUDENT POSITIONS, DUTIES & HOW TO HELP THE SCHOOL (SRC) */}
      {activeSubTab === "GOVERNANCE" && (
        <div style={{ display: "grid", gap: "16px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(290px, 1fr))", gap: "14px" }}>
            {governanceRoles.map((g) => (
              <div key={g.id} style={{ padding: "16px", background: "rgba(6, 15, 30, 0.65)", border: "1.5px solid rgba(212, 175, 55, 0.48)", borderRadius: "12px" }}>
                <div style={{ fontSize: "0.75rem", fontWeight: 800, color: "#f5d061", textTransform: "uppercase" }}>{g.positionTitle}</div>
                <div style={{ fontWeight: 800, fontSize: "1.02rem", color: "#ffffff", marginTop: "4px" }}>{g.holderName} ({g.level} • {g.stream})</div>
                <p style={{ fontSize: "0.84rem", color: "#e2e8f0", margin: "8px 0 4px 0" }}><strong>Duties:</strong> {g.duties}</p>
                <p style={{ fontSize: "0.84rem", color: "#bae6fd", margin: "4px 0" }}><strong>Strategic Plan:</strong> {g.strategicPlan}</p>
                <p style={{ fontSize: "0.84rem", color: "#6ee7b7", margin: "4px 0 0 0" }}><strong>How They Help the School:</strong> {g.howToHelpSchool}</p>
              </div>
            ))}
          </div>

          <form onSubmit={handleAddGovernance} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: "10px", padding: "16px", background: "rgba(6, 15, 30, 0.55)", borderRadius: "12px" }}>
            <h4 style={{ gridColumn: "1 / -1", margin: 0, color: "#f5d061" }}>🏛️ Register Student Leadership Position (SRC Representative &amp; Manifesto)</h4>
            <input required placeholder="Position Title (e.g. SRC Welfare Commissioner)" value={govForm.positionTitle} onChange={(e) => setGovForm({ ...govForm, positionTitle: e.target.value })} style={inputStyle} />
            <input required placeholder="Student Representative Name" value={govForm.holderName} onChange={(e) => setGovForm({ ...govForm, holderName: e.target.value })} style={inputStyle} />
            <input placeholder="Level (e.g. Level 300)" value={govForm.level} onChange={(e) => setGovForm({ ...govForm, level: e.target.value })} style={inputStyle} />
            <select value={govForm.stream} onChange={(e) => setGovForm({ ...govForm, stream: e.target.value })} style={inputStyle}>
              {streams.map((s) => <option key={s.id} value={s.streamName}>{s.streamName}</option>)}
            </select>
            <textarea required placeholder="Official Duties & Responsibilities..." value={govForm.duties} onChange={(e) => setGovForm({ ...govForm, duties: e.target.value })} style={{ ...inputStyle, gridColumn: "1 / -1" }} />
            <textarea placeholder="How They Plan to Help the University / School..." value={govForm.howToHelpSchool} onChange={(e) => setGovForm({ ...govForm, howToHelpSchool: e.target.value, strategicPlan: e.target.value })} style={{ ...inputStyle, gridColumn: "1 / -1" }} />
            <button type="submit" style={{ ...primaryBtnStyle, gridColumn: "1 / -1" }}>✅ Save Student Position &amp; Action Plan</button>
          </form>
        </div>
      )}
    </div>
  );
}

const inputStyle = {
  background: "rgba(8, 20, 40, 0.92)",
  color: "#f8fafc",
  border: "1px solid rgba(212, 175, 55, 0.45)",
  borderRadius: "8px",
  padding: "9px 12px",
  fontSize: "0.86rem",
  width: "100%",
  boxSizing: "border-box"
};

const primaryBtnStyle = {
  background: "linear-gradient(135deg, #0f2347 0%, #6b1d2f 45%, #d4af37 100%)",
  color: "#ffffff",
  border: "1px solid #f5d061",
  borderRadius: "10px",
  padding: "10px 16px",
  fontWeight: 800,
  cursor: "pointer"
};

const emeraldBtnStyle = {
  background: "linear-gradient(135deg, #065f46 0%, #059669 65%, #d4af37 100%)",
  color: "#ffffff",
  border: "1px solid #6ee7b7",
  borderRadius: "10px",
  padding: "10px 16px",
  fontWeight: 800,
  cursor: "pointer"
};

const thStyle = { padding: "10px 12px", textAlign: "left", fontSize: "0.78rem" };
const tdStyle = { padding: "10px 12px", color: "#e2e8f0" };
