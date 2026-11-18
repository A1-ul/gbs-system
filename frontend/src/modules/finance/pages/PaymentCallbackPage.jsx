import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import apiClient from "../../../api/client/apiClient";

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

  const verifyPayment = async () => {
    if (!reference) {
      setStatus("MISSING");
      setMessage("No payment reference was provided in the return link.");
      return;
    }
    setStatus("VERIFYING");
    try {
      const hasToken = Boolean(localStorage.getItem("gbs_token"));
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

  const isSuccess = status === "SUCCESSFUL";

  return (
    <div style={{ minHeight: "100vh", background: "#0f172a", color: "#f8fafc", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
      <div style={{ maxWidth: "520px", width: "100%", background: "#1e293b", border: `1.5px solid ${isSuccess ? "#10b981" : "#38bdf8"}`, borderRadius: "16px", padding: "28px", boxShadow: "0 20px 50px rgba(0,0,0,0.6)" }}>
        <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#38bdf8", textTransform: "uppercase" }}>
          GBS Server Verification
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
                Amount: <strong>{transaction.currency} {Number(transaction.amountPaid || 0).toFixed(2)}</strong> • Gateway: <strong>{transaction.gateway}</strong>
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
            onClick={() => navigate("/dashboard")}
            style={{ flex: 1, background: isSuccess ? "#059669" : "#475569", color: "#fff", border: "none", borderRadius: "8px", padding: "10px 14px", fontWeight: 700, cursor: "pointer" }}
          >
            Return to Portal
          </button>
        </div>
      </div>
    </div>
  );
}
