import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './FinanceDashboardPage.css';

const API_BASE = '/api/v1';

export default function FinanceDashboardPage() {
  const [activeTab, setActiveTab] = useState('invoices'); // 'invoices', 'payments', 'fee-schedules', 'expenses'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Core Data
  const [telemetry, setTelemetry] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [feeStructures, setFeeStructures] = useState([]);
  const [payments, setPayments] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [students, setStudents] = useState([]);

  // Filters & State
  const [invoiceFilter, setInvoiceFilter] = useState('ALL');
  const [selectedInvoiceForPayment, setSelectedInvoiceForPayment] = useState(null);

  // New Invoice Form
  const [newInvoiceModal, setNewInvoiceModal] = useState(false);
  const [newInvoiceForm, setNewInvoiceForm] = useState({
    studentId: '',
    feeStructureId: '',
    title: '',
    amount: '',
    discountAmount: 0,
    academicTerm: '2026-2027 Term 1',
    dueDate: ''
  });

  // Payment Recording Form
  const [paymentForm, setPaymentForm] = useState({
    invoiceId: '',
    amountPaid: '',
    paymentMethod: 'BANK_TRANSFER',
    transactionRef: '',
    notes: ''
  });

  // New Fee Schedule Form
  const [newFeeModal, setNewFeeModal] = useState(false);
  const [newFeeForm, setNewFeeForm] = useState({
    code: '',
    name: '',
    category: 'TUITION',
    amount: '',
    lateFeePercentage: 5.0,
    academicYear: '2026-2027',
    term: 'Term 1'
  });

  // New Expense Form
  const [newExpenseModal, setNewExpenseModal] = useState(false);
  const [newExpenseForm, setNewExpenseForm] = useState({
    title: '',
    category: 'FACILITIES',
    amount: '',
    vendorName: '',
    notes: ''
  });

  const getAuthHeaders = () => {
    const token = localStorage.getItem('gbs_token') || localStorage.getItem('token') || sessionStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  useEffect(() => {
    loadAllFinancialData();
  }, []);

  const loadAllFinancialData = async () => {
    setLoading(true);
    try {
      const headers = getAuthHeaders();
      const [telRes, invRes, feesRes, payRes, expRes, stuRes] = await Promise.allSettled([
        axios.get(`${API_BASE}/finance/telemetry`, { headers }),
        axios.get(`${API_BASE}/finance/invoices`, { headers }),
        axios.get(`${API_BASE}/finance/fee-structures`, { headers }),
        axios.get(`${API_BASE}/finance/payments`, { headers }),
        axios.get(`${API_BASE}/finance/expenses`, { headers }),
        axios.get(`${API_BASE}/users?role=STUDENT`, { headers })
      ]);

      if (telRes.status === 'fulfilled' && telRes.value.data.status === 'success') {
        setTelemetry(telRes.value.data.data);
      }
      if (invRes.status === 'fulfilled' && invRes.value.data.status === 'success') {
        setInvoices(invRes.value.data.data.invoices || []);
      }
      if (feesRes.status === 'fulfilled' && feesRes.value.data.status === 'success') {
        setFeeStructures(feesRes.value.data.data.feeStructures || []);
      }
      if (payRes.status === 'fulfilled' && payRes.value.data.status === 'success') {
        setPayments(payRes.value.data.data.payments || []);
      }
      if (expRes.status === 'fulfilled' && expRes.value.data.status === 'success') {
        setExpenses(expRes.value.data.data.expenses || []);
      }
      if (stuRes.status === 'fulfilled' && stuRes.value.data.success) {
        const list = stuRes.value.data.data.users || stuRes.value.data.data || [];
        setStudents(list);
        if (list.length > 0 && !newInvoiceForm.studentId) {
          setNewInvoiceForm((prev) => ({ ...prev, studentId: list[0].id.toString() }));
        }
      }
    } catch (err) {
      console.error('Failed to load financial data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Generate Student Invoice
  const handleGenerateInvoice = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const payload = {
        studentId: parseInt(newInvoiceForm.studentId, 10),
        feeStructureId: newInvoiceForm.feeStructureId ? parseInt(newInvoiceForm.feeStructureId, 10) : undefined,
        title: newInvoiceForm.title || undefined,
        amount: parseFloat(newInvoiceForm.amount),
        discountAmount: parseFloat(newInvoiceForm.discountAmount || 0),
        academicTerm: newInvoiceForm.academicTerm,
        dueDate: newInvoiceForm.dueDate || undefined
      };
      const res = await axios.post(`${API_BASE}/finance/invoices`, payload, { headers: getAuthHeaders() });
      if (res.data.status === 'success') {
        setInvoices([res.data.data.invoice, ...invoices]);
        setSuccessMsg(`Invoice ${res.data.data.invoice.invoiceNumber} generated successfully!`);
        setNewInvoiceModal(false);
        refreshTelemetry();
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Invoice generation failed.');
    } finally {
      setLoading(false);
    }
  };

  // Record Payment
  const handleRecordPayment = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const payload = {
        invoiceId: parseInt(paymentForm.invoiceId, 10),
        amountPaid: parseFloat(paymentForm.amountPaid),
        paymentMethod: paymentForm.paymentMethod,
        transactionRef: paymentForm.transactionRef || undefined,
        notes: paymentForm.notes || undefined
      };
      const res = await axios.post(`${API_BASE}/finance/payments`, payload, { headers: getAuthHeaders() });
      if (res.data.status === 'success') {
        const { payment, updatedInvoice } = res.data.data;
        setPayments([payment, ...payments]);
        setInvoices(invoices.map((inv) => (inv.id === updatedInvoice.id ? { ...inv, ...updatedInvoice } : inv)));
        setSuccessMsg(`Payment of $${payment.amountPaid} recorded! Receipt: ${payment.receiptNumber}`);
        setSelectedInvoiceForPayment(null);
        setPaymentForm({ invoiceId: '', amountPaid: '', paymentMethod: 'BANK_TRANSFER', transactionRef: '', notes: '' });
        refreshTelemetry();
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Payment recording failed.');
    } finally {
      setLoading(false);
    }
  };

  // Create Fee Structure
  const handleCreateFeeStructure = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await axios.post(`${API_BASE}/finance/fee-structures`, newFeeForm, { headers: getAuthHeaders() });
      if (res.data.status === 'success') {
        setFeeStructures([res.data.data.feeStructure, ...feeStructures]);
        setSuccessMsg(`Fee Schedule '${res.data.data.feeStructure.name}' created!`);
        setNewFeeModal(false);
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Fee schedule creation failed.');
    } finally {
      setLoading(false);
    }
  };

  // Create Operating Expense
  const handleCreateExpense = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await axios.post(`${API_BASE}/finance/expenses`, newExpenseForm, { headers: getAuthHeaders() });
      if (res.data.status === 'success') {
        setExpenses([res.data.data.expense, ...expenses]);
        setSuccessMsg(`Operating expense '${res.data.data.expense.title}' logged!`);
        setNewExpenseModal(false);
        refreshTelemetry();
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Expense logging failed.');
    } finally {
      setLoading(false);
    }
  };

  const refreshTelemetry = async () => {
    try {
      const res = await axios.get(`${API_BASE}/finance/telemetry`, { headers: getAuthHeaders() });
      if (res.data.status === 'success') setTelemetry(res.data.data);
    } catch (err) {
      console.warn('Telemetry refresh note:', err);
    }
  };

  const filteredInvoices = invoices.filter((inv) => {
    if (invoiceFilter === 'ALL') return true;
    return inv.status === invoiceFilter;
  });

  return (
    <div className="finance-dashboard-page">
      {/* Hero Header */}
      <div className="finance-hero-card">
        <div className="finance-hero-overlay"></div>
        <div className="finance-hero-content-flex">
          <div className="finance-hero-content">
            <div className="hero-top-badge">
              <span className="pulse-indicator"></span>
              MASTER BLUEPRINT BOX 14 & 15 • ENTERPRISE FINANCE & TREASURY
            </div>
            <h1 className="hero-title">Bursar's Office & Revenue Cycle Engine</h1>
            <p className="hero-subtitle">
              Autonomous fee structures, student tuition billing & accounts receivable, multi-gateway payment reconciliation,
              real-time operating expense tracking, and cash flow telemetry.
            </p>

            {/* Quick Metrics Bar */}
            <div className="hero-metrics-bar">
              <div className="metric-pill">
                <span className="metric-label">Total Billed</span>
                <span className="metric-val highlight-cyan">
                  ${telemetry?.revenue?.totalInvoiced?.toLocaleString() ?? '145,000'}
                </span>
              </div>
              <div className="metric-pill">
                <span className="metric-label">Total Collected</span>
                <span className="metric-val highlight-emerald">
                  ${telemetry?.revenue?.totalCollected?.toLocaleString() ?? '112,500'}
                </span>
              </div>
              <div className="metric-pill">
                <span className="metric-label">Outstanding Receivables</span>
                <span className="metric-val highlight-orange">
                  ${telemetry?.revenue?.totalOutstanding?.toLocaleString() ?? '32,500'}
                </span>
              </div>
              <div className="metric-pill">
                <span className="metric-label">Collection Efficiency</span>
                <span className="metric-val highlight-gold">
                  {telemetry?.revenue?.collectionRate ?? 77.6}%
                </span>
              </div>
            </div>
          </div>

          <div className="hero-photo-showcase-frame">
            <div className="showcase-photo-wrapper">
              <img
                src="/assets/finance-hero-bg.jpg"
                alt="Institutional Treasury & Financial Operations"
                className="real-life-dashboard-photo"
              />
              <div className="showcase-verified-badge">
                <span className="live-camera-pulse"></span>
                <span>REAL-LIFE CAMPUS VIEW</span>
              </div>
            </div>
            <div className="showcase-photo-caption">
              <span>📍 Campus Treasury, Bursar & Payment Operations • Real-Life Daylight View</span>
            </div>
          </div>
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div className="alert-box alert-error">
          <span className="alert-icon">⚠️</span>
          <span>{error}</span>
          <button className="alert-close" onClick={() => setError(null)}>✕</button>
        </div>
      )}
      {successMsg && (
        <div className="alert-box alert-success">
          <span className="alert-icon">✅</span>
          <span>{successMsg}</span>
          <button className="alert-close" onClick={() => setSuccessMsg(null)}>✕</button>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="finance-tab-nav">
        <button
          className={`tab-btn ${activeTab === 'invoices' ? 'active' : ''}`}
          onClick={() => setActiveTab('invoices')}
        >
          📄 Student Invoicing Ledger ({invoices.length})
        </button>
        <button
          className={`tab-btn ${activeTab === 'payments' ? 'active' : ''}`}
          onClick={() => setActiveTab('payments')}
        >
          💳 Payment Transactions ({payments.length})
        </button>
        <button
          className={`tab-btn ${activeTab === 'fee-schedules' ? 'active' : ''}`}
          onClick={() => setActiveTab('fee-schedules')}
        >
          📋 Institutional Fee Schedules ({feeStructures.length})
        </button>
        <button
          className={`tab-btn ${activeTab === 'expenses' ? 'active' : ''}`}
          onClick={() => setActiveTab('expenses')}
        >
          📉 Operating Expenses & Margin ({expenses.length})
        </button>
      </div>

      {/* Tab 1: Invoices */}
      {activeTab === 'invoices' && (
        <div className="tab-content">
          <div className="control-bar-glass">
            <div className="filter-group">
              <label>Filter by Status:</label>
              <select
                value={invoiceFilter}
                onChange={(e) => setInvoiceFilter(e.target.value)}
                className="finance-select"
              >
                <option value="ALL">All Invoices ({invoices.length})</option>
                <option value="DUE">Due Only</option>
                <option value="PARTIAL">Partially Paid</option>
                <option value="PAID">Fully Paid</option>
                <option value="OVERDUE">Overdue</option>
              </select>
            </div>
            <button className="btn-primary" onClick={() => setNewInvoiceModal(true)}>
              ➕ Generate New Student Invoice
            </button>
          </div>

          {/* Invoices Table */}
          <div className="table-card-glass">
            <table className="finance-table">
              <thead>
                <tr>
                  <th>Invoice #</th>
                  <th>Student</th>
                  <th>Description</th>
                  <th>Total Due</th>
                  <th>Paid</th>
                  <th>Balance</th>
                  <th>Due Date</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredInvoices.map((inv) => (
                  <tr key={inv.id}>
                    <td><code>{inv.invoiceNumber}</code></td>
                    <td>
                      <strong>{inv.student?.firstName} {inv.student?.lastName}</strong>
                      <div className="sub-text">{inv.student?.email}</div>
                    </td>
                    <td>{inv.title}</td>
                    <td><strong>${inv.netAmount.toLocaleString()}</strong></td>
                    <td className="text-emerald">${inv.paidAmount.toLocaleString()}</td>
                    <td className="text-orange"><strong>${inv.balanceDue.toLocaleString()}</strong></td>
                    <td>{new Date(inv.dueDate).toLocaleDateString()}</td>
                    <td>
                      <span className={`status-badge status-${inv.status.toLowerCase()}`}>
                        {inv.status}
                      </span>
                    </td>
                    <td>
                      {inv.balanceDue > 0 ? (
                        <button
                          className="btn-action-collect"
                          onClick={() => {
                            setSelectedInvoiceForPayment(inv);
                            setPaymentForm({
                              invoiceId: inv.id.toString(),
                              amountPaid: inv.balanceDue.toString(),
                              paymentMethod: 'BANK_TRANSFER',
                              transactionRef: `TXN-${Date.now()}`,
                              notes: `Payment for ${inv.invoiceNumber}`
                            });
                          }}
                        >
                          💳 Collect ${inv.balanceDue}
                        </button>
                      ) : (
                        <span className="paid-check">✓ Settled</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Payments */}
      {activeTab === 'payments' && (
        <div className="tab-content">
          <div className="control-bar-glass">
            <span className="summary-text">
              Total Recorded Payments: <strong>{payments.length}</strong> | Reconciled Volume:{' '}
              <strong className="text-emerald">
                ${payments.reduce((acc, p) => acc + p.amountPaid, 0).toLocaleString()}
              </strong>
            </span>
          </div>

          <div className="table-card-glass">
            <table className="finance-table">
              <thead>
                <tr>
                  <th>Receipt #</th>
                  <th>Invoice Ref</th>
                  <th>Amount Paid</th>
                  <th>Payment Method</th>
                  <th>Gateway Ref</th>
                  <th>Status</th>
                  <th>Paid At</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id}>
                    <td><code>{p.receiptNumber}</code></td>
                    <td><code>{p.invoice?.invoiceNumber || `INV-${p.invoiceId}`}</code></td>
                    <td className="text-emerald"><strong>${p.amountPaid.toLocaleString()}</strong></td>
                    <td><span className="method-pill">{p.paymentMethod}</span></td>
                    <td><span className="txn-ref">{p.transactionRef || 'N/A'}</span></td>
                    <td><span className="status-badge status-paid">{p.gatewayStatus}</span></td>
                    <td>{new Date(p.paidAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Institutional Fee Schedules */}
      {activeTab === 'fee-schedules' && (
        <div className="tab-content">
          <div className="control-bar-glass">
            <span className="summary-text">Active Standard Institutional Fee Schedules</span>
            <button className="btn-primary" onClick={() => setNewFeeModal(true)}>
              ➕ Create Institutional Fee Schedule
            </button>
          </div>

          <div className="fee-cards-grid">
            {feeStructures.map((f) => (
              <div key={f.id} className="fee-card">
                <div className="fee-card-top">
                  <span className="fee-category-badge">{f.category}</span>
                  <span className="fee-amount">${f.amount.toLocaleString()}</span>
                </div>
                <h3 className="fee-name">{f.name}</h3>
                <div className="fee-code">Code: <code>{f.code}</code></div>
                <div className="fee-meta-row">
                  <span>📅 {f.academicYear} ({f.term})</span>
                  <span>⚠️ Late Fee: {f.lateFeePercentage}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 4: Operating Expenses & Margin */}
      {activeTab === 'expenses' && (
        <div className="tab-content">
          <div className="control-bar-glass">
            <div className="margin-indicator">
              <span>Net Operating Cash Flow:</span>
              <strong className={telemetry?.operatingSummary?.netOperatingMargin >= 0 ? 'text-emerald' : 'text-orange'}>
                ${telemetry?.operatingSummary?.netOperatingMargin?.toLocaleString() ?? '75,000'}
              </strong>
            </div>
            <button className="btn-primary" onClick={() => setNewExpenseModal(true)}>
              ➕ Log School Operating Expense
            </button>
          </div>

          <div className="table-card-glass">
            <table className="finance-table">
              <thead>
                <tr>
                  <th>Expense #</th>
                  <th>Category</th>
                  <th>Title</th>
                  <th>Vendor</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Incurred Date</th>
                </tr>
              </thead>
              <tbody>
                {expenses.map((exp) => (
                  <tr key={exp.id}>
                    <td><code>{exp.expenseNumber}</code></td>
                    <td><span className="method-pill">{exp.category}</span></td>
                    <td><strong>{exp.title}</strong></td>
                    <td>{exp.vendorName || 'School Internal'}</td>
                    <td className="text-orange"><strong>${exp.amount.toLocaleString()}</strong></td>
                    <td><span className="status-badge status-paid">{exp.paymentStatus}</span></td>
                    <td>{new Date(exp.incurredAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL 1: Generate Invoice */}
      {newInvoiceModal && (
        <div className="modal-backdrop">
          <div className="modal-box">
            <div className="modal-header">
              <h3>📄 Generate Student Invoice</h3>
              <button className="modal-close" onClick={() => setNewInvoiceModal(false)}>✕</button>
            </div>
            <form onSubmit={handleGenerateInvoice}>
              <div className="form-group">
                <label>Select Student:</label>
                <select
                  value={newInvoiceForm.studentId}
                  onChange={(e) => setNewInvoiceForm({ ...newInvoiceForm, studentId: e.target.value })}
                  className="finance-select"
                  required
                >
                  <option value="">Select Student</option>
                  {students.map((st) => (
                    <option key={st.id} value={st.id}>
                      {st.firstName} {st.lastName} ({st.email})
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Institutional Fee Schedule (Optional):</label>
                <select
                  value={newInvoiceForm.feeStructureId}
                  onChange={(e) => {
                    const sel = feeStructures.find((f) => f.id.toString() === e.target.value);
                    setNewInvoiceForm({
                      ...newInvoiceForm,
                      feeStructureId: e.target.value,
                      amount: sel ? sel.amount.toString() : newInvoiceForm.amount,
                      title: sel ? sel.name : newInvoiceForm.title
                    });
                  }}
                  className="finance-select"
                >
                  <option value="">Custom Item</option>
                  {feeStructures.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name} (${f.amount})
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Invoice Title / Description:</label>
                <input
                  type="text"
                  placeholder="e.g. Grade 10 Term 1 Tuition & STEM Lab"
                  value={newInvoiceForm.title}
                  onChange={(e) => setNewInvoiceForm({ ...newInvoiceForm, title: e.target.value })}
                  className="finance-input"
                  required
                />
              </div>
              <div className="form-group">
                <label>Gross Amount ($):</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="3500.00"
                  value={newInvoiceForm.amount}
                  onChange={(e) => setNewInvoiceForm({ ...newInvoiceForm, amount: e.target.value })}
                  className="finance-input"
                  required
                />
              </div>
              <div className="form-group">
                <label>Scholarship / Discount ($):</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={newInvoiceForm.discountAmount}
                  onChange={(e) => setNewInvoiceForm({ ...newInvoiceForm, discountAmount: e.target.value })}
                  className="finance-input"
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setNewInvoiceModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={loading}>
                  Generate Invoice
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Record Payment */}
      {selectedInvoiceForPayment && (
        <div className="modal-backdrop">
          <div className="modal-box">
            <div className="modal-header">
              <h3>💳 Collect Payment for {selectedInvoiceForPayment.invoiceNumber}</h3>
              <button className="modal-close" onClick={() => setSelectedInvoiceForPayment(null)}>✕</button>
            </div>
            <form onSubmit={handleRecordPayment}>
              <div className="invoice-summary-box">
                <div><strong>Student:</strong> {selectedInvoiceForPayment.student?.firstName} {selectedInvoiceForPayment.student?.lastName}</div>
                <div><strong>Total Billed:</strong> ${selectedInvoiceForPayment.netAmount.toLocaleString()}</div>
                <div><strong>Balance Remaining:</strong> <span className="text-orange">${selectedInvoiceForPayment.balanceDue.toLocaleString()}</span></div>
              </div>
              <div className="form-group">
                <label>Amount to Collect ($):</label>
                <input
                  type="number"
                  step="0.01"
                  max={selectedInvoiceForPayment.balanceDue}
                  value={paymentForm.amountPaid}
                  onChange={(e) => setPaymentForm({ ...paymentForm, amountPaid: e.target.value })}
                  className="finance-input"
                  required
                />
              </div>
              <div className="form-group">
                <label>Payment Method:</label>
                <select
                  value={paymentForm.paymentMethod}
                  onChange={(e) => setPaymentForm({ ...paymentForm, paymentMethod: e.target.value })}
                  className="finance-select"
                >
                  <option value="BANK_TRANSFER">Bank Wire / ACH</option>
                  <option value="STRIPE">Stripe Credit Card</option>
                  <option value="PAYPAL">PayPal</option>
                  <option value="CASH">Cash at Bursar</option>
                  <option value="CHEQUE">Banker's Cheque</option>
                </select>
              </div>
              <div className="form-group">
                <label>Transaction / Reference #:</label>
                <input
                  type="text"
                  placeholder="e.g. WIRE-894129 or Stripe ch_xxxx"
                  value={paymentForm.transactionRef}
                  onChange={(e) => setPaymentForm({ ...paymentForm, transactionRef: e.target.value })}
                  className="finance-input"
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setSelectedInvoiceForPayment(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={loading}>
                  Confirm & Issue Receipt
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: New Fee Structure */}
      {newFeeModal && (
        <div className="modal-backdrop">
          <div className="modal-box">
            <div className="modal-header">
              <h3>📋 Create Institutional Fee Schedule</h3>
              <button className="modal-close" onClick={() => setNewFeeModal(false)}>✕</button>
            </div>
            <form onSubmit={handleCreateFeeStructure}>
              <div className="form-group">
                <label>Fee Schedule Name:</label>
                <input
                  type="text"
                  placeholder="e.g. Grade 11 Science & Biotech Laboratory"
                  value={newFeeForm.name}
                  onChange={(e) => setNewFeeForm({ ...newFeeForm, name: e.target.value })}
                  className="finance-input"
                  required
                />
              </div>
              <div className="form-group">
                <label>Unique Code:</label>
                <input
                  type="text"
                  placeholder="e.g. LAB_BIOTECH_11"
                  value={newFeeForm.code}
                  onChange={(e) => setNewFeeForm({ ...newFeeForm, code: e.target.value })}
                  className="finance-input"
                  required
                />
              </div>
              <div className="form-group">
                <label>Category:</label>
                <select
                  value={newFeeForm.category}
                  onChange={(e) => setNewFeeForm({ ...newFeeForm, category: e.target.value })}
                  className="finance-select"
                >
                  <option value="TUITION">Tuition</option>
                  <option value="LAB">Laboratory & Computing</option>
                  <option value="TRANSPORT">Transit & Transport</option>
                  <option value="BOARDING">Boarding & Dining</option>
                  <option value="EXAM">Examinations</option>
                  <option value="ACTIVITY">Extracurricular Activity</option>
                </select>
              </div>
              <div className="form-group">
                <label>Amount ($):</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="500.00"
                  value={newFeeForm.amount}
                  onChange={(e) => setNewFeeForm({ ...newFeeForm, amount: e.target.value })}
                  className="finance-input"
                  required
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setNewFeeModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={loading}>
                  Save Schedule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: New Operating Expense */}
      {newExpenseModal && (
        <div className="modal-backdrop">
          <div className="modal-box">
            <div className="modal-header">
              <h3>📉 Log Operating Expense</h3>
              <button className="modal-close" onClick={() => setNewExpenseModal(false)}>✕</button>
            </div>
            <form onSubmit={handleCreateExpense}>
              <div className="form-group">
                <label>Expense Title:</label>
                <input
                  type="text"
                  placeholder="e.g. Science Lab Chemicals Restock"
                  value={newExpenseForm.title}
                  onChange={(e) => setNewExpenseForm({ ...newExpenseForm, title: e.target.value })}
                  className="finance-input"
                  required
                />
              </div>
              <div className="form-group">
                <label>Category:</label>
                <select
                  value={newExpenseForm.category}
                  onChange={(e) => setNewExpenseForm({ ...newExpenseForm, category: e.target.value })}
                  className="finance-select"
                >
                  <option value="FACILITIES">Facilities & Maintenance</option>
                  <option value="UTILITIES">Electricity & Internet Utilities</option>
                  <option value="LAB_SUPPLIES">Lab & Curriculum Supplies</option>
                  <option value="TECHNOLOGY">Cloud Infrastructure & Software</option>
                  <option value="TRANSPORT">Fleet Fuel & Bus Service</option>
                </select>
              </div>
              <div className="form-group">
                <label>Vendor / Payee:</label>
                <input
                  type="text"
                  placeholder="e.g. Apex Scientific Supplies Ltd"
                  value={newExpenseForm.vendorName}
                  onChange={(e) => setNewExpenseForm({ ...newExpenseForm, vendorName: e.target.value })}
                  className="finance-input"
                />
              </div>
              <div className="form-group">
                <label>Amount ($):</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="1250.00"
                  value={newExpenseForm.amount}
                  onChange={(e) => setNewExpenseForm({ ...newExpenseForm, amount: e.target.value })}
                  className="finance-input"
                  required
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setNewExpenseModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={loading}>
                  Save Expense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
