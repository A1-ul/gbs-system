import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import apiClient from "../../../api/client/apiClient";
import WindowControlsBar from "../../../components/common/WindowControlsBar";
import TopCenterSystemBanner from "../../../components/common/TopCenterSystemBanner";
import "./LoanManagement.css";

export default function LoanDashboard() {
  const navigate = useNavigate();
  const savedApp = (() => {
    try {
      return JSON.parse(localStorage.getItem("gbs_latest_loan_application") || "null");
    } catch {
      return null;
    }
  })();

  const [principalInput, setPrincipalInput] = useState(() => Number(savedApp?.principal) || 10000);
  const [termInput, setTermInput] = useState(() => Number(savedApp?.termMonths) || 6);
  const [schedule, setSchedule] = useState(null);
  const [loadingSchedule, setLoadingSchedule] = useState(false);
  const [scheduleError, setScheduleError] = useState(null);

  const handleGenerateSchedule = async () => {
    setScheduleError(null);
    const principal = Number(principalInput);
    const termMonths = parseInt(termInput, 10);
    if (!Number.isFinite(principal) || principal <= 0 || !Number.isFinite(termMonths) || termMonths <= 0) {
      setScheduleError("Please enter valid positive Principal and Term (Months).");
      return;
    }
    setLoadingSchedule(true);
    try {
      const res = await apiClient.post("/loans/repayment-schedule", {
        loanAccountId: 9941,
        principal,
        termMonths
      });
      const rows = res.data?.schedule?.schedule;
      if (!Array.isArray(rows)) throw new Error("No schedule returned by backend engine.");
      setSchedule(rows);
    } catch (err) {
      setScheduleError(
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        err?.message ||
        "Unable to load repayment schedule from backend server."
      );
    } finally {
      setLoadingSchedule(false);
    }
  };

  return (
    <div className="loan-page-container">
      <WindowControlsBar title="Loan Portfolio & Repayment" />
      <TopCenterSystemBanner roleTitle="Loan Portfolio & Credit Underwriting" />
      <header className="loan-header">
        <div>
          <h2>📊 LOAN PORTFOLIO & REPAYMENT DASHBOARD</h2>
          <p>REAL-TIME REPAYMENT TRACKING & CREDIT SCORING</p>
        </div>
        <div className="nav-actions">
          <button type="button" onClick={() => navigate("/loans/apply")}>+ Apply For Loan</button>
          <button type="button" onClick={() => navigate(-1)}>Back</button>
        </div>
      </header>

      {/* Real-Life Loan Portfolio & Credit Operations Hero Banner */}
      <section
        className="loan-hero-banner"
        style={{
          backgroundImage: `linear-gradient(135deg, rgba(15, 23, 42, 0.60), rgba(15, 23, 42, 0.75)), url('/assets/finance-hero-bg.jpg')`
        }}
      >
        <div className="hero-text-block">
          <div className="hero-pill-badge">PORTFOLIO & CREDIT SCORING</div>
          <h2>Staff & Student Loan Amortization Ledger</h2>
          <p>
            Deterministic actuarial amortization schedules, credit score risk underwriting, and automated installment reconciliation running live on PostgreSQL.
          </p>
        </div>

        <div className="hero-photo-showcase-frame">
          <div className="showcase-photo-wrapper">
            <img
              src="/assets/finance-hero-bg.jpg"
              alt="Institutional Treasury & Loan Operations"
              className="real-life-dashboard-photo"
            />
            <div className="showcase-verified-badge">
              <span className="live-camera-pulse"></span>
              <span>REAL-LIFE CAMPUS VIEW</span>
            </div>
          </div>
          <div className="showcase-photo-caption">
            <span>📍 Campus Treasury & Credit Underwriting Operations • Verified Daylight View</span>
          </div>
        </div>
      </section>

      <main className="loan-main">
        {scheduleError && (
          <div style={{ marginBottom: "14px", padding: "12px 16px", borderRadius: "10px", background: "rgba(239, 68, 68, 0.16)", border: "1px solid #ef4444", color: "#fecaca", fontWeight: 700 }}>
            ⚠️ {scheduleError}
          </div>
        )}
        <div className="stats-grid">
          <div className="stat-card blue">
            <span className="stat-icon">💰</span>
            <div>
              <span className="val">${Number(principalInput || 0).toLocaleString()}</span>
              <span className="lbl">Configured Principal</span>
            </div>
          </div>
          <div className="stat-card green">
            <span className="stat-icon">⭐</span>
            <div>
              <span className="val">{savedApp?.creditScore ?? "Pending Eval"}</span>
              <span className="lbl">Latest Credit Score</span>
            </div>
          </div>
          <div className="stat-card purple">
            <span className="stat-icon">📅</span>
            <div>
              <span className="val">{termInput} Months</span>
              <span className="lbl">Repayment Term</span>
            </div>
          </div>
        </div>

        <div className="loan-card">
          <div className="card-header-flex" style={{ flexWrap: "wrap", gap: "10px" }}>
            <h3>INSTALLMENT REPAYMENT SCHEDULE</h3>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
              <label style={{ fontSize: "0.78rem", color: "#cbd5e1" }}>
                Principal ($)
                <input
                  type="number"
                  min="100"
                  value={principalInput}
                  onChange={(e) => setPrincipalInput(e.target.value)}
                  style={{ width: "110px", marginLeft: "6px", padding: "6px 8px", borderRadius: "6px" }}
                />
              </label>
              <label style={{ fontSize: "0.78rem", color: "#cbd5e1" }}>
                Months
                <input
                  type="number"
                  min="1"
                  max="120"
                  value={termInput}
                  onChange={(e) => setTermInput(e.target.value)}
                  style={{ width: "76px", marginLeft: "6px", padding: "6px 8px", borderRadius: "6px" }}
                />
              </label>
              <button type="button" className="schedule-btn" onClick={handleGenerateSchedule} disabled={loadingSchedule}>
                {loadingSchedule ? "CALCULATING..." : "⚡ GENERATE REPAYMENT SCHEDULE"}
              </button>
            </div>
          </div>

          {schedule && (
            <div className="table-responsive">
            <table className="schedule-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Due Date</th>
                  <th>Principal ($)</th>
                  <th>Interest ($)</th>
                  <th>Total Due ($)</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {schedule.map((item) => (
                  <tr key={item.installmentNumber}>
                    <td>{item.installmentNumber}</td>
                    <td>{String(item.dueDate).substring(0, 10)}</td>
                    <td>${item.principalAmount}</td>
                    <td>${item.interestAmount}</td>
                    <td><strong>${item.totalInstallment}</strong></td>
                    <td><span className="badge-pending">{item.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
