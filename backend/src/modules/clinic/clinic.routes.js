'use strict';

const express = require('express');
const controller = require('./clinic.controller');
const { protect } = require('../../middleware/auth.middleware');
const { restrictTo } = require('../../middleware/rbac.middleware');
const { tenantStatusGuard, tenantIsolationGuard } = require('../../middleware/tenant.middleware');

const router = express.Router();

router.get('/status', controller.getStatus);

router.use(protect);
router.use(tenantStatusGuard);
router.use(tenantIsolationGuard);

// Baseline Admission Medical Registrations (linked to Admissions & User Signups)
router.get('/profiles', controller.listProfiles);
router.post('/profiles', restrictTo('SUPER_ADMIN', 'ADMIN', 'TEACHER', 'STAFF', 'HR', 'PARENT', 'STUDENT', 'DEVELOPER'), controller.upsertProfile);

// School Clinic Visits, Treatments & Sickbay Admissions (Students & Teachers)
router.get('/visits', controller.listVisits);
router.post('/visits', restrictTo('SUPER_ADMIN', 'ADMIN', 'TEACHER', 'STAFF', 'HR', 'STUDENT', 'DEVELOPER'), controller.admitOrTreatPatient);
router.patch('/visits/:id', restrictTo('SUPER_ADMIN', 'ADMIN', 'TEACHER', 'STAFF', 'HR', 'DEVELOPER'), controller.updateVisit);

// Unified Cross-Portal Record Pull (pulls Baseline Registration + Consultations + Sickbay + Alerts)
router.get('/pull-record', controller.pullMedicalDossier);

// School Clinic Pharmacy & First-Aid Supplies
router.get('/inventory', controller.listInventory);
router.post('/inventory', restrictTo('SUPER_ADMIN', 'ADMIN', 'TEACHER', 'STAFF', 'HR', 'DEVELOPER'), controller.upsertInventory);

module.exports = router;
