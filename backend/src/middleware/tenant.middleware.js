const { AppError } = require('./error.middleware');

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
  if (tenant) {
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
