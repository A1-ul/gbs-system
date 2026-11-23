'use strict';

const express = require('express');
const aiExamController = require('./aiExam.controller');
const { optionalProtect } = require('../../utils/resolveTenantId');
const { protect } = require('../../middleware/auth.middleware');
const { restrictTo } = require('../../middleware/rbac.middleware');

const router = express.Router();

router.use(optionalProtect);

// Cross-Institution End-of-Term / Semester Exam Vetting & Headmaster Confirmation Workflow
router.get('/vetting', aiExamController.listExamVettingSubmissions);
router.post('/vetting/submit', protect, restrictTo('TEACHER', 'ADMIN', 'SUPER_ADMIN', 'DEVELOPER'), aiExamController.submitExamForHeadmasterVetting);
router.put('/vetting/:id/review', protect, restrictTo('ADMIN', 'SUPER_ADMIN', 'DEVELOPER'), aiExamController.reviewExamVettingSubmission);
router.put('/vetting/:id/resubmit', protect, restrictTo('TEACHER', 'ADMIN', 'SUPER_ADMIN', 'DEVELOPER'), aiExamController.resubmitExamForHeadmasterVetting);

router.get('/exams', aiExamController.getExams);
router.post('/exams', aiExamController.createExam);
router.get('/answer-key', aiExamController.getScannerAnswerKey);
router.post('/answer-key', aiExamController.saveScannerAnswerKey);
router.post('/scan-grade', aiExamController.submitAnswerSheet);
router.post('/scan-sheet', aiExamController.submitAnswerSheet);
router.get('/answer-sheets', aiExamController.getAnswerSheets);
router.post('/answer-sheets/:id/grade', aiExamController.gradeAnswerSheet);
router.patch('/answer-sheets/:id/grade', aiExamController.gradeAnswerSheet);

// Live AI Exam Proctoring: Camera Feed Heartbeat, High-Speed SSE Stream, Broadcast/Search Messaging & Reference Evidence Vault
router.post('/proctor/heartbeat', aiExamController.postProctorHeartbeat);
router.get('/proctor/live', aiExamController.getLiveProctorSessions);
router.get('/proctor/stream', (req, res, next) => {
  if (!req.headers.authorization && req.query?.token) {
    req.headers.authorization = `Bearer ${req.query.token}`;
  }
  return optionalProtect(req, res, () => aiExamController.streamProctorLiveEvents(req, res, next));
});
router.post('/proctor/message', aiExamController.sendProctorMessage);
router.get('/proctor/messages', aiExamController.getStudentProctorMessages);
router.post('/proctor/messages/:id/ack', aiExamController.ackProctorMessage);
router.post('/proctor/save-evidence', aiExamController.saveProctorEvidence);
router.get('/proctor/evidence', aiExamController.getProctorEvidence);
router.delete('/proctor/evidence/:id', aiExamController.deleteProctorEvidence);

router.get('/', aiExamController.getExams);
router.post('/', aiExamController.createExam);

module.exports = router;
