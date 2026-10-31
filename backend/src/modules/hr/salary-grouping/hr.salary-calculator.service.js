"use strict";

const logger = require("../../../utils/logger");

/**
 * HR Salary Multi-Factor Calculation Engine
 * 
 * Formula:
 * Gross Salary = (Base Step Amount * Qualification Ratio)
 *              + Service Band Bonus
 *              + Branch Allowance
 *              + Responsibility Allowance
 *              + Housing/Transport Allowance
 *              + Performance Bonus
 */
class HRSalaryCalculatorService {
  /**
   * Determine Service Band based on years of long service
   */
  getServiceBand(yearsOfService) {
    if (yearsOfService >= 21) {
      return { bandName: "Executive Long Service", minYears: 21, maxYears: 99, bonusAllowance: 2500.0 };
    } else if (yearsOfService >= 16) {
      return { bandName: "Band E", minYears: 16, maxYears: 20, bonusAllowance: 1800.0 };
    } else if (yearsOfService >= 11) {
      return { bandName: "Band D", minYears: 11, maxYears: 15, bonusAllowance: 1200.0 };
    } else if (yearsOfService >= 6) {
      return { bandName: "Band C", minYears: 6, maxYears: 10, bonusAllowance: 750.0 };
    } else if (yearsOfService >= 3) {
      return { bandName: "Band B", minYears: 3, maxYears: 5, bonusAllowance: 400.0 };
    } else {
      return { bandName: "Band A", minYears: 0, maxYears: 2, bonusAllowance: 0.0 };
    }
  }

  /**
   * Calculate Gross Salary
   */
  calculateGrossSalary(params) {
    const {
      baseStepAmount = 3000.0,
      qualificationRatio = 1.0,
      yearsOfService = 0,
      branchAllowance = 0,
      responsibilityAllowance = 0,
      housingTransportAllowance = 0,
      performanceBonus = 0
    } = params;

    const serviceBand = this.getServiceBand(yearsOfService);
    const adjustedBase = baseStepAmount * qualificationRatio;
    const grossSalary = adjustedBase + serviceBand.bonusAllowance + branchAllowance + responsibilityAllowance + housingTransportAllowance + performanceBonus;

    logger.info("HR_SALARY_CALCULATION_EXECUTED", { yearsOfService, band: serviceBand.bandName, grossSalary });

    return {
      baseStepAmount,
      qualificationRatio,
      adjustedBase,
      serviceBand,
      branchAllowance,
      responsibilityAllowance,
      housingTransportAllowance,
      performanceBonus,
      grossSalary: parseFloat(grossSalary.toFixed(2))
    };
  }
}

module.exports = new HRSalaryCalculatorService();
