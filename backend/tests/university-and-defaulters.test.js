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
const universityRoutes = require('../src/modules/university/university.routes');
const academicRoutes = require('../src/modules/academic/academic.routes');

function buildApp() {
  const app = express();
  app.use(express.json({ limit: '5mb' }));
  app.use('/api/v1/university', universityRoutes);
  app.use('/api/v1/academic', academicRoutes);
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
    institutions: [
      ...(curr.institutions || []).filter((t) => ![910, 911, 912, 913].includes(Number(t.id))),
      { id: 910, tenantId: 910, tenantCode: 'tnt_jhs_910', institutionName: 'Test Basic School', institutionType: 'NURSERY_TO_JHS', status: 'ACTIVE', isApproved: true },
      { id: 911, tenantId: 911, tenantCode: 'tnt_shs_911', institutionName: 'Test Senior High', institutionType: 'SENIOR_HIGH_SCHOOL', status: 'ACTIVE', isApproved: true },
      { id: 912, tenantId: 912, tenantCode: 'tnt_tvet_912', institutionName: 'Test Technical Institute', institutionType: 'TECHNICAL', status: 'ACTIVE', isApproved: true },
      { id: 913, tenantId: 913, tenantCode: 'tnt_uni_913', institutionName: 'Test GBS University', institutionType: 'UNIVERSITY', status: 'ACTIVE', isApproved: true }
    ],
    universityInternships: [],
    universityStreams: [],
    universityGovernanceRoles: [],
    universityExams: [],
    universityCourseResults: [],
    universityGraduations: [],
    registeredUsers: [
      ...(curr.registeredUsers || []).filter((u) => !['u_910', 'u_911', 'u_912', 'u_913', 'lec_913', 'adm_913', 'stu_uni_grad_01'].includes(String(u.id))),
      { id: 'u_910', firstName: 'Basic', lastName: 'Pupil', email: 'jhs910@gbs.edu', role: 'STUDENT', tenantId: 910, institutionType: 'NURSERY_TO_JHS', status: 'ACTIVE', isApproved: true },
      { id: 'u_911', firstName: 'SHS', lastName: 'Student', email: 'shs911@gbs.edu', role: 'STUDENT', tenantId: 911, institutionType: 'SENIOR_HIGH_SCHOOL', status: 'ACTIVE', isApproved: true },
      { id: 'u_912', firstName: 'TVET', lastName: 'Trainee', email: 'tvet912@gbs.edu', role: 'STUDENT', tenantId: 912, institutionType: 'TECHNICAL', status: 'ACTIVE', isApproved: true },
      { id: 'u_913', firstName: 'Uni', lastName: 'Scholar', email: 'uni913@gbs.edu', role: 'STUDENT', tenantId: 913, institutionType: 'UNIVERSITY', status: 'ACTIVE', isApproved: true },
      { id: 'lec_913', firstName: 'Prof.', lastName: 'Mensah', email: 'lec913@gbs.edu', role: 'TEACHER', tenantId: 913, institutionType: 'UNIVERSITY', status: 'ACTIVE', isApproved: true },
      { id: 'adm_913', firstName: 'Vice', lastName: 'Chancellor', email: 'adm913@gbs.edu', role: 'HEADMASTER', tenantId: 913, institutionType: 'UNIVERSITY', status: 'ACTIVE', isApproved: true },
      {
        id: 'stu_uni_grad_01',
        firstName: 'Kwesi',
        lastName: 'Appiah',
        email: 'uni.scholar@gbs.edu',
        role: 'STUDENT',
        tenantId: 913,
        institutionType: 'UNIVERSITY',
        status: 'ACTIVE',
        isApproved: true
      }
    ]
  }));
});

test.after(() => {
  if (originalStoreBackup !== null) {
    fs.writeFileSync(STORE_PATH, originalStoreBackup, 'utf8');
  }
});

test('1. Strict Institution Separation: JHS, SHS, Technical get 403 on University endpoints; University succeeds', async () => {
  const app = buildApp();
  const server = http.createServer(app);
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  try {
    for (const [tenantId, tier] of [[910, 'NURSERY_TO_JHS'], [911, 'SENIOR_HIGH_SCHOOL'], [912, 'TECHNICAL']]) {
      const token = jwt.sign({ id: `u_${tenantId}`, role: 'STUDENT', tenantId, institutionType: tier }, envConfig.jwt.secret);
      const authHeader = { Authorization: `Bearer ${token}` };

      const profileRes = await reqJson(baseUrl, 'GET', '/api/v1/university/profile', null, authHeader);
      assert.equal(profileRes.status, 200);
      assert.equal(profileRes.json.data.institutionType, tier);

      const internBlocked = await reqJson(baseUrl, 'GET', '/api/v1/university/internships', null, authHeader);
      assert.equal(internBlocked.status, 403, `${tier} must be blocked from university internships`);

      const srcBlocked = await reqJson(baseUrl, 'GET', '/api/v1/university/governance', null, authHeader);
      assert.equal(srcBlocked.status, 403, `${tier} must be blocked from university SRC`);
    }

    const uniToken = jwt.sign({ id: 'u_913', role: 'STUDENT', tenantId: 913, institutionType: 'UNIVERSITY' }, envConfig.jwt.secret);
    const streamsRes = await reqJson(baseUrl, 'GET', '/api/v1/university/streams', null, { Authorization: `Bearer ${uniToken}` });
    assert.equal(streamsRes.status, 200);
    const names = streamsRes.json.data.streams.map((s) => s.streamName);
    assert.ok(names.includes('Regular Students'));
    assert.ok(names.includes('Evening Students'));
    assert.ok(names.includes('Sandwich Students'));
    assert.ok(names.includes('Weekend Students'));
  } finally {
    await new Promise((r) => server.close(r));
  }
});

test('2. University Internship Submission & Course/Internship Grading', async () => {
  const app = buildApp();
  const server = http.createServer(app);
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  try {
    const studentToken = jwt.sign({ id: 'stu_uni_grad_01', role: 'STUDENT', email: 'uni.scholar@gbs.edu', tenantId: 913, institutionType: 'UNIVERSITY' }, envConfig.jwt.secret);
    const lecturerToken = jwt.sign({ id: 'lec_913', role: 'TEACHER', firstName: 'Dr.', lastName: 'Mensah', tenantId: 913, institutionType: 'UNIVERSITY' }, envConfig.jwt.secret);

    const submitRes = await reqJson(baseUrl, 'POST', '/api/v1/university/internships', {
      studentName: 'Kwesi Appiah',
      companyName: 'Ghana Tech Corp',
      companyAddress: 'Accra Digital Centre',
      supervisorName: 'Eng. Kofi Owusu',
      startDate: '2026-06-01',
      endDate: '2026-08-30',
      stream: 'Weekend Students',
      objectives: 'Build cloud backend microservices'
    }, { Authorization: `Bearer ${studentToken}` });

    assert.equal(submitRes.status, 201);
    const internId = submitRes.json.data.internship.id;
    assert.equal(submitRes.json.data.internship.status, 'SUBMITTED');

    const gradeRes = await reqJson(baseUrl, 'PATCH', `/api/v1/university/internships/${internId}/grade`, {
      supervisorScore: 90,
      reportScore: 85,
      courseGradeScore: 80,
      lecturerRemarks: 'Outstanding industrial performance'
    }, { Authorization: `Bearer ${lecturerToken}` });

    assert.equal(gradeRes.status, 200);
    // 90*0.4 + 85*0.4 + 80*0.2 = 36 + 34 + 16 = 86
    assert.equal(gradeRes.json.data.internship.finalScore, 86);
    assert.equal(gradeRes.json.data.internship.letterGrade, 'A');
    assert.equal(gradeRes.json.data.internship.status, 'GRADED');
  } finally {
    await new Promise((r) => server.close(r));
  }
});

test('3. University Lecturer Exam Setup, Course Result Grading, Progression & Graduation to ALUMNI', async () => {
  const app = buildApp();
  const server = http.createServer(app);
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  try {
    const lecturerToken = jwt.sign({ id: 'lec_913', role: 'TEACHER', firstName: 'Prof.', lastName: 'Addo', tenantId: 913, institutionType: 'UNIVERSITY' }, envConfig.jwt.secret);
    const authHeader = { Authorization: `Bearer ${lecturerToken}` };

    const examRes = await reqJson(baseUrl, 'POST', '/api/v1/university/exams', {
      courseCode: 'CS401',
      courseTitle: 'Distributed Systems',
      creditHours: 3,
      targetLevel: 'Level 400',
      passMark: 50
    }, authHeader);
    assert.equal(examRes.status, 201);
    assert.equal(examRes.json.data.exam.courseCode, 'CS401');

    // Failing score must block graduation
    const failRes = await reqJson(baseUrl, 'POST', '/api/v1/university/results', {
      studentName: 'Fail Student',
      studentEmail: 'fail.student@gbs.edu',
      courseCode: 'CS401',
      score: 42,
      passMark: 50
    }, authHeader);
    assert.equal(failRes.status, 201);
    assert.equal(failRes.json.data.result.passed, false);

    const blockedGrad = await reqJson(baseUrl, 'POST', '/api/v1/university/advance-student', {
      studentName: 'Fail Student',
      studentEmail: 'fail.student@gbs.edu',
      currentLevel: 'Level 400',
      action: 'GRADUATE'
    }, authHeader);
    assert.equal(blockedGrad.status, 400);

    // Passing score advances Level 100 -> 200 and graduates Level 400 -> ALUMNI
    const passRes = await reqJson(baseUrl, 'POST', '/api/v1/university/results', {
      studentName: 'Kwesi Appiah',
      studentEmail: 'uni.scholar@gbs.edu',
      courseCode: 'CS401',
      courseTitle: 'Distributed Systems',
      creditHours: 3,
      score: 88,
      passMark: 50
    }, authHeader);
    assert.equal(passRes.status, 201);
    assert.equal(passRes.json.data.result.passed, true);
    assert.equal(passRes.json.data.result.letterGrade, 'A');

    const lvlAdv = await reqJson(baseUrl, 'POST', '/api/v1/university/advance-student', {
      studentName: 'Kwesi Appiah',
      studentEmail: 'uni.scholar@gbs.edu',
      currentLevel: 'Level 100',
      action: 'ADVANCE'
    }, authHeader);
    assert.equal(lvlAdv.status, 200);
    assert.equal(lvlAdv.json.data.newLevel, 'Level 200');

    const gradRes = await reqJson(baseUrl, 'POST', '/api/v1/university/advance-student', {
      studentName: 'Kwesi Appiah',
      studentEmail: 'uni.scholar@gbs.edu',
      currentLevel: 'Level 400',
      action: 'GRADUATE',
      programme: 'B.Sc. Computer Science'
    }, authHeader);
    assert.equal(gradRes.status, 200);
    assert.equal(gradRes.json.data.outcome, 'GRADUATED_TO_ALUMNI');
    assert.equal(gradRes.json.data.graduation.honoursClass, 'First Class Honours');

    const updatedStore = readPersistentStore();
    const promotedUser = updatedStore.registeredUsers.find((u) => u.email === 'uni.scholar@gbs.edu');
    assert.equal(promotedUser.role, 'ALUMNI');
  } finally {
    await new Promise((r) => server.close(r));
  }
});

test('4. University SRC Positions/Manifestos, Custom Stream & Defaulters Report (Exams/Assignments/Attendance)', async () => {
  const app = buildApp();
  const server = http.createServer(app);
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  try {
    const adminToken = jwt.sign({ id: 'adm_913', role: 'HEADMASTER', tenantId: 913, institutionType: 'UNIVERSITY' }, envConfig.jwt.secret);
    const authHeader = { Authorization: `Bearer ${adminToken}` };

    const govRes = await reqJson(baseUrl, 'POST', '/api/v1/university/governance', {
      positionTitle: 'SRC Academic Affairs Officer',
      holderName: 'Efua Sutherland',
      stream: 'Sandwich Students',
      duties: 'Coordinate tutorial schedules and past paper bank',
      howToHelpSchool: 'Organize weekend exam clinics and peer mentoring'
    }, authHeader);
    assert.equal(govRes.status, 201);
    assert.equal(govRes.json.data.governanceRole.stream, 'Sandwich Students');

    const streamRes = await reqJson(baseUrl, 'POST', '/api/v1/university/streams', {
      streamName: 'Executive MBA Modular',
      scheduleSummary: 'Monthly Intensive Workshops'
    }, authHeader);
    assert.equal(streamRes.status, 201);

    // Sync & query defaulters compliance report
    const syncRes = await reqJson(baseUrl, 'POST', '/api/v1/academic/defaulters-report/sync', {
      students: [{ id: 's1', name: 'Student One' }, { id: 's2', name: 'Student Two' }, { id: 's3', name: 'Student Three' }],
      examNonParticipants: [{ studentId: 's1', studentName: 'Student One', missedExamTitle: 'CS401 Final', classOrLevel: 'Level 400' }],
      assignmentNonSubmitters: [{ studentId: 's2', studentName: 'Student Two', missingAssignmentTitle: 'Lab 4', classOrLevel: 'Level 200' }],
      chronicAbsentees: [{ studentId: 's3', studentName: 'Student Three', absentDays: 12, presentDays: 2, classOrLevel: 'Level 100' }]
    }, authHeader);

    assert.equal(syncRes.status, 200);
    assert.equal(syncRes.json.data.didNotTakeExam.count, 1);
    assert.equal(syncRes.json.data.didNotSubmitAssignment.count, 1);
    assert.equal(syncRes.json.data.notAttendingSchool.count, 1);
  } finally {
    await new Promise((r) => server.close(r));
  }
});
