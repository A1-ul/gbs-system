import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axiosInstance from "../../../api/client/axios";
import "./TenantManagementPage.css";

export default function TenantManagementPage() {
  const navigate = useNavigate();

  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Provisioning Modal State
  const [showProvisionModal, setShowProvisionModal] = useState(false);
  const [provisioning, setProvisioning] = useState(false);
  const [provisionSuccess, setProvisionSuccess] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    domain: "",
    planName: "Enterprise SaaS Tier (30-Day Trial)",
    maxUsers: 100,
    maxStudents: 1000,
    adminFirstName: "",
    adminLastName: "",
    adminEmail: "",
    adminPassword: "Admin123!"
  });

  // Status Lifecycle Modal State
  const [statusModalTenant, setStatusModalTenant] = useState(null);
  const [newStatus, setNewStatus] = useState("ACTIVE");
  const [statusReason, setStatusReason] = useState("");
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // Deep Inspection Modal State
  const [inspectTenant, setInspectTenant] = useState(null);

  const fetchTenants = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await axiosInstance.get("/tenants");
      if (res.data?.status === "success") {
        setTenants(res.data.data.tenants || []);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load tenant organizations from PostgreSQL cluster.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTenants();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const handleProvisionTenant = async (e) => {
    e.preventDefault();
    try {
      setProvisioning(true);
      setError(null);
      const res = await axiosInstance.post("/tenants", formData);
      if (res.data?.status === "success") {
        setProvisionSuccess(res.data.message || "Tenant provisioned successfully!");
        setFormData({
          name: "",
          code: "",
          domain: "",
          planName: "Enterprise SaaS Tier (30-Day Trial)",
          maxUsers: 100,
          maxStudents: 1000,
          adminFirstName: "",
          adminLastName: "",
          adminEmail: "",
          adminPassword: "Admin123!"
        });
        setTimeout(() => {
          setShowProvisionModal(false);
          setProvisionSuccess(null);
        }, 1800);
        await fetchTenants();
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to provision enterprise tenant.");
    } finally {
      setProvisioning(false);
    }
  };

  const handleUpdateStatus = async (e) => {
    e.preventDefault();
    if (!statusModalTenant) return;
    try {
      setUpdatingStatus(true);
      const res = await axiosInstance.patch(`/tenants/${statusModalTenant.id}/status`, {
        status: newStatus,
        reason: statusReason
      });
      if (res.data?.status === "success") {
        setStatusModalTenant(null);
        setStatusReason("");
        await fetchTenants();
      }
    } catch (err) {
      alert(err.response?.data?.message || "Failed to update tenant status.");
    } finally {
      setUpdatingStatus(false);
    }
  };

  const filteredTenants = tenants.filter((t) => {
    const matchesSearch =
      t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.domain && t.domain.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = statusFilter === "ALL" || t.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalTenantsCount = tenants.length;
  const activeTenantsCount = tenants.filter((t) => t.status === "ACTIVE").length;
  const lockedTenantsCount = tenants.filter((t) => t.status === "LOCKED" || t.status === "SUSPENDED").length;
  const totalUsersAcrossTenants = tenants.reduce((sum, t) => sum + (t._count?.users || 0), 0);

  return (
    <div className="tenant-management-page">
      {/* Top Navigation Bar */}
      <header className="tenant-header-bar">
        <div className="nav-brand-container">
          <img src="/assets/gbs_crest_badge.jpg" alt="GBS Crest" className="nav-crest-img" />
          <div>
            <h1 className="nav-brand-title">GBS MULTI-TENANT ARCHITECTURE</h1>
            <span className="nav-sub-title">CENTRAL ENTERPRISE TENANT PROVISIONING & DATA ISOLATION</span>
          </div>
        </div>
        <div className="nav-action-links">
          <button className="nav-back-btn" onClick={() => navigate("/portal/admin/dashboard")}>
            ← Back to Admin Portal
          </button>
        </div>
      </header>

      <main className="tenant-main-content">
        {/* Banner with Real Photographic Background */}
        <section
          className="tenant-hero-banner"
          style={{
            backgroundImage: `linear-gradient(135deg, rgba(15, 23, 42, 0.60), rgba(15, 23, 42, 0.75)), url('/assets/onboarding_campus_bg.jpg')`
          }}
        >
          <div className="hero-text-block">
            <div className="hero-pill-badge">ENTERPRISE SAAS SYSTEM</div>
            <h2>Enterprise Tenant Organizations</h2>
            <p>
              Autonomous institution boundaries, dedicated subscription licenses, automated tenant
              provisioning, and strict ACID data isolation.
            </p>
            <div className="hero-action-block" style={{ marginTop: "18px" }}>
              <button className="provision-launch-btn" onClick={() => setShowProvisionModal(true)}>
                + Provision New Tenant
              </button>
            </div>
          </div>

          <div className="hero-photo-showcase-frame">
            <div className="showcase-photo-wrapper">
              <img
                src="/assets/onboarding_campus_bg.jpg"
                alt="Global International School Enclave"
                className="real-life-dashboard-photo"
              />
              <div className="showcase-verified-badge">
                <span className="live-camera-pulse"></span>
                <span>REAL-LIFE CAMPUS VIEW</span>
              </div>
            </div>
            <div className="showcase-photo-caption">
              <span>📍 International Academic Enclave & Global Headquarters • Verified Daylight View</span>
            </div>
          </div>
        </section>

        {/* System Summary KPI Metrics */}
        <div className="tenant-kpi-grid">
          <div className="kpi-card blue">
            <span className="kpi-icon">🏢</span>
            <div>
              <div className="kpi-value">{totalTenantsCount}</div>
              <div className="kpi-label">Registered Organizations</div>
            </div>
          </div>
          <div className="kpi-card green">
            <span className="kpi-icon">✅</span>
            <div>
              <div className="kpi-value">{activeTenantsCount}</div>
              <div className="kpi-label">Active Tenants</div>
            </div>
          </div>
          <div className="kpi-card red">
            <span className="kpi-icon">🔒</span>
            <div>
              <div className="kpi-value">{lockedTenantsCount}</div>
              <div className="kpi-label">Locked / Suspended</div>
            </div>
          </div>
          <div className="kpi-card purple">
            <span className="kpi-icon">👥</span>
            <div>
              <div className="kpi-value">{totalUsersAcrossTenants}</div>
              <div className="kpi-label">Total Users Managed</div>
            </div>
          </div>
        </div>

        {/* Filter & Controls Toolbar */}
        <div className="tenant-controls-bar">
          <div className="search-box-wrapper">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              placeholder="Search by Institution Name, Code (e.g. GBS-GVALLEY), or Domain..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="tenant-search-input"
            />
          </div>

          <div className="filter-group">
            <label className="filter-label">Filter Status:</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="status-filter-select"
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">ACTIVE</option>
              <option value="GRACE_PERIOD">GRACE_PERIOD</option>
              <option value="SUSPENDED">SUSPENDED</option>
              <option value="LOCKED">LOCKED</option>
            </select>
          </div>
        </div>

        {error && <div className="tenant-error-banner">⚠️ {error}</div>}

        {/* Tenant List / Roster Table */}
        <div className="tenant-table-container">
          {loading ? (
            <div className="table-loading-spinner">
              <span className="spinner-dot"></span> Loading real-time tenant cluster from PostgreSQL...
            </div>
          ) : filteredTenants.length === 0 ? (
            <div className="table-empty-notice">
              <span className="empty-icon">🏢</span>
              <p>No tenant organizations found matching search criteria.</p>
            </div>
          ) : (
            <table className="enterprise-tenant-table">
              <thead>
                <tr>
                  <th>Organization & Code</th>
                  <th>Domain</th>
                  <th>Subscription Plan</th>
                  <th>License Key</th>
                  <th>Expires On</th>
                  <th>Users</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTenants.map((t) => {
                  const sub = t.subscriptions?.[0];
                  const lic = sub?.licenses?.[0];
                  return (
                    <tr key={t.id} className={`tenant-row ${t.status.toLowerCase()}`}>
                      <td>
                        <div className="tenant-name-col">
                          <strong>{t.name}</strong>
                          <span className="tenant-code-badge">{t.code}</span>
                        </div>
                      </td>
                      <td>
                        <span className="tenant-domain-text">{t.domain || "N/A"}</span>
                      </td>
                      <td>
                        <span className="tenant-plan-text">{sub?.planName || "Enterprise Tier"}</span>
                      </td>
                      <td>
                        <code className="tenant-license-key">
                          {lic?.licenseKey ? `${lic.licenseKey.slice(0, 15)}...` : "LIC-ACTIVE"}
                        </code>
                      </td>
                      <td>
                        <span className="tenant-date-text">
                          {sub?.endDate ? new Date(sub.endDate).toLocaleDateString() : "Active Perpetual"}
                        </span>
                      </td>
                      <td>
                        <span className="tenant-user-count">
                          {t._count?.users || 0} / {lic?.maxUsers || 100}
                        </span>
                      </td>
                      <td>
                        <span className={`tenant-status-pill ${t.status.toLowerCase()}`}>
                          {t.status}
                        </span>
                      </td>
                      <td>
                        <div className="tenant-action-buttons">
                          <button
                            className="inspect-btn"
                            title="Inspect Tenant Details"
                            onClick={() => setInspectTenant(t)}
                          >
                            🔍 Inspect
                          </button>
                          <button
                            className="lifecycle-btn"
                            title="Change Subscription Status"
                            onClick={() => {
                              setStatusModalTenant(t);
                              setNewStatus(t.status);
                            }}
                          >
                            ⚙️ Status
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </main>

      {/* MODAL 1: Provision New Enterprise Tenant */}
      {showProvisionModal && (
        <div className="tenant-modal-backdrop" onClick={() => !provisioning && setShowProvisionModal(false)}>
          <div className="tenant-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>🏢 Provision New Enterprise Tenant</h3>
              <button
                className="close-modal-btn"
                disabled={provisioning}
                onClick={() => setShowProvisionModal(false)}
              >
                ✕
              </button>
            </div>

            {provisionSuccess ? (
              <div className="modal-success-banner">
                <span className="check-icon">✅</span>
                <h4>{provisionSuccess}</h4>
                <p>ACID transaction complete: Tenant, 30-Day Subscription, License, Admin User, and Audit Trail created.</p>
              </div>
            ) : (
              <form onSubmit={handleProvisionTenant} className="provision-form">
                <div className="form-section-title">1. Organization Identity</div>
                <div className="form-row">
                  <div className="form-group flex-2">
                    <label>Institution Name *</label>
                    <input
                      type="text"
                      name="name"
                      placeholder="e.g. Cambridge International School"
                      value={formData.name}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div className="form-group flex-1">
                    <label>Tenant Code (Optional)</label>
                    <input
                      type="text"
                      name="code"
                      placeholder="e.g. CAMBRIDGE"
                      value={formData.code}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group flex-2">
                    <label>Custom Institution Domain</label>
                    <input
                      type="text"
                      name="domain"
                      placeholder="e.g. cambridge.gbs.edu"
                      value={formData.domain}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div className="form-group flex-1">
                    <label>Subscription Tier</label>
                    <select
                      name="planName"
                      value={formData.planName}
                      onChange={handleInputChange}
                    >
                      <option value="Enterprise SaaS Tier (30-Day Trial)">Enterprise Trial (30-Day)</option>
                      <option value="Premier Academy Annual Plan">Premier Academy (Annual)</option>
                      <option value="Global Multi-Campus Enterprise">Global Multi-Campus</option>
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group flex-1">
                    <label>Max Users Quota</label>
                    <input
                      type="number"
                      name="maxUsers"
                      value={formData.maxUsers}
                      onChange={handleInputChange}
                      min="5"
                    />
                  </div>
                  <div className="form-group flex-1">
                    <label>Max Students Quota</label>
                    <input
                      type="number"
                      name="maxStudents"
                      value={formData.maxStudents}
                      onChange={handleInputChange}
                      min="20"
                    />
                  </div>
                </div>

                <div className="form-section-title">2. Initial Tenant Administrator Account</div>
                <div className="form-row">
                  <div className="form-group flex-1">
                    <label>Admin First Name</label>
                    <input
                      type="text"
                      name="adminFirstName"
                      placeholder="e.g. Headmaster"
                      value={formData.adminFirstName}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div className="form-group flex-1">
                    <label>Admin Last Name</label>
                    <input
                      type="text"
                      name="adminLastName"
                      placeholder="e.g. Anderson"
                      value={formData.adminLastName}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group flex-1">
                    <label>Admin Login Email *</label>
                    <input
                      type="email"
                      name="adminEmail"
                      placeholder="e.g. principal.cambridge@gbs.edu"
                      value={formData.adminEmail}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div className="form-group flex-1">
                    <label>Initial Password *</label>
                    <input
                      type="password"
                      name="adminPassword"
                      value={formData.adminPassword}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                </div>

                <div className="modal-actions-bar">
                  <button
                    type="button"
                    className="cancel-btn"
                    disabled={provisioning}
                    onClick={() => setShowProvisionModal(false)}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="submit-provision-btn" disabled={provisioning}>
                    {provisioning ? "Executing Provisioning Transaction..." : "Provision Organization Now"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* MODAL 2: Change Tenant Lifecycle Status */}
      {statusModalTenant && (
        <div className="tenant-modal-backdrop" onClick={() => !updatingStatus && setStatusModalTenant(null)}>
          <div className="tenant-modal-card sm" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>⚙️ Update Tenant Lifecycle Status</h3>
              <button
                className="close-modal-btn"
                disabled={updatingStatus}
                onClick={() => setStatusModalTenant(null)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateStatus} className="status-form">
              <div className="target-tenant-banner">
                <strong>{statusModalTenant.name}</strong> ({statusModalTenant.code})
                <span className={`tenant-status-pill ${statusModalTenant.status.toLowerCase()}`}>
                  Current: {statusModalTenant.status}
                </span>
              </div>

              <div className="form-group">
                <label>Target Status *</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="status-select-control"
                >
                  <option value="ACTIVE">ACTIVE (Full access permitted)</option>
                  <option value="GRACE_PERIOD">GRACE_PERIOD (Expiring notice)</option>
                  <option value="SUSPENDED">SUSPENDED (Temporary restriction)</option>
                  <option value="LOCKED">LOCKED (Subscription auto-lock enforcement)</option>
                </select>
              </div>

              <div className="form-group">
                <label>Audit Reason / Justification *</label>
                <textarea
                  placeholder="Provide reason for this status modification (required for audit logging)..."
                  value={statusReason}
                  onChange={(e) => setStatusReason(e.target.value)}
                  required
                  rows={3}
                ></textarea>
              </div>

              <div className="modal-actions-bar">
                <button
                  type="button"
                  className="cancel-btn"
                  disabled={updatingStatus}
                  onClick={() => setStatusModalTenant(null)}
                >
                  Cancel
                </button>
                <button type="submit" className="submit-provision-btn" disabled={updatingStatus}>
                  {updatingStatus ? "Updating..." : "Commit Status Change"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Deep Inspection Drawer */}
      {inspectTenant && (
        <div className="tenant-modal-backdrop" onClick={() => setInspectTenant(null)}>
          <div className="tenant-modal-card lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>🔍 Institution Profile & License Inspection</h3>
              <button className="close-modal-btn" onClick={() => setInspectTenant(null)}>
                ✕
              </button>
            </div>

            <div className="inspection-content">
              <div className="inspect-section-title">Institutional Parameters</div>
              <div className="inspect-grid">
                <div className="inspect-item">
                  <span className="inspect-label">Tenant ID</span>
                  <span className="inspect-value">{inspectTenant.id}</span>
                </div>
                <div className="inspect-item">
                  <span className="inspect-label">Organization Name</span>
                  <span className="inspect-value">{inspectTenant.name}</span>
                </div>
                <div className="inspect-item">
                  <span className="inspect-label">Unique Code</span>
                  <span className="inspect-value"><code>{inspectTenant.code}</code></span>
                </div>
                <div className="inspect-item">
                  <span className="inspect-label">Primary Domain</span>
                  <span className="inspect-value">{inspectTenant.domain || "N/A"}</span>
                </div>
                <div className="inspect-item">
                  <span className="inspect-label">Lifecycle Status</span>
                  <span className={`tenant-status-pill ${inspectTenant.status.toLowerCase()}`}>
                    {inspectTenant.status}
                  </span>
                </div>
                <div className="inspect-item">
                  <span className="inspect-label">Created At</span>
                  <span className="inspect-value">{new Date(inspectTenant.createdAt).toLocaleString()}</span>
                </div>
              </div>

              <div className="inspect-section-title">Subscription & Licensing Verification</div>
              {inspectTenant.subscriptions && inspectTenant.subscriptions.length > 0 ? (
                inspectTenant.subscriptions.map((sub, i) => (
                  <div key={sub.id || i} className="inspect-sub-card">
                    <div className="inspect-grid">
                      <div className="inspect-item">
                        <span className="inspect-label">Plan Name</span>
                        <span className="inspect-value">{sub.planName}</span>
                      </div>
                      <div className="inspect-item">
                        <span className="inspect-label">Start Date</span>
                        <span className="inspect-value">{new Date(sub.startDate).toLocaleDateString()}</span>
                      </div>
                      <div className="inspect-item">
                        <span className="inspect-label">End Date / Expiry</span>
                        <span className="inspect-value">{new Date(sub.endDate).toLocaleDateString()}</span>
                      </div>
                      <div className="inspect-item">
                        <span className="inspect-label">Auto Lock</span>
                        <span className="inspect-value">{sub.autoLock ? "ENABLED (Strict)" : "DISABLED"}</span>
                      </div>
                    </div>

                    {sub.licenses && sub.licenses.length > 0 && (
                      <div className="inspect-license-block">
                        <div className="inspect-label">Generated Enterprise License Key:</div>
                        <code className="full-license-key">{sub.licenses[0].licenseKey}</code>
                        <div className="license-limits">
                          <span>Max Users: <strong>{sub.licenses[0].maxUsers}</strong></span>
                          <span>Max Students: <strong>{sub.licenses[0].maxStudents}</strong></span>
                          <span>Current Registered Users: <strong>{inspectTenant._count?.users || 0}</strong></span>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <p className="no-sub-notice">No active subscription records found for this tenant.</p>
              )}

              <div className="modal-actions-bar">
                <button className="cancel-btn" onClick={() => setInspectTenant(null)}>
                  Close Inspection
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
