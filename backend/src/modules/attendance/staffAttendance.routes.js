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

const ALL_STAFF_ACCESS = ['ADMIN', 'SUPER_ADMIN', 'HEADMASTER', 'PRINCIPAL', 'TEACHER', 'STAFF', 'HR', 'ACCOUNTANT', 'CLINIC_DOCTOR', 'CLINIC_NURSE', 'DEVELOPER'];
const EXECUTIVE_VIEW_ACCESS = ['ADMIN', 'SUPER_ADMIN', 'HEADMASTER', 'PRINCIPAL', 'HR', 'DEVELOPER'];

router.get('/my-status', restrictTo(...ALL_STAFF_ACCESS), async (req, res, next) => {
  try {
    const data = await staffAttendanceService.getMyStaffAttendanceStatus(req);
    res.status(200).json({ status: 'success', data });
  } catch (err) {
    next(err);
  }
});

router.post('/clock-in', restrictTo(...ALL_STAFF_ACCESS), async (req, res, next) => {
  try {
    const entry = await staffAttendanceService.clockInStaff(req);
    res.status(201).json({
      status: 'success',
      message: `Clocked in successfully: ${entry.staffName} (${entry.designation}) at ${new Date(entry.clockInAt).toLocaleTimeString()}.`,
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
