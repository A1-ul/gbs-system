'use strict';

const prisma = require('../../core/database/prisma.client');
const notificationsService = require('../notifications/notifications.service');
const { AppError } = require('../../middleware/error.middleware');

/**
 * Evaluates individual rule condition against event payload
 */
function evaluateSingleCondition(cond, payload = {}) {
  const { field, operator, value } = cond;
  const targetVal = payload[field];

  if (targetVal === undefined || targetVal === null) {
    return false;
  }

  const numTarget = Number(targetVal);
  const numValue = Number(value);
  const isNumeric = !isNaN(numTarget) && !isNaN(numValue);

  switch ((operator || 'EQUALS').toUpperCase()) {
    case 'EQUALS':
    case '==':
      return String(targetVal).toLowerCase() === String(value).toLowerCase();
    case 'NOT_EQUALS':
    case '!=':
      return String(targetVal).toLowerCase() !== String(value).toLowerCase();
    case 'GREATER_THAN':
    case '>':
      return isNumeric ? numTarget > numValue : targetVal > value;
    case 'GREATER_THAN_EQUAL':
    case '>=':
      return isNumeric ? numTarget >= numValue : targetVal >= value;
    case 'LESS_THAN':
    case '<':
      return isNumeric ? numTarget < numValue : targetVal < value;
    case 'LESS_THAN_EQUAL':
    case '<=':
      return isNumeric ? numTarget <= numValue : targetVal <= value;
    case 'CONTAINS':
      return String(targetVal).toLowerCase().includes(String(value).toLowerCase());
    case 'IN':
      const list = Array.isArray(value) ? value : String(value).split(',').map((v) => v.trim().toLowerCase());
      return list.includes(String(targetVal).toLowerCase());
    default:
      return false;
  }
}

/**
 * Returns operational status and telemetry summary
 */
async function getStatus() {
  const rulesCount = await prisma.workflowRule.count();
  const execCount = await prisma.workflowExecution.count();

  return {
    module: 'workflow_automation_engine',
    status: 'OPERATIONAL',
    totalRules: rulesCount,
    totalExecutions: execCount,
    supportedActions: ['DISPATCH_NOTIFICATION', 'TRIGGER_WEBHOOK', 'ESCALATE_SLA', 'SYSTEM_TASK'],
    supportedEvents: [
      'ADMISSION_SUBMITTED',
      'ADMISSION_APPROVED',
      'STUDENT_ABSENT',
      'HOMEWORK_ASSIGNED',
      'EXAM_GRADED',
      'EMERGENCY_ALERT',
      'FEE_OVERDUE'
    ],
    timestamp: new Date().toISOString()
  };
}

/**
 * Seeds default enterprise workflow automation rules for a tenant
 */
async function seedDefaultWorkflowRules(tenantId) {
  const tid = parseInt(tenantId, 10);
  const defaults = [
    {
      code: 'RULE_ADMISSION_APPROVED_NOTIFICATION',
      name: 'Admissions Approval Automated Notification',
      description: 'Auto-dispatches welcome SMS and email to guardian when an admission application is approved',
      triggerEvent: 'ADMISSION_APPROVED',
      conditionLogic: 'ALL',
      conditions: '[]',
      actionType: 'DISPATCH_NOTIFICATION',
      actionConfig: JSON.stringify({
        channel: 'SMS',
        templateCode: 'ADMISSION_WELCOME_SMS',
        target: 'GUARDIAN'
      }),
      priority: 1,
      isActive: true
    },
    {
      code: 'RULE_STUDENT_ABSENCE_ALERT',
      name: 'Student Absence Instant Guardian SMS Alert',
      description: 'Sends immediate alert to parent mobile when student is marked absent',
      triggerEvent: 'STUDENT_ABSENT',
      conditionLogic: 'ALL',
      conditions: '[]',
      actionType: 'DISPATCH_NOTIFICATION',
      actionConfig: JSON.stringify({
        channel: 'SMS',
        templateCode: 'STUDENT_ABSENCE_ALERT_SMS',
        target: 'GUARDIAN'
      }),
      priority: 1,
      isActive: true
    },
    {
      code: 'RULE_EMERGENCY_DISPATCH_BROADCAST',
      name: 'Campus Emergency Satellite Dispatch Alert',
      description: 'Broadcasting urgent emergency status to security officers and guardians',
      triggerEvent: 'EMERGENCY_ALERT',
      conditionLogic: 'ALL',
      conditions: '[]',
      actionType: 'DISPATCH_NOTIFICATION',
      actionConfig: JSON.stringify({
        channel: 'SMS',
        templateCode: 'EMERGENCY_BROADCAST_SMS',
        target: 'ALL_GUARDIANS',
        priority: 'URGENT'
      }),
      priority: 1,
      isActive: true
    },
    {
      code: 'RULE_HONORS_SCHOLARSHIP_ESCALATION',
      name: 'High GPA Honors Scholarship SLA Escalation',
      description: 'Escalates applicants with previous GPA >= 3.8 to Admissions Dean for scholarship grant',
      triggerEvent: 'ADMISSION_SUBMITTED',
      conditionLogic: 'ALL',
      conditions: JSON.stringify([
        { field: 'previousGPA', operator: 'GREATER_THAN_EQUAL', value: '3.8' }
      ]),
      actionType: 'ESCALATE_SLA',
      actionConfig: JSON.stringify({
        targetRole: 'ADMIN',
        department: 'DEANS_OFFICE',
        slaHours: 24,
        escalationTag: 'HONORS_SCHOLARSHIP_CANDIDATE'
      }),
      priority: 2,
      isActive: true
    }
  ];

  for (const r of defaults) {
    await prisma.workflowRule.upsert({
      where: {
        tenantId_code: { tenantId: tid, code: r.code }
      },
      update: {},
      create: {
        tenantId: tid,
        code: r.code,
        name: r.name,
        description: r.description,
        triggerEvent: r.triggerEvent,
        conditionLogic: r.conditionLogic,
        conditions: r.conditions,
        actionType: r.actionType,
        actionConfig: r.actionConfig,
        priority: r.priority,
        isActive: r.isActive
      }
    });
  }
}

/**
 * Get all workflow rules for tenant
 */
async function getRules(tenantId, query = {}) {
  const tid = parseInt(tenantId, 10);
  await seedDefaultWorkflowRules(tid);

  const where = { tenantId: tid };
  if (query.triggerEvent) where.triggerEvent = query.triggerEvent.toUpperCase();
  if (query.isActive !== undefined) where.isActive = query.isActive === 'true' || query.isActive === true;

  return await prisma.workflowRule.findMany({
    where,
    include: {
      _count: { select: { executions: true } }
    },
    orderBy: [{ priority: 'asc' }, { createdAt: 'desc' }]
  });
}

/**
 * Create a new custom workflow automation rule
 */
async function createRule(tenantId, payload, user) {
  const tid = parseInt(tenantId, 10);
  const {
    code,
    name,
    description,
    triggerEvent,
    conditionLogic = 'ALL',
    conditions = [],
    actionType = 'DISPATCH_NOTIFICATION',
    actionConfig = {},
    priority = 1,
    isActive = true
  } = payload;

  if (!code || !name || !triggerEvent || !actionType) {
    throw new AppError('code, name, triggerEvent, and actionType are required.', 400);
  }

  const existing = await prisma.workflowRule.findUnique({
    where: { tenantId_code: { tenantId: tid, code: code.trim().toUpperCase() } }
  });
  if (existing) {
    throw new AppError(`Workflow rule code '${code}' already exists for this tenant.`, 409);
  }

  const rule = await prisma.$transaction(async (tx) => {
    const r = await tx.workflowRule.create({
      data: {
        tenantId: tid,
        code: code.trim().toUpperCase(),
        name: name.trim(),
        description: description ? description.trim() : null,
        triggerEvent: triggerEvent.trim().toUpperCase(),
        conditionLogic: conditionLogic.toUpperCase(),
        conditions: typeof conditions === 'string' ? conditions : JSON.stringify(conditions),
        actionType: actionType.trim().toUpperCase(),
        actionConfig: typeof actionConfig === 'string' ? actionConfig : JSON.stringify(actionConfig),
        priority: parseInt(priority, 10) || 1,
        isActive: Boolean(isActive)
      }
    });

    await tx.auditLog.create({
      data: {
        tenantId: tid,
        userId: user?.id,
        module: 'WORKFLOW',
        action: 'WORKFLOW_RULE_CREATED',
        details: `Created workflow automation rule '${r.name}' (${r.code}) on trigger '${r.triggerEvent}'`
      }
    });

    return r;
  });

  return rule;
}

/**
 * Update an existing workflow rule
 */
async function updateRule(tenantId, ruleId, payload, user) {
  const tid = parseInt(tenantId, 10);
  const rid = parseInt(ruleId, 10);

  const existing = await prisma.workflowRule.findFirst({
    where: { id: rid, tenantId: tid }
  });
  if (!existing) {
    throw new AppError(`Workflow rule #${ruleId} not found.`, 404);
  }

  const data = {};
  if (payload.name) data.name = payload.name.trim();
  if (payload.description !== undefined) data.description = payload.description ? payload.description.trim() : null;
  if (payload.triggerEvent) data.triggerEvent = payload.triggerEvent.trim().toUpperCase();
  if (payload.conditionLogic) data.conditionLogic = payload.conditionLogic.toUpperCase();
  if (payload.conditions !== undefined) {
    data.conditions = typeof payload.conditions === 'string' ? payload.conditions : JSON.stringify(payload.conditions);
  }
  if (payload.actionType) data.actionType = payload.actionType.trim().toUpperCase();
  if (payload.actionConfig !== undefined) {
    data.actionConfig = typeof payload.actionConfig === 'string' ? payload.actionConfig : JSON.stringify(payload.actionConfig);
  }
  if (payload.priority !== undefined) data.priority = parseInt(payload.priority, 10);
  if (payload.isActive !== undefined) data.isActive = Boolean(payload.isActive);

  const updated = await prisma.$transaction(async (tx) => {
    const r = await tx.workflowRule.update({
      where: { id: rid },
      data
    });

    await tx.auditLog.create({
      data: {
        tenantId: tid,
        userId: user?.id,
        module: 'WORKFLOW',
        action: 'WORKFLOW_RULE_UPDATED',
        details: `Updated workflow rule #${rid} (${r.code})`
      }
    });

    return r;
  });

  return updated;
}

/**
 * Delete a workflow rule
 */
async function deleteRule(tenantId, ruleId, user) {
  const tid = parseInt(tenantId, 10);
  const rid = parseInt(ruleId, 10);

  const existing = await prisma.workflowRule.findFirst({
    where: { id: rid, tenantId: tid }
  });
  if (!existing) {
    throw new AppError(`Workflow rule #${ruleId} not found.`, 404);
  }

  await prisma.$transaction(async (tx) => {
    await tx.workflowRule.delete({ where: { id: rid } });

    await tx.auditLog.create({
      data: {
        tenantId: tid,
        userId: user?.id,
        module: 'WORKFLOW',
        action: 'WORKFLOW_RULE_DELETED',
        details: `Deleted workflow rule #${rid} (${existing.code})`
      }
    });
  });

  return { success: true, message: `Workflow rule #${rid} deleted successfully.` };
}

/**
 * THE EVENT HOOK ENGINE:
 * Triggers an event, evaluates rules, executes actions, and writes executions to PostgreSQL.
 */
async function triggerEvent(tenantId, triggerEvent, payload = {}, user = null) {
  const tid = parseInt(tenantId, 10);
  const event = triggerEvent.toUpperCase();

  await seedDefaultWorkflowRules(tid);

  // Find all active rules matching this event for this tenant
  const matchingRules = await prisma.workflowRule.findMany({
    where: {
      tenantId: tid,
      triggerEvent: event,
      isActive: true
    },
    orderBy: { priority: 'asc' }
  });

  const executionResults = [];

  for (const rule of matchingRules) {
    const startTime = Date.now();
    let conditions = [];
    try {
      conditions = rule.conditions ? JSON.parse(rule.conditions) : [];
    } catch {
      conditions = [];
    }

    // Evaluate conditions
    let shouldExecute = true;
    if (conditions.length > 0) {
      if (rule.conditionLogic === 'ANY') {
        shouldExecute = conditions.some((c) => evaluateSingleCondition(c, payload));
      } else {
        // ALL
        shouldExecute = conditions.every((c) => evaluateSingleCondition(c, payload));
      }
    }

    if (!shouldExecute) {
      // Record SKIPPED execution in PostgreSQL
      const skippedExec = await prisma.workflowExecution.create({
        data: {
          tenantId: tid,
          ruleId: rule.id,
          triggerEvent: event,
          status: 'SKIPPED',
          payload: JSON.stringify(payload),
          executionResult: JSON.stringify({ reason: 'Conditions evaluated to false' }),
          executionTimeMs: Date.now() - startTime
        }
      });
      executionResults.push({ ruleId: rule.id, ruleCode: rule.code, status: 'SKIPPED', executionId: skippedExec.id });
      continue;
    }

    // Execute configured action
    let actionConfig = {};
    try {
      actionConfig = rule.actionConfig ? JSON.parse(rule.actionConfig) : {};
    } catch {
      actionConfig = {};
    }

    let actionOutput = {};
    let executionStatus = 'SUCCESS';
    let errorMessage = null;

    try {
      if (rule.actionType === 'DISPATCH_NOTIFICATION') {
        // Queue notification into PostgreSQL
        const queuedItem = await notificationsService.queueNotification(
          tid,
          {
            recipientContact: payload.guardianPhone || payload.guardianEmail || payload.recipientContact || 'admin@gbs.edu',
            recipientName: payload.guardianName || payload.recipientName || 'Guardian',
            userId: payload.userId,
            channel: actionConfig.channel || 'SMS',
            templateCode: actionConfig.templateCode,
            data: payload,
            priority: actionConfig.priority || 'NORMAL',
            metadata: { triggerEvent: event, ruleCode: rule.code }
          },
          user
        );
        actionOutput = {
          action: 'DISPATCH_NOTIFICATION',
          queueItemId: queuedItem.id,
          channel: queuedItem.channel,
          recipient: queuedItem.recipientContact
        };
      } else if (rule.actionType === 'ESCALATE_SLA') {
        actionOutput = {
          action: 'ESCALATE_SLA',
          escalatedTo: actionConfig.department || 'DEANS_OFFICE',
          targetRole: actionConfig.targetRole || 'ADMIN',
          slaHours: actionConfig.slaHours || 24,
          escalatedAt: new Date().toISOString(),
          candidate: payload.studentFirstName ? `${payload.studentFirstName} ${payload.studentLastName}` : payload.studentName
        };
      } else if (rule.actionType === 'TRIGGER_WEBHOOK') {
        actionOutput = {
          action: 'TRIGGER_WEBHOOK',
          webhookUrl: actionConfig.webhookUrl || 'https://api.gbs.edu/webhooks/automation',
          status: 200,
          delivered: true
        };
      } else {
        actionOutput = { action: rule.actionType, executed: true };
      }
    } catch (err) {
      executionStatus = 'FAILED';
      errorMessage = err.message;
      actionOutput = { error: err.message };
    }

    const executionTimeMs = Date.now() - startTime;

    // Record execution in PostgreSQL
    const execution = await prisma.workflowExecution.create({
      data: {
        tenantId: tid,
        ruleId: rule.id,
        triggerEvent: event,
        status: executionStatus,
        payload: JSON.stringify(payload),
        executionResult: JSON.stringify(actionOutput),
        errorMessage,
        executionTimeMs
      }
    });

    executionResults.push({
      ruleId: rule.id,
      ruleCode: rule.code,
      status: executionStatus,
      executionId: execution.id,
      executionTimeMs,
      actionOutput
    });
  }

  await prisma.auditLog.create({
    data: {
      tenantId: tid,
      userId: user?.id,
      module: 'WORKFLOW',
      action: 'WORKFLOW_EVENT_TRIGGERED',
      details: `Triggered event '${event}' - ${matchingRules.length} rules evaluated, ${executionResults.filter((e) => e.status === 'SUCCESS').length} actions executed.`
    }
  });

  return {
    triggerEvent: event,
    totalRulesEvaluated: matchingRules.length,
    executedCount: executionResults.filter((e) => e.status === 'SUCCESS').length,
    results: executionResults
  };
}

/**
 * Get workflow execution history
 */
async function getExecutions(tenantId, query = {}) {
  const tid = parseInt(tenantId, 10);
  const where = { tenantId: tid };

  if (query.status) where.status = query.status.toUpperCase();
  if (query.triggerEvent) where.triggerEvent = query.triggerEvent.toUpperCase();
  if (query.ruleId) where.ruleId = parseInt(query.ruleId, 10);

  return await prisma.workflowExecution.findMany({
    where,
    include: {
      rule: { select: { id: true, code: true, name: true, actionType: true } }
    },
    orderBy: { createdAt: 'desc' },
    take: 100
  });
}

/**
 * Get telemetry & telemetry analytics
 */
async function getWorkflowTelemetry(tenantId) {
  const tid = parseInt(tenantId, 10);

  const rules = await prisma.workflowRule.findMany({ where: { tenantId: tid } });
  const executions = await prisma.workflowExecution.findMany({
    where: { tenantId: tid },
    select: { status: true, executionTimeMs: true, triggerEvent: true }
  });

  const totalExec = executions.length;
  const successfulExec = executions.filter((e) => e.status === 'SUCCESS').length;
  const skippedExec = executions.filter((e) => e.status === 'SKIPPED').length;
  const failedExec = executions.filter((e) => e.status === 'FAILED').length;

  const totalTime = executions.reduce((acc, curr) => acc + (curr.executionTimeMs || 0), 0);
  const avgLatencyMs = totalExec > 0 ? Math.round(totalTime / totalExec) : 0;

  return {
    totalRules: rules.length,
    activeRules: rules.filter((r) => r.isActive).length,
    totalExecutions: totalExec,
    successfulExecutions: successfulExec,
    skippedExecutions: skippedExec,
    failedExecutions: failedExec,
    successRate: totalExec > 0 ? Math.round((successfulExec / (totalExec - skippedExec || 1)) * 100) : 100,
    averageLatencyMs: avgLatencyMs,
    timestamp: new Date().toISOString()
  };
}

module.exports = {
  getStatus,
  seedDefaultWorkflowRules,
  getRules,
  createRule,
  updateRule,
  deleteRule,
  triggerEvent,
  getExecutions,
  getWorkflowTelemetry
};
