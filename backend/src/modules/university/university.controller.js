'use strict';

const universityService = require('./university.service');

const getInstitutionProfile = async (req, res, next) => {
  try {
    const data = await universityService.getInstitutionProfileSummary(req);
    res.status(200).json({ status: 'success', data });
  } catch (err) {
    next(err);
  }
};

const listInternships = async (req, res, next) => {
  try {
    const internships = await universityService.listInternships(req);
    res.status(200).json({ status: 'success', results: internships.length, data: { internships } });
  } catch (err) {
    next(err);
  }
};

const submitInternship = async (req, res, next) => {
  try {
    const internship = await universityService.submitInternship(req);
    res.status(201).json({
      status: 'success',
      message: 'University internship placement form submitted successfully.',
      data: { internship }
    });
  } catch (err) {
    next(err);
  }
};

const gradeInternship = async (req, res, next) => {
  try {
    const internship = await universityService.gradeInternship(req, req.params.id);
    res.status(200).json({
      status: 'success',
      message: `Internship graded (${internship.letterGrade}) cleanly.`,
      data: { internship }
    });
  } catch (err) {
    next(err);
  }
};

const listAttachments = async (req, res, next) => {
  try {
    const attachments = await universityService.listAttachments(req);
    res.status(200).json({ status: 'success', results: attachments.length, data: { attachments } });
  } catch (err) {
    next(err);
  }
};

const submitAttachment = async (req, res, next) => {
  try {
    const attachment = await universityService.submitAttachment(req);
    res.status(201).json({
      status: 'success',
      message: 'Academic & field attachment form submitted successfully.',
      data: { attachment }
    });
  } catch (err) {
    next(err);
  }
};

const gradeAttachment = async (req, res, next) => {
  try {
    const attachment = await universityService.gradeAttachment(req, req.params.id);
    res.status(200).json({
      status: 'success',
      message: `Attachment graded (${attachment.letterGrade}) cleanly.`,
      data: { attachment }
    });
  } catch (err) {
    next(err);
  }
};

const listStreams = async (req, res, next) => {
  try {
    const streams = await universityService.listStreams(req);
    res.status(200).json({ status: 'success', results: streams.length, data: { streams } });
  } catch (err) {
    next(err);
  }
};

const createStream = async (req, res, next) => {
  try {
    const stream = await universityService.createStream(req);
    res.status(201).json({
      status: 'success',
      message: `University student stream '${stream.streamName}' created.`,
      data: { stream }
    });
  } catch (err) {
    next(err);
  }
};

const listGovernanceRoles = async (req, res, next) => {
  try {
    const roles = await universityService.listGovernanceRoles(req);
    res.status(200).json({ status: 'success', results: roles.length, data: { governanceRoles: roles } });
  } catch (err) {
    next(err);
  }
};

const createGovernanceRole = async (req, res, next) => {
  try {
    const roleRecord = await universityService.createGovernanceRole(req);
    res.status(201).json({
      status: 'success',
      message: `Student leadership role '${roleRecord.positionTitle}' recorded.`,
      data: { governanceRole: roleRecord }
    });
  } catch (err) {
    next(err);
  }
};

const deleteGovernanceRole = async (req, res, next) => {
  try {
    const data = await universityService.deleteGovernanceRole(req, req.params.id);
    res.status(200).json({ status: 'success', data });
  } catch (err) {
    next(err);
  }
};

const listExams = async (req, res, next) => {
  try {
    const exams = await universityService.listUniversityExams(req);
    res.status(200).json({ status: 'success', results: exams.length, data: { exams } });
  } catch (err) {
    next(err);
  }
};

const createExam = async (req, res, next) => {
  try {
    const exam = await universityService.createUniversityExam(req);
    const pendingVetting = exam?.vettingStatus === 'PENDING_HEADMASTER_VETTING';
    res.status(201).json({
      status: 'success',
      code: pendingVetting ? 'EXAM_VETTING_SUBMITTED' : 'UNIVERSITY_EXAM_PUBLISHED',
      message: pendingVetting
        ? `Examination '${exam.courseCode}' submitted to the Headmaster / Principal for vetting & confirmation before ongoing exams.`
        : `Examination '${exam.courseCode}' confirmed and published cleanly.`,
      data: { exam }
    });
  } catch (err) {
    next(err);
  }
};

const listResults = async (req, res, next) => {
  try {
    const data = await universityService.listCourseResults(req);
    res.status(200).json({ status: 'success', data });
  } catch (err) {
    next(err);
  }
};

const recordResult = async (req, res, next) => {
  try {
    const result = await universityService.recordCourseResult(req);
    res.status(201).json({
      status: 'success',
      message: `Exam result recorded (${result.courseCode}: ${result.letterGrade}).`,
      data: { result }
    });
  } catch (err) {
    next(err);
  }
};

const advanceStudent = async (req, res, next) => {
  try {
    const data = await universityService.advanceOrGraduateStudent(req);
    res.status(200).json({ status: 'success', message: data.message, data });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getInstitutionProfile,
  listInternships,
  submitInternship,
  gradeInternship,
  listAttachments,
  submitAttachment,
  gradeAttachment,
  listStreams,
  createStream,
  listGovernanceRoles,
  createGovernanceRole,
  deleteGovernanceRole,
  listExams,
  createExam,
  listResults,
  recordResult,
  advanceStudent
};
