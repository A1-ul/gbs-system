"use strict";

const express = require("express");
const router = express.Router();
const controller = require("./ai.controller");
const { protect } = require("../../middleware/auth.middleware");
const { restrictTo } = require("../../middleware/rbac.middleware");
const { tenantStatusGuard, tenantIsolationGuard } = require("../../middleware/tenant.middleware");

// 1. Status endpoint
router.get("/status", controller.getStatus);

// All subsequent routes require authentication and tenant guard
router.use(protect);
router.use(tenantStatusGuard);
router.use(tenantIsolationGuard);

// 2. Telemetry
router.get("/telemetry", controller.getTelemetry);

// 3. Academic Diagnostics (Blueprint Box 9)
router.post("/diagnostics/student/:studentId", restrictTo("SUPER_ADMIN", "ADMIN", "TEACHER", "DEVELOPER"), controller.diagnoseStudent);
router.post("/diagnose", restrictTo("SUPER_ADMIN", "ADMIN", "TEACHER", "DEVELOPER"), controller.diagnoseStudent);
router.get("/diagnostics/cohort", restrictTo("SUPER_ADMIN", "ADMIN", "TEACHER", "DEVELOPER"), controller.diagnoseCohort);

// 4. Adaptive AI Study Plans (Blueprint Box 9)
router.post("/study-plans", restrictTo("SUPER_ADMIN", "ADMIN", "TEACHER", "DEVELOPER", "STUDENT"), controller.generateStudyPlan);
router.get("/study-plans", controller.getStudyPlans);
router.get("/study-plans/:studentId", controller.getStudyPlans);

// 5. Early Learning Interventions (Blueprint Box 9)
router.post("/interventions", restrictTo("SUPER_ADMIN", "ADMIN", "TEACHER", "DEVELOPER"), controller.createIntervention);
router.get("/interventions", restrictTo("SUPER_ADMIN", "ADMIN", "TEACHER", "DEVELOPER"), controller.getInterventions);
router.patch("/interventions/:id", restrictTo("SUPER_ADMIN", "ADMIN", "TEACHER", "DEVELOPER"), controller.updateInterventionStatus);

// 6. AI Developer Assistant & Architecture Sentinel (Blueprint Box 10)
router.post("/developer/diagnostics", restrictTo("SUPER_ADMIN", "ADMIN", "DEVELOPER"), controller.runSystemDiagnostics);
router.get("/developer/diagnostics", restrictTo("SUPER_ADMIN", "ADMIN", "DEVELOPER"), controller.getSystemDiagnosticsHistory);

module.exports = router;
