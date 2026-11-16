'use strict';

const crypto = require('crypto');
const { getOperationResponse } = require('./responseCatalogue');

/**
 * GBS SYSTEM RESPONSE ENGINE (GBS-RCCE)
 * Core component responsible for building, formatting, and guaranteeing
 * 100% consistent, structured API responses across all GBS systems.
 */

class ResponseEngine {
  /**
   * Build an RCCE-compliant success response payload
   */
  static success(code, data = null, customMessage = null, meta = null, requestId = null) {
    const spec = getOperationResponse(code, customMessage);
    const resolvedReqId = requestId || `REQ-${Date.now().toString(36)}-${crypto.randomBytes(4).toString('hex')}`;

    const payload = {
      success: true,
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
   * Build an RCCE-compliant error response payload
   */
  static error(code, errors = null, customMessage = null, statusCode = null, requestId = null) {
    const spec = getOperationResponse(code, customMessage, statusCode);
    const resolvedReqId = requestId || `ERR-${Date.now().toString(36)}-${crypto.randomBytes(4).toString('hex')}`;

    let cleanErrors = errors;
    if (typeof errors === 'string') {
      cleanErrors = [{ message: errors }];
    } else if (errors instanceof Error) {
      cleanErrors = [{ message: errors.message }];
    }

    const payload = {
      success: false,
      code: spec.code,
      message: spec.message,
      data: null,
      errors: cleanErrors || null,
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
 * Express Middleware: rcceResponseMiddleware
 * Attaches rcceSuccess, rcceError, and standard headers to every HTTP request.
 */
function rcceResponseMiddleware(req, res, next) {
  // Ensure requestId is attached
  if (!req.requestId) {
    req.requestId = req.headers['x-request-id'] || `REQ-${Date.now().toString(36)}-${crypto.randomBytes(4).toString('hex')}`;
  }
  res.setHeader('X-Request-Id', req.requestId);
  res.setHeader('X-GBS-Engine', 'GBS-RCCE-v1.0');

  /**
   * Helper to send an RCCE success response
   * @param {string} code - Response catalogue code
   * @param {any} [data] - Return data payload
   * @param {string} [customMessage] - Optional custom message
   * @param {object} [meta] - Optional metadata
   * @param {number} [overrideStatus] - Optional HTTP status code
   */
  res.rcceSuccess = function (code, data = null, customMessage = null, meta = null, overrideStatus = null) {
    const result = ResponseEngine.success(code, data, customMessage, meta, req.requestId);
    const status = overrideStatus || result.statusCode;
    // Keep backward compatible 'status: success' property so legacy scripts and tests continue to work flawlessly
    result.payload.status = 'success';
    return res.status(status).json(result.payload);
  };

  /**
   * Helper to send an RCCE error response
   * @param {string} code - Response catalogue code
   * @param {any} [errors] - Error details or list
   * @param {string} [customMessage] - Optional user-facing message
   * @param {number} [statusCode] - HTTP status code
   */
  res.rcceError = function (code, errors = null, customMessage = null, statusCode = null) {
    const result = ResponseEngine.error(code, errors, customMessage, statusCode, req.requestId);
    result.payload.status = 'fail';
    return res.status(result.statusCode).json(result.payload);
  };

  next();
}

module.exports = {
  ResponseEngine,
  rcceResponseMiddleware
};
