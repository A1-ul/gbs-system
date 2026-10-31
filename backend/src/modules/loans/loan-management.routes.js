"use strict";

const express = require("express");
const router = express.Router();
const controller = require("./loan-management.controller");

router.post("/apply", controller.submitApplication);
router.post("/credit-score", controller.evaluateCredit);
router.post("/repayment-schedule", controller.getSchedule);

module.exports = router;
