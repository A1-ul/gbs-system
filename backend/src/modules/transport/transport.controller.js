'use strict';

const transportService = require('./transport.service');

function extractTenantId(req) {
  return req.user?.tenantId || req.query.tenantId || req.headers['x-tenant-id'] || 1;
}

async function getStatus(req, res, next) {
  try {
    const data = await transportService.getStatus();
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return next(error);
  }
}

async function getRoutes(req, res, next) {
  try {
    const tenantId = extractTenantId(req);
    const result = await transportService.getRoutes(tenantId);
    return res.status(result.success ? 200 : 500).json(result);
  } catch (error) {
    return next(error);
  }
}

async function createRoute(req, res, next) {
  try {
    const tenantId = extractTenantId(req);
    const result = await transportService.createRoute(req.body, tenantId);
    return res.status(result.success ? 201 : 400).json(result);
  } catch (error) {
    return next(error);
  }
}

async function getVehicles(req, res, next) {
  try {
    const tenantId = extractTenantId(req);
    const result = await transportService.getVehicles(tenantId);
    return res.status(result.success ? 200 : 500).json(result);
  } catch (error) {
    return next(error);
  }
}

async function createVehicle(req, res, next) {
  try {
    const tenantId = extractTenantId(req);
    const result = await transportService.createVehicle(req.body, tenantId);
    return res.status(result.success ? 201 : 400).json(result);
  } catch (error) {
    return next(error);
  }
}

async function getAssignments(req, res, next) {
  try {
    const tenantId = extractTenantId(req);
    const result = await transportService.getAssignments(tenantId);
    return res.status(result.success ? 200 : 500).json(result);
  } catch (error) {
    return next(error);
  }
}

async function assignStudent(req, res, next) {
  try {
    const tenantId = extractTenantId(req);
    const result = await transportService.assignStudent(req.body, tenantId);
    return res.status(result.success ? 201 : 400).json(result);
  } catch (error) {
    return next(error);
  }
}

async function getStats(req, res, next) {
  try {
    const tenantId = extractTenantId(req);
    const result = await transportService.getStats(tenantId);
    return res.status(result.success ? 200 : 500).json(result);
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getStatus,
  getRoutes,
  createRoute,
  getVehicles,
  createVehicle,
  getAssignments,
  assignStudent,
  getStats
};
