'use strict';

const crypto = require('crypto');

/**
 * GBS DUPLICATE OPERATION & IDEMPOTENCY SENTINEL (GBS-RCCE)
 * Prevents accidental duplicate submissions for financial transactions,
 * student admissions, credential registrations, and grade submissions.
 * Guarantees that repeating the same action within the idempotency window
 * returns the confirmed result without duplicate database mutations or double charges.
 */

class IdempotencyProtection {
  constructor(windowMs = 60000) {
    this.windowMs = windowMs; // 60 seconds sliding window
    this.cache = new Map();
  }

  /**
   * Derive a deterministic key for a request
   */
  generateKey(req, customKey = null) {
    if (customKey) return String(customKey);
    const headerKey = req.headers['x-idempotency-key'] || req.headers['idempotency-key'];
    if (headerKey) return String(headerKey).trim();

    // Compute deterministic fingerprint from path, method, user, and body
    const bodyStr = JSON.stringify(req.body || {});
    const userId = req.user?.id || req.user?.email || 'anon';
    const tenantId = req.user?.tenantId || req.tenantId || req.headers['x-tenant-id'] || '1';
    const hash = crypto.createHash('sha256').update(`${req.method}:${req.path}:${userId}:${tenantId}:${bodyStr}`).digest('hex');
    return `IDEM-${hash.slice(0, 24)}`;
  }

  /**
   * Check idempotency status before executing transaction
   * @param {string} key - Idempotency key
   * @returns {{ isDuplicate: boolean, isProcessing: boolean, record: object|null }}
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
   * Mark transaction as starting
   */
  start(key, metadata = {}) {
    this.cache.set(key, {
      status: 'PROCESSING',
      startedAt: Date.now(),
      metadata
    });
  }

  /**
   * Commit finished transaction result
   */
  complete(key, responseData) {
    this.cache.set(key, {
      status: 'COMPLETED',
      completedAt: Date.now(),
      responseData
    });
  }

  /**
   * Release key if operation failed so user can safely retry
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
  }

  /**
   * Express Middleware to guard sensitive endpoints
   * @param {string} operationName - Name of transaction (e.g. 'FEE_PAYMENT', 'ADMISSION_SUBMIT')
   */
  guard(operationName = 'SENSITIVE_TRANSACTION') {
    return (req, res, next) => {
      // Only protect mutating HTTP requests
      if (!['POST', 'PUT', 'PATCH'].includes(req.method)) {
        return next();
      }

      const key = this.generateKey(req);
      const checkResult = this.check(key);

      if (checkResult.isDuplicate) {
        if (checkResult.isProcessing) {
          return res.status(409).json({
            success: false,
            status: 'fail',
            code: 'DUPLICATE_SUBMISSION_DETECTED',
            message: `This ${operationName} is currently processing. Please wait a moment for confirmation.`,
            requestId: req.requestId || 'REQ-IDEMP'
          });
        }

        // Return cached confirmed result
        return res.status(200).json({
          success: true,
          status: 'success',
          code: 'IDEMPOTENT_TRANSACTION_REPLAYED',
          message: `Transaction already verified and completed successfully. Replaying confirmed record.`,
          data: checkResult.record?.responseData || null,
          requestId: req.requestId || 'REQ-IDEMP'
        });
      }

      // Mark as processing
      this.start(key, { operationName, path: req.path });

      // Intercept res.json to capture outcome
      const originalJson = res.json.bind(res);
      res.json = (body) => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          this.complete(key, body?.data || body);
        } else {
          this.release(key);
        }
        return originalJson(body);
      };

      next();
    };
  }
}

const idempotencyProtection = new IdempotencyProtection(60000);

module.exports = {
  IdempotencyProtection,
  idempotencyProtection
};
