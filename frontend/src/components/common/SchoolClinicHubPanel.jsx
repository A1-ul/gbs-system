import React, { useState, useEffect, useCallback } from "react";
import apiClient from "../../api/client/apiClient";
import { getTenantScopedRecord, setTenantScopedRecord } from "../../utils/institutionScope";
import { isDemoSandboxMode } from "../../utils/tokenStorage";
import { checkDemoEntryLimit, trackDemoEntryCreated } from "../../utils/demoLimitGuard";
import StaffAttendanceClockWidget from "./StaffAttendanceClockWidget";

const BLOOD_GROUPS = ["O+", "O-", "A+", "A-", "B+", "B-", "AB+", "AB-", "Pending Screening"];
const GENOTYPES = ["AA", "AS", "SS", "AC", "SC", "Pending Screening"];
const DISPOSITIONS = [
  "TREATED_AND_RETURNED_TO_CLASS",
  "ADMITTED_TO_SICKBAY",
  "SENT_HOME_TO_PARENT",
  "REFERRED_TO_HOSPITAL",
  "TEACHER_SICK_LEAVE"
];

export default function SchoolClinicHubPanel({
  mode = "STUDENT", // Clinical operations ONLY for "CLINIC_DOCTOR" | "CLINIC_NURSE" | "DOCTOR" | "NURSE" | "CLINIC"; all other portals are strictly Read-Only Personal Health Status!
  currentUser = null,
  onFeedback = null,
  forcedSubTab = null,
  onSubTabChange = null,
  hideInternalClockWidget = false
}) {
  const normalizedMode = String(mode || "STUDENT").toUpperCase();
  const isClinicOperator = ["CLINIC_DOCTOR", "CLINIC_NURSE", "DOCTOR", "NURSE", "CLINIC"].includes(normalizedMode);

  const [internalSubTab, setInternalSubTab] = useState(isClinicOperator ? "DIRECTORY_PROFILES" : "MY_HEALTH");
  const activeSubTab = forcedSubTab || internalSubTab;
  const setActiveSubTab = (next) => {
    setInternalSubTab(next);
    if (typeof onSubTabChange === "function") onSubTabChange(next);
  };
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState(null);

  const [profiles, setProfiles] = useState([]);
  const [visits, setVisits] = useState([]);
  const [summary, setSummary] = useState(null);
  const [inventory, setInventory] = useState([]);

  // Clinic Doctor/Nurse Cross-Portal Dossier & Staff/Student Directory Filters
  const [pullQuery, setPullQuery] = useState("");
  const [pulledDossier, setPulledDossier] = useState(null);
  const [directoryFilter, setDirectoryFilter] = useState("ALL"); // ALL | STUDENT | STAFF_TEACHER
  const [selectedPersonId, setSelectedPersonId] = useState(null);

  const callerEmail = String(currentUser?.email || "").trim().toLowerCase();
  const callerFullName = `${currentUser?.firstName || ""} ${currentUser?.lastName || ""}`.trim();

  const [visitForm, setVisitForm] = useState({
    patientName: "",
    patientRole: "STUDENT",
    patientEmail: "",
    classOrDepartment: "",
    admissionNumber: "",
    emergencyPhone: "",
    temperatureC: "37.4",
    bloodPressure: "118/76",
    pulseBpm: "78",
    chiefComplaint: "",
    diagnosis: "",
    treatmentGiven: "",
    medicationDispensed: "Paracetamol 500mg Tablets",
    dosageQty: 2,
    disposition: "TREATED_AND_RETURNED_TO_CLASS",
    notifyEmergencyContact: true
  });

  const [profileForm, setProfileForm] = useState({
    fullName: callerFullName || "",
    personRole: normalizedMode === "TEACHER" ? "TEACHER" : normalizedMode === "STAFF" || normalizedMode === "HR" || normalizedMode === "ACCOUNTANT" ? "STAFF" : "STUDENT",
    email: currentUser?.email || "",
    phone: currentUser?.phone || "",
    admissionNumber: "",
    classOrDepartment: "",
    bloodGroup: "O+",
    genotype: "AA",
    allergies: "None Reported",
    chronicConditions: "None Reported",
    nhisNumber: "",
    emergencyContactName: "",
    emergencyContactPhone: ""
  });

  const [medForm, setMedForm] = useState({
    itemName: "",
    category: "ANALGESIC",
    quantity: 50,
    reorderLevel: 15,
    unit: "tablets"
  });

  const isDemo = isDemoSandboxMode();

  const notify = (text, isError = false) => {
    setStatusMsg({ text, isError });
    if (typeof onFeedback === "function") onFeedback(text);
  };

  const loadClinicData = useCallback(async () => {
    setLoading(true);
    try {
      const requests = [
        apiClient.get("/clinic/profiles").catch(() => null),
        apiClient.get("/clinic/visits").catch(() => null)
      ];
      if (isClinicOperator) {
        requests.push(apiClient.get("/clinic/inventory").catch(() => null));
      }

      const [profRes, visRes, invRes] = await Promise.all(requests);

      let nextProfiles = profRes?.data?.data?.profiles;
      let nextVisits = visRes?.data?.data?.visits;

      if (!Array.isArray(nextProfiles)) {
        const localProfs = isDemo ? getTenantScopedRecord("clinic_profiles", []) : [];
        nextProfiles = isClinicOperator
          ? localProfs
          : localProfs.filter((p) => {
              const e = String(p.email || "").toLowerCase();
              const g = String(p.guardianEmail || "").toLowerCase();
              return callerEmail && (e === callerEmail || g === callerEmail);
            });
      } else if (!isClinicOperator && nextProfiles.length > 1 && normalizedMode !== "PARENT") {
        // Defense-in-depth: even in Demo Sandbox walkthrough, non-clinic portals ONLY show the active user's own health status
        const own = nextProfiles.filter((p) => {
          const e = String(p.email || "").toLowerCase();
          const nm = String(p.fullName || "").toLowerCase();
          return (callerEmail && e === callerEmail) || (callerFullName && nm === callerFullName.toLowerCase());
        });
        nextProfiles = own.length > 0 ? own : nextProfiles.slice(0, 1);
      }

      if (!Array.isArray(nextVisits)) {
        const localVisits = isDemo ? getTenantScopedRecord("clinic_visits", []) : [];
        nextVisits = isClinicOperator
          ? localVisits
          : localVisits.filter((v) => {
              const pe = String(v.patientEmail || "").toLowerCase();
              const ge = String(v.guardianEmail || "").toLowerCase();
              return callerEmail && (pe === callerEmail || ge === callerEmail);
            });
      } else if (!isClinicOperator && normalizedMode !== "PARENT") {
        nextVisits = nextVisits.filter((v) => {
          const pe = String(v.patientEmail || "").toLowerCase();
          const pn = String(v.patientName || "").toLowerCase();
          return (callerEmail && pe === callerEmail) || (callerFullName && pn === callerFullName.toLowerCase());
        });
      }

      setProfiles(nextProfiles);
      setVisits(nextVisits);
      setSummary(isClinicOperator ? visRes?.data?.data?.summary ?? null : null);
      setInventory(isClinicOperator ? invRes?.data?.data?.inventory ?? (isDemo ? getTenantScopedRecord("clinic_inventory", []) : []) : []);
    } finally {
      setLoading(false);
    }
  }, [isClinicOperator, isDemo, callerEmail, callerFullName, normalizedMode]);

  useEffect(() => {
    loadClinicData();
  }, [loadClinicData]);

  const handleSelectDirectoryPerson = (selectedId) => {
    const matched = profiles.find((p) => String(p.id) === String(selectedId));
    if (!matched) return;
    setVisitForm((prev) => ({
      ...prev,
      patientName: matched.fullName || prev.patientName,
      patientRole: matched.personRole || "STUDENT",
      patientEmail: matched.email || "",
      classOrDepartment: matched.classOrDepartment || "",
      admissionNumber: matched.admissionNumber || "",
      emergencyPhone: matched.emergencyContactPhone || matched.phone || ""
    }));
  };

  const handlePullRecords = async (e, explicitQuery = null) => {
    if (e) e.preventDefault();
    if (!isClinicOperator) return;
    const effectiveQuery = explicitQuery !== null ? String(explicitQuery) : pullQuery.trim();
    if (explicitQuery !== null) setPullQuery(effectiveQuery);
    setLoading(true);
    try {
      const res = await apiClient.get(`/clinic/pull-record?query=${encodeURIComponent(effectiveQuery)}`);
      setPulledDossier(res?.data?.data || null);
      notify(`🔍 Pulled ${res?.data?.data?.totalProfilesMatched ?? 0} medical profile(s) & ${res?.data?.data?.totalVisitsMatched ?? 0} clinic visit(s) across all linked portals.`);
    } catch {
      const q = effectiveQuery.toLowerCase();
      const matchedProfiles = profiles.filter((p) => !q || `${p.fullName} ${p.email} ${p.admissionNumber}`.toLowerCase().includes(q));
      const matchedVisits = visits.filter((v) => !q || `${v.patientName} ${v.patientEmail} ${v.diagnosis}`.toLowerCase().includes(q));
      setPulledDossier({
        query: effectiveQuery,
        matchedProfiles,
        matchedVisits,
        clinicSmsAlerts: [],
        totalProfilesMatched: matchedProfiles.length,
        totalVisitsMatched: matchedVisits.length,
        pulledAt: new Date().toISOString()
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAdmitOrTreat = async (e) => {
    e.preventDefault();
    if (!isClinicOperator) {
      return notify("Access Denied: Only School Clinic Doctors and Nurses can operate the School Clinic.", true);
    }
    if (!visitForm.patientName || !visitForm.chiefComplaint) {
      return notify("Patient Name and Symptoms / Chief Complaint are required.", true);
    }
    const demoCheck = checkDemoEntryLimit("clinic", "School Clinic Records", visits.length);
    if (!demoCheck.allowed) {
      return notify(demoCheck.message, true);
    }
    try {
      const res = await apiClient.post("/clinic/visits", visitForm);
      const created = res?.data?.data?.visit;
      trackDemoEntryCreated("clinic");
      await loadClinicData();
      setTenantScopedRecord("clinic_visits", [created, ...visits]);
      setVisitForm((prev) => ({ ...prev, chiefComplaint: "", diagnosis: "", treatmentGiven: "" }));
      notify(res?.data?.message || `🏥 Recorded ${created.patientRole} '${created.patientName}' in School Clinic (${created.disposition}).`);
    } catch (err) {
      if (isDemo && !err?.response) {
        trackDemoEntryCreated("clinic");
        const localRec = { id: `CLV-${Date.now()}`, ...visitForm, vitals: { temperatureC: visitForm.temperatureC, bloodPressure: visitForm.bloodPressure, pulseBpm: visitForm.pulseBpm }, createdAt: new Date().toISOString() };
        const nextV = [localRec, ...visits];
        setVisits(nextV);
        setTenantScopedRecord("clinic_visits", nextV);
        return notify(`✅ [Offline Demo] Clinic consultation queued for ${localRec.patientName}.`);
      }
      notify(err?.response?.data?.message || err.message || "Failed to record Clinic visit.", true);
    }
  };

  const handleDischargeFromSickbay = async (visitId, nextDisposition = "TREATED_AND_RETURNED_TO_CLASS") => {
    if (!isClinicOperator) return;
    try {
      const res = await apiClient.patch(`/clinic/visits/${visitId}`, { disposition: nextDisposition, discharge: true });
      await loadClinicData();
      notify(res?.data?.message || `✅ Patient cleared from Sickbay (${nextDisposition}).`);
    } catch (err) {
      notify(err?.response?.data?.message || "Failed to update disposition.", true);
    }
  };

  const handleSaveMedicalProfile = async (e) => {
    e.preventDefault();
    if (!isClinicOperator) {
      return notify("Access Denied: Only School Clinic Doctors and Nurses can edit medical dossiers.", true);
    }
    if (!profileForm.fullName && !profileForm.email) {
      return notify("Full Name or Email is required for Admission Medical Registration.", true);
    }
    const demoCheck = checkDemoEntryLimit("clinic", "School Clinic Medical Profiles", profiles.length);
    if (!demoCheck.allowed) {
      return notify(demoCheck.message, true);
    }
    try {
      const res = await apiClient.post("/clinic/profiles", profileForm);
      const saved = res?.data?.data?.profile;
      trackDemoEntryCreated("clinic");
      await loadClinicData();
      setTenantScopedRecord("clinic_profiles", [saved, ...profiles]);
      setProfileForm((prev) => ({ ...prev, fullName: "", email: "", phone: "", admissionNumber: "", nhisNumber: "" }));
      notify(res?.data?.message || `📋 Medical dossier updated cleanly for ${saved.fullName}.`);
    } catch (err) {
      notify(err?.response?.data?.message || "Failed to save Medical Dossier.", true);
    }
  };

  const handleAddInventory = async (e) => {
    e.preventDefault();
    if (!isClinicOperator) return;
    if (!medForm.itemName.trim()) return notify("Medicine name is required.", true);
    const demoCheck = checkDemoEntryLimit("clinic", "School Clinic Pharmacy Items", inventory.length);
    if (!demoCheck.allowed) {
      return notify(demoCheck.message, true);
    }
    try {
      const res = await apiClient.post("/clinic/inventory", medForm);
      trackDemoEntryCreated("clinic");
      await loadClinicData();
      setMedForm({ itemName: "", category: "ANALGESIC", quantity: 50, reorderLevel: 15, unit: "tablets" });
      notify(res?.data?.message || `💊 Updated School Clinic pharmacy stock cleanly.`);
    } catch (err) {
      notify(err?.response?.data?.message || "Failed to update clinic stock.", true);
    }
  };

  // STRICT READ-ONLY PERSONAL / LINKED-WARD MEDICAL HEALTH STATUS FOR ALL NON-CLINIC STAFF & USERS
  // (Headmaster, Teacher, Secretary, Accountant, HR, Non-Teaching Staff, Student, Parent)
  // They ONLY see their medical health status WITHOUT editing and CANNOT see what is happening inside the School Clinic.
  if (!isClinicOperator) {
    const isParentView = normalizedMode === "PARENT";
    const latestVisit = visits[0] || null;
    const primaryProfile = profiles[0] || null;
    const healthClearance = primaryProfile?.medicalClearanceStatus || (latestVisit && !latestVisit.dischargedAt && latestVisit.disposition === "ADMITTED_TO_SICKBAY" ? "UNDER_OBSERVATION" : "CLEARED");

    return (
      <div
        className="role-workspace-card"
        data-testid="clinic-readonly-health-status"
        style={{ padding: "22px", borderRadius: "16px", marginBottom: "24px" }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px", marginBottom: "16px" }}>
          <div>
            <span style={{ fontSize: "0.75rem", fontWeight: 800, color: "#f5d061", letterSpacing: "1px", textTransform: "uppercase" }}>
              🔒 {isParentView ? "Linked Ward Medical Health Status (View Only)" : "Personal Medical Health Status (Read-Only)"}
            </span>
            <h2 style={{ margin: "4px 0 0 0", color: "#ffffff", fontSize: "1.35rem" }}>
              {isParentView ? "My Ward Medical Health Status" : "My Personal Medical Health Status"}
            </h2>
            <p style={{ margin: "4px 0 0 0", fontSize: "0.82rem", color: "#cbd5e1" }}>
              Medical confidentiality enforced: You can only view {isParentView ? "your linked child's" : "your own"} verified health status without editing. School Clinic operations are strictly restricted to School Doctors and Nurses on the separate School Clinic Dashboard.
            </p>
          </div>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
            <span
              style={{
                background: healthClearance === "CLEARED" ? "rgba(16, 185, 129, 0.22)" : "rgba(245, 158, 11, 0.22)",
                border: `1px solid ${healthClearance === "CLEARED" ? "#34d399" : "#f59e0b"}`,
                color: healthClearance === "CLEARED" ? "#6ee7b7" : "#fde68a",
                borderRadius: "999px",
                padding: "6px 14px",
                fontWeight: 900,
                fontSize: "0.78rem"
              }}
            >
              🩺 Health Status: {healthClearance.replace(/_/g, " ")}
            </span>
            <button
              type="button"
              onClick={loadClinicData}
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
              {loading ? "⏳ Syncing..." : "🔄 Refresh Health Status"}
            </button>
          </div>
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

        <div style={{ display: "grid", gap: "16px" }}>
          <div>
            <h4 style={{ margin: "0 0 10px 0", color: "#f5d061" }}>
              🪪 {isParentView ? "Linked Ward Medical Health Summary (Read-Only)" : "My Baseline Medical Health Summary (Read-Only)"}
            </h4>
            {profiles.length === 0 ? (
              <div style={{ padding: "14px", borderRadius: "10px", background: "rgba(6, 15, 30, 0.5)", color: "#cbd5e1", fontSize: "0.86rem" }}>
                No medical screening profile has been recorded yet{isParentView ? " for your linked ward" : " for your account"}. Please visit the School Clinic so a School Doctor or Nurse can update your medical status.
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "12px" }}>
                {profiles.map((p) => (
                  <div key={p.id} style={{ padding: "14px", borderRadius: "12px", background: "rgba(6, 15, 30, 0.72)", border: "1px solid rgba(212, 175, 55, 0.45)" }}>
                    <div style={{ fontSize: "0.72rem", fontWeight: 800, color: "#f5d061" }}>
                      {p.personRole} • {p.admissionNumber || "REGISTERED"} • STATUS: {p.medicalClearanceStatus || "CLEARED"}
                    </div>
                    <strong style={{ display: "block", fontSize: "1.02rem", color: "#ffffff", margin: "4px 0" }}>{p.fullName}</strong>
                    <div style={{ fontSize: "0.82rem", color: "#cbd5e1", lineHeight: 1.55 }}>
                      <div>Blood Group: <strong style={{ color: "#7dd3fc" }}>{p.bloodGroup}</strong> • Genotype: <strong>{p.genotype}</strong></div>
                      <div>Allergies: <strong>{p.allergies || "None Reported"}</strong></div>
                      <div>Chronic Conditions: <strong>{p.chronicConditions || "None Reported"}</strong></div>
                      <div>Immunization: <strong>{p.immunizationStatus || "Verified"}</strong></div>
                      <div>Emergency Contact: <strong>{p.emergencyContactPhone || p.phone || "On File"}</strong></div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <h4 style={{ margin: "0 0 10px 0", color: "#7dd3fc" }}>
              🩺 {isParentView ? "Linked Ward Medical Checkup Status" : "My Personal Medical Checkup History"} ({visits.length})
            </h4>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.84rem" }}>
                <thead>
                  <tr>
                    <th style={thStyle}>Date</th>
                    <th style={thStyle}>Vitals</th>
                    <th style={thStyle}>Clinical Assessment</th>
                    <th style={thStyle}>Prescribed Care</th>
                    <th style={thStyle}>Health Status</th>
                  </tr>
                </thead>
                <tbody>
                  {visits.length === 0 ? (
                    <tr><td colSpan={5} style={{ padding: "14px", textAlign: "center", color: "#94a3b8" }}>No personal clinic consultations recorded yet.</td></tr>
                  ) : visits.map((v) => (
                    <tr key={v.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                      <td style={tdStyle}>{String(v.createdAt || "").slice(0, 10) || "Recent"}</td>
                      <td style={tdStyle}>{v.vitals?.temperatureC || "37.0"}°C • {v.vitals?.bloodPressure || "118/76"}</td>
                      <td style={tdStyle}>{v.chiefComplaint}<br /><strong style={{ color: "#7dd3fc" }}>{v.diagnosis || "Evaluated"}</strong></td>
                      <td style={tdStyle}>{v.medicationDispensed || "Clinical Rest"}</td>
                      <td style={tdStyle}><span style={{ color: "#6ee7b7", fontWeight: 800 }}>{v.dischargedAt ? `DISCHARGED (${v.disposition})` : v.disposition}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // SCHOOL DOCTORS & NURSES CLINICAL OPERATIONS VIEW (DEDICATED SCHOOL CLINIC DASHBOARD ONLY)
  const staffAndTeachersCount = profiles.filter((p) => String(p.personRole || "").toUpperCase() !== "STUDENT").length;
  const studentsCount = profiles.filter((p) => String(p.personRole || "").toUpperCase() === "STUDENT").length;
  const filteredDirectory = profiles.filter((p) => {
    const r = String(p.personRole || "").toUpperCase();
    if (directoryFilter === "STUDENT") return r === "STUDENT";
    if (directoryFilter === "STAFF_TEACHER") return r !== "STUDENT";
    return true;
  });

  const selectedProfile = profiles.find((p) => String(p.id) === String(selectedPersonId)) || null;
  const selectedProfileVisits = selectedProfile
    ? visits.filter((v) =>
        (selectedProfile.email && String(v.patientEmail || "").toLowerCase() === String(selectedProfile.email).toLowerCase()) ||
        (selectedProfile.personId && String(v.patientId || "") === String(selectedProfile.personId)) ||
        String(v.patientName || "").toLowerCase() === String(selectedProfile.fullName || "").toLowerCase()
      )
    : [];

  return (
    <div className="role-workspace-card" style={{ padding: "22px", borderRadius: "16px", marginBottom: "24px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px", marginBottom: "16px" }}>
        <div>
          <span style={{ fontSize: "0.75rem", fontWeight: 800, color: "#f5d061", letterSpacing: "1px", textTransform: "uppercase" }}>
            🏥 School Clinic Clinical Operations • Doctors &amp; Nurses Only
          </span>
          <h2 style={{ margin: "4px 0 0 0", color: "#ffffff", fontSize: "1.35rem" }}>
            Complete Staff &amp; Student Medical Registry, Sickbay &amp; Pharmacy Hub
          </h2>
        </div>
        <button
          type="button"
          onClick={loadClinicData}
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
          {loading ? "⏳ Syncing Clinic..." : "🔄 Pull Latest Clinic Records"}
        </button>
      </div>

      {/* Live Cross-Portal KPI Summary */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px", marginBottom: "16px" }}>
        <div style={kpiCardStyle}>
          <span style={{ fontSize: "0.76rem", color: "#cbd5e1" }}>All Staff &amp; Student Profiles</span>
          <strong style={{ fontSize: "1.55rem", color: "#f5d061" }}>{summary?.totalRegisteredProfiles ?? profiles.length}</strong>
          <span style={{ fontSize: "0.72rem", color: "#94a3b8" }}>Students: {studentsCount} • Staff/Teachers: {staffAndTeachersCount}</span>
        </div>
        <div style={kpiCardStyle}>
          <span style={{ fontSize: "0.76rem", color: "#cbd5e1" }}>Clinic Consultations</span>
          <strong style={{ fontSize: "1.55rem", color: "#7dd3fc" }}>{summary?.totalClinicVisits ?? visits.length}</strong>
          <span style={{ fontSize: "0.72rem", color: "#94a3b8" }}>Student: {summary?.studentVisits ?? 0} • Teacher/Staff: {summary?.teacherAndStaffVisits ?? 0}</span>
        </div>
        <div style={kpiCardStyle}>
          <span style={{ fontSize: "0.76rem", color: "#cbd5e1" }}>Active Sickbay Occupancy</span>
          <strong style={{ fontSize: "1.55rem", color: (summary?.activeSickbayCount || 0) > 0 ? "#fb7185" : "#6ee7b7" }}>{summary?.activeSickbayCount ?? 0}</strong>
          <span style={{ fontSize: "0.72rem", color: "#94a3b8" }}>Admitted Now Across Campus</span>
        </div>
        <div style={kpiCardStyle}>
          <span style={{ fontSize: "0.76rem", color: "#cbd5e1" }}>Pharmacy Low-Stock Alerts</span>
          <strong style={{ fontSize: "1.55rem", color: "#fcd34d" }}>{summary?.lowStockItemsCount ?? 0}</strong>
          <span style={{ fontSize: "0.72rem", color: "#94a3b8" }}>Medicine Supplies Monitored</span>
        </div>
      </div>

      {/* School Clinic Medical Officer (Doctor / Nurse) Clock-In & Clock-Out Desk */}
      {!hideInternalClockWidget && (
        <StaffAttendanceClockWidget
          isClinicDesk={true}
          currentUser={currentUser}
          onFeedback={notify}
        />
      )}

      {/* Cross-Portal Medical Record Pull Bar */}
      <form onSubmit={(e) => handlePullRecords(e, null)} style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "16px", padding: "12px", background: "rgba(6, 15, 30, 0.72)", borderRadius: "12px", border: "1px solid rgba(56, 189, 248, 0.35)" }}>
        <input
          value={pullQuery}
          onChange={(e) => setPullQuery(e.target.value)}
          placeholder="🔍 Pull linked medical record by Student/Staff Name, Email, Class/Dept, or Admission/Staff ID..."
          style={{ ...inputStyle, flex: 1, minWidth: "240px" }}
        />
        <button type="submit" style={primaryBtnStyle}>🔍 Pull Medical Dossier Across System</button>
      </form>

      {statusMsg && (
        <div style={{
          padding: "10px 14px",
          borderRadius: "10px",
          marginBottom: "14px",
          fontWeight: 700,
          background: statusMsg.isError ? "rgba(220, 38, 38, 0.25)" : "rgba(16, 185, 129, 0.22)",
          border: `1px solid ${statusMsg.isError ? "#f87171" : "#34d399"}`,
          color: statusMsg.isError ? "#fecaca" : "#a7f3d0"
        }}>
          {statusMsg.text}
        </div>
      )}

      {pulledDossier && (
        <div style={{ marginBottom: "16px", padding: "14px", borderRadius: "12px", background: "rgba(15, 35, 71, 0.78)", border: "1.5px solid #38bdf8" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
            <strong style={{ color: "#7dd3fc" }}>📂 Pulled Cross-Portal Medical Record ({pulledDossier.totalProfilesMatched} Profile(s), {pulledDossier.totalVisitsMatched} Visit(s))</strong>
            <button type="button" onClick={() => setPulledDossier(null)} style={{ background: "transparent", border: "1px solid #64748b", color: "#cbd5e1", borderRadius: "6px", padding: "2px 8px", cursor: "pointer" }}>✕ Close</button>
          </div>
          <div style={{ display: "grid", gap: "8px", fontSize: "0.84rem" }}>
            {(pulledDossier.matchedProfiles || []).slice(0, 8).map((p) => (
              <div key={p.id} style={{ padding: "8px 10px", borderRadius: "8px", background: "rgba(6, 15, 30, 0.7)" }}>
                <strong>{p.fullName}</strong> ({p.personRole} • {p.admissionNumber} • {p.classOrDepartment}) — Blood: <strong style={{ color: "#f5d061" }}>{p.bloodGroup}</strong> | Genotype: <strong>{p.genotype}</strong> | Allergies: <strong>{p.allergies}</strong> | Emergency: {p.emergencyContactPhone || "N/A"}
              </div>
            ))}
            {(pulledDossier.matchedVisits || []).slice(0, 8).map((v) => (
              <div key={v.id} style={{ padding: "8px 10px", borderRadius: "8px", background: "rgba(6, 15, 30, 0.5)", borderLeft: "3px solid #34d399" }}>
                <strong>{v.patientName}</strong> ({String(v.createdAt || "").slice(0, 10)}): {v.chiefComplaint} → <strong>{v.diagnosis}</strong> [{v.disposition}] — Rx: {v.medicationDispensed || "Clinical Rest"}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Clinic Sub-Navigation Tabs (isolated class name so DashboardTabPageController never mistakes it for primary portal tabs) */}
      <div
        className="clinic-subtab-nav"
        style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "16px" }}
      >
        {[
          { id: "DIRECTORY_PROFILES", label: `👥 All Staff & Student Health Profiles (${profiles.length})` },
          { id: "TREAT_ADMIT", label: "🩺 Admit / Treat Student or Staff" },
          { id: "REGISTRATIONS", label: `📋 Admission Medical Registry (${profiles.length})` },
          { id: "VISITS", label: `🏥 Clinic Visits & Sickbay Log (${visits.length})` },
          { id: "INVENTORY", label: `💊 Clinic Pharmacy Stock (${inventory.length})` }
        ].map((t) => (
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

      {/* TAB 0: HEADMASTER COMPLETE ALL STAFF & STUDENT HEALTH PROFILES */}
      {activeSubTab === "DIRECTORY_PROFILES" && (
        <div style={{ display: "grid", gap: "16px" }}>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
            {[
              { key: "ALL", label: `All Profiles (${profiles.length})` },
              { key: "STUDENT", label: `Students (${studentsCount})` },
              { key: "STAFF_TEACHER", label: `Teachers & Staff (${staffAndTeachersCount})` }
            ].map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => setDirectoryFilter(f.key)}
                style={{
                  background: directoryFilter === f.key ? "#d4af37" : "rgba(15, 35, 71, 0.7)",
                  color: directoryFilter === f.key ? "#081833" : "#f8fafc",
                  border: "1px solid #d4af37",
                  borderRadius: "8px",
                  padding: "6px 12px",
                  fontWeight: 800,
                  fontSize: "0.8rem",
                  cursor: "pointer"
                }}
              >
                {f.label}
              </button>
            ))}
          </div>

          {selectedProfile && (
            <div style={{ padding: "16px", borderRadius: "12px", background: "rgba(15, 35, 71, 0.9)", border: "1.5px solid #f5d061" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px", marginBottom: "10px" }}>
                <strong style={{ color: "#f5d061", fontSize: "1rem" }}>
                  🪪 Complete Health Dossier: {selectedProfile.fullName} ({selectedProfile.personRole})
                </strong>
                <button type="button" onClick={() => setSelectedPersonId(null)} style={{ background: "transparent", border: "1px solid #94a3b8", color: "#f8fafc", borderRadius: "6px", padding: "4px 10px", cursor: "pointer" }}>
                  ✕ Close Dossier
                </button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: "10px", fontSize: "0.84rem", color: "#e2e8f0", marginBottom: "12px" }}>
                <div><strong>Email:</strong> {selectedProfile.email || "—"}</div>
                <div><strong>ID / Admission No:</strong> {selectedProfile.admissionNumber || "—"}</div>
                <div><strong>Class / Department:</strong> {selectedProfile.classOrDepartment || "—"}</div>
                <div><strong>Blood Group / Genotype:</strong> {selectedProfile.bloodGroup} / {selectedProfile.genotype}</div>
                <div><strong>Allergies:</strong> {selectedProfile.allergies || "None Reported"}</div>
                <div><strong>Chronic Conditions:</strong> {selectedProfile.chronicConditions || "None Reported"}</div>
                <div><strong>NHIS ID:</strong> {selectedProfile.nhisNumber || "Pending"}</div>
                <div><strong>Emergency Contact:</strong> {selectedProfile.emergencyContactPhone || selectedProfile.phone || "—"}</div>
              </div>
              <div style={{ fontSize: "0.82rem", color: "#cbd5e1" }}>
                <strong style={{ color: "#7dd3fc" }}>Recorded Clinic Visits ({selectedProfileVisits.length}):</strong>
                {selectedProfileVisits.length === 0 ? (
                  <p style={{ margin: "6px 0 0 0", color: "#94a3b8" }}>No clinic visits recorded yet for this individual.</p>
                ) : (
                  <ul style={{ margin: "6px 0 0 0", paddingLeft: "18px" }}>
                    {selectedProfileVisits.map((v) => (
                      <li key={v.id}>
                        {String(v.createdAt || "").slice(0, 10)}: {v.chiefComplaint} — <strong>{v.diagnosis}</strong> [{v.disposition}] (Rx: {v.medicationDispensed || "None"})
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}

          {filteredDirectory.length === 0 ? (
            <div style={{ padding: "18px", textAlign: "center", color: "#94a3b8", background: "rgba(6, 15, 30, 0.45)", borderRadius: "12px" }}>
              No Staff or Student clinic profiles recorded in this filter yet.
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(265px, 1fr))", gap: "12px" }}>
              {filteredDirectory.map((p) => {
                const initials = String(p.fullName || "GB").split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
                const isStudent = String(p.personRole || "").toUpperCase() === "STUDENT";
                return (
                  <div key={p.id} style={{ padding: "14px", borderRadius: "12px", background: "rgba(6, 15, 30, 0.72)", border: "1px solid rgba(212, 175, 55, 0.42)", display: "flex", flexDirection: "column", gap: "8px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <div style={{ width: "42px", height: "42px", borderRadius: "50%", background: isStudent ? "linear-gradient(135deg, #0284c7, #0f2347)" : "linear-gradient(135deg, #b45309, #0f2347)", border: "1.5px solid #f5d061", color: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: "0.9rem", flexShrink: 0 }}>
                        {initials || "GB"}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <strong style={{ display: "block", color: "#ffffff", fontSize: "0.96rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.fullName}</strong>
                        <span style={{ fontSize: "0.72rem", fontWeight: 800, color: isStudent ? "#7dd3fc" : "#f5d061" }}>
                          {p.personRole} • {p.admissionNumber || "REG"}
                        </span>
                      </div>
                    </div>
                    <div style={{ fontSize: "0.8rem", color: "#cbd5e1", lineHeight: 1.45 }}>
                      <div>Dept/Class: <strong>{p.classOrDepartment || "General"}</strong></div>
                      <div>Blood: <strong style={{ color: "#f5d061" }}>{p.bloodGroup}</strong> | Genotype: <strong>{p.genotype}</strong></div>
                      <div>Allergies: <strong>{p.allergies || "None"}</strong></div>
                      <div>Emergency: <strong>{p.emergencyContactPhone || p.phone || "On File"}</strong></div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedPersonId(p.id)}
                      style={{ marginTop: "auto", background: "rgba(56, 189, 248, 0.16)", border: "1px solid #38bdf8", color: "#bae6fd", borderRadius: "8px", padding: "6px 10px", fontWeight: 800, fontSize: "0.78rem", cursor: "pointer" }}
                    >
                      📂 Open Complete Health Profile
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 1: ADMIT / TREAT STUDENT OR TEACHER */}
      {activeSubTab === "TREAT_ADMIT" && (
        <form onSubmit={handleAdmitOrTreat} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(205px, 1fr))", gap: "12px", padding: "16px", background: "rgba(6, 15, 30, 0.6)", borderRadius: "12px", border: "1px solid rgba(212, 175, 55, 0.35)" }}>
          <h4 style={{ gridColumn: "1 / -1", margin: 0, color: "#f5d061" }}>
            🩺 Treat Patient or Admit to School Sickbay (Students, Teachers &amp; Staff)
          </h4>

          {profiles.length > 0 && (
            <select onChange={(e) => handleSelectDirectoryPerson(e.target.value)} defaultValue="" style={{ ...inputStyle, gridColumn: "1 / -1" }}>
              <option value="">-- Optional: Autofill from Admitted Student / Staff Directory --</option>
              {profiles.map((p) => (
                <option key={p.id} value={p.id}>{p.fullName} ({p.personRole} • {p.admissionNumber} • {p.classOrDepartment})</option>
              ))}
            </select>
          )}

          <select value={visitForm.patientRole} onChange={(e) => setVisitForm({ ...visitForm, patientRole: e.target.value })} style={inputStyle}>
            <option value="STUDENT">Student</option>
            <option value="TEACHER">Teacher / Lecturer</option>
            <option value="STAFF">General Staff</option>
          </select>
          <input required placeholder="Patient Full Name *" value={visitForm.patientName} onChange={(e) => setVisitForm({ ...visitForm, patientName: e.target.value })} style={inputStyle} />
          <input placeholder="Email Address" value={visitForm.patientEmail} onChange={(e) => setVisitForm({ ...visitForm, patientEmail: e.target.value })} style={inputStyle} />
          <input placeholder="Class / Department" value={visitForm.classOrDepartment} onChange={(e) => setVisitForm({ ...visitForm, classOrDepartment: e.target.value })} style={inputStyle} />
          <input placeholder="Admission / Staff ID" value={visitForm.admissionNumber} onChange={(e) => setVisitForm({ ...visitForm, admissionNumber: e.target.value })} style={inputStyle} />
          <input placeholder="Emergency / Parent Phone" value={visitForm.emergencyPhone} onChange={(e) => setVisitForm({ ...visitForm, emergencyPhone: e.target.value })} style={inputStyle} />
          <input placeholder="Temp (°C) e.g. 37.8" value={visitForm.temperatureC} onChange={(e) => setVisitForm({ ...visitForm, temperatureC: e.target.value })} style={inputStyle} />
          <input placeholder="Blood Pressure e.g. 115/75" value={visitForm.bloodPressure} onChange={(e) => setVisitForm({ ...visitForm, bloodPressure: e.target.value })} style={inputStyle} />
          <input required placeholder="Symptoms / Chief Complaint *" value={visitForm.chiefComplaint} onChange={(e) => setVisitForm({ ...visitForm, chiefComplaint: e.target.value })} style={{ ...inputStyle, gridColumn: "1 / -1" }} />
          <input placeholder="Clinical Diagnosis / Nurse Note" value={visitForm.diagnosis} onChange={(e) => setVisitForm({ ...visitForm, diagnosis: e.target.value })} style={inputStyle} />
          <select value={visitForm.medicationDispensed} onChange={(e) => setVisitForm({ ...visitForm, medicationDispensed: e.target.value })} style={inputStyle}>
            <option value="">-- Medication Dispensed (Optional) --</option>
            {inventory.map((m) => <option key={m.id} value={m.itemName}>{m.itemName} (Stock: {m.quantity})</option>)}
          </select>
          <select value={visitForm.disposition} onChange={(e) => setVisitForm({ ...visitForm, disposition: e.target.value })} style={inputStyle}>
            {DISPOSITIONS.map((d) => <option key={d} value={d}>{d.replace(/_/g, " ")}</option>)}
          </select>
          <label style={{ display: "flex", alignItems: "center", gap: "8px", color: "#bae6fd", fontSize: "0.84rem" }}>
            <input type="checkbox" checked={visitForm.notifyEmergencyContact} onChange={(e) => setVisitForm({ ...visitForm, notifyEmergencyContact: e.target.checked })} />
            Dispatch Parent / Emergency SMS Alert
          </label>
          <button type="submit" style={{ ...primaryBtnStyle, gridColumn: "1 / -1" }}>🏥 Record Clinic Visit &amp; Sync Across School Portals</button>
        </form>
      )}

      {/* TAB 2: BASELINE ADMISSION MEDICAL REGISTRATIONS */}
      {activeSubTab === "REGISTRATIONS" && (
        <div style={{ display: "grid", gap: "16px" }}>
          <form onSubmit={handleSaveMedicalProfile} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(195px, 1fr))", gap: "10px", padding: "16px", background: "rgba(6, 15, 30, 0.6)", borderRadius: "12px" }}>
            <h4 style={{ gridColumn: "1 / -1", margin: 0, color: "#f5d061" }}>📋 Register / Update Admission Medical Record (Students, Teachers &amp; Staff)</h4>
            <select value={profileForm.personRole} onChange={(e) => setProfileForm({ ...profileForm, personRole: e.target.value })} style={inputStyle}>
              <option value="STUDENT">Student</option>
              <option value="TEACHER">Teacher / Lecturer</option>
              <option value="STAFF">General Staff</option>
            </select>
            <input required placeholder="Full Name *" value={profileForm.fullName} onChange={(e) => setProfileForm({ ...profileForm, fullName: e.target.value })} style={inputStyle} />
            <input placeholder="Email Address" value={profileForm.email} onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })} style={inputStyle} />
            <input placeholder="Admission / Staff Number" value={profileForm.admissionNumber} onChange={(e) => setProfileForm({ ...profileForm, admissionNumber: e.target.value })} style={inputStyle} />
            <input placeholder="Class / Department" value={profileForm.classOrDepartment} onChange={(e) => setProfileForm({ ...profileForm, classOrDepartment: e.target.value })} style={inputStyle} />
            <select value={profileForm.bloodGroup} onChange={(e) => setProfileForm({ ...profileForm, bloodGroup: e.target.value })} style={inputStyle}>
              {BLOOD_GROUPS.map((bg) => <option key={bg} value={bg}>Blood: {bg}</option>)}
            </select>
            <select value={profileForm.genotype} onChange={(e) => setProfileForm({ ...profileForm, genotype: e.target.value })} style={inputStyle}>
              {GENOTYPES.map((g) => <option key={g} value={g}>Genotype: {g}</option>)}
            </select>
            <input placeholder="Known Allergies (e.g. Penicillin)" value={profileForm.allergies} onChange={(e) => setProfileForm({ ...profileForm, allergies: e.target.value })} style={inputStyle} />
            <input placeholder="Chronic Conditions (e.g. Asthma)" value={profileForm.chronicConditions} onChange={(e) => setProfileForm({ ...profileForm, chronicConditions: e.target.value })} style={inputStyle} />
            <input placeholder="NHIS / Health Insurance ID" value={profileForm.nhisNumber} onChange={(e) => setProfileForm({ ...profileForm, nhisNumber: e.target.value })} style={inputStyle} />
            <input placeholder="Emergency Parent/Kin Phone" value={profileForm.emergencyContactPhone} onChange={(e) => setProfileForm({ ...profileForm, emergencyContactPhone: e.target.value })} style={inputStyle} />
            <button type="submit" style={{ ...primaryBtnStyle, gridColumn: "1 / -1" }}>💾 Save Admission Medical Profile</button>
          </form>

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.84rem" }}>
              <thead>
                <tr>
                  <th style={thStyle}>Person &amp; Role</th>
                  <th style={thStyle}>Admission ID</th>
                  <th style={thStyle}>Class / Dept</th>
                  <th style={thStyle}>Blood / Genotype</th>
                  <th style={thStyle}>Allergies &amp; Conditions</th>
                  <th style={thStyle}>Emergency Contact</th>
                </tr>
              </thead>
              <tbody>
                {profiles.length === 0 ? (
                  <tr><td colSpan={6} style={{ padding: "14px", textAlign: "center", color: "#94a3b8" }}>No medical admission profiles synced yet.</td></tr>
                ) : profiles.map((p) => (
                  <tr key={p.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                    <td style={tdStyle}><strong>{p.fullName}</strong><br /><span style={{ fontSize: "0.75rem", color: "#f5d061" }}>{p.personRole}</span></td>
                    <td style={tdStyle}>{p.admissionNumber}</td>
                    <td style={tdStyle}>{p.classOrDepartment}</td>
                    <td style={tdStyle}>{p.bloodGroup} / {p.genotype}</td>
                    <td style={tdStyle}>{p.allergies} • {p.chronicConditions}</td>
                    <td style={tdStyle}>{p.emergencyContactPhone || p.phone || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: CLINIC VISITS & SICKBAY LOG */}
      {activeSubTab === "VISITS" && (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.84rem" }}>
            <thead>
              <tr>
                <th style={thStyle}>Patient</th>
                <th style={thStyle}>Vitals</th>
                <th style={thStyle}>Complaint &amp; Diagnosis</th>
                <th style={thStyle}>Medication</th>
                <th style={thStyle}>Status / Disposition</th>
                <th style={thStyle}>Action</th>
              </tr>
            </thead>
            <tbody>
              {visits.length === 0 ? (
                <tr><td colSpan={6} style={{ padding: "14px", textAlign: "center", color: "#94a3b8" }}>No School Clinic consultations recorded yet.</td></tr>
              ) : visits.map((v) => (
                <tr key={v.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                  <td style={tdStyle}><strong>{v.patientName}</strong> ({v.patientRole})<br /><span style={{ fontSize: "0.74rem", color: "#94a3b8" }}>{v.classOrDepartment}</span></td>
                  <td style={tdStyle}>{v.vitals?.temperatureC}°C • {v.vitals?.bloodPressure}</td>
                  <td style={tdStyle}>{v.chiefComplaint}<br /><strong style={{ color: "#7dd3fc" }}>{v.diagnosis}</strong></td>
                  <td style={tdStyle}>{v.medicationDispensed || "Observation"}</td>
                  <td style={tdStyle}>
                    <span style={{ color: v.disposition === "ADMITTED_TO_SICKBAY" && !v.dischargedAt ? "#fb7185" : "#6ee7b7", fontWeight: 800 }}>
                      {v.dischargedAt ? `DISCHARGED (${v.disposition})` : v.disposition}
                    </span>
                  </td>
                  <td style={tdStyle}>
                    {v.disposition === "ADMITTED_TO_SICKBAY" && !v.dischargedAt ? (
                      <button type="button" onClick={() => handleDischargeFromSickbay(v.id)} style={{ background: "#059669", color: "#fff", border: "none", borderRadius: "6px", padding: "5px 9px", fontSize: "0.75rem", fontWeight: 700, cursor: "pointer" }}>
                        ✅ Discharge Sickbay
                      </button>
                    ) : "Cleared"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 4: CLINIC PHARMACY INVENTORY */}
      {activeSubTab === "INVENTORY" && (
        <div style={{ display: "grid", gap: "16px" }}>
          <form onSubmit={handleAddInventory} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "10px", padding: "14px", background: "rgba(6, 15, 30, 0.6)", borderRadius: "12px" }}>
            <input required placeholder="Medicine / First-Aid Supply Name" value={medForm.itemName} onChange={(e) => setMedForm({ ...medForm, itemName: e.target.value })} style={inputStyle} />
            <input type="number" min="1" placeholder="Quantity" value={medForm.quantity} onChange={(e) => setMedForm({ ...medForm, quantity: e.target.value })} style={inputStyle} />
            <input placeholder="Unit (tablets / bottles / kits)" value={medForm.unit} onChange={(e) => setMedForm({ ...medForm, unit: e.target.value })} style={inputStyle} />
            <button type="submit" style={primaryBtnStyle}>💊 Add / Restock Supply</button>
          </form>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "12px" }}>
            {inventory.map((m) => (
              <div key={m.id} style={{ padding: "14px", borderRadius: "10px", background: "rgba(6, 15, 30, 0.7)", border: `1px solid ${m.quantity <= m.reorderLevel ? "#f87171" : "rgba(212, 175, 55, 0.4)"}` }}>
                <div style={{ fontSize: "0.72rem", color: "#f5d061", fontWeight: 800 }}>{m.category}</div>
                <strong style={{ color: "#ffffff", display: "block", margin: "4px 0" }}>{m.itemName}</strong>
                <div style={{ fontSize: "0.86rem", color: m.quantity <= m.reorderLevel ? "#fca5a5" : "#6ee7b7", fontWeight: 800 }}>
                  {m.quantity} {m.unit} {m.quantity <= m.reorderLevel ? "⚠️ LOW STOCK" : "✓ In Stock"}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const kpiCardStyle = {
  background: "rgba(6, 15, 30, 0.72)",
  border: "1px solid rgba(212, 175, 55, 0.4)",
  borderRadius: "12px",
  padding: "12px 14px",
  display: "flex",
  flexDirection: "column",
  gap: "3px"
};

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

const thStyle = { padding: "10px 12px", textAlign: "left", fontSize: "0.78rem" };
const tdStyle = { padding: "10px 12px", color: "#e2e8f0" };
