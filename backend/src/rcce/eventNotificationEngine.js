'use strict';

const EventEmitter = require('events');
const prisma = require('../core/database/prisma.client');
const { readPersistentStore, writePersistentStore } = require('../core/database/persistentStore');
const { getIO } = require('../core/socket/socketServer');

/**
 * GBS EVENT AND NOTIFICATION ENGINE (GBS-RCCE)
 * Communicates important activities and changes across the entire system.
 * Generates events on every critical domain action,
 * delivers real-time WebSocket signals to connected dashboards,
 * and records reliable in-app notifications for offline or background review.
 */

// Canonical Event Definitions
const RCCE_EVENTS = Object.freeze({
  USER_REGISTERED: 'USER_REGISTERED',
  STUDENT_ADMITTED: 'STUDENT_ADMITTED',
  PAYMENT_RECEIVED: 'PAYMENT_RECEIVED',
  PAYMENT_REJECTED: 'PAYMENT_REJECTED',
  RECORD_UPDATED: 'RECORD_UPDATED',
  REQUEST_SUBMITTED: 'REQUEST_SUBMITTED',
  REQUEST_APPROVED: 'REQUEST_APPROVED',
  REQUEST_REJECTED: 'REQUEST_REJECTED',
  REPORT_GENERATED: 'REPORT_GENERATED',
  ACCOUNT_SUSPENDED: 'ACCOUNT_SUSPENDED',
  SUBSCRIPTION_EXPIRED: 'SUBSCRIPTION_EXPIRED',
  SYSTEM_ERROR_DETECTED: 'SYSTEM_ERROR_DETECTED',
  ATTENDANCE_COMPLETED: 'ATTENDANCE_COMPLETED',
  EXAM_SCORED: 'EXAM_SCORED',
  EXAM_VETTING_SUBMITTED: 'EXAM_VETTING_SUBMITTED',
  EXAM_CONFIRMED_ONGOING: 'EXAM_CONFIRMED_ONGOING',
  EXAM_REVISION_REQUESTED: 'EXAM_REVISION_REQUESTED',
  EXAM_VETTING_REJECTED: 'EXAM_VETTING_REJECTED',
  TOPIC_VIDEO_PUBLISHED: 'TOPIC_VIDEO_PUBLISHED',
  DB_POOL_WARNING_80: 'DB_POOL_WARNING_80',
  DB_POOL_CRITICAL_95: 'DB_POOL_CRITICAL_95',
  INFRA_STORAGE_WARNING: 'INFRA_STORAGE_WARNING'
});

class EventNotificationEngine extends EventEmitter {
  constructor() {
    super();
    this.eventHistory = [];
    this.maxHistory = 500;
  }

  /**
   * Dispatch a system-wide domain event
   * @param {string} eventType - RCCE event type from RCCE_EVENTS
   * @param {object} payload - Event payload
   * @param {object} [context] - Execution context (tenantId, userId, actorRole, requestId)
   */
  async emitEvent(eventType, payload = {}, context = {}) {
    const timestamp = new Date().toISOString();
    const eventId = `EVT-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

    const eventRecord = {
      id: eventId,
      type: eventType,
      payload,
      context: {
        tenantId: context.tenantId || payload.tenantId || 1,
        userId: context.userId || payload.userId || null,
        actorRole: context.actorRole || payload.actorRole || 'SYSTEM',
        requestId: context.requestId || payload.requestId || null,
        ipAddress: context.ipAddress || '127.0.0.1'
      },
      timestamp
    };

    // Store in circular in-memory buffer
    this.eventHistory.unshift(eventRecord);
    if (this.eventHistory.length > this.maxHistory) {
      this.eventHistory.pop();
    }

    // Trigger local listeners
    this.emit(eventType, eventRecord);
    this.emit('*', eventRecord);

    // 1. Deliver Real-Time WebSocket signal
    this._dispatchRealTime(eventRecord);

    // 2. Persist notification queue item for target recipients
    await this._persistNotification(eventRecord);

    return eventRecord;
  }

  /**
   * Real-Time WebSocket signal dispatcher
   */
  _dispatchRealTime(eventRecord) {
    try {
      const io = getIO();
      if (!io) return;

      const { type, payload, context } = eventRecord;
      const tenantRoom = `tenant:${context.tenantId}`;
      const userRoom = context.userId ? `user:${context.userId}` : null;

      // Broadcast event to tenant room
      io.to(tenantRoom).emit('gbs:domain-event', eventRecord);

      // Specific direct target
      if (userRoom) {
        io.to(userRoom).emit('gbs:notification', {
          eventId: eventRecord.id,
          type,
          title: this._formatEventTitle(type),
          message: payload.message || this._formatEventMessage(type, payload),
          timestamp: eventRecord.timestamp
        });
      }

      // Developer control broadcast
      io.to('developer:control').emit('gbs:developer-telemetry-event', eventRecord);
    } catch (err) {
      // Non-blocking real-time dispatch
    }
  }

  /**
   * Persist in-app notification item to PostgreSQL or persistent store fallback
   */
  async _persistNotification(eventRecord) {
    const { type, payload, context } = eventRecord;
    const title = this._formatEventTitle(type);
    const content = payload.message || this._formatEventMessage(type, payload);
    const tenantId = Number(context.tenantId) || 1;

    const notifItem = {
      id: `NTF-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      tenantId,
      userId: context.userId ? Number(context.userId) : null,
      channel: 'IN_APP',
      title,
      content,
      status: 'DELIVERED',
      priority: ['SYSTEM_ERROR_DETECTED', 'ACCOUNT_SUSPENDED', 'SUBSCRIPTION_EXPIRED'].includes(type) ? 'HIGH' : 'NORMAL',
      metadata: JSON.stringify({ eventType: type, payload, eventId: eventRecord.id }),
      createdAt: eventRecord.timestamp
    };

    // 1. Write to persistent hybrid store
    try {
      writePersistentStore((curr) => {
        const queue = Array.isArray(curr.notificationQueue) ? curr.notificationQueue : [];
        return {
          ...curr,
          notificationQueue: [notifItem, ...queue].slice(0, 300)
        };
      });
    } catch (_) { }

    // 2. Persist to PostgreSQL if online
    try {
      await prisma.notificationQueueItem.create({
        data: {
          tenantId,
          userId: null,
          recipientContact: payload.recipientEmail || payload.recipientPhone || 'portal_user',
          recipientName: payload.recipientName || 'Portal User',
          channel: 'IN_APP',
          title,
          content,
          status: 'DELIVERED',
          priority: notifItem.priority,
          metadata: notifItem.metadata
        }
      }).catch(() => { });
    } catch (_) { }
  }

  _formatEventTitle(eventType) {
    const titles = {
      USER_REGISTERED: '👤 New User Account Registered',
      STUDENT_ADMITTED: '🎓 Admission Application Approved',
      PAYMENT_RECEIVED: '💳 Fee Payment Received & Stamped',
      PAYMENT_REJECTED: '⚠️ Payment Transaction Failed',
      RECORD_UPDATED: '📝 System Record Updated',
      REQUEST_SUBMITTED: '📋 New Request Submitted',
      REQUEST_APPROVED: '✅ Request Approved',
      REQUEST_REJECTED: '❌ Request Declined',
      REPORT_GENERATED: '📊 Official Report Generated',
      ACCOUNT_SUSPENDED: '⛔ Account Suspended by Administration',
      SUBSCRIPTION_EXPIRED: '⏰ Institutional Subscription Alert',
      SYSTEM_ERROR_DETECTED: '🚨 System Error Diagnostic Alert',
      ATTENDANCE_COMPLETED: '📅 Daily Roll Call Archived',
      EXAM_SCORED: '💯 Examination Grade Published',
      EXAM_VETTING_SUBMITTED: '📝 End-of-Term / Semester Exam Submitted for Vetting',
      EXAM_CONFIRMED_ONGOING: '✅ Exam Vetted & Confirmed for Ongoing Exams',
      EXAM_REVISION_REQUESTED: '⚠️ Exam Vetting Revision Requested by Headmaster',
      EXAM_VETTING_REJECTED: '❌ Exam Paper Declined During Vetting',
      TOPIC_VIDEO_PUBLISHED: '🎥 Topic Video Lesson Published'
    };
    return titles[eventType] || '🔔 System Notification';
  }

  _formatEventMessage(eventType, payload) {
    if (payload.message) return payload.message;
    if (payload.applicantName) return `Admission dossier for ${payload.applicantName} updated to ${payload.status || 'PROCESSED'}.`;
    if (payload.amount) return `Payment of GH₵ ${payload.amount} confirmed with receipt #${payload.receiptNumber || 'N/A'}.`;
    if (payload.className) return `Roll call session for ${payload.className} synchronized.`;
    return `System event ${eventType} completed successfully.`;
  }

  /**
   * Retrieve notification stream for a user or tenant
   */
  getNotifications(tenantId = null, userId = null, limit = 50) {
    const store = readPersistentStore();
    let queue = Array.isArray(store.notificationQueue) ? store.notificationQueue : [];

    if (tenantId) {
      queue = queue.filter((n) => !n.tenantId || String(n.tenantId) === String(tenantId));
    }
    if (userId) {
      queue = queue.filter((n) => !n.userId || String(n.userId) === String(userId));
    }

    return queue.slice(0, limit);
  }

  /**
   * Mark notification as read
   */
  markAsRead(notificationId) {
    let target = null;
    writePersistentStore((curr) => {
      const queue = (curr.notificationQueue || []).map((n) => {
        if (String(n.id) === String(notificationId)) {
          target = { ...n, readAt: new Date().toISOString() };
          return target;
        }
        return n;
      });
      return { ...curr, notificationQueue: queue };
    });
    return target;
  }
}

const eventNotificationEngine = new EventNotificationEngine();

module.exports = {
  RCCE_EVENTS,
  EventNotificationEngine,
  eventNotificationEngine
};
