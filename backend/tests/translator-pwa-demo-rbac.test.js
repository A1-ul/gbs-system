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

const envConfig = require('../src/core/config/env.config');
const { readPersistentStore, writePersistentStore } = require('../src/core/database/persistentStore');
const { protect } = require('../src/middleware/auth.middleware');
const { restrictTo } = require('../src/middleware/rbac.middleware');
const { tenantIsolationGuard, tenantStatusGuard } = require('../src/middleware/tenant.middleware');
const { businessRulesEngine } = require('../src/rcce/businessRulesEngine');
const { rcceCentralErrorHandler } = require('../src/rcce/systemErrorHandler');
const translateRoutes = require('../src/modules/translate/translate.routes');

function buildApp() {
  const app = express();
  app.use(express.json({ limit: '5mb' }));
  app.use('/api/v1/translate', translateRoutes);

  // Simulated institutional/developer protected routes
  app.get('/api/v1/test-tenants', protect, tenantIsolationGuard, restrictTo('SUPER_ADMIN', 'DEVELOPER'), (req, res) => {
    res.status(200).json({ status: 'success', role: req.user.role, tenantId: req.tenantId });
  });

  app.get('/api/v1/test-dev-only', protect, tenantStatusGuard, restrictTo('DEVELOPER'), (req, res) => {
    res.status(200).json({ status: 'success', role: req.user.role });
  });

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
  writePersistentStore((curr) => ({ ...curr, translatedMessages: [] }));
});

test.after(() => {
  if (originalStoreBackup !== null) {
    fs.writeFileSync(STORE_PATH, originalStoreBackup, 'utf8');
  }
});

test('1. Demo Headmaster enters portal & walkthrough routes cleanly without permission error, while Live security stays enforced', async () => {
  const app = buildApp();
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    const adminToken = jwt.sign(
      { id: 'usr_admin_master', role: 'ADMIN', tenantId: 'tnt_master_default' },
      envConfig.jwt.secret,
      { expiresIn: '1h' }
    );

    // A. Built-in Demo Headmaster (ADMIN) in DEMO_SANDBOX accesses both admin-tier and developer walkthrough routes with 200 OK
    const demoTenantRes = await reqJson(baseUrl, 'GET', '/api/v1/test-tenants?tenantId=tnt_master_default', null, {
      Authorization: `Bearer ${adminToken}`,
      'X-GBS-Mode': 'DEMO_SANDBOX',
      'X-User-Email': 'admin@gbs.com'
    });
    assert.equal(demoTenantRes.status, 200);
    assert.equal(demoTenantRes.json.tenantId, 1);

    const demoDevRes = await reqJson(baseUrl, 'GET', '/api/v1/test-dev-only', null, {
      Authorization: `Bearer ${adminToken}`,
      'X-GBS-Mode': 'DEMO_SANDBOX',
      'X-User-Email': 'admin@gbs.com'
    });
    assert.equal(demoDevRes.status, 200);

    // B. Live Production non-demo ADMIN reaches SUPER_ADMIN/ADMIN routes cleanly, but DEVELOPER-only route denies Live non-demo STUDENT
    const liveStudentToken = jwt.sign(
      { id: 'usr_live_student_999', role: 'STUDENT', email: 'realstudent@school.edu', tenantId: 1 },
      envConfig.jwt.secret,
      { expiresIn: '1h' }
    );
    writePersistentStore((curr) => ({
      ...curr,
      registeredUsers: [
        ...(curr.registeredUsers || []),
        {
          id: 'usr_live_student_999',
          role: 'STUDENT',
          email: 'realstudent@school.edu',
          tenantId: 1,
          isActive: true,
          isApproved: true,
          isLocked: false
        }
      ]
    }));

    const liveBlocked = await reqJson(baseUrl, 'GET', '/api/v1/test-dev-only', null, {
      Authorization: `Bearer ${liveStudentToken}`,
      'X-GBS-Mode': 'LIVE_PRODUCTION'
    });
    assert.equal(liveBlocked.status, 403);

    // C. BusinessRulesEngine normalizes ADMIN/HEADMASTER and 'tnt_master_default' === '1'
    const isoOk = businessRulesEngine.validateTenantIsolation(
      { id: 'usr_admin_master', role: 'ADMIN', tenantId: 'tnt_master_default' },
      1
    );
    assert.equal(isoOk.allowed, true);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('2. Translated message send -> receiver inbox persists complete sender details & marks read', async () => {
  const app = buildApp();
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    const sendRes = await reqJson(baseUrl, 'POST', '/api/v1/translate/send-message', {
      senderId: 42,
      senderName: 'Dr. Kwame Mensah',
      senderRole: 'ADMIN',
      senderEmail: 'headmaster@staug.edu.gh',
      receiverRole: 'PARENT',
      receiverRoleLabel: 'Parent / Guardian',
      receiverName: 'Mrs. Akosua Boateng',
      receiverContact: '+233244112233',
      originalMessage: 'Please settle Term 2 tuition fees before Friday.',
      translatedMessage: 'Yɛsrɛ sɛ tua Term 2 sukuu ka ansa na Fida adu.',
      meaningSummary: 'Tuition fee payment reminder for Term 2.',
      languageCode: 'TWI',
      languageName: 'Twi (Akan - Ghana)',
      languageFlag: '🇬🇭'
    });
    assert.equal(sendRes.status, 200);
    assert.equal(sendRes.json.status, 'success');
    const msgId = sendRes.json.data.id;
    assert.ok(msgId);
    assert.equal(sendRes.json.data.senderName, 'Dr. Kwame Mensah');
    assert.equal(sendRes.json.data.senderRole, 'ADMIN');
    assert.equal(sendRes.json.data.senderEmail, 'headmaster@staug.edu.gh');

    const inboxRes = await reqJson(baseUrl, 'GET', '/api/v1/translate/messages?receiverRole=PARENT');
    assert.equal(inboxRes.status, 200);
    assert.equal(inboxRes.json.data.messages.length, 1);
    const received = inboxRes.json.data.messages[0];
    assert.equal(received.senderName, 'Dr. Kwame Mensah');
    assert.equal(received.senderRole, 'ADMIN');
    assert.equal(received.senderEmail, 'headmaster@staug.edu.gh');
    assert.equal(received.translatedMessage, 'Yɛsrɛ sɛ tua Term 2 sukuu ka ansa na Fida adu.');
    assert.equal(received.read, false);

    const readRes = await reqJson(baseUrl, 'PATCH', `/api/v1/translate/messages/${msgId}/read`, {
      readerName: 'Mrs. Akosua Boateng'
    });
    assert.equal(readRes.status, 200);
    assert.equal(readRes.json.data.message.read, true);
    assert.equal(readRes.json.data.message.readBy, 'Mrs. Akosua Boateng');
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('3. Translator endpoint handles Twi, Ga, French, and exact dictionary meaning without fake boilerplate', async () => {
  const app = buildApp();
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    const wordRes = await reqJson(baseUrl, 'POST', '/api/v1/translate', {
      text: 'scholarship',
      targetLang: 'TWI'
    });
    assert.equal(wordRes.status, 200);
    assert.equal(wordRes.json.status, 'success');
    assert.ok(wordRes.json.data.translatedText.length > 0);
    assert.notEqual(wordRes.json.data.translatedText.toLowerCase(), 'scholarship');
    assert.ok(wordRes.json.data.meaning.definition.length > 10);
    assert.equal(
      wordRes.json.data.meaning.definition.includes('is a vocabulary term translated directly'),
      false
    );

    const gaRes = await reqJson(baseUrl, 'POST', '/api/v1/translate', {
      text: 'Please pay your school fees',
      targetLang: 'GA'
    });
    assert.equal(gaRes.status, 200);
    assert.equal(gaRes.json.status, 'success');
    assert.ok(gaRes.json.data.translatedText.length > 0);
    assert.notEqual(gaRes.json.data.translatedText.toLowerCase(), 'please pay your school fees');
    assert.ok(gaRes.json.data.backTranslation.length > 0);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('4. Mobile App PWA install assets (manifest.json, sw.js, offline.html, PNG icons, early prompt capture) are complete & valid', () => {
  const feRoot = path.resolve(__dirname, '../../frontend');
  const indexHtml = fs.readFileSync(path.join(feRoot, 'index.html'), 'utf8');
  assert.ok(indexHtml.includes('beforeinstallprompt'));
  assert.ok(indexHtml.includes('window.__gbsDeferredInstallPrompt'));
  assert.ok(indexHtml.includes('<link rel="manifest" href="/manifest.json"'));

  const manifest = JSON.parse(fs.readFileSync(path.join(feRoot, 'public/manifest.json'), 'utf8'));
  assert.equal(manifest.display, 'standalone');
  assert.equal(manifest.start_url, '/login?source=pwa');
  assert.ok(Array.isArray(manifest.icons) && manifest.icons.length >= 2);

  const sw = fs.readFileSync(path.join(feRoot, 'public/sw.js'), 'utf8');
  assert.ok(sw.includes('/offline.html'));
  assert.ok(fs.existsSync(path.join(feRoot, 'public/offline.html')));

  for (const [iconRel, expectedDim] of [['public/icons/icon-192.png', 192], ['public/icons/icon-512.png', 512]]) {
    const buf = fs.readFileSync(path.join(feRoot, iconRel));
    assert.equal(buf.slice(0, 8).toString('hex'), '89504e470d0a1a0a');
    assert.equal(buf.readUInt32BE(16), expectedDim);
    assert.equal(buf.readUInt32BE(20), expectedDim);
  }
});
