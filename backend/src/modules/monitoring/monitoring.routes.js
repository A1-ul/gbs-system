'use strict';

const express = require('express');
const router = express.Router();
const controller = require('./monitoring.controller');

router.get('/health', controller.getHealth);
router.get('/metrics', controller.getMetrics);
router.get('/', controller.getHealth);

module.exports = router;
