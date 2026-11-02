'use strict';

const financeService = require('./finance.service');
const logger = require('../../utils/logger') || console;

// 1. Status
const getStatus = async (req, res, next) => {
  try {
    const data = await financeService.getStatus();
    res.status(200).json({
      status: 'success',
      data
    });
  } catch (error) {
    next(error);
  }
};

// 2. Fee Structures
const getFeeStructures = async (req, res, next) => {
  try {
    const tenantId = req.user?.tenantId || req.headers['x-tenant-id'] || 1;
    const feeStructures = await financeService.getFeeStructures(tenantId);
    res.status(200).json({
      status: 'success',
      results: feeStructures.length,
      data: { feeStructures }
    });
  } catch (error) {
    next(error);
  }
};

const createFeeStructure = async (req, res, next) => {
  try {
    const tenantId = req.user?.tenantId || req.headers['x-tenant-id'] || 1;
    const fee = await financeService.createFeeStructure(tenantId, req.body, req.user?.id);
    res.status(201).json({
      status: 'success',
      message: 'Fee structure created successfully.',
      data: { feeStructure: fee }
    });
  } catch (error) {
    next(error);
  }
};

// 3. Invoices
const generateInvoice = async (req, res, next) => {
  try {
    const tenantId = req.user?.tenantId || req.headers['x-tenant-id'] || 1;
    const effAmount = req.body.amount !== undefined ? req.body.amount : req.body.grossAmount;
    const effStudentId = req.body.studentId || 3;
    if (effAmount === undefined) {
      return res.status(400).json({
        status: 'fail',
        message: 'studentId and amount are required to generate an invoice.'
      });
    }
    const payload = { ...req.body, studentId: effStudentId, amount: effAmount };
    const invoice = await financeService.generateInvoice(tenantId, payload, req.user?.id);
    res.status(201).json({
      status: 'success',
      message: 'Student invoice generated successfully.',
      data: { invoice }
    });
  } catch (error) {
    next(error);
  }
};

const getInvoices = async (req, res, next) => {
  try {
    const tenantId = req.user?.tenantId || req.headers['x-tenant-id'] || 1;
    const filters = {
      status: req.query.status,
      studentId: req.query.studentId,
      academicTerm: req.query.academicTerm
    };
    const invoices = await financeService.getInvoices(tenantId, filters);
    res.status(200).json({
      status: 'success',
      results: invoices.length,
      data: { invoices }
    });
  } catch (error) {
    next(error);
  }
};

const getInvoiceById = async (req, res, next) => {
  try {
    const tenantId = req.user?.tenantId || req.headers['x-tenant-id'] || 1;
    const invoice = await financeService.getInvoiceById(tenantId, req.params.id);
    res.status(200).json({
      status: 'success',
      data: { invoice }
    });
  } catch (error) {
    next(error);
  }
};

// 4. Payments
const recordPayment = async (req, res, next) => {
  try {
    const tenantId = req.user?.tenantId || req.headers['x-tenant-id'] || 1;
    const effAmountPaid = req.body.amountPaid !== undefined ? req.body.amountPaid : req.body.amount;
    if (!req.body.invoiceId || effAmountPaid === undefined) {
      return res.status(400).json({
        status: 'fail',
        message: 'invoiceId and amountPaid are required.'
      });
    }
    const paymentResult = await financeService.recordPayment(tenantId, { ...req.body, amountPaid: effAmountPaid }, req.user?.id);
    res.status(201).json({
      status: 'success',
      message: 'Payment recorded and invoice reconciled successfully.',
      data: paymentResult
    });
  } catch (error) {
    next(error);
  }
};

const getPayments = async (req, res, next) => {
  try {
    const tenantId = req.user?.tenantId || req.headers['x-tenant-id'] || 1;
    const filters = {
      gatewayStatus: req.query.gatewayStatus,
      paymentMethod: req.query.paymentMethod
    };
    const payments = await financeService.getPayments(tenantId, filters);
    res.status(200).json({
      status: 'success',
      results: payments.length,
      data: { payments }
    });
  } catch (error) {
    next(error);
  }
};

// 5. Operating Expenses
const createExpense = async (req, res, next) => {
  try {
    const tenantId = req.user?.tenantId || req.headers['x-tenant-id'] || 1;
    const effTitle = req.body.title || req.body.category || req.body.description || 'Operating Expense';
    if (req.body.amount === undefined) {
      return res.status(400).json({
        status: 'fail',
        message: 'title and amount are required to log an operating expense.'
      });
    }
    const expense = await financeService.createExpense(tenantId, { ...req.body, title: effTitle }, req.user?.id);
    res.status(201).json({
      status: 'success',
      message: 'Operating expense logged successfully.',
      data: { expense }
    });
  } catch (error) {
    next(error);
  }
};

const getExpenses = async (req, res, next) => {
  try {
    const tenantId = req.user?.tenantId || req.headers['x-tenant-id'] || 1;
    const filters = {
      category: req.query.category,
      paymentStatus: req.query.paymentStatus
    };
    const expenses = await financeService.getExpenses(tenantId, filters);
    res.status(200).json({
      status: 'success',
      results: expenses.length,
      data: { expenses }
    });
  } catch (error) {
    next(error);
  }
};

// 6. Telemetry
const getFinancialTelemetry = async (req, res, next) => {
  try {
    const tenantId = req.user?.tenantId || req.headers['x-tenant-id'] || 1;
    const telemetry = await financeService.getFinancialTelemetry(tenantId);
    res.status(200).json({
      status: 'success',
      data: telemetry
    });
  } catch (error) {
    next(error);
  }
};

// 7. Preserved HR Salary & Loan Handlers
const getSalaryGrades = async (req, res, next) => {
  try {
    const grades = await financeService.getSalaryGrades();
    res.status(200).json({
      status: 'success',
      results: grades.length,
      data: { grades }
    });
  } catch (error) {
    next(error);
  }
};

const createSalaryGrade = async (req, res, next) => {
  try {
    const grade = await financeService.createSalaryGrade(req.body);
    res.status(201).json({
      status: 'success',
      data: { grade }
    });
  } catch (error) {
    next(error);
  }
};

const getEmployeeSalaryProfiles = async (req, res, next) => {
  try {
    const profiles = await financeService.getEmployeeSalaryProfiles();
    res.status(200).json({
      status: 'success',
      results: profiles.length,
      data: { profiles }
    });
  } catch (error) {
    next(error);
  }
};

const getLoanApplications = async (req, res, next) => {
  try {
    const loans = await financeService.getLoanApplications();
    res.status(200).json({
      status: 'success',
      results: loans.length,
      data: { loans }
    });
  } catch (error) {
    next(error);
  }
};

const createLoanApplication = async (req, res, next) => {
  try {
    const loan = await financeService.createLoanApplication(req.body);
    res.status(201).json({
      status: 'success',
      data: { loan }
    });
  } catch (error) {
    next(error);
  }
};

const getClassFeeMatrix = async (req, res, next) => {
  try {
    const tenantId = req.user?.tenantId || req.headers['x-tenant-id'] || 1;
    const data = await financeService.getClassFeeMatrix(tenantId);
    res.status(200).json({
      status: 'success',
      data
    });
  } catch (error) {
    next(error);
  }
};

const updateClassFeeIncrement = async (req, res, next) => {
  try {
    const tenantId = req.user?.tenantId || req.headers['x-tenant-id'] || 1;
    const data = await financeService.updateClassFeeIncrement(tenantId, req.body);
    res.status(200).json({
      status: 'success',
      message: `Tuition fee for class '${data.className}' updated to ${data.feePerStudent} per student.`,
      data
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getStatus,
  getFeeStructures,
  createFeeStructure,
  generateInvoice,
  getInvoices,
  getInvoiceById,
  recordPayment,
  getPayments,
  createExpense,
  getExpenses,
  getFinancialTelemetry,
  getSalaryGrades,
  createSalaryGrade,
  getEmployeeSalaryProfiles,
  getLoanApplications,
  createLoanApplication,
  getClassFeeMatrix,
  updateClassFeeIncrement
};