'use strict';

const express = require('express');
const router = express.Router();
const controller = require('./video.controller');
const { protect } = require('../../middleware/auth.middleware');
const { tenantStatusGuard, tenantIsolationGuard } = require('../../middleware/tenant.middleware');

router.get('/status', controller.getStatus);
router.get('/', controller.getStatus);

// Allow EventSource SSE clients to pass JWT in ?token= before standard protect/tenant guards run
const acceptQueryTokenForStream = (req, _res, next) => {
  if (!req.headers.authorization && req.query?.token) {
    req.headers.authorization = `Bearer ${String(req.query.token).trim()}`;
  }
  next();
};

router.use(acceptQueryTokenForStream);
router.use(protect);
router.use(tenantStatusGuard);
router.use(tenantIsolationGuard);

router.get('/calls/ice-servers', controller.getIceServers);
router.get('/calls/directory', controller.getDirectory);
router.get('/calls/incoming', controller.getIncomingAndActive);
router.get('/calls/missed', controller.getMissedCalls);
router.patch('/calls/missed/:callId/acknowledge', controller.acknowledgeMissedCall);
router.post('/calls/presence', controller.updatePresence);
router.post('/calls/initiate', controller.initiateCall);
router.get('/calls/:callId/stream', controller.streamCallEvents);
router.get('/calls/:callId', controller.getCallState);
router.post('/calls/:callId/answer', controller.answerCall);
router.post('/calls/:callId/leave', controller.leaveCall);
router.post('/calls/:callId/decline', controller.declineCall);
router.post('/calls/:callId/end', controller.endCall);
router.post('/calls/:callId/signal', controller.postSignal);

module.exports = router;
