import React, { useState, useEffect, useCallback } from "react";
import apiClient from "../../api/client/apiClient";
import { getTenantScopedRecord, setTenantScopedRecord } from "../../utils/institutionScope";
import { isDemoSandboxMode } from "../../utils/tokenStorage";

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
  mode = "ADMIN", // "ADMIN" | "TEACHER" | "STUDENT" | "PARENT" | "STAFF" | "HR"
  currentUser = null,
  onFeedback = null
}) {
  const [activeSubTab, setActiveSubTab] = useState("TREAT_ADMIT");
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState(null);

  const [profiles, setProfiles] = useState([]);
  const [visits, setVisits] = useState([]);
  const [summary, setSummary] = useState(null);
  const [inventory, setInventory] = useState([]);

  // Cross-Portal Instant Record Pull
  const [pullQuery, setPullQuery] = useState("");
  const [pulledDossier, setPulledDossier] = useState(null);

  const [visitForm, setVisitForm] = useState({
    patientName: mode === "STUDENT" || mode === "TEACHER" ? `${currentUser?.firstName || ""} ${currentUser?.lastName || ""}`.trim() : "",
    patientRole: mode === "TEACHER" ? "TEACHER" : "STUDENT",
    patientEmail: mode === "STUDENT" || mode === "TEACHER" ? currentUser?.email || "" : "",
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
    fullName: "",
    personRole: "STUDENT",
    email: "",
    phone: "",
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
  const canClinicallyWrite = ["ADMIN", "TEACHER", "STAFF", "HR"].includes(mode);

  const notify = (text, isError = false) => {
    setStatusMsg({ text, isError });
    if (typeof onFeedback === "function") onFeedback(text);
  };

  const loadClinicData = useCallback(async () => {
    setLoading(true);
    try {
      const [profRes, visRes, invRes] = await Promise.all([
        apiClient.get("/clinic/profiles").catch(() => null),
        apiClient.get("/clinic/visits").catch(() => null),
        apiClient.get("/clinic/inventory").catch(() => null)
      ]);

      const localProfs = getTenantScopedRecord("clinic_profiles", []);
      const localVisits = getTenantScopedRecord("clinic_visits", []);
      const localInv = getTenantScopedRecord("clinic_inventory", []);

      setProfiles(profRes?.data?.data?.profiles ?? localProfs);
      setVisits(visRes?.data?.data?.visits ?? localVisits);
      setSummary(visRes?.data?.data?.summary ?? null);
      setInventory(invRes?.data?.data?.inventory ?? localInv);
    } finally {
      setLoading(false);
    }
  }, []);

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

  const handlePullRecords = async (e) => {
    if (e) e.preventDefault();
    setLoading(true);
    try {
      const res = await apiClient.get(`/clinic/pull-record?query=${encodeURIComponent(pullQuery.trim())}`);
      setPulledDossier(res?.data?.data || null);
      notify(`🔍 Pulled ${res?.data?.data?.totalProfilesMatched ?? 0} medical profile(s) & ${res?.data?.data?.totalVisitsMatched ?? 0} clinic visit(s) across all linked portals.`);
    } catch {
      const q = pullQuery.trim().toLowerCase();
      const matchedProfiles = profiles.filter((p) => !q || `${p.fullName} ${p.email} ${p.admissionNumber}`.toLowerCase().includes(q));
      const matchedVisits = visits.filter((v) => !q || `${v.patientName} ${v.patientEmail} ${v.diagnosis}`.toLowerCase().includes(q));
      setPulledDossier({
        query: pullQuery,
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
    if (!visitForm.patientName || !visitForm.chiefComplaint) {
      return notify("Patient Name and Symptoms / Chief Complaint are required.", true);
    }
    try {
      const res = await apiClient.post("/clinic/visits", visitForm);
      const created = res?.data?.data?.visit;
      await loadClinicData();
      setTenantScopedRecord("clinic_visits", [created, ...visits]);
      setVisitForm((prev) => ({ ...prev, chiefComplaint: "", diagnosis: "", treatmentGiven: "" }));
      notify(`🏥 Recorded ${created.patientRole} '${created.patientName}' in School Clinic (${created.disposition}).`);
    } catch (err) {
      if (isDemo) {
        const localRec = { id: `CLV-${Date.now()}`, ...visitForm, vitals: { temperatureC: visitForm.temperatureC, bloodPressure: visitForm.bloodPressure, pulseBpm: visitForm.pulseBpm }, createdAt: new Date().toISOString() };
        const nextV = [localRec, ...visits];
        setVisits(nextV);
        setTenantScopedRecord("clinic_visits", nextV);
        return notify(`✅ [Demo] Clinic consultation recorded for ${localRec.patientName}.`);
      }
      notify(err?.response?.data?.message || err.message || "Failed to record Clinic visit.", true);
    }
  };

  const handleDischargeFromSickbay = async (visitId, nextDisposition = "TREATED_AND_RETURNED_TO_CLASS") => {
    try {
      await apiClient.patch(`/clinic/visits/${visitId}`, { disposition: nextDisposition, discharge: true });
      await loadClinicData();
      notify(`✅ Patient cleared from Sickbay (${nextDisposition}).`);
    } catch (err) {
      notify(err?.response?.data?.message || "Failed to update disposition.", true);
    }
  };

  const handleSaveMedicalProfile = async (e) => {
    e.preventDefault();
    if (!profileForm.fullName && !profileForm.email) {
      return notify("Full Name or Email is required for Admission Medical Registration.", true);
    }
    try {
      const res = await apiClient.post("/clinic/profiles", profileForm);
      const saved = res?.data?.data?.profile;
      await loadClinicData();
      setTenantScopedRecord("clinic_profiles", [saved, ...profiles]);
      setProfileForm((prev) => ({ ...prev, fullName: "", email: "", phone: "", admissionNumber: "", nhisNumber: "" }));
      notify(`📋 Admission Medical Registration synced for ${saved.fullName} across School Clinic & Portal Directory.`);
    } catch (err) {
      notify(err?.response?.data?.message || "Failed to save Admission Medical Record.", true);
    }
  };

  const handleAddInventory = async (e) => {
    e.preventDefault();
    if (!medForm.itemName.trim()) return notify("Medicine name is required.", true);
    try {
      await apiClient.post("/clinic/inventory", medForm);
      await loadClinicData();
      setMedForm({ itemName: "", category: "ANALGESIC", quantity: 50, reorderLevel: 15, unit: "tablets" });
      notify(`💊 Updated School Clinic pharmacy stock cleanly.`);
    } catch (err) {
      notify(err?.response?.data?.message || "Failed to update clinic stock.", true);
    }
  };

  return (
    <div className="role-workspace-card" style={{ padding: "22px", borderRadius: "16px", marginBottom: "24px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px", marginBottom: "16px" }}>
        <div>
          <span style={{ fontSize: "0.75rem", fontWeight: 800, color: "#f5d061", letterSpacing: "1px", textTransform: "uppercase" }}>
            🏥 Integrated School Clinic, Sickbay &amp; Admission Medical Registry
          </span>
          <h2 style={{ margin: "4px 0 0 0", color: "#ffffff", fontSize: "1.35rem" }}>
            Student &amp; Teacher Clinic Portal • Cross-System Health Dossier
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
          <span style={{ fontSize: "0.76rem", color: "#cbd5e1" }}>Admission Medical Profiles</span>
          <strong style={{ fontSize: "1.55rem", color: "#f5d061" }}>{summary?.totalRegisteredProfiles ?? profiles.length}</strong>
          <span style={{ fontSize: "0.72rem", color: "#94a3b8" }}>Students &amp; Teachers Synced</span>
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

      {/* Cross-Portal Medical Record Pull Bar */}
      <form onSubmit={handlePullRecords} style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "16px", padding: "12px", background: "rgba(6, 15, 30, 0.72)", borderRadius: "12px", border: "1px solid rgba(56, 189, 248, 0.35)" }}>
        <input
          value={pullQuery}
          onChange={(e) => setPullQuery(e.target.value)}
          placeholder="🔍 Pull linked medical record by Student/Teacher Name, Email, Class, or Admission ID..."
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
            {(pulledDossier.matchedProfiles || []).slice(0, 5).map((p) => (
              <div key={p.id} style={{ padding: "8px 10px", borderRadius: "8px", background: "rgba(6, 15, 30, 0.7)" }}>
                <strong>{p.fullName}</strong> ({p.personRole} • {p.admissionNumber} • {p.classOrDepartment}) — Blood: <strong style={{ color: "#f5d061" }}>{p.bloodGroup}</strong> | Genotype: <strong>{p.genotype}</strong> | Allergies: <strong>{p.allergies}</strong> | Emergency: {p.emergencyContactPhone || "N/A"}
              </div>
            ))}
            {(pulledDossier.matchedVisits || []).slice(0, 5).map((v) => (
              <div key={v.id} style={{ padding: "8px 10px", borderRadius: "8px", background: "rgba(6, 15, 30, 0.5)", borderLeft: "3px solid #34d399" }}>
                <strong>{v.patientName}</strong> ({v.createdAt?.slice(0, 10)}): {v.chiefComplaint} → <strong>{v.diagnosis}</strong> [{v.disposition}] — Rx: {v.medicationDispensed || "Clinical Rest"}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="role-tab-nav" style={{ marginBottom: "16px" }}>
        {[
          { id: "TREAT_ADMIT", label: mode === "STUDENT" || mode === "PARENT" ? "🩺 Request Clinic / Health Check-In" : "🩺 Admit / Treat Student or Teacher" },
          { id: "REGISTRATIONS", label: `📋 Admission Medical Registrations (${profiles.length})` },
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

      {/* TAB 1: ADMIT / TREAT STUDENT OR TEACHER */}
      {activeSubTab === "TREAT_ADMIT" && (
        <form onSubmit={handleAdmitOrTreat} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(205px, 1fr))", gap: "12px", padding: "16px", background: "rgba(6, 15, 30, 0.6)", borderRadius: "12px", border: "1px solid rgba(212, 175, 55, 0.35)" }}>
          <h4 style={{ gridColumn: "1 / -1", margin: 0, color: "#f5d061" }}>
            {mode === "STUDENT" ? "🩺 Student Clinic Check-In Request" : "🩺 Treat Patient or Admit to School Sickbay (Students & Teachers)"}
          </h4>

          {profiles.length > 0 && canClinicallyWrite && (
            <select onChange={(e) => handleSelectDirectoryPerson(e.target.value)} defaultValue="" style={{ ...inputStyle, gridColumn: "1 / -1" }}>
              <option value="">-- Optional: Autofill from Admitted Student / Teacher Directory --</option>
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
            <h4 style={{ gridColumn: "1 / -1", margin: 0, color: "#f5d061" }}>📋 Register / Update Admission Medical Record (Students &amp; Teachers)</h4>
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
                {canClinicallyWrite && <th style={thStyle}>Action</th>}
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
                  {canClinicallyWrite && (
                    <td style={tdStyle}>
                      {v.disposition === "ADMITTED_TO_SICKBAY" && !v.dischargedAt ? (
                        <button type="button" onClick={() => handleDischargeFromSickbay(v.id)} style={{ background: "#059669", color: "#fff", border: "none", borderRadius: "6px", padding: "5px 9px", fontSize: "0.75rem", fontWeight: 700, cursor: "pointer" }}>
                          ✅ Discharge Sickbay
                        </button>
                      ) : "Cleared"}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 4: CLINIC PHARMACY INVENTORY */}
      {activeSubTab === "INVENTORY" && (
        <div style={{ display: "grid", gap: "16px" }}>
          {canClinicallyWrite && (
            <form onSubmit={handleAddInventory} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "10px", padding: "14px", background: "rgba(6, 15, 30, 0.6)", borderRadius: "12px" }}>
              <input required placeholder="Medicine / First-Aid Supply Name" value={medForm.itemName} onChange={(e) => setMedForm({ ...medForm, itemName: e.target.value })} style={inputStyle} />
              <input type="number" min="1" placeholder="Quantity" value={medForm.quantity} onChange={(e) => setMedForm({ ...medForm, quantity: e.target.value })} style={inputStyle} />
              <input placeholder="Unit (tablets / bottles / kits)" value={medForm.unit} onChange={(e) => setMedForm({ ...medForm, unit: e.target.value })} style={inputStyle} />
              <button type="submit" style={primaryBtnStyle}>💊 Add / Restock Supply</button>
            </form>
          )}
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
