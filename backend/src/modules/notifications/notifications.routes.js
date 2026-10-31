'use strict';

const express = require('express');
const router = express.Router();
const controller = require('./notifications.controller');
const { protect } = require('../../middleware/auth.middleware');
const { restrictTo } = require('../../middleware/rbac.middleware');
const { tenantStatusGuard, tenantIsolationGuard } = require('../../middleware/tenant.middleware');

// Public/status check
router.get('/status', controller.getStatus);

// All protected routes
router.use(protect);
router.use(tenantStatusGuard);
router.use(tenantIsolationGuard);

// User In-App Notifications
router.get('/my-notifications', controller.getMyNotifications);
router.patch('/my-notifications/:id/read', controller.markNotificationRead);

// Dispatch Queue Management & Telemetry
router.get('/telemetry', restrictTo('SUPER_ADMIN', 'ADMIN', 'DEVELOPER'), controller.getTelemetry);
router.get('/queue', restrictTo('SUPER_ADMIN', 'ADMIN', 'DEVELOPER', 'STAFF'), controller.getQueueItems);
router.post('/queue', restrictTo('SUPER_ADMIN', 'ADMIN', 'DEVELOPER', 'TEACHER', 'STAFF'), controller.queueNotification);
router.post('/process-queue', restrictTo('SUPER_ADMIN', 'ADMIN', 'DEVELOPER'), controller.processQueue);

// Templates
router.get('/templates', controller.getTemplates);
router.post('/templates', restrictTo('SUPER_ADMIN', 'ADMIN', 'DEVELOPER'), controller.createTemplate);

module.exports = router;
