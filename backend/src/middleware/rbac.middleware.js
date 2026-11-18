const { AppError } = require('./error.middleware');
const { isDemoSandboxRequest } = require('./demoLimit.middleware');

const HEADMASTER_ADMIN_ROLES = ['ADMIN', 'SUPER_ADMIN', 'HEADMASTER', 'PRINCIPAL'];

const normalizeRole = (role) => String(role || '').trim().toUpperCase();

const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError('User not authenticated.', 401));
    }

    const userRole = normalizeRole(req.user.role);

    // Demo Headmaster / Admin walkthrough users move freely across all walkthrough portals without permission popups
    if (HEADMASTER_ADMIN_ROLES.includes(userRole) && isDemoSandboxRequest(req)) {
      return next();
    }

    // Explicit Demo Walkthrough GET exploration when user opted into Demo Sandbox mode (without bypassing Student/Parent write guards)
    const explicitDemoHeader = String(req.headers?.['x-gbs-mode'] || '').trim().toUpperCase() === 'DEMO_SANDBOX';
    if (explicitDemoHeader && req.method === 'GET' && isDemoSandboxRequest(req) && !req.originalUrl.includes('/payments/reports/')) {
      return next();
    }

    // HEADMASTER, PRINCIPAL, ADMIN, SUPER_ADMIN share institutional headmaster privileges, and DEVELOPER has root access
    const effectiveRoles = roles.map(normalizeRole);
    const hasAdminTier = effectiveRoles.some((r) => HEADMASTER_ADMIN_ROLES.includes(r));
    if (hasAdminTier) {
      for (const adminRole of HEADMASTER_ADMIN_ROLES) {
        if (!effectiveRoles.includes(adminRole)) effectiveRoles.push(adminRole);
      }
      if (!effectiveRoles.includes('DEVELOPER')) effectiveRoles.push('DEVELOPER');
    }

    if (userRole === 'DEVELOPER') {
      return next();
    }

    if (!effectiveRoles.includes(userRole)) {
      return next(new AppError('You do not have permission to perform this action.', 403));
    }
    next();
  };
};

const requirePermission = (permission) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError('User not authenticated.', 401));
    }
    const userRole = normalizeRole(req.user.role);
    if (
      HEADMASTER_ADMIN_ROLES.includes(userRole) ||
      userRole === 'DEVELOPER'
    ) {
      return next();
    }
    if (!req.user.permissions || (!req.user.permissions.includes('*') && !req.user.permissions.includes(permission))) {
      return next(new AppError(`Permission required: ${permission}`, 403));
    }
    next();
  };
};

module.exports = {
  restrictTo,
  requirePermission,
  HEADMASTER_ADMIN_ROLES
};
