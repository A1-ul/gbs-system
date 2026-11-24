'use strict';

const aiExamService = require('./aiExam.service');
const { resolveTenantId } = require('../../utils/resolveTenantId');

const getExams = async (req, res, next) => {
  try {
    const tenantId = resolveTenantId(req, 1);
    const forStudent =
      String(req.user?.role || '').toUpperCase() === 'STUDENT' ||
      String(req.query?.studentOnly || '').toLowerCase() === 'true';
    const exams = await aiExamService.getExams(tenantId, { forStudent });
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

const postProctorLiveFrame = async (req, res, next) => {
  try {
    const tenantId = resolveTenantId(req, 1);
    const frameRes = await aiExamService.pushProctorLiveFrame(tenantId, {
      ...req.body,
      studentId: req.body?.studentId || req.user?.id,
      studentEmail: req.body?.studentEmail || req.user?.email
    });
    res.status(200).json({ status: 'success', data: frameRes });
  } catch (error) {
    next(error);
  }
};

const postProctorWebRtcSignal = async (req, res, next) => {
  try {
    const tenantId = resolveTenantId(req, 1);
    const signal = await aiExamService.pushProctorWebRtcSignal(tenantId, req.body || {}, req.user);
    res.status(200).json({ status: 'success', data: { signal } });
  } catch (error) {
    next(error);
  }
};

const getProctorWebRtcSignals = async (req, res, next) => {
  try {
    const tenantId = resolveTenantId(req, 1);
    const signals = await aiExamService.getProctorWebRtcSignals(tenantId, req.query || {});
    res.status(200).json({ status: 'success', data: { signals } });
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

const streamProctorLiveEvents = async (req, res, next) => {
  try {
    const tenantId = resolveTenantId(req, 1);
    const examFilter = String(req.query?.examId || '').trim();

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    if (typeof res.flushHeaders === 'function') res.flushHeaders();

    const writeEvent = (eventName, payload) => {
      try {
        res.write(`event: ${eventName}\ndata: ${JSON.stringify(payload)}\n\n`);
      } catch { }
    };

    const initialSessions = await aiExamService.getLiveProctorSessions(tenantId, { examId: examFilter });
    writeEvent('proctor_snapshot', { sessions: initialSessions, timestamp: new Date().toISOString() });

    const onEvent = (evt) => {
      if (!evt) return;
      if (evt.type === 'proctor_live_frame' && evt.session) {
        if (examFilter && String(evt.session.examId || '') !== examFilter) return;
        writeEvent('proctor_live_frame', { session: evt.session });
      } else if (evt.type === 'proctor_message' && evt.message) {
        writeEvent('proctor_message', { message: evt.message });
      } else if (evt.type === 'proctor_webrtc_signal' && evt.signal) {
        writeEvent('proctor_webrtc_signal', { signal: evt.signal });
      }
    };

    const channel = `tenant:${tenantId}`;
    aiExamService.proctorEventBus.on(channel, onEvent);

    const heartbeat = setInterval(() => {
      try { res.write(`: heartbeat ${Date.now()}\n\n`); } catch { }
    }, 20000);
    if (typeof heartbeat.unref === 'function') heartbeat.unref();

    req.on('close', () => {
      clearInterval(heartbeat);
      aiExamService.proctorEventBus.off(channel, onEvent);
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

const saveScannerAnswerKey = async (req, res, next) => {
  try {
    const tenantId = resolveTenantId(req, 1);
    const saved = await aiExamService.saveScannerAnswerKey(tenantId, req.body || {}, req.user);
    res.status(200).json({
      status: 'success',
      message: `Answer key saved cleanly (${saved.questionCount} questions) and linked to AI Exam Scanner.`,
      data: { answerKey: saved, answerKeyConfig: saved }
    });
  } catch (error) {
    next(error);
  }
};

const getScannerAnswerKey = async (req, res, next) => {
  try {
    const tenantId = resolveTenantId(req, 1);
    const config = await aiExamService.getScannerAnswerKey(tenantId, req.query || {});
    res.status(200).json({
      status: 'success',
      data: { answerKey: config, answerKeyConfig: config }
    });
  } catch (error) {
    next(error);
  }
};

const listExamVettingSubmissions = async (req, res, next) => {
  try {
    const tenantId = resolveTenantId(req, 1);
    const submissions = await aiExamService.listExamVettingSubmissions(tenantId, req.query || {}, req.user);
    res.status(200).json({
      status: 'success',
      results: submissions.length,
      data: { submissions }
    });
  } catch (error) {
    next(error);
  }
};

const submitExamForHeadmasterVetting = async (req, res, next) => {
  try {
    const tenantId = resolveTenantId(req, 1);
    const submission = await aiExamService.submitExamForHeadmasterVetting(tenantId, req.body || {}, req.user);
    res.status(201).json({
      status: 'success',
      code: 'EXAM_VETTING_SUBMITTED',
      message: `End-of-Term / Semester Exam "${submission.title}" has been submitted to the Headmaster for vetting and ongoing exam confirmation.`,
      data: { submission }
    });
  } catch (error) {
    next(error);
  }
};

const reviewExamVettingSubmission = async (req, res, next) => {
  try {
    const tenantId = resolveTenantId(req, 1);
    const result = await aiExamService.reviewExamVettingSubmission(
      tenantId,
      req.params.id,
      req.body || {},
      req.user
    );
    const decision = result.submission?.vettingStatus;
    const code =
      decision === 'CONFIRMED_ONGOING'
        ? 'EXAM_VETTING_CONFIRMED'
        : decision === 'REVISION_REQUESTED'
          ? 'EXAM_VETTING_REVISION_REQUESTED'
          : 'EXAM_VETTING_REJECTED';
    const message =
      decision === 'CONFIRMED_ONGOING'
        ? `Exam "${result.submission.title}" has been vetted and officially confirmed for ongoing examinations.`
        : decision === 'REVISION_REQUESTED'
          ? `Revision requested for "${result.submission.title}". Headmaster remarks sent back to teacher.`
          : `Exam "${result.submission.title}" was rejected by Headmaster vetting.`;
    res.status(200).json({
      status: 'success',
      code,
      message,
      data: result
    });
  } catch (error) {
    next(error);
  }
};

const resubmitExamForHeadmasterVetting = async (req, res, next) => {
  try {
    const tenantId = resolveTenantId(req, 1);
    const submission = await aiExamService.resubmitExamForHeadmasterVetting(
      tenantId,
      req.params.id,
      req.body || {},
      req.user
    );
    res.status(200).json({
      status: 'success',
      code: 'EXAM_VETTING_RESUBMITTED',
      message: `Revised exam "${submission.title}" resubmitted to Headmaster for vetting and confirmation.`,
      data: { submission }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getExams,
  createExam,
  saveScannerAnswerKey,
  getScannerAnswerKey,
  submitAnswerSheet,
  getAnswerSheets,
  gradeAnswerSheet,
  postProctorHeartbeat,
  postProctorLiveFrame,
  postProctorWebRtcSignal,
  getProctorWebRtcSignals,
  getLiveProctorSessions,
  streamProctorLiveEvents,
  sendProctorMessage,
  getStudentProctorMessages,
  ackProctorMessage,
  saveProctorEvidence,
  getProctorEvidence,
  deleteProctorEvidence,
  listExamVettingSubmissions,
  submitExamForHeadmasterVetting,
  reviewExamVettingSubmission,
  resubmitExamForHeadmasterVetting
};
