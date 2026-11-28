'use strict';

const express = require('express');
const router = express.Router();
const controller = require('./monitoring.controller');
const { protect } = require('../../middleware/auth.middleware');
const { restrictTo } = require('../../middleware/rbac.middleware');

router.get('/health', controller.getHealth);
router.get('/metrics', protect, restrictTo('ADMIN', 'SUPER_ADMIN', 'HEADMASTER', 'PRINCIPAL', 'DEVELOPER'), controller.getMetrics);
router.get('/', controller.getHealth);

module.exports = router;
