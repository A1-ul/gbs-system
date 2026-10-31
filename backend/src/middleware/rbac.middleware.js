const { AppError } = require('./error.middleware');

const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError('User not authenticated.', 401));
    }
    // SUPER_ADMIN and DEVELOPER inherit ADMIN privileges
    const effectiveRoles = [...roles];
    if (effectiveRoles.includes('ADMIN')) {
      if (!effectiveRoles.includes('SUPER_ADMIN')) effectiveRoles.push('SUPER_ADMIN');
      if (!effectiveRoles.includes('DEVELOPER')) effectiveRoles.push('DEVELOPER');
    }
    if (!effectiveRoles.includes(req.user.role)) {
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
    if (req.user.role === 'SUPER_ADMIN' || req.user.role === 'DEVELOPER') {
      return next();
    }
    if (!req.user.permissions || !req.user.permissions.includes(permission)) {
      return next(new AppError(`Permission required: ${permission}`, 403));
    }
    next();
  };
};

module.exports = {
  restrictTo,
  requirePermission
};
