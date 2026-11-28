'use strict';

const secretaryService = require('./secretary.service');

async function getOverview(req, res, next) {
  try {
    const data = await secretaryService.getOverview(req);
    res.status(200).json({ status: 'success', data });
  } catch (err) {
    next(err);
  }
}

async function getRecords(req, res, next) {
  try {
    const data = await secretaryService.listRecords(req);
    res.status(200).json({ status: 'success', data });
  } catch (err) {
    next(err);
  }
}

async function createRecord(req, res, next) {
  try {
    const record = await secretaryService.createRecord(req);
    res.status(201).json({
      status: 'success',
      message: `${record.recordType.replace('_', ' ')} (${record.referenceCode}) saved cleanly.`,
      data: { record }
    });
  } catch (err) {
    next(err);
  }
}

async function updateStatus(req, res, next) {
  try {
    const record = await secretaryService.updateRecordStatus(req);
    res.status(200).json({
      status: 'success',
      message: `Record ${record.referenceCode} updated to ${record.status}.`,
      data: { record }
    });
  } catch (err) {
    next(err);
  }
}

async function deleteRecord(req, res, next) {
  try {
    const result = await secretaryService.deleteRecord(req);
    res.status(200).json({
      status: 'success',
      message: `Record ${result.referenceCode} deleted successfully.`,
      data: result
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getOverview,
  getRecords,
  createRecord,
  updateStatus,
  deleteRecord
};
