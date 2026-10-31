"use strict";

const voiceRoutes = require("./voice.routes");
const voiceSTTService = require("./voice-stt.service");
const voiceMatchService = require("./voice-match.service");
const voiceAuthController = require("./voice-auth.controller");

module.exports = {
  voiceRoutes,
  voiceSTTService,
  voiceMatchService,
  voiceAuthController
};
