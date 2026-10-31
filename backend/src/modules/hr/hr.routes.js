'use strict';

const express = require('express');
const router = express.Router();
const controller = require('./hr.controller');

router.get('/status', controller.getStatus);
router.get('/stats', controller.getStats);

// Staff Directory & Profiles
router.get('/staff', controller.getStaff);

// Salary Grouping Evaluator
router.post('/salary-grouping/calculate', controller.calculateSalary);
router.post('/calculate-salary', controller.calculateSalary);

// Leave Requests Lifecycle
router.get('/leaves', controller.getLeaves);
router.post('/leaves', controller.createLeave);
router.patch('/leaves/:id/status', controller.updateLeaveStatus);
router.get('/leave-requests', controller.getLeaves);
router.post('/leave-requests', controller.createLeave);
router.patch('/leave-requests/:id/status', controller.updateLeaveStatus);

// Staff Positions & Academic Governance
router.get('/positions', controller.getPositions);
router.post('/positions', controller.createPosition);
router.delete('/positions/:id', controller.deletePosition);
router.get('/staff-assignments', controller.getStaffAssignments);
router.post('/assign-position', controller.assignStaffPosition);

// Base fallback
router.get('/', controller.getStaff);


module.exports = router;
