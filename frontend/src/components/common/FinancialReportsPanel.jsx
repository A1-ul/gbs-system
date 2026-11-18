import React, { useEffect, useState } from "react";
import apiClient from "../../api/client/apiClient";

/**
 * FinancialReportsPanel.jsx
 * Database-backed school financial reports (Daily, Weekly, Monthly, Termly collections,
 * outstanding balances, failed/cancelled/expired, reversed/refunded, and gateway reconciliation).
 */
export default function FinancialReportsPanel({ currencySymbol = "GHS" }) {
  const [period, setPeriod] = useState("MONTHLY");
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);

  const loadReport = async (selectedPeriod = period) => {
    setLoading(true);
    try {
      const res = await apiClient.get(`/payments/reports/summary?period=${encodeURIComponent(selectedPeriod)}`);
      setReport(res.data?.data || null);
    } catch {
      setReport(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReport(period);
  }, [period]);

  const s = report?.summary || {};

  return (
    <div style={{ background: "rgba(15, 23, 42, 0.78)", border: "1.5px solid rgba(56, 189, 248, 0.3)", borderRadius: "14px", padding: "18px", marginBottom: "1.5rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px", marginBottom: "14px" }}>
        <div>
          <h3 style={{ margin: 0, color: "#38bdf8", fontSize: "1.05rem" }}>Verified Fee Collections & Gateway Financial Report</h3>
          <span style={{ fontSize: "0.78rem", color: "#94a3b8" }}>Live database ledger by period, payment channel, and student balance status</span>
        </div>
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
          {["DAILY", "WEEKLY", "MONTHLY", "TERMLY", "ALL"].map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPeriod(p)}
              style={{
                padding: "6px 12px",
                borderRadius: "8px",
                border: period === p ? "1.5px solid #38bdf8" : "1px solid rgba(148,163,184,0.25)",
                background: period === p ? "rgba(56,189,248,0.2)" : "rgba(2,6,23,0.6)",
                color: "#fff",
                fontWeight: 700,
                fontSize: "0.76rem",
                cursor: "pointer"
              }}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ padding: "16px", color: "#94a3b8", textAlign: "center" }}>Loading verified financial report...</div>
      ) : !report ? (
        <div style={{ padding: "14px", color: "#94a3b8" }}>No report data available for this account yet.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(165px, 1fr))", gap: "10px" }}>
            <div style={{ background: "rgba(2,6,23,0.6)", padding: "12px", borderRadius: "10px" }}>
              <div style={{ fontSize: "0.72rem", color: "#94a3b8" }}>Collected ({period})</div>
              <strong style={{ fontSize: "1.15rem", color: "#34d399" }}>{currencySymbol} {Number(s.totalCollected || 0).toLocaleString()}</strong>
              <div style={{ fontSize: "0.72rem", color: "#64748b" }}>{s.successfulCount || 0} confirmed</div>
            </div>
            <div style={{ background: "rgba(2,6,23,0.6)", padding: "12px", borderRadius: "10px" }}>
              <div style={{ fontSize: "0.72rem", color: "#94a3b8" }}>Outstanding Student Fees</div>
              <strong style={{ fontSize: "1.15rem", color: "#f87171" }}>{currencySymbol} {Number(s.totalOutstanding || 0).toLocaleString()}</strong>
              <div style={{ fontSize: "0.72rem", color: "#64748b" }}>{(report.outstandingStudents || []).length} student(s) with balance</div>
            </div>
            <div style={{ background: "rgba(2,6,23,0.6)", padding: "12px", borderRadius: "10px" }}>
              <div style={{ fontSize: "0.72rem", color: "#94a3b8" }}>Failed / Cancelled</div>
              <strong style={{ fontSize: "1.15rem", color: "#fbbf24" }}>{s.failedCount || 0}</strong>
              <div style={{ fontSize: "0.72rem", color: "#64748b" }}>Zero balance impact</div>
            </div>
            <div style={{ background: "rgba(2,6,23,0.6)", padding: "12px", borderRadius: "10px" }}>
              <div style={{ fontSize: "0.72rem", color: "#94a3b8" }}>Reversed / Refunded</div>
              <strong style={{ fontSize: "1.15rem", color: "#c4b5fd" }}>{currencySymbol} {Number(s.totalReversedOrRefunded || 0).toLocaleString()}</strong>
              <div style={{ fontSize: "0.72rem", color: "#64748b" }}>{s.reversedOrRefundedCount || 0} transaction(s)</div>
            </div>
          </div>

          {report.byGateway && report.byGateway.length > 0 && (
            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
              {report.byGateway.map((gw) => (
                <div key={gw.gateway} style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.3)", borderRadius: "8px", padding: "8px 12px", fontSize: "0.78rem" }}>
                  <strong>{gw.gateway}</strong>: {currencySymbol} {Number(gw.totalAmount).toLocaleString()} ({gw.count})
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
