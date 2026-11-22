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

async function updatePresence(req, res, next) {
  try {
    const data = await liveCallService.updatePresence(req);
    return res.status(200).json({ success: true, data });
  } catch (err) {
    return next(err);
  }
}

async function streamCallEvents(req, res, next) {
  try {
    const callId = req.params.callId;
    const { session } = liveCallService.resolveCallLocation(req, callId);
    const callerId = String(req.user?.id || req.user?.email || '');
    const callerEmail = String(req.user?.email || '').trim().toLowerCase() || null;

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

    writeEvent('connected', {
      callId: session.id,
      roomCode: session.roomCode,
      status: session.status,
      participants: session.participants || []
    });

    const onEvent = (evt) => {
      if (!evt) return;
      if (evt.type === 'webrtc_signal' && evt.item) {
        const sig = evt.item;
        if (sig.senderEmail && callerEmail && sig.senderEmail === callerEmail) return;
        if (!sig.senderEmail && String(sig.senderId) === callerId) return;
        if (sig.targetUserId && callerId && String(sig.targetUserId) !== callerId) return;
      }
      writeEvent(evt.type || 'update', evt);
    };

    const channelById = `call:${session.id}`;
    const channelByRoom = `call:${session.roomCode}`;
    liveCallService.callEventBus.on(channelById, onEvent);
    if (channelByRoom !== channelById) {
      liveCallService.callEventBus.on(channelByRoom, onEvent);
    }

    const heartbeat = setInterval(() => {
      try {
        res.write(`: heartbeat ${Date.now()}\n\n`);
      } catch { }
    }, 20000);
    if (typeof heartbeat.unref === 'function') heartbeat.unref();

    req.on('close', () => {
      clearInterval(heartbeat);
      liveCallService.callEventBus.off(channelById, onEvent);
      if (channelByRoom !== channelById) {
        liveCallService.callEventBus.off(channelByRoom, onEvent);
      }
    });
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
  getCallState,
  updatePresence,
  streamCallEvents
};
