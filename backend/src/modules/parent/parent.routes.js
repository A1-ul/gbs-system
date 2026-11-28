'use strict';

const express = require('express');
const router = express.Router();
const controller = require('./parent.controller');
const { protect } = require('../../middleware/auth.middleware');
const { restrictTo } = require('../../middleware/rbac.middleware');
const { tenantStatusGuard, tenantIsolationGuard } = require('../../middleware/tenant.middleware');

router.use(protect);
router.use(tenantStatusGuard);
router.use(tenantIsolationGuard);

// 1. Parent viewing their own children
router.get('/my-children', controller.getMyChildren);
router.get('/children', controller.getMyChildren);

// 2. Parent viewing specific child's overview (attendance, online classes, homework)
router.get('/children/:studentId/overview', controller.getChildOverview);

const EMERGENCY_SEARCH_ROLES = [
  'SUPER_ADMIN', 'ADMIN', 'HEADMASTER', 'PRINCIPAL',
  'TEACHER', 'SECRETARY', 'CLINIC_DOCTOR', 'CLINIC_NURSE',
  'STAFF', 'HR', 'DEVELOPER'
];

// 3. Authorized School Emergency Locator search by phone number (strictly blocked for Student/Alumni)
router.get('/emergency-search', restrictTo(...EMERGENCY_SEARCH_ROLES), controller.searchEmergencyContact);
router.post('/emergency-search', restrictTo(...EMERGENCY_SEARCH_ROLES), controller.searchEmergencyContact);
router.get('/search', restrictTo(...EMERGENCY_SEARCH_ROLES), controller.searchEmergencyContact);
router.post('/search', restrictTo(...EMERGENCY_SEARCH_ROLES), controller.searchEmergencyContact);
router.post('/live-location', controller.updateLiveLocation);

// 4. Admin managing parent-student links
router.get('/links', restrictTo('SUPER_ADMIN', 'ADMIN', 'DEVELOPER'), controller.getAllParentLinks);
router.post('/link', restrictTo('SUPER_ADMIN', 'ADMIN', 'DEVELOPER'), controller.linkParentStudent);

module.exports = router;