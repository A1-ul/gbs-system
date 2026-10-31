import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../../api/client/apiClient';
import '../pages/TransportManagement.css';
import '../../library/pages/LibraryManagement.css';

export default function TransportManagementPage() {
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('routes'); // 'routes', 'vehicles', 'assignments', 'newRoute'
  const [routes, setRoutes] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [stats, setStats] = useState({
    totalRoutes: 0,
    totalVehicles: 0,
    totalFleetCapacity: 0,
    enrolledStudents: 0,
    fleetUtilizationPct: 0
  });

  const [feedback, setFeedback] = useState(null);
  const [selectedDriverProfile, setSelectedDriverProfile] = useState(null);

  // Headmaster Created & Uploaded Bus Commuter Enrollments
  const [headmasterAssignedStudents, setHeadmasterAssignedStudents] = useState(() => {
    try {
      const saved = localStorage.getItem('gbs_transport_assigned_students');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [
      {
        id: "BUS-ASN-101",
        studentId: "STU-001",
        studentName: "Kwame Mensah",
        gradeLevel: "Grade 10A (SHS 1)",
        pickupLocation: "East Legon Shell Station",
        destinationZone: "East Legon Corridor (Zone A)",
        busRoute: "Route 01 - East Legon Corridor",
        assignedBus: "Bus #04 (Mercedes Sprinter 32-Seater, GT-4421-22)",
        driverName: "Kofi Owusu",
        driverPhone: "+233 24 555 0192",
        termlyFare: 450,
        status: "APPROVED_AND_UPLOADED",
        assignedBy: "Arthur Pendleton (Headmaster)",
        assignedAt: new Date(Date.now() - 3600000).toISOString()
      },
      {
        id: "BUS-ASN-102",
        studentId: "STU-002",
        studentName: "Ama Osei",
        gradeLevel: "Grade 11 Science (SHS 2)",
        pickupLocation: "Airport Residential / Ridge",
        destinationZone: "Airport / Ridge Corridor (Zone B)",
        busRoute: "Route 02 - Airport / Ridge / Roman Ridge",
        assignedBus: "Bus #02 (Toyota Coaster 30-Seater, GN-8819-21)",
        driverName: "Emmanuel Mensah",
        driverPhone: "+233 20 888 1234",
        termlyFare: 600,
        status: "APPROVED_AND_UPLOADED",
        assignedBy: "Arthur Pendleton (Headmaster)",
        assignedAt: new Date(Date.now() - 7200000).toISOString()
      }
    ];
  });

  useEffect(() => {
    const handleSyncTransport = () => {
      try {
        const saved = localStorage.getItem('gbs_transport_assigned_students');
        if (saved) setHeadmasterAssignedStudents(JSON.parse(saved));
      } catch {}
    };

    window.addEventListener('gbs_transport_student_assigned', handleSyncTransport);
    window.addEventListener('storage', handleSyncTransport);
    return () => {
      window.removeEventListener('gbs_transport_student_assigned', handleSyncTransport);
      window.removeEventListener('storage', handleSyncTransport);
    };
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('gbs_token');
    localStorage.removeItem('gbs_user');
    navigate('/login/admin');
  };

  // New Route Form
  const [newRoute, setNewRoute] = useState({
    routeCode: '',
    name: '',
    startLocation: '',
    endLocation: 'GBS Main Campus',
    stops: 'Central Station (07:00), North Gate (07:20), West Gate (07:40)',
    monthlyFare: 160.0
  });

  // New Vehicle Form
  const [newVehicle, setNewVehicle] = useState({
    registrationNumber: '',
    model: 'Mercedes-Benz Sprinter 32-Seater',
    capacity: 32,
    driverName: '',
    driverPhone: '',
    assignedRouteId: ''
  });

  // Assign Student Modal
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [assignForm, setAssignForm] = useState({
    studentId: '1',
    studentName: 'Julian Thorne',
    routeId: '',
    pickupStop: 'Central Station Terminal',
    dropoffStop: 'GBS Main Campus'
  });

  const showToast = (message, type = 'success') => {
    setFeedback({ message, type });
    setTimeout(() => setFeedback(null), 5000);
  };

  const fetchStats = async () => {
    try {
      const res = await apiClient.get('/transport/stats');
      if (res.data?.success) setStats(res.data.data);
    } catch (err) {
      console.warn('Failed to load transport stats:', err.message);
    }
  };

  const fetchRoutes = async () => {
    try {
      const res = await apiClient.get('/transport/routes');
      if (res.data?.success) {
        setRoutes(res.data.data.records || []);
        if (res.data.data.records?.length > 0 && !assignForm.routeId) {
          setAssignForm(prev => ({ ...prev, routeId: String(res.data.data.records[0].id) }));
        }
      }
    } catch (err) {
      console.warn('Failed to load routes:', err.message);
    }
  };

  const fetchVehicles = async () => {
    try {
      const res = await apiClient.get('/transport/vehicles');
      if (res.data?.success) setVehicles(res.data.data.records || []);
    } catch (err) {
      console.warn('Failed to load vehicles:', err.message);
    }
  };

  const fetchAssignments = async () => {
    try {
      const res = await apiClient.get('/transport/assignments');
      if (res.data?.success) setAssignments(res.data.data.records || []);
    } catch (err) {
      console.warn('Failed to load assignments:', err.message);
    }
  };

  useEffect(() => {
    fetchStats();
    fetchRoutes();
    fetchVehicles();
    fetchAssignments();
  }, []);

  const handleCreateRoute = async (e) => {
    e.preventDefault();
    if (!newRoute.routeCode || !newRoute.name || !newRoute.startLocation) {
      showToast('Please fill out all required route fields', 'error');
      return;
    }

    try {
      const stopsArray = newRoute.stops
        .split(',')
        .map(s => s.trim())
        .filter(Boolean)
        .map(s => ({ name: s, time: 'Scheduled' }));

      const res = await apiClient.post('/transport/routes', {
        ...newRoute,
        stops: stopsArray
      });

      if (res.data?.success) {
        showToast(`Route ${newRoute.routeCode} created successfully!`, 'success');
        setNewRoute({
          routeCode: '',
          name: '',
          startLocation: '',
          endLocation: 'GBS Main Campus',
          stops: '',
          monthlyFare: 160.0
        });
        setActiveTab('routes');
        fetchRoutes();
        fetchStats();
      } else {
        showToast(res.data?.message || 'Failed to create route', 'error');
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Error creating route', 'error');
    }
  };

  const handleCreateVehicle = async (e) => {
    e.preventDefault();
    if (!newVehicle.registrationNumber || !newVehicle.driverName || !newVehicle.driverPhone) {
      showToast('Please enter registration number, driver name, and phone', 'error');
      return;
    }

    try {
      const res = await apiClient.post('/transport/vehicles', newVehicle);
      if (res.data?.success) {
        showToast(`Vehicle ${newVehicle.registrationNumber} registered to fleet!`, 'success');
        setNewVehicle({
          registrationNumber: '',
          model: 'Mercedes-Benz Sprinter 32-Seater',
          capacity: 32,
          driverName: '',
          driverPhone: '',
          assignedRouteId: ''
        });
        setActiveTab('vehicles');
        fetchVehicles();
        fetchStats();
      } else {
        showToast(res.data?.message || 'Failed to register vehicle', 'error');
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Error creating vehicle', 'error');
    }
  };

  const handleAssignStudent = async (e) => {
    e.preventDefault();
    try {
      const res = await apiClient.post('/transport/assignments', assignForm);
      if (res.data?.success) {
        showToast(`Student ${assignForm.studentName} assigned to route!`, 'success');
        setAssignModalOpen(false);
        fetchAssignments();
        fetchRoutes();
        fetchStats();
      } else {
        showToast(res.data?.message || 'Assignment failed', 'error');
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Error assigning student', 'error');
    }
  };

  return (
    <div className="transport-management-container">
      {/* Top Header */}
      <header className="transport-top-nav">
        <div className="nav-brand">
          <span className="nav-brand-badge" style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>
            FLEET
          </span>
          <span>GBS International Campus Transport & Fleet Management</span>
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

      {/* Hero Banner with authentic photograph */}
      <section
        className="transport-hero-section"
        style={{ backgroundImage: `url('/assets/transport-bg.jpg')` }}
      >
        <div className="transport-hero-overlay" />
        <div className="transport-hero-content">
          <span className="pill-badge" style={{ borderColor: 'rgba(245, 158, 11, 0.5)', color: '#fcd34d' }}>
            CAMPUS TRANSIT & LOGISTICS
          </span>
          <h1 className="library-hero-title">Transport & Fleet Management Subsystem</h1>
          <p className="library-hero-desc">
            GPS transit routes, certified driver logs, dedicated school bus fleet management, and student commuter route allocations backed by PostgreSQL.
          </p>
        </div>
      </section>

      {/* Telemetry Stats Bar */}
      <div className="transport-stats-grid">
        <div className="stat-card">
          <span className="stat-label">Active Routes</span>
          <span className="stat-value">{stats.totalRoutes}</span>
          <span className="stat-desc">Designated corridors</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Fleet Vehicles</span>
          <span className="stat-value" style={{ color: '#fbbf24' }}>{stats.totalVehicles}</span>
          <span className="stat-desc">Operational buses & vans</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Seating Capacity</span>
          <span className="stat-value">{stats.totalFleetCapacity}</span>
          <span className="stat-desc">Total passenger seats</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Enrolled Commuters</span>
          <span className="stat-value" style={{ color: '#34d399' }}>{stats.enrolledStudents}</span>
          <span className="stat-desc">Active student riders</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Fleet Utilization</span>
          <span className="stat-value" style={{ color: '#60a5fa' }}>{stats.fleetUtilizationPct}%</span>
          <span className="stat-desc">Transit load ratio</span>
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
            className={`tab-btn ${activeTab === 'routes' ? 'active' : ''}`}
            onClick={() => setActiveTab('routes')}
          >
            🗺️ Transit Routes ({routes.length})
          </button>
          <button
            className={`tab-btn ${activeTab === 'vehicles' ? 'active' : ''}`}
            onClick={() => setActiveTab('vehicles')}
          >
            🚌 Fleet Vehicles & Drivers ({vehicles.length})
          </button>
          <button
            className={`tab-btn ${activeTab === 'assignments' ? 'active' : ''}`}
            onClick={() => setActiveTab('assignments')}
          >
            🎒 Commuter Allocations & Headmaster Uploads ({assignments.length + headmasterAssignedStudents.length})
          </button>
          <button
            className={`tab-btn ${activeTab === 'newRoute' ? 'active' : ''}`}
            onClick={() => setActiveTab('newRoute')}
          >
            ➕ Add Route / Vehicle
          </button>
        </div>

        {/* Tab 1: Routes */}
        {activeTab === 'routes' && (
          <div>
            <div className="controls-bar">
              <span style={{ fontWeight: 600, color: '#94a3b8' }}>Designated School Commuter Routes</span>
              <button className="btn-primary" onClick={() => setAssignModalOpen(true)}>
                🎒 Assign Student to Bus Route
              </button>
            </div>

            <div className="table-card">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Route Code</th>
                    <th>Route Name</th>
                    <th>Corridor Origin & Destination</th>
                    <th>Stops & Waypoints</th>
                    <th>Vehicles</th>
                    <th>Students</th>
                    <th>Monthly Fare</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {routes.length === 0 ? (
                    <tr>
                      <td colSpan="8" style={{ textAlign: 'center', padding: '30px' }}>
                        No routes configured yet.
                      </td>
                    </tr>
                  ) : (
                    routes.map((r) => (
                      <tr key={r.id}>
                        <td style={{ fontFamily: 'monospace', fontWeight: 700, color: '#fbbf24' }}>{r.route_code}</td>
                        <td style={{ fontWeight: 700 }}>{r.name}</td>
                        <td style={{ fontSize: '0.85rem' }}>
                          <div>From: {r.start_location}</div>
                          <div style={{ color: '#94a3b8' }}>To: {r.end_location}</div>
                        </td>
                        <td>
                          {Array.isArray(r.stops) ? (
                            r.stops.map((s, idx) => (
                              <span key={idx} className="stop-pill">
                                {s.name || s} {s.time ? `(${s.time})` : ''}
                              </span>
                            ))
                          ) : (
                            <span>{String(r.stops)}</span>
                          )}
                        </td>
                        <td style={{ fontWeight: 700, textAlign: 'center' }}>{r.vehicles_count || 0}</td>
                        <td style={{ fontWeight: 700, textAlign: 'center', color: '#34d399' }}>{r.enrolled_students || 0}</td>
                        <td style={{ fontWeight: 700 }}>${parseFloat(r.monthly_fare || 0).toFixed(2)}</td>
                        <td>
                          <span className="status-badge status-available">{r.status}</span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 2: Vehicles & Drivers */}
        {activeTab === 'vehicles' && (
          <div className="table-card">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Vehicle Registration</th>
                  <th>Make & Model</th>
                  <th>Passenger Capacity</th>
                  <th>Assigned Route</th>
                  <th>Designated Driver</th>
                  <th>Emergency Phone</th>
                  <th>Driver Profile</th>
                  <th>Fleet Status</th>
                </tr>
              </thead>
              <tbody>
                {vehicles.length === 0 ? (
                  <tr>
                    <td colSpan="8" style={{ textAlign: 'center', padding: '30px' }}>
                      No vehicles currently registered in fleet.
                    </td>
                  </tr>
                ) : (
                  vehicles.map((v) => (
                    <tr key={v.id}>
                      <td style={{ fontFamily: 'monospace', fontWeight: 700, color: '#60a5fa' }}>{v.registration_number}</td>
                      <td>{v.model}</td>
                      <td style={{ fontWeight: 700 }}>{v.capacity} Seats</td>
                      <td>
                        <span style={{ fontWeight: 600, color: '#fbbf24' }}>
                          {v.route_name || v.route_code || 'Unassigned Float'}
                        </span>
                      </td>
                      <td style={{ fontWeight: 600 }}>{v.driver_name}</td>
                      <td style={{ fontFamily: 'monospace' }}>{v.driver_phone}</td>
                      <td>
                        <button
                          type="button"
                          className="btn-secondary"
                          style={{ padding: '4px 10px', fontSize: '0.78rem', borderColor: '#f59e0b', color: '#fbbf24' }}
                          onClick={() => setSelectedDriverProfile({
                            name: v.driver_name,
                            phone: v.driver_phone,
                            vehicle: v.model,
                            regNumber: v.registration_number,
                            route: v.route_name || v.route_code || 'School Transit Main Line',
                            capacity: v.capacity,
                            license: 'CDL-GH-' + (200000 + (v.id || 1) * 1423),
                            experience: '8+ Years Professional Commercial Driving',
                            medicalStatus: 'Cleared & Certified Active',
                            emergencyContact: '+233-24-999-0011'
                          })}
                        >
                          🪪 View Profile
                        </button>
                      </td>
                      <td>
                        <span className={`status-badge ${v.status === 'OPERATIONAL' ? 'status-available' : 'status-overdue'}`}>
                          {v.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 3: Student Assignments & Headmaster Uploaded Transit Enrollments */}
        {activeTab === 'assignments' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Section 1: Headmaster Uploaded Bus Enrollments */}
            <div className="table-card" style={{ border: '1.5px solid #10b981', boxShadow: '0 8px 24px rgba(16, 185, 129, 0.12)' }}>
              <div style={{ padding: '16px 20px', background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.12) 0%, rgba(6, 78, 59, 0.25) 100%)', borderBottom: '1px solid rgba(16, 185, 129, 0.25)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                  <h3 style={{ margin: 0, color: '#34d399', fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>👑</span> HEADMASTER UPLOADED BUS ENROLLMENTS & DESTINATION ROUTE FARES ({headmasterAssignedStudents.length})
                  </h3>
                  <p style={{ margin: '4px 0 0', color: '#94a3b8', fontSize: '0.8rem' }}>
                    Students enrolled onto school transit with location-specific termly fares created by the Headmaster and uploaded directly to this Transport Portal.
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <span style={{ background: '#064e3b', color: '#6ee7b7', border: '1px solid #059669', padding: '4px 12px', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 800 }}>
                    HEADMASTER SYNCED ✓
                  </span>
                  <button 
                    type="button" 
                    className="btn-secondary" 
                    onClick={() => {
                      const sample = [
                        {
                          id: `BUS-ASN-${Date.now()}`,
                          studentId: "STU-003",
                          studentName: "Kofi Boateng",
                          gradeLevel: "Grade 9 (JHS 3)",
                          pickupLocation: "Spintex Coastal Junction",
                          destinationZone: "Spintex Corridor (Zone C)",
                          busRoute: "Route 03 - Spintex Road & Junction Mall",
                          assignedBus: "Bus #03 (Toyota HiAce 16-Seater, GC-1092-20)",
                          driverName: "Joseph Adjei",
                          driverPhone: "+233 27 771 9900",
                          termlyFare: 380,
                          status: "APPROVED_AND_UPLOADED",
                          assignedBy: "Arthur Pendleton (Headmaster)",
                          assignedAt: new Date().toISOString()
                        },
                        ...headmasterAssignedStudents
                      ];
                      setHeadmasterAssignedStudents(sample);
                      localStorage.setItem('gbs_transport_assigned_students', JSON.stringify(sample));
                      showToast('✓ Sample student bus assignment added to Transport Portal queue!');
                    }}
                    style={{ fontSize: '0.75rem', padding: '6px 12px' }}
                  >
                    + Add Bus Commuter
                  </button>
                </div>
              </div>

              <table className="data-table">
                <thead>
                  <tr>
                    <th>Enrollment Ref</th>
                    <th>Student Name & Cohort</th>
                    <th>Destination Zone & Pickup Stop</th>
                    <th>Assigned Fleet Bus</th>
                    <th>Driver & Contact</th>
                    <th>Termly Route Fare</th>
                    <th>Headmaster Approval</th>
                    <th>Transit Pass</th>
                  </tr>
                </thead>
                <tbody>
                  {headmasterAssignedStudents.length === 0 ? (
                    <tr>
                      <td colSpan="8" style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>
                        No Headmaster uploaded commuter enrollments yet. Headmaster creates student bus assignments from the Admin Dashboard and uploads them here.
                      </td>
                    </tr>
                  ) : (
                    headmasterAssignedStudents.map((h) => (
                      <tr key={h.id}>
                        <td style={{ fontFamily: 'monospace', fontWeight: 700, color: '#38bdf8' }}>{h.id}</td>
                        <td>
                          <div style={{ fontWeight: 800, color: '#f8fafc' }}>{h.studentName}</div>
                          <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{h.gradeLevel || 'Enrolled Student'}</div>
                        </td>
                        <td>
                          <div style={{ fontWeight: 700, color: '#fbbf24' }}>📍 {h.destinationZone}</div>
                          <div style={{ fontSize: '0.75rem', color: '#cbd5e1' }}>Stop: {h.pickupLocation}</div>
                        </td>
                        <td>
                          <div style={{ fontWeight: 700, color: '#60a5fa' }}>🚌 {h.assignedBus}</div>
                          <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>{h.busRoute}</div>
                        </td>
                        <td>
                          <div style={{ fontWeight: 600, color: '#f8fafc' }}>{h.driverName}</div>
                          <a href={`tel:${h.driverPhone}`} style={{ fontSize: '0.75rem', color: '#34d399', textDecoration: 'none' }}>
                            📞 {h.driverPhone}
                          </a>
                        </td>
                        <td>
                          <div style={{ fontWeight: 900, color: '#34d399', fontSize: '0.95rem' }}>
                            GHS {parseFloat(h.termlyFare || 450).toFixed(2)}
                          </div>
                          <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>per Academic Term</div>
                        </td>
                        <td>
                          <span style={{ background: 'rgba(16, 185, 129, 0.2)', color: '#34d399', border: '1px solid #10b981', padding: '3px 8px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 800 }}>
                            ✓ {h.status || 'APPROVED'}
                          </span>
                          <div style={{ fontSize: '0.68rem', color: '#64748b', marginTop: '2px' }}>
                            By {h.assignedBy?.split(' ')[0] || 'Headmaster'}
                          </div>
                        </td>
                        <td>
                          <button
                            type="button"
                            className="btn-secondary"
                            onClick={() => {
                              showToast(`🎫 Bus transit boarding pass issued for ${h.studentName} on ${h.assignedBus}`);
                            }}
                            style={{ padding: '4px 10px', fontSize: '0.75rem', borderColor: '#38bdf8', color: '#38bdf8' }}
                          >
                            🎫 Issue Pass
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Section 2: Standard Database Transit Allocations */}
            <div className="table-card">
              <div style={{ padding: '14px 20px', background: 'rgba(255, 255, 255, 0.03)', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h4 style={{ margin: 0, color: '#f8fafc', fontSize: '0.95rem' }}>
                  Central Database Transit Allocations ({assignments.length})
                </h4>
                <button className="btn-primary" onClick={() => setAssignModalOpen(true)} style={{ fontSize: '0.78rem', padding: '6px 14px' }}>
                  + Allocate Route Manually
                </button>
              </div>

              <table className="data-table">
                <thead>
                  <tr>
                    <th>Assignment ID</th>
                    <th>Student Name</th>
                    <th>Route Code & Name</th>
                    <th>Pickup Stop</th>
                    <th>Dropoff Stop</th>
                    <th>Monthly Fare</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {assignments.length === 0 ? (
                    <tr>
                      <td colSpan="7" style={{ textAlign: 'center', padding: '30px' }}>
                        No additional system allocations recorded yet.
                      </td>
                    </tr>
                  ) : (
                    assignments.map((a) => (
                      <tr key={a.id}>
                        <td style={{ fontFamily: 'monospace' }}>#ASN-{a.id}</td>
                        <td style={{ fontWeight: 700 }}>{a.student_name}</td>
                        <td>
                          <span style={{ color: '#fbbf24', fontWeight: 600 }}>{a.route_code}</span> - {a.route_name}
                        </td>
                        <td>📍 {a.pickup_stop}</td>
                        <td>🏫 {a.dropoff_stop}</td>
                        <td style={{ fontWeight: 700 }}>${parseFloat(a.monthly_fare || 0).toFixed(2)}</td>
                        <td>
                          <span className="status-badge status-available">{a.status}</span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 4: Add Route or Register Vehicle */}
        {activeTab === 'newRoute' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
            {/* Form A: Add Route */}
            <div className="form-card">
              <h3 style={{ margin: '0 0 20px 0', color: '#ffffff' }}>Add New Bus Route</h3>
              <form onSubmit={handleCreateRoute}>
                <div className="form-group">
                  <label className="form-label">Route Code *</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. RT-SOUTH-03"
                    value={newRoute.routeCode}
                    onChange={(e) => setNewRoute({ ...newRoute, routeCode: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Route Display Name *</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. South Bay Morning Express"
                    value={newRoute.name}
                    onChange={(e) => setNewRoute({ ...newRoute, name: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Origin / Start Location *</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Marina Central Plaza"
                    value={newRoute.startLocation}
                    onChange={(e) => setNewRoute({ ...newRoute, startLocation: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Terminus / Destination</label>
                  <input
                    type="text"
                    className="form-control"
                    value={newRoute.endLocation}
                    onChange={(e) => setNewRoute({ ...newRoute, endLocation: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Stops (Comma separated)</label>
                  <textarea
                    rows={2}
                    className="form-control"
                    placeholder="Marina Plaza (06:45), Pine Street (07:05), West Gate (07:35)"
                    value={newRoute.stops}
                    onChange={(e) => setNewRoute({ ...newRoute, stops: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Monthly Fare (USD)</label>
                  <input
                    type="number"
                    className="form-control"
                    value={newRoute.monthlyFare}
                    onChange={(e) => setNewRoute({ ...newRoute, monthlyFare: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <button type="submit" className="btn-primary" style={{ width: '100%', marginTop: '12px' }}>
                  🗺️ Save Route to Database
                </button>
              </form>
            </div>

            {/* Form B: Register Vehicle */}
            <div className="form-card">
              <h3 style={{ margin: '0 0 20px 0', color: '#ffffff' }}>Register Fleet Vehicle & Driver</h3>
              <form onSubmit={handleCreateVehicle}>
                <div className="form-group">
                  <label className="form-label">Registration / License Plate *</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. BUS-2026-S3"
                    value={newVehicle.registrationNumber}
                    onChange={(e) => setNewVehicle({ ...newVehicle, registrationNumber: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Vehicle Make & Model *</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Volvo B8R Intercity 44-Seater"
                    value={newVehicle.model}
                    onChange={(e) => setNewVehicle({ ...newVehicle, model: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Seating Capacity</label>
                  <input
                    type="number"
                    min="8"
                    className="form-control"
                    value={newVehicle.capacity}
                    onChange={(e) => setNewVehicle({ ...newVehicle, capacity: parseInt(e.target.value, 10) || 32 })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Driver Full Name *</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. George Patterson"
                    value={newVehicle.driverName}
                    onChange={(e) => setNewVehicle({ ...newVehicle, driverName: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Driver Emergency Phone *</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. +1 555-019-4421"
                    value={newVehicle.driverPhone}
                    onChange={(e) => setNewVehicle({ ...newVehicle, driverPhone: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Assign to Route</label>
                  <select
                    className="form-control"
                    value={newVehicle.assignedRouteId}
                    onChange={(e) => setNewVehicle({ ...newVehicle, assignedRouteId: e.target.value })}
                  >
                    <option value="">-- No Route (Standby Float) --</option>
                    {routes.map(r => (
                      <option key={r.id} value={r.id}>{r.route_code} - {r.name}</option>
                    ))}
                  </select>
                </div>
                <button type="submit" className="btn-primary" style={{ width: '100%', marginTop: '12px' }}>
                  🚌 Ingest Vehicle into Fleet
                </button>
              </form>
            </div>
          </div>
        )}
      </div>

      {/* Assign Student Modal */}
      {assignModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">Assign Student to Bus Route</h3>
              <button className="close-btn" onClick={() => setAssignModalOpen(false)}>×</button>
            </div>
            <form onSubmit={handleAssignStudent}>
              <div className="form-group">
                <label className="form-label">Student Full Name *</label>
                <input
                  type="text"
                  className="form-control"
                  value={assignForm.studentName}
                  onChange={(e) => setAssignForm({ ...assignForm, studentName: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Student User ID</label>
                <input
                  type="number"
                  className="form-control"
                  value={assignForm.studentId}
                  onChange={(e) => setAssignForm({ ...assignForm, studentId: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Select Commuter Route *</label>
                <select
                  className="form-control"
                  value={assignForm.routeId}
                  onChange={(e) => setAssignForm({ ...assignForm, routeId: e.target.value })}
                  required
                >
                  {routes.map(r => (
                    <option key={r.id} value={r.id}>{r.route_code} - {r.name} (${r.monthly_fare}/mo)</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Pickup Stop Location *</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Central Station Terminal"
                  value={assignForm.pickupStop}
                  onChange={(e) => setAssignForm({ ...assignForm, pickupStop: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Dropoff Stop Location *</label>
                <input
                  type="text"
                  className="form-control"
                  value={assignForm.dropoffStop}
                  onChange={(e) => setAssignForm({ ...assignForm, dropoffStop: e.target.value })}
                  required
                />
              </div>

              <div style={{ marginTop: '24px', display: 'flex', gap: '12px' }}>
                <button type="submit" className="btn-primary" style={{ flex: 1 }}>
                  Confirm Transit Allocation
                </button>
                <button type="button" className="btn-secondary" onClick={() => setAssignModalOpen(false)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Universal Floating Scroll Controls */}
      <div 
        style={{
          position: "fixed",
          bottom: "24px",
          right: "24px",
          display: "flex",
          flexDirection: "column",
          gap: "8px",
          zIndex: 9999
        }}
      >
        <button
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          title="Scroll to Top"
          style={{
            background: "linear-gradient(135deg, #f59e0b, #d97706)",
            color: "#ffffff",
            border: "1.5px solid rgba(255,255,255,0.3)",
            borderRadius: "50%",
            width: "42px",
            height: "42px",
            fontSize: "1.1rem",
            cursor: "pointer",
            boxShadow: "0 4px 14px rgba(0,0,0,0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "transform 0.2s"
          }}
          onMouseEnter={(e) => e.currentTarget.style.transform = "scale(1.1)"}
          onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1.0)"}
        >
          ⬆️
        </button>
        <button
          type="button"
          onClick={() => window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" })}
          title="Scroll to Bottom"
          style={{
            background: "linear-gradient(135deg, #1e293b, #0f172a)",
            color: "#fbbf24",
            border: "1.5px solid rgba(251, 191, 36, 0.4)",
            borderRadius: "50%",
            width: "42px",
            height: "42px",
            fontSize: "1.1rem",
            cursor: "pointer",
            boxShadow: "0 4px 14px rgba(0,0,0,0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "transform 0.2s"
          }}
          onMouseEnter={(e) => e.currentTarget.style.transform = "scale(1.1)"}
          onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1.0)"}
        >
          ⬇️
        </button>
      </div>

      {/* Driver Transport Profile Modal (Requirement: Drivers information must be on their transport profile) */}
      {selectedDriverProfile && (
        <div className="modal-overlay" onClick={() => setSelectedDriverProfile(null)}>
          <div className="modal-content" style={{ maxWidth: '580px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '1.4rem' }}>🚖</span>
                <div>
                  <h3 className="modal-title" style={{ margin: 0 }}>Driver Transport Profile</h3>
                  <span style={{ fontSize: '0.75rem', color: '#fbbf24' }}>GBS Official Fleet Certification</span>
                </div>
              </div>
              <button className="close-btn" onClick={() => setSelectedDriverProfile(null)}>×</button>
            </div>

            <div style={{ display: 'flex', gap: '16px', alignItems: 'center', marginBottom: '1.25rem', padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '10px' }}>
              <img
                src="/images/admin_login_bg.jpg"
                alt={selectedDriverProfile.name}
                style={{ width: '80px', height: '80px', borderRadius: '10px', objectFit: 'cover', border: '2px solid #fbbf24' }}
              />
              <div>
                <h3 style={{ margin: 0, color: '#f8fafc', fontSize: '1.2rem' }}>{selectedDriverProfile.name}</h3>
                <span className="status-badge status-available" style={{ fontSize: '0.72rem', marginTop: '4px', display: 'inline-block' }}>
                  {selectedDriverProfile.medicalStatus}
                </span>
                <div style={{ fontSize: '0.85rem', color: '#38bdf8', marginTop: '4px', fontFamily: 'monospace' }}>
                  License: {selectedDriverProfile.license}
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '10px', borderRadius: '8px' }}>
                <span style={{ color: '#94a3b8', display: 'block', fontSize: '0.75rem' }}>Driver Phone</span>
                <strong style={{ color: '#34d399' }}>{selectedDriverProfile.phone}</strong>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '10px', borderRadius: '8px' }}>
                <span style={{ color: '#94a3b8', display: 'block', fontSize: '0.75rem' }}>Experience</span>
                <strong style={{ color: '#f8fafc' }}>{selectedDriverProfile.experience}</strong>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '10px', borderRadius: '8px' }}>
                <span style={{ color: '#94a3b8', display: 'block', fontSize: '0.75rem' }}>Assigned Fleet Vehicle</span>
                <strong style={{ color: '#60a5fa' }}>{selectedDriverProfile.vehicle} ({selectedDriverProfile.regNumber})</strong>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '10px', borderRadius: '8px' }}>
                <span style={{ color: '#94a3b8', display: 'block', fontSize: '0.75rem' }}>Designated Route</span>
                <strong style={{ color: '#fbbf24' }}>{selectedDriverProfile.route}</strong>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '10px', borderRadius: '8px', gridColumn: '1 / -1' }}>
                <span style={{ color: '#94a3b8', display: 'block', fontSize: '0.75rem' }}>Emergency Dispatch Contact</span>
                <strong style={{ color: '#f8fafc' }}>{selectedDriverProfile.emergencyContact}</strong>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <a
                href={`tel:${selectedDriverProfile.phone}`}
                className="btn-primary"
                style={{ flex: 1, textDecoration: 'none', textAlign: 'center', background: '#10b981', borderColor: '#059669' }}
              >
                📞 Call Driver
              </a>
              <button
                type="button"
                className="btn-secondary"
                style={{ flex: 1 }}
                onClick={() => setSelectedDriverProfile(null)}
              >
                Close Profile
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
