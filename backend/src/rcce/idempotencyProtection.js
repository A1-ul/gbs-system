'use strict';

const crypto = require('crypto');

/**
 * GBS DUPLICATE OPERATION & IDEMPOTENCY SENTINEL (GBS-RCCE)
 * Prevents duplicate financial transactions, admissions, registrations, and critical writes.
 * - Explicit `X-Idempotency-Key` / `Idempotency-Key`: Full sliding-window replay of confirmed result.
 * - Concurrent identical in-flight submission (even without header): Blocked immediately with 409.
 */

class IdempotencyProtection {
  constructor(windowMs = 60000, maxEntries = 2000) {
    this.windowMs = windowMs;
    this.maxEntries = maxEntries;
    this.cache = new Map();
  }

  /**
   * Read explicit client-supplied idempotency key if present
   */
  getExplicitKey(req) {
    const headerKey = req.headers?.['x-idempotency-key'] || req.headers?.['idempotency-key'];
    return headerKey && String(headerKey).trim() ? `EXPLICIT:${String(headerKey).trim()}` : null;
  }

  /**
   * Derive a deterministic key for a request
   */
  generateKey(req, customKey = null) {
    if (customKey) return String(customKey);
    const explicit = this.getExplicitKey(req);
    if (explicit) return explicit;

    const bodyStr = JSON.stringify(req.body || {});
    const userId = req.user?.id || req.user?.email || 'anon';
    const tenantId = req.user?.tenantId || req.tenantId || req.headers?.['x-tenant-id'] || '1';
    const targetPath = req.originalUrl || req.path || '/';
    const hash = crypto.createHash('sha256').update(`${req.method}:${targetPath}:${userId}:${tenantId}:${bodyStr}`).digest('hex');
    return `IDEM-${hash.slice(0, 24)}`;
  }

  /**
   * Check idempotency status before executing transaction
   */
  check(key) {
    this._cleanExpired();
    const entry = this.cache.get(key);
    if (!entry) {
      return { isDuplicate: false, isProcessing: false, record: null };
    }

    if (entry.status === 'PROCESSING') {
      return { isDuplicate: true, isProcessing: true, record: entry };
    }

    return { isDuplicate: true, isProcessing: false, record: entry };
  }

  /**
   * Mark transaction as currently executing
   */
  start(key, metadata = {}) {
    this.cache.set(key, {
      status: 'PROCESSING',
      startedAt: Date.now(),
      metadata
    });
  }

  /**
   * Commit confirmed transaction payload for safe idempotent replay
   */
  complete(key, responsePayload, statusCode = 200) {
    this.cache.set(key, {
      status: 'COMPLETED',
      completedAt: Date.now(),
      statusCode,
      responseData: responsePayload
    });
  }

  /**
   * Release key if operation failed so user can correct errors and retry cleanly
   */
  release(key) {
    this.cache.delete(key);
  }

  _cleanExpired() {
    const now = Date.now();
    for (const [k, v] of this.cache.entries()) {
      const time = v.completedAt || v.startedAt;
      if (now - time > this.windowMs) {
        this.cache.delete(k);
      }
    }
    if (this.cache.size > this.maxEntries) {
      const overflow = this.cache.size - this.maxEntries;
      let removed = 0;
      for (const k of this.cache.keys()) {
        this.cache.delete(k);
        if (++removed >= overflow) break;
      }
    }
  }

  /**
   * Express Middleware to guard sensitive mutating endpoints.
   * @param {string} operationName - Descriptive name (e.g. 'FEE_PAYMENT', 'ADMISSION_SUBMISSION')
   */
  guard(operationName = 'SENSITIVE_TRANSACTION') {
    return (req, res, next) => {
      if (!['POST', 'PUT', 'PATCH'].includes(String(req.method || '').toUpperCase())) {
        return next();
      }

      const explicitKey = this.getExplicitKey(req);
      const key = explicitKey || this.generateKey(req);
      const checkResult = this.check(key);

      if (checkResult.isDuplicate) {
        if (checkResult.isProcessing) {
          if (typeof res.rcceError === 'function') {
            return res.rcceError(
              'DUPLICATE_SUBMISSION_DETECTED',
              [{ message: `This ${operationName} is currently processing. Please wait a moment for confirmation.` }],
              `This ${operationName} is currently processing. Please wait a moment for confirmation.`,
              409
            );
          }
          return res.status(409).json({
            success: false,
            status: 'fail',
            code: 'DUPLICATE_SUBMISSION_DETECTED',
            message: `This ${operationName} is currently processing. Please wait a moment for confirmation.`,
            requestId: req.requestId || 'REQ-IDEMP'
          });
        }

        // Only replay completed response automatically when client supplied an explicit X-Idempotency-Key
        if (explicitKey) {
          const cachedData = checkResult.record?.responseData?.data ?? checkResult.record?.responseData ?? null;
          if (typeof res.rcceSuccess === 'function') {
            return res.rcceSuccess(
              'IDEMPOTENT_TRANSACTION_REPLAYED',
              cachedData,
              `Duplicate ${operationName} safely prevented. Returning confirmed transaction record.`,
              { idempotentReplay: true, idempotencyKey: explicitKey },
              200
            );
          }
          return res.status(200).json({
            success: true,
            status: 'success',
            code: 'IDEMPOTENT_TRANSACTION_REPLAYED',
            message: `Duplicate ${operationName} safely prevented. Returning confirmed transaction record.`,
            data: cachedData,
            requestId: req.requestId || 'REQ-IDEMP'
          });
        }
      }

      this.start(key, { operationName, path: req.originalUrl || req.path });

      const originalJson = res.json.bind(res);
      res.json = (body) => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          this.complete(key, body, res.statusCode);
        } else {
          this.release(key);
        }
        return originalJson(body);
      };

      res.once('close', () => {
        const entry = this.cache.get(key);
        if (entry && entry.status === 'PROCESSING') {
          this.release(key);
        }
      });

      next();
    };
  }
}

const idempotencyProtection = new IdempotencyProtection(60000);

module.exports = {
  IdempotencyProtection,
  idempotencyProtection
};
