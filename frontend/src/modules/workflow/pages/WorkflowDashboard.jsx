import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getApiBaseUrl } from '../../../api/client/apiConfig';
import './WorkflowDashboard.css';

const API_BASE = getApiBaseUrl();

export default function WorkflowDashboard() {
  const navigate = useNavigate();

  // Active Tab state
  const [activeTab, setActiveTab] = useState('rules'); // 'rules', 'simulator', 'queue', 'templates', 'executions'

  // Data states
  const [rules, setRules] = useState([]);
  const [queueItems, setQueueItems] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [executions, setExecutions] = useState([]);
  const [workflowTelemetry, setWorkflowTelemetry] = useState(null);
  const [notificationTelemetry, setNotificationTelemetry] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modal states
  const [showRuleModal, setShowRuleModal] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [ruleFormData, setRuleFormData] = useState({
    code: '',
    name: '',
    description: '',
    triggerEvent: 'ADMISSION_APPROVED',
    conditionLogic: 'ALL',
    conditions: '[]',
    actionType: 'DISPATCH_NOTIFICATION',
    actionConfig: JSON.stringify({ channel: 'SMS', templateCode: 'ADMISSION_WELCOME_SMS' }, null, 2),
    priority: 1
  });
  const [templateFormData, setTemplateFormData] = useState({
    templateCode: '',
    name: '',
    channel: 'SMS',
    titleTemplate: '',
    bodyTemplate: '',
    variables: '[]'
  });

  // Simulator state
  const [selectedPreset, setSelectedPreset] = useState('ADMISSION_APPROVED');
  const [simulatorPayload, setSimulatorPayload] = useState(
    JSON.stringify(
      {
        studentFirstName: 'Alexander',
        studentLastName: 'Vanderbilt',
        applicationNumber: 'ADM-2026-9204',
        className: 'Grade 9 - Cambridge Honors',
        guardianName: 'Eleanor Vanderbilt',
        guardianPhone: '+1-555-019-8822',
        guardianEmail: 'eleanor.vanderbilt@horizon-group.org',
        previousGPA: 3.94
      },
      null,
      2
    )
  );
  const [consoleLogs, setConsoleLogs] = useState([
    { timestamp: new Date().toLocaleTimeString(), text: 'Automation Engine initialized and listening on PostgreSQL bus.', type: 'info' }
  ]);
  const [simulating, setSimulating] = useState(false);
  const [dispatchingQueue, setDispatchingQueue] = useState(false);

  // Auth headers
  const getAuthHeaders = () => {
    const token = localStorage.getItem('gbs_token');
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    };
  };

  // Load All Engine Telemetry and Records
  const fetchAllData = async () => {
    try {
      setLoading(true);
      setError(null);
      const headers = getAuthHeaders();

      // 1. Fetch Workflow Rules
      const rulesRes = await fetch(`${API_BASE}/workflows/rules`, { headers });
      const rulesData = await rulesRes.json();
      if (rulesData.status === 'success') setRules(rulesData.data.rules || []);

      // 2. Fetch Notification Queue
      const queueRes = await fetch(`${API_BASE}/notifications/queue`, { headers });
      const queueData = await queueRes.json();
      if (queueData.status === 'success') setQueueItems(queueData.data.items || []);

      // 3. Fetch Notification Templates
      const templatesRes = await fetch(`${API_BASE}/notifications/templates`, { headers });
      const templatesData = await templatesRes.json();
      if (templatesData.status === 'success') setTemplates(templatesData.data.templates || []);

      // 4. Fetch Workflow Executions
      const execRes = await fetch(`${API_BASE}/workflows/executions`, { headers });
      const execData = await execRes.json();
      if (execData.status === 'success') setExecutions(execData.data.executions || []);

      // 5. Fetch Telemetry
      const wfTeleRes = await fetch(`${API_BASE}/workflows/telemetry`, { headers });
      const wfTeleData = await wfTeleRes.json();
      if (wfTeleData.status === 'success') setWorkflowTelemetry(wfTeleData.data.telemetry);

      const notifTeleRes = await fetch(`${API_BASE}/notifications/telemetry`, { headers });
      const notifTeleData = await notifTeleRes.json();
      if (notifTeleData.status === 'success') setNotificationTelemetry(notifTeleData.data.telemetry);
    } catch (err) {
      console.error('Failed to load automation engine data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  // Simulator Presets
  const handleSelectPreset = (eventName) => {
    setSelectedPreset(eventName);
    if (eventName === 'ADMISSION_APPROVED') {
      setSimulatorPayload(
        JSON.stringify(
          {
            studentFirstName: 'Alexander',
            studentLastName: 'Vanderbilt',
            applicationNumber: 'ADM-2026-9204',
            className: 'Grade 9 - Cambridge Honors',
            guardianName: 'Eleanor Vanderbilt',
            guardianPhone: '+1-555-019-8822',
            previousGPA: 3.94
          },
          null,
          2
        )
      );
    } else if (eventName === 'STUDENT_ABSENT') {
      setSimulatorPayload(
        JSON.stringify(
          {
            studentName: 'Julian Vance',
            className: 'Grade 10-A Science',
            date: new Date().toLocaleDateString(),
            guardianName: 'Dr. Robert Vance',
            guardianPhone: '+1-555-442-9901'
          },
          null,
          2
        )
      );
    } else if (eventName === 'EMERGENCY_ALERT') {
      setSimulatorPayload(
        JSON.stringify(
          {
            message: 'Campus perimeter security drill in progress at North Gate.',
            location: 'North Quadrant Gate 2',
            alertStatus: 'CONTAINED',
            guardianPhone: '+1-555-900-1122'
          },
          null,
          2
        )
      );
    } else if (eventName === 'ADMISSION_SUBMITTED') {
      setSimulatorPayload(
        JSON.stringify(
          {
            studentFirstName: 'Sophia',
            studentLastName: 'Chen',
            targetGradeLevel: 10,
            previousGPA: 3.96,
            guardianName: 'David Chen',
            guardianPhone: '+1-555-771-3344'
          },
          null,
          2
        )
      );
    }
  };

  // Run Event Simulation
  const handleTriggerSimulation = async () => {
    try {
      setSimulating(true);
      let parsedPayload = {};
      try {
        parsedPayload = JSON.parse(simulatorPayload);
      } catch {
        alert('Invalid JSON in payload editor!');
        setSimulating(false);
        return;
      }

      const headers = getAuthHeaders();
      const res = await fetch(`${API_BASE}/workflows/trigger`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          triggerEvent: selectedPreset,
          payload: parsedPayload
        })
      });

      const data = await res.json();
      const timeStr = new Date().toLocaleTimeString();

      if (res.ok) {
        const newLogs = [
          ...consoleLogs,
          {
            timestamp: timeStr,
            text: `[EVENT FIRED] Triggered '${selectedPreset}'. Rules evaluated: ${data.data.totalRulesEvaluated}, Actions executed: ${data.data.executedCount}`,
            type: 'info'
          }
        ];

        data.data.results.forEach((r) => {
          newLogs.push({
            timestamp: timeStr,
            text: `[RULE ${r.ruleCode}] Status: ${r.status} (${r.executionTimeMs}ms) Output: ${JSON.stringify(r.actionOutput)}`,
            type: r.status === 'SUCCESS' ? 'success' : 'skip'
          });
        });

        setConsoleLogs(newLogs);
        // Refresh queue and telemetry
        fetchAllData();
      } else {
        setConsoleLogs((prev) => [
          ...prev,
          { timestamp: timeStr, text: `[EVENT ERROR] ${data.message || 'Execution error'}`, type: 'fail' }
        ]);
      }
    } catch (err) {
      setConsoleLogs((prev) => [
        ...prev,
        { timestamp: new Date().toLocaleTimeString(), text: `[FATAL] ${err.message}`, type: 'fail' }
      ]);
    } finally {
      setSimulating(false);
    }
  };

  // Process & Dispatch Queue Worker
  const handleProcessQueue = async () => {
    try {
      setDispatchingQueue(true);
      const headers = getAuthHeaders();
      const res = await fetch(`${API_BASE}/notifications/process-queue`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ batchSize: 25 })
      });
      const data = await res.json();

      if (res.ok) {
        setConsoleLogs((prev) => [
          ...prev,
          {
            timestamp: new Date().toLocaleTimeString(),
            text: `[QUEUE DISPATCH] Processed & dispatched ${data.data.processedCount} messages across multi-channel gateways.`,
            type: 'success'
          }
        ]);
        fetchAllData();
      } else {
        alert(data.message || 'Dispatch failed');
      }
    } catch (err) {
      alert(`Worker error: ${err.message}`);
    } finally {
      setDispatchingQueue(false);
    }
  };

  // Create New Rule
  const handleCreateRuleSubmit = async (e) => {
    e.preventDefault();
    try {
      const headers = getAuthHeaders();
      const res = await fetch(`${API_BASE}/workflows/rules`, {
        method: 'POST',
        headers,
        body: JSON.stringify(ruleFormData)
      });
      const data = await res.json();
      if (res.ok) {
        setShowRuleModal(false);
        fetchAllData();
      } else {
        alert(data.message || 'Failed to create rule');
      }
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="workflow-container">
      {/* Top Header */}
      <header className="workflow-header">
        <div className="header-brand-block">
          <img src="/assets/gbs_crest_badge.jpg" alt="GBS Logo" className="header-crest" />
          <div className="brand-titles">
            <h1>WORKFLOW & AUTOMATION COMMAND CENTER</h1>
            <span className="brand-subtext">MASTER BLUEPRINT BOX 7 & 12 • MISSION CONTROL TELEMETRY</span>
          </div>
        </div>

        <div className="header-telemetry-strip">
          <div className="telemetry-chip">
            <span className="pulse-indicator"></span>
            <span>EVENT BUS: <strong>ONLINE</strong></span>
          </div>
          <div className="telemetry-chip">
            <span>QUEUE PENDING: <strong>{notificationTelemetry?.byStatus?.PENDING ?? 0}</strong></span>
          </div>
          <div className="telemetry-chip">
            <span>DELIVERY RATE: <strong>{notificationTelemetry?.deliveryRate ?? 100}%</strong></span>
          </div>
        </div>

        <div className="header-actions">
          <button className="wf-btn-ghost" onClick={() => navigate('/portal/admin/dashboard')}>
            ← Back to Portal
          </button>
          <button className="wf-btn-primary" onClick={() => setShowRuleModal(true)}>
            + New Automation Rule
          </button>
        </div>
      </header>

      {/* Hero Panoramic Banner */}
      <div
        className="workflow-hero"
        style={{ backgroundImage: `url('/assets/workflow-command-center-bg.jpg')` }}
      >
        <div className="workflow-hero-overlay"></div>
        <div className="hero-content-flex">
          <div className="hero-content">
            <div className="hero-badge">⚡ PRODUCTION EVENT DISPATCH ENGINE</div>
            <h2>Mission Control & Automated Workflow Pipelines</h2>
            <p>
              Deterministic trigger rules, condition evaluation engines, automated multi-channel notification dispatchers
              (Email SMTP, Telephony SMS, and Central In-App Bus), and SLA escalation tracking.
            </p>
          </div>

          <div className="hero-photo-showcase-frame">
            <div className="showcase-photo-wrapper">
              <img
                src="/assets/workflow-command-center-bg.jpg"
                alt="Institutional Network Operations Command Room"
                className="real-life-dashboard-photo"
              />
              <div className="showcase-verified-badge">
                <span className="live-camera-pulse"></span>
                <span>REAL-LIFE CAMPUS VIEW</span>
              </div>
            </div>
            <div className="showcase-photo-caption">
              <span>📍 Operations Command Room & Data Enclave • Real-Life Operations View</span>
            </div>
          </div>
        </div>
      </div>

      {/* Metrics Gauges */}
      <div className="metrics-gauges-grid">
        <div className="gauge-card">
          <div className="gauge-icon cyan">⚙️</div>
          <div className="gauge-info">
            <span className="gauge-val">{workflowTelemetry?.activeRules ?? rules.length}</span>
            <span className="gauge-label">Active Trigger Rules</span>
          </div>
        </div>

        <div className="gauge-card">
          <div className="gauge-icon green">📬</div>
          <div className="gauge-info">
            <span className="gauge-val">{notificationTelemetry?.byStatus?.SENT ?? 0}</span>
            <span className="gauge-label">Dispatched Notifications</span>
          </div>
        </div>

        <div className="gauge-card">
          <div className="gauge-icon amber">⏳</div>
          <div className="gauge-info">
            <span className="gauge-val">{notificationTelemetry?.byStatus?.PENDING ?? 0}</span>
            <span className="gauge-label">Pending In Queue</span>
          </div>
        </div>

        <div className="gauge-card">
          <div className="gauge-icon purple">⚡</div>
          <div className="gauge-info">
            <span className="gauge-val">{workflowTelemetry?.averageLatencyMs ?? 1} ms</span>
            <span className="gauge-label">Avg Execution Latency</span>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="tabs-navigation-bar">
        <button
          className={`tab-btn ${activeTab === 'rules' ? 'active' : ''}`}
          onClick={() => setActiveTab('rules')}
        >
          ⚙️ Workflow Rules ({rules.length})
        </button>
        <button
          className={`tab-btn ${activeTab === 'simulator' ? 'active' : ''}`}
          onClick={() => setActiveTab('simulator')}
        >
          ⚡ Live Event Simulator & Console
        </button>
        <button
          className={`tab-btn ${activeTab === 'queue' ? 'active' : ''}`}
          onClick={() => setActiveTab('queue')}
        >
          📬 Multi-Channel Dispatch Queue ({queueItems.length})
        </button>
        <button
          className={`tab-btn ${activeTab === 'templates' ? 'active' : ''}`}
          onClick={() => setActiveTab('templates')}
        >
          📝 Notification Templates ({templates.length})
        </button>
        <button
          className={`tab-btn ${activeTab === 'executions' ? 'active' : ''}`}
          onClick={() => setActiveTab('executions')}
        >
          📊 Execution History ({executions.length})
        </button>
      </div>

      {/* Main Tab Panels */}
      <main className="tab-content-area">
        {loading && <div style={{ color: '#38bdf8', padding: '2rem' }}>⚡ Synchronizing with PostgreSQL automation cluster...</div>}

        {/* TAB 1: WORKFLOW RULES */}
        {!loading && activeTab === 'rules' && (
          <div className="rules-grid">
            {rules.map((rule) => {
              let parsedAction = {};
              try {
                parsedAction = JSON.parse(rule.actionConfig);
              } catch {
                parsedAction = {};
              }
              return (
                <div key={rule.id} className={`rule-card ${rule.isActive ? 'active' : 'inactive'}`}>
                  <div>
                    <div className="rule-card-header">
                      <div className="rule-meta">
                        <span className="rule-code">{rule.code}</span>
                        <h3 className="rule-title">{rule.name}</h3>
                      </div>
                      <span className={`rule-status-badge ${rule.isActive ? 'active' : 'inactive'}`}>
                        {rule.isActive ? 'Active' : 'Disabled'}
                      </span>
                    </div>

                    <p className="rule-description">{rule.description || 'Enterprise automated trigger rule.'}</p>

                    <div className="rule-wiring-box">
                      <div className="wire-row">
                        <span className="wire-label">Trigger Hook:</span>
                        <span className="wire-value" style={{ color: '#38bdf8' }}>{rule.triggerEvent}</span>
                      </div>
                      <div className="wire-row">
                        <span className="wire-label">Action Target:</span>
                        <span className="wire-value" style={{ color: '#34d399' }}>{rule.actionType}</span>
                      </div>
                      {parsedAction.channel && (
                        <div className="wire-row">
                          <span className="wire-label">Channel:</span>
                          <span className="wire-value">{parsedAction.channel}</span>
                        </div>
                      )}
                      {parsedAction.templateCode && (
                        <div className="wire-row">
                          <span className="wire-label">Template:</span>
                          <span className="wire-value" style={{ color: '#fbbf24' }}>{parsedAction.templateCode}</span>
                        </div>
                      )}
                      {parsedAction.department && (
                        <div className="wire-row">
                          <span className="wire-label">SLA Dept:</span>
                          <span className="wire-value" style={{ color: '#a78bfa' }}>{parsedAction.department}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="rule-actions-bar">
                    <span className="rule-exec-stat">
                      Executions: <strong>{rule._count?.executions ?? 0}</strong>
                    </span>
                    <div className="rule-btn-group">
                      <button
                        className="wf-btn-ghost"
                        style={{ padding: '0.35rem 0.65rem', fontSize: '0.72rem' }}
                        onClick={() => {
                          handleSelectPreset(rule.triggerEvent);
                          setActiveTab('simulator');
                        }}
                      >
                        ⚡ Test Hook
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* TAB 2: LIVE EVENT SIMULATOR & CONSOLE */}
        {!loading && activeTab === 'simulator' && (
          <div className="simulator-layout">
            <div className="sim-panel">
              <h3>⚡ Event Hook Trigger Tester</h3>
              <p>Simulate production system events to trigger active workflow rules in real-time.</p>

              <div className="event-presets-grid">
                <button
                  className={`preset-btn ${selectedPreset === 'ADMISSION_APPROVED' ? 'active' : ''}`}
                  onClick={() => handleSelectPreset('ADMISSION_APPROVED')}
                >
                  <div className="preset-name">🎓 Admission Approved</div>
                  <div className="preset-desc">Triggers guardian SMS & welcome letter</div>
                </button>

                <button
                  className={`preset-btn ${selectedPreset === 'STUDENT_ABSENT' ? 'active' : ''}`}
                  onClick={() => handleSelectPreset('STUDENT_ABSENT')}
                >
                  <div className="preset-name">🚨 Student Absent</div>
                  <div className="preset-desc">Instant absence alert to parent mobile</div>
                </button>

                <button
                  className={`preset-btn ${selectedPreset === 'EMERGENCY_ALERT' ? 'active' : ''}`}
                  onClick={() => handleSelectPreset('EMERGENCY_ALERT')}
                >
                  <div className="preset-name">🚨 Campus Emergency</div>
                  <div className="preset-desc">Urgent security locator broadcast</div>
                </button>

                <button
                  className={`preset-btn ${selectedPreset === 'ADMISSION_SUBMITTED' ? 'active' : ''}`}
                  onClick={() => handleSelectPreset('ADMISSION_SUBMITTED')}
                >
                  <div className="preset-name">📄 High GPA Candidate</div>
                  <div className="preset-desc">Escalates GPA ≥ 3.8 to Dean for honors</div>
                </button>
              </div>

              <label style={{ fontSize: '0.78rem', color: '#94a3b8', display: 'block', marginBottom: '0.4rem' }}>
                Simulated Event Payload (JSON):
              </label>
              <textarea
                className="payload-editor"
                value={simulatorPayload}
                onChange={(e) => setSimulatorPayload(e.target.value)}
              />

              <button
                className="wf-btn-primary"
                style={{ width: '100%', justifyContent: 'center' }}
                onClick={handleTriggerSimulation}
                disabled={simulating}
              >
                {simulating ? 'Evaluating Rules...' : '⚡ Fire Event Hook Now'}
              </button>
            </div>

            <div className="sim-panel">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
                <h3 style={{ margin: 0 }}>📟 Live Engine Execution Console</h3>
                <button
                  className="wf-btn-ghost"
                  style={{ fontSize: '0.72rem', padding: '0.3rem 0.6rem' }}
                  onClick={() => setConsoleLogs([])}
                >
                  Clear Console
                </button>
              </div>
              <p>Real-time audit telemetry of rule evaluation, condition matching, and action outputs.</p>

              <div className="sim-console">
                {consoleLogs.map((log, idx) => (
                  <div key={idx} className="console-entry">
                    <span className="console-timestamp">[{log.timestamp}]</span>
                    <span className={`console-${log.type}`}>{log.text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: MULTI-CHANNEL DISPATCH QUEUE */}
        {!loading && activeTab === 'queue' && (
          <div>
            <div className="queue-header-actions">
              <div>
                <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'white' }}>Multi-Channel Dispatch Queue</h3>
                <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                  PostgreSQL asynchronous messaging queue with retry logic and delivery receipts.
                </span>
              </div>
              <button
                className="wf-btn-primary"
                onClick={handleProcessQueue}
                disabled={dispatchingQueue}
              >
                {dispatchingQueue ? 'Dispatching Gateways...' : '⚡ Process & Dispatch Queue Now'}
              </button>
            </div>

            <div className="queue-table-container">
              <table className="queue-table">
                <thead>
                  <tr>
                    <th>Queue ID</th>
                    <th>Channel</th>
                    <th>Recipient</th>
                    <th>Title & Content</th>
                    <th>Priority</th>
                    <th>Status</th>
                    <th>Sent Timestamp</th>
                  </tr>
                </thead>
                <tbody>
                  {queueItems.map((item) => (
                    <tr key={item.id}>
                      <td style={{ fontFamily: 'var(--wf-mono-font)', color: '#38bdf8' }}>#{item.id}</td>
                      <td>
                        <span className={`channel-tag ${item.channel.toLowerCase()}`}>
                          {item.channel === 'SMS' && '📱 SMS'}
                          {item.channel === 'EMAIL' && '✉️ Email'}
                          {item.channel === 'IN_APP' && '🔔 In-App'}
                        </span>
                      </td>
                      <td>
                        <strong>{item.recipientName || 'Member'}</strong>
                        <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>{item.recipientContact}</div>
                      </td>
                      <td style={{ maxWidth: '320px' }}>
                        <div style={{ fontWeight: 600, color: 'white' }}>{item.title}</div>
                        <div style={{ fontSize: '0.76rem', color: '#94a3b8', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                          {item.content}
                        </div>
                      </td>
                      <td>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: item.priority === 'URGENT' ? '#f43f5e' : '#38bdf8' }}>
                          {item.priority}
                        </span>
                      </td>
                      <td>
                        <span className={`status-pill ${item.status.toLowerCase()}`}>
                          {item.status}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.75rem', color: '#94a3b8', fontFamily: 'var(--wf-mono-font)' }}>
                        {item.sentAt ? new Date(item.sentAt).toLocaleTimeString() : 'Pending Queue'}
                      </td>
                    </tr>
                  ))}
                  {queueItems.length === 0 && (
                    <tr>
                      <td colSpan="7" style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
                        No items in dispatch queue. Trigger an event hook to populate queue.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: NOTIFICATION TEMPLATES */}
        {!loading && activeTab === 'templates' && (
          <div className="rules-grid">
            {templates.map((tpl) => (
              <div key={tpl.id} className="rule-card">
                <div>
                  <div className="rule-card-header">
                    <div className="rule-meta">
                      <span className="rule-code">{tpl.templateCode}</span>
                      <h3 className="rule-title">{tpl.name}</h3>
                    </div>
                    <span className={`channel-tag ${tpl.channel.toLowerCase()}`}>
                      {tpl.channel}
                    </span>
                  </div>

                  {tpl.titleTemplate && (
                    <div style={{ fontSize: '0.78rem', color: '#38bdf8', marginBottom: '0.5rem', fontWeight: 600 }}>
                      Subject: {tpl.titleTemplate}
                    </div>
                  )}

                  <div style={{ background: '#090d16', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px', padding: '0.85rem', fontSize: '0.8rem', color: '#cbd5e1', lineHeight: '1.45', marginBottom: '0.8rem' }}>
                    {tpl.bodyTemplate}
                  </div>
                </div>

                <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                  Variables: <span style={{ fontFamily: 'var(--wf-mono-font)', color: '#a78bfa' }}>{tpl.variables}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* TAB 5: EXECUTION HISTORY */}
        {!loading && activeTab === 'executions' && (
          <div className="queue-table-container">
            <table className="queue-table">
              <thead>
                <tr>
                  <th>Exec ID</th>
                  <th>Rule Triggered</th>
                  <th>Trigger Hook</th>
                  <th>Status</th>
                  <th>Latency</th>
                  <th>Execution Output</th>
                  <th>Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {executions.map((exec) => (
                  <tr key={exec.id}>
                    <td style={{ fontFamily: 'var(--wf-mono-font)', color: '#38bdf8' }}>#{exec.id}</td>
                    <td>
                      <strong>{exec.rule?.name || 'Automated Hook'}</strong>
                      <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{exec.rule?.code}</div>
                    </td>
                    <td style={{ fontFamily: 'var(--wf-mono-font)', color: '#a78bfa' }}>{exec.triggerEvent}</td>
                    <td>
                      <span className={`status-pill ${exec.status.toLowerCase()}`}>
                        {exec.status}
                      </span>
                    </td>
                    <td style={{ fontFamily: 'var(--wf-mono-font)' }}>{exec.executionTimeMs} ms</td>
                    <td style={{ maxWidth: '300px', fontSize: '0.75rem', fontFamily: 'var(--wf-mono-font)', color: '#cbd5e1' }}>
                      {exec.executionResult}
                    </td>
                    <td style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                      {new Date(exec.createdAt).toLocaleTimeString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {/* CREATE RULE MODAL */}
      {showRuleModal && (
        <div className="modal-backdrop">
          <div className="modal-window">
            <div className="modal-header">
              <h3>Create Automation Trigger Rule</h3>
              <button className="modal-close-btn" onClick={() => setShowRuleModal(false)}>✕</button>
            </div>

            <form onSubmit={handleCreateRuleSubmit}>
              <div className="form-group">
                <label>Unique Rule Code</label>
                <input
                  type="text"
                  className="form-input"
                  required
                  placeholder="e.g. RULE_GRADE10_SCHOLARSHIP"
                  value={ruleFormData.code}
                  onChange={(e) => setRuleFormData({ ...ruleFormData, code: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Rule Name</label>
                <input
                  type="text"
                  className="form-input"
                  required
                  placeholder="e.g. High Performance Scholarship Escalation"
                  value={ruleFormData.name}
                  onChange={(e) => setRuleFormData({ ...ruleFormData, name: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>System Trigger Event</label>
                <select
                  className="form-select"
                  value={ruleFormData.triggerEvent}
                  onChange={(e) => setRuleFormData({ ...ruleFormData, triggerEvent: e.target.value })}
                >
                  <option value="ADMISSION_APPROVED">ADMISSION_APPROVED</option>
                  <option value="ADMISSION_SUBMITTED">ADMISSION_SUBMITTED</option>
                  <option value="STUDENT_ABSENT">STUDENT_ABSENT</option>
                  <option value="HOMEWORK_ASSIGNED">HOMEWORK_ASSIGNED</option>
                  <option value="EMERGENCY_ALERT">EMERGENCY_ALERT</option>
                  <option value="FEE_OVERDUE">FEE_OVERDUE</option>
                </select>
              </div>

              <div className="form-group">
                <label>Action Type</label>
                <select
                  className="form-select"
                  value={ruleFormData.actionType}
                  onChange={(e) => setRuleFormData({ ...ruleFormData, actionType: e.target.value })}
                >
                  <option value="DISPATCH_NOTIFICATION">DISPATCH_NOTIFICATION</option>
                  <option value="ESCALATE_SLA">ESCALATE_SLA</option>
                  <option value="TRIGGER_WEBHOOK">TRIGGER_WEBHOOK</option>
                </select>
              </div>

              <div className="form-group">
                <label>Action Configuration (JSON)</label>
                <textarea
                  className="form-textarea"
                  value={ruleFormData.actionConfig}
                  onChange={(e) => setRuleFormData({ ...ruleFormData, actionConfig: e.target.value })}
                />
              </div>

              <div className="modal-actions">
                <button type="button" className="wf-btn-ghost" onClick={() => setShowRuleModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="wf-btn-primary">
                  Save Rule to PostgreSQL
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
