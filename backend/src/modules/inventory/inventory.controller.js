'use strict';

const inventoryService = require('./inventory.service');

function extractTenantId(req) {
  return req.user?.tenantId || req.query.tenantId || req.headers['x-tenant-id'] || 1;
}

async function getStatus(req, res, next) {
  try {
    const data = await inventoryService.getStatus();
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return next(error);
  }
}

async function getItems(req, res, next) {
  try {
    const tenantId = extractTenantId(req);
    const category = req.query.category || '';
    const search = req.query.search || req.query.q || '';
    const result = await inventoryService.getItems(tenantId, category, search);
    return res.status(result.success ? 200 : 500).json(result);
  } catch (error) {
    return next(error);
  }
}

async function createItem(req, res, next) {
  try {
    const tenantId = extractTenantId(req);
    const result = await inventoryService.createItem(req.body, tenantId);
    return res.status(result.success ? 201 : 400).json(result);
  } catch (error) {
    return next(error);
  }
}

async function adjustStock(req, res, next) {
  try {
    const tenantId = extractTenantId(req);
    const result = await inventoryService.adjustStock(req.params.id, req.body, tenantId);
    return res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    return next(error);
  }
}

async function getRequests(req, res, next) {
  try {
    const tenantId = extractTenantId(req);
    const result = await inventoryService.getRequests(tenantId);
    return res.status(result.success ? 200 : 500).json(result);
  } catch (error) {
    return next(error);
  }
}

async function createRequest(req, res, next) {
  try {
    const tenantId = extractTenantId(req);
    const result = await inventoryService.createRequest(req.body, tenantId);
    return res.status(result.success ? 201 : 400).json(result);
  } catch (error) {
    return next(error);
  }
}

async function updateRequestStatus(req, res, next) {
  try {
    const tenantId = extractTenantId(req);
    const result = await inventoryService.updateRequestStatus(req.params.id, req.body, tenantId);
    return res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    return next(error);
  }
}

async function getStats(req, res, next) {
  try {
    const tenantId = extractTenantId(req);
    const result = await inventoryService.getStats(tenantId);
    return res.status(result.success ? 200 : 500).json(result);
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getStatus,
  getItems,
  createItem,
  adjustStock,
  getRequests,
  createRequest,
  updateRequestStatus,
  getStats
};
