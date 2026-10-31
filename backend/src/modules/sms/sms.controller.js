"use strict";

const service = require("./sms.service");

async function getStatus(req, res, next) {
  try {
    const data = await service.getStatus();
    return res.status(200).json({ status: "success", data });
  } catch (error) {
    return next(error);
  }
}

async function sendOTP(req, res, next) {
  try {
    const { recipientPhone, recipientName, sender, senderPhone, otp, content, type, tenantId } = req.body;
    const finalOtp = otp || String(Math.floor(100000 + Math.random() * 900000));
    const result = await service.sendOTPMessage({
      recipientPhone,
      recipientName,
      sender,
      senderPhone,
      otp: finalOtp,
      content,
      type,
      tenantId: tenantId || req.tenantId
    });

    return res.status(200).json({
      status: "success",
      message: `OTP message successfully dispatched to ${recipientPhone}`,
      data: result
    });
  } catch (error) {
    return next(error);
  }
}

async function verifyOTP(req, res, next) {
  try {
    const { phoneNumber, otp } = req.body;
    const result = service.verifyMobileOTP(phoneNumber, otp);
    if (!result.valid) {
      return res.status(400).json({
        status: "fail",
        message: result.message
      });
    }

    return res.status(200).json({
      status: "success",
      message: result.message,
      data: result.payload
    });
  } catch (error) {
    return next(error);
  }
}

async function getLogs(req, res, next) {
  try {
    const logs = await service.getSMSLogs(req.query || {});
    return res.status(200).json({
      status: "success",
      results: logs.length,
      data: { logs }
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getStatus,
  sendOTP,
  verifyOTP,
  getLogs
};
