'use strict';

const { protect } = require('../middleware/auth.middleware');
const { readPersistentStore } = require('../core/database/persistentStore');

/**
 * Resolve strict integer tenantId from authenticated user or request metadata.
 * Supports X-Tenant-Id (integer), query.tenantId, body.tenantId, or X-Tenant-Code / institutionName lookup.
 */
function resolveTenantId(req, fallback = 1) {
  const fromAuth = parseInt(req?.tenantId || req?.user?.tenantId, 10);
  if (Number.isInteger(fromAuth) && fromAuth > 0) return fromAuth;

  const rawHeaderId = parseInt(req?.headers?.['x-tenant-id'], 10);
  if (Number.isInteger(rawHeaderId) && rawHeaderId > 0) return rawHeaderId;

  const fromBody = parseInt(req?.body?.tenantId, 10);
  if (Number.isInteger(fromBody) && fromBody > 0) return fromBody;

  const fromQuery = parseInt(req?.query?.tenantId, 10);
  if (Number.isInteger(fromQuery) && fromQuery > 0) return fromQuery;

  const codeOrName = String(
    req?.body?.tenantCode ||
    req?.query?.tenantCode ||
    req?.headers?.['x-tenant-code'] ||
    req?.body?.institutionName ||
    ''
  ).trim().toLowerCase();

  if (codeOrName) {
    try {
      const store = readPersistentStore();
      const match = (store.institutions || []).find(
        (inst) =>
          String(inst.tenantCode || inst.code || '').trim().toLowerCase() === codeOrName ||
          String(inst.institutionName || inst.name || '').trim().toLowerCase() === codeOrName
      );
      if (match) {
        const matchedId = parseInt(match.tenantId || match.id, 10);
        if (Number.isInteger(matchedId) && matchedId > 0) return matchedId;
      }
    } catch (_) { }
  }

  return fallback;
}

/**
 * Optional protect middleware: populates req.user and req.tenantId when Bearer token is present,
 * without blocking public or unauthenticated read/intake endpoints.
 */
function optionalProtect(req, res, next) {
  const authHeader = req.headers?.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    req.tenantId = resolveTenantId(req, 1);
    return next();
  }
  return protect(req, res, (err) => {
    if (!err && req.user?.tenantId) {
      req.tenantId = parseInt(req.user.tenantId, 10) || resolveTenantId(req, 1);
    } else if (!req.tenantId) {
      req.tenantId = resolveTenantId(req, 1);
    }
    return next();
  });
}

module.exports = {
  resolveTenantId,
  optionalProtect
};

