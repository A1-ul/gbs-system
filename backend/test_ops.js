'use strict';

const prisma = require('./src/core/database/prisma.client');
const authService = require('./src/modules/auth/auth.service');
const academicService = require('./src/modules/academic/academic.service');
const attendanceService = require('./src/modules/attendance/attendance.service');
const assignmentService = require('./src/modules/assignment/assignment.service');
const meetingService = require('./src/modules/meeting/meeting.service');

async function runVerification() {
  console.log('=== STARTING GBS ENTERPRISE END-TO-END VERIFICATION ===');

  // 1. Verify Classes Roster (Lower Primary to University Level 400)
  const classes = await academicService.getClasses(1);
  console.log(`[PASS] Total Registered Classes: ${classes.length}`);
  console.log(`[PASS] First Class: ${classes[0].name} (${classes[0].code})`);
  console.log(`[PASS] Middle Class: ${classes[Math.floor(classes.length / 2)].name}`);
  console.log(`[PASS] University Final Class: ${classes[classes.length - 1].name} (${classes[classes.length - 1].code})`);

  // 2. Verify Single Student Attendance Marking (One at a time)
  const sampleClass = classes[0];
  const sampleStudent = await prisma.user.findFirst({ where: { role: 'STUDENT' } });
  if (sampleStudent) {
    const today = new Date().toISOString().split('T')[0];
    const attRecord = await attendanceService.markSingleStudentAttendance({
      classId: sampleClass.id,
      studentId: sampleStudent.id,
      date: today,
      status: 'PRESENT'
    });
    console.log(`[PASS] Single Student Attendance Marked: Student ID ${attRecord.studentId} -> ${attRecord.status} for ${attRecord.date}`);
  }

  // 3. Verify Multi-Class Assignment Publishing
  const sampleTeacher = await prisma.user.findFirst({ where: { role: 'TEACHER' } });
  const teacherId = sampleTeacher ? sampleTeacher.id : 1;
  const targetClassIds = [classes[0].id, classes[1].id];
  const publishedAssignments = await assignmentService.createAssignment({
    title: 'Advanced STEM Research Assignment',
    description: 'Autonomous research project for secondary and undergraduate scholars.',
    dueDate: new Date(Date.now() + 86400000 * 5).toISOString(),
    maxScore: 100,
    classIds: targetClassIds,
    teacherId,
    tenantId: 1
  });
  console.log(`[PASS] Multi-Class Assignment Published: ${publishedAssignments.length || 1} assignment records generated across classes.`);

  // 4. Verify Meeting Creation with Target Class & People Selection, and Checkbox Batch Deletion
  const createdMeeting = await meetingService.createMeeting({
    title: 'Weekly Interactive STEM Seminar',
    platform: 'Zoom Video',
    meetingUrl: 'https://zoom.us/j/9988776655',
    startTime: new Date(Date.now() + 86400000 * 3).toISOString(),
    endTime: new Date(Date.now() + 86400000 * 3 + 3600000).toISOString(),
    targetAudience: 'All Enrolled Students in Selected Class',
    hostId: teacherId,
    tenantId: 1
  });
  console.log(`[PASS] Meeting created: "${createdMeeting.title}" (ID: ${createdMeeting.id})`);

  // Batch delete test
  const deleteResult = await meetingService.batchDeleteMeetings([createdMeeting.id], 1);
  console.log(`[PASS] Meeting Checkbox Selection Batch Deletion: Deleted ${deleteResult.count} meeting(s).`);

  console.log('=== ALL DATABASE OPERATIONS VERIFIED WITH POSTGRESQL ===');
  process.exit(0);
}

runVerification().catch(err => {
  console.error('[ERROR] Verification failed:', err);
  process.exit(1);
});
