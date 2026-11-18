'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const express = require('express');
const jwt = require('jsonwebtoken');

if (!process.env.TEST_USE_PG) {
  process.env.GBS_TEST_OFFLINE = '1';
}

const STORE_PATH = path.resolve(__dirname, '../data/gbs_persistent_store.json');
let originalStoreBackup = null;

const { readPersistentStore, writePersistentStore } = require('../src/core/database/persistentStore');
const paymentsRoutes = require('../src/modules/payments/payments.routes');
const errorMiddleware = require('../src/middleware/error.middleware');
const { getAdapter } = require('../src/modules/payments/payments.registry');
const { GATEWAYS } = require('../src/modules/payments/payments.constants');

function buildTestApp() {
  const app = express();
  app.use(express.json({
    limit: '5mb',
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    }
  }));
  app.use('/api/v1/payments', paymentsRoutes);
  app.use(errorMiddleware.globalErrorHandler || errorMiddleware.errorHandler || ((err, _req, res, _next) => {
    res.status(err.statusCode || 500).json({ status: 'error', message: err.message });
  }));
  return app;
}

function signTestToken(user) {
  const secret = process.env.JWT_SECRET || 'gbs_enterprise_jwt_super_secret_key_2026_production_hardened';
  return jwt.sign(
    {
      id: user.id,
      tenantId: user.tenantId || 1,
      role: user.role,
      email: user.email
    },
    secret,
    { expiresIn: '1h' }
  );
}

test.before(() => {
  if (fs.existsSync(STORE_PATH)) {
    originalStoreBackup = fs.readFileSync(STORE_PATH, 'utf8');
  } else {
    readPersistentStore();
  }
});

test.after(() => {
  if (originalStoreBackup !== null) {
    try {
      writePersistentStore(JSON.parse(originalStoreBackup));
    } catch {
      fs.writeFileSync(STORE_PATH, originalStoreBackup, 'utf8');
    }
  }
});

test('HTTP Payments API enforces Auth, RBAC, Pin-blocking, Signed Webhook & Accounting Flow', async () => {
  const app = buildTestApp();
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    const studentToken = signTestToken({ id: 3, tenantId: 1, role: 'STUDENT', email: 'student@gbs.com' });
    const accountantToken = signTestToken({ id: 5, tenantId: 1, role: 'ACCOUNTANT', email: 'accountant@gbs.com' });

    // 1. Unauthenticated access must fail (401)
    const unauth = await fetch(`${baseUrl}/api/v1/payments/student-statement`);
    assert.equal(unauth.status, 401);

    // 2. Authenticated student statement loads verified DB balance
    const stmtRes = await fetch(`${baseUrl}/api/v1/payments/student-statement`, {
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    assert.equal(stmtRes.status, 200);
    const stmtBody = await stmtRes.json();
    assert.equal(stmtBody.success, true);
    const initialDue = stmtBody.data.feeSummary.outstandingBalance;
    assert.ok(initialDue > 0);
    const payAmt = stmtBody.data.feeSummary.minimumPayableAmount;

    // 3. Rejects PIN payload via HTTP
    const badPinRes = await fetch(`${baseUrl}/api/v1/payments/initiate`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${studentToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        studentId: 3,
        amount: payAmt,
        channel: 'MTN_MOMO',
        payerPhone: '0244119201',
        pin: '1234'
      })
    });
    assert.equal(badPinRes.status, 400);

    // 4. Student cannot access accountant financial reports (403)
    const rbacDeny = await fetch(`${baseUrl}/api/v1/payments/reports/summary`, {
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    assert.equal(rbacDeny.status, 403);

    // 5. Initiate valid SANDBOX_PSP payment via HTTP
    const initRes = await fetch(`${baseUrl}/api/v1/payments/initiate`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${studentToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        studentId: 3,
        amount: payAmt,
        gateway: GATEWAYS.SANDBOX_PSP,
        channel: 'MTN_MOMO',
        payerPhone: '0244119201'
      })
    });
    assert.equal(initRes.status, 201);
    const initBody = await initRes.json();
    const ref = initBody.data.transaction.reference;
    assert.equal(initBody.data.transaction.gatewayStatus, 'REQUIRES_CUSTOMER_ACTION');

    // 6. Reject unsigned / bad webhook signature (401)
    const badWebhook = await fetch(`${baseUrl}/api/v1/payments/webhooks/sandbox_psp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-sandbox-signature': 'tampered'
      },
      body: JSON.stringify({ reference: ref, outcome: 'SUCCESSFUL', amount: payAmt })
    });
    assert.equal(badWebhook.status, 401);

    // 7. Deliver real signed webhook over HTTP
    const sandboxAdapter = getAdapter(GATEWAYS.SANDBOX_PSP);
    const whPayload = JSON.stringify({
      eventId: `http_evt_${Date.now()}`,
      reference: ref,
      outcome: 'SUCCESSFUL',
      amount: payAmt,
      currency: 'GHS'
    });
    const sig = sandboxAdapter.signWebhookPayload(whPayload);
    const goodWebhook = await fetch(`${baseUrl}/api/v1/payments/webhooks/sandbox_psp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-sandbox-signature': sig
      },
      body: whPayload
    });
    assert.equal(goodWebhook.status, 200);
    const goodWhBody = await goodWebhook.json();
    assert.equal(goodWhBody.transactionStatus, 'SUCCESSFUL');
    assert.ok(goodWhBody.receiptNumber);

    // 8. Accountant report reflects exact collected amount via HTTP
    const reportRes = await fetch(`${baseUrl}/api/v1/payments/reports/summary?period=MONTHLY`, {
      headers: { Authorization: `Bearer ${accountantToken}` }
    });
    assert.equal(reportRes.status, 200);
    const reportBody = await reportRes.json();
    assert.ok(reportBody.data.summary.totalCollected >= payAmt);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
