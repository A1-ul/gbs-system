'use strict';

const express = require('express');
const aiExamController = require('./aiExam.controller');
const { protect } = require('../../middleware/auth.middleware');
const { tenantStatusGuard, tenantIsolationGuard } = require('../../middleware/tenant.middleware');
const { restrictTo } = require('../../middleware/rbac.middleware');

const router = express.Router();
const EXAM_STAFF_ROLES = ['TEACHER', 'ADMIN', 'SUPER_ADMIN', 'HEADMASTER', 'PRINCIPAL', 'DEVELOPER'];

// EventSource SSE streams pass JWT via ?token=...; normalize before protect
router.get('/proctor/stream', (req, res, next) => {
  if (!req.headers.authorization && req.query?.token) {
    req.headers.authorization = `Bearer ${req.query.token}`;
  }
  return next();
}, protect, tenantStatusGuard, tenantIsolationGuard, aiExamController.streamProctorLiveEvents);

router.use(protect, tenantStatusGuard, tenantIsolationGuard);

// Cross-Institution End-of-Term / Semester Exam Vetting & Headmaster Confirmation Workflow
router.get('/vetting', restrictTo(...EXAM_STAFF_ROLES), aiExamController.listExamVettingSubmissions);
router.post('/vetting/submit', restrictTo(...EXAM_STAFF_ROLES), aiExamController.submitExamForHeadmasterVetting);
router.put('/vetting/:id/review', restrictTo('ADMIN', 'SUPER_ADMIN', 'HEADMASTER', 'PRINCIPAL', 'DEVELOPER'), aiExamController.reviewExamVettingSubmission);
router.put('/vetting/:id/resubmit', restrictTo(...EXAM_STAFF_ROLES), aiExamController.resubmitExamForHeadmasterVetting);

router.get('/exams', aiExamController.getExams);
router.post('/exams', restrictTo(...EXAM_STAFF_ROLES), aiExamController.createExam);
router.get('/answer-key', restrictTo(...EXAM_STAFF_ROLES), aiExamController.getScannerAnswerKey);
router.post('/answer-key', restrictTo(...EXAM_STAFF_ROLES), aiExamController.saveScannerAnswerKey);
router.post('/scan-grade', aiExamController.submitAnswerSheet);
router.post('/scan-sheet', aiExamController.submitAnswerSheet);
router.get('/answer-sheets', aiExamController.getAnswerSheets);
router.post('/answer-sheets/:id/grade', restrictTo(...EXAM_STAFF_ROLES), aiExamController.gradeAnswerSheet);
router.patch('/answer-sheets/:id/grade', restrictTo(...EXAM_STAFF_ROLES), aiExamController.gradeAnswerSheet);

// Live AI Exam Proctoring: Camera Feed Heartbeat, High-Speed Frame & 1.0x WebRTC Video Stream, SSE Stream, Broadcast/Search Messaging & Reference Evidence Vault
router.post('/proctor/heartbeat', aiExamController.postProctorHeartbeat);
router.post('/proctor/frame', aiExamController.postProctorLiveFrame);
router.post('/proctor/webrtc/signal', aiExamController.postProctorWebRtcSignal);
router.get('/proctor/webrtc/signals', aiExamController.getProctorWebRtcSignals);
router.get('/proctor/live', restrictTo(...EXAM_STAFF_ROLES), aiExamController.getLiveProctorSessions);
router.post('/proctor/message', restrictTo(...EXAM_STAFF_ROLES), aiExamController.sendProctorMessage);
router.get('/proctor/messages', aiExamController.getStudentProctorMessages);
router.post('/proctor/messages/:id/ack', aiExamController.ackProctorMessage);
router.post('/proctor/save-evidence', restrictTo(...EXAM_STAFF_ROLES), aiExamController.saveProctorEvidence);
router.get('/proctor/evidence', restrictTo(...EXAM_STAFF_ROLES), aiExamController.getProctorEvidence);
router.delete('/proctor/evidence/:id', restrictTo(...EXAM_STAFF_ROLES), aiExamController.deleteProctorEvidence);

router.get('/', aiExamController.getExams);
router.post('/', restrictTo(...EXAM_STAFF_ROLES), aiExamController.createExam);

module.exports = router;
