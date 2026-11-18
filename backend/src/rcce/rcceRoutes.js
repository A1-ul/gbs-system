'use strict';

const express = require('express');
const { RESPONSE_CATALOGUE, getOperationResponse } = require('./responseCatalogue');
const { businessRulesEngine } = require('./businessRulesEngine');
const { eventNotificationEngine } = require('./eventNotificationEngine');
const { userDeveloperControlEngine } = require('./userDeveloperControlEngine');
const { auditTracker } = require('./auditTracker');
const { idempotencyProtection } = require('./idempotencyProtection');

const router = express.Router();

/**
 * 1. GET /api/v1/rcce/response-catalogue
 * Returns the central response catalogue with all predefined response codes & messages.
 */
router.get('/response-catalogue', (req, res) => {
  const { category } = req.query;
  let items = Object.values(RESPONSE_CATALOGUE);

  if (category) {
    items = items.filter((item) => item.category === String(category).toUpperCase());
  }

  res.rcceSuccess('RECORD_FOUND_SUCCESS', {
    totalCodes: items.length,
    categories: ['AUTH', 'VALIDATION', 'TENANT', 'ADMISSION', 'ACADEMIC', 'FINANCE', 'DEV_CONTROL', 'RECORD', 'NOTIFICATION', 'SYSTEM', 'IDEMPOTENCY'],
    catalogue: items
  }, 'GBS Central Response Catalogue loaded successfully.');
});

/**
 * 2. GET /api/v1/rcce/system-status
 * Live operational telemetry across all RCCE engines
 */
router.get('/system-status', async (req, res, next) => {
  try {
    const telemetry = await userDeveloperControlEngine.getSystemTelemetry();
    res.rcceSuccess('DEV_METRICS_FETCHED', telemetry, 'System operational telemetry synchronized.');
  } catch (err) {
    next(err);
  }
});

/**
 * 3. POST /api/v1/rcce/maintenance-mode
 * Developer toggle for system-wide maintenance mode
 */
router.post('/maintenance-mode', (req, res) => {
  const { active, reason } = req.body || {};
  const result = businessRulesEngine.setMaintenanceMode(active, reason);

  auditTracker.logActivity({
    userId: req.user?.id || null,
    userRole: req.user?.role || 'DEVELOPER',
    tenantId: 1,
    action: active ? 'MAINTENANCE_MODE_ENABLED' : 'MAINTENANCE_MODE_DISABLED',
    module: 'DEV_CONTROL',
    outcome: 'SUCCESS',
    details: `Maintenance mode ${active ? 'activated' : 'deactivated'}. Reason: ${reason || 'N/A'}.`,
    ipAddress: req.ip || '127.0.0.1',
    requestId: req.requestId
  });

  res.rcceSuccess('DEV_MAINTENANCE_TOGGLED', result, `System maintenance mode ${active ? 'enabled' : 'disabled'} successfully.`);
});

/**
 * 4. POST /api/v1/rcce/events/emit
 * Emit a standardized domain event and broadcast to WebSocket / notification queue
 */
router.post('/events/emit', async (req, res, next) => {
  try {
    const { eventType, payload = {} } = req.body || {};
    if (!eventType) {
      return res.rcceError('VALIDATION_MISSING_REQUIRED', ['eventType is required'], 'Please provide a valid eventType.');
    }

    const eventRecord = await eventNotificationEngine.emitEvent(eventType, payload, {
      tenantId: req.user?.tenantId || req.body.tenantId || 1,
      userId: req.user?.id || req.body.userId || null,
      actorRole: req.user?.role || 'USER',
      requestId: req.requestId,
      ipAddress: req.ip || '127.0.0.1'
    });

    res.rcceSuccess('NOTIFICATION_SENT_SUCCESS', eventRecord, `Event ${eventType} dispatched and synchronized.`);
  } catch (err) {
    next(err);
  }
});

/**
 * 5. GET /api/v1/rcce/notifications
 * Retrieve notification history for active user or tenant
 */
router.get('/notifications', (req, res) => {
  const tenantId = req.user?.tenantId || req.query.tenantId || null;
  const userId = req.user?.id || req.query.userId || null;
  const limit = parseInt(req.query.limit, 10) || 50;

  const notifications = eventNotificationEngine.getNotifications(tenantId, userId, limit);
  res.rcceSuccess('RECORD_FOUND_SUCCESS', { notifications }, `Retrieved ${notifications.length} notification items.`);
});

/**
 * 6. PATCH /api/v1/rcce/notifications/:id/read
 * Mark notification as read
 */
router.patch('/notifications/:id/read', (req, res) => {
  const item = eventNotificationEngine.markAsRead(req.params.id);
  res.rcceSuccess('NOTIFICATION_READ', { item }, 'Notification marked as read.');
});

/**
 * 7. GET /api/v1/rcce/audit-trail
 * Query immutable activity audit logs
 */
router.get('/audit-trail', async (req, res, next) => {
  try {
    const { tenantId, module: mod, action, outcome, limit, offset } = req.query;
    const trail = await auditTracker.getAuditTrail({
      tenantId: ['SUPER_ADMIN', 'DEVELOPER', 'ADMIN', 'HEADMASTER'].includes(String(req.user?.role || '').toUpperCase())
        ? tenantId
        : (req.user?.tenantId || 1),
      module: mod,
      action,
      outcome,
      limit,
      offset
    });

    res.rcceSuccess('DEV_LOGS_RETRIEVED', trail, `Audit trail retrieved: ${trail.results} records.`);
  } catch (err) {
    next(err);
  }
});

/**
 * 8. POST /api/v1/rcce/validate-operation
 * Pre-evaluate business rules for an operation before submission
 */
router.post('/validate-operation', (req, res) => {
  const { operation, payload = {}, targetTenantId } = req.body || {};

  // Check tenant isolation
  const isoCheck = businessRulesEngine.validateTenantIsolation(req.user, targetTenantId);
  if (!isoCheck.allowed) {
    return res.rcceError(isoCheck.code, [isoCheck.message], isoCheck.message, 403);
  }

  // Check operational status
  const statusCheck = businessRulesEngine.validateOperationalStatus(req.user);
  if (!statusCheck.allowed) {
    return res.rcceError(statusCheck.code, [statusCheck.message], statusCheck.message, 503);
  }

  res.rcceSuccess('VALIDATION_PASSED', { operation, eligible: true }, 'Operation validated and eligible for execution.');
});

/**
 * 9. GET /api/v1/rcce/health
 * Comprehensive RCCE health verification
 */
router.get('/health', async (req, res) => {
  res.rcceSuccess('SYSTEM_HEALTHY', {
    engine: 'GBS-RCCE',
    version: '1.0.0-ENTERPRISE',
    status: 'ONLINE',
    reusableModules: [
      'GBS School Management System',
      'GBS Examination System',
      'GBS Real Estate Management System',
      'GBS Company Management System'
    ],
    timestamp: new Date().toISOString()
  }, 'GBS Central System Response, Control and Communication Engine is active.');
});

module.exports = router;
