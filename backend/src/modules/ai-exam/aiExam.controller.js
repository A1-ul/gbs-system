'use strict';

const aiExamService = require('./aiExam.service');
const { resolveTenantId } = require('../../utils/resolveTenantId');

const getExams = async (req, res, next) => {
  try {
    const tenantId = resolveTenantId(req, 1);
    const exams = await aiExamService.getExams(tenantId);
    res.status(200).json({
      status: 'success',
      results: exams.length,
      data: { exams }
    });
  } catch (error) {
    next(error);
  }
};

const createExam = async (req, res, next) => {
  try {
    const tenantId = resolveTenantId(req, 1);
    const exam = await aiExamService.createExam(tenantId, req.body, req.user);
    res.status(201).json({
      status: 'success',
      message: `Examination '${exam.title}' published and saved successfully.`,
      data: { exam }
    });
  } catch (error) {
    next(error);
  }
};

const submitAnswerSheet = async (req, res, next) => {
  try {
    const tenantId = resolveTenantId(req, 1);
    const payload = {
      ...req.body,
      studentId: req.body?.studentId || req.user?.id
    };
    const result = await aiExamService.submitAnswerSheet(payload, tenantId);
    res.status(201).json({
      status: 'success',
      data: result
    });
  } catch (error) {
    next(error);
  }
};

const getAnswerSheets = async (req, res, next) => {
  try {
    const tenantId = resolveTenantId(req, 1);
    const sheets = await aiExamService.getAnswerSheets(req.query.examId, tenantId);
    res.status(200).json({
      status: 'success',
      results: sheets.length,
      data: { answerSheets: sheets }
    });
  } catch (error) {
    next(error);
  }
};

const gradeAnswerSheet = async (req, res, next) => {
  try {
    const tenantId = resolveTenantId(req, 1);
    const updated = await aiExamService.gradeAnswerSheet(
      req.params.id,
      req.body || {},
      tenantId,
      req.user
    );
    res.status(200).json({
      status: 'success',
      message: 'Examination script graded and published successfully.',
      data: { answerSheet: updated, ...updated }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getExams,
  createExam,
  submitAnswerSheet,
  getAnswerSheets,
  gradeAnswerSheet
};
