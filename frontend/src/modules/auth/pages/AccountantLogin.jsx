import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { login } from "../api/auth.api";
import "./RoleLoginPage.css";

export default function AccountantLogin() {
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
      const res = await login({ email: email.trim(), password, portalRole: "ACCOUNTANT" });
      if (res?.status === "success") {
        navigate("/portal/accountant/dashboard");
      } else {
        throw new Error(res?.message || "Accountant authentication failed");
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
        style={{ backgroundImage: `url('/assets/school_campus_bg.jpg')` }}
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
        <div className="role-badge-pill" style={{ borderColor: "rgba(236, 72, 153, 0.4)", color: "#f472b6", background: "rgba(236, 72, 153, 0.15)" }}>
          📊 FINANCE & BILLING PORTAL
        </div>
        <h2 className="role-login-title">ACCOUNTANT SIGN IN</h2>
        <p className="role-login-sub">GBS School Management System • Tuition, Payroll & Invoices</p>
        <form onSubmit={handleSubmit} className="role-login-form">
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "8px" }}>
            <button
              type="button"
              onClick={() => { setEmail("accountant@gbs.com"); setPassword("Accountant123!"); setError(null); }}
              style={{
                background: "rgba(236, 72, 153, 0.15)",
                border: "1px solid rgba(236, 72, 153, 0.4)",
                color: "#f472b6",
                padding: "3px 10px",
                borderRadius: "14px",
                fontSize: "0.74rem",
                fontWeight: "700",
                cursor: "pointer"
              }}
            >
              ⚡ Fill Finance Demo Login
            </button>
          </div>
          <div className="form-group">
            <label htmlFor="accountant-email">Finance Officer Email</label>
            <input 
              id="accountant-email" 
              type="text" 
              required 
              placeholder="e.g. accountant@gbs.com or finance1" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
            />
          </div>
          <div className="form-group">
            <label htmlFor="accountant-password">Account Password</label>
            <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
              <input 
                id="accountant-password" 
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
          <button type="submit" className="role-login-submit" style={{ background: "linear-gradient(135deg, #ec4899, #db2777)" }} disabled={loading}>
            {loading ? "VERIFYING FINANCE CREDENTIALS..." : "ACCESS FINANCE PORTAL"}
          </button>
        </form>
        <div style={{ textAlign: "center", margin: "12px 0" }}>
          <Link to="/signup/accountant" style={{ color: "#f472b6", fontSize: "0.85rem", textDecoration: "none", fontWeight: "600" }}>
            ✨ Finance or Bursar Personnel? Register Account →
          </Link>
        </div>
        <div className="role-switch-grid">
          <Link to="/login/admin" className="portal-switch-link">Admin</Link>
          <Link to="/login/teacher" className="portal-switch-link">Teacher</Link>
          <Link to="/login/student" className="portal-switch-link">Student</Link>
          <Link to="/login/parent" className="portal-switch-link">Parent</Link>
          <Link to="/login/staff" className="portal-switch-link">Staff</Link>
        </div>
        <Link to="/login" className="main-portal-link">← Return to Main Portal</Link>
      </div>
    </div>
  );
}