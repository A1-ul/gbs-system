const express = require('express');
const router = express.Router();
const cctvController = require('./cctv.controller');

router.get('/streams', cctvController.getStreams);
router.post('/streams', cctvController.createStream);
router.get('/streams/:id', cctvController.getStreamById);
router.patch('/streams/:id/status', cctvController.updateStreamStatus);

router.get('/events', cctvController.getGateEvents);
router.post('/events', cctvController.recordGateEvent);
router.patch('/events/:id/flag', cctvController.toggleFlagEvent);

router.get('/stats', cctvController.getStats);

module.exports = router;