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
const { demoLimitMiddleware, resetDemoUsageCounters } = require('../src/middleware/demoLimit.middleware');
const transportRoutes = require('../src/modules/transport/transport.routes');
const authRoutes = require('../src/modules/auth/auth.routes');
const errorMiddleware = require('../src/middleware/error.middleware');

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/v1', demoLimitMiddleware);
  app.use('/api/v1/auth', authRoutes);
  app.use('/api/v1/transport', transportRoutes);
  app.use(errorMiddleware.globalErrorHandler || errorMiddleware.errorHandler || ((err, _req, res, _next) => {
    res.status(err.statusCode || 500).json({ status: 'error', message: err.message });
  }));
  return app;
}

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
    prismaModels: {
      ...(curr.prismaModels || {}),
      TransportRoute: [],
      TransportVehicle: [],
      TransportAssignment: []
    }
  }));
});

test.after(() => {
  if (originalStoreBackup !== null) {
    fs.writeFileSync(STORE_PATH, originalStoreBackup, 'utf8');
  }
});

test('Transport commuter routes & student bus route assignment work end-to-end across Demo & Live tenants', async () => {
  const app = buildApp();
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    const demoToken = signToken({
      id: 1,
      tenantId: 1,
      role: 'ADMIN',
      email: 'admin@gbs.com',
      isDemo: true
    });
    const demoHeaders = {
      Authorization: `Bearer ${demoToken}`,
      'X-Tenant-Id': '1',
      'X-GBS-Mode': 'DEMO_SANDBOX'
    };

    // 1. Default commuter routes populate cleanly (fixing blank "Select Commuter Route")
    const routesRes = await reqJson(baseUrl, 'GET', '/api/v1/transport/routes', null, demoHeaders);
    assert.equal(routesRes.status, 200);
    assert.equal(routesRes.json.success, true);
    assert.ok(routesRes.json.data.records.length >= 5, 'Expected starter Demo commuter routes');
    const chosenRoute = routesRes.json.data.records[0];
    assert.ok(chosenRoute.id && chosenRoute.route_code && chosenRoute.name);
    assert.ok(Array.isArray(chosenRoute.stops));

    // 2. Assigning a student with selected routeId & alphanumeric student index works cleanly
    const assignRes = await reqJson(baseUrl, 'POST', '/api/v1/transport/assignments', {
      studentId: 'STU-2026-099',
      studentName: 'Kofi Antwi',
      routeId: String(chosenRoute.id),
      pickupStop: 'American House Junction',
      dropoffStop: chosenRoute.end_location || 'GBS Main Campus'
    }, demoHeaders);
    assert.equal(assignRes.status, 201);
    assert.equal(assignRes.json.success, true);
    assert.equal(assignRes.json.data.route_code, chosenRoute.route_code);
    assert.equal(assignRes.json.data.route_name, chosenRoute.name);

    // 3. Invalid routeId fails cleanly with clear message
    const invalidRes = await reqJson(baseUrl, 'POST', '/api/v1/transport/assignments', {
      studentId: 'STU-2026-100',
      studentName: 'Akua Mensah',
      routeId: '999999',
      pickupStop: 'Nowhere Stop',
      dropoffStop: 'GBS Main Campus'
    }, demoHeaders);
    assert.equal(invalidRes.status, 400);
    assert.equal(invalidRes.json.success, false);

    // 4. Assignments list returns joined route fields and Unassign removes record cleanly
    const listRes = await reqJson(baseUrl, 'GET', '/api/v1/transport/assignments', null, demoHeaders);
    assert.equal(listRes.status, 200);
    const createdRow = listRes.json.data.records.find((r) => r.student_name === 'Kofi Antwi');
    assert.ok(createdRow);
    assert.equal(createdRow.route_code, chosenRoute.route_code);

    const delRes = await reqJson(baseUrl, 'DELETE', `/api/v1/transport/assignments/${createdRow.id}`, null, demoHeaders);
    assert.equal(delRes.status, 200);
    assert.equal(delRes.json.success, true);

    // 5. Live Tenant (tenantId = 2) starts completely isolated with 0 routes until admin creates its own
    const liveHeaders = {
      Authorization: `Bearer ${signToken({ id: 42, tenantId: 2, role: 'ADMIN', email: 'head@staugustine.edu.gh', isDemo: false })}`,
      'X-Tenant-Id': '2',
      'X-GBS-Mode': 'LIVE_PRODUCTION'
    };
    const t2RoutesBefore = await reqJson(baseUrl, 'GET', '/api/v1/transport/routes', null, liveHeaders);
    assert.equal(t2RoutesBefore.status, 200);
    assert.equal(t2RoutesBefore.json.data.records.length, 0);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('Demo Sandbox enforces strict 10-entry trial cap per module while Live Production allows unlimited entries', async () => {
  resetDemoUsageCounters();
  const app = buildApp();
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    const demoHeaders = {
      Authorization: `Bearer ${signToken({ id: 1, tenantId: 1, role: 'ADMIN', email: 'admin@gbs.com', isDemo: true })}`,
      'X-Tenant-Id': '1',
      'X-GBS-Mode': 'DEMO_SANDBOX'
    };

    // Failed request (missing fields -> 400) must NOT burn Demo quota
    const badRes = await reqJson(baseUrl, 'POST', '/api/v1/transport/routes', { name: 'Incomplete Route' }, demoHeaders);
    assert.equal(badRes.status, 400);

    // Create exactly 10 valid routes in Demo Mode
    for (let i = 1; i <= 10; i++) {
      const okRes = await reqJson(baseUrl, 'POST', '/api/v1/transport/routes', {
        routeCode: `RT-DEMO-${i}`,
        name: `Demo Route ${i}`,
        startLocation: `Stop ${i}`,
        endLocation: 'GBS Main Campus',
        monthlyFare: 300 + i * 10
      }, demoHeaders);
      assert.equal(okRes.status, 201, `Expected route #${i} in Demo Sandbox to succeed`);
    }

    // 11th entry MUST be blocked cleanly with DEMO_TRIAL_LIMIT_REACHED
    const blockedRes = await reqJson(baseUrl, 'POST', '/api/v1/transport/routes', {
      routeCode: 'RT-DEMO-11',
      name: 'Demo Route 11 Over Limit',
      startLocation: 'Stop 11',
      endLocation: 'GBS Main Campus',
      monthlyFare: 500
    }, demoHeaders);
    assert.equal(blockedRes.status, 403);
    assert.equal(blockedRes.json.code, 'DEMO_TRIAL_LIMIT_REACHED');
    assert.equal(blockedRes.json.data.limit, 10);
    assert.equal(blockedRes.json.data.used, 10);
    assert.equal(blockedRes.json.data.remaining, 0);

    // Check demo-usage endpoint & reset endpoint
    const usageRes = await reqJson(baseUrl, 'GET', '/api/v1/auth/demo-usage', null, demoHeaders);
    assert.equal(usageRes.status, 200);
    assert.equal(usageRes.json.data.modules.transport_routes.used, 10);
    assert.equal(usageRes.json.data.modules.transport_routes.limitReached, true);

    const resetRes = await reqJson(baseUrl, 'POST', '/api/v1/auth/demo-reset', {}, demoHeaders);
    assert.equal(resetRes.status, 200);
    assert.equal(resetRes.json.data.totalUsed, 0);

    // After reset, user can create again in Demo Mode!
    const afterResetRes = await reqJson(baseUrl, 'POST', '/api/v1/transport/routes', {
      routeCode: 'RT-DEMO-AFTER-RESET',
      name: 'Demo Post Reset Route',
      startLocation: 'Reset Gate',
      endLocation: 'GBS Main Campus',
      monthlyFare: 350
    }, demoHeaders);
    assert.equal(afterResetRes.status, 201);

    // Live Production tenant (tenantId: 2) creates 12 routes with ZERO Demo Trial Limit blocking
    const liveHeaders = {
      Authorization: `Bearer ${signToken({ id: 88, tenantId: 2, role: 'ADMIN', email: 'principal@live-school.edu.gh', isDemo: false })}`,
      'X-Tenant-Id': '2',
      'X-GBS-Mode': 'LIVE_PRODUCTION'
    };
    for (let j = 1; j <= 12; j++) {
      const liveRes = await reqJson(baseUrl, 'POST', '/api/v1/transport/routes', {
        routeCode: `RT-LIVE-${j}`,
        name: `Live Production Route ${j}`,
        startLocation: `Live Origin ${j}`,
        endLocation: 'Main Campus',
        monthlyFare: 450
      }, liveHeaders);
      assert.equal(liveRes.status, 201, `Expected Live Production route #${j} (>10) to remain unlimited`);
    }
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
