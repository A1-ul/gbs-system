'use strict';

const express = require('express');
const router = express.Router();
const controller = require('./attendance.controller');
const { protect } = require('../../middleware/auth.middleware');
const { restrictTo } = require('../../middleware/rbac.middleware');
const { tenantStatusGuard, tenantIsolationGuard } = require('../../middleware/tenant.middleware');

// Public / Health status
router.get('/status', controller.getStatus);

// Authenticated & Tenant Protected routes
router.use(protect);
router.use(tenantStatusGuard);
router.use(tenantIsolationGuard);

// 1. Analytics & Trends
router.get(
  '/analytics',
  restrictTo('SUPER_ADMIN', 'ADMIN', 'DEVELOPER', 'TEACHER'),
  controller.getAttendanceAnalytics
);

// 2. Class Roster for Attendance Marking
router.get(
  '/classes/:classId/roster',
  restrictTo('SUPER_ADMIN', 'ADMIN', 'DEVELOPER', 'TEACHER'),
  controller.getClassRoster
);

// 3. Mark Batch Attendance (Teachers, Admins)
router.post(
  '/mark',
  restrictTo('SUPER_ADMIN', 'ADMIN', 'DEVELOPER', 'TEACHER'),
  controller.markBatchAttendance
);
router.post(
  '/single',
  restrictTo('SUPER_ADMIN', 'ADMIN', 'DEVELOPER', 'TEACHER'),
  controller.markSingleAttendance
);
router.post(
  '/batch',
  restrictTo('SUPER_ADMIN', 'ADMIN', 'DEVELOPER', 'TEACHER'),
  controller.markBatchAttendance
);

// 4. Retrieve Class Attendance Records & Metrics
router.get(
  '/classes/:classId',
  restrictTo('SUPER_ADMIN', 'ADMIN', 'DEVELOPER', 'TEACHER'),
  controller.getClassAttendance
);

// 5. Retrieve Student Personal Attendance History
router.get(
  '/students/:studentId',
  controller.getStudentAttendance
);

// 6. Weekly Attendance Report Submission & Headmaster Cross-Checking
router.get(
  '/weekly-reports',
  restrictTo('SUPER_ADMIN', 'ADMIN', 'DEVELOPER', 'TEACHER'),
  controller.getWeeklyReports
);

router.post(
  '/weekly-reports/submit',
  restrictTo('SUPER_ADMIN', 'ADMIN', 'DEVELOPER', 'TEACHER'),
  controller.submitWeeklyReport
);

router.patch(
  '/weekly-reports/:reportId/cross-check',
  restrictTo('SUPER_ADMIN', 'ADMIN', 'DEVELOPER'),
  controller.crossCheckWeeklyReport
);

module.exports = router;

