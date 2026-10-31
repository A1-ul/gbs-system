'use strict';

const express = require('express');
const router = express.Router();
const controller = require('./library.controller');

// Telemetry & stats
router.get('/stats', controller.getStats);

// Loan lifecycle
router.get('/loans', controller.getLoans);
router.post('/borrow', controller.borrow);
router.post('/return', controller.returnBook);
router.post('/return/:loanId', controller.returnBook);

// Book Catalog
router.get('/', controller.getAll);
router.get('/books', controller.getAll);
router.get('/:id', controller.getById);
router.post('/', controller.create);
router.post('/books', controller.create);
router.put('/:id', controller.update);
router.delete('/:id', controller.remove);

module.exports = router;