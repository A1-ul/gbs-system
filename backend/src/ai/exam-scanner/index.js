"use strict";

const examScannerRoutes = require("./exam-scanner.routes");
const omrScannerService = require("./omr-scanner.service");
const autoGradingEngine = require("./auto-grading.engine");

module.exports = {
  examScannerRoutes,
  omrScannerService,
  autoGradingEngine
};
