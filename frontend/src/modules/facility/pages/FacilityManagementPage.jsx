import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import apiClient from "../../../api/client/apiClient";
import "./FacilityManagement.css";

export default function FacilityManagementPage() {
  const navigate = useNavigate();
  const [tickets, setTickets] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [categoryFilter, setCategoryFilter] = useState("ALL");

  // Form State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedReferenceTicket, setSelectedReferenceTicket] = useState(null);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("ELECTRICAL");
  const [location, setLocation] = useState("");
  const [priority, setPriority] = useState("MEDIUM");
  const [estimatedCost, setEstimatedCost] = useState("");
  const [assignedStaff, setAssignedStaff] = useState("");
  const [reportedBy, setReportedBy] = useState("Campus Operations Lead");
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [actionMessage, setActionMessage] = useState("");

  const fetchTickets = async () => {
    try {
      setLoading(true);
      let query = "/facility/tickets?tenantId=1";
      if (statusFilter !== "ALL") query += `&status=${statusFilter}`;
      if (categoryFilter !== "ALL") query += `&category=${categoryFilter}`;
      const res = await apiClient.get(query);
      if (res.data?.success) {
        setTickets(res.data.data);
      }
      const statsRes = await apiClient.get("/facility/stats?tenantId=1");
      if (statsRes.data?.success) {
        setStats(statsRes.data.data);
      }
    } catch (err) {
      console.error("Failed to load facility tickets:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, [statusFilter, categoryFilter]);

  const handleCreateTicket = async (e) => {
    e.preventDefault();
    if (!title || !location) {
      alert("Please provide ticket title and physical location.");
      return;
    }
    setFormSubmitting(true);
    try {
      const res = await apiClient.post("/facility/tickets", {
        tenantId: 1,
        title,
        category,
        location,
        priority,
        estimatedCost: parseFloat(estimatedCost) || 0,
        assignedStaff: assignedStaff || "Engineering Services",
        reportedBy
      });
      if (res.data?.success) {
        setActionMessage(`Work order ${res.data.data.ticket_number} created successfully.`);
        setShowCreateModal(false);
        setTitle("");
        setLocation("");
        setEstimatedCost("");
        setAssignedStaff("");
        fetchTickets();
        setTimeout(() => setActionMessage(""), 5000);
      }
    } catch (err) {
      alert(err.response?.data?.message || err.message);
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleStatusUpdate = async (id, newStatus, currentEstimated) => {
    try {
      let actualCost = currentEstimated;
      if (newStatus === "RESOLVED") {
        const input = prompt("Enter final actual expenditure cost ($):", currentEstimated);
        if (input !== null) actualCost = parseFloat(input) || currentEstimated;
      }
      const res = await apiClient.patch(`/facility/tickets/${id}/status`, {
        tenantId: 1,
        status: newStatus,
        actualCost,
        resolutionNotes: `Status changed to ${newStatus} by Operations Command.`
      });
      if (res.data?.success) {
        setActionMessage(`Ticket updated to ${newStatus}.`);
        fetchTickets();
        setTimeout(() => setActionMessage(""), 4000);
      }
    } catch (err) {
      alert(err.response?.data?.message || err.message);
    }
  };

  return (
    <div className="facility-container">
      {/* Top Header */}
      <header className="facility-header">
        <div className="header-titles">
          <div className="header-badge">ENTERPRISE CAMPUS OPERATIONS</div>
          <h1>Facility & Maintenance Management</h1>
          <p>Work order dispatch, preventative maintenance, physical plant logistics, and campus infrastructure servicing.</p>
        </div>
        <div className="header-actions" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            className="btn-secondary"
            onClick={() => navigate(-1)}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            ← Return / Back
          </button>
          <button
            onClick={() => {
              localStorage.removeItem('token');
              localStorage.removeItem('user');
              sessionStorage.clear();
              navigate('/login');
            }}
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
          <button className="btn-primary" onClick={() => setShowCreateModal(true)}>
            + Enter Maintenance Record
          </button>
        </div>
      </header>

      {/* Real-Life Campus Hero Banner */}
      <section
        className="facility-hero-banner"
        style={{
          backgroundImage: `linear-gradient(135deg, rgba(15, 23, 42, 0.70), rgba(15, 23, 42, 0.85)), url('/assets/facility-bg.jpg')`
        }}
      >
        <div className="hero-text-block">
          <div className="hero-pill-badge">CAMPUS PHYSICAL INFRASTRUCTURE</div>
          <h2>Engineering & Facility Command Center</h2>
          <p>
            Real-time tracking of HVAC systems, electrical substations, smart classroom hardware, plumbing lines, and structural safety work orders across campus.
          </p>
        </div>

        <div className="hero-photo-showcase-frame">
          <div className="showcase-photo-wrapper">
            <img
              src="/assets/facility-bg.jpg"
              alt="Facility Operations and Engineering Maintenance Enclave"
              className="real-life-dashboard-photo"
            />
            <div className="showcase-verified-badge">
              <span className="live-camera-pulse"></span>
              <span>VERIFIED CAMPUS FACILITY PHOTO</span>
            </div>
          </div>
          <div className="showcase-photo-caption">
            <span>📍 Central Plant & Engineering Maintenance Complex • Verified Daylight View</span>
          </div>
        </div>
      </section>

      {/* Action Notification */}
      {actionMessage && <div className="facility-alert-banner">{actionMessage}</div>}

      {/* Key Metrics / KPIs */}
      <section className="facility-kpi-grid">
        <div className="kpi-card">
          <div className="kpi-icon">📋</div>
          <div className="kpi-data">
            <span className="kpi-num">{stats?.total ?? 0}</span>
            <span className="kpi-label">Total Work Orders</span>
          </div>
        </div>

        <div className="kpi-card pending">
          <div className="kpi-icon">⏳</div>
          <div className="kpi-data">
            <span className="kpi-num">{stats?.pending ?? 0}</span>
            <span className="kpi-label">Pending Approval</span>
          </div>
        </div>

        <div className="kpi-card progress">
          <div className="kpi-icon">🔧</div>
          <div className="kpi-data">
            <span className="kpi-num">{stats?.in_progress ?? 0}</span>
            <span className="kpi-label">In Servicing</span>
          </div>
        </div>

        <div className="kpi-card resolved">
          <div className="kpi-icon">✅</div>
          <div className="kpi-data">
            <span className="kpi-num">{stats?.resolved ?? 0}</span>
            <span className="kpi-label">Resolved Work Orders</span>
          </div>
        </div>

        <div className="kpi-card cost">
          <div className="kpi-icon">💵</div>
          <div className="kpi-data">
            <span className="kpi-num">${Number(stats?.total_actual_cost || 0).toLocaleString()}</span>
            <span className="kpi-label">Actual Maintenance Spend</span>
          </div>
        </div>
      </section>

      {/* Filters & Ledger Controls */}
      <div className="facility-controls-bar">
        <div className="filter-group">
          <label>Status Filter:</label>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="ALL">All Statuses</option>
            <option value="PENDING">Pending Review</option>
            <option value="APPROVED">Approved / Dispatched</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="RESOLVED">Resolved</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </div>

        <div className="filter-group">
          <label>Category Filter:</label>
          <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
            <option value="ALL">All Categories</option>
            <option value="ELECTRICAL">Electrical Systems</option>
            <option value="HVAC">HVAC & Climate Control</option>
            <option value="PLUMBING">Plumbing & Water</option>
            <option value="IT_HARDWARE">IT & AV Systems</option>
            <option value="SAFETY">Safety & Access Control</option>
            <option value="STRUCTURAL">Structural & Civil</option>
          </select>
        </div>

        <button className="btn-secondary" onClick={fetchTickets}>
          🔄 Refresh Ledger
        </button>
      </div>

      {/* Facility Work Orders Ledger */}
      <section className="facility-ledger-card">
        <div className="ledger-header">
          <h3>Active Campus Maintenance Work Orders</h3>
          <span className="ledger-count">{tickets.length} Records in PostgreSQL</span>
        </div>

        {loading ? (
          <div className="facility-loading">Connecting to PostgreSQL facility records...</div>
        ) : tickets.length === 0 ? (
          <div className="facility-empty">No work orders matching selected filter criteria.</div>
        ) : (
          <div className="table-responsive">
            <table className="facility-table">
              <thead>
                <tr>
                  <th>Ticket #</th>
                  <th>Issue / Work Order</th>
                  <th>Category</th>
                  <th>Campus Location</th>
                  <th>Priority</th>
                  <th>Est. Cost</th>
                  <th>Actual Cost</th>
                  <th>Assigned Lead</th>
                  <th>Status</th>
                  <th>Operations Dispatch</th>
                </tr>
              </thead>
              <tbody>
                {tickets.map((t) => (
                  <tr key={t.id}>
                    <td>
                      <button
                        onClick={() => setSelectedReferenceTicket(t)}
                        className="ticket-badge"
                        style={{ cursor: 'pointer', border: '1px solid rgba(59, 130, 246, 0.4)', background: 'rgba(59, 130, 246, 0.1)', color: '#60a5fa', padding: '4px 8px', borderRadius: '4px' }}
                        title="Click to view reference details"
                      >
                        📄 {t.ticket_number}
                      </button>
                    </td>
                    <td>
                      <div className="ticket-title-block">
                        <strong>{t.title}</strong>
                        {t.resolution_notes && <span className="ticket-notes">{t.resolution_notes}</span>}
                      </div>
                    </td>
                    <td>
                      <span className="category-pill">{t.category}</span>
                    </td>
                    <td>📍 {t.location}</td>
                    <td>
                      <span className={`priority-badge ${t.priority.toLowerCase()}`}>
                        {t.priority}
                      </span>
                    </td>
                    <td>${Number(t.estimated_cost).toFixed(2)}</td>
                    <td>
                      <strong className={Number(t.actual_cost) > 0 ? "has-cost" : ""}>
                        ${Number(t.actual_cost).toFixed(2)}
                      </strong>
                    </td>
                    <td>👤 {t.assigned_staff || "Unassigned"}</td>
                    <td>
                      <span className={`status-pill ${t.status.toLowerCase()}`}>
                        {t.status}
                      </span>
                    </td>
                    <td>
                      <div className="action-button-group">
                        <button
                          className="btn-action"
                          style={{ background: 'rgba(59, 130, 246, 0.2)', color: '#93c5fd', borderColor: '#3b82f6' }}
                          title="View Maintenance Reference Details"
                          onClick={() => setSelectedReferenceTicket(t)}
                        >
                          Ref
                        </button>
                        {t.status === "PENDING" && (
                          <button
                            className="btn-action approve"
                            title="Approve & Dispatch Work Order"
                            onClick={() => handleStatusUpdate(t.id, "APPROVED", t.estimated_cost)}
                          >
                            Approve
                          </button>
                        )}
                        {t.status === "APPROVED" && (
                          <button
                            className="btn-action progress"
                            title="Start Servicing"
                            onClick={() => handleStatusUpdate(t.id, "IN_PROGRESS", t.estimated_cost)}
                          >
                            Start
                          </button>
                        )}
                        {t.status === "IN_PROGRESS" && (
                          <button
                            className="btn-action resolve"
                            title="Complete & Resolve Work Order"
                            onClick={() => handleStatusUpdate(t.id, "RESOLVED", t.estimated_cost)}
                          >
                            Resolve
                          </button>
                        )}
                        {t.status !== "RESOLVED" && t.status !== "REJECTED" && (
                          <button
                            className="btn-action reject"
                            title="Reject Work Order"
                            onClick={() => handleStatusUpdate(t.id, "REJECTED", 0)}
                          >
                            Reject
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Modal: Dispatch Work Order */}
      {showCreateModal && (
        <div className="facility-modal-backdrop">
          <div className="facility-modal-card">
            <div className="modal-header">
              <h3>Create Maintenance Work Order</h3>
              <button className="close-btn" onClick={() => setShowCreateModal(false)}>✕</button>
            </div>
            <form onSubmit={handleCreateTicket} className="modal-form">
              <div className="form-group">
                <label>Issue Title *</label>
                <input
                  type="text"
                  placeholder="e.g. Broken AC Compressor in Chemistry Lab"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Category *</label>
                  <select value={category} onChange={(e) => setCategory(e.target.value)}>
                    <option value="HVAC">HVAC & Climate Control</option>
                    <option value="ELECTRICAL">Electrical Systems</option>
                    <option value="PLUMBING">Plumbing & Water</option>
                    <option value="IT_HARDWARE">IT & AV Systems</option>
                    <option value="SAFETY">Safety & Locks</option>
                    <option value="STRUCTURAL">Structural & Civil</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Priority Level</label>
                  <select value={priority} onChange={(e) => setPriority(e.target.value)}>
                    <option value="LOW">Low (Routine)</option>
                    <option value="MEDIUM">Medium (Standard)</option>
                    <option value="HIGH">High (Urgent)</option>
                    <option value="URGENT">Emergency (Critical)</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Physical Location / Room Number *</label>
                <input
                  type="text"
                  placeholder="e.g. STEM Innovation Building, Room 204"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Estimated Cost ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="e.g. 250.00"
                    value={estimatedCost}
                    onChange={(e) => setEstimatedCost(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label>Assigned Staff Technician</label>
                  <input
                    type="text"
                    placeholder="e.g. Marcus Vance (Facilities Lead)"
                    value={assignedStaff}
                    onChange={(e) => setAssignedStaff(e.target.value)}
                  />
                </div>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={formSubmitting}>
                  {formSubmitting ? "Dispatching..." : "Submit Work Order"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Maintenance Reference Inspection Modal */}
      {selectedReferenceTicket && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', zIndex: 110, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: '#111827', width: '100%', maxWidth: '680px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.15)', padding: '28px', color: '#fff' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '12px' }}>
              <div>
                <span style={{ fontSize: '0.75rem', background: 'rgba(59, 130, 246, 0.2)', color: '#60a5fa', padding: '3px 8px', borderRadius: '4px', fontWeight: 700 }}>
                  WORK ORDER AUDIT & REFERENCE LEDGER
                </span>
                <h3 style={{ margin: '6px 0 0', color: '#ffffff', fontSize: '1.25rem' }}>
                  Reference #{selectedReferenceTicket.ticket_number}
                </h3>
              </div>
              <button
                onClick={() => setSelectedReferenceTicket(null)}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '1.5rem', cursor: 'pointer' }}
              >
                ×
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', fontSize: '0.9rem', marginBottom: '20px' }}>
              <div style={{ background: 'rgba(255,255,255,0.04)', padding: '12px', borderRadius: '8px' }}>
                <span style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block' }}>Issue Title</span>
                <strong style={{ color: '#ffffff' }}>{selectedReferenceTicket.title}</strong>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.04)', padding: '12px', borderRadius: '8px' }}>
                <span style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block' }}>Category & Priority</span>
                <strong style={{ color: '#38bdf8' }}>{selectedReferenceTicket.category} • {selectedReferenceTicket.priority}</strong>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.04)', padding: '12px', borderRadius: '8px' }}>
                <span style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block' }}>Physical Campus Location</span>
                <strong style={{ color: '#ffffff' }}>📍 {selectedReferenceTicket.location}</strong>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.04)', padding: '12px', borderRadius: '8px' }}>
                <span style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block' }}>Assigned Staff Lead</span>
                <strong style={{ color: '#ffffff' }}>👤 {selectedReferenceTicket.assigned_staff || 'Unassigned'}</strong>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.04)', padding: '12px', borderRadius: '8px' }}>
                <span style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block' }}>Estimated Cost</span>
                <strong style={{ color: '#60a5fa' }}>${Number(selectedReferenceTicket.estimated_cost).toFixed(2)}</strong>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.04)', padding: '12px', borderRadius: '8px' }}>
                <span style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block' }}>Actual Expenditure Spend</span>
                <strong style={{ color: '#34d399' }}>${Number(selectedReferenceTicket.actual_cost).toFixed(2)}</strong>
              </div>
              <div style={{ gridColumn: 'span 2', background: 'rgba(255,255,255,0.04)', padding: '12px', borderRadius: '8px' }}>
                <span style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block' }}>Resolution Notes / Progress Logs</span>
                <span style={{ color: '#cbd5e1' }}>{selectedReferenceTicket.resolution_notes || 'Pending initial inspection by campus operations.'}</span>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                className="btn-secondary"
                onClick={() => setSelectedReferenceTicket(null)}
              >
                Close Reference
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
