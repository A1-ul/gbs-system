'use strict';

const crypto = require('crypto');
const { getOperationResponse, inferOperationResponse } = require('./responseCatalogue');
const { auditTracker } = require('./auditTracker');
const { RCCE_EVENTS, eventNotificationEngine } = require('./eventNotificationEngine');

/**
 * GBS SYSTEM RESPONSE ENGINE (GBS-RCCE)
 * Builds, formats, and enforces canonical API response envelopes across every GBS module:
 * { success, code, message, data, errors, timestamp, requestId }
 * while preserving backward-compatible top-level keys so existing clients & tests remain intact.
 */

const ENVELOPE_PROTOCOL_KEYS = new Set([
  'success',
  'status',
  'code',
  'message',
  'data',
  'errors',
  'timestamp',
  'requestId',
  'meta'
]);

const SKIP_AUTO_AUDIT_PREFIXES = [
  '/api/v1/health',
  '/health',
  '/api/v1/rcce/audit-trail',
  '/api/v1/rcce/error-monitor',
  '/api/v1/rcce/notifications',
  '/api/v1/dev-control/audit-logs',
  '/api/v1/dev-control/logs',
  '/api/v1/audit/logs',
  '/api/v1/translate'
];

function sanitizePublicMessage(rawMessage, isDeveloper = false) {
  const msg = String(rawMessage || '').trim();
  if (!msg || isDeveloper) return msg;
  const lower = msg.toLowerCase();
  if (
    lower.includes('prisma.') ||
    lower.includes('select * from') ||
    lower.includes('postgres://') ||
    lower.includes('postgresql://') ||
    lower.includes('econnrefused') ||
    lower.includes('stack') && msg.includes('at ')
  ) {
    return 'A system data service error occurred. Technical diagnostics have been recorded for review.';
  }
  return msg;
}

function mapAuditActionAndModule(req) {
  const path = String(req.originalUrl || req.path || '/').split('?')[0].toLowerCase();
  const cleanPath = path.replace(/^\/api\/v1\//, '');
  const seg = cleanPath.split('/').filter(Boolean);
  const mod = (seg[0] || 'CORE').toUpperCase().replace(/-/g, '_');
  const method = String(req.method || 'GET').toUpperCase();
  const sub = seg[1] ? seg[1].toUpperCase().replace(/-/g, '_') : '';
  const action = sub ? `${method}_${mod}_${sub}` : `${method}_${mod}`;
  return { module: mod, action: action.slice(0, 80), path };
}

function mapDomainEvent(method, path, statusCode, code) {
  if (statusCode >= 500) return RCCE_EVENTS.SYSTEM_ERROR_DETECTED;
  if (statusCode >= 400) return null;
  const m = String(method || 'GET').toUpperCase();
  if (m === 'GET') return null;

  if (code === 'AUTH_REGISTER_SUCCESS' || code === 'AUTH_REGISTER_PENDING') return RCCE_EVENTS.USER_REGISTERED;
  if (code === 'ADMISSION_APPROVED_SUCCESS' || path.includes('/admissions') && path.includes('/approve')) return RCCE_EVENTS.STUDENT_ADMITTED;
  if (code === 'FINANCE_PAYMENT_SUCCESS') return RCCE_EVENTS.PAYMENT_RECEIVED;
  if (code === 'FINANCE_PAYMENT_FAILED') return RCCE_EVENTS.PAYMENT_REJECTED;
  if (code === 'ADMISSION_REJECTED') return RCCE_EVENTS.REQUEST_REJECTED;
  if (code === 'STAFF_APPROVED_SUCCESS' || path.includes('/approve')) return RCCE_EVENTS.REQUEST_APPROVED;
  if (code === 'ACADEMIC_ATTENDANCE_COMPLETED') return RCCE_EVENTS.ATTENDANCE_COMPLETED;
  if (code === 'ACADEMIC_EXAM_SCORED' || code === 'UNIVERSITY_RESULT_RECORDED') return RCCE_EVENTS.EXAM_SCORED;
  if (code === 'ACADEMIC_VIDEO_PUBLISHED') return RCCE_EVENTS.TOPIC_VIDEO_PUBLISHED;
  if (m === 'PUT' || m === 'PATCH') return RCCE_EVENTS.RECORD_UPDATED;
  if (m === 'POST' && (path.includes('/admission') || path.includes('/loan') || path.includes('/leave'))) return RCCE_EVENTS.REQUEST_SUBMITTED;
  return null;
}

class ResponseEngine {
  /**
   * Build an RCCE-compliant success response payload.
   */
  static success(code, data = null, customMessage = null, meta = null, requestId = null) {
    const spec = getOperationResponse(code, customMessage);
    const resolvedReqId = requestId || `REQ-${Date.now().toString(36)}-${crypto.randomBytes(4).toString('hex')}`;

    const payload = {
      success: true,
      status: 'success',
      code: spec.code,
      message: spec.message,
      data: data !== undefined ? data : null,
      errors: null,
      timestamp: new Date().toISOString(),
      requestId: resolvedReqId
    };

    if (meta && typeof meta === 'object') {
      payload.meta = meta;
    }

    return {
      statusCode: spec.statusCode || 200,
      payload
    };
  }

  /**
   * Build an RCCE-compliant error response payload.
   */
  static error(code, errors = null, customMessage = null, statusCode = null, requestId = null) {
    const spec = getOperationResponse(code, customMessage, statusCode);
    const resolvedReqId = requestId || `ERR-${Date.now().toString(36)}-${crypto.randomBytes(4).toString('hex')}`;

    let cleanErrors = errors;
    if (typeof errors === 'string') {
      cleanErrors = [{ message: errors }];
    } else if (errors instanceof Error) {
      cleanErrors = [{ message: errors.message }];
    } else if (!cleanErrors) {
      cleanErrors = [{ message: spec.message, code: spec.code }];
    }

    const payload = {
      success: false,
      status: (spec.statusCode || 400) < 500 ? 'fail' : 'error',
      code: spec.code,
      message: spec.message,
      data: null,
      errors: cleanErrors,
      timestamp: new Date().toISOString(),
      requestId: resolvedReqId
    };

    return {
      statusCode: spec.statusCode || 400,
      payload
    };
  }
}

/**
 * Normalizes any plain controller JSON response into the canonical GBS-RCCE envelope
 * while retaining legacy keys so backward compatibility is 100% preserved.
 */
function normalizeApiPayload(body, req, statusCode) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    const spec = inferOperationResponse({ method: req.method, path: req.originalUrl || req.path, statusCode });
    return {
      success: statusCode >= 200 && statusCode < 400,
      status: statusCode >= 200 && statusCode < 400 ? 'success' : (statusCode < 500 ? 'fail' : 'error'),
      code: spec.code,
      message: spec.message,
      data: body ?? null,
      errors: statusCode >= 400 ? [{ message: spec.message, code: spec.code }] : null,
      timestamp: new Date().toISOString(),
      requestId: req.requestId
    };
  }

  const isDevActor = String(req.user?.role || '').toUpperCase() === 'DEVELOPER';
  const rawFailed =
    statusCode >= 400 ||
    body.success === false ||
    body.status === 'fail' ||
    body.status === 'error';
  const success = !rawFailed;

  const rawMsg = typeof body.message === 'string' && body.message.trim() ? body.message : '';
  const safeRawMsg = sanitizePublicMessage(rawMsg, isDevActor);

  const spec = inferOperationResponse({
    method: req.method,
    path: req.originalUrl || req.path,
    statusCode: rawFailed && statusCode < 400 ? 400 : statusCode,
    message: safeRawMsg,
    code: body.code || null
  });

  const resolvedMessage = safeRawMsg || spec.message;

  let resolvedData = body.data;
  if (resolvedData === undefined) {
    const extraKeys = {};
    for (const [k, v] of Object.entries(body)) {
      if (!ENVELOPE_PROTOCOL_KEYS.has(k) && k !== 'diagnostics') {
        extraKeys[k] = v;
      }
    }
    resolvedData = Object.keys(extraKeys).length > 0 ? extraKeys : null;
  }

  let resolvedErrors = body.errors;
  if (success) {
    resolvedErrors = null;
  } else if (!resolvedErrors) {
    resolvedErrors = [{ message: body.error ? sanitizePublicMessage(String(body.error), isDevActor) : resolvedMessage, code: spec.code }];
  }

  return {
    ...body,
    success,
    status: body.status || (success ? 'success' : (statusCode >= 500 ? 'error' : 'fail')),
    code: body.code || spec.code,
    message: resolvedMessage,
    data: resolvedData !== undefined ? resolvedData : null,
    errors: resolvedErrors,
    timestamp: body.timestamp || new Date().toISOString(),
    requestId: body.requestId || req.requestId
  };
}

/**
 * Express Middleware: rcceResponseMiddleware
 * Attaches requestId, rcceSuccess, rcceError, normalizes every /api/ JSON response,
 * and records automatic audit/event signals on mutations and failures.
 */
function rcceResponseMiddleware(req, res, next) {
  if (!req.requestId) {
    req.requestId = req.headers['x-request-id'] || `REQ-${Date.now().toString(36)}-${crypto.randomBytes(4).toString('hex')}`;
  }
  res.setHeader('X-Request-Id', req.requestId);
  res.setHeader('X-GBS-Engine', 'GBS-RCCE-v2.0');

  const originalJson = res.json.bind(res);

  res.rcceSuccess = function (code, data = null, customMessage = null, meta = null, overrideStatus = null) {
    const result = ResponseEngine.success(code, data, customMessage, meta, req.requestId);
    const status = overrideStatus || result.statusCode;
    res.__rcceHandled = true;
    res.status(status);
    return originalJson(result.payload);
  };

  res.rcceError = function (code, errors = null, customMessage = null, statusCode = null) {
    const result = ResponseEngine.error(code, errors, customMessage, statusCode, req.requestId);
    res.__rcceHandled = true;
    res.status(result.statusCode);
    return originalJson(result.payload);
  };

  res.json = function (body) {
    const urlPath = String(req.originalUrl || req.path || '').split('?')[0];
    if (!urlPath.startsWith('/api')) {
      return originalJson(body);
    }

    const normalized = res.__rcceHandled ? body : normalizeApiPayload(body, req, res.statusCode || 200);
    res.__rccePayload = normalized;
    return originalJson(normalized);
  };

  res.once('finish', () => {
    if (req.__rcceAuditLogged) return;
    const fullPath = String(req.originalUrl || req.path || '').split('?')[0];
    if (!fullPath.startsWith('/api')) return;
    if (SKIP_AUTO_AUDIT_PREFIXES.some((prefix) => fullPath.startsWith(prefix))) return;

    const method = String(req.method || 'GET').toUpperCase();
    const statusCode = res.statusCode || 200;
    const isMutation = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);
    const isSecurityOrFailure = statusCode >= 400;

    if (!isMutation && !isSecurityOrFailure) return;

    const payload = res.__rccePayload || {};
    const outcome = statusCode === 401 || statusCode === 403
      ? 'BLOCKED'
      : statusCode >= 400
        ? 'FAILED'
        : 'SUCCESS';

    const { module: mod, action } = mapAuditActionAndModule(req);

    auditTracker.logActivity({
      userId: req.user?.id || null,
      userRole: req.user?.role || req.headers['x-user-role'] || 'CLIENT',
      tenantId: req.tenantId || req.user?.tenantId || req.headers['x-tenant-id'] || 1,
      action,
      module: mod,
      affectedRecord: fullPath,
      outcome,
      details: `[${payload.code || statusCode}] ${payload.message || method + ' ' + fullPath}`,
      ipAddress: req.ip || '127.0.0.1',
      userAgent: req.headers['user-agent'] || 'GBS-Client',
      requestId: req.requestId
    }).catch(() => { });

    const domainEvent = mapDomainEvent(method, fullPath.toLowerCase(), statusCode, payload.code);
    if (domainEvent && !fullPath.startsWith('/api/v1/rcce/events')) {
      eventNotificationEngine.emitEvent(
        domainEvent,
        {
          message: payload.message || `${action} (${statusCode})`,
          code: payload.code,
          endpoint: fullPath,
          statusCode
        },
        {
          tenantId: req.tenantId || req.user?.tenantId || 1,
          userId: req.user?.id || null,
          actorRole: req.user?.role || 'USER',
          requestId: req.requestId,
          ipAddress: req.ip || '127.0.0.1'
        }
      ).catch(() => { });
    }
  });

  next();
}

module.exports = {
  ResponseEngine,
  rcceResponseMiddleware,
  normalizeApiPayload
};
