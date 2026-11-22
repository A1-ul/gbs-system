'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const express = require('express');
const jwt = require('jsonwebtoken');

if (!process.env.TEST_USE_PG) {
  process.env.GBS_TEST_OFFLINE = '1';
}
process.env.GBS_NO_LISTEN = '1';

const STORE_PATH = path.resolve(__dirname, '../data/gbs_persistent_store.json');
let originalStoreBackup = null;

const envConfig = require('../src/core/config/env.config');
const authRoutes = require('../src/modules/auth/auth.routes');
const stationeryRoutes = require('../src/modules/stationery/stationery.routes');
const secretaryRoutes = require('../src/modules/secretary/secretary.routes');
const financeRoutes = require('../src/modules/finance/finance.routes');
const videoRoutes = require('../src/modules/video/video.routes');
const aiRoutes = require('../src/modules/ai/ai.routes');
const devControlService = require('../src/modules/dev-control/devControl.service');
const authService = require('../src/modules/auth/auth.service');
const { errorHandler } = require('../src/middleware/error.middleware');

let server;
let baseUrl;

function signTestToken(userPayload) {
  return jwt.sign(
    {
      id: userPayload.id,
      tenantId: userPayload.tenantId || 1,
      role: userPayload.role,
      email: userPayload.email,
      firstName: userPayload.firstName || 'Test',
      lastName: userPayload.lastName || 'User'
    },
    envConfig.jwt.secret,
    { expiresIn: '2h' }
  );
}

async function apiReq(method, urlPath, token, body = null, headers = {}) {
  const res = await fetch(`${baseUrl}${urlPath}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers
    },
    body: body ? JSON.stringify(body) : undefined
  });
  const text = await res.text();
  let json = {};
  try {
    json = JSON.parse(text);
  } catch { }
  return { status: res.status, headers: res.headers, text, json };
}

test.before(async () => {
  try {
    originalStoreBackup = fs.readFileSync(STORE_PATH, 'utf8');
  } catch {
    originalStoreBackup = null;
  }

  // Mount real production routers cleanly including the Apple WebClip & subscription endpoints
  const mainApp = require('../src/core/server');
  await new Promise((resolve) => {
    server = http.createServer(mainApp);
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      baseUrl = `http://127.0.0.1:${addr.port}`;
      resolve();
    });
  });
});

test.after(async () => {
  await new Promise((resolve) => {
    if (server) server.close(resolve);
    else resolve();
  });
  if (originalStoreBackup !== null) {
    fs.writeFileSync(STORE_PATH, originalStoreBackup, 'utf8');
  }
});

test('1. Apple iOS/macOS WebClip (.mobileconfig) & Service Worker Version Ready', async () => {
  const versionRes = await apiReq('GET', '/api/v1/app-version');
  assert.equal(versionRes.status, 200);
  assert.equal(versionRes.json?.data?.swVersion, 'gbs-cache-v2026.21');
  assert.equal(versionRes.json?.data?.autoUpdateEnabled, true);

  const profileRes = await apiReq('GET', '/api/v1/app/ios-webclip.mobileconfig?origin=https://gbs-system.onrender.com');
  assert.equal(profileRes.status, 200);
  const cType = profileRes.headers.get('content-type') || '';
  assert.ok(cType.includes('apple-aspen-config'));
  assert.ok(profileRes.text.includes('<string>com.apple.webClip.managed</string>'));
  assert.ok(profileRes.text.includes('<string>https://gbs-system.onrender.com/</string>'));
});

test('2. 4-Month Term Free Trial (120 Days) & Term/Semester Rates (JHS 12, SHS 20, TVET 40, Uni 40)', async () => {
  const jhsTerm = await apiReq('POST', '/api/v1/subscriptions/calculate-and-subscribe', null, {
    institutionType: 'NURSERY_TO_JHS',
    studentCount: 100,
    subscriptionPlan: '4_MONTHS',
    paymentScheduleMode: 'BULK_FULL_TERM'
  });
  assert.equal(jhsTerm.status, 201);
  assert.equal(jhsTerm.json.data.ratePerStudent, 3);
  assert.equal(jhsTerm.json.data.monthsSubscribed, 4);
  assert.equal(jhsTerm.json.data.totalTermFee, 1200); // 100 * 12

  const shsTerm = await apiReq('POST', '/api/v1/subscriptions/calculate-and-subscribe', null, {
    institutionType: 'SHS',
    studentCount: 100,
    subscriptionPlan: '4_MONTHS',
    paymentScheduleMode: 'BULK_FULL_TERM'
  });
  assert.equal(shsTerm.status, 201);
  assert.equal(shsTerm.json.data.ratePerStudent, 5);
  assert.equal(shsTerm.json.data.totalTermFee, 2000); // 100 * 20

  const tvetSem = await apiReq('POST', '/api/v1/subscriptions/calculate-and-subscribe', null, {
    institutionType: 'TECHNICAL',
    studentCount: 100,
    subscriptionPlan: '4_MONTHS',
    paymentScheduleMode: 'BULK_FULL_TERM'
  });
  assert.equal(tvetSem.status, 201);
  assert.equal(tvetSem.json.data.ratePerStudent, 10);
  assert.equal(tvetSem.json.data.totalTermFee, 4000); // 100 * 40

  const uniSem = await apiReq('POST', '/api/v1/subscriptions/calculate-and-subscribe', null, {
    institutionType: 'UNIVERSITY',
    studentCount: 100,
    subscriptionPlan: '4_MONTHS',
    paymentScheduleMode: 'BULK_FULL_TERM'
  });
  assert.equal(uniSem.status, 201);
  assert.equal(uniSem.json.data.ratePerStudent, 10);
  assert.equal(uniSem.json.data.totalTermFee, 4000); // 100 * 40

  // Free Trial onboarding & Developer Approval provisions 120 days (4-Month Term)
  const trialCalc = await apiReq('POST', '/api/v1/subscriptions/calculate-and-subscribe', null, {
    institutionType: 'TECHNICAL',
    studentCount: 250,
    subscriptionPlan: '4_MONTH_TRIAL'
  });
  assert.equal(trialCalc.status, 201);
  assert.equal(trialCalc.json.data.monthsSubscribed, 4);
  assert.equal(trialCalc.json.data.totalTermFee, 0);
  assert.equal(trialCalc.json.data.amountDueNow, 0);

  const regEmail = `tvet.trial.${Date.now()}@test.edu`;
  const regResult = await authService.registerInstitution({
    institutionName: `Takoradi Technical Trial ${Date.now()}`,
    institutionType: 'TECHNICAL',
    totalStudentsEnrolled: 200,
    adminName: 'Dr. Mensah Rector',
    adminEmail: regEmail,
    officialEmail: regEmail,
    officialPhone: '+233245550991',
    password: 'Password123!',
    subscriptionPlan: '4_MONTH_TRIAL',
    termsAccepted: true,
    privacyAccepted: true,
    dataProcessingConsent: true
  });
  assert.equal(regResult.registration.subscribedMonths, 4);
  assert.equal(regResult.registration.totalTermFee, 0);

  const approval = await devControlService.verifyAndApproveInstitution(regResult.registration.tenantUid);
  assert.ok(approval.subscription || approval.tenant);
  if (approval.subscription) {
    assert.ok(approval.subscription.planName.includes('4-Month'));
    const diffDays = Math.round((new Date(approval.subscription.endDate) - new Date(approval.subscription.startDate)) / 86400000);
    assert.ok(diffDays >= 119 && diffDays <= 121, `Expected ~120 trial days, got ${diffDays}`);
  }
});

test('3. School Stationery Headmaster-Only Pricing & Secretary Expense Auto-Sync to Accountant Ledger', async () => {
  const hmToken = signTestToken({ id: 1, tenantId: 1, role: 'ADMIN', email: 'admin@gbs.com', firstName: 'Kwame', lastName: 'Headmaster' });
  const secToken = signTestToken({ id: 'usr_secretary_master', tenantId: 1, role: 'SECRETARY', email: 'secretary@gbs.com', firstName: 'Evelyn', lastName: 'Secretary' });
  const accToken = signTestToken({ id: 5, tenantId: 1, role: 'ACCOUNTANT', email: 'accountant@gbs.com', firstName: 'David', lastName: 'Accountant' });
  const parentToken = signTestToken({ id: 4, tenantId: 1, role: 'PARENT', email: 'parent@gbs.com', firstName: 'Akua', lastName: 'Parent' });

  // Non-headmaster (Secretary / Accountant / Parent) MUST be blocked with 403 when trying to create or edit item price
  const secPriceAttempt = await apiReq('POST', '/api/v1/stationery/items', secToken, {
    name: 'Unauthorized Socks Price',
    category: 'SOCKS',
    unitPrice: 5
  });
  assert.equal(secPriceAttempt.status, 403);

  const accPriceAttempt = await apiReq('POST', '/api/v1/stationery/items', accToken, {
    name: 'Unauthorized Bag Price',
    category: 'SCHOOL_BAG',
    unitPrice: 120
  });
  assert.equal(accPriceAttempt.status, 403);

  // Headmaster publishes Textbook & School Socks with official unit price
  const hmCreate = await apiReq('POST', '/api/v1/stationery/items', hmToken, {
    name: 'GBS Official Cardigan & Textbook Bundle',
    category: 'CARDIGAN',
    unitPrice: 95.5,
    stockQty: 40,
    unitLabel: 'Set'
  });
  assert.equal(hmCreate.status, 201);
  const createdItem = hmCreate.json.data.item;
  assert.equal(createdItem.unitPrice, 95.5);

  // Secretary attempts to override price -> still 403
  const secEditPrice = await apiReq('PUT', `/api/v1/stationery/items/${createdItem.id}`, secToken, {
    unitPrice: 10
  });
  assert.equal(secEditPrice.status, 403);

  // Parent & Secretary both see the item system-wide with Headmaster fixed price
  const parentCatalog = await apiReq('GET', '/api/v1/stationery/items', parentToken);
  assert.equal(parentCatalog.status, 200);
  const visibleToParent = parentCatalog.json.data.items.find((i) => i.id === createdItem.id);
  assert.ok(visibleToParent);
  assert.equal(visibleToParent.unitPrice, 95.5);
  assert.equal(parentCatalog.json.data.canEditPrices, false);

  // Secretary records sale using authoritative Headmaster price (ignores forged price if sent)
  const saleRes = await apiReq('POST', '/api/v1/stationery/sales', secToken, {
    itemId: createdItem.id,
    quantity: 2,
    unitPrice: 1, // Must be ignored by server!
    buyerName: 'Abena Boateng',
    buyerClass: 'SHS 2'
  });
  assert.equal(saleRes.status, 201);
  assert.equal(saleRes.json.data.transaction.totalAmount, 191);
  assert.equal(saleRes.json.data.updatedItem.stockQty, 38);

  // Secretary logs stationery restock expense -> auto-syncs into Accountant Finance Expenses Ledger
  const uniqueExpTitle = `Cardigan Bulk Batch ${Date.now()}`;
  const expRes = await apiReq('POST', '/api/v1/stationery/expenses', secToken, {
    title: uniqueExpTitle,
    itemId: createdItem.id,
    quantity: 12,
    amount: 720,
    vendorName: 'Kumasi Knitwear Ltd'
  });
  assert.equal(expRes.status, 201);
  assert.equal(expRes.json.data.linkedExpense.category, 'STATIONERY_SUPPLIES');
  assert.equal(expRes.json.data.updatedItem.stockQty, 50);

  // Accountant verifies the stationery expense appears immediately in Finance Expenses Ledger & Audit
  const accExpenses = await apiReq('GET', '/api/v1/finance/expenses?category=STATIONERY_SUPPLIES', accToken);
  assert.equal(accExpenses.status, 200);
  const syncedRow = accExpenses.json.data.expenses.find((e) => e.title === uniqueExpTitle);
  assert.ok(syncedRow, 'Stationery expense must reflect on Accountant Finance Expenses Ledger immediately');
  assert.equal(syncedRow.amount, 720);

  const accAudit = await apiReq('GET', '/api/v1/stationery/audit', accToken);
  assert.equal(accAudit.status, 200);
  assert.ok(accAudit.json.data.linkedFinanceExpenses.some((e) => e.title === uniqueExpTitle));
});

test('4. School Secretary Authentication, Front-Office Portal API & Directory Integration', async () => {
  const loginRes = await apiReq('POST', '/api/v1/auth/login', null, {
    email: 'secretary@gbs.com',
    password: 'Secretary123!',
    portalRole: 'SECRETARY'
  });
  assert.equal(loginRes.status, 200);
  assert.equal(loginRes.json.data.user.role, 'SECRETARY');
  const secToken = loginRes.json.data.accessToken;

  const visCreate = await apiReq('POST', '/api/v1/secretary/records', secToken, {
    recordType: 'VISITOR_LOG',
    title: 'Inspector Mensah',
    counterpartyName: 'Inspector Mensah',
    phone: '+233201112233',
    purpose: 'WAEC Verification Visit'
  });
  assert.equal(visCreate.status, 201);
  const visId = visCreate.json.data.record.id;

  const checkoutRes = await apiReq('PATCH', `/api/v1/secretary/records/${visId}/status`, secToken, {
    status: 'CHECKED_OUT'
  });
  assert.equal(checkoutRes.status, 200);
  assert.equal(checkoutRes.json.data.record.status, 'CHECKED_OUT');

  const ovRes = await apiReq('GET', '/api/v1/secretary/overview', secToken);
  assert.equal(ovRes.status, 200);
  assert.ok(ovRes.json.data.summary.totalVisitorsLogged >= 1);

  const dirRes = await apiReq('GET', '/api/v1/video/calls/directory', secToken);
  assert.equal(dirRes.status, 200);
  assert.ok(Array.isArray(dirRes.json.data.contacts));
});

test('5. Live Video Conferencing SSE Push Stream Delivers Signals Without Polling Delay', async () => {
  const hmToken = signTestToken({ id: 1, tenantId: 1, role: 'ADMIN', email: 'hm.sse@school.edu', firstName: 'Headmaster' });
  const teaToken = signTestToken({ id: 2, tenantId: 1, role: 'TEACHER', email: 'tea.sse@school.edu', firstName: 'Teacher' });

  const initCall = await apiReq('POST', '/api/v1/video/calls/initiate', hmToken, {
    callScope: 'FACULTY_CONFERENCE',
    mediaMode: 'VIDEO',
    title: 'Fast 30FPS Staff Meeting'
  });
  assert.equal(initCall.status, 201);
  const callId = initCall.json.data.session.id;

  const controller = new AbortController();
  const sseResponse = await fetch(`${baseUrl}/api/v1/video/calls/${encodeURIComponent(callId)}/stream?token=${encodeURIComponent(teaToken)}`, {
    signal: controller.signal
  });
  assert.equal(sseResponse.status, 200);
  assert.ok((sseResponse.headers.get('content-type') || '').includes('text/event-stream'));

  const reader = sseResponse.body.getReader();
  const decoder = new TextDecoder();

  const { value: firstChunk } = await reader.read();
  const initialText = decoder.decode(firstChunk || new Uint8Array());
  assert.ok(initialText.includes('event: connected'));

  // Teacher or Headmaster posts signal and receives instant SSE push
  await apiReq('POST', `/api/v1/video/calls/${encodeURIComponent(callId)}/signal`, hmToken, {
    signalType: 'ICE_CANDIDATE',
    payload: { candidate: 'candidate:fast-sse-test' }
  });

  const { value: secondChunk } = await reader.read();
  const signalText = decoder.decode(secondChunk || new Uint8Array());
  assert.ok(signalText.includes('event: webrtc_signal'));
  assert.ok(signalText.includes('candidate:fast-sse-test'));

  controller.abort();
});

test('6. GBS AI Voice Assistant Answers Exact Portal, Teacher, Secretary, Stationery & Trial Queries', async () => {
  const teaToken = signTestToken({ id: 2, tenantId: 1, role: 'TEACHER', email: 'teacher@gbs.com' });

  const teacherRes = await apiReq('POST', '/api/v1/ai/assistant-query', teaToken, {
    query: 'i want to know about the teacher portal'
  });
  assert.equal(teacherRes.status, 200);
  assert.equal(teacherRes.json.data.topicId, 'role_teacher');
  assert.ok(teacherRes.json.data.answerText.includes('Teacher / Lecturer Portal'));
  assert.ok(teacherRes.json.data.answerText.includes('Class Topic Video Platform'));
  assert.ok(teacherRes.json.data.speechText.includes('How your question was formed:'));

  const secRes = await apiReq('POST', '/api/v1/ai/assistant-query', teaToken, {
    query: 'explain the school secretary portal and duties'
  });
  assert.equal(secRes.status, 200);
  assert.equal(secRes.json.data.topicId, 'role_secretary');
  assert.ok(secRes.json.data.answerText.includes('Visitor'));

  const statRes = await apiReq('POST', '/api/v1/ai/assistant-query', teaToken, {
    query: 'who sets the price for textbooks and cardigans in school stationery'
  });
  assert.equal(statRes.status, 200);
  assert.equal(statRes.json.data.topicId, 'school_stationery');
  assert.ok(statRes.json.data.answerText.includes('ONLY the Headmaster'));
  assert.ok(statRes.json.data.answerText.includes('Accountant Expenses Ledger'));

  const priceRes = await apiReq('POST', '/api/v1/ai/assistant-query', teaToken, {
    query: 'how much is tvet and university per semester and free trial'
  });
  assert.equal(priceRes.status, 200);
  assert.equal(priceRes.json.data.topicId, 'pricing');
  assert.ok(priceRes.json.data.answerText.includes('4-Month Full Term Free Trial'));
  assert.ok(priceRes.json.data.answerText.includes('40 per student per semester'));

  const shieldRes = await apiReq('POST', '/api/v1/ai/assistant-query', teaToken, {
    query: 'who is the developer of gbs'
  });
  assert.equal(shieldRes.status, 200);
  assert.equal(shieldRes.json.data.topicId, 'privacy_shield');
});
