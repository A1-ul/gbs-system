'use strict';

const prisma = require('../src/core/database/prisma.client');

async function testProcedure8OnlineMeetings() {
  console.log('========================================================================');
  console.log('🧪 PHASE 2, PROCEDURE 4: ONLINE MEETINGS & PARENT PORTAL TEST SUITE');
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
  const adminUser = adminData.data.user;
  console.log(`✅ Admin authenticated: ${adminUser.email} (Tenant ID: ${adminUser.tenantId})`);

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

  // 4. Authenticate Parent (Tenant 1)
  console.log('\n--- TEST 4: Authenticate Parent (parent@gbs.com) ---');
  const parentLoginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'parent@gbs.com', password: 'Parent123!' })
  });
  const parentData = await parentLoginRes.json();
  if (!parentLoginRes.ok) throw new Error(`Parent login failed: ${JSON.stringify(parentData)}`);
  const parentToken = parentData.data.accessToken;
  const parentUser = parentData.data.user;
  console.log(`✅ Parent authenticated: ${parentUser.firstName} ${parentUser.lastName} (ID: ${parentUser.id})`);

  // 5. Test Status Endpoint
  console.log('\n--- TEST 5: Verify Online Meetings Subsystem Status ---');
  const statusRes = await fetch(`${BASE_URL}/meetings/status`);
  const statusData = await statusRes.json();
  if (statusData.status !== 'success') throw new Error(`Meeting status failed: ${JSON.stringify(statusData)}`);
  console.log(`✅ Meeting service status: ${statusData.data.status} (Supported: ${statusData.data.supportedPlatforms.join(', ')})`);

  // 6. Resolve Target Class & Subject
  console.log('\n--- TEST 6: Resolve Target Academic Class & Subject ---');
  const classesRes = await fetch(`${BASE_URL}/academics/classes`, {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  const classesData = await classesRes.json();
  const targetClass = classesData.data.classes.find(c => c.subjects?.length > 0) || classesData.data.classes[0];
  const targetSubject = targetClass.subjects[0];
  console.log(`✅ Target Class: ${targetClass.name} (ID: ${targetClass.id})`);
  console.log(`   Target Subject: ${targetSubject.name} (ID: ${targetSubject.id})`);

  // 7. Teacher Schedules a Live Zoom Virtual Classroom
  console.log('\n--- TEST 7: Teacher Schedules Live Zoom Virtual Classroom ---');
  const startTime = new Date(Date.now() + 5 * 60000).toISOString();
  const endTime = new Date(Date.now() + 50 * 60000).toISOString();
  const zoomRes = await fetch(`${BASE_URL}/meetings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${teacherToken}`
    },
    body: JSON.stringify({
      title: `AP Physics: Mechanics with Lab (Zoom Session)`,
      description: 'Live interactive mechanics lab covering kinematics and momentum',
      platform: 'ZOOM',
      meetingType: 'CLASS',
      classId: targetClass.id,
      subjectId: targetSubject.id,
      startTime,
      endTime,
      isRecorded: true,
      hasChat: true,
      hasBreakout: true
    })
  });
  const zoomData = await zoomRes.json();
  if (!zoomRes.ok) throw new Error(`Zoom schedule failed: ${JSON.stringify(zoomData)}`);
  const zoomMeeting = zoomData.data.meeting;
  console.log(`✅ Zoom session scheduled: "${zoomMeeting.title}" (ID: ${zoomMeeting.id})`);
  console.log(`   Join URL: ${zoomMeeting.meetingUrl}`);
  console.log(`   Meeting ID: ${zoomMeeting.meetingId} | Passcode: ${zoomMeeting.passcode}`);

  // 8. Schedule Google Meet Session
  console.log('\n--- TEST 8: Teacher Schedules Google Meet Session ---');
  const meetRes = await fetch(`${BASE_URL}/meetings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${teacherToken}`
    },
    body: JSON.stringify({
      title: `Mathematics 10A: Linear Algebra Live Session`,
      description: 'Google Meet virtual lecture on matrix multiplication',
      platform: 'GOOGLE_MEET',
      meetingType: 'CLASS',
      classId: targetClass.id,
      subjectId: targetSubject.id,
      startTime,
      endTime
    })
  });
  const meetData = await meetRes.json();
  if (!meetRes.ok) throw new Error(`Google Meet schedule failed: ${JSON.stringify(meetData)}`);
  const meetSession = meetData.data.meeting;
  console.log(`✅ Google Meet scheduled: "${meetSession.title}" (Code: ${meetSession.meetingId})`);
  console.log(`   Join URL: ${meetSession.meetingUrl}`);

  // 9. Student Joins Live Session -> Auto-Attendance Logging
  console.log('\n--- TEST 9: Student Joins Session & Auto-Logs Attendance ---');
  const joinRes = await fetch(`${BASE_URL}/meetings/${zoomMeeting.id}/join`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${studentToken}`
    }
  });
  const joinData = await joinRes.json();
  if (!joinRes.ok) throw new Error(`Join meeting failed: ${JSON.stringify(joinData)}`);
  console.log(`✅ Student joined meeting "${joinData.data.meeting.title}". Status transitioned to ${joinData.data.meeting.status}`);

  // Verify attendance auto-log in database
  const todayStr = new Date().toISOString().split('T')[0];
  const todayDate = new Date(`${todayStr}T00:00:00.000Z`);
  const dbAttendance = await prisma.attendanceRecord.findFirst({
    where: {
      tenantId: 1,
      studentId: studentUser.id,
      classId: targetClass.id,
      date: todayDate
    }
  });
  if (!dbAttendance || dbAttendance.status !== 'PRESENT') {
    throw new Error(`Auto-attendance failed: Expected PRESENT record in DB, found ${JSON.stringify(dbAttendance)}`);
  }
  console.log(`✅ Auto-Attendance Verified in PostgreSQL: Student ${studentUser.id} marked ${dbAttendance.status}`);
  console.log(`   Remarks: "${dbAttendance.remarks}"`);

  // 10. Teacher Inspects Meeting Roster
  console.log('\n--- TEST 10: Teacher Inspects Meeting Attendee Roster ---');
  const rosterRes = await fetch(`${BASE_URL}/meetings/${zoomMeeting.id}`, {
    headers: { Authorization: `Bearer ${teacherToken}` }
  });
  const rosterData = await rosterRes.json();
  const roster = rosterData.data.meeting.attendances;
  if (!roster || roster.length === 0) throw new Error('Expected at least 1 attendee in roster');
  console.log(`✅ Attendee Roster verified: ${roster.length} participant(s) logged in database`);
  console.log(`   Attendee: ${roster[0].user.firstName} ${roster[0].user.lastName} (${roster[0].user.role}) at ${roster[0].joinedAt}`);

  // 11. Create Parent-Student Link
  console.log('\n--- TEST 11: Admin Links Parent to Student in Database ---');
  const linkRes = await fetch(`${BASE_URL}/parents/link`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      parentId: parentUser.id,
      studentId: studentUser.id,
      relationship: 'MOTHER',
      isPrimaryContact: true,
      emergencyPhone: '+1-555-0199',
      address: 'Green Valley School Zone 4, Kampala, Uganda',
      latitude: 0.3476,
      longitude: 32.5825
    })
  });
  const linkData = await linkRes.json();
  if (!linkRes.ok) throw new Error(`Parent-Student link failed: ${JSON.stringify(linkData)}`);
  console.log(`✅ Parent-Student link created: Parent ${parentUser.id} linked to Student ${studentUser.id}`);

  // 12. Parent Queries Linked Children
  console.log('\n--- TEST 12: Parent Queries Linked Children ---');
  const myChildrenRes = await fetch(`${BASE_URL}/parents/my-children`, {
    headers: { Authorization: `Bearer ${parentToken}` }
  });
  const myChildrenData = await myChildrenRes.json();
  if (!myChildrenRes.ok || myChildrenData.data.children.length === 0) {
    throw new Error(`Failed to get children: ${JSON.stringify(myChildrenData)}`);
  }
  const childItem = myChildrenData.data.children[0];
  console.log(`✅ Parent children verified: ${childItem.student.firstName} ${childItem.student.lastName}`);
  console.log(`   Attendance Rate: ${childItem.metrics.attendanceRate}% | Total Sessions: ${childItem.metrics.totalSessions}`);

  // 13. Parent Queries Detailed Child Overview
  console.log('\n--- TEST 13: Parent Queries In-Depth Child Academic Overview ---');
  const overviewRes = await fetch(`${BASE_URL}/parents/children/${studentUser.id}/overview`, {
    headers: { Authorization: `Bearer ${parentToken}` }
  });
  const overviewData = await overviewRes.json();
  if (!overviewRes.ok) throw new Error(`Overview query failed: ${JSON.stringify(overviewData)}`);
  const ov = overviewData.data.overview;
  console.log(`✅ Child Overview Verified:`);
  console.log(`   Student: ${ov.student.firstName} ${ov.student.lastName} (Class: ${ov.class?.name || 'Assigned'})`);
  console.log(`   Upcoming Online Classes: ${ov.upcomingOnlineClasses.length} sessions available`);
  console.log(`   Attendance Breakdown: Present=${ov.attendance.breakdown.present}, Late=${ov.attendance.breakdown.late}, Absent=${ov.attendance.breakdown.absent}`);

  // 14. Admin Emergency Locator Search by Phone Number (Blueprint Box 8)
  console.log('\n--- TEST 14: Admin Emergency Locator Search (Box 8) ---');
  const emergencyRes = await fetch(`${BASE_URL}/parents/emergency-search?phone=+1-555-0199`, {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  const emergencyData = await emergencyRes.json();
  if (!emergencyRes.ok || emergencyData.data.emergencyContacts.length === 0) {
    throw new Error(`Emergency search failed: ${JSON.stringify(emergencyData)}`);
  }
  const emContact = emergencyData.data.emergencyContacts[0];
  console.log(`✅ Emergency Contact Found:`);
  console.log(`   Guardian: ${emContact.guardianName} (${emContact.guardianRole})`);
  console.log(`   Student: ${emContact.studentName} (${emContact.studentClass})`);
  console.log(`   Phone: ${emContact.emergencyPhone}`);
  console.log(`   Coordinates: Lat ${emContact.coordinates.latitude}, Long ${emContact.coordinates.longitude}`);
  console.log(`   Live GPS Status: ${emContact.liveLocationStatus}`);

  // 15. Multi-Tenant Scoping & Isolation
  console.log('\n--- TEST 15: Multi-Tenant Data Isolation Guard ---');
  const royalOakLoginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'headmaster.royaloak@gbs.edu', password: 'RoyalOak2026!' })
  });
  const royalOakData = await royalOakLoginRes.json();
  if (!royalOakLoginRes.ok) throw new Error(`Royal Oak login failed: ${JSON.stringify(royalOakData)}`);
  const royalOakToken = royalOakData.data.accessToken;
  const royalOakMeetingsRes = await fetch(`${BASE_URL}/meetings`, {
    headers: { Authorization: `Bearer ${royalOakToken}` }
  });
  const royalOakMeetings = await royalOakMeetingsRes.json();
  console.log(`✅ Foreign Tenant (Royal Oak - Tenant ID ${royalOakData.data.user.tenantId}) sees ${royalOakMeetings.data.meetings.length} meetings (Tenant 1 has ${zoomMeeting.id > 0 ? 'meetings' : 0})`);
  if (royalOakMeetings.data.meetings.length !== 0) {
    throw new Error('Tenant isolation breach! Royal Oak saw Tenant 1 meetings.');
  }

  // 16. Audit Log Verification
  console.log('\n--- TEST 16: Verify PostgreSQL Audit Trail Persistence ---');
  const auditLogs = await prisma.auditLog.findMany({
    where: {
      action: {
        in: [
          'ONLINE_MEETING_CREATED',
          'ONLINE_MEETING_JOINED',
          'PARENT_STUDENT_LINK_CREATED',
          'ADMIN_EMERGENCY_LOCATOR_SEARCH'
        ]
      }
    },
    orderBy: { createdAt: 'desc' },
    take: 4
  });
  if (auditLogs.length < 4) {
    throw new Error(`Expected at least 4 audit logs, found ${auditLogs.length}`);
  }
  auditLogs.forEach((l) => {
    console.log(`✅ [AUDIT LOG #${l.id}] Action: ${l.action} | User: ${l.userId} | Details: ${l.details}`);
  });

  console.log('\n========================================================================');
  console.log('🎉 ALL 16 PHASE 2, PROCEDURE 4 TESTS PASSED WITH 100% SUCCESS!');
  console.log('========================================================================\n');
}

testProcedure8OnlineMeetings()
  .catch((err) => {
    console.error('❌ TEST SUITE FAILED:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
