'use strict';

const express = require('express');
const router = express.Router();
const controller = require('./stationery.controller');
const { protect } = require('../../middleware/auth.middleware');
const { restrictTo } = require('../../middleware/rbac.middleware');
const { tenantStatusGuard, tenantIsolationGuard } = require('../../middleware/tenant.middleware');

router.use(protect);
router.use(tenantStatusGuard);
router.use(tenantIsolationGuard);

const ALL_SCHOOL_ROLES = [
  'ADMIN',
  'SUPER_ADMIN',
  'HEADMASTER',
  'PRINCIPAL',
  'SECRETARY',
  'ACCOUNTANT',
  'TEACHER',
  'STAFF',
  'PARENT',
  'STUDENT',
  'HR',
  'ALUMNI',
  'CLINIC_DOCTOR',
  'CLINIC_NURSE',
  'DEVELOPER'
];

const STORE_OPERATOR_ROLES = [
  'ADMIN',
  'SUPER_ADMIN',
  'HEADMASTER',
  'PRINCIPAL',
  'DEVELOPER'
];

const AUDIT_ROLES = [
  'ADMIN',
  'SUPER_ADMIN',
  'HEADMASTER',
  'PRINCIPAL',
  'ACCOUNTANT',
  'DEVELOPER'
];

// Visible system-wide across all school roles
router.get('/items', restrictTo(...ALL_SCHOOL_ROLES), controller.getCatalog);
router.get('/catalog', restrictTo(...ALL_SCHOOL_ROLES), controller.getCatalog);

// Strictly Headmaster-only price & catalog item control (controller/service enforces 403 even in demo mode)
router.post('/items', restrictTo('ADMIN', 'SUPER_ADMIN', 'HEADMASTER', 'PRINCIPAL'), controller.createItem);
router.put('/items/:id', restrictTo('ADMIN', 'SUPER_ADMIN', 'HEADMASTER', 'PRINCIPAL'), controller.updateItem);
router.patch('/items/:id', restrictTo('ADMIN', 'SUPER_ADMIN', 'HEADMASTER', 'PRINCIPAL'), controller.updateItem);

// Sales & Order Requests (unitPrice strictly locked to Headmaster catalog value)
router.post('/sales', restrictTo(...ALL_SCHOOL_ROLES), controller.recordSale);
router.post('/orders', restrictTo(...ALL_SCHOOL_ROLES), controller.recordSale);
router.patch('/orders/:txnId/approve', restrictTo(...STORE_OPERATOR_ROLES), controller.approveOrder);

// Stationery Expenses (automatically writes to Finance SchoolExpense for Accountant audit)
router.post('/expenses', restrictTo(...STORE_OPERATOR_ROLES), controller.recordExpense);

// Transactions & Accountant Audit Summary
router.get('/transactions', restrictTo(...ALL_SCHOOL_ROLES), controller.getTransactions);
router.get('/audit', restrictTo(...AUDIT_ROLES), controller.getAuditSummary);

module.exports = router;
