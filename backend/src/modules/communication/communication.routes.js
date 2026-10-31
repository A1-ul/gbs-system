'use strict';

const express = require('express');
const communicationController = require('./communication.controller');
const { protect } = require('../../middleware/auth.middleware');
const { restrictTo } = require('../../middleware/rbac.middleware');
const { tenantStatusGuard, tenantIsolationGuard } = require('../../middleware/tenant.middleware');

const router = express.Router();

// 1. Status Check
router.get('/status', communicationController.getStatus);

// Authentication & Tenant Security Gate
router.use(protect);
router.use(tenantStatusGuard);
router.use(tenantIsolationGuard);

// 2. Channels
router.get('/channels', communicationController.getChannels);
router.post('/channels', restrictTo('SUPER_ADMIN', 'ADMIN', 'TEACHER', 'STAFF', 'DEVELOPER'), communicationController.createChannel);
router.get('/channels/:id', communicationController.getChannelById);

// 3. Messages
router.get('/channels/:id/messages', communicationController.getMessages);
router.post('/channels/:id/messages', communicationController.postMessage);

// 4. Direct Messaging (Parent-Teacher, Admin-Staff)
router.post('/direct-message', communicationController.sendDirectMessage);
router.get('/direct-messages', communicationController.getDirectConversations);

// 5. Broadcast Announcements
router.get('/announcements', communicationController.getAnnouncements);
router.post('/announcements', restrictTo('SUPER_ADMIN', 'ADMIN', 'STAFF', 'DEVELOPER'), communicationController.publishAnnouncement);
router.put('/announcements/:id/archive', restrictTo('SUPER_ADMIN', 'ADMIN', 'STAFF', 'DEVELOPER'), communicationController.archiveAnnouncement);
router.delete('/announcements/:id', restrictTo('SUPER_ADMIN', 'ADMIN', 'STAFF', 'DEVELOPER'), communicationController.archiveAnnouncement);

module.exports = router;