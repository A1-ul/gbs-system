'use strict';

const attendanceService = require('./attendance.service');

const getStatus = async (req, res, next) => {
  try {
    res.status(200).json({
      status: 'success',
      module: 'attendance',
      serviceStatus: 'OPERATIONAL',
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    next(err);
  }
};

const getClassRoster = async (req, res, next) => {
  try {
    const data = await attendanceService.getClassRoster(req.tenantId, req.params.classId);
    res.status(200).json({
      status: 'success',
      data
    });
  } catch (err) {
    next(err);
  }
};

const markBatchAttendance = async (req, res, next) => {
  try {
    const data = await attendanceService.markBatchAttendance(req.tenantId, req.body, req.user);
    res.status(201).json({
      status: 'success',
      message: `Successfully marked attendance for ${data.metrics.totalMarked} students.`,
      data
    });
  } catch (err) {
    next(err);
  }
};

const markSingleAttendance = async (req, res, next) => {
  try {
    const data = await attendanceService.markSingleStudentAttendance(req.tenantId, req.body, req.user);
    res.status(200).json({
      status: 'success',
      message: 'Student attendance marked successfully.',
      data
    });
  } catch (err) {
    next(err);
  }
};

const getClassAttendance = async (req, res, next) => {
  try {
    const data = await attendanceService.getClassAttendance(req.tenantId, req.params.classId, req.query);
    res.status(200).json({
      status: 'success',
      data
    });
  } catch (err) {
    next(err);
  }
};

const getStudentAttendance = async (req, res, next) => {
  try {
    const data = await attendanceService.getStudentAttendance(req.tenantId, req.params.studentId, req.query);
    res.status(200).json({
      status: 'success',
      data
    });
  } catch (err) {
    next(err);
  }
};

const getAttendanceAnalytics = async (req, res, next) => {
  try {
    const data = await attendanceService.getAttendanceAnalytics(req.tenantId, req.query);
    res.status(200).json({
      status: 'success',
      data
    });
  } catch (err) {
    next(err);
  }
};

const submitWeeklyReport = async (req, res, next) => {
  try {
    const data = await attendanceService.submitWeeklyReport(req.tenantId, req.body, req.user);
    res.status(201).json({
      status: 'success',
      message: 'Weekly attendance report compiled and dispatched to Headmaster executive suite.',
      data
    });
  } catch (err) {
    next(err);
  }
};

const getWeeklyReports = async (req, res, next) => {
  try {
    const data = await attendanceService.getWeeklyReports(req.tenantId);
    res.status(200).json({
      status: 'success',
      data: { reports: data }
    });
  } catch (err) {
    next(err);
  }
};

const crossCheckWeeklyReport = async (req, res, next) => {
  try {
    const data = await attendanceService.crossCheckWeeklyReport(req.tenantId, req.params.reportId, req.user, req.body);
    res.status(200).json({
      status: 'success',
      message: 'Weekly attendance report successfully cross-checked and signed off by Headmaster.',
      data
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getStatus,
  getClassRoster,
  markBatchAttendance,
  markSingleAttendance,
  getClassAttendance,
  getStudentAttendance,
  getAttendanceAnalytics,
  submitWeeklyReport,
  getWeeklyReports,
  crossCheckWeeklyReport
};

