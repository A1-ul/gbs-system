'use strict';

const hrService = require('./hr.service');

function extractTenantId(req) {
  return req.user?.tenantId || req.query.tenantId || req.headers['x-tenant-id'] || 1;
}

async function getStatus(req, res, next) {
  try {
    const data = await hrService.getStatus();
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return next(error);
  }
}

async function getStaff(req, res, next) {
  try {
    const tenantId = extractTenantId(req);
    const result = await hrService.getStaffProfiles(tenantId);
    return res.status(result.success ? 200 : 500).json(result);
  } catch (error) {
    return next(error);
  }
}

async function calculateSalary(req, res, next) {
  try {
    const result = await hrService.calculateSalaryGrouping(req.body);
    return res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    return next(error);
  }
}

async function getLeaves(req, res, next) {
  try {
    const tenantId = extractTenantId(req);
    const result = await hrService.getLeaveRequests(tenantId);
    return res.status(result.success ? 200 : 500).json(result);
  } catch (error) {
    return next(error);
  }
}

async function createLeave(req, res, next) {
  try {
    const tenantId = extractTenantId(req);
    const result = await hrService.createLeaveRequest(req.body, tenantId);
    return res.status(result.success ? 201 : 400).json(result);
  } catch (error) {
    return next(error);
  }
}

async function updateLeaveStatus(req, res, next) {
  try {
    const tenantId = extractTenantId(req);
    const result = await hrService.updateLeaveStatus(req.params.id, req.body, tenantId);
    return res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    return next(error);
  }
}

async function getStats(req, res, next) {
  try {
    const tenantId = extractTenantId(req);
    const result = await hrService.getStats(tenantId);
    return res.status(result.success ? 200 : 500).json(result);
  } catch (error) {
    return next(error);
  }
}

async function getPositions(req, res, next) {
  try {
    const tenantId = extractTenantId(req);
    const result = await hrService.getPositions(tenantId);
    return res.status(result.success ? 200 : 500).json(result);
  } catch (error) {
    return next(error);
  }
}

async function createPosition(req, res, next) {
  try {
    const tenantId = extractTenantId(req);
    const result = await hrService.createPosition(req.body, tenantId);
    return res.status(result.success ? 201 : 400).json(result);
  } catch (error) {
    return next(error);
  }
}

async function deletePosition(req, res, next) {
  try {
    const result = await hrService.deletePosition(req.params.id);
    return res.status(result.success ? 200 : 404).json(result);
  } catch (error) {
    return next(error);
  }
}

async function getStaffAssignments(req, res, next) {
  try {
    const tenantId = extractTenantId(req);
    const result = await hrService.getStaffAssignments(tenantId);
    return res.status(result.success ? 200 : 500).json(result);
  } catch (error) {
    return next(error);
  }
}

async function assignStaffPosition(req, res, next) {
  try {
    const tenantId = extractTenantId(req);
    const result = await hrService.assignStaffPosition(req.body, tenantId);
    return res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getStatus,
  getStaff,
  calculateSalary,
  getLeaves,
  createLeave,
  updateLeaveStatus,
  getStats,
  getPositions,
  createPosition,
  deletePosition,
  getStaffAssignments,
  assignStaffPosition
};

