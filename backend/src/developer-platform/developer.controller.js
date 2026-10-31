"use strict";

const developerAuthService = require("./developer.auth.service");
const remoteControlService = require("./developer.remote-control.service");
const subscriptionService = require("./developer.subscription.service");
const backupService = require("./developer.backup.service");
const monitoringService = require("./developer.monitoring.service");
const aiDeveloperAssistant = require("./ai.developer-assistant.service");

class DeveloperController {
  async login(req, res) {
    try {
      const { username, password, pinCode } = req.body;
      const result = await developerAuthService.authenticateDeveloper(username, password, pinCode);
      return res.status(200).json(result);
    } catch (err) {
      return res.status(401).json({ success: false, error: err.message });
    }
  }

  async getMetrics(req, res) {
    try {
      const metrics = await monitoringService.getLiveSystemMetrics();
      return res.status(200).json({ success: true, metrics });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  async lockSystem(req, res) {
    try {
      const { tenantId, reason } = req.body;
      const result = await remoteControlService.lockSystem(tenantId, reason);
      return res.status(200).json(result);
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  async unlockSystem(req, res) {
    try {
      const { tenantId } = req.body;
      const result = await remoteControlService.unlockSystem(tenantId);
      return res.status(200).json(result);
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  async triggerBackup(req, res) {
    try {
      const { backupType } = req.body;
      const result = await backupService.triggerBackup(backupType);
      return res.status(200).json(result);
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  async runAICrashAnalysis(req, res) {
    try {
      const { stackTrace } = req.body;
      const analysis = await aiDeveloperAssistant.analyzeCrash(stackTrace || "Error: Dummy stack trace");
      return res.status(200).json({ success: true, analysis });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  async verifyBlueprint(req, res) {
    try {
      const report = await aiDeveloperAssistant.verifyBlueprintStructure();
      return res.status(200).json({ success: true, report });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }
}

module.exports = new DeveloperController();
