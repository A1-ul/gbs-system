import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import apiClient from "../../../api/client/apiClient";
import "./DataMigration.css";

const ALL_CLASS_LEVELS = [
  'Lower Primary 1',
  'Lower Primary 2',
  'Lower Primary 3',
  'Upper Primary 4',
  'Upper Primary 5',
  'Upper Primary 6',
  'JHS 1',
  'JHS 2',
  'JHS 3',
  'SHS 1',
  'SHS 2',
  'SHS 3',
  'University Level 100',
  'University Level 200',
  'University Level 300',
  'University Level 400'
];

const STAFF_DEPARTMENTS = [
  'Faculty of Sciences & Mathematics',
  'Faculty of Arts & Humanities',
  'Faculty of Computing & IT',
  'Faculty of Business & Economics',
  'Human Resources & Personnel',
  'Transport & Logistics Fleet',
  'Library & Media Center',
  'Finance & Accounting Depot',
  'Campus Security & Surveillance',
  'Facilities & Estates Engineering'
];

export default function DataMigrationDashboard() {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState([]);
  const [templates, setTemplates] = useState(null);
  const [entityType, setEntityType] = useState("STUDENTS");
  const [selectedClassLevel, setSelectedClassLevel] = useState("Lower Primary 1");
  const [selectedDepartment, setSelectedDepartment] = useState("Faculty of Sciences & Mathematics");
  const [recordCount, setRecordCount] = useState(15);
  const [fileSelected, setFileSelected] = useState("incoming_students_roster_2026.csv");
  const [loading, setLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState("");
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showGuidance, setShowGuidance] = useState(true);

  const fetchJobs = async () => {
    try {
      const res = await apiClient.get("/migration/jobs?tenantId=1");
      if (res.data?.success) {
        setJobs(res.data.data);
      }
      const tRes = await apiClient.get("/migration/templates");
      if (tRes.data?.success) {
        setTemplates(tRes.data.data);
      }
    } catch (err) {
      console.error("Failed to fetch migration jobs:", err);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  const handleImport = async () => {
    setLoading(true);
    try {
      const res = await apiClient.post("/migration/import", {
        tenantId: 1,
        entityType,
        classLevel: entityType === "STUDENTS" ? selectedClassLevel : "",
        department: (entityType === "TEACHERS" || entityType === "STAFF") ? selectedDepartment : "",
        filename: fileSelected,
        records: new Array(parseInt(recordCount) || 10).fill(0)
      });
      if (res.data?.success) {
        const dest = entityType === "STUDENTS" ? `Class ${selectedClassLevel}` : ((entityType === "TEACHERS" || entityType === "STAFF") ? selectedDepartment : "Campus Master Ledger");
        setActionMessage(`Batch #${res.data.data.id} imported successfully into ${dest}: ${res.data.data.processedCount} records committed.`);
        fetchJobs();
        setTimeout(() => setActionMessage(""), 6000);
      }
    } catch (err) {
      alert(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRollback = async (jobId) => {
    if (!window.confirm(`Are you sure you want to rollback batch #${jobId}? This will remove all records created in this batch.`)) {
      return;
    }
    try {
      const res = await apiClient.post(`/migration/jobs/${jobId}/rollback`, { tenantId: 1 });
      if (res.data?.success) {
        setActionMessage(`Batch #${jobId} rolled back successfully. Removed ${res.data.data.recordsRemoved} records.`);
        fetchJobs();
        setTimeout(() => setActionMessage(""), 5000);
      }
    } catch (err) {
      alert(err.response?.data?.message || err.message);
    }
  };

  const handleSignOut = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    sessionStorage.clear();
    navigate("/login");
  };

  return (
    <div className="mig-container">
      {/* Top Header with Ergonomic Return & Logout Buttons */}
      <header className="mig-header">
        <div>
          <h2>📦 DATA MIGRATION & SYSTEM ETL ENGINE</h2>
          <p>MIGRATE LEGACY SIS/ERP DATA STORED BY CLASS LEVELS (PRIMARY 1 - UNI 400) & STAFF DEPARTMENTS</p>
        </div>
        <div className="mig-header-actions" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            className="mig-btn-secondary"
            onClick={() => navigate(-1)}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            ← Return / Back
          </button>
          <button
            onClick={handleSignOut}
            style={{
              background: '#dc2626',
              border: 'none',
              color: '#ffffff',
              padding: '8px 16px',
              borderRadius: '8px',
              fontSize: '0.9rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            🚪 Sign Out
          </button>
          <button
            className="mig-btn-secondary"
            onClick={() => setShowGuidance(!showGuidance)}
            style={{ borderColor: '#3b82f6', color: '#93c5fd' }}
          >
            📘 {showGuidance ? "Hide Migration Guide" : "Migration Guidance Protocol"}
          </button>
          <button className="mig-btn-secondary" onClick={() => setShowTemplateModal(true)}>
            📄 View Schema Templates
          </button>
          <button className="mig-btn-secondary" onClick={fetchJobs}>
            🔄 Refresh Ledger
          </button>
        </div>
      </header>

      {/* Real-Life Campus Hero Banner */}
      <section
        className="mig-hero-banner"
        style={{
          backgroundImage: `linear-gradient(135deg, rgba(15, 23, 42, 0.70), rgba(15, 23, 42, 0.85)), url('/assets/onboarding_campus_bg.jpg')`
        }}
      >
        <div className="hero-text-block">
          <div className="hero-pill-badge">LEGACY-TO-GBS DATA MIGRATION ENGINE</div>
          <h2>Enterprise Data Migration & Classification Hub</h2>
          <p>
            Seamlessly import legacy spreadsheets or SIS dumps. All records are automatically validated, deduplicated, and organized into their exact Class Levels (Lower Primary 1 to University Level 400) and Staff Departments.
          </p>
        </div>

        <div className="hero-photo-showcase-frame">
          <div className="showcase-photo-wrapper">
            <img
              src="/assets/onboarding_campus_bg.jpg"
              alt="Institutional Campus Ingestion Enclave"
              className="real-life-dashboard-photo"
            />
            <div className="showcase-verified-badge">
              <span className="live-camera-pulse"></span>
              <span>VERIFIED INSTITUTIONAL REPOSITORY</span>
            </div>
          </div>
          <div className="showcase-photo-caption">
            <span>📍 Institutional Records Ingestion & Campus Enclave • Daylight View</span>
          </div>
        </div>
      </section>

      {/* 5-Step Step-by-Step Guidance on Migrating Legacy Data onto GBS */}
      {showGuidance && (
        <section style={{
          background: 'linear-gradient(135deg, #0f172a, #1e293b)',
          border: '1px solid rgba(59, 130, 246, 0.35)',
          borderRadius: '16px',
          padding: '24px',
          margin: '20px 0',
          boxShadow: '0 8px 30px rgba(0,0,0,0.45)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '12px', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '1.6rem' }}>📖</span>
              <div>
                <h3 style={{ margin: 0, color: '#38bdf8', fontSize: '1.25rem' }}>
                  Step-by-Step Guidance: How to Migrate Data from Old System onto GBS
                </h3>
                <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: '#94a3b8' }}>
                  Follow this standardized enterprise procedure to guarantee clean, structured ingestion without data corruption or duplicates.
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowTemplateModal(true)}
              style={{ background: 'linear-gradient(135deg, #2563eb, #1d4ed8)', border: 'none', color: '#fff', padding: '8px 16px', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}
            >
              📥 Download Sample CSV Templates
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
            <div style={{ background: 'rgba(255,255,255,0.04)', padding: '16px', borderRadius: '12px', borderLeft: '4px solid #3b82f6' }}>
              <span style={{ fontSize: '0.75rem', background: '#3b82f6', color: '#fff', padding: '2px 8px', borderRadius: '4px', fontWeight: 700 }}>STEP 1</span>
              <h4 style={{ margin: '10px 0 6px', color: '#ffffff' }}>Export Old System Data</h4>
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#cbd5e1', lineHeight: 1.6 }}>
                Export your student rosters, teacher profiles, or fee logs from the legacy SIS/ERP (e.g., PowerSchool, Sycamore, or Excel sheets) into <code>.CSV</code> or <code>.XLSX</code> format.
              </p>
            </div>

            <div style={{ background: 'rgba(255,255,255,0.04)', padding: '16px', borderRadius: '12px', borderLeft: '4px solid #10b981' }}>
              <span style={{ fontSize: '0.75rem', background: '#10b981', color: '#fff', padding: '2px 8px', borderRadius: '4px', fontWeight: 700 }}>STEP 2</span>
              <h4 style={{ margin: '10px 0 6px', color: '#ffffff' }}>Match Template Headers</h4>
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#cbd5e1', lineHeight: 1.6 }}>
                Align spreadsheet column headers with GBS standard templates (Student ID, Full Name, Email, Emergency Contact, Enrollment Date).
              </p>
            </div>

            <div style={{ background: 'rgba(255,255,255,0.04)', padding: '16px', borderRadius: '12px', borderLeft: '4px solid #f59e0b' }}>
              <span style={{ fontSize: '0.75rem', background: '#f59e0b', color: '#fff', padding: '2px 8px', borderRadius: '4px', fontWeight: 700 }}>STEP 3</span>
              <h4 style={{ margin: '10px 0 6px', color: '#ffffff' }}>Route by Class / Staff Level</h4>
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#cbd5e1', lineHeight: 1.6 }}>
                Select the destination <strong>Class Level</strong> (Lower Primary 1 to University Level 400) or <strong>Staff Department</strong> so data is cataloged into its proper institutional hierarchy.
              </p>
            </div>

            <div style={{ background: 'rgba(255,255,255,0.04)', padding: '16px', borderRadius: '12px', borderLeft: '4px solid #8b5cf6' }}>
              <span style={{ fontSize: '0.75rem', background: '#8b5cf6', color: '#fff', padding: '2px 8px', borderRadius: '4px', fontWeight: 700 }}>STEP 4</span>
              <h4 style={{ margin: '10px 0 6px', color: '#ffffff' }}>Deduplication & Ingestion</h4>
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#cbd5e1', lineHeight: 1.6 }}>
                Click Start Import. The GBS ETL engine performs automated deduplication checking existing student emails and IDs before committing records to PostgreSQL.
              </p>
            </div>

            <div style={{ background: 'rgba(255,255,255,0.04)', padding: '16px', borderRadius: '12px', borderLeft: '4px solid #ec4899' }}>
              <span style={{ fontSize: '0.75rem', background: '#ec4899', color: '#fff', padding: '2px 8px', borderRadius: '4px', fontWeight: 700 }}>STEP 5</span>
              <h4 style={{ margin: '10px 0 6px', color: '#ffffff' }}>Atomic Rollback Guarantee</h4>
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#cbd5e1', lineHeight: 1.6 }}>
                If you ever detect an erroneous spreadsheet upload, click <strong>Rollback</strong> on the batch row to instantly and cleanly revert the entire batch.
              </p>
            </div>
          </div>
        </section>
      )}

      {actionMessage && <div className="mig-alert-banner">{actionMessage}</div>}

      <main className="mig-main">
        {/* Import Control Panel */}
        <div className="mig-card">
          <h3>EXECUTE DATASET INGESTION</h3>
          <div className="mig-group">
            <label>Target Entity Type</label>
            <select value={entityType} onChange={(e) => setEntityType(e.target.value)}>
              <option value="STUDENTS">Students Dataset (Rosters & Enrollments)</option>
              <option value="TEACHERS">Teachers & Academic Faculty Dataset</option>
              <option value="STAFF">Administrative & Support Staff Dataset</option>
              <option value="PARENTS">Parents & Guardians Dataset</option>
              <option value="FEE_RECORDS">Financial Fee Schedules & Billing</option>
            </select>
          </div>

          {/* Destination Class Level for Students */}
          {entityType === "STUDENTS" && (
            <div className="mig-group">
              <label>Destination Class Level (Lower Primary 1 to University Level 400) *</label>
              <select
                value={selectedClassLevel}
                onChange={(e) => setSelectedClassLevel(e.target.value)}
                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', background: '#1e293b', border: '1px solid rgba(59, 130, 246, 0.4)', color: '#fff' }}
              >
                {ALL_CLASS_LEVELS.map((lvl) => (
                  <option key={lvl} value={lvl}>{lvl}</option>
                ))}
              </select>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '4px', display: 'block' }}>
                All imported student records in this batch will be tagged and stored under {selectedClassLevel}.
              </span>
            </div>
          )}

          {/* Destination Department for Teachers and Staff */}
          {(entityType === "TEACHERS" || entityType === "STAFF") && (
            <div className="mig-group">
              <label>Destination Staff Department / Faculty *</label>
              <select
                value={selectedDepartment}
                onChange={(e) => setSelectedDepartment(e.target.value)}
                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', background: '#1e293b', border: '1px solid rgba(59, 130, 246, 0.4)', color: '#fff' }}
              >
                {STAFF_DEPARTMENTS.map((dept) => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '4px', display: 'block' }}>
                All imported staff records will be saved into {selectedDepartment}.
              </span>
            </div>
          )}

          <div className="mig-group">
            <label>Batch Ingestion Record Count</label>
            <input
              type="number"
              min="1"
              max="200"
              value={recordCount}
              onChange={(e) => setRecordCount(e.target.value)}
              className="mig-input"
            />
          </div>

          <div
            className="mig-dropzone"
            onClick={() => {
              const files = [
                `incoming_${entityType.toLowerCase()}_level_roster_2026.csv`,
                "legacy_sis_powerschool_export.xlsx",
                "staff_directory_departments.csv",
                "annual_tuition_schedules.csv"
              ];
              setFileSelected(files[Math.floor(Math.random() * files.length)]);
            }}
          >
            <span className="mig-icon">📁</span>
            <p>Selected Ingestion File: <strong>{fileSelected}</strong> (Click to switch sample file)</p>
          </div>

          <button className="mig-btn" onClick={handleImport} disabled={loading}>
            {loading ? "PROCESSING ATOMIC INGESTION..." : "⚡ START ENTERPRISE DATA IMPORT"}
          </button>
        </div>

        {/* PostgreSQL Migration Ledger */}
        <div className="mig-history-card">
          <div className="history-header">
            <h3>PostgreSQL Migration Batches ({jobs.length})</h3>
            <span className="badge-pg">TABLE: migration_jobs</span>
          </div>

          {jobs.length === 0 ? (
            <div className="mig-empty">No migration jobs found in PostgreSQL. Ingest a batch above to create one.</div>
          ) : (
            <div className="mig-table-wrapper">
              <table className="mig-table">
                <thead>
                  <tr>
                    <th>Job ID</th>
                    <th>Filename</th>
                    <th>Entity Type & Hierarchy Level</th>
                    <th>Total</th>
                    <th>Processed</th>
                    <th>Failed</th>
                    <th>Status</th>
                    <th>Date</th>
                    <th>Rollback</th>
                  </tr>
                </thead>
                <tbody>
                  {jobs.map((job) => (
                    <tr key={job.id}>
                      <td><span className="job-badge">#{job.id}</span></td>
                      <td><strong>{job.filename}</strong></td>
                      <td>
                        <span className="entity-tag" style={{ background: 'rgba(59, 130, 246, 0.2)', color: '#93c5fd', border: '1px solid rgba(59, 130, 246, 0.4)' }}>
                          {job.entityType}
                        </span>
                      </td>
                      <td>{job.totalRecords}</td>
                      <td><strong className="text-green">{job.processedCount}</strong></td>
                      <td>{job.failedCount}</td>
                      <td>
                        <span className={`status-pill ${job.status.toLowerCase()}`}>
                          {job.status}
                        </span>
                      </td>
                      <td>{new Date(job.createdAt).toLocaleDateString()}</td>
                      <td>
                        {job.status !== "ROLLED_BACK" ? (
                          <button
                            className="btn-rollback"
                            onClick={() => handleRollback(job.id)}
                            title="Rollback this batch"
                          >
                            Rollback
                          </button>
                        ) : (
                          <span className="text-muted">Reverted</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* Schema Template Modal */}
      {showTemplateModal && templates && (
        <div className="mig-modal-backdrop">
          <div className="mig-modal-card">
            <div className="modal-header">
              <h3>Standard CSV / Excel Ingestion Schemas</h3>
              <button className="close-btn" onClick={() => setShowTemplateModal(false)}>✕</button>
            </div>
            <div className="templates-list">
              {Object.entries(templates).map(([key, t]) => (
                <div key={key} className="template-item">
                  <h4>📄 {key} ({t.filename})</h4>
                  <div className="headers-row">
                    {t.headers.map((h, i) => (
                      <span key={i} className="header-pill">{h}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
