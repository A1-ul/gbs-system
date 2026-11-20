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

// Baseline Admission Medical Registrations (self-view/self-update for users; Headmaster oversees all staff & student profiles)
router.get('/profiles', controller.listProfiles);
router.post('/profiles', restrictTo('SUPER_ADMIN', 'ADMIN', 'HEADMASTER', 'TEACHER', 'STAFF', 'HR', 'PARENT', 'STUDENT', 'ACCOUNTANT', 'DEVELOPER'), controller.upsertProfile);

// School Clinic Visits & Medical History (users read own records only; Headmaster executes clinic processes)
router.get('/visits', controller.listVisits);
router.post('/visits', restrictTo('SUPER_ADMIN', 'ADMIN', 'HEADMASTER', 'DEVELOPER'), controller.admitOrTreatPatient);
router.patch('/visits/:id', restrictTo('SUPER_ADMIN', 'ADMIN', 'HEADMASTER', 'DEVELOPER'), controller.updateVisit);

// Unified Record Pull (self/ward scoped for regular users; full cross-roster search for Headmaster)
router.get('/pull-record', controller.pullMedicalDossier);

// School Clinic Pharmacy & First-Aid Supplies (strictly Headmaster clinic management)
router.get('/inventory', restrictTo('SUPER_ADMIN', 'ADMIN', 'HEADMASTER', 'DEVELOPER'), controller.listInventory);
router.post('/inventory', restrictTo('SUPER_ADMIN', 'ADMIN', 'HEADMASTER', 'DEVELOPER'), controller.upsertInventory);

module.exports = router;
