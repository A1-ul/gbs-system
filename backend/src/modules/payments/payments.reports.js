'use strict';

const prisma = require('../../core/database/prisma.client');
const { TRANSACTION_STATES, PAYMENT_SCOPES } = require('./payments.constants');
const { roundMoney } = require('./payments.utils');
const { ensurePaymentTables } = require('../../core/database/ensurePaymentTables');

async function getFinancialReports(tenantId, query = {}) {
  await ensurePaymentTables();
  const tid = parseInt(tenantId, 10) || 1;
  const period = String(query.period || 'MONTHLY').toUpperCase(); // DAILY, WEEKLY, MONTHLY, TERMLY, ALL

  const now = new Date();
  let startDate = query.startDate ? new Date(query.startDate) : null;
  if (!startDate) {
    if (period === 'DAILY') {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else if (period === 'WEEKLY') {
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (period === 'MONTHLY') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    } else if (period === 'TERMLY') {
      startDate = new Date(now.getTime() - 120 * 24 * 60 * 60 * 1000);
    }
  }
  const endDate = query.endDate ? new Date(query.endDate) : null;

  const [allTx, allInvoices, allReceipts, webhooks] = await Promise.all([
    prisma.paymentTransaction.findMany({ where: { tenantId: tid } }).catch(() => []),
    prisma.studentInvoice.findMany({ where: { tenantId: tid } }).catch(() => []),
    prisma.paymentReceipt.findMany({ where: { tenantId: tid } }).catch(() => []),
    prisma.paymentWebhookEvent.findMany({}).catch(() => [])
  ]);

  const inRange = (dt) => {
    if (!dt) return true;
    const d = new Date(dt);
    if (startDate && d < startDate) return false;
    if (endDate && d > endDate) return false;
    return true;
  };

  const periodTx = allTx.filter((t) => inRange(t.paidAt || t.createdAt));

  const isSuccess = (st) => st === TRANSACTION_STATES.SUCCESSFUL || st === 'SUCCESS';
  const successfulTx = periodTx.filter((t) => isSuccess(t.gatewayStatus));
  const failedTx = periodTx.filter((t) =>
    [TRANSACTION_STATES.FAILED, TRANSACTION_STATES.CANCELLED, TRANSACTION_STATES.EXPIRED].includes(t.gatewayStatus)
  );
  const reversedOrRefundedTx = periodTx.filter((t) =>
    [TRANSACTION_STATES.REVERSED, TRANSACTION_STATES.REFUNDED].includes(t.gatewayStatus)
  );
  const pendingOrReviewTx = periodTx.filter((t) =>
    [
      TRANSACTION_STATES.CREATED,
      TRANSACTION_STATES.PENDING,
      TRANSACTION_STATES.REQUIRES_CUSTOMER_ACTION,
      TRANSACTION_STATES.PROCESSING,
      TRANSACTION_STATES.UNDER_REVIEW
    ].includes(t.gatewayStatus)
  );

  const totalCollected = roundMoney(successfulTx.reduce((sum, t) => sum + Number(t.amountPaid || 0), 0));
  const totalReversedOrRefunded = roundMoney(reversedOrRefundedTx.reduce((sum, t) => sum + Number(t.amountPaid || 0), 0));

  const byGateway = {};
  const byChannel = {};
  for (const t of successfulTx) {
    const gw = t.gateway || 'MANUAL';
    const ch = t.channel || t.paymentMethod || 'OTHER';
    byGateway[gw] = byGateway[gw] || { gateway: gw, count: 0, totalAmount: 0 };
    byGateway[gw].count += 1;
    byGateway[gw].totalAmount = roundMoney(byGateway[gw].totalAmount + Number(t.amountPaid || 0));

    byChannel[ch] = byChannel[ch] || { channel: ch, count: 0, totalAmount: 0 };
    byChannel[ch].count += 1;
    byChannel[ch].totalAmount = roundMoney(byChannel[ch].totalAmount + Number(t.amountPaid || 0));
  }

  // Daily breakdown inside period
  const collectionsByDay = {};
  for (const t of successfulTx) {
    const dayKey = new Date(t.paidAt || t.createdAt).toISOString().slice(0, 10);
    collectionsByDay[dayKey] = collectionsByDay[dayKey] || { date: dayKey, count: 0, amount: 0 };
    collectionsByDay[dayKey].count += 1;
    collectionsByDay[dayKey].amount = roundMoney(collectionsByDay[dayKey].amount + Number(t.amountPaid || 0));
  }

  // Outstanding balances per student
  const studentBalancesMap = {};
  for (const inv of allInvoices) {
    if (inv.status === 'CANCELLED') continue;
    const sid = inv.studentId;
    if (!studentBalancesMap[sid]) {
      studentBalancesMap[sid] = {
        studentId: sid,
        totalBilled: 0,
        totalPaid: 0,
        outstandingBalance: 0,
        openInvoices: 0
      };
    }
    studentBalancesMap[sid].totalBilled = roundMoney(studentBalancesMap[sid].totalBilled + Number(inv.netAmount || 0));
    studentBalancesMap[sid].totalPaid = roundMoney(studentBalancesMap[sid].totalPaid + Number(inv.paidAmount || 0));
    studentBalancesMap[sid].outstandingBalance = roundMoney(
      studentBalancesMap[sid].outstandingBalance + Math.max(0, Number(inv.balanceDue || 0))
    );
    if (Number(inv.balanceDue || 0) > 0) {
      studentBalancesMap[sid].openInvoices += 1;
    }
  }

  // Attach student names where available
  const studentIds = Object.keys(studentBalancesMap).map((id) => parseInt(id, 10)).filter(Boolean);
  const students = studentIds.length
    ? await prisma.user.findMany({ where: { tenantId: tid, id: { in: studentIds } } }).catch(() => [])
    : [];
  const studentMap = new Map(students.map((s) => [s.id, s]));

  const outstandingStudents = Object.values(studentBalancesMap)
    .filter((b) => b.outstandingBalance > 0)
    .map((b) => {
      const st = studentMap.get(b.studentId);
      return {
        ...b,
        studentName: st ? `${st.firstName} ${st.lastName}`.trim() : `Student #${b.studentId}`,
        studentCode: st?.username || `STU-${b.studentId}`,
        email: st?.email || null
      };
    })
    .sort((a, b) => b.outstandingBalance - a.outstandingBalance);

  const totalOutstanding = roundMoney(
    outstandingStudents.reduce((sum, s) => sum + s.outstandingBalance, 0)
  );
  const totalInvoiced = roundMoney(
    Object.values(studentBalancesMap).reduce((sum, s) => sum + s.totalBilled, 0)
  );

  // Gateway reconciliation summary (comparing transactions posted vs receipts & webhooks)
  const unreconciledSuccessCount = successfulTx.filter((t) => !t.accountingPosted).length;

  return {
    tenantId: tid,
    period,
    startDate: startDate ? startDate.toISOString() : null,
    endDate: endDate ? endDate.toISOString() : now.toISOString(),
    summary: {
      totalInvoiced,
      totalCollected,
      netCollectedAfterRefunds: roundMoney(totalCollected - totalReversedOrRefunded),
      totalOutstanding,
      totalReversedOrRefunded,
      successfulCount: successfulTx.length,
      failedCount: failedTx.length,
      reversedOrRefundedCount: reversedOrRefundedTx.length,
      pendingOrReviewCount: pendingOrReviewTx.length,
      receiptsIssuedCount: allReceipts.length,
      unreconciledSuccessCount,
      webhookEventsCount: webhooks.length
    },
    byGateway: Object.values(byGateway),
    byChannel: Object.values(byChannel),
    collectionsTimeline: Object.values(collectionsByDay).sort((a, b) => a.date.localeCompare(b.date)),
    outstandingStudents,
    recentTransactions: [...periodTx]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 50),
    failedTransactions: failedTx.slice(0, 30),
    reversedOrRefundedTransactions: reversedOrRefundedTx.slice(0, 30),
    pendingOrReviewTransactions: pendingOrReviewTx.slice(0, 30),
    subscriptionCollections: periodTx.filter((t) => t.paymentScope === PAYMENT_SCOPES.SUBSCRIPTION)
  };
}

module.exports = {
  getFinancialReports
};
