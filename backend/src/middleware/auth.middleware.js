const jwt = require('jsonwebtoken');
const envConfig = require('../core/config/env.config');
const prisma = require('../core/database/prisma.client');
const { AppError } = require('./error.middleware');

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
        id: decoded.id || 0,
        role: 'DEVELOPER',
        username: decoded.devId || decoded.username || 'gbs_developer',
        permissions: ['*'],
        tenantId: null
      };
      req.tenantId = null;
      return next();
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      include: { tenant: true }
    });

    if (!user) {
      return next(new AppError('The user belonging to this token no longer exists.', 401));
    }

    if (!user.isActive || user.isLocked || user.isDeleted) {
      return next(new AppError('User account is suspended, locked, or deactivated.', 403));
    }

    if (user.tenant && (!user.tenant.isActive || user.tenant.status === 'LOCKED')) {
      return next(new AppError('Tenant account is currently locked or suspended.', 403));
    }

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
