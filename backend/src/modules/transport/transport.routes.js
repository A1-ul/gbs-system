'use strict';

const express = require('express');
const router = express.Router();
const controller = require('./transport.controller');
const { protect } = require('../../middleware/auth.middleware');
const { restrictTo } = require('../../middleware/rbac.middleware');
const { tenantStatusGuard, tenantIsolationGuard } = require('../../middleware/tenant.middleware');

const TRANSPORT_MANAGER_ROLES = [
  'ADMIN', 'SUPER_ADMIN', 'HEADMASTER', 'PRINCIPAL',
  'STAFF', 'SECRETARY', 'DEVELOPER'
];

router.get('/status', controller.getStatus);

router.use(protect);
router.use(tenantStatusGuard);
router.use(tenantIsolationGuard);

router.get('/stats', controller.getStats);
router.get('/students', restrictTo(...TRANSPORT_MANAGER_ROLES), controller.getStudents);

// Routes (All authenticated roles can view routes; only Transport/School Leadership can create/delete)
router.get('/routes', controller.getRoutes);
router.post('/routes', restrictTo(...TRANSPORT_MANAGER_ROLES), controller.createRoute);
router.delete('/routes/:id', restrictTo(...TRANSPORT_MANAGER_ROLES), controller.deleteRoute);

// Vehicles / Fleet
router.get('/vehicles', controller.getVehicles);
router.post('/vehicles', restrictTo(...TRANSPORT_MANAGER_ROLES), controller.createVehicle);

// Student Assignments
router.get('/assignments', controller.getAssignments);
router.post('/assignments', restrictTo(...TRANSPORT_MANAGER_ROLES), controller.assignStudent);
router.delete('/assignments/:id', restrictTo(...TRANSPORT_MANAGER_ROLES), controller.removeAssignment);

// Base fallback
router.get('/', controller.getRoutes);

module.exports = router;
