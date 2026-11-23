'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const jwt = require('jsonwebtoken');

if (!process.env.TEST_USE_PG) {
  process.env.GBS_TEST_OFFLINE = '1';
}
process.env.GBS_NO_LISTEN = '1';

const ROOT_DIR = path.resolve(__dirname, '../..');
const STORE_PATH = path.resolve(__dirname, '../data/gbs_persistent_store.json');
let originalStoreBackup = null;

const envConfig = require('../src/core/config/env.config');

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

test('1. Headmaster Class-Specific Stationery Pricing (Create, Filter, Edit, Authoritative Class Tariff & RBAC)', async () => {
  const adminToken = signTestToken({ id: 1, tenantId: 1, role: 'ADMIN', email: 'admin@gbs.com', firstName: 'Kwame', lastName: 'Headmaster' });
  const teacherToken = signTestToken({ id: 2, tenantId: 1, role: 'TEACHER', email: 'teacher@gbs.com', firstName: 'Ama', lastName: 'Teacher' });
  const studentToken = signTestToken({ id: 3, tenantId: 1, role: 'STUDENT', email: 'student@gbs.com', firstName: 'Kofi', lastName: 'Student' });

  // Non-headmaster must be blocked (403) from creating class-priced stationery
  const blockedCreate = await apiReq('POST', '/api/v1/stationery/items', teacherToken, {
    name: 'Unauthorized Item',
    category: 'TEXTBOOK',
    unitPrice: 50,
    targetClass: 'Primary 1'
  });
  assert.equal(blockedCreate.status, 403);

  // Headmaster publishes multi-level item with distinct prices per class
  const createRes = await apiReq('POST', '/api/v1/stationery/items', adminToken, {
    name: 'Term Science & English Bundle v214',
    category: 'TEXTBOOK',
    targetClass: 'ALL_CLASSES',
    unitPrice: 80,
    stockQty: 100,
    unitLabel: 'Bundle',
    classPricing: {
      'Primary 1': 45,
      'JHS 2': 95,
      'SHS 1': 140
    }
  });
  assert.equal(createRes.status, 201);
  const createdItem = createRes.json?.data?.item;
  assert.ok(createdItem?.id);
  assert.equal(createdItem.classPricing['Primary 1'], 45);
  assert.equal(createdItem.classPricing['JHS 2'], 95);
  assert.equal(createdItem.classPricing['SHS 1'], 140);

  // Filter catalog by Primary 1 vs SHS 1 and verify effectiveUnitPrice matches Headmaster's class tariff
  const p1Catalog = await apiReq('GET', '/api/v1/stationery/items?className=Primary%201', studentToken);
  assert.equal(p1Catalog.status, 200);
  const p1Match = p1Catalog.json?.data?.items?.find((it) => it.id === createdItem.id);
  assert.ok(p1Match);
  assert.equal(p1Match.effectiveUnitPrice, 45);

  const shs1Catalog = await apiReq('GET', '/api/v1/stationery/items?className=SHS%201', studentToken);
  assert.equal(shs1Catalog.status, 200);
  const shs1Match = shs1Catalog.json?.data?.items?.find((it) => it.id === createdItem.id);
  assert.ok(shs1Match);
  assert.equal(shs1Match.effectiveUnitPrice, 140);

  // Order for Primary 1 (qty 2) must lock unitPrice to 45 (total 90) even if client sends tampered price
  const p1Order = await apiReq('POST', '/api/v1/stationery/orders', studentToken, {
    itemId: createdItem.id,
    quantity: 2,
    buyerName: 'Kofi Student',
    buyerClass: 'Primary 1',
    unitPrice: 1
  });
  assert.equal(p1Order.status, 201);
  assert.equal(p1Order.json?.data?.transaction?.unitPrice, 45);
  assert.equal(p1Order.json?.data?.transaction?.totalAmount, 90);

  // Sale for SHS 1 (qty 2) must lock unitPrice to 140 (total 280)
  const shs1Sale = await apiReq('POST', '/api/v1/stationery/sales', adminToken, {
    itemId: createdItem.id,
    quantity: 2,
    buyerName: 'Akua SHS',
    buyerClass: 'SHS 1'
  });
  assert.equal(shs1Sale.status, 201);
  assert.equal(shs1Sale.json?.data?.transaction?.unitPrice, 140);
  assert.equal(shs1Sale.json?.data?.transaction?.totalAmount, 280);

  // Headmaster updates JHS 2 class price to 105
  const editRes = await apiReq('PUT', `/api/v1/stationery/items/${createdItem.id}`, adminToken, {
    classPricing: {
      'Primary 1': 45,
      'JHS 2': 105,
      'SHS 1': 140
    }
  });
  assert.equal(editRes.status, 200);
  assert.equal(editRes.json?.data?.item?.classPricing?.['JHS 2'], 105);
});

test('2. Headmaster Live Video Conferences Target Staff, Teachers, Parents, Students & Enforce Tenant Isolation', async () => {
  const adminToken = signTestToken({ id: 1, tenantId: 1, role: 'ADMIN', email: 'admin@gbs.com', firstName: 'Headmaster', lastName: 'One' });
  const staffToken = signTestToken({ id: 'usr_staff_master', tenantId: 1, role: 'STAFF', email: 'staff@gbs.com', firstName: 'Campus', lastName: 'Staff' });
  const teacherToken = signTestToken({ id: 2, tenantId: 1, role: 'TEACHER', email: 'teacher@gbs.com', firstName: 'Faculty', lastName: 'Teacher' });
  const parentToken = signTestToken({ id: 4, tenantId: 1, role: 'PARENT', email: 'parent@gbs.com', firstName: 'Mrs', lastName: 'Parent' });
  const studentToken = signTestToken({ id: 3, tenantId: 1, role: 'STUDENT', email: 'student@gbs.com', firstName: 'Junior', lastName: 'Student' });
  const otherTenantStudent = signTestToken({ id: 'usr_student1', tenantId: 99, role: 'STUDENT', email: 'other.school@gbs.edu', firstName: 'Other', lastName: 'School' });

  // Headmaster launches ALL_CAMPUS_CONFERENCE
  const allCampus = await apiReq('POST', '/api/v1/video/calls/initiate', adminToken, {
    callScope: 'ALL_CAMPUS_CONFERENCE',
    mediaMode: 'VIDEO',
    title: 'Term Opening All-Campus Video Assembly'
  });
  assert.equal(allCampus.status, 201);
  const allCampusId = allCampus.json?.data?.session?.id;
  assert.ok(allCampusId);

  // Staff, Teacher, Parent, and Student in Tenant 1 must all see the active live conference
  for (const [label, tok] of [['STAFF', staffToken], ['TEACHER', teacherToken], ['PARENT', parentToken], ['STUDENT', studentToken]]) {
    const inc = await apiReq('GET', '/api/v1/video/calls/incoming', tok);
    assert.equal(inc.status, 200, `${label} incoming check failed`);
    const found = (inc.json?.data?.activeConferences || []).some((c) => c.id === allCampusId);
    assert.equal(found, true, `${label} should see Headmaster ALL_CAMPUS_CONFERENCE`);
  }

  // Tenant 99 student must NEVER see Tenant 1's conference
  const isolated = await apiReq('GET', '/api/v1/video/calls/incoming', otherTenantStudent);
  assert.equal(isolated.status, 200);
  assert.equal((isolated.json?.data?.activeConferences || []).some((c) => c.id === allCampusId), false);

  // Headmaster launches STAFF_CONFERENCE — visible to Staff & Teacher, NOT to Student/Parent
  const staffConf = await apiReq('POST', '/api/v1/video/calls/initiate', adminToken, {
    callScope: 'STAFF_CONFERENCE',
    mediaMode: 'VIDEO',
    title: 'Executive Staff Briefing'
  });
  assert.equal(staffConf.status, 201);
  const staffConfId = staffConf.json?.data?.session?.id;

  const staffIncoming = await apiReq('GET', '/api/v1/video/calls/incoming', staffToken);
  assert.equal((staffIncoming.json?.data?.activeConferences || []).some((c) => c.id === staffConfId), true);
  const studentIncoming = await apiReq('GET', '/api/v1/video/calls/incoming', studentToken);
  assert.equal((studentIncoming.json?.data?.activeConferences || []).some((c) => c.id === staffConfId), false);

  // Clean up sessions so store remains tidy
  await apiReq('POST', `/api/v1/video/calls/${allCampusId}/end`, adminToken, {});
  await apiReq('POST', `/api/v1/video/calls/${staffConfId}/end`, adminToken, {});
});

test('3. High-Speed Exam Proctoring RAM Store & Real-Time SSE Stream (/api/v1/ai-exam/proctor/stream)', async () => {
  const teacherToken = signTestToken({ id: 9301, tenantId: 1, role: 'TEACHER', email: 'proctor.teacher@gbs.edu', firstName: 'Proctor', lastName: 'Teacher' });
  const studentToken = signTestToken({ id: 9302, tenantId: 1, role: 'STUDENT', email: 'proctor.student@gbs.edu', firstName: 'FastCam', lastName: 'Student' });
  const examId = `EXM-FAST-${Date.now()}`;

  // Open SSE stream for Teacher proctor and verify immediate snapshot + live frame delivery
  const controller = new AbortController();
  const sseRes = await fetch(`${baseUrl}/api/v1/ai-exam/proctor/stream?examId=${encodeURIComponent(examId)}&token=${encodeURIComponent(teacherToken)}`, {
    signal: controller.signal
  });
  assert.equal(sseRes.status, 200);
  assert.ok((sseRes.headers.get('content-type') || '').includes('text/event-stream'));

  const reader = sseRes.body.getReader();
  const decoder = new TextDecoder();
  let buffered = '';

  // Read initial proctor_snapshot chunk
  const firstChunk = await reader.read();
  buffered += decoder.decode(firstChunk.value || new Uint8Array(), { stream: true });
  assert.ok(buffered.includes('event: proctor_snapshot'));

  // Student emits live camera heartbeat frame
  const hbStart = Date.now();
  const hbRes = await apiReq('POST', '/api/v1/ai-exam/proctor/heartbeat', studentToken, {
    examId,
    examTitle: 'Fast Camera Mathematics Paper',
    studentId: 9302,
    studentName: 'FastCam Student',
    className: 'JHS 2',
    status: 'CAMERA_ACTIVE',
    movementStatus: 'STABLE_FOCUS',
    snapshotDataUrl: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AVN//2Q=='
  });
  const hbElapsedMs = Date.now() - hbStart;
  assert.equal(hbRes.status, 200);
  assert.ok(hbElapsedMs < 1500, `Heartbeat should respond rapidly (took ${hbElapsedMs}ms)`);

  // Read next SSE event carrying proctor_live_frame
  const secondChunk = await reader.read();
  buffered += decoder.decode(secondChunk.value || new Uint8Array(), { stream: true });
  assert.ok(buffered.includes('event: proctor_live_frame'));
  assert.ok(buffered.includes('FastCam Student'));

  controller.abort();

  // Verify live polling endpoint immediately sees the RAM-cached session too
  const liveRes = await apiReq('GET', `/api/v1/ai-exam/proctor/live?examId=${encodeURIComponent(examId)}`, teacherToken);
  assert.equal(liveRes.status, 200);
  const foundSession = (liveRes.json?.data?.sessions || []).find((s) => String(s.studentId) === '9302' && s.examId === examId);
  assert.ok(foundSession);
  assert.equal(foundSession.status, 'CAMERA_ACTIVE');
});

test('4. Apple iOS/macOS WebClip Inline Profile with Embedded Real Icon & RCCE Health', async () => {
  const profileRes = await apiReq('GET', '/api/v1/app/ios-webclip.mobileconfig?origin=https://gbs-school.onrender.com');
  assert.equal(profileRes.status, 200);
  const disp = profileRes.headers.get('content-disposition') || '';
  assert.ok(disp.toLowerCase().startsWith('inline;'), `Expected inline Content-Disposition for Safari, got: ${disp}`);
  assert.ok(profileRes.text.includes('<key>Icon</key>'), 'Apple WebClip must embed real app icon bytes');
  assert.ok(profileRes.text.includes('<string>com.apple.webClip.managed</string>'));

  const rcceHealth = await apiReq('GET', '/api/v1/rcce/health');
  assert.equal(rcceHealth.status, 200);
  assert.equal(rcceHealth.json?.status, 'success');
  assert.ok(rcceHealth.json?.requestId);
});

test('5. End-to-End Frontend Structural Guarantees (Blueprint OFF, US Male Voice, Zero Fake Dev Data, Image Lightbox, Full-Page Tabs, Responsive Layout)', () => {
  const readRel = (rel) => fs.readFileSync(path.join(ROOT_DIR, rel), 'utf8');

  // 1) Blueprint Light OFF by default per dashboard
  const themeUtil = readRel('frontend/src/utils/dashboardTheme.js');
  assert.ok(themeUtil.includes('saved === "light" ? "light" : "navy"'));
  assert.ok(themeUtil.includes('DASHBOARD_THEME_PREFIX = "gbs_blueprint_light_dash_"'));
  const mainJsx = readRel('frontend/src/main.jsx');
  assert.ok(mainJsx.includes('applyDashboardThemeToDocument'));

  // 2) US English Male Voice at clear non-fast rate
  const voiceJsx = readRel('frontend/src/components/common/GBSVoiceAssistant.jsx');
  assert.ok(voiceJsx.includes('selectPreferredAmericanMaleVoice'));
  assert.ok(voiceJsx.includes('return 0.88;'));

  // 3) Developer Dashboard contains zero hardcoded fake staff breach entries, simulate buttons, or 123456 bypass
  const devDash = readRel('frontend/src/modules/developer-platform/pages/DeveloperDashboard.jsx');
  assert.equal(devDash.includes('mr.kofi.physics@staugustine.edu'), false);
  assert.equal(devDash.includes('accounts.sarah@accracityschool.edu'), false);
  assert.equal(devDash.includes('handleSimulateIntrusion'), false);
  assert.equal(devDash.includes('handleSimulateFacialVerification'), false);
  assert.equal(devDash.includes('enteredOtp === "123456"'), false);

  // 4) Universal Evidence Image Preview Lightbox mounted globally
  const appJsx = readRel('frontend/src/app/App.jsx');
  assert.ok(appJsx.includes('UniversalImagePreviewLightbox'));

  // 5) Full-Page Active Tabs Controller mounted globally + AdminDashboard uses pushState
  const routerJsx = readRel('frontend/src/router/AppRouter.jsx');
  assert.ok(routerJsx.includes('DashboardTabPageController'));
  const adminDash = readRel('frontend/src/modules/portal/pages/dashboards/admin/AdminDashboard.jsx');
  assert.ok(adminDash.includes('window.history.pushState({ tab: cleanTab }'));
  assert.ok(adminDash.includes('handleLaunchHeadmasterLiveConference'));

  // 6) Global Live Call Receivers mounted across Staff, HR, Accountant, and Secretary dashboards
  for (const dashRel of [
    'frontend/src/modules/portal/pages/dashboards/staff/StaffDashboard.jsx',
    'frontend/src/modules/portal/pages/dashboards/hr/HRDashboard.jsx',
    'frontend/src/modules/portal/pages/dashboards/accountant/AccountantDashboard.jsx',
    'frontend/src/modules/portal/pages/dashboards/secretary/SecretaryDashboard.jsx'
  ]) {
    const src = readRel(dashRel);
    assert.ok(src.includes('variant="GLOBAL_RECEIVER"'), `${dashRel} must mount LiveCallLauncherAndReceiver GLOBAL_RECEIVER`);
  }

  // 7) Responsive CSS arranges tabs with wrap (never nowrap clipping on mobile)
  const responsiveCss = readRel('frontend/src/styles/responsive.css');
  assert.equal(responsiveCss.includes('flex-wrap: nowrap'), false);
  assert.ok(responsiveCss.includes('flex-wrap: wrap !important'));

  // 8) Zero native title= tooltips in upgraded components
  for (const compRel of [
    'frontend/src/components/common/UniversalImagePreviewLightbox.jsx',
    'frontend/src/components/common/DashboardTabPageController.jsx',
    'frontend/src/components/common/MobileAppPushHubModal.jsx',
    'frontend/src/components/common/SchoolStationeryHubPanel.jsx',
    'frontend/src/components/common/LiveInSystemCallModal.jsx',
    'frontend/src/components/common/LiveCallLauncherAndReceiver.jsx'
  ]) {
    const src = readRel(compRel);
    assert.equal(/\btitle\s*=\s*["'{]/.test(src), false, `${compRel} must not include native title= tooltips`);
  }
});
