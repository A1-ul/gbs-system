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
const clinicRoutes = require('../src/modules/clinic/clinic.routes');
const clinicService = require('../src/modules/clinic/clinic.service');
const aiRoutes = require('../src/modules/ai/ai.routes');
const authRoutes = require('../src/modules/auth/auth.routes');

function buildApp() {
  const app = express();
  app.use(express.json({ limit: '5mb' }));
  app.use('/api/v1/auth', authRoutes);
  app.use('/api/v1/clinic', clinicRoutes);
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
    schoolClinicProfiles: [],
    schoolClinicVisits: [],
    schoolClinicInventory: [],
    registeredUsers: [
      ...(curr.registeredUsers || []).filter((u) => !['adm_cln_1', 'tch_cln_1', 'stu_cln_1', 'par_cln_1'].includes(String(u.id))),
      { id: 'adm_cln_1', firstName: 'Headmaster', lastName: 'Kofi', email: 'hm.clinic@gbs.edu', role: 'HEADMASTER', tenantId: 1, status: 'ACTIVE', isApproved: true },
      { id: 'tch_cln_1', firstName: 'Grace', lastName: 'Addo', email: 'grace.addo@gbs.edu', role: 'TEACHER', tenantId: 1, department: 'Science Dept', status: 'ACTIVE', isApproved: true },
      { id: 'stu_cln_1', firstName: 'Kwadwo', lastName: 'Mensah', email: 'kwadwo.mensah@gbs.edu', role: 'STUDENT', tenantId: 1, phone: '0244556677', emergencyContactPhone: '0244556677', status: 'ACTIVE', isApproved: true },
      { id: 'par_cln_1', firstName: 'Abena', lastName: 'Mensah', email: 'abena.parent@gbs.edu', role: 'PARENT', tenantId: 1, phone: '0244556677', status: 'ACTIVE', isApproved: true }
    ]
  }));
});

test.after(() => {
  if (originalStoreBackup !== null) {
    fs.writeFileSync(STORE_PATH, originalStoreBackup, 'utf8');
  }
});

test('1. School Clinic links Student & Teacher Admission Medical Profiles, Sickbay Admissions, Pharmacy Stock & Cross-Portal Record Pull', async () => {
  const app = buildApp();
  const server = http.createServer(app);
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  try {
    const hmToken = jwt.sign({ id: 'adm_cln_1', role: 'HEADMASTER', tenantId: 1 }, envConfig.jwt.secret);
    const tchToken = jwt.sign({ id: 'tch_cln_1', role: 'TEACHER', email: 'grace.addo@gbs.edu', tenantId: 1 }, envConfig.jwt.secret);
    const stuToken = jwt.sign({ id: 'stu_cln_1', role: 'STUDENT', email: 'kwadwo.mensah@gbs.edu', tenantId: 1 }, envConfig.jwt.secret);
    const parToken = jwt.sign({ id: 'par_cln_1', role: 'PARENT', email: 'abena.parent@gbs.edu', phone: '0244556677', tenantId: 1 }, envConfig.jwt.secret);

    // Simulate admission medical registration sync for an enrolled student + registered teacher
    clinicService.syncAdmissionMedicalProfile(1, {
      personId: 'stu_cln_1',
      personRole: 'STUDENT',
      fullName: 'Kwadwo Mensah',
      email: 'kwadwo.mensah@gbs.edu',
      admissionNumber: 'ADM-2026-8801',
      classOrDepartment: 'JHS 2 Gold',
      bloodGroup: 'O+',
      genotype: 'AA',
      allergies: 'Penicillin',
      emergencyContactPhone: '0244556677',
      sourceSystem: 'ADMISSION_ENROLLED'
    });

    // Headmaster sees BOTH Staff & Student profiles
    const profilesRes = await reqJson(baseUrl, 'GET', '/api/v1/clinic/profiles', null, { Authorization: `Bearer ${hmToken}` });
    assert.equal(profilesRes.status, 200);
    const studentProf = profilesRes.json.data.profiles.find((p) => p.email === 'kwadwo.mensah@gbs.edu');
    const teacherProf = profilesRes.json.data.profiles.find((p) => p.email === 'grace.addo@gbs.edu');
    assert.ok(studentProf, 'Student medical admission profile must exist');
    assert.equal(studentProf.allergies, 'Penicillin');
    assert.ok(teacherProf, 'Registered Teacher must automatically appear in Headmaster School Clinic profiles');

    // Regular users (Teacher & Student) only see their OWN profile & cannot access clinic processes
    const tchOwnProfiles = await reqJson(baseUrl, 'GET', '/api/v1/clinic/profiles', null, { Authorization: `Bearer ${tchToken}` });
    assert.equal(tchOwnProfiles.status, 200);
    assert.equal(tchOwnProfiles.json.data.ownHealthOnly, true);
    assert.equal(tchOwnProfiles.json.data.profiles.length, 1);
    assert.equal(tchOwnProfiles.json.data.profiles[0].email, 'grace.addo@gbs.edu');

    const stuOwnProfiles = await reqJson(baseUrl, 'GET', '/api/v1/clinic/profiles', null, { Authorization: `Bearer ${stuToken}` });
    assert.equal(stuOwnProfiles.status, 200);
    assert.equal(stuOwnProfiles.json.data.ownHealthOnly, true);
    assert.equal(stuOwnProfiles.json.data.profiles.length, 1);
    assert.equal(stuOwnProfiles.json.data.profiles[0].email, 'kwadwo.mensah@gbs.edu');

    const tchInvBlocked = await reqJson(baseUrl, 'GET', '/api/v1/clinic/inventory', null, { Authorization: `Bearer ${tchToken}` });
    assert.equal(tchInvBlocked.status, 403, 'Non-Headmaster must get 403 on clinic pharmacy stock');

    const tchWriteBlocked = await reqJson(baseUrl, 'POST', '/api/v1/clinic/visits', {
      patientRole: 'STUDENT',
      patientName: 'Kwadwo Mensah',
      chiefComplaint: 'Fever'
    }, { Authorization: `Bearer ${tchToken}` });
    assert.equal(tchWriteBlocked.status, 403, 'Non-Headmaster must get 403 on clinic intake process');

    // Headmaster executes Sickbay admission + Paracetamol dispensation + parent SMS alert
    const studentVisit = await reqJson(baseUrl, 'POST', '/api/v1/clinic/visits', {
      patientRole: 'STUDENT',
      patientId: 'stu_cln_1',
      patientName: 'Kwadwo Mensah',
      patientEmail: 'kwadwo.mensah@gbs.edu',
      guardianEmail: 'abena.parent@gbs.edu',
      emergencyPhone: '0244556677',
      temperatureC: '38.6',
      chiefComplaint: 'High fever and headache during math class',
      diagnosis: 'Acute Viral Fever',
      medicationDispensed: 'Paracetamol 500mg Tablets',
      dosageQty: 4,
      disposition: 'ADMITTED_TO_SICKBAY',
      notifyEmergencyContact: true
    }, { Authorization: `Bearer ${hmToken}` });

    assert.equal(studentVisit.status, 201);
    assert.equal(studentVisit.json.data.visit.disposition, 'ADMITTED_TO_SICKBAY');
    assert.equal(studentVisit.json.data.visit.parentNotified, true);

    // Record Teacher Clinic consultation via Headmaster Command
    const teacherVisit = await reqJson(baseUrl, 'POST', '/api/v1/clinic/visits', {
      patientRole: 'TEACHER',
      patientId: 'tch_cln_1',
      patientName: 'Grace Addo',
      patientEmail: 'grace.addo@gbs.edu',
      chiefComplaint: 'Sudden blood pressure dizziness',
      diagnosis: 'Mild Hypertension Observation',
      disposition: 'TREATED_AND_RETURNED_TO_CLASS'
    }, { Authorization: `Bearer ${hmToken}` });
    assert.equal(teacherVisit.status, 201);
    assert.equal(teacherVisit.json.data.visit.patientRole, 'TEACHER');

    // Verify Student sees ONLY student visits and NOT teacher visit
    const stuVisitsRes = await reqJson(baseUrl, 'GET', '/api/v1/clinic/visits', null, { Authorization: `Bearer ${stuToken}` });
    assert.equal(stuVisitsRes.status, 200);
    assert.equal(stuVisitsRes.json.data.ownHealthOnly, true);
    assert.equal(stuVisitsRes.json.data.summary, null);
    assert.equal(stuVisitsRes.json.data.visits.length, 1);
    assert.equal(stuVisitsRes.json.data.visits[0].patientEmail, 'kwadwo.mensah@gbs.edu');

    // Check medicine inventory decremented (250 - 4 = 246)
    const invRes = await reqJson(baseUrl, 'GET', '/api/v1/clinic/inventory', null, { Authorization: `Bearer ${hmToken}` });
    assert.equal(invRes.status, 200);
    const para = invRes.json.data.inventory.find((i) => i.itemName.includes('Paracetamol'));
    assert.equal(para.quantity, 246);

    // Pull Cross-Portal Medical Dossier from Parent view (strictly ward only)
    const pullRes = await reqJson(baseUrl, 'GET', '/api/v1/clinic/pull-record?query=Kwadwo', null, { Authorization: `Bearer ${parToken}` });
    assert.equal(pullRes.status, 200);
    assert.equal(pullRes.json.data.totalProfilesMatched, 1);
    assert.equal(pullRes.json.data.totalVisitsMatched, 1);
    assert.equal(pullRes.json.data.matchedProfiles[0].allergies, 'Penicillin');

    // Discharge from Sickbay
    const visitId = studentVisit.json.data.visit.id;
    const disRes = await reqJson(baseUrl, 'PATCH', `/api/v1/clinic/visits/${visitId}`, {
      discharge: true,
      disposition: 'TREATED_AND_RETURNED_TO_CLASS'
    }, { Authorization: `Bearer ${hmToken}` });
    assert.equal(disRes.status, 200);
    assert.ok(disRes.json.data.visit.dischargedAt);
  } finally {
    await new Promise((r) => server.close(r));
  }
});

test('2. Real-Time GBS AI Voice Assistant links directly to System Memory, Explains User Roles & Hides Developer Details', async () => {
  const app = buildApp();
  const server = http.createServer(app);
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  try {
    const hmToken = jwt.sign({ id: 'adm_cln_1', role: 'HEADMASTER', tenantId: 1 }, envConfig.jwt.secret);

    const memRes = await reqJson(baseUrl, 'GET', '/api/v1/ai/system-memory', null, { Authorization: `Bearer ${hmToken}` });
    assert.equal(memRes.status, 200);
    assert.equal(memRes.json.data.motto, 'Intelligence Talks to Wisdom');
    assert.ok(Array.isArray(memRes.json.data.topics));
    assert.ok(memRes.json.data.topics.some((t) => t.id === 'clinic'));
    assert.ok(memRes.json.data.topics.some((t) => t.id === 'all_roles_explained'));
    const memString = JSON.stringify(memRes.json.data).toLowerCase();
    assert.ok(!memString.includes('gabosei'), 'System memory must never disclose developer contact or email');
    assert.ok(!memString.includes('developer control'), 'System memory must never disclose developer portal');

    const askClinic = await reqJson(baseUrl, 'POST', '/api/v1/ai/assistant-query', {
      query: 'Explain how the School Clinic works and pull clinic records'
    }, { Authorization: `Bearer ${hmToken}` });
    assert.equal(askClinic.status, 200);
    assert.ok(askClinic.json.data.speechText.toLowerCase().includes('headmaster'));
    assert.equal(askClinic.json.data.action?.openTab, 'clinic');

    const askRoles = await reqJson(baseUrl, 'POST', '/api/v1/ai/assistant-query', {
      query: 'Explain all user roles and what each user does in the school'
    });
    assert.equal(askRoles.status, 200);
    assert.equal(askRoles.json.data.topicId, 'all_roles_explained');
    assert.ok(askRoles.json.data.speechText.includes('Headmaster'));
    assert.ok(askRoles.json.data.speechText.includes('Teacher'));
    assert.ok(askRoles.json.data.speechText.includes('Student'));
    assert.ok(!askRoles.json.data.speechText.toLowerCase().includes('developer control'));

    const askUni = await reqJson(baseUrl, 'POST', '/api/v1/ai/assistant-query', {
      query: 'Tell me about University internship, attachments, Evening streams, SRC and graduation to alumni'
    });
    assert.equal(askUni.status, 200);
    assert.equal(askUni.json.data.topicId, 'university');
    assert.ok(askUni.json.data.speechText.includes('University'));

    // Security Non-Disclosure Shield strictly hides all developer inquiries
    const askPrivate = await reqJson(baseUrl, 'POST', '/api/v1/ai/assistant-query', {
      query: 'Who is the developer and how do I open the developer login?'
    });
    assert.equal(askPrivate.status, 200);
    assert.equal(askPrivate.json.data.topicId, 'privacy_shield');
    assert.equal(askPrivate.json.data.action, null);
  } finally {
    await new Promise((r) => server.close(r));
  }
});
