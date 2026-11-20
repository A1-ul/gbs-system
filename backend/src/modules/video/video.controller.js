'use strict';

const logger = require('../../utils/logger') || console;
const service = require('./video.service');
const liveCallService = require('./liveCall.service');

async function getStatus(req, res, next) {
  try {
    const data = await service.getStatus();
    return res.status(200).json({
      success: true,
      data: {
        ...data,
        webrtcSignalingEnabled: true,
        supportedModes: ['VIDEO', 'VOICE', 'SCREEN_SHARE', 'CONFERENCE']
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    if (logger.error) logger.error('VIDEO_CONTROLLER_ERROR', { message: error.message });
    return next(error);
  }
}

async function getDirectory(req, res, next) {
  try {
    const data = await liveCallService.getCallDirectory(req);
    return res.status(200).json({ success: true, data });
  } catch (err) {
    return next(err);
  }
}

async function initiateCall(req, res, next) {
  try {
    const session = await liveCallService.initiateCall(req);
    return res.status(201).json({
      success: true,
      message:
        session.callScope === 'DIRECT'
          ? `Ringing ${session.targetName || session.targetRole} via in-system ${session.mediaMode.toLowerCase()} call...`
          : `Live ${session.mediaMode.toLowerCase()} conference room "${session.title}" is now active!`,
      data: { session }
    });
  } catch (err) {
    return next(err);
  }
}

async function getIncomingAndActive(req, res, next) {
  try {
    const data = await liveCallService.getIncomingAndActiveCalls(req);
    return res.status(200).json({ success: true, data });
  } catch (err) {
    return next(err);
  }
}

async function answerCall(req, res, next) {
  try {
    const session = await liveCallService.answerOrJoinCall(req);
    return res.status(200).json({
      success: true,
      message: `Joined ${session.title} successfully.`,
      data: { session }
    });
  } catch (err) {
    return next(err);
  }
}

async function declineCall(req, res, next) {
  try {
    const session = await liveCallService.declineCall(req);
    return res.status(200).json({
      success: true,
      message: 'Call declined.',
      data: { session }
    });
  } catch (err) {
    return next(err);
  }
}

async function endCall(req, res, next) {
  try {
    const session = await liveCallService.endCall(req);
    return res.status(200).json({
      success: true,
      message: 'Live call / conference session ended cleanly.',
      data: { session }
    });
  } catch (err) {
    return next(err);
  }
}

async function postSignal(req, res, next) {
  try {
    const data = await liveCallService.postSignalOrChat(req);
    return res.status(200).json({ success: true, data });
  } catch (err) {
    return next(err);
  }
}

async function getCallState(req, res, next) {
  try {
    const data = await liveCallService.getCallState(req);
    return res.status(200).json({ success: true, data });
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  getStatus,
  getDirectory,
  initiateCall,
  getIncomingAndActive,
  answerCall,
  declineCall,
  endCall,
  postSignal,
  getCallState
};
