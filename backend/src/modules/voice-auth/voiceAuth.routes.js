const express = require('express');
const voiceAuthController = require('./voiceAuth.controller');
const { protect } = require('../../middleware/auth.middleware');

const router = express.Router();

router.use(protect);

router.post('/enroll', voiceAuthController.enrollVoice);
router.post('/verify', voiceAuthController.verifyVoice);

module.exports = router;
