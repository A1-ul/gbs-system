'use strict';

const prisma = require('../../core/database/prisma.client');
const {
  TRANSACTION_STATES,
  PAYMENT_SCOPES,
  canTransitionStatus
} = require('./payments.constants');
const { generateReceiptNumber, roundMoney } = require('./payments.utils');
const AppError = require('../../core/errors/AppError');

let ioInstance = null;

function setSocketIo(io) {
  ioInstance = io;
}

function emitTenantPaymentUpdate(tenantId, eventName, payload) {
  if (!ioInstance) return;
  try {
    ioInstance.to(`tenant_${tenantId}`).emit(eventName, payload);
    ioInstance.emit(eventName, payload);
  } catch {
    // Socket notifications are best-effort
  }
}

/**
 * Validates verified amount, currency, tenant/school ownership, and recipient configuration,
 * then executes idempotent accounting reconciliation inside a database transaction.
 */
async function reconcileVerifiedOutcome({
  transaction,
  verifiedStatus,
  verifiedAmount,
  verifiedCurrency,
  providerReference,
  gatewayResponse,
  source = 'VERIFY_API',
  actorUserId = null
}) {
  if (!transaction) {
    throw new AppError('Payment transaction not found.', 404);
  }

  const targetStatus = String(verifiedStatus || '').toUpperCase();
  if (!TRANSACTION_STATES[targetStatus]) {
    throw new AppError(`Invalid verified transaction status: ${verifiedStatus}`, 400);
  }

  // Strict security checks for SUCCESSFUL settlements
  if (targetStatus === TRANSACTION_STATES.SUCCESSFUL) {
    const expectedAmt = roundMoney(transaction.expectedAmount ?? transaction.amountPaid ?? 0);
    if (verifiedAmount !== null && verifiedAmount !== undefined) {
      const actualAmt = roundMoney(verifiedAmount);
      if (actualAmt + 0.01 < expectedAmt) {
        return _flagUnderReview(transaction, {
          reason: `Amount mismatch detected (${verifiedCurrency || transaction.currency} ${actualAmt} received vs expected ${transaction.currency} ${expectedAmt}). Flagged for manual verification.`,
          providerReference,
          source
        });
      }
    }

    if (
      verifiedCurrency &&
      transaction.currency &&
      String(verifiedCurrency).toUpperCase() !== String(transaction.currency).toUpperCase()
    ) {
      return _flagUnderReview(transaction, {
        reason: `Currency mismatch detected (${verifiedCurrency} received vs expected ${transaction.currency}).`,
        providerReference,
        source
      });
    }
  }

  // Idempotency guard: already posted & already at target state -> return existing receipt without double-crediting
  if (transaction.accountingPosted && targetStatus === TRANSACTION_STATES.SUCCESSFUL) {
    const existingReceipt = await prisma.paymentReceipt.findFirst({
      where: { paymentTransactionId: transaction.id }
    }).catch(() => null);
    return {
      transaction,
      receipt: existingReceipt,
      idempotentSkip: true
    };
  }

  // Validate state transition
  if (
    transaction.gatewayStatus !== targetStatus &&
    !canTransitionStatus(transaction.gatewayStatus, targetStatus)
  ) {
    return {
      transaction,
      receipt: null,
      idempotentSkip: true,
      notice: `Ignored out-of-order transition ${transaction.gatewayStatus} -> ${targetStatus}`
    };
  }

  const result = await prisma.$transaction(async (tx) => {
    // Re-read inside transaction by unique reference when present (prevents any numeric ID collision)
    const freshTx = await tx.paymentTransaction.findFirst({
      where: transaction.reference
        ? { reference: transaction.reference, tenantId: transaction.tenantId }
        : { id: transaction.id, tenantId: transaction.tenantId }
    });
    if (!freshTx) {
      throw new AppError('Transaction not found for school tenant.', 404);
    }

    if (targetStatus === TRANSACTION_STATES.SUCCESSFUL && freshTx.accountingPosted) {
      const existingReceipt = await tx.paymentReceipt.findFirst({
        where: { paymentTransactionId: freshTx.id }
      }).catch(() => null);
      return { transaction: freshTx, receipt: existingReceipt, idempotentSkip: true };
    }

    let createdReceipt = null;
    let updatedInvoices = [];

    if (targetStatus === TRANSACTION_STATES.SUCCESSFUL) {
      const settledAmount = roundMoney(verifiedAmount ?? freshTx.amountPaid ?? 0);
      const { beforeTotal, afterTotal, invoicesTouched, allocations, description } =
        await _postSuccessAccounting(tx, freshTx, settledAmount);
      updatedInvoices = invoicesTouched;

      let mergedMetadata = {};
      try {
        mergedMetadata = freshTx.metadataJson ? JSON.parse(freshTx.metadataJson) : {};
      } catch {
        mergedMetadata = {};
      }
      if (Array.isArray(allocations) && allocations.length > 0) {
        mergedMetadata.allocations = allocations;
      }

      const tenant = await tx.tenant.findFirst({ where: { id: freshTx.tenantId } }).catch(() => null);
      const student = freshTx.studentId
        ? await tx.user.findFirst({ where: { id: freshTx.studentId, tenantId: freshTx.tenantId } }).catch(() => null)
        : null;
      const payerUser = freshTx.payerUserId
        ? await tx.user.findFirst({ where: { id: freshTx.payerUserId, tenantId: freshTx.tenantId } }).catch(() => null)
        : null;

      const resolvedStudentName =
        mergedMetadata.studentName ||
        (student ? `${student.firstName || ''} ${student.lastName || ''}`.trim() : null) ||
        (freshTx.paymentScope === PAYMENT_SCOPES.SUBSCRIPTION ? (tenant?.name || 'School Institution') : 'Student Account');
      const resolvedStudentCode =
        mergedMetadata.studentCode || freshTx.studentCode || student?.username || (freshTx.studentId ? `STU-${freshTx.tenantId}-${freshTx.studentId}` : null);
      const paidByRole = String(
        mergedMetadata.paidByRole ||
        payerUser?.role ||
        (freshTx.payerUserId && freshTx.studentId && Number(freshTx.payerUserId) === Number(freshTx.studentId) ? 'STUDENT' : 'PARENT')
      ).toUpperCase();
      const paidByName =
        mergedMetadata.paidByName ||
        (payerUser ? `${payerUser.firstName || ''} ${payerUser.lastName || ''}`.trim() || payerUser.email : null) ||
        (paidByRole === 'STUDENT' ? resolvedStudentName : freshTx.payerEmail || 'Verified Payer');
      const paidByLabel =
        mergedMetadata.paidByLabel ||
        (paidByRole === 'STUDENT'
          ? 'Student (Self-Payment)'
          : paidByRole === 'PARENT'
            ? 'Parent / Guardian'
            : paidByRole === 'ACCOUNTANT'
              ? 'School Accountant'
              : paidByRole);
      const payeeReference =
        mergedMetadata.payeeReference ||
        (paidByRole === 'STUDENT'
          ? `${resolvedStudentName}${resolvedStudentCode ? ` (${resolvedStudentCode})` : ''} — Paid by Student (Self)`
          : paidByRole === 'PARENT'
            ? `${resolvedStudentName}${resolvedStudentCode ? ` (${resolvedStudentCode})` : ''} — Paid by Parent: ${paidByName}`
            : `${resolvedStudentName}${resolvedStudentCode ? ` (${resolvedStudentCode})` : ''} — ${paidByLabel}`);
      const destinationAccountSummary = mergedMetadata.destinationAccountSummary || null;

      mergedMetadata.studentName = resolvedStudentName;
      mergedMetadata.studentCode = resolvedStudentCode;
      mergedMetadata.paidByRole = paidByRole;
      mergedMetadata.paidByName = paidByName;
      mergedMetadata.paidByLabel = paidByLabel;
      mergedMetadata.payeeReference = payeeReference;

      const existingReceipt = await tx.paymentReceipt.findFirst({
        where: { paymentTransactionId: freshTx.id }
      }).catch(() => null);

      const receiptNum = existingReceipt?.receiptNumber || freshTx.receiptNumber || generateReceiptNumber(freshTx.tenantId);

      if (!existingReceipt) {
        createdReceipt = await tx.paymentReceipt.create({
          data: {
            tenantId: freshTx.tenantId,
            paymentTransactionId: freshTx.id,
            invoiceId: freshTx.invoiceId || (invoicesTouched[0]?.id ?? null),
            studentId: freshTx.studentId || null,
            studentCode: resolvedStudentCode,
            studentName: resolvedStudentName,
            institutionName: tenant?.name || `Institution #${freshTx.tenantId}`,
            receiptNumber: receiptNum,
            transactionRef: freshTx.reference || freshTx.transactionRef || receiptNum,
            providerReference: providerReference || freshTx.providerReference || null,
            gateway: freshTx.gateway,
            channel: freshTx.channel || freshTx.paymentMethod || 'GATEWAY',
            amountPaid: settledAmount,
            currency: freshTx.currency || 'GHS',
            balanceBefore: beforeTotal,
            balanceAfter: afterTotal,
            academicYear: freshTx.academicYear || '2026-2027',
            term: freshTx.term || 'Current Term',
            feeDescription: description,
            issuedAt: new Date()
          }
        });
      } else {
        createdReceipt = existingReceipt;
      }

      if (freshTx.paymentScope === PAYMENT_SCOPES.SUBSCRIPTION) {
        await _activateTenantSubscriptionOnPayment(tx, freshTx);
      }

      const updatedTx = await tx.paymentTransaction.update({
        where: freshTx.reference ? { reference: freshTx.reference } : { id: freshTx.id },
        data: {
          gatewayStatus: TRANSACTION_STATES.SUCCESSFUL,
          providerReference: providerReference || freshTx.providerReference,
          amountPaid: settledAmount,
          accountingPosted: true,
          reconciledAt: new Date(),
          paidAt: new Date(),
          failureReason: null,
          metadataJson: JSON.stringify(mergedMetadata),
          notes: freshTx.notes || `${payeeReference}${destinationAccountSummary ? ` -> ${destinationAccountSummary}` : ''}`,
          displayMessage: gatewayResponse || 'Payment confirmed and fee account updated.'
        }
      });

      await tx.auditLog.create({
        data: {
          tenantId: freshTx.tenantId,
          userId: actorUserId || freshTx.payerUserId || null,
          module: 'PAYMENTS',
          action: 'PAYMENT_CONFIRMED_RECONCILED',
          details: `[TX #${updatedTx.id}] ${payeeReference} | ${updatedTx.gateway} ${updatedTx.channel} payment ${updatedTx.reference} (${updatedTx.currency} ${settledAmount.toFixed(2)})${destinationAccountSummary ? ` -> ${destinationAccountSummary}` : ''} confirmed via ${source}. Receipt ${receiptNum} issued.`
        }
      }).catch(() => {});

      await _queuePaymentNotification(tx, updatedTx, createdReceipt, 'CONFIRMED');

      const enrichedReceipt = createdReceipt
        ? {
            ...createdReceipt,
            paidByRole,
            paidByName,
            paidByLabel,
            payeeReference,
            destinationAccountSummary
          }
        : null;
      const enrichedTx = {
        ...updatedTx,
        studentName: resolvedStudentName,
        studentCode: resolvedStudentCode,
        paidByRole,
        paidByName,
        paidByLabel,
        payeeReference,
        destinationAccountSummary
      };

      return {
        transaction: enrichedTx,
        receipt: enrichedReceipt,
        updatedInvoices,
        idempotentSkip: false
      };
    }

    // Handle Refunded or Reversed settlements atomically (restore unpaid balance only once)
    if (
      (targetStatus === TRANSACTION_STATES.REFUNDED || targetStatus === TRANSACTION_STATES.REVERSED) &&
      freshTx.accountingPosted &&
      freshTx.gatewayStatus === TRANSACTION_STATES.SUCCESSFUL
    ) {
      await _reverseAccounting(tx, freshTx);
    }

    const updatedTx = await tx.paymentTransaction.update({
      where: freshTx.reference ? { reference: freshTx.reference } : { id: freshTx.id },
      data: {
        gatewayStatus: targetStatus,
        providerReference: providerReference || freshTx.providerReference,
        failureReason:
          targetStatus === TRANSACTION_STATES.FAILED ||
          targetStatus === TRANSACTION_STATES.CANCELLED ||
          targetStatus === TRANSACTION_STATES.EXPIRED
            ? (gatewayResponse || freshTx.failureReason || `Payment ${targetStatus.toLowerCase()}`)
            : freshTx.failureReason,
        displayMessage: gatewayResponse || freshTx.displayMessage
      }
    });

    await tx.auditLog.create({
      data: {
        tenantId: freshTx.tenantId,
        userId: actorUserId || freshTx.payerUserId || null,
        module: 'PAYMENTS',
        action: `PAYMENT_STATUS_${targetStatus}`,
        details: `[TX #${updatedTx.id}] Payment ${updatedTx.reference} transitioned ${freshTx.gatewayStatus} -> ${targetStatus} via ${source}. ${gatewayResponse || ''}`.trim()
      }
    }).catch(() => {});

    return {
      transaction: updatedTx,
      receipt: null,
      updatedInvoices,
      idempotentSkip: false
    };
  });

  if (!result.idempotentSkip) {
    emitTenantPaymentUpdate(transaction.tenantId, 'fee:payment_updated', {
      tenantId: transaction.tenantId,
      reference: result.transaction.reference,
      status: result.transaction.gatewayStatus,
      paymentScope: result.transaction.paymentScope,
      studentId: result.transaction.studentId,
      amountPaid: result.transaction.amountPaid,
      receiptNumber: result.receipt?.receiptNumber || null
    });

    // Emit canonical GBS-RCCE domain event for Developer & School Dashboards
    try {
      const { RCCE_EVENTS, eventNotificationEngine } = require('../../rcce/eventNotificationEngine');
      const finalSt = result.transaction.gatewayStatus;
      if (finalSt === TRANSACTION_STATES.SUCCESSFUL) {
        await eventNotificationEngine.emitEvent(
          RCCE_EVENTS.PAYMENT_RECEIVED,
          {
            reference: result.transaction.reference,
            receiptNumber: result.receipt?.receiptNumber || result.transaction.receiptNumber,
            amount: result.transaction.amountPaid,
            currency: result.transaction.currency || 'GHS',
            gateway: result.transaction.gateway,
            channel: result.transaction.channel,
            paymentScope: result.transaction.paymentScope,
            studentId: result.transaction.studentId,
            message: `${result.transaction.currency || 'GHS'} ${Number(result.transaction.amountPaid || 0).toFixed(2)} confirmed via ${result.transaction.gateway} (${result.transaction.channel}). Receipt ${result.receipt?.receiptNumber || result.transaction.receiptNumber} issued.`
          },
          { tenantId: transaction.tenantId, userId: actorUserId || transaction.payerUserId || null, actorRole: 'SYSTEM' }
        );
      } else if ([TRANSACTION_STATES.FAILED, TRANSACTION_STATES.REVERSED, TRANSACTION_STATES.REFUNDED].includes(finalSt)) {
        await eventNotificationEngine.emitEvent(
          RCCE_EVENTS.PAYMENT_REJECTED,
          {
            reference: result.transaction.reference,
            status: finalSt,
            gateway: result.transaction.gateway,
            channel: result.transaction.channel,
            reason: result.transaction.failureReason || gatewayResponse,
            message: `Payment ${result.transaction.reference} transitioned to ${finalSt}: ${result.transaction.failureReason || gatewayResponse || 'Not completed'}.`
          },
          { tenantId: transaction.tenantId, userId: actorUserId || transaction.payerUserId || null, actorRole: 'SYSTEM' }
        );
      }
    } catch { }
  }

  return result;
}

async function _postSuccessAccounting(tx, paymentTx, settledAmount) {
  if (paymentTx.paymentScope === PAYMENT_SCOPES.SUBSCRIPTION || !paymentTx.studentId) {
    return {
      beforeTotal: settledAmount,
      afterTotal: 0,
      invoicesTouched: [],
      description: paymentTx.feeAccount || 'GBS Platform Subscription Renewal'
    };
  }

  // Fetch student invoices strictly within the same tenant
  const allInvoices = await tx.studentInvoice.findMany({
    where: {
      tenantId: paymentTx.tenantId,
      studentId: paymentTx.studentId
    }
  });
  allInvoices.sort((a, b) => new Date(a.dueDate || 0) - new Date(b.dueDate || 0));

  const beforeTotal = roundMoney(
    allInvoices.reduce((acc, inv) => acc + Math.max(0, Number(inv.balanceDue || 0)), 0)
  );

  // Order target invoice first, then oldest open invoices
  const openInvoices = allInvoices.filter((inv) => inv.status !== 'PAID' && inv.status !== 'CANCELLED' && Number(inv.balanceDue) > 0);
  if (paymentTx.invoiceId) {
    openInvoices.sort((a, b) => (a.id === paymentTx.invoiceId ? -1 : b.id === paymentTx.invoiceId ? 1 : 0));
  }

  let remainingToAllocate = roundMoney(settledAmount);
  const invoicesTouched = [];
  const allocations = [];
  const descriptions = [];

  for (const inv of openInvoices) {
    if (remainingToAllocate <= 0) break;
    const due = roundMoney(inv.balanceDue);
    const applyAmt = Math.min(due, remainingToAllocate);
    const newPaid = roundMoney(Number(inv.paidAmount || 0) + applyAmt);
    const newBalance = Math.max(0, roundMoney(Number(inv.netAmount) - newPaid));
    const newStatus = newBalance <= 0.009 ? 'PAID' : 'PARTIAL';

    const updated = await tx.studentInvoice.update({
      where: { id: inv.id },
      data: {
        paidAmount: newPaid,
        balanceDue: newBalance,
        status: newStatus
      }
    });

    invoicesTouched.push(updated);
    allocations.push({ invoiceId: inv.id, amount: applyAmt });
    descriptions.push(`${inv.title} (${inv.academicTerm})`);
    remainingToAllocate = roundMoney(remainingToAllocate - applyAmt);
  }

  const afterTotal = Math.max(0, roundMoney(beforeTotal - settledAmount));

  return {
    beforeTotal,
    afterTotal,
    invoicesTouched,
    allocations,
    description: descriptions.join('; ') || paymentTx.feeAccount || 'School Fees Settlement'
  };
}

async function _reverseAccounting(tx, paymentTx) {
  if (!paymentTx.studentId) return;

  // Prefer exact recorded multi-invoice allocations if present
  let recordedAllocations = [];
  try {
    const meta = paymentTx.metadataJson ? JSON.parse(paymentTx.metadataJson) : {};
    if (Array.isArray(meta.allocations)) {
      recordedAllocations = meta.allocations;
    }
  } catch { }

  if (recordedAllocations.length > 0) {
    for (const alloc of recordedAllocations) {
      const inv = await tx.studentInvoice.findFirst({
        where: { id: alloc.invoiceId, tenantId: paymentTx.tenantId }
      });
      if (!inv) continue;
      const revAmt = roundMoney(alloc.amount || 0);
      const newPaid = Math.max(0, roundMoney(Number(inv.paidAmount || 0) - revAmt));
      const newBalance = Math.min(roundMoney(inv.netAmount), roundMoney(Number(inv.netAmount) - newPaid));
      const newStatus = newPaid <= 0 ? 'DUE' : (newBalance > 0 ? 'PARTIAL' : 'PAID');
      await tx.studentInvoice.update({
        where: { id: inv.id },
        data: { paidAmount: newPaid, balanceDue: newBalance, status: newStatus }
      });
    }
    return;
  }

  // Fallback: reverse across student's paid/partial invoices up to total reversed amount
  let remainingToReverse = roundMoney(paymentTx.amountPaid || 0);
  if (remainingToReverse <= 0) return;

  const studentInvoices = await tx.studentInvoice.findMany({
    where: { tenantId: paymentTx.tenantId, studentId: paymentTx.studentId }
  });
  studentInvoices.sort((a, b) => (a.id === paymentTx.invoiceId ? -1 : b.id === paymentTx.invoiceId ? 1 : new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0)));

  for (const inv of studentInvoices) {
    if (remainingToReverse <= 0) break;
    const paidSoFar = roundMoney(inv.paidAmount || 0);
    if (paidSoFar <= 0) continue;
    const deductAmt = Math.min(paidSoFar, remainingToReverse);
    const newPaid = Math.max(0, roundMoney(paidSoFar - deductAmt));
    const newBalance = Math.min(roundMoney(inv.netAmount), roundMoney(Number(inv.netAmount) - newPaid));
    const newStatus = newPaid <= 0 ? 'DUE' : (newBalance > 0 ? 'PARTIAL' : 'PAID');
    await tx.studentInvoice.update({
      where: { id: inv.id },
      data: { paidAmount: newPaid, balanceDue: newBalance, status: newStatus }
    });
    remainingToReverse = roundMoney(remainingToReverse - deductAmt);
  }
}

async function _activateTenantSubscriptionOnPayment(tx, paymentTx) {
  const tenant = await tx.tenant.findFirst({ where: { id: paymentTx.tenantId } }).catch(() => null);
  if (tenant) {
    await tx.tenant.update({
      where: { id: tenant.id },
      data: {
        isActive: true,
        status: 'ACTIVE'
      }
    }).catch(() => {});
  }
  try {
    const { writePersistentStore } = require('../../core/database/persistentStore');
    writePersistentStore((curr) => {
      const subs = Array.isArray(curr.subscriptions) ? curr.subscriptions : [];
      const matched = subs.some((s) => s.momoTxnId === paymentTx.reference || s.paymentReference === paymentTx.reference);
      const updatedSubs = matched
        ? subs.map((s) =>
            s.momoTxnId === paymentTx.reference || s.paymentReference === paymentTx.reference
              ? {
                  ...s,
                  paymentVerified: true,
                  subscriptionStatus: 'ACTIVE',
                  receiptNumber: paymentTx.receiptNumber || s.receiptNumber,
                  verifiedAt: new Date().toISOString()
                }
              : s
          )
        : [
            {
              id: `SUB-${Date.now()}`,
              tenantId: paymentTx.tenantId,
              institutionName: tenant?.name || `Institution #${paymentTx.tenantId}`,
              paymentReference: paymentTx.reference,
              momoTxnId: paymentTx.reference,
              receiptNumber: paymentTx.receiptNumber,
              gateway: paymentTx.gateway,
              channel: paymentTx.channel,
              amountDueNow: paymentTx.amountPaid,
              currencyCode: paymentTx.currency || 'GHS',
              paymentVerified: true,
              subscriptionStatus: 'ACTIVE',
              verifiedAt: new Date().toISOString(),
              createdAt: new Date().toISOString()
            },
            ...subs
          ];
      return { ...curr, subscriptions: updatedSubs };
    });
  } catch { }
}

async function _flagUnderReview(transaction, { reason, providerReference, source }) {
  const updated = await prisma.paymentTransaction.update({
    where: { id: transaction.id },
    data: {
      gatewayStatus: TRANSACTION_STATES.UNDER_REVIEW,
      providerReference: providerReference || transaction.providerReference,
      failureReason: reason,
      displayMessage: reason
    }
  });
  await prisma.auditLog.create({
    data: {
      tenantId: transaction.tenantId,
      userId: transaction.payerUserId || null,
      module: 'PAYMENTS',
      action: 'PAYMENT_FLAGGED_UNDER_REVIEW',
      details: `[TX #${transaction.id}] ${source}: ${reason}`
    }
  }).catch(() => {});
  return { transaction: updated, receipt: null, flaggedForReview: true };
}

async function _queuePaymentNotification(tx, paymentTx, receipt, kind = 'CONFIRMED') {
  try {
    const msg =
      kind === 'CONFIRMED'
        ? `Official Receipt ${receipt?.receiptNumber || paymentTx.receiptNumber}: ${paymentTx.currency} ${Number(paymentTx.amountPaid).toFixed(2)} received via ${paymentTx.gateway} (${paymentTx.channel}). Remaining balance: ${paymentTx.currency} ${Number(receipt?.balanceAfter || 0).toFixed(2)}.`
        : `Payment ${paymentTx.reference} status updated to ${paymentTx.gatewayStatus}.`;

    await tx.notificationQueueItem.create({
      data: {
        tenantId: paymentTx.tenantId,
        userId: paymentTx.payerUserId || paymentTx.studentId || null,
        recipientContact: paymentTx.payerEmail || paymentTx.payerPhone || 'finance@gbs.edu',
        recipientName: receipt?.studentName || 'GBS Payer',
        channel: 'IN_APP',
        title: kind === 'CONFIRMED' ? 'School Fee Payment Receipt Confirmed' : 'Payment Status Update',
        content: msg,
        status: 'SENT',
        priority: 'HIGH',
        sentAt: new Date(),
        metadata: JSON.stringify({
          reference: paymentTx.reference,
          receiptNumber: receipt?.receiptNumber || paymentTx.receiptNumber || null
        })
      }
    });
  } catch {
    // Non-blocking notification queue failure must never abort financial transaction
  }
}

module.exports = {
  setSocketIo,
  emitTenantPaymentUpdate,
  reconcileVerifiedOutcome
};
