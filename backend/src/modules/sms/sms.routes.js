"use strict";

const express = require("express");
const router = express.Router();
const controller = require("./sms.controller");

router.get("/status", controller.getStatus);
router.post("/send-otp", controller.sendOTP);
router.post("/verify-otp", controller.verifyOTP);
router.post("/send", controller.sendSMS);
router.post("/send-school-sms", controller.sendSchoolSMS);
router.get("/logs", controller.getLogs);
router.get("/", controller.getStatus);

module.exports = router;
