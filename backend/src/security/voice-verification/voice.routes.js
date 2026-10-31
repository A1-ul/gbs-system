"use strict";

const express = require("express");
const router = express.Router();
const voiceAuthController = require("./voice-auth.controller");

router.post("/verify", voiceAuthController.processVoiceAuthentication);

module.exports = router;
