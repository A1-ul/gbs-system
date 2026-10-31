import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../../api/client/apiClient';
import '../pages/InventoryManagement.css';
import '../../library/pages/LibraryManagement.css';

export default function InventoryManagementPage() {
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('inventory'); // 'inventory', 'requisitions', 'newItem'
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [items, setItems] = useState([]);
  const [requests, setRequests] = useState([]);
  const [stats, setStats] = useState({
    totalSkus: 0,
    totalUnits: 0,
    totalValuation: 0,
    lowStockAlerts: 0,
    totalRequests: 0,
    pendingRequests: 0
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [feedback, setFeedback] = useState(null);

  // New Item Form
  const [newItem, setNewItem] = useState({
    itemCode: '',
    name: '',
    category: 'LAB_SUPPLIES',
    unit: 'PIECES',
    quantityOnHand: 20,
    reorderLevel: 10,
    unitPrice: 25.0,
    location: 'Science Storeroom B1',
    purchasedByStaff: 'Dr. Evelyn Reed (Head of Sciences)',
    purchaserDept: 'Faculty of Sciences'
  });

  // Adjust Stock Modal State
  const [adjustModalOpen, setAdjustModalOpen] = useState(false);
  const [selectedItemForAdjust, setSelectedItemForAdjust] = useState(null);
  const [adjustmentDelta, setAdjustmentDelta] = useState(10);
  const [adjustmentReason, setAdjustmentReason] = useState('Shipment Restock Delivery');

  // New Requisition Form State
  const [reqModalOpen, setReqModalOpen] = useState(false);
  const [newRequisition, setNewRequisition] = useState({
    itemId: '',
    requesterId: '1',
    requesterName: 'Dr. Evelyn Reed',
    department: 'SCIENCE_LAB',
    quantityRequested: 10,
    urgency: 'MEDIUM',
    notes: 'Urgent for Grade 11 Chemistry Mid-Term practicals'
  });

  const showToast = (message, type = 'success') => {
    setFeedback({ message, type });
    setTimeout(() => setFeedback(null), 5000);
  };

  const fetchStats = async () => {
    try {
      const res = await apiClient.get('/inventory/stats');
      if (res.data?.success) setStats(res.data.data);
    } catch (err) {
      console.warn('Failed to load inventory stats:', err.message);
    }
  };

  const fetchItems = async (cat = selectedCategory, q = searchQuery) => {
    try {
      let url = `/inventory/items?category=${cat}`;
      if (q) url += `&search=${encodeURIComponent(q)}`;
      const res = await apiClient.get(url);
      if (res.data?.success) {
        setItems(res.data.data.records || []);
        if (res.data.data.records?.length > 0 && !newRequisition.itemId) {
          setNewRequisition(prev => ({ ...prev, itemId: String(res.data.data.records[0].id) }));
        }
      }
    } catch (err) {
      console.warn('Failed to load inventory items:', err.message);
    }
  };

  const fetchRequests = async () => {
    try {
      const res = await apiClient.get('/inventory/requests');
      if (res.data?.success) setRequests(res.data.data.records || []);
    } catch (err) {
      console.warn('Failed to load purchase requests:', err.message);
    }
  };

  useEffect(() => {
    fetchStats();
    fetchItems(selectedCategory, searchQuery);
    fetchRequests();
  }, [selectedCategory]);

  const handleCreateItem = async (e) => {
    e.preventDefault();
    if (!newItem.itemCode || !newItem.name) {
      showToast('Item code and name are required', 'error');
      return;
    }

    try {
      const res = await apiClient.post('/inventory/items', newItem);
      if (res.data?.success) {
        showToast(`Item '${newItem.name}' added to inventory!`, 'success');
        setNewItem({
          itemCode: '',
          name: '',
          category: 'LAB_SUPPLIES',
          unit: 'PIECES',
          quantityOnHand: 20,
          reorderLevel: 10,
          unitPrice: 25.0,
          location: 'Science Storeroom B1'
        });
        setActiveTab('inventory');
        fetchItems();
        fetchStats();
      } else {
        showToast(res.data?.message || 'Failed to add item', 'error');
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Error creating item', 'error');
    }
  };

  const openAdjustModal = (item) => {
    setSelectedItemForAdjust(item);
    setAdjustmentDelta(10);
    setAdjustModalOpen(true);
  };

  const handleAdjustStock = async (e) => {
    e.preventDefault();
    if (!selectedItemForAdjust) return;

    try {
      const res = await apiClient.post(`/inventory/items/${selectedItemForAdjust.id}/adjust`, {
        adjustmentAmount: parseInt(adjustmentDelta, 10),
        reason: adjustmentReason
      });

      if (res.data?.success) {
        showToast(res.data.message || 'Stock adjusted successfully', 'success');
        setAdjustModalOpen(false);
        fetchItems();
        fetchStats();
      } else {
        showToast(res.data?.message || 'Failed to adjust stock', 'error');
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Error adjusting stock', 'error');
    }
  };

  const handleCreateRequisition = async (e) => {
    e.preventDefault();
    try {
      const res = await apiClient.post('/inventory/requests', newRequisition);
      if (res.data?.success) {
        showToast('Purchase requisition submitted successfully!', 'success');
        setReqModalOpen(false);
        fetchRequests();
        fetchStats();
      } else {
        showToast(res.data?.message || 'Submission failed', 'error');
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Error submitting requisition', 'error');
    }
  };

  const handleUpdateReqStatus = async (requestId, status) => {
    try {
      const res = await apiClient.patch(`/inventory/requests/${requestId}/status`, { status });
      if (res.data?.success) {
        showToast(res.data.message || `Requisition updated to ${status}`, 'success');
        fetchRequests();
        fetchItems();
        fetchStats();
      } else {
        showToast(res.data?.message || 'Status update failed', 'error');
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Error updating status', 'error');
    }
  };

  return (
    <div className="inventory-management-container">
      {/* Top Header */}
      <header className="transport-top-nav">
        <div className="nav-brand">
          <span className="nav-brand-badge" style={{ background: 'linear-gradient(135deg, #059669, #10b981)' }}>
            LOGISTICS
          </span>
          <span>GBS International Inventory & Procurement Depot</span>
        </div>
        <div className="nav-actions" style={{ display: 'flex', gap: '10px' }}>
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
        </div>
      </header>

      {/* Hero Banner with authentic photography */}
      <section
        className="inventory-hero-section"
        style={{ backgroundImage: `url('/assets/inventory-bg.jpg')` }}
      >
        <div className="transport-hero-overlay" />
        <div className="transport-hero-content">
          <span className="pill-badge" style={{ borderColor: 'rgba(16, 185, 129, 0.5)', color: '#6ee7b7' }}>
            ENTERPRISE SUPPLY CHAIN & ASSETS
          </span>
          <h1 className="library-hero-title">Inventory & Procurement Management</h1>
          <p className="library-hero-desc">
            Classroom consumables, scientific laboratory supplies, IT hardware custody, and streamlined purchase requisition workflows backed dynamically by PostgreSQL.
          </p>
        </div>
      </section>

      {/* Telemetry Stats Bar */}
      <div className="transport-stats-grid">
        <div className="stat-card">
          <span className="stat-label">Active SKUs</span>
          <span className="stat-value">{stats.totalSkus}</span>
          <span className="stat-desc">Cataloged item lines</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Total Units on Hand</span>
          <span className="stat-value" style={{ color: '#34d399' }}>{stats.totalUnits}</span>
          <span className="stat-desc">Stocked items in depots</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Asset Valuation</span>
          <span className="stat-value" style={{ color: '#60a5fa' }}>
            ${parseFloat(stats.totalValuation || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
          <span className="stat-desc">Total inventory value</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Low Stock Alerts</span>
          <span className="stat-value" style={{ color: stats.lowStockAlerts > 0 ? '#f87171' : '#94a3b8' }}>
            {stats.lowStockAlerts}
          </span>
          <span className="stat-desc">Items at reorder threshold</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Pending Requisitions</span>
          <span className="stat-value" style={{ color: stats.pendingRequests > 0 ? '#fbbf24' : '#94a3b8' }}>
            {stats.pendingRequests}
          </span>
          <span className="stat-desc">Awaiting management approval</span>
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
            className={`tab-btn ${activeTab === 'inventory' ? 'active' : ''}`}
            onClick={() => setActiveTab('inventory')}
          >
            📦 Stock Inventory & Equipment ({items.length})
          </button>
          <button
            className={`tab-btn ${activeTab === 'requisitions' ? 'active' : ''}`}
            onClick={() => setActiveTab('requisitions')}
          >
            📝 Purchase Requisitions ({requests.length})
          </button>
          <button
            className={`tab-btn ${activeTab === 'newItem' ? 'active' : ''}`}
            onClick={() => setActiveTab('newItem')}
          >
            ➕ Register New Stock Item
          </button>
        </div>

        {/* Tab 1: Inventory Items Table */}
        {activeTab === 'inventory' && (
          <div>
            <div className="controls-bar">
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {['ALL', 'LAB_SUPPLIES', 'STATIONERY', 'IT_EQUIPMENT', 'FURNITURE'].map(cat => (
                  <button
                    key={cat}
                    className={`category-filter-btn ${selectedCategory === cat ? 'active' : ''}`}
                    onClick={() => setSelectedCategory(cat)}
                  >
                    {cat.replace('_', ' ')}
                  </button>
                ))}
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <input
                  type="text"
                  className="search-input"
                  style={{ width: '220px' }}
                  placeholder="Filter by name or code..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    fetchItems(selectedCategory, e.target.value);
                  }}
                />
                <button className="btn-primary" onClick={() => setReqModalOpen(true)}>
                  📝 Create Requisition
                </button>
              </div>
            </div>

            <div className="table-card">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Item Code</th>
                    <th>Product / Asset Name</th>
                    <th>Category</th>
                    <th>Purchased By (Staff)</th>
                    <th>Quantity on Hand</th>
                    <th>Reorder Level</th>
                    <th>Unit Price</th>
                    <th>Location</th>
                    <th>Status</th>
                    <th>Stock Action</th>
                  </tr>
                </thead>
                <tbody>
                  {items.length === 0 ? (
                    <tr>
                      <td colSpan="10" style={{ textAlign: 'center', padding: '30px' }}>
                        No inventory items found matching category.
                      </td>
                    </tr>
                  ) : (
                    items.map((item) => (
                      <tr key={item.id}>
                        <td style={{ fontFamily: 'monospace', fontWeight: 700, color: '#34d399' }}>{item.item_code}</td>
                        <td style={{ fontWeight: 700 }}>{item.name}</td>
                        <td>
                          <span style={{ fontSize: '0.8rem', background: 'rgba(255,255,255,0.08)', padding: '2px 8px', borderRadius: '4px' }}>
                            {item.category}
                          </span>
                        </td>
                        <td>
                          <div style={{ fontWeight: 600, color: '#ffffff', fontSize: '0.85rem' }}>
                            👤 {item.purchased_by_staff || 'Mr. Samuel Adjei (Procurement Officer)'}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                            Dept: {item.purchaser_dept || 'Procurement & Logistics'}
                          </div>
                        </td>
                        <td style={{ fontWeight: 700, fontSize: '1rem' }}>
                          <span style={{ color: item.quantity_on_hand <= item.reorder_level ? '#f87171' : '#34d399' }}>
                            {item.quantity_on_hand}
                          </span>{' '}
                          <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{item.unit}</span>
                        </td>
                        <td>{item.reorder_level}</td>
                        <td style={{ fontWeight: 700 }}>${parseFloat(item.unit_price || 0).toFixed(2)}</td>
                        <td>📍 {item.location}</td>
                        <td>
                          <span className={`status-badge ${item.status === 'IN_STOCK' ? 'status-available' : (item.status === 'LOW_STOCK' ? 'status-borrowed' : 'status-overdue')}`}>
                            {item.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td>
                          <button className="action-btn-sm" onClick={() => openAdjustModal(item)}>
                            ⚖️ Adjust Stock
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 2: Purchase Requisitions */}
        {activeTab === 'requisitions' && (
          <div className="table-card">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Req Number</th>
                  <th>Item Name</th>
                  <th>Requester</th>
                  <th>Department</th>
                  <th>Quantity</th>
                  <th>Estimated Cost</th>
                  <th>Urgency</th>
                  <th>Status</th>
                  <th>Workflow Action</th>
                </tr>
              </thead>
              <tbody>
                {requests.length === 0 ? (
                  <tr>
                    <td colSpan="9" style={{ textAlign: 'center', padding: '30px' }}>
                      No purchase requisitions on record.
                    </td>
                  </tr>
                ) : (
                  requests.map((req) => (
                    <tr key={req.id}>
                      <td style={{ fontFamily: 'monospace', fontWeight: 700 }}>{req.request_number}</td>
                      <td style={{ fontWeight: 700 }}>{req.item_name}</td>
                      <td>{req.requester_name}</td>
                      <td>{req.department}</td>
                      <td style={{ fontWeight: 700 }}>{req.quantity_requested}</td>
                      <td style={{ fontWeight: 700, color: '#60a5fa' }}>
                        ${parseFloat(req.total_estimated_cost || 0).toFixed(2)}
                      </td>
                      <td>
                        <span style={{
                          fontSize: '0.8rem',
                          fontWeight: 700,
                          color: req.urgency === 'CRITICAL' ? '#f87171' : (req.urgency === 'HIGH' ? '#fbbf24' : '#94a3b8')
                        }}>
                          {req.urgency}
                        </span>
                      </td>
                      <td>
                        <span className={`status-badge ${req.status === 'APPROVED' ? 'status-available' : (req.status === 'PENDING' ? 'status-borrowed' : (req.status === 'FULFILLED' ? 'status-available' : 'status-overdue'))}`}>
                          {req.status}
                        </span>
                      </td>
                      <td>
                        {req.status === 'PENDING' ? (
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button
                              className="action-btn-sm"
                              style={{ background: 'rgba(16, 185, 129, 0.2)', color: '#34d399', borderColor: '#10b981' }}
                              onClick={() => handleUpdateReqStatus(req.id, 'APPROVED')}
                            >
                              ✓ Approve
                            </button>
                            <button
                              className="action-btn-danger"
                              onClick={() => handleUpdateReqStatus(req.id, 'REJECTED')}
                            >
                              ✕ Reject
                            </button>
                          </div>
                        ) : req.status === 'APPROVED' ? (
                          <button
                            className="action-btn-sm"
                            style={{ background: 'rgba(59, 130, 246, 0.2)', color: '#93c5fd', borderColor: '#3b82f6' }}
                            onClick={() => handleUpdateReqStatus(req.id, 'FULFILLED')}
                          >
                            📦 Fulfill & Restock
                          </button>
                        ) : (
                          <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Processed</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 3: Register Item */}
        {activeTab === 'newItem' && (
          <div className="form-card">
            <h3 style={{ margin: '0 0 20px 0', color: '#ffffff' }}>Add New Item to Inventory System</h3>
            <form onSubmit={handleCreateItem}>
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Item SKU / Code *</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. INV-LAB-301"
                    value={newItem.itemCode}
                    onChange={(e) => setNewItem({ ...newItem, itemCode: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Product Name *</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Digital Vernier Caliper 150mm"
                    value={newItem.name}
                    onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Category</label>
                  <select
                    className="form-control"
                    value={newItem.category}
                    onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}
                  >
                    <option value="LAB_SUPPLIES">Science Lab Supplies & Reagents</option>
                    <option value="STATIONERY">Classroom Stationery & Books</option>
                    <option value="IT_EQUIPMENT">IT Laptops, Tablets & Networking</option>
                    <option value="FURNITURE">Campus Desks, Chairs & Fixtures</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Packaging Unit</label>
                  <select
                    className="form-control"
                    value={newItem.unit}
                    onChange={(e) => setNewItem({ ...newItem, unit: e.target.value })}
                  >
                    <option value="PIECES">Pieces</option>
                    <option value="BOXES">Boxes</option>
                    <option value="PACKS">Packs</option>
                    <option value="SETS">Sets</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Initial Quantity on Hand</label>
                  <input
                    type="number"
                    min="0"
                    className="form-control"
                    value={newItem.quantityOnHand}
                    onChange={(e) => setNewItem({ ...newItem, quantityOnHand: parseInt(e.target.value, 10) || 0 })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Reorder Alert Threshold</label>
                  <input
                    type="number"
                    min="1"
                    className="form-control"
                    value={newItem.reorderLevel}
                    onChange={(e) => setNewItem({ ...newItem, reorderLevel: parseInt(e.target.value, 10) || 10 })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Unit Valuation (USD) *</label>
                  <input
                    type="number"
                    step="0.01"
                    className="form-control"
                    value={newItem.unitPrice}
                    onChange={(e) => setNewItem({ ...newItem, unitPrice: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Storage Location / Bay</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Science Storeroom Cabinet 3"
                    value={newItem.location}
                    onChange={(e) => setNewItem({ ...newItem, location: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Purchased By (Staff Name & Title) *</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Dr. Evelyn Reed (Head of Sciences)"
                    value={newItem.purchasedByStaff}
                    onChange={(e) => setNewItem({ ...newItem, purchasedByStaff: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Purchasing Department / Unit *</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Faculty of Sciences"
                    value={newItem.purchaserDept}
                    onChange={(e) => setNewItem({ ...newItem, purchaserDept: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div style={{ marginTop: '20px', display: 'flex', gap: '12px' }}>
                <button type="submit" className="btn-primary">
                  💾 Confirm Item Ingestion
                </button>
                <button type="button" className="btn-secondary" onClick={() => setActiveTab('inventory')}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* Adjust Stock Modal */}
      {adjustModalOpen && selectedItemForAdjust && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">Adjust Stock: {selectedItemForAdjust.name}</h3>
              <button className="close-btn" onClick={() => setAdjustModalOpen(false)}>×</button>
            </div>
            <form onSubmit={handleAdjustStock}>
              <div style={{ marginBottom: '16px', background: 'rgba(255,255,255,0.05)', padding: '12px', borderRadius: '8px' }}>
                <div>Current Stock: <strong>{selectedItemForAdjust.quantity_on_hand} {selectedItemForAdjust.unit}</strong></div>
                <div>SKU: <strong>{selectedItemForAdjust.item_code}</strong></div>
              </div>

              <div className="form-group">
                <label className="form-label">Adjustment Delta (+ to add, - to write-off) *</label>
                <input
                  type="number"
                  className="form-control"
                  placeholder="e.g. 25 or -5"
                  value={adjustmentDelta}
                  onChange={(e) => setAdjustmentDelta(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Reason for Stock Adjustment</label>
                <select
                  className="form-control"
                  value={adjustmentReason}
                  onChange={(e) => setAdjustmentReason(e.target.value)}
                >
                  <option value="Shipment Restock Delivery">Shipment Restock Delivery</option>
                  <option value="Audit Reconciliation Count">Audit Reconciliation Count</option>
                  <option value="Damaged / Expired Write-Off">Damaged / Expired Write-Off</option>
                  <option value="Faculty Lab Kit Distribution">Faculty Lab Kit Distribution</option>
                </select>
              </div>

              <div style={{ marginTop: '24px', display: 'flex', gap: '12px' }}>
                <button type="submit" className="btn-primary" style={{ flex: 1 }}>
                  Confirm Stock Update
                </button>
                <button type="button" className="btn-secondary" onClick={() => setAdjustModalOpen(false)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New Requisition Modal */}
      {reqModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">Create Purchase Requisition</h3>
              <button className="close-btn" onClick={() => setReqModalOpen(false)}>×</button>
            </div>
            <form onSubmit={handleCreateRequisition}>
              <div className="form-group">
                <label className="form-label">Target Inventory Item *</label>
                <select
                  className="form-control"
                  value={newRequisition.itemId}
                  onChange={(e) => setNewRequisition({ ...newRequisition, itemId: e.target.value })}
                  required
                >
                  {items.map(i => (
                    <option key={i.id} value={i.id}>{i.item_code} - {i.name} (Current: {i.quantity_on_hand})</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Requester Name</label>
                <input
                  type="text"
                  className="form-control"
                  value={newRequisition.requesterName}
                  onChange={(e) => setNewRequisition({ ...newRequisition, requesterName: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Department</label>
                <input
                  type="text"
                  className="form-control"
                  value={newRequisition.department}
                  onChange={(e) => setNewRequisition({ ...newRequisition, department: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Quantity Needed *</label>
                <input
                  type="number"
                  min="1"
                  className="form-control"
                  value={newRequisition.quantityRequested}
                  onChange={(e) => setNewRequisition({ ...newRequisition, quantityRequested: parseInt(e.target.value, 10) || 1 })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Urgency Level</label>
                <select
                  className="form-control"
                  value={newRequisition.urgency}
                  onChange={(e) => setNewRequisition({ ...newRequisition, urgency: e.target.value })}
                >
                  <option value="LOW">Low (Routine replenishment)</option>
                  <option value="MEDIUM">Medium (Next term preparation)</option>
                  <option value="HIGH">High (Stock depleted soon)</option>
                  <option value="CRITICAL">Critical (Immediate exam/curriculum requirement)</option>
                </select>
              </div>

              <div style={{ marginTop: '24px', display: 'flex', gap: '12px' }}>
                <button type="submit" className="btn-primary" style={{ flex: 1 }}>
                  Submit Requisition
                </button>
                <button type="button" className="btn-secondary" onClick={() => setReqModalOpen(false)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
