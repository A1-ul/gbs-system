'use strict';

const libraryService = require('./library.service');

function extractTenantId(req) {
  return req.user?.tenantId || req.query.tenantId || req.headers['x-tenant-id'] || 1;
}

async function getAll(req, res, next) {
  try {
    const tenantId = extractTenantId(req);
    const search = req.query.search || req.query.q || '';
    const result = await libraryService.getBooks(tenantId, search);
    return res.status(result.success ? 200 : 500).json(result);
  } catch (error) {
    return next(error);
  }
}

async function getById(req, res, next) {
  try {
    const tenantId = extractTenantId(req);
    const result = await libraryService.getBookById(req.params.id, tenantId);
    return res.status(result.success ? 200 : 404).json(result);
  } catch (error) {
    return next(error);
  }
}

async function create(req, res, next) {
  try {
    const tenantId = extractTenantId(req);
    const result = await libraryService.createBook(req.body, tenantId);
    return res.status(result.success ? 201 : 400).json(result);
  } catch (error) {
    return next(error);
  }
}

async function update(req, res, next) {
  try {
    const tenantId = extractTenantId(req);
    const result = await libraryService.updateBook(req.params.id, req.body, tenantId);
    return res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    return next(error);
  }
}

async function remove(req, res, next) {
  try {
    const tenantId = extractTenantId(req);
    const result = await libraryService.deleteBook(req.params.id, tenantId);
    return res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    return next(error);
  }
}

async function borrow(req, res, next) {
  try {
    const tenantId = extractTenantId(req);
    const result = await libraryService.borrowBook(req.body, tenantId);
    return res.status(result.success ? 201 : 400).json(result);
  } catch (error) {
    return next(error);
  }
}

async function returnBook(req, res, next) {
  try {
    const tenantId = extractTenantId(req);
    const loanId = req.params.loanId || req.body.loanId;
    const result = await libraryService.returnBook(loanId, tenantId);
    return res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    return next(error);
  }
}

async function getLoans(req, res, next) {
  try {
    const tenantId = extractTenantId(req);
    const status = req.query.status || '';
    const result = await libraryService.getLoans(tenantId, status);
    return res.status(result.success ? 200 : 500).json(result);
  } catch (error) {
    return next(error);
  }
}

async function getStats(req, res, next) {
  try {
    const tenantId = extractTenantId(req);
    const result = await libraryService.getStats(tenantId);
    return res.status(result.success ? 200 : 500).json(result);
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getAll,
  getById,
  create,
  update,
  remove,
  borrow,
  returnBook,
  getLoans,
  getStats
};