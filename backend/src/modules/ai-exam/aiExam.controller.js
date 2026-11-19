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

const postProctorHeartbeat = async (req, res, next) => {
  try {
    const tenantId = resolveTenantId(req, 1);
    const session = await aiExamService.recordProctorHeartbeat(tenantId, {
      ...req.body,
      studentId: req.body?.studentId || req.user?.id
    });
    res.status(200).json({
      status: 'success',
      data: { session }
    });
  } catch (error) {
    next(error);
  }
};

const getLiveProctorSessions = async (req, res, next) => {
  try {
    const tenantId = resolveTenantId(req, 1);
    const sessions = await aiExamService.getLiveProctorSessions(tenantId, req.query || {});
    res.status(200).json({
      status: 'success',
      results: sessions.length,
      data: { sessions }
    });
  } catch (error) {
    next(error);
  }
};

const sendProctorMessage = async (req, res, next) => {
  try {
    const tenantId = resolveTenantId(req, 1);
    const messageEntry = await aiExamService.sendProctorMessage(tenantId, req.body || {}, req.user);
    res.status(201).json({
      status: 'success',
      message: `Information dispatched to ${messageEntry.targetSummary}.`,
      data: { proctorMessage: messageEntry }
    });
  } catch (error) {
    next(error);
  }
};

const getStudentProctorMessages = async (req, res, next) => {
  try {
    const tenantId = resolveTenantId(req, 1);
    const out = await aiExamService.getStudentProctorMessages(tenantId, req.query || {});
    res.status(200).json({
      status: 'success',
      results: out.messages.length,
      data: out
    });
  } catch (error) {
    next(error);
  }
};

const ackProctorMessage = async (req, res, next) => {
  try {
    const tenantId = resolveTenantId(req, 1);
    const updated = await aiExamService.ackProctorMessage(tenantId, req.params.id, {
      ...req.body,
      studentId: req.body?.studentId || req.user?.id
    });
    res.status(200).json({
      status: 'success',
      data: { proctorMessage: updated }
    });
  } catch (error) {
    next(error);
  }
};

const saveProctorEvidence = async (req, res, next) => {
  try {
    const tenantId = resolveTenantId(req, 1);
    const evidence = await aiExamService.saveProctorEvidence(tenantId, req.body || {}, req.user);
    res.status(201).json({
      status: 'success',
      message: `Proctoring snapshot and log permanently saved for ${evidence.studentName} as reference evidence.`,
      data: { evidence }
    });
  } catch (error) {
    next(error);
  }
};

const getProctorEvidence = async (req, res, next) => {
  try {
    const tenantId = resolveTenantId(req, 1);
    const evidenceList = await aiExamService.getProctorEvidence(tenantId, req.query || {});
    res.status(200).json({
      status: 'success',
      results: evidenceList.length,
      data: { evidenceList }
    });
  } catch (error) {
    next(error);
  }
};

const deleteProctorEvidence = async (req, res, next) => {
  try {
    const tenantId = resolveTenantId(req, 1);
    const result = await aiExamService.deleteProctorEvidence(tenantId, req.params.id);
    res.status(200).json({
      status: 'success',
      message: 'Proctoring evidence entry removed from archive.',
      data: result
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
  gradeAnswerSheet,
  postProctorHeartbeat,
  getLiveProctorSessions,
  sendProctorMessage,
  getStudentProctorMessages,
  ackProctorMessage,
  saveProctorEvidence,
  getProctorEvidence,
  deleteProctorEvidence
};
