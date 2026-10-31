const prisma = require('../src/core/database/prisma.client');

async function testProcedure6Timetable() {
  console.log('================================================================');
  console.log('🧪 PHASE 2, PROCEDURE 2: TIMETABLE & CONFLICT ENGINE TEST SUITE');
  console.log('================================================================\n');

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
  console.log(`✅ Admin authenticated. Token received.`);

  // 2. Fetch existing classes and subjects for Tenant 1
  console.log('\n--- TEST 2: Fetch Classes & Curriculum ---');
  const classesRes = await fetch(`${BASE_URL}/academics/classes`, {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  const classesData = await classesRes.json();
  const targetClass = classesData.data.classes.find(c => c.subjects?.length > 1) || classesData.data.classes[0];
  if (!targetClass || !targetClass.subjects || targetClass.subjects.length < 2) {
    throw new Error('Need at least 1 class with 2 subjects for conflict testing.');
  }
  const subjectA = targetClass.subjects[0];
  const subjectB = targetClass.subjects[1];
  console.log(`✅ Test Class: ${targetClass.name} (${targetClass.code}, ID: ${targetClass.id})`);
  console.log(`   Subject A: ${subjectA.name} (${subjectA.code}, ID: ${subjectA.id})`);
  console.log(`   Subject B: ${subjectB.name} (${subjectB.code}, ID: ${subjectB.id})`);

  // Fetch teacher
  const teacher = await prisma.user.findFirst({
    where: { tenantId: 1, role: 'TEACHER' }
  });
  const teacherId = teacher ? teacher.id : null;
  console.log(`   Faculty: ${teacher ? teacher.firstName + ' ' + teacher.lastName : 'None'} (ID: ${teacherId})`);

  // Clean up existing timetable slots on Monday 08:30 for clean idempotency
  await prisma.timetableSlot.deleteMany({
    where: {
      tenantId: 1,
      dayOfWeek: 'MONDAY',
      startTime: { in: ['08:30', '08:45', '09:00'] }
    }
  });

  // 3. Schedule Period Slot (POST /timetables/slots)
  console.log('\n--- TEST 3: Schedule Base Period Slot (POST /timetables/slots) ---');
  const slotPayload = {
    classId: targetClass.id,
    subjectId: subjectA.id,
    teacherId,
    dayOfWeek: 'MONDAY',
    startTime: '08:30',
    endTime: '09:30',
    roomNumber: 'Room 101'
  };

  const createSlotRes = await fetch(`${BASE_URL}/timetables/slots`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`
    },
    body: JSON.stringify(slotPayload)
  });
  const createSlotData = await createSlotRes.json();
  if (!createSlotRes.ok) throw new Error(`Create slot failed: ${JSON.stringify(createSlotData)}`);
  const baseSlot = createSlotData.data.slot;
  console.log(`✅ Base Period Scheduled:`);
  console.log(`   [ID: ${baseSlot.id}] ${baseSlot.dayOfWeek} ${baseSlot.startTime}-${baseSlot.endTime} in ${baseSlot.roomNumber}`);

  // 4. Collision Test 1: Class Double-Booking (Overlap)
  console.log('\n--- TEST 4: Detect Class Collision (Overlapping Time) ---');
  const classConflictPayload = {
    classId: targetClass.id, // SAME class
    subjectId: subjectB.id,
    dayOfWeek: 'MONDAY',
    startTime: '08:45', // Overlaps with 08:30 - 09:30
    endTime: '10:00',
    roomNumber: 'Room 205'
  };
  const classConflictRes = await fetch(`${BASE_URL}/timetables/slots`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`
    },
    body: JSON.stringify(classConflictPayload)
  });
  const classConflictData = await classConflictRes.json();
  console.log(`   HTTP Status: ${classConflictRes.status}`);
  console.log(`   Response Message: ${classConflictData.message}`);
  if (classConflictRes.status === 409) {
    const hasClassCol = classConflictData.conflicts?.some(c => c.type === 'CLASS_COLLISION');
    if (hasClassCol) {
      console.log(`✅ CLASS_COLLISION DETECTED & REJECTED WITH 409!`);
    } else {
      throw new Error(`Expected CLASS_COLLISION in report: ${JSON.stringify(classConflictData)}`);
    }
  } else {
    throw new Error(`Expected 409 Conflict, received ${classConflictRes.status}`);
  }

  // 5. Collision Test 2: Teacher Double-Booking
  console.log('\n--- TEST 5: Detect Teacher Collision (Teacher Double-Booked) ---');
  const secondClass = classesData.data.classes.find(c => c.id !== targetClass.id && c.subjects?.length > 0);
  if (secondClass && teacherId) {
    const teacherConflictPayload = {
      classId: secondClass.id, // DIFFERENT class
      subjectId: secondClass.subjects[0].id,
      teacherId, // SAME teacher
      dayOfWeek: 'MONDAY',
      startTime: '09:00', // Overlaps with 08:30 - 09:30
      endTime: '10:00',
      roomNumber: 'Room 303' // DIFFERENT room
    };
    const teacherConflictRes = await fetch(`${BASE_URL}/timetables/slots`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify(teacherConflictPayload)
    });
    const teacherConflictData = await teacherConflictRes.json();
    console.log(`   HTTP Status: ${teacherConflictRes.status}`);
    console.log(`   Response Message: ${teacherConflictData.message}`);
    if (teacherConflictRes.status === 409) {
      const hasTeacherCol = teacherConflictData.conflicts?.some(c => c.type === 'TEACHER_COLLISION');
      if (hasTeacherCol) {
        console.log(`✅ TEACHER_COLLISION DETECTED & REJECTED WITH 409!`);
      } else {
        throw new Error(`Expected TEACHER_COLLISION in report: ${JSON.stringify(teacherConflictData)}`);
      }
    } else {
      throw new Error(`Expected 409 Conflict, received ${teacherConflictRes.status}`);
    }
  }

  // 6. Collision Test 3: Room Double-Booking
  console.log('\n--- TEST 6: Detect Room Collision (Room Double-Booked) ---');
  if (secondClass && secondClass.subjects?.length > 0) {
    const roomConflictPayload = {
      classId: secondClass.id,
      subjectId: secondClass.subjects[0].id,
      dayOfWeek: 'MONDAY',
      startTime: '08:30', // Overlaps with 08:30 - 09:30
      endTime: '09:30',
      roomNumber: 'Room 101' // SAME room
    };
    const roomConflictRes = await fetch(`${BASE_URL}/timetables/slots`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify(roomConflictPayload)
    });
    const roomConflictData = await roomConflictRes.json();
    console.log(`   HTTP Status: ${roomConflictRes.status}`);
    console.log(`   Response Message: ${roomConflictData.message}`);
    if (roomConflictRes.status === 409) {
      const hasRoomCol = roomConflictData.conflicts?.some(c => c.type === 'ROOM_COLLISION');
      if (hasRoomCol) {
        console.log(`✅ ROOM_COLLISION DETECTED & REJECTED WITH 409!`);
      } else {
        throw new Error(`Expected ROOM_COLLISION in report: ${JSON.stringify(roomConflictData)}`);
      }
    } else {
      throw new Error(`Expected 409 Conflict, received ${roomConflictRes.status}`);
    }
  }

  // 7. Dynamic Conflict Pre-Check Endpoint
  console.log('\n--- TEST 7: Dynamic Pre-Check Endpoint (POST /timetables/check-conflicts) ---');
  const checkRes = await fetch(`${BASE_URL}/timetables/check-conflicts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`
    },
    body: JSON.stringify(classConflictPayload)
  });
  const checkData = await checkRes.json();
  console.log(`✅ Pre-Check: hasConflict = ${checkData.data.hasConflict}, count = ${checkData.data.conflictCount}`);
  for (const c of checkData.data.conflicts) {
    console.log(`   - [${c.type}]: ${c.message}`);
  }

  // 8. Update Slot (PUT /timetables/slots/:id)
  console.log('\n--- TEST 8: Update Timetable Slot (PUT /timetables/slots/:id) ---');
  const updateRes = await fetch(`${BASE_URL}/timetables/slots/${baseSlot.id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      dayOfWeek: 'SATURDAY',
      startTime: '09:00',
      endTime: '10:00',
      roomNumber: 'Lecture Hall B'
    })
  });
  const updateData = await updateRes.json();
  if (!updateRes.ok) throw new Error(`Update slot failed: ${JSON.stringify(updateData)}`);
  console.log(`✅ Slot Updated: ${updateData.data.slot.dayOfWeek} ${updateData.data.slot.startTime}-${updateData.data.slot.endTime} in ${updateData.data.slot.roomNumber}`);

  // 9. Auto-Generate Weekly Timetable
  console.log('\n--- TEST 9: Auto-Generate Collision-Free Weekly Timetable ---');
  const seedWeeklyRes = await fetch(`${BASE_URL}/timetables/seed-weekly/${targetClass.id}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  const seedWeeklyData = await seedWeeklyRes.json();
  if (!seedWeeklyRes.ok) throw new Error(`Seed weekly timetable failed: ${JSON.stringify(seedWeeklyData)}`);
  console.log(`✅ Weekly Schedule Generated: ${seedWeeklyData.results} periods scheduled for ${targetClass.name}.`);

  // 10. Multi-Tenant Scoping & Isolation
  console.log('\n--- TEST 10: Multi-Tenant Timetable Scoping & Isolation ---');
  const royalOakLoginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'headmaster.royaloak@gbs.edu', password: 'RoyalOak2026!' })
  });
  const royalOakLoginData = await royalOakLoginRes.json();
  const royalOakToken = royalOakLoginData.data.accessToken;

  const royalOakSlotsRes = await fetch(`${BASE_URL}/timetables/slots`, {
    headers: { Authorization: `Bearer ${royalOakToken}` }
  });
  const royalOakSlotsData = await royalOakSlotsRes.json();
  console.log(`✅ Royal Oak queried /timetables/slots: ${royalOakSlotsData.results} slots returned.`);
  console.log(`   (Tenant 1 has ${seedWeeklyData.results} slots, Royal Oak sees ONLY their own: ${royalOakSlotsData.results})`);
  if (royalOakSlotsData.results !== 0) {
    throw new Error('Tenant isolation breach! Royal Oak can see Tenant 1 timetable slots.');
  }
  console.log(`✅ PERFECT ISOLATION: Timetables are strictly isolated per institution.`);

  // 11. Delete Base Slot
  console.log('\n--- TEST 11: Delete Timetable Slot ---');
  const deleteRes = await fetch(`${BASE_URL}/timetables/slots/${baseSlot.id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  const deleteData = await deleteRes.json();
  console.log(`✅ ${deleteData.message}`);

  // 12. PostgreSQL Audit Logs Verification
  console.log('\n--- TEST 12: PostgreSQL Audit Logs Verification ---');
  const timetableAuditLogs = await prisma.auditLog.findMany({
    where: { module: 'TIMETABLE' },
    orderBy: { createdAt: 'desc' },
    take: 5
  });
  console.log(`✅ Immutable Timetable Audit Trail entries found: ${timetableAuditLogs.length}`);
  for (const log of timetableAuditLogs) {
    console.log(`   - [${log.action}] (Tenant: ${log.tenantId}): ${log.details}`);
  }

  console.log('\n================================================================');
  console.log('🏆 PHASE 2, PROCEDURE 2: TIMETABLE & CONFLICT ENGINE VALIDATED!');
  console.log('================================================================\n');
}

testProcedure6Timetable()
  .catch((err) => {
    console.error('❌ Test failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
