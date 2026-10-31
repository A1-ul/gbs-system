'use strict';

const service = require('./admissions.service');

async function getStatus(req, res, next) {
  try {
    const data = await service.getStatus();
    res.status(200).json({ status: 'success', data });
  } catch (error) {
    next(error);
  }
}

async function createInquiry(req, res, next) {
  try {
    const application = await service.createInquiry(req.tenantId, req.body, req.user);
    res.status(201).json({
      status: 'success',
      message: 'Admission inquiry submitted successfully.',
      data: { application }
    });
  } catch (error) {
    next(error);
  }
}

async function submitApplication(req, res, next) {
  try {
    const application = await service.submitApplication(req.tenantId, req.params.id, req.body, req.user);
    res.status(200).json({
      status: 'success',
      message: 'Admission application details submitted.',
      data: { application }
    });
  } catch (error) {
    next(error);
  }
}

async function uploadDocument(req, res, next) {
  try {
    const document = await service.uploadDocument(req.tenantId, req.params.id, req.body, req.user);
    res.status(201).json({
      status: 'success',
      message: 'Admission document attached successfully.',
      data: { document }
    });
  } catch (error) {
    next(error);
  }
}

async function verifyDocument(req, res, next) {
  try {
    const document = await service.verifyDocument(req.tenantId, req.params.documentId, req.body, req.user);
    res.status(200).json({
      status: 'success',
      message: 'Document verification status updated.',
      data: { document }
    });
  } catch (error) {
    next(error);
  }
}

async function scheduleInterview(req, res, next) {
  try {
    const application = await service.scheduleInterview(req.tenantId, req.params.id, req.body, req.user);
    res.status(200).json({
      status: 'success',
      message: 'Admissions interview scheduled.',
      data: { application }
    });
  } catch (error) {
    next(error);
  }
}

async function approveApplication(req, res, next) {
  try {
    const result = await service.approveApplication(req.tenantId, req.params.id, req.body, req.user);
    res.status(200).json({
      status: 'success',
      message: 'Application approved! Student provisioned and enrolled.',
      data: result
    });
  } catch (error) {
    next(error);
  }
}

async function rejectApplication(req, res, next) {
  try {
    const application = await service.rejectApplication(req.tenantId, req.params.id, req.body, req.user);
    res.status(200).json({
      status: 'success',
      message: 'Application status marked as rejected.',
      data: { application }
    });
  } catch (error) {
    next(error);
  }
}

async function getApplications(req, res, next) {
  try {
    const applications = await service.getApplications(req.tenantId, req.query);
    res.status(200).json({
      status: 'success',
      results: applications.length,
      data: { applications }
    });
  } catch (error) {
    next(error);
  }
}

async function getApplicationById(req, res, next) {
  try {
    const application = await service.getApplicationById(req.tenantId, req.params.id);
    res.status(200).json({
      status: 'success',
      data: { application }
    });
  } catch (error) {
    next(error);
  }
}

async function deleteApplication(req, res, next) {
  try {
    const result = await service.deleteApplication(req.tenantId, req.params.id, req.user);
    res.status(200).json({
      status: 'success',
      message: result.message,
      data: result
    });
  } catch (error) {
    next(error);
  }
}

async function batchDeleteApplications(req, res, next) {
  try {
    const { ids } = req.body;
    const result = await service.batchDeleteApplications(req.tenantId, ids, req.user);
    res.status(200).json({
      status: 'success',
      message: result.message,
      data: result
    });
  } catch (error) {
    next(error);
  }
}

async function getAnalytics(req, res, next) {
  try {
    const analytics = await service.getAnalytics(req.tenantId);
    res.status(200).json({
      status: 'success',
      data: { analytics }
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getStatus,
  createInquiry,
  submitApplication,
  uploadDocument,
  verifyDocument,
  scheduleInterview,
  approveApplication,
  rejectApplication,
  deleteApplication,
  batchDeleteApplications,
  getApplications,
  getApplicationById,
  getAnalytics
};