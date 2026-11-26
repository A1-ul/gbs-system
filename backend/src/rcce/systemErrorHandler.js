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
  const rawStatus = Number(err.statusCode || (err.status && !isNaN(err.status) ? err.status : 0)) || 0;
  const rawMessage = String(err.message || 'An internal system error occurred.');
  const lowerMsg = rawMessage.toLowerCase();
  const requestId = req.requestId || req.headers?.['x-request-id'] || `ERR-${Date.now().toString(36)}`;

  // Determine appropriate RCCE operation code & exact HTTP status according to actual error meaning
  let code = err.code || null;
  let derivedStatus = rawStatus >= 400 && rawStatus < 600 ? rawStatus : 0;
  let userFacingMessage = rawMessage;

  const isPrismaErr = lowerMsg.includes('prisma') || (err.name && err.name.includes('Prisma'));

  // 1. Specific Prisma Error Codes (honest 404 / 409 / 400 / 503 mapping)
  if (isPrismaErr && err.code === 'P2025') {
    derivedStatus = derivedStatus || 404;
    code = 'RECORD_NOT_FOUND';
    userFacingMessage = 'The requested record could not be found.';
  } else if (isPrismaErr && err.code === 'P2002') {
    derivedStatus = derivedStatus || 409;
    code = 'RECORD_ALREADY_EXISTS';
    userFacingMessage = 'A record with this unique value already exists.';
  } else if (isPrismaErr && (err.code === 'P2003' || err.code === 'P2000')) {
    derivedStatus = derivedStatus || 400;
    code = 'VALIDATION_MISSING_REQUIRED';
    userFacingMessage = 'Invalid reference or field length supplied for this operation.';
  } else if (isPrismaErr || lowerMsg.includes('econnrefused') || lowerMsg.includes('cant reach database') || lowerMsg.includes("can't reach database")) {
    derivedStatus = derivedStatus || 503;
    code = code || 'SYSTEM_DATABASE_UNAVAILABLE';
    userFacingMessage = 'The database service is currently unavailable. Please retry once connectivity is restored.';
  }
  // 2. Authentication Failures (401)
  else if (
    derivedStatus === 401 ||
    lowerMsg.includes('authentication required') ||
    lowerMsg.includes('please log in') ||
    lowerMsg.includes('invalid email') ||
    lowerMsg.includes('invalid password') ||
    lowerMsg.includes('invalid credential') ||
    err.name === 'JsonWebTokenError' ||
    err.name === 'TokenExpiredError'
  ) {
    derivedStatus = derivedStatus || 401;
    code = code || (
      (lowerMsg.includes('invalid email') || lowerMsg.includes('invalid username') || lowerMsg.includes('invalid password') || lowerMsg.includes('invalid credential'))
        ? 'AUTH_LOGIN_FAILED'
        : 'AUTH_UNAUTHORIZED'
    );
    userFacingMessage = err.name === 'TokenExpiredError'
      ? 'Your authentication token has expired. Please sign in again.'
      : rawMessage;
  }
  // 3. Permission & Access Rejections (403)
  else if (derivedStatus === 403 || lowerMsg.includes('forbidden') || lowerMsg.includes('permission') || lowerMsg.includes('unauthorized')) {
    derivedStatus = derivedStatus || 403;
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
  // 4. Method Not Allowed (405)
  else if (derivedStatus === 405) {
    code = code || 'HTTP_METHOD_NOT_ALLOWED';
    userFacingMessage = rawMessage;
  }
  // 5. Request Timeout (408)
  else if (derivedStatus === 408) {
    code = code || 'REQUEST_TIMEOUT';
    userFacingMessage = rawMessage || 'The request timed out before completion.';
  }
  // 6. Record / Route Not Found (404)
  else if (derivedStatus === 404 || lowerMsg.includes('not found') || lowerMsg.includes('does not exist')) {
    derivedStatus = derivedStatus || 404;
    code = code || 'RECORD_NOT_FOUND';
    userFacingMessage = rawMessage.length < 160 ? rawMessage : 'No matching record was found.';
  }
  // 7. Unique Constraint / Duplicate Submissions (409)
  else if (derivedStatus === 409 || lowerMsg.includes('already exists') || lowerMsg.includes('duplicate')) {
    derivedStatus = derivedStatus || 409;
    code = code || 'RECORD_ALREADY_EXISTS';
    userFacingMessage = rawMessage.length < 160 ? rawMessage : 'A record with this information already exists in the system.';
  }
  // 8. Resource Locked (423)
  else if (derivedStatus === 423) {
    code = code || 'RESOURCE_LOCKED';
    userFacingMessage = rawMessage;
  }
  // 9. Rate Limit Exceeded (429)
  else if (derivedStatus === 429) {
    code = code || 'RATE_LIMIT_EXCEEDED';
    userFacingMessage = rawMessage || 'Too many requests. Please wait before retrying.';
  }
  // 10. Not Implemented (501) / Bad Gateway (502) / Maintenance or Service Unavailable (503) / Gateway Timeout (504)
  else if (derivedStatus === 501) {
    code = code || 'NOT_IMPLEMENTED';
    userFacingMessage = rawMessage || 'This operation is not implemented.';
  } else if (derivedStatus === 502) {
    code = code || 'BAD_GATEWAY';
    userFacingMessage = rawMessage || 'An upstream integration returned an invalid response.';
  } else if (derivedStatus === 503 || lowerMsg.includes('maintenance')) {
    derivedStatus = 503;
    code = code || 'SYSTEM_MAINTENANCE_ACTIVE';
    userFacingMessage = rawMessage || 'The service is temporarily unavailable. Please check back shortly.';
  } else if (derivedStatus === 504) {
    code = code || 'GATEWAY_TIMEOUT';
    userFacingMessage = rawMessage || 'Upstream service timed out while processing the request.';
  }
  // 11. Validation / Bad Request (400 / 422)
  else if (derivedStatus === 400 || derivedStatus === 422 || err.type === 'entity.parse.failed' || lowerMsg.includes('missing') || lowerMsg.includes('required') || lowerMsg.includes('must provide') || lowerMsg.includes('invalid')) {
    derivedStatus = derivedStatus || (err.type === 'entity.parse.failed' ? 400 : 400);
    code = code || (derivedStatus === 422 ? 'VALIDATION_FAILED' : 'VALIDATION_MISSING_REQUIRED');
    userFacingMessage = err.type === 'entity.parse.failed' ? 'Malformed JSON payload in request body.' : rawMessage;
  }
  else {
    derivedStatus = derivedStatus || 500;
    code = code || 'SYSTEM_ERROR_INTERNAL';
  }

  // Lookup catalogue definition
  const catalogueSpec = getOperationResponse(code, userFacingMessage);
  // Honor explicit/derived HTTP status code (400-599); never mask errors as 2xx
  const resolvedStatus = (derivedStatus >= 400 && derivedStatus < 600)
    ? derivedStatus
    : ((catalogueSpec.statusCode >= 400 && catalogueSpec.statusCode < 600) ? catalogueSpec.statusCode : 500);

  // Determine if requesting client is verified authorized developer or super admin
  const actorRole = String(req.user?.role || '').toUpperCase();
  const isDevClient = actorRole === 'DEVELOPER' || actorRole === 'SUPER_ADMIN';

  const payload = {
    success: false,
    status: resolvedStatus < 500 ? 'fail' : 'error',
    code: catalogueSpec.code,
    message: catalogueSpec.message,
    data: null,
    errors: err.errors || [{ message: catalogueSpec.message, code: catalogueSpec.code, statusCode: resolvedStatus }],
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
  req.__rcceAuditLogged = true;
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
