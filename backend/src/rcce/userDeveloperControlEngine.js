'use strict';

const os = require('os');
const prisma = require('../core/database/prisma.client');
const { readPersistentStore } = require('../core/database/persistentStore');
const { businessRulesEngine } = require('./businessRulesEngine');

/**
 * GBS USER AND DEVELOPER CONTROL ENGINE (GBS-RCCE)
 * Connects all users according to their assigned permissions and roles.
 * Provides authorized management interfaces for the developer
 * to monitor system operations, manage system configurations, review audit trails,
 * and enforce strict role boundaries with privacy protections.
 */

class UserDeveloperControlEngine {
  constructor() {
    this.systemStartTime = Date.now();
  }

  /**
   * Get complete system operational telemetry & status
   */
  async getSystemTelemetry() {
    const memory = process.memoryUsage();
    const cpus = os.cpus();
    const uptimeSec = Math.floor((Date.now() - this.systemStartTime) / 1000);

    // Database telemetry
    let dbStatus = { active: false, role: 'UNKNOWN', mode: 'STANDBY_LOCAL' };
    try {
      if (typeof prisma.getPostgresLiveStatus === 'function') {
        dbStatus = await prisma.getPostgresLiveStatus(false);
      }
    } catch (_) { }

    const store = readPersistentStore();
    const totalTenants = (store.institutions || []).length;
    const totalUsers = (store.users || []).length;
    const totalSubscriptions = (store.subscriptions || []).length;

    return {
      status: businessRulesEngine.isMaintenanceMode() ? 'MAINTENANCE' : 'HEALTHY',
      maintenanceMode: businessRulesEngine.isMaintenanceMode(),
      maintenanceReason: businessRulesEngine.maintenanceReason,
      systemUptimeSeconds: uptimeSec,
      environment: process.env.NODE_ENV || 'production',
      server: {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        cpuCount: cpus.length,
        cpuModel: cpus[0]?.model || 'Standard CPU',
        memory: {
          rssMb: Math.round(memory.rss / (1024 * 1024)),
          heapUsedMb: Math.round(memory.heapUsed / (1024 * 1024)),
          heapTotalMb: Math.round(memory.heapTotal / (1024 * 1024))
        }
      },
      database: dbStatus,
      tenancy: {
        totalTenants,
        totalUsers,
        totalSubscriptions
      },
      engines: {
        responseEngine: 'ONLINE',
        businessRulesEngine: 'ONLINE',
        eventNotificationEngine: 'ONLINE',
        auditEngine: 'ONLINE',
        idempotencyEngine: 'ONLINE'
      },
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Developer privacy filter:
   * Masks sensitive credentials, personal phone numbers, and raw payment secrets
   * before developer monitoring inspection.
   */
  sanitizeRecordForDeveloper(record) {
    if (!record || typeof record !== 'object') return record;
    const sanitized = { ...record };

    const SENSITIVE_KEYS = [
      'password',
      'hashedPassword',
      'pinCode',
      'creditCardNumber',
      'cvv',
      'cardToken',
      'salt'
    ];

    for (const key of SENSITIVE_KEYS) {
      if (sanitized[key] !== undefined) {
        sanitized[key] = '•••••••• [PRIVACY PROTECTED]';
      }
    }

    return sanitized;
  }

  /**
   * Developer Privacy-Audited Access Gate
   * Logs whenever a developer inspects a sensitive user record
   */
  async logDeveloperSensitiveAccess(devUser, targetModule, targetRecordId, reason = 'Administrative Diagnostic Review') {
    try {
      await prisma.auditLog.create({
        data: {
          tenantId: 1,
          userId: null,
          module: 'DEVELOPER_PRIVACY_GUARD',
          action: 'SENSITIVE_RECORD_INSPECTED',
          details: `Developer '${devUser?.email || 'gabosei48@gmail.com'}' inspected sensitive record #${targetRecordId} in module '${targetModule}'. Reason: ${reason}. Privacy protection seal active.`,
          ipAddress: '127.0.0.1'
        }
      }).catch(() => { });
    } catch (_) { }
  }

  /**
   * Enforce Role-Based Access Control matrix
   */
  isAuthorized(userRole, requiredRoles = []) {
    if (!userRole) return false;
    const cleanRole = String(userRole).toUpperCase();
    if (['SUPER_ADMIN', 'DEVELOPER'].includes(cleanRole)) return true;
    return requiredRoles.map((r) => String(r).toUpperCase()).includes(cleanRole);
  }
}

const userDeveloperControlEngine = new UserDeveloperControlEngine();

module.exports = {
  UserDeveloperControlEngine,
  userDeveloperControlEngine
};
