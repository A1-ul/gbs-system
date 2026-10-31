'use strict';

const express = require('express');
const router = express.Router();
const controller = require('./assignment.controller');
const { protect } = require('../../middleware/auth.middleware');
const { restrictTo } = require('../../middleware/rbac.middleware');
const { tenantStatusGuard, tenantIsolationGuard } = require('../../middleware/tenant.middleware');

// Public status
router.get('/status', controller.getStatus);

// Protected routes
router.use(protect);
router.use(tenantStatusGuard);
router.use(tenantIsolationGuard);

// 1. List assignments & Create assignment
router.route('/')
  .get(controller.getAssignments)
  .post(restrictTo('SUPER_ADMIN', 'ADMIN', 'DEVELOPER', 'TEACHER'), controller.createAssignment);

// 2. Student assignments summary
router.get('/student/:studentId', controller.getStudentAssignments);

// 3. Submissions for an assignment
router.get(
  '/:id/submissions',
  restrictTo('SUPER_ADMIN', 'ADMIN', 'DEVELOPER', 'TEACHER'),
  controller.getAssignmentSubmissions
);

// 4. Submit an assignment (Student or testing)
router.post(
  '/:id/submit',
  controller.submitAssignment
);

// 5. Grade submission (Teacher, Admin)
router.patch(
  '/submissions/:submissionId/grade',
  restrictTo('SUPER_ADMIN', 'ADMIN', 'DEVELOPER', 'TEACHER'),
  controller.gradeSubmission
);

// 6. Single assignment details, update, delete
router.route('/:id')
  .get(controller.getAssignmentById)
  .put(restrictTo('SUPER_ADMIN', 'ADMIN', 'DEVELOPER', 'TEACHER'), controller.updateAssignment)
  .delete(restrictTo('SUPER_ADMIN', 'ADMIN', 'DEVELOPER', 'TEACHER'), controller.deleteAssignment);

module.exports = router;
