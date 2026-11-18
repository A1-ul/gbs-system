'use strict';

/**
 * GBS CENTRAL BUSINESS RULES ENGINE (GBS-RCCE)
 * Determines what should happen under each operational condition.
 * Enforces security gates, validation, tenant boundaries, and record ownership.
 * Guarantees that backend business rules dictate the actual outcome,
 * never allowing frontend assumptions to determine success.
 */

class BusinessRulesEngine {
  constructor() {
    this.maintenanceActive = false;
    this.maintenanceReason = 'Scheduled system infrastructure maintenance';
  }

  /**
   * Set global system maintenance mode
   */
  setMaintenanceMode(active, reason = null) {
    this.maintenanceActive = Boolean(active);
    if (reason) this.maintenanceReason = String(reason);
    return {
      maintenanceActive: this.maintenanceActive,
      maintenanceReason: this.maintenanceReason,
      updatedAt: new Date().toISOString()
    };
  }

  /**
   * Check if global system maintenance mode is active
   */
  isMaintenanceMode() {
    return this.maintenanceActive;
  }

  /**
   * Validate required input fields
   * @param {object} input - Request payload
   * @param {string[]} requiredFields - List of mandatory keys
   * @param {string} [entityName] - Name of entity
   * @returns {{ valid: boolean, missing: string[], error: object|null }}
   */
  validateRequiredFields(input = {}, requiredFields = [], entityName = 'Record') {
    if (!input || typeof input !== 'object') {
      return {
        valid: false,
        missing: requiredFields,
        code: 'VALIDATION_MISSING_REQUIRED',
        message: `Some required information is missing for ${entityName}.`
      };
    }

    const missing = [];
    for (const field of requiredFields) {
      const val = input[field];
      if (val === undefined || val === null || (typeof val === 'string' && val.trim() === '')) {
        missing.push(field);
      }
    }

    if (missing.length > 0) {
      return {
        valid: false,
        missing,
        code: 'VALIDATION_MISSING_REQUIRED',
        message: `Required information missing for ${entityName}: ${missing.join(', ')}.`
      };
    }

    return { valid: true, missing: [], code: 'VALIDATION_PASSED', message: 'All required fields present.' };
  }

  /**
   * Enforce Multi-Tenant Isolation Rule
   * Blocks cross-tenant data tampering.
   * If a non-superadmin/non-developer queries or passes a tenantId different from their authenticated tenantId,
   * it is strictly forbidden.
   */
  validateTenantIsolation(requestingUser, requestedTenantId) {
    if (!requestingUser) {
      return { allowed: true }; // Handled by authentication middleware
    }

    const userRole = String(requestingUser.role || '').toUpperCase();
    const isRootPrivileged = ['SUPER_ADMIN', 'DEVELOPER', 'ADMIN', 'HEADMASTER', 'PRINCIPAL'].includes(userRole);

    if (isRootPrivileged) {
      return { allowed: true, role: userRole };
    }

    if (requestedTenantId !== undefined && requestedTenantId !== null && requestedTenantId !== '') {
      const normalizeTid = (val) => {
        const s = String(val || '').trim();
        return s === 'tnt_master_default' ? '1' : s;
      };
      const authTid = normalizeTid(requestingUser.tenantId || requestingUser.tenant?.id || '');
      const reqTid = normalizeTid(requestedTenantId);

      if (authTid && reqTid && authTid !== reqTid) {
        return {
          allowed: false,
          code: 'TENANT_CROSS_ACCESS_FORBIDDEN',
          message: 'Access denied: Cross-tenant data querying or manipulation is strictly forbidden.'
        };
      }
    }

    return { allowed: true };
  }

  /**
   * Enforce System Maintenance & Tenant Lock Rules
   */
  validateOperationalStatus(requestingUser, tenant = null) {
    const userRole = String(requestingUser?.role || '').toUpperCase();
    const isRootPrivileged = ['SUPER_ADMIN', 'DEVELOPER', 'ADMIN', 'HEADMASTER', 'PRINCIPAL'].includes(userRole);

    // 1. Check Global System Maintenance Mode
    if (this.maintenanceActive && !isRootPrivileged) {
      return {
        allowed: false,
        code: 'SYSTEM_MAINTENANCE_ACTIVE',
        message: `The system is currently undergoing scheduled maintenance: ${this.maintenanceReason}. Please try again later.`
      };
    }

    // 2. Check Institutional Tenant Lock Status
    if (tenant && !isRootPrivileged) {
      const status = String(tenant.status || '').toUpperCase();
      const isLocked = tenant.isLocked === true || status === 'LOCKED' || status === 'SUSPENDED';

      if (isLocked) {
        return {
          allowed: false,
          code: 'AUTH_ACCOUNT_LOCKED',
          message: `Access Denied: Your institutional enclave '${tenant.name || 'Institution'}' is currently locked or suspended by the System Developer.`
        };
      }
    }

    return { allowed: true };
  }

  /**
   * Validate Record Ownership
   */
  validateRecordOwnership(requestingUser, recordTenantId) {
    if (!requestingUser) return { allowed: false, message: 'Unauthenticated' };
    const userRole = String(requestingUser.role || '').toUpperCase();
    if (['SUPER_ADMIN', 'DEVELOPER', 'ADMIN', 'HEADMASTER', 'PRINCIPAL'].includes(userRole)) return { allowed: true };

    const norm = (val) => {
      const s = String(val || '').trim();
      return s === 'tnt_master_default' ? '1' : s;
    };
    const userTid = norm(requestingUser.tenantId || requestingUser.tenant?.id || '');
    const recTid = norm(recordTenantId || '');

    if (userTid && recTid && userTid !== recTid) {
      return {
        allowed: false,
        code: 'AUTH_FORBIDDEN',
        message: 'You do not have permission to view or modify records belonging to another institution.'
      };
    }

    return { allowed: true };
  }

  /**
   * Validate Attendance Roll Call Rules
   * Enforces individual student ticking before roll call completion.
   */
  validateAttendanceRules(studentList = [], tickedRecords = {}) {
    if (!Array.isArray(studentList) || studentList.length === 0) {
      return { valid: true };
    }

    const unticked = studentList.filter((s) => {
      const studentId = s.id || s.studentId;
      const tick = tickedRecords[studentId] || tickedRecords[String(studentId)];
      return !tick || !tick.status;
    });

    if (unticked.length > 0) {
      return {
        valid: false,
        code: 'ACADEMIC_ATTENDANCE_INCOMPLETE',
        message: `Roll call incomplete: ${unticked.length} student(s) have not been ticked yet. A teacher must tick each student individually before completing the archive.`,
        untickedCount: unticked.length
      };
    }

    return { valid: true, code: 'VALIDATION_PASSED' };
  }

  /**
   * Express Middleware to enforce tenant isolation and maintenance guards
   */
  middleware() {
    return (req, res, next) => {
      // Check maintenance mode
      const user = req.user;
      const maintenanceCheck = this.validateOperationalStatus(user);
      if (!maintenanceCheck.allowed) {
        return res.status(503).json({
          success: false,
          status: 'fail',
          code: maintenanceCheck.code,
          message: maintenanceCheck.message,
          requestId: req.requestId || 'REQ-MAINTENANCE'
        });
      }

      // Check cross-tenant tampering in query or body
      const queryTenantId = req.query.tenantId || req.query.tenant_id;
      const bodyTenantId = req.body?.tenantId || req.body?.tenant_id;
      const targetTid = queryTenantId || bodyTenantId;

      if (targetTid && user) {
        const isolationCheck = this.validateTenantIsolation(user, targetTid);
        if (!isolationCheck.allowed) {
          return res.status(403).json({
            success: false,
            status: 'fail',
            code: isolationCheck.code,
            message: isolationCheck.message,
            requestId: req.requestId || 'REQ-ISOLATION'
          });
        }
      }

      next();
    };
  }
}

const businessRulesEngine = new BusinessRulesEngine();

module.exports = {
  BusinessRulesEngine,
  businessRulesEngine
};
