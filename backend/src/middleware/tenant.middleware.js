const { AppError } = require('./error.middleware');
const { isTenantLockedOut } = require('../core/database/persistentStore');

/**
 * Enterprise Multi-Tenant Data Isolation Guard
 * Enforces strict boundary isolation:
 * Tenant A can NEVER access or mutate records belonging to Tenant B.
 */
const tenantIsolationGuard = (req, res, next) => {
  if (!req.user) {
    return next(new AppError('Authentication required for tenant isolation verification.', 401));
  }

  // Developer and platform super admin may access global management endpoints
  if (req.user.role === 'DEVELOPER' || req.user.role === 'SUPER_ADMIN') {
    req.tenantId = req.query?.tenantId ? parseInt(req.query.tenantId, 10) : (req.user.tenantId || 1);
    return next();
  }

  const userTenantId = req.user.tenantId;
  if (!userTenantId) {
    return next(new AppError('User is not associated with an authorized tenant.', 403));
  }

  // Check if client attempted to tamper with tenantId in params, query, or body
  const requestedTenantId = req.params.tenantId || req.query.tenantId || req.body.tenantId;

  if (requestedTenantId && parseInt(requestedTenantId, 10) !== userTenantId) {
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
const tenantStatusGuard = (req, res, next) => {
  if (req.user && req.user.role === 'DEVELOPER') {
    return next(); // Developer always has access for management and recovery
  }

  const tenant = req.user?.tenant;
  if (req.tenantId && req.tenantId !== 1 && isTenantLockedOut({ id: req.tenantId, code: tenant?.code, name: tenant?.name })) {
    return next(new AppError('Access Denied: Your institution has been permanently deleted from the GBS System.', 403));
  }
  if (tenant) {
    if (tenant.isDeleted || tenant.status === 'DELETED' || tenant.status === 'ARCHIVED_DELETED' || tenant.status === 'PURGED') {
      return next(new AppError('Access Denied: Your institution has been permanently deleted from the GBS System.', 403));
    }
    if (tenant.status === 'PENDING_DEVELOPER_APPROVAL' || tenant.status === 'PENDING_APPROVAL' || tenant.isApproved === false) {
      return next(new AppError('Access Denied: Your institution is awaiting Developer approval.', 403));
    }
    if (tenant.status === 'LOCKED') {
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
