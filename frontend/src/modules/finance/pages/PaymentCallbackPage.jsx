import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import apiClient from "../../../api/client/apiClient";
import { getAccessToken, getUser } from "../../../utils/tokenStorage";
import { getActiveSchoolLogo, getActiveSchoolName } from "../../../utils/schoolBranding";

/**
 * PaymentCallbackPage.jsx
 * Handles redirects back from Paystack / Hubtel / Sandbox Checkout.
 * Security rule: NEVER treats a return URL as proof of payment — always triggers
 * authoritative server-to-server verification before showing a confirmed receipt.
 */
export default function PaymentCallbackPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const params = new URLSearchParams(location.search);
  const reference = params.get("payment_ref") || params.get("reference") || params.get("trxref") || "";

  const [status, setStatus] = useState("VERIFYING");
  const [transaction, setTransaction] = useState(null);
  const [receipt, setReceipt] = useState(null);
  const [message, setMessage] = useState("Confirming payment directly with the payment provider...");

  const resolveReturnPortalPath = () => {
    try {
      const devToken = localStorage.getItem("gbs_dev_token");
      if (devToken) return "/developer-control-center/dashboard";
      const user = getUser();
      const role = String(user?.role || localStorage.getItem("gbs_auth_role") || "").toUpperCase();
      if (!role) return "/onboarding";
      if (role === "DEVELOPER") return "/developer-control-center/dashboard";
      if (role === "ADMIN" || role === "SUPER_ADMIN") return "/portal/admin/dashboard";
      return `/portal/${role.toLowerCase()}/dashboard`;
    } catch {
      return "/login";
    }
  };

  const verifyPayment = async () => {
    if (!reference) {
      setStatus("MISSING");
      setMessage("No payment reference was provided in the return link.");
      return;
    }
    setStatus("VERIFYING");
    try {
      const hasToken = Boolean(getAccessToken() || localStorage.getItem("gbs_access_token") || localStorage.getItem("gbs_dev_token"));
      const endpoint = hasToken
        ? `/payments/${encodeURIComponent(reference)}/verify`
        : `/payments/onboarding/verify/${encodeURIComponent(reference)}`;
      const res = await apiClient.get(endpoint);
      const data = res.data?.data;
      setTransaction(data?.transaction || null);
      setReceipt(data?.receipt || null);
      setStatus(data?.transaction?.gatewayStatus || "PROCESSING");
      setMessage(data?.customerMessage || "Payment verification completed.");
    } catch (err) {
      setStatus("ERROR");
      setMessage(err.response?.data?.message || "Could not verify payment status with provider yet.");
    }
  };

  useEffect(() => {
    verifyPayment();
  }, [reference]);

  const handlePrintReceipt = () => {
    if (!receipt && !transaction) return;
    const r = receipt || {};
    const tx = transaction || {};
    const logo = getActiveSchoolLogo() || "/assets/gbs_crest_badge.jpg";
    const schoolName = r.institutionName || getActiveSchoolName() || "GBS Institution";
    const win = window.open("", "_blank", "width=760,height=860");
    if (!win) return;
    win.document.write(`<!DOCTYPE html>
<html>
<head>
<title>Official Fee Receipt - ${r.receiptNumber || tx.receiptNumber || tx.reference}</title>
<style>
  body { font-family: Arial, sans-serif; color: #0f172a; padding: 32px; }
  .box { border: 2px solid #0f172a; padding: 24px; max-width: 640px; margin: 0 auto; }
  .hdr { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #cbd5e1; padding-bottom: 12px; margin-bottom: 16px; gap: 12px; }
  .brand { display: flex; align-items: center; gap: 12px; }
  .brand img { width: 52px; height: 52px; object-fit: contain; border-radius: 8px; }
  .row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px dashed #e2e8f0; font-size: 14px; }
  .paid { font-size: 22px; font-weight: 800; color: #047857; margin-top: 12px; }
</style>
</head>
<body>
  <div class="box">
    <div class="hdr">
      <div class="brand">
        <img src="${logo}" alt="Logo" />
        <div><h2 style="margin:0;">${schoolName}</h2><div>Official Verified Payment Receipt</div></div>
      </div>
      <div style="text-align:right;"><strong>${r.receiptNumber || tx.receiptNumber || "—"}</strong><br/>${new Date(r.issuedAt || Date.now()).toLocaleString()}</div>
    </div>
    <div class="row"><span>Student / Account</span><strong>${r.studentName || tx.studentCode || "—"}</strong></div>
    <div class="row"><span>Payer Contact</span><strong>${tx.payerEmail || tx.payerPhone || "Verified Payer"}</strong></div>
    <div class="row"><span>Description</span><strong>${r.feeDescription || tx.feeAccount || "Institutional Payment"}</strong></div>
    <div class="row"><span>Gateway &amp; Channel</span><strong>${r.gateway || tx.gateway} • ${r.channel || tx.channel}</strong></div>
    <div class="row"><span>GBS Reference</span><strong>${r.transactionRef || tx.reference}</strong></div>
    <div class="row"><span>Provider Reference</span><strong>${r.providerReference || tx.providerReference || "—"}</strong></div>
    <div class="row"><span>Status</span><strong>CONFIRMED SUCCESSFUL</strong></div>
    <div class="row"><span>Remaining Balance</span><strong>${r.currency || tx.currency || "GHS"} ${Number(r.balanceAfter || 0).toFixed(2)}</strong></div>
    <div class="paid">Amount Confirmed: ${r.currency || tx.currency || "GHS"} ${Number(r.amountPaid || tx.amountPaid || 0).toFixed(2)}</div>
  </div>
  <script>window.onload = function() { window.print(); };</script>
</body>
</html>`);
    win.document.close();
  };

  const isSuccess = status === "SUCCESSFUL";

  return (
    <div style={{ minHeight: "100vh", background: "#0f172a", color: "#f8fafc", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
      <div style={{ maxWidth: "540px", width: "100%", background: "#1e293b", border: `1.5px solid ${isSuccess ? "#10b981" : "#38bdf8"}`, borderRadius: "16px", padding: "28px", boxShadow: "0 20px 50px rgba(0,0,0,0.6)" }}>
        <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#38bdf8", textTransform: "uppercase" }}>
          GBS Server-to-Server Payment Verification
        </div>
        <h2 style={{ margin: "6px 0 12px" }}>
          {status === "VERIFYING" ? "Confirming Your Payment..." : isSuccess ? "Payment Confirmed" : `Status: ${status}`}
        </h2>
        <p style={{ fontSize: "0.92rem", color: "#cbd5e1", lineHeight: 1.5 }}>{message}</p>

        {reference && (
          <div style={{ background: "rgba(2,6,23,0.6)", padding: "12px", borderRadius: "10px", margin: "16px 0", fontSize: "0.84rem" }}>
            <div>Reference: <strong style={{ fontFamily: "monospace", color: "#38bdf8" }}>{reference}</strong></div>
            {transaction && (
              <div style={{ marginTop: "6px" }}>
                Amount: <strong>{transaction.currency} {Number(transaction.amountPaid || 0).toFixed(2)}</strong> • Gateway: <strong>{transaction.gateway}</strong> ({transaction.channel})
              </div>
            )}
            {receipt && (
              <div style={{ marginTop: "6px", color: "#34d399" }}>
                Official Receipt: <strong>{receipt.receiptNumber}</strong> • Remaining Balance: <strong>{receipt.currency} {Number(receipt.balanceAfter || 0).toFixed(2)}</strong>
              </div>
            )}
          </div>
        )}

        <div style={{ display: "flex", gap: "10px", marginTop: "18px", flexWrap: "wrap" }}>
          {isSuccess && (
            <button
              type="button"
              onClick={handlePrintReceipt}
              style={{ flex: 1, background: "#0284c7", color: "#fff", border: "none", borderRadius: "8px", padding: "10px 14px", fontWeight: 700, cursor: "pointer" }}
            >
              Print / Save Official Receipt
            </button>
          )}
          {!isSuccess && reference && (
            <button
              type="button"
              onClick={verifyPayment}
              style={{ flex: 1, background: "#0284c7", color: "#fff", border: "none", borderRadius: "8px", padding: "10px 14px", fontWeight: 700, cursor: "pointer" }}
            >
              Re-Check Provider Status
            </button>
          )}
          <button
            type="button"
            onClick={() => navigate(resolveReturnPortalPath())}
            style={{ flex: 1, background: isSuccess ? "#059669" : "#475569", color: "#fff", border: "none", borderRadius: "8px", padding: "10px 14px", fontWeight: 700, cursor: "pointer" }}
          >
            Return to Portal
          </button>
        </div>
      </div>
    </div>
  );
}
