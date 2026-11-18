const { AppError } = require('./error.middleware');
const { isTenantLockedOut } = require('../core/database/persistentStore');
const { isDemoSandboxRequest } = require('./demoLimit.middleware');

const normalizeTenantNumeric = (val) => {
  if (val === undefined || val === null || val === '') return null;
  const trimmed = String(val).trim();
  if (!trimmed) return null;
  if (trimmed === 'tnt_master_default') return 1;
  const n = parseInt(trimmed, 10);
  return Number.isNaN(n) ? trimmed : n;
};

/**
 * Enterprise Multi-Tenant Data Isolation Guard
 * Enforces strict boundary isolation:
 * Tenant A can NEVER access or mutate records belonging to Tenant B.
 */
const tenantIsolationGuard = (req, res, next) => {
  if (!req.user) {
    return next(new AppError('Authentication required for tenant isolation verification.', 401));
  }

  const userRole = String(req.user.role || '').trim().toUpperCase();
  const isHeadmasterAdmin = ['DEVELOPER', 'SUPER_ADMIN', 'ADMIN', 'HEADMASTER', 'PRINCIPAL'].includes(userRole);

  // Demo Headmaster/Admin walkthroughs explore tenant 1 freely without false isolation locks
  if (isHeadmasterAdmin && isDemoSandboxRequest(req)) {
    req.tenantId = normalizeTenantNumeric(req.query?.tenantId) || 1;
    return next();
  }

  // Developer, Headmaster/Admin, and Super Admin may access institutional management endpoints
  if (isHeadmasterAdmin) {
    const qTid = normalizeTenantNumeric(req.query?.tenantId);
    req.tenantId = typeof qTid === 'number' ? qTid : (normalizeTenantNumeric(req.user.tenantId) || 1);
    return next();
  }

  const userTenantId = normalizeTenantNumeric(req.user.tenantId);
  if (!userTenantId) {
    return next(new AppError('User is not associated with an authorized tenant.', 403));
  }

  // Check if client attempted to tamper with tenantId in params, query, or body
  const requestedTenantId = normalizeTenantNumeric(
    req.params.tenantId || req.query.tenantId || req.body?.tenantId
  );

  if (requestedTenantId !== null && String(requestedTenantId) !== String(userTenantId)) {
    return next(new AppError('Cross-tenant access forbidden. You cannot query or modify data belonging to another tenant.', 403));
  }

  // Force tenantId strictly to authenticated user's tenantId
  req.tenantId = userTenantId;
  if (req.body && typeof req.body === 'object') {
    req.body.tenantId = userTenantId;
  }

  next();
};

/**
 * Tenant Subscription Status Guard
 * Validates tenant active / trial / grace period status
 */
const tenantStatusGuard = async (req, res, next) => {
  const userRole = String(req.user?.role || '').trim().toUpperCase();
  if (
    isDemoSandboxRequest(req) ||
    (req.user && ['DEVELOPER', 'SUPER_ADMIN', 'ADMIN', 'HEADMASTER'].includes(userRole))
  ) {
    return next(); // Demo Sandbox, Developer, and Headmaster/Admin remain accessible for management and recovery
  }

  const tid = req.user?.tenantId || req.tenantId;
  let tenant = req.user?.tenant;

  if (!tenant && tid && tid !== 1) {
    try {
      const prisma = require('../core/database/prisma.client');
      tenant = await prisma.tenant.findUnique({
        where: { id: Number(tid) }
      });
    } catch (_) { }
  }

  if (tid && tid !== 1 && isTenantLockedOut({ id: tid, code: tenant?.code, name: tenant?.name })) {
    return next(new AppError('Access Denied: Your institution has been permanently deleted from the GBS System.', 403));
  }
  if (tenant) {
    if (tenant.isDeleted || tenant.status === 'DELETED' || tenant.status === 'ARCHIVED_DELETED' || tenant.status === 'PURGED') {
      return next(new AppError('Access Denied: Your institution has been permanently deleted from the GBS System.', 403));
    }
    if (tenant.status === 'PENDING_DEVELOPER_APPROVAL' || tenant.status === 'PENDING_APPROVAL' || tenant.isApproved === false) {
      return next(new AppError('Access Denied: Your institution is awaiting Developer approval.', 403));
    }
    if (tenant.status === 'LOCKED' || tenant.isLocked === true) {
      return next(new AppError('Tenant system is locked due to expired subscription. Please contact administration.', 403));
    }
    if (tenant.status === 'SUSPENDED') {
      return next(new AppError('Tenant account is suspended by developer platform.', 403));
    }
  }

  next();
};

module.exports = {
  tenantIsolationGuard,
  tenantStatusGuard
};
