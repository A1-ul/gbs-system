'use strict';

const express = require('express');
const controller = require('./university.controller');
const { protect } = require('../../middleware/auth.middleware');
const { restrictTo } = require('../../middleware/rbac.middleware');
const { tenantStatusGuard, tenantIsolationGuard } = require('../../middleware/tenant.middleware');

const router = express.Router();

router.use(protect);
router.use(tenantStatusGuard);
router.use(tenantIsolationGuard);

// Institution operating profile (all authenticated roles)
router.get('/profile', controller.getInstitutionProfile);

// University Internships & Attachments (UNIVERSITY ONLY)
router.get('/internships', controller.listInternships);
router.post('/internships', restrictTo('STUDENT', 'ADMIN', 'SUPER_ADMIN', 'TEACHER', 'DEVELOPER'), controller.submitInternship);
router.patch('/internships/:id/grade', restrictTo('ADMIN', 'SUPER_ADMIN', 'TEACHER', 'DEVELOPER'), controller.gradeInternship);

// University Student Streams (Regular, Evening, Sandwich, Weekend) (UNIVERSITY ONLY)
router.get('/streams', controller.listStreams);
router.post('/streams', restrictTo('ADMIN', 'SUPER_ADMIN', 'TEACHER', 'DEVELOPER'), controller.createStream);

// University Student Governance Positions, Duties & School Impact Plans (SRC etc.) (UNIVERSITY ONLY)
router.get('/governance', controller.listGovernanceRoles);
router.post('/governance', restrictTo('ADMIN', 'SUPER_ADMIN', 'TEACHER', 'STUDENT', 'DEVELOPER'), controller.createGovernanceRole);
router.delete('/governance/:id', restrictTo('ADMIN', 'SUPER_ADMIN', 'DEVELOPER'), controller.deleteGovernanceRole);

// University Lecturer Exams, Results, Progression & Graduation to Alumni (UNIVERSITY ONLY)
router.get('/exams', controller.listExams);
router.post('/exams', restrictTo('ADMIN', 'SUPER_ADMIN', 'TEACHER', 'DEVELOPER'), controller.createExam);
router.get('/results', controller.listResults);
router.post('/results', restrictTo('ADMIN', 'SUPER_ADMIN', 'TEACHER', 'DEVELOPER'), controller.recordResult);
router.post('/advance-student', restrictTo('ADMIN', 'SUPER_ADMIN', 'TEACHER', 'DEVELOPER'), controller.advanceStudent);

module.exports = router;
