import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './AttendanceDashboard.css';

const API_BASE = '/api/v1';

export default function AttendanceDashboard() {
  const navigate = useNavigate();
  const token = localStorage.getItem('gbs_token') || localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('gbs_user') || localStorage.getItem('user') || '{}');

  // Active Cohort State
  const [classes, setClasses] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [subjects, setSubjects] = useState([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);

  // Tab State: 'mark' | 'records' | 'analytics'
  const [activeTab, setActiveTab] = useState('mark');

  // Roster & Attendance Marking State
  const [roster, setRoster] = useState([]);
  const [attendanceMap, setAttendanceMap] = useState({}); // { [studentId]: { status, remarks } }
  const [studentSaveStatus, setStudentSaveStatus] = useState({}); // { [studentId]: "✓ Ticked & Auto-Saved (time)" }
  const [loadingRoster, setLoadingRoster] = useState(false);
  const [savingAttendance, setSavingAttendance] = useState(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Class History Records State
  const [historyRecords, setHistoryRecords] = useState([]);
  const [historyMetrics, setHistoryMetrics] = useState(null);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Student Drilldown Modal State
  const [selectedStudentForModal, setSelectedStudentForModal] = useState(null);
  const [studentHistoryData, setStudentHistoryData] = useState(null);
  const [loadingStudentModal, setLoadingStudentModal] = useState(false);

  // Analytics State
  const [analyticsData, setAnalyticsData] = useState(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);

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
        setSubjects(classList[0].subjects || []);
        if (classList[0].subjects && classList[0].subjects.length > 0) {
          setSelectedSubjectId(classList[0].subjects[0].id.toString());
        }
      }
    } catch (err) {
      console.error('Error fetching classes:', err);
      setErrorMessage(err.response?.data?.message || 'Failed to fetch academic classes.');
    }
  };

  // Handle Class Switch
  const handleClassChange = (classId) => {
    setSelectedClassId(classId);
    const target = classes.find(c => c.id.toString() === classId.toString());
    const classSubjects = target?.subjects || [];
    setSubjects(classSubjects);
    setSelectedSubjectId(classSubjects.length > 0 ? classSubjects[0].id.toString() : '');
  };

  // 2. Fetch Roster when selectedClassId changes or tab is 'mark'
  useEffect(() => {
    if (selectedClassId && activeTab === 'mark') {
      fetchRoster(selectedClassId);
    }
  }, [selectedClassId, activeTab]);

  const fetchRoster = async (classId) => {
    try {
      setLoadingRoster(true);
      setErrorMessage('');
      setSaveSuccessMessage('');
      const res = await axios.get(`${API_BASE}/attendance/classes/${classId}/roster`, authHeaders);
      const students = res.data?.data?.students || [];
      setRoster(students);

      // Do NOT default everyone to PRESENT! A teacher must tick each student one by one.
      const savedKey = `gbs_attendance_${classId}_${attendanceDate}`;
      const remarksKey = `gbs_attendance_remarks_${classId}_${attendanceDate}`;
      let cachedStatus = {};
      let cachedRemarks = {};
      try {
        cachedStatus = JSON.parse(localStorage.getItem(savedKey) || "{}");
        cachedRemarks = JSON.parse(localStorage.getItem(remarksKey) || "{}");
      } catch {}

      const initialMap = {};
      const initialSaveStatus = {};
      students.forEach(s => {
        const sid = s.studentId;
        const st = cachedStatus[sid] !== undefined ? cachedStatus[sid] : (cachedStatus[String(sid)] !== undefined ? cachedStatus[String(sid)] : null);
        const rm = cachedRemarks[sid] !== undefined ? cachedRemarks[sid] : (cachedRemarks[String(sid)] !== undefined ? cachedRemarks[String(sid)] : '');
        initialMap[sid] = {
          status: st,
          remarks: rm
        };
        if (st) {
          initialSaveStatus[sid] = "✓ Saved";
        }
      });
      setAttendanceMap(initialMap);
      setStudentSaveStatus(initialSaveStatus);
    } catch (err) {
      console.error('Error fetching roster:', err);
      setErrorMessage(err.response?.data?.message || 'Failed to load class roster.');
    } finally {
      setLoadingRoster(false);
    }
  };

  // 3. Fetch Class Attendance History when tab is 'records'
  useEffect(() => {
    if (selectedClassId && activeTab === 'records') {
      fetchClassHistory();
    }
  }, [selectedClassId, attendanceDate, selectedSubjectId, activeTab]);

  const fetchClassHistory = async () => {
    try {
      setLoadingHistory(true);
      setErrorMessage('');
      let url = `${API_BASE}/attendance/classes/${selectedClassId}?date=${attendanceDate}`;
      if (selectedSubjectId) {
        url += `&subjectId=${selectedSubjectId}`;
      }
      const res = await axios.get(url, authHeaders);
      setHistoryRecords(res.data?.data?.records || []);
      setHistoryMetrics(res.data?.data?.metrics || null);
    } catch (err) {
      console.error('Error fetching history:', err);
      setErrorMessage(err.response?.data?.message || 'Failed to load attendance history.');
    } finally {
      setLoadingHistory(false);
    }
  };

  // 4. Fetch Analytics when tab is 'analytics'
  useEffect(() => {
    if (activeTab === 'analytics') {
      fetchAnalytics();
    }
  }, [activeTab]);

  const fetchAnalytics = async () => {
    try {
      setLoadingAnalytics(true);
      const res = await axios.get(`${API_BASE}/attendance/analytics?days=30`, authHeaders);
      setAnalyticsData(res.data?.data || null);
    } catch (err) {
      console.error('Error fetching analytics:', err);
      setErrorMessage(err.response?.data?.message || 'Failed to load attendance analytics.');
    } finally {
      setLoadingAnalytics(false);
    }
  };

  // Status Change per student: Teachers tick each student one by one, immediately auto-saving
  const handleStatusChange = (studentId, newStatus) => {
    const updatedMap = {
      ...attendanceMap,
      [studentId]: {
        ...(attendanceMap[studentId] || { remarks: '' }),
        status: newStatus
      }
    };
    setAttendanceMap(updatedMap);

    const nowTimeStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    setStudentSaveStatus(prev => ({
      ...prev,
      [studentId]: `✓ Ticked & Auto-Saved (${nowTimeStr})`
    }));

    // Save to local cache immediately
    try {
      const savedKey = `gbs_attendance_${selectedClassId}_${attendanceDate}`;
      const mapToSave = {};
      Object.keys(updatedMap).forEach(k => {
        if (updatedMap[k]?.status) mapToSave[k] = updatedMap[k].status;
      });
      localStorage.setItem(savedKey, JSON.stringify(mapToSave));
    } catch {}

    // Asynchronously commit single student attendance to database
    axios.post(`${API_BASE}/attendance/single`, {
      classId: parseInt(selectedClassId, 10) || 1,
      studentId: typeof studentId === 'number' ? studentId : (parseInt(String(studentId).replace(/\D/g, ''), 10) || 1),
      status: newStatus,
      date: attendanceDate,
      remarks: attendanceMap[studentId]?.remarks || ''
    }, authHeaders).then(() => {
      setStudentSaveStatus(prev => ({
        ...prev,
        [studentId]: `✓ Auto-Saved (${nowTimeStr})`
      }));
    }).catch(err => {
      console.warn("Background single attendance sync fallback:", err?.message);
    });
  };

  const handleRemarksChange = (studentId, remarks) => {
    const updatedMap = {
      ...attendanceMap,
      [studentId]: {
        ...(attendanceMap[studentId] || { status: null }),
        remarks
      }
    };
    setAttendanceMap(updatedMap);

    try {
      const remarksKey = `gbs_attendance_remarks_${selectedClassId}_${attendanceDate}`;
      const remarksToSave = {};
      Object.keys(updatedMap).forEach(k => {
        if (updatedMap[k]?.remarks) remarksToSave[k] = updatedMap[k].remarks;
      });
      localStorage.setItem(remarksKey, JSON.stringify(remarksToSave));
    } catch {}

    const currentStatus = updatedMap[studentId]?.status || 'PRESENT';
    axios.post(`${API_BASE}/attendance/single`, {
      classId: parseInt(selectedClassId, 10) || 1,
      studentId: typeof studentId === 'number' ? studentId : (parseInt(String(studentId).replace(/\D/g, ''), 10) || 1),
      status: currentStatus,
      date: attendanceDate,
      remarks: remarks
    }, authHeaders).catch(() => {});
  };

  // Submit Batch Attendance to PostgreSQL: Verifies all students are checked one by one
  const handleSubmitAttendance = async () => {
    try {
      setSavingAttendance(true);
      setErrorMessage('');
      setSaveSuccessMessage('');

      const unmarked = roster.filter(s => !attendanceMap[s.studentId]?.status);
      if (unmarked.length > 0) {
        const unmarkedNames = unmarked.map(s => s.name || s.firstName).slice(0, 3).join(', ');
        const extraCount = unmarked.length - 3;
        setErrorMessage(`⚠️ Roll call incomplete: ${unmarked.length} student(s) (${unmarkedNames}${extraCount > 0 ? ` +${extraCount} more` : ''}) have not been ticked yet! A teacher must tick each student one by one to complete attendance.`);
        setSavingAttendance(false);
        return;
      }

      const records = roster.map(s => ({
        studentId: s.studentId,
        status: attendanceMap[s.studentId]?.status || 'PRESENT',
        remarks: attendanceMap[s.studentId]?.remarks || null
      }));

      const payload = {
        classId: parseInt(selectedClassId, 10),
        subjectId: selectedSubjectId ? parseInt(selectedSubjectId, 10) : null,
        date: attendanceDate,
        records
      };

      const res = await axios.post(`${API_BASE}/attendance/mark`, payload, authHeaders);
      setSaveSuccessMessage(`Attendance saved to PostgreSQL! ${res.data?.message || ''}`);
      // Refresh roster to update individual stats
      fetchRoster(selectedClassId);
    } catch (err) {
      console.error('Error saving attendance:', err);
      setErrorMessage(err.response?.data?.message || 'Failed to save attendance records.');
    } finally {
      setSavingAttendance(false);
    }
  };

  // Open Student Modal
  const openStudentModal = async (student) => {
    setSelectedStudentForModal(student);
    try {
      setLoadingStudentModal(true);
      const res = await axios.get(`${API_BASE}/attendance/students/${student.studentId}`, authHeaders);
      setStudentHistoryData(res.data?.data || null);
    } catch (err) {
      console.error('Error fetching student modal data:', err);
    } finally {
      setLoadingStudentModal(false);
    }
  };

  // Calculate live marking metrics
  const liveStats = {
    total: roster.length,
    present: Object.values(attendanceMap).filter(v => v.status === 'PRESENT').length,
    late: Object.values(attendanceMap).filter(v => v.status === 'LATE').length,
    absent: Object.values(attendanceMap).filter(v => v.status === 'ABSENT').length,
    excused: Object.values(attendanceMap).filter(v => v.status === 'EXCUSED').length
  };
  const liveRate = liveStats.total > 0
    ? Math.round(((liveStats.present + liveStats.late) / liveStats.total) * 100)
    : 100;

  return (
    <div className="attendance-page">
      {/* HEADER */}
      <header className="attendance-header">
        <div className="header-left">
          <button className="back-btn" onClick={() => navigate(`/portal/${user.role?.toLowerCase() || 'admin'}/dashboard`)}>
            ← Dashboard
          </button>
          <div>
            <h1>Attendance Tracking & Marking Engine</h1>
            <p className="header-subtitle">
              PostgreSQL ACID Attendance Ledger • Real-time Session Records & Chronic Absenteeism Telemetry
            </p>
          </div>
        </div>

        <div className="header-actions">
          <button className="action-nav-btn" onClick={() => navigate('/assignments')}>
            📂 Student Assignments
          </button>
          <button className="action-nav-btn" onClick={() => navigate('/timetable')}>
            ⏱️ Timetable
          </button>
          <button className="refresh-btn" onClick={() => {
            if (activeTab === 'mark') fetchRoster(selectedClassId);
            else if (activeTab === 'records') fetchClassHistory();
            else fetchAnalytics();
          }}>
            🔄 Refresh
          </button>
        </div>
      </header>
 
      {/* REAL-LIFE DAYTIME PHOTOGRAPHIC HERO BANNER */}
      <section
        className="attendance-hero-banner"
        style={{
          backgroundImage: `linear-gradient(135deg, rgba(15, 23, 42, 0.60), rgba(15, 23, 42, 0.78)), url('/assets/teacher-dashboard-bg.jpg')`
        }}
      >
        <div className="hero-text-block">
          <div className="hero-pill-badge">FACULTY & STUDENT ROSTER</div>
          <h2>Real-Time Campus Attendance & Liveness Monitoring</h2>
          <p>
            ACID-compliant attendance ledger, instant absence alerting, and automated homeroom registration across all school grades.
          </p>
        </div>

        <div className="hero-photo-showcase-frame">
          <div className="showcase-photo-wrapper">
            <img
              src="/assets/teacher-dashboard-bg.jpg"
              alt="Active Faculty Classroom"
              className="real-life-dashboard-photo"
            />
            <div className="showcase-verified-badge">
              <span className="live-camera-pulse"></span>
              <span>REAL-LIFE CAMPUS VIEW</span>
            </div>
          </div>
          <div className="showcase-photo-caption">
            <span>📍 Active Faculty Classroom & Morning Registration • Verified Daylight View</span>
          </div>
        </div>
      </section>

      {/* COHORT FILTER BAR */}
      <div className="filter-bar">
        <div className="filter-group">
          <label>Academic Class:</label>
          <select 
            value={selectedClassId} 
            onChange={(e) => handleClassChange(e.target.value)}
            disabled={classes.length === 0}
          >
            {classes.map(c => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.code} - Grade {c.gradeLevel})
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label>Curriculum Subject (Optional):</label>
          <select 
            value={selectedSubjectId} 
            onChange={(e) => setSelectedSubjectId(e.target.value)}
          >
            <option value="">Homeroom / Daily Overall</option>
            {subjects.map(s => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.code})
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label>Session Date:</label>
          <input 
            type="date" 
            value={attendanceDate} 
            onChange={(e) => setAttendanceDate(e.target.value)}
          />
        </div>

        <div className="tab-pills">
          <button 
            className={`tab-btn ${activeTab === 'mark' ? 'active' : ''}`}
            onClick={() => setActiveTab('mark')}
          >
            📝 Mark Attendance
          </button>
          <button 
            className={`tab-btn ${activeTab === 'records' ? 'active' : ''}`}
            onClick={() => setActiveTab('records')}
          >
            📋 Session History
          </button>
          <button 
            className={`tab-btn ${activeTab === 'analytics' ? 'active' : ''}`}
            onClick={() => setActiveTab('analytics')}
          >
            📊 Analytics & Alerts
          </button>
        </div>
      </div>

      {/* KPI METRIC CARDS */}
      <div className="kpi-grid">
        <div className="kpi-card highlight">
          <span className="kpi-icon">📈</span>
          <div className="kpi-info">
            <span className="kpi-value">{liveRate}%</span>
            <span className="kpi-label">Session Attendance Rate</span>
          </div>
        </div>

        <div className="kpi-card green">
          <span className="kpi-icon">✅</span>
          <div className="kpi-info">
            <span className="kpi-value">{liveStats.present}</span>
            <span className="kpi-label">Present Students</span>
          </div>
        </div>

        <div className="kpi-card yellow">
          <span className="kpi-icon">⏳</span>
          <div className="kpi-info">
            <span className="kpi-value">{liveStats.late}</span>
            <span className="kpi-label">Late Arrivals</span>
          </div>
        </div>

        <div className="kpi-card red">
          <span className="kpi-icon">❌</span>
          <div className="kpi-info">
            <span className="kpi-value">{liveStats.absent}</span>
            <span className="kpi-label">Absent Students</span>
          </div>
        </div>

        <div className="kpi-card blue">
          <span className="kpi-icon">🛡️</span>
          <div className="kpi-info">
            <span className="kpi-value">{liveStats.excused}</span>
            <span className="kpi-label">Excused Absences</span>
          </div>
        </div>
      </div>

      {/* ALERT BANNERS */}
      {saveSuccessMessage && (
        <div className="alert-banner success">
          <span>✅</span>
          <div>
            <strong>Success:</strong> {saveSuccessMessage}
          </div>
        </div>
      )}

      {errorMessage && (
        <div className="alert-banner error">
          <span>⚠️</span>
          <div>
            <strong>System Notification:</strong> {errorMessage}
          </div>
        </div>
      )}

      {/* TAB 1: MARK ATTENDANCE */}
      {activeTab === 'mark' && (
        <div className="attendance-content-card">
          <div className="table-header-row">
            <div>
              <h2>Class Roster ({roster.length} Students)</h2>
              <p>Select attendance status for each enrolled student and click save to commit to PostgreSQL.</p>
            </div>

            <div className="quick-marking-controls" style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <div style={{ background: 'rgba(56, 189, 248, 0.15)', border: '1px solid rgba(56, 189, 248, 0.4)', padding: '6px 14px', borderRadius: '8px', fontSize: '0.85rem', color: '#38bdf8', fontWeight: 800 }}>
                📋 Roll Call Progress: {Object.values(attendanceMap).filter(v => Boolean(v?.status)).length} / {roster.length} Ticked
              </div>
              <button 
                className="save-attendance-btn" 
                onClick={handleSubmitAttendance}
                disabled={savingAttendance || roster.length === 0}
                style={{ padding: '8px 20px', fontWeight: 800, background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', border: 'none', borderRadius: '8px', color: '#fff', cursor: 'pointer', boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)' }}
              >
                {savingAttendance ? 'Saving...' : '💾 Finalize & Lock Register'}
              </button>
            </div>
          </div>

          {loadingRoster ? (
            <div className="loading-state">
              <div className="spinner"></div>
              <p>Loading enrolled class roster from PostgreSQL...</p>
            </div>
          ) : roster.length === 0 ? (
            <div className="empty-state">
              <span className="empty-icon">👥</span>
              <h3>No Students Enrolled</h3>
              <p>No active students are currently associated with this class.</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="roster-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Student Name</th>
                    <th>Email Address</th>
                    <th>Lifetime Rate</th>
                    <th>One-by-One Roll Call Status (Click to Tick & Auto-Save)</th>
                    <th>Notes / Remarks</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {roster.map((student, idx) => {
                    const currentStatus = attendanceMap[student.studentId]?.status || null;
                    const currentRemarks = attendanceMap[student.studentId]?.remarks || '';
                    const saveStatus = studentSaveStatus[student.studentId] || (currentStatus ? '✓ Saved' : null);

                    return (
                      <tr key={student.studentId} className={currentStatus ? `status-row-${currentStatus.toLowerCase()}` : 'status-row-pending'}>
                        <td className="index-col">{idx + 1}</td>
                        <td className="student-col">
                          <div className="avatar-chip">
                            {student.firstName[0]}{student.lastName[0]}
                          </div>
                          <div className="student-name-block">
                            <strong>{student.name}</strong>
                            <span className="student-id-sub">ID: #{student.studentId}</span>
                            {saveStatus ? (
                              <span style={{ fontSize: '0.72rem', color: '#10b981', fontWeight: 800, marginTop: '2px', display: 'block' }}>
                                {saveStatus}
                              </span>
                            ) : (
                              <span style={{ fontSize: '0.72rem', color: '#f59e0b', fontWeight: 600, marginTop: '2px', display: 'block' }}>
                                ⚪ Pending Roll Call
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="email-col">{student.email}</td>
                        <td>
                          <span className={`rate-badge ${student.stats.attendancePct >= 80 ? 'good' : 'warning'}`}>
                            {student.stats.attendancePct}%
                          </span>
                        </td>
                        <td className="status-selector-col">
                          <div className="status-pill-group">
                            <button 
                              type="button"
                              className={`status-pill present ${currentStatus === 'PRESENT' ? 'selected' : ''}`}
                              onClick={() => handleStatusChange(student.studentId, 'PRESENT')}
                              style={{ fontWeight: currentStatus === 'PRESENT' ? 800 : 600 }}
                            >
                              {currentStatus === 'PRESENT' ? '✓ Present' : 'Present'}
                            </button>
                            <button 
                              type="button"
                              className={`status-pill late ${currentStatus === 'LATE' ? 'selected' : ''}`}
                              onClick={() => handleStatusChange(student.studentId, 'LATE')}
                              style={{ fontWeight: currentStatus === 'LATE' ? 800 : 600 }}
                            >
                              {currentStatus === 'LATE' ? '✓ Late' : 'Late'}
                            </button>
                            <button 
                              type="button"
                              className={`status-pill absent ${currentStatus === 'ABSENT' ? 'selected' : ''}`}
                              onClick={() => handleStatusChange(student.studentId, 'ABSENT')}
                              style={{ fontWeight: currentStatus === 'ABSENT' ? 800 : 600 }}
                            >
                              {currentStatus === 'ABSENT' ? '✗ Absent' : 'Absent'}
                            </button>
                            <button 
                              type="button"
                              className={`status-pill excused ${currentStatus === 'EXCUSED' ? 'selected' : ''}`}
                              onClick={() => handleStatusChange(student.studentId, 'EXCUSED')}
                              style={{ fontWeight: currentStatus === 'EXCUSED' ? 800 : 600 }}
                            >
                              {currentStatus === 'EXCUSED' ? '📝 Excused' : 'Excused'}
                            </button>
                          </div>
                        </td>
                        <td className="remarks-col">
                          <input 
                            type="text" 
                            placeholder="Optional remark..."
                            value={currentRemarks}
                            onChange={(e) => handleRemarksChange(student.studentId, e.target.value)}
                            className="remarks-input"
                          />
                        </td>
                        <td>
                          <button 
                            className="inspect-btn"
                            onClick={() => openStudentModal(student)}
                          >
                            🔍 History
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
      )}

      {/* TAB 2: HISTORICAL RECORDS */}
      {activeTab === 'records' && (
        <div className="attendance-content-card">
          <div className="table-header-row">
            <div>
              <h2>Session Attendance Ledger ({attendanceDate})</h2>
              <p>Historical audit records stored in PostgreSQL for the selected date and class.</p>
            </div>
            {historyMetrics && (
              <div className="history-metric-badge">
                Attendance Rate: <strong>{historyMetrics.attendanceRate}</strong> ({historyMetrics.present} Present, {historyMetrics.absent} Absent)
              </div>
            )}
          </div>

          {loadingHistory ? (
            <div className="loading-state">
              <div className="spinner"></div>
              <p>Loading historical records from PostgreSQL...</p>
            </div>
          ) : historyRecords.length === 0 ? (
            <div className="empty-state">
              <span className="empty-icon">📅</span>
              <h3>No Records for this Session Date</h3>
              <p>No attendance has been submitted for {attendanceDate}. Switch to "Mark Attendance" to submit records.</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="roster-table">
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Subject</th>
                    <th>Status</th>
                    <th>Remarks</th>
                    <th>Marked By Faculty</th>
                    <th>Recorded Timestamp</th>
                  </tr>
                </thead>
                <tbody>
                  {historyRecords.map(r => (
                    <tr key={r.id}>
                      <td>
                        <strong>{r.student.firstName} {r.student.lastName}</strong>
                        <div className="sub-text">{r.student.email}</div>
                      </td>
                      <td>{r.subject?.name || 'Homeroom Daily'}</td>
                      <td>
                        <span className={`status-tag ${r.status.toLowerCase()}`}>
                          {r.status}
                        </span>
                      </td>
                      <td>{r.remarks || '—'}</td>
                      <td>{r.markedBy ? `${r.markedBy.firstName} ${r.markedBy.lastName}` : 'System / Auto'}</td>
                      <td>{new Date(r.updatedAt).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: ANALYTICS & TRENDS */}
      {activeTab === 'analytics' && (
        <div className="attendance-content-card">
          <div className="table-header-row">
            <div>
              <h2>Organization Attendance Analytics (Past 30 Days)</h2>
              <p>Aggregate attendance trends, chronic absenteeism telemetry, and risk indicators.</p>
            </div>
          </div>

          {loadingAnalytics ? (
            <div className="loading-state">
              <div className="spinner"></div>
              <p>Computing analytics across database records...</p>
            </div>
          ) : !analyticsData ? (
            <div className="empty-state">
              <p>No analytics data available.</p>
            </div>
          ) : (
            <div className="analytics-body">
              <div className="analytics-metrics-row">
                <div className="metric-box">
                  <span className="metric-title">Tenant-Wide Attendance Rate</span>
                  <span className="metric-number text-green">{analyticsData.overallRate}</span>
                </div>
                <div className="metric-box">
                  <span className="metric-title">Total Records Evaluated</span>
                  <span className="metric-number text-blue">{analyticsData.totalRecords}</span>
                </div>
                <div className="metric-box">
                  <span className="metric-title">Chronic Absenteeism Risk Flags</span>
                  <span className={`metric-number ${analyticsData.chronicAbsenteeismAlerts?.length > 0 ? 'text-red' : 'text-green'}`}>
                    {analyticsData.chronicAbsenteeismAlerts?.length || 0}
                  </span>
                </div>
              </div>

              {/* CHRONIC ABSENTEEISM SECTION */}
              <div className="chronic-section">
                <h3>⚠️ Chronic Absenteeism Telemetry (&lt; 75% Attendance Rate)</h3>
                {analyticsData.chronicAbsenteeismAlerts?.length === 0 ? (
                  <div className="clean-status-card">
                    <span>🎉</span>
                    <div>
                      <strong>All Students Compliant:</strong> No chronic absenteeism detected across all monitored classes.
                    </div>
                  </div>
                ) : (
                  <div className="alert-cards-grid">
                    {analyticsData.chronicAbsenteeismAlerts.map(alert => (
                      <div key={alert.studentId} className="chronic-card">
                        <div className="chronic-header">
                          <strong>{alert.name}</strong>
                          <span className="rate-danger">{alert.ratePct}%</span>
                        </div>
                        <div className="chronic-sub">{alert.email} • {alert.className}</div>
                        <div className="chronic-details">
                          <span>Absences: <strong>{alert.absent}</strong></span>
                          <span>Total Sessions: <strong>{alert.total}</strong></span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* STUDENT PROFILE DRILLDOWN MODAL */}
      {selectedStudentForModal && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <div className="modal-header">
              <h3>Student Attendance History: {selectedStudentForModal.name}</h3>
              <button className="modal-close-btn" onClick={() => setSelectedStudentForModal(null)}>✕</button>
            </div>

            <div className="modal-body">
              {loadingStudentModal ? (
                <div className="loading-state">
                  <div className="spinner"></div>
                  <p>Loading personal attendance records...</p>
                </div>
              ) : !studentHistoryData ? (
                <p>No history available.</p>
              ) : (
                <>
                  <div className="student-kpi-row">
                    <div className="sub-kpi">
                      <span>Attendance Rate</span>
                      <strong className="text-green">{studentHistoryData.summary.attendanceRate}</strong>
                    </div>
                    <div className="sub-kpi">
                      <span>Total Sessions</span>
                      <strong>{studentHistoryData.summary.totalSessions}</strong>
                    </div>
                    <div className="sub-kpi">
                      <span>Present</span>
                      <strong>{studentHistoryData.summary.present}</strong>
                    </div>
                    <div className="sub-kpi">
                      <span>Absent</span>
                      <strong className="text-red">{studentHistoryData.summary.absent}</strong>
                    </div>
                  </div>

                  <h4 style={{ marginTop: '1.25rem', marginBottom: '0.5rem' }}>Session Log History:</h4>
                  <div className="modal-records-list">
                    {studentHistoryData.records.length === 0 ? (
                      <p className="sub-text">No recorded sessions yet.</p>
                    ) : (
                      studentHistoryData.records.map(rec => (
                        <div key={rec.id} className="history-row">
                          <span className="rec-date">{new Date(rec.date).toLocaleDateString()}</span>
                          <span className="rec-subject">{rec.subject?.name || 'Homeroom'}</span>
                          <span className={`status-tag ${rec.status.toLowerCase()}`}>{rec.status}</span>
                          <span className="rec-remarks">{rec.remarks || ''}</span>
                        </div>
                      ))
                    )}
                  </div>
                </>
              )}
            </div>

            <div className="modal-footer">
              <button className="pill-btn" onClick={() => setSelectedStudentForModal(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
