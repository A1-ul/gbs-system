const cctvService = require('./cctv.service');

class CCTVController {
  async getStreams(req, res) {
    try {
      const tenantId = req.user?.tenantId || parseInt(req.query.tenantId) || 1;
      const streams = await cctvService.getStreams(tenantId);
      res.status(200).json({ success: true, count: streams.length, data: streams });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  async getStreamById(req, res) {
    try {
      const tenantId = req.user?.tenantId || parseInt(req.query.tenantId) || 1;
      const stream = await cctvService.getStreamById(req.params.id, tenantId);
      res.status(200).json({ success: true, data: stream });
    } catch (err) {
      res.status(404).json({ success: false, message: err.message });
    }
  }

  async createStream(req, res) {
    try {
      const tenantId = req.user?.tenantId || parseInt(req.body.tenantId) || 1;
      const stream = await cctvService.createStream(tenantId, req.body);
      res.status(201).json({ success: true, message: 'CCTV stream registered.', data: stream });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  }

  async updateStreamStatus(req, res) {
    try {
      const tenantId = req.user?.tenantId || parseInt(req.body.tenantId) || 1;
      const stream = await cctvService.updateStreamStatus(req.params.id, tenantId, req.body.status);
      res.status(200).json({ success: true, message: 'Camera status updated.', data: stream });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  }

  async getGateEvents(req, res) {
    try {
      const tenantId = req.user?.tenantId || parseInt(req.query.tenantId) || 1;
      const filters = {
        eventType: req.query.eventType,
        isFlagged: req.query.isFlagged
      };
      const events = await cctvService.getGateEvents(tenantId, filters);
      res.status(200).json({ success: true, count: events.length, data: events });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  async recordGateEvent(req, res) {
    try {
      const tenantId = req.user?.tenantId || parseInt(req.body.tenantId) || 1;
      const event = await cctvService.recordGateEvent(tenantId, req.body);
      res.status(201).json({ success: true, message: 'Gate security event recorded.', data: event });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  }

  async toggleFlagEvent(req, res) {
    try {
      const tenantId = req.user?.tenantId || parseInt(req.body.tenantId) || 1;
      const event = await cctvService.toggleFlagEvent(req.params.id, tenantId);
      res.status(200).json({ success: true, message: 'Flag status toggled.', data: event });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  }

  async getStats(req, res) {
    try {
      const tenantId = req.user?.tenantId || parseInt(req.query.tenantId) || 1;
      const stats = await cctvService.getStats(tenantId);
      res.status(200).json({ success: true, data: stats });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
}

module.exports = new CCTVController();