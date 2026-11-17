"use strict";

const pushService = require("./push.service");

async function getStatus(req, res) {
  try {
    const data = await pushService.getStatus();
    return res.status(200).json({ status: "success", data });
  } catch (error) {
    return res.status(500).json({ status: "error", message: error.message });
  }
}

async function registerDevice(req, res) {
  try {
    const { userId, userRole, devicePlatform, subscription } = req.body;
    const result = await pushService.registerDeviceSubscription({ userId, userRole, devicePlatform, subscription });
    return res.status(201).json({
      status: "success",
      message: "Device registered for instant lock screen push notifications.",
      data: result
    });
  } catch (error) {
    return res.status(500).json({ status: "error", message: error.message });
  }
}

async function dispatchNotification(req, res) {
  try {
    const { title, body, category, targetRole, targetUserId, url, icon, badge } = req.body;
    if (!title || !body) {
      return res.status(400).json({ status: "error", message: "title and body are required for lock screen push dispatch." });
    }
    const result = await pushService.dispatchPushNotification({ title, body, category, targetRole, targetUserId, url, icon, badge });
    return res.status(200).json({
      status: "success",
      message: "Push notification successfully broadcast to subscriber lock screens.",
      data: result
    });
  } catch (error) {
    return res.status(500).json({ status: "error", message: error.message });
  }
}

async function getLogs(req, res) {
  try {
    const logs = await pushService.getLogs();
    return res.status(200).json({ status: "success", count: logs.length, data: logs });
  } catch (error) {
    return res.status(500).json({ status: "error", message: error.message });
  }
}

module.exports = {
  getStatus,
  registerDevice,
  dispatchNotification,
  getLogs
};
