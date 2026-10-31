import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { login } from "../api/auth.api";
import "./RoleLoginPage.css";

export default function TeacherLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await login({ email: email.trim(), password, portalRole: "TEACHER" });
      if (res?.status === "success") {
        navigate("/portal/teacher/dashboard");
      } else {
        throw new Error(res?.message || "Teacher authentication failed");
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
        style={{ backgroundImage: `url('/images/teacher_login_bg.jpg')` }}
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
        <div className="role-badge-pill" style={{ borderColor: "rgba(16, 185, 129, 0.4)", color: "#34d399", background: "rgba(16, 185, 129, 0.15)" }}>
          👨‍🏫 TEACHER ACADEMIC PORTAL
        </div>
        <h2 className="role-login-title">TEACHER SIGN IN</h2>
        <p className="role-login-sub">GBS School Management System • Attendance, Grading & Classes</p>
        <form onSubmit={handleSubmit} className="role-login-form">
          <div className="form-group">
            <label htmlFor="teacher-email">Teacher Email / Staff ID</label>
            <input 
              id="teacher-email" 
              type="text" 
              required 
              placeholder="Enter teacher email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
            />
          </div>
          <div className="form-group">
            <label htmlFor="teacher-password">Account Password</label>
            <input 
              id="teacher-password" 
              type="password" 
              required 
              placeholder="Enter password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
            />
          </div>
          {error && <div className="error-alert" style={{ color: "#ef4444", marginBottom: "12px", fontSize: "0.85rem" }}>{error}</div>}
          <button type="submit" className="role-login-submit" style={{ background: "linear-gradient(135deg, #10b981, #059669)" }} disabled={loading}>
            {loading ? "VERIFYING TEACHER CREDENTIALS..." : "ACCESS TEACHER PORTAL"}
          </button>
        </form>
        <div style={{ textAlign: "center", margin: "12px 0" }}>
          <Link to="/signup/teacher" style={{ color: "#34d399", fontSize: "0.85rem", textDecoration: "none", fontWeight: "600" }}>
            ✨ New faculty member? Register as a Teacher →
          </Link>
        </div>
        <div className="role-switch-grid">
          <Link to="/login/admin" className="portal-switch-link">Admin</Link>
          <Link to="/login/student" className="portal-switch-link">Student</Link>
          <Link to="/login/parent" className="portal-switch-link">Parent</Link>
          <Link to="/login/accountant" className="portal-switch-link">Accountant</Link>
          <Link to="/login/staff" className="portal-switch-link">Staff</Link>
        </div>
        <Link to="/login" className="main-portal-link">← Return to Main Portal</Link>
      </div>
    </div>
  );
}