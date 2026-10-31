"use strict";

const developerRoutes = require("./developer-platform.routes");
const developerAuthService = require("./developer.auth.service");
const remoteControlService = require("./developer.remote-control.service");
const subscriptionService = require("./developer.subscription.service");
const backupService = require("./developer.backup.service");
const monitoringService = require("./developer.monitoring.service");
const aiDeveloperAssistant = require("./ai.developer-assistant.service");

module.exports = {
  developerRoutes,
  developerAuthService,
  remoteControlService,
  subscriptionService,
  backupService,
  monitoringService,
  aiDeveloperAssistant
};