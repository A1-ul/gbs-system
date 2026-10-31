const express = require('express');
const aiExamController = require('./aiExam.controller');

const router = express.Router();

router.get('/exams', aiExamController.getExams);
router.post('/scan-grade', aiExamController.submitAnswerSheet);
router.post('/scan-sheet', aiExamController.submitAnswerSheet);
router.get('/answer-sheets', aiExamController.getAnswerSheets);
router.get('/', aiExamController.getExams);

module.exports = router;
