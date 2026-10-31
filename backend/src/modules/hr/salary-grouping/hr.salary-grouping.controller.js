"use strict";

const salaryGroupingService = require("./hr.salary-grouping.service");
const salaryCalculator = require("./hr.salary-calculator.service");

class HRSalaryGroupingController {
  async getQualificationLevels(req, res) {
    try {
      const levels = await salaryGroupingService.getQualificationLevels();
      return res.status(200).json({ success: true, levels });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  async getSalaryGrades(req, res) {
    try {
      const grades = await salaryGroupingService.getSalaryGrades();
      return res.status(200).json({ success: true, grades });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  async calculateSalary(req, res) {
    try {
      const result = salaryCalculator.calculateGrossSalary(req.body);
      return res.status(200).json({ success: true, result });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  async assignProfile(req, res) {
    try {
      const { userId } = req.body;
      const result = await salaryGroupingService.assignSalaryProfile(userId, req.body);
      return res.status(200).json(result);
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }
}

module.exports = new HRSalaryGroupingController();
