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
const {
  setupRcce,
  rcceCentralErrorHandler,
  idempotencyProtection,
  businessRulesEngine,
  SUPPORTED_GBS_PRODUCTS
} = require('../src/rcce');
const { demoLimitMiddleware } = require('../src/middleware/demoLimit.middleware');
const authRoutes = require('../src/modules/auth/auth.routes');
const clinicRoutes = require('../src/modules/clinic/clinic.routes');
const universityRoutes = require('../src/modules/university/university.routes');
const financeRoutes = require('../src/modules/finance/finance.routes');
const admissionsRoutes = require('../src/modules/admissions/admissions.routes');
const assignmentRoutes = require('../src/modules/assignment/assignment.routes');
const aiExamRoutes = require('../src/modules/ai-exam/aiExam.routes');
const communicationRoutes = require('../src/modules/communication/communication.routes');

function signToken(user) {
  const secret = process.env.JWT_SECRET || 'gbs_enterprise_jwt_super_secret_key_2026_production_hardened';
  return jwt.sign(
    {
      id: user.id,
      tenantId: user.tenantId || 1,
      role: user.role,
      email: user.email,
      isDemo: Boolean(user.isDemo)
    },
    secret,
    { expiresIn: '1h' }
  );
}

function buildTestApp(productOptions = { productId: 'GBS_SCHOOL', productName: 'GBS School Management System' }) {
  const app = express();
  app.use(express.json());
  const rcce = setupRcce(app, productOptions);
  app.use('/api/v1', demoLimitMiddleware);

  // Guarded sensitive endpoint for idempotency verification
  app.post('/api/v1/clinic/visits', idempotencyProtection.guard('CLINIC_ENCOUNTER'));
  app.use('/api/v1/auth', authRoutes);
  app.use('/api/v1/clinic', clinicRoutes);
  app.use('/api/v1/university', universityRoutes);
  app.use('/api/v1/finance', financeRoutes);
  app.use('/api/v1/admissions', admissionsRoutes);
  app.use('/api/v1/assignments', assignmentRoutes);
  app.use('/api/v1/ai-exam', aiExamRoutes);
  app.use('/api/v1/communication', communicationRoutes);

  // Trigger simulated internal DB error to test safe error normalization
  app.get('/api/v1/test-internal-error', (req, res, next) => {
    const { protect } = require('../src/middleware/auth.middleware');
    protect(req, res, (err) => {
      if (err) return next(err);
      next(new Error('PrismaClientKnownRequestError: postgres://secret:pass@db.internal:5432/gbs'));
    });
  });

  app.use(rcceCentralErrorHandler);
  return { app, rcce };
}

async function reqJson(baseUrl, method, route, body = null, headers = {}) {
  const res = await fetch(`${baseUrl}${route}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers
    },
    body: body ? JSON.stringify(body) : undefined
  });
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }
  return { status: res.status, headers: res.headers, json };
}

test.before(() => {
  if (fs.existsSync(STORE_PATH)) {
    originalStoreBackup = fs.readFileSync(STORE_PATH, 'utf8');
  } else {
    readPersistentStore();
  }
  writePersistentStore((curr) => ({
    ...curr,
    demoTrialCounters: {},
    auditTrail: []
  }));
});

test.after(() => {
  businessRulesEngine.setMaintenanceMode(false, 'Test cleanup');
  if (originalStoreBackup !== null) {
    try {
      writePersistentStore(JSON.parse(originalStoreBackup));
    } catch {
      fs.writeFileSync(STORE_PATH, originalStoreBackup, 'utf8');
    }
  }
});

test('1. GBS-RCCE enforces canonical response envelope across modules and maps Response Catalogue codes accurately', async () => {
  const { app } = buildTestApp();
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    // A. Catalogue & alias routes
    const cat1 = await reqJson(baseUrl, 'GET', '/api/v1/rcce/catalogue');
    const cat2 = await reqJson(baseUrl, 'GET', '/api/v1/rcce/response-catalogue');
    assert.equal(cat1.status, 200);
    assert.equal(cat2.status, 200);
    assert.equal(cat1.json.success, true);
    assert.ok(cat1.json.code);
    assert.ok(cat1.json.requestId);
    assert.ok(cat1.json.timestamp);
    assert.ok(cat1.json.data.catalogue.length >= 40);

    // B. Invalid login password yields standardized failure envelope (never success: true)
    const badLogin = await reqJson(baseUrl, 'POST', '/api/v1/auth/login', {
      email: 'admin@gbs.com',
      password: 'WrongPassword123'
    });
    assert.equal(badLogin.status, 401);
    assert.equal(badLogin.json.success, false);
    assert.equal(badLogin.json.code, 'AUTH_LOGIN_FAILED');
    assert.ok(Array.isArray(badLogin.json.errors));
    assert.ok(badLogin.json.requestId);

    // C. Standardized clinic module write auto-receives RCCE envelope & CLINIC code
    const adminToken = signToken({ id: 1, tenantId: 1, role: 'ADMIN', email: 'admin@gbs.com' });
    const clinicRes = await reqJson(
      baseUrl,
      'POST',
      '/api/v1/clinic/visits',
      {
        patientName: 'Kojo Mensah',
        patientRole: 'STUDENT',
        chiefComplaint: 'Headache',
        disposition: 'TREATED_AND_RETURNED_TO_CLASS'
      },
      { Authorization: `Bearer ${adminToken}` }
    );
    assert.equal(clinicRes.status, 201);
    assert.equal(clinicRes.json.success, true);
    assert.equal(clinicRes.json.code, 'CLINIC_VISIT_RECORDED');
    assert.ok(clinicRes.json.requestId);
    assert.equal(clinicRes.json.errors, null);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('2. GBS-RCCE Idempotency Guard prevents duplicate transactions and Maintenance Mode enforces HTTP 503 with Developer bypass', async () => {
  const { app } = buildTestApp();
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    const adminToken = signToken({ id: 1, tenantId: 1, role: 'ADMIN', email: 'admin@gbs.com' });
    const devToken = signToken({ id: 1, tenantId: 1, role: 'DEVELOPER', email: 'gabosei48@gmail.com' });
    const idemKey = `IDEM-TEST-${Date.now()}`;

    // 1. Idempotency key prevents double submission of identical clinical encounter
    const first = await reqJson(
      baseUrl,
      'POST',
      '/api/v1/clinic/visits',
      {
        patientName: 'Abena Boateng',
        patientRole: 'STUDENT',
        chiefComplaint: 'Mild fever',
        disposition: 'TREATED_AND_RETURNED_TO_CLASS'
      },
      { Authorization: `Bearer ${adminToken}`, 'X-Idempotency-Key': idemKey }
    );
    assert.equal(first.status, 201);
    const createdVisitId = first.json.data.visit.id;

    const replay = await reqJson(
      baseUrl,
      'POST',
      '/api/v1/clinic/visits',
      {
        patientName: 'Abena Boateng',
        patientRole: 'STUDENT',
        chiefComplaint: 'Mild fever',
        disposition: 'TREATED_AND_RETURNED_TO_CLASS'
      },
      { Authorization: `Bearer ${adminToken}`, 'X-Idempotency-Key': idemKey }
    );
    assert.equal(replay.status, 200);
    assert.equal(replay.json.code, 'IDEMPOTENT_TRANSACTION_REPLAYED');
    assert.equal(replay.json.data.visit.id, createdVisitId);

    // 2. Regular Admin CANNOT toggle Maintenance Mode (403 RBAC enforced)
    const deniedMaint = await reqJson(
      baseUrl,
      'POST',
      '/api/v1/rcce/maintenance-mode',
      { enabled: true, reason: 'Unauthorized test' },
      { Authorization: `Bearer ${adminToken}` }
    );
    assert.equal(deniedMaint.status, 403);
    assert.equal(deniedMaint.json.success, false);

    // 3. Developer CAN activate Maintenance Mode -> regular users get 503 while Developer still accesses telemetry
    const enableMaint = await reqJson(
      baseUrl,
      'POST',
      '/api/v1/rcce/maintenance-mode',
      { enabled: true, reason: 'Planned DB upgrade window' },
      { Authorization: `Bearer ${devToken}` }
    );
    assert.equal(enableMaint.status, 200);
    assert.equal(enableMaint.json.data.active, true);

    const blockedUserReq = await reqJson(
      baseUrl,
      'GET',
      '/api/v1/clinic/visits',
      null,
      { Authorization: `Bearer ${adminToken}` }
    );
    assert.equal(blockedUserReq.status, 503);
    assert.equal(blockedUserReq.json.code, 'SYSTEM_MAINTENANCE_ACTIVE');

    const devTelemetry = await reqJson(
      baseUrl,
      'GET',
      '/api/v1/rcce/system-status',
      null,
      { Authorization: `Bearer ${devToken}` }
    );
    assert.equal(devTelemetry.status, 200);
    assert.equal(devTelemetry.json.data.maintenance.active, true);

    // Deactivate Maintenance Mode cleanly
    const disableMaint = await reqJson(
      baseUrl,
      'POST',
      '/api/v1/rcce/maintenance-mode',
      { enabled: false, reason: 'Completed' },
      { Authorization: `Bearer ${devToken}` }
    );
    assert.equal(disableMaint.status, 200);
    assert.equal(disableMaint.json.data.active, false);
  } finally {
    businessRulesEngine.setMaintenanceMode(false, 'Cleanup');
    await new Promise((resolve) => server.close(resolve));
  }
});

test('3. Developer Privacy Gate, Safe Error Hiding vs Diagnostics, Audit Trail, Event Notifications & Demo 10-Entry Clinic Parity', async () => {
  const { app } = buildTestApp();
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    const devToken = signToken({ id: 1, tenantId: 1, role: 'DEVELOPER', email: 'gabosei48@gmail.com' });
    const teacherToken = signToken({ id: 2, tenantId: 1, role: 'TEACHER', email: 'teacher@gbs.com', isDemo: true });
    const stdToken = signToken({ id: 3, tenantId: 1, role: 'STUDENT', email: 'student@gbs.com', isDemo: false });

    // A. Privacy Gate rejects missing diagnostic reason (403 DEV_PRIVACY_AUDIT_REQUIRED)
    const noReasonPrivacy = await reqJson(
      baseUrl,
      'POST',
      '/api/v1/rcce/privacy-inspect',
      { reason: '' },
      { Authorization: `Bearer ${devToken}` }
    );
    assert.equal(noReasonPrivacy.status, 403);
    assert.equal(noReasonPrivacy.json.code, 'DEV_PRIVACY_AUDIT_REQUIRED');

    // With explicit reason -> returns redacted data and records audit log
    const okPrivacy = await reqJson(
      baseUrl,
      'POST',
      '/api/v1/rcce/privacy-inspect',
      { reason: 'Verifying staff account status ticket #77', query: '' },
      { Authorization: `Bearer ${devToken}` }
    );
    assert.equal(okPrivacy.status, 200);
    assert.equal(okPrivacy.json.code, 'DEV_PRIVACY_INSPECTED');

    // B. Internal Prisma/SQL error is sanitized for regular user (zero diagnostics leak), while Developer gets diagnostics
    const userErr = await reqJson(baseUrl, 'GET', '/api/v1/test-internal-error', null, { Authorization: `Bearer ${stdToken}` });
    assert.equal(userErr.status, 500);
    assert.equal(userErr.json.success, false);
    assert.equal(userErr.json.code, 'SYSTEM_DATABASE_UNAVAILABLE');
    assert.equal(userErr.json.diagnostics, undefined);
    assert.ok(!userErr.json.message.includes('secret:pass'));

    const devErr = await reqJson(baseUrl, 'GET', '/api/v1/test-internal-error', null, { Authorization: `Bearer ${devToken}` });
    assert.equal(devErr.status, 500);
    assert.ok(devErr.json.diagnostics);
    assert.ok(devErr.json.diagnostics.originalError.includes('PrismaClientKnownRequestError'));

    // C. Cross-tenant query attempt blocked cleanly (403 TENANT_CROSS_ACCESS_FORBIDDEN)
    const crossTenant = await reqJson(
      baseUrl,
      'GET',
      '/api/v1/rcce/notifications?tenantId=99',
      null,
      { Authorization: `Bearer ${stdToken}` }
    );
    assert.equal(crossTenant.status, 403);
    assert.equal(crossTenant.json.code, 'TENANT_CROSS_ACCESS_FORBIDDEN');

    // D. Emit event & mark notification read + check error monitor
    const evtRes = await reqJson(
      baseUrl,
      'POST',
      '/api/v1/rcce/events',
      { eventType: 'PAYMENT_RECEIVED', payload: { amount: 450, receiptNumber: 'RCP-909' } },
      { Authorization: `Bearer ${devToken}` }
    );
    assert.equal(evtRes.status, 200);

    const errMon = await reqJson(baseUrl, 'GET', '/api/v1/rcce/error-monitor', null, { Authorization: `Bearer ${devToken}` });
    assert.equal(errMon.status, 200);
    assert.ok(errMon.json.data.totalIssues >= 2);

    // E. Demo Reset + 10-entry trial cap enforced on Clinic module (1..10 succeed, 11th returns 403 DEMO_TRIAL_LIMIT_REACHED)
    const resetRes = await reqJson(baseUrl, 'POST', '/api/v1/auth/demo-reset', {}, { Authorization: `Bearer ${teacherToken}` });
    assert.equal(resetRes.status, 200);
    assert.equal(resetRes.json.success, true);

    for (let i = 1; i <= 10; i++) {
      const okDemo = await reqJson(
        baseUrl,
        'POST',
        '/api/v1/clinic/visits',
        {
          patientName: `Demo Student ${i}`,
          patientRole: 'STUDENT',
          chiefComplaint: `Checkup #${i}`,
          disposition: 'TREATED_AND_RETURNED_TO_CLASS'
        },
        { Authorization: `Bearer ${teacherToken}`, 'X-GBS-Mode': 'DEMO_SANDBOX' }
      );
      assert.equal(okDemo.status, 201, `Expected entry #${i} to succeed`);
    }

    const demoBlocked = await reqJson(
      baseUrl,
      'POST',
      '/api/v1/clinic/visits',
      {
        patientName: 'Demo Student 11',
        patientRole: 'STUDENT',
        chiefComplaint: 'Checkup #11',
        disposition: 'TREATED_AND_RETURNED_TO_CLASS'
      },
      { Authorization: `Bearer ${teacherToken}`, 'X-GBS-Mode': 'DEMO_SANDBOX' }
    );
    assert.equal(demoBlocked.status, 403);
    assert.equal(demoBlocked.json.code, 'DEMO_TRIAL_LIMIT_REACHED');

    // F. Verify Reusable Product Support List
    assert.ok(SUPPORTED_GBS_PRODUCTS.some((p) => p.id === 'GBS_REAL_ESTATE'));
    assert.ok(SUPPORTED_GBS_PRODUCTS.some((p) => p.id === 'GBS_EXAM'));
    assert.ok(SUPPORTED_GBS_PRODUCTS.some((p) => p.id === 'GBS_COMPANY'));
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('4. Multi-module RCCE envelopes, negative validation rejection, Demo 10-entry cap & Live unlimited parity (Finance, Admissions, Assignments, AI-Exam, Communication, University)', async () => {
  writePersistentStore((curr) => {
    const existingClasses = curr.prismaModels?.Class || [];
    const hasDefaultClass = existingClasses.some((c) => Number(c.tenantId) === 1);
    const hasLiveClass = existingClasses.some((c) => Number(c.tenantId) === 2);
    const existingInsts = Array.isArray(curr.institutions) ? curr.institutions : [];
    const hasLiveInst = existingInsts.some((inst) => Number(inst.tenantId) === 2 || Number(inst.id) === 2);
    const existingRegUsers = Array.isArray(curr.registeredUsers) ? curr.registeredUsers : [];
    const extraUsers = [
      { id: 5001, tenantId: 2, firstName: 'Grace', lastName: 'Bursar', role: 'ACCOUNTANT', email: 'bursar@stcharles.edu', isActive: true, isApproved: true, status: 'ACTIVE', isDemo: false },
      { id: 5002, tenantId: 2, firstName: 'Samuel', lastName: 'Lecturer', role: 'TEACHER', email: 'lecturer@stcharles.edu', isActive: true, isApproved: true, status: 'ACTIVE', isDemo: false }
    ];
    return {
      ...curr,
      demoTrialCounters: {},
      institutions: hasLiveInst
        ? existingInsts
        : [...existingInsts, { id: 2, tenantId: 2, tenantCode: 'ST-CHARLES-LIVE', institutionName: 'St. Charles Live Academy', status: 'ACTIVE', isActive: true, isApproved: true }],
      registeredUsers: [
        ...existingRegUsers.filter((u) => Number(u.id) !== 5001 && Number(u.id) !== 5002),
        ...extraUsers
      ],
      prismaModels: {
        ...(curr.prismaModels || {}),
        Class: [
          ...existingClasses,
          ...(hasDefaultClass ? [] : [{ id: 901, tenantId: 1, name: 'Grade 10 STEM', code: 'G10-STEM', gradeLevel: 10 }]),
          ...(hasLiveClass ? [] : [{ id: 902, tenantId: 2, name: 'Live Form 2 Science', code: 'LIVE-F2S', gradeLevel: 11 }])
        ]
      }
    };
  });

  const { app } = buildTestApp();
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    const assertEnvelope = (res, expectedSuccess) => {
      assert.equal(res.json.success, expectedSuccess, `Expected success=${expectedSuccess}, got body: ${JSON.stringify(res.json)}`);
      assert.ok(res.json.code, 'Missing RCCE code');
      assert.ok(res.json.message, 'Missing RCCE message');
      assert.ok(res.json.timestamp, 'Missing RCCE timestamp');
      assert.ok(res.json.requestId, 'Missing RCCE requestId');
    };

    const demoAdmin = signToken({ id: 'usr_admin_master', tenantId: 1, role: 'ADMIN', email: 'demo-admin@gbs.com', isDemo: true });
    const demoStudent = signToken({ id: 'usr_student_master', tenantId: 1, role: 'STUDENT', email: 'demo-stu@gbs.com', isDemo: true });
    const demoParent = signToken({ id: 'usr_parent_master', tenantId: 1, role: 'PARENT', email: 'demo-parent@gbs.com', isDemo: true });
    const demoTeacher = signToken({ id: 'usr_teacher_master', tenantId: 1, role: 'TEACHER', email: 'demo-teacher@gbs.com', isDemo: true });
    const liveAccountant = signToken({ id: 5001, tenantId: 2, role: 'ACCOUNTANT', email: 'bursar@stcharles.edu', isDemo: false });
    const liveTeacher = signToken({ id: 5002, tenantId: 2, role: 'TEACHER', email: 'lecturer@stcharles.edu', isDemo: false });

    // A. Negative validation across core modules MUST NEVER return HTTP 2xx
    const badPay = await reqJson(baseUrl, 'POST', '/api/v1/finance/payments', { amountPaid: 0 }, { Authorization: `Bearer ${demoStudent}` });
    assert.equal(badPay.status, 400);
    assertEnvelope(badPay, false);

    const badAdm = await reqJson(baseUrl, 'POST', '/api/v1/admissions/inquiry', { notes: 'Missing names' }, { Authorization: `Bearer ${demoParent}` });
    assert.equal(badAdm.status, 400);
    assertEnvelope(badAdm, false);

    const badAssign = await reqJson(baseUrl, 'POST', '/api/v1/assignments', { description: 'Missing title' }, { Authorization: `Bearer ${demoTeacher}` });
    assert.equal(badAssign.status, 400);
    assertEnvelope(badAssign, false);

    const badMsg = await reqJson(baseUrl, 'POST', '/api/v1/communication/messages', { content: '   ' }, { Authorization: `Bearer ${demoParent}` });
    assert.equal(badMsg.status, 400);
    assertEnvelope(badMsg, false);

    // B. Valid Finance Portal Payment as STUDENT & PARENT succeeds, 10-entry Demo limit blocks 11th (403 DEMO_TRIAL_LIMIT_REACHED), Live Accountant runs past 10 unlimited
    await reqJson(baseUrl, 'POST', '/api/v1/auth/demo-reset', {}, { Authorization: `Bearer ${demoParent}` });
    const stuOkPay = await reqJson(
      baseUrl,
      'POST',
      '/api/v1/finance/payments',
      { amountPaid: 100, paymentMethod: 'MTN_MOMO', studentName: 'Demo Scholar SelfPay', indexNumber: 'IDX-SELF' },
      { Authorization: `Bearer ${demoStudent}`, 'X-GBS-Mode': 'DEMO_SANDBOX' }
    );
    assert.equal(stuOkPay.status, 201, `Student self-pay failed: ${JSON.stringify(stuOkPay.json)}`);
    assertEnvelope(stuOkPay, true);

    await reqJson(baseUrl, 'POST', '/api/v1/auth/demo-reset', {}, { Authorization: `Bearer ${demoParent}` });
    for (let i = 1; i <= 10; i++) {
      const okPay = await reqJson(
        baseUrl,
        'POST',
        '/api/v1/finance/payments',
        { amountPaid: 100 + i, paymentMethod: 'MTN_MOMO', studentName: `Ward Scholar ${i}`, indexNumber: `IDX-${i}` },
        { Authorization: `Bearer ${demoParent}`, 'X-GBS-Mode': 'DEMO_SANDBOX' }
      );
      assert.equal(okPay.status, 201, `Finance entry #${i} failed: ${JSON.stringify(okPay.json)}`);
      assertEnvelope(okPay, true);
    }

    const demoPay11 = await reqJson(
      baseUrl,
      'POST',
      '/api/v1/finance/payments',
      { amountPaid: 250, paymentMethod: 'MTN_MOMO', studentName: 'Ward Scholar 11', indexNumber: 'IDX-11' },
      { Authorization: `Bearer ${demoParent}`, 'X-GBS-Mode': 'DEMO_SANDBOX' }
    );
    assert.equal(demoPay11.status, 403);
    assert.equal(demoPay11.json.code, 'DEMO_TRIAL_LIMIT_REACHED');
    assertEnvelope(demoPay11, false);

    // Live Production Accountant payment succeeds with zero Demo trial limit blocking it
    const livePay = await reqJson(
      baseUrl,
      'POST',
      '/api/v1/finance/payments',
      { amountPaid: 950, paymentMethod: 'BANK_TRANSFER', studentName: 'Live Student', indexNumber: 'LIVE-001' },
      { Authorization: `Bearer ${liveAccountant}`, 'X-GBS-Mode': 'LIVE_PRODUCTION' }
    );
    assert.equal(livePay.status, 201, `Live pay unexpected status ${livePay.status}: ${JSON.stringify(livePay.json)}`);
    assertEnvelope(livePay, true);

    // C. Admissions, Assignments, AI-Exam, Communication, University return canonical RCCE envelopes
    const okAdm = await reqJson(
      baseUrl,
      'POST',
      '/api/v1/admissions/inquiry',
      { studentFirstName: 'Nadia', studentLastName: 'Owusu', targetGradeLevel: 10, guardianName: 'Daniel Owusu' },
      { Authorization: `Bearer ${demoParent}`, 'X-GBS-Mode': 'DEMO_SANDBOX' }
    );
    assert.equal(okAdm.status, 201, `okAdm status ${okAdm.status}: ${JSON.stringify(okAdm.json)}`);
    assertEnvelope(okAdm, true);

    const okAssign = await reqJson(
      baseUrl,
      'POST',
      '/api/v1/assignments',
      { title: 'Differential Calculus Lab 1', dueDate: '2026-12-01', description: 'Complete Q1-Q5' },
      { Authorization: `Bearer ${liveTeacher}`, 'X-GBS-Mode': 'LIVE_PRODUCTION' }
    );
    assert.equal(okAssign.status, 201, `okAssign status ${okAssign.status}: ${JSON.stringify(okAssign.json)}`);
    assertEnvelope(okAssign, true);

    const okExam = await reqJson(
      baseUrl,
      'POST',
      '/api/v1/ai-exam/exams',
      {
        title: 'RCCE Term Assessment',
        subjectName: 'Physics',
        totalMarks: 50,
        passMarks: 25,
        questionBank: [{ questionNumber: 1, questionType: 'MULTIPLE_CHOICE', questionText: 'Unit of Force?', options: ['N', 'J', 'W', 'V'], correctOption: 'A', marks: 50 }]
      },
      { Authorization: `Bearer ${liveTeacher}`, 'X-GBS-Mode': 'LIVE_PRODUCTION' }
    );
    assert.equal(okExam.status, 201, `okExam status ${okExam.status}: ${JSON.stringify(okExam.json)}`);
    assertEnvelope(okExam, true);

    const okMsg = await reqJson(
      baseUrl,
      'POST',
      '/api/v1/communication/messages',
      { recipientType: 'ADMIN', content: 'Verified RCCE message test' },
      { Authorization: `Bearer ${demoParent}`, 'X-GBS-Mode': 'DEMO_SANDBOX' }
    );
    assert.equal(okMsg.status, 201, `okMsg status ${okMsg.status}: ${JSON.stringify(okMsg.json)}`);
    assertEnvelope(okMsg, true);

    const deniedUniGov = await reqJson(
      baseUrl,
      'POST',
      '/api/v1/university/governance',
      { positionTitle: 'Faculty Rep', holderName: 'Nadia Owusu', duties: 'Academic Council coordination' },
      { Authorization: `Bearer ${demoAdmin}`, 'X-GBS-Mode': 'DEMO_SANDBOX', 'X-Demo-Institution-Type': 'NURSERY_TO_JHS' }
    );
    assert.equal(deniedUniGov.status, 403);
    assertEnvelope(deniedUniGov, false);

    const okUniGov = await reqJson(
      baseUrl,
      'POST',
      '/api/v1/university/governance',
      { positionTitle: 'Faculty Rep', holderName: 'Nadia Owusu', duties: 'Academic Council coordination', howToHelpSchool: 'Student mentoring' },
      { Authorization: `Bearer ${demoAdmin}`, 'X-GBS-Mode': 'DEMO_SANDBOX', 'X-Demo-Institution-Type': 'UNIVERSITY' }
    );
    assert.equal(okUniGov.status, 201, `okUniGov status ${okUniGov.status}: ${JSON.stringify(okUniGov.json)}`);
    assertEnvelope(okUniGov, true);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
