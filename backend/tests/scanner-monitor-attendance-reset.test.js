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
const aiExamRoutes = require('../src/modules/ai-exam/aiExam.routes');
const staffAttendanceRoutes = require('../src/modules/attendance/staffAttendance.routes');
const authRoutes = require('../src/modules/auth/auth.routes');

function buildApp() {
  const app = express();
  app.use(express.json({ limit: '5mb' }));
  app.use('/api/v1/ai-exam', aiExamRoutes);
  app.use('/api/v1/staff-attendance', staffAttendanceRoutes);
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
    publishedExams: {},
    scannerAnswerKeys: {},
    examSubmissions: {},
    activeProctoringSessions: {},
    proctorMessages: {},
    proctoringEvidenceArchive: {},
    staffAttendanceLogs: {}
  }));
});

test.after(() => {
  if (originalStoreBackup !== null) {
    fs.writeFileSync(STORE_PATH, originalStoreBackup, 'utf8');
  }
});

test('1. AI Exam Scanner saves custom 1..N question count + answer key and auto-marks scripts with exact breakdown, plus all 6 exam formats work', async () => {
  const app = buildApp();
  const server = http.createServer(app);
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  try {
    const teacherToken = jwt.sign({ id: 'usr_teacher_master', firstName: 'Grace', lastName: 'Addo', role: 'TEACHER', tenantId: 1 }, envConfig.jwt.secret);
    const studentToken = jwt.sign({ id: 'usr_student_master', firstName: 'Kofi', lastName: 'Mensah', role: 'STUDENT', tenantId: 1 }, envConfig.jwt.secret);

    // Save 15-question Master Answer Key (exact field teacherAnswerKey sent by TeacherDashboard & ExamScannerDashboard)
    const customKey = {};
    const studentBubbles = {};
    for (let i = 1; i <= 15; i++) {
      customKey[i] = ['A', 'B', 'C', 'D'][i % 4];
      studentBubbles[i] = i <= 13 ? customKey[i] : 'A';
      if (i > 13 && customKey[i] === 'A') studentBubbles[i] = 'B';
    }

    const saveKeyRes = await reqJson(baseUrl, 'POST', '/api/v1/ai-exam/answer-key', {
      examId: 'SCAN-15',
      questionCount: 15,
      marksPerQuestion: 2,
      teacherAnswerKey: customKey
    }, { Authorization: `Bearer ${teacherToken}` });

    assert.equal(saveKeyRes.status, 200);
    assert.equal(saveKeyRes.json.data.answerKey.questionCount, 15);
    assert.equal(saveKeyRes.json.data.answerKey.marksPerQuestion, 2);

    const getKeyRes = await reqJson(baseUrl, 'GET', '/api/v1/ai-exam/answer-key?examId=SCAN-15', null, {
      Authorization: `Bearer ${teacherToken}`
    });
    assert.equal(getKeyRes.status, 200);
    assert.equal(getKeyRes.json.data.answerKey.questionCount, 15);

    // Run AI Scan & Grading with saved 15-question key (ensure exam exists or use default class exam fallback)
    const objExamRes = await reqJson(baseUrl, 'POST', '/api/v1/ai-exam/exams', {
      title: '15-Question OMR Paper',
      totalMarks: 30,
      passMarks: 15,
      questionBank: []
    }, { Authorization: `Bearer ${teacherToken}` });
    assert.equal(objExamRes.status, 201);
    const objExamId = objExamRes.json.data.exam.id;

    await reqJson(baseUrl, 'POST', '/api/v1/ai-exam/answer-key', {
      examId: objExamId,
      questionCount: 15,
      marksPerQuestion: 2,
      teacherAnswerKey: customKey
    }, { Authorization: `Bearer ${teacherToken}` });

    const scanRes = await reqJson(baseUrl, 'POST', '/api/v1/ai-exam/scan-grade', {
      examId: objExamId,
      studentId: 101,
      questionCount: 15,
      marksPerQuestion: 2,
      extractedAnswers: studentBubbles
    }, { Authorization: `Bearer ${teacherToken}` });

    assert.equal(scanRes.status, 201);
    assert.equal(scanRes.json.data.totalQuestions, 15);
    assert.equal(scanRes.json.data.correctCount, 13);
    assert.equal(scanRes.json.data.matchedAnswers, 13);
    assert.equal(scanRes.json.data.scoreObtained, 26);
    assert.equal(scanRes.json.data.totalMarks, 30);
    assert.equal(scanRes.json.data.percentage, 87);
    assert.equal(scanRes.json.data.perQuestionBreakdown.length, 15);

    // Verify all 6 question formats in multi-format exam creation & student submission
    const multiCreateRes = await reqJson(baseUrl, 'POST', '/api/v1/ai-exam/exams', {
      title: '6-Format Comprehensive Assessment',
      totalMarks: 75,
      passMarks: 38,
      enableProctoring: true,
      questionBank: [
        { questionNumber: 1, questionType: 'MULTIPLE_CHOICE', questionText: 'MCQ Q1', options: ['2', '4', '6', '8'], correctOption: 'B', marks: 10 },
        { questionNumber: 2, questionType: 'TRUE_FALSE', questionText: 'TF Q2', options: ['True', 'False'], correctOption: 'A', marks: 10 },
        { questionNumber: 3, questionType: 'FILL_IN_BLANK', questionText: 'Water formula is ____', acceptedAnswer: 'H2O', acceptedKeywords: 'h2o', marks: 10 },
        { questionNumber: 4, questionType: 'SHORT_ANSWER', questionText: 'Define osmosis.', acceptedAnswer: 'movement of water across a semi-permeable membrane', marks: 15 },
        { questionNumber: 5, questionType: 'THEORY_ESSAY', questionText: 'Discuss Newton laws.', markingGuide: 'Explain 3 laws', marks: 15 },
        { questionNumber: 6, questionType: 'CASE_STUDY', caseScenario: 'Lab beaker diluted to 0.5M.', questionText: 'Calculate volume.', markingGuide: 'C1V1=C2V2', marks: 15 }
      ]
    }, { Authorization: `Bearer ${teacherToken}` });

    assert.equal(multiCreateRes.status, 201);
    const multiId = multiCreateRes.json.data.exam.id;
    assert.equal(multiCreateRes.json.data.exam.questionBank[5].caseScenario, 'Lab beaker diluted to 0.5M.');

    // Student takes exam and streams live EXAMS MONITOR heartbeat with studentIndexNumber & className
    const hbRes = await reqJson(baseUrl, 'POST', '/api/v1/ai-exam/proctor/heartbeat', {
      examId: multiId,
      examTitle: '6-Format Comprehensive Assessment',
      studentId: 'usr_student_master',
      studentIndexNumber: 'GBS-2026-8841',
      className: 'SHS 2 Science',
      studentName: 'Kofi Mensah',
      studentEmail: 'student@gbs.com',
      cameraActive: true,
      snapshotDataUrl: 'data:image/jpeg;base64,LIVEFRAMEBYTES'
    }, { Authorization: `Bearer ${studentToken}` });
    assert.equal(hbRes.status, 200);
    assert.equal(hbRes.json.data.session.studentIndexNumber, 'GBS-2026-8841');
    assert.equal(hbRes.json.data.session.className, 'SHS 2 Science');

    const liveRes = await reqJson(baseUrl, 'GET', `/api/v1/ai-exam/proctor/live?examId=${encodeURIComponent(multiId)}`, null, {
      Authorization: `Bearer ${teacherToken}`
    });
    assert.equal(liveRes.status, 200);
    assert.equal(liveRes.json.data.sessions.length, 1);
    assert.equal(liveRes.json.data.sessions[0].studentIndexNumber, 'GBS-2026-8841');
    assert.equal(liveRes.json.data.sessions[0].className, 'SHS 2 Science');
    assert.equal(liveRes.json.data.sessions[0].snapshotDataUrl, 'data:image/jpeg;base64,LIVEFRAMEBYTES');

    const submitMultiRes = await reqJson(baseUrl, 'POST', '/api/v1/ai-exam/scan-grade', {
      examId: multiId,
      studentId: 'usr_student_master',
      answers: { '1': 'B', '2': 'A' },
      writtenAnswers: {
        '3': 'H2O',
        '4': 'Movement of water across a semi-permeable membrane',
        '5': 'First law of inertia, second F=ma, third action-reaction.',
        '6': 'Using C1V1=C2V2 gives 250 mL.'
      }
    }, { Authorization: `Bearer ${studentToken}` });
    assert.equal(submitMultiRes.status, 201);
    assert.equal(submitMultiRes.json.data.objectiveScore, 30);
    assert.equal(submitMultiRes.json.data.needsManualReview, true);
    const shortQ = submitMultiRes.json.data.perQuestionBreakdown.find((q) => q.questionType === 'SHORT_ANSWER');
    assert.equal(shortQ.autoSuggestedMarks, 15);
    const caseQ = submitMultiRes.json.data.perQuestionBreakdown.find((q) => q.questionType === 'CASE_STUDY');
    assert.equal(caseQ.caseScenario, 'Lab beaker diluted to 0.5M.');
  } finally {
    await new Promise((r) => server.close(r));
  }
});

test('2. Staff & School Clinic Doctor/Nurse Clock-In / Clock-Out tracks shifts and Headmaster can view all departments while non-admin cannot', async () => {
  const app = buildApp();
  const server = http.createServer(app);
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  try {
    // Seed authentic non-demo Live Production staff/admin/student users in store so Demo starter logs are NOT seeded
    writePersistentStore((curr) => ({
      ...curr,
      registeredUsers: [
        ...(curr.registeredUsers || []).filter((u) => !['usr_live_adm', 'usr_live_doc', 'usr_live_tch', 'usr_live_stu'].includes(u.id)),
        { id: 'usr_live_adm', tenantId: 1, firstName: 'Arthur', lastName: 'Pendleton', role: 'ADMIN', email: 'hm.live@school.edu', isActive: true, isApproved: true },
        { id: 'usr_live_doc', tenantId: 1, firstName: 'Dr. Comfort', lastName: 'Owusu', role: 'STAFF', email: 'doctor.owusu@school.edu', isActive: true, isApproved: true },
        { id: 'usr_live_tch', tenantId: 1, firstName: 'Sarah', lastName: 'Jenkins', role: 'TEACHER', email: 'sarah@school.edu', isActive: true, isApproved: true },
        { id: 'usr_live_stu', tenantId: 1, firstName: 'Student', lastName: 'Probe', role: 'STUDENT', email: 'student.live@school.edu', isActive: true, isApproved: true }
      ]
    }));

    const adminToken = jwt.sign({ id: 'usr_live_adm', firstName: 'Arthur', lastName: 'Pendleton', role: 'ADMIN', tenantId: 1 }, envConfig.jwt.secret);
    const clinicStaffToken = jwt.sign({ id: 'usr_live_doc', firstName: 'Dr. Comfort', lastName: 'Owusu', role: 'STAFF', email: 'doctor.owusu@school.edu', tenantId: 1 }, envConfig.jwt.secret);
    const teacherToken = jwt.sign({ id: 'usr_live_tch', firstName: 'Sarah', lastName: 'Jenkins', role: 'TEACHER', email: 'sarah@school.edu', tenantId: 1 }, envConfig.jwt.secret);
    const studentToken = jwt.sign({ id: 'usr_live_stu', firstName: 'Student', lastName: 'Probe', role: 'STUDENT', tenantId: 1 }, envConfig.jwt.secret);

    const liveHdrs = { 'x-gbs-mode': 'LIVE_PRODUCTION' };
    // Clinic Doctor clocks in as CLINIC_DOCTOR via School Clinic desk (Live clean mode)
    const docIn = await reqJson(baseUrl, 'POST', '/api/v1/staff-attendance/clock-in', {
      isClinicStaff: true,
      staffName: 'Dr. Comfort Owusu',
      staffEmail: 'doctor.owusu@school.edu',
      staffRole: 'CLINIC_DOCTOR',
      department: 'School Clinic (Medical)',
      notes: 'Morning Ward Consultation Duty'
    }, { Authorization: `Bearer ${clinicStaffToken}`, ...liveHdrs });
    assert.equal(docIn.status, 201);
    assert.equal(docIn.json.data.record.staffRole, 'CLINIC_DOCTOR');
    assert.equal(docIn.json.data.record.status, 'CLOCKED_IN');

    // Duplicate active clock-in rejected cleanly with 409
    const dupIn = await reqJson(baseUrl, 'POST', '/api/v1/staff-attendance/clock-in', {
      isClinicStaff: true,
      staffName: 'Dr. Comfort Owusu',
      staffEmail: 'doctor.owusu@school.edu',
      staffRole: 'CLINIC_DOCTOR'
    }, { Authorization: `Bearer ${clinicStaffToken}`, ...liveHdrs });
    assert.equal(dupIn.status, 409);

    // Teacher clocks in
    const tchIn = await reqJson(baseUrl, 'POST', '/api/v1/staff-attendance/clock-in', {
      staffRole: 'TEACHER',
      department: 'Academic Faculty'
    }, { Authorization: `Bearer ${teacherToken}`, ...liveHdrs });
    assert.equal(tchIn.status, 201);

    // Clinic Doctor clocks out cleanly
    const docOut = await reqJson(baseUrl, 'POST', '/api/v1/staff-attendance/clock-out', {
      isClinicStaff: true,
      staffName: 'Dr. Comfort Owusu',
      staffEmail: 'doctor.owusu@school.edu',
      notes: 'Handed over afternoon shift to Nurse Akosua'
    }, { Authorization: `Bearer ${clinicStaffToken}`, ...liveHdrs });
    assert.equal(docOut.status, 200);
    assert.equal(docOut.json.data.record.status, 'CLOCKED_OUT');
    assert.ok(docOut.json.data.record.clockOutAt);

    // Student blocked from viewing Headmaster ledger
    const stuForbidden = await reqJson(baseUrl, 'GET', '/api/v1/staff-attendance/all', null, {
      Authorization: `Bearer ${studentToken}`, ...liveHdrs
    });
    assert.equal(stuForbidden.status, 403);

    // Headmaster inspects CLINIC category vs ALL category
    const clinicOnly = await reqJson(baseUrl, 'GET', '/api/v1/staff-attendance/all?category=CLINIC', null, {
      Authorization: `Bearer ${adminToken}`, ...liveHdrs
    });
    assert.equal(clinicOnly.status, 200);
    assert.equal(clinicOnly.json.data.logs.length, 1);
    assert.equal(clinicOnly.json.data.logs[0].staffRole, 'CLINIC_DOCTOR');

    const allLogs = await reqJson(baseUrl, 'GET', '/api/v1/staff-attendance/all?category=ALL', null, {
      Authorization: `Bearer ${adminToken}`, ...liveHdrs
    });
    assert.equal(allLogs.status, 200);
    assert.equal(allLogs.json.data.logs.length, 2);
    assert.equal(allLogs.json.data.summary.onDutyCount, 1);
    assert.equal(allLogs.json.data.summary.clockedOutCount, 1);
  } finally {
    await new Promise((r) => server.close(r));
  }
});

test('3. Real Password Reset updates credentials via OTP / verification and allows logging in with the new password while blocking developer resets', async () => {
  const app = buildApp();
  const server = http.createServer(app);
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  try {
    // 1. Developer email cannot be reset via standard forgot-password
    const devBlocked = await reqJson(baseUrl, 'POST', '/api/v1/auth/forgot-password', {
      email: 'gabosei48@gmail.com'
    });
    assert.equal(devBlocked.status, 403);

    // 2. Unknown email rejected cleanly with 404
    const missingUser = await reqJson(baseUrl, 'POST', '/api/v1/auth/forgot-password', {
      email: 'nobody.exists@nowhere.edu'
    });
    assert.equal(missingUser.status, 404);

    // 3. Built-in Teacher requests password recovery
    const reqReset = await reqJson(baseUrl, 'POST', '/api/v1/auth/forgot-password', {
      email: 'teacher@gbs.com'
    });
    assert.equal(reqReset.status, 200);
    assert.equal(reqReset.json.data.recoveryDispatched, true);

    // Simulate reading SMS/Inbox dispatched verification OTP from backend passwordResets ledger
    const storeAfterReq = readPersistentStore();
    const resetEntry = (storeAfterReq.passwordResets || []).find((r) => r.email === 'teacher@gbs.com');
    assert.ok(resetEntry && String(resetEntry.resetCode).length === 6);
    const code = resetEntry.resetCode;

    // Wrong OTP fails with 400
    const badOtp = await reqJson(baseUrl, 'POST', '/api/v1/auth/reset-password', {
      email: 'teacher@gbs.com',
      otp: '000000',
      newPassword: 'UpdatedTeacher!99',
      confirmPassword: 'UpdatedTeacher!99'
    });
    assert.equal(badOtp.status, 400);

    // Correct OTP succeeds
    const okReset = await reqJson(baseUrl, 'POST', '/api/v1/auth/reset-password', {
      email: 'teacher@gbs.com',
      otp: code,
      newPassword: 'UpdatedTeacher!99',
      confirmPassword: 'UpdatedTeacher!99'
    });
    assert.equal(okReset.status, 200);

    // Old password rejected, new password works
    const oldLogin = await reqJson(baseUrl, 'POST', '/api/v1/auth/login', {
      email: 'teacher@gbs.com',
      password: 'Teacher123!'
    });
    assert.equal(oldLogin.status, 401);

    const newLogin = await reqJson(baseUrl, 'POST', '/api/v1/auth/login', {
      email: 'teacher@gbs.com',
      password: 'UpdatedTeacher!99'
    });
    assert.equal(newLogin.status, 200);

    // Restore original Teacher123! password cleanly via verified identity challenge (fullName + tenantCode)
    const reqRestore = await reqJson(baseUrl, 'POST', '/api/v1/auth/forgot-password', {
      email: 'teacher@gbs.com'
    });
    assert.equal(reqRestore.status, 200);
    const restoreRes = await reqJson(baseUrl, 'POST', '/api/v1/auth/reset-password', {
      email: 'teacher@gbs.com',
      fullName: resetEntry.fullName || 'Teacher',
      tenantCode: resetEntry.tenantCode || 'GBS-MAIN',
      newPassword: 'Teacher123!',
      confirmPassword: 'Teacher123!'
    });
    assert.equal(restoreRes.status, 200);
  } finally {
    await new Promise((r) => server.close(r));
  }
});
