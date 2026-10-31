import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../../api/client/apiClient';
import '../pages/HRStaffManagement.css';
import '../../library/pages/LibraryManagement.css';

export default function HRStaffManagementPage() {
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('directory'); // 'directory', 'leaves', 'calculator', 'applyLeave'
  const [staff, setStaff] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [stats, setStats] = useState({
    totalStaff: 0,
    onLeaveCount: 0,
    pendingLeaveRequests: 0,
    approvedLeavesTotal: 0,
    monthlyPayrollObligation: 0
  });

  const [feedback, setFeedback] = useState(null);

  // Leave Form State
  const [leaveForm, setLeaveForm] = useState({
    staffId: '',
    staffName: '',
    staffRole: 'TEACHER',
    leaveType: 'ANNUAL',
    startDate: '',
    endDate: '',
    daysCount: 3,
    reason: 'Annual personal leave'
  });

  // Salary Calculator State
  const [calcForm, setCalcForm] = useState({
    baseStepAmount: 3200,
    qualificationRatio: 1.15,
    yearsOfService: 6,
    branchAllowance: 500,
    responsibilityAllowance: 300,
    housingTransportAllowance: 450,
    performanceBonus: 250
  });
  const [calcResult, setCalcResult] = useState(null);

  // Driver Onboarding Form State (Requirement: HR must be able to create drivers profile with personal information)
  const [driverForm, setDriverForm] = useState({
    fullName: '',
    licenseNumber: '',
    phone: '',
    residentialAddress: '',
    yearsExperience: 5,
    assignedVehicleModel: 'Toyota HiAce 18-Seater Bus',
    assignedRoute: 'Route A - Central North Corridor',
    medicalClearanceDate: new Date().toISOString().split('T')[0],
    emergencyContact: '+233-24-999-8877 (Spouse)',
    photoUrl: '/images/admin_login_bg.jpg'
  });

  const [driverProfiles, setDriverProfiles] = useState(() => {
    try {
      const stored = localStorage.getItem('gbs_driver_profiles');
      if (stored) return JSON.parse(stored);
    } catch {
      // fallback
    }
    return [
      {
        id: 1,
        fullName: 'Kwame Boateng',
        licenseNumber: 'CDL-GH-882910',
        phone: '+233-24-555-0101',
        residentialAddress: 'House 42, North Ridge Avenue, Accra',
        yearsExperience: 8,
        assignedVehicleModel: 'Toyota HiAce 18-Seater Bus',
        assignedRoute: 'Route A - Central North Corridor',
        medicalClearanceDate: '2026-01-15',
        emergencyContact: '+233-24-999-1122 (Grace Boateng - Spouse)',
        status: 'ACTIVE_CERTIFIED'
      },
      {
        id: 2,
        fullName: 'David Mensah',
        licenseNumber: 'CDL-GH-441209',
        phone: '+233-20-555-0202',
        residentialAddress: 'Plot 18, Airport Residential, Accra',
        yearsExperience: 12,
        assignedVehicleModel: 'Mercedes-Benz Sprinter 32-Seater',
        assignedRoute: 'Route B - Airport Express Corridor',
        medicalClearanceDate: '2026-02-10',
        emergencyContact: '+233-20-999-3344 (Janet Mensah - Sister)',
        status: 'ACTIVE_CERTIFIED'
      },
      {
        id: 3,
        fullName: 'Emmanuel Appiah',
        licenseNumber: 'CDL-GH-991203',
        phone: '+233-55-555-0303',
        residentialAddress: 'B24 East Legon Hills, Accra',
        yearsExperience: 6,
        assignedVehicleModel: 'Isuzu Journey 26-Seater Bus',
        assignedRoute: 'Route C - East Legon Metro Line',
        medicalClearanceDate: '2026-03-01',
        emergencyContact: '+233-55-999-5566 (Peter Appiah - Brother)',
        status: 'ACTIVE_CERTIFIED'
      }
    ];
  });

  const showToast = (message, type = 'success') => {
    setFeedback({ message, type });
    setTimeout(() => setFeedback(null), 5000);
  };

  const handleLogout = () => {
    localStorage.removeItem('gbs_token');
    localStorage.removeItem('gbs_user');
    navigate('/login/admin');
  };

  const handleCreateDriverProfile = async (e) => {
    e.preventDefault();
    if (!driverForm.fullName || !driverForm.licenseNumber || !driverForm.phone) {
      showToast('Please fill all required driver personal information fields', 'error');
      return;
    }

    try {
      // Register into transport fleet in PostgreSQL
      await apiClient.post('/transport/vehicles', {
        registrationNumber: `GBS-${Math.floor(100 + Math.random() * 900)}-26`,
        model: driverForm.assignedVehicleModel,
        capacity: 32,
        driverName: driverForm.fullName,
        driverPhone: driverForm.phone,
        assignedRouteId: 1
      });

      const newProfile = {
        id: Date.now(),
        ...driverForm,
        status: 'ACTIVE_CERTIFIED',
        createdAt: new Date().toISOString()
      };

      const updated = [newProfile, ...driverProfiles];
      setDriverProfiles(updated);
      localStorage.setItem('gbs_driver_profiles', JSON.stringify(updated));

      showToast(`Driver profile for ${driverForm.fullName} created and registered into PostgreSQL!`, 'success');

      setDriverForm({
        fullName: '',
        licenseNumber: '',
        phone: '',
        residentialAddress: '',
        yearsExperience: 5,
        assignedVehicleModel: 'Toyota HiAce 18-Seater Bus',
        assignedRoute: 'Route A - Central North Corridor',
        medicalClearanceDate: new Date().toISOString().split('T')[0],
        emergencyContact: '',
        photoUrl: '/images/admin_login_bg.jpg'
      });
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to create driver profile in database', 'error');
    }
  };

  const fetchStats = async () => {
    try {
      const res = await apiClient.get('/hr/stats');
      if (res.data?.success) setStats(res.data.data);
    } catch (err) {
      console.warn('Failed to load HR stats:', err.message);
    }
  };

  const fetchStaff = async () => {
    try {
      const res = await apiClient.get('/hr/staff');
      if (res.data?.success) {
        setStaff(res.data.data.records || []);
        if (res.data.data.records?.length > 0 && !leaveForm.staffId) {
          const first = res.data.data.records[0];
          setLeaveForm(prev => ({
            ...prev,
            staffId: String(first.id),
            staffName: first.name,
            staffRole: first.role
          }));
        }
      }
    } catch (err) {
      console.warn('Failed to load staff profiles:', err.message);
    }
  };

  const fetchLeaves = async () => {
    try {
      const res = await apiClient.get('/hr/leaves');
      if (res.data?.success) setLeaves(res.data.data.records || []);
    } catch (err) {
      console.warn('Failed to load leave requests:', err.message);
    }
  };

  useEffect(() => {
    fetchStats();
    fetchStaff();
    fetchLeaves();
  }, []);

  const handleApplyLeave = async (e) => {
    e.preventDefault();
    if (!leaveForm.staffId || !leaveForm.startDate || !leaveForm.endDate || !leaveForm.reason) {
      showToast('Please fill out all required leave fields', 'error');
      return;
    }

    try {
      const res = await apiClient.post('/hr/leaves', leaveForm);
      if (res.data?.success) {
        showToast('Leave application submitted for administrative approval!', 'success');
        setActiveTab('leaves');
        fetchLeaves();
        fetchStats();
      } else {
        showToast(res.data?.message || 'Submission failed', 'error');
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Error submitting leave application', 'error');
    }
  };

  const handleUpdateLeaveStatus = async (id, status) => {
    try {
      const res = await apiClient.patch(`/hr/leaves/${id}/status`, { status });
      if (res.data?.success) {
        showToast(res.data.message || `Leave marked ${status}`, 'success');
        fetchLeaves();
        fetchStats();
      } else {
        showToast(res.data?.message || 'Failed to update leave', 'error');
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Error updating status', 'error');
    }
  };

  const handleRunSalaryCalc = async (e) => {
    e.preventDefault();
    try {
      const res = await apiClient.post('/hr/salary-grouping/calculate', calcForm);
      if (res.data?.success) {
        setCalcResult(res.data.data);
      }
    } catch (err) {
      showToast('Error calculating salary band progression', 'error');
    }
  };

  return (
    <div className="hr-management-container">
      {/* Top Header */}
      <header className="transport-top-nav">
        <div className="nav-brand">
          <span className="nav-brand-badge" style={{ background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)' }}>
            HUMAN CAPITAL
          </span>
          <span>GBS International HR & Faculty Governance</span>
        </div>
        <div className="nav-actions" style={{ display: 'flex', gap: '8px' }}>
          <button className="btn-secondary" onClick={() => navigate(-1)}>
            ← Return / Back
          </button>
          <button className="btn-secondary" onClick={() => navigate('/portal/admin/dashboard')}>
            🏠 Cockpit
          </button>
          <button className="btn-secondary" onClick={handleLogout} style={{ borderColor: '#ef4444', color: '#f87171' }}>
            🚪 Sign Out
          </button>
        </div>
      </header>

      {/* Hero Banner with authentic photography */}
      <section
        className="hr-hero-section"
        style={{ backgroundImage: `url('/assets/hr-bg.jpg')` }}
      >
        <div className="transport-hero-overlay" />
        <div className="transport-hero-content">
          <span className="pill-badge" style={{ borderColor: 'rgba(139, 92, 246, 0.5)', color: '#c4b5fd' }}>
            ACADEMIC FACULTY & STAFF MANAGEMENT
          </span>
          <h1 className="library-hero-title">Human Resources & Staff Governance</h1>
          <p className="library-hero-desc">
            Faculty credentials, automatic long-service salary grouping and step progression, and staff leave approvals backed dynamically by PostgreSQL.
          </p>
        </div>
      </section>

      {/* Telemetry Stats Bar */}
      <div className="transport-stats-grid">
        <div className="stat-card">
          <span className="stat-label">Total Staff Headcount</span>
          <span className="stat-value">{stats.totalStaff}</span>
          <span className="stat-desc">Teachers, staff & accountants</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Currently on Leave</span>
          <span className="stat-value" style={{ color: stats.onLeaveCount > 0 ? '#fbbf24' : '#94a3b8' }}>
            {stats.onLeaveCount}
          </span>
          <span className="stat-desc">Active approved absence</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Pending Leave Requests</span>
          <span className="stat-value" style={{ color: stats.pendingLeaveRequests > 0 ? '#f87171' : '#34d399' }}>
            {stats.pendingLeaveRequests}
          </span>
          <span className="stat-desc">Awaiting HR manager review</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Approved Leaves Total</span>
          <span className="stat-value" style={{ color: '#60a5fa' }}>{stats.approvedLeavesTotal}</span>
          <span className="stat-desc">Total processed leaves</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Monthly Payroll Obligation</span>
          <span className="stat-value" style={{ color: '#34d399' }}>
            ${parseFloat(stats.monthlyPayrollObligation || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
          <span className="stat-desc">Estimated salary budget</span>
        </div>
      </div>

      {/* Main Workspace */}
      <div className="workspace-container">
        {feedback && (
          <div className={`feedback-toast feedback-${feedback.type}`}>
            {feedback.message}
          </div>
        )}

        <div className="tab-nav">
          <button
            className={`tab-btn ${activeTab === 'directory' ? 'active' : ''}`}
            onClick={() => setActiveTab('directory')}
          >
            👥 Faculty & Staff Directory ({staff.length})
          </button>
          <button
            className={`tab-btn ${activeTab === 'drivers' ? 'active' : ''}`}
            onClick={() => setActiveTab('drivers')}
            style={{ borderLeft: '3px solid #f59e0b' }}
          >
            🚖 Driver Onboarding & Profiles ({driverProfiles.length})
          </button>
          <button
            className={`tab-btn ${activeTab === 'leaves' ? 'active' : ''}`}
            onClick={() => setActiveTab('leaves')}
          >
            📋 Leave Requests ({leaves.length})
          </button>
          <button
            className={`tab-btn ${activeTab === 'calculator' ? 'active' : ''}`}
            onClick={() => setActiveTab('calculator')}
          >
            📐 Salary Grouping & Step Evaluator
          </button>
          <button
            className={`tab-btn ${activeTab === 'applyLeave' ? 'active' : ''}`}
            onClick={() => setActiveTab('applyLeave')}
          >
            ➕ Submit Leave Application
          </button>
        </div>

        {/* Tab 1: Staff Directory */}
        {activeTab === 'directory' && (
          <div className="table-card">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Employee ID</th>
                  <th>Full Name</th>
                  <th>Official Email</th>
                  <th>Institutional Role</th>
                  <th>Highest Qualification</th>
                  <th>Salary Grade & Step</th>
                  <th>Service Band</th>
                  <th>Gross Monthly Salary</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {staff.length === 0 ? (
                  <tr>
                    <td colSpan="9" style={{ textAlign: 'center', padding: '30px' }}>
                      No staff records retrieved.
                    </td>
                  </tr>
                ) : (
                  staff.map((emp) => (
                    <tr key={emp.id}>
                      <td style={{ fontFamily: 'monospace', fontWeight: 700, color: '#c4b5fd' }}>#EMP-{emp.id}</td>
                      <td style={{ fontWeight: 700 }}>{emp.name}</td>
                      <td style={{ color: '#94a3b8' }}>{emp.email}</td>
                      <td>
                        <span style={{
                          fontSize: '0.8rem',
                          fontWeight: 700,
                          padding: '3px 8px',
                          borderRadius: '4px',
                          background: emp.role === 'ADMIN' ? 'rgba(239,68,68,0.2)' : (emp.role === 'TEACHER' ? 'rgba(59,130,246,0.2)' : 'rgba(16,185,129,0.2)'),
                          color: emp.role === 'ADMIN' ? '#f87171' : (emp.role === 'TEACHER' ? '#93c5fd' : '#34d399')
                        }}>
                          {emp.role}
                        </span>
                      </td>
                      <td>🎓 {emp.qualification}</td>
                      <td>{emp.grade} (Step {emp.step})</td>
                      <td>
                        <span style={{ fontSize: '0.82rem', color: '#fbbf24', fontWeight: 600 }}>{emp.serviceBand}</span>
                      </td>
                      <td style={{ fontWeight: 700, color: '#34d399' }}>
                        ${parseFloat(emp.grossSalary || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td>
                        <span className={`status-badge ${emp.isActive ? 'status-available' : 'status-overdue'}`}>
                          {emp.isActive ? 'ACTIVE' : 'INACTIVE'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 2: Leave Requests Table */}
        {activeTab === 'leaves' && (
          <div className="table-card">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Request ID</th>
                  <th>Staff Member</th>
                  <th>Role</th>
                  <th>Leave Type</th>
                  <th>Duration (Days)</th>
                  <th>Date Range</th>
                  <th>Reason</th>
                  <th>Status</th>
                  <th>Manager Action</th>
                </tr>
              </thead>
              <tbody>
                {leaves.length === 0 ? (
                  <tr>
                    <td colSpan="9" style={{ textAlign: 'center', padding: '30px' }}>
                      No staff leave applications recorded yet.
                    </td>
                  </tr>
                ) : (
                  leaves.map((l) => (
                    <tr key={l.id}>
                      <td style={{ fontFamily: 'monospace' }}>#LV-{l.id}</td>
                      <td style={{ fontWeight: 700 }}>{l.staff_name}</td>
                      <td>{l.staff_role}</td>
                      <td>
                        <span style={{ background: 'rgba(255,255,255,0.08)', padding: '2px 8px', borderRadius: '4px', fontSize: '0.8rem' }}>
                          {l.leave_type}
                        </span>
                      </td>
                      <td style={{ fontWeight: 700 }}>{l.days_count} Days</td>
                      <td style={{ fontSize: '0.85rem' }}>
                        {new Date(l.start_date).toLocaleDateString()} to {new Date(l.end_date).toLocaleDateString()}
                      </td>
                      <td>{l.reason}</td>
                      <td>
                        <span className={`status-badge ${l.status === 'APPROVED' ? 'status-available' : (l.status === 'PENDING' ? 'status-borrowed' : 'status-overdue')}`}>
                          {l.status}
                        </span>
                      </td>
                      <td>
                        {l.status === 'PENDING' ? (
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button
                              className="action-btn-sm"
                              style={{ background: 'rgba(16, 185, 129, 0.2)', color: '#34d399', borderColor: '#10b981' }}
                              onClick={() => handleUpdateLeaveStatus(l.id, 'APPROVED')}
                            >
                              ✓ Approve
                            </button>
                            <button
                              className="action-btn-danger"
                              onClick={() => handleUpdateLeaveStatus(l.id, 'REJECTED')}
                            >
                              ✕ Reject
                            </button>
                          </div>
                        ) : (
                          <span style={{ fontSize: '0.8rem', color: l.status === 'APPROVED' ? '#10b981' : '#f87171' }}>
                            {l.status === 'APPROVED' ? '✓ Granted' : '✕ Rejected'}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 3: Salary Grouping Evaluator */}
        {activeTab === 'calculator' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
            <div className="form-card">
              <h3 style={{ margin: '0 0 20px 0', color: '#ffffff' }}>Salary Progression & Service Band Evaluator</h3>
              <form onSubmit={handleRunSalaryCalc}>
                <div className="form-group">
                  <label className="form-label">Base Step Amount (USD)</label>
                  <input
                    type="number"
                    className="form-control"
                    value={calcForm.baseStepAmount}
                    onChange={(e) => setCalcForm({ ...calcForm, baseStepAmount: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Qualification Multiplier</label>
                  <select
                    className="form-control"
                    value={calcForm.qualificationRatio}
                    onChange={(e) => setCalcForm({ ...calcForm, qualificationRatio: parseFloat(e.target.value) })}
                  >
                    <option value={1.0}>Bachelor's Degree (1.0x)</option>
                    <option value={1.15}>Master's Degree (1.15x)</option>
                    <option value={1.30}>Doctorate / Ph.D. (1.30x)</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Years of Service (Determines Band)</label>
                  <input
                    type="number"
                    step="0.5"
                    className="form-control"
                    value={calcForm.yearsOfService}
                    onChange={(e) => setCalcForm({ ...calcForm, yearsOfService: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Branch & Station Allowance</label>
                  <input
                    type="number"
                    className="form-control"
                    value={calcForm.branchAllowance}
                    onChange={(e) => setCalcForm({ ...calcForm, branchAllowance: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Responsibility / Department Head Allowance</label>
                  <input
                    type="number"
                    className="form-control"
                    value={calcForm.responsibilityAllowance}
                    onChange={(e) => setCalcForm({ ...calcForm, responsibilityAllowance: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <button type="submit" className="btn-primary" style={{ width: '100%', marginTop: '12px' }}>
                  ⚡ Compute Gross Salary Breakdown
                </button>
              </form>
            </div>

            {calcResult && (
              <div className="salary-calc-box">
                <h3 style={{ margin: '0 0 16px 0', color: '#34d399' }}>Evaluated Gross Compensation</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '8px' }}>
                    <span style={{ color: '#94a3b8' }}>Adjusted Academic Base:</span>
                    <span style={{ fontWeight: 700 }}>${calcResult.adjustedBase.toFixed(2)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '8px' }}>
                    <span style={{ color: '#94a3b8' }}>Service Band:</span>
                    <span style={{ fontWeight: 700, color: '#fbbf24' }}>{calcResult.serviceBand?.bandName}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '8px' }}>
                    <span style={{ color: '#94a3b8' }}>Band Long-Service Bonus:</span>
                    <span style={{ fontWeight: 700, color: '#60a5fa' }}>+${calcResult.serviceBand?.bonusAllowance?.toFixed(2)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '8px' }}>
                    <span style={{ color: '#94a3b8' }}>Total Allowances:</span>
                    <span style={{ fontWeight: 700 }}>+${calcResult.totalAllowances.toFixed(2)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '10px' }}>
                    <span style={{ fontSize: '1.1rem', fontWeight: 700, color: '#ffffff' }}>Computed Gross Salary:</span>
                    <span style={{ fontSize: '1.4rem', fontWeight: 800, color: '#34d399' }}>
                      ${calcResult.grossSalary.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 4: Apply for Leave */}
        {activeTab === 'applyLeave' && (
          <div className="form-card">
            <h3 style={{ margin: '0 0 20px 0', color: '#ffffff' }}>Submit Staff Leave Application</h3>
            <form onSubmit={handleApplyLeave}>
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Staff Member *</label>
                  <select
                    className="form-control"
                    value={leaveForm.staffId}
                    onChange={(e) => {
                      const sel = staff.find(s => String(s.id) === e.target.value);
                      setLeaveForm({
                        ...leaveForm,
                        staffId: e.target.value,
                        staffName: sel?.name || '',
                        staffRole: sel?.role || 'STAFF'
                      });
                    }}
                    required
                  >
                    {staff.map(s => (
                      <option key={s.id} value={s.id}>{s.name} ({s.role})</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Leave Category</label>
                  <select
                    className="form-control"
                    value={leaveForm.leaveType}
                    onChange={(e) => setLeaveForm({ ...leaveForm, leaveType: e.target.value })}
                  >
                    <option value="ANNUAL">Annual Paid Leave</option>
                    <option value="SICK">Medical / Sick Leave</option>
                    <option value="MATERNITY">Maternity / Parental Leave</option>
                    <option value="EMERGENCY">Family Emergency Leave</option>
                    <option value="CASUAL">Casual Professional Day</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Start Date *</label>
                  <input
                    type="date"
                    className="form-control"
                    value={leaveForm.startDate}
                    onChange={(e) => setLeaveForm({ ...leaveForm, startDate: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">End Date *</label>
                  <input
                    type="date"
                    className="form-control"
                    value={leaveForm.endDate}
                    onChange={(e) => setLeaveForm({ ...leaveForm, endDate: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Working Days Count</label>
                  <input
                    type="number"
                    min="1"
                    className="form-control"
                    value={leaveForm.daysCount}
                    onChange={(e) => setLeaveForm({ ...leaveForm, daysCount: parseInt(e.target.value, 10) || 1 })}
                  />
                </div>
                <div className="form-group full-width">
                  <label className="form-label">Reason & Justification *</label>
                  <textarea
                    rows={3}
                    className="form-control"
                    placeholder="Provide context for academic cover arrangements and date justification..."
                    value={leaveForm.reason}
                    onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div style={{ marginTop: '20px', display: 'flex', gap: '12px' }}>
                <button type="submit" className="btn-primary">
                  📋 Submit Application for Approval
                </button>
                <button type="button" className="btn-secondary" onClick={() => setActiveTab('leaves')}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Tab 5: Driver Profiles & Fleet Onboarding (Requirement: HR must be able to create drivers profile with personal info) */}
        {activeTab === 'drivers' && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '20px', marginBottom: '24px' }}>
              {/* Left: Driver Onboarding Form */}
              <div className="table-card" style={{ padding: '24px' }}>
                <h3 style={{ margin: '0 0 8px 0', color: '#fbbf24', fontSize: '1.15rem' }}>
                  🚖 Onboard New Fleet Driver Profile
                </h3>
                <p style={{ margin: '0 0 16px 0', fontSize: '0.85rem', color: '#94a3b8' }}>
                  HR registers driver personal details, verifies heavy-duty CDL credentials, and connects to fleet vehicles.
                </p>

                <form onSubmit={handleCreateDriverProfile}>
                  <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
                    <div className="form-group full-width">
                      <label className="form-label">Driver Full Name *</label>
                      <input
                        type="text"
                        className="form-control"
                        required
                        placeholder="e.g. Samuel K. Mensah"
                        value={driverForm.fullName}
                        onChange={(e) => setDriverForm({ ...driverForm, fullName: e.target.value })}
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Driver License # (CDL) *</label>
                      <input
                        type="text"
                        className="form-control"
                        required
                        placeholder="e.g. CDL-GH-554210"
                        value={driverForm.licenseNumber}
                        onChange={(e) => setDriverForm({ ...driverForm, licenseNumber: e.target.value })}
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Mobile Phone Contact *</label>
                      <input
                        type="tel"
                        className="form-control"
                        required
                        placeholder="e.g. +233-24-111-2233"
                        value={driverForm.phone}
                        onChange={(e) => setDriverForm({ ...driverForm, phone: e.target.value })}
                      />
                    </div>

                    <div className="form-group full-width">
                      <label className="form-label">Residential Address</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="e.g. Plot 14, Ringway Estates, Accra"
                        value={driverForm.residentialAddress}
                        onChange={(e) => setDriverForm({ ...driverForm, residentialAddress: e.target.value })}
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Commercial Experience</label>
                      <select
                        className="form-control"
                        value={driverForm.yearsExperience}
                        onChange={(e) => setDriverForm({ ...driverForm, yearsExperience: parseInt(e.target.value, 10) || 1 })}
                      >
                        <option value={3}>3+ Years Professional</option>
                        <option value={5}>5+ Years Professional</option>
                        <option value={8}>8+ Years Senior Driver</option>
                        <option value={12}>12+ Years Master Driver</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Medical Clearance Date</label>
                      <input
                        type="date"
                        className="form-control"
                        value={driverForm.medicalClearanceDate}
                        onChange={(e) => setDriverForm({ ...driverForm, medicalClearanceDate: e.target.value })}
                      />
                    </div>

                    <div className="form-group full-width">
                      <label className="form-label">Assigned Vehicle Model</label>
                      <select
                        className="form-control"
                        value={driverForm.assignedVehicleModel}
                        onChange={(e) => setDriverForm({ ...driverForm, assignedVehicleModel: e.target.value })}
                      >
                        <option value="Toyota HiAce 18-Seater Bus">Toyota HiAce 18-Seater Bus</option>
                        <option value="Mercedes-Benz Sprinter 32-Seater">Mercedes-Benz Sprinter 32-Seater</option>
                        <option value="Isuzu Journey 26-Seater Bus">Isuzu Journey 26-Seater Bus</option>
                        <option value="Hyundai County 30-Seater Coach">Hyundai County 30-Seater Coach</option>
                      </select>
                    </div>

                    <div className="form-group full-width">
                      <label className="form-label">Emergency Next-of-Kin Contact</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="e.g. +233-20-111-4455 (Abigail Mensah - Spouse)"
                        value={driverForm.emergencyContact}
                        onChange={(e) => setDriverForm({ ...driverForm, emergencyContact: e.target.value })}
                      />
                    </div>
                  </div>

                  <button type="submit" className="btn-primary" style={{ width: '100%', marginTop: '16px' }}>
                    🚀 Commit Driver Profile & Provision Vehicle to PostgreSQL
                  </button>
                </form>
              </div>

              {/* Right: Driver Profiles Directory */}
              <div>
                <h3 style={{ margin: '0 0 12px 0', color: '#f8fafc', fontSize: '1.15rem' }}>
                  🚌 Verified School Transport Drivers ({driverProfiles.length})
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {driverProfiles.map((driver) => (
                    <div 
                      key={driver.id} 
                      className="table-card"
                      style={{ padding: '16px', display: 'flex', gap: '16px', alignItems: 'center', border: '1px solid rgba(255,255,255,0.08)' }}
                    >
                      <img 
                        src="/images/admin_login_bg.jpg" 
                        alt={driver.fullName} 
                        style={{ width: '64px', height: '64px', borderRadius: '10px', objectFit: 'cover', border: '2px solid #fbbf24' }} 
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <h4 style={{ margin: 0, color: '#f8fafc', fontSize: '1rem' }}>{driver.fullName}</h4>
                          <span className="status-badge status-available" style={{ fontSize: '0.72rem' }}>
                            {driver.status || 'CERTIFIED'}
                          </span>
                        </div>
                        <div style={{ display: 'flex', gap: '12px', fontSize: '0.8rem', color: '#94a3b8', marginTop: '4px', flexWrap: 'wrap' }}>
                          <span>🪪 License: <strong style={{ color: '#38bdf8', fontFamily: 'monospace' }}>{driver.licenseNumber}</strong></span>
                          <span>📞 <a href={`tel:${driver.phone}`} style={{ color: '#34d399', textDecoration: 'none' }}>{driver.phone}</a></span>
                          <span>⏳ {driver.yearsExperience} Yrs Exp</span>
                        </div>
                        <div style={{ fontSize: '0.8rem', color: '#cbd5e1', marginTop: '4px' }}>
                          🚐 <strong>Assigned Fleet:</strong> {driver.assignedVehicleModel} • {driver.assignedRoute}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '2px' }}>
                          📍 Residence: {driver.residentialAddress} • Medical: Cleared ({driver.medicalClearanceDate})
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
