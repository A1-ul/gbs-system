"use strict";

const logger = require("../../utils/logger");

/**
 * GBS Credit Intelligence & Scoring Engine
 * Evaluates borrower credit score (300 to 850), debt-to-income ratio, and risk level.
 */
class CreditScoringEngine {
  evaluateCreditScore(monthlyIncome, monthlyDebt, repaymentHistoryRating = 1.0) {
    logger.info("EXECUTING_CREDIT_SCORING_ENGINE", { monthlyIncome, monthlyDebt });

    const debtToIncomeRatio = monthlyIncome > 0 ? parseFloat((monthlyDebt / monthlyIncome).toFixed(2)) : 1.0;

    let baseScore = 700;

    // Debt-to-income adjustment
    if (debtToIncomeRatio < 0.3) {
      baseScore += 80;
    } else if (debtToIncomeRatio < 0.5) {
      baseScore += 30;
    } else if (debtToIncomeRatio > 0.7) {
      baseScore -= 120;
    }

    // Repayment rating adjustment
    baseScore = Math.round(baseScore * repaymentHistoryRating);
    const finalScore = Math.min(850, Math.max(300, baseScore));

    let riskLevel = "LOW";
    if (finalScore < 580) {
      riskLevel = "CRITICAL";
    } else if (finalScore < 670) {
      riskLevel = "HIGH";
    } else if (finalScore < 740) {
      riskLevel = "MEDIUM";
    }

    return {
      creditScore: finalScore,
      riskLevel,
      debtToIncomeRatio,
      approvedForLoan: finalScore >= 600,
      evaluatedAt: new Date()
    };
  }
}

module.exports = new CreditScoringEngine();
