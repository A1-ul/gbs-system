'use strict';

const express = require('express');
const router = express.Router();
const staffAttendanceService = require('./staffAttendance.service');
const { protect } = require('../../middleware/auth.middleware');
const { restrictTo } = require('../../middleware/rbac.middleware');
const { tenantStatusGuard, tenantIsolationGuard } = require('../../middleware/tenant.middleware');

router.use(protect);
router.use(tenantStatusGuard);
router.use(tenantIsolationGuard);

const ALL_STAFF_ACCESS = ['ADMIN', 'SUPER_ADMIN', 'HEADMASTER', 'PRINCIPAL', 'TEACHER', 'SECRETARY', 'STAFF', 'HR', 'ACCOUNTANT', 'CLINIC_DOCTOR', 'CLINIC_NURSE', 'DEVELOPER'];
const EXECUTIVE_VIEW_ACCESS = ['ADMIN', 'SUPER_ADMIN', 'HEADMASTER', 'PRINCIPAL', 'HR', 'DEVELOPER'];

router.get('/settings', restrictTo(...ALL_STAFF_ACCESS), async (req, res, next) => {
  try {
    const tid = String(parseInt(req.tenantId || req.user?.tenantId || 1, 10) || 1);
    const settings = staffAttendanceService.getTenantSettings(tid);
    res.status(200).json({ status: 'success', data: { settings } });
  } catch (err) {
    next(err);
  }
});

router.put('/settings', restrictTo(...EXECUTIVE_VIEW_ACCESS), async (req, res, next) => {
  try {
    const settings = await staffAttendanceService.updateAttendanceSettings(req);
    res.status(200).json({
      status: 'success',
      message: `Official attendance schedule updated — Reporting Time: ${settings.reportingTimeLabel || settings.reportingTime}, Closing Time: ${settings.closingTimeLabel || settings.closingTime}, Auto Clock-Out: +${Math.round((settings.autoClockOutDelayMinutes || 120) / 60)}h, Term: ${settings.activeTerm}.`,
      data: { settings }
    });
  } catch (err) {
    next(err);
  }
});

router.get('/my-status', restrictTo(...ALL_STAFF_ACCESS), async (req, res, next) => {
  try {
    const data = await staffAttendanceService.getMyStaffAttendanceStatus(req);
    res.status(200).json({ status: 'success', data });
  } catch (err) {
    next(err);
  }
});

router.post('/bypass', restrictTo(...ALL_STAFF_ACCESS), async (req, res, next) => {
  try {
    const entry = await staffAttendanceService.bypassClockInStaff(req);
    res.status(200).json({
      status: 'success',
      message: 'Welcome screen bypassed. Note: You are NOT marked present at work or on duty until you clock in.',
      data: { record: entry }
    });
  } catch (err) {
    next(err);
  }
});

router.post('/clock-in', restrictTo(...ALL_STAFF_ACCESS), async (req, res, next) => {
  try {
    const entry = await staffAttendanceService.clockInStaff(req);
    res.status(201).json({
      status: 'success',
      message: `Clocked in successfully: ${entry.staffName} (${entry.designation}) on ${entry.dayOfWeek}, ${entry.shiftDate} at ${entry.clockInTimeLabel} (${entry.workplaceLocation}) — proof sent to Headmaster for verification.`,
      data: { record: entry }
    });
  } catch (err) {
    next(err);
  }
});

router.patch('/:recordId/verify', restrictTo(...EXECUTIVE_VIEW_ACCESS), async (req, res, next) => {
  try {
    const entry = await staffAttendanceService.verifyStaffClockInRecord(req);
    res.status(200).json({
      status: 'success',
      message: `Headmaster verification updated: ${entry.staffName} marked ${entry.verificationStatus}.`,
      data: { record: entry }
    });
  } catch (err) {
    next(err);
  }
});

router.post('/clock-out', restrictTo(...ALL_STAFF_ACCESS), async (req, res, next) => {
  try {
    const entry = await staffAttendanceService.clockOutStaff(req);
    res.status(200).json({
      status: 'success',
      message: `Clocked out cleanly: ${entry.staffName} (${entry.hoursWorkedLabel} worked).`,
      data: { record: entry }
    });
  } catch (err) {
    next(err);
  }
});

router.get('/all', restrictTo(...EXECUTIVE_VIEW_ACCESS), async (req, res, next) => {
  try {
    const data = await staffAttendanceService.getAllStaffAttendance(req);
    res.status(200).json({ status: 'success', results: data.records.length, data });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
