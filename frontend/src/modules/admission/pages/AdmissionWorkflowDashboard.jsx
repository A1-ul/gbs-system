import React, { useState, useEffect, useMemo } from 'react';
import { getApiBaseUrl } from '../../../api/client/apiConfig';
import './AdmissionWorkflowDashboard.css';

const API_BASE = getApiBaseUrl();

const PIPELINE_STAGES = [
  { key: 'ALL', label: 'All Applications', icon: '📁' },
  { key: 'INQUIRY', label: '1. Inquiries', icon: '📝' },
  { key: 'APPLIED', label: '2. Applications', icon: '📄' },
  { key: 'DOCUMENTS_UPLOADED', label: '3. Documents Uploaded', icon: '📎' },
  { key: 'VERIFIED', label: '4. Verified & Interview', icon: '🔍' },
  { key: 'APPROVED', label: '5. Approved & Enrolled', icon: '🎓' },
  { key: 'REJECTED', label: 'Rejected', icon: '❌' }
];

export default function AdmissionWorkflowDashboard() {
  const [applications, setApplications] = useState([]);
  const [classes, setClasses] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [selectedStage, setSelectedStage] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [showInquiryModal, setShowInquiryModal] = useState(false);
  const [selectedApp, setSelectedApp] = useState(null);
  const [actionNotice, setActionNotice] = useState(null);
  const [provisionResult, setProvisionResult] = useState(null);

  // Inquiry Form State
  const [inquiryForm, setInquiryForm] = useState({
    studentFirstName: '',
    studentLastName: '',
    dateOfBirth: '2011-05-15',
    targetGradeLevel: 10,
    targetClassId: '',
    guardianName: '',
    guardianEmail: '',
    guardianPhone: '+1-555-0199',
    guardianRelationship: 'MOTHER',
    previousSchool: 'Oakridge Middle School',
    notes: 'Interested in STEM accelerated curriculum.'
  });

  // Action Form State in Dossier Modal
  const [interviewDate, setInterviewDate] = useState('');
  const [interviewer, setInterviewer] = useState('Admissions Board Panel A');
  const [newDocType, setNewDocType] = useState('BIRTH_CERTIFICATE');
  const [newDocName, setNewDocName] = useState('');

  const getHeaders = () => {
    const token = localStorage.getItem('gbs_token');
    return {
      'Content-Type': 'application/json',
      Authorization: token ? `Bearer ${token}` : ''
    };
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      // 1. Fetch Applications
      const appsRes = await fetch(`${API_BASE}/admissions`, { headers: getHeaders() });
      const appsJson = await appsRes.json();
      if (appsJson.status === 'success') {
        setApplications(appsJson.data.applications || []);
      } else {
        throw new Error(appsJson.message || 'Failed to fetch admission applications');
      }

      // 2. Fetch Analytics
      const analyticsRes = await fetch(`${API_BASE}/admissions/analytics`, { headers: getHeaders() });
      const analyticsJson = await analyticsRes.json();
      if (analyticsJson.status === 'success') {
        setAnalytics(analyticsJson.data.analytics);
      }

      // 3. Fetch Classes
      const classesRes = await fetch(`${API_BASE}/academics/classes`, { headers: getHeaders() });
      const classesJson = await classesRes.json();
      if (classesJson.status === 'success') {
        setClasses(classesJson.data.classes || []);
      }
    } catch (err) {
      console.error('Admissions fetch error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredApplications = useMemo(() => {
    return applications.filter((app) => {
      const matchStage = selectedStage === 'ALL' || app.stage === selectedStage;
      const matchSearch =
        !searchQuery ||
        app.applicationNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        `${app.studentFirstName} ${app.studentLastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
        app.guardianEmail.toLowerCase().includes(searchQuery.toLowerCase());
      return matchStage && matchSearch;
    });
  }, [applications, selectedStage, searchQuery]);

  // Open Dossier
  const handleOpenDossier = async (applicationId) => {
    try {
      const res = await fetch(`${API_BASE}/admissions/${applicationId}`, { headers: getHeaders() });
      const json = await res.json();
      if (json.status === 'success') {
        setSelectedApp(json.data.application);
        setProvisionResult(null);
      }
    } catch (err) {
      alert(`Error loading application dossier: ${err.message}`);
    }
  };

  // Submit Inquiry
  const handleInquirySubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE}/admissions/inquiry`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(inquiryForm)
      });
      const json = await res.json();
      if (json.status === 'success') {
        setActionNotice({
          type: 'success',
          text: `✅ Inquiry created: ${json.data.application.applicationNumber} for ${json.data.application.studentFirstName} ${json.data.application.studentLastName}`
        });
        setShowInquiryModal(false);
        fetchData();
      } else {
        throw new Error(json.message || 'Failed to submit inquiry');
      }
    } catch (err) {
      alert(`Error submitting inquiry: ${err.message}`);
    }
  };

  // Attach Document
  const handleAttachDocument = async () => {
    if (!newDocName.trim()) {
      alert('Please specify the document file name.');
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/admissions/${selectedApp.id}/documents`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          documentType: newDocType,
          fileName: newDocName.trim()
        })
      });
      const json = await res.json();
      if (json.status === 'success') {
        setActionNotice({ type: 'success', text: `📎 Attached ${newDocType} to application.` });
        setNewDocName('');
        handleOpenDossier(selectedApp.id);
        fetchData();
      }
    } catch (err) {
      alert(`Error attaching document: ${err.message}`);
    }
  };

  // Verify Document
  const handleVerifyDoc = async (documentId, status) => {
    try {
      const res = await fetch(`${API_BASE}/admissions/documents/${documentId}/verify`, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify({ status })
      });
      const json = await res.json();
      if (json.status === 'success') {
        setActionNotice({ type: 'success', text: `✅ Document marked as ${status}.` });
        handleOpenDossier(selectedApp.id);
        fetchData();
      }
    } catch (err) {
      alert(`Error verifying document: ${err.message}`);
    }
  };

  // Schedule Interview
  const handleScheduleInterview = async () => {
    if (!interviewDate) {
      alert('Please select an interview date and time.');
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/admissions/${selectedApp.id}/schedule-interview`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          interviewDate,
          interviewer
        })
      });
      const json = await res.json();
      if (json.status === 'success') {
        setActionNotice({ type: 'success', text: `📅 Interview scheduled successfully for ${selectedApp.applicationNumber}.` });
        handleOpenDossier(selectedApp.id);
        fetchData();
      }
    } catch (err) {
      alert(`Error scheduling interview: ${err.message}`);
    }
  };

  // Approve & Provision Student Account (Stage 5)
  const handleApproveApplication = async () => {
    if (!window.confirm(`Are you ready to officially approve ${selectedApp.studentFirstName} ${selectedApp.studentLastName} and automatically provision their student account and parent account in PostgreSQL?`)) {
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/admissions/${selectedApp.id}/approve`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ reviewerNotes: 'Passed all academic verification benchmarks.' })
      });
      const json = await res.json();
      if (json.status === 'success') {
        setProvisionResult(json.data);
        setActionNotice({
          type: 'success',
          text: `🎉 Admission Approved! Student account "${json.data.studentUser.email}" provisioned and enrolled into PostgreSQL!`
        });
        handleOpenDossier(selectedApp.id);
        fetchData();
      } else {
        throw new Error(json.message || 'Approval failed');
      }
    } catch (err) {
      alert(`Error approving application: ${err.message}`);
    }
  };

  // Reject Application
  const handleRejectApplication = async () => {
    const reason = window.prompt('Please enter the official reason for application rejection:');
    if (!reason) return;
    try {
      const res = await fetch(`${API_BASE}/admissions/${selectedApp.id}/reject`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ reason })
      });
      const json = await res.json();
      if (json.status === 'success') {
        setActionNotice({ type: 'error', text: `Application ${selectedApp.applicationNumber} marked as REJECTED.` });
        handleOpenDossier(selectedApp.id);
        fetchData();
      }
    } catch (err) {
      alert(`Error rejecting application: ${err.message}`);
    }
  };

  return (
    <div className="admission-workflow-root">
      {/* Hero Header with Real-Life Admissions Office Backdrop */}
      <div className="admission-hero-banner">
        <div className="adm-hero-overlay"></div>
        <div className="adm-hero-content-flex">
          <div className="adm-hero-content">
            <div className="adm-breadcrumbs">
              <button type="button" className="adm-back-btn" onClick={() => window.history.back()}>
                ← Return to Dashboard
              </button>
              <span className="adm-badge">MASTER BLUEPRINT BOX 6 • ADMISSION FLOW PIPELINE</span>
            </div>

            <h1>Admission Flow & Enrollment Engine</h1>
            <p className="adm-subtext">
              5-Stage Automated Pipeline: Inquiry → Application → Document Upload → Verification → Approval • Instant Student Account Provisioning
            </p>

            {/* KPI Analytics Bar */}
            <div className="adm-kpi-grid">
              <div className="adm-kpi-pill">
                <span className="kpi-icon">📋</span>
                <div>
                  <span className="kpi-val">{analytics?.totalApplications || 0}</span>
                  <span className="kpi-lbl">Total Applications</span>
                </div>
              </div>
              <div className="adm-kpi-pill active-pill">
                <span className="kpi-icon">🔄</span>
                <div>
                  <span className="kpi-val">{analytics?.activeInPipeline || 0}</span>
                  <span className="kpi-lbl">Active In Pipeline</span>
                </div>
              </div>
              <div className="adm-kpi-pill">
                <span className="kpi-icon">📈</span>
                <div>
                  <span className="kpi-val">{analytics?.conversionRate || 0}%</span>
                  <span className="kpi-lbl">Conversion Rate</span>
                </div>
              </div>
              <div className="adm-kpi-pill enrolled-pill">
                <span className="kpi-icon">🎓</span>
                <div>
                  <span className="kpi-val">{analytics?.stagesCount?.APPROVED || 0}</span>
                  <span className="kpi-lbl">Approved & Enrolled</span>
                </div>
              </div>
            </div>
          </div>

          <div className="hero-photo-showcase-frame">
            <div className="showcase-photo-wrapper">
              <img
                src="/assets/admissions-office-bg.jpg"
                alt="Admissions & Registrar Directorate"
                className="real-life-dashboard-photo"
              />
              <div className="showcase-verified-badge">
                <span className="live-camera-pulse"></span>
                <span>REAL-LIFE CAMPUS VIEW</span>
              </div>
            </div>
            <div className="showcase-photo-caption">
              <span>📍 Admissions Directorate & Student Counseling Center • Real-Life Daylight View</span>
            </div>
          </div>
        </div>
      </div>

      <div className="admission-container">
        {/* Action Notice */}
        {actionNotice && (
          <div className={`adm-notice ${actionNotice.type}`}>
            <span>{actionNotice.text}</span>
            <button type="button" onClick={() => setActionNotice(null)}>✕</button>
          </div>
        )}

        {/* 5-Stage Visual Workflow Stepper Bar */}
        <div className="workflow-stepper-strip">
          <span className="stepper-title">5-Stage Master Blueprint Pipeline:</span>
          <div className="stepper-nav">
            {PIPELINE_STAGES.map((s) => {
              const count =
                s.key === 'ALL'
                  ? analytics?.totalApplications || 0
                  : analytics?.stagesCount?.[s.key] || 0;
              const isActive = selectedStage === s.key;
              return (
                <button
                  key={s.key}
                  type="button"
                  className={`stage-step-btn ${isActive ? 'active-step' : ''}`}
                  onClick={() => setSelectedStage(s.key)}
                >
                  <span className="step-icon">{s.icon}</span>
                  <span className="step-label">{s.label}</span>
                  <span className="step-count">{count}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Toolbar */}
        <div className="adm-toolbar">
          <div className="adm-search-wrap">
            <span className="adm-search-icon">🔍</span>
            <input
              type="text"
              placeholder="Search by Application Number, Student Name, or Guardian Email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="adm-toolbar-actions">
            <button
              type="button"
              className="new-inquiry-btn"
              onClick={() => setShowInquiryModal(true)}
              id="btn-create-admission-inquiry"
            >
              <span>➕</span> New Admission Inquiry
            </button>
            <button type="button" className="adm-refresh-btn" onClick={fetchData} title="Refresh">
              🔄 Refresh
            </button>
          </div>
        </div>

        {/* Applications List */}
        {loading ? (
          <div className="adm-state-box">
            <p>Loading live admissions pipeline from PostgreSQL...</p>
          </div>
        ) : error ? (
          <div className="adm-state-box error-box">
            <p>Error retrieving applications: {error}</p>
            <button type="button" onClick={fetchData} className="adm-retry-btn">Retry</button>
          </div>
        ) : filteredApplications.length === 0 ? (
          <div className="adm-state-box empty-box">
            <span className="empty-glyph">📋</span>
            <h3>No Applications in this Stage</h3>
            <p>No admission applications currently match "{selectedStage}". Submit a new inquiry to start the 5-stage pipeline.</p>
            <button type="button" className="new-inquiry-btn" onClick={() => setShowInquiryModal(true)}>
              Submit First Admission Inquiry
            </button>
          </div>
        ) : (
          <div className="applications-table-card">
            <table className="adm-table">
              <thead>
                <tr>
                  <th>Application Number</th>
                  <th>Student Name</th>
                  <th>Target Grade & Class</th>
                  <th>Guardian Contact</th>
                  <th>Current Pipeline Stage</th>
                  <th>Documents</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredApplications.map((app) => {
                  const docsCount = app._count?.documents || app.documents?.length || 0;
                  return (
                    <tr key={app.id}>
                      <td className="app-num-td">
                        <strong>{app.applicationNumber}</strong>
                        <span className="created-date">
                          {new Date(app.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                        </span>
                      </td>
                      <td className="student-name-td">
                        <strong>{app.studentFirstName} {app.studentLastName}</strong>
                        <span className="dob-span">DOB: {new Date(app.dateOfBirth).toLocaleDateString()}</span>
                      </td>
                      <td>
                        <span className="grade-badge">Grade {app.targetGradeLevel}</span>
                        <span className="class-name-sub">{app.targetClass?.name || 'Class Unassigned'}</span>
                      </td>
                      <td>
                        <div className="guardian-cell">
                          <span>{app.guardianName} ({app.guardianRelationship})</span>
                          <span className="contact-detail">{app.guardianEmail} • {app.guardianPhone}</span>
                        </div>
                      </td>
                      <td>
                        <span className={`stage-pill stage-${app.stage.toLowerCase()}`}>
                          {app.stage.replace('_', ' ')}
                        </span>
                      </td>
                      <td>
                        <span className="docs-badge">📎 {docsCount} File(s)</span>
                      </td>
                      <td>
                        <button
                          type="button"
                          className="inspect-btn"
                          onClick={() => handleOpenDossier(app.id)}
                          id={`btn-inspect-admission-${app.id}`}
                        >
                          Dossier & Advance ➔
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* New Inquiry Modal */}
      {showInquiryModal && (
        <div className="modal-backdrop">
          <div className="modal-box adm-modal">
            <div className="modal-header">
              <div>
                <h2>New Prospective Student Inquiry</h2>
                <p className="modal-sub">Stage 1 of 5: Initial Intake Form</p>
              </div>
              <button type="button" className="modal-close-btn" onClick={() => setShowInquiryModal(false)}>✕</button>
            </div>

            <form onSubmit={handleInquirySubmit} className="modal-form">
              <div className="form-row">
                <div className="form-field">
                  <label>Student First Name *</label>
                  <input
                    type="text"
                    required
                    value={inquiryForm.studentFirstName}
                    onChange={(e) => setInquiryForm({ ...inquiryForm, studentFirstName: e.target.value })}
                  />
                </div>
                <div className="form-field">
                  <label>Student Last Name *</label>
                  <input
                    type="text"
                    required
                    value={inquiryForm.studentLastName}
                    onChange={(e) => setInquiryForm({ ...inquiryForm, studentLastName: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-field">
                  <label>Date of Birth *</label>
                  <input
                    type="date"
                    required
                    value={inquiryForm.dateOfBirth}
                    onChange={(e) => setInquiryForm({ ...inquiryForm, dateOfBirth: e.target.value })}
                  />
                </div>
                <div className="form-field">
                  <label>Target Grade Level *</label>
                  <select
                    value={inquiryForm.targetGradeLevel}
                    onChange={(e) => setInquiryForm({ ...inquiryForm, targetGradeLevel: e.target.value })}
                  >
                    <option value="9">Grade 9</option>
                    <option value="10">Grade 10</option>
                    <option value="11">Grade 11</option>
                    <option value="12">Grade 12</option>
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-field">
                  <label>Target Academic Stream / Class</label>
                  <select
                    value={inquiryForm.targetClassId}
                    onChange={(e) => setInquiryForm({ ...inquiryForm, targetClassId: e.target.value })}
                  >
                    <option value="">Select Target Class (Optional)</option>
                    {classes.map((c) => (
                      <option key={c.id} value={c.id.toString()}>
                        {c.name} ({c.code})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-field">
                  <label>Previous School Attended</label>
                  <input
                    type="text"
                    value={inquiryForm.previousSchool}
                    onChange={(e) => setInquiryForm({ ...inquiryForm, previousSchool: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-field">
                  <label>Parent / Guardian Full Name *</label>
                  <input
                    type="text"
                    required
                    value={inquiryForm.guardianName}
                    onChange={(e) => setInquiryForm({ ...inquiryForm, guardianName: e.target.value })}
                  />
                </div>
                <div className="form-field">
                  <label>Relationship</label>
                  <select
                    value={inquiryForm.guardianRelationship}
                    onChange={(e) => setInquiryForm({ ...inquiryForm, guardianRelationship: e.target.value })}
                  >
                    <option value="MOTHER">Mother</option>
                    <option value="FATHER">Father</option>
                    <option value="LEGAL_GUARDIAN">Legal Guardian</option>
                    <option value="SPONSOR">Sponsor</option>
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-field">
                  <label>Guardian Email *</label>
                  <input
                    type="email"
                    required
                    value={inquiryForm.guardianEmail}
                    onChange={(e) => setInquiryForm({ ...inquiryForm, guardianEmail: e.target.value })}
                  />
                </div>
                <div className="form-field">
                  <label>Guardian Phone / Mobile *</label>
                  <input
                    type="text"
                    required
                    value={inquiryForm.guardianPhone}
                    onChange={(e) => setInquiryForm({ ...inquiryForm, guardianPhone: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-field full-width">
                  <label>Inquiry Notes & Academic Interests</label>
                  <textarea
                    rows={2}
                    value={inquiryForm.notes}
                    onChange={(e) => setInquiryForm({ ...inquiryForm, notes: e.target.value })}
                  />
                </div>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={() => setShowInquiryModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-submit" id="btn-submit-inquiry">
                  Submit Inquiry & Generate Application
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Interactive Dossier Modal */}
      {selectedApp && (
        <div className="modal-backdrop">
          <div className="modal-box dossier-modal">
            <div className="modal-header">
              <div>
                <h2>Admission Dossier: {selectedApp.studentFirstName} {selectedApp.studentLastName}</h2>
                <p className="modal-sub">
                  Application: <strong>{selectedApp.applicationNumber}</strong> • Current Stage: <span className={`stage-pill stage-${selectedApp.stage.toLowerCase()}`}>{selectedApp.stage}</span>
                </p>
              </div>
              <button type="button" className="modal-close-btn" onClick={() => setSelectedApp(null)}>✕</button>
            </div>

            {/* Account Provisioning Banner if Approved */}
            {provisionResult && (
              <div className="provision-success-banner">
                <span className="banner-icon">🎉</span>
                <div>
                  <strong>Student Account Successfully Provisioned in PostgreSQL!</strong>
                  <p>
                    Login Email: <code>{provisionResult.studentUser.email}</code> • Role: <code>STUDENT</code> • Class Enrollment: <code>{selectedApp.targetClass?.name || 'Class Enrolled'}</code>
                  </p>
                </div>
              </div>
            )}

            <div className="dossier-body">
              {/* Top Overview Cards */}
              <div className="dossier-overview-grid">
                <div className="dossier-info-card">
                  <h4>Student Information</h4>
                  <p><strong>Name:</strong> {selectedApp.studentFirstName} {selectedApp.studentLastName}</p>
                  <p><strong>DOB:</strong> {new Date(selectedApp.dateOfBirth).toLocaleDateString()}</p>
                  <p><strong>Grade & Class:</strong> Grade {selectedApp.targetGradeLevel} • {selectedApp.targetClass?.name || 'Unassigned'}</p>
                  <p><strong>Previous School:</strong> {selectedApp.previousSchool || 'N/A'}</p>
                </div>

                <div className="dossier-info-card">
                  <h4>Guardian & Contact Details</h4>
                  <p><strong>Guardian:</strong> {selectedApp.guardianName} ({selectedApp.guardianRelationship})</p>
                  <p><strong>Email:</strong> {selectedApp.guardianEmail}</p>
                  <p><strong>Emergency Mobile:</strong> {selectedApp.guardianPhone}</p>
                  <p><strong>Address:</strong> {selectedApp.address || 'Campus Zone residence'}</p>
                </div>
              </div>

              {/* Stage 3: Verification Documents Section */}
              <div className="dossier-section">
                <h3>Stage 3: Verification Documents</h3>
                <div className="docs-attach-bar">
                  <select value={newDocType} onChange={(e) => setNewDocType(e.target.value)}>
                    <option value="BIRTH_CERTIFICATE">Birth Certificate</option>
                    <option value="TRANSCRIPT">Academic Transcript</option>
                    <option value="MEDICAL_RECORD">Immunization & Health Record</option>
                    <option value="PASSPORT_PHOTO">Passport Photograph</option>
                    <option value="GUARDIAN_ID">Guardian Government ID</option>
                  </select>
                  <input
                    type="text"
                    placeholder="Document File Name (e.g. birth_cert_official.pdf)"
                    value={newDocName}
                    onChange={(e) => setNewDocName(e.target.value)}
                  />
                  <button type="button" className="attach-doc-btn" onClick={handleAttachDocument}>
                    📎 Attach Document
                  </button>
                </div>

                {(!selectedApp.documents || selectedApp.documents.length === 0) ? (
                  <p className="no-docs-text">No verification documents attached yet.</p>
                ) : (
                  <div className="docs-list-grid">
                    {selectedApp.documents.map((doc) => (
                      <div key={doc.id} className="doc-item-card">
                        <div className="doc-item-header">
                          <span className="doc-type-badge">{doc.documentType}</span>
                          <span className={`doc-status-pill status-${doc.verificationStatus.toLowerCase()}`}>
                            {doc.verificationStatus}
                          </span>
                        </div>
                        <span className="doc-file-name">{doc.fileName}</span>
                        <div className="doc-item-actions">
                          {doc.verificationStatus !== 'VERIFIED' && (
                            <button
                              type="button"
                              className="doc-verify-btn"
                              onClick={() => handleVerifyDoc(doc.id, 'VERIFIED')}
                            >
                              ✓ Verify Document
                            </button>
                          )}
                          {doc.verificationStatus !== 'REJECTED' && (
                            <button
                              type="button"
                              className="doc-reject-btn"
                              onClick={() => handleVerifyDoc(doc.id, 'REJECTED')}
                            >
                              ✕ Reject
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Stage 4: Interview & Evaluation Section */}
              <div className="dossier-section">
                <h3>Stage 4: Entrance Interview & Assessment</h3>
                {selectedApp.interviewDate ? (
                  <div className="interview-scheduled-box">
                    <span>📅</span>
                    <div>
                      <strong>Interview Scheduled:</strong> {new Date(selectedApp.interviewDate).toLocaleString()}
                      <p>Interviewer: {selectedApp.interviewer || 'Admissions Panel'} • Status: Scheduled</p>
                    </div>
                  </div>
                ) : (
                  <div className="schedule-interview-bar">
                    <input
                      type="datetime-local"
                      value={interviewDate}
                      onChange={(e) => setInterviewDate(e.target.value)}
                    />
                    <input
                      type="text"
                      placeholder="Interviewer / Panel Name"
                      value={interviewer}
                      onChange={(e) => setInterviewer(e.target.value)}
                    />
                    <button type="button" className="schedule-int-btn" onClick={handleScheduleInterview}>
                      📅 Schedule Interview
                    </button>
                  </div>
                )}
              </div>

              {/* Stage 5: Final Admission Decision Controls (Blueprint Box 6) */}
              <div className="dossier-decision-box">
                <h3>Stage 5: Final Admissions Board Decision</h3>
                <p>
                  Approving will automatically provision a new student account, create their class enrollment, link guardian accounts, and generate immutable audit logs.
                </p>

                <div className="decision-buttons-row">
                  {selectedApp.stage !== 'APPROVED' && (
                    <button
                      type="button"
                      className="approve-admission-btn"
                      onClick={handleApproveApplication}
                      id="btn-approve-admission-application"
                    >
                      ✅ APPROVE & PROVISION STUDENT ACCOUNT
                    </button>
                  )}

                  {selectedApp.stage !== 'REJECTED' && selectedApp.stage !== 'APPROVED' && (
                    <button
                      type="button"
                      className="reject-admission-btn"
                      onClick={handleRejectApplication}
                      id="btn-reject-admission-application"
                    >
                      ❌ Reject Application
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="modal-actions">
              <button type="button" className="btn-cancel" onClick={() => setSelectedApp(null)}>
                Close Dossier
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
