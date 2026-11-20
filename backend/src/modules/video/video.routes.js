'use strict';

const express = require('express');
const router = express.Router();
const controller = require('./video.controller');
const { protect } = require('../../middleware/auth.middleware');
const { tenantStatusGuard, tenantIsolationGuard } = require('../../middleware/tenant.middleware');

router.get('/status', controller.getStatus);
router.get('/', controller.getStatus);

router.use(protect);
router.use(tenantStatusGuard);
router.use(tenantIsolationGuard);

router.get('/calls/directory', controller.getDirectory);
router.get('/calls/incoming', controller.getIncomingAndActive);
router.post('/calls/initiate', controller.initiateCall);
router.get('/calls/:callId', controller.getCallState);
router.post('/calls/:callId/answer', controller.answerCall);
router.post('/calls/:callId/decline', controller.declineCall);
router.post('/calls/:callId/end', controller.endCall);
router.post('/calls/:callId/signal', controller.postSignal);

module.exports = router;
