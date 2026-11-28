"use strict";

const express = require("express");
const router = express.Router();
const controller = require("./cdn.controller");
const { protect } = require("../../middleware/auth.middleware");
const { tenantStatusGuard, tenantIsolationGuard } = require("../../middleware/tenant.middleware");

router.get("/status", (req, res) => controller.getStatus(req, res));
router.get("/", (req, res) => controller.getStatus(req, res));

router.use(protect, tenantStatusGuard, tenantIsolationGuard);
router.get("/assets", (req, res) => controller.getAssets(req, res));
router.post("/upload", (req, res) => controller.uploadAsset(req, res));
router.post("/presigned-url", (req, res) => controller.generatePresignedUrl(req, res));

module.exports = router;
