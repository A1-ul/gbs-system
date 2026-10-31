'use strict';

const communicationService = require('./communication.service');

// 1. Status
const getStatus = async (req, res) => {
  const status = await communicationService.getStatus();
  return res.status(200).json({
    status: 'success',
    data: status
  });
};

// 2. Channels
const getChannels = async (req, res, next) => {
  try {
    const tenantId = req.user.tenantId;
    const channels = await communicationService.getChannels(tenantId, req.user.id);
    return res.status(200).json({
      status: 'success',
      results: channels.length,
      data: { channels }
    });
  } catch (err) {
    next(err);
  }
};

const createChannel = async (req, res, next) => {
  try {
    const tenantId = req.user.tenantId;
    const channel = await communicationService.createChannel(tenantId, req.body, req.user.id);
    return res.status(201).json({
      status: 'success',
      data: { channel }
    });
  } catch (err) {
    next(err);
  }
};

const getChannelById = async (req, res, next) => {
  try {
    const tenantId = req.user.tenantId;
    const channel = await communicationService.getChannelById(tenantId, req.params.id);
    return res.status(200).json({
      status: 'success',
      data: { channel }
    });
  } catch (err) {
    next(err);
  }
};

// 3. Messages
const getMessages = async (req, res, next) => {
  try {
    const tenantId = req.user.tenantId;
    const messages = await communicationService.getMessages(tenantId, req.params.id, req.query.limit);
    return res.status(200).json({
      status: 'success',
      results: messages.length,
      data: { messages }
    });
  } catch (err) {
    next(err);
  }
};

const postMessage = async (req, res, next) => {
  try {
    const tenantId = req.user.tenantId;
    const message = await communicationService.postMessage(tenantId, req.params.id, req.body, req.user);
    return res.status(201).json({
      status: 'success',
      data: { message }
    });
  } catch (err) {
    next(err);
  }
};

// 4. Direct Messages
const sendDirectMessage = async (req, res, next) => {
  try {
    const tenantId = req.user.tenantId;
    const { recipientId, content } = req.body;
    const result = await communicationService.sendDirectMessage(tenantId, req.user, recipientId, content);
    return res.status(201).json({
      status: 'success',
      data: result
    });
  } catch (err) {
    next(err);
  }
};

const getDirectConversations = async (req, res, next) => {
  try {
    const tenantId = req.user.tenantId;
    const conversations = await communicationService.getDirectConversations(tenantId, req.user.id);
    return res.status(200).json({
      status: 'success',
      results: conversations.length,
      data: { conversations }
    });
  } catch (err) {
    next(err);
  }
};

// 5. Announcements
const getAnnouncements = async (req, res, next) => {
  try {
    const tenantId = req.user.tenantId;
    const announcements = await communicationService.getAnnouncements(tenantId, req.query);
    return res.status(200).json({
      status: 'success',
      results: announcements.length,
      data: { announcements }
    });
  } catch (err) {
    next(err);
  }
};

const publishAnnouncement = async (req, res, next) => {
  try {
    const tenantId = req.user.tenantId;
    const announcement = await communicationService.publishAnnouncement(tenantId, req.body, req.user);
    return res.status(201).json({
      status: 'success',
      data: { announcement }
    });
  } catch (err) {
    next(err);
  }
};

const archiveAnnouncement = async (req, res, next) => {
  try {
    const tenantId = req.user.tenantId;
    const announcement = await communicationService.archiveAnnouncement(tenantId, req.params.id, req.user);
    return res.status(200).json({
      status: 'success',
      message: 'Announcement successfully archived.',
      data: { announcement }
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getStatus,
  getChannels,
  createChannel,
  getChannelById,
  getMessages,
  postMessage,
  sendDirectMessage,
  getDirectConversations,
  getAnnouncements,
  publishAnnouncement,
  archiveAnnouncement
};