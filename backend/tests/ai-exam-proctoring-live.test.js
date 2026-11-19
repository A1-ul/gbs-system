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

function buildApp() {
  const app = express();
  app.use(express.json({ limit: '5mb' }));
  app.use('/api/v1/ai-exam', aiExamRoutes);
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
    examSubmissions: {},
    activeProctoringSessions: {},
    proctorMessages: {},
    proctoringEvidenceArchive: {}
  }));
});

test.after(() => {
  if (originalStoreBackup !== null) {
    fs.writeFileSync(STORE_PATH, originalStoreBackup, 'utf8');
  }
});

test('1. Live Exam Proctoring streams cameras, dispatches teacher messages (Search/Selected/ALL), archives evidence & subtracts exact lost marks from student final score', async () => {
  const app = buildApp();
  const server = http.createServer(app);
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  try {
    const teacherToken = jwt.sign({ id: 'tch_proc_1', firstName: 'Grace', lastName: 'Addo', role: 'TEACHER', tenantId: 7 }, envConfig.jwt.secret);
    const stuToken1 = jwt.sign({ id: 'stu_proc_1', firstName: 'Abigail', lastName: 'Owusu', role: 'STUDENT', tenantId: 7 }, envConfig.jwt.secret);
    const stuToken2 = jwt.sign({ id: 'stu_proc_2', firstName: 'Daniel', lastName: 'Boateng', role: 'STUDENT', tenantId: 7 }, envConfig.jwt.secret);

    // 1. Teacher creates online exam (4 objective questions @ 25 marks each = 100 total)
    const createExamRes = await reqJson(baseUrl, 'POST', '/api/v1/ai-exam/exams', {
      title: 'Live Proctored Physics Exam',
      subjectName: 'Physics',
      totalMarks: 100,
      passMarks: 50,
      enableProctoring: true,
      questionBank: [
        { questionNumber: 1, questionType: 'MULTIPLE_CHOICE', questionText: 'Q1', options: ['A', 'B', 'C', 'D'], correctOption: 'A', marks: 25 },
        { questionNumber: 2, questionType: 'MULTIPLE_CHOICE', questionText: 'Q2', options: ['A', 'B', 'C', 'D'], correctOption: 'B', marks: 25 },
        { questionNumber: 3, questionType: 'MULTIPLE_CHOICE', questionText: 'Q3', options: ['A', 'B', 'C', 'D'], correctOption: 'C', marks: 25 },
        { questionNumber: 4, questionType: 'MULTIPLE_CHOICE', questionText: 'Q4', options: ['A', 'B', 'C', 'D'], correctOption: 'D', marks: 25 }
      ]
    }, { Authorization: `Bearer ${teacherToken}` });
    assert.equal(createExamRes.status, 201);
    const examId = createExamRes.json.data.exam.id;

    // 2. Both students start exam and push real live camera heartbeats + snapshots
    const fakeSnap1 = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/';
    const hb1 = await reqJson(baseUrl, 'POST', '/api/v1/ai-exam/proctor/heartbeat', {
      examId,
      examTitle: 'Live Proctored Physics Exam',
      studentId: 'stu_proc_1',
      studentName: 'Abigail Owusu',
      studentEmail: 'abigail@school.edu',
      status: 'WARNING_DETECTED',
      movementStatus: 'WARNING_DETECTED',
      cameraActive: true,
      snapshotDataUrl: fakeSnap1,
      latestReason: 'Head turned left repeatedly',
      warningsCount: 2,
      penaltyMarksDeducted: 4,
      marksPerWarning: 2
    }, { Authorization: `Bearer ${stuToken1}` });
    assert.equal(hb1.status, 200);

    const hb2 = await reqJson(baseUrl, 'POST', '/api/v1/ai-exam/proctor/heartbeat', {
      examId,
      examTitle: 'Live Proctored Physics Exam',
      studentId: 'stu_proc_2',
      studentName: 'Daniel Boateng',
      studentEmail: 'daniel@school.edu',
      status: 'CAMERA_ACTIVE',
      movementStatus: 'NORMAL',
      cameraActive: true,
      snapshotDataUrl: fakeSnap1,
      warningsCount: 0,
      penaltyMarksDeducted: 0
    }, { Authorization: `Bearer ${stuToken2}` });
    assert.equal(hb2.status, 200);

    // 3. Teacher inspects live camera wall (all + search filter)
    const liveAll = await reqJson(baseUrl, 'GET', `/api/v1/ai-exam/proctor/live?examId=${encodeURIComponent(examId)}`, null, {
      Authorization: `Bearer ${teacherToken}`
    });
    assert.equal(liveAll.status, 200);
    assert.equal(liveAll.json.data.sessions.length, 2);

    // 4. Teacher sends message to specific student by Name Search + 2-mark invigilator warning deduction on Abigail
    const searchMsg = await reqJson(baseUrl, 'POST', '/api/v1/ai-exam/proctor/message', {
      examId,
      targetMode: 'SEARCH',
      recipientQuery: 'Abigail',
      message: 'Please keep your head centered toward your examination monitor.',
      severity: 'WARNING',
      deductMarks: 2
    }, { Authorization: `Bearer ${teacherToken}` });
    assert.equal(searchMsg.status, 201);
    assert.ok(searchMsg.json.data.proctorMessage.recipientStudentIds.includes('stu_proc_1'));

    // Also broadcast general notice to ALL students
    const allMsg = await reqJson(baseUrl, 'POST', '/api/v1/ai-exam/proctor/message', {
      examId,
      targetMode: 'ALL',
      message: '15 minutes remaining in this Physics examination.',
      severity: 'INFO',
      deductMarks: 0
    }, { Authorization: `Bearer ${teacherToken}` });
    assert.equal(allMsg.status, 201);

    // Verify Abigail receives BOTH messages + synced penalty marks (4 self + 2 teacher = 6 marks!) while Daniel only gets ALL notice
    const stu1Inbox = await reqJson(baseUrl, 'GET', `/api/v1/ai-exam/proctor/messages?examId=${encodeURIComponent(examId)}&studentId=stu_proc_1&studentName=Abigail%20Owusu`, null, {
      Authorization: `Bearer ${stuToken1}`
    });
    assert.equal(stu1Inbox.status, 200);
    assert.equal(stu1Inbox.json.data.messages.length, 2);
    assert.equal(stu1Inbox.json.data.totalSessionPenaltyMarks, 6);

    const stu2Inbox = await reqJson(baseUrl, 'GET', `/api/v1/ai-exam/proctor/messages?examId=${encodeURIComponent(examId)}&studentId=stu_proc_2&studentName=Daniel%20Boateng`, null, {
      Authorization: `Bearer ${stuToken2}`
    });
    assert.equal(stu2Inbox.status, 200);
    assert.equal(stu2Inbox.json.data.messages.length, 1);
    assert.equal(stu2Inbox.json.data.messages[0].targetMode, 'ALL');

    // 5. Teacher saves camera evidence snapshot permanently for reference
    const saveEv = await reqJson(baseUrl, 'POST', '/api/v1/ai-exam/proctor/save-evidence', {
      examId,
      examTitle: 'Live Proctored Physics Exam',
      studentId: 'stu_proc_1',
      studentName: 'Abigail Owusu',
      studentEmail: 'abigail@school.edu',
      snapshotDataUrl: fakeSnap1,
      warningsCount: 3,
      penaltyMarksDeducted: 6,
      teacherNote: 'Looked off-screen during question 3.'
    }, { Authorization: `Bearer ${teacherToken}` });
    assert.equal(saveEv.status, 201);

    const getEv = await reqJson(baseUrl, 'GET', '/api/v1/ai-exam/proctor/evidence?studentName=Abigail', null, {
      Authorization: `Bearer ${teacherToken}`
    });
    assert.equal(getEv.status, 200);
    assert.ok(getEv.json.data.evidenceList.length >= 1);
    assert.equal(getEv.json.data.evidenceList[0].penaltyMarksDeducted, 6);

    // 6. Abigail submits all 4 correct answers (rawScore = 100), system MUST subtract exact 6 lost marks -> Final Score = 94 / 100!
    const submitRes = await reqJson(baseUrl, 'POST', '/api/v1/ai-exam/scan-grade', {
      examId,
      studentId: 'stu_proc_1',
      studentName: 'Abigail Owusu',
      studentEmail: 'abigail@school.edu',
      extractedAnswers: { '1': 'A', '2': 'B', '3': 'C', '4': 'D' },
      penaltyMarksDeducted: 4,
      proctoringWarnings: 2
    }, { Authorization: `Bearer ${stuToken1}` });
    assert.equal(submitRes.status, 201);
    assert.equal(submitRes.json.data.rawScoreObtained, 100);
    assert.equal(submitRes.json.data.proctoringPenaltyMarks, 6, 'Live session teacher + self penalty marks (6) must be deducted cleanly');
    assert.equal(submitRes.json.data.scoreObtained, 94);
    assert.equal(submitRes.json.data.percentage, 94);
  } finally {
    await new Promise((r) => server.close(r));
  }
});
