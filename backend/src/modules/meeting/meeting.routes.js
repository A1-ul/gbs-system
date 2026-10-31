'use strict';

const express = require('express');
const router = express.Router();
const controller = require('./meeting.controller');
const { protect } = require('../../middleware/auth.middleware');
const { restrictTo } = require('../../middleware/rbac.middleware');
const { tenantStatusGuard, tenantIsolationGuard } = require('../../middleware/tenant.middleware');

// Public status endpoint
router.get('/status', controller.getStatus);

// All protected endpoints require authentication & tenant isolation
router.use(protect);
router.use(tenantStatusGuard);
router.use(tenantIsolationGuard);

// 1. List all meetings and schedule new meeting
router.route('/')
  .get(controller.getMeetings)
  .post(restrictTo('SUPER_ADMIN', 'ADMIN', 'DEVELOPER', 'TEACHER'), controller.createMeeting);

router.post(
  '/schedule',
  restrictTo('SUPER_ADMIN', 'ADMIN', 'DEVELOPER', 'TEACHER'),
  controller.createMeeting
);

router.post(
  '/batch-delete',
  restrictTo('SUPER_ADMIN', 'ADMIN', 'DEVELOPER', 'TEACHER'),
  controller.batchDeleteMeetings
);

// 2. Timetable sync into virtual meeting
router.post(
  '/sync-timetable/:slotId',
  restrictTo('SUPER_ADMIN', 'ADMIN', 'DEVELOPER', 'TEACHER'),
  controller.syncFromTimetable
);

// 3. Meeting by ID: get, update, delete
router.route('/:id')
  .get(controller.getMeetingById)
  .put(restrictTo('SUPER_ADMIN', 'ADMIN', 'DEVELOPER', 'TEACHER'), controller.updateMeeting)
  .delete(restrictTo('SUPER_ADMIN', 'ADMIN', 'DEVELOPER', 'TEACHER'), controller.deleteMeeting);

// 4. Join meeting: records participant attendance & auto-logs class attendance
router.post('/:id/join', controller.joinMeeting);

module.exports = router;
