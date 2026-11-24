const express = require('express');
const academicController = require('./academic.controller');
const { protect } = require('../../middleware/auth.middleware');
const { restrictTo } = require('../../middleware/rbac.middleware');
const { tenantStatusGuard, tenantIsolationGuard } = require('../../middleware/tenant.middleware');

const router = express.Router();

router.use(protect);
router.use(tenantStatusGuard);
router.use(tenantIsolationGuard);

// 1. Classes Endpoints
router.get('/classes', academicController.getClasses);
router.get('/classes/:id', academicController.getClassById);
router.post('/classes', restrictTo('SUPER_ADMIN', 'ADMIN', 'DEVELOPER'), academicController.createClass);
router.put('/classes/:id', restrictTo('SUPER_ADMIN', 'ADMIN', 'DEVELOPER'), academicController.updateClass);
router.delete('/classes/:id', restrictTo('SUPER_ADMIN', 'ADMIN', 'DEVELOPER'), academicController.deleteClass);
router.post('/classes/seed-curriculum', restrictTo('SUPER_ADMIN', 'ADMIN', 'DEVELOPER'), academicController.seedCurriculum);

// 2. Subjects Endpoints
router.get('/subjects', academicController.getSubjects);
router.get('/subjects/:id', academicController.getSubjectById);
router.get('/classes/:classId/subjects', academicController.getSubjects);
router.post('/subjects', restrictTo('SUPER_ADMIN', 'ADMIN', 'TEACHER', 'DEVELOPER'), academicController.createSubject);
router.put('/subjects/:id', restrictTo('SUPER_ADMIN', 'ADMIN', 'TEACHER', 'DEVELOPER'), academicController.updateSubject);
router.delete('/subjects/:id', restrictTo('SUPER_ADMIN', 'ADMIN', 'DEVELOPER'), academicController.deleteSubject);

// 3. Exams Endpoints
router.get('/exams', academicController.getExams);
router.post('/exams', restrictTo('SUPER_ADMIN', 'ADMIN', 'TEACHER', 'DEVELOPER'), academicController.createExam);

// 4. Academic Planning & Promotion (Headmaster / Admin only)
router.get('/planner', academicController.getAcademicPlanner);
router.post('/planner', restrictTo('SUPER_ADMIN', 'ADMIN', 'DEVELOPER'), academicController.saveAcademicPlan);
router.post('/promote-students', restrictTo('SUPER_ADMIN', 'ADMIN', 'DEVELOPER'), academicController.promoteStudents);
router.put('/students/:studentId/class', restrictTo('SUPER_ADMIN', 'ADMIN', 'DEVELOPER'), academicController.updateStudentClass);
router.post('/students/update-class', restrictTo('SUPER_ADMIN', 'ADMIN', 'DEVELOPER'), academicController.updateStudentClass);

// 5. Teacher Lesson Plans & Notes Vetting (NaCCA Learner-Centred Suite: Yearly, Termly, Weekly, Lesson Notes)
router.get('/lesson-plans/templates', restrictTo('SUPER_ADMIN', 'ADMIN', 'TEACHER', 'DEVELOPER'), academicController.getLessonPlanTemplates);
router.post('/lesson-plans/quality-check', restrictTo('SUPER_ADMIN', 'ADMIN', 'TEACHER', 'DEVELOPER'), academicController.evaluateLessonPlanQuality);
router.get('/lesson-plans', academicController.getTeacherLessonPlans);
router.post('/lesson-plans', restrictTo('SUPER_ADMIN', 'ADMIN', 'TEACHER', 'DEVELOPER'), academicController.submitTeacherLessonPlan);
router.put('/lesson-plans/:id', restrictTo('SUPER_ADMIN', 'ADMIN', 'TEACHER', 'DEVELOPER'), academicController.updateTeacherLessonPlan);
router.delete('/lesson-plans/:id', restrictTo('SUPER_ADMIN', 'ADMIN', 'TEACHER', 'DEVELOPER'), academicController.deleteTeacherLessonPlan);
router.put('/lesson-plans/:id/vet', restrictTo('SUPER_ADMIN', 'ADMIN', 'DEVELOPER'), academicController.vetTeacherLessonPlan);
router.post('/lesson-plans/directive', restrictTo('SUPER_ADMIN', 'ADMIN', 'DEVELOPER'), academicController.broadcastFacultyDirective);
router.get('/lesson-plans/directives', academicController.getFacultyDirectives);

// 6. Student Compliance & Non-Participants Ledger (Missed Exams, Missing Assignments, Chronic Absentees)
router.get('/defaulters-report', restrictTo('SUPER_ADMIN', 'ADMIN', 'TEACHER', 'HR', 'DEVELOPER'), academicController.getDefaultersReport);
router.post('/defaulters-report/sync', restrictTo('SUPER_ADMIN', 'ADMIN', 'TEACHER', 'DEVELOPER'), academicController.syncDefaultersReport);

module.exports = router;