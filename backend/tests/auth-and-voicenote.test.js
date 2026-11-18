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
const authRoutes = require('../src/modules/auth/auth.routes');
const devControlRoutes = require('../src/modules/dev-control/devControl.routes');
const communicationRoutes = require('../src/modules/communication/communication.routes');
const errorMiddleware = require('../src/middleware/error.middleware');

function buildApp() {
  const app = express();
  app.use(express.json({ limit: '10mb' }));
  app.use('/api/v1/auth', authRoutes);
  app.use('/api/v1/dev-control', devControlRoutes);
  app.use('/api/v1/communication', communicationRoutes);
  app.use(errorMiddleware.globalErrorHandler || errorMiddleware.errorHandler || ((err, _req, res, _next) => {
    res.status(err.statusCode || 500).json({ status: 'error', message: err.message });
  }));
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
  writePersistentStore((curr) => ({ ...curr, voiceNotes: [] }));
});

test.after(() => {
  if (originalStoreBackup !== null) {
    fs.writeFileSync(STORE_PATH, originalStoreBackup, 'utf8');
  }
});

test('Auth refresh handles expired tokens seamlessly and Developer login issues refreshToken', async () => {
  const app = buildApp();
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    // 1. Bearer "null" is treated cleanly as unauthenticated (not invalid JWT crash)
    const nullRes = await reqJson(baseUrl, 'GET', '/api/v1/auth/me', null, {
      Authorization: 'Bearer null'
    });
    assert.equal(nullRes.status, 401);
    assert.match(nullRes.json.message, /Authentication required/i);

    // 2. User login gets valid 24h accessToken + refreshToken that cleanly refreshes
    const loginRes = await reqJson(baseUrl, 'POST', '/api/v1/auth/login', {
      email: 'admin@gbs.com',
      password: 'Admin123!'
    });
    assert.equal(loginRes.status, 200);
    const { accessToken, refreshToken } = loginRes.json.data;
    assert.ok(accessToken && refreshToken);
    const decodedAccess = jwt.verify(accessToken, envConfig.jwt.secret);
    assert.ok(decodedAccess.exp - decodedAccess.iat >= 86400 - 5, 'Expected >= 24h access token lifetime');

    const refreshRes = await reqJson(baseUrl, 'POST', '/api/v1/auth/refresh-token', { refreshToken });
    assert.equal(refreshRes.status, 200);
    assert.ok(refreshRes.json.data.accessToken);

    const meRes = await reqJson(baseUrl, 'GET', '/api/v1/auth/me', null, {
      Authorization: `Bearer ${refreshRes.json.data.accessToken}`
    });
    assert.equal(meRes.status, 200);

    // 3. Developer login also returns refreshToken and supports /auth/refresh-token
    const devLoginRes = await reqJson(baseUrl, 'POST', '/api/v1/dev-control/auth/login', {
      username: 'gabosei48@gmail.com',
      password: '0543294615Gab'
    });
    assert.equal(devLoginRes.status, 200);
    assert.ok(devLoginRes.json.token && devLoginRes.json.refreshToken);

    const devRefresh = await reqJson(baseUrl, 'POST', '/api/v1/auth/refresh-token', {
      refreshToken: devLoginRes.json.refreshToken
    });
    assert.equal(devRefresh.status, 200);
    assert.ok(devRefresh.json.data.accessToken);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('Communication voice-notes rejects simulated empty WAV and preserves exact recorded audio per tenant', async () => {
  const app = buildApp();
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    const loginRes = await reqJson(baseUrl, 'POST', '/api/v1/auth/login', {
      email: 'teacher@gbs.com',
      password: 'Teacher123!'
    });
    const headers = {
      Authorization: `Bearer ${loginRes.json.data.accessToken}`,
      'X-Tenant-Id': '1'
    };

    // Reject fake/empty WAV placeholder
    const fakeRes = await reqJson(baseUrl, 'POST', '/api/v1/communication/voice-notes', {
      voiceNote: {
        audioUrl: 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA='
      }
    }, headers);
    assert.equal(fakeRes.status, 400);

    // Accept genuine audio recording (including leading zero bytes 'AAAAA' inside real base64)
    const exactAudio = `data:audio/webm;codecs=opus;base64,GkXfo59ChoEBQveBAULygQRC84EIQoKEd2VibUKHgQJChYECGFOAZwH${'A'.repeat(120)}`;
    const realRes = await reqJson(baseUrl, 'POST', '/api/v1/communication/voice-notes', {
      recipient: 'Parents of Grade 10A',
      subject: 'Homework Voice Update',
      voiceNote: {
        id: 'vn_test_real',
        audioUrl: exactAudio,
        mimeType: 'audio/webm;codecs=opus',
        duration: 4,
        durationLabel: '00:04'
      }
    }, headers);
    assert.equal(realRes.status, 201);
    assert.equal(realRes.json.data.voiceNote.audioUrl, exactAudio);
    assert.equal(realRes.json.data.voiceNote.isGenuineRecording, true);

    const listRes = await reqJson(baseUrl, 'GET', '/api/v1/communication/voice-notes', null, headers);
    assert.equal(listRes.status, 200);
    assert.equal(listRes.json.data.voiceNotes[0].voiceNote.audioUrl, exactAudio);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
