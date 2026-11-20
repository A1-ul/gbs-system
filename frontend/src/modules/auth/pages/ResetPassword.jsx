import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { resetPassword } from "../api/auth.api";

function ResetPassword() {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state || {};

  const [email, setEmail] = useState(state.email || "");
  const [otp, setOtp] = useState("");
  const [fullName, setFullName] = useState(state.fullName || "");
  const [phone, setPhone] = useState(state.phone || "");
  const [tenantCode, setTenantCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (password.length < 6) {
      setError("New password must be at least 6 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("New password and confirmation password do not match.");
      return;
    }

    setLoading(true);
    try {
      const res = await resetPassword({
        email: email.trim(),
        otp: otp.trim(),
        fullName: fullName.trim(),
        phone: phone.trim(),
        tenantCode: tenantCode.trim(),
        newPassword: password,
        confirmPassword
      });
      setSuccessMsg(res?.message || "Password updated successfully! You can now sign in with your new password.");
    } catch (err) {
      setError(err?.response?.data?.message || err.message || "Failed to reset password. Verify your details and try again.");
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
        maxWidth: "480px",
        background: "rgba(8, 24, 51, 0.96)",
        border: "2px solid #d4af37",
        borderRadius: "18px",
        padding: "28px",
        boxShadow: "0 20px 60px rgba(0,0,0,0.65)"
      }}>
        <div style={{ textAlign: "center", marginBottom: "18px" }}>
          <img src="/assets/gbs_crest_badge.jpg" alt="GBS Crest" style={{ width: "60px", height: "60px", borderRadius: "50%", border: "2px solid #d4af37", objectFit: "cover", marginBottom: "8px" }} />
          <h2 style={{ margin: "0 0 4px", color: "#f6dd84", fontSize: "1.28rem" }}>🔐 Complete Password Reset</h2>
          <p style={{ margin: 0, fontSize: "0.82rem", color: "#cbd5e1" }}>
            Verify your identity via your 6-digit recovery OTP or matching registered account credentials, then enter your new password.
          </p>
        </div>

        {error && (
          <div style={{ background: "rgba(239, 68, 68, 0.18)", border: "1px solid #ef4444", color: "#fecaca", padding: "10px 12px", borderRadius: "8px", fontSize: "0.84rem", marginBottom: "14px" }}>
            ⚠️ {error}
          </div>
        )}

        {successMsg ? (
          <div style={{ background: "rgba(16, 185, 129, 0.16)", border: "1.5px solid #10b981", borderRadius: "12px", padding: "18px", textAlign: "center" }}>
            <strong style={{ color: "#6ee7b7", fontSize: "1rem", display: "block", marginBottom: "8px" }}>
              ✅ {successMsg}
            </strong>
            <button
              type="button"
              onClick={() => navigate("/login")}
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
              Sign In With New Password →
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: "grid", gap: "10px" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.76rem", color: "#f6dd84", fontWeight: 700, marginBottom: "3px" }}>
                Registered Email Address *
              </label>
              <input
                type="email"
                required
                placeholder="Registered email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{ width: "100%", padding: "9px 12px", borderRadius: "8px", background: "#050f23", border: "1px solid rgba(212,175,55,0.5)", color: "#ffffff", boxSizing: "border-box" }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.76rem", color: "#f6dd84", fontWeight: 700, marginBottom: "3px" }}>
                6-Digit Recovery Code (from SMS / Email)
              </label>
              <input
                type="text"
                placeholder="Enter 6-digit OTP if received (or verify account details below)"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                style={{ width: "100%", padding: "9px 12px", borderRadius: "8px", background: "#050f23", border: "1px solid rgba(212,175,55,0.4)", color: "#ffffff", boxSizing: "border-box" }}
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.74rem", color: "#cbd5e1", marginBottom: "3px" }}>
                  Registered Full Name
                </label>
                <input
                  type="text"
                  placeholder="Exact registered name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  style={{ width: "100%", padding: "8px 10px", borderRadius: "8px", background: "#050f23", border: "1px solid rgba(255,255,255,0.2)", color: "#ffffff", boxSizing: "border-box" }}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "0.74rem", color: "#cbd5e1", marginBottom: "3px" }}>
                  Phone or Institution Code
                </label>
                <input
                  type="text"
                  placeholder="Phone or GBS-MAIN"
                  value={phone || tenantCode}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v.toUpperCase().includes("GBS") || /[A-Za-z]/.test(v)) {
                      setTenantCode(v);
                      setPhone("");
                    } else {
                      setPhone(v);
                      setTenantCode("");
                    }
                  }}
                  style={{ width: "100%", padding: "8px 10px", borderRadius: "8px", background: "#050f23", border: "1px solid rgba(255,255,255,0.2)", color: "#ffffff", boxSizing: "border-box" }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.76rem", color: "#f6dd84", fontWeight: 700, marginBottom: "3px" }}>
                New Password (min 6 chars) *
              </label>
              <div style={{ position: "relative" }}>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={6}
                  placeholder="Enter new strong password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{ width: "100%", padding: "9px 38px 9px 12px", borderRadius: "8px", background: "#050f23", border: "1px solid rgba(212,175,55,0.5)", color: "#ffffff", boxSizing: "border-box" }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((p) => !p)}
                  style={{ position: "absolute", right: "8px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "#94a3b8", cursor: "pointer" }}
                >
                  {showPassword ? "🙈" : "👁️"}
                </button>
              </div>
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.76rem", color: "#f6dd84", fontWeight: 700, marginBottom: "3px" }}>
                Confirm New Password *
              </label>
              <input
                type={showPassword ? "text" : "password"}
                required
                minLength={6}
                placeholder="Re-enter new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                style={{ width: "100%", padding: "9px 12px", borderRadius: "8px", background: "#050f23", border: "1px solid rgba(212,175,55,0.5)", color: "#ffffff", boxSizing: "border-box" }}
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
              {loading ? "Updating Password..." : "🔐 Confirm & Update Password"}
            </button>
          </form>
        )}

        <div style={{ marginTop: "14px", textAlign: "center", fontSize: "0.82rem", display: "flex", justifyContent: "space-between" }}>
          <Link to="/forgot-password" style={{ color: "#93c5fd", textDecoration: "none", fontWeight: 700 }}>
            ← Request New Reset Code
          </Link>
          <Link to="/login" style={{ color: "#f6dd84", textDecoration: "none", fontWeight: 700 }}>
            Sign In →
          </Link>
        </div>
      </div>
    </div>
  );
}

export default ResetPassword;
