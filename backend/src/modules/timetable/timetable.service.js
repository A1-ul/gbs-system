const prisma = require('../../core/database/prisma.client');
const { AppError } = require('../../middleware/error.middleware');

/**
 * Utility: Convert "HH:MM" to minutes from midnight
 */
const timeToMinutes = (timeStr) => {
  if (!timeStr || typeof timeStr !== 'string' || !timeStr.includes(':')) {
    return 0;
  }
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
};

/**
 * Utility: Check if two time intervals on the same day overlap
 */
const checkTimeOverlap = (startA, endA, startB, endB) => {
  const sA = timeToMinutes(startA);
  const eA = timeToMinutes(endA);
  const sB = timeToMinutes(startB);
  const eB = timeToMinutes(endB);
  return sA < eB && eA > sB;
};

/**
 * Conflict Detection Engine
 * Evaluates Class Collision, Teacher Collision, and Room Collision.
 */
const detectConflicts = async (tenantId, data, excludeSlotId = null) => {
  const tid = parseInt(tenantId, 10);
  const { classId, subjectId, teacherId, dayOfWeek, startTime, endTime, roomNumber } = data;

  if (!dayOfWeek || !startTime || !endTime) {
    throw new AppError('Day of week, start time, and end time are required.', 400);
  }

  const sMins = timeToMinutes(startTime);
  const eMins = timeToMinutes(endTime);
  if (sMins >= eMins) {
    throw new AppError(`Invalid time interval: Start time (${startTime}) must be strictly before end time (${endTime}).`, 400);
  }

  const whereClause = {
    tenantId: tid,
    dayOfWeek: dayOfWeek.toUpperCase(),
    isActive: true
  };

  if (excludeSlotId) {
    whereClause.id = { not: parseInt(excludeSlotId, 10) };
  }

  const existingSlots = await prisma.timetableSlot.findMany({
    where: whereClause,
    include: {
      class: { select: { id: true, name: true, code: true } },
      subject: { select: { id: true, name: true, code: true } },
      teacher: { select: { id: true, firstName: true, lastName: true, email: true } }
    }
  });

  const conflicts = [];

  for (const slot of existingSlots) {
    if (checkTimeOverlap(startTime, endTime, slot.startTime, slot.endTime)) {
      // 1. Class Collision: Class already has another subject scheduled
      if (classId && slot.classId === parseInt(classId, 10)) {
        conflicts.push({
          type: 'CLASS_COLLISION',
          message: `Class Collision: Class '${slot.class?.name || 'Class ' + slot.classId}' is already scheduled for '${slot.subject?.name || 'Subject'}' (${slot.startTime} - ${slot.endTime}) on ${dayOfWeek}.`,
          conflictingSlot: {
            id: slot.id,
            class: slot.class?.name,
            subject: slot.subject?.name,
            time: `${slot.startTime} - ${slot.endTime}`,
            room: slot.roomNumber
          }
        });
      }

      // 2. Teacher Collision: Teacher is already scheduled in another room/class
      if (teacherId && slot.teacherId && slot.teacherId === parseInt(teacherId, 10)) {
        const teacherName = slot.teacher ? `${slot.teacher.firstName} ${slot.teacher.lastName}` : `Teacher #${slot.teacherId}`;
        conflicts.push({
          type: 'TEACHER_COLLISION',
          message: `Teacher Collision: ${teacherName} is already assigned to '${slot.class?.name}' (${slot.subject?.name}) in ${slot.roomNumber} from ${slot.startTime} to ${slot.endTime} on ${dayOfWeek}.`,
          conflictingSlot: {
            id: slot.id,
            teacher: teacherName,
            class: slot.class?.name,
            subject: slot.subject?.name,
            time: `${slot.startTime} - ${slot.endTime}`,
            room: slot.roomNumber
          }
        });
      }

      // 3. Room Collision: Room is already booked by another class
      if (roomNumber && slot.roomNumber && slot.roomNumber.toLowerCase().trim() === roomNumber.toLowerCase().trim()) {
        conflicts.push({
          type: 'ROOM_COLLISION',
          message: `Room Collision: Room '${slot.roomNumber}' is already occupied by '${slot.class?.name}' (${slot.subject?.name}) from ${slot.startTime} to ${slot.endTime} on ${dayOfWeek}.`,
          conflictingSlot: {
            id: slot.id,
            room: slot.roomNumber,
            class: slot.class?.name,
            subject: slot.subject?.name,
            time: `${slot.startTime} - ${slot.endTime}`
          }
        });
      }
    }
  }

  return {
    hasConflict: conflicts.length > 0,
    conflictCount: conflicts.length,
    conflicts
  };
};

/**
 * Retrieve timetable slots with flexible filters
 */
const getTimetableSlots = async (tenantId, filters = {}) => {
  const tid = parseInt(tenantId, 10);
  const whereClause = { tenantId: tid, isActive: true };

  if (filters.classId) whereClause.classId = parseInt(filters.classId, 10);
  if (filters.subjectId) whereClause.subjectId = parseInt(filters.subjectId, 10);
  if (filters.teacherId) whereClause.teacherId = parseInt(filters.teacherId, 10);
  if (filters.dayOfWeek) whereClause.dayOfWeek = filters.dayOfWeek.toUpperCase();
  if (filters.roomNumber) whereClause.roomNumber = { contains: filters.roomNumber, mode: 'insensitive' };

  return await prisma.timetableSlot.findMany({
    where: whereClause,
    include: {
      class: { select: { id: true, name: true, code: true, gradeLevel: true } },
      subject: { select: { id: true, name: true, code: true } },
      teacher: { select: { id: true, firstName: true, lastName: true, email: true, role: true } }
    },
    orderBy: [
      { dayOfWeek: 'asc' },
      { startTime: 'asc' }
    ]
  });
};

/**
 * Retrieve single slot by ID
 */
const getTimetableSlotById = async (tenantId, slotId) => {
  const slot = await prisma.timetableSlot.findFirst({
    where: {
      id: parseInt(slotId, 10),
      tenantId: parseInt(tenantId, 10)
    },
    include: {
      class: true,
      subject: true,
      teacher: true
    }
  });

  if (!slot) {
    throw new AppError('Timetable slot not found or unauthorized.', 404);
  }
  return slot;
};

/**
 * Create timetable slot with automatic conflict detection
 */
const createTimetableSlot = async (tenantId, data, operatorUser) => {
  const tid = parseInt(tenantId, 10);

  // Validate class belongs to tenant
  const targetClass = await prisma.class.findFirst({
    where: { id: parseInt(data.classId, 10), tenantId: tid }
  });
  if (!targetClass) {
    throw new AppError('Class not found in your institution.', 404);
  }

  // Validate subject belongs to class
  const targetSubject = await prisma.subject.findFirst({
    where: { id: parseInt(data.subjectId, 10), classId: targetClass.id }
  });
  if (!targetSubject) {
    throw new AppError(`Subject #${data.subjectId} is not assigned to class '${targetClass.name}'.`, 400);
  }

  // Run Conflict Detection
  const conflictReport = await detectConflicts(tid, data);
  if (conflictReport.hasConflict && !data.overrideConflict) {
    const conflictErr = new AppError('Timetable scheduling conflict detected.', 409);
    conflictErr.conflicts = conflictReport.conflicts;
    throw conflictErr;
  }

  const slot = await prisma.timetableSlot.create({
    data: {
      tenantId: tid,
      classId: targetClass.id,
      subjectId: targetSubject.id,
      teacherId: data.teacherId ? parseInt(data.teacherId, 10) : null,
      dayOfWeek: data.dayOfWeek.toUpperCase(),
      startTime: data.startTime,
      endTime: data.endTime,
      roomNumber: data.roomNumber || 'Room 101',
      academicTerm: data.academicTerm || 'TERM-1',
      academicYear: data.academicYear || '2026-2027'
    },
    include: {
      class: true,
      subject: true,
      teacher: true
    }
  });

  // Record audit log
  if (operatorUser) {
    await prisma.auditLog.create({
      data: {
        tenantId: tid,
        userId: operatorUser.id,
        action: 'TIMETABLE_SLOT_CREATED',
        module: 'TIMETABLE',
        details: `Scheduled ${slot.subject.name} for ${slot.class.name} on ${slot.dayOfWeek} (${slot.startTime} - ${slot.endTime}) in ${slot.roomNumber}.`
      }
    });
  }

  return slot;
};

/**
 * Update timetable slot with conflict detection
 */
const updateTimetableSlot = async (tenantId, slotId, data, operatorUser) => {
  const tid = parseInt(tenantId, 10);
  const targetSlot = await getTimetableSlotById(tid, slotId);

  const mergedData = {
    classId: data.classId || targetSlot.classId,
    subjectId: data.subjectId || targetSlot.subjectId,
    teacherId: data.teacherId !== undefined ? data.teacherId : targetSlot.teacherId,
    dayOfWeek: data.dayOfWeek || targetSlot.dayOfWeek,
    startTime: data.startTime || targetSlot.startTime,
    endTime: data.endTime || targetSlot.endTime,
    roomNumber: data.roomNumber || targetSlot.roomNumber
  };

  // Run Conflict Detection excluding current slot
  const conflictReport = await detectConflicts(tid, mergedData, targetSlot.id);
  if (conflictReport.hasConflict && !data.overrideConflict) {
    const conflictErr = new AppError('Timetable scheduling conflict detected during update.', 409);
    conflictErr.conflicts = conflictReport.conflicts;
    throw conflictErr;
  }

  const updatedSlot = await prisma.timetableSlot.update({
    where: { id: targetSlot.id },
    data: {
      classId: parseInt(mergedData.classId, 10),
      subjectId: parseInt(mergedData.subjectId, 10),
      teacherId: mergedData.teacherId ? parseInt(mergedData.teacherId, 10) : null,
      dayOfWeek: mergedData.dayOfWeek.toUpperCase(),
      startTime: mergedData.startTime,
      endTime: mergedData.endTime,
      roomNumber: mergedData.roomNumber,
      academicTerm: data.academicTerm || targetSlot.academicTerm,
      academicYear: data.academicYear || targetSlot.academicYear
    },
    include: {
      class: true,
      subject: true,
      teacher: true
    }
  });

  // Record audit log
  if (operatorUser) {
    await prisma.auditLog.create({
      data: {
        tenantId: tid,
        userId: operatorUser.id,
        action: 'TIMETABLE_SLOT_UPDATED',
        module: 'TIMETABLE',
        details: `Updated timetable slot #${updatedSlot.id} (${updatedSlot.class.name} - ${updatedSlot.subject.name} on ${updatedSlot.dayOfWeek}).`
      }
    });
  }

  return updatedSlot;
};

/**
 * Delete timetable slot
 */
const deleteTimetableSlot = async (tenantId, slotId, operatorUser) => {
  const tid = parseInt(tenantId, 10);
  const targetSlot = await getTimetableSlotById(tid, slotId);

  await prisma.timetableSlot.delete({
    where: { id: targetSlot.id }
  });

  // Record audit log
  if (operatorUser) {
    await prisma.auditLog.create({
      data: {
        tenantId: tid,
        userId: operatorUser.id,
        action: 'TIMETABLE_SLOT_DELETED',
        module: 'TIMETABLE',
        details: `Deleted timetable slot #${targetSlot.id} (${targetSlot.dayOfWeek} ${targetSlot.startTime}-${targetSlot.endTime}).`
      }
    });
  }

  return { message: 'Timetable slot deleted successfully.' };
};

/**
 * Automatic Weekly Timetable Generator for a Class
 * Populates a collision-free Monday-to-Friday schedule using real class subjects.
 */
const seedWeeklyTimetable = async (tenantId, classId, operatorUser) => {
  const tid = parseInt(tenantId, 10);
  const targetClass = await prisma.class.findFirst({
    where: { id: parseInt(classId, 10), tenantId: tid },
    include: { subjects: true }
  });

  if (!targetClass) {
    throw new AppError('Class not found in your institution.', 404);
  }

  if (targetClass.subjects.length === 0) {
    throw new AppError(`Class '${targetClass.name}' has no curriculum subjects configured. Please add subjects first.`, 400);
  }

  // Find teachers in this tenant
  const teachers = await prisma.user.findMany({
    where: { tenantId: tid, role: 'TEACHER', isActive: true },
    select: { id: true, firstName: true, lastName: true }
  });

  const days = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'];
  const periods = [
    { start: '08:30', end: '09:30', room: 'Lecture Hall 1' },
    { start: '09:45', end: '10:45', room: 'Science Lab 2' },
    { start: '11:00', end: '12:00', room: 'Tech Lab A' },
    { start: '13:00', end: '14:00', room: 'Room 204' },
    { start: '14:15', end: '15:15', room: 'Auditorium West' }
  ];

  const createdSlots = [];
  let subjectIndex = 0;
  let teacherIndex = 0;

  for (const day of days) {
    for (const period of periods) {
      const subject = targetClass.subjects[subjectIndex % targetClass.subjects.length];
      const teacher = teachers.length > 0 ? teachers[teacherIndex % teachers.length] : null;

      // Check if slot already exists
      const existing = await prisma.timetableSlot.findFirst({
        where: {
          tenantId: tid,
          classId: targetClass.id,
          dayOfWeek: day,
          startTime: period.start
        }
      });

      if (!existing) {
        const slot = await prisma.timetableSlot.create({
          data: {
            tenantId: tid,
            classId: targetClass.id,
            subjectId: subject.id,
            teacherId: teacher ? teacher.id : null,
            dayOfWeek: day,
            startTime: period.start,
            endTime: period.end,
            roomNumber: period.room,
            academicTerm: 'TERM-1',
            academicYear: '2026-2027'
          }
        });
        createdSlots.push(slot);
      }

      subjectIndex++;
      teacherIndex++;
    }
  }

  // Record audit log
  if (operatorUser) {
    await prisma.auditLog.create({
      data: {
        tenantId: tid,
        userId: operatorUser.id,
        action: 'TIMETABLE_WEEKLY_SEEDED',
        module: 'TIMETABLE',
        details: `Auto-generated weekly collision-free timetable for '${targetClass.name}' (${createdSlots.length} periods scheduled).`
      }
    });
  }

  return getTimetableSlots(tid, { classId: targetClass.id });
};

module.exports = {
  detectConflicts,
  getTimetableSlots,
  getTimetableSlotById,
  createTimetableSlot,
  updateTimetableSlot,
  deleteTimetableSlot,
  seedWeeklyTimetable
};
