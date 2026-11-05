import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { login } from "../api/auth.api";
import { getRoleBackgroundImage } from "../../../utils/userAvatars";
import "./RoleLoginPage.css";

export default function StaffLogin({ defaultRole = "STAFF" }) {
  const navigate = useNavigate();
  const isAlumni = defaultRole === "ALUMNI" || window.location.pathname.includes("/alumni");
  const isHR = defaultRole === "HR" || window.location.pathname.includes("/hr");
  const roleKey = isAlumni ? "ALUMNI" : isHR ? "HR" : "STAFF";

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
      const res = await login({ email: email.trim(), password, portalRole: roleKey });
      if (res?.status === "success") {
        if (isAlumni) {
          navigate("/portal/alumni/dashboard");
        } else if (isHR) {
          navigate("/portal/hr/dashboard");
        } else {
          navigate("/portal/staff/dashboard");
        }
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
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", marginBottom: "8px" }}>
            <img 
              src="/assets/gbs_crest_badge.jpg" 
              alt="GBS System Crest" 
              className="role-login-crest-logo" 
            />
          </div>
          <span className="role-login-brand-name">GBS SCHOOL MANAGEMENT SYSTEM</span>
        </div>
        <div 
          className="role-badge-pill" 
          style={{ 
            borderColor: isAlumni ? "rgba(99, 102, 241, 0.5)" : isHR ? "rgba(168, 85, 247, 0.4)" : "rgba(100, 116, 139, 0.4)", 
            color: isAlumni ? "#818cf8" : isHR ? "#c084fc" : "#94a3b8", 
            background: isAlumni ? "rgba(99, 102, 241, 0.15)" : isHR ? "rgba(168, 85, 247, 0.15)" : "rgba(100, 116, 139, 0.15)" 
          }}
        >
          {isAlumni ? "🏛️ ALUMNI & CONVOCATION NETWORK" : isHR ? "👔 HUMAN RESOURCES & COMPLIANCE PORTAL" : "💼 LOGISTICS & CAMPUS STAFF PORTAL"}
        </div>
        <h2 className="role-login-title">
          {isAlumni ? "ALUMNI NETWORK SIGN IN" : isHR ? "HR PORTAL SIGN IN" : "STAFF SIGN IN"}
        </h2>
        <p className="role-login-sub">
          {isAlumni 
            ? "GBS School Management System • Permanent Convocation Records" 
            : isHR 
            ? "GBS School Management System • Directorate of Human Resources" 
            : "GBS School Management System • Shifts, Operations & Logistics"}
        </p>
        <form onSubmit={handleSubmit} className="role-login-form">
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "8px" }}>
            <button
              type="button"
              onClick={() => {
                setError(null);
                if (isAlumni) { setEmail("alumni@gbs.com"); setPassword("Alumni123!"); }
                else if (isHR) { setEmail("hr@gbs.com"); setPassword("Hr123!"); }
                else { setEmail("staff@gbs.com"); setPassword("Staff123!"); }
              }}
              style={{
                background: "rgba(100, 116, 139, 0.2)",
                border: "1px solid rgba(148, 163, 184, 0.4)",
                color: "#cbd5e1",
                padding: "3px 10px",
                borderRadius: "14px",
                fontSize: "0.74rem",
                fontWeight: "700",
                cursor: "pointer"
              }}
            >
              ⚡ Fill {isAlumni ? "Alumni" : isHR ? "HR" : "Staff"} Demo Login
            </button>
          </div>
          <div className="form-group">
            <label htmlFor="staff-email">
              {isAlumni ? "Alumni Email / Degree ID" : isHR ? "HR Email / Officer ID" : "Staff Email / Employee ID"}
            </label>
            <input 
              id="staff-email" 
              type="text" 
              required 
              placeholder={isAlumni ? "e.g. alumni@gbs.edu" : isHR ? "e.g. hr@gbs.edu" : "Enter staff email"} 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
            />
          </div>
          <div className="form-group">
            <label htmlFor="staff-password">Account Password</label>
            <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
              <input 
                id="staff-password" 
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
          <button 
            type="submit" 
            className="role-login-submit" 
            style={{ 
              background: isAlumni 
                ? "linear-gradient(135deg, #6366f1, #4f46e5)" 
                : isHR 
                ? "linear-gradient(135deg, #8b5cf6, #6d28d9)" 
                : "linear-gradient(135deg, #64748b, #475569)" 
            }} 
            disabled={loading}
          >
            {loading ? "VERIFYING CREDENTIALS..." : (isAlumni ? "ACCESS ALUMNI PORTAL" : isHR ? "ACCESS HR PORTAL" : "ACCESS STAFF PORTAL")}
          </button>
        </form>
        <div style={{ textAlign: "center", margin: "12px 0" }}>
          <Link 
            to={isAlumni ? "/signup/alumni" : isHR ? "/signup/hr" : "/signup/staff"} 
            style={{ color: "#94a3b8", fontSize: "0.85rem", textDecoration: "none", fontWeight: "600" }}
          >
            {isAlumni ? "✨ Graduated Scholar? Register Alumni Profile →" : isHR ? "✨ HR Executive? Register HR Directorate →" : "✨ New operational employee? Register Staff Account →"}
          </Link>
        </div>
        <div className="role-switch-grid">
          <Link to="/login/admin" className="portal-switch-link">Admin</Link>
          <Link to="/login/teacher" className="portal-switch-link">Teacher</Link>
          <Link to="/login/student" className="portal-switch-link">Student</Link>
          <Link to="/login/parent" className="portal-switch-link">Parent</Link>
          <Link to="/login/accountant" className="portal-switch-link">Accountant</Link>
          <Link to="/login/alumni" className="portal-switch-link">Alumni</Link>
        </div>
        <Link to="/login" className="main-portal-link">← Return to Main Portal</Link>
      </div>
    </div>
  );
}