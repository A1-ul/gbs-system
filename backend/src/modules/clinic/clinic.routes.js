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

// Baseline Admission Medical Registrations
// GET: Doctors & Nurses see all school medical profiles; all other staff/students see ONLY their own health status (Parents see linked ward only)
// POST: Strictly School Doctors & Nurses ONLY (remaining staff cannot edit health status)
router.get('/profiles', controller.listProfiles);
router.post('/profiles', restrictTo('CLINIC_DOCTOR', 'CLINIC_NURSE', 'DOCTOR', 'NURSE'), controller.upsertProfile);

// School Clinic Visits & Medical History
// GET: Doctors & Nurses see all clinic visits & sickbay ops; all other staff/students see ONLY their own personal status/visits (read-only)
// POST/PATCH: Strictly School Doctors & Nurses ONLY
router.get('/visits', controller.listVisits);
router.post('/visits', restrictTo('CLINIC_DOCTOR', 'CLINIC_NURSE', 'DOCTOR', 'NURSE'), controller.admitOrTreatPatient);
router.patch('/visits/:id', restrictTo('CLINIC_DOCTOR', 'CLINIC_NURSE', 'DOCTOR', 'NURSE'), controller.updateVisit);

// Unified Cross-Portal Record Pull (Strictly School Doctors & Nurses ONLY)
router.get('/pull-record', restrictTo('CLINIC_DOCTOR', 'CLINIC_NURSE', 'DOCTOR', 'NURSE'), controller.pullMedicalDossier);

// School Clinic Pharmacy & First-Aid Supplies (Strictly School Doctors & Nurses ONLY)
router.get('/inventory', restrictTo('CLINIC_DOCTOR', 'CLINIC_NURSE', 'DOCTOR', 'NURSE'), controller.listInventory);
router.post('/inventory', restrictTo('CLINIC_DOCTOR', 'CLINIC_NURSE', 'DOCTOR', 'NURSE'), controller.upsertInventory);

module.exports = router;
