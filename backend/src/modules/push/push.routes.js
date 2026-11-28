"use strict";

const express = require("express");
const router = express.Router();
const controller = require("./push.controller");
const { protect } = require("../../middleware/auth.middleware");
const { tenantStatusGuard } = require("../../middleware/tenant.middleware");
const { restrictTo } = require("../../middleware/rbac.middleware");

const PUSH_DISPATCH_ROLES = ["ADMIN", "SUPER_ADMIN", "HEADMASTER", "PRINCIPAL", "TEACHER", "SECRETARY", "ACCOUNTANT", "HR", "DEVELOPER"];
const PUSH_AUDIT_ROLES = ["ADMIN", "SUPER_ADMIN", "HEADMASTER", "PRINCIPAL", "DEVELOPER"];

router.get("/status", (req, res) => controller.getStatus(req, res));
router.get("/", (req, res) => controller.getStatus(req, res));

router.use(protect, tenantStatusGuard);
router.get("/logs", restrictTo(...PUSH_AUDIT_ROLES), (req, res) => controller.getLogs(req, res));
router.post("/subscribe", (req, res) => controller.registerDevice(req, res));
router.post("/dispatch", restrictTo(...PUSH_DISPATCH_ROLES), (req, res) => controller.dispatchNotification(req, res));

module.exports = router;
