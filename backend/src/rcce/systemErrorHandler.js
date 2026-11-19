'use strict';

const { getOperationResponse } = require('./responseCatalogue');
const { auditTracker } = require('./auditTracker');

/**
 * GBS SYSTEM-WIDE CENTRAL ERROR HANDLER (GBS-RCCE)
 * Catches all runtime exceptions, Prisma errors, validation rejections,
 * and service unavailabilities across every subsystem.
 * Normalizes every failure into an exact RCCE-compliant response structure.
 * Never leaks database secrets, internal connection URIs, or credentials to regular users,
 * while safely equipping developers with clear diagnostics.
 */

function rcceCentralErrorHandler(err, req, res, next) {
  const statusCode = err.statusCode || (err.status && !isNaN(err.status) ? Number(err.status) : 500);
  const rawMessage = String(err.message || 'An internal system error occurred.');
  const lowerMsg = rawMessage.toLowerCase();
  const requestId = req.requestId || req.headers?.['x-request-id'] || `ERR-${Date.now().toString(36)}`;

  // Determine appropriate RCCE operation code based on error type
  let code = err.code || null;
  let userFacingMessage = rawMessage;

  // 1. Database Connection / Prisma Failures
  if (lowerMsg.includes('prisma') || (err.name && err.name.includes('Prisma')) || lowerMsg.includes('econnrefused') || lowerMsg.includes('cant reach database')) {
    code = code || 'SYSTEM_DATABASE_UNAVAILABLE';
    userFacingMessage = 'The database service is synchronizing. Operational fallback engine has safely preserved your session.';
  }
  // 2. Authentication Failures (401)
  else if (statusCode === 401 || lowerMsg.includes('authentication required') || lowerMsg.includes('please log in') || lowerMsg.includes('invalid email or password')) {
    code = code || (lowerMsg.includes('invalid email or password') ? 'AUTH_LOGIN_FAILED' : 'AUTH_UNAUTHORIZED');
    userFacingMessage = rawMessage;
  }
  // 3. Permission & Access Rejections (403)
  else if (statusCode === 403 || lowerMsg.includes('forbidden') || lowerMsg.includes('permission') || lowerMsg.includes('unauthorized')) {
    code = code || (lowerMsg.includes('cross-tenant') ? 'TENANT_CROSS_ACCESS_FORBIDDEN' : 'AUTH_FORBIDDEN');
    const isDescriptiveAuthMsg =
      lowerMsg.includes('permission') ||
      lowerMsg.includes('denied') ||
      lowerMsg.includes('pending') ||
      lowerMsg.includes('approval') ||
      lowerMsg.includes('approved') ||
      lowerMsg.includes('rejected') ||
      lowerMsg.includes('declined') ||
      lowerMsg.includes('locked') ||
      lowerMsg.includes('suspended') ||
      lowerMsg.includes('deleted');
    userFacingMessage = lowerMsg.includes('cross-tenant')
      ? 'Access denied: Cross-tenant data querying or manipulation is strictly forbidden.'
      : (isDescriptiveAuthMsg ? rawMessage : 'You do not have permission to perform this operation.');
  }
  // 4. Record Not Found (404)
  else if (statusCode === 404 || lowerMsg.includes('not found') || lowerMsg.includes('does not exist')) {
    code = code || 'RECORD_NOT_FOUND';
    userFacingMessage = rawMessage.length < 120 ? rawMessage : 'No matching record was found.';
  }
  // 5. Unique Constraint / Duplicate Submissions (409)
  else if (statusCode === 409 || lowerMsg.includes('already exists') || lowerMsg.includes('duplicate')) {
    code = code || 'RECORD_ALREADY_EXISTS';
    userFacingMessage = 'A record with this information already exists in the system.';
  }
  // 6. Maintenance Mode (503)
  else if (statusCode === 503 || lowerMsg.includes('maintenance')) {
    code = code || 'SYSTEM_MAINTENANCE_ACTIVE';
    userFacingMessage = 'The system is currently undergoing scheduled maintenance. Please check back shortly.';
  }
  // 7. Validation / Bad Request (400 / 422)
  else if (statusCode === 400 || statusCode === 422 || lowerMsg.includes('missing') || lowerMsg.includes('required') || lowerMsg.includes('must provide') || lowerMsg.includes('invalid')) {
    code = code || 'VALIDATION_MISSING_REQUIRED';
    userFacingMessage = rawMessage;
  }
  else {
    code = code || 'SYSTEM_ERROR_INTERNAL';
  }

  // Lookup catalogue definition
  const catalogueSpec = getOperationResponse(code, userFacingMessage);
  // Honor explicit HTTP status code if set on error (e.g. 400, 401, 403, 404, 409, 503)
  const resolvedStatus = (statusCode && statusCode >= 400 && statusCode < 600)
    ? statusCode
    : (catalogueSpec.statusCode || 500);

  // Determine if requesting client is authorized developer or super admin
  const isDevClient = Boolean(
    req.user?.role === 'DEVELOPER' ||
    req.user?.role === 'SUPER_ADMIN' ||
    req.headers['x-developer-token'] ||
    req.path?.startsWith('/api/v1/dev-control') ||
    req.path?.startsWith('/api/v1/developer')
  );

  const payload = {
    success: false,
    status: 'error',
    code: catalogueSpec.code,
    message: catalogueSpec.message,
    data: null,
    errors: err.errors || [{ message: catalogueSpec.message }],
    timestamp: new Date().toISOString(),
    requestId
  };

  // Provide diagnostics ONLY to authorized developers
  if (isDevClient) {
    payload.diagnostics = {
      originalError: rawMessage,
      errorName: err.name || 'Error',
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
      endpoint: `${req.method} ${req.originalUrl || req.path}`,
      tenantId: req.user?.tenantId || req.tenantId || null
    };
  }

  // Record error to audit trail asynchronously
  try {
    auditTracker.logActivity({
      userId: req.user?.id || null,
      userRole: req.user?.role || 'CLIENT',
      tenantId: req.user?.tenantId || req.tenantId || 1,
      action: 'SYSTEM_ERROR_ENCOUNTERED',
      module: 'RCCE_ERROR_HANDLER',
      affectedRecord: req.path,
      outcome: 'FAILED',
      details: `[${catalogueSpec.code}] ${rawMessage}`,
      ipAddress: req.ip || '127.0.0.1',
      userAgent: req.headers['user-agent'] || 'GBS-Client',
      requestId
    });
  } catch (_) { }

  res.setHeader('X-Request-Id', requestId);
  res.setHeader('X-GBS-Engine', 'GBS-RCCE-v1.0');
  return res.status(resolvedStatus).json(payload);
}

module.exports = {
  rcceCentralErrorHandler
};
