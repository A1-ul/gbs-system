'use strict';

const service = require('./notifications.service');

async function getStatus(req, res, next) {
  try {
    const data = await service.getStatus();
    res.status(200).json({ status: 'success', data });
  } catch (error) {
    next(error);
  }
}

async function getTemplates(req, res, next) {
  try {
    const templates = await service.getTemplates(req.tenantId, req.query);
    res.status(200).json({ status: 'success', results: templates.length, data: { templates } });
  } catch (error) {
    next(error);
  }
}

async function createTemplate(req, res, next) {
  try {
    const template = await service.createTemplate(req.tenantId, req.body, req.user);
    res.status(201).json({ status: 'success', message: 'Notification template created.', data: { template } });
  } catch (error) {
    next(error);
  }
}

async function queueNotification(req, res, next) {
  try {
    const queueItem = await service.queueNotification(req.tenantId, req.body, req.user);
    res.status(201).json({ status: 'success', message: 'Notification queued for dispatch.', data: { queueItem } });
  } catch (error) {
    next(error);
  }
}

async function processQueue(req, res, next) {
  try {
    const result = await service.processQueue(req.tenantId, req.body.batchSize, req.user);
    res.status(200).json({ status: 'success', message: `Processed and dispatched ${result.processedCount} notifications.`, data: result });
  } catch (error) {
    next(error);
  }
}

async function getQueueItems(req, res, next) {
  try {
    const items = await service.getQueueItems(req.tenantId, req.query);
    res.status(200).json({ status: 'success', results: items.length, data: { items } });
  } catch (error) {
    next(error);
  }
}

async function getMyNotifications(req, res, next) {
  try {
    const data = await service.getMyNotifications(req.tenantId, req.user.id);
    res.status(200).json({ status: 'success', data });
  } catch (error) {
    next(error);
  }
}

async function markNotificationRead(req, res, next) {
  try {
    const item = await service.markNotificationRead(req.tenantId, req.params.id, req.user.id);
    res.status(200).json({ status: 'success', message: 'Notification marked as read.', data: { item } });
  } catch (error) {
    next(error);
  }
}

async function getTelemetry(req, res, next) {
  try {
    const telemetry = await service.getTelemetry(req.tenantId);
    res.status(200).json({ status: 'success', data: { telemetry } });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getStatus,
  getTemplates,
  createTemplate,
  queueNotification,
  processQueue,
  getQueueItems,
  getMyNotifications,
  markNotificationRead,
  getTelemetry
};
