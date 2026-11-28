'use strict';

const express = require('express');
const router = express.Router();
const controller = require('./library.controller');
const { protect } = require('../../middleware/auth.middleware');
const { restrictTo } = require('../../middleware/rbac.middleware');
const { tenantStatusGuard, tenantIsolationGuard } = require('../../middleware/tenant.middleware');

const LIBRARY_OPERATOR_ROLES = [
  'ADMIN', 'SUPER_ADMIN', 'HEADMASTER', 'PRINCIPAL',
  'TEACHER', 'STAFF', 'SECRETARY', 'HR', 'DEVELOPER'
];

router.use(protect);
router.use(tenantStatusGuard);
router.use(tenantIsolationGuard);

// Telemetry & stats
router.get('/stats', controller.getStats);

// Loan lifecycle (Staff/Teachers/Leadership process checkouts & returns)
router.get('/loans', restrictTo(...LIBRARY_OPERATOR_ROLES), controller.getLoans);
router.post('/borrow', restrictTo(...LIBRARY_OPERATOR_ROLES), controller.borrow);
router.post('/return', restrictTo(...LIBRARY_OPERATOR_ROLES), controller.returnBook);
router.post('/return/:loanId', restrictTo(...LIBRARY_OPERATOR_ROLES), controller.returnBook);

// Book Catalog (All authenticated school roles can browse; only operators can add/edit/delete)
router.get('/', controller.getAll);
router.get('/books', controller.getAll);
router.get('/:id', controller.getById);
router.post('/', restrictTo(...LIBRARY_OPERATOR_ROLES), controller.create);
router.post('/books', restrictTo(...LIBRARY_OPERATOR_ROLES), controller.create);
router.put('/:id', restrictTo(...LIBRARY_OPERATOR_ROLES), controller.update);
router.delete('/:id', restrictTo(...LIBRARY_OPERATOR_ROLES), controller.remove);

module.exports = router;