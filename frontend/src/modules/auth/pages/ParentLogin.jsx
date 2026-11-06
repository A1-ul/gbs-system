import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { login } from "../api/auth.api";
import "./RoleLoginPage.css";

export default function ParentLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await login({ email: email.trim(), password, portalRole: "PARENT" });
      if (res?.status === "success") {
        navigate("/portal/parent/dashboard");
      } else {
        throw new Error(res?.message || "Parent authentication failed");
      }
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "Invalid credentials");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="role-login-container">
      <div
        className="role-login-bg"
        style={{ backgroundImage: `url('/images/parent_login_bg.jpg')` }}
      ></div>
      <div className="role-login-overlay"></div>
      <div className="role-login-card">
        <div className="role-login-crest-box">
          <img
            src="/assets/gbs_crest_badge.jpg"
            alt="GBS Crest"
            className="role-login-crest-logo"
          />
          <span className="role-login-brand-name">GBS SCHOOL MANAGEMENT SYSTEM</span>
        </div>
        <div className="role-badge-pill" style={{ borderColor: "rgba(245, 158, 11, 0.4)", color: "#fbbf24", background: "rgba(245, 158, 11, 0.15)" }}>
          👨‍👩‍👧 PARENT & GUARDIAN PORTAL
        </div>
        <h2 className="role-login-title">PARENT SIGN IN</h2>
        <p className="role-login-sub">GBS School Management System • Attendance, Fees & Performance</p>
        <form onSubmit={handleSubmit} className="role-login-form">
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "8px" }}>
            <button
              type="button"
              onClick={() => { setEmail("parent@gbs.com"); setPassword("Parent123!"); setError(null); }}
              style={{
                background: "rgba(245, 158, 11, 0.15)",
                border: "1px solid rgba(245, 158, 11, 0.4)",
                color: "#fbbf24",
                padding: "3px 10px",
                borderRadius: "14px",
                fontSize: "0.74rem",
                fontWeight: "700",
                cursor: "pointer"
              }}
            >
              ⚡ Fill Parent Demo Login
            </button>
          </div>
          <div className="form-group">
            <label htmlFor="parent-email">Parent Email / Registered Mobile</label>
            <input
              id="parent-email"
              type="text"
              required
              placeholder="e.g. parent@gbs.com or parent1"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label htmlFor="parent-password">Account Password</label>
            <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
              <input
                id="parent-password"
                type={showPassword ? "text" : "password"}
                required
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ width: "100%", paddingRight: "42px" }}
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                title={showPassword ? "Hide password" : "View password"}
                style={{ position: "absolute", right: "10px", background: "none", border: "none", color: "#94a3b8", cursor: "pointer", fontSize: "1rem", padding: "4px" }}
              >
                {showPassword ? "🙈" : "👁️"}
              </button>
            </div>
          </div>
          {error && <div className="error-alert" style={{ color: "#ef4444", marginBottom: "12px", fontSize: "0.85rem" }}>{error}</div>}
          <button type="submit" className="role-login-submit" style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)" }} disabled={loading}>
            {loading ? "VERIFYING PARENT CREDENTIALS..." : "ACCESS PARENT PORTAL"}
          </button>
        </form>
        <div style={{ textAlign: "center", margin: "12px 0" }}>
          <Link to="/signup/parent" style={{ color: "#fbbf24", fontSize: "0.85rem", textDecoration: "none", fontWeight: "600" }}>
            ✨ New parent or guardian? Register Parent Account →
          </Link>
        </div>
        <div className="role-switch-grid">
          <Link to="/login/admin" className="portal-switch-link">Admin</Link>
          <Link to="/login/teacher" className="portal-switch-link">Teacher</Link>
          <Link to="/login/student" className="portal-switch-link">Student</Link>
          <Link to="/login/accountant" className="portal-switch-link">Accountant</Link>
          <Link to="/login/staff" className="portal-switch-link">Staff</Link>
        </div>
        <Link to="/login" className="main-portal-link">← Return to Main Portal</Link>
      </div>
    </div>
  );
}