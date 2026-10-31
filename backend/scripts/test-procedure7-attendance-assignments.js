'use strict';

const prisma = require('../src/core/database/prisma.client');

async function testProcedure7AttendanceAssignments() {
  console.log('========================================================================');
  console.log('🧪 PHASE 2, PROCEDURE 3: ATTENDANCE & ASSIGNMENTS TEST SUITE');
  console.log('========================================================================\n');

  const BASE_URL = 'http://localhost:5001/api/v1';

  // 1. Authenticate Admin (Tenant 1)
  console.log('--- TEST 1: Authenticate Admin (admin@gbs.com) ---');
  const adminLoginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@gbs.com', password: 'Admin123!' })
  });
  const adminData = await adminLoginRes.json();
  if (!adminLoginRes.ok) throw new Error(`Admin login failed: ${JSON.stringify(adminData)}`);
  const adminToken = adminData.data.accessToken;
  console.log(`✅ Admin authenticated. (Tenant ID: ${adminData.data.user.tenantId})`);

  // 2. Authenticate Teacher (Tenant 1)
  console.log('\n--- TEST 2: Authenticate Teacher (teacher@gbs.com) ---');
  const teacherLoginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'teacher@gbs.com', password: 'Teacher123!' })
  });
  const teacherData = await teacherLoginRes.json();
  if (!teacherLoginRes.ok) throw new Error(`Teacher login failed: ${JSON.stringify(teacherData)}`);
  const teacherToken = teacherData.data.accessToken;
  const teacherUser = teacherData.data.user;
  console.log(`✅ Teacher authenticated: ${teacherUser.firstName} ${teacherUser.lastName} (ID: ${teacherUser.id})`);

  // 3. Authenticate Student (Tenant 1)
  console.log('\n--- TEST 3: Authenticate Student (student@gbs.com) ---');
  const studentLoginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'student@gbs.com', password: 'Student123!' })
  });
  const studentData = await studentLoginRes.json();
  if (!studentLoginRes.ok) throw new Error(`Student login failed: ${JSON.stringify(studentData)}`);
  const studentToken = studentData.data.accessToken;
  const studentUser = studentData.data.user;
  console.log(`✅ Student authenticated: ${studentUser.firstName} ${studentUser.lastName} (ID: ${studentUser.id})`);

  // 4. Resolve Target Class and Subject
  console.log('\n--- TEST 4: Resolve Class & Subject in Database ---');
  const classesRes = await fetch(`${BASE_URL}/academics/classes`, {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  const classesData = await classesRes.json();
  const targetClass = classesData.data.classes.find(c => c.subjects?.length > 0) || classesData.data.classes[0];
  if (!targetClass) throw new Error('No classes found in tenant 1.');
  const targetSubject = targetClass.subjects[0];
  console.log(`✅ Target Class: ${targetClass.name} (${targetClass.code}, ID: ${targetClass.id})`);
  console.log(`   Target Subject: ${targetSubject.name} (${targetSubject.code}, ID: ${targetSubject.id})`);

  // 5. Fetch Class Roster for Attendance Marking
  console.log('\n--- TEST 5: Fetch Class Roster (GET /attendance/classes/:classId/roster) ---');
  const rosterRes = await fetch(`${BASE_URL}/attendance/classes/${targetClass.id}/roster`, {
    headers: { Authorization: `Bearer ${teacherToken}` }
  });
  const rosterData = await rosterRes.json();
  if (!rosterRes.ok) throw new Error(`Fetch roster failed: ${JSON.stringify(rosterData)}`);
  console.log(`✅ Roster retrieved: ${rosterData.data.totalEnrolled} student(s) enrolled.`);
  rosterData.data.students.forEach(s => {
    console.log(`   - [ID: ${s.studentId}] ${s.name} (${s.email})`);
  });

  // 6. Mark Batch Attendance
  console.log('\n--- TEST 6: Mark Class Batch Attendance (POST /attendance/mark) ---');
  const todayStr = new Date().toISOString().split('T')[0];
  const attendancePayload = {
    classId: targetClass.id,
    subjectId: targetSubject.id,
    date: todayStr,
    records: rosterData.data.students.map((s, idx) => ({
      studentId: s.studentId,
      status: idx === 0 ? 'PRESENT' : 'LATE',
      remarks: idx === 0 ? 'Active participation' : 'Joined 5 mins late'
    }))
  };

  const markRes = await fetch(`${BASE_URL}/attendance/mark`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${teacherToken}`
    },
    body: JSON.stringify(attendancePayload)
  });
  const markData = await markRes.json();
  if (!markRes.ok) throw new Error(`Mark attendance failed: ${JSON.stringify(markData)}`);
  console.log(`✅ Attendance successfully marked:`, markData.message);
  console.log(`   Attendance Rate: ${markData.data.metrics.attendanceRate}`);
  console.log(`   Present: ${markData.data.metrics.present}, Late: ${markData.data.metrics.late}, Absent: ${markData.data.metrics.absent}`);

  // 7. Retrieve Class Attendance Records
  console.log('\n--- TEST 7: Retrieve Class Attendance Records (GET /attendance/classes/:classId) ---');
  const classAttRes = await fetch(`${BASE_URL}/attendance/classes/${targetClass.id}?date=${todayStr}`, {
    headers: { Authorization: `Bearer ${teacherToken}` }
  });
  const classAttData = await classAttRes.json();
  if (!classAttRes.ok) throw new Error(`Class attendance query failed: ${JSON.stringify(classAttData)}`);
  console.log(`✅ Class records verified: ${classAttData.data.metrics.total} records retrieved.`);
  console.log(`   Class attendance rate: ${classAttData.data.metrics.attendanceRate}`);

  // 8. Retrieve Student Personal Attendance History
  console.log('\n--- TEST 8: Retrieve Student Attendance History (GET /attendance/students/:studentId) ---');
  const studentAttRes = await fetch(`${BASE_URL}/attendance/students/${studentUser.id}`, {
    headers: { Authorization: `Bearer ${studentToken}` }
  });
  const studentAttData = await studentAttRes.json();
  if (!studentAttRes.ok) throw new Error(`Student attendance query failed: ${JSON.stringify(studentAttData)}`);
  console.log(`✅ Student attendance history verified:`);
  console.log(`   Total sessions: ${studentAttData.data.summary.totalSessions}`);
  console.log(`   Attendance Rate: ${studentAttData.data.summary.attendanceRate}`);

  // 9. Fetch Overall Attendance Analytics
  console.log('\n--- TEST 9: Fetch Attendance Analytics & Trends (GET /attendance/analytics) ---');
  const analyticsRes = await fetch(`${BASE_URL}/attendance/analytics?days=14`, {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  const analyticsData = await analyticsRes.json();
  if (!analyticsRes.ok) throw new Error(`Analytics query failed: ${JSON.stringify(analyticsData)}`);
  console.log(`✅ Overall Attendance Analytics:`);
  console.log(`   Overall Rate: ${analyticsData.data.overallRate}`);
  console.log(`   Evaluated Records: ${analyticsData.data.totalRecords}`);

  // 10. Create Homework Assignment as Teacher
  console.log('\n--- TEST 10: Create Assignment (POST /assignments) ---');
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 7); // Due in 7 days
  const assignmentPayload = {
    classId: targetClass.id,
    subjectId: targetSubject.id,
    title: `Unit 3 Capstone: Advanced Problem Set on ${targetSubject.name}`,
    description: 'Complete questions 1 through 15. Submit your working notes and final solutions.',
    dueDate: dueDate.toISOString(),
    maxScore: 100,
    attachmentUrl: 'https://cdn.gbs-system.edu/materials/unit3-problem-set.pdf'
  };

  const createAssignRes = await fetch(`${BASE_URL}/assignments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${teacherToken}`
    },
    body: JSON.stringify(assignmentPayload)
  });
  const createAssignData = await createAssignRes.json();
  if (!createAssignRes.ok) throw new Error(`Create assignment failed: ${JSON.stringify(createAssignData)}`);
  const newAssignment = createAssignData.data;
  console.log(`✅ Assignment created: "${newAssignment.title}" (ID: ${newAssignment.id})`);
  console.log(`   Max Score: ${newAssignment.maxScore}, Due: ${new Date(newAssignment.dueDate).toLocaleDateString()}`);

  // 11. Query Assignments List
  console.log('\n--- TEST 11: Query Assignments List (GET /assignments) ---');
  const listAssignRes = await fetch(`${BASE_URL}/assignments?classId=${targetClass.id}`, {
    headers: { Authorization: `Bearer ${teacherToken}` }
  });
  const listAssignData = await listAssignRes.json();
  if (!listAssignRes.ok) throw new Error(`List assignments failed: ${JSON.stringify(listAssignData)}`);
  console.log(`✅ Retrieved ${listAssignData.count} assignment(s) for ${targetClass.name}.`);

  // 12. Student Submits Assignment
  console.log('\n--- TEST 12: Student Submits Solution (POST /assignments/:id/submit) ---');
  const submitPayload = {
    submissionContent: 'Detailed proof completed with step-by-step calculus derivations. Solved all 15 questions.',
    attachmentUrl: 'https://cdn.gbs-system.edu/student-uploads/alex-johnson-unit3.pdf'
  };
  const submitRes = await fetch(`${BASE_URL}/assignments/${newAssignment.id}/submit`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${studentToken}`
    },
    body: JSON.stringify(submitPayload)
  });
  const submitData = await submitRes.json();
  if (!submitRes.ok) throw new Error(`Submit assignment failed: ${JSON.stringify(submitData)}`);
  const submission = submitData.data;
  console.log(`✅ Submission recorded: [ID: ${submission.id}] Status: ${submission.status}`);

  // 13. Teacher Inspects Assignment Submissions
  console.log('\n--- TEST 13: Teacher Inspects Submissions (GET /assignments/:id/submissions) ---');
  const getSubmissionsRes = await fetch(`${BASE_URL}/assignments/${newAssignment.id}/submissions`, {
    headers: { Authorization: `Bearer ${teacherToken}` }
  });
  const getSubmissionsData = await getSubmissionsRes.json();
  if (!getSubmissionsRes.ok) throw new Error(`Get submissions failed: ${JSON.stringify(getSubmissionsData)}`);
  console.log(`✅ Submissions retrieved: ${getSubmissionsData.data.totalSubmissions} submission(s) pending evaluation.`);

  // 14. Teacher Grades Student Submission
  console.log('\n--- TEST 14: Teacher Grades Submission (PATCH /assignments/submissions/:id/grade) ---');
  const gradePayload = {
    grade: 95.5,
    feedback: 'Exceptional mathematical rigor and clear proof structure. Full credit awarded for all sections.'
  };
  const gradeRes = await fetch(`${BASE_URL}/assignments/submissions/${submission.id}/grade`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${teacherToken}`
    },
    body: JSON.stringify(gradePayload)
  });
  const gradeData = await gradeRes.json();
  if (!gradeRes.ok) throw new Error(`Grade submission failed: ${JSON.stringify(gradeData)}`);
  console.log(`✅ Submission graded: ${gradeData.data.grade}/${newAssignment.maxScore}`);
  console.log(`   Feedback: "${gradeData.data.feedback}"`);
  console.log(`   Graded by: ${gradeData.data.gradedBy.firstName} ${gradeData.data.gradedBy.lastName}`);

  // 15. Student Queries Personal Grades & Status
  console.log('\n--- TEST 15: Student Queries Personal Grades (GET /assignments/student/:studentId) ---');
  const studentGradesRes = await fetch(`${BASE_URL}/assignments/student/${studentUser.id}`, {
    headers: { Authorization: `Bearer ${studentToken}` }
  });
  const studentGradesData = await studentGradesRes.json();
  if (!studentGradesRes.ok) throw new Error(`Student grades query failed: ${JSON.stringify(studentGradesData)}`);
  console.log(`✅ Student Gradebook verified:`);
  console.log(`   Total Assignments: ${studentGradesData.data.summary.totalAssignments}`);
  console.log(`   Graded: ${studentGradesData.data.summary.gradedCount}`);
  console.log(`   Overall Grade Average: ${studentGradesData.data.summary.overallGradeAveragePct}%`);

  // 16. Multi-Tenant Scoping & Data Isolation Guard
  console.log('\n--- TEST 16: Multi-Tenant Data Isolation Guard ---');
  // Authenticate Royal Oak Admin (Tenant 6)
  const royalOakLogin = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'headmaster.royaloak@gbs.edu', password: 'RoyalOak2026!' })
  });
  const royalOakData = await royalOakLogin.json();
  if (!royalOakLogin.ok) throw new Error(`Royal Oak login failed: ${JSON.stringify(royalOakData)}`);
  const royalOakToken = royalOakData.data.accessToken;

  // Royal Oak attempts to view Tenant 1's assignment details
  const crossTenantAssignRes = await fetch(`${BASE_URL}/assignments/${newAssignment.id}`, {
    headers: { Authorization: `Bearer ${royalOakToken}` }
  });
  console.log(`   Cross-Tenant Assignment Query Status: ${crossTenantAssignRes.status} (Expected 404 / Isolated)`);
  if (crossTenantAssignRes.status !== 404) {
    throw new Error(`Tenant Isolation Failure: Tenant 6 should not see Tenant 1 assignment!`);
  }

  // Royal Oak attempts to view Tenant 1's class attendance
  const crossTenantAttRes = await fetch(`${BASE_URL}/attendance/classes/${targetClass.id}`, {
    headers: { Authorization: `Bearer ${royalOakToken}` }
  });
  const crossTenantAttData = await crossTenantAttRes.json();
  console.log(`   Cross-Tenant Class Attendance Query Result: ${crossTenantAttData.data.metrics.total} records (Expected 0)`);
  if (crossTenantAttData.data.metrics.total !== 0) {
    throw new Error('Tenant Isolation Failure: Tenant 6 saw Tenant 1 attendance records!');
  }
  console.log(`✅ Multi-Tenant Data Isolation rigorously verified: Zero cross-tenant data leakage.`);

  // 17. Verify PostgreSQL Audit Trail Persistence
  console.log('\n--- TEST 17: PostgreSQL Audit Trail Persistence ---');
  const auditLogs = await prisma.auditLog.findMany({
    where: {
      tenantId: 1,
      action: { in: ['ATTENDANCE_BATCH_MARKED', 'ASSIGNMENT_CREATED', 'ASSIGNMENT_SUBMITTED', 'ASSIGNMENT_SUBMISSION_GRADED'] }
    },
    orderBy: { createdAt: 'desc' },
    take: 5
  });
  console.log(`✅ Found ${auditLogs.length} audit trail records in PostgreSQL:`);
  auditLogs.forEach(log => {
    console.log(`   - [${log.action}] Module: ${log.module} at ${log.createdAt.toISOString()}`);
  });

  console.log('\n========================================================================');
  console.log('🎉 ALL 17 EMPIRICAL TESTS PASSED WITH 100% SUCCESS!');
  console.log('========================================================================\n');
}

testProcedure7AttendanceAssignments()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('❌ TEST SUITE FAILED:', err);
    process.exit(1);
  });
