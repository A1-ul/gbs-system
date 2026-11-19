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
const { rcceCentralErrorHandler } = require('../src/rcce/systemErrorHandler');
const localeRoutes = require('../src/modules/locale/locale.routes');
const userRoutes = require('../src/modules/user/user.routes');
const translateRoutes = require('../src/modules/translate/translate.routes');
const authRoutes = require('../src/modules/auth/auth.routes');

function buildApp() {
  const app = express();
  app.use(express.json({ limit: '2mb' }));
  app.use('/api/v1/locale', localeRoutes);
  app.use('/api/v1/users', userRoutes);
  app.use('/api/v1/translate', translateRoutes);
  app.use('/api/v1/auth', authRoutes);
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
    tenantLocalePreferences: {},
    userLocalePreferences: {},
    institutions: [
      ...(Array.isArray(curr.institutions) ? curr.institutions : []),
      { id: 2, tenantId: 2, tenantCode: 'SCH-B', institutionName: 'School B International', status: 'APPROVED', isApproved: true, isActive: true },
      { id: 3, tenantId: 3, tenantCode: 'SCH-C', institutionName: 'School C Academy', status: 'APPROVED', isApproved: true, isActive: true }
    ],
    registeredUsers: [
      ...(Array.isArray(curr.registeredUsers) ? curr.registeredUsers : []),
      { id: 201, email: 'hm2@schoolb.edu', role: 'ADMIN', tenantId: 2, isApproved: true, isActive: true, status: 'ACTIVE' },
      { id: 202, email: 'teacher2@schoolb.edu', role: 'TEACHER', tenantId: 2, isApproved: true, isActive: true, status: 'ACTIVE' },
      { id: 203, email: 'student2@schoolb.edu', role: 'STUDENT', tenantId: 2, isApproved: true, isActive: true, status: 'ACTIVE' },
      { id: 204, email: 'bursar2@schoolb.edu', role: 'ACCOUNTANT', tenantId: 2, isApproved: true, isActive: true, status: 'ACTIVE' },
      { id: 205, email: 'hr2@schoolb.edu', role: 'HR', tenantId: 2, isApproved: true, isActive: true, status: 'ACTIVE' },
      { id: 302, email: 'teacher3@schoolc.edu', role: 'TEACHER', tenantId: 3, isApproved: true, isActive: true, status: 'ACTIVE' }
    ]
  }));
});

test.after(() => {
  if (originalStoreBackup !== null) {
    fs.writeFileSync(STORE_PATH, originalStoreBackup, 'utf8');
  }
});

test('1. Headmaster Language Choice Propagates Institution-Wide to Staff/Students/Parents for That Tenant Only, Leaving Other Tenants English & Developer Dashboard Immutable', async () => {
  const app = buildApp();
  const server = http.createServer(app);
  await new Promise((r) => server.listen(0, r));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    const signToken = (payload) => jwt.sign(payload, envConfig.jwt.secret, { expiresIn: '1h' });

    const hmTenant2 = signToken({ id: 201, email: 'hm2@schoolb.edu', role: 'ADMIN', tenantId: 2 });
    const teacherTenant2 = signToken({ id: 202, email: 'teacher2@schoolb.edu', role: 'TEACHER', tenantId: 2 });
    const studentTenant2 = signToken({ id: 203, email: 'student2@schoolb.edu', role: 'STUDENT', tenantId: 2 });
    const bursarTenant2 = signToken({ id: 204, email: 'bursar2@schoolb.edu', role: 'ACCOUNTANT', tenantId: 2 });
    const hrTenant2 = signToken({ id: 205, email: 'hr2@schoolb.edu', role: 'HR', tenantId: 2 });

    const teacherTenant3 = signToken({ id: 302, email: 'teacher3@schoolc.edu', role: 'TEACHER', tenantId: 3 });
    const devToken = signToken({ id: 'dev_master', email: 'gabosei48@gmail.com', role: 'DEVELOPER', tenantId: 1 });

    // A. Default system language is strictly English for Tenant 2 and Tenant 3
    const initT2 = await reqJson(baseUrl, 'GET', '/api/v1/locale/tenant-preference', null, {
      Authorization: `Bearer ${teacherTenant2}`
    });
    assert.equal(initT2.status, 200);
    assert.equal(initT2.json.data.languageCode, 'en');
    assert.equal(initT2.json.data.isDefault, true);

    // B. Non-admin Teacher cannot overwrite the whole institution's language via /tenant-preference
    const deniedTeacher = await reqJson(baseUrl, 'PATCH', '/api/v1/locale/tenant-preference', {
      languageCode: 'es'
    }, { Authorization: `Bearer ${teacherTenant2}` });
    assert.equal(deniedTeacher.status, 403);

    // C. Headmaster of Tenant 2 sets preferred institution language to French (fr)
    const setFr = await reqJson(baseUrl, 'PATCH', '/api/v1/locale/tenant-preference', {
      languageCode: 'fr',
      countryCode: 'FR'
    }, { Authorization: `Bearer ${hmTenant2}` });
    assert.equal(setFr.status, 200);
    assert.equal(setFr.json.data.languageCode, 'fr');
    assert.equal(setFr.json.data.countryCode, 'FR');

    // D. Every Tenant 2 role (Teacher, Student, Bursar, HR) inherits French automatically
    for (const [label, tok] of [
      ['TEACHER', teacherTenant2],
      ['STUDENT', studentTenant2],
      ['ACCOUNTANT', bursarTenant2],
      ['HR', hrTenant2]
    ]) {
      const checkRes = await reqJson(baseUrl, 'GET', '/api/v1/locale/tenant-preference', null, {
        Authorization: `Bearer ${tok}`
      });
      assert.equal(checkRes.status, 200, `${label} check failed`);
      assert.equal(checkRes.json.data.languageCode, 'fr', `${label} did not inherit Headmaster French language`);
      assert.equal(checkRes.json.data.countryCode, 'FR', `${label} country norm mismatch`);
      assert.equal(checkRes.json.data.inheritedFromInstitution, true);
    }

    // E. Tenant 3 stays strictly isolated in default English (zero cross-tenant leakage)
    const t3Check = await reqJson(baseUrl, 'GET', '/api/v1/locale/tenant-preference', null, {
      Authorization: `Bearer ${teacherTenant3}`
    });
    assert.equal(t3Check.status, 200);
    assert.equal(t3Check.json.data.languageCode, 'en');
    assert.equal(t3Check.json.data.countryCode, 'GH');

    // F. Developer Control Center NEVER changes (locked to English & LTR even when requesting alongside Tenant 2)
    const devCheck = await reqJson(baseUrl, 'GET', '/api/v1/locale/tenant-preference?tenantId=2', null, {
      Authorization: `Bearer ${devToken}`,
      'X-User-Role': 'DEVELOPER'
    });
    assert.equal(devCheck.status, 200);
    assert.equal(devCheck.json.data.languageCode, 'en');
    assert.equal(devCheck.json.data.rtl, false);
    assert.equal(devCheck.json.data.lockedDeveloperEnglish, true);

    const devMutate = await reqJson(baseUrl, 'PATCH', '/api/v1/locale/tenant-preference', {
      languageCode: 'ar'
    }, { Authorization: `Bearer ${devToken}` });
    assert.equal(devMutate.status, 403);

    // G. Developer login response also remains locked English while Tenant 1 Headmaster switch propagates
    const devLogin = await reqJson(baseUrl, 'POST', '/api/v1/auth/login', {
      email: 'gabosei48@gmail.com',
      password: '0543294615Gab'
    });
    assert.equal(devLogin.status, 200);
    assert.equal(devLogin.json.data.user.localePreferences.languageCode, 'en');
    assert.equal(devLogin.json.data.user.localePreferences.lockedDeveloperEnglish, true);

    // H. Headmaster of Tenant 2 reverts institution back to English (en) -> staff return to English
    const resetEn = await reqJson(baseUrl, 'PATCH', '/api/v1/locale/tenant-preference', {
      languageCode: 'en',
      countryCode: 'GH'
    }, { Authorization: `Bearer ${hmTenant2}` });
    assert.equal(resetEn.status, 200);
    assert.equal(resetEn.json.data.languageCode, 'en');

    const teacherAfterReset = await reqJson(baseUrl, 'GET', '/api/v1/locale/tenant-preference', null, {
      Authorization: `Bearer ${teacherTenant2}`
    });
    assert.equal(teacherAfterReset.json.data.languageCode, 'en');
  } finally {
    await new Promise((r) => server.close(r));
  }
});

test('2. Batch UI Translation Endpoint (/api/v1/translate/batch) Accurately Translates Institution Writtens & Restores English Cleanly', async () => {
  const app = buildApp();
  const server = http.createServer(app);
  await new Promise((r) => server.listen(0, r));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    const frBatch = await reqJson(baseUrl, 'POST', '/api/v1/translate/batch', {
      targetLang: 'fr',
      texts: [
        'Headmaster Command Center',
        'Teacher Portal',
        'School Clinic & Medical Registry',
        'Sign Out'
      ]
    });
    assert.equal(frBatch.status, 200);
    const mapFr = frBatch.json.data.translations;
    assert.equal(mapFr['Headmaster Command Center'], 'Centre de Commandement du Directeur');
    assert.equal(mapFr['Teacher Portal'], 'Portail Enseignant');
    assert.equal(mapFr['Sign Out'], 'Déconnexion');

    const arBatch = await reqJson(baseUrl, 'POST', '/api/v1/translate/batch', {
      targetLang: 'ar',
      texts: ['Teacher Portal', 'Students', 'Sign Out']
    });
    assert.equal(arBatch.status, 200);
    assert.equal(arBatch.json.data.translations['Teacher Portal'], 'بوابة المعلم');
    assert.equal(arBatch.json.data.translations['Students'], 'الطلاب');

    const enBatch = await reqJson(baseUrl, 'POST', '/api/v1/translate/batch', {
      targetLang: 'en',
      texts: ['Headmaster Command Center', 'Teacher Portal']
    });
    assert.equal(enBatch.status, 200);
    assert.equal(enBatch.json.data.translations['Teacher Portal'], 'Teacher Portal');
  } finally {
    await new Promise((r) => server.close(r));
  }
});
