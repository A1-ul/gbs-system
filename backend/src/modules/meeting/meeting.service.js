'use strict';

const prisma = require('../../core/database/prisma.client');
const { AppError } = require('../../middleware/error.middleware');

/**
 * Generates an alphanumeric Google Meet code (format: abc-defg-hij)
 */
function generateMeetCode() {
  const chars = 'abcdefghijklmnopqrstuvwxyz';
  const seg = (len) => Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `${seg(3)}-${seg(4)}-${seg(3)}`;
}

/**
 * Generates realistic platform meeting URL & credentials
 */
function generatePlatformCredentials(platform, title) {
  const plat = (platform || 'ZOOM').toUpperCase();
  if (plat === 'GOOGLE_MEET') {
    const code = generateMeetCode();
    return {
      platform: 'GOOGLE_MEET',
      meetingUrl: `https://meet.google.com/${code}`,
      meetingId: code,
      passcode: null
    };
  }

  // Default to ZOOM
  const mId = Math.floor(1000000000 + Math.random() * 9000000000).toString();
  const pwd = Math.floor(100000 + Math.random() * 900000).toString();
  return {
    platform: 'ZOOM',
    meetingUrl: `https://zoom.us/j/${mId}?pwd=${pwd}`,
    meetingId: mId,
    passcode: pwd
  };
}

/**
 * Get service status
 */
async function getStatus() {
  const meetingCount = await prisma.onlineMeeting.count();
  return {
    module: 'online_learning_and_meetings',
    status: 'OPERATIONAL',
    supportedPlatforms: ['ZOOM', 'GOOGLE_MEET', 'MICROSOFT_TEAMS'],
    totalMeetingsScheduled: meetingCount,
    timestamp: new Date().toISOString()
  };
}

/**
 * Create an online meeting or virtual class session
 */
async function createMeeting(tenantIdOrPayload, hostUserOrPayload, optionalPayload) {
  let tid, hostUser, payload;
  if (typeof tenantIdOrPayload === 'object' && tenantIdOrPayload !== null && (!optionalPayload || typeof optionalPayload !== 'object')) {
    payload = tenantIdOrPayload;
    tid = parseInt(payload.tenantId, 10) || 1;
    hostUser = hostUserOrPayload || { id: payload.hostId || 1, role: 'TEACHER' };
  } else {
    tid = parseInt(tenantIdOrPayload, 10) || 1;
    hostUser = hostUserOrPayload || { id: 1, role: 'TEACHER' };
    payload = optionalPayload || {};
  }
  const hostId = parseInt(hostUser.id, 10) || 1;

  const {
    title,
    description,
    platform = 'ZOOM',
    meetingType = 'CLASS',
    meetingUrl,
    meetingId,
    passcode,
    classId,
    subjectId,
    timetableSlotId,
    startTime,
    endTime,
    isRecorded = false,
    hasChat = true,
    hasBreakout = true,
    hasScreenShare = true,
    hasRaiseHand = true,
    maxParticipants = 100
  } = payload;

  const finalTitle = (title || payload.topic || 'Class Virtual Session').trim();
  const start = startTime ? new Date(startTime) : new Date(Date.now() + 3600000);
  const duration = parseInt(payload.durationMinutes, 10) || 45;
  const end = endTime ? new Date(endTime) : new Date(start.getTime() + duration * 60000);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    throw new AppError('Invalid date format for meeting timing.', 400);
  }
  if (end <= start) {
    throw new AppError('Meeting end time must be after start time.', 400);
  }

  // Verify class if provided
  let cid = null;
  if (classId) {
    cid = parseInt(classId, 10);
    const targetClass = await prisma.class.findFirst({
      where: { id: cid, tenantId: tid }
    });
    if (!targetClass) {
      throw new AppError(`Class ID ${classId} not found in this organization.`, 404);
    }
  }

  // Verify subject if provided
  let sid = null;
  if (subjectId) {
    sid = parseInt(subjectId, 10);
    const targetSubject = await prisma.subject.findFirst({
      where: { id: sid }
    });
    if (!targetSubject) {
      throw new AppError(`Subject ID ${subjectId} not found.`, 404);
    }
  }

  // Generate or sanitize meeting credentials
  const defaultCreds = generatePlatformCredentials(platform, finalTitle);
  const finalPlatform = (platform || defaultCreds.platform).toUpperCase();
  const finalUrl = meetingUrl && meetingUrl.trim() ? meetingUrl.trim() : defaultCreds.meetingUrl;
  const finalMeetingId = meetingId ? meetingId.toString() : defaultCreds.meetingId;
  const finalPasscode = passcode ? passcode.toString() : defaultCreds.passcode;

  const meeting = await prisma.$transaction(async (tx) => {
    const created = await tx.onlineMeeting.create({
      data: {
        tenantId: tid,
        title: finalTitle,
        description: description ? description.trim() : null,
        platform: finalPlatform,
        meetingType,
        meetingUrl: finalUrl,
        meetingId: finalMeetingId,
        passcode: finalPasscode,
        hostId,
        classId: cid,
        subjectId: sid,
        timetableSlotId: timetableSlotId ? parseInt(timetableSlotId, 10) : null,
        startTime: start,
        endTime: end,
        status: 'SCHEDULED',
        isRecorded: Boolean(isRecorded),
        hasChat: Boolean(hasChat),
        hasBreakout: Boolean(hasBreakout),
        hasScreenShare: Boolean(hasScreenShare),
        hasRaiseHand: Boolean(hasRaiseHand),
        maxParticipants: parseInt(maxParticipants, 10) || 100
      },
      include: {
        host: { select: { id: true, firstName: true, lastName: true, email: true, role: true } },
        class: { select: { id: true, name: true, code: true } },
        subject: { select: { id: true, name: true, code: true } }
      }
    });

    await tx.auditLog.create({
      data: {
        tenantId: tid,
        userId: hostId,
        module: 'ONLINE_MEETING',
        action: 'ONLINE_MEETING_CREATED',
        details: `Created ${finalPlatform} session "${created.title}" (ID: ${created.id}) for class ${cid || 'N/A'}`
      }
    });

    return created;
  });

  return meeting;
}

/**
 * List meetings with filtering and stats
 */
async function getMeetings(tenantId, query = {}) {
  const tid = parseInt(tenantId, 10);
  const { classId, subjectId, platform, status, meetingType } = query;

  const where = { tenantId: tid };
  if (classId) where.classId = parseInt(classId, 10);
  if (subjectId) where.subjectId = parseInt(subjectId, 10);
  if (platform) where.platform = platform.toUpperCase();
  if (status) where.status = status.toUpperCase();
  if (meetingType) where.meetingType = meetingType.toUpperCase();

  const meetings = await prisma.onlineMeeting.findMany({
    where,
    include: {
      host: { select: { id: true, firstName: true, lastName: true, email: true, role: true } },
      class: { select: { id: true, name: true, code: true } },
      subject: { select: { id: true, name: true, code: true } },
      _count: { select: { attendances: true } }
    },
    orderBy: { startTime: 'asc' }
  });

  return meetings;
}

/**
 * Get single meeting by ID
 */
async function getMeetingById(tenantId, meetingId) {
  const tid = parseInt(tenantId, 10);
  const mid = parseInt(meetingId, 10);

  const meeting = await prisma.onlineMeeting.findFirst({
    where: { id: mid, tenantId: tid },
    include: {
      host: { select: { id: true, firstName: true, lastName: true, email: true, role: true } },
      class: { select: { id: true, name: true, code: true } },
      subject: { select: { id: true, name: true, code: true } },
      attendances: {
        include: {
          user: { select: { id: true, firstName: true, lastName: true, email: true, role: true } }
        },
        orderBy: { joinedAt: 'desc' }
      }
    }
  });

  if (!meeting) {
    throw new AppError(`Online meeting ID ${meetingId} not found in this organization.`, 404);
  }

  return meeting;
}

/**
 * Update meeting
 */
async function updateMeeting(tenantId, meetingId, payload, user) {
  const tid = parseInt(tenantId, 10);
  const mid = parseInt(meetingId, 10);

  const existing = await prisma.onlineMeeting.findFirst({
    where: { id: mid, tenantId: tid }
  });

  if (!existing) {
    throw new AppError(`Meeting ID ${meetingId} not found.`, 404);
  }

  const {
    title,
    description,
    platform,
    status,
    startTime,
    endTime,
    recordingUrl,
    recordingPassword,
    isRecorded,
    hasChat,
    hasBreakout,
    hasScreenShare,
    hasRaiseHand
  } = payload;

  const data = {};
  if (title) data.title = title.trim();
  if (description !== undefined) data.description = description ? description.trim() : null;
  if (platform) data.platform = platform.toUpperCase();
  if (status) data.status = status.toUpperCase();
  if (startTime) data.startTime = new Date(startTime);
  if (endTime) data.endTime = new Date(endTime);
  if (recordingUrl !== undefined) {
    data.recordingUrl = recordingUrl;
    data.isRecorded = true;
  }
  if (recordingPassword !== undefined) data.recordingPassword = recordingPassword;
  if (isRecorded !== undefined) data.isRecorded = Boolean(isRecorded);
  if (hasChat !== undefined) data.hasChat = Boolean(hasChat);
  if (hasBreakout !== undefined) data.hasBreakout = Boolean(hasBreakout);
  if (hasScreenShare !== undefined) data.hasScreenShare = Boolean(hasScreenShare);
  if (hasRaiseHand !== undefined) data.hasRaiseHand = Boolean(hasRaiseHand);

  const updated = await prisma.$transaction(async (tx) => {
    const res = await tx.onlineMeeting.update({
      where: { id: mid },
      data,
      include: {
        host: { select: { id: true, firstName: true, lastName: true, email: true } },
        class: { select: { id: true, name: true, code: true } }
      }
    });

    await tx.auditLog.create({
      data: {
        tenantId: tid,
        userId: user?.id,
        module: 'ONLINE_MEETING',
        action: 'ONLINE_MEETING_UPDATED',
        details: `Updated meeting ${mid} (${res.title}). Status: ${res.status}`
      }
    });

    return res;
  });

  return updated;
}

/**
 * Delete / cancel meeting
 */
async function deleteMeeting(tenantId, meetingId, user) {
  const tid = parseInt(tenantId, 10);
  const mid = parseInt(meetingId, 10);

  const existing = await prisma.onlineMeeting.findFirst({
    where: { id: mid, tenantId: tid }
  });

  if (!existing) {
    throw new AppError(`Meeting ID ${meetingId} not found.`, 404);
  }

  await prisma.$transaction(async (tx) => {
    await tx.meetingAttendance.deleteMany({ where: { meetingId: mid } });
    await tx.onlineMeeting.delete({ where: { id: mid } });

    await tx.auditLog.create({
      data: {
        tenantId: tid,
        userId: user?.id,
        module: 'ONLINE_MEETING',
        action: 'ONLINE_MEETING_DELETED',
        details: `Deleted meeting ${mid} ("${existing.title}")`
      }
    });
  });

  return { success: true, message: `Meeting ${mid} successfully deleted.` };
}

/**
 * Join meeting: records participation & automatically logs attendance for students
 */
async function joinMeeting(tenantId, meetingId, user, meta = {}) {
  const tid = parseInt(tenantId, 10);
  const mid = parseInt(meetingId, 10);
  const uid = parseInt(user.id, 10);

  const meeting = await prisma.onlineMeeting.findFirst({
    where: { id: mid, tenantId: tid },
    include: { class: true, subject: true }
  });

  if (!meeting) {
    throw new AppError(`Meeting ID ${meetingId} not found in this organization.`, 404);
  }

  if (meeting.status === 'CANCELLED') {
    throw new AppError('This meeting has been cancelled.', 400);
  }

  const result = await prisma.$transaction(async (tx) => {
    // If meeting was SCHEDULED and host or attendee joins, update status to LIVE
    if (meeting.status === 'SCHEDULED') {
      await tx.onlineMeeting.update({
        where: { id: mid },
        data: { status: 'LIVE' }
      });
    }

    // 1. Record or update Meeting Attendance
    const attendance = await tx.meetingAttendance.create({
      data: {
        tenantId: tid,
        meetingId: mid,
        userId: uid,
        joinedAt: new Date(),
        deviceInfo: meta.deviceInfo || 'Web Browser Client',
        ipAddress: meta.ipAddress || '127.0.0.1',
        attendanceStatus: 'PRESENT'
      }
    });

    // 2. Blueprint Auto-Attendance Rule:
    // If meeting is a class session and joining user is a student, auto-mark PRESENT in attendance_records table
    if (meeting.classId && user.role === 'STUDENT') {
      const todayStr = new Date().toISOString().split('T')[0];
      const todayDate = new Date(`${todayStr}T00:00:00.000Z`);

      const existingRecord = await tx.attendanceRecord.findFirst({
        where: {
          tenantId: tid,
          studentId: uid,
          classId: meeting.classId,
          date: todayDate
        }
      });

      if (!existingRecord) {
        await tx.attendanceRecord.create({
          data: {
            tenantId: tid,
            studentId: uid,
            classId: meeting.classId,
            subjectId: meeting.subjectId || null,
            date: todayDate,
            status: 'PRESENT',
            remarks: `Auto-logged: Joined ${meeting.platform} live class "${meeting.title}"`,
            markedById: meeting.hostId
          }
        });
      } else if (existingRecord.status !== 'PRESENT') {
        await tx.attendanceRecord.update({
          where: { id: existingRecord.id },
          data: {
            status: 'PRESENT',
            remarks: `Updated: Attended ${meeting.platform} live class "${meeting.title}"`
          }
        });
      }
    }

    // 3. Audit trail
    await tx.auditLog.create({
      data: {
        tenantId: tid,
        userId: uid,
        module: 'ONLINE_MEETING',
        action: 'ONLINE_MEETING_JOINED',
        details: `${user.role} ${user.firstName} ${user.lastName} joined ${meeting.platform} meeting "${meeting.title}"`
      }
    });

    return {
      meeting: {
        id: meeting.id,
        title: meeting.title,
        platform: meeting.platform,
        meetingUrl: meeting.meetingUrl,
        meetingId: meeting.meetingId,
        passcode: meeting.passcode,
        status: 'LIVE'
      },
      attendanceRecordId: attendance.id,
      joinedAt: attendance.joinedAt
    };
  });

  return result;
}

/**
 * Synchronize a timetable slot to a virtual meeting
 */
async function syncFromTimetable(tenantId, slotId, user, options = {}) {
  const tid = parseInt(tenantId, 10);
  const sid = parseInt(slotId, 10);

  const slot = await prisma.timetableSlot.findFirst({
    where: { id: sid, tenantId: tid }
  });

  if (!slot) {
    throw new AppError(`Timetable slot ID ${slotId} not found.`, 404);
  }

  // Resolve target class and subject
  const targetClass = await prisma.class.findFirst({ where: { id: slot.classId } });
  const targetSubject = await prisma.subject.findFirst({ where: { id: slot.subjectId } });

  const platform = (options.platform || 'ZOOM').toUpperCase();
  const title = `Live Class: ${targetSubject?.name || 'Subject'} - ${targetClass?.name || 'Class'}`;

  // Build scheduled date/time for today with slot start/end times
  const todayStr = new Date().toISOString().split('T')[0];
  const startTime = new Date(`${todayStr}T${slot.startTime}:00.000Z`);
  const endTime = new Date(`${todayStr}T${slot.endTime}:00.000Z`);

  return await createMeeting(tid, user, {
    title,
    description: `Automated live classroom sync for ${slot.dayOfWeek} period in ${slot.roomNumber}`,
    platform,
    meetingType: 'CLASS',
    classId: slot.classId,
    subjectId: slot.subjectId,
    timetableSlotId: slot.id,
    startTime: isNaN(startTime.getTime()) ? new Date() : startTime,
    endTime: isNaN(endTime.getTime()) ? new Date(Date.now() + 45 * 60000) : endTime
  });
}

async function batchDeleteMeetings(tenantIdOrIds, meetingIdsOrTenant, user) {
  let tid, idsArray, operatorUser;
  if (Array.isArray(tenantIdOrIds)) {
    idsArray = tenantIdOrIds;
    tid = parseInt(meetingIdsOrTenant, 10) || 1;
    operatorUser = user || { id: 17 };
  } else {
    tid = parseInt(tenantIdOrIds, 10) || 1;
    idsArray = meetingIdsOrTenant;
    operatorUser = user || { id: 17 };
  }

  if (!Array.isArray(idsArray) || idsArray.length === 0) {
    throw new AppError('No meeting IDs provided for batch deletion.', 400);
  }
  const ids = idsArray.map(id => parseInt(id, 10)).filter(id => !isNaN(id));

  let auditUserId = operatorUser?.id;
  const userExists = auditUserId ? await prisma.user.findUnique({ where: { id: auditUserId } }) : null;
  if (!userExists) {
    const anyUser = await prisma.user.findFirst();
    auditUserId = anyUser ? anyUser.id : 17;
  }

  await prisma.$transaction(async (tx) => {
    await tx.meetingAttendance.deleteMany({ where: { meetingId: { in: ids } } });
    await tx.onlineMeeting.deleteMany({ where: { id: { in: ids }, tenantId: tid } });

    await tx.auditLog.create({
      data: {
        tenantId: tid,
        userId: auditUserId,
        module: 'ONLINE_MEETING',
        action: 'ONLINE_MEETINGS_BATCH_DELETED',
        details: `Batch deleted ${ids.length} online meetings.`
      }
    });
  });

  return { success: true, count: ids.length, message: `${ids.length} meetings deleted successfully.` };
}

module.exports = {
  getStatus,
  createMeeting,
  getMeetings,
  getMeetingById,
  updateMeeting,
  deleteMeeting,
  batchDeleteMeetings,
  joinMeeting,
  syncFromTimetable
};
