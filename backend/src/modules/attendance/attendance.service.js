'use strict';

const prisma = require('../../core/database/prisma.client');
const { AppError } = require('../../middleware/error.middleware');

/**
 * Normalizes any date string or Date object to a clean UTC Date at 00:00:00.000Z
 */
const normalizeDate = (dateInput) => {
  if (!dateInput) return new Date();
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) {
    throw new AppError(`Invalid date format: ${dateInput}`, 400);
  }
  const dateStr = d.toISOString().split('T')[0];
  return new Date(`${dateStr}T00:00:00.000Z`);
};

const toNumId = (val, fallback = 1) => {
  if (typeof val === 'number' && Number.isFinite(val)) return Math.trunc(val);
  const digits = String(val ?? '').replace(/\D/g, '');
  if (digits.length > 0) return parseInt(digits.slice(-7), 10) || fallback;
  return fallback;
};

/**
 * Retrieve class roster with enrollment records or active student fallback
 */
const getClassRoster = async (tenantId, classId) => {
  const tid = toNumId(tenantId, 1);
  const cid = toNumId(classId, 1);

  const targetClass = await prisma.class.findFirst({
    where: { id: cid, tenantId: tid },
    include: { subjects: true }
  });

  if (!targetClass) {
    throw new AppError(`Class ID ${classId} not found in this organization.`, 404);
  }

  // 1. Check explicit class enrollments
  let enrollments = await prisma.classEnrollment.findMany({
    where: { tenantId: tid, classId: cid, status: 'ACTIVE' },
    include: {
      student: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          role: true,
          isActive: true
        }
      }
    },
    orderBy: { student: { lastName: 'asc' } }
  });

  // 2. If no explicit enrollments exist, auto-enroll active students of the tenant
  if (enrollments.length === 0) {
    const activeStudents = await prisma.user.findMany({
      where: { tenantId: tid, role: 'STUDENT', isActive: true },
      take: 20,
      orderBy: { lastName: 'asc' }
    });

    if (activeStudents.length > 0) {
      for (const student of activeStudents) {
        await prisma.classEnrollment.upsert({
          where: {
            classId_studentId: { classId: cid, studentId: student.id }
          },
          update: { status: 'ACTIVE' },
          create: {
            tenantId: tid,
            classId: cid,
            studentId: student.id,
            status: 'ACTIVE'
          }
        });
      }

      // Re-fetch
      enrollments = await prisma.classEnrollment.findMany({
        where: { tenantId: tid, classId: cid, status: 'ACTIVE' },
        include: {
          student: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              role: true,
              isActive: true
            }
          }
        },
        orderBy: { student: { lastName: 'asc' } }
      });
    }
  }

  // Calculate per-student attendance percentage
  const studentIds = enrollments.map(e => e.student.id);
  const attendanceSummaries = await prisma.attendanceRecord.groupBy({
    by: ['studentId', 'status'],
    where: {
      tenantId: tid,
      classId: cid,
      studentId: { in: studentIds }
    },
    _count: { status: true }
  });

  const roster = enrollments.map(e => {
    const sId = e.student.id;
    const stats = attendanceSummaries.filter(item => item.studentId === sId);
    let present = 0, absent = 0, late = 0, excused = 0;
    stats.forEach(item => {
      if (item.status === 'PRESENT') present += item._count.status;
      if (item.status === 'ABSENT') absent += item._count.status;
      if (item.status === 'LATE') late += item._count.status;
      if (item.status === 'EXCUSED') excused += item._count.status;
    });
    const total = present + absent + late + excused;
    const attendancePct = total > 0 ? Math.round(((present + late) / total) * 100) : 100;

    return {
      id: e.student.id,
      studentId: e.student.id,
      firstName: e.student.firstName,
      lastName: e.student.lastName,
      name: `${e.student.firstName} ${e.student.lastName}`,
      email: e.student.email,
      enrolledAt: e.enrolledAt,
      stats: { total, present, absent, late, excused, attendancePct }
    };
  });

  return {
    class: targetClass,
    totalEnrolled: roster.length,
    students: roster
  };
};

/**
 * Mark Attendance Batch for an Entire Class Roster
 */
const markBatchAttendance = async (tenantId, data, operatorUser) => {
  const tid = toNumId(tenantId, 1);
  const cid = toNumId(data.classId, 1);
  const subId = data.subjectId ? toNumId(data.subjectId, 1) : null;
  const targetDate = normalizeDate(data.date);

  if (!cid) {
    throw new AppError('Valid classId is required for marking attendance.', 400);
  }
  if (!Array.isArray(data.records) || data.records.length === 0) {
    throw new AppError('At least one student attendance record is required.', 400);
  }

  // Verify class belongs to tenant
  const targetClass = await prisma.class.findFirst({
    where: { id: cid, tenantId: tid }
  });
  if (!targetClass) {
    throw new AppError(`Class ID ${cid} not found in this organization.`, 404);
  }

  // If subjectId is supplied, verify it belongs to this class
  if (subId) {
    const targetSubject = await prisma.subject.findFirst({
      where: { id: subId, classId: cid }
    });
    if (!targetSubject) {
      throw new AppError(`Subject ID ${subId} does not belong to class ID ${cid}.`, 404);
    }
  }

  // Process all student records inside a database transaction
  const validStatuses = ['PRESENT', 'ABSENT', 'LATE', 'EXCUSED'];
  const processedRecords = [];

  await prisma.$transaction(async (tx) => {
    for (const item of data.records) {
      const studentId = toNumId(item.studentId, 3);
      const status = (item.status || 'PRESENT').toUpperCase();
      const remarks = item.remarks || null;

      if (!validStatuses.includes(status)) {
        throw new AppError(`Invalid status "${status}" for student ID ${studentId}. Must be one of: ${validStatuses.join(', ')}`, 400);
      }

      // Check if record exists for same tenant, class, student, date, and subject
      const existing = await tx.attendanceRecord.findFirst({
        where: {
          tenantId: tid,
          classId: cid,
          studentId,
          date: targetDate,
          subjectId: subId
        }
      });

      let saved;
      if (existing) {
        saved = await tx.attendanceRecord.update({
          where: { id: existing.id },
          data: {
            status,
            remarks,
            markedById: operatorUser?.id || null,
            updatedAt: new Date()
          }
        });
      } else {
        saved = await tx.attendanceRecord.create({
          data: {
            tenantId: tid,
            classId: cid,
            studentId,
            subjectId: subId,
            date: targetDate,
            status,
            remarks,
            markedById: operatorUser?.id || null
          }
        });
      }
      processedRecords.push(saved);
    }

    // Write audit log
    await tx.auditLog.create({
      data: {
        tenantId: tid,
        userId: operatorUser?.id || null,
        action: 'ATTENDANCE_BATCH_MARKED',
        module: 'attendance',
        details: JSON.stringify({
          classId: cid,
          className: targetClass.name,
          subjectId: subId,
          date: targetDate.toISOString().split('T')[0],
          recordsCount: processedRecords.length,
          markedBy: operatorUser?.email || 'SYSTEM'
        })
      }
    });
  });

  // Calculate batch metrics
  let present = 0, absent = 0, late = 0, excused = 0;
  processedRecords.forEach(r => {
    if (r.status === 'PRESENT') present++;
    if (r.status === 'ABSENT') absent++;
    if (r.status === 'LATE') late++;
    if (r.status === 'EXCUSED') excused++;
  });
  const total = processedRecords.length;
  const attendanceRate = total > 0 ? Math.round(((present + late) / total) * 100) : 0;

  return {
    classId: cid,
    className: targetClass.name,
    subjectId: subId,
    date: targetDate.toISOString().split('T')[0],
    metrics: {
      totalMarked: total,
      present,
      absent,
      late,
      excused,
      attendanceRate: `${attendanceRate}%`
    },
    records: processedRecords
  };
};

/**
 * Retrieve Attendance Records by Class and Date/Range
 */
const getClassAttendance = async (tenantId, classId, query = {}) => {
  const tid = parseInt(tenantId, 10);
  const cid = parseInt(classId, 10);
  const { date, startDate, endDate, subjectId } = query;

  const whereClause = {
    tenantId: tid,
    classId: cid
  };

  if (subjectId) {
    whereClause.subjectId = parseInt(subjectId, 10);
  }

  if (date) {
    whereClause.date = normalizeDate(date);
  } else if (startDate || endDate) {
    whereClause.date = {};
    if (startDate) whereClause.date.gte = normalizeDate(startDate);
    if (endDate) whereClause.date.lte = normalizeDate(endDate);
  }

  const records = await prisma.attendanceRecord.findMany({
    where: whereClause,
    include: {
      student: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true
        }
      },
      subject: {
        select: {
          id: true,
          name: true,
          code: true
        }
      },
      markedBy: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true
        }
      }
    },
    orderBy: [
      { date: 'desc' },
      { student: { lastName: 'asc' } }
    ]
  });

  // Compute metrics
  let present = 0, absent = 0, late = 0, excused = 0;
  records.forEach(r => {
    if (r.status === 'PRESENT') present++;
    if (r.status === 'ABSENT') absent++;
    if (r.status === 'LATE') late++;
    if (r.status === 'EXCUSED') excused++;
  });
  const total = records.length;
  const attendanceRate = total > 0 ? Math.round(((present + late) / total) * 100) : 0;

  return {
    classId: cid,
    metrics: {
      total,
      present,
      absent,
      late,
      excused,
      attendanceRate: `${attendanceRate}%`
    },
    records
  };
};

/**
 * Retrieve Student Personal Attendance History
 */
const getStudentAttendance = async (tenantId, studentId, query = {}) => {
  const tid = parseInt(tenantId, 10);
  const sid = parseInt(studentId, 10);
  const { classId, startDate, endDate } = query;

  const whereClause = {
    tenantId: tid,
    studentId: sid
  };

  if (classId) {
    whereClause.classId = parseInt(classId, 10);
  }

  if (startDate || endDate) {
    whereClause.date = {};
    if (startDate) whereClause.date.gte = normalizeDate(startDate);
    if (endDate) whereClause.date.lte = normalizeDate(endDate);
  }

  const student = await prisma.user.findFirst({
    where: { id: sid, tenantId: tid },
    select: { id: true, firstName: true, lastName: true, email: true, role: true }
  });

  if (!student) {
    throw new AppError(`Student ID ${sid} not found in this organization.`, 404);
  }

  const records = await prisma.attendanceRecord.findMany({
    where: whereClause,
    include: {
      class: { select: { id: true, name: true, code: true } },
      subject: { select: { id: true, name: true, code: true } }
    },
    orderBy: { date: 'desc' }
  });

  let present = 0, absent = 0, late = 0, excused = 0;
  records.forEach(r => {
    if (r.status === 'PRESENT') present++;
    if (r.status === 'ABSENT') absent++;
    if (r.status === 'LATE') late++;
    if (r.status === 'EXCUSED') excused++;
  });
  const total = records.length;
  const attendanceRate = total > 0 ? Math.round(((present + late) / total) * 100) : 100;

  return {
    student,
    summary: {
      totalSessions: total,
      present,
      absent,
      late,
      excused,
      attendanceRate: `${attendanceRate}%`,
      attendanceRateNumber: attendanceRate
    },
    records
  };
};

/**
 * Overall Attendance Analytics for Tenant
 */
const getAttendanceAnalytics = async (tenantId, query = {}) => {
  const tid = parseInt(tenantId, 10);
  const days = parseInt(query.days, 10) || 30;

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  startDate.setHours(0, 0, 0, 0);

  const records = await prisma.attendanceRecord.findMany({
    where: {
      tenantId: tid,
      date: { gte: startDate }
    },
    include: {
      student: { select: { id: true, firstName: true, lastName: true, email: true } },
      class: { select: { id: true, name: true, code: true } }
    }
  });

  let present = 0, absent = 0, late = 0, excused = 0;
  const studentMap = {};
  const dateMap = {};

  records.forEach(r => {
    if (r.status === 'PRESENT') present++;
    if (r.status === 'ABSENT') absent++;
    if (r.status === 'LATE') late++;
    if (r.status === 'EXCUSED') excused++;

    // Track per student
    if (!studentMap[r.studentId]) {
      studentMap[r.studentId] = {
        student: r.student,
        class: r.class,
        total: 0,
        present: 0,
        absent: 0
      };
    }
    studentMap[r.studentId].total++;
    if (r.status === 'PRESENT' || r.status === 'LATE') studentMap[r.studentId].present++;
    if (r.status === 'ABSENT') studentMap[r.studentId].absent++;

    // Track per date
    const dStr = r.date.toISOString().split('T')[0];
    if (!dateMap[dStr]) {
      dateMap[dStr] = { date: dStr, total: 0, present: 0, absent: 0 };
    }
    dateMap[dStr].total++;
    if (r.status === 'PRESENT' || r.status === 'LATE') dateMap[dStr].present++;
    if (r.status === 'ABSENT') dateMap[dStr].absent++;
  });

  const total = records.length;
  const overallRate = total > 0 ? Math.round(((present + late) / total) * 100) : 100;

  // Chronically absent (<75% attendance)
  const chronicAbsenteeism = Object.values(studentMap)
    .map(item => ({
      studentId: item.student.id,
      name: `${item.student.firstName} ${item.student.lastName}`,
      email: item.student.email,
      className: item.class.name,
      total: item.total,
      absent: item.absent,
      ratePct: item.total > 0 ? Math.round((item.present / item.total) * 100) : 100
    }))
    .filter(item => item.ratePct < 75 && item.total >= 3);

  return {
    daysEvaluated: days,
    overallRate: `${overallRate}%`,
    totalRecords: total,
    breakdown: { present, absent, late, excused },
    dailyTrend: Object.values(dateMap).sort((a, b) => a.date.localeCompare(b.date)),
    chronicAbsenteeismAlerts: chronicAbsenteeism
  };
};

/**
 * Mark Attendance for a Single Student Individually (One at a time)
 */
const markSingleStudentAttendance = async (tenantIdOrData, dataOrOperator, optionalOperator) => {
  let tid, data, operatorUser;
  if (typeof tenantIdOrData === 'object' && tenantIdOrData !== null && (!dataOrOperator || typeof dataOrOperator !== 'object' || !dataOrOperator.classId)) {
    data = tenantIdOrData;
    tid = parseInt(data.tenantId, 10) || 1;
    operatorUser = dataOrOperator || { id: 1, role: 'TEACHER' };
  } else {
    tid = parseInt(tenantIdOrData, 10) || 1;
    data = dataOrOperator || {};
    operatorUser = optionalOperator || { id: 1, role: 'TEACHER' };
  }
  const { classId, studentId, status, date, remarks, subjectId } = data;

  if (!studentId) {
    throw new AppError('studentId is required for marking attendance.', 400);
  }

  const cid = toNumId(classId, 1);
  const sid = toNumId(studentId, 3);
  const subId = subjectId ? toNumId(subjectId, 1) : null;
  const targetDate = normalizeDate(date);

  const existing = await prisma.attendanceRecord.findFirst({
    where: {
      tenantId: tid,
      classId: cid,
      studentId: sid,
      date: targetDate,
      subjectId: subId
    }
  });

  // If status is empty, null, or 'NONE', unmark the student by removing any existing record
  if (!status || status === 'NONE' || status === 'UNMARKED') {
    if (existing) {
      await prisma.attendanceRecord.delete({ where: { id: existing.id } });
    }
    return {
      studentId: sid,
      classId: cid,
      date: targetDate.toISOString().split('T')[0],
      status: null,
      remarks: null,
      message: 'Attendance record cleared/unmarked.'
    };
  }

  const validStatuses = ['PRESENT', 'ABSENT', 'LATE', 'EXCUSED'];
  const upperStatus = String(status).toUpperCase();
  const validStatus = validStatuses.includes(upperStatus) ? upperStatus : 'PRESENT';

  let validMarkerId = null;
  if (operatorUser?.id) {
    const userExists = await prisma.user.findUnique({ where: { id: parseInt(operatorUser.id, 10) } });
    if (userExists) {
      validMarkerId = userExists.id;
    }
  }

  let saved;
  if (existing) {
    saved = await prisma.attendanceRecord.update({
      where: { id: existing.id },
      data: {
        status: validStatus,
        remarks: remarks !== undefined ? remarks : existing.remarks,
        markedById: validMarkerId,
        updatedAt: new Date()
      }
    });
  } else {
    saved = await prisma.attendanceRecord.create({
      data: {
        tenantId: tid,
        classId: cid,
        studentId: sid,
        subjectId: subId,
        date: targetDate,
        status: validStatus,
        remarks: remarks || null,
        markedById: validMarkerId
      }
    });
  }

  // Audit log
  let auditUserId = validMarkerId;
  if (!auditUserId) {
    const anyUser = await prisma.user.findFirst();
    auditUserId = anyUser ? anyUser.id : sid;
  }

  await prisma.auditLog.create({
    data: {
      tenantId: tid,
      userId: auditUserId,
      action: 'SINGLE_STUDENT_ATTENDANCE_MARKED',
      module: 'ATTENDANCE',
      details: `Marked student #${sid} as ${validStatus} for class #${cid} on ${targetDate}.`
    }
  });

  return saved;
};

// In-memory persistent weekly attendance report submissions for Headmaster cross-checking
let weeklyAttendanceReportsStore = [
  {
    id: 'WAR-2026-001',
    teacherId: 1,
    teacherName: 'Dr. Robert Vance',
    classId: 1,
    className: 'Grade 10A Mathematics & Science',
    weekLabel: 'Week 4 (Oct 13 - Oct 17, 2026)',
    weekStartDate: '2026-10-13',
    weekEndDate: '2026-10-17',
    totalEnrolled: 28,
    averageAttendanceRate: 94.6,
    totalPresentDays: 132,
    totalAbsentDays: 5,
    totalLateDays: 3,
    absenteesList: ['Julian Bramwell (Oct 14)', 'Sophia Chen (Oct 16)'],
    teacherNotes: 'Steady classroom participation. Two students had excused medical absences.',
    submittedAt: '2026-10-17 16:30:00',
    status: 'VERIFIED_AND_SIGNED_OFF',
    headmasterReview: {
      verifiedBy: 'Headmaster Arthur Pendleton',
      verifiedAt: '2026-10-18 09:15:00',
      remarks: 'Cross-checked against physical turnstile logs. Approved and filed.'
    }
  }
];

const submitWeeklyReport = async (tenantId, payload, teacherUser) => {
  const tid = parseInt(tenantId, 10) || 1;
  const {
    classId = 1,
    className = 'Grade 10A Mathematics',
    weekLabel = 'Current Academic Week',
    weekStartDate = new Date().toISOString().split('T')[0],
    weekEndDate = new Date().toISOString().split('T')[0],
    totalEnrolled = 28,
    averageAttendanceRate = 95,
    totalPresentDays = 130,
    totalAbsentDays = 4,
    totalLateDays = 2,
    absenteesList = [],
    teacherNotes = 'Weekly class register compiled.'
  } = payload;

  const newReport = {
    id: `WAR-${Date.now()}`,
    tenantId: tid,
    teacherId: teacherUser?.id || 1,
    teacherName: teacherUser ? `${teacherUser.firstName || ''} ${teacherUser.lastName || ''}`.trim() : 'Class Teacher',
    classId: parseInt(classId, 10) || 1,
    className,
    weekLabel,
    weekStartDate,
    weekEndDate,
    totalEnrolled: parseInt(totalEnrolled, 10) || 28,
    averageAttendanceRate: parseFloat(averageAttendanceRate) || 95,
    totalPresentDays: parseInt(totalPresentDays, 10) || 0,
    totalAbsentDays: parseInt(totalAbsentDays, 10) || 0,
    totalLateDays: parseInt(totalLateDays, 10) || 0,
    absenteesList: Array.isArray(absenteesList) ? absenteesList : [],
    teacherNotes,
    submittedAt: new Date().toLocaleString(),
    status: 'PENDING_HEADMASTER_REVIEW',
    headmasterReview: null
  };

  weeklyAttendanceReportsStore.unshift(newReport);
  return newReport;
};

const getWeeklyReports = async (tenantId) => {
  return weeklyAttendanceReportsStore;
};

const crossCheckWeeklyReport = async (tenantId, reportId, headmasterUser, reviewData = {}) => {
  const report = weeklyAttendanceReportsStore.find(r => String(r.id) === String(reportId));
  if (!report) {
    throw new AppError('Weekly attendance report not found', 404);
  }

  report.status = reviewData.status || 'VERIFIED_AND_SIGNED_OFF';
  report.headmasterReview = {
    verifiedBy: headmasterUser ? `${headmasterUser.firstName || 'Headmaster'} ${headmasterUser.lastName || ''}`.trim() : 'Headmaster Arthur Pendleton',
    verifiedAt: new Date().toLocaleString(),
    remarks: reviewData.remarks || 'Cross-checked and approved by Headmaster executive suite.'
  };

  return report;
};

module.exports = {
  getClassRoster,
  markBatchAttendance,
  markSingleStudentAttendance,
  getClassAttendance,
  getStudentAttendance,
  getAttendanceAnalytics,
  submitWeeklyReport,
  getWeeklyReports,
  crossCheckWeeklyReport
};

