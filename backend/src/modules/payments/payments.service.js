'use strict';

const prisma = require('../../core/database/prisma.client');
const { ensurePaymentTables } = require('../../core/database/ensurePaymentTables');
const AppError = require('../../core/errors/AppError');
const {
  TRANSACTION_STATES,
  STATE_CUSTOMER_MESSAGES,
  TERMINAL_STATES,
  GATEWAYS,
  CHANNELS,
  CHANNEL_LABELS,
  PAYMENT_SCOPES
} = require('./payments.constants');
const {
  generateTransactionReference,
  generateReceiptNumber,
  roundMoney,
  sha256Hex
} = require('./payments.utils');
const { validateInitiatePayload, normalizeGhanaPhone } = (() => {
  const v = require('./payments.validator');
  const u = require('./payments.utils');
  return { ...v, ...u };
})();
const {
  getAdapter,
  getTenantGatewayConfigs,
  upsertTenantGatewayConfig,
  resolveGatewayAndChannels,
  testGatewayConnectivity
} = require('./payments.registry');
const { reconcileVerifiedOutcome } = require('./payments.reconciler');
const { getFinancialReports } = require('./payments.reports');

const DEFAULT_FEE_EXPIRY_MINUTES = 15;

/**
 * Ensures built-in Demo Institution (Tenant 1) has real initial DB invoices
 * when zero invoices exist so Demo Sandbox uses the exact same DB workflow as Live Production.
 */
async function ensureDemoTenantBaselineInvoices(tenantId, studentId) {
  if (Number(tenantId) !== 1) return;
  try {
    const existingCount = await prisma.studentInvoice.count({ where: { tenantId: 1 } });
    if (existingCount > 0) return;

    const targetStudentId = Number(studentId) || 3;
    const dueNextMonth = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await prisma.studentInvoice.create({
      data: {
        tenantId: 1,
        invoiceNumber: 'INV-2026-DEMO01',
        studentId: targetStudentId,
        title: 'Term 1 Tuition & Instructional Levy (Cleared)',
        academicTerm: '2026-2027 Term 1',
        amount: 2500,
        discountAmount: 0,
        netAmount: 2500,
        paidAmount: 2500,
        balanceDue: 0,
        dueDate: new Date('2026-01-15T00:00:00.000Z'),
        status: 'PAID',
        notes: 'Initial Demo Term 1 settled invoice'
      }
    });
    await prisma.studentInvoice.create({
      data: {
        tenantId: 1,
        invoiceNumber: 'INV-2026-DEMO02',
        studentId: targetStudentId,
        title: 'Term 2 Tuition, Hostel & Lab Balance',
        academicTerm: '2026-2027 Term 2',
        amount: 1200,
        discountAmount: 0,
        netAmount: 1200,
        paidAmount: 600,
        balanceDue: 600,
        dueDate: dueNextMonth,
        status: 'PARTIAL',
        notes: 'Tuition GHS 600 paid; Hostel & Lab balance GHS 600 due.'
      }
    });
  } catch {
    // Non-fatal if DB unavailable during concurrent initialization
  }
}

async function resolveTenantRecord(tenantIdOrCode) {
  await ensurePaymentTables();
  const raw = String(tenantIdOrCode || '1').trim();
  const numericId = parseInt(raw, 10);

  let tenant = null;
  if (Number.isFinite(numericId) && String(numericId) === raw) {
    tenant = await prisma.tenant.findFirst({ where: { id: numericId } }).catch(() => null);
  }
  if (!tenant) {
    tenant = await prisma.tenant.findFirst({
      where: {
        OR: [{ code: raw }, { name: raw }]
      }
    }).catch(() => null);
  }
  if (!tenant) {
    // Also inspect onboarding registration records in case school is in pending onboarding
    const reg = await prisma.institutionRegistration.findFirst({
      where: {
        OR: [{ tenantCode: raw }, { tenantUid: raw }, { institutionName: raw }]
      }
    }).catch(() => null);
    if (reg) {
      return {
        id: Number(reg.id) || 1,
        name: reg.institutionName,
        code: reg.tenantCode,
        isRegistrationPending: !reg.isApproved,
        registration: reg
      };
    }
  }

  return tenant || { id: numericId || 1, name: `GBS Institution #${numericId || 1}`, code: `GBS-${numericId || 1}` };
}

/**
 * Resolves a student strictly inside `tenantId` using numeric ID, username, email,
 * or student code (`STU-...`). Never crosses institution boundaries.
 */
async function resolveStudentInTenant(tenantId, studentIdentifier, requestingUser = null) {
  const tid = parseInt(tenantId, 10) || 1;
  const rawId = studentIdentifier !== undefined && studentIdentifier !== null ? String(studentIdentifier).trim() : '';

  let student = null;
  let resolvedViaTenant1DemoAlias = false;
  if (rawId) {
    const numId = parseInt(rawId, 10);
    if (Number.isFinite(numId) && String(numId) === rawId) {
      student = await prisma.user.findFirst({
        where: { id: numId, tenantId: tid, isDeleted: false }
      }).catch(() => null);
    }
    if (!student) {
      student = await prisma.user.findFirst({
        where: {
          tenantId: tid,
          isDeleted: false,
          OR: [
            { username: rawId.toLowerCase() },
            { email: rawId.toLowerCase() }
          ]
        }
      }).catch(() => null);
    }

    // Check linked Student profile / Admission number
    if (!student) {
      const regProfile = await prisma.userRegistrationProfile.findFirst({
        where: { linkedStudentId: rawId }
      }).catch(() => null);
      if (regProfile) {
        student = await prisma.user.findFirst({
          where: { id: regProfile.userId, tenantId: tid, isDeleted: false }
        }).catch(() => null);
      }
    }

    if (!student) {
      const adm = await prisma.admissionApplication.findFirst({
        where: {
          tenantId: tid,
          applicationNumber: rawId
        }
      }).catch(() => null);
      if (adm && adm.enrolledUserId) {
        student = await prisma.user.findFirst({
          where: { id: adm.enrolledUserId, tenantId: tid, isDeleted: false }
        }).catch(() => null);
      }
    }

    // Standard demo alias fallback strictly inside Tenant 1 (supports built-in demo token id=3 or STU-2026-* codes)
    if (!student && tid === 1 && (/^STU-2026-/i.test(rawId) || rawId === '3' || rawId.toLowerCase() === 'student1' || rawId.toLowerCase() === 'student@gbs.com')) {
      student = await prisma.user.findFirst({
        where: { tenantId: 1, email: 'student@gbs.com', isDeleted: false }
      }).catch(() => null);
      if (!student) {
        student = await prisma.user.findFirst({
          where: { tenantId: 1, role: 'STUDENT', isDeleted: false }
        }).catch(() => null);
      }
      if (student) resolvedViaTenant1DemoAlias = true;
    }
  } else if (requestingUser?.role === 'STUDENT') {
    student = await prisma.user.findFirst({
      where: { id: parseInt(requestingUser.id, 10) || 3, tenantId: tid, isDeleted: false }
    }).catch(() => null);
    if (!student && tid === 1 && requestingUser.email) {
      student = await prisma.user.findFirst({
        where: { tenantId: 1, email: String(requestingUser.email).toLowerCase(), isDeleted: false }
      }).catch(() => null);
      if (student) resolvedViaTenant1DemoAlias = true;
    }
    if (!student && tid === 1 && requestingUser.email === 'student@gbs.com') {
      student = await prisma.user.findFirst({
        where: { tenantId: 1, role: 'STUDENT', isDeleted: false }
      }).catch(() => null);
      if (student) resolvedViaTenant1DemoAlias = true;
    }
  } else if (requestingUser?.role === 'PARENT') {
    const link = await prisma.parentStudentLink.findFirst({
      where: { tenantId: tid, parentId: parseInt(requestingUser.id, 10) || 4 }
    }).catch(() => null);
    if (link) {
      student = await prisma.user.findFirst({
        where: { id: link.studentId, tenantId: tid, isDeleted: false }
      }).catch(() => null);
    }
  } else if (!rawId && ['ADMIN', 'SUPER_ADMIN', 'HEADMASTER', 'PRINCIPAL', 'DEVELOPER', 'TEACHER', 'SECRETARY', 'STAFF', 'HR', 'ALUMNI'].includes(String(requestingUser?.role || '').toUpperCase())) {
    student = await prisma.user.findFirst({
      where: { tenantId: tid, role: 'STUDENT', isDeleted: false }
    }).catch(() => null);
    if (student) resolvedViaTenant1DemoAlias = true;
  }

  if (!student && !rawId && (tid === 1 || ['ADMIN', 'SUPER_ADMIN', 'HEADMASTER', 'DEVELOPER'].includes(String(requestingUser?.role || '').toUpperCase()))) {
    const demoStudent = await prisma.user.findFirst({
      where: { tenantId: tid, role: 'STUDENT', isDeleted: false }
    }).catch(() => null);
    student = demoStudent || {
      id: parseInt(requestingUser?.id, 10) || 3,
      tenantId: tid,
      firstName: requestingUser?.firstName || 'Alex',
      lastName: requestingUser?.lastName || 'Mensah',
      email: requestingUser?.email || 'student@gbs.com',
      role: 'STUDENT'
    };
    resolvedViaTenant1DemoAlias = true;
  }

  if (!student) {
    throw new AppError(
      `Student record "${rawId || 'selected'}" was not found in institution #${tid}. Verify the student's unique ID.`,
      404
    );
  }

  // Enforce student role isolation when a student queries another student
  if (
    requestingUser &&
    requestingUser.role === 'STUDENT' &&
    !resolvedViaTenant1DemoAlias &&
    Number(requestingUser.id) !== Number(student.id) &&
    (!requestingUser.email || String(requestingUser.email).toLowerCase() !== String(student.email || '').toLowerCase())
  ) {
    throw new AppError('Access denied: You can only view or pay your own school fee account.', 403);
  }

  return student;
}

async function getStudentFeeStatement({ tenantId, studentIdentifier, requestingUser }) {
  const tenant = await resolveTenantRecord(tenantId);
  const tid = tenant.id;
  const student = await resolveStudentInTenant(tid, studentIdentifier, requestingUser);

  await ensureDemoTenantBaselineInvoices(tid, student.id);

  const [invoices, transactions, receipts, gatewayBundle] = await Promise.all([
    prisma.studentInvoice.findMany({ where: { tenantId: tid, studentId: student.id } }).catch(() => []),
    prisma.paymentTransaction.findMany({ where: { tenantId: tid, studentId: student.id } }).catch(() => []),
    prisma.paymentReceipt.findMany({ where: { tenantId: tid, studentId: student.id } }).catch(() => []),
    resolveGatewayAndChannels(tid)
  ]);

  invoices.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  transactions.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  receipts.sort((a, b) => new Date(b.issuedAt || 0) - new Date(a.issuedAt || 0));

  const activeInvoices = invoices.filter((i) => i.status !== 'CANCELLED');
  const totalBilled = roundMoney(activeInvoices.reduce((s, i) => s + Number(i.netAmount || 0), 0));
  const totalPaid = roundMoney(activeInvoices.reduce((s, i) => s + Number(i.paidAmount || 0), 0));
  const outstandingBalance = roundMoney(
    activeInvoices.reduce((s, i) => s + Math.max(0, Number(i.balanceDue || 0)), 0)
  );

  // Partial payment rules come from tenant gateway policy (default allow >=20%)
  const activeConfig = gatewayBundle.configs.find((c) => c.effectiveEnabled) || gatewayBundle.configs[0] || {};
  const allowPartialPayments = activeConfig.allowPartialPayments !== false;
  const minPartialPercent = Number(activeConfig.minPartialPercent || 20);
  const minimumPayableAmount =
    outstandingBalance <= 0
      ? 0
      : allowPartialPayments
        ? Math.min(outstandingBalance, roundMoney(Math.max(1, (outstandingBalance * minPartialPercent) / 100)))
        : outstandingBalance;

  const openInvoice = activeInvoices.find((i) => Number(i.balanceDue || 0) > 0) || activeInvoices[0] || null;
  const studentCode =
    (String(studentIdentifier || '').startsWith('STU-') ? String(studentIdentifier).trim() : null) ||
    student.username ||
    `STU-${tid}-${student.id}`;

  return {
    institution: {
      id: tid,
      name: tenant.name,
      code: tenant.code
    },
    student: {
      id: student.id,
      studentCode,
      fullName: `${student.firstName || ''} ${student.lastName || ''}`.trim() || student.username,
      email: student.email
    },
    feeSummary: {
      academicYear: '2026-2027',
      term: openInvoice?.academicTerm || '2026-2027 Term 2',
      feeDescription: openInvoice?.title || 'School Tuition & Facility Fees',
      currency: 'GHS',
      totalBilled,
      totalPaid,
      outstandingBalance,
      allowPartialPayments,
      minPartialPercent,
      minimumPayableAmount
    },
    invoices: activeInvoices,
    availableChannels: gatewayBundle.channels,
    transactions: transactions.slice(0, 25),
    receipts: receipts.slice(0, 25)
  };
}

function buildSupportedFallbacks(configs, failedGateway, currentChannel) {
  const alternatives = [];
  for (const cfg of configs) {
    if (!cfg.effectiveEnabled) continue;
    if (cfg.capabilities?.supportsHostedCheckout) {
      alternatives.push({
        type: 'HOSTED_CHECKOUT',
        gateway: cfg.gateway,
        channel: currentChannel,
        label: `Pay in Browser via ${cfg.gateway === GATEWAYS.PAYSTACK ? 'Paystack' : cfg.gateway === GATEWAYS.HUBTEL ? 'Hubtel' : 'Sandbox'} Secure Checkout`,
        description: 'Does not require any mobile app installed. Opens official provider webpage where you can pay by Mobile Money or Card.'
      });
    }
  }
  for (const ch of Object.keys(CHANNELS)) {
    if (ch === currentChannel) continue;
    const match = configs.find((c) => c.effectiveEnabled && c.supportedChannels.includes(ch));
    if (match) {
      alternatives.push({
        type: 'SWITCH_METHOD',
        gateway: match.gateway,
        channel: ch,
        label: `Switch to ${CHANNEL_LABELS[ch] || ch}`,
        description: `Supported via ${match.gateway}`
      });
    }
  }
  return alternatives.slice(0, 6);
}

async function initiatePayment({ tenantId, requestingUser, body, originUrl = '' }) {
  const input = validateInitiatePayload(body);
  const tenant = await resolveTenantRecord(tenantId);
  const tid = tenant.id;

  // Idempotency key deduplication
  if (input.idempotencyKey) {
    const existingByKey = await prisma.paymentTransaction.findFirst({
      where: { tenantId: tid, idempotencyKey: input.idempotencyKey }
    }).catch(() => null);
    if (existingByKey) {
      const { configs } = await resolveGatewayAndChannels(tid);
      return {
        reusedIdempotent: true,
        transaction: _sanitizeTransactionForClient(existingByKey),
        customerMessage: existingByKey.displayMessage || STATE_CUSTOMER_MESSAGES[existingByKey.gatewayStatus],
        fallbackOptions: buildSupportedFallbacks(configs, existingByKey.gateway, existingByKey.channel)
      };
    }
  }

  let student = null;
  let targetInvoice = null;
  let expectedOutstanding = 0;
  let allowPartial = true;
  let minPartialPercent = 20;
  let academicYear = input.academicYear || '2026-2027';
  let term = input.term || '2026-2027 Term 2';
  let feeAccount = 'Tuition & Academic Fees';

  if (input.scope === PAYMENT_SCOPES.SCHOOL_FEES) {
    student = await resolveStudentInTenant(tid, input.studentIdentifier, requestingUser);
    await ensureDemoTenantBaselineInvoices(tid, student.id);

    const studentInvoices = await prisma.studentInvoice.findMany({
      where: { tenantId: tid, studentId: student.id }
    }).catch(() => []);

    const activeInvoices = studentInvoices.filter((i) => i.status !== 'CANCELLED' && Number(i.balanceDue || 0) > 0);
    if (input.invoiceId) {
      targetInvoice = studentInvoices.find((i) => i.id === input.invoiceId);
      if (!targetInvoice) {
        throw new AppError(`Invoice #${input.invoiceId} does not belong to student in institution #${tid}.`, 404);
      }
      if (Number(targetInvoice.balanceDue || 0) <= 0) {
        throw new AppError(`Invoice ${targetInvoice.invoiceNumber} is already paid in full.`, 400);
      }
      expectedOutstanding = roundMoney(targetInvoice.balanceDue);
      term = targetInvoice.academicTerm || term;
      feeAccount = targetInvoice.title || feeAccount;
    } else {
      expectedOutstanding = roundMoney(activeInvoices.reduce((s, i) => s + Number(i.balanceDue || 0), 0));
      targetInvoice = activeInvoices[0] || null;
      if (targetInvoice) {
        term = targetInvoice.academicTerm || term;
        feeAccount = targetInvoice.title || feeAccount;
      }
    }

    if (expectedOutstanding <= 0) {
      throw new AppError('This student has no outstanding fee balance to pay.', 400);
    }
    if (input.amount > expectedOutstanding + 0.01) {
      throw new AppError(
        `Payment amount (${input.currency} ${input.amount.toFixed(2)}) exceeds the verified database balance due (${input.currency} ${expectedOutstanding.toFixed(2)}).`,
        400
      );
    }
  } else {
    // SUBSCRIPTION scope (school platform renewal / onboarding)
    expectedOutstanding = input.amount;
    feeAccount = body.feeAccount || `GBS Enterprise Subscription (${tenant.name})`;
    term = body.subscriptionPlan || 'Annual / Term Plan';
  }

  // Validate gateway & channel support
  const { configs, channels } = await resolveGatewayAndChannels(tid);
  const secretConfigs = await getTenantGatewayConfigs(tid, { includeSecrets: true });
  const channelEntry = channels.find((c) => c.channel === input.channel);
  if (!channelEntry) {
    throw new AppError(`${CHANNEL_LABELS[input.channel] || input.channel} is currently not enabled for ${tenant.name}.`, 400);
  }

  const chosenGatewayName = input.gateway || channelEntry.primaryGateway;
  const gatewayConfig = secretConfigs.find((c) => c.gateway === chosenGatewayName && c.effectiveEnabled)
    || configs.find((c) => c.gateway === chosenGatewayName && c.effectiveEnabled);
  if (!gatewayConfig) {
    throw new AppError(`Payment gateway ${chosenGatewayName} is not configured or enabled for ${tenant.name}.`, 400);
  }
  if (!gatewayConfig.supportedChannels.includes(input.channel)) {
    throw new AppError(`${chosenGatewayName} does not support ${CHANNEL_LABELS[input.channel] || input.channel}.`, 400);
  }

  allowPartial = gatewayConfig.allowPartialPayments !== false;
  minPartialPercent = Number(gatewayConfig.minPartialPercent || 20);
  if (input.scope === PAYMENT_SCOPES.SCHOOL_FEES && input.amount + 0.01 < expectedOutstanding) {
    if (!allowPartial) {
      throw new AppError(`Partial fee payments are disabled for ${tenant.name}. Full balance of ${input.currency} ${expectedOutstanding.toFixed(2)} is required.`, 400);
    }
    const minRequired = roundMoney(Math.max(1, (expectedOutstanding * minPartialPercent) / 100));
    if (input.amount + 0.01 < minRequired && expectedOutstanding >= minRequired) {
      throw new AppError(`Minimum partial payment allowed is ${minPartialPercent}% (${input.currency} ${minRequired.toFixed(2)}).`, 400);
    }
  }

  const reference = generateTransactionReference(tid, input.scope === PAYMENT_SCOPES.SUBSCRIPTION ? 'SUBSCRIPTION' : 'FEE');
  const receiptNumber = generateReceiptNumber(tid);
  const expiresAt = new Date(Date.now() + DEFAULT_FEE_EXPIRY_MINUTES * 60 * 1000);

  // Multi-school merchant routing vs Developer platform subscription routing
  const subaccountCode =
    input.scope === PAYMENT_SCOPES.SUBSCRIPTION
      ? (process.env.PAYSTACK_PLATFORM_SUBACCOUNT || null)
      : (gatewayConfig.paystackSubaccountCode || null);
  const merchantAccountNumber =
    input.scope === PAYMENT_SCOPES.SUBSCRIPTION
      ? (process.env.HUBTEL_MERCHANT_ACCOUNT_NUMBER || null)
      : (gatewayConfig.hubtelMerchantAccount || null);

  // Create CREATED record in DB before external API call
  const initialTx = await prisma.paymentTransaction.create({
    data: {
      tenantId: tid,
      invoiceId: targetInvoice?.id || null,
      receiptNumber,
      reference,
      providerReference: null,
      gateway: chosenGatewayName,
      channel: input.channel,
      paymentScope: input.scope,
      studentId: student?.id || null,
      studentCode: input.studentIdentifier || student?.username || null,
      payerUserId: requestingUser?.id ? parseInt(requestingUser.id, 10) : (student?.id || null),
      payerPhone: input.phoneResult?.masked || null,
      payerEmail: input.payerEmail || requestingUser?.email || student?.email || null,
      academicYear,
      term,
      feeAccount,
      expectedAmount: input.amount,
      amountPaid: input.amount,
      currency: input.currency,
      paymentMethod: input.channel,
      transactionRef: reference,
      gatewayStatus: TRANSACTION_STATES.CREATED,
      idempotencyKey: input.idempotencyKey || reference,
      subaccountCode,
      merchantAccountNumber,
      accountingPosted: false,
      expiresAt,
      displayMessage: STATE_CUSTOMER_MESSAGES.CREATED,
      metadataJson: JSON.stringify({
        institutionName: tenant.name,
        studentName: student ? `${student.firstName} ${student.lastName}`.trim() : null,
        initiatedAt: new Date().toISOString()
      })
    }
  });

  await prisma.auditLog.create({
    data: {
      tenantId: tid,
      userId: requestingUser?.id ? parseInt(requestingUser.id, 10) : null,
      module: 'PAYMENTS',
      action: 'PAYMENT_INITIATED',
      entityId: initialTx.id,
      details: `Initiated ${chosenGatewayName} / ${input.channel} payment ${reference} for ${input.currency} ${input.amount.toFixed(2)} (${tenant.name}).`
    }
  }).catch(() => {});

  const adapter = getAdapter(chosenGatewayName);
  const fallbackReturnUrl = input.returnUrl || (originUrl ? `${originUrl}/payment-callback?payment_ref=${encodeURIComponent(reference)}` : '');
  const webhookCallbackUrl = originUrl ? `${originUrl}/api/v1/payments/webhooks/${chosenGatewayName.toLowerCase()}` : '';

  let adapterRes;
  try {
    adapterRes = await adapter.initiatePayment({
      reference,
      amount: input.amount,
      currency: input.currency,
      channel: input.channel,
      payerEmail: input.payerEmail || requestingUser?.email || student?.email || 'payer@gbs-school.edu',
      payerName: input.payerName || (requestingUser ? `${requestingUser.firstName || ''} ${requestingUser.lastName || ''}`.trim() : null),
      phoneResult: input.phoneResult,
      subaccountCode,
      merchantAccountNumber,
      callbackUrl: webhookCallbackUrl,
      returnUrl: fallbackReturnUrl,
      cancellationUrl: fallbackReturnUrl,
      preferHostedCheckout: input.preferHostedCheckout,
      institutionName: tenant.name,
      description: `${tenant.name} — ${feeAccount}`,
      apiBaseUrl: originUrl,
      metadata: {
        tenantId: tid,
        studentId: student?.id || null,
        invoiceId: targetInvoice?.id || null,
        reference,
        paymentScope: input.scope
      },
      config: gatewayConfig
    });
  } catch (err) {
    const failedTx = await prisma.paymentTransaction.update({
      where: { id: initialTx.id },
      data: {
        gatewayStatus: TRANSACTION_STATES.FAILED,
        failureReason: err.message,
        displayMessage: err.message
      }
    });
    return {
      transaction: _sanitizeTransactionForClient(failedTx),
      customerMessage: err.message,
      fallbackOptions: buildSupportedFallbacks(configs, chosenGatewayName, input.channel),
      error: err.message
    };
  }

  let updatedTx = await prisma.paymentTransaction.update({
    where: { id: initialTx.id },
    data: {
      gatewayStatus: adapterRes.status || TRANSACTION_STATES.REQUIRES_CUSTOMER_ACTION,
      providerReference: adapterRes.providerReference || reference,
      authorizationType: adapterRes.authorizationType || 'NONE',
      authorizationUrl: adapterRes.authorizationUrl || null,
      ussdInstruction: adapterRes.ussdInstruction || null,
      displayMessage: adapterRes.displayMessage || STATE_CUSTOMER_MESSAGES[adapterRes.status]
    }
  });

  // If gateway indicated immediate readiness to verify (e.g. inline instant charge), verify server-to-server first
  if (adapterRes.shouldVerifyImmediately) {
    const verification = await verifyTransactionStatus({ tenantId: tid, reference, userId: requestingUser?.id });
    updatedTx = verification.transaction;
  }

  return {
    transaction: _sanitizeTransactionForClient(updatedTx),
    customerMessage: updatedTx.displayMessage || STATE_CUSTOMER_MESSAGES[updatedTx.gatewayStatus],
    fallbackOptions: buildSupportedFallbacks(configs, chosenGatewayName, input.channel),
    mode: gatewayConfig.mode
  };
}

async function submitAuthorizationStep({ tenantId, reference, otp, requestingUser }) {
  await ensurePaymentTables();
  const tid = parseInt(tenantId, 10) || 1;
  const tx = await prisma.paymentTransaction.findFirst({
    where: { tenantId: tid, reference }
  });
  if (!tx) throw new AppError('Payment transaction not found.', 404);
  if (tx.gatewayStatus === TRANSACTION_STATES.SUCCESSFUL) {
    return { transaction: _sanitizeTransactionForClient(tx), customerMessage: STATE_CUSTOMER_MESSAGES.SUCCESSFUL };
  }

  const configs = await getTenantGatewayConfigs(tid, { includeSecrets: true });
  const cfg = configs.find((c) => c.gateway === tx.gateway) || {};
  const adapter = getAdapter(tx.gateway);
  if (!adapter) throw new AppError(`Adapter for ${tx.gateway} unavailable.`, 400);

  const stepRes = await adapter.submitAuthorizationStep({
    reference: tx.reference,
    otp,
    config: cfg
  });

  const updated = await prisma.paymentTransaction.update({
    where: { id: tx.id },
    data: {
      gatewayStatus: stepRes.status,
      providerReference: stepRes.providerReference || tx.providerReference,
      authorizationType: stepRes.authorizationType || tx.authorizationType,
      authorizationUrl: stepRes.authorizationUrl || tx.authorizationUrl,
      ussdInstruction: stepRes.ussdInstruction || tx.ussdInstruction,
      displayMessage: stepRes.displayMessage || STATE_CUSTOMER_MESSAGES[stepRes.status]
    }
  });

  if (stepRes.shouldVerifyImmediately) {
    return verifyTransactionStatus({ tenantId: tid, reference, userId: requestingUser?.id });
  }

  return {
    transaction: _sanitizeTransactionForClient(updated),
    customerMessage: updated.displayMessage
  };
}

async function cancelPayment({ tenantId, reference, requestingUser }) {
  await ensurePaymentTables();
  const tid = parseInt(tenantId, 10) || 1;
  const tx = await prisma.paymentTransaction.findFirst({
    where: { tenantId: tid, reference }
  });
  if (!tx) throw new AppError('Payment transaction not found.', 404);

  if (tx.gatewayStatus === TRANSACTION_STATES.SUCCESSFUL || tx.accountingPosted) {
    throw new AppError('Completed payments cannot be cancelled; request a formal refund review if needed.', 400);
  }

  const outcome = await reconcileVerifiedOutcome({
    transaction: tx,
    verifiedStatus: TRANSACTION_STATES.CANCELLED,
    verifiedAmount: null,
    verifiedCurrency: tx.currency,
    providerReference: tx.providerReference,
    gatewayResponse: 'Cancelled by payer before completion.',
    source: 'USER_CANCEL',
    actorUserId: requestingUser?.id
  });

  return {
    transaction: _sanitizeTransactionForClient(outcome.transaction),
    customerMessage: STATE_CUSTOMER_MESSAGES.CANCELLED
  };
}

async function switchToFallbackMethod({ tenantId, reference, newGateway, newChannel, preferHostedCheckout, payerPhone, requestingUser, originUrl = '' }) {
  await ensurePaymentTables();
  const tid = parseInt(tenantId, 10) || 1;
  const oldTx = await prisma.paymentTransaction.findFirst({
    where: { tenantId: tid, reference }
  });
  if (!oldTx) throw new AppError('Original payment transaction not found.', 404);

  if (oldTx.gatewayStatus === TRANSACTION_STATES.SUCCESSFUL || oldTx.accountingPosted) {
    throw new AppError('Original transaction has already settled successfully.', 400);
  }

  // Cancel the previous un-settled attempt cleanly so two open prompts don't race without linkage
  if (!TERMINAL_STATES.has(oldTx.gatewayStatus)) {
    await cancelPayment({ tenantId: tid, reference, requestingUser });
  }

  return initiatePayment({
    tenantId: tid,
    requestingUser,
    originUrl,
    body: {
      paymentScope: oldTx.paymentScope,
      studentId: oldTx.studentId,
      studentIdentifier: oldTx.studentCode || (oldTx.studentId ? String(oldTx.studentId) : null),
      invoiceId: oldTx.invoiceId,
      amount: oldTx.expectedAmount || oldTx.amountPaid,
      currency: oldTx.currency,
      gateway: newGateway || oldTx.gateway,
      channel: newChannel || oldTx.channel,
      payerPhone: payerPhone || undefined,
      payerEmail: oldTx.payerEmail || undefined,
      academicYear: oldTx.academicYear,
      term: oldTx.term,
      preferHostedCheckout: preferHostedCheckout !== undefined ? Boolean(preferHostedCheckout) : true
    }
  });
}

async function verifyTransactionStatus({ tenantId, reference, userId = null }) {
  await ensurePaymentTables();
  const tid = tenantId ? parseInt(tenantId, 10) : null;
  const where = tid ? { tenantId: tid, reference } : { reference };
  const tx = await prisma.paymentTransaction.findFirst({ where });
  if (!tx) {
    throw new AppError(`Transaction reference "${reference}" was not found.`, 404);
  }

  if (tx.gatewayStatus === TRANSACTION_STATES.SUCCESSFUL && tx.accountingPosted) {
    const existingReceipt = await prisma.paymentReceipt.findFirst({
      where: { paymentTransactionId: tx.id }
    }).catch(() => null);
    return {
      transaction: _sanitizeTransactionForClient(tx),
      receipt: existingReceipt,
      customerMessage: STATE_CUSTOMER_MESSAGES.SUCCESSFUL
    };
  }

  // Expiry check for open unconfirmed sessions
  if (
    tx.expiresAt &&
    new Date() > new Date(tx.expiresAt) &&
    [TRANSACTION_STATES.CREATED, TRANSACTION_STATES.PENDING, TRANSACTION_STATES.REQUIRES_CUSTOMER_ACTION].includes(tx.gatewayStatus)
  ) {
    const adapter = getAdapter(tx.gateway);
    const configs = await getTenantGatewayConfigs(tx.tenantId, { includeSecrets: true });
    const cfg = configs.find((c) => c.gateway === tx.gateway) || {};
    // Always verify with provider before expiring in case webhook got delayed!
    let providerCheck = null;
    if (adapter && cfg.effectiveEnabled) {
      providerCheck = await adapter.verifyTransaction({
        reference: tx.reference,
        merchantAccountNumber: tx.merchantAccountNumber,
        existingTransaction: tx,
        config: cfg
      }).catch(() => null);
    }
    if (!providerCheck || providerCheck.status !== TRANSACTION_STATES.SUCCESSFUL) {
      const expiredOutcome = await reconcileVerifiedOutcome({
        transaction: tx,
        verifiedStatus: TRANSACTION_STATES.EXPIRED,
        verifiedAmount: null,
        verifiedCurrency: tx.currency,
        providerReference: tx.providerReference,
        gatewayResponse: STATE_CUSTOMER_MESSAGES.EXPIRED,
        source: 'EXPIRY_CHECK',
        actorUserId: userId
      });
      return {
        transaction: _sanitizeTransactionForClient(expiredOutcome.transaction),
        receipt: null,
        customerMessage: STATE_CUSTOMER_MESSAGES.EXPIRED
      };
    }
  }

  const configs = await getTenantGatewayConfigs(tx.tenantId, { includeSecrets: true });
  const cfg = configs.find((c) => c.gateway === tx.gateway) || {};
  const adapter = getAdapter(tx.gateway);
  if (!adapter) {
    return {
      transaction: _sanitizeTransactionForClient(tx),
      receipt: null,
      customerMessage: STATE_CUSTOMER_MESSAGES[tx.gatewayStatus] || tx.displayMessage
    };
  }

  const verification = await adapter.verifyTransaction({
    reference: tx.reference,
    merchantAccountNumber: tx.merchantAccountNumber,
    existingTransaction: tx,
    config: cfg
  });

  const outcome = await reconcileVerifiedOutcome({
    transaction: tx,
    verifiedStatus: verification.status,
    verifiedAmount: verification.amount,
    verifiedCurrency: verification.currency,
    providerReference: verification.providerReference,
    gatewayResponse: verification.gatewayResponse,
    source: 'VERIFY_API',
    actorUserId: userId
  });

  return {
    transaction: _sanitizeTransactionForClient(outcome.transaction),
    receipt: outcome.receipt || null,
    customerMessage:
      outcome.transaction.displayMessage || STATE_CUSTOMER_MESSAGES[outcome.transaction.gatewayStatus]
  };
}

async function handleWebhook({ gateway, rawBody, headers = {}, payload = {} }) {
  await ensurePaymentTables();
  const gw = String(gateway || '').toUpperCase();
  const adapter = getAdapter(gw);
  if (!adapter) {
    throw new AppError(`Unknown webhook gateway: ${gateway}`, 400);
  }

  const parsedPayload =
    payload && Object.keys(payload).length > 0
      ? payload
      : (() => {
          try {
            return JSON.parse(Buffer.isBuffer(rawBody) ? rawBody.toString('utf8') : String(rawBody || '{}'));
          } catch {
            return {};
          }
        })();

  const rawText = Buffer.isBuffer(rawBody) ? rawBody.toString('utf8') : JSON.stringify(parsedPayload);
  const payloadHash = sha256Hex(rawText);

  const tentativeRef = parsedPayload?.data?.reference || parsedPayload?.reference || parsedPayload?.Data?.ClientReference || null;
  let webhookTid = 1;
  if (tentativeRef) {
    const tentativeTx = await prisma.paymentTransaction.findFirst({ where: { reference: String(tentativeRef) } }).catch(() => null);
    if (tentativeTx?.tenantId) webhookTid = tentativeTx.tenantId;
  }
  const webhookConfigs = await getTenantGatewayConfigs(webhookTid, { includeSecrets: true }).catch(() => []);
  const webhookCfg = webhookConfigs.find((c) => c.gateway === gw) || {};

  const signatureValid = adapter.verifyWebhookSignature({
    rawBody: rawText,
    headers,
    payload: parsedPayload,
    config: webhookCfg
  });

  if (!signatureValid) {
    await prisma.paymentWebhookEvent.create({
      data: {
        gateway: gw,
        eventType: 'INVALID_SIGNATURE',
        signatureValid: false,
        processingStatus: 'FAILED',
        errorMessage: 'Webhook signature check failed.',
        payloadHash,
        rawPayload: rawText.slice(0, 4000)
      }
    }).catch(() => {});
    throw new AppError('Invalid webhook signature.', 401);
  }

  const parsedEvent = adapter.parseWebhookEvent({ payload: parsedPayload });
  if (!parsedEvent || !parsedEvent.reference) {
    throw new AppError('Webhook event missing transaction reference.', 400);
  }

  // Deduplicate repeated webhooks
  const existingProcessed = await prisma.paymentWebhookEvent.findFirst({
    where: {
      gateway: gw,
      processingStatus: 'PROCESSED',
      OR: [
        ...(parsedEvent.eventId ? [{ eventId: parsedEvent.eventId }] : []),
        { payloadHash }
      ]
    }
  }).catch(() => null);

  if (existingProcessed) {
    await prisma.paymentWebhookEvent.create({
      data: {
        gateway: gw,
        eventId: parsedEvent.eventId,
        eventType: parsedEvent.eventType,
        transactionRef: parsedEvent.reference,
        providerReference: parsedEvent.providerReference,
        signatureValid: true,
        processingStatus: 'IGNORED_DUPLICATE',
        payloadHash,
        processedAt: new Date()
      }
    }).catch(() => {});
    return {
      status: 'IGNORED_DUPLICATE',
      reference: parsedEvent.reference
    };
  }

  const webhookRec = await prisma.paymentWebhookEvent.create({
    data: {
      gateway: gw,
      eventId: parsedEvent.eventId,
      eventType: parsedEvent.eventType,
      transactionRef: parsedEvent.reference,
      providerReference: parsedEvent.providerReference,
      signatureValid: true,
      processingStatus: 'RECEIVED',
      payloadHash,
      rawPayload: rawText.slice(0, 4000)
    }
  });

  try {
    const tx = await prisma.paymentTransaction.findFirst({
      where: { reference: parsedEvent.reference }
    });
    if (!tx) {
      await prisma.paymentWebhookEvent.update({
        where: { id: webhookRec.id },
        data: {
          processingStatus: 'FAILED',
          errorMessage: `No transaction found for reference ${parsedEvent.reference}`
        }
      });
      throw new AppError(`Transaction ${parsedEvent.reference} not found.`, 404);
    }

    let finalStatus = parsedEvent.mappedStatus;
    let finalAmount = parsedEvent.amount;
    let finalCurrency = parsedEvent.currency;
    let finalProviderRef = parsedEvent.providerReference;

    // Cross-verify server-to-server whenever provider requires verification or for live Paystack/Hubtel confirmations
    if (gw !== GATEWAYS.SANDBOX_PSP && parsedEvent.mappedStatus === TRANSACTION_STATES.SUCCESSFUL) {
      const configs = await getTenantGatewayConfigs(tx.tenantId);
      const cfg = configs.find((c) => c.gateway === gw) || {};
      if (adapter.isConfigured(cfg)) {
        const s2s = await adapter.verifyTransaction({
          reference: tx.reference,
          merchantAccountNumber: tx.merchantAccountNumber,
          existingTransaction: tx,
          config: cfg
        });
        finalStatus = s2s.status;
        finalAmount = s2s.amount ?? finalAmount;
        finalCurrency = s2s.currency || finalCurrency;
        finalProviderRef = s2s.providerReference || finalProviderRef;
      }
    }

    const reconciled = await reconcileVerifiedOutcome({
      transaction: tx,
      verifiedStatus: finalStatus,
      verifiedAmount: finalAmount,
      verifiedCurrency: finalCurrency,
      providerReference: finalProviderRef,
      gatewayResponse: `Verified via ${gw} webhook (${parsedEvent.eventType})`,
      source: 'WEBHOOK'
    });

    await prisma.paymentWebhookEvent.update({
      where: { id: webhookRec.id },
      data: {
        processingStatus: 'PROCESSED',
        processedAt: new Date()
      }
    });

    return {
      status: 'PROCESSED',
      reference: tx.reference,
      transactionStatus: reconciled.transaction.gatewayStatus,
      receiptNumber: reconciled.receipt?.receiptNumber || null
    };
  } catch (err) {
    await prisma.paymentWebhookEvent.update({
      where: { id: webhookRec.id },
      data: {
        processingStatus: 'RETRYING',
        retryCount: 1,
        nextRetryAt: new Date(Date.now() + 60 * 1000),
        errorMessage: err.message
      }
    }).catch(() => {});
    throw err;
  }
}

async function retryFailedWebhooks() {
  await ensurePaymentTables();
  const candidates = await prisma.paymentWebhookEvent.findMany({
    where: {
      signatureValid: true,
      processingStatus: { in: ['RETRYING', 'FAILED'] }
    }
  }).catch(() => []);

  const results = [];
  for (const evt of candidates) {
    if ((evt.retryCount || 0) >= 5 || !evt.transactionRef) continue;
    try {
      const verification = await verifyTransactionStatus({ reference: evt.transactionRef });
      await prisma.paymentWebhookEvent.update({
        where: { id: evt.id },
        data: {
          processingStatus: 'PROCESSED',
          processedAt: new Date(),
          retryCount: (evt.retryCount || 0) + 1
        }
      });
      results.push({ id: evt.id, reference: evt.transactionRef, outcome: verification.transaction.gatewayStatus });
    } catch (err) {
      await prisma.paymentWebhookEvent.update({
        where: { id: evt.id },
        data: {
          retryCount: (evt.retryCount || 0) + 1,
          errorMessage: err.message,
          nextRetryAt: new Date(Date.now() + 5 * 60 * 1000)
        }
      }).catch(() => {});
      results.push({ id: evt.id, reference: evt.transactionRef, error: err.message });
    }
  }
  return results;
}

async function reconcilePendingTransactions(tenantId = null) {
  await ensurePaymentTables();
  const where = {
    gatewayStatus: {
      in: [
        TRANSACTION_STATES.CREATED,
        TRANSACTION_STATES.PENDING,
        TRANSACTION_STATES.REQUIRES_CUSTOMER_ACTION,
        TRANSACTION_STATES.PROCESSING
      ]
    }
  };
  if (tenantId) where.tenantId = parseInt(tenantId, 10);

  const pending = await prisma.paymentTransaction.findMany({ where }).catch(() => []);
  const reconciled = [];
  for (const tx of pending) {
    if (!tx.reference) continue;
    try {
      const res = await verifyTransactionStatus({ tenantId: tx.tenantId, reference: tx.reference });
      reconciled.push({ reference: tx.reference, status: res.transaction.gatewayStatus });
    } catch (err) {
      reconciled.push({ reference: tx.reference, error: err.message });
    }
  }
  return { checked: pending.length, reconciled };
}

async function adminManualOrBankReconcile({ tenantId, reference, action, reason = '', actorUserId }) {
  await ensurePaymentTables();
  const tid = parseInt(tenantId, 10) || 1;
  const tx = await prisma.paymentTransaction.findFirst({ where: { tenantId: tid, reference } });
  if (!tx) throw new AppError(`Transaction ${reference} not found in institution #${tid}.`, 404);

  const act = String(action || '').toUpperCase();
  if (act === 'APPROVE_BANK_DEPOSIT') {
    if (tx.gateway !== GATEWAYS.BANK_DIRECT) {
      throw new AppError('Only BANK_DIRECT transfers require finance-office slip approval. Online gateway payments must confirm via provider webhook/API.', 400);
    }
    return reconcileVerifiedOutcome({
      transaction: tx,
      verifiedStatus: TRANSACTION_STATES.SUCCESSFUL,
      verifiedAmount: tx.expectedAmount || tx.amountPaid,
      verifiedCurrency: tx.currency,
      providerReference: tx.providerReference || `BANK-${Date.now()}`,
      gatewayResponse: reason || 'Commercial bank transfer verified by institution finance office.',
      source: 'FINANCE_BANK_VERIFICATION',
      actorUserId
    });
  }

  if (act === 'REFUND' || act === 'REVERSED' || act === 'UNDER_REVIEW' || act === 'FAILED') {
    const statusMap = {
      REFUND: TRANSACTION_STATES.REFUNDED,
      REVERSED: TRANSACTION_STATES.REVERSED,
      UNDER_REVIEW: TRANSACTION_STATES.UNDER_REVIEW,
      FAILED: TRANSACTION_STATES.FAILED
    };
    return reconcileVerifiedOutcome({
      transaction: tx,
      verifiedStatus: statusMap[act],
      verifiedAmount: tx.amountPaid,
      verifiedCurrency: tx.currency,
      providerReference: tx.providerReference,
      gatewayResponse: reason || `Marked ${statusMap[act]} by authorized finance administrator.`,
      source: 'FINANCE_ADMIN_ACTION',
      actorUserId
    });
  }

  throw new AppError(`Unsupported payment admin action: ${action}`, 400);
}

async function listTransactions({ tenantId, studentId, status, gateway, scope }) {
  await ensurePaymentTables();
  const where = {};
  if (tenantId !== null && tenantId !== undefined && tenantId !== 'ALL') {
    where.tenantId = parseInt(tenantId, 10) || 1;
  }
  if (studentId) where.studentId = parseInt(studentId, 10);
  if (status) where.gatewayStatus = String(status).toUpperCase();
  if (gateway) where.gateway = String(gateway).toUpperCase();
  if (scope) where.paymentScope = String(scope).toUpperCase();

  const list = await prisma.paymentTransaction.findMany({ where }).catch(() => []);
  list.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  return list.map(_sanitizeTransactionForClient);
}

async function getReceipt({ tenantId, receiptOrRef }) {
  await ensurePaymentTables();
  const where = {
    OR: [{ receiptNumber: receiptOrRef }, { transactionRef: receiptOrRef }]
  };
  if (tenantId) where.tenantId = parseInt(tenantId, 10) || 1;
  const receipt = await prisma.paymentReceipt.findFirst({ where }).catch(() => null);
  if (!receipt) throw new AppError(`Official receipt "${receiptOrRef}" not found.`, 404);
  return receipt;
}

async function triggerSandboxConfirmation({ reference, outcome = 'SUCCESSFUL' }) {
  await ensurePaymentTables();
  const tx = await prisma.paymentTransaction.findFirst({ where: { reference } });
  if (!tx) throw new AppError('Sandbox transaction not found.', 404);
  if (tx.gateway !== GATEWAYS.SANDBOX_PSP) {
    throw new AppError('Sandbox webhook simulator can only be invoked on SANDBOX_PSP test transactions.', 403);
  }
  const adapter = getAdapter(GATEWAYS.SANDBOX_PSP);
  const webhookPayload = {
    eventId: `sbx_evt_${reference}_${Date.now()}`,
    reference,
    outcome: String(outcome || 'SUCCESSFUL').toUpperCase(),
    amount: tx.expectedAmount || tx.amountPaid,
    currency: tx.currency || 'GHS',
    providerReference: `SBX-AUTH-${reference.slice(-6)}`
  };
  const rawBody = JSON.stringify(webhookPayload);
  const signature = adapter.signWebhookPayload(rawBody);

  return handleWebhook({
    gateway: GATEWAYS.SANDBOX_PSP,
    rawBody,
    headers: { 'x-sandbox-signature': signature },
    payload: webhookPayload
  });
}

async function getAdminOverview(tenantId = null) {
  await ensurePaymentTables();
  const [configs, transactions, webhooks, receipts] = await Promise.all([
    getTenantGatewayConfigs(tenantId || 1),
    prisma.paymentTransaction.findMany(tenantId ? { where: { tenantId: parseInt(tenantId, 10) } } : {}).catch(() => []),
    prisma.paymentWebhookEvent.findMany({}).catch(() => []),
    prisma.paymentReceipt.findMany(tenantId ? { where: { tenantId: parseInt(tenantId, 10) } } : {}).catch(() => [])
  ]);

  transactions.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  webhooks.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

  return {
    configs,
    transactions: transactions.slice(0, 100).map(_sanitizeTransactionForClient),
    webhooks: webhooks.slice(0, 100),
    receipts: receipts.slice(0, 50),
    stats: {
      totalTransactions: transactions.length,
      successful: transactions.filter((t) => t.gatewayStatus === TRANSACTION_STATES.SUCCESSFUL).length,
      pendingOrActionRequired: transactions.filter((t) =>
        [TRANSACTION_STATES.CREATED, TRANSACTION_STATES.PENDING, TRANSACTION_STATES.REQUIRES_CUSTOMER_ACTION, TRANSACTION_STATES.PROCESSING].includes(t.gatewayStatus)
      ).length,
      failedOrCancelled: transactions.filter((t) =>
        [TRANSACTION_STATES.FAILED, TRANSACTION_STATES.CANCELLED, TRANSACTION_STATES.EXPIRED].includes(t.gatewayStatus)
      ).length,
      underReviewOrReversed: transactions.filter((t) =>
        [TRANSACTION_STATES.UNDER_REVIEW, TRANSACTION_STATES.REVERSED, TRANSACTION_STATES.REFUNDED].includes(t.gatewayStatus)
      ).length,
      failedWebhooks: webhooks.filter((w) => w.processingStatus === 'FAILED' || w.processingStatus === 'RETRYING').length
    }
  };
}

function _sanitizeTransactionForClient(tx) {
  if (!tx) return null;
  const copy = { ...tx };
  // Ensure no sensitive secrets ever leak
  delete copy.rawResponse;
  return copy;
}

module.exports = {
  getStudentFeeStatement,
  initiatePayment,
  submitAuthorizationStep,
  switchToFallbackMethod,
  cancelPayment,
  verifyTransactionStatus,
  handleWebhook,
  retryFailedWebhooks,
  reconcilePendingTransactions,
  adminManualOrBankReconcile,
  listTransactions,
  getReceipt,
  getFinancialReports,
  getTenantGatewayConfigs,
  upsertTenantGatewayConfig,
  resolveGatewayAndChannels,
  testGatewayConnectivity,
  triggerSandboxConfirmation,
  getAdminOverview
};
