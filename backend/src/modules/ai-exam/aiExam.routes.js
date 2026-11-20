'use strict';

const express = require('express');
const aiExamController = require('./aiExam.controller');
const { optionalProtect } = require('../../utils/resolveTenantId');

const router = express.Router();

router.use(optionalProtect);

router.get('/exams', aiExamController.getExams);
router.post('/exams', aiExamController.createExam);
router.get('/answer-key', aiExamController.getScannerAnswerKey);
router.post('/answer-key', aiExamController.saveScannerAnswerKey);
router.post('/scan-grade', aiExamController.submitAnswerSheet);
router.post('/scan-sheet', aiExamController.submitAnswerSheet);
router.get('/answer-sheets', aiExamController.getAnswerSheets);
router.post('/answer-sheets/:id/grade', aiExamController.gradeAnswerSheet);
router.patch('/answer-sheets/:id/grade', aiExamController.gradeAnswerSheet);

// Live AI Exam Proctoring: Camera Feed Heartbeat, Broadcast/Search Messaging & Reference Evidence Vault
router.post('/proctor/heartbeat', aiExamController.postProctorHeartbeat);
router.get('/proctor/live', aiExamController.getLiveProctorSessions);
router.post('/proctor/message', aiExamController.sendProctorMessage);
router.get('/proctor/messages', aiExamController.getStudentProctorMessages);
router.post('/proctor/messages/:id/ack', aiExamController.ackProctorMessage);
router.post('/proctor/save-evidence', aiExamController.saveProctorEvidence);
router.get('/proctor/evidence', aiExamController.getProctorEvidence);
router.delete('/proctor/evidence/:id', aiExamController.deleteProctorEvidence);

router.get('/', aiExamController.getExams);
router.post('/', aiExamController.createExam);

module.exports = router;
