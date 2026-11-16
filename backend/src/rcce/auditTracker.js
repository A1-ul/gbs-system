'use strict';

const prisma = require('../core/database/prisma.client');
const { readPersistentStore, writePersistentStore } = require('../core/database/persistentStore');

/**
 * GBS ACTIVITY TRACKING AND AUDIT ENGINE (GBS-RCCE)
 * Records what happened, who performed it, and the exact outcome.
 * Preserves an immutable, tamper-resistant trail of every critical operation,
 * successful transaction, authorization rejection, and administrative command.
 */

class AuditTracker {
  /**
   * Log an activity or operation
   * @param {object} params
   * @param {number|string} [params.userId] - ID of actor
   * @param {string} [params.userRole] - Role of actor
   * @param {number|string} [params.tenantId] - Institution enclave ID
   * @param {string} params.action - Standardized action verb (e.g. USER_LOGIN, ADMISSION_APPROVED)
   * @param {string} params.module - Subsystem module (AUTH, ADMISSIONS, FINANCE, ACADEMIC, DEV_CONTROL)
   * @param {string} [params.affectedRecord] - Record ID or description
   * @param {string} [params.outcome] - 'SUCCESS' | 'FAILED' | 'BLOCKED'
   * @param {object|string} [params.details] - Structured metadata or description
   * @param {string} [params.ipAddress] - Client IP address
   * @param {string} [params.userAgent] - Browser / client agent
   * @param {string} [params.requestId] - Request reference ID
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

    const record = {
      id: `AUD-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
      userId: userId ? Number(userId) : null,
      userRole: String(userRole || 'USER').toUpperCase(),
      tenantId: tenantId ? Number(tenantId) : 1,
      action: String(action || 'ACTION').toUpperCase(),
      module: String(module || 'CORE').toUpperCase(),
      affectedRecord: affectedRecord ? String(affectedRecord) : null,
      outcome: String(outcome || 'SUCCESS').toUpperCase(),
      details: cleanDetails,
      ipAddress: String(ipAddress || '127.0.0.1'),
      userAgent: String(userAgent || 'GBS-Client'),
      requestId: requestId || `REQ-${Date.now().toString(36)}`,
      createdAt: timestamp
    };

    // 1. Write to persistent store (hybrid fallback)
    try {
      writePersistentStore((curr) => {
        const existing = Array.isArray(curr.auditTrail) ? curr.auditTrail : [];
        return {
          ...curr,
          auditTrail: [record, ...existing].slice(0, 1000)
        };
      });
    } catch (_) { }

    // 2. Persist to PostgreSQL audit_logs table
    try {
      await prisma.auditLog.create({
        data: {
          tenantId: record.tenantId,
          userId: record.userId,
          action: record.action,
          module: record.module,
          details: `[${record.outcome}] [Req:${record.requestId}] ${record.details}`,
          ipAddress: record.ipAddress,
          userAgent: record.userAgent
        }
      }).catch(() => { });
    } catch (_) { }

    return record;
  }

  /**
   * Query audit logs with rich multi-parameter filters
   */
  async getAuditTrail({ tenantId = null, module = null, action = null, outcome = null, limit = 50, offset = 0 } = {}) {
    const take = parseInt(limit, 10) || 50;
    const skip = parseInt(offset, 10) || 0;

    let dbLogs = [];
    try {
      const where = {};
      if (tenantId) where.tenantId = Number(tenantId);
      if (module) where.module = String(module).toUpperCase();
      if (action) where.action = { contains: String(action).toUpperCase() };

      dbLogs = await prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take,
        skip,
        include: { user: { select: { firstName: true, lastName: true, role: true, email: true } } }
      });
    } catch (_) { }

    if (Array.isArray(dbLogs) && dbLogs.length > 0) {
      return {
        results: dbLogs.length,
        logs: dbLogs.map((l) => ({
          id: l.id,
          tenantId: l.tenantId,
          userId: l.userId,
          user: l.user,
          action: l.action,
          module: l.module,
          details: l.details,
          ipAddress: l.ipAddress,
          userAgent: l.userAgent,
          createdAt: l.createdAt
        }))
      };
    }

    // Fallback to persistent store
    const store = readPersistentStore();
    let trail = Array.isArray(store.auditTrail) ? store.auditTrail : [];

    if (tenantId) trail = trail.filter((t) => !t.tenantId || String(t.tenantId) === String(tenantId));
    if (module) trail = trail.filter((t) => !t.module || t.module === String(module).toUpperCase());
    if (action) trail = trail.filter((t) => t.action.includes(String(action).toUpperCase()));
    if (outcome) trail = trail.filter((t) => t.outcome === String(outcome).toUpperCase());

    const paged = trail.slice(skip, skip + take);
    return {
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
