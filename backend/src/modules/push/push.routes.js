"use strict";

const express = require("express");
const router = express.Router();
const controller = require("./push.controller");

router.get("/status", (req, res) => controller.getStatus(req, res));
router.get("/logs", (req, res) => controller.getLogs(req, res));
router.post("/subscribe", (req, res) => controller.registerDevice(req, res));
router.post("/dispatch", (req, res) => controller.dispatchNotification(req, res));
router.get("/", (req, res) => controller.getStatus(req, res));

module.exports = router;
