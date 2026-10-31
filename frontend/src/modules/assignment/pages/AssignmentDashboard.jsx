import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './AssignmentDashboard.css';

const API_BASE = '/api/v1';

export default function AssignmentDashboard() {
  const navigate = useNavigate();
  const token = localStorage.getItem('gbs_token') || localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('gbs_user') || localStorage.getItem('user') || '{}');

  // Classes & Filter State
  const [classes, setClasses] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Assignments List State
  const [assignments, setAssignments] = useState([]);
  const [loadingAssignments, setLoadingAssignments] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // "Create Assignment" Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createFormData, setCreateFormData] = useState({
    classId: '',
    subjectId: '',
    title: '',
    description: '',
    dueDate: '',
    maxScore: 100,
    attachmentUrl: ''
  });
  const [savingAssignment, setSavingAssignment] = useState(false);

  // "Submissions & Grading" Modal State
  const [selectedAssignmentForReview, setSelectedAssignmentForReview] = useState(null);
  const [submissionsList, setSubmissionsList] = useState([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);
  const [gradingMap, setGradingMap] = useState({}); // { [submissionId]: { grade, feedback } }
  const [savingGradeId, setSavingGradeId] = useState(null);

  // "Student Submit Solution" Modal State
  const [selectedAssignmentForSubmit, setSelectedAssignmentForSubmit] = useState(null);
  const [submissionContent, setSubmissionContent] = useState('');
  const [submissionAttachmentUrl, setSubmissionAttachmentUrl] = useState('');
  const [submittingSolution, setSubmittingSolution] = useState(false);

  const authHeaders = {
    headers: { Authorization: `Bearer ${token}` }
  };

  // 1. Fetch Classes on mount
  useEffect(() => {
    fetchClasses();
  }, []);

  const fetchClasses = async () => {
    try {
      setErrorMessage('');
      const res = await axios.get(`${API_BASE}/academics/classes`, authHeaders);
      const classList = res.data?.data?.classes || [];
      setClasses(classList);
      if (classList.length > 0) {
        setSelectedClassId(classList[0].id.toString());
        setCreateFormData(prev => ({
          ...prev,
          classId: classList[0].id.toString(),
          subjectId: classList[0].subjects?.[0]?.id.toString() || ''
        }));
      }
    } catch (err) {
      console.error('Error fetching classes:', err);
      setErrorMessage(err.response?.data?.message || 'Failed to load academic classes.');
    }
  };

  // 2. Fetch Assignments when selectedClassId changes or filters update
  useEffect(() => {
    if (selectedClassId) {
      fetchAssignments();
    }
  }, [selectedClassId, selectedSubjectId]);

  const fetchAssignments = async () => {
    try {
      setLoadingAssignments(true);
      setErrorMessage('');
      let url = `${API_BASE}/assignments?classId=${selectedClassId}`;
      if (selectedSubjectId) {
        url += `&subjectId=${selectedSubjectId}`;
      }
      const res = await axios.get(url, authHeaders);
      setAssignments(res.data?.data || []);
    } catch (err) {
      console.error('Error fetching assignments:', err);
      setErrorMessage(err.response?.data?.message || 'Failed to fetch assignments.');
    } finally {
      setLoadingAssignments(false);
    }
  };

  // Filtered Assignments
  const filteredAssignments = assignments.filter(a => {
    if (!searchQuery) return true;
    return a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (a.description && a.description.toLowerCase().includes(searchQuery.toLowerCase()));
  });

  // KPI Calculations
  const totalAssignments = assignments.length;
  const totalSubmissions = assignments.reduce((acc, curr) => acc + (curr.metrics?.totalSubmissions || 0), 0);
  const pendingReview = assignments.reduce((acc, curr) => acc + (curr.metrics?.pendingReview || 0), 0);
  const totalGraded = assignments.reduce((acc, curr) => acc + (curr.metrics?.gradedCount || 0), 0);

  // Handle Create Assignment Form Submit
  const handleCreateAssignment = async (e) => {
    e.preventDefault();
    try {
      setSavingAssignment(true);
      setErrorMessage('');
      setSuccessMessage('');

      const payload = {
        classId: parseInt(createFormData.classId, 10),
        subjectId: parseInt(createFormData.subjectId, 10),
        title: createFormData.title.trim(),
        description: createFormData.description,
        dueDate: createFormData.dueDate,
        maxScore: parseFloat(createFormData.maxScore),
        attachmentUrl: createFormData.attachmentUrl || null
      };

      const res = await axios.post(`${API_BASE}/assignments`, payload, authHeaders);
      setSuccessMessage(`Assignment "${res.data?.data?.title}" published successfully!`);
      setShowCreateModal(false);
      setCreateFormData({
        classId: selectedClassId,
        subjectId: '',
        title: '',
        description: '',
        dueDate: '',
        maxScore: 100,
        attachmentUrl: ''
      });
      fetchAssignments();
    } catch (err) {
      console.error('Error creating assignment:', err);
      setErrorMessage(err.response?.data?.message || 'Failed to create assignment.');
    } finally {
      setSavingAssignment(false);
    }
  };

  // Open Submissions Review Drawer
  const handleOpenReview = async (assignment) => {
    setSelectedAssignmentForReview(assignment);
    try {
      setLoadingSubmissions(true);
      const res = await axios.get(`${API_BASE}/assignments/${assignment.id}/submissions`, authHeaders);
      const subs = res.data?.data?.submissions || [];
      setSubmissionsList(subs);

      // Pre-fill grading map
      const initialMap = {};
      subs.forEach(s => {
        initialMap[s.id] = {
          grade: s.grade !== null && s.grade !== undefined ? s.grade : '',
          feedback: s.feedback || ''
        };
      });
      setGradingMap(initialMap);
    } catch (err) {
      console.error('Error fetching submissions:', err);
      setErrorMessage(err.response?.data?.message || 'Failed to load submissions.');
    } finally {
      setLoadingSubmissions(false);
    }
  };

  // Submit Grade for a Student
  const handleSaveGrade = async (submissionId) => {
    try {
      setSavingGradeId(submissionId);
      const currentGrade = gradingMap[submissionId]?.grade;
      const currentFeedback = gradingMap[submissionId]?.feedback;

      if (currentGrade === '' || isNaN(currentGrade)) {
        alert('Please enter a valid numeric grade.');
        return;
      }

      await axios.patch(
        `${API_BASE}/assignments/submissions/${submissionId}/grade`,
        { grade: parseFloat(currentGrade), feedback: currentFeedback },
        authHeaders
      );

      // Update in submissions list
      setSubmissionsList(prev => prev.map(s => {
        if (s.id === submissionId) {
          return {
            ...s,
            grade: parseFloat(currentGrade),
            feedback: currentFeedback,
            status: 'GRADED',
            gradedBy: { firstName: user.firstName || 'Teacher', lastName: user.lastName || '' }
          };
        }
        return s;
      }));

      // Refresh assignments to update KPI cards
      fetchAssignments();
    } catch (err) {
      console.error('Error grading submission:', err);
      alert(err.response?.data?.message || 'Failed to save grade.');
    } finally {
      setSavingGradeId(null);
    }
  };

  // Delete Assignment
  const handleDeleteAssignment = async (assignmentId, title) => {
    if (!window.confirm(`Are you sure you want to permanently delete assignment "${title}"?`)) return;
    try {
      await axios.delete(`${API_BASE}/assignments/${assignmentId}`, authHeaders);
      setSuccessMessage(`Assignment "${title}" removed.`);
      fetchAssignments();
    } catch (err) {
      console.error('Error deleting assignment:', err);
      setErrorMessage(err.response?.data?.message || 'Failed to delete assignment.');
    }
  };

  // Open Student Submit Solution Modal
  const handleOpenSubmit = (assignment) => {
    setSelectedAssignmentForSubmit(assignment);
    setSubmissionContent('');
    setSubmissionAttachmentUrl('');
  };

  const handleStudentSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmittingSolution(true);
      await axios.post(
        `${API_BASE}/assignments/${selectedAssignmentForSubmit.id}/submit`,
        {
          submissionContent,
          attachmentUrl: submissionAttachmentUrl || null
        },
        authHeaders
      );
      setSuccessMessage('Your assignment submission has been successfully submitted and logged!');
      setSelectedAssignmentForSubmit(null);
      fetchAssignments();
    } catch (err) {
      console.error('Error submitting solution:', err);
      alert(err.response?.data?.message || 'Failed to submit solution.');
    } finally {
      setSubmittingSolution(false);
    }
  };

  const activeClassObj = classes.find(c => c.id.toString() === selectedClassId.toString());
  const activeClassSubjects = activeClassObj?.subjects || [];

  return (
    <div className="assignments-page">
      {/* HEADER */}
      <header className="assignments-header">
        <div className="header-left">
          <button className="back-btn" onClick={() => navigate(`/portal/${user.role?.toLowerCase() || 'admin'}/dashboard`)}>
            ← Dashboard
          </button>
          <div>
            <h1>Student Assignments & Homework Distribution</h1>
            <p className="header-subtitle">
              PostgreSQL Curriculum Submissions • Teacher Grading Ledger & Student Performance Telemetry
            </p>
          </div>
        </div>

        <div className="header-actions">
          <button className="action-nav-btn" onClick={() => navigate('/attendance')}>
            📋 Attendance Ledger
          </button>
          <button className="action-nav-btn" onClick={() => navigate('/timetable')}>
            ⏱️ Timetable
          </button>
          <button className="create-assignment-btn" onClick={() => setShowCreateModal(true)}>
            ➕ Create Assignment
          </button>
        </div>
      </header>

      {/* REAL-LIFE DAYTIME PHOTOGRAPHIC HERO BANNER */}
      <section
        className="assignments-hero-banner"
        style={{
          backgroundImage: `linear-gradient(135deg, rgba(15, 23, 42, 0.60), rgba(15, 23, 42, 0.78)), url('/assets/images/library.jpg')`
        }}
      >
        <div className="hero-text-block">
          <div className="hero-pill-badge">CURRICULUM & COURSEWORK</div>
          <h2>Student Assignments & Homework Distribution</h2>
          <p>
            PostgreSQL-backed submission workflows, automated deadline alerts, teacher grading ledger, and student academic performance tracking.
          </p>
        </div>

        <div className="hero-photo-showcase-frame">
          <div className="showcase-photo-wrapper">
            <img
              src="/assets/images/library.jpg"
              alt="Campus Library & Study Hall"
              className="real-life-dashboard-photo"
            />
            <div className="showcase-verified-badge">
              <span className="live-camera-pulse"></span>
              <span>REAL-LIFE CAMPUS VIEW</span>
            </div>
          </div>
          <div className="showcase-photo-caption">
            <span>📍 Campus Research Library & Study Hall • Verified Daylight View</span>
          </div>
        </div>
      </section>

      {/* FILTER BAR */}
      <div className="filter-bar">
        <div className="filter-group">
          <label>Academic Class:</label>
          <select 
            value={selectedClassId} 
            onChange={(e) => {
              setSelectedClassId(e.target.value);
              setSelectedSubjectId('');
            }}
          >
            {classes.map(c => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.code})
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label>Curriculum Subject:</label>
          <select 
            value={selectedSubjectId} 
            onChange={(e) => setSelectedSubjectId(e.target.value)}
          >
            <option value="">All Subjects</option>
            {activeClassSubjects.map(s => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.code})
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group search-group">
          <label>Search Keyword:</label>
          <input 
            type="text" 
            placeholder="Search by assignment title or topic..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* KPI METRIC CARDS */}
      <div className="kpi-grid">
        <div className="kpi-card highlight">
          <span className="kpi-icon">📚</span>
          <div className="kpi-info">
            <span className="kpi-value">{totalAssignments}</span>
            <span className="kpi-label">Active Assignments</span>
          </div>
        </div>

        <div className="kpi-card blue">
          <span className="kpi-icon">📥</span>
          <div className="kpi-info">
            <span className="kpi-value">{totalSubmissions}</span>
            <span className="kpi-label">Total Submissions</span>
          </div>
        </div>

        <div className="kpi-card yellow">
          <span className="kpi-icon">⏳</span>
          <div className="kpi-info">
            <span className="kpi-value">{pendingReview}</span>
            <span className="kpi-label">Pending Reviews</span>
          </div>
        </div>

        <div className="kpi-card green">
          <span className="kpi-icon">🏆</span>
          <div className="kpi-info">
            <span className="kpi-value">{totalGraded}</span>
            <span className="kpi-label">Graded Solutions</span>
          </div>
        </div>
      </div>

      {/* NOTIFICATIONS */}
      {successMessage && (
        <div className="alert-banner success">
          <span>✅</span>
          <div>{successMessage}</div>
        </div>
      )}

      {errorMessage && (
        <div className="alert-banner error">
          <span>⚠️</span>
          <div>{errorMessage}</div>
        </div>
      )}

      {/* ASSIGNMENTS LIST */}
      <div className="assignments-content-card">
        <div className="section-title-row">
          <div>
            <h2>Assignments for {activeClassObj?.name || 'Class'}</h2>
            <p>Select an assignment to inspect submissions, evaluate student work, or submit a solution.</p>
          </div>
        </div>

        {loadingAssignments ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Loading assignments from PostgreSQL...</p>
          </div>
        ) : filteredAssignments.length === 0 ? (
          <div className="empty-state">
            <span className="empty-icon">📂</span>
            <h3>No Assignments Found</h3>
            <p>No assignments have been published for this subject and class cohort yet.</p>
            <button className="create-assignment-btn" onClick={() => setShowCreateModal(true)}>
              ➕ Create First Assignment
            </button>
          </div>
        ) : (
          <div className="assignments-grid">
            {filteredAssignments.map(a => {
              const dueDateObj = new Date(a.dueDate);
              const isPastDue = new Date() > dueDateObj;

              return (
                <div key={a.id} className="assignment-card">
                  <div className="assignment-card-header">
                    <span className="subject-badge">{a.subject?.name || 'Subject'}</span>
                    <span className={`due-badge ${isPastDue ? 'past-due' : 'active'}`}>
                      {isPastDue ? 'Past Due' : 'Active'} • Due {dueDateObj.toLocaleDateString()}
                    </span>
                  </div>

                  <h3 className="assignment-title">{a.title}</h3>
                  <p className="assignment-desc">
                    {a.description || 'No additional instructions provided.'}
                  </p>

                  <div className="assignment-meta-row">
                    <span>Max Score: <strong>{a.maxScore} pts</strong></span>
                    <span>Teacher: <strong>{a.teacher?.firstName} {a.teacher?.lastName}</strong></span>
                  </div>

                  {a.attachmentUrl && (
                    <div className="attachment-chip">
                      📎 <a href={a.attachmentUrl} target="_blank" rel="noreferrer">Reference Attachment</a>
                    </div>
                  )}

                  {/* Submission Progress Bar */}
                  <div className="progress-section">
                    <div className="progress-labels">
                      <span>Submissions: <strong>{a.metrics?.totalSubmissions || 0}</strong></span>
                      <span>Graded: <strong>{a.metrics?.gradedCount || 0}</strong></span>
                      {a.metrics?.averageGrade && (
                        <span>Avg: <strong>{a.metrics.averageGrade} pts</strong></span>
                      )}
                    </div>
                    <div className="progress-track">
                      <div 
                        className="progress-fill"
                        style={{
                          width: `${a.metrics?.submissionRatePct || 0}%`
                        }}
                      ></div>
                    </div>
                  </div>

                  {/* Card Actions */}
                  <div className="card-actions">
                    <button 
                      className="card-btn review"
                      onClick={() => handleOpenReview(a)}
                    >
                      🔍 Submissions ({a.metrics?.totalSubmissions || 0})
                    </button>
                    <button 
                      className="card-btn submit"
                      onClick={() => handleOpenSubmit(a)}
                    >
                      📤 Submit Work
                    </button>
                    <button 
                      className="card-btn delete"
                      onClick={() => handleDeleteAssignment(a.id, a.title)}
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* CREATE ASSIGNMENT MODAL */}
      {showCreateModal && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <div className="modal-header">
              <h3>Create & Publish Homework Assignment</h3>
              <button className="modal-close-btn" onClick={() => setShowCreateModal(false)}>✕</button>
            </div>

            <form onSubmit={handleCreateAssignment} className="modal-form">
              <div className="form-group">
                <label>Assignment Title *</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. Unit 3 Problem Set on Linear Equations"
                  value={createFormData.title}
                  onChange={(e) => setCreateFormData({ ...createFormData, title: e.target.value })}
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Class Cohort *</label>
                  <select 
                    value={createFormData.classId}
                    onChange={(e) => {
                      const cid = e.target.value;
                      const targetC = classes.find(c => c.id.toString() === cid);
                      setCreateFormData({
                        ...createFormData,
                        classId: cid,
                        subjectId: targetC?.subjects?.[0]?.id.toString() || ''
                      });
                    }}
                  >
                    {classes.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Curriculum Subject *</label>
                  <select 
                    value={createFormData.subjectId}
                    onChange={(e) => setCreateFormData({ ...createFormData, subjectId: e.target.value })}
                  >
                    {(classes.find(c => c.id.toString() === createFormData.classId)?.subjects || []).map(s => (
                      <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Due Date & Time *</label>
                  <input 
                    type="datetime-local" 
                    required
                    value={createFormData.dueDate}
                    onChange={(e) => setCreateFormData({ ...createFormData, dueDate: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Maximum Score (Points) *</label>
                  <input 
                    type="number" 
                    min="1"
                    max="1000"
                    required
                    value={createFormData.maxScore}
                    onChange={(e) => setCreateFormData({ ...createFormData, maxScore: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Instructions & Prompt</label>
                <textarea 
                  rows="4"
                  placeholder="Provide detailed submission instructions, required sections, and rubric..."
                  value={createFormData.description}
                  onChange={(e) => setCreateFormData({ ...createFormData, description: e.target.value })}
                ></textarea>
              </div>

              <div className="form-group">
                <label>Attachment / Resource URL (Optional)</label>
                <input 
                  type="url" 
                  placeholder="https://cdn.school.edu/materials/problem-set.pdf"
                  value={createFormData.attachmentUrl}
                  onChange={(e) => setCreateFormData({ ...createFormData, attachmentUrl: e.target.value })}
                />
              </div>

              <div className="modal-footer">
                <button type="button" className="pill-btn" onClick={() => setShowCreateModal(false)}>Cancel</button>
                <button type="submit" className="create-assignment-btn" disabled={savingAssignment}>
                  {savingAssignment ? 'Publishing...' : '🚀 Publish Assignment to Database'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* REVIEW & GRADING MODAL */}
      {selectedAssignmentForReview && (
        <div className="modal-backdrop">
          <div className="modal-card large">
            <div className="modal-header">
              <div>
                <h3>Submissions Ledger: {selectedAssignmentForReview.title}</h3>
                <p className="modal-subtitle">
                  Max Points: {selectedAssignmentForReview.maxScore} • Due: {new Date(selectedAssignmentForReview.dueDate).toLocaleString()}
                </p>
              </div>
              <button className="modal-close-btn" onClick={() => setSelectedAssignmentForReview(null)}>✕</button>
            </div>

            <div className="modal-body">
              {loadingSubmissions ? (
                <div className="loading-state">
                  <div className="spinner"></div>
                  <p>Loading student submissions from PostgreSQL...</p>
                </div>
              ) : submissionsList.length === 0 ? (
                <div className="empty-state">
                  <span className="empty-icon">📥</span>
                  <h3>No Submissions Yet</h3>
                  <p>No student has submitted work for this assignment yet.</p>
                </div>
              ) : (
                <div className="submissions-list">
                  {submissionsList.map(sub => {
                    const currentGrade = gradingMap[sub.id]?.grade ?? '';
                    const currentFeedback = gradingMap[sub.id]?.feedback ?? '';

                    return (
                      <div key={sub.id} className="submission-item">
                        <div className="submission-item-header">
                          <div className="student-profile">
                            <span className="avatar-chip small">
                              {sub.student.firstName[0]}{sub.student.lastName[0]}
                            </span>
                            <div>
                              <strong>{sub.student.firstName} {sub.student.lastName}</strong>
                              <span className="sub-meta">{sub.student.email} • Submitted {new Date(sub.submittedAt).toLocaleString()}</span>
                            </div>
                          </div>

                          <span className={`status-tag ${sub.status.toLowerCase()}`}>
                            {sub.status}
                          </span>
                        </div>

                        {/* Submission Content */}
                        <div className="submission-content-box">
                          <p>{sub.submissionContent || 'No written text submitted.'}</p>
                          {sub.attachmentUrl && (
                            <div className="attachment-chip">
                              📎 <a href={sub.attachmentUrl} target="_blank" rel="noreferrer">Open Submitted Document</a>
                            </div>
                          )}
                        </div>

                        {/* Teacher Grading Section */}
                        <div className="grading-control-row">
                          <div className="score-input-wrap">
                            <label>Grade Score (/{selectedAssignmentForReview.maxScore}):</label>
                            <input 
                              type="number" 
                              step="0.5"
                              min="0"
                              max={selectedAssignmentForReview.maxScore}
                              placeholder="Score"
                              value={currentGrade}
                              onChange={(e) => {
                                const val = e.target.value;
                                setGradingMap(prev => ({
                                  ...prev,
                                  [sub.id]: {
                                    ...(prev[sub.id] || {}),
                                    grade: val
                                  }
                                }));
                              }}
                            />
                          </div>

                          <div className="feedback-input-wrap">
                            <label>Faculty Feedback & Rubric Notes:</label>
                            <input 
                              type="text" 
                              placeholder="Detailed feedback..."
                              value={currentFeedback}
                              onChange={(e) => {
                                const val = e.target.value;
                                setGradingMap(prev => ({
                                  ...prev,
                                  [sub.id]: {
                                    ...(prev[sub.id] || {}),
                                    feedback: val
                                  }
                                }));
                              }}
                            />
                          </div>

                          <button 
                            className="save-grade-btn"
                            disabled={savingGradeId === sub.id}
                            onClick={() => handleSaveGrade(sub.id)}
                          >
                            {savingGradeId === sub.id ? 'Saving...' : '💾 Save Grade'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button className="pill-btn" onClick={() => setSelectedAssignmentForReview(null)}>Done</button>
            </div>
          </div>
        </div>
      )}

      {/* STUDENT SUBMISSION MODAL */}
      {selectedAssignmentForSubmit && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <div className="modal-header">
              <h3>Submit Solution: {selectedAssignmentForSubmit.title}</h3>
              <button className="modal-close-btn" onClick={() => setSelectedAssignmentForSubmit(null)}>✕</button>
            </div>

            <form onSubmit={handleStudentSubmit} className="modal-form">
              <p className="form-info-note">
                Max Score: <strong>{selectedAssignmentForSubmit.maxScore} pts</strong> • Due Date: <strong>{new Date(selectedAssignmentForSubmit.dueDate).toLocaleString()}</strong>
              </p>

              <div className="form-group">
                <label>Written Solution / Working Notes *</label>
                <textarea 
                  rows="5"
                  required
                  placeholder="Enter your written solution, code snippets, or notes..."
                  value={submissionContent}
                  onChange={(e) => setSubmissionContent(e.target.value)}
                ></textarea>
              </div>

              <div className="form-group">
                <label>Document / File Link (Optional)</label>
                <input 
                  type="url" 
                  placeholder="https://cdn.gbs-system.edu/uploads/solution-file.pdf"
                  value={submissionAttachmentUrl}
                  onChange={(e) => setSubmissionAttachmentUrl(e.target.value)}
                />
              </div>

              <div className="modal-footer">
                <button type="button" className="pill-btn" onClick={() => setSelectedAssignmentForSubmit(null)}>Cancel</button>
                <button type="submit" className="create-assignment-btn" disabled={submittingSolution}>
                  {submittingSolution ? 'Submitting...' : '🚀 Submit to Faculty'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
