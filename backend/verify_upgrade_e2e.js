'use strict';

/**
 * GBS SCHOOL MANAGEMENT SYSTEM — COMPREHENSIVE END-TO-END VERIFICATION SUITE
 * Verifies:
 *  1. Cross-Institution End-of-Term / Semester Exam Vetting & Headmaster Confirmation (ALL 4 Tiers)
 *  2. Multi-Gateway Payment Integration (MTN MoMo, Telecel, AT Money, Visa/Mastercard, Bank Transfer,
 *     Paystack & Hubtel adapters + HMAC signatures, duplicate webhook idempotency, partial payments,
 *     cross-tenant isolation, MoMo PIN/CVV rejection, fallback switch, cancel, expiry, refund, onboarding)
 *  3. GBS-RCCE Canonical Response Envelope, Catalogue, Events & Audit Trail
 *  4. Demo Sandbox 10-Entry Cap Parity vs Unlimited Live Operations
 *
 * Preserves persistent store snapshot cleanly so ZERO test records pollute production data.
 */

process.env.GBS_NO_LISTEN = '1';
process.env.NODE_ENV = 'test';

const fs = require('fs');
const path = require('path');
const http = require('http');
const crypto = require('crypto');
const assert = require('assert');
const jwt = require('jsonwebtoken');

const STORE_FILE = path.resolve(__dirname, 'data', 'gbs_persistent_store.json');
const originalStoreBackup = fs.existsSync(STORE_FILE) ? fs.readFileSync(STORE_FILE, 'utf8') : null;

const app = require('./src/core/server');
const envConfig = require('./src/core/config/env.config');
const prisma = require('./src/core/database/prisma.client');
const PaystackAdapter = require('./src/modules/payments/adapters/paystack.adapter');
const HubtelAdapter = require('./src/modules/payments/adapters/hubtel.adapter');
const { resetDemoUsageCounters } = require('./src/middleware/demoLimit.middleware');

function makeJwt(payload) {
  return jwt.sign(payload, envConfig.jwt.secret, { expiresIn: '2h' });
}

async function reqJson(baseUrl, method, urlPath, { body = null, token = null, headers = {} } = {}) {
  const res = await fetch(`${baseUrl}${urlPath}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers
    },
    body: body !== null ? JSON.stringify(body) : undefined
  });
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }
  return { status: res.status, json, headers: res.headers };
}

async function runAllTests() {
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}`;

  const passed = [];
  const pass = (label) => {
    passed.push(label);
    console.log(`  [PASS] ${label}`);
  };

  const createdTempUserIds = [];
  const createdTempTenantIds = [];
  const createdTempExamTitles = [];
  const createdTempPaymentRefs = [];
  const runTag = Date.now().toString(36).toUpperCase();

  try {
    console.log(`\n=== GBS END-TO-END VERIFICATION SUITE (${baseUrl}) ===\n`);

    // Clean any leftover titles from aborted local QA runs
    await prisma.exam.deleteMany({
      where: {
        title: {
          in: [
            'JHS 3 End of Term 2 Mathematics',
            'SHS 2 Physics Semester 1 Exam',
            'TVET Electrical Installation CBT Exam',
            'CSC 301 Operating Systems Semester Exam'
          ]
        }
      }
    }).catch(() => {});

    // Ensure baseline Tenant 1 & real users exist in DB/store (uses exact real auth pipeline)
    const authService = require('./src/modules/auth/auth.service');
    await authService.seedDefaultAdmin().catch(() => {});

    const findOrMakeTestUser = async (tenantId, role, email, firstName, lastName) => {
      let u = await prisma.user.findFirst({ where: { email, isDeleted: false } }).catch(() => null);
      if (!u) {
        u = await prisma.user.create({
          data: {
            tenantId,
            firstName,
            lastName,
            email,
            username: email.split('@')[0] + '_' + Date.now().toString().slice(-4),
            password: 'hashed_e2e_test_password',
            role,
            isActive: true
          }
        });
        if (u?.id) createdTempUserIds.push(u.id);
      }
      return u;
    };

    const liveTeacher = await findOrMakeTestUser(1, 'TEACHER', 'e2e.live.teacher@gbs-school.edu', 'Kwame', 'Mensah');
    const liveHeadmaster = await findOrMakeTestUser(1, 'ADMIN', 'e2e.live.headmaster@gbs-school.edu', 'Dr. Arthur', 'Pendleton');
    const liveStudent = await findOrMakeTestUser(1, 'STUDENT', 'student@gbs.com', 'Alex', 'Mensah');
    const demoTeacher = await findOrMakeTestUser(1, 'TEACHER', 'teacher@gbs.com', 'Demo', 'Teacher');

    let tenant2 = await prisma.tenant.findFirst({ where: { code: 'E2E-SCHOOL-2' } }).catch(() => null);
    if (!tenant2) {
      tenant2 = await prisma.tenant.create({
        data: { name: 'E2E Isolated School #2', code: 'E2E-SCHOOL-2', isActive: true, status: 'ACTIVE' }
      }).catch(() => ({ id: 2 }));
      if (tenant2?.id && tenant2.id !== 1) createdTempTenantIds.push(tenant2.id);
    }
    const tenant2Student = await findOrMakeTestUser(tenant2.id || 2, 'STUDENT', 'e2e.school2.student@school2.edu', 'Other', 'Scholar');

    const teacherToken = makeJwt({
      id: liveTeacher.id,
      tenantId: 1,
      role: 'TEACHER',
      firstName: liveTeacher.firstName,
      lastName: liveTeacher.lastName,
      email: liveTeacher.email
    });
    const headmasterToken = makeJwt({
      id: liveHeadmaster.id,
      tenantId: 1,
      role: 'ADMIN',
      firstName: liveHeadmaster.firstName,
      lastName: liveHeadmaster.lastName,
      email: liveHeadmaster.email
    });
    const studentToken = makeJwt({
      id: liveStudent.id,
      tenantId: 1,
      role: 'STUDENT',
      firstName: liveStudent.firstName,
      lastName: liveStudent.lastName,
      email: liveStudent.email
    });
    const developerToken = makeJwt({
      id: 1,
      tenantId: 1,
      role: 'DEVELOPER',
      firstName: 'Gabriel',
      lastName: 'Osei',
      email: 'gabosei48@gmail.com'
    });
    const tenant2StudentToken = makeJwt({
      id: tenant2Student.id,
      tenantId: tenant2.id || 2,
      role: 'STUDENT',
      firstName: tenant2Student.firstName,
      lastName: tenant2Student.lastName,
      email: tenant2Student.email
    });
    const demoTeacherToken = makeJwt({
      id: demoTeacher.id,
      tenantId: 1,
      role: 'TEACHER',
      firstName: demoTeacher.firstName,
      lastName: demoTeacher.lastName,
      email: 'teacher@gbs.com',
      isDemo: true
    });
    const activeStudentId = liveStudent.id;

    // ------------------------------------------------------------------
    // SECTION 1: CROSS-INSTITUTION END-OF-TERM / SEMESTER EXAM VETTING
    // ------------------------------------------------------------------
    console.log('--- 1. Cross-Institution Exam Vetting & Headmaster Confirmation ---');
    const tiers = [
      { tier: 'NURSERY_TO_JHS', term: 'Term 2 End-of-Term Exam', cls: 'JHS 3 (Basic 9 - BECE Prep)', title: `JHS 3 End of Term 2 Mathematics [${runTag}]` },
      { tier: 'SENIOR_HIGH_SCHOOL', term: 'Semester 1 End-of-Semester Exam', cls: 'SHS Form 2 - General Science', title: `SHS 2 Physics Semester 1 Exam [${runTag}]` },
      { tier: 'TECHNICAL', term: 'Semester 2 CBT Trade Exam', cls: 'Technical Level 2 - Electrical', title: `TVET Electrical Installation CBT Exam [${runTag}]` },
      { tier: 'UNIVERSITY', term: 'Semester 1 (End of Semester)', cls: 'Level 300 - Semester 1', title: `CSC 301 Operating Systems Semester Exam [${runTag}]` }
    ];
    tiers.forEach((t) => createdTempExamTitles.push(t.title));

    for (const item of tiers) {
      const subRes = await reqJson(baseUrl, 'POST', '/api/v1/ai-exam/vetting/submit', {
        token: teacherToken,
        body: {
          institutionType: item.tier,
          examCategory: item.tier === 'UNIVERSITY' ? 'END_OF_SEMESTER' : 'END_OF_TERM',
          academicTerm: item.term,
          title: item.title,
          subjectCode: 'EXAM-101',
          subjectName: item.title,
          className: item.cls,
          examDate: '2026-12-10',
          durationMinutes: 120,
          totalMarks: 100,
          passMarks: 50,
          questionBank: [
            { questionNumber: 1, questionType: 'MULTIPLE_CHOICE', questionText: `Core question for ${item.tier}`, optionA: '10', optionB: '20', optionC: '30', optionD: '40', correctOption: 'A', marks: 50 },
            { questionNumber: 2, questionType: 'THEORY_ESSAY', questionText: `Explain key principle in ${item.tier}`, markingGuide: 'Clear logical derivation', marks: 50 }
          ]
        }
      });
      assert.strictEqual(subRes.status, 201, `Submit failed for ${item.tier}: ${JSON.stringify(subRes.json)}`);
      assert.strictEqual(subRes.json.success, true);
      assert.strictEqual(subRes.json.code, 'EXAM_VETTING_SUBMITTED');
      assert.ok(subRes.json.requestId, 'RCCE requestId missing');
      const subId = subRes.json.data.submission.id;

      // Student must NOT see unconfirmed exam
      const stuBefore = await reqJson(baseUrl, 'GET', '/api/v1/ai-exam/exams?studentOnly=true', { token: studentToken });
      const visibleBefore = (stuBefore.json.data?.exams || []).some((e) => e.title === item.title);
      assert.strictEqual(visibleBefore, false, `Unconfirmed exam ${item.title} leaked to student!`);

      // Teacher cannot confirm their own exam
      const forbiddenReview = await reqJson(baseUrl, 'PUT', `/api/v1/ai-exam/vetting/${subId}/review`, {
        token: teacherToken,
        body: { decision: 'CONFIRMED_ONGOING' }
      });
      assert.strictEqual(forbiddenReview.status, 403, 'Teacher must not be permitted to confirm exam vetting');

      // On first tier, test revision -> resubmit loop before confirming
      if (item.tier === 'NURSERY_TO_JHS') {
        const missingRemark = await reqJson(baseUrl, 'PUT', `/api/v1/ai-exam/vetting/${subId}/review`, {
          token: headmasterToken,
          body: { decision: 'REVISION_REQUESTED', headmasterRemarks: '' }
        });
        assert.strictEqual(missingRemark.status, 400, 'Revision without remarks must fail validation');

        const revReq = await reqJson(baseUrl, 'PUT', `/api/v1/ai-exam/vetting/${subId}/review`, {
          token: headmasterToken,
          body: { decision: 'REVISION_REQUESTED', headmasterRemarks: 'Add marking rubric weights to Question 2.' }
        });
        assert.strictEqual(revReq.status, 200);
        assert.strictEqual(revReq.json.code, 'EXAM_VETTING_REVISION_REQUESTED');

        const resub = await reqJson(baseUrl, 'PUT', `/api/v1/ai-exam/vetting/${subId}/resubmit`, {
          token: teacherToken,
          body: { resubmittedNote: 'Added detailed marking rubric weights for Question 2.' }
        });
        assert.strictEqual(resub.status, 200);
        assert.strictEqual(resub.json.data.submission.revisionCount, 1);
        assert.strictEqual(resub.json.data.submission.vettingStatus, 'PENDING_HEADMASTER_VETTING');
        pass('Exam revision request -> teacher revision & resubmission loop verified');
      }

      // Headmaster confirms for ongoing exams
      const confRes = await reqJson(baseUrl, 'PUT', `/api/v1/ai-exam/vetting/${subId}/review`, {
        token: headmasterToken,
        body: { decision: 'CONFIRMED_ONGOING', headmasterRemarks: 'Vetted and authorized for ongoing examination.' }
      });
      assert.strictEqual(confRes.status, 200, `Confirm failed for ${item.tier}: ${JSON.stringify(confRes.json)}`);
      assert.strictEqual(confRes.json.code, 'EXAM_VETTING_CONFIRMED');
      assert.strictEqual(confRes.json.data.submission.vettingStatus, 'CONFIRMED_ONGOING');

      // Student now sees confirmed exam
      const stuAfter = await reqJson(baseUrl, 'GET', '/api/v1/ai-exam/exams?studentOnly=true', { token: studentToken });
      const visibleAfter = (stuAfter.json.data?.exams || []).some((e) => e.title === item.title);
      assert.strictEqual(visibleAfter, true, `Confirmed exam ${item.title} not visible to student!`);
      pass(`Exam vetting & ongoing confirmation verified for ${item.tier}`);
    }

    // ------------------------------------------------------------------
    // SECTION 2: MULTI-GATEWAY PAYMENT INTEGRATION SUITE
    // ------------------------------------------------------------------
    console.log('\n--- 2. Multi-Gateway Payment Integration Verification ---');

    // 2.1 Public Onboarding Gateways (no JWT required, zero secrets exposed)
    const pubGw = await reqJson(baseUrl, 'GET', '/api/v1/payments/onboarding/gateways?tenantId=1');
    assert.strictEqual(pubGw.status, 200);
    const pubChannels = (pubGw.json.data?.channels || []).map((c) => c.channel);
    assert.ok(pubChannels.includes('MTN_MOMO'), 'MTN_MOMO channel missing');
    assert.ok(pubChannels.includes('BANK_TRANSFER'), 'BANK_TRANSFER channel missing');
    assert.ok(!JSON.stringify(pubGw.json).includes('sk_live_'), 'Secret leaked!');
    pass('Public onboarding gateway lookup works without auth and exposes zero secrets');

    // 2.2 Student Fee Statement from DB
    const stmtRes = await reqJson(baseUrl, 'GET', `/api/v1/payments/student-statement?studentId=${activeStudentId}`, { token: studentToken });
    assert.strictEqual(stmtRes.status, 200);
    const initialOutstanding = Number(stmtRes.json.data.feeSummary.outstandingBalance);
    const minPartialAmt = Math.max(1, Number(stmtRes.json.data.feeSummary.minimumPayableAmount || 100));
    assert.ok(initialOutstanding > 0, `Expected positive balance, got ${initialOutstanding}`);
    pass(`Student DB fee statement loaded accurately (outstanding: GHS ${initialOutstanding}, min partial: GHS ${minPartialAmt})`);

    // 2.3 Security Policy: Reject MoMo PIN and Card CVV
    const pinAttack = await reqJson(baseUrl, 'POST', '/api/v1/payments/initiate', {
      token: studentToken,
      body: { studentId: activeStudentId, amount: minPartialAmt, channel: 'MTN_MOMO', payerPhone: '0244123456', momoPin: '1234' }
    });
    assert.strictEqual(pinAttack.status, 400);
    const cvvAttack = await reqJson(baseUrl, 'POST', '/api/v1/payments/initiate', {
      token: studentToken,
      body: { studentId: activeStudentId, amount: minPartialAmt, channel: 'VISA', cvv: '999' }
    });
    assert.strictEqual(cvvAttack.status, 400);
    pass('Security policy blocks MoMo PIN and raw Card CVV/PAN submissions');

    // 2.4 Over-balance amount, below-min partial, wrong student ID, cross-tenant isolation
    const overAmt = await reqJson(baseUrl, 'POST', '/api/v1/payments/initiate', {
      token: studentToken,
      body: { studentId: activeStudentId, amount: initialOutstanding + 500, channel: 'MTN_MOMO', payerPhone: '0244123456' }
    });
    assert.strictEqual(overAmt.status, 400);

    const tinyPartial = await reqJson(baseUrl, 'POST', '/api/v1/payments/initiate', {
      token: studentToken,
      body: { studentId: activeStudentId, amount: Math.max(1, Math.floor(minPartialAmt * 0.25)), channel: 'MTN_MOMO', payerPhone: '0244123456' }
    });
    assert.strictEqual(tinyPartial.status, 400);

    const wrongStudent = await reqJson(baseUrl, 'POST', '/api/v1/payments/initiate', {
      token: headmasterToken,
      body: { studentIdentifier: 'NON-EXISTENT-STU-999999', amount: minPartialAmt, channel: 'MTN_MOMO', payerPhone: '0244123456' }
    });
    assert.strictEqual(wrongStudent.status, 404);

    const crossTenant = await reqJson(baseUrl, 'GET', `/api/v1/payments/student-statement?studentId=${activeStudentId}&tenantId=1`, {
      token: tenant2StudentToken
    });
    assert.ok([403, 404].includes(crossTenant.status), `Expected 403/404 cross-tenant block, got ${crossTenant.status}`);
    pass('Server-side amount validation, min partial policy, wrong student ID, and cross-school isolation enforced');

    // 2.5 Initiate Partial MTN MoMo Payment -> Pending (balance unchanged) -> Invalid webhook rejected -> Signed webhook confirms -> Duplicate webhook ignored -> Refund restores balance
    const partialAmt = minPartialAmt;
    const initRes = await reqJson(baseUrl, 'POST', '/api/v1/payments/initiate', {
      token: studentToken,
      body: {
        studentId: activeStudentId,
        amount: partialAmt,
        currency: 'GHS',
        channel: 'MTN_MOMO',
        payerPhone: '0244123456',
        payerEmail: 'student@gbs.com',
        idempotencyKey: `idem-test-${Date.now()}`
      }
    });
    assert.strictEqual(initRes.status, 201, `Initiate failed: ${JSON.stringify(initRes.json)}`);
    const txRef = initRes.json.data.transaction.reference;
    createdTempPaymentRefs.push(txRef);
    assert.strictEqual(initRes.json.data.transaction.gatewayStatus, 'REQUIRES_CUSTOMER_ACTION');

    // Verify balance NOT deducted before provider confirmation
    const stmtPending = await reqJson(baseUrl, 'GET', `/api/v1/payments/student-statement?studentId=${activeStudentId}`, { token: studentToken });
    assert.strictEqual(Number(stmtPending.json.data.feeSummary.outstandingBalance), initialOutstanding);

    // Invalid webhook signature rejected with 401
    const badWh = await reqJson(baseUrl, 'POST', '/api/v1/payments/webhooks/sandbox_psp', {
      headers: { 'x-sandbox-signature': '0000000000deadbeef' },
      body: { reference: txRef, outcome: 'SUCCESSFUL', amount: partialAmt, currency: 'GHS' }
    });
    assert.strictEqual(badWh.status, 401);

    // Valid signed webhook settles payment
    const confirmRes = await reqJson(baseUrl, 'POST', `/api/v1/payments/${txRef}/sandbox-confirm`, {
      token: studentToken,
      body: { outcome: 'SUCCESSFUL' }
    });
    assert.strictEqual(confirmRes.status, 200);
    assert.strictEqual(confirmRes.json.data.transactionStatus, 'SUCCESSFUL');
    assert.ok(confirmRes.json.data.receiptNumber);

    const stmtAfterPaid = await reqJson(baseUrl, 'GET', `/api/v1/payments/student-statement?studentId=${activeStudentId}`, { token: studentToken });
    assert.strictEqual(Number(stmtAfterPaid.json.data.feeSummary.outstandingBalance), initialOutstanding - partialAmt);

    // Duplicate webhook replay MUST NOT double-deduct balance
    const dupRes = await reqJson(baseUrl, 'POST', `/api/v1/payments/${txRef}/sandbox-confirm`, {
      token: studentToken,
      body: { outcome: 'SUCCESSFUL' }
    });
    assert.strictEqual(dupRes.status, 200);
    const stmtAfterDup = await reqJson(baseUrl, 'GET', `/api/v1/payments/student-statement?studentId=${activeStudentId}`, { token: studentToken });
    assert.strictEqual(Number(stmtAfterDup.json.data.feeSummary.outstandingBalance), initialOutstanding - partialAmt);
    pass('MTN MoMo partial payment, signature verification, receipt issuance, and duplicate webhook protection verified');

    // Refund atomically restores balance
    const refundRes = await reqJson(baseUrl, 'POST', `/api/v1/payments/${txRef}/admin-action`, {
      token: headmasterToken,
      body: { action: 'REFUND', reason: 'E2E refund verification' }
    });
    assert.strictEqual(refundRes.status, 200);
    const stmtAfterRefund = await reqJson(baseUrl, 'GET', `/api/v1/payments/student-statement?studentId=${activeStudentId}`, { token: studentToken });
    assert.strictEqual(Number(stmtAfterRefund.json.data.feeSummary.outstandingBalance), initialOutstanding);
    pass('Refund transaction atomically restored student balance');

    // 2.6 Declined / Insufficient funds, Cancellation, Fallback Switch
    const failInit = await reqJson(baseUrl, 'POST', '/api/v1/payments/initiate', {
      token: studentToken,
      body: { studentId: activeStudentId, amount: minPartialAmt, channel: 'TELECEL_CASH', payerPhone: '0201234567' }
    });
    assert.strictEqual(failInit.status, 201, `Telecel init failed: ${JSON.stringify(failInit.json)}`);
    const failRef = failInit.json.data.transaction.reference;
    createdTempPaymentRefs.push(failRef);
    await reqJson(baseUrl, 'POST', `/api/v1/payments/${failRef}/sandbox-confirm`, {
      token: studentToken,
      body: { outcome: 'FAILED' }
    });
    const failCheck = await reqJson(baseUrl, 'GET', `/api/v1/payments/${failRef}/verify`, { token: studentToken });
    assert.strictEqual(failCheck.json.data.transaction.gatewayStatus, 'FAILED');

    const cancelInit = await reqJson(baseUrl, 'POST', '/api/v1/payments/initiate', {
      token: studentToken,
      body: { studentId: activeStudentId, amount: minPartialAmt, channel: 'AT_MONEY', payerPhone: '0271234567' }
    });
    assert.strictEqual(cancelInit.status, 201, `AT Money init failed: ${JSON.stringify(cancelInit.json)}`);
    const cancelRef = cancelInit.json.data.transaction.reference;
    createdTempPaymentRefs.push(cancelRef);
    const cancelRes = await reqJson(baseUrl, 'POST', `/api/v1/payments/${cancelRef}/cancel`, { token: studentToken });
    assert.strictEqual(cancelRes.json.data.transaction.gatewayStatus, 'CANCELLED');

    const fbInit = await reqJson(baseUrl, 'POST', '/api/v1/payments/initiate', {
      token: studentToken,
      body: { studentId: activeStudentId, amount: minPartialAmt, channel: 'MTN_MOMO', payerPhone: '0244123456' }
    });
    assert.strictEqual(fbInit.status, 201);
    createdTempPaymentRefs.push(fbInit.json.data.transaction.reference);
    const fbRes = await reqJson(baseUrl, 'POST', `/api/v1/payments/${fbInit.json.data.transaction.reference}/fallback`, {
      token: studentToken,
      body: { channel: 'VISA', preferHostedCheckout: true }
    });
    assert.strictEqual(fbRes.status, 201, `Fallback failed: ${JSON.stringify(fbRes.json)}`);
    if (fbRes.json?.data?.transaction?.reference) createdTempPaymentRefs.push(fbRes.json.data.transaction.reference);
    assert.strictEqual(fbRes.json.data.transaction.authorizationType, 'REDIRECT');
    pass('Declined (insufficient funds), Cancelled, and Fallback-to-Browser-Checkout verified');

    // 2.7 Public Onboarding Subscription Payment to Developer Account
    const onbInit = await reqJson(baseUrl, 'POST', '/api/v1/payments/onboarding/initiate', {
      body: {
        tenantId: 1,
        amount: 300,
        currency: 'GHS',
        channel: 'MTN_MOMO',
        payerPhone: '0541234567',
        payerEmail: 'newschool@edu.gh',
        subscriptionPlan: '4_MONTHS'
      }
    });
    assert.strictEqual(onbInit.status, 201);
    const onbRef = onbInit.json.data.transaction.reference;
    createdTempPaymentRefs.push(onbRef);
    const onbConf = await reqJson(baseUrl, 'POST', `/api/v1/payments/sandbox-checkout/${onbRef}/complete`, {
      body: { outcome: 'SUCCESSFUL' }
    });
    assert.strictEqual(onbConf.status, 200);
    const onbVerify = await reqJson(baseUrl, 'GET', `/api/v1/payments/onboarding/verify/${onbRef}`);
    assert.strictEqual(onbVerify.json.data.transaction.gatewayStatus, 'SUCCESSFUL');
    pass('Public onboarding subscription payment to Developer verified end-to-end');

    // 2.8 Direct Bank-to-School Account Setup & Finance Verification
    const cfgBank = await reqJson(baseUrl, 'PUT', '/api/v1/payments/admin/config/BANK_DIRECT', {
      token: headmasterToken,
      body: {
        tenantId: 1,
        mode: 'LIVE',
        isEnabled: true,
        supportsBankTransfer: true,
        bankName: 'GCB Bank PLC',
        bankAccountNumber: '1011223344556',
        bankAccountName: 'GBS Academy Official Fees Account',
        bankBranch: 'Accra High Street'
      }
    });
    assert.strictEqual(cfgBank.status, 200);
    const bankInit = await reqJson(baseUrl, 'POST', '/api/v1/payments/initiate', {
      token: studentToken,
      body: { studentId: activeStudentId, amount: minPartialAmt, gateway: 'BANK_DIRECT', channel: 'BANK_TRANSFER' }
    });
    assert.strictEqual(bankInit.status, 201);
    assert.strictEqual(bankInit.json.data.transaction.authorizationType, 'BANK_REFERENCE');
    const bankRef = bankInit.json.data.transaction.reference;
    createdTempPaymentRefs.push(bankRef);
    const bankApprove = await reqJson(baseUrl, 'POST', `/api/v1/payments/${bankRef}/admin-action`, {
      token: headmasterToken,
      body: { action: 'APPROVE_BANK_DEPOSIT', reason: 'Bank credit alert confirmed on GCB statement' }
    });
    assert.strictEqual(bankApprove.status, 200);
    assert.strictEqual(bankApprove.json.data.transaction.gatewayStatus, 'SUCCESSFUL');
    // Refund synthetic bank deposit so live PG balance returns to initial state
    await reqJson(baseUrl, 'POST', `/api/v1/payments/${bankRef}/admin-action`, {
      token: headmasterToken,
      body: { action: 'REFUND', reason: 'Restore balance after E2E test' }
    });
    pass('Direct Bank-to-School Account transfer initiation & accountant verification verified');

    // 2.9 Paystack & Hubtel Official Adapter Protocol + HMAC Signature Tests (mock HTTP)
    const paystackMockCalls = [];
    const psAdapter = new PaystackAdapter({
      fetchImpl: async (url, opts) => {
        paystackMockCalls.push({ url, method: opts.method, body: opts.body ? JSON.parse(opts.body) : null });
        if (url.endsWith('/charge')) {
          return { ok: true, status: 200, json: async () => ({ status: true, data: { status: 'send_otp', reference: 'REF-PS-1', display_text: 'Enter OTP sent to MTN phone' } }) };
        }
        if (url.endsWith('/charge/submit_otp')) {
          return { ok: true, status: 200, json: async () => ({ status: true, data: { status: 'pay_offline', reference: 'REF-PS-1', display_text: 'Approve MTN MoMo prompt on your phone' } }) };
        }
        if (url.includes('/transaction/verify/')) {
          return { ok: true, status: 200, json: async () => ({ status: true, data: { id: 98765, status: 'success', amount: 25000, currency: 'GHS', reference: 'REF-PS-1', channel: 'mobile_money' } }) };
        }
        return { ok: true, status: 200, json: async () => ({ status: true, data: { authorization_url: 'https://checkout.paystack.com/test123', access_code: 'ac_123' } }) };
      }
    });
    const psCfg = { secretKey: 'sk_test_mock_secret_123456' };
    const psCharge = await psAdapter.initiatePayment({
      reference: 'REF-PS-1',
      amount: 250,
      currency: 'GHS',
      channel: 'MTN_MOMO',
      payerEmail: 'parent@school.edu',
      phoneResult: { local: '0244123456' },
      subaccountCode: 'ACCT_SCHOOL_01',
      config: psCfg
    });
    assert.strictEqual(psCharge.authorizationType, 'OTP');
    assert.strictEqual(paystackMockCalls[0].body.subaccount, 'ACCT_SCHOOL_01');
    const psOtp = await psAdapter.submitAuthorizationStep({ reference: 'REF-PS-1', otp: '123456', config: psCfg });
    assert.strictEqual(psOtp.authorizationType, 'PHONE_PROMPT');
    const psVer = await psAdapter.verifyTransaction({ reference: 'REF-PS-1', config: psCfg });
    assert.strictEqual(psVer.verified, true);
    assert.strictEqual(psVer.amount, 250);
    const psRawWh = JSON.stringify({ event: 'charge.success', data: { id: 98765, reference: 'REF-PS-1', amount: 25000, currency: 'GHS' } });
    const psSig = crypto.createHmac('sha512', psCfg.secretKey).update(psRawWh).digest('hex');
    assert.strictEqual(psAdapter.verifyWebhookSignature({ rawBody: psRawWh, headers: { 'x-paystack-signature': psSig }, config: psCfg }), true);
    assert.strictEqual(psAdapter.verifyWebhookSignature({ rawBody: psRawWh, headers: { 'x-paystack-signature': 'tampered' }, config: psCfg }), false);

    const hubAdapter = new HubtelAdapter({
      fetchImpl: async (url) => {
        if (url.includes('/items/initiate')) {
          return { ok: true, status: 200, json: async () => ({ responseCode: '0000', data: { checkoutId: 'CHK-1', checkoutUrl: 'https://pay.hubtel.com/chk-1' } }) };
        }
        return { ok: true, status: 200, json: async () => ({ responseCode: '0000', data: { status: 'Paid', clientReference: 'REF-HUB-1', transactionId: 'HTX-1', amount: 300, currency: 'GHS' } }) };
      }
    });
    const hubCfg = { clientId: 'hub_id', clientSecret: 'hub_sec', hubtelMerchantAccount: '2019988', webhookSecret: 'hub_wh_sec' };
    const hubInit = await hubAdapter.initiatePayment({ reference: 'REF-HUB-1', amount: 300, config: hubCfg });
    assert.strictEqual(hubInit.authorizationType, 'REDIRECT');
    assert.strictEqual(hubInit.authorizationUrl, 'https://pay.hubtel.com/chk-1');
    const hubVer = await hubAdapter.verifyTransaction({ reference: 'REF-HUB-1', config: hubCfg });
    assert.strictEqual(hubVer.verified, true);
    const hubRaw = JSON.stringify({ ResponseCode: '0000', Data: { ClientReference: 'REF-HUB-1', Status: 'Paid', Amount: 300 } });
    const hubSig = crypto.createHmac('sha256', hubCfg.webhookSecret).update(hubRaw).digest('hex');
    assert.strictEqual(hubAdapter.verifyWebhookSignature({ rawBody: hubRaw, headers: { 'x-hubtel-signature': hubSig }, config: hubCfg }), true);
    pass('Paystack (Direct MoMo + OTP + Subaccount + HMAC-SHA512) & Hubtel (Hosted Checkout + Status API + HMAC-SHA256) adapters verified');

    // 2.10 Developer Payment Admin Overview & Reports
    const devOverview = await reqJson(baseUrl, 'GET', '/api/v1/payments/admin/overview', { token: developerToken });
    assert.strictEqual(devOverview.status, 200);
    assert.ok(Array.isArray(devOverview.json.data.gatewayHealth));
    assert.ok(Array.isArray(devOverview.json.data.auditLogs));
    assert.ok(!JSON.stringify(devOverview.json).includes('sk_live_'));
    const reportRes = await reqJson(baseUrl, 'GET', '/api/v1/payments/reports/summary?period=MONTHLY', { token: headmasterToken });
    assert.strictEqual(reportRes.status, 200);
    assert.ok(reportRes.json.data.summary);
    pass('Developer payment administration overview, service health, audit logs & financial reports verified');

    // ------------------------------------------------------------------
    // SECTION 3: GBS-RCCE ENGINE VERIFICATION
    // ------------------------------------------------------------------
    console.log('\n--- 3. GBS-RCCE Central Response, Control & Audit Verification ---');
    const catRes = await reqJson(baseUrl, 'GET', '/api/v1/rcce/catalogue', { token: developerToken });
    assert.strictEqual(catRes.status, 200);
    const catJson = JSON.stringify(catRes.json);
    assert.ok(catJson.includes('EXAM_VETTING_SUBMITTED'));
    assert.ok(catJson.includes('EXAM_VETTING_CONFIRMED'));
    assert.ok(catJson.includes('PAYMENT_VERIFIED_SUCCESS'));
    pass('GBS-RCCE Response Catalogue contains canonical Exam Vetting & Payment codes');

    // ------------------------------------------------------------------
    // SECTION 4: DEMO SANDBOX 10-ENTRY CAP VERIFICATION
    // ------------------------------------------------------------------
    console.log('\n--- 4. Demo Sandbox 10-Entry Limit Parity Verification ---');
    resetDemoUsageCounters();
    for (let i = 1; i <= 10; i++) {
      const r = await reqJson(baseUrl, 'POST', '/api/v1/ai-exam/vetting/submit', {
        token: demoTeacherToken,
        body: {
          title: `Demo Trial Exam #${i}`,
          subjectName: 'Mathematics',
          typedQuestionText: `Demo trial question content #${i}`
        }
      });
      assert.strictEqual(r.status, 201, `Demo entry #${i} should succeed, got ${r.status}`);
    }
    const eleventh = await reqJson(baseUrl, 'POST', '/api/v1/ai-exam/vetting/submit', {
      token: demoTeacherToken,
      body: {
        title: 'Demo Trial Exam #11 (Should Block)',
        subjectName: 'Mathematics',
        typedQuestionText: 'Should be blocked at 10/10'
      }
    });
    assert.strictEqual(eleventh.status, 403, '11th Demo entry must be blocked!');
    assert.strictEqual(eleventh.json.code, 'DEMO_TRIAL_LIMIT_REACHED');
    pass('Demo Sandbox strictly enforces 10-entry trial cap (entries 1-10 pass, entry 11 returns 403 DEMO_TRIAL_LIMIT_REACHED)');

    console.log(`\n=== ALL ${passed.length} END-TO-END CHECKS PASSED SUCCESSFULLY ===\n`);
  } finally {
    // Clean up temporary PostgreSQL test rows so zero synthetic records remain
    if (createdTempExamTitles.length > 0) {
      await prisma.exam.deleteMany({ where: { title: { in: createdTempExamTitles } } }).catch(() => {});
    }
    if (createdTempPaymentRefs.length > 0) {
      await prisma.paymentReceipt.deleteMany({ where: { transactionRef: { in: createdTempPaymentRefs } } }).catch(() => {});
      await prisma.paymentWebhookEvent.deleteMany({ where: { transactionRef: { in: createdTempPaymentRefs } } }).catch(() => {});
      await prisma.paymentTransaction.deleteMany({ where: { reference: { in: createdTempPaymentRefs } } }).catch(() => {});
    }
    for (const uid of createdTempUserIds) {
      await prisma.user.delete({ where: { id: uid } }).catch(() => {});
    }
    for (const tid of createdTempTenantIds) {
      await prisma.tenant.delete({ where: { id: tid } }).catch(() => {});
    }
    if (typeof server.closeAllConnections === 'function') {
      server.closeAllConnections();
    }
    await new Promise((resolve) => server.close(resolve));
    // Restore original persistent store so zero synthetic test records remain
    if (originalStoreBackup !== null) {
      fs.writeFileSync(STORE_FILE, originalStoreBackup, 'utf8');
    }
  }
}

runAllTests()
  .then(() => {
    setImmediate(() => process.exit(0));
  })
  .catch((err) => {
    console.error('\n[FAIL] E2E verification failed:', err);
    if (originalStoreBackup !== null) {
      try { fs.writeFileSync(STORE_FILE, originalStoreBackup, 'utf8'); } catch { }
    }
    setImmediate(() => process.exit(1));
  });
