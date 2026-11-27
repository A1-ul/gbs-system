import React, { useEffect, useState } from "react";
import {
  subscribeConnectionMonitor,
  probeCentralEngineHealth,
  getConnectionSnapshot
} from "../../../utils/connectionMonitor";

function formatUptime(totalSec) {
  if (typeof totalSec !== "number" || !Number.isFinite(totalSec)) return "Probing...";
  const d = Math.floor(totalSec / 86400);
  const h = Math.floor((totalSec % 86400) / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  return `${m}m ${s}s`;
}

function badgeStyle(status) {
  const s = String(status || "").toUpperCase();
  if (s === "ONLINE" || s === "HEALTHY") {
    return { bg: "rgba(16, 185, 129, 0.2)", border: "#10b981", color: "#34d399", dot: "●" };
  }
  if (s === "DEGRADED" || s === "RECONNECTING" || s === "MAINTENANCE" || s === "CHECKING") {
    return { bg: "rgba(245, 158, 11, 0.2)", border: "#f59e0b", color: "#fbbf24", dot: "◐" };
  }
  return { bg: "rgba(239, 68, 68, 0.2)", border: "#ef4444", color: "#f87171", dot: "○" };
}

/**
 * Truthful Live Connection & Central Engine Health Monitor for the Developer Dashboard.
 * Displays Frontend status, Central Engine status, Database status, API response time,
 * Last successful connection, Last failure reason, Server uptime, and Recent connection errors.
 */
export default function CentralEngineHealthPanel({ compact = false }) {
  const [conn, setConn] = useState(() => getConnectionSnapshot());
  const [probing, setProbing] = useState(false);

  useEffect(() => {
    return subscribeConnectionMonitor((snap) => {
      setConn(snap);
    });
  }, []);

  const handleManualProbe = async () => {
    setProbing(true);
    try {
      await probeCentralEngineHealth({ reason: "developer_manual_check" });
    } finally {
      setProbing(false);
    }
  };

  const feBadge = badgeStyle(conn.frontendStatus);
  const engBadge = badgeStyle(conn.centralEngineStatus);
  const dbBadge = badgeStyle(conn.databaseStatus);

  return (
    <div
      data-testid="developer-central-engine-health-panel"
      style={{
        background: "linear-gradient(145deg, rgba(8, 20, 40, 0.96) 0%, rgba(15, 23, 42, 0.96) 100%)",
        border: `1.5px solid ${engBadge.border}`,
        borderRadius: "14px",
        padding: compact ? "14px" : "18px",
        marginTop: "14px",
        marginBottom: "14px",
        color: "#f8fafc"
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px", marginBottom: "12px" }}>
        <div>
          <div style={{ fontSize: "0.72rem", fontWeight: 900, color: "#38bdf8", textTransform: "uppercase", letterSpacing: "0.8px" }}>
            🛰️ INTELLIGENT CONNECTION MONITOR • TRUTHFUL ENGINE &amp; DATABASE HEALTH
          </div>
          <h4 style={{ margin: "3px 0 0", fontSize: "1.02rem", color: "#ffffff", fontWeight: 900 }}>
            GBS Central Engine Live Connectivity &amp; Diagnostics
          </h4>
        </div>
        <button
          type="button"
          disabled={probing}
          data-testid="dev-health-recheck-btn"
          onClick={handleManualProbe}
          style={{
            background: "rgba(56, 189, 248, 0.18)",
            color: "#7dd3fc",
            border: "1px solid #38bdf8",
            borderRadius: "8px",
            padding: "7px 14px",
            fontWeight: 800,
            fontSize: "0.78rem",
            cursor: probing ? "wait" : "pointer"
          }}
        >
          {probing ? "⏳ Probing Engine..." : "🔄 Verify Live Connection"}
        </button>
      </div>

      {/* 8 Required Truthful Connection Telemetry Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: "10px", marginBottom: "12px" }}>
        <div style={{ background: "#020617", border: `1px solid ${feBadge.border}`, borderRadius: "10px", padding: "10px 12px" }}>
          <div style={{ fontSize: "0.7rem", color: "#94a3b8", fontWeight: 700, textTransform: "uppercase" }}>Frontend Status</div>
          <div style={{ fontSize: "0.95rem", fontWeight: 900, color: feBadge.color, marginTop: "4px" }}>
            {feBadge.dot} {conn.frontendStatus}
          </div>
          <div style={{ fontSize: "0.7rem", color: "#64748b", marginTop: "2px" }}>Browser Network Link</div>
        </div>

        <div style={{ background: "#020617", border: `1px solid ${engBadge.border}`, borderRadius: "10px", padding: "10px 12px" }}>
          <div style={{ fontSize: "0.7rem", color: "#94a3b8", fontWeight: 700, textTransform: "uppercase" }}>Central Engine Status</div>
          <div data-testid="dev-central-engine-status" style={{ fontSize: "0.95rem", fontWeight: 900, color: engBadge.color, marginTop: "4px" }}>
            {engBadge.dot} {conn.centralEngineStatus}
          </div>
          <div style={{ fontSize: "0.7rem", color: "#64748b", marginTop: "2px" }}>
            Retry cadence: {Math.round((conn.nextRetryDelayMs || 30000) / 1000)}s • Failures: {conn.consecutiveFailures}
          </div>
        </div>

        <div style={{ background: "#020617", border: `1px solid ${dbBadge.border}`, borderRadius: "10px", padding: "10px 12px" }}>
          <div style={{ fontSize: "0.7rem", color: "#94a3b8", fontWeight: 700, textTransform: "uppercase" }}>Database Status</div>
          <div data-testid="dev-database-health-status" style={{ fontSize: "0.95rem", fontWeight: 900, color: dbBadge.color, marginTop: "4px" }}>
            {dbBadge.dot} {conn.databaseStatus}
          </div>
          <div style={{ fontSize: "0.7rem", color: "#94a3b8", marginTop: "2px" }}>
            {conn.databaseMode}{conn.databaseLatencyMs != null ? ` • ${conn.databaseLatencyMs}ms` : ""}
          </div>
        </div>

        <div style={{ background: "#020617", border: "1px solid #334155", borderRadius: "10px", padding: "10px 12px" }}>
          <div style={{ fontSize: "0.7rem", color: "#94a3b8", fontWeight: 700, textTransform: "uppercase" }}>API Response Time</div>
          <div style={{ fontSize: "0.95rem", fontWeight: 900, color: "#38bdf8", marginTop: "4px" }}>
            {conn.apiResponseTimeMs != null ? `${conn.apiResponseTimeMs} ms` : "Measuring..."}
          </div>
          <div style={{ fontSize: "0.7rem", color: "#64748b", marginTop: "2px" }}>
            Avg: {conn.avgApiResponseTimeMs != null ? `${conn.avgApiResponseTimeMs} ms` : "—"}
          </div>
        </div>

        <div style={{ background: "#020617", border: "1px solid #334155", borderRadius: "10px", padding: "10px 12px" }}>
          <div style={{ fontSize: "0.7rem", color: "#94a3b8", fontWeight: 700, textTransform: "uppercase" }}>Server Uptime</div>
          <div style={{ fontSize: "0.95rem", fontWeight: 900, color: "#a7f3d0", marginTop: "4px" }}>
            {formatUptime(conn.serverUptimeSeconds)}
          </div>
          <div style={{ fontSize: "0.7rem", color: "#64748b", marginTop: "2px" }}>
            {conn.serverUptimeSeconds != null ? `${conn.serverUptimeSeconds}s continuous` : "Awaiting probe"}
          </div>
        </div>

        <div style={{ background: "#020617", border: "1px solid #334155", borderRadius: "10px", padding: "10px 12px" }}>
          <div style={{ fontSize: "0.7rem", color: "#94a3b8", fontWeight: 700, textTransform: "uppercase" }}>Last Successful Connection</div>
          <div style={{ fontSize: "0.84rem", fontWeight: 800, color: "#f8fafc", marginTop: "4px" }}>
            {conn.lastSuccessfulConnectionAt ? new Date(conn.lastSuccessfulConnectionAt).toLocaleTimeString() : "Not connected yet"}
          </div>
          <div style={{ fontSize: "0.7rem", color: "#64748b", marginTop: "2px" }}>
            {conn.lastSuccessfulConnectionAt ? new Date(conn.lastSuccessfulConnectionAt).toLocaleDateString() : "Waiting for first 200 OK"}
          </div>
        </div>

        <div style={{ background: "#020617", border: conn.lastFailureReason ? "1px solid #ef4444" : "1px solid #334155", borderRadius: "10px", padding: "10px 12px", gridColumn: "span 2" }}>
          <div style={{ fontSize: "0.7rem", color: "#94a3b8", fontWeight: 700, textTransform: "uppercase" }}>Last Failure Reason &amp; Database Detail</div>
          <div style={{ fontSize: "0.8rem", fontWeight: 700, color: conn.lastFailureReason ? "#fca5a5" : "#6ee7b7", marginTop: "4px" }}>
            {conn.lastFailureReason || "None — Central Engine connection verified healthy."}
          </div>
          <div style={{ fontSize: "0.72rem", color: "#cbd5e1", marginTop: "3px" }}>
            {conn.databaseSummary}
          </div>
        </div>
      </div>

      {/* Recent Connection Errors Ring Buffer */}
      <div style={{ background: "#020617", border: "1px solid #1e293b", borderRadius: "10px", padding: "10px 12px" }}>
        <div style={{ fontSize: "0.72rem", fontWeight: 800, color: "#f6dd84", marginBottom: "6px", textTransform: "uppercase" }}>
          Recent Connection Errors ({conn.recentConnectionErrors.length})
        </div>
        {conn.recentConnectionErrors.length === 0 ? (
          <div style={{ fontSize: "0.78rem", color: "#6ee7b7" }}>
            ✅ Zero connection interruptions recorded during this session.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "5px", maxHeight: "140px", overflowY: "auto" }}>
            {conn.recentConnectionErrors.slice(0, 8).map((err) => (
              <div key={err.id} style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap", fontSize: "0.74rem", padding: "5px 8px", borderRadius: "6px", background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.3)" }}>
                <span style={{ color: "#94a3b8", fontFamily: "monospace" }}>{new Date(err.timestamp).toLocaleTimeString()}</span>
                <span style={{ color: "#fca5a5", fontWeight: 800 }}>{err.status ? `HTTP ${err.status}` : "NET_ERR"}</span>
                <span style={{ color: "#cbd5e1", fontFamily: "monospace" }}>{err.endpoint}</span>
                <span style={{ color: "#fecaca", flex: 1 }}>{err.reason}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
