const express = require('express');
const router = express.Router();
const facilityController = require('./facility.controller');
const { protect } = require('../../middleware/auth.middleware');
const { restrictTo } = require('../../middleware/rbac.middleware');
const { tenantStatusGuard, tenantIsolationGuard } = require('../../middleware/tenant.middleware');

const FACILITY_STAFF_ROLES = [
  'ADMIN', 'SUPER_ADMIN', 'HEADMASTER', 'PRINCIPAL',
  'STAFF', 'TEACHER', 'SECRETARY', 'ACCOUNTANT', 'HR',
  'CLINIC_DOCTOR', 'CLINIC_NURSE', 'DEVELOPER'
];
const FACILITY_MANAGER_ROLES = [
  'ADMIN', 'SUPER_ADMIN', 'HEADMASTER', 'PRINCIPAL',
  'STAFF', 'HR', 'DEVELOPER'
];

router.use(protect);
router.use(tenantStatusGuard);
router.use(tenantIsolationGuard);

router.get('/tickets', restrictTo(...FACILITY_STAFF_ROLES), facilityController.getTickets);
router.post('/tickets', restrictTo(...FACILITY_STAFF_ROLES), facilityController.createTicket);
router.patch('/tickets/:id/status', restrictTo(...FACILITY_MANAGER_ROLES), facilityController.updateTicketStatus);
router.get('/stats', restrictTo(...FACILITY_STAFF_ROLES), facilityController.getStats);

module.exports = router;
