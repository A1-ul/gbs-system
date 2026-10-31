'use strict';

const service = require('./workflow.service');

async function getStatus(req, res, next) {
  try {
    const data = await service.getStatus();
    res.status(200).json({ status: 'success', data });
  } catch (error) {
    next(error);
  }
}

async function getRules(req, res, next) {
  try {
    const rules = await service.getRules(req.tenantId, req.query);
    res.status(200).json({ status: 'success', results: rules.length, data: { rules } });
  } catch (error) {
    next(error);
  }
}

async function createRule(req, res, next) {
  try {
    const rule = await service.createRule(req.tenantId, req.body, req.user);
    res.status(201).json({ status: 'success', message: 'Workflow automation rule created.', data: { rule } });
  } catch (error) {
    next(error);
  }
}

async function updateRule(req, res, next) {
  try {
    const rule = await service.updateRule(req.tenantId, req.params.id, req.body, req.user);
    res.status(200).json({ status: 'success', message: 'Workflow rule updated.', data: { rule } });
  } catch (error) {
    next(error);
  }
}

async function deleteRule(req, res, next) {
  try {
    const result = await service.deleteRule(req.tenantId, req.params.id, req.user);
    res.status(200).json({ status: 'success', message: result.message });
  } catch (error) {
    next(error);
  }
}

async function triggerEvent(req, res, next) {
  try {
    const { triggerEvent, payload } = req.body;
    if (!triggerEvent) {
      return res.status(400).json({ status: 'fail', message: 'triggerEvent is required in request body.' });
    }
    const result = await service.triggerEvent(req.tenantId, triggerEvent, payload, req.user);
    res.status(200).json({
      status: 'success',
      message: `Event '${triggerEvent}' evaluated successfully.`,
      data: result
    });
  } catch (error) {
    next(error);
  }
}

async function getExecutions(req, res, next) {
  try {
    const executions = await service.getExecutions(req.tenantId, req.query);
    res.status(200).json({ status: 'success', results: executions.length, data: { executions } });
  } catch (error) {
    next(error);
  }
}

async function getTelemetry(req, res, next) {
  try {
    const telemetry = await service.getWorkflowTelemetry(req.tenantId);
    res.status(200).json({ status: 'success', data: { telemetry } });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getStatus,
  getRules,
  createRule,
  updateRule,
  deleteRule,
  triggerEvent,
  getExecutions,
  getTelemetry
};
