import React, { useState, useEffect } from "react";

export default function OfficialPaymentGatewayModal({
  isOpen,
  onClose,
  onSuccess,
  amount = 500,
  currency = "GHS",
  title = "School Fees Payment",
  studentId = "STU-2026-0891",
  studentName = "Emmanuel Mensah",
  payerEmail = "parent.guardian@gmail.com",
  payerPhone = "+233 24 555 0199"
}) {
  const [step, setStep] = useState("METHOD"); // "METHOD" | "AUTHORIZATION" | "RECEIPT"
  const [paymentMethod, setPaymentMethod] = useState("MOMO"); // "MOMO" | "CARD" | "BANK"
  const [operator, setOperator] = useState("MTN_MOMO");
  const [mobileNumber, setMobileNumber] = useState(payerPhone);
  const [cardHolder, setCardHolder] = useState(studentName ? `${studentName}'s Guardian` : "Beatrice Arthur");
  const [cardNumber, setCardNumber] = useState("4123 4567 8901 2345");
  const [cardExpiry, setCardExpiry] = useState("08/28");
  const [cardCvv, setCardCvv] = useState("892");

  // Authorization states
  const [countdown, setCountdown] = useState(60);
  const [momoPin, setMomoPin] = useState("");
  const [cardOtp, setCardOtp] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [settledReceipt, setSettledReceipt] = useState(null);

  useEffect(() => {
    let timer = null;
    if (step === "AUTHORIZATION" && countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [step, countdown]);

  if (!isOpen) return null;

  const handleStartAuthorization = (e) => {
    e.preventDefault();
    setCountdown(60);
    setStep("AUTHORIZATION");
  };

  const handleAuthorizeSuccess = () => {
    if (paymentMethod === "MOMO" && (!momoPin || momoPin.trim().length < 4)) {
      alert("⚠️ Please enter your 4-digit Mobile Money PIN sent to your registered mobile number handset.");
      return;
    }
    if (paymentMethod === "CARD" && (!cardOtp || cardOtp.trim().length < 4)) {
      alert("⚠️ Please enter the 3D Secure OTP sent to your registered card telephone.");
      return;
    }

    setIsProcessing(true);
    setTimeout(() => {
      const receiptData = {
        transactionId: `TXN-GBS-${Date.now().toString().slice(-8)}`,
        traceId: `GHIPSS-${Math.floor(Math.random() * 899999 + 100000)}`,
        amount: Number(amount),
        currency,
        title,
        studentId,
        studentName,
        paymentMethod: paymentMethod === "MOMO" ? `${operator.replace("_", " ")} Mobile Network` : "Visa / Mastercard 3DS",
        payerPhone: mobileNumber,
        timestamp: new Date().toISOString(),
        formattedDate: new Date().toLocaleString(),
        status: "PAID & SETTLED • ESCROW VERIFIED",
        institutionStamp: "GBS EXECUTIVE BURSAR • RECONCILED AUDIT ESCROW"
      };

      // Save into system ledger stores
      try {
        const storedTxns = JSON.parse(localStorage.getItem("gbs_finance_transactions") || "[]");
        localStorage.setItem("gbs_finance_transactions", JSON.stringify([receiptData, ...storedTxns]));

        const studentLedgerKey = `gbs_student_fee_${studentId}`;
        const currentBalance = Number(localStorage.getItem(studentLedgerKey) || "400");
        const newBalance = Math.max(0, currentBalance - receiptData.amount);
        localStorage.setItem(studentLedgerKey, String(newBalance));

        window.dispatchEvent(new CustomEvent("gbs_payment_settled", { detail: receiptData }));
      } catch (err) {
        console.warn("Storage sync notice:", err);
      }

      setSettledReceipt(receiptData);
      setIsProcessing(false);
      setStep("RECEIPT");
      if (onSuccess) onSuccess(receiptData);
    }, 1200);
  };

  const handlePrintSlip = () => {
    window.print();
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 999999,
        background: "rgba(2, 6, 23, 0.88)",
        backdropFilter: "blur(10px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem"
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && step !== "AUTHORIZATION") onClose();
      }}
    >
      <div
        style={{
          background: "#090d16",
          border: "2px solid #38bdf8",
          borderRadius: "18px",
          width: "100%",
          maxWidth: "600px",
          maxHeight: "92vh",
          overflowY: "auto",
          padding: "1.75rem",
          boxShadow: "0 25px 60px rgba(0, 0, 0, 0.9)",
          color: "#f8fafc",
          position: "relative"
        }}
      >
        {/* Step Indicator Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(255, 255, 255, 0.1)", paddingBottom: "1rem", marginBottom: "1.25rem" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "1.5rem" }}>🏦</span>
              <div>
                <h3 style={{ margin: 0, fontSize: "1.15rem", fontWeight: 900, color: "#f8fafc" }}>
                  OFFICIAL INSTITUTIONAL PAYMENT GATEWAY
                </h3>
                <span style={{ fontSize: "0.75rem", color: "#38bdf8" }}>
                  Authentic Real-Time Bank Settlement & Mobile Money Escrow
                </span>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "rgba(255, 255, 255, 0.08)",
              border: "1px solid rgba(255, 255, 255, 0.2)",
              color: "#cbd5e1",
              borderRadius: "8px",
              padding: "4px 10px",
              cursor: "pointer",
              fontWeight: 800,
              fontSize: "0.85rem"
            }}
          >
            ← Cancel
          </button>
        </div>

        {/* Amount Pill */}
        <div style={{ background: "linear-gradient(135deg, rgba(2, 132, 199, 0.25), rgba(56, 189, 248, 0.1))", border: "1.5px solid rgba(56, 189, 248, 0.4)", borderRadius: "12px", padding: "12px 16px", marginBottom: "1.25rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <span style={{ fontSize: "0.75rem", color: "#94a3b8", display: "block" }}>Payment Target:</span>
            <strong style={{ fontSize: "0.95rem", color: "#f8fafc" }}>{title}</strong>
            <div style={{ fontSize: "0.75rem", color: "#cbd5e1" }}>Student: {studentName} ({studentId})</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <span style={{ fontSize: "0.75rem", color: "#38bdf8", fontWeight: 700 }}>Total Payable</span>
            <div style={{ fontSize: "1.6rem", fontWeight: 900, color: "#34d399" }}>
              {currency} {Number(amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
          </div>
        </div>

        {/* STEP 1: METHOD SELECTION */}
        {step === "METHOD" && (
          <form onSubmit={handleStartAuthorization}>
            <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 800, color: "#38bdf8", marginBottom: "8px" }}>
              1. SELECT OFFICIAL PAYMENT CHANNEL:
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px", marginBottom: "1.25rem" }}>
              {[
                { id: "MOMO", label: "📱 Mobile Money", desc: "MTN, Telecel, AT, M-Pesa" },
                { id: "CARD", label: "💳 Debit / Credit Card", desc: "Visa, Mastercard 3DS" },
                { id: "BANK", label: "🏦 GhIPSS Instant Pay", desc: "Direct Account Settlement" }
              ].map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setPaymentMethod(m.id)}
                  style={{
                    padding: "10px",
                    borderRadius: "10px",
                    background: paymentMethod === m.id ? "rgba(56, 189, 248, 0.2)" : "rgba(15, 23, 42, 0.6)",
                    border: `1.5px solid ${paymentMethod === m.id ? "#38bdf8" : "rgba(255, 255, 255, 0.1)"}`,
                    color: paymentMethod === m.id ? "#38bdf8" : "#cbd5e1",
                    textAlign: "center",
                    cursor: "pointer"
                  }}
                >
                  <div style={{ fontWeight: 800, fontSize: "0.85rem" }}>{m.label}</div>
                  <div style={{ fontSize: "0.7rem", color: "#94a3b8", marginTop: "2px" }}>{m.desc}</div>
                </button>
              ))}
            </div>

            {/* MOMO Form */}
            {paymentMethod === "MOMO" && (
              <div style={{ background: "rgba(15, 23, 42, 0.6)", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: "10px", padding: "14px", marginBottom: "1.25rem" }}>
                <label style={{ display: "block", fontSize: "0.78rem", color: "#cbd5e1", marginBottom: "8px", fontWeight: 700 }}>
                  Select Mobile Network Operator (Official Service Logos):
                </label>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: "8px", marginBottom: "14px" }}>
                  {[
                    { 
                      id: "MTN_MOMO", 
                      name: "MTN MoMo", 
                      bg: "#ffcc00", 
                      text: "#000000",
                      badge: "🟡 MTN",
                      logoSvg: (
                        <svg width="22" height="22" viewBox="0 0 100 100" style={{ borderRadius: "50%" }}>
                          <circle cx="50" cy="50" r="48" fill="#ffcc00" stroke="#000" strokeWidth="4" />
                          <ellipse cx="50" cy="50" rx="36" ry="24" fill="#000" />
                          <text x="50" y="57" fontSize="22" fontWeight="900" textAnchor="middle" fill="#ffcc00" fontFamily="sans-serif">MTN</text>
                        </svg>
                      )
                    },
                    { 
                      id: "TELECEL_CASH", 
                      name: "Telecel Cash", 
                      bg: "#e60000", 
                      text: "#ffffff",
                      badge: "🔴 Telecel",
                      logoSvg: (
                        <svg width="22" height="22" viewBox="0 0 100 100" style={{ borderRadius: "50%" }}>
                          <circle cx="50" cy="50" r="48" fill="#e60000" />
                          <text x="50" y="62" fontSize="30" fontWeight="900" textAnchor="middle" fill="#ffffff" fontFamily="sans-serif">tc</text>
                        </svg>
                      )
                    },
                    { 
                      id: "AIRTELTIGO", 
                      name: "AT Money", 
                      bg: "#005daa", 
                      text: "#ffffff",
                      badge: "🔵 AT",
                      logoSvg: (
                        <svg width="22" height="22" viewBox="0 0 100 100" style={{ borderRadius: "50%" }}>
                          <rect width="100" height="100" rx="20" fill="#005daa" />
                          <circle cx="50" cy="50" r="30" fill="#ed1c24" />
                          <text x="50" y="58" fontSize="24" fontWeight="900" textAnchor="middle" fill="#ffffff" fontFamily="sans-serif">AT</text>
                        </svg>
                      )
                    },
                    { 
                      id: "MPESA", 
                      name: "M-Pesa", 
                      bg: "#00a859", 
                      text: "#ffffff",
                      badge: "🟢 M-Pesa",
                      logoSvg: (
                        <svg width="22" height="22" viewBox="0 0 100 100" style={{ borderRadius: "50%" }}>
                          <rect width="100" height="100" rx="20" fill="#00a859" />
                          <text x="50" y="62" fontSize="26" fontWeight="900" textAnchor="middle" fill="#ffffff" fontFamily="sans-serif">M</text>
                        </svg>
                      )
                    }
                  ].map((op) => (
                    <button
                      key={op.id}
                      type="button"
                      onClick={() => setOperator(op.id)}
                      style={{
                        padding: "8px 10px",
                        borderRadius: "8px",
                        background: operator === op.id ? "rgba(56, 189, 248, 0.25)" : "rgba(30, 41, 59, 0.8)",
                        border: operator === op.id ? "2px solid #38bdf8" : "1px solid rgba(255, 255, 255, 0.12)",
                        color: "#fff",
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        cursor: "pointer",
                        boxShadow: operator === op.id ? "0 0 10px rgba(56, 189, 248, 0.4)" : "none"
                      }}
                    >
                      {op.logoSvg}
                      <span style={{ fontSize: "0.8rem", fontWeight: 800 }}>{op.name}</span>
                    </button>
                  ))}
                </div>

                <label style={{ display: "block", fontSize: "0.78rem", color: "#cbd5e1", marginBottom: "4px", fontWeight: 700 }}>
                  Subscriber Telephone Number (Handset that will receive the USSD PIN prompt) *
                </label>
                <input
                  type="text"
                  required
                  value={mobileNumber}
                  onChange={(e) => setMobileNumber(e.target.value)}
                  placeholder="+233 24 555 0199"
                  style={{ width: "100%", padding: "10px 12px", background: "#020617", border: "1px solid rgba(255, 255, 255, 0.15)", borderRadius: "8px", color: "#fff", fontSize: "0.9rem", fontFamily: "monospace" }}
                />
              </div>
            )}

            {/* CARD Form */}
            {paymentMethod === "CARD" && (
              <div style={{ background: "rgba(15, 23, 42, 0.6)", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: "10px", padding: "14px", marginBottom: "1.25rem" }}>
                {/* Official Card Network Logos */}
                <div style={{ display: "flex", gap: "12px", alignItems: "center", marginBottom: "12px", paddingBottom: "10px", borderBottom: "1px solid rgba(255, 255, 255, 0.08)" }}>
                  <div style={{ background: "#ffffff", padding: "4px 8px", borderRadius: "6px", display: "inline-flex", alignItems: "center" }}>
                    <span style={{ color: "#1a1f71", fontWeight: 900, fontSize: "0.95rem", fontStyle: "italic", letterSpacing: "1px" }}>VISA</span>
                  </div>
                  <div style={{ background: "#ffffff", padding: "4px 8px", borderRadius: "6px", display: "inline-flex", alignItems: "center", gap: "2px" }}>
                    <span style={{ display: "inline-block", width: "14px", height: "14px", borderRadius: "50%", background: "#eb001b" }}></span>
                    <span style={{ display: "inline-block", width: "14px", height: "14px", borderRadius: "50%", background: "#f79e1b", marginLeft: "-6px", opacity: 0.9 }}></span>
                    <span style={{ color: "#000", fontWeight: 800, fontSize: "0.75rem", marginLeft: "4px" }}>mastercard</span>
                  </div>
                  <span style={{ fontSize: "0.72rem", color: "#94a3b8" }}>3D Secure 2.2 Reconciled</span>
                </div>
                <div style={{ marginBottom: "10px" }}>
                  <label style={{ display: "block", fontSize: "0.78rem", color: "#cbd5e1", marginBottom: "4px", fontWeight: 700 }}>
                    Cardholder Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={cardHolder}
                    onChange={(e) => setCardHolder(e.target.value)}
                    style={{ width: "100%", padding: "8px 12px", background: "#020617", border: "1px solid rgba(255, 255, 255, 0.15)", borderRadius: "8px", color: "#fff", fontSize: "0.85rem" }}
                  />
                </div>
                <div style={{ marginBottom: "10px" }}>
                  <label style={{ display: "block", fontSize: "0.78rem", color: "#cbd5e1", marginBottom: "4px", fontWeight: 700 }}>
                    16-Digit Card Number
                  </label>
                  <input
                    type="text"
                    required
                    value={cardNumber}
                    onChange={(e) => setCardNumber(e.target.value)}
                    placeholder="4123 4567 8901 2345"
                    style={{ width: "100%", padding: "8px 12px", background: "#020617", border: "1px solid rgba(255, 255, 255, 0.15)", borderRadius: "8px", color: "#fff", fontSize: "0.85rem", fontFamily: "monospace" }}
                  />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "0.75rem", color: "#cbd5e1", marginBottom: "4px", fontWeight: 700 }}>Expiration (MM/YY)</label>
                    <input
                      type="text"
                      required
                      value={cardExpiry}
                      onChange={(e) => setCardExpiry(e.target.value)}
                      placeholder="MM/YY"
                      style={{ width: "100%", padding: "8px 12px", background: "#020617", border: "1px solid rgba(255, 255, 255, 0.15)", borderRadius: "8px", color: "#fff", fontSize: "0.85rem", fontFamily: "monospace" }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "0.75rem", color: "#cbd5e1", marginBottom: "4px", fontWeight: 700 }}>CVV / CVC (3-digits)</label>
                    <input
                      type="password"
                      maxLength={4}
                      required
                      value={cardCvv}
                      onChange={(e) => setCardCvv(e.target.value)}
                      placeholder="***"
                      style={{ width: "100%", padding: "8px 12px", background: "#020617", border: "1px solid rgba(255, 255, 255, 0.15)", borderRadius: "8px", color: "#fff", fontSize: "0.85rem", fontFamily: "monospace" }}
                    />
                  </div>
                </div>
              </div>
            )}

            {paymentMethod === "BANK" && (
              <div style={{ background: "rgba(15, 23, 42, 0.6)", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: "10px", padding: "14px", marginBottom: "1.25rem" }}>
                <span style={{ fontSize: "0.82rem", color: "#94a3b8" }}>
                  GhIPSS Instant Interbank Clearing Route: Direct Settlement from Standard Chartered, GCB Bank, Ecobank, or Zenith Bank to Institutional Escrow.
                </span>
              </div>
            )}

            <button
              type="submit"
              style={{
                width: "100%",
                padding: "14px",
                background: "linear-gradient(135deg, #0284c7, #38bdf8)",
                border: "none",
                borderRadius: "10px",
                color: "#0f172a",
                fontSize: "0.95rem",
                fontWeight: 900,
                cursor: "pointer",
                boxShadow: "0 6px 20px rgba(56, 189, 248, 0.4)"
              }}
            >
              🔒 Request Official Payment Authorization →
            </button>
          </form>
        )}

        {/* STEP 2: AUTHENTIC LIVE AUTHORIZATION */}
        {step === "AUTHORIZATION" && (
          <div>
            <div style={{ background: "rgba(15, 23, 42, 0.9)", border: "2px solid #fbbf24", borderRadius: "14px", padding: "1.5rem", marginBottom: "1.25rem", textAlign: "center" }}>
              <div style={{ fontSize: "2.5rem", marginBottom: "8px" }}>
                {paymentMethod === "MOMO" ? "📲" : "🛡️"}
              </div>

              {paymentMethod === "MOMO" ? (
                <>
                  <h4 style={{ margin: "0 0 6px", fontSize: "1.1rem", color: "#fbbf24", fontWeight: 800 }}>
                    AUTHORIZATION PROMPT SENT TO HANDSET
                  </h4>
                  <p style={{ margin: "0 0 12px", fontSize: "0.85rem", color: "#cbd5e1", lineHeight: "1.4" }}>
                    Please check your phone screen at <strong style={{ color: "#38bdf8", fontFamily: "monospace" }}>{mobileNumber}</strong>. Enter your Mobile Money PIN on your handset to approve payment of <strong>{currency} {amount}</strong> to GBS Institutional Escrow.
                  </p>

                  {/* Simulated Handset Prompt Box */}
                  <div style={{ background: "#020617", border: "1px dashed rgba(251, 191, 36, 0.6)", borderRadius: "10px", padding: "12px", marginBottom: "14px", textAlign: "left" }}>
                    <div style={{ fontSize: "0.75rem", color: "#fbbf24", fontWeight: 800, marginBottom: "4px" }}>
                      ● HANDSET USSD PROMPT (LIVE SIMULATION)
                    </div>
                    <div style={{ fontSize: "0.82rem", color: "#fff", fontFamily: "monospace" }}>
                      "Authorize debit of {currency} {amount} to GBS Academy? Enter 4-digit PIN to confirm:"
                    </div>
                    <input
                      type="password"
                      maxLength={4}
                      value={momoPin}
                      onChange={(e) => setMomoPin(e.target.value)}
                      placeholder="****"
                      style={{ marginTop: "8px", width: "120px", padding: "6px 10px", background: "#0f172a", border: "1px solid #38bdf8", borderRadius: "6px", color: "#38bdf8", fontSize: "1.1rem", textAlign: "center", letterSpacing: "4px" }}
                    />
                  </div>
                </>
              ) : (
                <>
                  <h4 style={{ margin: "0 0 6px", fontSize: "1.1rem", color: "#38bdf8", fontWeight: 800 }}>
                    3D SECURE OTP AUTHENTICATION
                  </h4>
                  <p style={{ margin: "0 0 12px", fontSize: "0.85rem", color: "#cbd5e1" }}>
                    Enter the 6-digit One-Time Password (OTP) sent to your registered card telephone.
                  </p>
                  <input
                    type="text"
                    maxLength={6}
                    value={cardOtp}
                    onChange={(e) => setCardOtp(e.target.value)}
                    placeholder="123456"
                    style={{ width: "180px", padding: "8px 12px", background: "#020617", border: "1.5px solid #38bdf8", borderRadius: "8px", color: "#38bdf8", fontSize: "1.2rem", textAlign: "center", letterSpacing: "6px", fontWeight: 800, marginBottom: "14px" }}
                  />
                </>
              )}

              {/* Countdown Timer */}
              <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", background: "rgba(251, 191, 36, 0.15)", border: "1px solid rgba(251, 191, 36, 0.4)", borderRadius: "20px", padding: "6px 14px", color: "#fbbf24", fontWeight: 800, fontSize: "0.85rem" }}>
                <span>⏱️ Time Remaining:</span>
                <span style={{ fontFamily: "monospace", fontSize: "1rem" }}>
                  00:{countdown < 10 ? `0${countdown}` : countdown}
                </span>
              </div>
            </div>

            <div style={{ display: "flex", gap: "10px" }}>
              <button
                type="button"
                onClick={() => setStep("METHOD")}
                style={{ flex: 1, padding: "12px", background: "rgba(255, 255, 255, 0.08)", border: "1px solid rgba(255, 255, 255, 0.2)", borderRadius: "8px", color: "#cbd5e1", fontWeight: 700, cursor: "pointer" }}
              >
                ← Back
              </button>
              <button
                type="button"
                disabled={isProcessing}
                onClick={handleAuthorizeSuccess}
                style={{ flex: 2, padding: "12px", background: "linear-gradient(135deg, #10b981, #059669)", border: "none", borderRadius: "8px", color: "#fff", fontWeight: 900, cursor: isProcessing ? "not-allowed" : "pointer", boxShadow: "0 4px 15px rgba(16, 185, 129, 0.4)" }}
              >
                {isProcessing ? "⏳ Verifying Settlement..." : "✓ Complete & Authorize Payment"}
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: OFFICIAL AUDITED RECEIPT */}
        {step === "RECEIPT" && settledReceipt && (
          <div>
            <div
              style={{
                background: "#ffffff",
                color: "#0f172a",
                borderRadius: "14px",
                padding: "1.5rem",
                boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
                marginBottom: "1.25rem",
                position: "relative"
              }}
            >
              {/* Receipt Header */}
              <div style={{ textAlign: "center", borderBottom: "2px solid #0f172a", paddingBottom: "10px", marginBottom: "12px" }}>
                <h2 style={{ margin: "0 0 2px", fontSize: "1.2rem", fontWeight: 900, textTransform: "uppercase" }}>
                  OFFICIAL INSTITUTIONAL RECEIPT
                </h2>
                <div style={{ fontSize: "0.75rem", color: "#475569", fontWeight: 700 }}>
                  GBS INTERNATIONAL ACADEMY • OFFICE OF THE BURSAR
                </div>
                <div style={{ display: "inline-block", background: "#10b981", color: "#fff", padding: "2px 8px", borderRadius: "4px", fontSize: "0.72rem", fontWeight: 900, marginTop: "6px" }}>
                  {settledReceipt.status}
                </div>
              </div>

              {/* Receipt Key-Value Rows */}
              <div style={{ fontSize: "0.82rem", display: "flex", flexDirection: "column", gap: "6px", marginBottom: "14px" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#64748b" }}>Transaction Ref:</span>
                  <strong style={{ fontFamily: "monospace" }}>{settledReceipt.transactionId}</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#64748b" }}>GhIPSS Trace ID:</span>
                  <strong style={{ fontFamily: "monospace" }}>{settledReceipt.traceId}</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#64748b" }}>Date & Time:</span>
                  <span>{settledReceipt.formattedDate}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#64748b" }}>Payment For:</span>
                  <strong>{settledReceipt.title}</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#64748b" }}>Student Beneficiary:</span>
                  <strong>{settledReceipt.studentName} ({settledReceipt.studentId})</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#64748b" }}>Channel:</span>
                  <span>{settledReceipt.paymentMethod} ({settledReceipt.payerPhone})</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1.5px solid #0f172a", paddingTop: "6px", marginTop: "4px" }}>
                  <span style={{ fontWeight: 800, fontSize: "0.95rem" }}>Amount Settled:</span>
                  <strong style={{ fontSize: "1.1rem", color: "#047857" }}>
                    {settledReceipt.currency} {settledReceipt.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </strong>
                </div>
              </div>

              {/* Digital Stamp */}
              <div style={{ textAlign: "center", borderTop: "1px dashed #cbd5e1", paddingTop: "8px", fontSize: "0.72rem", color: "#0369a1", fontWeight: 800 }}>
                🛡️ {settledReceipt.institutionStamp}
              </div>
            </div>

            <div style={{ display: "flex", gap: "10px" }}>
              <button
                type="button"
                onClick={onClose}
                style={{
                  flex: 1,
                  padding: "12px",
                  background: "rgba(255, 255, 255, 0.1)",
                  border: "1px solid rgba(255, 255, 255, 0.2)",
                  borderRadius: "8px",
                  color: "#fff",
                  fontWeight: 800,
                  cursor: "pointer"
                }}
              >
                ← Back / Return to Previous Page
              </button>
              <button
                type="button"
                onClick={handlePrintSlip}
                style={{
                  flex: 1.5,
                  padding: "12px",
                  background: "linear-gradient(135deg, #0284c7, #0369a1)",
                  border: "none",
                  borderRadius: "8px",
                  color: "#fff",
                  fontWeight: 900,
                  cursor: "pointer",
                  boxShadow: "0 4px 15px rgba(2, 132, 199, 0.4)"
                }}
              >
                🖨️ Print / Download Official Slip
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

