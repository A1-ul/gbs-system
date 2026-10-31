import React, { useState, useEffect } from 'react';
import { getApiBaseUrl } from '../../../api/client/apiConfig';
import './ParentPortalDashboard.css';

const API_BASE = getApiBaseUrl();

export default function ParentPortalDashboard() {
  const [children, setChildren] = useState([]);
  const [selectedChildId, setSelectedChildId] = useState(null);
  const [childOverview, setChildOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingOverview, setLoadingOverview] = useState(false);
  const [error, setError] = useState(null);

  const getHeaders = () => {
    const token = localStorage.getItem('gbs_token');
    return {
      'Content-Type': 'application/json',
      Authorization: token ? `Bearer ${token}` : ''
    };
  };

  // 1. Fetch all linked children
  const fetchChildren = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`${API_BASE}/parents/my-children`, { headers: getHeaders() });
      const json = await res.json();
      if (json.status === 'success') {
        const list = json.data.children || [];
        setChildren(list);
        if (list.length > 0) {
          setSelectedChildId(list[0].student.id);
        }
      } else {
        throw new Error(json.message || 'Failed to load linked children');
      }
    } catch (err) {
      console.error('Parent children fetch error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // 2. Fetch selected child overview
  const fetchChildOverview = async (studentId) => {
    if (!studentId) return;
    try {
      setLoadingOverview(true);
      const res = await fetch(`${API_BASE}/parents/children/${studentId}/overview`, {
        headers: getHeaders()
      });
      const json = await res.json();
      if (json.status === 'success') {
        setChildOverview(json.data.overview);
      }
    } catch (err) {
      console.error('Child overview fetch error:', err);
    } finally {
      setLoadingOverview(false);
    }
  };

  useEffect(() => {
    fetchChildren();
  }, []);

  useEffect(() => {
    if (selectedChildId) {
      fetchChildOverview(selectedChildId);
    }
  }, [selectedChildId]);

  return (
    <div className="parent-portal-root">
      {/* Real-Life Hero Banner */}
      <div className="parent-hero-banner">
        <div className="parent-hero-overlay"></div>
        <div className="parent-hero-content">
          <div className="parent-hero-top">
            <button type="button" className="parent-back-btn" onClick={() => window.history.back()}>
              ← Back to Portal
            </button>
            <span className="parent-security-pill">🛡️ VERIFIED PARENT & GUARDIAN ACCESS</span>
          </div>

          <div className="parent-hero-header-row">
            <div>
              <h1>Parent & Guardian Portal</h1>
              <p className="parent-hero-sub">
                Real-Time Student Attendance • Virtual Classroom Sessions • Homework & Grade Tracking • Direct Campus Emergency Link
              </p>
              <div className="emergency-quick-card" style={{ marginTop: '16px' }}>
                <span className="emergency-icon">🚨</span>
                <div>
                  <span className="emergency-title">Campus Emergency Locator</span>
                  <span className="emergency-sub">Active GPS & Guardian Phone Lookup</span>
                </div>
                <button
                  type="button"
                  className="emergency-launch-btn"
                  onClick={() => (window.location.href = '/emergency-locator')}
                >
                  Open Locator →
                </button>
              </div>
            </div>

            <div className="hero-photo-showcase-frame">
              <div className="showcase-photo-wrapper">
                <img
                  src="/assets/parent-dashboard-bg.jpg"
                  alt="Parent-Faculty Conference Lounge"
                  className="real-life-dashboard-photo"
                />
                <div className="showcase-verified-badge">
                  <span className="live-camera-pulse"></span>
                  <span>REAL-LIFE CAMPUS VIEW</span>
                </div>
              </div>
              <div className="showcase-photo-caption">
                <span>📍 Parent-Faculty Conference Lounge & Reception • Verified Daylight View</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="parent-container">
        {loading ? (
          <div className="parent-state-box">
            <p>Loading linked student profiles from PostgreSQL...</p>
          </div>
        ) : error ? (
          <div className="parent-state-box error-box">
            <p>Error retrieving parent records: {error}</p>
            <button type="button" onClick={fetchChildren} className="parent-retry-btn">Retry</button>
          </div>
        ) : children.length === 0 ? (
          <div className="parent-state-box empty-box">
            <span className="empty-glyph">👨‍👩‍👧</span>
            <h3>No Linked Students Found</h3>
            <p>Your parent account is not currently linked to any enrolled student profile in this organization.</p>
            <p style={{ fontSize: '0.85rem', color: '#64748b' }}>Please contact the school registrar or administrator to link your account.</p>
          </div>
        ) : (
          <>
            {/* Children Selector Cards */}
            <div className="children-nav-strip">
              <span className="strip-label">My Enrolled Children:</span>
              <div className="children-tabs-row">
                {children.map((c) => {
                  const isSelected = selectedChildId === c.student.id;
                  return (
                    <button
                      key={c.student.id}
                      type="button"
                      className={`child-tab-card ${isSelected ? 'active-tab' : ''}`}
                      onClick={() => setSelectedChildId(c.student.id)}
                    >
                      <div className="child-avatar">🎓</div>
                      <div className="child-tab-info">
                        <span className="child-name">{c.student.firstName} {c.student.lastName}</span>
                        <span className="child-class-name">
                          {c.class ? c.class.name : 'Enrolled Student'} • {c.relationship}
                        </span>
                      </div>
                      <div className="child-rate-pill">
                        {c.metrics?.attendanceRate || 100}% Attendance
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Selected Child Details */}
            {loadingOverview || !childOverview ? (
              <div className="parent-state-box">
                <p>Loading comprehensive academic records for student...</p>
              </div>
            ) : (
              <div className="overview-grid">
                {/* 1. Academic & Attendance Snapshot */}
                <div className="overview-card attendance-card">
                  <div className="card-header-line">
                    <h3>📊 Attendance & Campus Presence</h3>
                    <span className="card-badge">LIVE DATABASE RECORDS</span>
                  </div>

                  <div className="attendance-metric-display">
                    <div className="gauge-circle">
                      <span className="gauge-val">{childOverview.attendance.attendanceRate}%</span>
                      <span className="gauge-lbl">Overall Rate</span>
                    </div>

                    <div className="attendance-breakdown-bars">
                      <div className="bar-row">
                        <span className="bar-lbl">Present ({childOverview.attendance.breakdown.present})</span>
                        <div className="bar-track">
                          <div
                            className="bar-fill green-fill"
                            style={{
                              width: `${(childOverview.attendance.breakdown.present / Math.max(1, childOverview.attendance.totalSessions)) * 100}%`
                            }}
                          ></div>
                        </div>
                      </div>
                      <div className="bar-row">
                        <span className="bar-lbl">Late ({childOverview.attendance.breakdown.late})</span>
                        <div className="bar-track">
                          <div
                            className="bar-fill amber-fill"
                            style={{
                              width: `${(childOverview.attendance.breakdown.late / Math.max(1, childOverview.attendance.totalSessions)) * 100}%`
                            }}
                          ></div>
                        </div>
                      </div>
                      <div className="bar-row">
                        <span className="bar-lbl">Absent ({childOverview.attendance.breakdown.absent})</span>
                        <div className="bar-track">
                          <div
                            className="bar-fill red-fill"
                            style={{
                              width: `${(childOverview.attendance.breakdown.absent / Math.max(1, childOverview.attendance.totalSessions)) * 100}%`
                            }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="recent-attendance-history">
                    <h4>Recent Class Logins & Attendance</h4>
                    {childOverview.attendance.recentRecords.length === 0 ? (
                      <p className="no-records-msg">No attendance entries recorded yet.</p>
                    ) : (
                      <div className="history-tags-list">
                        {childOverview.attendance.recentRecords.slice(0, 6).map((r) => (
                          <div key={r.id} className="history-pill">
                            <span className="pill-date">{new Date(r.date).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
                            <span className={`pill-status status-${r.status.toLowerCase()}`}>{r.status}</span>
                            <span className="pill-subj">{r.subject?.code || 'Core'}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* 2. Virtual Classrooms & Upcoming Meetings */}
                <div className="overview-card meetings-card">
                  <div className="card-header-line">
                    <h3>🎥 Live Virtual Classrooms & Zoom Sessions</h3>
                    <span className="card-badge">TIMETABLE CONNECTED</span>
                  </div>

                  {childOverview.upcomingOnlineClasses.length === 0 ? (
                    <div className="card-empty-note">
                      <span>📹</span>
                      <p>No virtual classes scheduled for this cohort right now.</p>
                      <button
                        type="button"
                        className="explore-online-btn"
                        onClick={() => (window.location.href = '/online-learning')}
                      >
                        Browse All Academy Sessions
                      </button>
                    </div>
                  ) : (
                    <div className="parent-meetings-list">
                      {childOverview.upcomingOnlineClasses.map((m) => (
                        <div key={m.id} className="parent-meeting-item">
                          <div className="p-meeting-left">
                            <span className={`p-plat-badge ${m.platform === 'ZOOM' ? 'p-zoom' : 'p-meet'}`}>
                              {m.platform}
                            </span>
                            <div>
                              <span className="p-meeting-title">{m.title}</span>
                              <span className="p-meeting-time">
                                ⏰ {new Date(m.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • Teacher: {m.host ? `${m.host.firstName} ${m.host.lastName}` : 'Academy Staff'}
                              </span>
                            </div>
                          </div>
                          <button
                            type="button"
                            className="p-join-btn"
                            onClick={() => window.open(m.meetingUrl, '_blank')}
                          >
                            Join Live Session →
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 3. Homework & Assignments Tracking */}
                <div className="overview-card assignments-card full-width-card">
                  <div className="card-header-line">
                    <h3>📝 Student Homework & Evaluation Gradebook</h3>
                    <span className="card-badge">ACADEMIC ASSIGNMENTS</span>
                  </div>

                  {childOverview.assignments.length === 0 ? (
                    <p className="no-records-msg">No homework assignments currently posted for this class.</p>
                  ) : (
                    <div className="parent-assignments-table-wrap">
                      <table className="parent-assignments-table">
                        <thead>
                          <tr>
                            <th>Assignment Title</th>
                            <th>Subject</th>
                            <th>Due Date</th>
                            <th>Submission State</th>
                            <th>Score / Feedback</th>
                          </tr>
                        </thead>
                        <tbody>
                          {childOverview.assignments.map((a) => (
                            <tr key={a.id}>
                              <td className="table-bold">{a.title}</td>
                              <td>{a.subject?.name || 'Curriculum'}</td>
                              <td>{new Date(a.dueDate).toLocaleDateString()}</td>
                              <td>
                                {a.submitted ? (
                                  <span className="status-pill status-present">✅ SUBMITTED</span>
                                ) : (
                                  <span className="status-pill status-scheduled">⏳ PENDING</span>
                                )}
                              </td>
                              <td>
                                {a.submission?.grade !== null && a.submission?.grade !== undefined ? (
                                  <span className="grade-badge">{a.submission.grade} / {a.maxScore}</span>
                                ) : a.submitted ? (
                                  <span className="eval-pending">Under Evaluation</span>
                                ) : (
                                  <span className="unsubmitted-lbl">Not Submitted</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
