const express = require('express');
const trackingController = require('./tracking.controller');
const { protect } = require('../../middleware/auth.middleware');
const { restrictTo } = require('../../middleware/rbac.middleware');

const router = express.Router();

router.use(protect);

router.post('/location', trackingController.updateLocation);
router.get('/live', trackingController.getLiveLocations);
router.get('/geofences', trackingController.getGeofences);
router.post('/geofences', trackingController.createGeofence);
router.get('/emergency-search', trackingController.locateEmergency);

// Step 34: Developer-Only Multi-Tenant Live Location Maps
// "Only the Developer has the authority to see the tenants and their live location, no user has to see or admin too."
router.get('/tenant-pins', restrictTo('DEVELOPER'), trackingController.getTenantPins);

module.exports = router;
