import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { login } from "../api/auth.api";
import { getUserAvatar, rotateUserAvatar, getRoleBackgroundImage } from "../../../utils/userAvatars";
import "./RoleLoginPage.css";

export default function StaffLogin({ defaultRole = "STAFF" }) {
  const navigate = useNavigate();
  const isHR = defaultRole === "HR" || window.location.pathname.includes("/hr");
  const roleKey = isHR ? "HR" : "STAFF";

  const [avatar, setAvatar] = useState(() => getUserAvatar(roleKey));
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await login({ email: email.trim(), password, portalRole: roleKey });
      if (res?.status === "success") {
        navigate(isHR ? "/portal/hr/dashboard" : "/portal/staff/dashboard");
      } else {
        throw new Error(res?.message || `${roleKey} authentication failed`);
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
        style={{ backgroundImage: `url('${getRoleBackgroundImage(roleKey)}')` }}
      ></div>
      <div className="role-login-overlay"></div>
      <div className="role-login-card">
        <div className="role-login-crest-box">
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "12px" }}>
            <img 
              src="/assets/gbs_crest_badge.jpg" 
              alt="GBS International Crest" 
              className="role-login-crest-logo" 
            />
            <div 
              onClick={() => setAvatar(rotateUserAvatar(roleKey))}
              title="Click to rotate real-life profile photo"
              style={{ cursor: "pointer" }}
            >
              <img 
                src={avatar} 
                alt={`${roleKey} Portrait`} 
                style={{ width: "48px", height: "48px", borderRadius: "50%", objectFit: "cover", border: `2px solid ${isHR ? "#a855f7" : "#64748b"}` }} 
              />
            </div>
          </div>
          <span className="role-login-brand-name">GBS SCHOOL MANAGEMENT SYSTEM</span>
        </div>
        <div 
          className="role-badge-pill" 
          style={{ 
            borderColor: isHR ? "rgba(168, 85, 247, 0.4)" : "rgba(100, 116, 139, 0.4)", 
            color: isHR ? "#c084fc" : "#94a3b8", 
            background: isHR ? "rgba(168, 85, 247, 0.15)" : "rgba(100, 116, 139, 0.15)" 
          }}
        >
          {isHR ? "👔 HUMAN RESOURCES & COMPLIANCE PORTAL" : "💼 LOGISTICS & CAMPUS STAFF PORTAL"}
        </div>
        <h2 className="role-login-title">{isHR ? "HR PORTAL SIGN IN" : "STAFF SIGN IN"}</h2>
        <p className="role-login-sub">
          {isHR 
            ? "GBS School Management System • Directorate of Human Resources" 
            : "GBS School Management System • Shifts, Operations & Logistics"}
        </p>
        <form onSubmit={handleSubmit} className="role-login-form">
          <div className="form-group">
            <label htmlFor="staff-email">{isHR ? "HR Email / Officer ID" : "Staff Email / Employee ID"}</label>
            <input 
              id="staff-email" 
              type="text" 
              required 
              placeholder={isHR ? "e.g. hr@gbs.edu" : "Enter staff email"} 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
            />
          </div>
          <div className="form-group">
            <label htmlFor="staff-password">Account Password</label>
            <input 
              id="staff-password" 
              type="password" 
              required 
              placeholder="Enter password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
            />
          </div>
          {error && <div className="error-alert" style={{ color: "#ef4444", marginBottom: "12px", fontSize: "0.85rem" }}>{error}</div>}
          <button 
            type="submit" 
            className="role-login-submit" 
            style={{ background: isHR ? "linear-gradient(135deg, #8b5cf6, #6d28d9)" : "linear-gradient(135deg, #64748b, #475569)" }} 
            disabled={loading}
          >
            {loading ? "VERIFYING CREDENTIALS..." : (isHR ? "ACCESS HR PORTAL" : "ACCESS STAFF PORTAL")}
          </button>
        </form>
        <div style={{ textAlign: "center", margin: "12px 0" }}>
          <Link to="/signup/staff" style={{ color: "#94a3b8", fontSize: "0.85rem", textDecoration: "none", fontWeight: "600" }}>
            ✨ New operational employee? Register Staff Account →
          </Link>
        </div>
        <div className="role-switch-grid">
          <Link to="/login/admin" className="portal-switch-link">Admin</Link>
          <Link to="/login/teacher" className="portal-switch-link">Teacher</Link>
          <Link to="/login/student" className="portal-switch-link">Student</Link>
          <Link to="/login/parent" className="portal-switch-link">Parent</Link>
          <Link to="/login/accountant" className="portal-switch-link">Accountant</Link>
        </div>
        <Link to="/login" className="main-portal-link">← Return to Main Portal</Link>
      </div>
    </div>
  );
}