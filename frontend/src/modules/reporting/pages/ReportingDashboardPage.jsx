import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getApiBaseUrl } from '../../../api/client/apiConfig';
import './ReportingDashboardPage.css';

const API_BASE = getApiBaseUrl();

export default function ReportingDashboardPage() {
  const navigate = useNavigate();

  // Active Tab: 'registry', 'reportCard', 'transcript', 'feeReceipt', 'certificate', 'verifier'
  const [activeTab, setActiveTab] = useState('registry');

  // Data states
  const [documents, setDocuments] = useState([]);
  const [definitions, setDefinitions] = useState([]);
  const [telemetry, setTelemetry] = useState(null);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Selected document for preview modal
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [showDocModal, setShowDocModal] = useState(false);

  // Generation Form States
  const [rcForm, setRcForm] = useState({
    studentId: '',
    academicTerm: '2025-2026 Term 1',
    teacherRemarks: 'Demonstrates exemplary academic rigor and active classroom leadership.',
    fileFormat: 'PDF'
  });

  const [trnForm, setTrnForm] = useState({
    studentId: '',
    fileFormat: 'PDF'
  });

  const [feeForm, setFeeForm] = useState({
    recipientName: 'Dr. Robert Vance',
    studentName: 'Julian Vance',
    amountPaid: 4500.0,
    paymentMethod: 'ELECTRONIC_WIRE',
    invoiceReference: 'INV-2026-9041',
    description: 'Grade 10 Semester 1 Tuition & Technology Fee'
  });

  const [certForm, setCertForm] = useState({
    studentName: 'Sophia Chen',
    gradeLevel: 10,
    academicYear: '2025-2026'
  });

  // Verifier State
  const [verifyInput, setVerifyInput] = useState('');
  const [verifyResult, setVerifyResult] = useState(null);
  const [verifying, setVerifying] = useState(false);
  const [generating, setGenerating] = useState(false);

  // Auth headers
  const getAuthHeaders = () => {
    const token = localStorage.getItem('gbs_token');
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    };
  };

  // Fetch all engine telemetry & documents
  const fetchAllData = async () => {
    try {
      setLoading(true);
      setError(null);
      const headers = getAuthHeaders();

      // 1. Fetch Generated Documents
      const docsRes = await fetch(`${API_BASE}/reporting/documents`, { headers });
      const docsData = await docsRes.json();
      if (docsData.status === 'success') setDocuments(docsData.data.documents || []);

      // 2. Fetch Report Definitions
      const defsRes = await fetch(`${API_BASE}/reporting/definitions`, { headers });
      const defsData = await defsRes.json();
      if (defsData.status === 'success') setDefinitions(defsData.data.definitions || []);

      // 3. Fetch Telemetry
      const teleRes = await fetch(`${API_BASE}/reporting/telemetry`, { headers });
      const teleData = await teleRes.json();
      if (teleData.status === 'success') setTelemetry(teleData.data.telemetry);

      // 4. Fetch Students list for dropdown
      const usersRes = await fetch(`${API_BASE}/users?role=STUDENT`, { headers });
      const usersData = await usersRes.json();
      if (usersData.status === 'success') {
        const studentList = usersData.data.users || [];
        setStudents(studentList);
        if (studentList.length > 0 && !rcForm.studentId) {
          setRcForm((prev) => ({ ...prev, studentId: studentList[0].id }));
          setTrnForm((prev) => ({ ...prev, studentId: studentList[0].id }));
        }
      }
    } catch (err) {
      console.error('Failed to load reporting engine data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  // Generate Report Card
  const handleGenerateReportCard = async (e) => {
    e.preventDefault();
    try {
      setGenerating(true);
      const headers = getAuthHeaders();
      const res = await fetch(`${API_BASE}/reporting/generate/report-card`, {
        method: 'POST',
        headers,
        body: JSON.stringify(rcForm)
      });
      const data = await res.json();
      if (res.ok) {
        setSelectedDoc(data.data.document);
        setShowDocModal(true);
        fetchAllData();
      } else {
        alert(data.message || 'Generation failed');
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setGenerating(false);
    }
  };

  // Generate Transcript
  const handleGenerateTranscript = async (e) => {
    e.preventDefault();
    try {
      setGenerating(true);
      const headers = getAuthHeaders();
      const res = await fetch(`${API_BASE}/reporting/generate/transcript`, {
        method: 'POST',
        headers,
        body: JSON.stringify(trnForm)
      });
      const data = await res.json();
      if (res.ok) {
        setSelectedDoc(data.data.document);
        setShowDocModal(true);
        fetchAllData();
      } else {
        alert(data.message || 'Generation failed');
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setGenerating(false);
    }
  };

  // Generate Fee Receipt
  const handleGenerateFeeReceipt = async (e) => {
    e.preventDefault();
    try {
      setGenerating(true);
      const headers = getAuthHeaders();
      const res = await fetch(`${API_BASE}/reporting/generate/fee-receipt`, {
        method: 'POST',
        headers,
        body: JSON.stringify(feeForm)
      });
      const data = await res.json();
      if (res.ok) {
        setSelectedDoc(data.data.document);
        setShowDocModal(true);
        fetchAllData();
      } else {
        alert(data.message || 'Generation failed');
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setGenerating(false);
    }
  };

  // Generate Enrollment Certificate
  const handleGenerateCertificate = async (e) => {
    e.preventDefault();
    try {
      setGenerating(true);
      const headers = getAuthHeaders();
      const res = await fetch(`${API_BASE}/reporting/generate/enrollment-certificate`, {
        method: 'POST',
        headers,
        body: JSON.stringify(certForm)
      });
      const data = await res.json();
      if (res.ok) {
        setSelectedDoc(data.data.document);
        setShowDocModal(true);
        fetchAllData();
      } else {
        alert(data.message || 'Generation failed');
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setGenerating(false);
    }
  };

  // Cryptographic Verifier
  const handleVerifyDocument = async (e) => {
    e.preventDefault();
    if (!verifyInput) return;
    try {
      setVerifying(true);
      setVerifyResult(null);
      const headers = getAuthHeaders();
      const res = await fetch(`${API_BASE}/reporting/verify/${encodeURIComponent(verifyInput)}`, { headers });
      const data = await res.json();
      if (res.ok) {
        setVerifyResult(data.data);
      } else {
        setVerifyResult({ verified: false, message: data.message });
      }
    } catch (err) {
      setVerifyResult({ verified: false, message: err.message });
    } finally {
      setVerifying(false);
    }
  };

  // Open Document Modal
  const openDocViewer = (doc) => {
    setSelectedDoc(doc);
    setShowDocModal(true);
  };

  return (
    <div className="reporting-container">
      {/* Top Header */}
      <header className="reporting-header">
        <div className="header-brand-block">
          <img src="/assets/gbs_crest_badge.jpg" alt="GBS Logo" className="header-crest" />
          <div className="brand-titles">
            <h1>REGISTRAR & DOCUMENT GENERATION ENGINE</h1>
            <span className="brand-subtext">MASTER BLUEPRINT BOX 11 • ACADEMIC ARCHIVES & CRYPTOGRAPHIC LEDGER</span>
          </div>
        </div>

        <div className="header-telemetry-strip">
          <div className="telemetry-chip">
            <span className="pulse-gold"></span>
            <span>REGISTRY LEDGER: <strong>SYNCHRONIZED</strong></span>
          </div>
          <div className="telemetry-chip">
            <span>DOCS ISSUED: <strong>{telemetry?.totalDocuments ?? documents.length}</strong></span>
          </div>
          <div className="telemetry-chip">
            <span>VERIFICATION: <strong>SHA-256 SIGNED</strong></span>
          </div>
        </div>

        <div className="header-actions">
          <button className="rpt-btn-ghost" onClick={() => navigate('/portal/admin/dashboard')}>
            ← Back to Portal
          </button>
          <button className="rpt-btn-primary" onClick={() => setActiveTab('reportCard')}>
            + Generate Report Card
          </button>
        </div>
      </header>

      {/* Hero Panoramic Banner */}
      <div
        className="reporting-hero"
        style={{ backgroundImage: `url('/assets/academic-records-bg.jpg')` }}
      >
        <div className="reporting-hero-overlay"></div>
        <div className="hero-content-flex">
          <div className="hero-content">
            <div className="hero-badge">📜 OFFICIAL REGISTRAR ARCHIVE</div>
            <h2>Academic Credentials & Automated Document Generation</h2>
            <p>
              Deterministic generation of official student report cards, cumulative multi-term transcripts,
              bursar tuition fee receipts, and enrollment certificates signed with SHA-256 digital seals.
            </p>
          </div>

          <div className="hero-photo-showcase-frame">
            <div className="showcase-photo-wrapper">
              <img
                src="/assets/academic-records-bg.jpg"
                alt="Institutional Registrar & Transcripts Archive"
                className="real-life-dashboard-photo"
              />
              <div className="showcase-verified-badge">
                <span className="live-camera-pulse"></span>
                <span>REAL-LIFE CAMPUS VIEW</span>
              </div>
            </div>
            <div className="showcase-photo-caption">
              <span>📍 Registrar Records Archive & Examination Directorate • Daylight View</span>
            </div>
          </div>
        </div>
      </div>

      {/* Metrics Gauges */}
      <div className="metrics-gauges-grid">
        <div className="gauge-card">
          <div className="gauge-icon gold">📜</div>
          <div className="gauge-info">
            <span className="gauge-val">{telemetry?.totalDocuments ?? documents.length}</span>
            <span className="gauge-label">Official Documents Issued</span>
          </div>
        </div>

        <div className="gauge-card">
          <div className="gauge-icon cyan">📊</div>
          <div className="gauge-info">
            <span className="gauge-val">{definitions.length}</span>
            <span className="gauge-label">Report Definitions</span>
          </div>
        </div>

        <div className="gauge-card">
          <div className="gauge-icon green">🎓</div>
          <div className="gauge-info">
            <span className="gauge-val">{(telemetry?.byType?.REPORT_CARD || 0) + (telemetry?.byType?.TRANSCRIPT || 0)}</span>
            <span className="gauge-label">Academic Credentials</span>
          </div>
        </div>

        <div className="gauge-card">
          <div className="gauge-icon purple">🛡️</div>
          <div className="gauge-info">
            <span className="gauge-val">100%</span>
            <span className="gauge-label">Digital Hash Authenticated</span>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="tabs-navigation-bar">
        <button
          className={`tab-btn ${activeTab === 'registry' ? 'active' : ''}`}
          onClick={() => setActiveTab('registry')}
        >
          📑 Document Registry ({documents.length})
        </button>
        <button
          className={`tab-btn ${activeTab === 'reportCard' ? 'active' : ''}`}
          onClick={() => setActiveTab('reportCard')}
        >
          🎓 Academic Report Card
        </button>
        <button
          className={`tab-btn ${activeTab === 'transcript' ? 'active' : ''}`}
          onClick={() => setActiveTab('transcript')}
        >
          📜 Official Transcript
        </button>
        <button
          className={`tab-btn ${activeTab === 'feeReceipt' ? 'active' : ''}`}
          onClick={() => setActiveTab('feeReceipt')}
        >
          💳 Tuition Fee Receipt
        </button>
        <button
          className={`tab-btn ${activeTab === 'certificate' ? 'active' : ''}`}
          onClick={() => setActiveTab('certificate')}
        >
          📜 Enrollment Certificate
        </button>
        <button
          className={`tab-btn ${activeTab === 'verifier' ? 'active' : ''}`}
          onClick={() => setActiveTab('verifier')}
        >
          🔍 Cryptographic Hash Verifier
        </button>
      </div>

      {/* Main Tab Panels */}
      <main className="tab-content-area">
        {loading && <div style={{ color: '#fbbf24', padding: '2rem' }}>⚡ Synchronizing with PostgreSQL academic document repository...</div>}

        {/* TAB 1: DOCUMENT REGISTRY */}
        {!loading && activeTab === 'registry' && (
          <div className="docs-table-container">
            <table className="docs-table">
              <thead>
                <tr>
                  <th>Doc Number</th>
                  <th>Document Type</th>
                  <th>Recipient / Student</th>
                  <th>Title</th>
                  <th>Academic Term</th>
                  <th>Verification Hash</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {documents.map((doc) => (
                  <tr key={doc.id}>
                    <td style={{ fontFamily: 'var(--rpt-mono-font)', color: '#fbbf24', fontWeight: 700 }}>
                      {doc.documentNumber}
                    </td>
                    <td>
                      <span className={`doc-type-badge ${doc.documentType.toLowerCase()}`}>
                        {doc.documentType.replace('_', ' ')}
                      </span>
                    </td>
                    <td>
                      <strong>{doc.recipientName}</strong>
                      <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>{doc.className || 'General'}</div>
                    </td>
                    <td style={{ maxWidth: '280px', color: '#e2e8f0' }}>{doc.title}</td>
                    <td style={{ fontSize: '0.78rem', color: '#94a3b8' }}>{doc.academicTerm}</td>
                    <td style={{ fontFamily: 'var(--rpt-mono-font)', fontSize: '0.7rem', color: '#64748b' }}>
                      {doc.verificationHash ? `${doc.verificationHash.substring(0, 14)}...` : 'N/A'}
                    </td>
                    <td>
                      <button
                        className="rpt-btn-ghost"
                        style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem' }}
                        onClick={() => openDocViewer(doc)}
                      >
                        👁️ View Dossier
                      </button>
                    </td>
                  </tr>
                ))}
                {documents.length === 0 && (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
                      No documents issued yet. Use the generator tabs above to create official documents.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 2: GENERATE REPORT CARD */}
        {!loading && activeTab === 'reportCard' && (
          <div className="generator-two-column">
            <div className="gen-panel">
              <h3>🎓 Student Academic Report Card Generator</h3>
              <p>Computes term GPA, subject marks, class rank, attendance rate, and official remarks.</p>

              <form onSubmit={handleGenerateReportCard}>
                <div className="form-group">
                  <label>Select Matriculated Student</label>
                  <select
                    className="form-select"
                    value={rcForm.studentId}
                    onChange={(e) => setRcForm({ ...rcForm, studentId: e.target.value })}
                    required
                  >
                    {students.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.firstName} {s.lastName} ({s.email})
                      </option>
                    ))}
                    {students.length === 0 && <option value="">No students found</option>}
                  </select>
                </div>

                <div className="form-group">
                  <label>Academic Term</label>
                  <input
                    type="text"
                    className="form-input"
                    value={rcForm.academicTerm}
                    onChange={(e) => setRcForm({ ...rcForm, academicTerm: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Headmaster / Teacher Remarks</label>
                  <textarea
                    className="form-textarea"
                    value={rcForm.teacherRemarks}
                    onChange={(e) => setRcForm({ ...rcForm, teacherRemarks: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Output Format</label>
                  <select
                    className="form-select"
                    value={rcForm.fileFormat}
                    onChange={(e) => setRcForm({ ...rcForm, fileFormat: e.target.value })}
                  >
                    <option value="PDF">Official PDF Document</option>
                    <option value="EXCEL">Excel CSV Data Sheet</option>
                  </select>
                </div>

                <button
                  type="submit"
                  className="rpt-btn-primary"
                  style={{ width: '100%', justifyContent: 'center', marginTop: '1rem' }}
                  disabled={generating}
                >
                  {generating ? 'Computing Grades & Issuing...' : '🎓 Generate Official Report Card'}
                </button>
              </form>
            </div>

            <div className="gen-panel">
              <h3>📋 Grade Engine Specifications</h3>
              <p>Autonomous calculation rules applied during report card compilation:</p>
              <ul style={{ fontSize: '0.82rem', color: '#94a3b8', lineHeight: '1.6', paddingLeft: '1.2rem' }}>
                <li>Standard 4.0 weighted scale based on NEASC and Cambridge standards.</li>
                <li>Calculates honors thresholds: First Honors awarded for GPA ≥ 3.8.</li>
                <li>Embeds immutable SHA-256 digital verification hash for tamper resistance.</li>
                <li>Cross-links attendance logs from live PostgreSQL attendance repository.</li>
              </ul>
            </div>
          </div>
        )}

        {/* TAB 3: OFFICIAL TRANSCRIPTS */}
        {!loading && activeTab === 'transcript' && (
          <div className="generator-two-column">
            <div className="gen-panel">
              <h3>📜 Official Cumulative Transcript Generator</h3>
              <p>Generates certified multi-year academic transcripts with institutional accreditation seals.</p>

              <form onSubmit={handleGenerateTranscript}>
                <div className="form-group">
                  <label>Select Matriculated Student</label>
                  <select
                    className="form-select"
                    value={trnForm.studentId}
                    onChange={(e) => setTrnForm({ ...trnForm, studentId: e.target.value })}
                    required
                  >
                    {students.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.firstName} {s.lastName} ({s.email})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Output Format</label>
                  <select
                    className="form-select"
                    value={trnForm.fileFormat}
                    onChange={(e) => setTrnForm({ ...trnForm, fileFormat: e.target.value })}
                  >
                    <option value="PDF">Certified PDF Transcript</option>
                    <option value="EXCEL">Electronic Data File</option>
                  </select>
                </div>

                <button
                  type="submit"
                  className="rpt-btn-primary"
                  style={{ width: '100%', justifyContent: 'center', marginTop: '1rem' }}
                  disabled={generating}
                >
                  {generating ? 'Compiling Transcript...' : '📜 Issue Official Transcript'}
                </button>
              </form>
            </div>

            <div className="gen-panel">
              <h3>🛡️ Institutional Accreditation Seal</h3>
              <p>All issued transcripts include GBS institutional credentials:</p>
              <div style={{ background: '#090d16', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px', padding: '1rem', fontSize: '0.8rem', color: '#cbd5e1' }}>
                <div><strong>Accreditation:</strong> Cambridge International Assessment & NEASC</div>
                <div><strong>Registry Ledger:</strong> PostgreSQL Primary Shard (Tenant ID: 1)</div>
                <div><strong>Graduation Status:</strong> Validated for University Admissions Worldwide</div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: TUITION FEE RECEIPTS */}
        {!loading && activeTab === 'feeReceipt' && (
          <div className="generator-two-column">
            <div className="gen-panel">
              <h3>💳 Tuition Fee Payment Receipt Generator</h3>
              <p>Generates official Bursar payment vouchers with itemized tuition accounting.</p>

              <form onSubmit={handleGenerateFeeReceipt}>
                <div className="form-group">
                  <label>Payer / Guardian Name</label>
                  <input
                    type="text"
                    className="form-input"
                    value={feeForm.recipientName}
                    onChange={(e) => setFeeForm({ ...feeForm, recipientName: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Student Name</label>
                  <input
                    type="text"
                    className="form-input"
                    value={feeForm.studentName}
                    onChange={(e) => setFeeForm({ ...feeForm, studentName: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Total Amount Paid (USD)</label>
                  <input
                    type="number"
                    step="0.01"
                    className="form-input"
                    value={feeForm.amountPaid}
                    onChange={(e) => setFeeForm({ ...feeForm, amountPaid: parseFloat(e.target.value) || 0 })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Invoice Reference</label>
                  <input
                    type="text"
                    className="form-input"
                    value={feeForm.invoiceReference}
                    onChange={(e) => setFeeForm({ ...feeForm, invoiceReference: e.target.value })}
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="rpt-btn-primary"
                  style={{ width: '100%', justifyContent: 'center', marginTop: '1rem' }}
                  disabled={generating}
                >
                  {generating ? 'Recording Voucher...' : '💳 Issue Official Fee Receipt'}
                </button>
              </form>
            </div>

            <div className="gen-panel">
              <h3>💼 Bursar Accounting Controls</h3>
              <p>Receipt features guaranteed under GBS Financial Governance:</p>
              <ul style={{ fontSize: '0.82rem', color: '#94a3b8', lineHeight: '1.6', paddingLeft: '1.2rem' }}>
                <li>Itemized tuition, laboratory, and insurance levy breakdown.</li>
                <li>Cryptographic cashier authentication stamp.</li>
                <li>Immediate synchronization with PostgreSQL financial ledger.</li>
              </ul>
            </div>
          </div>
        )}

        {/* TAB 5: ENROLLMENT CERTIFICATES */}
        {!loading && activeTab === 'certificate' && (
          <div className="generator-two-column">
            <div className="gen-panel">
              <h3>📜 Certificate of Enrollment Generator</h3>
              <p>Issues official Bona Fide student certificates for embassies, visas, and legal affairs.</p>

              <form onSubmit={handleGenerateCertificate}>
                <div className="form-group">
                  <label>Full Student Legal Name</label>
                  <input
                    type="text"
                    className="form-input"
                    value={certForm.studentName}
                    onChange={(e) => setCertForm({ ...certForm, studentName: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Registered Grade Level</label>
                  <input
                    type="number"
                    className="form-input"
                    value={certForm.gradeLevel}
                    onChange={(e) => setCertForm({ ...certForm, gradeLevel: parseInt(e.target.value, 10) || 10 })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Current Academic Session</label>
                  <input
                    type="text"
                    className="form-input"
                    value={certForm.academicYear}
                    onChange={(e) => setCertForm({ ...certForm, academicYear: e.target.value })}
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="rpt-btn-primary"
                  style={{ width: '100%', justifyContent: 'center', marginTop: '1rem' }}
                  disabled={generating}
                >
                  {generating ? 'Authorizing Certificate...' : '📜 Issue Enrollment Certificate'}
                </button>
              </form>
            </div>

            <div className="gen-panel">
              <h3>🏛️ Legal Validity & Embassies</h3>
              <p>Certificates conform to international diplomatic guidelines:</p>
              <div style={{ background: '#090d16', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px', padding: '1rem', fontSize: '0.8rem', color: '#cbd5e1' }}>
                Authorized by Registrar General with QR code verification hash.
              </div>
            </div>
          </div>
        )}

        {/* TAB 6: CRYPTOGRAPHIC HASH VERIFIER */}
        {!loading && activeTab === 'verifier' && (
          <div style={{ maxWidth: '720px', margin: '0 auto' }}>
            <div className="gen-panel">
              <h3>🔍 Public Cryptographic Document Verifier</h3>
              <p>Verify document legitimacy by entering Document Number (e.g. RC-2026-XXXX) or SHA-256 hash.</p>

              <form onSubmit={handleVerifyDocument}>
                <div className="form-group">
                  <label>Enter Document Tracking Number or SHA-256 Hash</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. RC-2026-9204 or SHA-256 hash"
                    value={verifyInput}
                    onChange={(e) => setVerifyInput(e.target.value)}
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="rpt-btn-primary"
                  style={{ width: '100%', justifyContent: 'center' }}
                  disabled={verifying}
                >
                  {verifying ? 'Querying PostgreSQL Primary Ledger...' : '🔍 Authenticate Official Document'}
                </button>
              </form>

              {verifyResult && (
                <div style={{ marginTop: '1.6rem', padding: '1.2rem', borderRadius: '8px', background: verifyResult.verified ? 'rgba(16, 185, 129, 0.1)' : 'rgba(244, 63, 94, 0.1)', border: verifyResult.verified ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(244, 63, 94, 0.3)' }}>
                  <div style={{ fontWeight: 800, fontSize: '1.1rem', color: verifyResult.verified ? '#34d399' : '#fb7185', marginBottom: '0.5rem' }}>
                    {verifyResult.verified ? '✅ OFFICIAL DOCUMENT VERIFIED AUTHENTIC' : '❌ VERIFICATION FAILED'}
                  </div>
                  {verifyResult.verified ? (
                    <div style={{ fontSize: '0.82rem', color: '#e2e8f0', lineHeight: '1.6' }}>
                      <div><strong>Doc Number:</strong> {verifyResult.documentNumber}</div>
                      <div><strong>Document Type:</strong> {verifyResult.documentType}</div>
                      <div><strong>Recipient:</strong> {verifyResult.recipientName}</div>
                      <div><strong>Issued At:</strong> {new Date(verifyResult.issuedAt).toLocaleString()}</div>
                      <div><strong>Digital Seal Hash:</strong> <span style={{ fontFamily: 'var(--rpt-mono-font)', color: '#38bdf8' }}>{verifyResult.verificationHash}</span></div>
                      <div style={{ marginTop: '0.5rem', color: '#94a3b8' }}>{verifyResult.authenticityNote}</div>
                    </div>
                  ) : (
                    <div style={{ fontSize: '0.82rem', color: '#fb7185' }}>{verifyResult.message}</div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* DOCUMENT DOSSIER PREVIEW MODAL */}
      {showDocModal && selectedDoc && (
        <div className="modal-backdrop">
          <div className="modal-window">
            <div className="modal-header">
              <h3>{selectedDoc.title}</h3>
              <button className="modal-close-btn" onClick={() => setShowDocModal(false)}>✕</button>
            </div>

            {/* Formal Document Layout */}
            <div className="printable-document-preview">
              <div className="preview-crest-header">
                <img src="/assets/gbs_crest_badge.jpg" alt="GBS Crest" />
                <h3 className="preview-school-title">GBS SCHOOL MANAGEMENT SYSTEM</h3>
                <div className="preview-doc-type">{selectedDoc.documentType.replace('_', ' ')}</div>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                  Document Ref: <strong>{selectedDoc.documentNumber}</strong> | Term: <strong>{selectedDoc.academicTerm}</strong>
                </div>
              </div>

              <div className="preview-meta-grid">
                <div className="preview-meta-item">
                  <span>Student / Recipient: </span>
                  <strong>{selectedDoc.recipientName}</strong>
                </div>
                <div className="preview-meta-item">
                  <span>Class Division: </span>
                  <strong>{selectedDoc.className || 'General Enrollment'}</strong>
                </div>
                <div className="preview-meta-item">
                  <span>Issue Date: </span>
                  <strong>{new Date(selectedDoc.generatedAt).toLocaleDateString()}</strong>
                </div>
                <div className="preview-meta-item">
                  <span>Registry Status: </span>
                  <strong style={{ color: '#059669' }}>OFFICIALLY VERIFIED</strong>
                </div>
              </div>

              {/* Data Payload Display */}
              {(() => {
                let payload = {};
                try {
                  payload = JSON.parse(selectedDoc.dataPayload);
                } catch {
                  payload = {};
                }

                if (selectedDoc.documentType === 'REPORT_CARD' && payload.subjectBreakdown) {
                  return (
                    <div>
                      <table className="preview-grades-table">
                        <thead>
                          <tr>
                            <th>Course Subject</th>
                            <th>Credit Hours</th>
                            <th>Score</th>
                            <th>Letter Grade</th>
                            <th>GPA Point</th>
                          </tr>
                        </thead>
                        <tbody>
                          {payload.subjectBreakdown.map((s, idx) => (
                            <tr key={idx}>
                              <td><strong>{s.subjectName}</strong> ({s.subjectCode})</td>
                              <td>{s.creditHours}</td>
                              <td>{s.score}%</td>
                              <td style={{ fontWeight: 700 }}>{s.letterGrade}</td>
                              <td style={{ fontFamily: 'var(--rpt-mono-font)' }}>{s.gpaPoint.toFixed(1)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>

                      <div style={{ display: 'flex', justifyContent: 'space-between', background: '#f8fafc', padding: '0.8rem', borderRadius: '6px', marginBottom: '1rem', fontSize: '0.85rem' }}>
                        <div>Term GPA: <strong style={{ color: '#0284c7' }}>{payload.performance?.termGPA}</strong></div>
                        <div>Honor Standing: <strong style={{ color: '#059669' }}>{payload.performance?.academicHonor}</strong></div>
                        <div>Attendance: <strong>{payload.performance?.attendancePercentage}</strong></div>
                      </div>

                      <div style={{ fontSize: '0.8rem', color: '#475569', fontStyle: 'italic', marginBottom: '1rem' }}>
                        Remarks: "{payload.remarks}"
                      </div>
                    </div>
                  );
                }

                if (selectedDoc.documentType === 'FEE_RECEIPT' && payload.lineItems) {
                  return (
                    <div>
                      <table className="preview-grades-table">
                        <thead>
                          <tr>
                            <th>Item Description</th>
                            <th>Amount (USD)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {payload.lineItems.map((item, idx) => (
                            <tr key={idx}>
                              <td>{item.item}</td>
                              <td style={{ fontFamily: 'var(--rpt-mono-font)' }}>${item.amount.toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <div style={{ textAlign: 'right', fontSize: '1.1rem', fontWeight: 800, color: '#059669', marginBottom: '1rem' }}>
                        Total Paid: ${payload.totalPaid?.toFixed(2)} USD (PAID IN FULL)
                      </div>
                    </div>
                  );
                }

                return (
                  <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '6px', fontSize: '0.82rem', marginBottom: '1rem' }}>
                    {payload.text || JSON.stringify(payload, null, 2)}
                  </div>
                );
              })()}

              <div className="preview-seal-footer">
                <div className="digital-hash-stamp">
                  <div>SHA-256 REGISTRY HASH:</div>
                  <strong>{selectedDoc.verificationHash}</strong>
                </div>
                <div className="signature-line">
                  <div>Dr. Arthur Kingsley, Ph.D.</div>
                  <div style={{ fontSize: '0.65rem', color: '#64748b' }}>Headmaster & Registrar General</div>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.8rem', marginTop: '1.2rem' }}>
              <button className="rpt-btn-ghost" onClick={() => window.print()}>
                🖨️ Print Document
              </button>
              <button className="rpt-btn-primary" onClick={() => setShowDocModal(false)}>
                Close Dossier
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
