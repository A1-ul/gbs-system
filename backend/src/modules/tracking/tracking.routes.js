const express = require('express');
const rateLimit = require('express-rate-limit');
const trackingController = require('./tracking.controller');
const mobileLocationService = require('./mobileLocation.service');
const { protect } = require('../../middleware/auth.middleware');
const { restrictTo } = require('../../middleware/rbac.middleware');
const { tenantStatusGuard, tenantIsolationGuard } = require('../../middleware/tenant.middleware');
const { resolveTenantId } = require('../../utils/resolveTenantId');

const router = express.Router();

// Dedicated anti-enumeration rate limiter for mobile number location searches
const mobileSearchLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 'fail',
    message: 'Too many mobile location search requests. Please wait a few minutes before searching again.'
  }
});

router.use(protect);
router.use(tenantStatusGuard);
router.use(tenantIsolationGuard);

router.post('/location', trackingController.updateLocation);
router.get('/live', trackingController.getLiveLocations);
router.get('/geofences', trackingController.getGeofences);
router.post('/geofences', trackingController.createGeofence);
router.get('/emergency-search', trackingController.locateEmergency);

// GBS LIVE MAP — Authorized Mobile Number Location Sharing & Real-Time Tracking
router.post('/mobile-location/device/register', (req, res, next) => {
  try {
    const tid = resolveTenantId(req, 1);
    const device = mobileLocationService.registerUserDevice(tid, req.user, req.body || {});
    res.status(200).json({ status: 'success', message: 'Device and mobile number registered for location sharing.', data: { device } });
  } catch (err) {
    next(err);
  }
});

router.post('/mobile-location/sharing/toggle', (req, res, next) => {
  try {
    const tid = resolveTenantId(req, 1);
    const device = mobileLocationService.toggleDeviceLocationSharing(tid, req.user, req.body || {});
    res.status(200).json({
      status: 'success',
      message: device.sharingEnabled ? 'Real-time location sharing enabled.' : 'Location sharing disabled.',
      data: { device }
    });
  } catch (err) {
    next(err);
  }
});

router.post('/mobile-location/sharing/permissions', (req, res, next) => {
  try {
    const tid = resolveTenantId(req, 1);
    const permission = mobileLocationService.grantLocationPermission(tid, req.user, req.body || {});
    res.status(201).json({ status: 'success', message: 'Location-sharing permission granted.', data: { permission } });
  } catch (err) {
    next(err);
  }
});

router.delete('/mobile-location/sharing/permissions/:permissionId', (req, res, next) => {
  try {
    const tid = resolveTenantId(req, 1);
    const permission = mobileLocationService.revokeLocationPermission(tid, req.user, req.params.permissionId);
    res.status(200).json({ status: 'success', message: 'Location-sharing permission revoked immediately.', data: { permission } });
  } catch (err) {
    next(err);
  }
});

router.get('/mobile-location/sharing/status', (req, res, next) => {
  try {
    const tid = resolveTenantId(req, 1);
    const status = mobileLocationService.getMyLocationSharingStatus(tid, req.user);
    res.status(200).json({ status: 'success', data: status });
  } catch (err) {
    next(err);
  }
});

router.post('/mobile-location/update', (req, res, next) => {
  try {
    const tid = resolveTenantId(req, 1);
    const result = mobileLocationService.pushAuthorizedLocationUpdate(tid, req.user, req.body || {});
    res.status(200).json({ status: 'success', data: result });
  } catch (err) {
    next(err);
  }
});

router.post('/mobile-location/offline', (req, res, next) => {
  try {
    const tid = resolveTenantId(req, 1);
    const device = mobileLocationService.markDeviceOffline(tid, req.user);
    res.status(200).json({ status: 'success', data: { device } });
  } catch (err) {
    next(err);
  }
});

router.get('/mobile-location/search', mobileSearchLimiter, (req, res, next) => {
  try {
    const tid = resolveTenantId(req, 1);
    const rawPhone = req.query.phone || req.query.mobile || req.query.q || '';
    const clientIp = String(req.headers['x-forwarded-for'] || req.ip || '').split(',')[0].trim();
    const result = mobileLocationService.searchAuthorizedMobileLocation(tid, req.user, rawPhone, clientIp);
    res.status(200).json({ status: 'success', data: result });
  } catch (err) {
    next(err);
  }
});

router.get('/mobile-location/audit-logs', (req, res, next) => {
  try {
    const tid = resolveTenantId(req, 1);
    const logs = mobileLocationService.getTenantLocationAuditLogs(tid, req.user);
    res.status(200).json({ status: 'success', results: logs.length, data: { logs } });
  } catch (err) {
    next(err);
  }
});

// Step 34: Developer-Only Multi-Tenant Live Location Maps
// "Only the Developer has the authority to see the tenants and their live location, no user has to see or admin too."
router.get('/tenant-pins', restrictTo('DEVELOPER'), trackingController.getTenantPins);

module.exports = router;
