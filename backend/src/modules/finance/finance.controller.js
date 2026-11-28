'use strict';

const financeService = require('./finance.service');
const prisma = require('../../core/database/prisma.client');
const logger = require('../../utils/logger') || console;

const resolveParentLinkedStudentIds = async (tenantId, user) => {
  const tid = parseInt(tenantId, 10) || 1;
  const pid = parseInt(user?.id, 10);
  if (!Number.isInteger(pid) || pid <= 0) return [];
  try {
    const links = await prisma.parentStudentLink.findMany({
      where: { tenantId: tid, parentId: pid },
      select: { studentId: true }
    });
    return links.map((l) => Number(l.studentId)).filter((n) => Number.isInteger(n) && n > 0);
  } catch {
    return [];
  }
};

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
    const tenantId = req.tenantId || req.user?.tenantId || req.headers['x-tenant-id'] || 1;
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
    const tenantId = req.tenantId || req.user?.tenantId || req.headers['x-tenant-id'] || 1;
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
    const tenantId = req.tenantId || req.user?.tenantId || req.headers['x-tenant-id'] || 1;
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
    const tenantId = req.tenantId || req.user?.tenantId || req.headers['x-tenant-id'] || 1;
    const role = String(req.user?.role || '').trim().toUpperCase();
    const filters = {
      status: req.query.status,
      studentId: req.query.studentId,
      academicTerm: req.query.academicTerm
    };

    if (role === 'STUDENT') {
      const ownId = parseInt(req.user?.id, 10);
      if (filters.studentId && Number.isInteger(ownId) && String(filters.studentId) !== String(ownId)) {
        return res.status(403).json({
          status: 'fail',
          message: 'Access denied: Students can only view their own fee invoices.'
        });
      }
      if (Number.isInteger(ownId) && ownId > 0) {
        filters.studentId = ownId;
      }
    } else if (role === 'PARENT') {
      const linkedIds = await resolveParentLinkedStudentIds(tenantId, req.user);
      if (filters.studentId && linkedIds.length > 0 && !linkedIds.includes(parseInt(filters.studentId, 10))) {
        return res.status(403).json({
          status: 'fail',
          message: 'Access denied: Parents can only view fee invoices for their own linked children.'
        });
      }
      let allInvoices = await financeService.getInvoices(tenantId, filters);
      allInvoices = allInvoices.filter((inv) => linkedIds.includes(Number(inv.studentId)));
      return res.status(200).json({
        status: 'success',
        results: allInvoices.length,
        data: { invoices: allInvoices }
      });
    }

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
    const tenantId = req.tenantId || req.user?.tenantId || req.headers['x-tenant-id'] || 1;
    const role = String(req.user?.role || '').trim().toUpperCase();
    const invoice = await financeService.getInvoiceById(tenantId, req.params.id);

    if (invoice && role === 'STUDENT') {
      const ownId = parseInt(req.user?.id, 10);
      if (Number.isInteger(ownId) && Number(invoice.studentId) !== ownId) {
        return res.status(403).json({
          status: 'fail',
          message: 'Access denied: You can only view your own fee invoice.'
        });
      }
    } else if (invoice && role === 'PARENT') {
      const linkedIds = await resolveParentLinkedStudentIds(tenantId, req.user);
      if (!linkedIds.includes(Number(invoice.studentId))) {
        return res.status(403).json({
          status: 'fail',
          message: 'Access denied: You can only view fee invoices for your own linked children.'
        });
      }
    }

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
    const tenantId = req.tenantId || req.user?.tenantId || req.headers['x-tenant-id'] || 1;
    const effAmountPaid = req.body.amountPaid !== undefined ? req.body.amountPaid : req.body.amount;
    const numericAmt = parseFloat(effAmountPaid);
    const hasInvoiceRef = req.body.invoiceId !== undefined && req.body.invoiceId !== null && String(req.body.invoiceId).trim() !== '';
    const hasStudentRef = Boolean((req.body.studentName && String(req.body.studentName).trim()) || (req.body.indexNumber && String(req.body.indexNumber).trim()));

    if (effAmountPaid === undefined || Number.isNaN(numericAmt) || numericAmt <= 0) {
      return res.status(400).json({
        status: 'fail',
        code: 'VALIDATION_INVALID_AMOUNT',
        message: 'A positive amountPaid is required to record a payment.'
      });
    }
    if (!hasInvoiceRef && !hasStudentRef) {
      return res.status(400).json({
        status: 'fail',
        code: 'VALIDATION_MISSING_REQUIRED',
        message: 'invoiceId or studentName is required to record a payment.'
      });
    }

    const paymentResult = await financeService.recordPayment(
      tenantId,
      { ...req.body, amountPaid: numericAmt },
      req.user?.id,
      req.user || null
    );
    res.status(201).json({
      status: 'success',
      message: 'Payment recorded and reconciled successfully.',
      data: paymentResult
    });
  } catch (error) {
    next(error);
  }
};

const getPayments = async (req, res, next) => {
  try {
    const tenantId = req.tenantId || req.user?.tenantId || req.headers['x-tenant-id'] || 1;
    const role = String(req.user?.role || '').trim().toUpperCase();
    const filters = {
      gatewayStatus: req.query.gatewayStatus,
      paymentMethod: req.query.paymentMethod
    };
    let payments = await financeService.getPayments(tenantId, filters);

    if (role === 'STUDENT') {
      const ownId = Number(req.user?.id);
      const ownEmail = String(req.user?.email || '').trim().toLowerCase();
      payments = payments.filter((p) => {
        const invSid = Number(p.invoice?.studentId || p.studentId);
        const payerId = Number(p.paidByUserId || p.receivedById);
        const studentEmail = String(p.invoice?.student?.email || p.studentEmail || '').trim().toLowerCase();
        return (Number.isInteger(ownId) && (invSid === ownId || payerId === ownId)) || (ownEmail && studentEmail === ownEmail);
      });
    } else if (role === 'PARENT') {
      const ownId = Number(req.user?.id);
      const linkedIds = await resolveParentLinkedStudentIds(tenantId, req.user);
      payments = payments.filter((p) => {
        const invSid = Number(p.invoice?.studentId || p.studentId);
        const payerId = Number(p.paidByUserId || p.receivedById);
        return linkedIds.includes(invSid) || (Number.isInteger(ownId) && payerId === ownId);
      });
    }

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
    const tenantId = req.tenantId || req.user?.tenantId || req.headers['x-tenant-id'] || 1;
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
    const tenantId = req.tenantId || req.user?.tenantId || req.headers['x-tenant-id'] || 1;
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
    const tenantId = req.tenantId || req.user?.tenantId || req.headers['x-tenant-id'] || 1;
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
    const tenantId = req.tenantId || req.user?.tenantId || req.headers['x-tenant-id'] || 1;
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
    const tenantId = req.tenantId || req.user?.tenantId || req.headers['x-tenant-id'] || 1;
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

// 9. Cross-Dashboard Alumni Endowment Gifts & Pledges (Alumni <-> Accountant Live Sync)
const { readPersistentStore, writePersistentStore } = require('../../core/database/persistentStore');
const socketServer = require('../../core/socket/socketServer');

const getAlumniGifts = async (req, res, next) => {
  try {
    const tid = String(parseInt(req.tenantId || req.user?.tenantId || 1, 10) || 1);
    const role = String(req.user?.role || '').trim().toUpperCase();
    const store = readPersistentStore();
    let list = Array.isArray(store.alumniEndowmentGifts?.[tid]) ? store.alumniEndowmentGifts[tid] : [];

    if (role === 'ALUMNI') {
      const ownId = String(req.user?.id || '');
      const ownEmail = String(req.user?.email || '').trim().toLowerCase();
      list = list.filter((g) => {
        const gUserId = String(g.donorUserId || '');
        const gEmail = String(g.email || '').trim().toLowerCase();
        return (ownId && gUserId === ownId) || (ownEmail && gEmail === ownEmail);
      });
    }

    res.status(200).json({
      status: 'success',
      results: list.length,
      data: { gifts: list }
    });
  } catch (error) {
    next(error);
  }
};

const createAlumniGift = async (req, res, next) => {
  try {
    const tidNum = parseInt(req.tenantId || req.user?.tenantId || 1, 10) || 1;
    const tid = String(tidNum);
    const body = req.body || {};
    const pledgedAmount = Number(body.pledgedAmount ?? body.amount);
    if (!Number.isFinite(pledgedAmount) || pledgedAmount <= 0) {
      return res.status(400).json({
        status: 'fail',
        message: 'Please enter a valid gift or pledge amount greater than zero.'
      });
    }
    const redeemedAmount = Math.max(0, Number(body.redeemedAmount || 0) || 0);
    const donorName = String(
      body.donorName || `${req.user?.firstName || ''} ${req.user?.lastName || ''}`.trim() || 'Alumni Contributor'
    ).trim();
    const fulfillmentStatus =
      body.fulfillmentStatus ||
      (redeemedAmount >= pledgedAmount ? 'FULFILLED' : redeemedAmount > 0 ? 'PARTIALLY_FULFILLED' : 'PLEDGED');

    const record = {
      id: body.id || `ALM-PLG-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
      tenantId: tidNum,
      donorUserId: req.user?.id || null,
      donorName,
      gradClass: String(body.gradClass || 'Alumni Cohort').trim(),
      contact: String(body.contact || '').trim(),
      email: String(body.email || req.user?.email || '').trim().toLowerCase(),
      campaign: String(body.campaign || 'General Campus Endowment').trim(),
      pledgedAmount: Math.round(pledgedAmount * 100) / 100,
      redeemedAmount: Math.round(redeemedAmount * 100) / 100,
      fulfillmentStatus,
      paymentMethod: String(body.paymentMethod || 'Mobile Money / Bank Transfer').trim(),
      notes: String(body.notes || '').trim(),
      date: body.date || new Date().toISOString().split('T')[0],
      receiptRef: body.receiptRef || `GBS-ALM-REC-${Date.now().toString().slice(-6)}`,
      recordedByRole: String(req.user?.role || 'ALUMNI').toUpperCase(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    writePersistentStore((curr) => ({
      ...curr,
      alumniEndowmentGifts: {
        ...(curr.alumniEndowmentGifts || {}),
        [tid]: [record, ...((curr.alumniEndowmentGifts || {})[tid] || [])].slice(0, 1000)
      }
    }));

    try {
      await prisma.auditLog.create({
        data: {
          tenantId: tidNum,
          userId: Number.isInteger(Number(req.user?.id)) ? Number(req.user.id) : null,
          module: 'FINANCE',
          action: 'ALUMNI_ENDOWMENT_GIFT_RECORDED',
          details: `Alumni gift ${record.receiptRef} from ${record.donorName} (${record.campaign}): pledged ${record.pledgedAmount}, redeemed ${record.redeemedAmount} (${record.fulfillmentStatus}).`
        }
      });
    } catch (_) { }

    try {
      if (socketServer && typeof socketServer.emitToTenant === 'function') {
        socketServer.emitToTenant(tidNum, 'finance:alumni_gift_recorded', { tenantId: tidNum, gift: record });
      }
    } catch (_) { }

    res.status(201).json({
      status: 'success',
      message: `Alumni gift from ${record.donorName} saved and synced to the Accountant ledger.`,
      data: { gift: record }
    });
  } catch (error) {
    next(error);
  }
};

const updateAlumniGift = async (req, res, next) => {
  try {
    const tidNum = parseInt(req.tenantId || req.user?.tenantId || 1, 10) || 1;
    const tid = String(tidNum);
    const targetId = String(req.params.id || '').trim();
    const body = req.body || {};
    let updatedGift = null;

    writePersistentStore((curr) => {
      const list = Array.isArray(curr.alumniEndowmentGifts?.[tid]) ? curr.alumniEndowmentGifts[tid] : [];
      const nextList = list.map((g) => {
        if (String(g.id) !== targetId) return g;
        const nextRedeemed = body.redeemedAmount !== undefined ? Math.max(0, Number(body.redeemedAmount) || 0) : g.redeemedAmount;
        const nextStatus =
          body.fulfillmentStatus ||
          (nextRedeemed >= g.pledgedAmount ? 'FULFILLED' : nextRedeemed > 0 ? 'PARTIALLY_FULFILLED' : 'PLEDGED');
        updatedGift = {
          ...g,
          redeemedAmount: Math.round(nextRedeemed * 100) / 100,
          fulfillmentStatus: String(nextStatus).toUpperCase(),
          verifiedBy: `${req.user?.firstName || ''} ${req.user?.lastName || ''}`.trim() || req.user?.role || 'Accountant',
          updatedAt: new Date().toISOString()
        };
        return updatedGift;
      });
      return {
        ...curr,
        alumniEndowmentGifts: {
          ...(curr.alumniEndowmentGifts || {}),
          [tid]: nextList
        }
      };
    });

    if (!updatedGift) {
      return res.status(404).json({ status: 'fail', message: 'Alumni gift record was not found.' });
    }

    res.status(200).json({
      status: 'success',
      message: `Alumni gift ${updatedGift.receiptRef} updated to ${updatedGift.fulfillmentStatus}.`,
      data: { gift: updatedGift }
    });
  } catch (error) {
    next(error);
  }
};

const deleteAlumniGift = async (req, res, next) => {
  try {
    const tid = String(parseInt(req.tenantId || req.user?.tenantId || 1, 10) || 1);
    const targetId = String(req.params.id || '').trim();
    let removed = false;

    writePersistentStore((curr) => {
      const list = Array.isArray(curr.alumniEndowmentGifts?.[tid]) ? curr.alumniEndowmentGifts[tid] : [];
      const nextList = list.filter((g) => {
        if (String(g.id) === targetId) {
          removed = true;
          return false;
        }
        return true;
      });
      return {
        ...curr,
        alumniEndowmentGifts: {
          ...(curr.alumniEndowmentGifts || {}),
          [tid]: nextList
        }
      };
    });

    if (!removed) {
      return res.status(404).json({ status: 'fail', message: 'Alumni gift record was not found.' });
    }

    res.status(200).json({
      status: 'success',
      message: 'Alumni gift record removed.',
      data: { deletedId: targetId }
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
  updateClassFeeIncrement,
  getAlumniGifts,
  createAlumniGift,
  updateAlumniGift,
  deleteAlumniGift
};