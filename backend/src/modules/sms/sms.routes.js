"use strict";

const express = require("express");
const router = express.Router();
const controller = require("./sms.controller");

router.get("/status", controller.getStatus);
router.post("/send-otp", controller.sendOTP);
router.post("/verify-otp", controller.verifyOTP);
router.get("/logs", controller.getLogs);
router.get("/", controller.getStatus);

module.exports = router;
