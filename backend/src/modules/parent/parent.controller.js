'use strict';

const service = require('./parent.service');

async function linkParentStudent(req, res, next) {
  try {
    const link = await service.linkParentStudent(req.tenantId, req.body, req.user);
    res.status(201).json({
      status: 'success',
      message: 'Parent and student linked successfully.',
      data: { link }
    });
  } catch (error) {
    next(error);
  }
}

async function getMyChildren(req, res, next) {
  try {
    // If user is PARENT, use their ID; else allow parentId param
    const parentId = req.user.role === 'PARENT' ? req.user.id : (req.query.parentId || req.user.id);
    const children = await service.getParentChildren(req.tenantId, parentId);
    res.status(200).json({
      status: 'success',
      results: children.length,
      data: { children }
    });
  } catch (error) {
    next(error);
  }
}

async function getChildOverview(req, res, next) {
  try {
    const parentId = req.user.role === 'PARENT' ? req.user.id : (req.query.parentId || req.user.id);
    const overview = await service.getChildOverview(req.tenantId, parentId, req.params.studentId);
    res.status(200).json({
      status: 'success',
      data: { overview }
    });
  } catch (error) {
    next(error);
  }
}

async function searchEmergencyContact(req, res, next) {
  try {
    const phone = req.query.phone || req.body.phone || req.query.studentName || req.body.studentName || req.query.search || req.body.search || '';
    const tenantId = req.tenantId || req.user?.tenantId || 1;
    const results = await service.searchEmergencyContact(tenantId, phone, req.user);
    res.status(200).json({
      status: 'success',
      results: results.length,
      data: { emergencyContacts: results }
    });
  } catch (error) {
    next(error);
  }
}

async function updateLiveLocation(req, res, next) {
  try {
    const tenantId = req.tenantId || req.user?.tenantId || 1;
    const result = await service.updateLiveLocation(tenantId, req.user, req.body);
    res.status(200).json({
      status: 'success',
      message: 'Parent live GPS beacon synchronized.',
      data: result
    });
  } catch (error) {
    next(error);
  }
}

async function getAllParentLinks(req, res, next) {
  try {
    const links = await service.getAllParentLinks(req.tenantId);
    res.status(200).json({
      status: 'success',
      results: links.length,
      data: { links }
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  linkParentStudent,
  getMyChildren,
  getChildOverview,
  searchEmergencyContact,
  getAllParentLinks,
  updateLiveLocation
};