import React, { useEffect, useState } from "react";
import apiClient from "../../api/client/apiClient";

/**
 * PaymentGatewayAdminPanel.jsx
 * Live Payment Gateway Administration Console used by Developer & Accountant portals.
 * - Configures gateway mode (TEST/LIVE), enabled channels, school subaccount/merchant routing,
 *   partial-payment policy, and commercial bank details (NEVER exposes raw API secret keys).
 * - Monitors transactions, verifies references server-to-server, approves bank deposits,
 *   manages refunds/reversals, retries failed webhooks, and reconciles pending transactions.
 */
export default function PaymentGatewayAdminPanel({
  tenantId = null,
  currencySymbol = "GHS",
  allowConfigEdit = true,
  title = "Payment Gateways & Verification Control"
}) {
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [overview, setOverview] = useState({
    configs: [],
    gatewayHealth: [],
    transactions: [],
    webhooks: [],
    receipts: [],
    auditLogs: [],
    stats: {}
  });
  const [verifyInput, setVerifyInput] = useState("");
  const [verifiedResult, setVerifiedResult] = useState(null);
  const [activeSubView, setActiveSubView] = useState("GATEWAYS"); // GATEWAYS | TRANSACTIONS | WEBHOOKS | HEALTH | AUDIT
  const [editingGateway, setEditingGateway] = useState(null);
  const [configDraft, setConfigDraft] = useState({});

  const loadOverview = async () => {
    setLoading(true);
    try {
      const qs = tenantId ? `?tenantId=${encodeURIComponent(tenantId)}` : "";
      const res = await apiClient.get(`/payments/admin/overview${qs}`);
      if (res.data?.data) {
        setOverview(res.data.data);
      }
    } catch (err) {
      setFeedback({ type: "error", message: err.response?.data?.message || "Could not load gateway status." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOverview();
  }, [tenantId]);

  const handleVerifyReference = async (e) => {
    e.preventDefault();
    if (!verifyInput.trim()) return;
    setLoading(true);
    setFeedback(null);
    setVerifiedResult(null);
    try {
      const res = await apiClient.get(`/payments/${encodeURIComponent(verifyInput.trim())}/verify`);
      const data = res.data?.data;
      setVerifiedResult(data);
      setFeedback({
        type: data?.transaction?.gatewayStatus === "SUCCESSFUL" ? "success" : "info",
        message: `Server verification complete: ${data?.transaction?.reference} is ${data?.transaction?.gatewayStatus}.`
      });
      loadOverview();
    } catch (err) {
      setFeedback({ type: "error", message: err.response?.data?.message || "Transaction reference was not found." });
    } finally {
      setLoading(false);
    }
  };

  const handleReconcilePending = async () => {
    setLoading(true);
    setFeedback(null);
    try {
      const res = await apiClient.post("/payments/reconcile", { allTenants: !tenantId });
      const data = res.data?.data;
      setFeedback({
        type: "success",
        message: `Checked ${data?.checked || 0} open transaction(s) directly with payment providers.`
      });
      loadOverview();
    } catch (err) {
      setFeedback({ type: "error", message: err.response?.data?.message || "Reconciliation failed." });
    } finally {
      setLoading(false);
    }
  };

  const handleRetryWebhooks = async () => {
    setLoading(true);
    setFeedback(null);
    try {
      const res = await apiClient.post("/payments/admin/webhooks/retry");
      const count = res.data?.data?.retried || 0;
      setFeedback({ type: "success", message: `Retried ${count} pending/failed webhook event(s).` });
      loadOverview();
    } catch (err) {
      setFeedback({ type: "error", message: err.response?.data?.message || "Webhook retry failed." });
    } finally {
      setLoading(false);
    }
  };

  const handleAdminAction = async (reference, action) => {
    setLoading(true);
    setFeedback(null);
    try {
      await apiClient.post(`/payments/${encodeURIComponent(reference)}/admin-action`, { action });
      setFeedback({ type: "success", message: `Updated ${reference} (${action}).` });
      loadOverview();
    } catch (err) {
      setFeedback({ type: "error", message: err.response?.data?.message || "Action could not be completed." });
    } finally {
      setLoading(false);
    }
  };

  const startEditGateway = (cfg) => {
    setEditingGateway(cfg.gateway);
    setConfigDraft({
      mode: cfg.mode || "TEST",
      isEnabled: Boolean(cfg.isEnabled),
      supportsMtnMomo: Boolean(cfg.supportsMtnMomo),
      supportsTelecelCash: Boolean(cfg.supportsTelecelCash),
      supportsAtMoney: Boolean(cfg.supportsAtMoney),
      supportsVisa: Boolean(cfg.supportsVisa),
      supportsMastercard: Boolean(cfg.supportsMastercard),
      supportsBankTransfer: Boolean(cfg.supportsBankTransfer),
      paystackSubaccountCode: cfg.paystackSubaccountCode || "",
      paystackPublicKey: cfg.paystackPublicKey || "",
      paystackSecretKey: "",
      paystackWebhookSecret: "",
      hubtelMerchantAccount: cfg.hubtelMerchantAccount || "",
      hubtelClientId: cfg.hubtelClientId || "",
      hubtelClientSecret: "",
      hubtelWebhookSecret: "",
      bankName: cfg.bankName || "",
      bankAccountNumber: cfg.bankAccountNumber || "",
      bankAccountName: cfg.bankAccountName || "",
      bankBranch: cfg.bankBranch || "",
      allowPartialPayments: cfg.allowPartialPayments !== false,
      minPartialPercent: cfg.minPartialPercent || 20
    });
  };

  const handleTestGateway = async (gwName) => {
    setLoading(true);
    setFeedback(null);
    try {
      const res = await apiClient.post(`/payments/admin/test-gateway/${encodeURIComponent(gwName)}`, {
        tenantId: tenantId || 1
      });
      const data = res?.data?.data;
      setFeedback({
        type: data?.connected ? "success" : "error",
        message: data?.message || `${gwName} connectivity check complete.`
      });
    } catch (err) {
      setFeedback({ type: "error", message: err?.response?.data?.message || `Could not verify ${gwName} API connectivity.` });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveGatewayConfig = async (e) => {
    e.preventDefault();
    if (!editingGateway) return;
    setLoading(true);
    setFeedback(null);
    try {
      const payload = { ...configDraft, tenantId: tenantId || 1 };
      if (!payload.paystackSecretKey) delete payload.paystackSecretKey;
      if (!payload.paystackWebhookSecret) delete payload.paystackWebhookSecret;
      if (!payload.hubtelClientSecret) delete payload.hubtelClientSecret;
      if (!payload.hubtelWebhookSecret) delete payload.hubtelWebhookSecret;

      await apiClient.put(`/payments/admin/config/${encodeURIComponent(editingGateway)}`, payload);
      setFeedback({
        type: "success",
        message: `${editingGateway} settings & keys saved securely (secret keys encrypted server-side and never sent back to browser).`
      });
      setEditingGateway(null);
      loadOverview();
    } catch (err) {
      setFeedback({ type: "error", message: err.response?.data?.message || "Failed to save gateway config." });
    } finally {
      setLoading(false);
    }
  };

  const stats = overview.stats || {};

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
        <div>
          <h3 style={{ margin: 0, color: "#38bdf8", fontSize: "1.1rem" }}>{title}</h3>
          <span style={{ fontSize: "0.78rem", color: "#94a3b8" }}>
            Server-verified gateway routing, webhook monitor, and transaction audit controls. Secret keys remain masked on the server.
          </span>
        </div>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={handleReconcilePending}
            disabled={loading}
            style={{ background: "#0284c7", color: "#fff", border: "none", borderRadius: "8px", padding: "8px 12px", fontWeight: 700, cursor: "pointer", fontSize: "0.8rem" }}
          >
            Sync Pending Transactions
          </button>
          <button
            type="button"
            onClick={handleRetryWebhooks}
            disabled={loading}
            style={{ background: "#7c3aed", color: "#fff", border: "none", borderRadius: "8px", padding: "8px 12px", fontWeight: 700, cursor: "pointer", fontSize: "0.8rem" }}
          >
            Retry Failed Webhooks
          </button>
          <button
            type="button"
            onClick={loadOverview}
            disabled={loading}
            style={{ background: "rgba(148,163,184,0.18)", color: "#e2e8f0", border: "1px solid rgba(148,163,184,0.3)", borderRadius: "8px", padding: "8px 12px", fontWeight: 700, cursor: "pointer", fontSize: "0.8rem" }}
          >
            Refresh
          </button>
        </div>
      </div>

      {feedback && (
        <div
          style={{
            padding: "10px 14px",
            borderRadius: "10px",
            fontSize: "0.85rem",
            background: feedback.type === "error" ? "rgba(239,68,68,0.15)" : "rgba(16,185,129,0.15)",
            border: `1px solid ${feedback.type === "error" ? "#ef4444" : "#10b981"}`,
            color: feedback.type === "error" ? "#fecaca" : "#6ee7b7"
          }}
        >
          {feedback.message}
        </div>
      )}

      {/* Summary Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "10px" }}>
        <div style={{ background: "rgba(15,23,42,0.7)", border: "1px solid rgba(56,189,248,0.25)", borderRadius: "10px", padding: "12px" }}>
          <div style={{ fontSize: "0.72rem", color: "#94a3b8" }}>Total Requests</div>
          <strong style={{ fontSize: "1.25rem", color: "#fff" }}>{stats.totalTransactions || 0}</strong>
        </div>
        <div style={{ background: "rgba(15,23,42,0.7)", border: "1px solid rgba(16,185,129,0.3)", borderRadius: "10px", padding: "12px" }}>
          <div style={{ fontSize: "0.72rem", color: "#94a3b8" }}>Confirmed Successful</div>
          <strong style={{ fontSize: "1.25rem", color: "#34d399" }}>{stats.successful || 0}</strong>
        </div>
        <div style={{ background: "rgba(15,23,42,0.7)", border: "1px solid rgba(245,158,11,0.3)", borderRadius: "10px", padding: "12px" }}>
          <div style={{ fontSize: "0.72rem", color: "#94a3b8" }}>Awaiting / Processing</div>
          <strong style={{ fontSize: "1.25rem", color: "#fbbf24" }}>{stats.pendingOrActionRequired || 0}</strong>
        </div>
        <div style={{ background: "rgba(15,23,42,0.7)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: "10px", padding: "12px" }}>
          <div style={{ fontSize: "0.72rem", color: "#94a3b8" }}>Failed / Cancelled</div>
          <strong style={{ fontSize: "1.25rem", color: "#fca5a5" }}>{stats.failedOrCancelled || 0}</strong>
        </div>
        <div style={{ background: "rgba(15,23,42,0.7)", border: "1px solid rgba(168,85,247,0.3)", borderRadius: "10px", padding: "12px" }}>
          <div style={{ fontSize: "0.72rem", color: "#94a3b8" }}>Webhook Alerts</div>
          <strong style={{ fontSize: "1.25rem", color: "#c4b5fd" }}>{stats.failedWebhooks || 0}</strong>
        </div>
        <div style={{ background: "rgba(15,23,42,0.7)", border: "1px solid rgba(16,185,129,0.35)", borderRadius: "10px", padding: "12px" }}>
          <div style={{ fontSize: "0.72rem", color: "#94a3b8" }}>School Fees Settled</div>
          <strong style={{ fontSize: "1.1rem", color: "#34d399" }}>{currencySymbol} {Number(stats.schoolFeeSettledTotal || 0).toLocaleString()}</strong>
        </div>
        <div style={{ background: "rgba(15,23,42,0.7)", border: "1px solid rgba(56,189,248,0.35)", borderRadius: "10px", padding: "12px" }}>
          <div style={{ fontSize: "0.72rem", color: "#94a3b8" }}>Subscriptions Settled</div>
          <strong style={{ fontSize: "1.1rem", color: "#38bdf8" }}>{currencySymbol} {Number(stats.subscriptionSettledTotal || 0).toLocaleString()}</strong>
        </div>
      </div>

      {/* Reference Verification Bar */}
      <form onSubmit={handleVerifyReference} style={{ display: "flex", gap: "10px", flexWrap: "wrap", background: "rgba(15, 23, 42, 0.8)", border: "1px solid rgba(56, 189, 248, 0.3)", borderRadius: "12px", padding: "12px" }}>
        <input
          type="text"
          value={verifyInput}
          onChange={(e) => setVerifyInput(e.target.value)}
          placeholder="Verify transaction reference server-to-server (e.g. GBS-FEE-...)"
          style={{ flex: 1, minWidth: "220px", padding: "9px 12px", borderRadius: "8px", border: "1px solid rgba(148,163,184,0.3)", background: "#020617", color: "#fff", fontFamily: "monospace" }}
        />
        <button
          type="submit"
          disabled={loading}
          style={{ background: "#059669", color: "#fff", border: "none", borderRadius: "8px", padding: "9px 16px", fontWeight: 700, cursor: "pointer" }}
        >
          Verify with Provider
        </button>
      </form>

      {verifiedResult?.transaction && (
        <div style={{ background: "rgba(2, 6, 23, 0.7)", border: "1px solid #38bdf8", borderRadius: "10px", padding: "12px", fontSize: "0.84rem" }}>
          <strong>{verifiedResult.transaction.reference}</strong> • Status:{" "}
          <strong style={{ color: "#34d399" }}>{verifiedResult.transaction.gatewayStatus}</strong> • Amount:{" "}
          <strong>{verifiedResult.transaction.currency || currencySymbol} {Number(verifiedResult.transaction.amountPaid || 0).toFixed(2)}</strong> • Gateway:{" "}
          <strong>{verifiedResult.transaction.gateway}</strong>
          {verifiedResult.receipt && (
            <span style={{ marginLeft: "10px", color: "#34d399" }}>Receipt: {verifiedResult.receipt.receiptNumber}</span>
          )}
        </div>
      )}

      {/* Sub-navigation */}
      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
        {["GATEWAYS", "TRANSACTIONS", "WEBHOOKS", "HEALTH", "AUDIT"].map((tabKey) => (
          <button
            key={tabKey}
            type="button"
            onClick={() => setActiveSubView(tabKey)}
            style={{
              padding: "8px 14px",
              borderRadius: "8px",
              border: activeSubView === tabKey ? "1.5px solid #38bdf8" : "1px solid rgba(148,163,184,0.25)",
              background: activeSubView === tabKey ? "rgba(56,189,248,0.18)" : "rgba(15,23,42,0.6)",
              color: "#f8fafc",
              fontWeight: 700,
              cursor: "pointer",
              fontSize: "0.8rem"
            }}
          >
            {tabKey === "GATEWAYS"
              ? `Payment Providers (${overview.configs.length})`
              : tabKey === "TRANSACTIONS"
                ? `Transactions (${overview.transactions.length})`
                : tabKey === "WEBHOOKS"
                  ? `Webhook Logs (${overview.webhooks.length})`
                  : tabKey === "HEALTH"
                    ? `Service Health (${(overview.gatewayHealth || overview.configs).length})`
                    : `Payment Audit Logs (${(overview.auditLogs || []).length})`}
          </button>
        ))}
      </div>

      {/* GATEWAYS LIST */}
      {activeSubView === "GATEWAYS" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "12px" }}>
          {overview.configs.map((cfg) => (
            <div
              key={cfg.gateway}
              style={{
                background: "rgba(15, 23, 42, 0.8)",
                border: `1.5px solid ${cfg.effectiveEnabled ? "#10b981" : "rgba(148,163,184,0.25)"}`,
                borderRadius: "12px",
                padding: "14px",
                display: "flex",
                flexDirection: "column",
                gap: "8px"
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <strong style={{ color: "#fff", fontSize: "1rem" }}>{cfg.gateway}</strong>
                <span
                  style={{
                    padding: "3px 9px",
                    borderRadius: "999px",
                    fontSize: "0.7rem",
                    fontWeight: 800,
                    background: cfg.effectiveEnabled ? "rgba(16,185,129,0.2)" : "rgba(245,158,11,0.2)",
                    color: cfg.effectiveEnabled ? "#34d399" : "#fbbf24"
                  }}
                >
                  {cfg.effectiveEnabled ? `ACTIVE (${cfg.mode})` : cfg.adapterConfigured ? "DISABLED" : "KEYS NOT CONFIGURED"}
                </span>
              </div>
              <div style={{ fontSize: "0.78rem", color: "#94a3b8" }}>{cfg.settlementLabel}</div>
              <div style={{ fontSize: "0.76rem", color: "#cbd5e1" }}>
                Methods: <strong>{(cfg.supportedChannels || []).join(", ") || "None enabled"}</strong>
              </div>
              <div style={{ fontSize: "0.74rem", color: "#94a3b8", fontFamily: "monospace" }}>
                Key Preview: {cfg.publicKeyPreview || "Managed via server .env"}
              </div>
              {cfg.paystackSubaccountCode && (
                <div style={{ fontSize: "0.74rem", color: "#38bdf8" }}>Subaccount: {cfg.paystackSubaccountCode}</div>
              )}
              {cfg.hubtelMerchantAccount && (
                <div style={{ fontSize: "0.74rem", color: "#38bdf8" }}>Merchant Account: {cfg.hubtelMerchantAccount}</div>
              )}
              {allowConfigEdit && (
                <div style={{ display: "flex", gap: "8px", marginTop: "auto", flexWrap: "wrap" }}>
                  <button
                    type="button"
                    onClick={() => startEditGateway(cfg)}
                    style={{ flex: 1, background: "rgba(56,189,248,0.16)", border: "1px solid #38bdf8", color: "#bae6fd", borderRadius: "8px", padding: "7px 10px", fontWeight: 700, cursor: "pointer", fontSize: "0.78rem" }}
                  >
                    Configure Keys &amp; Methods
                  </button>
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => handleTestGateway(cfg.gateway)}
                    style={{ background: "rgba(16,185,129,0.18)", border: "1px solid #10b981", color: "#6ee7b7", borderRadius: "8px", padding: "7px 10px", fontWeight: 700, cursor: "pointer", fontSize: "0.78rem" }}
                  >
                    Test Live API
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* CONFIG EDITOR */}
      {editingGateway && (
        <form
          onSubmit={handleSaveGatewayConfig}
          style={{ background: "rgba(2, 6, 23, 0.85)", border: "1.5px solid #38bdf8", borderRadius: "12px", padding: "16px", display: "flex", flexDirection: "column", gap: "12px" }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <strong style={{ color: "#38bdf8" }}>Configure {editingGateway}</strong>
            <button type="button" onClick={() => setEditingGateway(null)} style={{ background: "transparent", border: "none", color: "#94a3b8", cursor: "pointer" }}>✕</button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "10px" }}>
            <label style={{ fontSize: "0.78rem", color: "#cbd5e1" }}>
              Mode
              <select
                value={configDraft.mode}
                onChange={(e) => setConfigDraft({ ...configDraft, mode: e.target.value })}
                disabled={editingGateway === "SANDBOX_PSP"}
                style={{ width: "100%", padding: "7px", marginTop: "4px", borderRadius: "6px", background: "#0f172a", color: "#fff", border: "1px solid #334155" }}
              >
                <option value="TEST">TEST / SANDBOX</option>
                {editingGateway !== "SANDBOX_PSP" && <option value="LIVE">LIVE PRODUCTION</option>}
              </select>
            </label>
            <label style={{ fontSize: "0.78rem", color: "#cbd5e1", display: "flex", alignItems: "center", gap: "8px", paddingTop: "18px" }}>
              <input
                type="checkbox"
                checked={Boolean(configDraft.isEnabled)}
                onChange={(e) => setConfigDraft({ ...configDraft, isEnabled: e.target.checked })}
              />
              Gateway Enabled for Payments
            </label>
            <label style={{ fontSize: "0.78rem", color: "#cbd5e1" }}>
              Min Partial Payment (%)
              <input
                type="number"
                min="1"
                max="100"
                value={configDraft.minPartialPercent || 20}
                onChange={(e) => setConfigDraft({ ...configDraft, minPartialPercent: Number(e.target.value) })}
                style={{ width: "100%", padding: "7px", marginTop: "4px", borderRadius: "6px", background: "#0f172a", color: "#fff", border: "1px solid #334155" }}
              />
            </label>
          </div>

          {editingGateway === "PAYSTACK" && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "10px" }}>
              <label style={{ fontSize: "0.78rem", color: "#cbd5e1" }}>
                Paystack Live / Test Public Key
                <input
                  type="text"
                  placeholder="pk_live_... or pk_test_..."
                  value={configDraft.paystackPublicKey || ""}
                  onChange={(e) => setConfigDraft({ ...configDraft, paystackPublicKey: e.target.value })}
                  style={{ width: "100%", padding: "8px", marginTop: "4px", borderRadius: "6px", background: "#0f172a", color: "#fff", border: "1px solid #334155", boxSizing: "border-box" }}
                />
              </label>
              <label style={{ fontSize: "0.78rem", color: "#cbd5e1" }}>
                Paystack Secret Key (Encrypted at Rest — leave blank to keep existing)
                <input
                  type="password"
                  autoComplete="new-password"
                  placeholder="sk_live_... or sk_test_..."
                  value={configDraft.paystackSecretKey || ""}
                  onChange={(e) => setConfigDraft({ ...configDraft, paystackSecretKey: e.target.value })}
                  style={{ width: "100%", padding: "8px", marginTop: "4px", borderRadius: "6px", background: "#0f172a", color: "#fff", border: "1px solid #334155", boxSizing: "border-box" }}
                />
              </label>
              <label style={{ fontSize: "0.78rem", color: "#cbd5e1" }}>
                School Paystack Subaccount Code (Optional)
                <input
                  type="text"
                  placeholder="ACCT_xxxxxxxxxx"
                  value={configDraft.paystackSubaccountCode || ""}
                  onChange={(e) => setConfigDraft({ ...configDraft, paystackSubaccountCode: e.target.value })}
                  style={{ width: "100%", padding: "8px", marginTop: "4px", borderRadius: "6px", background: "#0f172a", color: "#fff", border: "1px solid #334155", boxSizing: "border-box" }}
                />
              </label>
            </div>
          )}

          {editingGateway === "HUBTEL" && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "10px" }}>
              <label style={{ fontSize: "0.78rem", color: "#cbd5e1" }}>
                Hubtel Client ID
                <input
                  type="text"
                  placeholder="Enter Hubtel API Client ID"
                  value={configDraft.hubtelClientId || ""}
                  onChange={(e) => setConfigDraft({ ...configDraft, hubtelClientId: e.target.value })}
                  style={{ width: "100%", padding: "8px", marginTop: "4px", borderRadius: "6px", background: "#0f172a", color: "#fff", border: "1px solid #334155", boxSizing: "border-box" }}
                />
              </label>
              <label style={{ fontSize: "0.78rem", color: "#cbd5e1" }}>
                Hubtel Client Secret (Encrypted at Rest)
                <input
                  type="password"
                  autoComplete="new-password"
                  placeholder="Enter Hubtel Client Secret"
                  value={configDraft.hubtelClientSecret || ""}
                  onChange={(e) => setConfigDraft({ ...configDraft, hubtelClientSecret: e.target.value })}
                  style={{ width: "100%", padding: "8px", marginTop: "4px", borderRadius: "6px", background: "#0f172a", color: "#fff", border: "1px solid #334155", boxSizing: "border-box" }}
                />
              </label>
              <label style={{ fontSize: "0.78rem", color: "#cbd5e1" }}>
                Hubtel POS Sales / Merchant Account Number
                <input
                  type="text"
                  placeholder="2019988"
                  value={configDraft.hubtelMerchantAccount || ""}
                  onChange={(e) => setConfigDraft({ ...configDraft, hubtelMerchantAccount: e.target.value })}
                  style={{ width: "100%", padding: "8px", marginTop: "4px", borderRadius: "6px", background: "#0f172a", color: "#fff", border: "1px solid #334155", boxSizing: "border-box" }}
                />
              </label>
            </div>
          )}

          {editingGateway === "BANK_DIRECT" && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "8px" }}>
              <input type="text" placeholder="Bank Name" value={configDraft.bankName || ""} onChange={(e) => setConfigDraft({ ...configDraft, bankName: e.target.value })} style={{ padding: "8px", borderRadius: "6px", background: "#0f172a", color: "#fff", border: "1px solid #334155" }} />
              <input type="text" placeholder="Account Number" value={configDraft.bankAccountNumber || ""} onChange={(e) => setConfigDraft({ ...configDraft, bankAccountNumber: e.target.value })} style={{ padding: "8px", borderRadius: "6px", background: "#0f172a", color: "#fff", border: "1px solid #334155" }} />
              <input type="text" placeholder="Account Name" value={configDraft.bankAccountName || ""} onChange={(e) => setConfigDraft({ ...configDraft, bankAccountName: e.target.value })} style={{ padding: "8px", borderRadius: "6px", background: "#0f172a", color: "#fff", border: "1px solid #334155" }} />
              <input type="text" placeholder="Branch" value={configDraft.bankBranch || ""} onChange={(e) => setConfigDraft({ ...configDraft, bankBranch: e.target.value })} style={{ padding: "8px", borderRadius: "6px", background: "#0f172a", color: "#fff", border: "1px solid #334155" }} />
            </div>
          )}

          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", fontSize: "0.78rem" }}>
            {[
              ["supportsMtnMomo", "MTN MoMo"],
              ["supportsTelecelCash", "Telecel Cash"],
              ["supportsAtMoney", "AT Money"],
              ["supportsVisa", "Visa"],
              ["supportsMastercard", "Mastercard"],
              ["supportsBankTransfer", "Bank Transfer"]
            ].map(([field, label]) => (
              <label key={field} style={{ display: "flex", alignItems: "center", gap: "5px", color: "#e2e8f0" }}>
                <input
                  type="checkbox"
                  checked={Boolean(configDraft[field])}
                  onChange={(e) => setConfigDraft({ ...configDraft, [field]: e.target.checked })}
                />
                {label}
              </label>
            ))}
          </div>

          <button type="submit" disabled={loading} style={{ background: "#059669", color: "#fff", border: "none", borderRadius: "8px", padding: "9px 14px", fontWeight: 700, cursor: "pointer", alignSelf: "flex-start" }}>
            Save Gateway Settings
          </button>
        </form>
      )}

      {/* TRANSACTIONS TABLE */}
      {activeSubView === "TRANSACTIONS" && (
        <div className="role-table-responsive" style={{ overflowX: "auto" }}>
          <table className="role-table">
            <thead>
              <tr>
                <th>Reference</th>
                <th>Student / Scope</th>
                <th>Gateway & Method</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {overview.transactions.length === 0 ? (
                <tr><td colSpan="6" style={{ textAlign: "center", padding: "18px", color: "#94a3b8" }}>No gateway transactions recorded yet.</td></tr>
              ) : (
                overview.transactions.map((tx) => (
                  <tr key={tx.id}>
                    <td style={{ fontFamily: "monospace", color: "#38bdf8" }}>{tx.reference || tx.transactionRef}</td>
                    <td>{tx.studentCode || tx.paymentScope}</td>
                    <td>{tx.gateway} • {tx.channel || tx.paymentMethod}</td>
                    <td><strong>{tx.currency || currencySymbol} {Number(tx.amountPaid || 0).toFixed(2)}</strong></td>
                    <td><strong>{tx.gatewayStatus}</strong></td>
                    <td style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                      {tx.gateway === "BANK_DIRECT" && tx.gatewayStatus !== "SUCCESSFUL" && (
                        <button type="button" onClick={() => handleAdminAction(tx.reference, "APPROVE_BANK_DEPOSIT")} style={{ background: "#059669", color: "#fff", border: "none", borderRadius: "6px", padding: "4px 8px", fontSize: "0.72rem", cursor: "pointer" }}>
                          Confirm Bank Slip
                        </button>
                      )}
                      {tx.gatewayStatus === "SUCCESSFUL" && (
                        <button type="button" onClick={() => handleAdminAction(tx.reference, "REFUND")} style={{ background: "#7c3aed", color: "#fff", border: "none", borderRadius: "6px", padding: "4px 8px", fontSize: "0.72rem", cursor: "pointer" }}>
                          Record Refund
                        </button>
                      )}
                      {!["SUCCESSFUL", "CANCELLED", "REFUNDED"].includes(tx.gatewayStatus) && tx.reference && (
                        <button type="button" onClick={() => { setVerifyInput(tx.reference); }} style={{ background: "#0284c7", color: "#fff", border: "none", borderRadius: "6px", padding: "4px 8px", fontSize: "0.72rem", cursor: "pointer" }}>
                          Check
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* WEBHOOK LOGS */}
      {activeSubView === "WEBHOOKS" && (
        <div className="role-table-responsive" style={{ overflowX: "auto" }}>
          <table className="role-table">
            <thead>
              <tr>
                <th>Time</th>
                <th>Gateway</th>
                <th>Event</th>
                <th>Reference</th>
                <th>Signature</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {overview.webhooks.length === 0 ? (
                <tr><td colSpan="6" style={{ textAlign: "center", padding: "18px", color: "#94a3b8" }}>No webhook notifications received yet.</td></tr>
              ) : (
                overview.webhooks.map((w) => (
                  <tr key={w.id}>
                    <td style={{ fontSize: "0.76rem" }}>{new Date(w.createdAt).toLocaleString()}</td>
                    <td>{w.gateway}</td>
                    <td>{w.eventType}</td>
                    <td style={{ fontFamily: "monospace" }}>{w.transactionRef || "—"}</td>
                    <td style={{ color: w.signatureValid ? "#34d399" : "#f87171" }}>{w.signatureValid ? "Valid" : "Rejected"}</td>
                    <td><strong>{w.processingStatus}</strong></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
      {/* SERVICE HEALTH & WEBHOOK ENDPOINTS */}
      {activeSubView === "HEALTH" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <div style={{ background: "rgba(2, 6, 23, 0.7)", border: "1px solid rgba(56, 189, 248, 0.3)", borderRadius: "10px", padding: "12px", fontSize: "0.8rem", color: "#cbd5e1" }}>
            <strong style={{ color: "#38bdf8", display: "block", marginBottom: "6px" }}>Official Provider Webhook Endpoints (Configure in Paystack / Hubtel Merchant Dashboard):</strong>
            <div style={{ fontFamily: "monospace", marginBottom: "4px" }}>Paystack Webhook URL: <strong style={{ color: "#34d399" }}>{window.location.origin}/api/v1/payments/webhooks/paystack</strong></div>
            <div style={{ fontFamily: "monospace" }}>Hubtel Callback URL: <strong style={{ color: "#34d399" }}>{window.location.origin}/api/v1/payments/webhooks/hubtel</strong></div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "10px" }}>
            {(overview.gatewayHealth || []).map((gh) => (
              <div key={gh.gateway} style={{ background: "rgba(15,23,42,0.75)", border: `1px solid ${gh.active ? "#10b981" : "#f59e0b"}`, borderRadius: "10px", padding: "12px", fontSize: "0.8rem" }}>
                <strong style={{ color: "#fff" }}>{gh.gateway}</strong>
                <div style={{ marginTop: "4px", color: gh.active ? "#34d399" : "#fbbf24", fontWeight: 800 }}>{gh.status} ({gh.mode})</div>
                <div style={{ marginTop: "4px", color: "#94a3b8" }}>Enabled Methods: {(gh.supportedChannels || []).join(", ") || "None"}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* PAYMENT AUDIT LOGS */}
      {activeSubView === "AUDIT" && (
        <div className="role-table-responsive" style={{ overflowX: "auto" }}>
          <table className="role-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>School / Tenant</th>
                <th>Action</th>
                <th>Audit Details</th>
              </tr>
            </thead>
            <tbody>
              {(overview.auditLogs || []).length === 0 ? (
                <tr><td colSpan="4" style={{ textAlign: "center", padding: "18px", color: "#94a3b8" }}>No payment audit trail entries recorded yet.</td></tr>
              ) : (
                (overview.auditLogs || []).map((log, i) => (
                  <tr key={log.id || i}>
                    <td style={{ fontSize: "0.76rem" }}>{log.createdAt ? new Date(log.createdAt).toLocaleString() : "—"}</td>
                    <td>Tenant #{log.tenantId || 1}</td>
                    <td><strong style={{ color: "#38bdf8" }}>{log.action}</strong></td>
                    <td style={{ fontSize: "0.78rem", color: "#cbd5e1" }}>{log.details || "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
