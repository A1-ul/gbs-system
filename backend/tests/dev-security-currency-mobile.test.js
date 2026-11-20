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
const { rcceCentralErrorHandler } = require('../src/rcce/systemErrorHandler');
const devControlRoutes = require('../src/modules/dev-control/devControl.routes');
const authService = require('../src/modules/auth/auth.service');
const {
  convertGhsToCountryCurrency,
  convertCountryCurrencyToGhs
} = require('../src/utils/countryLanguageNorms');

function buildApp() {
  const app = express();
  app.use(express.json({ limit: '5mb' }));
  app.use('/api/v1/dev-control', devControlRoutes);
  app.use('/api/v1/developer-control-center', devControlRoutes);
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
    developerSecurity: {
      loginLocked: false,
      lockedAt: null,
      lockedReason: null,
      lockEventId: null,
      intrusionEvents: []
    },
    intrusionViolations: []
  }));
});

test.after(() => {
  if (originalStoreBackup !== null) {
    fs.writeFileSync(STORE_PATH, originalStoreBackup, 'utf8');
  }
});

test('1. Developer Login False-Entry Auto-Lockdown, Intruder Camera Snapshot Vault, & Credential Re-Enable', async () => {
  const app = buildApp();
  const server = http.createServer(app);
  await new Promise((r) => server.listen(0, r));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  try {
    // Initially unlocked
    const initialStatus = await reqJson(baseUrl, 'GET', '/api/v1/dev-control/security/login-status');
    assert.equal(initialStatus.status, 200);
    assert.equal(initialStatus.json.data.loginLocked, false);

    // Bad entry triggers immediate 403 + backend loginLocked + lockEventId
    const badAttempt = await reqJson(baseUrl, 'POST', '/api/v1/dev-control/auth/login', {
      username: 'intruder.attacker@gmail.com',
      password: 'WrongPassword123'
    });
    assert.equal(badAttempt.status, 403);
    assert.equal(badAttempt.json.loginLocked, true);
    assert.ok(badAttempt.json.lockEventId);

    // Even valid credentials must now be refused (423 Locked) at standard /auth/login while disabled
    const blockedValidOnLocked = await reqJson(baseUrl, 'POST', '/api/v1/dev-control/auth/login', {
      username: 'gabosei48@gmail.com',
      password: '0543294615Gab'
    });
    assert.equal(blockedValidOnLocked.status, 423);
    assert.match(blockedValidOnLocked.json.message, /false entry to the developer login page/i);

    // Browser transmits captured webcam snapshot & forensic metadata updating that lock event
    const fakeShot = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/';
    const reportRes = await reqJson(baseUrl, 'POST', '/api/v1/dev-control/security/intrusion', {
      id: badAttempt.json.lockEventId,
      attemptedEmail: 'intruder.attacker@gmail.com',
      capturedPhoto: fakeShot,
      intruderPhoto: fakeShot,
      userAgent: 'TestHeadlessChrome/130'
    });
    assert.equal(reportRes.status, 201);
    assert.equal(reportRes.json.data.loginLocked, true);

    // Developer Dashboard intrusions endpoint surfaces the exact camera snapshot & lock state
    const vaultRes = await reqJson(baseUrl, 'GET', '/api/v1/dev-control/security/intrusions');
    assert.equal(vaultRes.status, 200);
    assert.equal(vaultRes.json.data.loginLocked, true);
    const savedEvent = vaultRes.json.data.events.find((e) => e.id === badAttempt.json.lockEventId);
    assert.ok(savedEvent);
    assert.equal(savedEvent.capturedPhoto, fakeShot);
    assert.equal(savedEvent.attemptedEmail, 'intruder.attacker@gmail.com');

    // Wrong credentials cannot re-enable
    const wrongReEnable = await reqJson(baseUrl, 'POST', '/api/v1/dev-control/security/re-enable', {
      email: 'wrong@gmail.com',
      password: '0543294615Gab'
    });
    assert.equal(wrongReEnable.status, 403);

    // Exact empty-box entry of Authorized Developer Gmail + Password re-enables and returns live JWT
    const reEnableRes = await reqJson(baseUrl, 'POST', '/api/v1/dev-control/security/re-enable', {
      email: 'gabosei48@gmail.com',
      password: '0543294615Gab'
    });
    assert.equal(reEnableRes.status, 200);
    assert.equal(reEnableRes.json.data.loginLocked, false);
    assert.ok(reEnableRes.json.token);
    assert.ok(reEnableRes.json.refreshToken);

    // Camera snapshot evidence remains preserved on Developer Dashboard after unlock until manually deleted
    const vaultAfterUnlock = await reqJson(baseUrl, 'GET', '/api/v1/dev-control/security/intrusions');
    assert.equal(vaultAfterUnlock.json.data.loginLocked, false);
    assert.ok(vaultAfterUnlock.json.data.events.some((e) => e.id === badAttempt.json.lockEventId && e.capturedPhoto === fakeShot));
  } finally {
    await new Promise((r) => server.close(r));
  }
});

test('2. Multi-Country Onboarding Subscription Calculation in Country Currency & Accurate Conversion to Ghana Cedis (GH₵)', async () => {
  const app = buildApp();
  const server = http.createServer(app);
  await new Promise((r) => server.listen(0, r));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  try {
    // Pure FX conversion sanity check
    const ngFx = convertGhsToCountryCurrency(1500, 'NG');
    assert.equal(ngFx.currencyCode, 'NGN');
    assert.ok(ngFx.localCurrencyAmount > 100000);
    const backToGhs = convertCountryCurrencyToGhs(ngFx.localCurrencyAmount, 'NGN');
    assert.ok(Math.abs(backToGhs - 1500) <= 1.0);

    // Register schools from Nigeria (NG), United Kingdom (GB), and Ghana (GH)
    const regNg = await authService.registerInstitution({
      institutionName: 'Lagos Crown Academy',
      tenantCode: 'LAG-FX-01',
      country: 'Nigeria',
      countryCode: '+234',
      institutionType: 'SENIOR_HIGH_SCHOOL',
      totalStudentsEnrolled: 100,
      subscribedMonths: 3,
      totalTermFee: 1500,
      adminName: 'Dr. Adeyemi',
      adminEmail: 'adeyemi.lagos@school.ng',
      adminPhone: '0801112223',
      password: 'Password123!'
    });
    assert.equal(regNg.registration.currencyCode, 'NGN');
    assert.equal(regNg.registration.convertedGhsAmount, 1455);
    assert.ok(regNg.registration.localCurrencyAmount > 100000);

    const regUk = await authService.registerInstitution({
      institutionName: 'London Bridge College',
      tenantCode: 'LON-FX-02',
      country: 'United Kingdom',
      countryCode: '+44',
      institutionType: 'UNIVERSITY',
      totalStudentsEnrolled: 200,
      subscribedMonths: 3,
      adminName: 'Prof. Clarke',
      adminEmail: 'clarke.london@college.ac.uk',
      adminPhone: '0770090011',
      password: 'Password123!'
    });
    assert.equal(regUk.registration.currencyCode, 'GBP');
    assert.equal(regUk.registration.convertedGhsAmount, 5820);

    // Verify Developer /country-subscriptions summarizes both countries and total Cedis accurately
    const summaryRes = await reqJson(baseUrl, 'GET', '/api/v1/dev-control/country-subscriptions');
    assert.equal(summaryRes.status, 200);
    const summary = summaryRes.json.data;
    assert.ok(summary.totalCountriesRegistered >= 2);
    const ngGroup = summary.countriesSummary.find((c) => c.countryCode === 'NG');
    const gbGroup = summary.countriesSummary.find((c) => c.countryCode === 'GB');
    assert.ok(ngGroup && ngGroup.currencyCode === 'NGN');
    assert.ok(ngGroup.totalConvertedGhsAmount >= 1455);
    assert.ok(gbGroup && gbGroup.currencyCode === 'GBP');
    assert.ok(gbGroup.totalConvertedGhsAmount >= 5820);
    assert.ok(summary.totalConvertedGhsAmount >= 7275);
  } finally {
    await new Promise((r) => server.close(r));
  }
});

test('3. Mobile App PWA Manifest/SW Repair & Developer Dashboard Isolation Verification', () => {
  const manifestPath = path.resolve(__dirname, '../../frontend/public/manifest.json');
  const swPath = path.resolve(__dirname, '../../frontend/public/sw.js');
  const bannerPath = path.resolve(__dirname, '../../frontend/src/components/common/TopCenterSystemBanner.jsx');
  const devDashPath = path.resolve(__dirname, '../../frontend/src/modules/developer-platform/pages/DeveloperDashboard.jsx');
  const devLoginPath = path.resolve(__dirname, '../../frontend/src/modules/developer-platform/pages/DeveloperLogin.jsx');

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  assert.equal(manifest.start_url, '/login?source=pwa');

  const swSrc = fs.readFileSync(swPath, 'utf8');
  assert.match(swSrc, /DISPATCH_LOCK_SCREEN_PUSH/);
  assert.match(swSrc, /self\.registration\.showNotification/);
  assert.match(swSrc, /caches\.match\(["']\/["']\)/);

  const bannerSrc = fs.readFileSync(bannerPath, 'utf8');
  assert.match(bannerSrc, /!isDevMode[\s\S]*Demo Institution Tier Switcher/);

  const devDashSrc = fs.readFileSync(devDashPath, 'utf8');
  assert.ok(!devDashSrc.includes('ARCHIVED APPROVED REGISTRATIONS & ACCEPTANCE VAULT'), 'Archived Approved Vault must be removed from Developer Dashboard');
  assert.ok(!devDashSrc.includes('NEW REGISTERED USERS & STAFF QUALIFICATION QUEUE'), 'Staff Member Signups queue must be removed from Developer Dashboard');
  assert.match(devDashSrc, /dev-country-subscriptions-panel/);
  assert.match(devDashSrc, /dev-gate-email/);

  const devLoginSrc = fs.readFileSync(devLoginPath, 'utf8');
  assert.ok(!devLoginSrc.includes('Reset to Chief Developer'), 'Prefill shortcut must not exist on Developer Login');
  assert.match(devLoginSrc, /useState\(""\)/);
  assert.match(devLoginSrc, /there has been a false entry to the developer login page to access the developer portal/);
});
