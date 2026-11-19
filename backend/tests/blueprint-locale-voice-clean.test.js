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
const { COUNTRY_NORMS, LANGUAGE_DEFINITIONS, resolveCountryNorm, resolveLanguageSpec } = require('../src/utils/countryLanguageNorms');
const systemMemoryAssistant = require('../src/modules/ai/systemMemoryAssistant.service');
const devControlService = require('../src/modules/dev-control/devControl.service');
const userRoutes = require('../src/modules/user/user.routes');
const aiRoutes = require('../src/modules/ai/ai.routes');

function buildApp() {
  const app = express();
  app.use(express.json({ limit: '2mb' }));
  app.get('/api/v1/locale/norms', (req, res) => {
    const country = req.query.country ? resolveCountryNorm(req.query.country) : null;
    const language = req.query.language ? resolveLanguageSpec(req.query.language) : null;
    res.setHeader('Cache-Control', 'no-store');
    res.status(200).json({
      status: 'success',
      data: {
        countries: Object.values(COUNTRY_NORMS),
        languages: Object.values(LANGUAGE_DEFINITIONS),
        activeCountry: country,
        activeLanguage: language
      }
    });
  });
  app.use('/api/v1/users', userRoutes);
  app.use('/api/v1/ai', aiRoutes);
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
    registeredUsers: [
      ...(curr.registeredUsers || []).filter((u) => String(u.id) !== 'usr_locale_1'),
      { id: 'usr_locale_1', firstName: 'Global', lastName: 'User', email: 'global@gbs.edu', role: 'ADMIN', tenantId: 1, status: 'ACTIVE', isApproved: true }
    ]
  }));
});

test.after(() => {
  if (originalStoreBackup !== null) {
    fs.writeFileSync(STORE_PATH, originalStoreBackup, 'utf8');
  }
});

test('1. Global Country & Preferred Language Norms + Per-User Persistence', async () => {
  const app = buildApp();
  const server = http.createServer(app);
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  try {
    const normsRes = await reqJson(baseUrl, 'GET', '/api/v1/locale/norms?country=AE&language=ar');
    assert.equal(normsRes.status, 200);
    assert.ok(normsRes.json.data.countries.length >= 15);
    assert.ok(normsRes.json.data.languages.length >= 12);
    assert.equal(normsRes.json.data.activeCountry.code, 'AE');
    assert.equal(normsRes.json.data.activeLanguage.code, 'ar');
    assert.equal(normsRes.json.data.activeLanguage.rtl, true);

    const adminToken = jwt.sign({ id: 'usr_locale_1', role: 'ADMIN', tenantId: 1 }, envConfig.jwt.secret);
    const patchRes = await reqJson(baseUrl, 'PATCH', '/api/v1/users/locale-preferences', {
      countryCode: 'FR',
      languageCode: 'fr'
    }, { Authorization: `Bearer ${adminToken}` });
    assert.equal(patchRes.status, 200);
    assert.equal(patchRes.json.data.countryCode, 'FR');
    assert.equal(patchRes.json.data.languageCode, 'fr');

    const getRes = await reqJson(baseUrl, 'GET', '/api/v1/users/locale-preferences', null, {
      Authorization: `Bearer ${adminToken}`
    });
    assert.equal(getRes.status, 200);
    assert.equal(getRes.json.data.countryCode, 'FR');
    assert.equal(getRes.json.data.languageCode, 'fr');
  } finally {
    await new Promise((r) => server.close(r));
  }
});

test('2. GBS Voice AI Assistant explains how the user question was formed alongside the exact System Memory answer', async () => {
  const app = buildApp();
  const server = http.createServer(app);
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  try {
    const res1 = await reqJson(baseUrl, 'POST', '/api/v1/ai/assistant-query', {
      query: 'How does the automatic mobile app update work when new upgrades arrive?'
    });
    assert.equal(res1.status, 200);
    assert.ok(res1.json.data.answerText, 'Expected direct answerText');
    assert.ok(res1.json.data.questionFormation, 'Expected questionFormation object');
    assert.ok(res1.json.data.questionFormation.explanationText.startsWith('How your question was formed:'));
    assert.ok(res1.json.data.speechText.includes('How your question was formed:'));

    const res2 = await reqJson(baseUrl, 'POST', '/api/v1/ai/assistant-query', {
      query: 'Can institutions select their country and preferred language?'
    });
    assert.equal(res2.status, 200);
    assert.equal(res2.json.data.topicId, 'global_locale');
    assert.match(res2.json.data.questionFormation.questionStyle, /Capability/);
    assert.ok(res2.json.data.speechText.includes('Country') || res2.json.data.speechText.includes('country'));

    const outDirect = systemMemoryAssistant.answerUserQuery(null, 'What is the developer phone number?');
    assert.equal(outDirect.topicId, 'privacy_shield');
    assert.ok(outDirect.questionFormation.explanationText.includes('How your question was formed:'));
  } finally {
    await new Promise((r) => server.close(r));
  }
});

test('3. Developer Control Service returns clean non-placeholder telemetry/alerts/enclaves when DB is empty or offline', async () => {
  const metrics = await devControlService.getSystemMetrics();
  assert.ok(typeof metrics.metrics.totalTenants === 'number');
  assert.ok(typeof metrics.metrics.totalUsers === 'number');

  const alerts = await devControlService.getSystemAlerts();
  assert.ok(Array.isArray(alerts));

  const locateEmpty = await devControlService.locateTenantByHeadmaster('St. Augustine Science Academy');
  assert.equal(locateEmpty.found, false, 'Unregistered hardcoded St. Augustine enclave must not synthesize a fake tenant');
});
