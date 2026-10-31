'use strict';

const express = require('express');
const router = express.Router();
const controller = require('./inventory.controller');

router.get('/status', controller.getStatus);
router.get('/stats', controller.getStats);

// Items & Stock
router.get('/items', controller.getItems);
router.post('/items', controller.createItem);
router.post('/items/:id/adjust', controller.adjustStock);

// Purchase Requests & Requisitions
router.get('/requests', controller.getRequests);
router.post('/requests', controller.createRequest);
router.patch('/requests/:id/status', controller.updateRequestStatus);

// Base fallback
router.get('/', controller.getItems);
router.post('/', controller.createItem);

module.exports = router;
