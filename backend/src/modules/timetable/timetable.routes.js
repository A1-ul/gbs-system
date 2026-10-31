const express = require('express');
const timetableController = require('./timetable.controller');
const { protect } = require('../../middleware/auth.middleware');
const { restrictTo } = require('../../middleware/rbac.middleware');
const { tenantStatusGuard, tenantIsolationGuard } = require('../../middleware/tenant.middleware');

const router = express.Router();

router.use(protect);
router.use(tenantStatusGuard);
router.use(tenantIsolationGuard);

// 1. Conflict Detection Endpoint (Pre-check)
router.post('/check-conflicts', timetableController.checkConflicts);

// 2. Weekly Timetable Auto-Generator
router.post('/seed-weekly/:classId', restrictTo('SUPER_ADMIN', 'ADMIN', 'DEVELOPER', 'TEACHER'), timetableController.seedWeekly);
router.post('/seed-weekly', restrictTo('SUPER_ADMIN', 'ADMIN', 'DEVELOPER', 'TEACHER'), timetableController.seedWeekly);

// 3. Timetable Slots CRUD
router.get('/slots', timetableController.getSlots);
router.get('/slots/:id', timetableController.getSlotById);
router.get('/grid', timetableController.getSlots);
router.get('/schedule', timetableController.getSlots);
router.get('/', timetableController.getSlots);

router.post('/slots', restrictTo('SUPER_ADMIN', 'ADMIN', 'DEVELOPER', 'TEACHER'), timetableController.createSlot);
router.post('/', restrictTo('SUPER_ADMIN', 'ADMIN', 'DEVELOPER', 'TEACHER'), timetableController.createSlot);

router.put('/slots/:id', restrictTo('SUPER_ADMIN', 'ADMIN', 'DEVELOPER', 'TEACHER'), timetableController.updateSlot);
router.put('/:id', restrictTo('SUPER_ADMIN', 'ADMIN', 'DEVELOPER', 'TEACHER'), timetableController.updateSlot);

router.delete('/slots/:id', restrictTo('SUPER_ADMIN', 'ADMIN', 'DEVELOPER', 'TEACHER'), timetableController.deleteSlot);
router.delete('/:id', restrictTo('SUPER_ADMIN', 'ADMIN', 'DEVELOPER', 'TEACHER'), timetableController.deleteSlot);

module.exports = router;
