"use strict";

const express = require("express");
const router = express.Router();
const controller = require("./audit.controller");

router.get("/status", (req, res, next) => controller.getStatus(req, res, next));
router.get("/logs", (req, res, next) => controller.getAuditLogs(req, res, next));
router.get("/", (req, res, next) => controller.getAuditLogs(req, res, next));

module.exports = router;
