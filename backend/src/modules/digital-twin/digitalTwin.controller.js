const digitalTwinService = require('./digitalTwin.service');

class DigitalTwinController {
  async getZones(req, res) {
    try {
      const tenantId = req.user?.tenantId || parseInt(req.query.tenantId) || 1;
      const zones = await digitalTwinService.getZones(tenantId);
      res.status(200).json({ success: true, count: zones.length, data: zones });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  async getZoneById(req, res) {
    try {
      const tenantId = req.user?.tenantId || parseInt(req.query.tenantId) || 1;
      const zone = await digitalTwinService.getZoneById(req.params.id, tenantId);
      res.status(200).json({ success: true, data: zone });
    } catch (err) {
      res.status(404).json({ success: false, message: err.message });
    }
  }

  async setZoneLockStatus(req, res) {
    try {
      const tenantId = req.user?.tenantId || parseInt(req.body.tenantId) || 1;
      const updated = await digitalTwinService.setZoneLockStatus(req.params.id, tenantId, req.body.lockStatus);
      res.status(200).json({ success: true, message: 'Zone lock status updated.', data: updated });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  }

  async recordTelemetry(req, res) {
    try {
      const { zoneId, metricType, metricValue, unit } = req.body;
      const log = await digitalTwinService.recordTelemetry(zoneId, metricType, metricValue, unit);
      res.status(201).json({ success: true, data: log });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  }

  async getTelemetryHistory(req, res) {
    try {
      const limit = parseInt(req.query.limit) || 20;
      const logs = await digitalTwinService.getTelemetryHistory(req.params.zoneId, limit);
      res.status(200).json({ success: true, count: logs.length, data: logs });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  async getSummary(req, res) {
    try {
      const tenantId = req.user?.tenantId || parseInt(req.query.tenantId) || 1;
      const summary = await digitalTwinService.getSummary(tenantId);
      res.status(200).json({ success: true, data: summary });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
}

module.exports = new DigitalTwinController();
