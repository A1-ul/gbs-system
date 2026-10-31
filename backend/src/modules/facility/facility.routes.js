const express = require('express');
const router = express.Router();
const facilityController = require('./facility.controller');

router.get('/tickets', facilityController.getTickets);
router.post('/tickets', facilityController.createTicket);
router.patch('/tickets/:id/status', facilityController.updateTicketStatus);
router.get('/stats', facilityController.getStats);

module.exports = router;
