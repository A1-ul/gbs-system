"use strict";

const express = require("express");
const router = express.Router();
const locationTrackingService = require("./location-tracking.service");
const emergencyLocatorService = require("./emergency-locator.service");

router.get("/tenant-pins", async (req, res) => {
  try {
    const locations = await locationTrackingService.getTenantLocations();
    return res.status(200).json({ success: true, locations });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

router.post("/student/update", async (req, res) => {
  try {
    const { tenantId, studentId, latitude, longitude, speed, batteryPct } = req.body;
    const result = await locationTrackingService.updateStudentLocation(tenantId, studentId, latitude, longitude, speed, batteryPct);
    return res.status(200).json(result);
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

router.get("/emergency-search", async (req, res) => {
  try {
    const { query } = req.query;
    const result = await emergencyLocatorService.searchStudentEmergencyLocation(query);
    return res.status(200).json({ success: true, result });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
