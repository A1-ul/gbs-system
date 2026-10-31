'use strict';

const service = require('./meeting.service');

async function getStatus(req, res, next) {
  try {
    const data = await service.getStatus();
    res.status(200).json({ status: 'success', data });
  } catch (error) {
    next(error);
  }
}

async function createMeeting(req, res, next) {
  try {
    const meeting = await service.createMeeting(req.tenantId, req.user, req.body);
    res.status(201).json({
      status: 'success',
      message: 'Online meeting scheduled successfully.',
      data: { meeting }
    });
  } catch (error) {
    next(error);
  }
}

async function getMeetings(req, res, next) {
  try {
    const meetings = await service.getMeetings(req.tenantId, req.query);
    res.status(200).json({
      status: 'success',
      results: meetings.length,
      data: { meetings }
    });
  } catch (error) {
    next(error);
  }
}

async function getMeetingById(req, res, next) {
  try {
    const meeting = await service.getMeetingById(req.tenantId, req.params.id);
    res.status(200).json({
      status: 'success',
      data: { meeting }
    });
  } catch (error) {
    next(error);
  }
}

async function updateMeeting(req, res, next) {
  try {
    const meeting = await service.updateMeeting(req.tenantId, req.params.id, req.body, req.user);
    res.status(200).json({
      status: 'success',
      message: 'Online meeting updated successfully.',
      data: { meeting }
    });
  } catch (error) {
    next(error);
  }
}

async function deleteMeeting(req, res, next) {
  try {
    const result = await service.deleteMeeting(req.tenantId, req.params.id, req.user);
    res.status(200).json({
      status: 'success',
      data: result
    });
  } catch (error) {
    next(error);
  }
}

async function batchDeleteMeetings(req, res, next) {
  try {
    const { meetingIds } = req.body;
    const result = await service.batchDeleteMeetings(req.tenantId, meetingIds, req.user);
    res.status(200).json({
      status: 'success',
      data: result
    });
  } catch (error) {
    next(error);
  }
}

async function joinMeeting(req, res, next) {
  try {
    const meta = {
      deviceInfo: req.headers['user-agent'] || 'Web Client',
      ipAddress: req.ip || req.socket?.remoteAddress || '127.0.0.1'
    };
    const result = await service.joinMeeting(req.tenantId, req.params.id, req.user, meta);
    res.status(200).json({
      status: 'success',
      message: 'Joined meeting successfully. Attendance logged.',
      data: result
    });
  } catch (error) {
    next(error);
  }
}

async function syncFromTimetable(req, res, next) {
  try {
    const meeting = await service.syncFromTimetable(req.tenantId, req.params.slotId, req.user, req.body);
    res.status(201).json({
      status: 'success',
      message: 'Virtual meeting synchronized from timetable period.',
      data: { meeting }
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getStatus,
  createMeeting,
  getMeetings,
  getMeetingById,
  updateMeeting,
  deleteMeeting,
  batchDeleteMeetings,
  joinMeeting,
  syncFromTimetable
};
