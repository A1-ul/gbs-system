"use strict";

const logger = require("../../../utils/logger");
const salaryCalculator = require("./hr.salary-calculator.service");

class HRSalaryGroupingService {
  async getQualificationLevels() {
    return [
      { id: 1, code: "DEGREE_BACHELORS", name: "Bachelor's Degree", baseAllowanceRatio: 1.0 },
      { id: 2, code: "DEGREE_MASTERS", name: "Master's Degree", baseAllowanceRatio: 1.15 },
      { id: 3, code: "DEGREE_DOCTORATE", name: "Doctorate / PhD", baseAllowanceRatio: 1.30 },
      { id: 4, code: "DIPLOMA_HIGHER", name: "Higher National Diploma", baseAllowanceRatio: 0.90 }
    ];
  }

  async getSalaryGrades() {
    return [
      { id: 1, gradeCode: "G1", name: "Grade 1 - Executive / Principal", minSalary: 5000, maxSalary: 12000 },
      { id: 2, gradeCode: "G2", name: "Grade 2 - Senior Academic / HOD", minSalary: 3500, maxSalary: 8000 },
      { id: 3, gradeCode: "G3", name: "Grade 3 - Lecturer / Senior Staff", minSalary: 2500, maxSalary: 5500 },
      { id: 4, gradeCode: "G4", name: "Grade 4 - Assistant / Support Staff", minSalary: 1500, maxSalary: 3500 }
    ];
  }

  async assignSalaryProfile(userId, data) {
    logger.info("ASSIGNING_EMPLOYEE_SALARY_PROFILE", { userId, data });

    const calculation = salaryCalculator.calculateGrossSalary({
      baseStepAmount: data.baseStepAmount || 3000.0,
      qualificationRatio: data.qualificationRatio || 1.0,
      yearsOfService: data.yearsOfService || 0,
      branchAllowance: data.branchAllowance || 0,
      responsibilityAllowance: data.responsibilityAllowance || 0,
      housingTransportAllowance: data.housingTransportAllowance || 0,
      performanceBonus: data.performanceBonus || 0
    });

    return {
      success: true,
      profileId: `SAL-PROF-${userId}-${Date.now()}`,
      userId,
      calculation,
      assignedAt: new Date()
    };
  }
}

module.exports = new HRSalaryGroupingService();
