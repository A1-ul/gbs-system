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

// Activate all-tier institutional scoping (JHS, SHS, TVET, University)
router.use((req, _res, next) => {
  req.institutionTierMode = 'ALL_TIERS';
  next();
});

// Active institution operating profile
router.get('/profile', controller.getInstitutionProfile);

// University Industrial Internships (UNIVERSITY ONLY)
router.get('/internships', controller.listInternships);
router.post('/internships', restrictTo('STUDENT', 'ADMIN', 'SUPER_ADMIN', 'TEACHER', 'DEVELOPER'), controller.submitInternship);
router.patch('/internships/:id/grade', restrictTo('ADMIN', 'SUPER_ADMIN', 'TEACHER', 'DEVELOPER'), controller.gradeInternship);

// Academic, Field & Trade Attachments (TVET / TECHNICAL and UNIVERSITY)
router.get('/attachments', controller.listAttachments);
router.post('/attachments', restrictTo('STUDENT', 'ADMIN', 'SUPER_ADMIN', 'TEACHER', 'DEVELOPER'), controller.submitAttachment);
router.patch('/attachments/:id/grade', restrictTo('ADMIN', 'SUPER_ADMIN', 'TEACHER', 'DEVELOPER'), controller.gradeAttachment);

// Tier-scoped Streams / Houses / Tracks / Shifts (All 4 institution types)
router.get('/streams', controller.listStreams);
router.post('/streams', restrictTo('ADMIN', 'SUPER_ADMIN', 'TEACHER', 'DEVELOPER'), controller.createStream);

// Tier-scoped Student Leadership / Prefects / SRC Positions (All 4 institution types)
router.get('/governance', controller.listGovernanceRoles);
router.post('/governance', restrictTo('ADMIN', 'SUPER_ADMIN', 'TEACHER', 'STUDENT', 'DEVELOPER'), controller.createGovernanceRole);
router.delete('/governance/:id', restrictTo('ADMIN', 'SUPER_ADMIN', 'DEVELOPER'), controller.deleteGovernanceRole);

// Tier-scoped Exams, Results, Promotion & Graduation to Alumni (All 4 institution types)
router.get('/exams', controller.listExams);
router.post('/exams', restrictTo('ADMIN', 'SUPER_ADMIN', 'TEACHER', 'DEVELOPER'), controller.createExam);
router.get('/results', controller.listResults);
router.post('/results', restrictTo('ADMIN', 'SUPER_ADMIN', 'TEACHER', 'DEVELOPER'), controller.recordResult);
router.post('/advance-student', restrictTo('ADMIN', 'SUPER_ADMIN', 'TEACHER', 'DEVELOPER'), controller.advanceStudent);

module.exports = router;
