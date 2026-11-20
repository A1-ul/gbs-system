'use strict';

const express = require('express');
const { RESPONSE_CATALOGUE } = require('./responseCatalogue');
const { businessRulesEngine } = require('./businessRulesEngine');
const { eventNotificationEngine } = require('./eventNotificationEngine');
const { userDeveloperControlEngine } = require('./userDeveloperControlEngine');
const { auditTracker } = require('./auditTracker');
const { protect } = require('../middleware/auth.middleware');
const { restrictTo } = require('../middleware/rbac.middleware');
const { readPersistentStore } = require('../core/database/persistentStore');
const { getDemoUsageSummary } = require('../middleware/demoLimit.middleware');
const prisma = require('../core/database/prisma.client');
const { connectionPoolManager } = require('../core/database/connectionPoolManager');
const { cloudInfraManager } = require('../core/infrastructure/cloudInfraManager');

const router = express.Router();

const DEV_AND_SUPER_ROLES = ['DEVELOPER', 'SUPER_ADMIN'];
const MANAGEMENT_ROLES = ['DEVELOPER', 'SUPER_ADMIN', 'ADMIN', 'HEADMASTER', 'PRINCIPAL'];

/**
 * Strict role gate with ZERO Demo-Admin bypass for sensitive global RCCE controls
 * (maintenance mode, global error monitor, privacy inspection).
 */
const requireExactRoles = (...allowedRoles) => (req, res, next) => {
  const role = String(req.user?.role || '').trim().toUpperCase();
  if (!role || !allowedRoles.includes(role)) {
    return res.rcceError(
      'AUTH_FORBIDDEN',
      [{ message: 'You do not have permission to perform this operation.' }],
      'You do not have permission to perform this operation.',
      403
    );
  }
  return next();
};

/**
 * 1. GET /api/v1/rcce/response-catalogue (and alias /catalogue)
 */
const handleGetCatalogue = (req, res) => {
  const { category } = req.query;
  let items = Object.values(RESPONSE_CATALOGUE);

  if (category && String(category).toUpperCase() !== 'ALL') {
    items = items.filter((item) => item.category === String(category).toUpperCase());
  }

  const categories = Array.from(new Set(Object.values(RESPONSE_CATALOGUE).map((i) => i.category)));

  res.rcceSuccess('RECORD_FOUND_SUCCESS', {
    totalCodes: items.length,
    categories,
    catalogue: items
  }, 'GBS Central Response Catalogue loaded successfully.');
};

router.get('/response-catalogue', handleGetCatalogue);
router.get('/catalogue', handleGetCatalogue);

/**
 * 2. GET /api/v1/rcce/health
 */
router.get('/health', (req, res) => {
  const maint = businessRulesEngine.getMaintenanceState();
  res.rcceSuccess('SYSTEM_HEALTHY', {
    engine: 'GBS-RCCE',
    version: '2.0.0-ENTERPRISE',
    status: maint.active ? 'MAINTENANCE' : 'ONLINE',
    maintenance: maint,
    reusableProducts: [
      'GBS School Management System',
      'GBS Examination System',
      'GBS Real Estate Management System',
      'GBS Company Management System'
    ],
    timestamp: new Date().toISOString()
  }, 'GBS Central System Response, Control and Communication Engine is operational.');
});

/**
 * 3. GET /api/v1/rcce/demo-limits
 * Public/tenant-aware visibility into Demo 10-entry trial counts vs Live unlimited status
 */
router.get('/demo-limits', (req, res) => {
  res.rcceSuccess('RECORD_FOUND_SUCCESS', getDemoUsageSummary(), 'Demo Sandbox 10-entry trial summary retrieved.');
});

/**
 * 4. GET /api/v1/rcce/system-status
 * Authorized Telemetry across RCCE engines, PostgreSQL/Standby, and Tenancy
 */
router.get('/system-status', protect, restrictTo(...MANAGEMENT_ROLES), async (req, res, next) => {
  try {
    const telemetry = await userDeveloperControlEngine.getSystemTelemetry();
    res.rcceSuccess('DEV_METRICS_FETCHED', telemetry, 'System operational telemetry synchronized.');
  } catch (err) {
    next(err);
  }
});

/**
 * 5. POST /api/v1/rcce/maintenance-mode
 * Developer / Super Admin toggle for system-wide maintenance mode
 */
router.post('/maintenance-mode', protect, requireExactRoles(...DEV_AND_SUPER_ROLES), async (req, res) => {
  const body = req.body || {};
  const nextActive = body.active !== undefined ? Boolean(body.active) : Boolean(body.enabled);
  const reason = body.reason || (nextActive ? 'Scheduled system maintenance' : 'Normal service restored');
  const result = businessRulesEngine.setMaintenanceMode(nextActive, reason, req.user);

  req.__rcceAuditLogged = true;
  await auditTracker.logActivity({
    userId: req.user?.id || null,
    userRole: req.user?.role || 'DEVELOPER',
    tenantId: 1,
    action: nextActive ? 'MAINTENANCE_MODE_ENABLED' : 'MAINTENANCE_MODE_DISABLED',
    module: 'DEV_CONTROL',
    outcome: 'SUCCESS',
    details: `Maintenance mode ${nextActive ? 'activated' : 'deactivated'}. Reason: ${reason}.`,
    ipAddress: req.ip || '127.0.0.1',
    requestId: req.requestId
  });

  await eventNotificationEngine.emitEvent(
    nextActive ? 'SYSTEM_ERROR_DETECTED' : 'RECORD_UPDATED',
    { message: `System maintenance mode ${nextActive ? 'enabled' : 'disabled'}: ${reason}` },
    { tenantId: 1, userId: req.user?.id || null, actorRole: req.user?.role || 'DEVELOPER', requestId: req.requestId }
  );

  res.rcceSuccess(
    'DEV_MAINTENANCE_TOGGLED',
    result,
    `System maintenance mode ${nextActive ? 'enabled' : 'disabled'} successfully.`
  );
});

/**
 * 6. POST /api/v1/rcce/events/emit (and alias POST /api/v1/rcce/events)
 */
const handleEmitEvent = async (req, res, next) => {
  try {
    const { eventType, payload = {} } = req.body || {};
    if (!eventType || !String(eventType).trim()) {
      return res.rcceError('VALIDATION_MISSING_REQUIRED', [{ field: 'eventType', message: 'eventType is required' }], 'Some required information is missing.');
    }

    const actorRole = String(req.user?.role || 'USER').toUpperCase();
    const targetTenantId = ['DEVELOPER', 'SUPER_ADMIN'].includes(actorRole)
      ? (req.body.tenantId || req.user?.tenantId || 1)
      : (req.user?.tenantId || 1);

    const eventRecord = await eventNotificationEngine.emitEvent(String(eventType).trim(), payload, {
      tenantId: targetTenantId,
      userId: req.user?.id || null,
      actorRole,
      requestId: req.requestId,
      ipAddress: req.ip || '127.0.0.1'
    });

    res.rcceSuccess('NOTIFICATION_SENT_SUCCESS', eventRecord, `Event ${eventType} dispatched and synchronized.`);
  } catch (err) {
    next(err);
  }
};

router.post('/events/emit', protect, handleEmitEvent);
router.post('/events', protect, handleEmitEvent);

/**
 * 7. GET /api/v1/rcce/notifications & PATCH /api/v1/rcce/notifications/:id/read
 */
router.get('/notifications', protect, (req, res) => {
  const actorRole = String(req.user?.role || '').toUpperCase();
  const isDev = DEV_AND_SUPER_ROLES.includes(actorRole);
  const tenantId = isDev ? (req.query.tenantId || null) : (req.user?.tenantId || 1);
  const userId = MANAGEMENT_ROLES.includes(actorRole) ? (req.query.userId || null) : req.user?.id;
  const limit = parseInt(req.query.limit, 10) || 50;

  const notifications = eventNotificationEngine.getNotifications(tenantId, userId, limit);
  res.rcceSuccess('RECORD_FOUND_SUCCESS', { notifications }, `Retrieved ${notifications.length} notification items.`);
});

router.patch('/notifications/:id/read', protect, (req, res) => {
  const item = eventNotificationEngine.markAsRead(req.params.id);
  if (!item) {
    return res.rcceError('RECORD_NOT_FOUND', [{ message: 'No matching notification was found.' }], 'No matching record was found.', 404);
  }
  res.rcceSuccess('NOTIFICATION_READ', { item }, 'Notification marked as read.');
});

/**
 * 8. GET /api/v1/rcce/audit-trail
 */
router.get('/audit-trail', protect, restrictTo(...MANAGEMENT_ROLES), async (req, res, next) => {
  try {
    const actorRole = String(req.user?.role || '').toUpperCase();
    const { tenantId, module: mod, action, outcome, status, limit, offset } = req.query;
    const scopedTenantId = DEV_AND_SUPER_ROLES.includes(actorRole) ? tenantId : (req.user?.tenantId || 1);

    const trail = await auditTracker.getAuditTrail({
      tenantId: scopedTenantId,
      module: mod,
      action,
      outcome: outcome || status,
      limit,
      offset
    });

    res.rcceSuccess(
      'DEV_LOGS_RETRIEVED',
      {
        ...trail,
        auditLogs: trail.logs
      },
      `Audit trail retrieved: ${trail.results} records.`
    );
  } catch (err) {
    next(err);
  }
});

/**
 * 9. GET /api/v1/rcce/error-monitor
 * Developer-only live error & blocked-request diagnostics monitor
 */
router.get('/error-monitor', protect, requireExactRoles(...DEV_AND_SUPER_ROLES), async (req, res, next) => {
  try {
    const [failedTrail, blockedTrail] = await Promise.all([
      auditTracker.getAuditTrail({ outcome: 'FAILED', limit: 30 }),
      auditTracker.getAuditTrail({ outcome: 'BLOCKED', limit: 30 })
    ]);
    const combined = [...failedTrail.logs, ...blockedTrail.logs]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 50);

    res.rcceSuccess('DEV_LOGS_RETRIEVED', {
      totalIssues: combined.length,
      failedCount: failedTrail.total,
      blockedCount: blockedTrail.total,
      errors: combined
    }, `System error monitor loaded: ${combined.length} recent issue records.`);
  } catch (err) {
    next(err);
  }
});

/**
 * 10. GET /api/v1/rcce/permission-matrix
 * Structured RBAC & privacy policy matrix across all 9 roles and 4 institution tiers
 */
router.get('/permission-matrix', protect, (req, res) => {
  const matrix = userDeveloperControlEngine.getPermissionMatrix();
  res.rcceSuccess('RECORD_FOUND_SUCCESS', {
    currentUserRole: req.user?.role || 'USER',
    ...matrix
  }, 'Role permission and privacy governance matrix retrieved.');
});

/**
 * 11. POST /api/v1/rcce/privacy-inspect
 * Strict audited Developer Privacy Gate: Developer must provide an explicit diagnostic reason
 * to inspect privacy-redacted user summaries. Never exposes passwords, PINs, card PAN/CVV, or tokens.
 */
router.post('/privacy-inspect', protect, requireExactRoles('DEVELOPER'), async (req, res) => {
  const { reason, query = '' } = req.body || {};
  const cleanReason = String(reason || '').trim();
  if (cleanReason.length < 5) {
    return res.rcceError(
      'DEV_PRIVACY_AUDIT_REQUIRED',
      [{ field: 'reason', message: 'A clear diagnostic reason (at least 5 characters) is mandatory before inspecting user records.' }],
      'Developer inspection of private user data requires an explicit audit reason.',
      403
    );
  }

  const store = readPersistentStore();
  const allUsers = [
    ...(Array.isArray(store.users) ? store.users : []),
    ...(Array.isArray(store.registeredUsers) ? store.registeredUsers : [])
  ];
  const q = String(query || '').trim().toLowerCase();
  const matched = q
    ? allUsers.filter((u) =>
      String(u.email || '').toLowerCase().includes(q) ||
      String(u.role || '').toLowerCase().includes(q) ||
      String(u.firstName || '').toLowerCase().includes(q) ||
      String(u.lastName || '').toLowerCase().includes(q)
    )
    : allUsers;

  const uniqueMap = new Map();
  for (const u of matched) {
    const key = String(u.email || u.id || Math.random());
    if (!uniqueMap.has(key)) {
      uniqueMap.set(key, userDeveloperControlEngine.sanitizeRecordForDeveloper(u, { maskedContact: true }));
    }
  }
  const sanitizedUsers = Array.from(uniqueMap.values()).slice(0, 30);

  req.__rcceAuditLogged = true;
  await userDeveloperControlEngine.logDeveloperSensitiveAccess(
    req.user,
    'USER_DIRECTORY',
    q || 'TENANT_SAMPLE',
    cleanReason,
    req.requestId
  );

  return res.rcceSuccess('DEV_PRIVACY_INSPECTED', {
    auditedReason: cleanReason,
    privacySeal: 'CREDENTIALS_AND_CONTACTS_MASKED',
    count: sanitizedUsers.length,
    users: sanitizedUsers
  }, `Retrieved ${sanitizedUsers.length} privacy-redacted user records. Access recorded in audit trail.`);
});

/**
 * 12. POST /api/v1/rcce/validate-operation
 * Pre-evaluate business rules for an operation before submission
 */
router.post('/validate-operation', protect, (req, res) => {
  const { operation, requiredFields = [], payload = {}, targetTenantId } = req.body || {};

  if (Array.isArray(requiredFields) && requiredFields.length > 0) {
    const fieldCheck = businessRulesEngine.validateRequiredFields(payload, requiredFields, operation || 'Operation');
    if (!fieldCheck.valid) {
      return res.rcceError(fieldCheck.code, [{ missing: fieldCheck.missing, message: fieldCheck.message }], fieldCheck.message, 400);
    }
  }

  const isoCheck = businessRulesEngine.validateTenantIsolation(req.user, targetTenantId);
  if (!isoCheck.allowed) {
    return res.rcceError(isoCheck.code, [{ message: isoCheck.message }], isoCheck.message, 403);
  }

  const statusCheck = businessRulesEngine.validateOperationalStatus(req.user);
  if (!statusCheck.allowed) {
    return res.rcceError(statusCheck.code, [{ message: statusCheck.message }], statusCheck.message, 503);
  }

  res.rcceSuccess('VALIDATION_PASSED', { operation, eligible: true }, 'Operation validated and eligible for execution.');
});

/**
 * 13. GET /api/v1/rcce/pool-status
 * Real-time PostgreSQL Connection Pool & PgBouncer Telemetry
 */
router.get('/pool-status', async (req, res, next) => {
  try {
    if (typeof prisma.getPostgresLiveStatus === 'function') {
      await prisma.getPostgresLiveStatus(false);
    }
    const pool = connectionPoolManager.getPoolStatus();
    const code =
      pool.alertLevel === 'CRITICAL_95'
        ? 'DB_POOL_CRITICAL_95'
        : pool.alertLevel === 'WARNING_80'
          ? 'DB_POOL_WARNING_80'
          : 'DB_POOL_HEALTHY';
    res.rcceSuccess(code, pool);
  } catch (err) {
    next(err);
  }
});

/**
 * 14. POST /api/v1/rcce/pool-simulate-threshold
 * Controlled verification of 80% warning and 95% critical connection pool alerts
 */
router.post('/pool-simulate-threshold', protect, restrictTo(...MANAGEMENT_ROLES), async (req, res, next) => {
  try {
    const targetPct = Number(req.body?.utilizationPct ?? 85);
    const result = connectionPoolManager.simulateUtilizationThreshold(targetPct);
    if (result.criticalTriggered) {
      await eventNotificationEngine.emitEvent('DB_POOL_CRITICAL_95', result, {
        tenantId: 1,
        userId: req.user?.id || null,
        actorRole: req.user?.role || 'DEVELOPER',
        requestId: req.requestId
      });
      return res.rcceSuccess('DB_POOL_CRITICAL_95', result, result.alert?.message);
    }
    if (result.warningTriggered) {
      await eventNotificationEngine.emitEvent('DB_POOL_WARNING_80', result, {
        tenantId: 1,
        userId: req.user?.id || null,
        actorRole: req.user?.role || 'DEVELOPER',
        requestId: req.requestId
      });
      return res.rcceSuccess('DB_POOL_WARNING_80', result, result.alert?.message);
    }
    return res.rcceSuccess('DB_POOL_HEALTHY', result);
  } catch (err) {
    next(err);
  }
});

/**
 * 15. GET /api/v1/rcce/infrastructure-audit
 * Complete Render.com & PostgreSQL Cloud Infrastructure, Capacity, Storage & Performance Report
 */
router.get('/infrastructure-audit', async (req, res, next) => {
  try {
    const report = await cloudInfraManager.getComprehensiveInfrastructureReport(prisma);
    res.rcceSuccess('INFRA_AUDIT_COMPLETED', report);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
