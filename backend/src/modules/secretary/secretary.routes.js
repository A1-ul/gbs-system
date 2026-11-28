'use strict';

const express = require('express');
const router = express.Router();
const controller = require('./secretary.controller');
const { protect } = require('../../middleware/auth.middleware');
const { restrictTo } = require('../../middleware/rbac.middleware');
const { tenantStatusGuard, tenantIsolationGuard } = require('../../middleware/tenant.middleware');

router.use(protect);
router.use(tenantStatusGuard);
router.use(tenantIsolationGuard);

const FRONT_OFFICE_ROLES = ['SECRETARY', 'ADMIN', 'SUPER_ADMIN', 'HEADMASTER', 'PRINCIPAL', 'HR', 'DEVELOPER'];
const READ_CIRCULARS_ROLES = [
  'SECRETARY',
  'ADMIN',
  'SUPER_ADMIN',
  'HEADMASTER',
  'PRINCIPAL',
  'TEACHER',
  'STAFF',
  'ACCOUNTANT',
  'HR',
  'PARENT',
  'STUDENT',
  'DEVELOPER'
];

router.get('/overview', restrictTo(...FRONT_OFFICE_ROLES), controller.getOverview);
router.get('/records', restrictTo(...READ_CIRCULARS_ROLES), controller.getRecords);
router.post('/records', restrictTo(...FRONT_OFFICE_ROLES), controller.createRecord);
router.patch('/records/:id/status', restrictTo(...FRONT_OFFICE_ROLES), controller.updateStatus);
router.delete('/records/:id', restrictTo(...FRONT_OFFICE_ROLES), controller.deleteRecord);

module.exports = router;
