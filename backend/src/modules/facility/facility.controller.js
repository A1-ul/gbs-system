const facilityService = require('./facility.service');

class FacilityController {
  async getTickets(req, res) {
    try {
      const tenantId = req.user?.tenantId || parseInt(req.query.tenantId) || 1;
      const filters = {
        status: req.query.status,
        category: req.query.category
      };
      const tickets = await facilityService.getTickets(tenantId, filters);
      res.status(200).json({ success: true, count: tickets.length, data: tickets });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  async createTicket(req, res) {
    try {
      const tenantId = req.user?.tenantId || parseInt(req.body.tenantId) || 1;
      const ticket = await facilityService.createTicket(tenantId, req.body);
      res.status(201).json({ success: true, message: 'Facility ticket created successfully.', data: ticket });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  }

  async updateTicketStatus(req, res) {
    try {
      const tenantId = req.user?.tenantId || parseInt(req.body.tenantId) || 1;
      const updated = await facilityService.updateTicketStatus(req.params.id, tenantId, req.body);
      res.status(200).json({ success: true, message: 'Ticket status updated.', data: updated });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  }

  async getStats(req, res) {
    try {
      const tenantId = req.user?.tenantId || parseInt(req.query.tenantId) || 1;
      const stats = await facilityService.getStats(tenantId);
      res.status(200).json({ success: true, data: stats });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
}

module.exports = new FacilityController();
