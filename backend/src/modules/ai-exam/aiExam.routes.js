'use strict';

const express = require('express');
const aiExamController = require('./aiExam.controller');
const { optionalProtect } = require('../../utils/resolveTenantId');

const router = express.Router();

router.use(optionalProtect);

router.get('/exams', aiExamController.getExams);
router.post('/exams', aiExamController.createExam);
router.post('/scan-grade', aiExamController.submitAnswerSheet);
router.post('/scan-sheet', aiExamController.submitAnswerSheet);
router.get('/answer-sheets', aiExamController.getAnswerSheets);
router.post('/answer-sheets/:id/grade', aiExamController.gradeAnswerSheet);
router.patch('/answer-sheets/:id/grade', aiExamController.gradeAnswerSheet);
router.get('/', aiExamController.getExams);
router.post('/', aiExamController.createExam);

module.exports = router;
