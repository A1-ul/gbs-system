import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { forgotPassword } from "../api/auth.api";

function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [recoveryInfo, setRecoveryInfo] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await forgotPassword({
        email: email.trim(),
        phone: phone.trim() || undefined,
        fullName: fullName.trim() || undefined
      });
      const payload = res?.data || res;
      setRecoveryInfo(payload);
    } catch (err) {
      setError(err?.response?.data?.message || err.message || "Could not locate registered account.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #060f1e 0%, #0d2247 60%, #081833 100%)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "24px",
      color: "#f8fafc",
      fontFamily: "system-ui, -apple-system, sans-serif"
    }}>
      <div style={{
        width: "100%",
        maxWidth: "460px",
        background: "rgba(8, 24, 51, 0.96)",
        border: "2px solid #d4af37",
        borderRadius: "18px",
        padding: "28px",
        boxShadow: "0 20px 60px rgba(0,0,0,0.65)"
      }}>
        <div style={{ textAlign: "center", marginBottom: "18px" }}>
          <img src="/assets/gbs_crest_badge.jpg" alt="GBS Crest" style={{ width: "64px", height: "64px", borderRadius: "50%", border: "2px solid #d4af37", objectFit: "cover", marginBottom: "8px" }} />
          <h2 style={{ margin: "0 0 4px", color: "#f6dd84", fontSize: "1.3rem" }}>🔑 Account Password Recovery</h2>
          <p style={{ margin: 0, fontSize: "0.84rem", color: "#cbd5e1" }}>
            Enter your registered email address and verification contact to begin a real password reset.
          </p>
        </div>

        {error && (
          <div style={{ background: "rgba(239, 68, 68, 0.18)", border: "1px solid #ef4444", color: "#fecaca", padding: "10px 12px", borderRadius: "8px", fontSize: "0.84rem", marginBottom: "14px" }}>
            ⚠️ {error}
          </div>
        )}

        {recoveryInfo ? (
          <div style={{ background: "rgba(16, 185, 129, 0.14)", border: "1.5px solid #10b981", borderRadius: "12px", padding: "16px", textAlign: "center" }}>
            <strong style={{ color: "#6ee7b7", fontSize: "0.96rem", display: "block", marginBottom: "6px" }}>
              ✅ Recovery Session Ready ({recoveryInfo.email})
            </strong>
            <p style={{ fontSize: "0.82rem", color: "#e2e8f0", margin: "0 0 14px", lineHeight: 1.5 }}>
              {recoveryInfo.hint || "Proceed to set your new password using your verification code or registered identity details."}
            </p>
            <button
              type="button"
              onClick={() => navigate("/reset-password", { state: { email: recoveryInfo.email, phone, fullName, canVerifyWithAccountDetails: recoveryInfo.canVerifyWithAccountDetails } })}
              style={{
                width: "100%",
                padding: "11px 16px",
                borderRadius: "10px",
                background: "linear-gradient(135deg, #d4af37 0%, #f5d061 100%)",
                color: "#081833",
                fontWeight: 900,
                border: "none",
                cursor: "pointer"
              }}
            >
              Proceed to Step 2: Set New Password →
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: "grid", gap: "12px" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.78rem", color: "#f6dd84", fontWeight: 700, marginBottom: "4px" }}>
                Registered Email Address *
              </label>
              <input
                type="email"
                required
                placeholder="e.g. teacher@gbs.com or registered email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", background: "#050f23", border: "1px solid rgba(212,175,55,0.5)", color: "#ffffff", boxSizing: "border-box" }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.78rem", color: "#f6dd84", fontWeight: 700, marginBottom: "4px" }}>
                Registered Phone Number
              </label>
              <input
                type="text"
                placeholder="e.g. +233 24 555 0192"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", background: "#050f23", border: "1px solid rgba(212,175,55,0.4)", color: "#ffffff", boxSizing: "border-box" }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.78rem", color: "#f6dd84", fontWeight: 700, marginBottom: "4px" }}>
                Registered Account Full Name
              </label>
              <input
                type="text"
                placeholder="e.g. Sarah Jenkins"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", background: "#050f23", border: "1px solid rgba(212,175,55,0.4)", color: "#ffffff", boxSizing: "border-box" }}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%",
                padding: "11px 16px",
                borderRadius: "10px",
                background: "linear-gradient(135deg, #d4af37 0%, #f5d061 100%)",
                color: "#081833",
                fontWeight: 900,
                border: "none",
                cursor: loading ? "wait" : "pointer",
                marginTop: "4px"
              }}
            >
              {loading ? "Verifying Account..." : "Verify Account & Request Password Reset →"}
            </button>
          </form>
        )}

        <div style={{ marginTop: "16px", textAlign: "center", fontSize: "0.82rem", display: "flex", justifyContent: "space-between" }}>
          <Link to="/login" style={{ color: "#93c5fd", textDecoration: "none", fontWeight: 700 }}>
            ← Back to Sign In
          </Link>
          <Link to="/reset-password" style={{ color: "#f6dd84", textDecoration: "none", fontWeight: 700 }}>
            Already have a reset code? →
          </Link>
        </div>
      </div>
    </div>
  );
}

export default ForgotPassword;
