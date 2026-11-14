const express = require('express');
const router = express.Router();
const facilityController = require('./facility.controller');
const { optionalProtect } = require('../../utils/resolveTenantId');

router.use(optionalProtect);

router.get('/tickets', facilityController.getTickets);
router.post('/tickets', facilityController.createTicket);
router.patch('/tickets/:id/status', facilityController.updateTicketStatus);
router.get('/stats', facilityController.getStats);

module.exports = router;
