"use strict";

const loanRoutes = require("./loan-management.routes");
const loanManagementService = require("./loan-management.service");
const creditScoringEngine = require("./credit-scoring.engine");
const loanManagementController = require("./loan-management.controller");

module.exports = {
  loanRoutes,
  loanManagementService,
  creditScoringEngine,
  loanManagementController
};
