'use strict';

const prisma = require('../../core/database/prisma.client');
const { AppError } = require('../../middleware/error.middleware');

/**
 * Replace placeholders like {{studentName}} with data values
 */
function interpolateTemplate(templateStr, data = {}) {
  if (!templateStr) return '';
  return templateStr.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (match, key) => {
    return data[key] !== undefined && data[key] !== null ? String(data[key]) : match;
  });
}

/**
 * Returns operational status and live queue counts
 */
async function getStatus() {
  const pendingCount = await prisma.notificationQueueItem.count({ where: { status: 'PENDING' } });
  const sentCount = await prisma.notificationQueueItem.count({ where: { status: 'SENT' } });
  const templatesCount = await prisma.notificationTemplate.count();

  return {
    module: 'notifications_dispatch_engine',
    status: 'OPERATIONAL',
    supportedChannels: ['EMAIL', 'SMS', 'IN_APP', 'PUSH'],
    priorities: ['LOW', 'NORMAL', 'HIGH', 'URGENT'],
    metrics: {
      pendingQueue: pendingCount,
      totalDispatched: sentCount,
      templatesRegistered: templatesCount
    },
    timestamp: new Date().toISOString()
  };
}

/**
 * Seeds standard enterprise templates for a tenant
 */
async function seedDefaultTemplates(tenantId) {
  const tid = parseInt(tenantId, 10);
  let schoolName = 'Registered School Institution';
  try {
    const t = await prisma.tenant.findUnique({ where: { id: tid } });
    if (t?.name) schoolName = t.name;
  } catch { }
  const defaults = [
    {
      templateCode: 'ADMISSION_WELCOME_SMS',
      name: 'Admission Welcome SMS',
      channel: 'SMS',
      titleTemplate: `${schoolName} Admissions Update`,
      bodyTemplate: 'Dear {{guardianName}}, admission inquiry for {{studentName}} ({{applicationNumber}}) has been logged. Track status at {{portalUrl}}',
      variables: JSON.stringify(['guardianName', 'studentName', 'applicationNumber', 'portalUrl']),
      isSystem: true
    },
    {
      templateCode: 'ADMISSION_APPROVED_EMAIL',
      name: 'Official Admission Approval Letter',
      channel: 'EMAIL',
      titleTemplate: `Official Acceptance Notice: Welcome to ${schoolName}`,
      bodyTemplate: `Dear {{guardianName}},\n\nWe are pleased to inform you that {{studentName}} has been granted admission to {{className}} for the upcoming academic session.\nStudent portal account has been provisioned.\n\nWarm regards,\n${schoolName} Admissions Board`,
      variables: JSON.stringify(['guardianName', 'studentName', 'className']),
      isSystem: true
    },
    {
      templateCode: 'STUDENT_ABSENCE_ALERT_SMS',
      name: 'Student Unexcused Absence Alert',
      channel: 'SMS',
      titleTemplate: 'Attendance Alert',
      bodyTemplate: 'URGENT ATTENDANCE: Student {{studentName}} was recorded ABSENT on {{date}} from {{className}}. Please contact campus administration.',
      variables: JSON.stringify(['studentName', 'date', 'className']),
      isSystem: true
    },
    {
      templateCode: 'HOMEWORK_POSTED_INAPP',
      name: 'New Homework Assigned Notice',
      channel: 'IN_APP',
      titleTemplate: 'New Assignment: {{assignmentTitle}}',
      bodyTemplate: 'Your teacher has posted {{assignmentTitle}} for {{subjectName}}. Due date is {{dueDate}}.',
      variables: JSON.stringify(['assignmentTitle', 'subjectName', 'dueDate']),
      isSystem: true
    },
    {
      templateCode: 'EMERGENCY_BROADCAST_SMS',
      name: 'Emergency Locator Broadcast Alert',
      channel: 'SMS',
      titleTemplate: '🚨 CAMPUS SECURITY ALERT',
      bodyTemplate: 'EMERGENCY NOTIFICATION from GBS Campus Security: {{message}}. Location: {{location}}. Response team dispatched.',
      variables: JSON.stringify(['message', 'location']),
      isSystem: true
    }
  ];

  for (const t of defaults) {
    await prisma.notificationTemplate.upsert({
      where: {
        tenantId_templateCode: { tenantId: tid, templateCode: t.templateCode }
      },
      update: {},
      create: {
        tenantId: tid,
        templateCode: t.templateCode,
        name: t.name,
        channel: t.channel,
        titleTemplate: t.titleTemplate,
        bodyTemplate: t.bodyTemplate,
        variables: t.variables,
        isSystem: true
      }
    });
  }
}

/**
 * Get notification templates
 */
async function getTemplates(tenantId, query = {}) {
  const tid = parseInt(tenantId, 10);
  await seedDefaultTemplates(tid);

  const where = { tenantId: tid };
  if (query.channel) where.channel = query.channel.toUpperCase();

  return await prisma.notificationTemplate.findMany({
    where,
    orderBy: { createdAt: 'asc' }
  });
}

/**
 * Create a new notification template
 */
async function createTemplate(tenantId, payload, user) {
  const tid = parseInt(tenantId, 10);
  const { templateCode, name, channel, titleTemplate, bodyTemplate, variables } = payload;

  if (!templateCode || !name || !channel || !bodyTemplate) {
    throw new AppError('templateCode, name, channel, and bodyTemplate are required.', 400);
  }

  const existing = await prisma.notificationTemplate.findUnique({
    where: { tenantId_templateCode: { tenantId: tid, templateCode: templateCode.trim().toUpperCase() } }
  });
  if (existing) {
    throw new AppError(`Template code ${templateCode} already exists for this tenant.`, 409);
  }

  const template = await prisma.$transaction(async (tx) => {
    const t = await tx.notificationTemplate.create({
      data: {
        tenantId: tid,
        templateCode: templateCode.trim().toUpperCase(),
        name: name.trim(),
        channel: channel.trim().toUpperCase(),
        titleTemplate: titleTemplate ? titleTemplate.trim() : null,
        bodyTemplate: bodyTemplate.trim(),
        variables: Array.isArray(variables) ? JSON.stringify(variables) : variables || '[]',
        isSystem: false
      }
    });

    await tx.auditLog.create({
      data: {
        tenantId: tid,
        userId: user?.id,
        module: 'NOTIFICATION',
        action: 'NOTIFICATION_TEMPLATE_CREATED',
        details: `Created template ${t.templateCode} for channel ${t.channel}`
      }
    });

    return t;
  });

  return template;
}

/**
 * Queue a notification into PostgreSQL
 */
async function queueNotification(tenantId, payload, user) {
  const tid = parseInt(tenantId, 10);
  const {
    recipientContact,
    recipientName,
    userId,
    channel = 'EMAIL',
    templateCode,
    data = {},
    title,
    content,
    priority = 'NORMAL',
    metadata = {}
  } = payload;

  if (!recipientContact && !userId) {
    throw new AppError('recipientContact or userId is required.', 400);
  }

  let finalTitle = title || 'GBS Notification';
  let finalContent = content || '';

  // If templateCode specified, interpolate from template
  if (templateCode) {
    await seedDefaultTemplates(tid);
    const template = await prisma.notificationTemplate.findUnique({
      where: { tenantId_templateCode: { tenantId: tid, templateCode: templateCode.toUpperCase() } }
    });
    if (template) {
      if (template.titleTemplate) finalTitle = interpolateTemplate(template.titleTemplate, data);
      finalContent = interpolateTemplate(template.bodyTemplate, data);
    }
  }

  if (!finalContent) {
    throw new AppError('Notification content or a valid template is required.', 400);
  }

  const queueItem = await prisma.$transaction(async (tx) => {
    const item = await tx.notificationQueueItem.create({
      data: {
        tenantId: tid,
        userId: userId ? parseInt(userId, 10) : null,
        recipientContact: recipientContact ? recipientContact.trim() : 'in-app-user',
        recipientName: recipientName ? recipientName.trim() : null,
        channel: channel.toUpperCase(),
        title: finalTitle,
        content: finalContent,
        status: 'PENDING',
        priority: priority.toUpperCase(),
        metadata: typeof metadata === 'object' ? JSON.stringify(metadata) : metadata
      }
    });

    await tx.auditLog.create({
      data: {
        tenantId: tid,
        userId: user?.id,
        module: 'NOTIFICATION',
        action: 'NOTIFICATION_QUEUED',
        details: `Queued ${item.channel} notification #${item.id} to ${item.recipientContact} (Priority: ${item.priority})`
      }
    });

    return item;
  });

  return queueItem;
}

/**
 * Process pending queue items (Simulate multi-channel gateway delivery)
 */
async function processQueue(tenantId, batchSize = 10, user) {
  const tid = parseInt(tenantId, 10);
  const size = parseInt(batchSize, 10) || 10;

  const pendingItems = await prisma.notificationQueueItem.findMany({
    where: { tenantId: tid, status: 'PENDING' },
    orderBy: [
      { priority: 'desc' },
      { createdAt: 'asc' }
    ],
    take: size
  });

  if (pendingItems.length === 0) {
    return { processedCount: 0, dispatchedItems: [] };
  }

  const processed = [];

  for (const item of pendingItems) {
    const now = new Date();
    // Simulate gateway transmission
    const gatewayReceipt = `${item.channel}-GATEWAY-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;

    const updated = await prisma.notificationQueueItem.update({
      where: { id: item.id },
      data: {
        status: 'SENT',
        sentAt: now,
        deliveredAt: now,
        metadata: JSON.stringify({
          ...(item.metadata ? JSON.parse(item.metadata) : {}),
          gatewayReceipt,
          dispatchedBy: 'GBS_WORKFLOW_DISPATCH_WORKER'
        })
      }
    });

    processed.push(updated);
  }

  await prisma.auditLog.create({
    data: {
      tenantId: tid,
      userId: user?.id,
      module: 'NOTIFICATION',
      action: 'NOTIFICATION_BATCH_DISPATCHED',
      details: `Processed and dispatched ${processed.length} pending notification queue items.`
    }
  });

  return {
    processedCount: processed.length,
    dispatchedItems: processed
  };
}

/**
 * Get queue items for tenant
 */
async function getQueueItems(tenantId, query = {}) {
  const tid = parseInt(tenantId, 10);
  const where = { tenantId: tid };

  if (query.status) where.status = query.status.toUpperCase();
  if (query.channel) where.channel = query.channel.toUpperCase();
  if (query.priority) where.priority = query.priority.toUpperCase();

  return await prisma.notificationQueueItem.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 100
  });
}

/**
 * Get logged-in user's in-app notifications
 */
async function getMyNotifications(tenantId, userId) {
  const tid = parseInt(tenantId, 10);
  const uid = parseInt(userId, 10);

  const notifications = await prisma.notificationQueueItem.findMany({
    where: {
      tenantId: tid,
      userId: uid,
      channel: 'IN_APP'
    },
    orderBy: { createdAt: 'desc' },
    take: 50
  });

  const unreadCount = notifications.filter((n) => !n.readAt).length;

  return {
    unreadCount,
    notifications
  };
}

/**
 * Mark notification as read
 */
async function markNotificationRead(tenantId, notificationId, userId) {
  const tid = parseInt(tenantId, 10);
  const nid = parseInt(notificationId, 10);

  const item = await prisma.notificationQueueItem.findFirst({
    where: { id: nid, tenantId: tid }
  });
  if (!item) {
    throw new AppError(`Notification #${notificationId} not found.`, 404);
  }

  return await prisma.notificationQueueItem.update({
    where: { id: nid },
    data: { readAt: new Date() }
  });
}

/**
 * Get telemetry & analytics
 */
async function getTelemetry(tenantId) {
  const tid = parseInt(tenantId, 10);

  const allItems = await prisma.notificationQueueItem.findMany({
    where: { tenantId: tid },
    select: { status: true, channel: true, priority: true }
  });

  const total = allItems.length;
  const byStatus = {
    PENDING: allItems.filter((i) => i.status === 'PENDING').length,
    SENT: allItems.filter((i) => i.status === 'SENT').length,
    FAILED: allItems.filter((i) => i.status === 'FAILED').length
  };
  const byChannel = {
    EMAIL: allItems.filter((i) => i.channel === 'EMAIL').length,
    SMS: allItems.filter((i) => i.channel === 'SMS').length,
    IN_APP: allItems.filter((i) => i.channel === 'IN_APP').length,
    PUSH: allItems.filter((i) => i.channel === 'PUSH').length
  };

  const deliveryRate = total > 0 ? Math.round((byStatus.SENT / total) * 100) : 100;

  return {
    totalQueueItems: total,
    byStatus,
    byChannel,
    deliveryRate,
    timestamp: new Date().toISOString()
  };
}

module.exports = {
  interpolateTemplate,
  getStatus,
  seedDefaultTemplates,
  getTemplates,
  createTemplate,
  queueNotification,
  processQueue,
  getQueueItems,
  getMyNotifications,
  markNotificationRead,
  getTelemetry
};
