import React, { useState, useEffect, useCallback } from "react";
import { rcceApi, displayRcceNotice } from "../../../utils/rcceClient";
import { copyTextSafely } from "../../../utils/safeWindow";
import { resetDemoSandboxData } from "../../../utils/tokenStorage";

export default function RcceControlHub() {
  const [activeSubTab, setActiveSubTab] = useState("catalogue"); // 'catalogue' | 'telemetry' | 'maintenance' | 'audit' | 'errors' | 'privacy' | 'events'
  const [loading, setLoading] = useState(false);

  // Catalogue State
  const [catalogue, setCatalogue] = useState([]);
  const [categories, setCategories] = useState(["ALL"]);
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Telemetry & Maintenance State
  const [telemetry, setTelemetry] = useState(null);
  const [poolStatus, setPoolStatus] = useState(null);
  const [infraAudit, setInfraAudit] = useState(null);
  const [maintenanceStatus, setMaintenanceStatus] = useState({
    active: false,
    reason: "",
    activatedAt: null,
    activatedBy: null
  });
  const [maintReasonInput, setMaintReasonInput] = useState("");
  const [maintUpdating, setMaintUpdating] = useState(false);

  // Audit Trail State
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditFilter, setAuditFilter] = useState({ action: "", outcome: "", tenantId: "" });

  // Error Monitor State
  const [errorMonitor, setErrorMonitor] = useState({ totalIssues: 0, failedCount: 0, blockedCount: 0, errors: [] });

  // Permissions & Privacy Audit State
  const [permMatrix, setPermMatrix] = useState(null);
  const [privacyReason, setPrivacyReason] = useState("");
  const [privacyQuery, setPrivacyQuery] = useState("");
  const [privacyResult, setPrivacyResult] = useState(null);

  // Event & Notification Hub State
  const [selectedEvent, setSelectedEvent] = useState("SYSTEM_ERROR_DETECTED");
  const [eventPayloadText, setEventPayloadText] = useState('{\n  "message": "Developer telemetry health & notification verification signal.",\n  "severity": "INFO"\n}');
  const [dispatchResult, setDispatchResult] = useState(null);
  const [recentNotifications, setRecentNotifications] = useState([]);

  // Live Frontend API Wire History
  const [clientHistory, setClientHistory] = useState(() =>
    typeof window !== "undefined" && Array.isArray(window.__gbsRcceResponseHistory)
      ? window.__gbsRcceResponseHistory
      : []
  );

  const loadCatalogue = useCallback(async () => {
    setLoading(true);
    try {
      const res = await rcceApi.getCatalogue();
      if (res.success && res.data) {
        const list = res.data.catalogue || [];
        setCatalogue(list);
        const cats = Array.isArray(res.data.categories) && res.data.categories.length > 0
          ? res.data.categories
          : Array.from(new Set(list.map((i) => i.category)));
        setCategories(["ALL", ...cats]);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const loadSystemTelemetry = useCallback(async () => {
    const [res, poolRes, infraRes] = await Promise.all([
      rcceApi.getSystemStatus(),
      rcceApi.getPoolStatus(),
      rcceApi.getInfrastructureAudit()
    ]);
    if (res.success && res.data) {
      setTelemetry(res.data);
      const maint = res.data.maintenance || {
        active: Boolean(res.data.maintenanceMode),
        reason: res.data.maintenanceReason || ""
      };
      setMaintenanceStatus(maint);
    }
    if (poolRes.success && poolRes.data) {
      setPoolStatus(poolRes.data);
    }
    if (infraRes.success && infraRes.data) {
      setInfraAudit(infraRes.data);
    }
  }, []);

  const loadAuditTrail = useCallback(async (overrideFilter = null) => {
    const activeFilter = overrideFilter || auditFilter;
    const res = await rcceApi.getAuditTrail(activeFilter);
    if (res.success && res.data) {
      setAuditLogs(res.data.logs || res.data.auditLogs || []);
    }
  }, [auditFilter]);

  const loadErrorMonitor = useCallback(async () => {
    const res = await rcceApi.getErrorMonitor();
    if (res.success && res.data) {
      setErrorMonitor(res.data);
    }
  }, []);

  const loadPermissions = useCallback(async () => {
    const res = await rcceApi.getPermissionMatrix();
    if (res.success && res.data) {
      setPermMatrix(res.data);
    }
  }, []);

  const loadNotifications = useCallback(async () => {
    const res = await rcceApi.getNotifications({ limit: 15 });
    if (res.success && res.data) {
      setRecentNotifications(res.data.notifications || []);
    }
  }, []);

  const refreshAll = useCallback(() => {
    loadCatalogue();
    loadSystemTelemetry();
    loadAuditTrail();
    loadErrorMonitor();
    loadPermissions();
    loadNotifications();
  }, [loadCatalogue, loadSystemTelemetry, loadAuditTrail, loadErrorMonitor, loadPermissions, loadNotifications]);

  useEffect(() => {
    refreshAll();
    const onApiLogged = () => {
      if (Array.isArray(window.__gbsRcceResponseHistory)) {
        setClientHistory([...window.__gbsRcceResponseHistory]);
      }
    };
    window.addEventListener("gbs_rcce_response_logged", onApiLogged);
    return () => window.removeEventListener("gbs_rcce_response_logged", onApiLogged);
  }, [refreshAll]);

  const filteredCatalogue = catalogue.filter((item) => {
    if (selectedCategory !== "ALL" && item.category !== selectedCategory) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      String(item.code || "").toLowerCase().includes(q) ||
      String(item.message || "").toLowerCase().includes(q) ||
      String(item.description || "").toLowerCase().includes(q)
    );
  });

  const handleToggleMaintenance = async (enable) => {
    if (enable && !maintReasonInput.trim()) {
      displayRcceNotice({
        success: false,
        code: "VALIDATION_MISSING_REQUIRED",
        status: 400,
        message: "Please provide a clear maintenance notice reason before activating maintenance mode."
      });
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
      await loadSystemTelemetry();
      await loadAuditTrail();
    } finally {
      setMaintUpdating(false);
    }
  };

  const handleTestNotice = (item) => {
    const isSuccess = item.statusCode >= 200 && item.statusCode < 300;
    displayRcceNotice({
      success: isSuccess,
      code: item.code,
      message: item.message,
      status: item.statusCode
    });
  };

  const handleResetDemoCounters = async () => {
    await resetDemoSandboxData({ reloadPage: false });
    displayRcceNotice({
      success: true,
      code: "RECORD_UPDATED_SUCCESS",
      message: "All Demo Sandbox module trial counters (0/10) restored cleanly."
    }, "DEMO SANDBOX RESET");
    await loadSystemTelemetry();
  };

  const handleInspectPrivacyUsers = async (e) => {
    e.preventDefault();
    const res = await rcceApi.inspectPrivacyUsers(privacyReason, privacyQuery);
    displayRcceNotice(res);
    if (res.success && res.data) {
      setPrivacyResult(res.data);
      await loadAuditTrail();
    } else {
      setPrivacyResult({ error: res.message, code: res.code });
    }
  };

  const handleDispatchEvent = async () => {
    let parsedPayload = {};
    try {
      parsedPayload = JSON.parse(eventPayloadText);
    } catch {
      displayRcceNotice({
        success: false,
        code: "VALIDATION_INVALID_INPUT",
        status: 422,
        message: "Invalid JSON payload format in Event Dispatcher."
      });
      return;
    }
    const res = await rcceApi.emitEvent(selectedEvent, parsedPayload);
    setDispatchResult(res);
    displayRcceNotice(res);
    await loadNotifications();
    await loadAuditTrail();
  };

  const dbInfo = telemetry?.database || {};
  const livePool = poolStatus || telemetry?.connectionPool || dbInfo.connectionPool || {};
  const liveInfra = infraAudit || telemetry?.infrastructure || {};
  const demoModules = Object.values(telemetry?.demoUsage?.modules || {});

  const handleSimulatePoolAlert = async (pct) => {
    const res = await rcceApi.simulatePoolThreshold(pct);
    displayRcceNotice(res, pct >= 95 ? "CRITICAL 95% POOL ALERT" : "WARNING 80% POOL NOTICE");
    await loadSystemTelemetry();
    await loadNotifications();
  };

  return (
    <div style={{ background: "#081428", color: "#f8fafc", borderRadius: 14, padding: 24, border: "1.5px solid rgba(212, 175, 55, 0.45)", marginTop: 16 }}>
      {/* Header Banner */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #1e293b", paddingBottom: 16, marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <span style={{ fontSize: 24 }}>⚡</span>
            <h2 style={{ margin: 0, fontSize: 21, color: "#f8fafc", fontWeight: 800, letterSpacing: "0.03em" }}>
              GBS-RCCE CENTRAL RESPONSE, CONTROL & COMMUNICATION ENGINE
            </h2>
            <span style={{ background: "rgba(16, 185, 129, 0.15)", color: "#34d399", border: "1px solid #10b981", padding: "2px 10px", borderRadius: 20, fontSize: 11, fontWeight: 800 }}>
              ENTERPRISE v2.0 ACTIVE
            </span>
          </div>
          <p style={{ margin: "6px 0 0 0", color: "#94a3b8", fontSize: 13 }}>
            Deterministic centralized API envelope, business rules engine, idempotency protection, audited privacy controls, and live telemetry across all GBS systems.
          </p>
        </div>

        <button
          type="button"
          onClick={refreshAll}
          disabled={loading}
          style={{ background: "#0f2347", color: "#f5d061", border: "1px solid #d4af37", padding: "8px 14px", borderRadius: 8, fontSize: 13, cursor: "pointer", fontWeight: 700 }}
        >
          {loading ? "⏳ Refreshing..." : "🔄 Refresh Live Telemetry"}
        </button>
      </div>

      {/* Sub-Tabs Navigation */}
      <div style={{ display: "flex", gap: 8, borderBottom: "1px solid #1e293b", paddingBottom: 12, marginBottom: 20, flexWrap: "wrap" }}>
        {[
          { id: "catalogue", label: `📖 Response Catalogue (${catalogue.length})` },
          { id: "telemetry", label: "🛰️ Live Engine & Demo 10-Cap" },
          { id: "maintenance", label: `🛡️ Maintenance ${maintenanceStatus.active ? "(ACTIVE)" : "(Normal)"}` },
          { id: "audit", label: `📜 Audit Trail (${auditLogs.length})` },
          { id: "errors", label: `🚨 Error Monitor (${errorMonitor.totalIssues || 0})` },
          { id: "privacy", label: "🔒 Permissions & Privacy Gate" },
          { id: "events", label: "📡 Events & Notifications" }
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveSubTab(tab.id)}
            style={{
              background: activeSubTab === tab.id ? "#d4af37" : "#0f172a",
              color: activeSubTab === tab.id ? "#020617" : "#cbd5e1",
              border: activeSubTab === tab.id ? "1px solid #d4af37" : "1px solid #334155",
              padding: "8px 14px",
              borderRadius: 8,
              fontSize: 12.5,
              fontWeight: 700,
              cursor: "pointer"
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* SUB-TAB 1: RESPONSE CATALOGUE */}
      {activeSubTab === "catalogue" && (
        <div>
          <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
            <input
              type="text"
              placeholder="🔍 Search predefined response codes or message text..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ flex: "1 1 280px", background: "#020617", border: "1px solid #334155", borderRadius: 8, padding: "10px 14px", color: "#f8fafc", fontSize: 13.5 }}
            />
            <div style={{ display: "flex", gap: 6, overflowX: "auto", maxWidth: "100%", paddingBottom: 4 }}>
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  style={{
                    background: selectedCategory === cat ? "#d4af37" : "#1e293b",
                    color: selectedCategory === cat ? "#020617" : "#94a3b8",
                    border: "none",
                    borderRadius: 6,
                    padding: "6px 11px",
                    fontSize: 11.5,
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

          <div style={{ overflowX: "auto", border: "1px solid #1e293b", borderRadius: 8 }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, textAlign: "left" }}>
              <thead>
                <tr style={{ background: "#0f172a", borderBottom: "1px solid #334155", color: "#94a3b8" }}>
                  <th style={{ padding: "11px 14px", width: 70 }}>HTTP</th>
                  <th style={{ padding: "11px 14px", width: 240 }}>Response Code</th>
                  <th style={{ padding: "11px 14px", width: 120 }}>Category</th>
                  <th style={{ padding: "11px 14px" }}>Predefined User-Facing Message</th>
                  <th style={{ padding: "11px 14px", width: 130, textAlign: "center" }}>Actions</th>
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
                      <tr key={item.code} style={{ background: idx % 2 === 0 ? "#0a0f1d" : "#0c1322", borderBottom: "1px solid #1e293b" }}>
                        <td style={{ padding: "10px 14px" }}>
                          <span style={{
                            background: isSuccess ? "rgba(16, 185, 129, 0.2)" : "rgba(239, 68, 68, 0.2)",
                            color: isSuccess ? "#34d399" : "#f87171",
                            padding: "2px 8px",
                            borderRadius: 4,
                            fontWeight: 700,
                            fontSize: 12
                          }}>
                            {item.statusCode}
                          </span>
                        </td>
                        <td style={{ padding: "10px 14px", fontFamily: "monospace", color: "#fbbf24", fontWeight: 700 }}>
                          {item.code}
                        </td>
                        <td style={{ padding: "10px 14px" }}>
                          <span style={{ background: "#1e293b", color: "#94a3b8", padding: "2px 8px", borderRadius: 4, fontSize: 11 }}>
                            {item.category}
                          </span>
                        </td>
                        <td style={{ padding: "10px 14px", color: "#f8fafc", lineHeight: 1.4 }}>
                          "{item.message}"
                        </td>
                        <td style={{ padding: "10px 14px", textAlign: "center" }}>
                          <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>
                            <button
                              type="button"
                              onClick={() => handleTestNotice(item)}
                              style={{ background: "#1e293b", color: "#38bdf8", border: "1px solid #334155", padding: "4px 8px", borderRadius: 4, cursor: "pointer", fontSize: 11, fontWeight: 600 }}
                            >
                              Test HUD
                            </button>
                            <button
                              type="button"
                              onClick={() => copyTextSafely(item.code, "Response Code")}
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

      {/* SUB-TAB 2: TRUE ENGINE TELEMETRY & DEMO 10-ENTRY CAP */}
      {activeSubTab === "telemetry" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(270px, 1fr))", gap: 16 }}>
            <div style={{ background: "#0f172a", borderRadius: 10, padding: 18, border: "1px solid #334155" }}>
              <h4 style={{ margin: "0 0 12px 0", color: "#d4af37", fontSize: 15, fontWeight: 700 }}>
                ⚡ Core Engine & Server Health
              </h4>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 13 }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#94a3b8" }}>Engine Status:</span>
                  <span style={{ fontWeight: 700, color: telemetry?.status === "HEALTHY" ? "#34d399" : "#f87171" }}>
                    {telemetry?.status || "LOADING"}
                  </span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#94a3b8" }}>Server Uptime:</span>
                  <span style={{ fontWeight: 700 }}>{telemetry?.systemUptimeSeconds ?? 0}s ({telemetry?.server?.nodeVersion || "Node"})</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#94a3b8" }}>RSS Memory:</span>
                  <span style={{ fontWeight: 700 }}>{telemetry?.server?.memory?.rssMb ?? 0} MB</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#94a3b8" }}>Predefined Codes:</span>
                  <span style={{ fontWeight: 700, color: "#fbbf24" }}>{catalogue.length} Codes</span>
                </div>
              </div>
            </div>

            <div style={{ background: "#0f172a", borderRadius: 10, padding: 18, border: "1px solid #334155" }}>
              <h4 style={{ margin: "0 0 12px 0", color: "#38bdf8", fontSize: 15, fontWeight: 700 }}>
                🗄️ Live Database & Persistence
              </h4>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 13 }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#94a3b8" }}>Database Role:</span>
                  <span style={{ fontWeight: 700, color: dbInfo.active ? "#34d399" : "#fbbf24" }}>
                    {dbInfo.active ? "PRIMARY POSTGRESQL ACTIVE" : (dbInfo.mode || dbInfo.status || "LOCAL STANDBY")}
                  </span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#94a3b8" }}>Engine / Version:</span>
                  <span style={{ fontWeight: 700 }}>{dbInfo.engine || "PostgreSQL"} ({dbInfo.versionShort || dbInfo.version || "Standby"})</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#94a3b8" }}>Pool & Latency:</span>
                  <span style={{ fontWeight: 700, color: "#34d399" }}>
                    Active: {livePool.activeConnections ?? dbInfo.poolActiveConnections ?? 1} • Idle: {livePool.idleConnections ?? 0} / Max: {livePool.maxPoolCapacity ?? dbInfo.poolMaxConnections ?? 25} {dbInfo.latencyMs !== null && dbInfo.latencyMs !== undefined ? `(${dbInfo.latencyMs}ms)` : ""}
                  </span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#94a3b8" }}>PG Max / Safe App Cap:</span>
                  <span style={{ fontWeight: 700, color: "#38bdf8" }}>
                    {livePool.postgresMaxConnections ?? 100} Max ({livePool.maxSafeApplicationConnections ?? 80} Safe App)
                  </span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#94a3b8" }}>Tenants / Users / Audits:</span>
                  <span style={{ fontWeight: 700 }}>
                    {telemetry?.tenancy?.totalTenants ?? 0} / {telemetry?.tenancy?.totalUsers ?? 0} / {telemetry?.tenancy?.totalAuditRecords ?? 0}
                  </span>
                </div>
              </div>
            </div>

            <div style={{ background: "#0f172a", borderRadius: 10, padding: 18, border: "1px solid #334155" }}>
              <h4 style={{ margin: "0 0 12px 0", color: "#10b981", fontSize: 15, fontWeight: 700 }}>
                🔄 Reusable GBS Product Family
              </h4>
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12.5, color: "#cbd5e1", lineHeight: 1.7 }}>
                <li>GBS School Management System (Active Host)</li>
                <li>GBS Examination System (Adapter Ready)</li>
                <li>GBS Real Estate Management System (Adapter Ready)</li>
                <li>GBS Company Management System (Adapter Ready)</li>
              </ul>
            </div>
          </div>

          {/* Centralized Cloud Infrastructure & Connection Pool Monitor */}
          <div style={{ background: "#0f172a", borderRadius: 10, padding: 18, border: "1px solid rgba(56, 189, 248, 0.45)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, flexWrap: "wrap", gap: 10 }}>
              <div>
                <h4 style={{ margin: 0, color: "#38bdf8", fontSize: 15, fontWeight: 800 }}>
                  🐘 PostgreSQL Connection Pool, PgBouncer & Render.com Cloud Infrastructure Monitor
                </h4>
                <p style={{ margin: "4px 0 0 0", color: "#94a3b8", fontSize: 12 }}>
                  Real-time tracking of active, idle, and waiting connections, 80% warning / 95% critical thresholds, CPU/RAM, storage, API latency, and backups.
                </p>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button
                  type="button"
                  onClick={() => handleSimulatePoolAlert(82)}
                  style={{ background: "rgba(245, 158, 11, 0.18)", color: "#fbbf24", border: "1px solid #f59e0b", borderRadius: 6, padding: "6px 11px", fontSize: 11.5, fontWeight: 700, cursor: "pointer" }}
                >
                  ⚠️ Test 80% Pool Warning
                </button>
                <button
                  type="button"
                  onClick={() => handleSimulatePoolAlert(96)}
                  style={{ background: "rgba(239, 68, 68, 0.18)", color: "#f87171", border: "1px solid #ef4444", borderRadius: 6, padding: "6px 11px", fontSize: 11.5, fontWeight: 700, cursor: "pointer" }}
                >
                  🚨 Test 95% Critical Alert
                </button>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(195px, 1fr))", gap: 10 }}>
              {[
                { label: "Active / Idle Connections", val: `${livePool.activeConnections ?? 1} Active • ${livePool.idleConnections ?? 0} Idle`, sub: `Max Pool: ${livePool.maxPoolCapacity ?? 25} (Min: ${livePool.minPoolCapacity ?? 2})`, color: "#34d399" },
                { label: "Waiting / Timeouts / Failed", val: `${livePool.waitingRequests ?? 0} Waiting`, sub: `Timeouts: ${livePool.connectionTimeouts ?? 0} • Failed: ${livePool.failedConnections ?? 0}`, color: "#38bdf8" },
                { label: "Pool Utilization & Alert", val: `${livePool.utilizationPercentage ?? 4}% (${livePool.alertLevel || "NORMAL"})`, sub: `Warn: 80% • Crit: 95% • Leaks: ${livePool.leakedConnectionsDetected ?? 0}`, color: (livePool.utilizationPercentage ?? 0) >= 95 ? "#f87171" : (livePool.utilizationPercentage ?? 0) >= 80 ? "#fbbf24" : "#34d399" },
                { label: "Backend CPU & RAM", val: `CPU: ${liveInfra.backendResources?.cpuUtilizationPct ?? 8}% • RAM: ${liveInfra.backendResources?.ramUtilizationPct ?? 24}%`, sub: `RSS: ${liveInfra.backendResources?.ramRssMb ?? telemetry?.server?.memory?.rssMb ?? 0} MB / ${liveInfra.backendResources?.containerRamLimitMb ?? 512} MB`, color: "#a78bfa" },
                { label: "PostgreSQL CPU & RAM", val: `CPU: ${liveInfra.postgresResources?.cpuUtilizationPct ?? 6}% • RAM: ${liveInfra.postgresResources?.ramUtilizationPct ?? 18}%`, sub: `Est. ${liveInfra.postgresResources?.ramUsedEstimatedMb ?? 42} MB / ${liveInfra.postgresResources?.ramAllocatedMb ?? 256} MB`, color: "#60a5fa" },
                { label: "Database Storage Usage", val: `${liveInfra.postgresResources?.storageUsedPretty || livePool.storage?.databaseSizePretty || "22 MB"}`, sub: `${liveInfra.postgresResources?.storageUtilizationPct ?? 2.2}% of ${liveInfra.postgresResources?.storageQuotaMb ?? 1024} MB Quota`, color: "#34d399" },
                { label: "API Response & Errors", val: `Avg: ${liveInfra.apiPerformance?.avgResponseTimeMs ?? 4.2}ms`, sub: `P95: ${liveInfra.apiPerformance?.p95ResponseTimeMs ?? 12}ms • Failed: ${liveInfra.apiPerformance?.failedRequests ?? 0}`, color: "#f5d061" },
                { label: "Background Jobs & Backups", val: `Jobs Failed: ${liveInfra.backgroundJobs?.totalFailures ?? 0}`, sub: `Backups: ${liveInfra.storageAndBackups?.backupStatus?.totalSnapshots ?? 1} Verified • Uptime: ${liveInfra.uptimeSeconds ?? telemetry?.systemUptimeSeconds ?? 0}s`, color: "#34d399" }
              ].map((card) => (
                <div key={card.label} style={{ background: "#020617", border: "1px solid #1e293b", borderRadius: 8, padding: "10px 12px" }}>
                  <div style={{ fontSize: 11.5, color: "#94a3b8", fontWeight: 600 }}>{card.label}</div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: card.color, marginTop: 4 }}>{card.val}</div>
                  <div style={{ fontSize: 11, color: "#64748b", marginTop: 3 }}>{card.sub}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Demo Sandbox 10-Entry Cap Monitor */}
          <div style={{ background: "#0f172a", borderRadius: 10, padding: 18, border: "1px solid #334155" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 10 }}>
              <div>
                <h4 style={{ margin: 0, color: "#fbbf24", fontSize: 15 }}>
                  🟡 Demo Sandbox 10-Entry Limit Telemetry (Total Demo Entries Used: {telemetry?.demoUsage?.totalUsed ?? 0})
                </h4>
                <p style={{ margin: "4px 0 0 0", color: "#94a3b8", fontSize: 12 }}>
                  Demo Sandbox runs identical production business rules and caps each module at 10 trial entries. Live Production accounts remain unlimited.
                </p>
              </div>
              <button
                type="button"
                onClick={handleResetDemoCounters}
                style={{ background: "rgba(212, 175, 55, 0.2)", color: "#fbbf24", border: "1px solid #d4af37", borderRadius: 8, padding: "7px 14px", fontSize: 12, fontWeight: 800, cursor: "pointer" }}
              >
                🔄 Reset Server Demo Counters (0/10)
              </button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))", gap: 10 }}>
              {demoModules.map((m) => (
                <div key={m.module} style={{ background: "#020617", border: "1px solid #1e293b", borderRadius: 8, padding: "10px 12px" }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#e2e8f0" }}>{m.label}</div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: 12 }}>
                    <span style={{ color: "#94a3b8" }}>{m.module}</span>
                    <span style={{ fontWeight: 800, color: m.limitReached ? "#f87171" : "#34d399" }}>
                      {m.used} / {m.limit}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Live Session API Trace */}
          <div style={{ background: "#0f172a", borderRadius: 10, padding: 18, border: "1px solid #334155" }}>
            <h4 style={{ margin: "0 0 10px 0", color: "#38bdf8", fontSize: 14 }}>
              📡 Live Session Request & Feedback Wire ({clientHistory.length} captured)
            </h4>
            {clientHistory.length === 0 ? (
              <p style={{ margin: 0, color: "#64748b", fontSize: 12.5 }}>Perform any API command in the workspace to inspect live requestId & RCCE codes here.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 220, overflowY: "auto" }}>
                {clientHistory.slice(0, 12).map((h, i) => (
                  <div key={`${h.requestId || i}-${i}`} style={{ display: "flex", gap: 10, alignItems: "center", fontSize: 12, background: "#020617", padding: "6px 10px", borderRadius: 6, border: "1px solid #1e293b", flexWrap: "wrap" }}>
                    <span style={{ color: h.success ? "#34d399" : "#f87171", fontWeight: 800 }}>{h.status}</span>
                    <span style={{ fontFamily: "monospace", color: "#fbbf24" }}>{h.code}</span>
                    <span style={{ color: "#94a3b8" }}>{h.method} {h.url}</span>
                    <span style={{ color: "#cbd5e1", flex: 1 }}>{h.message}</span>
                    {h.requestId && <span style={{ fontFamily: "monospace", fontSize: 11, color: "#64748b" }}>{h.requestId}</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUB-TAB 3: MAINTENANCE MODE CONTROL */}
      {activeSubTab === "maintenance" && (
        <div style={{ background: "#0f172a", borderRadius: 10, padding: 24, border: "1px solid #334155", maxWidth: 720 }}>
          <h3 style={{ margin: "0 0 8px 0", color: maintenanceStatus.active ? "#f87171" : "#34d399", fontSize: 18 }}>
            System Maintenance Mode: {maintenanceStatus.active ? "🔴 ACTIVATED" : "🟢 DEACTIVATED (NORMAL OPERATION)"}
          </h3>
          <p style={{ color: "#94a3b8", fontSize: 13, marginBottom: 20 }}>
            When activated, non-developer/non-super-admin operations return HTTP 503 with code <code>SYSTEM_MAINTENANCE_ACTIVE</code> while Developer Mission Control stays accessible for safe management and restoration.
          </p>

          {maintenanceStatus.active && (
            <div style={{ background: "rgba(239, 68, 68, 0.1)", border: "1px solid #ef4444", borderRadius: 8, padding: 14, marginBottom: 16 }}>
              <div style={{ fontSize: 13, color: "#fca5a5" }}>
                <strong>Active Maintenance Notice:</strong> {maintenanceStatus.reason || "Scheduled infrastructure maintenance."}
              </div>
              {maintenanceStatus.activatedAt && (
                <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 4 }}>
                  Activated by {maintenanceStatus.activatedBy || "DEVELOPER"} at {new Date(maintenanceStatus.activatedAt).toLocaleString()}
                </div>
              )}
            </div>
          )}

          {!maintenanceStatus.active ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <label style={{ fontSize: 13, color: "#cbd5e1", fontWeight: 600 }}>Maintenance Notice for Users:</label>
              <input
                type="text"
                placeholder="e.g. Scheduled database schema synchronization. Service resumes shortly."
                value={maintReasonInput}
                onChange={(e) => setMaintReasonInput(e.target.value)}
                style={{ background: "#020617", border: "1px solid #334155", borderRadius: 8, padding: "10px 14px", color: "#f8fafc", fontSize: 14 }}
              />
              <button
                type="button"
                disabled={maintUpdating}
                onClick={() => handleToggleMaintenance(true)}
                style={{ background: "#dc2626", color: "#fff", border: "none", borderRadius: 8, padding: "11px 18px", fontWeight: 700, fontSize: 13.5, cursor: "pointer", width: "fit-content" }}
              >
                {maintUpdating ? "Activating..." : "🚨 Enable System Maintenance Mode"}
              </button>
            </div>
          ) : (
            <button
              type="button"
              disabled={maintUpdating}
              onClick={() => handleToggleMaintenance(false)}
              style={{ background: "#16a34a", color: "#fff", border: "none", borderRadius: 8, padding: "11px 18px", fontWeight: 700, fontSize: 13.5, cursor: "pointer", width: "fit-content" }}
            >
              {maintUpdating ? "Restoring..." : "🟢 Deactivate Maintenance Mode (Restore Operations)"}
            </button>
          )}
        </div>
      )}

      {/* SUB-TAB 4: REAL-TIME AUDIT TRAIL */}
      {activeSubTab === "audit" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, flexWrap: "wrap", gap: 10 }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <input
                type="text"
                placeholder="Filter by action verb..."
                value={auditFilter.action}
                onChange={(e) => setAuditFilter((p) => ({ ...p, action: e.target.value }))}
                style={{ background: "#020617", border: "1px solid #334155", borderRadius: 6, padding: "6px 10px", color: "#f8fafc", fontSize: 12.5 }}
              />
              <select
                value={auditFilter.outcome}
                onChange={(e) => {
                  const next = { ...auditFilter, outcome: e.target.value };
                  setAuditFilter(next);
                  loadAuditTrail(next);
                }}
                style={{ background: "#020617", border: "1px solid #334155", borderRadius: 6, padding: "6px 10px", color: "#f8fafc", fontSize: 12.5 }}
              >
                <option value="">All Outcomes</option>
                <option value="SUCCESS">SUCCESS</option>
                <option value="FAILED">FAILED</option>
                <option value="BLOCKED">BLOCKED</option>
              </select>
              <button
                type="button"
                onClick={() => loadAuditTrail()}
                style={{ background: "#1e293b", color: "#38bdf8", border: "1px solid #334155", padding: "6px 12px", borderRadius: 6, fontSize: 12, cursor: "pointer", fontWeight: 700 }}
              >
                🔍 Apply & Refresh
              </button>
            </div>
          </div>

          <div style={{ overflowX: "auto", border: "1px solid #1e293b", borderRadius: 8 }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5, textAlign: "left" }}>
              <thead>
                <tr style={{ background: "#0f172a", borderBottom: "1px solid #334155", color: "#94a3b8" }}>
                  <th style={{ padding: "10px 12px" }}>Time</th>
                  <th style={{ padding: "10px 12px" }}>Action / Module</th>
                  <th style={{ padding: "10px 12px" }}>Role / User</th>
                  <th style={{ padding: "10px 12px" }}>Tenant</th>
                  <th style={{ padding: "10px 12px" }}>Outcome</th>
                  <th style={{ padding: "10px 12px" }}>Details / Request Ref</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: 24, textAlign: "center", color: "#64748b" }}>
                      No matching audit log records found.
                    </td>
                  </tr>
                ) : (
                  auditLogs.slice(0, 40).map((log, idx) => {
                    const out = String(log.outcome || "SUCCESS").toUpperCase();
                    return (
                      <tr key={log.id || idx} style={{ background: idx % 2 === 0 ? "#0a0f1d" : "#0c1322", borderBottom: "1px solid #1e293b" }}>
                        <td style={{ padding: "9px 12px", color: "#94a3b8", whiteSpace: "nowrap" }}>
                          {log.createdAt ? new Date(log.createdAt).toLocaleTimeString() : "-"}
                        </td>
                        <td style={{ padding: "9px 12px" }}>
                          <div style={{ fontFamily: "monospace", color: "#38bdf8", fontWeight: 700 }}>{log.action}</div>
                          <div style={{ fontSize: 11, color: "#64748b" }}>{log.module}</div>
                        </td>
                        <td style={{ padding: "9px 12px" }}>
                          <div style={{ color: "#e2e8f0", fontWeight: 700 }}>{log.userRole || log.role || "SYSTEM"}</div>
                          <div style={{ fontSize: 11, color: "#64748b" }}>ID: {log.userId ?? "-"}</div>
                        </td>
                        <td style={{ padding: "9px 12px", color: "#f59e0b" }}>
                          {log.tenantId ? `T-${log.tenantId}` : "GLOBAL"}
                        </td>
                        <td style={{ padding: "9px 12px" }}>
                          <span style={{
                            background: out === "SUCCESS" ? "rgba(16, 185, 129, 0.2)" : "rgba(239, 68, 68, 0.2)",
                            color: out === "SUCCESS" ? "#34d399" : "#f87171",
                            padding: "2px 8px",
                            borderRadius: 4,
                            fontSize: 11,
                            fontWeight: 700
                          }}>
                            {out}
                          </span>
                        </td>
                        <td style={{ padding: "9px 12px", color: "#cbd5e1", maxWidth: 360 }}>
                          <div>{typeof log.details === "object" ? JSON.stringify(log.details) : (log.details || "-")}</div>
                          {log.requestId && <div style={{ fontSize: 10.5, fontFamily: "monospace", color: "#64748b" }}>Ref: {log.requestId}</div>}
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

      {/* SUB-TAB 5: ERROR & FAILURE MONITOR */}
      {activeSubTab === "errors" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, flexWrap: "wrap", gap: 10 }}>
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <span style={{ background: "rgba(239, 68, 68, 0.15)", border: "1px solid #ef4444", color: "#fca5a5", padding: "5px 12px", borderRadius: 8, fontSize: 12.5, fontWeight: 700 }}>
                Failed Operations: {errorMonitor.failedCount ?? 0}
              </span>
              <span style={{ background: "rgba(245, 158, 11, 0.15)", border: "1px solid #f59e0b", color: "#fde68a", padding: "5px 12px", borderRadius: 8, fontSize: 12.5, fontWeight: 700 }}>
                Blocked / Access Denied: {errorMonitor.blockedCount ?? 0}
              </span>
            </div>
            <button
              type="button"
              onClick={loadErrorMonitor}
              style={{ background: "#1e293b", color: "#38bdf8", border: "1px solid #334155", padding: "6px 12px", borderRadius: 6, fontSize: 12, cursor: "pointer", fontWeight: 700 }}
            >
              🔄 Refresh Error Feed
            </button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {(errorMonitor.errors || []).length === 0 ? (
              <div style={{ background: "#0f172a", padding: 24, borderRadius: 8, textAlign: "center", color: "#34d399", border: "1px solid #1e293b" }}>
                ✅ Zero failed or blocked operations recorded in the active monitor window.
              </div>
            ) : (
              (errorMonitor.errors || []).map((errItem, idx) => (
                <div key={errItem.id || idx} style={{ background: "#0f172a", border: "1px solid rgba(239, 68, 68, 0.4)", borderRadius: 8, padding: 12, display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 800, color: "#f87171" }}>
                      [{errItem.outcome}] {errItem.action} ({errItem.userRole || "CLIENT"})
                    </div>
                    <div style={{ fontSize: 12.5, color: "#e2e8f0", marginTop: 4 }}>{errItem.details}</div>
                  </div>
                  <div style={{ textAlign: "right", fontSize: 11.5, color: "#94a3b8" }}>
                    <div>{errItem.affectedRecord || "-"}</div>
                    <div style={{ fontFamily: "monospace" }}>{errItem.requestId || "-"}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* SUB-TAB 6: PERMISSIONS & AUDITED PRIVACY INSPECTOR */}
      {activeSubTab === "privacy" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 20 }}>
          <div style={{ background: "#0f172a", borderRadius: 10, padding: 18, border: "1px solid #334155" }}>
            <h4 style={{ margin: "0 0 12px 0", color: "#d4af37", fontSize: 15 }}>
              🗝️ Role Permission Matrix (All 9 Portal Roles)
            </h4>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 420, overflowY: "auto" }}>
              {Object.entries(permMatrix?.roles || {}).map(([roleKey, spec]) => (
                <div key={roleKey} style={{ background: "#020617", border: "1px solid #1e293b", borderRadius: 8, padding: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, fontWeight: 800, color: "#f5d061" }}>
                    <span>{roleKey}</span>
                    <span style={{ color: "#38bdf8", fontSize: 11 }}>{spec.scope}</span>
                  </div>
                  <div style={{ fontSize: 12, color: "#cbd5e1", marginTop: 4 }}>{spec.label}</div>
                  <div style={{ fontSize: 11.5, color: "#94a3b8", marginTop: 4 }}>
                    Allowed: {(spec.allowedActions || []).join(" • ")}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ background: "#0f172a", borderRadius: 10, padding: 18, border: "1px solid #334155" }}>
            <h4 style={{ margin: "0 0 8px 0", color: "#38bdf8", fontSize: 15 }}>
              🔒 Audited Developer Privacy Gate
            </h4>
            <p style={{ margin: "0 0 14px 0", fontSize: 12.5, color: "#94a3b8" }}>
              Developer access never grants unrestricted raw viewing of private credentials. Every lookup requires an explicit diagnostic reason, masks sensitive contacts, and creates an immutable audit trail entry.
            </p>
            <form onSubmit={handleInspectPrivacyUsers} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <input
                type="text"
                placeholder="Mandatory diagnostic audit reason (e.g. Investigating staff login ticket #104)"
                value={privacyReason}
                onChange={(e) => setPrivacyReason(e.target.value)}
                style={{ background: "#020617", border: "1px solid #334155", borderRadius: 8, padding: "9px 12px", color: "#f8fafc", fontSize: 13 }}
              />
              <input
                type="text"
                placeholder="Optional search filter (email, role, or name)"
                value={privacyQuery}
                onChange={(e) => setPrivacyQuery(e.target.value)}
                style={{ background: "#020617", border: "1px solid #334155", borderRadius: 8, padding: "9px 12px", color: "#f8fafc", fontSize: 13 }}
              />
              <button
                type="submit"
                style={{ background: "#d4af37", color: "#020617", border: "none", borderRadius: 8, padding: "9px 14px", fontWeight: 800, fontSize: 13, cursor: "pointer", width: "fit-content" }}
              >
                🛡️ Run Audited Privacy Inspection
              </button>
            </form>

            {privacyResult && (
              <div style={{ marginTop: 14, background: "#020617", border: "1px solid #1e293b", borderRadius: 8, padding: 12, maxHeight: 230, overflowY: "auto" }}>
                {privacyResult.error ? (
                  <div style={{ color: "#f87171", fontSize: 12.5 }}>{privacyResult.code}: {privacyResult.error}</div>
                ) : (
                  <div>
                    <div style={{ color: "#34d399", fontSize: 12, fontWeight: 700, marginBottom: 8 }}>
                      ✓ Audited ({privacyResult.privacySeal}) • {privacyResult.count} users returned
                    </div>
                    {(privacyResult.users || []).slice(0, 8).map((u, idx) => (
                      <div key={u.id || u.email || idx} style={{ borderTop: "1px solid #1e293b", padding: "6px 0", fontSize: 12 }}>
                        <strong>{u.firstName} {u.lastName}</strong> ({u.role}) • {u.email} • Phone: <code>{u.phone || "••••"}</code> • Pass: <code>{u.password || "[REDACTED]"}</code>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUB-TAB 7: EVENT & NOTIFICATION HUB */}
      {activeSubTab === "events" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 20 }}>
          <div style={{ background: "#0f172a", borderRadius: 10, padding: 20, border: "1px solid #334155" }}>
            <h4 style={{ margin: "0 0 12px 0", color: "#d4af37", fontSize: 15, fontWeight: 700 }}>
              📡 Dispatch Domain Event
            </h4>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <select
                value={selectedEvent}
                onChange={(e) => setSelectedEvent(e.target.value)}
                style={{ width: "100%", background: "#020617", border: "1px solid #334155", borderRadius: 8, padding: "8px 12px", color: "#f8fafc", fontSize: 13 }}
              >
                <option value="USER_REGISTERED">USER_REGISTERED</option>
                <option value="STUDENT_ADMITTED">STUDENT_ADMITTED</option>
                <option value="PAYMENT_RECEIVED">PAYMENT_RECEIVED</option>
                <option value="PAYMENT_REJECTED">PAYMENT_REJECTED</option>
                <option value="RECORD_UPDATED">RECORD_UPDATED</option>
                <option value="REQUEST_SUBMITTED">REQUEST_SUBMITTED</option>
                <option value="REQUEST_APPROVED">REQUEST_APPROVED</option>
                <option value="REQUEST_REJECTED">REQUEST_REJECTED</option>
                <option value="REPORT_GENERATED">REPORT_GENERATED</option>
                <option value="ACCOUNT_SUSPENDED">ACCOUNT_SUSPENDED</option>
                <option value="SUBSCRIPTION_EXPIRED">SUBSCRIPTION_EXPIRED</option>
                <option value="SYSTEM_ERROR_DETECTED">SYSTEM_ERROR_DETECTED</option>
              </select>

              <textarea
                rows={5}
                value={eventPayloadText}
                onChange={(e) => setEventPayloadText(e.target.value)}
                style={{ width: "100%", background: "#020617", border: "1px solid #334155", borderRadius: 8, padding: 10, color: "#f8fafc", fontFamily: "monospace", fontSize: 12, boxSizing: "border-box" }}
              />

              <button
                type="button"
                onClick={handleDispatchEvent}
                style={{ background: "#38bdf8", color: "#020617", border: "none", borderRadius: 8, padding: "10px 16px", fontWeight: 700, fontSize: 13, cursor: "pointer" }}
              >
                🚀 Emit Event & Queue Notification
              </button>
            </div>
            {dispatchResult && (
              <pre style={{ background: "#020617", marginTop: 12, padding: 12, borderRadius: 8, border: "1px solid #1e293b", fontSize: 11.5, color: "#10b981", overflowX: "auto" }}>
                {JSON.stringify(dispatchResult, null, 2)}
              </pre>
            )}
          </div>

          <div style={{ background: "#0f172a", borderRadius: 10, padding: 20, border: "1px solid #334155" }}>
            <h4 style={{ margin: "0 0 12px 0", color: "#38bdf8", fontSize: 15, fontWeight: 700 }}>
              🔔 Recent System Notification Queue ({recentNotifications.length})
            </h4>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 340, overflowY: "auto" }}>
              {recentNotifications.length === 0 ? (
                <div style={{ color: "#64748b", fontSize: 13, padding: 16, textAlign: "center" }}>
                  No queued notifications yet. Emit an event or run a domain operation to inspect live notifications.
                </div>
              ) : (
                recentNotifications.map((n) => (
                  <div key={n.id} style={{ background: "#020617", border: "1px solid #1e293b", borderRadius: 8, padding: 10 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, fontWeight: 700, color: "#fbbf24" }}>
                      <span>{n.title}</span>
                      <span style={{ color: "#34d399" }}>{n.status}</span>
                    </div>
                    <div style={{ fontSize: 12.5, color: "#e2e8f0", marginTop: 4 }}>{n.content}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
