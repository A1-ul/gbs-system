const express = require('express');
const router = express.Router();
const cctvController = require('./cctv.controller');
const { protect } = require('../../middleware/auth.middleware');
const { tenantStatusGuard, tenantIsolationGuard } = require('../../middleware/tenant.middleware');
const { restrictTo } = require('../../middleware/rbac.middleware');

const CCTV_VIEW_ROLES = ['ADMIN', 'SUPER_ADMIN', 'HEADMASTER', 'PRINCIPAL', 'STAFF', 'HR', 'SECRETARY', 'DEVELOPER'];
const CCTV_MANAGE_ROLES = ['ADMIN', 'SUPER_ADMIN', 'HEADMASTER', 'PRINCIPAL', 'STAFF', 'DEVELOPER'];

router.use(protect, tenantStatusGuard, tenantIsolationGuard);

router.get('/streams', restrictTo(...CCTV_VIEW_ROLES), cctvController.getStreams);
router.post('/streams', restrictTo(...CCTV_MANAGE_ROLES), cctvController.createStream);
router.get('/streams/:id', restrictTo(...CCTV_VIEW_ROLES), cctvController.getStreamById);
router.patch('/streams/:id/status', restrictTo(...CCTV_MANAGE_ROLES), cctvController.updateStreamStatus);

router.get('/events', restrictTo(...CCTV_VIEW_ROLES), cctvController.getGateEvents);
router.post('/events', restrictTo(...CCTV_MANAGE_ROLES), cctvController.recordGateEvent);
router.patch('/events/:id/flag', restrictTo(...CCTV_MANAGE_ROLES), cctvController.toggleFlagEvent);

router.get('/stats', restrictTo(...CCTV_VIEW_ROLES), cctvController.getStats);

module.exports = router;