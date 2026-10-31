"use strict";

const express = require("express");
const router = express.Router();
const controller = require("./hr.salary-grouping.controller");

router.get("/qualification-levels", controller.getQualificationLevels);
router.get("/salary-grades", controller.getSalaryGrades);
router.post("/calculate", controller.calculateSalary);
router.post("/assign-profile", controller.assignProfile);

module.exports = router;
