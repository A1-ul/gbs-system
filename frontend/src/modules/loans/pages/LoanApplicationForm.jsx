import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import apiClient from "../../../api/client/apiClient";
import WindowControlsBar from "../../../components/common/WindowControlsBar";
import TopCenterSystemBanner from "../../../components/common/TopCenterSystemBanner";
import "./LoanManagement.css";

export default function LoanApplicationForm() {
  const navigate = useNavigate();
  const [loanType, setLoanType] = useState("PERSONAL");
  const [amountRequested, setAmountRequested] = useState(10000);
  const [termMonths, setTermMonths] = useState(12);
  const [monthlyIncome, setMonthlyIncome] = useState(5000);
  const [monthlyDebt, setMonthlyDebt] = useState(1000);
  const [purpose, setPurpose] = useState("Business Expansion");

  const [creditEvaluation, setCreditEvaluation] = useState(null);
  const [applicationResult, setApplicationResult] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleEvaluateCredit = async () => {
    setErrorMessage(null);
    const income = parseFloat(monthlyIncome);
    const debt = parseFloat(monthlyDebt);
    if (!Number.isFinite(income) || income <= 0 || !Number.isFinite(debt) || debt < 0) {
      setErrorMessage("Please enter a valid positive monthly gross income and non-negative monthly debt.");
      return;
    }
    try {
      const res = await apiClient.post("/loans/credit-score", {
        monthlyIncome: income,
        monthlyDebt: debt
      });
      const evaluation = res.data?.evaluation;
      if (!evaluation) throw new Error("Credit scoring engine did not return an evaluation.");
      setCreditEvaluation(evaluation);
    } catch (err) {
      setErrorMessage(
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        err?.message ||
        "Unable to evaluate credit score from backend server. Please verify connection and retry."
      );
    }
  };

  const handleSubmitApplication = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage(null);
    const amount = parseFloat(amountRequested);
    const term = parseInt(termMonths, 10);
    const income = parseFloat(monthlyIncome);
    const debt = parseFloat(monthlyDebt);

    if (!Number.isFinite(amount) || amount <= 0 || !Number.isFinite(term) || term <= 0) {
      setErrorMessage("Loan amount and duration must be positive numbers.");
      setLoading(false);
      return;
    }

    try {
      const res = await apiClient.post("/loans/apply", {
        borrowerId: 101,
        loanType,
        amountRequested: amount,
        termMonths: term,
        monthlyIncome: income,
        monthlyDebt: debt,
        purpose
      });
      setApplicationResult(res.data);
      if (res.data?.creditEvaluation) {
        setCreditEvaluation(res.data.creditEvaluation);
      }
      try {
        localStorage.setItem("gbs_latest_loan_application", JSON.stringify({
          applicationId: res.data?.applicationId,
          principal: amount,
          termMonths: term,
          creditScore: res.data?.creditEvaluation?.creditScore ?? creditEvaluation?.creditScore ?? null,
          status: res.data?.status,
          estimatedMonthlyInstallment: res.data?.estimatedMonthlyInstallment
        }));
      } catch { }
    } catch (err) {
      setErrorMessage(
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        err?.message ||
        "Unable to submit loan application to server. Please check connection and retry."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="loan-page-container">
      <WindowControlsBar title="Loan Application" />
      <TopCenterSystemBanner roleTitle="Loan Origination & Credit Assessment" />
      <header className="loan-header">
        <div>
          <h2>💳 ONLINE LOAN APPLICATION</h2>
          <p>GBS LOAN MANAGEMENT SYSTEM — SMART LOANS, SECURE FUTURE</p>
        </div>
        <button type="button" onClick={() => navigate("/loans/dashboard")}>Loan Dashboard</button>
      </header>

      <main className="loan-main">
        {errorMessage && (
          <div style={{ marginBottom: "14px", padding: "12px 16px", borderRadius: "10px", background: "rgba(239, 68, 68, 0.16)", border: "1px solid #ef4444", color: "#fecaca", fontWeight: 700 }}>
            ⚠️ {errorMessage}
          </div>
        )}
        <div className="loan-card">
          <h3>APPLICATION DETAILS</h3>

          <form onSubmit={handleSubmitApplication} className="loan-form">
            <div className="form-row">
              <div className="form-group">
                <label>Loan Product Type</label>
                <select value={loanType} onChange={(e) => setLoanType(e.target.value)}>
                  <option value="MICRO">Micro Loan</option>
                  <option value="PERSONAL">Personal Loan</option>
                  <option value="VEHICLE">Vehicle Loan</option>
                  <option value="SME">SME Loan</option>
                  <option value="MORTGAGE">Mortgage Loan</option>
                </select>
              </div>

              <div className="form-group">
                <label>Amount Requested ($)</label>
                <input
                  type="number"
                  required
                  value={amountRequested}
                  onChange={(e) => setAmountRequested(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Duration (Months)</label>
                <input
                  type="number"
                  required
                  value={termMonths}
                  onChange={(e) => setTermMonths(e.target.value)}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Monthly Gross Income ($)</label>
                <input
                  type="number"
                  required
                  value={monthlyIncome}
                  onChange={(e) => setMonthlyIncome(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Existing Monthly Debt ($)</label>
                <input
                  type="number"
                  required
                  value={monthlyDebt}
                  onChange={(e) => setMonthlyDebt(e.target.value)}
                />
              </div>
            </div>

            <div className="credit-eval-box">
              <button type="button" className="eval-btn" onClick={handleEvaluateCredit}>
                🔍 EVALUATE CREDIT INTELLIGENCE SCORE
              </button>

              {creditEvaluation && (
                <div className="credit-metrics-display">
                  <span className="eval-metric">Credit Score: <strong>{creditEvaluation.creditScore}</strong></span>
                  <span className="eval-metric">Risk Level: <strong className="risk-low">{creditEvaluation.riskLevel}</strong></span>
                  <span className="eval-metric">DTI Ratio: <strong>{creditEvaluation.debtToIncomeRatio}</strong></span>
                </div>
              )}
            </div>

            <button type="submit" className="submit-loan-btn" disabled={loading}>
              {loading ? "PROCESSING APPLICATION..." : "SUBMIT LOAN APPLICATION"}
            </button>
          </form>
        </div>

        {applicationResult && (
          <div className="result-card">
            <h3>APPLICATION STATUS: {applicationResult.status} ✅</h3>
            <p><strong>Application Reference:</strong> {applicationResult.applicationId}</p>
            <p><strong>Estimated Monthly Repayment:</strong> ${applicationResult.estimatedMonthlyInstallment}</p>
          </div>
        )}
      </main>
    </div>
  );
}
