"use strict";

const salaryGroupingRoutes = require("./hr.salary-grouping.routes");
const salaryGroupingService = require("./hr.salary-grouping.service");
const salaryCalculator = require("./hr.salary-calculator.service");
const salaryGroupingController = require("./hr.salary-grouping.controller");

module.exports = {
  salaryGroupingRoutes,
  salaryGroupingService,
  salaryCalculator,
  salaryGroupingController
};
