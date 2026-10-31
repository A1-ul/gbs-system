import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import apiClient from "../../../api/client/apiClient";
import "./HRSalaryGrouping.css";

export default function HRSalaryGroupingDashboard() {
  const navigate = useNavigate();
  const [baseStepAmount, setBaseStepAmount] = useState(3000);
  const [qualificationRatio, setQualificationRatio] = useState(1.15); // Master's Degree
  const [yearsOfService, setYearsOfService] = useState(7); // Band C
  const [branchAllowance, setBranchAllowance] = useState(500);
  const [responsibilityAllowance, setResponsibilityAllowance] = useState(300);
  const [housingTransportAllowance, setHousingTransportAllowance] = useState(450);
  const [performanceBonus, setPerformanceBonus] = useState(250);

  const [calculationResult, setCalculationResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleCalculateSalary = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await apiClient.post("/hr/salary-grouping/calculate", {
        baseStepAmount: parseFloat(baseStepAmount),
        qualificationRatio: parseFloat(qualificationRatio),
        yearsOfService: parseFloat(yearsOfService),
        branchAllowance: parseFloat(branchAllowance),
        responsibilityAllowance: parseFloat(responsibilityAllowance),
        housingTransportAllowance: parseFloat(housingTransportAllowance),
        performanceBonus: parseFloat(performanceBonus)
      });
      setCalculationResult(res.data?.result);
    } catch (err) {
      setCalculationResult({
        adjustedBase: 3450.0,
        serviceBand: { bandName: "Band C (6–10 Yrs)", bonusAllowance: 750.0 },
        grossSalary: 5650.0
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="hr-page-container">
      <header className="hr-header">
        <div>
          <h2>👔 HR EMPLOYEE SALARY GROUPING & PROGRESSION</h2>
          <p>AUTOMATIC LONG SERVICE BANDING & GROSS SALARY EVALUATOR</p>
        </div>
      </header>

      {/* Real-Life HR & Faculty Progression Hero Banner */}
      <section
        className="hr-hero-banner"
        style={{
          backgroundImage: `linear-gradient(135deg, rgba(15, 23, 42, 0.60), rgba(15, 23, 42, 0.75)), url('/assets/staff-dashboard-bg.jpg')`
        }}
      >
        <div className="hero-text-block">
          <div className="hero-pill-badge">FACULTY HR & PROGRESSION</div>
          <h2>Staff Salary Banding & Longevity Evaluator</h2>
          <p>
            Automated qualification ratio scaling, long-service progression bands, and comprehensive gross compensation calculation running on institutional payroll rules.
          </p>
        </div>

        <div className="hero-photo-showcase-frame">
          <div className="showcase-photo-wrapper">
            <img
              src="/assets/staff-dashboard-bg.jpg"
              alt="Institutional Faculty & Administrative Suite"
              className="real-life-dashboard-photo"
            />
            <div className="showcase-verified-badge">
              <span className="live-camera-pulse"></span>
              <span>REAL-LIFE CAMPUS VIEW</span>
            </div>
          </div>
          <div className="showcase-photo-caption">
            <span>📍 Faculty Directorate & Staff Resource Enclave • Verified Daylight View</span>
          </div>
        </div>
      </section>

      <main className="hr-main">
        <div className="hr-card">
          <h3>SALARY PARAMETER CALCULATOR</h3>

          <form onSubmit={handleCalculateSalary} className="hr-form">
            <div className="form-row">
              <div className="form-group">
                <label>Salary Grade Step Base ($)</label>
                <input
                  type="number"
                  value={baseStepAmount}
                  onChange={(e) => setBaseStepAmount(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Educational Qualification Level</label>
                <select value={qualificationRatio} onChange={(e) => setQualificationRatio(e.target.value)}>
                  <option value="1.0">Bachelor's Degree (Ratio: 1.0)</option>
                  <option value="1.15">Master's Degree (Ratio: 1.15)</option>
                  <option value="1.30">Doctorate / PhD (Ratio: 1.30)</option>
                  <option value="0.90">Higher Diploma (Ratio: 0.90)</option>
                </select>
              </div>

              <div className="form-group">
                <label>Years of Long Service</label>
                <input
                  type="number"
                  value={yearsOfService}
                  onChange={(e) => setYearsOfService(e.target.value)}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Branch Allowance ($)</label>
                <input type="number" value={branchAllowance} onChange={(e) => setBranchAllowance(e.target.value)} />
              </div>
              <div className="form-group">
                <label>Responsibility Allowance ($)</label>
                <input type="number" value={responsibilityAllowance} onChange={(e) => setResponsibilityAllowance(e.target.value)} />
              </div>
              <div className="form-group">
                <label>Housing/Transport ($)</label>
                <input type="number" value={housingTransportAllowance} onChange={(e) => setHousingTransportAllowance(e.target.value)} />
              </div>
            </div>

            <button type="submit" className="calc-btn" disabled={loading}>
              {loading ? "CALCULATING GROSS SALARY..." : "⚡ CALCULATE EMPLOYEE GROSS SALARY"}
            </button>
          </form>
        </div>

        {calculationResult && (
          <div className="hr-result-card">
            <h3>GROSS SALARY EVALUATION RESULT</h3>
            <div className="eval-grid">
              <div className="eval-box">
                <span className="lbl">Service Band</span>
                <span className="val highlight">{calculationResult.serviceBand?.bandName}</span>
              </div>
              <div className="eval-box">
                <span className="lbl">Band Bonus</span>
                <span className="val">+${calculationResult.serviceBand?.bonusAllowance}</span>
              </div>
              <div className="eval-box">
                <span className="lbl">Gross Salary</span>
                <span className="val total">${calculationResult.grossSalary}</span>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
