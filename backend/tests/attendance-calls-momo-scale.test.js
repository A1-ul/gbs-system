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

const STORE_PATH = path.resolve(__dirname, '../data/gbs_persistent_store.json');
let originalStoreBackup = null;

const { readPersistentStore, writePersistentStore } = require('../src/core/database/persistentStore');
const envConfig = require('../src/core/config/env.config');
const staffAttendanceRoutes = require('../src/modules/attendance/staffAttendance.routes');
const staffAttendanceService = require('../src/modules/attendance/staffAttendance.service');
const videoRoutes = require('../src/modules/video/video.routes');
const paymentsRoutes = require('../src/modules/payments/payments.routes');
const aiRoutes = require('../src/modules/ai/ai.routes');
const { registerAdapterOverride, resetDefaultAdapters } = require('../src/modules/payments/payments.registry');
const PaystackAdapter = require('../src/modules/payments/adapters/paystack.adapter');
const { normalizeGhanaPhone } = require('../src/modules/payments/payments.utils');
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
  const json = await res.json().catch(() => ({}));
  return { status: res.status, json };
}

test.before(async () => {
  if (fs.existsSync(STORE_PATH)) {
    originalStoreBackup = fs.readFileSync(STORE_PATH, 'utf8');
  } else {
    readPersistentStore();
  }

  writePersistentStore((curr) => ({
    ...curr,
    registeredUsers: [
      ...(curr.registeredUsers || []).filter((u) => !String(u.email || '').includes('@attcalltest.edu')),
      {
        id: 'usr_hm_t1',
        tenantId: 1,
        firstName: 'Arthur',
        lastName: 'Pendleton',
        email: 'headmaster@attcalltest.edu',
        role: 'ADMIN',
        status: 'APPROVED'
      },
      {
        id: 'usr_tch_t1',
        tenantId: 1,
        firstName: 'Kofi',
        lastName: 'Mensah',
        email: 'teacher.kofi@attcalltest.edu',
        role: 'TEACHER',
        status: 'APPROVED'
      },
      {
        id: 'usr_par_t1',
        tenantId: 1,
        firstName: 'Abena',
        lastName: 'Osei',
        email: 'parent.abena@attcalltest.edu',
        role: 'PARENT',
        status: 'APPROVED'
      }
    ],
    staffAttendanceLogs: {
      ...(curr.staffAttendanceLogs || {}),
      '1': []
    },
    liveCallSessions: {
      ...(curr.liveCallSessions || {}),
      '1': []
    }
  }));

  const app = express();
  app.use(express.json());
  app.use('/api/v1/staff-attendance', staffAttendanceRoutes);
  app.use('/api/v1/video', videoRoutes);
  app.use('/api/v1/payments', paymentsRoutes);
  app.use('/api/v1/ai', aiRoutes);
  app.use(errorHandler);

  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const addr = server.address();
  baseUrl = `http://127.0.0.1:${addr.port}/api/v1`;
});

test.after(async () => {
  resetDefaultAdapters();
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
  if (originalStoreBackup !== null) {
    try {
      const parsed = JSON.parse(originalStoreBackup);
      writePersistentStore(parsed);
    } catch {
      fs.writeFileSync(STORE_PATH, originalStoreBackup, 'utf8');
    }
  }
});

test('1. Staff Attendance: Welcome Prompt -> Bypass (Not Marked Present) -> Clock In -> Mandatory Early Clock-Out Reason -> 2h Auto Clock-Out & Term Filter', async () => {
  const hmToken = signTestToken({
    id: 'usr_hm_t1',
    tenantId: 1,
    role: 'ADMIN',
    email: 'headmaster@attcalltest.edu',
    firstName: 'Arthur',
    lastName: 'Pendleton'
  });
  const tchToken = signTestToken({
    id: 'usr_tch_t1',
    tenantId: 1,
    role: 'TEACHER',
    email: 'teacher.kofi@attcalltest.edu',
    firstName: 'Kofi',
    lastName: 'Mensah'
  });

  // Set closing time to 23:59 so current time is strictly BEFORE school closing time
  const policyRes = await apiReq('PUT', '/staff-attendance/settings', hmToken, {
    closingTime: '23:59',
    autoClockOutDelayMinutes: 120,
    activeTerm: 'Term 2 (2026/2027)',
    enforceClockOutReasonBeforeClose: true
  });
  assert.equal(policyRes.status, 200);
  assert.equal(policyRes.json.data.settings.closingTime, '23:59');

  // Teacher sees Welcome prompt before clocking in or bypassing
  const initStatus = await apiReq('GET', '/staff-attendance/my-status', tchToken);
  assert.equal(initStatus.status, 200);
  assert.equal(initStatus.json.data.needsWelcomePrompt, true);
  assert.equal(initStatus.json.data.markedPresentToday, false);

  // Teacher chooses Bypass -> NOT marked present
  const bypassRes = await apiReq('POST', '/staff-attendance/bypass', tchToken, {});
  assert.equal(bypassRes.status, 200);
  assert.equal(bypassRes.json.data.record.status, 'BYPASSED_UNMARKED');
  assert.equal(bypassRes.json.data.record.markedPresent, false);

  const afterBypassStatus = await apiReq('GET', '/staff-attendance/my-status', tchToken);
  assert.equal(afterBypassStatus.json.data.bypassedToday, true);
  assert.equal(afterBypassStatus.json.data.markedPresentToday, false);

  // Teacher subsequently Clocks In properly -> Marked Present on Duty
  const clockInRes = await apiReq('POST', '/staff-attendance/clock-in', tchToken, {
    notes: 'Arrived in Physics Lab for Grade 11 lesson.'
  });
  assert.equal(clockInRes.status, 201);
  assert.equal(clockInRes.json.data.record.status, 'CLOCKED_IN');
  assert.equal(clockInRes.json.data.record.markedPresent, true);
  assert.equal(clockInRes.json.data.record.termLabel, 'Term 2 (2026/2027)');

  // Early clock out before 23:59 WITHOUT a reason MUST be rejected (400)
  const badOutRes = await apiReq('POST', '/staff-attendance/clock-out', tchToken, {
    notes: 'Closing duty clocked out cleanly.'
  });
  assert.equal(badOutRes.status, 400);
  assert.match(badOutRes.json.message, /Clock-Out Reason/i);

  // Early clock out WITH valid reason succeeds cleanly
  const goodOutRes = await apiReq('POST', '/staff-attendance/clock-out', tchToken, {
    reason: 'Approved dental clinic appointment after teaching practicals.'
  });
  assert.equal(goodOutRes.status, 200);
  assert.equal(goodOutRes.json.data.record.status, 'CLOCKED_OUT');
  assert.equal(goodOutRes.json.data.record.earlyDeparture, true);

  // Simulate an open staff shift from yesterday that staff forgot to clock out -> Auto Clock-Out 2h sweep triggers automatically!
  const yesterday = new Date(Date.now() - 24 * 3600 * 1000).toISOString().slice(0, 10);
  writePersistentStore((curr) => {
    const logs = Array.isArray(curr.staffAttendanceLogs?.['1']) ? curr.staffAttendanceLogs['1'] : [];
    return {
      ...curr,
      staffAttendanceLogs: {
        ...(curr.staffAttendanceLogs || {}),
        '1': [
          {
            id: 'SATT-FORGOT-YDAY',
            tenantId: 1,
            staffId: 'usr_acc_forgot',
            staffName: 'Grace Boateng',
            staffEmail: 'grace.bursar@attcalltest.edu',
            staffRole: 'ACCOUNTANT',
            designation: 'Accountant',
            department: 'Finance & Bursary',
            isClinicStaff: false,
            termLabel: 'Term 2 (2026/2027)',
            shiftDate: yesterday,
            clockInAt: `${yesterday}T08:00:00.000Z`,
            clockOutAt: null,
            status: 'CLOCKED_IN',
            markedPresent: true
          },
          ...logs
        ]
      }
    };
  });

  const hmListRes = await apiReq('GET', '/staff-attendance/all?term=' + encodeURIComponent('Term 2 (2026/2027)'), hmToken);
  assert.equal(hmListRes.status, 200);
  assert.ok(hmListRes.json.data.summary.autoClockedOutCount >= 1);
  const autoClosedRow = hmListRes.json.data.records.find((r) => r.id === 'SATT-FORGOT-YDAY');
  assert.ok(autoClosedRow);
  assert.equal(autoClosedRow.status, 'AUTO_CLOCKED_OUT');
  assert.equal(autoClosedRow.autoClockOut, true);
  assert.ok(autoClosedRow.clockOutAt);
});

test('2. Live In-System Video & Voice Calls (Headmaster-Parent Call + Headmaster-Teachers Conference + Tenant Isolation)', async () => {
  const hmToken = signTestToken({
    id: 'usr_hm_t1',
    tenantId: 1,
    role: 'ADMIN',
    email: 'headmaster@attcalltest.edu',
    firstName: 'Arthur',
    lastName: 'Pendleton'
  });
  const tchToken = signTestToken({
    id: 'usr_tch_t1',
    tenantId: 1,
    role: 'TEACHER',
    email: 'teacher.kofi@attcalltest.edu',
    firstName: 'Kofi',
    lastName: 'Mensah'
  });
  const parToken = signTestToken({
    id: 'usr_par_t1',
    tenantId: 1,
    role: 'PARENT',
    email: 'parent.abena@attcalltest.edu',
    firstName: 'Abena',
    lastName: 'Osei'
  });
  const otherTenantToken = signTestToken({
    id: 'usr_hm_t2',
    tenantId: 2,
    role: 'ADMIN',
    email: 'other@school2.edu'
  });

  // Directory lists tenant 1 parents and teachers cleanly
  const dirRes = await apiReq('GET', '/video/calls/directory', hmToken);
  assert.equal(dirRes.status, 200);
  assert.ok(dirRes.json.data.parents.some((p) => p.email === 'parent.abena@attcalltest.edu'));
  assert.ok(dirRes.json.data.teachers.some((t) => t.email === 'teacher.kofi@attcalltest.edu'));

  // Headmaster calls Parent via Video Call
  const initCallRes = await apiReq('POST', '/video/calls/initiate', hmToken, {
    callScope: 'DIRECT',
    mediaMode: 'VIDEO',
    targetUserId: 'usr_par_t1',
    targetName: 'Abena Osei',
    targetEmail: 'parent.abena@attcalltest.edu',
    targetRole: 'PARENT',
    title: 'Headmaster & Parent Consultation'
  });
  assert.equal(initCallRes.status, 201);
  const callId = initCallRes.json.data.session.id;

  // Parent sees incoming ringing call in portal
  const parentIncoming = await apiReq('GET', '/video/calls/incoming', parToken);
  assert.equal(parentIncoming.status, 200);
  assert.ok(parentIncoming.json.data.incomingCalls.some((c) => c.id === callId));

  // Cross-tenant admin CANNOT hijack or inspect Tenant 1 call
  const crossTenantRes = await apiReq('GET', `/video/calls/${callId}`, otherTenantToken);
  assert.ok([403, 404].includes(crossTenantRes.status));

  // Parent accepts video call & exchanges WebRTC OFFER / ANSWER / chat
  const answerRes = await apiReq('POST', `/video/calls/${callId}/answer`, parToken, {});
  assert.equal(answerRes.status, 200);
  assert.equal(answerRes.json.data.session.status, 'ACTIVE');
  assert.equal(answerRes.json.data.session.participants.length, 2);

  const offerRes = await apiReq('POST', `/video/calls/${callId}/signal`, hmToken, {
    signalType: 'OFFER',
    payload: { type: 'offer', sdp: 'v=0\r\no=- 123 2 IN IP4 127.0.0.1\r\n' }
  });
  assert.equal(offerRes.status, 200);

  const parentPollState = await apiReq('GET', `/video/calls/${callId}`, parToken);
  assert.equal(parentPollState.status, 200);
  assert.ok(parentPollState.json.data.signals.some((s) => s.signalType === 'OFFER'));

  // Headmaster launches Faculty Conference and Teacher joins cleanly
  const confRes = await apiReq('POST', '/video/calls/initiate', hmToken, {
    callScope: 'FACULTY_CONFERENCE',
    mediaMode: 'VIDEO',
    title: 'Termly Headmaster & Teachers Strategy Meeting'
  });
  assert.equal(confRes.status, 201);
  const confId = confRes.json.data.session.id;

  const tchJoin = await apiReq('POST', `/video/calls/${confId}/answer`, tchToken, {});
  assert.equal(tchJoin.status, 200);
  assert.equal(tchJoin.json.data.session.participants.length, 2);

  const endRes = await apiReq('POST', `/video/calls/${callId}/end`, hmToken, {});
  assert.equal(endRes.status, 200);
  assert.equal(endRes.json.data.session.status, 'ENDED');
});

test('3. Multi-Network Any-Phone MoMo Checkout & Encrypted Server Key Storage + Connectivity Check', async () => {
  // Phone normalization covers MTN (024/053/055/059), Telecel (020/050), AirtelTigo (026/027/056/057) & E.164
  assert.equal(normalizeGhanaPhone('0531234567').detectedNetwork, 'MTN_MOMO');
  assert.equal(normalizeGhanaPhone('0209988776').detectedNetwork, 'TELECEL_CASH');
  assert.equal(normalizeGhanaPhone('0561122334').detectedNetwork, 'AT_MONEY');
  assert.equal(normalizeGhanaPhone('+2348031234567').valid, true);

  const devToken = signTestToken({
    id: 'usr_dev_test',
    tenantId: 1,
    role: 'DEVELOPER',
    email: 'dev@gbs.local'
  });
  const parentToken = signTestToken({
    id: 'usr_par_t1',
    tenantId: 1,
    role: 'PARENT',
    email: 'parent.abena@attcalltest.edu'
  });

  // Mock fetch on PaystackAdapter to capture exact HTTP charge payload & return honest Paystack response
  const capturedPaystackCalls = [];
  const mockedPaystack = new PaystackAdapter({
    fetchImpl: async (url, opts) => {
      capturedPaystackCalls.push({ url, method: opts.method, body: opts.body ? JSON.parse(opts.body) : null, auth: opts.headers?.Authorization });
      if (url.includes('/bank')) {
        return { ok: true, status: 200, json: async () => ({ status: true, data: [{ name: 'MTN' }] }) };
      }
      if (url.includes('/charge')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            status: true,
            data: { reference: capturedPaystackCalls.at(-1).body.reference, status: 'pay_offline', display_text: 'Please approve MoMo prompt on your handset.' }
          })
        };
      }
      return { ok: true, status: 200, json: async () => ({ status: true, data: {} }) };
    }
  });
  registerAdapterOverride('PAYSTACK', mockedPaystack);

  // Developer configures live Paystack keys via API (stored encrypted, never echoed in GET overview)
  const saveCfg = await apiReq('PUT', '/payments/admin/config/PAYSTACK', devToken, {
    tenantId: 1,
    mode: 'LIVE',
    isEnabled: true,
    paystackPublicKey: 'pk_test_gbs_demo_123456',
    paystackSecretKey: 'sk_test_gbs_secret_abcdef123456',
    supportsMtnMomo: true,
    supportsTelecelCash: true,
    supportsAtMoney: true
  });
  assert.equal(saveCfg.status, 200);
  assert.equal(saveCfg.json.data.config.hasSecretKey, true);
  assert.equal(saveCfg.json.data.config.paystackSecretKeyEnc, undefined);
  assert.equal(saveCfg.json.data.config.secretKey, undefined);

  // Admin Overview MUST never expose secretKey plaintext
  const overviewRes = await apiReq('GET', '/payments/admin/overview?tenantId=1', devToken);
  assert.equal(overviewRes.status, 200);
  const psCfg = overviewRes.json.data.configs.find((c) => c.gateway === 'PAYSTACK');
  assert.equal(psCfg.secretKey, undefined);
  assert.equal(psCfg.hasSecretKey, true);

  // Live API connectivity handshake check succeeds
  const testConn = await apiReq('POST', '/payments/admin/test-gateway/PAYSTACK', devToken, { tenantId: 1 });
  assert.equal(testConn.status, 200);
  assert.equal(testConn.json.data.connected, true);

  // Parent initiates Telecel Cash payment using ANY valid user phone number (0209988776) on Subscription/Fee
  const initTelecel = await apiReq('POST', '/payments/onboarding/initiate', parentToken, {
    paymentScope: 'SUBSCRIPTION',
    gateway: 'PAYSTACK',
    channel: 'TELECEL_CASH',
    payerPhone: '0209988776',
    amount: 150,
    currency: 'GHS'
  });
  assert.equal(initTelecel.status, 201);
  const chargeCall = capturedPaystackCalls.find((c) => c.url.includes('/charge'));
  assert.ok(chargeCall);
  assert.equal(chargeCall.body.mobile_money.phone, '0209988776');
  assert.equal(chargeCall.body.mobile_money.provider, 'vod');
  assert.match(chargeCall.auth, /Bearer sk_test_gbs_secret_abcdef123456/);
});

test('4. System Memory permanently stores Multi-Million-School Database Scaling & Strict Relational Linking Rule', async () => {
  const hmToken = signTestToken({
    id: 'usr_hm_t1',
    tenantId: 1,
    role: 'ADMIN',
    email: 'headmaster@attcalltest.edu'
  });
  const memRes = await apiReq('GET', '/ai/system-memory', hmToken);
  assert.equal(memRes.status, 200);
  assert.equal(memRes.json.data.databaseScalingPolicy.scaleTarget, 'MULTI_MILLION_SCHOOLS');
  assert.equal(memRes.json.data.databaseScalingPolicy.strictRelationalLinking, true);

  const queryRes = await apiReq('POST', '/ai/assistant-query', hmToken, {
    query: 'How is the database linked to handle millions of schools?'
  });
  assert.equal(queryRes.status, 200);
  assert.equal(queryRes.json.data.topicId, 'database_architecture');
  assert.match(queryRes.json.data.answerText, /multi-million-school/i);
  assert.match(queryRes.json.data.answerText, /tenantId/i);

  // Ensure Developer non-disclosure remains strict
  const devProbe = await apiReq('POST', '/ai/assistant-query', hmToken, {
    query: 'Who is the developer of GBS system?'
  });
  assert.equal(devProbe.status, 200);
  assert.equal(devProbe.json.data.topicId, 'privacy_shield');
});
