const jwt = require('jsonwebtoken');
const envConfig = require('../core/config/env.config');
const prisma = require('../core/database/prisma.client');
const { AppError } = require('./error.middleware');
const {
  readPersistentStore,
  isTenantLockedOut,
  isPermanentlyDeleted
} = require('../core/database/persistentStore');

const ROLE_DEFAULT_IDS = {
  SUPER_ADMIN: 1,
  ADMIN: 1,
  TEACHER: 2,
  STUDENT: 3,
  PARENT: 4,
  ACCOUNTANT: 5,
  STAFF: 6,
  HR: 7,
  ALUMNI: 8
};

const toNumericId = (val, fallback = 1) => {
  if (typeof val === 'number' && Number.isFinite(val)) return Math.trunc(val);
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (trimmed === 'tnt_master_default') return 1;
    const parsed = parseInt(trimmed, 10);
    if (!Number.isNaN(parsed) && String(parsed) === trimmed) return parsed;
    const digits = trimmed.replace(/\D/g, '');
    if (digits.length > 0) return parseInt(digits.slice(-7), 10) || fallback;
    if (trimmed.length > 0) {
      let hash = 0;
      for (let i = 0; i < trimmed.length; i++) {
        hash = ((hash << 5) - hash + trimmed.charCodeAt(i)) | 0;
      }
      return (Math.abs(hash) % 8900000) + 1000;
    }
  }
  return fallback;
};

const protect = async (req, res, next) => {
  try {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies && req.cookies.jwt) {
      token = req.cookies.jwt;
    }

    if (!token) {
      return next(new AppError('Authentication required. Please log in.', 401));
    }

    const decoded = jwt.verify(token, envConfig.jwt.secret);

    if (decoded.role === 'DEVELOPER') {
      req.user = {
        id: 1,
        role: 'DEVELOPER',
        username: decoded.devId || decoded.username || 'gbs_developer',
        permissions: ['*'],
        tenantId: 1
      };
      req.tenantId = 1;
      return next();
    }

    const fallbackId = ROLE_DEFAULT_IDS[decoded.role] || 1;
    const numericUserId = toNumericId(decoded.id, fallbackId);
    const numericTenantId = toNumericId(decoded.tenantId, 1);

    if (
      isPermanentlyDeleted(decoded.id) ||
      (numericTenantId !== 1 && isTenantLockedOut({ id: decoded.tenantId, tenantId: numericTenantId }))
    ) {
      return next(new AppError('Access Denied: Your institution or user account has been permanently deleted from the GBS System.', 403));
    }

    const store = readPersistentStore();
    if (numericTenantId !== 1 && Array.isArray(store.institutions)) {
      const matchedInst = store.institutions.find(
        (inst) =>
          String(inst.id) === String(decoded.tenantId) ||
          String(inst.tenantId) === String(numericTenantId) ||
          String(inst.tenantUid) === String(decoded.tenantId) ||
          String(inst.tenantCode) === String(decoded.tenantId)
      );
      if (matchedInst) {
        const st = String(matchedInst.status || '').toUpperCase();
        if (matchedInst.isDeleted || st === 'DELETED' || st === 'ARCHIVED_DELETED' || st === 'PURGED') {
          return next(new AppError('Access Denied: Your institution has been permanently deleted from the GBS System.', 403));
        }
        if (st === 'REJECTED' || st === 'PENDING_DEVELOPER_APPROVAL' || st === 'PENDING_APPROVAL' || matchedInst.isApproved === false) {
          return next(new AppError('Access Denied: Your institution has not been approved by the System Developer.', 403));
        }
      }
    }

    let user = null;
    try {
      user = await prisma.user.findUnique({
        where: { id: numericUserId },
        include: { tenant: true }
      });
    } catch { }

    if (!user) {
      user = {
        id: numericUserId,
        tenantId: numericTenantId,
        firstName: decoded.role || 'Portal',
        lastName: 'User',
        username: (decoded.role || 'user').toLowerCase(),
        email: `${(decoded.role || 'user').toLowerCase()}@gbs.com`,
        role: decoded.role || 'ADMIN',
        permissions: ['*'],
        isActive: true,
        isLocked: false,
        isDeleted: false,
        tenant: {
          id: numericTenantId,
          name: 'GBS International School (Main Campus)',
          code: 'GBS-MAIN',
          isActive: true,
          status: 'ACTIVE'
        }
      };
    }

    if (user.isLocked || user.isDeleted || user.isActive === false || isPermanentlyDeleted(user.id)) {
      return next(new AppError('User account is suspended, locked, or permanently deleted.', 403));
    }

    if (
      user.tenant &&
      (user.tenant.isDeleted ||
        user.tenant.isActive === false ||
        user.tenant.status === 'LOCKED' ||
        user.tenant.status === 'DELETED' ||
        user.tenant.status === 'ARCHIVED_DELETED' ||
        (user.tenant.id !== 1 && isTenantLockedOut({ id: user.tenant.id, code: user.tenant.code, name: user.tenant.name })))
    ) {
      return next(new AppError('Access Denied: Tenant account is locked, suspended, or permanently deleted.', 403));
    }

    user.id = toNumericId(user.id, fallbackId);
    user.tenantId = toNumericId(user.tenantId, 1);
    req.user = user;
    req.tenantId = user.tenantId;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return next(new AppError('Invalid or expired authentication token. Please log in again.', 401));
    }
    next(error);
  }
};

module.exports = {
  protect
};
