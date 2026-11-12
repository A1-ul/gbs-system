'use strict';

const express = require('express');
const router = express.Router();
const controller = require('./admissions.controller');
const { protect } = require('../../middleware/auth.middleware');
const { restrictTo } = require('../../middleware/rbac.middleware');
const { tenantStatusGuard, tenantIsolationGuard } = require('../../middleware/tenant.middleware');

// 1. Public or Prospective Inquiry Endpoints
router.get('/status', controller.getStatus);

// All operational routes require authentication and tenant isolation
router.use(protect);
router.use(tenantStatusGuard);
router.use(tenantIsolationGuard);

// 2. Applications Pipeline Query & Analytics
router.get('/analytics', controller.getAnalytics);
router.post('/inquiry', controller.createInquiry);
router.route('/')
  .get(controller.getApplications)
  .post(controller.createInquiry);

router.post('/batch-delete', restrictTo('ADMIN', 'DEVELOPER'), controller.batchDeleteApplications);

// 3. Application Lifecycle Actions
router.route('/:id')
  .get(controller.getApplicationById)
  .patch(restrictTo('ADMIN', 'DEVELOPER'), controller.updateApplication)
  .put(restrictTo('ADMIN', 'DEVELOPER'), controller.updateApplication);

router.post('/:id/apply', controller.submitApplication);
router.post('/:id/documents', controller.uploadDocument);
router.patch('/documents/:documentId/verify', restrictTo('ADMIN', 'DEVELOPER'), controller.verifyDocument);
router.post('/:id/schedule-interview', restrictTo('ADMIN', 'DEVELOPER'), controller.scheduleInterview);
router.post('/:id/approve', restrictTo('ADMIN', 'DEVELOPER'), controller.approveApplication);
router.post('/:id/reject', restrictTo('ADMIN', 'DEVELOPER'), controller.rejectApplication);
router.delete('/:id', restrictTo('ADMIN', 'DEVELOPER'), controller.deleteApplication);

module.exports = router;