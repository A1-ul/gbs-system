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
  sendDirectSMS: async (req, res) => {
    try {
      const body = req.body || {};
      const senderName =
        body.senderName ||
        (req.user ? `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim() || req.user.role : null) ||
        'Institutional User';
      const data = await service.sendDirectUserSMS({
        senderId: req.user?.id || body.senderId || null,
        senderName,
        senderRole: body.senderRole || req.user?.role || 'STAFF',
        senderPhone: body.senderPhone || req.user?.phone || null,
        senderEmail: body.senderEmail || req.user?.email || null,
        recipientId: body.recipientId || null,
        recipientPhone: body.recipientPhone || body.phone || body.phoneNumber,
        recipientName: body.recipientName || 'Recipient',
        recipientRole: body.recipientRole || 'CONTACT',
        recipientEmail: body.recipientEmail || null,
        recipientAudience: body.recipientAudience || 'CUSTOM',
        subject: body.subject || null,
        message: body.message || body.content,
        carrierNetwork: body.carrierNetwork || null,
        tenantId: body.tenantId || req.tenantId || req.user?.tenantId || 1,
        schoolName: body.schoolName || null,
        channel: body.channel || 'SMS'
      });
      return res.status(200).json({
        success: true,
        status: 'success',
        message: data.carrierNote || `Message processed for ${data.recipientPhone || data.recipientEmail}.`,
        data: { sms: data, messageRecord: data }
      });
    } catch (error) {
      return res.status(400).json({
        success: false,
        status: 'fail',
        message: error.message || 'Failed to dispatch SMS message.'
      });
    }
  },
  getInbox: (req, res) => {
    try {
      const q = req.query || {};
      const phone = q.phone || req.user?.phone || null;
      const email = q.email || req.user?.email || null;
      const userId = q.userId || req.user?.id || null;
      const role = q.role || req.user?.role || null;
      const tenantId = q.tenantId || req.tenantId || req.user?.tenantId || null;
      const messages = service.getInboxMessages({
        phone,
        email,
        userId,
        role,
        tenantId,
        limit: q.limit
      });
      const unreadCount = messages.filter((m) => !m.read).length;
      return res.status(200).json({
        success: true,
        status: 'success',
        results: messages.length,
        unreadCount,
        data: { messages, unreadCount }
      });
    } catch (error) {
      return res.status(400).json({
        success: false,
        status: 'fail',
        message: error.message || 'Failed to load SMS inbox.'
      });
    }
  },
  markInboxRead: (req, res) => {
    try {
      const updated = service.markInboxMessageRead(req.params.id);
      if (!updated) {
        return res.status(404).json({
          success: false,
          status: 'fail',
          message: 'Message not found in SMS inbox.'
        });
      }
      return res.status(200).json({
        success: true,
        status: 'success',
        data: { message: updated }
      });
    } catch (error) {
      return res.status(400).json({
        success: false,
        status: 'fail',
        message: error.message
      });
    }
  }
};
