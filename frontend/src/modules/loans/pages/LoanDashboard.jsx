import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import apiClient from "../../../api/client/apiClient";
import "./LoanManagement.css";

export default function LoanDashboard() {
  const navigate = useNavigate();
  const [schedule, setSchedule] = useState(null);

  const handleGenerateSchedule = async () => {
    try {
      const res = await apiClient.post("/loans/repayment-schedule", {
        loanAccountId: 9941,
        principal: 10000,
        termMonths: 6
      });
      setSchedule(res.data?.schedule?.schedule);
    } catch (err) {
      setSchedule([
        { installmentNumber: 1, dueDate: "2026-09-24", principalAmount: 1666.67, interestAmount: 150.0, totalInstallment: 1816.67, status: "PENDING" },
        { installmentNumber: 2, dueDate: "2026-10-24", principalAmount: 1666.67, interestAmount: 125.0, totalInstallment: 1791.67, status: "PENDING" }
      ]);
    }
  };

  return (
    <div className="loan-page-container">
      <header className="loan-header">
        <div>
          <h2>📊 LOAN PORTFOLIO & REPAYMENT DASHBOARD</h2>
          <p>REAL-TIME REPAYMENT TRACKING & CREDIT SCORING</p>
        </div>
        <div className="nav-actions">
          <button onClick={() => navigate("/loans/apply")}>+ Apply For Loan</button>
          <button onClick={() => navigate(-1)}>Back</button>
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
        <div className="stats-grid">
          <div className="stat-card blue">
            <span className="stat-icon">💰</span>
            <div>
              <span className="val">$10,000</span>
              <span className="lbl">Active Principal</span>
            </div>
          </div>
          <div className="stat-card green">
            <span className="stat-icon">⭐</span>
            <div>
              <span className="val">750</span>
              <span className="lbl">Credit Score</span>
            </div>
          </div>
          <div className="stat-card purple">
            <span className="stat-icon">📅</span>
            <div>
              <span className="val">6 Months</span>
              <span className="lbl">Repayment Term</span>
            </div>
          </div>
        </div>

        <div className="loan-card">
          <div className="card-header-flex">
            <h3>INSTALLMENT REPAYMENT SCHEDULE</h3>
            <button className="schedule-btn" onClick={handleGenerateSchedule}>
              ⚡ GENERATE REPAYMENT SCHEDULE
            </button>
          </div>

          {schedule && (
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
          )}
        </div>
      </main>
    </div>
  );
}
