import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../../api/client/apiClient';
import WindowControlsBar from '../../../components/common/WindowControlsBar';
import TopCenterSystemBanner from '../../../components/common/TopCenterSystemBanner';
import { navigateToDetail } from '../../../utils/universalNavigation';
import './InventoryManagement.css';
import '../../library/pages/LibraryManagement.css';

const CATEGORIES = [
  { id: 'ALL', label: 'All Inventory' },
  { id: 'LAB_SUPPLIES', label: '🧪 Science & Lab' },
  { id: 'STATIONERY', label: '📝 Stationery & Paper' },
  { id: 'TEXTBOOKS', label: '📚 Library & Textbooks' },
  { id: 'IT_EQUIPMENT', label: '💻 ICT & Tech' },
  { id: 'FIRST_AID', label: '🩹 Health & Medical' },
  { id: 'SPORTS', label: '⚽ Sports & Athletics' },
  { id: 'CLEANING', label: '🧹 Janitorial & Facilities' }
];

export default function InventoryDashboard() {
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('inventory'); // 'inventory', 'requisitions', 'newItem', 'audits'
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [items, setItems] = useState([]);
  const [requests, setRequests] = useState([]);
  const [stats, setStats] = useState({
    totalSkus: 7,
    totalUnits: 312,
    totalValuation: 16840.0,
    lowStockAlerts: 2,
    totalRequests: 2,
    pendingRequests: 1
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [feedback, setFeedback] = useState(null);
  const [loading, setLoading] = useState(false);

  // New Item Form State
  const [newItem, setNewItem] = useState({
    itemCode: '',
    name: '',
    category: 'LAB_SUPPLIES',
    unit: 'PIECES',
    quantityOnHand: 25,
    reorderLevel: 10,
    unitPrice: 35.0,
    location: 'Science Storeroom B1',
    purchasedByStaff: 'Mr. Samuel Adjei (Procurement Officer)',
    purchaserDept: 'Procurement & Logistics'
  });

  // Adjust Stock Modal State
  const [adjustModalOpen, setAdjustModalOpen] = useState(false);
  const [selectedItemForAdjust, setSelectedItemForAdjust] = useState(null);
  const [adjustmentDelta, setAdjustmentDelta] = useState(10);
  const [adjustmentReason, setAdjustmentReason] = useState('Shipment Delivery Restock');

  // Purchase Requisition Form State
  const [reqModalOpen, setReqModalOpen] = useState(false);
  const [newRequisition, setNewRequisition] = useState({
    itemId: '',
    requesterName: 'Dr. Evelyn Reed (Faculty Head)',
    department: 'SCIENCE_LAB',
    quantityRequested: 10,
    urgency: 'MEDIUM',
    notes: 'Required for term assessment practicals'
  });

  const showToast = (message, type = 'success') => {
    setFeedback({ message, type });
    setTimeout(() => setFeedback(null), 4500);
  };

  const fetchStats = async () => {
    try {
      const res = await apiClient.get('/inventory/stats');
      if (res.data?.success && res.data.data) {
        setStats(res.data.data);
        localStorage.setItem('gbs_inventory_stats', JSON.stringify(res.data.data));
      }
    } catch {
      try {
        const cached = JSON.parse(localStorage.getItem('gbs_inventory_stats') || 'null');
        if (cached) setStats(cached);
      } catch (_) {}
    }
  };

  const fetchItems = async (cat = selectedCategory, q = searchQuery) => {
    setLoading(true);
    try {
      let url = `/inventory/items?category=${cat}`;
      if (q) url += `&search=${encodeURIComponent(q)}`;
      const res = await apiClient.get(url);
      if (res.data?.success && Array.isArray(res.data.data?.records)) {
        setItems(res.data.data.records);
        localStorage.setItem('gbs_inventory_items', JSON.stringify(res.data.data.records));
      } else {
        throw new Error('Fallback to local');
      }
    } catch {
      try {
        const cached = JSON.parse(localStorage.getItem('gbs_inventory_items') || '[]');
        if (Array.isArray(cached) && cached.length > 0) {
          let filtered = cached;
          if (cat !== 'ALL') {
            filtered = filtered.filter((i) => String(i.category).toUpperCase() === String(cat).toUpperCase());
          }
          if (q.trim()) {
            const query = q.trim().toLowerCase();
            filtered = filtered.filter(
              (i) =>
                (i.name && i.name.toLowerCase().includes(query)) ||
                (i.item_code && i.item_code.toLowerCase().includes(query)) ||
                (i.location && i.location.toLowerCase().includes(query))
            );
          }
          setItems(filtered);
        }
      } catch (_) {}
    } finally {
      setLoading(false);
    }
  };

  const fetchRequests = async () => {
    try {
      const res = await apiClient.get('/inventory/requests');
      if (res.data?.success && Array.isArray(res.data.data?.records)) {
        setRequests(res.data.data.records);
        localStorage.setItem('gbs_inventory_requests', JSON.stringify(res.data.data.records));
      }
    } catch {
      try {
        const cached = JSON.parse(localStorage.getItem('gbs_inventory_requests') || '[]');
        if (Array.isArray(cached) && cached.length > 0) setRequests(cached);
      } catch (_) {}
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
        showToast(`✓ Item "${newItem.name}" added to inventory catalog!`, 'success');
        setNewItem({
          itemCode: '',
          name: '',
          category: 'LAB_SUPPLIES',
          unit: 'PIECES',
          quantityOnHand: 25,
          reorderLevel: 10,
          unitPrice: 35.0,
          location: 'Science Storeroom B1',
          purchasedByStaff: 'Mr. Samuel Adjei (Procurement Officer)',
          purchaserDept: 'Procurement & Logistics'
        });
        setActiveTab('inventory');
        fetchItems(selectedCategory, searchQuery);
        fetchStats();
      } else {
        showToast(res.data?.message || 'Failed to register item', 'error');
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Error saving item', 'error');
    }
  };

  const openAdjustModal = (item) => {
    setSelectedItemForAdjust(item);
    setAdjustmentDelta(10);
    setAdjustmentReason('Shipment Delivery Restock');
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
        showToast(res.data.message || '✓ Stock adjusted successfully', 'success');
        setAdjustModalOpen(false);
        fetchItems(selectedCategory, searchQuery);
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
      const targetId = newRequisition.itemId || (items[0] ? items[0].id : 1);
      const res = await apiClient.post('/inventory/requests', {
        ...newRequisition,
        itemId: targetId
      });
      if (res.data?.success) {
        showToast('✓ Purchase requisition submitted for review!', 'success');
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
        showToast(res.data.message || `✓ Requisition status updated to ${status}`, 'success');
        fetchRequests();
        fetchItems(selectedCategory, searchQuery);
        fetchStats();
      } else {
        showToast(res.data?.message || 'Status update failed', 'error');
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Error updating status', 'error');
    }
  };

  return (
    <div className="inventory-management-container" style={{ minHeight: '100vh', background: '#020617', color: '#f8fafc', paddingBottom: '3rem' }}>
      <TopCenterSystemBanner />
      <WindowControlsBar />

      {/* Top Header */}
      <header className="transport-top-nav" style={{ padding: '16px 24px', background: 'rgba(15, 23, 42, 0.85)', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <button
            type="button"
            onClick={() => navigate(-1)}
            style={{
              background: 'rgba(56, 189, 248, 0.15)',
              border: '1.5px solid #38bdf8',
              color: '#38bdf8',
              padding: '8px 16px',
              borderRadius: '8px',
              fontWeight: 800,
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            ← Back to Dashboard
          </button>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 900, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>📦</span> GBS ENTERPRISE INVENTORY & LOGISTICS MANAGEMENT
            </h1>
            <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
              Real-Time Institutional Depot Tracking • Procurement Requisitions • Asset Valuations
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn-primary"
            onClick={() => {
              if (items.length > 0 && !newRequisition.itemId) {
                setNewRequisition((prev) => ({ ...prev, itemId: String(items[0].id) }));
              }
              setReqModalOpen(true);
            }}
            style={{ background: 'linear-gradient(135deg, #0284c7, #06b6d4)', fontWeight: 800 }}
          >
            📝 Submit Purchase Requisition
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={() => setActiveTab('newItem')}
            style={{ background: 'linear-gradient(135deg, #10b981, #059669)', fontWeight: 800 }}
          >
            ➕ Register New Stock Item
          </button>
        </div>
      </header>

      {/* Global Feedback Banner */}
      {feedback && (
        <div
          style={{
            margin: '16px 24px 0',
            padding: '12px 20px',
            borderRadius: '10px',
            background: feedback.type === 'error' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)',
            border: `1.5px solid ${feedback.type === 'error' ? '#ef4444' : '#10b981'}`,
            color: feedback.type === 'error' ? '#fca5a5' : '#6ee7b7',
            fontWeight: 800,
            fontSize: '0.88rem'
          }}
        >
          {feedback.message}
        </div>
      )}

      {/* KPI Stats Cards */}
      <div style={{ padding: '20px 24px 0' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
          <div style={{ background: 'rgba(15, 23, 42, 0.8)', border: '1px solid rgba(56, 189, 248, 0.3)', borderRadius: '12px', padding: '16px' }}>
            <span style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 800 }}>Catalog Items (SKUs)</span>
            <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#38bdf8', marginTop: '4px' }}>{stats.totalSkus}</div>
            <span style={{ fontSize: '0.72rem', color: '#64748b' }}>Active distinct inventory records</span>
          </div>

          <div style={{ background: 'rgba(15, 23, 42, 0.8)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '12px', padding: '16px' }}>
            <span style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 800 }}>Total Units in Depot</span>
            <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#34d399', marginTop: '4px' }}>{stats.totalUnits}</div>
            <span style={{ fontSize: '0.72rem', color: '#64748b' }}>Physical units across all locations</span>
          </div>

          <div style={{ background: 'rgba(15, 23, 42, 0.8)', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: '12px', padding: '16px' }}>
            <span style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 800 }}>Depot Valuation</span>
            <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#fbbf24', marginTop: '4px' }}>
              GHS {Number(stats.totalValuation || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <span style={{ fontSize: '0.72rem', color: '#64748b' }}>Cumulative replacement asset value</span>
          </div>

          <div style={{ background: 'rgba(15, 23, 42, 0.8)', border: `1px solid ${stats.lowStockAlerts > 0 ? '#ef4444' : 'rgba(255, 255, 255, 0.1)'}`, borderRadius: '12px', padding: '16px' }}>
            <span style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 800 }}>Low Stock Alerts</span>
            <div style={{ fontSize: '1.8rem', fontWeight: 900, color: stats.lowStockAlerts > 0 ? '#f87171' : '#10b981', marginTop: '4px' }}>
              {stats.lowStockAlerts}
            </div>
            <span style={{ fontSize: '0.72rem', color: '#64748b' }}>Items below reorder safety threshold</span>
          </div>

          <div style={{ background: 'rgba(15, 23, 42, 0.8)', border: '1px solid rgba(168, 85, 247, 0.3)', borderRadius: '12px', padding: '16px' }}>
            <span style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 800 }}>Pending Requisitions</span>
            <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#c084fc', marginTop: '4px' }}>{stats.pendingRequests}</div>
            <span style={{ fontSize: '0.72rem', color: '#64748b' }}>Awaiting Administrative Approval</span>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div style={{ padding: '20px 24px 0', display: 'flex', gap: '10px', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={() => setActiveTab('inventory')}
          style={{
            padding: '10px 18px',
            borderRadius: '8px 8px 0 0',
            fontWeight: 800,
            fontSize: '0.85rem',
            background: activeTab === 'inventory' ? 'rgba(56, 189, 248, 0.2)' : 'transparent',
            border: 'none',
            borderBottom: activeTab === 'inventory' ? '3px solid #38bdf8' : '3px solid transparent',
            color: activeTab === 'inventory' ? '#38bdf8' : '#94a3b8',
            cursor: 'pointer'
          }}
        >
          📦 Current Stock Catalog ({items.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('requisitions')}
          style={{
            padding: '10px 18px',
            borderRadius: '8px 8px 0 0',
            fontWeight: 800,
            fontSize: '0.85rem',
            background: activeTab === 'requisitions' ? 'rgba(168, 85, 247, 0.2)' : 'transparent',
            border: 'none',
            borderBottom: activeTab === 'requisitions' ? '3px solid #c084fc' : '3px solid transparent',
            color: activeTab === 'requisitions' ? '#c084fc' : '#94a3b8',
            cursor: 'pointer'
          }}
        >
          📝 Purchase Requisitions ({requests.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('newItem')}
          style={{
            padding: '10px 18px',
            borderRadius: '8px 8px 0 0',
            fontWeight: 800,
            fontSize: '0.85rem',
            background: activeTab === 'newItem' ? 'rgba(16, 185, 129, 0.2)' : 'transparent',
            border: 'none',
            borderBottom: activeTab === 'newItem' ? '3px solid #10b981' : '3px solid transparent',
            color: activeTab === 'newItem' ? '#10b981' : '#94a3b8',
            cursor: 'pointer'
          }}
        >
          ➕ Register New Item
        </button>
      </div>

      {/* Main Workspace Body */}
      <div style={{ padding: '20px 24px' }}>
        {/* TAB 1: STOCK CATALOG */}
        {activeTab === 'inventory' && (
          <div>
            {/* Filter & Search Bar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '18px', background: 'rgba(15, 23, 42, 0.6)', padding: '14px', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 700 }}>Category:</span>
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedCategory(cat.id)}
                    style={{
                      padding: '5px 12px',
                      borderRadius: '6px',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      background: selectedCategory === cat.id ? '#0284c7' : 'rgba(255, 255, 255, 0.06)',
                      color: selectedCategory === cat.id ? '#ffffff' : '#cbd5e1',
                      border: selectedCategory === cat.id ? '1px solid #38bdf8' : '1px solid transparent',
                      cursor: 'pointer'
                    }}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input
                  type="text"
                  placeholder="Search item name, SKU, or room..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') fetchItems(selectedCategory, searchQuery);
                  }}
                  style={{
                    background: 'rgba(2, 6, 23, 0.8)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    color: '#ffffff',
                    padding: '7px 12px',
                    borderRadius: '8px',
                    fontSize: '0.82rem',
                    width: '260px'
                  }}
                />
                <button
                  type="button"
                  onClick={() => fetchItems(selectedCategory, searchQuery)}
                  style={{
                    background: 'rgba(56, 189, 248, 0.2)',
                    border: '1px solid #38bdf8',
                    color: '#38bdf8',
                    padding: '7px 12px',
                    borderRadius: '8px',
                    fontWeight: 700,
                    fontSize: '0.82rem',
                    cursor: 'pointer'
                  }}
                >
                  🔍 Filter
                </button>
              </div>
            </div>

            {/* Inventory Table */}
            <div style={{ background: 'rgba(15, 23, 42, 0.8)', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.08)', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ background: 'rgba(2, 6, 23, 0.9)', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', color: '#94a3b8' }}>
                    <th style={{ padding: '12px 16px' }}>SKU Code</th>
                    <th style={{ padding: '12px 16px' }}>Item Description</th>
                    <th style={{ padding: '12px 16px' }}>Category</th>
                    <th style={{ padding: '12px 16px' }}>Stock Balance</th>
                    <th style={{ padding: '12px 16px' }}>Unit Price</th>
                    <th style={{ padding: '12px 16px' }}>Total Value</th>
                    <th style={{ padding: '12px 16px' }}>Storage Location</th>
                    <th style={{ padding: '12px 16px' }}>Status</th>
                    <th style={{ padding: '12px 16px', textAlign: 'center' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {items.length === 0 ? (
                    <tr>
                      <td colSpan="9" style={{ padding: '30px', textAlign: 'center', color: '#64748b' }}>
                        {loading ? 'Loading catalog items from database...' : 'No inventory items found matching filter.'}
                      </td>
                    </tr>
                  ) : (
                    items.map((item) => {
                      const totalItemValue = ((item.quantity_on_hand || 0) * (item.unit_price || 0)).toFixed(2);
                      const isLow = (item.quantity_on_hand || 0) <= (item.reorder_level || 10);
                      return (
                        <tr
                          key={item.id}
                          style={{
                            borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                            background: isLow ? 'rgba(239, 68, 68, 0.04)' : 'transparent'
                          }}
                        >
                          <td style={{ padding: '12px 16px', fontFamily: 'monospace', color: '#38bdf8', fontWeight: 700 }}>
                            {item.item_code}
                          </td>
                          <td style={{ padding: '12px 16px' }}>
                            <strong style={{ color: '#f8fafc', display: 'block' }}>{item.name}</strong>
                            <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                              Purchaser: {item.purchased_by_staff || 'Campus Procurement'}
                            </span>
                          </td>
                          <td style={{ padding: '12px 16px', color: '#cbd5e1' }}>
                            <span style={{ background: 'rgba(255, 255, 255, 0.06)', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem' }}>
                              {item.category}
                            </span>
                          </td>
                          <td style={{ padding: '12px 16px' }}>
                            <strong style={{ fontSize: '1rem', color: isLow ? '#f87171' : '#34d399' }}>
                              {item.quantity_on_hand}
                            </strong>{' '}
                            <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{item.unit || 'units'}</span>
                            <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Reorder at: {item.reorder_level}</div>
                          </td>
                          <td style={{ padding: '12px 16px', color: '#cbd5e1' }}>
                            GHS {parseFloat(item.unit_price || 0).toFixed(2)}
                          </td>
                          <td style={{ padding: '12px 16px', color: '#fbbf24', fontWeight: 700 }}>
                            GHS {Number(totalItemValue).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </td>
                          <td style={{ padding: '12px 16px', color: '#94a3b8', fontSize: '0.8rem' }}>
                            📍 {item.location || 'Depot'}
                          </td>
                          <td style={{ padding: '12px 16px' }}>
                            <span
                              style={{
                                background: isLow ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                                color: isLow ? '#fca5a5' : '#6ee7b7',
                                border: `1px solid ${isLow ? '#ef4444' : '#10b981'}`,
                                padding: '3px 8px',
                                borderRadius: '999px',
                                fontSize: '0.72rem',
                                fontWeight: 800
                              }}
                            >
                              {item.status || (isLow ? 'LOW_STOCK' : 'IN_STOCK')}
                            </span>
                          </td>
                          <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                            <div style={{ display: 'inline-flex', gap: '6px' }}>
                              <button
                                type="button"
                                onClick={() => openAdjustModal(item)}
                                style={{
                                  background: 'rgba(56, 189, 248, 0.15)',
                                  border: '1px solid #38bdf8',
                                  color: '#38bdf8',
                                  padding: '5px 10px',
                                  borderRadius: '6px',
                                  fontSize: '0.75rem',
                                  fontWeight: 700,
                                  cursor: 'pointer'
                                }}
                              >
                                ⚡ Adjust
                              </button>
                              <button
                                type="button"
                                onClick={() => navigateToDetail(navigate, 'inventory', item.id, item, { returnTab: 'inventory' })}
                                style={{
                                  background: 'rgba(255, 255, 255, 0.08)',
                                  border: '1px solid rgba(255, 255, 255, 0.2)',
                                  color: '#f8fafc',
                                  padding: '5px 10px',
                                  borderRadius: '6px',
                                  fontSize: '0.75rem',
                                  fontWeight: 700,
                                  cursor: 'pointer'
                                }}
                              >
                                🔍 Details
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: PURCHASE REQUISITIONS */}
        {activeTab === 'requisitions' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h3 style={{ margin: 0, color: '#c084fc', fontSize: '1.1rem' }}>
                  📝 Inter-Departmental Purchase Orders & Requisitions Queue
                </h3>
                <p style={{ margin: '2px 0 0', color: '#94a3b8', fontSize: '0.8rem' }}>
                  Faculty and department heads submit procurement requests here. Approved requisitions automatically increase depot inventory stock.
                </p>
              </div>
              <button
                type="button"
                className="btn-primary"
                onClick={() => setReqModalOpen(true)}
                style={{ background: 'linear-gradient(135deg, #a855f7, #7e22ce)', fontWeight: 800 }}
              >
                ➕ New Requisition
              </button>
            </div>

            <div style={{ background: 'rgba(15, 23, 42, 0.8)', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.08)', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ background: 'rgba(2, 6, 23, 0.9)', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', color: '#94a3b8' }}>
                    <th style={{ padding: '12px 16px' }}>Requisition #</th>
                    <th style={{ padding: '12px 16px' }}>Target Item</th>
                    <th style={{ padding: '12px 16px' }}>Requester / Department</th>
                    <th style={{ padding: '12px 16px' }}>Quantity</th>
                    <th style={{ padding: '12px 16px' }}>Estimated Cost</th>
                    <th style={{ padding: '12px 16px' }}>Urgency</th>
                    <th style={{ padding: '12px 16px' }}>Status</th>
                    <th style={{ padding: '12px 16px', textAlign: 'center' }}>Approval Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.length === 0 ? (
                    <tr>
                      <td colSpan="8" style={{ padding: '30px', textAlign: 'center', color: '#64748b' }}>
                        No purchase requisitions on record.
                      </td>
                    </tr>
                  ) : (
                    requests.map((req) => (
                      <tr key={req.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                        <td style={{ padding: '12px 16px', fontFamily: 'monospace', color: '#c084fc', fontWeight: 700 }}>
                          {req.request_number || `REQ-${req.id}`}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <strong style={{ color: '#f8fafc' }}>{req.item_name}</strong>
                          <p style={{ margin: '2px 0 0', fontSize: '0.74rem', color: '#94a3b8' }}>{req.notes || '—'}</p>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ color: '#f8fafc', fontWeight: 600 }}>{req.requester_name}</div>
                          <span style={{ fontSize: '0.72rem', color: '#38bdf8' }}>{req.department}</span>
                        </td>
                        <td style={{ padding: '12px 16px', fontWeight: 700, color: '#f8fafc' }}>
                          {req.quantity_requested} units
                        </td>
                        <td style={{ padding: '12px 16px', color: '#fbbf24', fontWeight: 700 }}>
                          GHS {req.total_estimated_cost ? Number(req.total_estimated_cost).toLocaleString() : '—'}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <span
                            style={{
                              padding: '2px 8px',
                              borderRadius: '4px',
                              fontSize: '0.72rem',
                              fontWeight: 800,
                              background: req.urgency === 'HIGH' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                              color: req.urgency === 'HIGH' ? '#fca5a5' : '#fcd34d'
                            }}
                          >
                            {req.urgency}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <span
                            style={{
                              padding: '3px 8px',
                              borderRadius: '999px',
                              fontSize: '0.72rem',
                              fontWeight: 800,
                              background:
                                req.status === 'APPROVED' || req.status === 'FULFILLED'
                                  ? 'rgba(16, 185, 129, 0.2)'
                                  : req.status === 'REJECTED'
                                  ? 'rgba(239, 68, 68, 0.2)'
                                  : 'rgba(56, 189, 248, 0.2)',
                              color:
                                req.status === 'APPROVED' || req.status === 'FULFILLED'
                                  ? '#6ee7b7'
                                  : req.status === 'REJECTED'
                                  ? '#fca5a5'
                                  : '#7dd3fc',
                              border: `1px solid ${
                                req.status === 'APPROVED' || req.status === 'FULFILLED'
                                  ? '#10b981'
                                  : req.status === 'REJECTED'
                                  ? '#ef4444'
                                  : '#38bdf8'
                              }`
                            }}
                          >
                            {req.status}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                          {req.status === 'PENDING' && (
                            <div style={{ display: 'inline-flex', gap: '6px' }}>
                              <button
                                type="button"
                                onClick={() => handleUpdateReqStatus(req.id, 'APPROVED')}
                                style={{
                                  background: 'linear-gradient(135deg, #10b981, #059669)',
                                  border: 'none',
                                  color: '#fff',
                                  padding: '5px 10px',
                                  borderRadius: '6px',
                                  fontSize: '0.75rem',
                                  fontWeight: 800,
                                  cursor: 'pointer'
                                }}
                              >
                                ✓ Approve
                              </button>
                              <button
                                type="button"
                                onClick={() => handleUpdateReqStatus(req.id, 'REJECTED')}
                                style={{
                                  background: 'rgba(239, 68, 68, 0.15)',
                                  border: '1px solid #ef4444',
                                  color: '#f87171',
                                  padding: '5px 8px',
                                  borderRadius: '6px',
                                  fontSize: '0.75rem',
                                  fontWeight: 700,
                                  cursor: 'pointer'
                                }}
                              >
                                ✕
                              </button>
                            </div>
                          )}
                          {req.status === 'APPROVED' && (
                            <button
                              type="button"
                              onClick={() => handleUpdateReqStatus(req.id, 'FULFILLED')}
                              style={{
                                background: 'linear-gradient(135deg, #0284c7, #06b6d4)',
                                border: 'none',
                                color: '#fff',
                                padding: '5px 10px',
                                borderRadius: '6px',
                                fontSize: '0.75rem',
                                fontWeight: 800,
                                cursor: 'pointer'
                              }}
                            >
                              📦 Mark Fulfilled
                            </button>
                          )}
                          {req.status === 'FULFILLED' && (
                            <span style={{ fontSize: '0.75rem', color: '#34d399', fontWeight: 800 }}>✓ Stock Updated</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: REGISTER NEW ITEM */}
        {activeTab === 'newItem' && (
          <div style={{ maxWidth: '800px', margin: '0 auto', background: 'rgba(15, 23, 42, 0.85)', padding: '24px', borderRadius: '14px', border: '1px solid rgba(56, 189, 248, 0.3)' }}>
            <h3 style={{ margin: '0 0 8px', color: '#38bdf8', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>➕</span> Register New Inventory Asset / Stock Item
            </h3>
            <p style={{ margin: '0 0 20px', color: '#94a3b8', fontSize: '0.82rem' }}>
              Fill out all technical specifications to introduce a new stock keeping unit (SKU) into the institution depot database.
            </p>

            <form onSubmit={handleCreateItem}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: '#94a3b8', marginBottom: '4px', fontWeight: 700 }}>
                    Item SKU Code *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. INV-SCI-808"
                    value={newItem.itemCode}
                    onChange={(e) => setNewItem({ ...newItem, itemCode: e.target.value })}
                    style={{ width: '100%', background: 'rgba(2, 6, 23, 0.8)', border: '1px solid rgba(255, 255, 255, 0.15)', color: '#fff', padding: '9px 12px', borderRadius: '8px', fontSize: '0.85rem' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: '#94a3b8', marginBottom: '4px', fontWeight: 700 }}>
                    Item Name & Description *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Optical Compound Microscope 1000x"
                    value={newItem.name}
                    onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                    style={{ width: '100%', background: 'rgba(2, 6, 23, 0.8)', border: '1px solid rgba(255, 255, 255, 0.15)', color: '#fff', padding: '9px 12px', borderRadius: '8px', fontSize: '0.85rem' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: '#94a3b8', marginBottom: '4px', fontWeight: 700 }}>
                    Inventory Category *
                  </label>
                  <select
                    value={newItem.category}
                    onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}
                    style={{ width: '100%', background: 'rgba(2, 6, 23, 0.8)', border: '1px solid rgba(255, 255, 255, 0.15)', color: '#fff', padding: '9px 12px', borderRadius: '8px', fontSize: '0.85rem' }}
                  >
                    {CATEGORIES.filter((c) => c.id !== 'ALL').map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: '#94a3b8', marginBottom: '4px', fontWeight: 700 }}>
                    Unit of Measurement
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. PIECES, BOXES, REAMS"
                    value={newItem.unit}
                    onChange={(e) => setNewItem({ ...newItem, unit: e.target.value })}
                    style={{ width: '100%', background: 'rgba(2, 6, 23, 0.8)', border: '1px solid rgba(255, 255, 255, 0.15)', color: '#fff', padding: '9px 12px', borderRadius: '8px', fontSize: '0.85rem' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: '#94a3b8', marginBottom: '4px', fontWeight: 700 }}>
                    Initial Quantity on Hand
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={newItem.quantityOnHand}
                    onChange={(e) => setNewItem({ ...newItem, quantityOnHand: e.target.value })}
                    style={{ width: '100%', background: 'rgba(2, 6, 23, 0.8)', border: '1px solid rgba(255, 255, 255, 0.15)', color: '#fff', padding: '9px 12px', borderRadius: '8px', fontSize: '0.85rem' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: '#94a3b8', marginBottom: '4px', fontWeight: 700 }}>
                    Reorder Alert Level
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={newItem.reorderLevel}
                    onChange={(e) => setNewItem({ ...newItem, reorderLevel: e.target.value })}
                    style={{ width: '100%', background: 'rgba(2, 6, 23, 0.8)', border: '1px solid rgba(255, 255, 255, 0.15)', color: '#fff', padding: '9px 12px', borderRadius: '8px', fontSize: '0.85rem' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: '#94a3b8', marginBottom: '4px', fontWeight: 700 }}>
                    Unit Purchase Price (GHS)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={newItem.unitPrice}
                    onChange={(e) => setNewItem({ ...newItem, unitPrice: e.target.value })}
                    style={{ width: '100%', background: 'rgba(2, 6, 23, 0.8)', border: '1px solid rgba(255, 255, 255, 0.15)', color: '#fff', padding: '9px 12px', borderRadius: '8px', fontSize: '0.85rem' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: '#94a3b8', marginBottom: '4px', fontWeight: 700 }}>
                    Storage / Room Location
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Science Storeroom B1, Locker 3"
                    value={newItem.location}
                    onChange={(e) => setNewItem({ ...newItem, location: e.target.value })}
                    style={{ width: '100%', background: 'rgba(2, 6, 23, 0.8)', border: '1px solid rgba(255, 255, 255, 0.15)', color: '#fff', padding: '9px 12px', borderRadius: '8px', fontSize: '0.85rem' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: '#94a3b8', marginBottom: '4px', fontWeight: 700 }}>
                    Procuring Staff Member
                  </label>
                  <input
                    type="text"
                    value={newItem.purchasedByStaff}
                    onChange={(e) => setNewItem({ ...newItem, purchasedByStaff: e.target.value })}
                    style={{ width: '100%', background: 'rgba(2, 6, 23, 0.8)', border: '1px solid rgba(255, 255, 255, 0.15)', color: '#fff', padding: '9px 12px', borderRadius: '8px', fontSize: '0.85rem' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: '#94a3b8', marginBottom: '4px', fontWeight: 700 }}>
                    Purchasing Department
                  </label>
                  <input
                    type="text"
                    value={newItem.purchaserDept}
                    onChange={(e) => setNewItem({ ...newItem, purchaserDept: e.target.value })}
                    style={{ width: '100%', background: 'rgba(2, 6, 23, 0.8)', border: '1px solid rgba(255, 255, 255, 0.15)', color: '#fff', padding: '9px 12px', borderRadius: '8px', fontSize: '0.85rem' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '16px' }}>
                <button
                  type="button"
                  onClick={() => setActiveTab('inventory')}
                  style={{ background: 'rgba(255, 255, 255, 0.08)', border: '1px solid rgba(255, 255, 255, 0.2)', color: '#cbd5e1', padding: '9px 18px', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ background: 'linear-gradient(135deg, #10b981, #059669)', border: 'none', color: '#fff', padding: '9px 24px', borderRadius: '8px', fontWeight: 800, cursor: 'pointer', boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)' }}
                >
                  💾 Save Item to Database
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* MODAL: ADJUST STOCK */}
      {adjustModalOpen && selectedItemForAdjust && (
        <div className="role-modal-overlay" onClick={() => setAdjustModalOpen(false)}>
          <div className="role-modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px' }}>
            <div className="modal-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ margin: 0, color: '#38bdf8' }}>⚡ Stock Level Adjustment</h3>
              <button type="button" onClick={() => setAdjustModalOpen(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '1.2rem', cursor: 'pointer' }}>
                ✕
              </button>
            </div>

            <div style={{ background: 'rgba(2, 6, 23, 0.6)', padding: '12px', borderRadius: '8px', marginBottom: '14px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
              <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>Target SKU: <strong>{selectedItemForAdjust.item_code}</strong></div>
              <strong style={{ color: '#f8fafc', fontSize: '0.95rem' }}>{selectedItemForAdjust.name}</strong>
              <div style={{ marginTop: '4px', fontSize: '0.85rem' }}>
                Current Balance: <strong style={{ color: '#34d399' }}>{selectedItemForAdjust.quantity_on_hand}</strong> {selectedItemForAdjust.unit || 'units'}
              </div>
            </div>

            <form onSubmit={handleAdjustStock}>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '0.78rem', color: '#94a3b8', marginBottom: '4px' }}>
                  Quantity Adjustment Delta (+ to Restock, - for Issuance / Damaged)
                </label>
                <input
                  type="number"
                  required
                  value={adjustmentDelta}
                  onChange={(e) => setAdjustmentDelta(e.target.value)}
                  style={{ width: '100%', background: 'rgba(2, 6, 23, 0.8)', border: '1px solid rgba(255, 255, 255, 0.15)', color: '#fff', padding: '9px 12px', borderRadius: '8px', fontSize: '0.9rem' }}
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '0.78rem', color: '#94a3b8', marginBottom: '4px' }}>
                  Audit Reason / Source Memo
                </label>
                <select
                  value={adjustmentReason}
                  onChange={(e) => setAdjustmentReason(e.target.value)}
                  style={{ width: '100%', background: 'rgba(2, 6, 23, 0.8)', border: '1px solid rgba(255, 255, 255, 0.15)', color: '#fff', padding: '9px 12px', borderRadius: '8px', fontSize: '0.85rem' }}
                >
                  <option value="Shipment Delivery Restock">📦 Shipment Delivery Restock</option>
                  <option value="Classroom Distribution">🎓 Classroom / Exam Distribution</option>
                  <option value="Physical Cycle Count Audit">📋 Physical Cycle Count Audit Correction</option>
                  <option value="Damaged / Broken in Lab">⚠️ Damaged / Depleted in Practical Lab</option>
                  <option value="Transfer to Branch Annex">🏛️ Transfer to Branch Campus</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setAdjustModalOpen(false)}
                  style={{ background: 'rgba(255, 255, 255, 0.08)', border: '1px solid rgba(255, 255, 255, 0.2)', color: '#cbd5e1', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ background: 'linear-gradient(135deg, #0284c7, #06b6d4)', border: 'none', color: '#fff', padding: '8px 20px', borderRadius: '8px', fontWeight: 800, cursor: 'pointer' }}
                >
                  Commit Adjustment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: SUBMIT PURCHASE REQUISITION */}
      {reqModalOpen && (
        <div className="role-modal-overlay" onClick={() => setReqModalOpen(false)}>
          <div className="role-modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px' }}>
            <div className="modal-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ margin: 0, color: '#c084fc' }}>📝 New Purchase Requisition</h3>
              <button type="button" onClick={() => setReqModalOpen(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '1.2rem', cursor: 'pointer' }}>
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateRequisition}>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '0.78rem', color: '#94a3b8', marginBottom: '4px' }}>
                  Target Catalog Item *
                </label>
                <select
                  value={newRequisition.itemId}
                  onChange={(e) => setNewRequisition({ ...newRequisition, itemId: e.target.value })}
                  style={{ width: '100%', background: 'rgba(2, 6, 23, 0.8)', border: '1px solid rgba(255, 255, 255, 0.15)', color: '#fff', padding: '9px 12px', borderRadius: '8px', fontSize: '0.85rem' }}
                >
                  {items.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.item_code} — {i.name} (In Stock: {i.quantity_on_hand})
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: '#94a3b8', marginBottom: '4px' }}>
                    Quantity Requested
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={newRequisition.quantityRequested}
                    onChange={(e) => setNewRequisition({ ...newRequisition, quantityRequested: e.target.value })}
                    style={{ width: '100%', background: 'rgba(2, 6, 23, 0.8)', border: '1px solid rgba(255, 255, 255, 0.15)', color: '#fff', padding: '9px 12px', borderRadius: '8px', fontSize: '0.85rem' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: '#94a3b8', marginBottom: '4px' }}>
                    Urgency Priority
                  </label>
                  <select
                    value={newRequisition.urgency}
                    onChange={(e) => setNewRequisition({ ...newRequisition, urgency: e.target.value })}
                    style={{ width: '100%', background: 'rgba(2, 6, 23, 0.8)', border: '1px solid rgba(255, 255, 255, 0.15)', color: '#fff', padding: '9px 12px', borderRadius: '8px', fontSize: '0.85rem' }}
                  >
                    <option value="LOW">Low (Standard replenishment)</option>
                    <option value="MEDIUM">Medium (Academic requirement)</option>
                    <option value="HIGH">High (Immediate examination / clinic necessity)</option>
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '0.78rem', color: '#94a3b8', marginBottom: '4px' }}>
                  Requester Name
                </label>
                <input
                  type="text"
                  required
                  value={newRequisition.requesterName}
                  onChange={(e) => setNewRequisition({ ...newRequisition, requesterName: e.target.value })}
                  style={{ width: '100%', background: 'rgba(2, 6, 23, 0.8)', border: '1px solid rgba(255, 255, 255, 0.15)', color: '#fff', padding: '9px 12px', borderRadius: '8px', fontSize: '0.85rem' }}
                />
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '0.78rem', color: '#94a3b8', marginBottom: '4px' }}>
                  Justification / Operational Notes
                </label>
                <textarea
                  rows="3"
                  value={newRequisition.notes}
                  onChange={(e) => setNewRequisition({ ...newRequisition, notes: e.target.value })}
                  placeholder="State academic reason or intended cohort usage..."
                  style={{ width: '100%', background: 'rgba(2, 6, 23, 0.8)', border: '1px solid rgba(255, 255, 255, 0.15)', color: '#fff', padding: '9px 12px', borderRadius: '8px', fontSize: '0.85rem' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setReqModalOpen(false)}
                  style={{ background: 'rgba(255, 255, 255, 0.08)', border: '1px solid rgba(255, 255, 255, 0.2)', color: '#cbd5e1', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ background: 'linear-gradient(135deg, #a855f7, #7e22ce)', border: 'none', color: '#fff', padding: '8px 20px', borderRadius: '8px', fontWeight: 800, cursor: 'pointer' }}
                >
                  Submit Order
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

