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
    const effectiveRoles = roles.map(normalizeRole);

    // STRICT SECURITY BOUNDARY: Developer Control Center & DEVELOPER-only routes MUST NEVER be bypassed by institutional or demo accounts
    const isDeveloperOnlyRoute =
      String(req.originalUrl || '').includes('/dev-control') ||
      (effectiveRoles.length === 1 && effectiveRoles[0] === 'DEVELOPER');

    if (isDeveloperOnlyRoute) {
      if (effectiveRoles.includes(userRole)) {
        return next();
      }
      if (userRole === 'DEVELOPER') {
        return next();
      }
      return next(new AppError('Access Denied: System Developer privileges are required for this endpoint.', 403));
    }

    // Strict Clinic medical operations (Doctor/Nurse exclusive) must not be bypassed by Headmaster demo walkthrough
    const isClinicExclusiveRoute =
      effectiveRoles.length > 0 &&
      effectiveRoles.every((r) => ['CLINIC_DOCTOR', 'CLINIC_NURSE', 'DOCTOR', 'NURSE', 'DEVELOPER'].includes(r));

    // Demo Headmaster / Admin walkthrough users move freely across institutional walkthrough portals without permission popups
    if (HEADMASTER_ADMIN_ROLES.includes(userRole) && isDemoSandboxRequest(req) && !isClinicExclusiveRoute) {
      return next();
    }

    // Explicit Demo Walkthrough GET exploration when user opted into Demo Sandbox mode (without bypassing Student/Parent write guards or Developer/Clinic boundaries)
    const explicitDemoHeader = String(req.headers?.['x-gbs-mode'] || '').trim().toUpperCase() === 'DEMO_SANDBOX';
    if (
      explicitDemoHeader &&
      req.method === 'GET' &&
      isDemoSandboxRequest(req) &&
      !isClinicExclusiveRoute &&
      !req.originalUrl.includes('/payments/reports/')
    ) {
      return next();
    }

    // HEADMASTER, PRINCIPAL, ADMIN, SUPER_ADMIN share institutional headmaster privileges, and DEVELOPER has root access
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
