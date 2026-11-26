const envConfig = require('../core/config/env.config');

class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

const errorHandler = (err, req, res, next) => {
  const rawMessage = String(err.message || 'Something went wrong on the server');
  const lower = rawMessage.toLowerCase();
  const isPrismaErr = lower.includes('prisma') || (err.name && err.name.includes('Prisma'));

  let resolvedStatus = err.statusCode && err.statusCode >= 400 && err.statusCode < 600 ? err.statusCode : 500;
  let cleanMessage = rawMessage;

  if (isPrismaErr) {
    if (err.code === 'P2025') {
      resolvedStatus = 404;
      cleanMessage = 'Requested database record was not found.';
    } else if (err.code === 'P2002') {
      resolvedStatus = 409;
      cleanMessage = 'A record with these unique details already exists.';
    } else if (err.code === 'P2003' || err.code === 'P2000') {
      resolvedStatus = 400;
      cleanMessage = 'Invalid reference or field value supplied for database operation.';
    } else {
      resolvedStatus = 503;
      cleanMessage = 'Database service is currently unavailable. Please retry shortly.';
    }
  }

  const statusLabel = resolvedStatus >= 500 ? 'error' : 'fail';

  if (envConfig.env === 'development') {
    res.status(resolvedStatus).json({
      success: false,
      status: statusLabel,
      message: cleanMessage,
      error: err.isOperational ? err : { message: cleanMessage, code: err.code }
    });
  } else {
    if (resolvedStatus >= 500) {
      console.error('ERROR 💥:', err);
    }
    res.status(resolvedStatus).json({
      success: false,
      status: statusLabel,
      message: resolvedStatus >= 500 && !err.isOperational && !isPrismaErr
        ? 'An unexpected internal server error occurred.'
        : cleanMessage
    });
  }
};

module.exports = {
  AppError,
  errorHandler
};
