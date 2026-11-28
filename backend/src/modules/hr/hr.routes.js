'use strict';

const express = require('express');
const router = express.Router();
const controller = require('./hr.controller');
const { protect } = require('../../middleware/auth.middleware');
const { restrictTo } = require('../../middleware/rbac.middleware');
const { tenantStatusGuard, tenantIsolationGuard } = require('../../middleware/tenant.middleware');

const HR_ADMIN_ROLES = ['HR', 'ADMIN', 'SUPER_ADMIN', 'HEADMASTER', 'PRINCIPAL', 'DEVELOPER'];
const HR_FINANCE_ROLES = ['HR', 'ACCOUNTANT', 'ADMIN', 'SUPER_ADMIN', 'HEADMASTER', 'PRINCIPAL', 'DEVELOPER'];
const INSTITUTION_STAFF_ROLES = [
  'HR', 'ADMIN', 'SUPER_ADMIN', 'HEADMASTER', 'PRINCIPAL',
  'TEACHER', 'SECRETARY', 'ACCOUNTANT', 'STAFF',
  'CLINIC_DOCTOR', 'CLINIC_NURSE', 'DEVELOPER'
];

router.get('/status', controller.getStatus);

router.use(protect);
router.use(tenantStatusGuard);
router.use(tenantIsolationGuard);

router.get('/stats', restrictTo(...HR_FINANCE_ROLES), controller.getStats);

// Staff Directory & Profiles (restricted to institutional staff/HR/leadership — blocked for Student/Parent/Alumni)
router.get('/staff', restrictTo(...INSTITUTION_STAFF_ROLES), controller.getStaff);

// Salary Grouping Evaluator (HR / Finance / Leadership only)
router.post('/salary-grouping/calculate', restrictTo(...HR_FINANCE_ROLES), controller.calculateSalary);
router.post('/calculate-salary', restrictTo(...HR_FINANCE_ROLES), controller.calculateSalary);

// Leave Requests Lifecycle (all staff may view/submit leave; only HR & Leadership approve/reject)
router.get('/leaves', restrictTo(...INSTITUTION_STAFF_ROLES), controller.getLeaves);
router.post('/leaves', restrictTo(...INSTITUTION_STAFF_ROLES), controller.createLeave);
router.patch('/leaves/:id/status', restrictTo(...HR_ADMIN_ROLES), controller.updateLeaveStatus);
router.get('/leave-requests', restrictTo(...INSTITUTION_STAFF_ROLES), controller.getLeaves);
router.post('/leave-requests', restrictTo(...INSTITUTION_STAFF_ROLES), controller.createLeave);
router.patch('/leave-requests/:id/status', restrictTo(...HR_ADMIN_ROLES), controller.updateLeaveStatus);

// Staff Positions & Academic Governance (HR & Leadership mutations)
router.get('/positions', restrictTo(...INSTITUTION_STAFF_ROLES), controller.getPositions);
router.post('/positions', restrictTo(...HR_ADMIN_ROLES), controller.createPosition);
router.delete('/positions/:id', restrictTo(...HR_ADMIN_ROLES), controller.deletePosition);
router.get('/staff-assignments', restrictTo(...INSTITUTION_STAFF_ROLES), controller.getStaffAssignments);
router.post('/assign-position', restrictTo(...HR_ADMIN_ROLES), controller.assignStaffPosition);

// Base fallback
router.get('/', restrictTo(...INSTITUTION_STAFF_ROLES), controller.getStaff);

module.exports = router;
