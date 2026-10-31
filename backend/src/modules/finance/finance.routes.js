'use strict';

const express = require('express');
const financeController = require('./finance.controller');
const { protect } = require('../../middleware/auth.middleware');
const { restrictTo } = require('../../middleware/rbac.middleware');
const { tenantStatusGuard, tenantIsolationGuard } = require('../../middleware/tenant.middleware');

const router = express.Router();

// 1. Status Check
router.get('/status', financeController.getStatus);

// All subsequent routes require authentication and tenant isolation
router.use(protect);
router.use(tenantStatusGuard);
router.use(tenantIsolationGuard);

// 2. Financial Telemetry & Key Ratios (Blueprint Box 15)
router.get('/telemetry', restrictTo('SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT', 'DEVELOPER'), financeController.getFinancialTelemetry);

// 3. Fee Schedules & Institutional Tariffs (Blueprint Box 14)
router.get('/fee-structures', financeController.getFeeStructures);
router.post('/fee-structures', restrictTo('SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT', 'DEVELOPER'), financeController.createFeeStructure);

// 4. Student Invoicing & Accounts Receivable (Blueprint Box 14)
router.get('/invoices', financeController.getInvoices);
router.post('/invoices', restrictTo('SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT', 'DEVELOPER'), financeController.generateInvoice);
router.get('/invoices/:id', financeController.getInvoiceById);

// 5. Payments & Gateway Transactions (Blueprint Box 14 & 15)
router.post('/payments', restrictTo('SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT', 'DEVELOPER'), financeController.recordPayment);
router.get('/payments', financeController.getPayments);

// 6. Operating Expenses
router.get('/expenses', restrictTo('SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT', 'DEVELOPER'), financeController.getExpenses);
router.post('/expenses', restrictTo('SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT', 'DEVELOPER'), financeController.createExpense);

// 7. HR Salary Grading & Loans
router.get('/salary-grades', restrictTo('SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT', 'DEVELOPER'), financeController.getSalaryGrades);
router.post('/salary-grades', restrictTo('SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT', 'DEVELOPER'), financeController.createSalaryGrade);
router.get('/salary-profiles', restrictTo('SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT', 'DEVELOPER'), financeController.getEmployeeSalaryProfiles);
router.get('/loans', financeController.getLoanApplications);
router.post('/loans', financeController.createLoanApplication);

// 8. Class Fee Collection Matrix & Increments (Requirement 8)
router.get('/class-fee-matrix', financeController.getClassFeeMatrix);
router.post('/class-fee-increment', restrictTo('SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT', 'DEVELOPER'), financeController.updateClassFeeIncrement);
router.put('/class-fee-increment', restrictTo('SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT', 'DEVELOPER'), financeController.updateClassFeeIncrement);

module.exports = router;