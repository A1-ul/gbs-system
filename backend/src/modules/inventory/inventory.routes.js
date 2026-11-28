'use strict';

const express = require('express');
const router = express.Router();
const controller = require('./inventory.controller');
const { protect } = require('../../middleware/auth.middleware');
const { restrictTo } = require('../../middleware/rbac.middleware');
const { tenantStatusGuard, tenantIsolationGuard } = require('../../middleware/tenant.middleware');

const INVENTORY_STAFF_ROLES = [
  'ADMIN', 'SUPER_ADMIN', 'HEADMASTER', 'PRINCIPAL',
  'STAFF', 'ACCOUNTANT', 'TEACHER', 'SECRETARY', 'HR',
  'CLINIC_DOCTOR', 'CLINIC_NURSE', 'DEVELOPER'
];
const INVENTORY_MANAGER_ROLES = [
  'ADMIN', 'SUPER_ADMIN', 'HEADMASTER', 'PRINCIPAL',
  'STAFF', 'ACCOUNTANT', 'DEVELOPER'
];

router.get('/status', controller.getStatus);
router.use(protect);
router.use(tenantStatusGuard);
router.use(tenantIsolationGuard);

router.get('/stats', restrictTo(...INVENTORY_STAFF_ROLES), controller.getStats);

// Items & Stock
router.get('/items', restrictTo(...INVENTORY_STAFF_ROLES), controller.getItems);
router.post('/items', restrictTo(...INVENTORY_MANAGER_ROLES), controller.createItem);
router.post('/items/:id/adjust', restrictTo(...INVENTORY_MANAGER_ROLES), controller.adjustStock);

// Purchase Requests & Requisitions
router.get('/requests', restrictTo(...INVENTORY_STAFF_ROLES), controller.getRequests);
router.post('/requests', restrictTo(...INVENTORY_STAFF_ROLES), controller.createRequest);
router.patch('/requests/:id/status', restrictTo(...INVENTORY_MANAGER_ROLES), controller.updateRequestStatus);

// Base fallback
router.get('/', restrictTo(...INVENTORY_STAFF_ROLES), controller.getItems);
router.post('/', restrictTo(...INVENTORY_MANAGER_ROLES), controller.createItem);

module.exports = router;
