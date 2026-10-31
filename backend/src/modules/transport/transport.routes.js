'use strict';

const express = require('express');
const router = express.Router();
const controller = require('./transport.controller');

router.get('/status', controller.getStatus);
router.get('/stats', controller.getStats);

// Routes
router.get('/routes', controller.getRoutes);
router.post('/routes', controller.createRoute);

// Vehicles / Fleet
router.get('/vehicles', controller.getVehicles);
router.post('/vehicles', controller.createVehicle);

// Student Assignments
router.get('/assignments', controller.getAssignments);
router.post('/assignments', controller.assignStudent);

// Base fallback
router.get('/', controller.getRoutes);

module.exports = router;
