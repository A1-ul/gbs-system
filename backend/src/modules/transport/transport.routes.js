'use strict';

const express = require('express');
const router = express.Router();
const controller = require('./transport.controller');
const { optionalProtect } = require('../../utils/resolveTenantId');

router.use(optionalProtect);

router.get('/status', controller.getStatus);
router.get('/stats', controller.getStats);
router.get('/students', controller.getStudents);

// Routes
router.get('/routes', controller.getRoutes);
router.post('/routes', controller.createRoute);
router.delete('/routes/:id', controller.deleteRoute);

// Vehicles / Fleet
router.get('/vehicles', controller.getVehicles);
router.post('/vehicles', controller.createVehicle);

// Student Assignments
router.get('/assignments', controller.getAssignments);
router.post('/assignments', controller.assignStudent);
router.delete('/assignments/:id', controller.removeAssignment);

// Base fallback
router.get('/', controller.getRoutes);

module.exports = router;
