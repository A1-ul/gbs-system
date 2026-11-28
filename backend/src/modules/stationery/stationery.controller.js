'use strict';

const stationeryService = require('./stationery.service');

async function getCatalog(req, res, next) {
  try {
    const data = await stationeryService.listCatalog(req);
    res.status(200).json({ status: 'success', data });
  } catch (err) {
    next(err);
  }
}

async function createItem(req, res, next) {
  try {
    const item = await stationeryService.createItem(req);
    res.status(201).json({
      status: 'success',
      message: `Headmaster published "${item.name}" at ${item.currency} ${Number(item.unitPrice).toFixed(2)}.`,
      data: { item }
    });
  } catch (err) {
    next(err);
  }
}

async function updateItem(req, res, next) {
  try {
    const item = await stationeryService.updateItem(req);
    res.status(200).json({
      status: 'success',
      message: `Headmaster updated "${item.name}" (${item.currency} ${Number(item.unitPrice).toFixed(2)}).`,
      data: { item }
    });
  } catch (err) {
    next(err);
  }
}

async function recordSale(req, res, next) {
  try {
    const result = await stationeryService.recordSaleOrOrder(req);
    const isOrder = result.transaction.transactionType === 'ORDER_REQUEST';
    res.status(201).json({
      status: 'success',
      message: isOrder
        ? `Order request (${result.transaction.referenceNumber}) submitted at Headmaster fixed price ${result.transaction.currency} ${Number(result.transaction.totalAmount).toFixed(2)}.`
        : `Sale recorded (${result.transaction.referenceNumber}) for ${result.transaction.currency} ${Number(result.transaction.totalAmount).toFixed(2)}.`,
      data: result
    });
  } catch (err) {
    next(err);
  }
}

async function recordExpense(req, res, next) {
  try {
    const result = await stationeryService.recordExpense(req);
    res.status(201).json({
      status: 'success',
      message: `Stationery expense (${result.linkedExpense.expenseNumber}) recorded and synced to Accountant Expenses Ledger.`,
      data: result
    });
  } catch (err) {
    next(err);
  }
}

async function approveOrder(req, res, next) {
  try {
    const result = await stationeryService.approveOrderRequest(req);
    res.status(200).json({
      status: 'success',
      message: `Stationery order ${result.transaction.referenceNumber} fulfilled and marked paid.`,
      data: result
    });
  } catch (err) {
    next(err);
  }
}

async function getTransactions(req, res, next) {
  try {
    const data = await stationeryService.listTransactions(req);
    res.status(200).json({ status: 'success', data });
  } catch (err) {
    next(err);
  }
}

async function getAuditSummary(req, res, next) {
  try {
    const data = await stationeryService.getAuditSummary(req);
    res.status(200).json({ status: 'success', data });
  } catch (err) {
    next(err);
  }
}

async function deleteItem(req, res, next) {
  try {
    const result = await stationeryService.deleteItem(req);
    res.status(200).json({
      status: 'success',
      message: `Headmaster removed stationery item "${result.name}".`,
      data: result
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getCatalog,
  createItem,
  updateItem,
  deleteItem,
  recordSale,
  recordExpense,
  approveOrder,
  getTransactions,
  getAuditSummary
};
