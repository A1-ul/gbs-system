"use strict";

const express = require("express");
const router = express.Router();
const controller = require("./sms.controller");
const { protect } = require('../../middleware/auth.middleware');
const { restrictTo } = require('../../middleware/rbac.middleware');

const SMS_LOG_ROLES = [
  'ADMIN', 'SUPER_ADMIN', 'HEADMASTER', 'PRINCIPAL',
  'SECRETARY', 'STAFF', 'HR', 'ACCOUNTANT', 'TEACHER',
  'CLINIC_DOCTOR', 'CLINIC_NURSE', 'DEVELOPER'
];

// Public status & onboarding/recovery OTP verification endpoints
router.get("/status", controller.getStatus);
router.get("/", controller.getStatus);
router.post("/send-otp", controller.sendOTP);
router.post("/verify-otp", controller.verifyOTP);

// Authenticated SMS dispatch, logs & personal inbox
router.post("/send", protect, controller.sendSMS);
router.post("/send-school-sms", protect, restrictTo(...SMS_LOG_ROLES), controller.sendSchoolSMS);
router.post("/direct-send", protect, controller.sendDirectSMS);
router.post("/direct", protect, controller.sendDirectSMS);
router.get("/direct-logs", protect, restrictTo(...SMS_LOG_ROLES), controller.getLogs);
router.get("/logs", protect, restrictTo(...SMS_LOG_ROLES), controller.getLogs);
router.get('/inbox', protect, controller.getInbox);
router.patch('/inbox/:id/read', protect, controller.markInboxRead);

module.exports = router;
