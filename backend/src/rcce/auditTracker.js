'use strict';

const prisma = require('../core/database/prisma.client');
const { readPersistentStore, writePersistentStore } = require('../core/database/persistentStore');

/**
 * GBS ACTIVITY TRACKING AND AUDIT ENGINE (GBS-RCCE)
 * Records what happened, who performed it, and the exact outcome.
 * Preserves an immutable trail of critical operations, transactions,
 * authorization rejections, and administrative commands across PostgreSQL and local persistent fallback.
 */

class AuditTracker {
  /**
   * Log an activity or operation
   */
  async logActivity({
    userId = null,
    userRole = 'SYSTEM',
    tenantId = 1,
    action = 'GENERIC_OPERATION',
    module = 'SYSTEM',
    affectedRecord = null,
    outcome = 'SUCCESS',
    details = '',
    ipAddress = '127.0.0.1',
    userAgent = 'GBS-Client',
    requestId = null
  } = {}) {
    const timestamp = new Date().toISOString();
    const cleanDetails = typeof details === 'object' ? JSON.stringify(details) : String(details || '');
    const resolvedReqId = requestId || `REQ-${Date.now().toString(36)}`;
    const parsedUid = userId !== null && userId !== undefined && Number.isFinite(Number(userId)) ? Number(userId) : null;
    const parsedTid = tenantId !== null && tenantId !== undefined && Number.isFinite(Number(tenantId)) ? Number(tenantId) : 1;

    const record = {
      id: `AUD-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
      userId: parsedUid,
      userRole: String(userRole || 'USER').toUpperCase(),
      tenantId: parsedTid,
      action: String(action || 'ACTION').toUpperCase(),
      module: String(module || 'CORE').toUpperCase(),
      affectedRecord: affectedRecord ? String(affectedRecord) : null,
      outcome: String(outcome || 'SUCCESS').toUpperCase(),
      details: cleanDetails,
      ipAddress: String(ipAddress || '127.0.0.1'),
      userAgent: String(userAgent || 'GBS-Client'),
      requestId: resolvedReqId,
      createdAt: timestamp
    };

    try {
      writePersistentStore((curr) => {
        const existing = Array.isArray(curr.auditTrail) ? curr.auditTrail : [];
        return {
          ...curr,
          auditTrail: [record, ...existing].slice(0, 1000)
        };
      });
    } catch (_) { }

    try {
      await prisma.auditLog.create({
        data: {
          tenantId: record.tenantId,
          userId: record.userId,
          action: record.action,
          module: record.module,
          details: `[${record.outcome}] [Role:${record.userRole}] [Req:${record.requestId}] ${record.details}`,
          ipAddress: record.ipAddress,
          userAgent: record.userAgent
        }
      }).catch(() => { });
    } catch (_) { }

    return record;
  }

  /**
   * Parse outcome / role / requestId from DB log details string if columns aren't separate in SQL
   */
  _normalizeDbLog(l) {
    const rawDetails = String(l.details || '');
    const outMatch = rawDetails.match(/^\[(SUCCESS|FAILED|BLOCKED)\]/i);
    const roleMatch = rawDetails.match(/\[Role:([A-Z_]+)\]/i);
    const reqMatch = rawDetails.match(/\[Req:([^\]]+)\]/i);
    return {
      id: l.id,
      tenantId: l.tenantId,
      userId: l.userId,
      user: l.user || null,
      userRole: l.user?.role || (roleMatch ? roleMatch[1].toUpperCase() : 'SYSTEM'),
      role: l.user?.role || (roleMatch ? roleMatch[1].toUpperCase() : 'SYSTEM'),
      action: l.action,
      module: l.module,
      outcome: outMatch ? outMatch[1].toUpperCase() : 'SUCCESS',
      requestId: reqMatch ? reqMatch[1] : null,
      details: rawDetails,
      ipAddress: l.ipAddress,
      userAgent: l.userAgent,
      createdAt: l.createdAt
    };
  }

  /**
   * Query immutable audit logs with unified DB + PersistentStore filtering
   */
  async getAuditTrail({ tenantId = null, module = null, action = null, outcome = null, limit = 50, offset = 0 } = {}) {
    const take = Math.min(200, Math.max(1, parseInt(limit, 10) || 50));
    const skip = Math.max(0, parseInt(offset, 10) || 0);
    const normTenant = tenantId ? String(tenantId).trim() : null;
    const normModule = module ? String(module).trim().toUpperCase() : null;
    const normAction = action ? String(action).trim().toUpperCase() : null;
    const normOutcome = outcome ? String(outcome).trim().toUpperCase() : null;

    const store = readPersistentStore();
    let trail = Array.isArray(store.auditTrail) ? store.auditTrail : [];

    // Also pull from PostgreSQL when active and merge unseen records
    try {
      const where = {};
      if (normTenant && Number.isFinite(Number(normTenant))) where.tenantId = Number(normTenant);
      if (normModule) where.module = normModule;
      if (normAction) where.action = { contains: normAction };

      const dbLogs = await prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: take + skip + 50,
        include: { user: { select: { firstName: true, lastName: true, role: true, email: true } } }
      });

      if (Array.isArray(dbLogs) && dbLogs.length > 0) {
        const seenReqIds = new Set(trail.map((t) => t.requestId).filter(Boolean));
        const normalizedDb = dbLogs.map((l) => this._normalizeDbLog(l));
        const extraDb = normalizedDb.filter((n) => !n.requestId || !seenReqIds.has(n.requestId));
        trail = [...trail, ...extraDb].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      }
    } catch (_) { }

    if (normTenant) trail = trail.filter((t) => !t.tenantId || String(t.tenantId) === normTenant);
    if (normModule) trail = trail.filter((t) => String(t.module || '').toUpperCase().includes(normModule));
    if (normAction) trail = trail.filter((t) => String(t.action || '').toUpperCase().includes(normAction));
    if (normOutcome) trail = trail.filter((t) => String(t.outcome || 'SUCCESS').toUpperCase() === normOutcome);

    const paged = trail.slice(skip, skip + take).map((t) => ({
      ...t,
      role: t.role || t.userRole || 'SYSTEM',
      userRole: t.userRole || t.role || 'SYSTEM'
    }));

    return {
      total: trail.length,
      results: paged.length,
      logs: paged
    };
  }
}

const auditTracker = new AuditTracker();

module.exports = {
  AuditTracker,
  auditTracker
};
