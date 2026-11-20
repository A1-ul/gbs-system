import React, { useEffect, useRef, useState } from "react";
import apiClient from "../../api/client/apiClient";
import { getApiBaseUrl } from "../../api/client/apiConfig";
import { getActiveSchoolName } from "../../utils/schoolBranding";

const CHANNEL_META = {
  MTN_MOMO: { title: "MTN Mobile Money", subtitle: "Phone prompt or browser checkout", accent: "#f59e0b", icon: "📱" },
  TELECEL_CASH: { title: "Telecel Cash", subtitle: "Telecel mobile wallet", accent: "#ef4444", icon: "📲" },
  AT_MONEY: { title: "AT Money (AirtelTigo)", subtitle: "AirtelTigo mobile wallet", accent: "#3b82f6", icon: "📲" },
  VISA: { title: "Visa Card", subtitle: "Verified secure card checkout", accent: "#38bdf8", icon: "💳" },
  MASTERCARD: { title: "Mastercard", subtitle: "Verified secure card checkout", accent: "#fb923c", icon: "💳" },
  BANK_TRANSFER: { title: "Bank Transfer / Deposit", subtitle: "Official school bank reference", accent: "#10b981", icon: "🏦" }
};

const STATE_BADGES = {
  CREATED: { label: "Request Created", bg: "#1e293b", color: "#93c5fd" },
  PENDING: { label: "Pending Authorization", bg: "#1e293b", color: "#fcd34d" },
  REQUIRES_CUSTOMER_ACTION: { label: "Action Needed on Your Phone / Checkout", bg: "#451a03", color: "#fbbf24" },
  PROCESSING: { label: "Confirming with Provider...", bg: "#172554", color: "#60a5fa" },
  SUCCESSFUL: { label: "Payment Confirmed", bg: "#064e3b", color: "#34d399" },
  FAILED: { label: "Payment Not Completed", bg: "#450a0a", color: "#fca5a5" },
  CANCELLED: { label: "Cancelled", bg: "#334155", color: "#cbd5e1" },
  EXPIRED: { label: "Session Timed Out", bg: "#431407", color: "#fdba74" },
  REVERSED: { label: "Reversed", bg: "#4c0519", color: "#fda4af" },
  REFUNDED: { label: "Refunded", bg: "#3b0764", color: "#e9d5ff" },
  UNDER_REVIEW: { label: "Under Finance Review", bg: "#422006", color: "#fde047" }
};

function isValidMomoPhoneInput(phone) {
  const cleaned = String(phone || "").replace(/[\s\-().]/g, "");
  let local = cleaned;
  if (local.startsWith("+233")) local = "0" + local.slice(4);
  else if (local.startsWith("233") && local.length === 12) local = "0" + local.slice(3);
  else if (local.startsWith("00233")) local = "0" + local.slice(5);
  return /^0[235][0-9]{8}$/.test(local) || /^\+[1-9][0-9]{7,14}$/.test(cleaned);
}

function detectMomoNetworkLabel(phone) {
  const cleaned = String(phone || "").replace(/[\s\-().]/g, "");
  let local = cleaned;
  if (local.startsWith("+233")) local = "0" + local.slice(4);
  else if (local.startsWith("233") && local.length === 12) local = "0" + local.slice(3);
  const p = local.slice(0, 3);
  if (["024", "025", "053", "054", "055", "059"].includes(p)) return "MTN MoMo Detected";
  if (["020", "050"].includes(p)) return "Telecel Cash Detected";
  if (["026", "027", "056", "057"].includes(p)) return "AT Money (AirtelTigo) Detected";
  if (/^\+[1-9]/.test(cleaned)) return "International E.164 Wallet";
  return "Ghana Mobile Network";
}

/**
 * Official Multi-Gateway School Fees & Subscription Checkout Modal.
 * Follows each gateway's official server-backed workflow:
 *  - Fetches student fee statement and enabled channels from backend DB
 *  - NEVER requests, collects, or transmits MoMo PINs, raw card numbers, or CVVs
 *  - Only updates balances when verified server-to-server / signed webhook
 */
export default function OfficialPaymentGatewayModal({
  isOpen,
  onClose,
  onSuccess = null,
  tenantId = null,
  studentId = null,
  studentIdentifier = null,
  studentName = null,
  invoiceId = null,
  amount = null,
  currency = "GHS",
  title = "School Fees Payment",
  paymentScope = "SCHOOL_FEES",
  subscriptionMetadata = null,
  allowPublicOnboarding = false
}) {
  const [step, setStep] = useState("SETUP"); // SETUP | AUTHORIZE | RESULT
  const [loading, setLoading] = useState(false);
  const [loadingStatement, setLoadingStatement] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [infoMsg, setInfoMsg] = useState("");

  const [statement, setStatement] = useState(null);
  const [availableChannels, setAvailableChannels] = useState([]);
  const [selectedChannel, setSelectedChannel] = useState("");
  const [selectedGateway, setSelectedGateway] = useState("");
  const [payAmount, setPayAmount] = useState("");
  const [payerPhone, setPayerPhone] = useState("");
  const [payerEmail, setPayerEmail] = useState("");
  const [preferHostedCheckout, setPreferHostedCheckout] = useState(false);

  const [activeTransaction, setActiveTransaction] = useState(null);
  const [fallbackOptions, setFallbackOptions] = useState([]);
  const [otpInput, setOtpInput] = useState("");
  const [verifiedReceipt, setVerifiedReceipt] = useState(null);
  const [pollingActive, setPollingActive] = useState(false);

  const pollTimerRef = useRef(null);
  const schoolDisplayName = statement?.institution?.name || getActiveSchoolName() || "School Finance Portal";

  const stopPolling = () => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
    setPollingActive(false);
  };

  useEffect(() => {
    return () => stopPolling();
  }, []);

  useEffect(() => {
    if (!isOpen) {
      stopPolling();
      return;
    }

    setStep("SETUP");
    setErrorMsg("");
    setInfoMsg("");
    setActiveTransaction(null);
    setVerifiedReceipt(null);
    setFallbackOptions([]);
    setOtpInput("");
    setPreferHostedCheckout(false);

    const loadContext = async () => {
      setLoadingStatement(true);
      try {
        let userObj = {};
        try {
          userObj = JSON.parse(localStorage.getItem("gbs_user") || "{}");
        } catch { }
        setPayerEmail((prev) => prev || userObj.email || "");

        const effectiveTenantId = tenantId || userObj.tenantId || localStorage.getItem("gbs_tenant_id") || 1;
        const effectiveStudentId = studentIdentifier || studentId || (userObj.role === "STUDENT" ? userObj.id : "");

        if (paymentScope === "SCHOOL_FEES" && !allowPublicOnboarding) {
          const params = new URLSearchParams();
          if (effectiveStudentId) params.set("studentId", String(effectiveStudentId));
          const res = await apiClient.get(`/payments/student-statement?${params.toString()}`, {
            headers: { "x-tenant-id": String(effectiveTenantId) }
          });
          const data = res.data?.data;
          setStatement(data);
          const channels = data?.availableChannels || [];
          setAvailableChannels(channels);
          if (channels.length > 0) {
            setSelectedChannel(channels[0].channel);
            setSelectedGateway(channels[0].primaryGateway);
          }

          const outstanding = Number(data?.feeSummary?.outstandingBalance || 0);
          const suggestedAmt =
            amount !== null && amount !== undefined && Number(amount) > 0 && Number(amount) <= outstanding
              ? Number(amount)
              : outstanding;
          setPayAmount(suggestedAmt > 0 ? String(suggestedAmt) : "");
        } else {
          // Subscription / Onboarding payment context
          const res = await apiClient.get("/payments/gateways", {
            headers: { "x-tenant-id": String(effectiveTenantId) }
          }).catch(() => null);
          const channels = res?.data?.data?.channels || [
            { channel: "MTN_MOMO", primaryGateway: "SANDBOX_PSP", isSandbox: true },
            { channel: "TELECEL_CASH", primaryGateway: "SANDBOX_PSP", isSandbox: true },
            { channel: "AT_MONEY", primaryGateway: "SANDBOX_PSP", isSandbox: true },
            { channel: "VISA", primaryGateway: "SANDBOX_PSP", isSandbox: true }
          ];
          setAvailableChannels(channels);
          setSelectedChannel(channels[0]?.channel || "MTN_MOMO");
          setSelectedGateway(channels[0]?.primaryGateway || "SANDBOX_PSP");
          setPayAmount(amount ? String(amount) : "");
        }
      } catch (err) {
        setErrorMsg(
          err.response?.data?.message ||
          "Could not load student fee records from the school server. Please confirm the student ID."
        );
      } finally {
        setLoadingStatement(false);
      }
    };

    loadContext();
  }, [isOpen, tenantId, studentId, studentIdentifier, invoiceId, amount, paymentScope, allowPublicOnboarding]);

  const selectedChannelConfig = availableChannels.find((c) => c.channel === selectedChannel) || null;
  const isMomoChannel = ["MTN_MOMO", "TELECEL_CASH", "AT_MONEY"].includes(selectedChannel);

  const handleSelectChannel = (chObj) => {
    setSelectedChannel(chObj.channel);
    setSelectedGateway(chObj.primaryGateway);
    setErrorMsg("");
  };

  const startStatusPolling = (reference) => {
    stopPolling();
    setPollingActive(true);
    pollTimerRef.current = setInterval(async () => {
      try {
        const res = await verifyOnServer(reference, true);
        if (res && ["SUCCESSFUL", "FAILED", "CANCELLED", "EXPIRED", "REVERSED", "REFUNDED"].includes(res.transaction?.gatewayStatus)) {
          stopPolling();
        }
      } catch {
        // Continue polling cleanly until verified or cancelled
      }
    }, 4500);
  };

  const handleInitiate = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setInfoMsg("");

    const numericAmount = Number(payAmount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setErrorMsg("Enter a valid payment amount greater than zero.");
      return;
    }

    if (statement?.feeSummary) {
      const due = Number(statement.feeSummary.outstandingBalance || 0);
      if (numericAmount > due + 0.01) {
        setErrorMsg(`You cannot pay more than the verified balance of ${currency} ${due.toFixed(2)}.`);
        return;
      }
      if (
        numericAmount < due - 0.01 &&
        statement.feeSummary.allowPartialPayments === false
      ) {
        setErrorMsg(`Partial payments are not enabled. Full amount (${currency} ${due.toFixed(2)}) is required.`);
        return;
      }
    }

    if (isMomoChannel && !isValidMomoPhoneInput(payerPhone)) {
      setErrorMsg("Enter a valid Mobile Money number (any 10-digit 02x/05x Ghana number or +233/+... E.164 wallet).");
      return;
    }

    setLoading(true);
    try {
      const returnUrl = `${window.location.origin}/payment-callback`;
      const payload = {
        paymentScope,
        studentIdentifier: studentIdentifier || statement?.student?.studentCode || (statement?.student?.id ? String(statement.student.id) : null),
        studentId: statement?.student?.id || studentId || null,
        invoiceId: invoiceId || null,
        amount: numericAmount,
        currency,
        gateway: selectedGateway || undefined,
        channel: selectedChannel,
        payerPhone: isMomoChannel ? payerPhone : undefined,
        payerEmail: payerEmail || undefined,
        preferHostedCheckout,
        returnUrl,
        academicYear: statement?.feeSummary?.academicYear,
        term: statement?.feeSummary?.term,
        feeAccount: title || subscriptionMetadata?.planLabel,
        idempotencyKey: `ui_${paymentScope}_${statement?.student?.id || "sub"}_${Date.now()}`
      };

      const endpoint = allowPublicOnboarding ? "/payments/onboarding/initiate" : "/payments/initiate";
      const res = await apiClient.post(endpoint, payload, {
        headers: tenantId ? { "x-tenant-id": String(tenantId) } : undefined
      });
      const data = res.data?.data;
      if (!data?.transaction) {
        throw new Error(res.data?.message || "Payment gateway did not return a transaction reference.");
      }

      setActiveTransaction(data.transaction);
      setFallbackOptions(data.fallbackOptions || []);
      setInfoMsg(data.customerMessage || "");
      setStep("AUTHORIZE");

      if (data.transaction.gatewayStatus === "SUCCESSFUL") {
        await verifyOnServer(data.transaction.reference, false);
      } else if (!["FAILED", "CANCELLED", "EXPIRED"].includes(data.transaction.gatewayStatus)) {
        startStatusPolling(data.transaction.reference);
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.data?.error || err.message || "Could not start payment.";
      setErrorMsg(msg);
      if (err.response?.data?.data?.transaction) {
        setActiveTransaction(err.response.data.data.transaction);
        setFallbackOptions(err.response.data.data.fallbackOptions || []);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitOtp = async (e) => {
    e.preventDefault();
    if (!otpInput.trim() || !activeTransaction?.reference) return;
    setLoading(true);
    setErrorMsg("");
    try {
      const res = await apiClient.post(`/payments/${encodeURIComponent(activeTransaction.reference)}/submit-otp`, {
        otp: otpInput.trim()
      });
      const data = res.data?.data;
      setActiveTransaction(data.transaction);
      setInfoMsg(data.customerMessage || "OTP submitted. Checking confirmation...");
      if (data.transaction?.gatewayStatus === "SUCCESSFUL") {
        await verifyOnServer(data.transaction.reference, false);
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || "Could not verify the OTP code.");
    } finally {
      setLoading(false);
    }
  };

  const verifyOnServer = async (reference, quiet = false) => {
    if (!quiet) {
      setLoading(true);
      setErrorMsg("");
    }
    try {
      const endpoint = allowPublicOnboarding
        ? `/payments/onboarding/verify/${encodeURIComponent(reference)}`
        : `/payments/${encodeURIComponent(reference)}/verify`;
      const res = await apiClient.get(endpoint);
      const data = res.data?.data;
      if (data?.transaction) {
        setActiveTransaction(data.transaction);
        setInfoMsg(data.customerMessage || "");
        const st = data.transaction.gatewayStatus;
        if (st === "SUCCESSFUL") {
          stopPolling();
          setVerifiedReceipt(data.receipt || null);
          setStep("RESULT");
          if (typeof onSuccess === "function") {
            onSuccess({ transaction: data.transaction, receipt: data.receipt });
          }
        } else if (["FAILED", "CANCELLED", "EXPIRED", "REVERSED", "REFUNDED", "UNDER_REVIEW"].includes(st)) {
          stopPolling();
          if (!quiet) {
            setErrorMsg(data.transaction.failureReason || data.customerMessage || `Transaction is ${st}.`);
          }
        }
      }
      return data;
    } catch (err) {
      if (!quiet) {
        setErrorMsg(err.response?.data?.message || "Unable to reach verification server yet.");
      }
      return null;
    } finally {
      if (!quiet) setLoading(false);
    }
  };

  const handleFallback = async (alt) => {
    if (!activeTransaction?.reference) return;
    setLoading(true);
    setErrorMsg("");
    try {
      stopPolling();
      const res = await apiClient.post(
        `/payments/${encodeURIComponent(activeTransaction.reference)}/fallback`,
        {
          gateway: alt.gateway,
          channel: alt.channel,
          preferHostedCheckout: alt.type === "HOSTED_CHECKOUT",
          payerPhone: payerPhone || undefined
        }
      );
      const data = res.data?.data;
      setActiveTransaction(data.transaction);
      setFallbackOptions(data.fallbackOptions || fallbackOptions);
      setInfoMsg(data.customerMessage || "");
      if (data.transaction?.reference) {
        startStatusPolling(data.transaction.reference);
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || "Could not switch payment method.");
    } finally {
      setLoading(false);
    }
  };

  const handleCancelTransaction = async () => {
    if (!activeTransaction?.reference) {
      onClose();
      return;
    }
    stopPolling();
    setLoading(true);
    try {
      await apiClient.post(`/payments/${encodeURIComponent(activeTransaction.reference)}/cancel`);
      setStep("SETUP");
      setActiveTransaction(null);
      setInfoMsg("Previous payment request cancelled. You may choose another payment method.");
    } catch (err) {
      setErrorMsg(err.response?.data?.message || "Could not cancel transaction.");
    } finally {
      setLoading(false);
    }
  };

  const handleSandboxWebhookAction = async (outcome) => {
    if (!activeTransaction?.reference) return;
    setLoading(true);
    setErrorMsg("");
    try {
      await apiClient.post(`/payments/${encodeURIComponent(activeTransaction.reference)}/sandbox-confirm`, {
        outcome
      });
      await verifyOnServer(activeTransaction.reference, false);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || "Sandbox webhook test failed.");
    } finally {
      setLoading(false);
    }
  };

  const handlePrintReceipt = () => {
    if (!verifiedReceipt && !activeTransaction) return;
    const r = verifiedReceipt || {};
    const tx = activeTransaction || {};
    const win = window.open("", "_blank", "width=760,height=860");
    if (!win) return;
    win.document.write(`<!DOCTYPE html>
<html>
<head>
<title>Official Fee Receipt - ${r.receiptNumber || tx.receiptNumber || tx.reference}</title>
<style>
  body { font-family: Arial, sans-serif; color: #0f172a; padding: 32px; }
  .box { border: 2px solid #0f172a; padding: 24px; max-width: 640px; margin: 0 auto; }
  .hdr { display: flex; justify-content: space-between; border-bottom: 2px solid #cbd5e1; padding-bottom: 12px; margin-bottom: 16px; }
  .row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px dashed #e2e8f0; font-size: 14px; }
  .paid { font-size: 22px; font-weight: 800; color: #047857; margin-top: 12px; }
</style>
</head>
<body>
  <div class="box">
    <div class="hdr">
      <div><h2 style="margin:0;">${r.institutionName || schoolDisplayName}</h2><div>Official Verified Fee Receipt</div></div>
      <div style="text-align:right;"><strong>${r.receiptNumber || tx.receiptNumber}</strong><br/>${new Date(r.issuedAt || Date.now()).toLocaleString()}</div>
    </div>
    <div class="row"><span>Student Name</span><strong>${r.studentName || statement?.student?.fullName || studentName || "—"}</strong></div>
    <div class="row"><span>Student ID</span><strong>${r.studentCode || statement?.student?.studentCode || studentId || "—"}</strong></div>
    <div class="row"><span>Academic Period</span><strong>${r.academicYear || tx.academicYear || "2026-2027"} • ${r.term || tx.term || ""}</strong></div>
    <div class="row"><span>Fee Description</span><strong>${r.feeDescription || tx.feeAccount || title}</strong></div>
    <div class="row"><span>Payment Gateway & Method</span><strong>${r.gateway || tx.gateway} • ${r.channel || tx.channel}</strong></div>
    <div class="row"><span>GBS Transaction Reference</span><strong>${r.transactionRef || tx.reference}</strong></div>
    <div class="row"><span>Provider Reference</span><strong>${r.providerReference || tx.providerReference || "—"}</strong></div>
    <div class="row"><span>Balance Before Payment</span><strong>${r.currency || currency} ${Number(r.balanceBefore || 0).toFixed(2)}</strong></div>
    <div class="row"><span>Remaining Balance Due</span><strong>${r.currency || currency} ${Number(r.balanceAfter || 0).toFixed(2)}</strong></div>
    <div class="paid">Amount Confirmed: ${r.currency || currency} ${Number(r.amountPaid || tx.amountPaid || 0).toFixed(2)}</div>
  </div>
  <script>window.onload = function() { window.print(); };</script>
</body>
</html>`);
    win.document.close();
  };

  if (!isOpen) return null;

  const badge = STATE_BADGES[activeTransaction?.gatewayStatus] || STATE_BADGES.PENDING;
  const resolvedCheckoutUrl = activeTransaction?.authorizationUrl
    ? activeTransaction.authorizationUrl.startsWith("/")
      ? `${getApiBaseUrl().replace(/\/api\/v1$/, "")}${activeTransaction.authorizationUrl}?returnUrl=${encodeURIComponent(`${window.location.origin}/payment-callback?payment_ref=${activeTransaction.reference}`)}`
      : activeTransaction.authorizationUrl
    : null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(2, 6, 23, 0.85)",
        backdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 999999,
        padding: "16px",
        overflowY: "auto"
      }}
    >
      <div
        style={{
          background: "linear-gradient(155deg, #0f172a 0%, #1e293b 100%)",
          border: "1.5px solid rgba(56, 189, 248, 0.45)",
          borderRadius: "18px",
          width: "100%",
          maxWidth: "600px",
          maxHeight: "92vh",
          overflowY: "auto",
          padding: "24px",
          color: "#f8fafc",
          boxShadow: "0 24px 60px rgba(0,0,0,0.75)"
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px", borderBottom: "1px solid rgba(148,163,184,0.2)", paddingBottom: "14px", marginBottom: "16px" }}>
          <div>
            <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "#38bdf8", textTransform: "uppercase", letterSpacing: "0.8px" }}>
              {schoolDisplayName} • Official Payment Checkout
            </div>
            <h3 style={{ margin: "4px 0 0", fontSize: "1.2rem", color: "#fff" }}>{title}</h3>
          </div>
          <button
            type="button"
            onClick={() => { stopPolling(); onClose(); }}
            style={{ background: "rgba(148,163,184,0.15)", border: "1px solid rgba(148,163,184,0.3)", color: "#e2e8f0", borderRadius: "8px", padding: "6px 10px", cursor: "pointer", fontWeight: 700 }}
          >
            ✕ Close
          </button>
        </div>

        {/* Sandbox Notice */}
        {(selectedChannelConfig?.isSandbox || activeTransaction?.gateway === "SANDBOX_PSP") && (
          <div style={{ background: "rgba(245, 158, 11, 0.14)", border: "1px solid #f59e0b", borderRadius: "10px", padding: "10px 12px", marginBottom: "14px", fontSize: "0.8rem", color: "#fde68a" }}>
            <strong>Sandbox Test Mode Active:</strong> Transactions use the official test-mode workflow (webhooks & server verification) without moving real money. Configure live Paystack or Hubtel keys on the server for live collections.
          </div>
        )}

        {errorMsg && (
          <div style={{ background: "rgba(239, 68, 68, 0.14)", border: "1px solid #ef4444", borderRadius: "10px", padding: "10px 14px", marginBottom: "14px", fontSize: "0.85rem", color: "#fecaca" }}>
            {errorMsg}
          </div>
        )}

        {infoMsg && !errorMsg && (
          <div style={{ background: "rgba(56, 189, 248, 0.12)", border: "1px solid #38bdf8", borderRadius: "10px", padding: "10px 14px", marginBottom: "14px", fontSize: "0.85rem", color: "#bae6fd" }}>
            {infoMsg}
          </div>
        )}

        {/* STEP 1: SETUP */}
        {step === "SETUP" && (
          <form onSubmit={handleInitiate} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            {loadingStatement ? (
              <div style={{ padding: "24px", textAlign: "center", color: "#94a3b8" }}>
                Loading verified student fee account from database...
              </div>
            ) : (
              <>
                {statement?.feeSummary && (
                  <div style={{ background: "rgba(2, 6, 23, 0.55)", border: "1px solid rgba(148, 163, 184, 0.2)", borderRadius: "12px", padding: "14px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "8px", marginBottom: "8px" }}>
                      <div>
                        <div style={{ fontSize: "0.75rem", color: "#94a3b8" }}>Student</div>
                        <strong style={{ color: "#fff" }}>{statement.student.fullName}</strong>{" "}
                        <span style={{ fontSize: "0.78rem", color: "#38bdf8" }}>({statement.student.studentCode})</span>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: "0.75rem", color: "#94a3b8" }}>Academic Period</div>
                        <strong style={{ color: "#cbd5e1", fontSize: "0.85rem" }}>{statement.feeSummary.term}</strong>
                      </div>
                    </div>
                    <div style={{ fontSize: "0.8rem", color: "#cbd5e1", marginBottom: "10px" }}>
                      Fee Item: <strong>{statement.feeSummary.feeDescription}</strong>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px", borderTop: "1px solid rgba(148,163,184,0.15)", paddingTop: "10px" }}>
                      <div>
                        <div style={{ fontSize: "0.7rem", color: "#94a3b8" }}>Total Billed</div>
                        <strong>{currency} {Number(statement.feeSummary.totalBilled).toFixed(2)}</strong>
                      </div>
                      <div>
                        <div style={{ fontSize: "0.7rem", color: "#94a3b8" }}>Already Paid</div>
                        <strong style={{ color: "#34d399" }}>{currency} {Number(statement.feeSummary.totalPaid).toFixed(2)}</strong>
                      </div>
                      <div>
                        <div style={{ fontSize: "0.7rem", color: "#94a3b8" }}>Balance Due</div>
                        <strong style={{ color: "#f87171", fontSize: "1.02rem" }}>{currency} {Number(statement.feeSummary.outstandingBalance).toFixed(2)}</strong>
                      </div>
                    </div>
                  </div>
                )}

                {statement?.feeSummary && Number(statement.feeSummary.outstandingBalance) <= 0 ? (
                  <div style={{ padding: "16px", background: "rgba(16, 185, 129, 0.14)", border: "1px solid #10b981", borderRadius: "10px", textAlign: "center", color: "#6ee7b7" }}>
                    <strong>No Outstanding Balance Due.</strong> All verified school fees for this student are currently paid in full.
                  </div>
                ) : (
                  <>
                    <div>
                      <label style={{ display: "block", fontSize: "0.8rem", color: "#cbd5e1", marginBottom: "6px", fontWeight: 700 }}>
                        Amount to Pay ({currency})
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        required
                        min={statement?.feeSummary?.minimumPayableAmount || 1}
                        max={statement?.feeSummary?.outstandingBalance || undefined}
                        value={payAmount}
                        onChange={(e) => setPayAmount(e.target.value)}
                        style={{ width: "100%", padding: "10px 12px", borderRadius: "10px", border: "1px solid rgba(148,163,184,0.35)", background: "#020617", color: "#34d399", fontSize: "1.15rem", fontWeight: 800, boxSizing: "border-box" }}
                      />
                      {statement?.feeSummary?.allowPartialPayments && (
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "6px", fontSize: "0.76rem", color: "#94a3b8" }}>
                          <span>Partial payment minimum: {currency} {Number(statement.feeSummary.minimumPayableAmount).toFixed(2)}</span>
                          <button
                            type="button"
                            onClick={() => setPayAmount(String(statement.feeSummary.outstandingBalance))}
                            style={{ background: "transparent", border: "none", color: "#38bdf8", cursor: "pointer", fontWeight: 700, padding: 0 }}
                          >
                            Pay Full Balance
                          </button>
                        </div>
                      )}
                    </div>

                    <div>
                      <label style={{ display: "block", fontSize: "0.8rem", color: "#cbd5e1", marginBottom: "8px", fontWeight: 700 }}>
                        Choose Payment Method
                      </label>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(165px, 1fr))", gap: "8px" }}>
                        {availableChannels.map((ch) => {
                          const meta = CHANNEL_META[ch.channel] || { title: ch.label, subtitle: ch.primaryGateway, accent: "#38bdf8", icon: "💳" };
                          const active = selectedChannel === ch.channel;
                          return (
                            <button
                              key={ch.channel}
                              type="button"
                              onClick={() => handleSelectChannel(ch)}
                              style={{
                                textAlign: "left",
                                padding: "10px 12px",
                                borderRadius: "10px",
                                border: active ? `2px solid ${meta.accent}` : "1px solid rgba(148,163,184,0.25)",
                                background: active ? "rgba(56, 189, 248, 0.14)" : "rgba(15, 23, 42, 0.7)",
                                color: "#f8fafc",
                                cursor: "pointer"
                              }}
                            >
                              <div style={{ fontWeight: 800, fontSize: "0.85rem" }}>{meta.icon} {meta.title}</div>
                              <div style={{ fontSize: "0.72rem", color: "#94a3b8", marginTop: "2px" }}>via {ch.primaryGateway}</div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {isMomoChannel && (
                      <div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                          <label style={{ fontSize: "0.8rem", color: "#cbd5e1", fontWeight: 700 }}>
                            Your Mobile Money Number (Any Network: MTN, Telecel, AirtelTigo) *
                          </label>
                          {payerPhone.trim().length >= 3 && (
                            <span style={{ fontSize: "0.72rem", color: "#34d399", fontWeight: 800 }}>
                              {detectMomoNetworkLabel(payerPhone)}
                            </span>
                          )}
                        </div>
                        <input
                          type="tel"
                          required
                          data-testid="momo-payer-phone-input"
                          placeholder="Enter any MoMo number (e.g. 024..., 020..., 027..., +233...)"
                          value={payerPhone}
                          onChange={(e) => setPayerPhone(e.target.value)}
                          style={{ width: "100%", padding: "10px 12px", borderRadius: "10px", border: "1px solid rgba(148,163,184,0.35)", background: "#020617", color: "#fff", boxSizing: "border-box" }}
                        />
                        <label style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "8px", fontSize: "0.78rem", color: "#94a3b8", cursor: "pointer" }}>
                          <input
                            type="checkbox"
                            checked={preferHostedCheckout}
                            onChange={(e) => setPreferHostedCheckout(e.target.checked)}
                          />
                          No MoMo app or prefer web checkout? Open provider secure webpage instead
                        </label>
                      </div>
                    )}

                    <div>
                      <label style={{ display: "block", fontSize: "0.8rem", color: "#cbd5e1", marginBottom: "6px", fontWeight: 700 }}>
                        Email for Official Receipt
                      </label>
                      <input
                        type="email"
                        placeholder="parent@example.com"
                        value={payerEmail}
                        onChange={(e) => setPayerEmail(e.target.value)}
                        style={{ width: "100%", padding: "10px 12px", borderRadius: "10px", border: "1px solid rgba(148,163,184,0.35)", background: "#020617", color: "#fff", boxSizing: "border-box" }}
                      />
                    </div>

                    <div style={{ fontSize: "0.76rem", color: "#94a3b8", background: "rgba(16, 185, 129, 0.08)", border: "1px solid rgba(16, 185, 129, 0.3)", borderRadius: "8px", padding: "9px 12px" }}>
                      <strong>Security Promise:</strong> GBS never asks for your Mobile Money PIN, Card Number, or CVV. You approve payments directly on your phone or your provider&apos;s official checkout page.
                    </div>

                    <button
                      type="submit"
                      disabled={loading || availableChannels.length === 0}
                      style={{
                        background: "linear-gradient(135deg, #059669, #10b981)",
                        color: "#fff",
                        border: "none",
                        borderRadius: "10px",
                        padding: "13px 16px",
                        fontWeight: 800,
                        fontSize: "0.95rem",
                        cursor: loading ? "wait" : "pointer"
                      }}
                    >
                      {loading ? "Starting Payment with Provider..." : `Proceed to Pay ${currency} ${Number(payAmount || 0).toFixed(2)}`}
                    </button>
                  </>
                )}
              </>
            )}
          </form>
        )}

        {/* STEP 2: AUTHORIZE & STATUS */}
        {step === "AUTHORIZE" && activeTransaction && (
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px", background: "rgba(2,6,23,0.6)", padding: "12px 14px", borderRadius: "12px" }}>
              <div>
                <div style={{ fontSize: "0.72rem", color: "#94a3b8" }}>Transaction Reference</div>
                <strong style={{ fontFamily: "monospace", fontSize: "0.95rem", color: "#38bdf8" }}>{activeTransaction.reference}</strong>
              </div>
              <span style={{ background: badge.bg, color: badge.color, border: `1px solid ${badge.color}`, padding: "4px 10px", borderRadius: "999px", fontSize: "0.75rem", fontWeight: 800 }}>
                {badge.label}
              </span>
            </div>

            {activeTransaction.ussdInstruction && (
              <div style={{ background: "rgba(15, 23, 42, 0.85)", border: "1px solid #38bdf8", borderRadius: "10px", padding: "12px", fontSize: "0.85rem", color: "#e0f2fe" }}>
                <strong>Provider Instructions:</strong> {activeTransaction.ussdInstruction}
              </div>
            )}

            {activeTransaction.authorizationType === "OTP" && (
              <form onSubmit={handleSubmitOtp} style={{ display: "flex", gap: "8px" }}>
                <input
                  type="text"
                  required
                  placeholder="Enter OTP from your phone"
                  value={otpInput}
                  onChange={(e) => setOtpInput(e.target.value)}
                  style={{ flex: 1, padding: "10px", borderRadius: "8px", border: "1px solid #38bdf8", background: "#020617", color: "#fff" }}
                />
                <button type="submit" disabled={loading} style={{ background: "#0284c7", color: "#fff", border: "none", borderRadius: "8px", padding: "10px 16px", fontWeight: 700, cursor: "pointer" }}>
                  Verify Code
                </button>
              </form>
            )}

            {resolvedCheckoutUrl && (
              <a
                href={resolvedCheckoutUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "block",
                  textAlign: "center",
                  background: "linear-gradient(135deg, #0284c7, #2563eb)",
                  color: "#fff",
                  textDecoration: "none",
                  borderRadius: "10px",
                  padding: "12px 16px",
                  fontWeight: 800
                }}
              >
                Open Official Secure Checkout Page ↗
              </a>
            )}

            {activeTransaction.gateway === "SANDBOX_PSP" && !["SUCCESSFUL", "CANCELLED"].includes(activeTransaction.gatewayStatus) && (
              <div style={{ background: "rgba(245, 158, 11, 0.1)", border: "1px dashed #f59e0b", borderRadius: "10px", padding: "12px" }}>
                <div style={{ fontSize: "0.78rem", fontWeight: 800, color: "#fbbf24", marginBottom: "8px" }}>
                  Sandbox Test Webhook Controls (Demo & QA Mode Only)
                </div>
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => handleSandboxWebhookAction("SUCCESSFUL")}
                    style={{ flex: 1, background: "#059669", color: "#fff", border: "none", borderRadius: "8px", padding: "9px 12px", fontWeight: 700, cursor: "pointer" }}
                  >
                    Simulate Provider Approval Webhook
                  </button>
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => handleSandboxWebhookAction("FAILED")}
                    style={{ flex: 1, background: "#b91c1c", color: "#fff", border: "none", borderRadius: "8px", padding: "9px 12px", fontWeight: 700, cursor: "pointer" }}
                  >
                    Simulate Insufficient Funds
                  </button>
                </div>
              </div>
            )}

            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              <button
                type="button"
                disabled={loading}
                onClick={() => verifyOnServer(activeTransaction.reference, false)}
                style={{ flex: 1, background: "#0f766e", color: "#fff", border: "none", borderRadius: "10px", padding: "11px 14px", fontWeight: 800, cursor: "pointer" }}
              >
                {loading ? "Checking Provider..." : `Verify Payment Status ${pollingActive ? "(Auto-Checking)" : ""}`}
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={handleCancelTransaction}
                style={{ background: "rgba(148,163,184,0.18)", color: "#e2e8f0", border: "1px solid rgba(148,163,184,0.35)", borderRadius: "10px", padding: "11px 14px", fontWeight: 700, cursor: "pointer" }}
              >
                Cancel
              </button>
            </div>

            {fallbackOptions.length > 0 && (
              <div style={{ borderTop: "1px solid rgba(148,163,184,0.2)", paddingTop: "12px" }}>
                <div style={{ fontSize: "0.78rem", fontWeight: 800, color: "#cbd5e1", marginBottom: "6px" }}>
                  No app installed or prompt did not arrive? Switch safely:
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  {fallbackOptions.map((alt, idx) => (
                    <button
                      key={`${alt.gateway}_${alt.channel}_${idx}`}
                      type="button"
                      disabled={loading}
                      onClick={() => handleFallback(alt)}
                      style={{ textAlign: "left", background: "rgba(30, 41, 59, 0.85)", border: "1px solid rgba(148,163,184,0.25)", color: "#e2e8f0", borderRadius: "8px", padding: "8px 12px", fontSize: "0.8rem", cursor: "pointer" }}
                    >
                      <strong>{alt.label}</strong>
                      <div style={{ fontSize: "0.72rem", color: "#94a3b8" }}>{alt.description}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* STEP 3: VERIFIED RECEIPT */}
        {step === "RESULT" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            <div style={{ background: "rgba(16, 185, 129, 0.14)", border: "1.5px solid #10b981", borderRadius: "12px", padding: "16px", textAlign: "center" }}>
              <div style={{ fontSize: "2rem" }}>✅</div>
              <h4 style={{ margin: "6px 0", color: "#34d399", fontSize: "1.1rem" }}>Payment Confirmed by Provider</h4>
              <p style={{ margin: 0, fontSize: "0.85rem", color: "#e2e8f0" }}>
                Receipt <strong>{verifiedReceipt?.receiptNumber || activeTransaction?.receiptNumber}</strong> has been recorded and school accounts updated.
              </p>
            </div>

            <div style={{ background: "rgba(2, 6, 23, 0.55)", borderRadius: "12px", padding: "14px", fontSize: "0.84rem", display: "flex", flexDirection: "column", gap: "6px" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#94a3b8" }}>Reference:</span>
                <strong style={{ fontFamily: "monospace" }}>{activeTransaction?.reference}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#94a3b8" }}>Provider & Channel:</span>
                <strong>{activeTransaction?.gateway} • {activeTransaction?.channel}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#94a3b8" }}>Confirmed Amount:</span>
                <strong style={{ color: "#34d399" }}>{currency} {Number(verifiedReceipt?.amountPaid || activeTransaction?.amountPaid || 0).toFixed(2)}</strong>
              </div>
              {verifiedReceipt && (
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#94a3b8" }}>Remaining Fee Balance:</span>
                  <strong>{currency} {Number(verifiedReceipt.balanceAfter || 0).toFixed(2)}</strong>
                </div>
              )}
            </div>

            <div style={{ display: "flex", gap: "10px" }}>
              <button
                type="button"
                onClick={handlePrintReceipt}
                style={{ flex: 1, background: "#0284c7", color: "#fff", border: "none", borderRadius: "10px", padding: "11px 14px", fontWeight: 800, cursor: "pointer" }}
              >
                Print / Save Official Receipt
              </button>
              <button
                type="button"
                onClick={() => { stopPolling(); onClose(); }}
                style={{ flex: 1, background: "#059669", color: "#fff", border: "none", borderRadius: "10px", padding: "11px 14px", fontWeight: 800, cursor: "pointer" }}
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
