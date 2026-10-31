"use strict";

const loanManagementService = require("./loan-management.service");
const creditScoringEngine = require("./credit-scoring.engine");

class LoanManagementController {
  async submitApplication(req, res) {
    try {
      const { borrowerId } = req.body;
      const result = await loanManagementService.submitLoanApplication(borrowerId, req.body);
      return res.status(200).json(result);
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  async evaluateCredit(req, res) {
    try {
      const { monthlyIncome, monthlyDebt, rating } = req.body;
      const evaluation = creditScoringEngine.evaluateCreditScore(monthlyIncome, monthlyDebt, rating);
      return res.status(200).json({ success: true, evaluation });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  async getSchedule(req, res) {
    try {
      const { loanAccountId, principal, termMonths } = req.body;
      const schedule = await loanManagementService.generateRepaymentSchedule(loanAccountId, principal, termMonths);
      return res.status(200).json({ success: true, schedule });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }
}

module.exports = new LoanManagementController();
