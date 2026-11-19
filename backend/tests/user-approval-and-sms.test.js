'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const express = require('express');

if (!process.env.TEST_USE_PG) {
  process.env.GBS_TEST_OFFLINE = '1';
}

const STORE_PATH = path.resolve(__dirname, '../data/gbs_persistent_store.json');
let originalStoreBackup = null;

const { readPersistentStore, writePersistentStore } = require('../src/core/database/persistentStore');
const authRoutes = require('../src/modules/auth/auth.routes');
const userRoutes = require('../src/modules/user/user.routes');
const smsRoutes = require('../src/modules/sms/sms.routes');
const communicationRoutes = require('../src/modules/communication/communication.routes');
const devControlRoutes = require('../src/modules/dev-control/devControl.routes');
const errorMiddleware = require('../src/middleware/error.middleware');
const { rcceCentralErrorHandler } = require('../src/rcce/systemErrorHandler');

function buildApp() {
  const app = express();
  app.use(express.json({ limit: '5mb' }));
  app.use('/api/v1/auth', authRoutes);
  app.use('/api/v1/users', userRoutes);
  app.use('/api/v1/sms', smsRoutes);
  app.use('/api/v1/communication', communicationRoutes);
  app.use('/api/v1/dev-control', devControlRoutes);
  app.use(rcceCentralErrorHandler);
  return app;
}

async function reqJson(baseUrl, method, route, body = null, headers = {}) {
  const res = await fetch(`${baseUrl}${route}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...headers },
    body: body ? JSON.stringify(body) : undefined
  });
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }
  return { status: res.status, json };
}

test.before(() => {
  if (fs.existsSync(STORE_PATH)) {
    originalStoreBackup = fs.readFileSync(STORE_PATH, 'utf8');
  } else {
    readPersistentStore();
  }
  writePersistentStore((curr) => ({
    ...curr,
    registeredUsers: (curr.registeredUsers || []).filter((u) => !String(u.email || '').includes('stafftest_')),
    dispatchedSmsMessages: []
  }));
});

test.after(() => {
  if (originalStoreBackup !== null) {
    fs.writeFileSync(STORE_PATH, originalStoreBackup, 'utf8');
  }
});

test('Self-registered staff cannot log in without Headmaster approval (even with spoofed approvedByHeadmaster), appears in pending-staff, and unlocks role login once approved', async () => {
  const app = buildApp();
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}`;

  const testEmail = `stafftest_teacher_${Date.now()}@gbs.edu`;
  const rejectEmail = `stafftest_reject_${Date.now()}@gbs.edu`;

  try {
    // 1. Register new Teacher while attempting client-side pre-approval spoofing
    const regRes = await reqJson(baseUrl, 'POST', '/api/v1/auth/register', {
      role: 'TEACHER',
      firstName: 'Kofi',
      lastName: 'Mensah',
      email: testEmail,
      password: 'Password123!',
      phone: '+233241234567',
      department: 'Mathematics',
      approvedByHeadmaster: true,
      isApproved: true,
      isActive: true
    });
    assert.equal(regRes.status, 201);
    assert.equal(regRes.json.data.requiresApproval, true);
    assert.equal(regRes.json.data.accessToken, null);
    assert.equal(regRes.json.data.user.isApproved, false);

    // 2. Unapproved Teacher login MUST be blocked with 403
    const blockedLogin = await reqJson(baseUrl, 'POST', '/api/v1/auth/login', {
      email: testEmail,
      password: 'Password123!',
      portalRole: 'TEACHER'
    });
    assert.equal(blockedLogin.status, 403);
    assert.match(blockedLogin.json.message, /pending|approval|Headmaster/i);

    // 3. Headmaster logs in and inspects GET /api/v1/users/pending-staff
    const hmLogin = await reqJson(baseUrl, 'POST', '/api/v1/auth/login', {
      email: 'admin@gbs.com',
      password: 'Admin123!'
    });
    assert.equal(hmLogin.status, 200);
    const hmHeaders = {
      Authorization: `Bearer ${hmLogin.json.data.accessToken}`,
      'X-Tenant-Id': '1'
    };

    const pendingRes = await reqJson(baseUrl, 'GET', '/api/v1/users/pending-staff', null, hmHeaders);
    assert.equal(pendingRes.status, 200);
    const pendingMatch = pendingRes.json.data.pendingStaff.find((p) => p.email === testEmail);
    assert.ok(pendingMatch, 'Expected newly registered Teacher to appear in Headmaster pending-staff queue');
    assert.equal(pendingMatch.role, 'TEACHER');

    // 4. Headmaster approves Teacher
    const approveRes = await reqJson(baseUrl, 'POST', '/api/v1/users/approve-staff', {
      staffId: pendingMatch.id,
      email: testEmail
    }, hmHeaders);
    assert.equal(approveRes.status, 200);
    assert.equal(approveRes.json.data.isApproved, true);

    // 5. Teacher can now log in immediately into TEACHER role!
    const approvedLogin = await reqJson(baseUrl, 'POST', '/api/v1/auth/login', {
      email: testEmail,
      password: 'Password123!',
      portalRole: 'TEACHER'
    });
    assert.equal(approvedLogin.status, 200);
    assert.ok(approvedLogin.json.data.accessToken);
    assert.equal(approvedLogin.json.data.user.role, 'TEACHER');

    // 6. Verify /auth/me works cleanly for the newly approved staff token
    const meRes = await reqJson(baseUrl, 'GET', '/api/v1/auth/me', null, {
      Authorization: `Bearer ${approvedLogin.json.data.accessToken}`
    });
    assert.equal(meRes.status, 200);
    assert.equal(meRes.json.data.user.role, 'TEACHER');

    // 7. Register second staff member & test Headmaster rejection keeps login blocked
    const reg2 = await reqJson(baseUrl, 'POST', '/api/v1/auth/register', {
      role: 'ACCOUNTANT',
      firstName: 'Ama',
      lastName: 'Badu',
      email: rejectEmail,
      password: 'Password123!',
      phone: '0559988776'
    });
    assert.equal(reg2.status, 201);

    const rejectRes = await reqJson(baseUrl, 'POST', '/api/v1/users/reject-staff', {
      staffId: reg2.json.data.user.id,
      email: rejectEmail
    }, hmHeaders);
    assert.equal(rejectRes.status, 200);
    assert.equal(rejectRes.json.data.status, 'REJECTED');

    const rejectedLogin = await reqJson(baseUrl, 'POST', '/api/v1/auth/login', {
      email: rejectEmail,
      password: 'Password123!',
      portalRole: 'ACCOUNTANT'
    });
    assert.equal(rejectedLogin.status, 403);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('Direct & Headmaster SMS dispatches never fake CARRIER_SMS_SENT without provider keys, persist exact target receiver inbox with full sender details, and support read receipts', async () => {
  const app = buildApp();
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    const hmLogin = await reqJson(baseUrl, 'POST', '/api/v1/auth/login', {
      email: 'admin@gbs.com',
      password: 'Admin123!'
    });
    const hmHeaders = {
      Authorization: `Bearer ${hmLogin.json.data.accessToken}`,
      'X-Tenant-Id': '1'
    };

    // 1. Carrier status reflects actual environment configuration
    const statusRes = await reqJson(baseUrl, 'GET', '/api/v1/sms/status');
    assert.equal(statusRes.status, 200);
    assert.equal(typeof statusRes.json.data.carrierConfigured, 'boolean');

    // 2. Dispatch direct SMS using local 0-prefixed Ghana number + sender details
    const sendRes = await reqJson(baseUrl, 'POST', '/api/v1/sms/direct-send', {
      senderName: 'Headmaster Arthur Pendleton',
      senderRole: 'ADMIN',
      senderPhone: '+233-54-329-4615',
      senderEmail: 'admin@gbs.com',
      recipientPhone: '0244118920',
      recipientName: 'Mrs. Comfort Owusu',
      recipientRole: 'PARENT',
      subject: 'Urgent PTA Briefing',
      message: 'Please meet the Academic Board tomorrow at 9:00 AM.',
      schoolName: 'GBS Excellence Academy'
    }, hmHeaders);

    assert.equal(sendRes.status, 200);
    const sentSms = sendRes.json.data.sms;
    assert.equal(sentSms.recipientPhoneNormalized, '+233244118920');
    assert.equal(sentSms.senderName, 'Headmaster Arthur Pendleton');
    assert.equal(sentSms.senderEmail, 'admin@gbs.com');
    assert.equal(sentSms.carrierStatus, 'IN_APP_DELIVERED');
    assert.ok(sentSms.deviceSmsUri.startsWith('sms:+233244118920'));

    // 3. Receiver queries /sms/inbox with E.164 format (+233244118920) -> matches exact number & preserves sender details
    const inboxRes = await reqJson(baseUrl, 'GET', '/api/v1/sms/inbox?phone=%2B233244118920');
    assert.equal(inboxRes.status, 200);
    assert.ok(inboxRes.json.data.messages.length >= 1);
    const rec = inboxRes.json.data.messages[0];
    assert.equal(rec.senderName, 'Headmaster Arthur Pendleton');
    assert.equal(rec.senderRole, 'ADMIN');
    assert.equal(rec.senderPhone, '+233-54-329-4615');
    assert.equal(rec.senderEmail, 'admin@gbs.com');
    assert.equal(rec.rawMessage, 'Please meet the Academic Board tomorrow at 9:00 AM.');
    assert.equal(rec.read, false);

    // 4. Mark message read
    const readRes = await reqJson(baseUrl, 'PATCH', `/api/v1/sms/inbox/${encodeURIComponent(rec.messageId)}/read`);
    assert.equal(readRes.status, 200);
    assert.equal(readRes.json.data.message.read, true);

    // 5. Headmaster Communication SMS route accepts phoneNumber & routes through unified inbox
    const commSmsRes = await reqJson(baseUrl, 'POST', '/api/v1/communication/sms', {
      phoneNumber: '0557778899',
      recipientName: 'Mr. Kwesi Boateng',
      recipientRole: 'TEACHER',
      subject: 'Staff Assembly',
      message: 'Department heads briefing at 11:00 AM.'
    }, hmHeaders);
    assert.equal(commSmsRes.status, 200);
    assert.equal(commSmsRes.json.data.recipientPhoneNormalized, '+233557778899');

    const teacherInbox = await reqJson(baseUrl, 'GET', '/api/v1/sms/inbox?phone=0557778899');
    assert.equal(teacherInbox.status, 200);
    assert.equal(teacherInbox.json.data.messages[0].rawMessage, 'Department heads briefing at 11:00 AM.');
    assert.equal(teacherInbox.json.data.messages[0].senderRole, 'ADMIN');
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('System memory snapshot includes all current capabilities and parses cleanly', () => {
  const memoryPath = path.resolve(__dirname, '../data/gbs_system_memory_snapshot.json');
  const raw = fs.readFileSync(memoryPath, 'utf8');
  const memory = JSON.parse(raw);
  assert.ok(memory.systemName && memory.savedAt);
  assert.ok(Array.isArray(memory.dashboardsAndRoutesMemory));
  assert.ok(Array.isArray(memory.diagnosticCauseAndFixKnowledgeBase));
  assert.ok(memory.diagnosticCauseAndFixKnowledgeBase.some((d) => d.issueCode === 'DIAG-STAFF-HEADMASTER-APPROVAL'));
  assert.ok(memory.diagnosticCauseAndFixKnowledgeBase.some((d) => d.issueCode === 'DIAG-SMS-CARRIER-INBOX-SYNC'));
  assert.ok(memory.diagnosticCauseAndFixKnowledgeBase.some((d) => d.issueCode === 'DIAG-AI-ASSISTANT-MOUNT'));
});
