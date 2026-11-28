const express = require('express');
const router = express.Router();
const digitalTwinController = require('./digitalTwin.controller');
const { protect } = require('../../middleware/auth.middleware');
const { tenantStatusGuard, tenantIsolationGuard } = require('../../middleware/tenant.middleware');
const { restrictTo } = require('../../middleware/rbac.middleware');

const TWIN_VIEW_ROLES = ['ADMIN', 'SUPER_ADMIN', 'HEADMASTER', 'PRINCIPAL', 'STAFF', 'TEACHER', 'HR', 'SECRETARY', 'DEVELOPER'];
const TWIN_CONTROL_ROLES = ['ADMIN', 'SUPER_ADMIN', 'HEADMASTER', 'PRINCIPAL', 'STAFF', 'DEVELOPER'];

router.use(protect, tenantStatusGuard, tenantIsolationGuard);

router.get('/zones', restrictTo(...TWIN_VIEW_ROLES), digitalTwinController.getZones);
router.get('/zones/:id', restrictTo(...TWIN_VIEW_ROLES), digitalTwinController.getZoneById);
router.patch('/zones/:id/lock-status', restrictTo(...TWIN_CONTROL_ROLES), digitalTwinController.setZoneLockStatus);
router.post('/telemetry', restrictTo(...TWIN_CONTROL_ROLES), digitalTwinController.recordTelemetry);
router.get('/telemetry/:zoneId', restrictTo(...TWIN_VIEW_ROLES), digitalTwinController.getTelemetryHistory);
router.get('/summary', restrictTo(...TWIN_VIEW_ROLES), digitalTwinController.getSummary);

module.exports = router;
