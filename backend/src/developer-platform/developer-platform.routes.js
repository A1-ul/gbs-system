"use strict";

const express = require("express");
const router = express.Router();
const developerController = require("./developer.controller");
const { requireDeveloperAuth } = require("./developer.middleware");

// Hidden authentication route
router.post("/auth/login", developerController.login);

// Protected routes (Require GBS Developer token)
router.get("/metrics", requireDeveloperAuth, developerController.getMetrics);
router.post("/system/lock", requireDeveloperAuth, developerController.lockSystem);
router.post("/system/unlock", requireDeveloperAuth, developerController.unlockSystem);
router.post("/backup/trigger", requireDeveloperAuth, developerController.triggerBackup);
router.post("/ai/analyze-crash", requireDeveloperAuth, developerController.runAICrashAnalysis);
router.get("/ai/verify-blueprint", requireDeveloperAuth, developerController.verifyBlueprint);

module.exports = router;
