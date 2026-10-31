"use strict";

const logger = require("../../utils/logger");
const creditScoringEngine = require("./credit-scoring.engine");

class LoanManagementService {
  async submitLoanApplication(borrowerId, data) {
    logger.info("SUBMIT_LOAN_APPLICATION", { borrowerId, data });

    const { monthlyIncome = 5000, monthlyDebt = 1000, amountRequested = 10000, termMonths = 12 } = data;
    const creditEvaluation = creditScoringEngine.evaluateCreditScore(monthlyIncome, monthlyDebt);

    const applicationId = `LOAN-APP-${Date.now()}`;
    const monthlyRate = 0.015; // 1.5% monthly
    const estimatedMonthlyInstallment = parseFloat(((amountRequested * (1 + monthlyRate * termMonths)) / termMonths).toFixed(2));

    return {
      success: true,
      applicationId,
      borrowerId,
      loanType: data.loanType || "PERSONAL",
      amountRequested,
      termMonths,
      estimatedMonthlyInstallment,
      creditEvaluation,
      status: creditEvaluation.approvedForLoan ? "APPROVED_PENDING_DISBURSEMENT" : "REJECTED_CREDIT_SCORE",
      createdAt: new Date()
    };
  }

  async generateRepaymentSchedule(loanAccountId, principal, termMonths, annualInterestRate = 18.0) {
    logger.info("GENERATING_REPAYMENT_SCHEDULE", { loanAccountId, principal, termMonths });

    const monthlyInterestRate = annualInterestRate / 100 / 12;
    const monthlyPrincipal = principal / termMonths;
    const schedule = [];
    let currentBalance = principal;

    for (let i = 1; i <= termMonths; i++) {
      const interestAmount = currentBalance * monthlyInterestRate;
      currentBalance -= monthlyPrincipal;
      
      const dueDate = new Date();
      dueDate.setMonth(dueDate.getMonth() + i);

      schedule.push({
        installmentNumber: i,
        dueDate,
        principalAmount: parseFloat(monthlyPrincipal.toFixed(2)),
        interestAmount: parseFloat(interestAmount.toFixed(2)),
        penaltyAmount: 0.0,
        totalInstallment: parseFloat((monthlyPrincipal + interestAmount).toFixed(2)),
        status: "PENDING"
      });
    }

    return {
      loanAccountId,
      totalInstallments: termMonths,
      schedule
    };
  }
}

module.exports = new LoanManagementService();
