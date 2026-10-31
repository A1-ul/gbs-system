'use strict';

const express = require('express');
const router = express.Router();
const controller = require('./workflow.controller');
const { protect } = require('../../middleware/auth.middleware');
const { restrictTo } = require('../../middleware/rbac.middleware');
const { tenantStatusGuard, tenantIsolationGuard } = require('../../middleware/tenant.middleware');

// Public/status check
router.get('/status', controller.getStatus);

// Protected routes
router.use(protect);
router.use(tenantStatusGuard);
router.use(tenantIsolationGuard);

// Telemetry & Execution History
router.get('/telemetry', restrictTo('SUPER_ADMIN', 'ADMIN', 'DEVELOPER'), controller.getTelemetry);
router.get('/executions', restrictTo('SUPER_ADMIN', 'ADMIN', 'DEVELOPER'), controller.getExecutions);

// Event Trigger Hook (Authorized roles or service integrations can fire events)
router.post('/trigger', restrictTo('SUPER_ADMIN', 'ADMIN', 'DEVELOPER', 'TEACHER', 'STAFF'), controller.triggerEvent);

// Rules CRUD
router.route('/rules')
  .get(controller.getRules)
  .post(restrictTo('SUPER_ADMIN', 'ADMIN', 'DEVELOPER'), controller.createRule);

router.route('/rules/:id')
  .put(restrictTo('SUPER_ADMIN', 'ADMIN', 'DEVELOPER'), controller.updateRule)
  .delete(restrictTo('SUPER_ADMIN', 'ADMIN', 'DEVELOPER'), controller.deleteRule);

module.exports = router;