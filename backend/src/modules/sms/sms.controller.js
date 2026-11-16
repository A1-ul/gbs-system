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

async function sendSMS(req, res, next) {
  try {
    const { recipientPhone, recipientName, sender, senderPhone, content, type, tenantId, schoolName } = req.body;
    if (!recipientPhone) {
      return res.status(400).json({ status: "fail", message: "recipientPhone (personal mobile phone) is required." });
    }
    const result = await service.sendSMSMessage({
      recipientPhone,
      recipientName,
      sender,
      senderPhone,
      content,
      type: type || "DIRECT_SCHOOL_SMS",
      tenantId: tenantId || req.tenantId,
      schoolName: schoolName || req.body.institutionName
    });

    return res.status(200).json({
      status: "success",
      message: `SMS message with registered school name successfully dispatched to ${recipientPhone}`,
      data: result
    });
  } catch (error) {
    return next(error);
  }
}

async function sendSchoolSMS(req, res, next) {
  return sendSMS(req, res, next);
}

async function sendDirectSMS(req, res, next) {
  try {
    const {
      senderId,
      senderName,
      senderRole,
      senderPhone,
      recipientPhone,
      recipientName,
      recipientRole,
      message,
      content,
      carrierNetwork,
      tenantId,
      schoolName
    } = req.body;

    const result = await service.sendDirectUserSMS({
      senderId: senderId || req.user?.id,
      senderName: senderName || req.user?.name || req.user?.firstName || "System User",
      senderRole: senderRole || req.user?.role || "STAFF",
      senderPhone,
      recipientPhone,
      recipientName,
      recipientRole,
      message: message || content,
      carrierNetwork,
      tenantId: tenantId || req.tenantId || req.user?.tenantId,
      schoolName: schoolName || req.body.institutionName
    });

    return res.status(200).json({
      status: "success",
      message: `Direct SMS message successfully dispatched to ${recipientPhone} via ${result.carrierNetwork}`,
      data: result
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getStatus,
  sendOTP,
  verifyOTP,
  getLogs,
  sendSMS,
  sendSchoolSMS,
  sendDirectSMS
};
