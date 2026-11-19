"use strict";

const express = require("express");
const router = express.Router();
const controller = require("./sms.controller");

router.get("/status", controller.getStatus);
router.post("/send-otp", controller.sendOTP);
router.post("/verify-otp", controller.verifyOTP);
router.post("/send", controller.sendSMS);
router.post("/send-school-sms", controller.sendSchoolSMS);
router.post("/direct-send", controller.sendDirectSMS);
router.post("/direct", controller.sendDirectSMS);
router.get("/direct-logs", controller.getLogs);
router.get("/logs", controller.getLogs);
router.get("/", controller.getStatus);

const { protect } = require('../../middleware/auth.middleware');
const optionalSmsAuth = (req, res, next) => {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) return next();
  return protect(req, res, (err) => (err ? next() : next()));
};

router.get('/inbox', optionalSmsAuth, controller.getInbox);
router.patch('/inbox/:id/read', optionalSmsAuth, controller.markInboxRead);

module.exports = router;
