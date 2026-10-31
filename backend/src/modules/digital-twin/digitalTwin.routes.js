const express = require('express');
const router = express.Router();
const digitalTwinController = require('./digitalTwin.controller');

router.get('/zones', digitalTwinController.getZones);
router.get('/zones/:id', digitalTwinController.getZoneById);
router.patch('/zones/:id/lock-status', digitalTwinController.setZoneLockStatus);
router.post('/telemetry', digitalTwinController.recordTelemetry);
router.get('/telemetry/:zoneId', digitalTwinController.getTelemetryHistory);
router.get('/summary', digitalTwinController.getSummary);

module.exports = router;
