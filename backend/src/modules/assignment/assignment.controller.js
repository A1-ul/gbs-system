'use strict';

const assignmentService = require('./assignment.service');

const getStatus = async (req, res, next) => {
  try {
    res.status(200).json({
      status: 'success',
      module: 'assignments',
      serviceStatus: 'OPERATIONAL',
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    next(err);
  }
};

const getAssignments = async (req, res, next) => {
  try {
    const data = await assignmentService.getAssignments(req.tenantId, req.query);
    res.status(200).json({
      status: 'success',
      count: data.length,
      data
    });
  } catch (err) {
    next(err);
  }
};

const getAssignmentById = async (req, res, next) => {
  try {
    const data = await assignmentService.getAssignmentById(req.tenantId, req.params.id);
    res.status(200).json({
      status: 'success',
      data
    });
  } catch (err) {
    next(err);
  }
};

const createAssignment = async (req, res, next) => {
  try {
    const data = await assignmentService.createAssignment(req.tenantId, req.body, req.user);
    res.status(201).json({
      status: 'success',
      message: 'Assignment successfully created and published.',
      data
    });
  } catch (err) {
    next(err);
  }
};

const updateAssignment = async (req, res, next) => {
  try {
    const data = await assignmentService.updateAssignment(req.tenantId, req.params.id, req.body, req.user);
    res.status(200).json({
      status: 'success',
      message: 'Assignment successfully updated.',
      data
    });
  } catch (err) {
    next(err);
  }
};

const deleteAssignment = async (req, res, next) => {
  try {
    const data = await assignmentService.deleteAssignment(req.tenantId, req.params.id, req.user);
    res.status(200).json({
      status: 'success',
      message: 'Assignment successfully removed.',
      data
    });
  } catch (err) {
    next(err);
  }
};

const submitAssignment = async (req, res, next) => {
  try {
    const data = await assignmentService.submitAssignment(req.tenantId, req.params.id, req.body, req.user);
    res.status(201).json({
      status: 'success',
      message: 'Assignment submission successfully recorded.',
      data
    });
  } catch (err) {
    next(err);
  }
};

const getAssignmentSubmissions = async (req, res, next) => {
  try {
    const data = await assignmentService.getAssignmentSubmissions(req.tenantId, req.params.id);
    res.status(200).json({
      status: 'success',
      data
    });
  } catch (err) {
    next(err);
  }
};

const gradeSubmission = async (req, res, next) => {
  try {
    const data = await assignmentService.gradeSubmission(req.tenantId, req.params.submissionId, req.body, req.user);
    res.status(200).json({
      status: 'success',
      message: 'Submission successfully evaluated and graded.',
      data
    });
  } catch (err) {
    next(err);
  }
};

const getStudentAssignments = async (req, res, next) => {
  try {
    const data = await assignmentService.getStudentAssignments(req.tenantId, req.params.studentId, req.query);
    res.status(200).json({
      status: 'success',
      data
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getStatus,
  getAssignments,
  getAssignmentById,
  createAssignment,
  updateAssignment,
  deleteAssignment,
  submitAssignment,
  getAssignmentSubmissions,
  gradeSubmission,
  getStudentAssignments
};
