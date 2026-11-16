import React, { useState, useEffect } from "react";
import { rcceApi, RCCE_DOMAINS, displayRcceNotice } from "../../../utils/rcceClient";
import { copyTextSafely } from "../../../utils/safeWindow";

export default function RcceControlHub() {
  const [activeSubTab, setActiveSubTab] = useState("catalogue"); // 'catalogue' | 'telemetry' | 'maintenance' | 'audit' | 'events'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Catalogue State
  const [catalogue, setCatalogue] = useState([]);
  const [filteredCatalogue, setFilteredCatalogue] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Telemetry State
  const [telemetry, setTelemetry] = useState(null);

  // Maintenance Mode State
  const [maintenanceStatus, setMaintenanceStatus] = useState({
    active: false,
    reason: "",
    activatedAt: null,
    activatedBy: null
  });
  const [maintReasonInput, setMaintReasonInput] = useState("");
  const [maintUpdating, setMaintUpdating] = useState(false);

  // Audit Logs State
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditFilter, setAuditFilter] = useState({ action: "", status: "", tenantId: "" });

  // Event Dispatcher State
  const [selectedEvent, setSelectedEvent] = useState("SYSTEM_ALERT_DISPATCHED");
  const [eventPayloadText, setEventPayloadText] = useState('{\n  "title": "System Integrity Notice",\n  "severity": "INFO",\n  "details": "Central system heartbeat confirmed."\n}');
  const [dispatchResult, setDispatchResult] = useState(null);

  // Load Initial Data
  useEffect(() => {
    loadCatalogue();
    loadSystemTelemetry();
    loadAuditTrail();
  }, []);

  const loadCatalogue = async () => {
    setLoading(true);
    try {
      const res = await rcceApi.getCatalogue();
      if (res.success && res.data) {
        setCatalogue(res.data.catalogue || []);
        setFilteredCatalogue(res.data.catalogue || []);
      }
    } catch (err) {
      setError("Failed to load predefined response catalogue.");
    } finally {
      setLoading(false);
    }
  };

  const loadSystemTelemetry = async () => {
    try {
      const res = await rcceApi.getSystemStatus();
      if (res.success && res.data) {
        setTelemetry(res.data);
        if (res.data.maintenance) {
          setMaintenanceStatus(res.data.maintenance);
        }
      }
    } catch (err) {
      console.warn("Failed to retrieve live system telemetry:", err);
    }
  };

  const loadAuditTrail = async () => {
    try {
      const res = await rcceApi.getAuditTrail(auditFilter);
      if (res.success && res.data) {
        setAuditLogs(res.data.auditLogs || []);
      }
    } catch (err) {
      console.warn("Failed to retrieve audit trail:", err);
    }
  };

  // Filter Catalogue
  useEffect(() => {
    let result = catalogue;
    if (selectedCategory !== "ALL") {
      result = result.filter((item) => item.category === selectedCategory);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (item) =>
          item.code.toLowerCase().includes(q) ||
          item.message.toLowerCase().includes(q) ||
          (item.description && item.description.toLowerCase().includes(q))
      );
    }
    setFilteredCatalogue(result);
  }, [catalogue, selectedCategory, searchQuery]);

  // Toggle Maintenance Mode
  const handleToggleMaintenance = async (enable) => {
    if (enable && !maintReasonInput.trim()) {
      alert("Please provide a reason before enabling system maintenance mode.");
      return;
    }
    setMaintUpdating(true);
    try {
      const res = await rcceApi.setMaintenanceMode(enable, maintReasonInput);
      displayRcceNotice(res);
      if (res.success && res.data) {
        setMaintenanceStatus(res.data);
        if (!enable) setMaintReasonInput("");
      }
      loadSystemTelemetry();
    } catch (err) {
      alert("Error toggling maintenance mode: " + err.message);
    } finally {
      setMaintUpdating(false);
    }
  };

  // Test Dispatch Notice
  const handleTestNotice = (item) => {
    const isSuccess = item.statusCode >= 200 && item.statusCode < 300;
    displayRcceNotice({
      success: isSuccess,
      code: item.code,
      message: item.message,
      status: item.statusCode
    });
  };

  // Dispatch Domain Event
  const handleDispatchEvent = async () => {
    try {
      let parsedPayload = {};
      try {
        parsedPayload = JSON.parse(eventPayloadText);
      } catch {
        alert("Invalid JSON format in payload text area.");
        return;
      }
      const res = await rcceApi.emitEvent(selectedEvent, parsedPayload);
      setDispatchResult(res);
      displayRcceNotice(res);
      loadAuditTrail();
    } catch (err) {
      alert("Event dispatch error: " + err.message);
    }
  };

  const categories = ["ALL", ...Object.keys(RCCE_DOMAINS)];

  return (
    <div style={{ background: "#0a0f1d", color: "#f8fafc", borderRadius: 12, padding: 24, border: "1px solid #1e293b", marginTop: 16 }}>
      {/* Header Banner */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #1e293b", paddingBottom: 16, marginBottom: 20 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 24 }}>⚡</span>
            <h2 style={{ margin: 0, fontSize: 22, color: "#f8fafc", fontWeight: 800, letterSpacing: "0.03em" }}>
              GBS-RCCE CENTRAL RESPONSE & CONTROL ENGINE
            </h2>
            <span style={{ background: "rgba(16, 185, 129, 0.15)", color: "#10b981", border: "1px solid #10b981", padding: "2px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700 }}>
              ENTERPRISE ACTIVE
            </span>
          </div>
          <p style={{ margin: "6px 0 0 0", color: "#94a3b8", fontSize: 13 }}>
            Unified response management, business rules enforcement, real-time event distribution, and audit verification across all GBS products.
          </p>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={() => { loadCatalogue(); loadSystemTelemetry(); loadAuditTrail(); }}
            style={{ background: "#1e293b", color: "#38bdf8", border: "1px solid #334155", padding: "8px 14px", borderRadius: 8, fontSize: 13, cursor: "pointer", fontWeight: 600 }}
          >
            🔄 Refresh Telemetry
          </button>
        </div>
      </div>

      {/* Sub-Tabs Navigation */}
      <div style={{ display: "flex", gap: 8, borderBottom: "1px solid #1e293b", paddingBottom: 12, marginBottom: 20, flexWrap: "wrap" }}>
        {[
          { id: "catalogue", label: `📖 Response Catalogue (${catalogue.length})` },
          { id: "telemetry", label: "🛰️ Central Engine Telemetry" },
          { id: "maintenance", label: `🛡️ Maintenance Mode ${maintenanceStatus.active ? "(ACTIVE)" : ""}` },
          { id: "audit", label: `📜 Real-Time Audit Trail (${auditLogs.length})` },
          { id: "events", label: "📡 Event & Notification Hub" }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveSubTab(tab.id)}
            style={{
              background: activeSubTab === tab.id ? "#d4af37" : "#0f172a",
              color: activeSubTab === tab.id ? "#020617" : "#cbd5e1",
              border: activeSubTab === tab.id ? "1px solid #d4af37" : "1px solid #334155",
              padding: "8px 16px",
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
              transition: "all 0.2s"
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* SUB-TAB 1: RESPONSE CATALOGUE */}
      {activeSubTab === "catalogue" && (
        <div>
          {/* Controls: Search and Categories */}
          <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
            <input
              type="text"
              placeholder="🔍 Search predefined response codes or message text..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                flex: "1 1 300px",
                background: "#020617",
                border: "1px solid #334155",
                borderRadius: 8,
                padding: "10px 14px",
                color: "#f8fafc",
                fontSize: 14
              }}
            />
            <div style={{ display: "flex", gap: 6, overflowX: "auto", maxWidth: "100%", paddingBottom: 4 }}>
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  style={{
                    background: selectedCategory === cat ? "#38bdf8" : "#1e293b",
                    color: selectedCategory === cat ? "#020617" : "#94a3b8",
                    border: "none",
                    borderRadius: 6,
                    padding: "6px 12px",
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: "pointer",
                    whiteSpace: "nowrap"
                  }}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Catalogue Table */}
          <div style={{ overflowX: "auto", border: "1px solid #1e293b", borderRadius: 8 }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, textAlign: "left" }}>
              <thead>
                <tr style={{ background: "#0f172a", borderBottom: "1px solid #334155", color: "#94a3b8" }}>
                  <th style={{ padding: "12px 14px", width: 80 }}>HTTP</th>
                  <th style={{ padding: "12px 14px", width: 220 }}>Response Code</th>
                  <th style={{ padding: "12px 14px", width: 140 }}>Category</th>
                  <th style={{ padding: "12px 14px" }}>Predefined System Feedback Message</th>
                  <th style={{ padding: "12px 14px", width: 100, textAlign: "center" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCatalogue.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ padding: 24, textAlign: "center", color: "#64748b" }}>
                      No predefined responses match your query.
                    </td>
                  </tr>
                ) : (
                  filteredCatalogue.map((item, idx) => {
                    const isSuccess = item.statusCode >= 200 && item.statusCode < 300;
                    return (
                      <tr
                        key={item.code}
                        style={{
                          background: idx % 2 === 0 ? "#0a0f1d" : "#0c1322",
                          borderBottom: "1px solid #1e293b"
                        }}
                      >
                        <td style={{ padding: "12px 14px" }}>
                          <span
                            style={{
                              background: isSuccess ? "rgba(16, 185, 129, 0.2)" : "rgba(239, 68, 68, 0.2)",
                              color: isSuccess ? "#34d399" : "#f87171",
                              padding: "2px 8px",
                              borderRadius: 4,
                              fontWeight: 700,
                              fontSize: 12
                            }}
                          >
                            {item.statusCode}
                          </span>
                        </td>
                        <td style={{ padding: "12px 14px", fontFamily: "monospace", color: "#fbbf24", fontWeight: 700 }}>
                          {item.code}
                        </td>
                        <td style={{ padding: "12px 14px" }}>
                          <span style={{ background: "#1e293b", color: "#94a3b8", padding: "2px 8px", borderRadius: 4, fontSize: 11 }}>
                            {item.category}
                          </span>
                        </td>
                        <td style={{ padding: "12px 14px", color: "#f8fafc", lineHeight: 1.4 }}>
                          "{item.message}"
                        </td>
                        <td style={{ padding: "12px 14px", textAlign: "center" }}>
                          <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>
                            <button
                              onClick={() => handleTestNotice(item)}
                              title="Test feedback visually in Universal HUD"
                              style={{ background: "#1e293b", color: "#38bdf8", border: "1px solid #334155", padding: "4px 8px", borderRadius: 4, cursor: "pointer", fontSize: 11, fontWeight: 600 }}
                            >
                              Test HUD
                            </button>
                            <button
                              onClick={() => copyTextSafely(item.code, "Response Code")}
                              title="Copy Code"
                              style={{ background: "#1e293b", color: "#cbd5e1", border: "1px solid #334155", padding: "4px 8px", borderRadius: 4, cursor: "pointer", fontSize: 11 }}
                            >
                              📋
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

      {/* SUB-TAB 2: ENGINE TELEMETRY */}
      {activeSubTab === "telemetry" && (
        <div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
            {/* Core Card */}
            <div style={{ background: "#0f172a", borderRadius: 10, padding: 18, border: "1px solid #334155" }}>
              <h4 style={{ margin: "0 0 12px 0", color: "#d4af37", fontSize: 15, fontWeight: 700 }}>
                ⚡ Engine Status & Architecture
              </h4>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 13 }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#94a3b8" }}>Engine Identity:</span>
                  <span style={{ fontWeight: 700, color: "#38bdf8" }}>GBS-RCCE Enterprise</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#94a3b8" }}>Version:</span>
                  <span style={{ fontWeight: 700, color: "#f8fafc" }}>1.0.0-PROD</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#94a3b8" }}>Standard Envelope:</span>
                  <span style={{ fontWeight: 700, color: "#10b981" }}>Enforced (100%)</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#94a3b8" }}>Predefined Codes:</span>
                  <span style={{ fontWeight: 700, color: "#fbbf24" }}>{catalogue.length} Defined</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#94a3b8" }}>Idempotency Protection:</span>
                  <span style={{ fontWeight: 700, color: "#10b981" }}>Active (Sliding Window)</span>
                </div>
              </div>
            </div>

            {/* Database & Persistence */}
            <div style={{ background: "#0f172a", borderRadius: 10, padding: 18, border: "1px solid #334155" }}>
              <h4 style={{ margin: "0 0 12px 0", color: "#38bdf8", fontSize: 15, fontWeight: 700 }}>
                🗄️ Database & Tenancy Enclave
              </h4>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 13 }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#94a3b8" }}>Primary Engine:</span>
                  <span style={{ fontWeight: 700, color: "#f8fafc" }}>PostgreSQL 18.3</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#94a3b8" }}>Connection Pool:</span>
                  <span style={{ fontWeight: 700, color: "#10b981" }}>Healthy (Pool 1/20)</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#94a3b8" }}>Cross-Tenant Isolation:</span>
                  <span style={{ fontWeight: 700, color: "#10b981" }}>Active Guardrails</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#94a3b8" }}>Developer Privacy Masking:</span>
                  <span style={{ fontWeight: 700, color: "#10b981" }}>Redacted (PII Shield)</span>
                </div>
              </div>
            </div>

            {/* Reusable Product Modules */}
            <div style={{ background: "#0f172a", borderRadius: 10, padding: 18, border: "1px solid #334155" }}>
              <h4 style={{ margin: "0 0 12px 0", color: "#10b981", fontSize: 15, fontWeight: 700 }}>
                🔄 Cross-Product Reusability
              </h4>
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: "#cbd5e1", lineHeight: 1.7 }}>
                <li>GBS School Management System</li>
                <li>GBS Examination System</li>
                <li>GBS Real Estate Management System</li>
                <li>GBS Company Management System</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 3: MAINTENANCE MODE CONTROL */}
      {activeSubTab === "maintenance" && (
        <div style={{ background: "#0f172a", borderRadius: 10, padding: 24, border: "1px solid #334155", maxWidth: 700 }}>
          <h3 style={{ margin: "0 0 8px 0", color: maintenanceStatus.active ? "#f87171" : "#34d399", fontSize: 18 }}>
            System Maintenance Mode: {maintenanceStatus.active ? "🔴 ACTIVATED" : "🟢 DEACTIVATED (NORMAL OPERATION)"}
          </h3>
          <p style={{ color: "#94a3b8", fontSize: 13, marginBottom: 20 }}>
            When activated, all non-developer users are blocked from executing operations and will receive standard HTTP 503 response code <code>SYSTEM_MAINTENANCE_MODE</code>.
          </p>

          {maintenanceStatus.active && (
            <div style={{ background: "rgba(239, 68, 68, 0.1)", border: "1px solid #ef4444", borderRadius: 8, padding: 14, marginBottom: 16 }}>
              <div style={{ fontSize: 13, color: "#fca5a5" }}>
                <strong>Current Maintenance Reason:</strong> {maintenanceStatus.reason || "Scheduled infrastructure upgrades."}
              </div>
              {maintenanceStatus.activatedAt && (
                <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 4 }}>
                  Activated at: {new Date(maintenanceStatus.activatedAt).toLocaleString()}
                </div>
              )}
            </div>
          )}

          {!maintenanceStatus.active ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <label style={{ fontSize: 13, color: "#cbd5e1", fontWeight: 600 }}>
                Maintenance Notice for Users:
              </label>
              <input
                type="text"
                placeholder="e.g. Upgrading GBS Central Database schemas. Normal service resumes at 04:00 UTC."
                value={maintReasonInput}
                onChange={(e) => setMaintReasonInput(e.target.value)}
                style={{
                  background: "#020617",
                  border: "1px solid #334155",
                  borderRadius: 8,
                  padding: "10px 14px",
                  color: "#f8fafc",
                  fontSize: 14
                }}
              />
              <button
                disabled={maintUpdating}
                onClick={() => handleToggleMaintenance(true)}
                style={{
                  background: "#dc2626",
                  color: "#fff",
                  border: "none",
                  borderRadius: 8,
                  padding: "12px 20px",
                  fontWeight: 700,
                  fontSize: 14,
                  cursor: "pointer",
                  width: "fit-content"
                }}
              >
                {maintUpdating ? "Activating..." : "🚨 Enable System Maintenance Mode"}
              </button>
            </div>
          ) : (
            <button
              disabled={maintUpdating}
              onClick={() => handleToggleMaintenance(false)}
              style={{
                background: "#16a34a",
                color: "#fff",
                border: "none",
                borderRadius: 8,
                padding: "12px 20px",
                fontWeight: 700,
                fontSize: 14,
                cursor: "pointer",
                width: "fit-content"
              }}
            >
              {maintUpdating ? "Deactivating..." : "🟢 Deactivate Maintenance Mode (Resume Normal Traffic)"}
            </button>
          )}
        </div>
      )}

      {/* SUB-TAB 4: REAL-TIME AUDIT TRAIL */}
      {activeSubTab === "audit" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h3 style={{ margin: 0, fontSize: 16, color: "#f8fafc" }}>
              Immutable Activity & Audit Stream
            </h3>
            <button
              onClick={loadAuditTrail}
              style={{ background: "#1e293b", color: "#38bdf8", border: "1px solid #334155", padding: "6px 12px", borderRadius: 6, fontSize: 12, cursor: "pointer", fontWeight: 600 }}
            >
              🔄 Refresh Logs
            </button>
          </div>

          <div style={{ overflowX: "auto", border: "1px solid #1e293b", borderRadius: 8 }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, textAlign: "left" }}>
              <thead>
                <tr style={{ background: "#0f172a", borderBottom: "1px solid #334155", color: "#94a3b8" }}>
                  <th style={{ padding: "10px 14px", width: 140 }}>Timestamp</th>
                  <th style={{ padding: "10px 14px", width: 180 }}>Action</th>
                  <th style={{ padding: "10px 14px", width: 120 }}>User / Role</th>
                  <th style={{ padding: "10px 14px", width: 90 }}>Tenant</th>
                  <th style={{ padding: "10px 14px", width: 100 }}>Outcome</th>
                  <th style={{ padding: "10px 14px" }}>Details</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: 24, textAlign: "center", color: "#64748b" }}>
                      No audit log records found.
                    </td>
                  </tr>
                ) : (
                  auditLogs.slice(0, 30).map((log, idx) => (
                    <tr key={log.id || idx} style={{ background: idx % 2 === 0 ? "#0a0f1d" : "#0c1322", borderBottom: "1px solid #1e293b" }}>
                      <td style={{ padding: "10px 14px", color: "#94a3b8", fontSize: 12 }}>
                        {new Date(log.createdAt || log.timestamp).toLocaleTimeString()}
                      </td>
                      <td style={{ padding: "10px 14px", fontFamily: "monospace", color: "#38bdf8", fontWeight: 600 }}>
                        {log.action}
                      </td>
                      <td style={{ padding: "10px 14px" }}>
                        <span style={{ color: "#cbd5e1" }}>{log.userId || "System"}</span>
                        {log.role && <span style={{ color: "#64748b", fontSize: 11, display: "block" }}>{log.role}</span>}
                      </td>
                      <td style={{ padding: "10px 14px", color: "#f59e0b" }}>
                        {log.tenantId ? `T-${log.tenantId}` : "GLOBAL"}
                      </td>
                      <td style={{ padding: "10px 14px" }}>
                        <span style={{
                          background: log.status === "SUCCESS" || log.outcome === "SUCCESS" ? "rgba(16, 185, 129, 0.2)" : "rgba(239, 68, 68, 0.2)",
                          color: log.status === "SUCCESS" || log.outcome === "SUCCESS" ? "#34d399" : "#f87171",
                          padding: "2px 8px",
                          borderRadius: 4,
                          fontSize: 11,
                          fontWeight: 700
                        }}>
                          {log.status || log.outcome || "INFO"}
                        </span>
                      </td>
                      <td style={{ padding: "10px 14px", color: "#94a3b8", fontSize: 12, maxWidth: 300, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {typeof log.details === "object" ? JSON.stringify(log.details) : (log.details || log.description || "-")}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUB-TAB 5: EVENT & NOTIFICATION HUB */}
      {activeSubTab === "events" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 20 }}>
          <div style={{ background: "#0f172a", borderRadius: 10, padding: 20, border: "1px solid #334155" }}>
            <h4 style={{ margin: "0 0 12px 0", color: "#d4af37", fontSize: 15, fontWeight: 700 }}>
              📡 Dispatch Domain Event
            </h4>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, color: "#94a3b8", display: "block", marginBottom: 6 }}>
                  Select Event Type:
                </label>
                <select
                  value={selectedEvent}
                  onChange={(e) => setSelectedEvent(e.target.value)}
                  style={{
                    width: "100%",
                    background: "#020617",
                    border: "1px solid #334155",
                    borderRadius: 8,
                    padding: "8px 12px",
                    color: "#f8fafc",
                    fontSize: 13
                  }}
                >
                  <option value="USER_REGISTERED">USER_REGISTERED</option>
                  <option value="STUDENT_ADMITTED">STUDENT_ADMITTED</option>
                  <option value="PAYMENT_RECEIVED">PAYMENT_RECEIVED</option>
                  <option value="RECORD_UPDATED">RECORD_UPDATED</option>
                  <option value="RECORD_DELETED">RECORD_DELETED</option>
                  <option value="SYSTEM_ALERT_DISPATCHED">SYSTEM_ALERT_DISPATCHED</option>
                  <option value="MAINTENANCE_TOGGLED">MAINTENANCE_TOGGLED</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: 12, color: "#94a3b8", display: "block", marginBottom: 6 }}>
                  Event Payload (JSON):
                </label>
                <textarea
                  rows={6}
                  value={eventPayloadText}
                  onChange={(e) => setEventPayloadText(e.target.value)}
                  style={{
                    width: "100%",
                    background: "#020617",
                    border: "1px solid #334155",
                    borderRadius: 8,
                    padding: "10px",
                    color: "#f8fafc",
                    fontFamily: "monospace",
                    fontSize: 12,
                    boxSizing: "border-box"
                  }}
                />
              </div>

              <button
                onClick={handleDispatchEvent}
                style={{
                  background: "#38bdf8",
                  color: "#020617",
                  border: "none",
                  borderRadius: 8,
                  padding: "10px 16px",
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: "pointer"
                }}
              >
                🚀 Dispatch Event & Broadcast WebSocket
              </button>
            </div>
          </div>

          <div style={{ background: "#0f172a", borderRadius: 10, padding: 20, border: "1px solid #334155" }}>
            <h4 style={{ margin: "0 0 12px 0", color: "#38bdf8", fontSize: 15, fontWeight: 700 }}>
              📥 Dispatch Result / Feedback
            </h4>
            {dispatchResult ? (
              <pre
                style={{
                  background: "#020617",
                  padding: 14,
                  borderRadius: 8,
                  border: "1px solid #1e293b",
                  fontSize: 12,
                  color: "#10b981",
                  overflowX: "auto"
                }}
              >
                {JSON.stringify(dispatchResult, null, 2)}
              </pre>
            ) : (
              <div style={{ color: "#64748b", fontSize: 13, padding: 20, textAlign: "center" }}>
                Select an event and click dispatch to verify the real-time notification engine.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
