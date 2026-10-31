'use strict';

const express = require('express');
const router = express.Router();
const controller = require('./reporting.controller');
const { protect } = require('../../middleware/auth.middleware');
const { restrictTo } = require('../../middleware/rbac.middleware');
const { tenantStatusGuard, tenantIsolationGuard } = require('../../middleware/tenant.middleware');

// 1. Public or Registrar Verification Route
router.get('/status', controller.getStatus);
router.get('/verify/:identifier', controller.verifyDocument);

// Protected routes
router.use(protect);
router.use(tenantStatusGuard);
router.use(tenantIsolationGuard);

// 2. Telemetry & Definitions
router.get('/telemetry', restrictTo('SUPER_ADMIN', 'ADMIN', 'DEVELOPER', 'ACCOUNTANT'), controller.getTelemetry);
router.get('/definitions', controller.getReportDefinitions);
router.get('/analytics/:code', controller.buildReport);

// 3. Document Generation Actions
router.post('/generate/report-card', restrictTo('SUPER_ADMIN', 'ADMIN', 'DEVELOPER', 'TEACHER'), controller.generateReportCard);
router.post('/generate/transcript', restrictTo('SUPER_ADMIN', 'ADMIN', 'DEVELOPER'), controller.generateTranscript);
router.post('/generate/fee-receipt', restrictTo('SUPER_ADMIN', 'ADMIN', 'DEVELOPER', 'ACCOUNTANT'), controller.generateFeeReceipt);
router.post('/generate/enrollment-certificate', restrictTo('SUPER_ADMIN', 'ADMIN', 'DEVELOPER', 'STAFF'), controller.generateEnrollmentCertificate);

// 4. Document Registry
router.get('/documents', controller.getDocuments);
router.get('/documents/:id', controller.getDocumentById);

// 5. Official School Name & Branding for Reports / Transcripts
router.get('/school-branding', controller.getSchoolBranding);
router.put('/school-branding', restrictTo('SUPER_ADMIN', 'ADMIN', 'DEVELOPER'), controller.updateSchoolBranding);
router.post('/school-branding', restrictTo('SUPER_ADMIN', 'ADMIN', 'DEVELOPER'), controller.updateSchoolBranding);

module.exports = router;

