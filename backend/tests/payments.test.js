'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const STORE_PATH = path.resolve(__dirname, '../data/gbs_persistent_store.json');
let originalStoreBackup = null;

// Force offline persistent store for deterministic self-contained testing unless TEST_USE_PG=1
if (!process.env.TEST_USE_PG) {
  process.env.GBS_TEST_OFFLINE = '1';
}

const prisma = require('../src/core/database/prisma.client');
const { readPersistentStore, writePersistentStore } = require('../src/core/database/persistentStore');
const paymentsService = require('../src/modules/payments/payments.service');
const PaystackAdapter = require('../src/modules/payments/adapters/paystack.adapter');
const HubtelAdapter = require('../src/modules/payments/adapters/hubtel.adapter');
const { registerAdapterOverride, resetDefaultAdapters } = require('../src/modules/payments/payments.registry');
const { TRANSACTION_STATES, GATEWAYS, CHANNELS } = require('../src/modules/payments/payments.constants');
const { normalizeGhanaPhone } = require('../src/modules/payments/payments.utils');
const { validateInitiatePayload } = require('../src/modules/payments/payments.validator');

test.before(() => {
  if (fs.existsSync(STORE_PATH)) {
    originalStoreBackup = fs.readFileSync(STORE_PATH, 'utf8');
  } else {
    readPersistentStore();
  }
});

test.after(() => {
  resetDefaultAdapters();
  if (originalStoreBackup !== null) {
    try {
      const parsed = JSON.parse(originalStoreBackup);
      writePersistentStore(parsed);
    } catch {
      fs.writeFileSync(STORE_PATH, originalStoreBackup, 'utf8');
    }
  }
});

test('Ghanaian phone validation & normalization rejects invalid prefixes and formats MSISDNs', () => {
  const mtn = normalizeGhanaPhone('024 411 9201');
  assert.equal(mtn.valid, true);
  assert.equal(mtn.local, '0244119201');
  assert.equal(mtn.e164, '+233244119201');
  assert.equal(mtn.detectedNetwork, 'MTN_MOMO');

  const telecel = normalizeGhanaPhone('+233501234567');
  assert.equal(telecel.valid, true);
  assert.equal(telecel.local, '0501234567');
  assert.equal(telecel.detectedNetwork, 'TELECEL_CASH');

  const at = normalizeGhanaPhone('233277654321');
  assert.equal(at.valid, true);
  assert.equal(at.detectedNetwork, 'AT_MONEY');

  const invalid = normalizeGhanaPhone('12345');
  assert.equal(invalid.valid, false);
});

test('Security validator strictly blocks MoMo PINs and raw Card CVV/PAN transmission', () => {
  assert.throws(
    () => validateInitiatePayload({ channel: 'MTN_MOMO', amount: 100, payerPhone: '0244119201', studentId: 3, momoPin: '1234' }),
    /Security Policy Violation/i
  );
  assert.throws(
    () => validateInitiatePayload({ channel: 'VISA', amount: 100, studentId: 3, cardNumber: '4242', cvv: '123' }),
    /Security Policy Violation/i
  );
});

test('Student fee lookup & multi-school tenant isolation', async () => {
  const statement = await paymentsService.getStudentFeeStatement({
    tenantId: 1,
    studentIdentifier: '3',
    requestingUser: { id: 3, role: 'STUDENT', tenantId: 1 }
  });
  assert.equal(statement.institution.id, 1);
  assert.equal(statement.student.id, 3);
  assert.ok(statement.feeSummary.outstandingBalance > 0);

  // Cross-school isolation: querying Tenant 1 student under Tenant 99 must fail
  await assert.rejects(
    () => paymentsService.getStudentFeeStatement({
      tenantId: 99,
      studentIdentifier: '3',
      requestingUser: { id: 99, role: 'ADMIN', tenantId: 99 }
    }),
    /not found in institution #99/i
  );
});

test('Rejects overpayment and below-minimum partial fee payment', async () => {
  const statement = await paymentsService.getStudentFeeStatement({ tenantId: 1, studentIdentifier: '3' });
  const due = statement.feeSummary.outstandingBalance;

  await assert.rejects(
    () => paymentsService.initiatePayment({
      tenantId: 1,
      requestingUser: { id: 4, role: 'PARENT', tenantId: 1 },
      body: {
        studentId: 3,
        amount: due + 500,
        channel: CHANNELS.MTN_MOMO,
        payerPhone: '0244119201'
      }
    }),
    /exceeds the verified database balance due/i
  );

  await assert.rejects(
    () => paymentsService.initiatePayment({
      tenantId: 1,
      requestingUser: { id: 4, role: 'PARENT', tenantId: 1 },
      body: {
        studentId: 3,
        amount: 2,
        channel: CHANNELS.MTN_MOMO,
        payerPhone: '0244119201'
      }
    }),
    /Minimum partial payment allowed/i
  );
});

test('Paystack Adapter direct MoMo + OTP + HMAC-SHA512 Webhook + Duplicate Webhook Idempotency + Amount Mismatch', async () => {
  process.env.PAYSTACK_SECRET_KEY = 'sk_test_gbs_mock_secret_12345';

  // Configure Paystack on Tenant 1
  await paymentsService.upsertTenantGatewayConfig(1, GATEWAYS.PAYSTACK, {
    mode: 'TEST',
    isEnabled: true,
    paystackSubaccountCode: 'ACCT_SCHOOL_1',
    supportsMtnMomo: true,
    supportsTelecelCash: true,
    supportsVisa: true
  }, 1);

  const statementBefore = await paymentsService.getStudentFeeStatement({ tenantId: 1, studentIdentifier: '3' });
  const initialDue = statementBefore.feeSummary.outstandingBalance;
  const openInv = statementBefore.invoices.find((i) => Number(i.balanceDue) > 0);
  const partialAmt = Math.min(200, initialDue);

  let verifyStatusToReturn = 'success';
  let verifyAmountMinor = partialAmt * 100;

  const mockPaystack = new PaystackAdapter({
    fetchImpl: async (url, init) => {
      const payload = init?.body ? JSON.parse(init.body) : {};
      if (url.endsWith('/charge')) {
        assert.equal(payload.mobile_money.provider, 'mtn');
        assert.equal(payload.subaccount, 'ACCT_SCHOOL_1');
        return {
          ok: true,
          status: 200,
          json: async () => ({
            status: true,
            data: {
              reference: payload.reference,
              status: 'send_otp',
              display_text: 'Enter the 6-digit OTP sent to your phone'
            }
          })
        };
      }
      if (url.endsWith('/charge/submit_otp')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            status: true,
            data: {
              reference: payload.reference,
              status: 'pay_offline',
              display_text: 'Approve prompt on MTN handset'
            }
          })
        };
      }
      if (url.includes('/transaction/verify/')) {
        const ref = url.split('/').pop();
        return {
          ok: true,
          status: 200,
          json: async () => ({
            status: true,
            data: {
              id: 987654,
              reference: ref,
              status: verifyStatusToReturn,
              amount: verifyAmountMinor,
              currency: 'GHS',
              channel: 'mobile_money',
              gateway_response: 'Approved'
            }
          })
        };
      }
      if (url.endsWith('/transaction/initialize')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            status: true,
            data: {
              authorization_url: `https://checkout.paystack.com/${payload.reference}`,
              access_code: 'acc_mock_123',
              reference: payload.reference
            }
          })
        };
      }
      throw new Error(`Unexpected Paystack URL: ${url}`);
    }
  });
  registerAdapterOverride(GATEWAYS.PAYSTACK, mockPaystack);

  // 1. Initiate MTN MoMo
  const initRes = await paymentsService.initiatePayment({
    tenantId: 1,
    requestingUser: { id: 4, role: 'PARENT', tenantId: 1 },
    body: {
      studentId: 3,
      invoiceId: openInv.id,
      amount: partialAmt,
      gateway: GATEWAYS.PAYSTACK,
      channel: CHANNELS.MTN_MOMO,
      payerPhone: '0244119201',
      idempotencyKey: 'idem_ps_1'
    }
  });
  const ref = initRes.transaction.reference;
  assert.equal(initRes.transaction.gatewayStatus, TRANSACTION_STATES.REQUIRES_CUSTOMER_ACTION);
  assert.equal(initRes.transaction.authorizationType, 'OTP');

  // Re-submitting same idempotencyKey must reuse transaction cleanly
  const idemRetry = await paymentsService.initiatePayment({
    tenantId: 1,
    requestingUser: { id: 4, role: 'PARENT', tenantId: 1 },
    body: {
      studentId: 3,
      invoiceId: openInv.id,
      amount: partialAmt,
      gateway: GATEWAYS.PAYSTACK,
      channel: CHANNELS.MTN_MOMO,
      payerPhone: '0244119201',
      idempotencyKey: 'idem_ps_1'
    }
  });
  assert.equal(idemRetry.reusedIdempotent, true);
  assert.equal(idemRetry.transaction.reference, ref);

  // 2. Submit OTP -> moves to PHONE_PROMPT awaiting confirmation
  const otpRes = await paymentsService.submitAuthorizationStep({
    tenantId: 1,
    reference: ref,
    otp: '123456',
    requestingUser: { id: 4, role: 'PARENT', tenantId: 1 }
  });
  assert.equal(otpRes.transaction.authorizationType, 'PHONE_PROMPT');

  // 3. Invalid webhook signature MUST be rejected
  const webhookBodyObj = {
    event: 'charge.success',
    data: {
      id: 987654,
      reference: ref,
      amount: partialAmt * 100,
      currency: 'GHS'
    }
  };
  const rawWebhookBody = JSON.stringify(webhookBodyObj);
  await assert.rejects(
    () => paymentsService.handleWebhook({
      gateway: GATEWAYS.PAYSTACK,
      rawBody: rawWebhookBody,
      headers: { 'x-paystack-signature': 'deadbeef_invalid' },
      payload: webhookBodyObj
    }),
    /Invalid webhook signature/i
  );

  // 4. Valid HMAC-SHA512 webhook settles payment atomically & issues receipt
  const validSig = crypto.createHmac('sha512', process.env.PAYSTACK_SECRET_KEY).update(rawWebhookBody).digest('hex');
  const whRes = await paymentsService.handleWebhook({
    gateway: GATEWAYS.PAYSTACK,
    rawBody: rawWebhookBody,
    headers: { 'x-paystack-signature': validSig },
    payload: webhookBodyObj
  });
  assert.equal(whRes.status, 'PROCESSED');
  assert.equal(whRes.transactionStatus, TRANSACTION_STATES.SUCCESSFUL);
  assert.ok(whRes.receiptNumber);

  // Balance reduced exact amount ONCE
  const afterFirst = await paymentsService.getStudentFeeStatement({ tenantId: 1, studentIdentifier: '3' });
  assert.equal(afterFirst.feeSummary.outstandingBalance, Number((initialDue - partialAmt).toFixed(2)));

  // 5. Duplicate webhook MUST be ignored and MUST NOT double-credit balance
  const dupRes = await paymentsService.handleWebhook({
    gateway: GATEWAYS.PAYSTACK,
    rawBody: rawWebhookBody,
    headers: { 'x-paystack-signature': validSig },
    payload: webhookBodyObj
  });
  assert.equal(dupRes.status, 'IGNORED_DUPLICATE');
  const afterDup = await paymentsService.getStudentFeeStatement({ tenantId: 1, studentIdentifier: '3' });
  assert.equal(afterDup.feeSummary.outstandingBalance, Number((initialDue - partialAmt).toFixed(2)));

  // 6. Test refund/reversal accounting restoration
  const refundRes = await paymentsService.adminManualOrBankReconcile({
    tenantId: 1,
    reference: ref,
    action: 'REFUND',
    reason: 'Duplicate parent debit refunded',
    actorUserId: 5
  });
  assert.equal(refundRes.transaction.gatewayStatus, TRANSACTION_STATES.REFUNDED);
  const afterRefund = await paymentsService.getStudentFeeStatement({ tenantId: 1, studentIdentifier: '3' });
  assert.equal(afterRefund.feeSummary.outstandingBalance, initialDue);

  // 7. Test amount mismatch flags UNDER_REVIEW and does not settle balance
  verifyAmountMinor = 500; // GHS 5.00 vs 200.00 expected!
  const hostedInit = await paymentsService.initiatePayment({
    tenantId: 1,
    requestingUser: { id: 4, role: 'PARENT', tenantId: 1 },
    body: {
      studentId: 3,
      invoiceId: openInv.id,
      amount: partialAmt,
      gateway: GATEWAYS.PAYSTACK,
      channel: CHANNELS.VISA
    }
  });
  assert.equal(hostedInit.transaction.authorizationType, 'REDIRECT');
  assert.ok(hostedInit.transaction.authorizationUrl.includes('checkout.paystack.com'));

  const mismatchVerify = await paymentsService.verifyTransactionStatus({
    tenantId: 1,
    reference: hostedInit.transaction.reference,
    userId: 4
  });
  assert.equal(mismatchVerify.transaction.gatewayStatus, TRANSACTION_STATES.UNDER_REVIEW);
  const afterMismatch = await paymentsService.getStudentFeeStatement({ tenantId: 1, studentIdentifier: '3' });
  assert.equal(afterMismatch.feeSummary.outstandingBalance, initialDue);

  delete process.env.PAYSTACK_SECRET_KEY;
});

test('Hubtel Adapter hosted checkout + Status API verification + Sandbox fallback & cancel flow', async () => {
  process.env.HUBTEL_CLIENT_ID = 'hub_cid_mock';
  process.env.HUBTEL_CLIENT_SECRET = 'hub_sec_mock';
  process.env.HUBTEL_MERCHANT_ACCOUNT_NUMBER = '2019988';

  await paymentsService.upsertTenantGatewayConfig(1, GATEWAYS.HUBTEL, {
    mode: 'TEST',
    isEnabled: true,
    hubtelMerchantAccount: '2019988',
    supportsMtnMomo: true,
    supportsVisa: true
  }, 1);

  const mockHubtel = new HubtelAdapter({
    fetchImpl: async (url, init) => {
      if (url.includes('/items/initiate')) {
        const body = JSON.parse(init.body);
        assert.equal(body.merchantAccountNumber, '2019988');
        return {
          ok: true,
          status: 200,
          json: async () => ({
            responseCode: '0000',
            data: {
              checkoutId: 'hub_chk_777',
              checkoutUrl: `https://pay.hubtel.com/${body.clientReference}`
            }
          })
        };
      }
      if (url.includes('/status')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            responseCode: '0000',
            data: {
              clientReference: new URL(url).searchParams.get('clientReference'),
              transactionId: 'HUBTXN-999',
              status: 'Unpaid',
              amount: 150,
              currency: 'GHS'
            }
          })
        };
      }
      throw new Error(`Unexpected Hubtel URL: ${url}`);
    }
  });
  registerAdapterOverride(GATEWAYS.HUBTEL, mockHubtel);

  const statementBefore = await paymentsService.getStudentFeeStatement({ tenantId: 1, studentIdentifier: '3' });
  const due = statementBefore.feeSummary.outstandingBalance;

  const hubInit = await paymentsService.initiatePayment({
    tenantId: 1,
    requestingUser: { id: 3, role: 'STUDENT', tenantId: 1 },
    body: {
      studentId: 3,
      amount: Math.min(150, due),
      gateway: GATEWAYS.HUBTEL,
      channel: CHANNELS.MTN_MOMO,
      payerPhone: '0244119201'
    }
  });
  assert.equal(hubInit.transaction.authorizationType, 'REDIRECT');
  assert.ok(hubInit.transaction.authorizationUrl.startsWith('https://pay.hubtel.com/'));

  // Even after return URL / verify check, Unpaid MUST NOT mark successful
  const unpaidCheck = await paymentsService.verifyTransactionStatus({
    tenantId: 1,
    reference: hubInit.transaction.reference,
    userId: 3
  });
  assert.equal(unpaidCheck.transaction.gatewayStatus, TRANSACTION_STATES.PROCESSING);

  // Fallback from Hubtel redirect to Sandbox PSP + signed Sandbox Webhook settles cleanly
  const fallbackRes = await paymentsService.switchToFallbackMethod({
    tenantId: 1,
    reference: hubInit.transaction.reference,
    newGateway: GATEWAYS.SANDBOX_PSP,
    newChannel: CHANNELS.TELECEL_CASH,
    payerPhone: '0501234567',
    preferHostedCheckout: true,
    requestingUser: { id: 3, role: 'STUDENT', tenantId: 1 },
    originUrl: 'http://localhost:5001'
  });

  // Original Hubtel tx should now be CANCELLED
  const oldTxRow = await prisma.paymentTransaction.findFirst({ where: { reference: hubInit.transaction.reference } });
  assert.equal(oldTxRow.gatewayStatus, TRANSACTION_STATES.CANCELLED);
  assert.equal(fallbackRes.transaction.gateway, GATEWAYS.SANDBOX_PSP);

  // Confirm sandbox webhook & verify financial report increments
  const sbxConfirm = await paymentsService.triggerSandboxConfirmation({
    reference: fallbackRes.transaction.reference,
    outcome: 'SUCCESSFUL'
  });
  assert.equal(sbxConfirm.transactionStatus, TRANSACTION_STATES.SUCCESSFUL);

  const report = await paymentsService.getFinancialReports(1, { period: 'MONTHLY' });
  assert.ok(report.summary.successfulCount >= 1);
  assert.ok(report.summary.totalCollected >= 150);

  delete process.env.HUBTEL_CLIENT_ID;
  delete process.env.HUBTEL_CLIENT_SECRET;
  delete process.env.HUBTEL_MERCHANT_ACCOUNT_NUMBER;
});

test('Expired transaction timeout & missing-webhook reconciliation recovery', async () => {
  const statementBefore = await paymentsService.getStudentFeeStatement({ tenantId: 1, studentIdentifier: '3' });
  const due = statementBefore.feeSummary.outstandingBalance;
  const amt = Math.max(statementBefore.feeSummary.minimumPayableAmount, Math.min(100, due));

  const txInit = await paymentsService.initiatePayment({
    tenantId: 1,
    requestingUser: { id: 3, role: 'STUDENT', tenantId: 1 },
    body: {
      studentId: 3,
      amount: amt,
      gateway: GATEWAYS.SANDBOX_PSP,
      channel: CHANNELS.AT_MONEY,
      payerPhone: '0277654321'
    }
  });
  const ref = txInit.transaction.reference;

  // 1. Force expiry timestamp into past to test EXPIRED transition
  await prisma.paymentTransaction.update({
    where: { id: txInit.transaction.id },
    data: { expiresAt: new Date(Date.now() - 60000) }
  });
  const expiredRes = await paymentsService.verifyTransactionStatus({ tenantId: 1, reference: ref, userId: 3 });
  assert.equal(expiredRes.transaction.gatewayStatus, TRANSACTION_STATES.EXPIRED);

  // 2. Start a second transaction, mark confirmed on sandbox provider directly and run reconcilePendingTransactions
  const tx2Init = await paymentsService.initiatePayment({
    tenantId: 1,
    requestingUser: { id: 3, role: 'STUDENT', tenantId: 1 },
    body: {
      studentId: 3,
      amount: amt,
      gateway: GATEWAYS.SANDBOX_PSP,
      channel: CHANNELS.MTN_MOMO,
      payerPhone: '0244119201'
    }
  });
  const batchRes = await paymentsService.reconcilePendingTransactions(1);
  assert.ok(batchRes.checked >= 1);
  assert.ok(batchRes.reconciled.some((r) => r.reference === tx2Init.transaction.reference));
});
