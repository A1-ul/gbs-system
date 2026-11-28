'use strict';

const prisma = require('../../core/database/prisma.client');
const logger = require('../../utils/logger') || console;

function success(data = null, message = null) {
  return {
    success: true,
    message,
    data
  };
}

function failure(message) {
  return {
    success: false,
    message,
    data: null
  };
}

async function getStaffProfiles(tenantId = 1) {
  try {
    const tid = parseInt(tenantId, 10) || 1;
    // Fetch all institutional staff roles across the school
    const users = await prisma.user.findMany({
      where: {
        tenantId: tid,
        role: {
          in: [
            'TEACHER', 'ACCOUNTANT', 'STAFF', 'ADMIN', 'SUPER_ADMIN',
            'HR', 'SECRETARY', 'CLINIC_DOCTOR', 'CLINIC_NURSE'
          ]
        }
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        registrationProfile: true
      },
      orderBy: { id: 'asc' }
    });

    const formatted = users.map(u => ({
      id: u.id,
      name: `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email,
      email: u.email,
      role: u.role,
      isActive: u.isActive,
      qualification: u.registrationProfile?.highestQualification || (u.role === 'ADMIN' ? "Master's in Educational Leadership" : "Bachelor's of Education"),
      grade: u.role === 'ADMIN' ? 'Grade 5 - Senior Executive' : (u.role === 'TEACHER' ? 'Grade 3 - Professional' : 'Grade 2 - Associate'),
      step: 2,
      serviceBand: 'Band B (3–5 Yrs)',
      yearsOfService: u.registrationProfile?.experienceYears || 4.0,
      grossSalary: u.role === 'ADMIN' ? 6450.0 : (u.role === 'TEACHER' ? 4950.0 : (u.role === 'ACCOUNTANT' ? 5250.0 : 3850.0)),
      hireDate: u.createdAt
    }));

    return success({ count: formatted.length, records: formatted });
  } catch (error) {
    if (logger.error) logger.error('HR_GET_STAFF_PROFILES_ERROR', { error: error.message });
    return failure('Failed to retrieve HR staff profiles');
  }
}

async function calculateSalaryGrouping(payload) {
  try {
    const {
      baseStepAmount = 3000,
      qualificationRatio = 1.15,
      yearsOfService = 5,
      branchAllowance = 500,
      responsibilityAllowance = 300,
      housingTransportAllowance = 450,
      performanceBonus = 250
    } = payload;

    const base = parseFloat(baseStepAmount) || 3000;
    const qRatio = parseFloat(qualificationRatio) || 1.0;
    const years = parseFloat(yearsOfService) || 0;
    const branch = parseFloat(branchAllowance) || 0;
    const resp = parseFloat(responsibilityAllowance) || 0;
    const housing = parseFloat(housingTransportAllowance) || 0;
    const bonus = parseFloat(performanceBonus) || 0;

    const adjustedBase = Math.round(base * qRatio * 100) / 100;

    let bandName = 'Band A (0–2 Yrs)';
    let bandBonus = 250.0;
    if (years >= 11) {
      bandName = 'Band D (11+ Yrs)';
      bandBonus = 1200.0;
    } else if (years >= 6) {
      bandName = 'Band C (6–10 Yrs)';
      bandBonus = 750.0;
    } else if (years >= 3) {
      bandName = 'Band B (3–5 Yrs)';
      bandBonus = 450.0;
    }

    const totalAllowances = branch + resp + housing + bonus + bandBonus;
    const grossSalary = Math.round((adjustedBase + totalAllowances) * 100) / 100;

    return success({
      adjustedBase,
      serviceBand: { bandName, bonusAllowance: bandBonus },
      totalAllowances,
      grossSalary
    }, 'Salary progression evaluated');
  } catch (error) {
    if (logger.error) logger.error('HR_CALCULATE_SALARY_ERROR', { error: error.message });
    return failure('Failed to calculate salary progression');
  }
}

function readTenantLeavesFromStore(tid) {
  const { readPersistentStore } = require('../../core/database/persistentStore');
  const store = readPersistentStore();
  const list = store.hrLeaveRequests?.[String(tid)];
  return Array.isArray(list) ? list : [];
}

function writeTenantLeavesToStore(tid, nextList) {
  const { writePersistentStore } = require('../../core/database/persistentStore');
  writePersistentStore((curr) => ({
    ...curr,
    hrLeaveRequests: {
      ...(curr.hrLeaveRequests || {}),
      [String(tid)]: nextList
    }
  }));
}

async function getLeaveRequests(tenantId = 1) {
  const tid = parseInt(tenantId, 10) || 1;
  try {
    let pgRows = [];
    try {
      pgRows = await prisma.$queryRawUnsafe(`
        SELECT * FROM staff_leave_requests
        WHERE tenant_id = $1
        ORDER BY id DESC;
      `, tid);
    } catch (_) {
      pgRows = [];
    }

    const storeRows = readTenantLeavesFromStore(tid);
    const seen = new Set((pgRows || []).map((r) => String(r.id)));
    const merged = [...(pgRows || []), ...storeRows.filter((r) => !seen.has(String(r.id)))];

    return success({ count: merged.length, records: merged });
  } catch (error) {
    if (logger.error) logger.error('HR_GET_LEAVE_REQUESTS_ERROR', { error: error.message });
    const fallback = readTenantLeavesFromStore(tid);
    return success({ count: fallback.length, records: fallback });
  }
}

async function createLeaveRequest(payload, tenantId = 1) {
  const tid = parseInt(tenantId, 10) || 1;
  try {
    const { staffId, staffName, staffRole, leaveType, startDate, endDate, daysCount, reason } = payload;
    if (!leaveType || !startDate || !endDate || !reason) {
      return failure('Leave type, start date, end date, and reason are required');
    }

    let sid = staffId ? parseInt(staffId, 10) : null;
    if (sid) {
      try {
        const userExists = await prisma.user.findUnique({ where: { id: sid } });
        if (!userExists) sid = null;
      } catch (_) {
        sid = null;
      }
    }

    const days = parseInt(daysCount, 10) || 1;
    let created = null;
    try {
      const result = await prisma.$queryRawUnsafe(`
        INSERT INTO staff_leave_requests (tenant_id, staff_id, staff_name, staff_role, leave_type, start_date, end_date, days_count, reason, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'PENDING')
        RETURNING *;
      `, tid, sid, staffName || 'Staff Member', staffRole || 'STAFF', leaveType, new Date(startDate), new Date(endDate), days, reason);
      if (result && result[0]) created = result[0];
    } catch (_) {
      created = null;
    }

    if (!created) {
      created = {
        id: Date.now(),
        tenant_id: tid,
        tenantId: tid,
        staff_id: sid,
        staff_name: staffName || 'Staff Member',
        staff_role: staffRole || 'STAFF',
        leave_type: leaveType,
        start_date: startDate,
        end_date: endDate,
        days_count: days,
        reason,
        status: 'PENDING',
        created_at: new Date().toISOString()
      };
      const existing = readTenantLeavesFromStore(tid);
      writeTenantLeavesToStore(tid, [created, ...existing]);
    }

    return success(created, 'Leave request submitted successfully for administrative review');
  } catch (error) {
    if (logger.error) logger.error('HR_CREATE_LEAVE_REQUEST_ERROR', { error: error.message });
    return failure('Failed to submit leave request');
  }
}

async function updateLeaveStatus(requestId, payload, tenantId = 1) {
  const tid = parseInt(tenantId, 10) || 1;
  try {
    const ridNum = parseInt(requestId, 10);
    const { status, reviewedBy, rejectionReason } = payload;

    const valid = ['PENDING', 'APPROVED', 'REJECTED'];
    if (!valid.includes(status)) {
      return failure('Invalid leave status');
    }

    let updatedRow = null;
    if (!Number.isNaN(ridNum)) {
      try {
        const updated = await prisma.$queryRawUnsafe(`
          UPDATE staff_leave_requests
          SET status = $1,
              reviewed_by = $2,
              reviewed_at = NOW(),
              rejection_reason = $3,
              updated_at = NOW()
          WHERE id = $4 AND tenant_id = $5
          RETURNING *;
        `, status, reviewedBy ? (parseInt(reviewedBy, 10) || null) : null, rejectionReason || null, ridNum, tid);
        if (updated && updated.length > 0) updatedRow = updated[0];
      } catch (_) {
        updatedRow = null;
      }
    }

    // Update persistent store if stored in fallback or synchronize store record
    const existingStore = readTenantLeavesFromStore(tid);
    const storeIdx = existingStore.findIndex((r) => String(r.id) === String(requestId));
    if (storeIdx >= 0) {
      existingStore[storeIdx] = {
        ...existingStore[storeIdx],
        status,
        reviewed_by: reviewedBy || null,
        rejection_reason: rejectionReason || null,
        reviewed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      writeTenantLeavesToStore(tid, existingStore);
      if (!updatedRow) updatedRow = existingStore[storeIdx];
    }

    if (!updatedRow) {
      return failure('Leave request not found');
    }

    return success(updatedRow, `Leave request status updated to ${status}`);
  } catch (error) {
    if (logger.error) logger.error('HR_UPDATE_LEAVE_STATUS_ERROR', { error: error.message });
    return failure('Failed to update leave request status');
  }
}

async function getStats(tenantId = 1) {
  const tid = parseInt(tenantId, 10) || 1;
  try {
    let staffCount = 0;
    try {
      staffCount = await prisma.user.count({
        where: {
          tenantId: tid,
          role: { in: ['TEACHER', 'ACCOUNTANT', 'STAFF', 'ADMIN', 'HR'] }
        }
      });
    } catch (_) {
      staffCount = 0;
    }

    let leaveStats = [];
    try {
      leaveStats = await prisma.$queryRawUnsafe(`
        SELECT 
          COUNT(CASE WHEN status = 'APPROVED' AND start_date <= CURRENT_DATE AND end_date >= CURRENT_DATE THEN 1 END)::int as on_leave_now,
          COUNT(CASE WHEN status = 'PENDING' THEN 1 END)::int as pending_leaves,
          COUNT(CASE WHEN status = 'APPROVED' THEN 1 END)::int as approved_leaves
        FROM staff_leave_requests
        WHERE tenant_id = $1;
      `, tid);
    } catch (_) {
      leaveStats = [];
    }

    const storeRows = readTenantLeavesFromStore(tid);
    const pendingStore = storeRows.filter((r) => r.status === 'PENDING').length;
    const approvedStore = storeRows.filter((r) => r.status === 'APPROVED').length;
    const estimatedPayroll = staffCount * 4750.00;

    return success({
      totalStaff: staffCount,
      onLeaveCount: leaveStats[0]?.on_leave_now || 0,
      pendingLeaveRequests: (leaveStats[0]?.pending_leaves || 0) + pendingStore,
      approvedLeavesTotal: (leaveStats[0]?.approved_leaves || 0) + approvedStore,
      monthlyPayrollObligation: estimatedPayroll
    });
  } catch (error) {
    if (logger.error) logger.error('HR_GET_STATS_ERROR', { error: error.message });
    return failure('Failed to retrieve HR telemetry');
  }
}

// Default positions template for Demo Sovereign Tenant (#1) or initial governance setup
const DEFAULT_POSITIONS_TEMPLATE = [
  { id: 'pos-1', title: 'Head of Academics', department: 'Academic Directorate', schoolTier: 'ALL', tierLabel: 'Institution-Wide', responsibilities: 'Curriculum oversight, academic quality audits, and syllabus delivery across all tiers.' },
  { id: 'pos-2', title: 'Vice Chancellor', department: 'Executive Governance', schoolTier: 'UNIVERSITY', tierLabel: 'University', responsibilities: 'Executive oversight of university academic planning, research governance, and collegiate boards.' },
  { id: 'pos-3', title: 'Assistant Headmaster (Academics)', department: 'Academic Administration', schoolTier: 'SHS', tierLabel: 'Senior High School', responsibilities: 'Timetable coordination, academic evaluations, faculty syllabus reviews, and teacher schedules.' },
  { id: 'pos-4', title: 'Assistant Headmaster (Administration)', department: 'Operations & Discipline', schoolTier: 'SHS', tierLabel: 'Senior High School', responsibilities: 'Campus discipline, non-teaching staff supervision, logistics, and student welfare.' },
  { id: 'pos-5', title: 'Head of Department (Science & STEM)', department: 'Faculty of Natural Sciences', schoolTier: 'SHS', tierLabel: 'Senior High School', responsibilities: 'Physics, Chemistry, and Biology laboratory safety, faculty lesson plans, and practical exams.' },
  { id: 'pos-6', title: 'Head of Department (Humanities & Arts)', department: 'Faculty of Arts', schoolTier: 'SHS', tierLabel: 'Senior High School', responsibilities: 'Literature, History, and Government curriculum coordination.' },
  { id: 'pos-7', title: 'Head of Junior High School (JHS)', department: 'Basic & Junior Secondary', schoolTier: 'JHS', tierLabel: 'Junior High School', responsibilities: 'Supervision of Grades 7-9 (JHS 1-3), mock BECE exams, and student transition assessments.' },
  { id: 'pos-8', title: 'Head of Department (JHS Math & ICT)', department: 'Junior High Academic Wing', schoolTier: 'JHS', tierLabel: 'Junior High School', responsibilities: 'Core math, computing lab practicals, and BECE STEM candidates preparation.' },
  { id: 'pos-9', title: 'Head of Basic School', department: 'Primary Directorate', schoolTier: 'BASIC', tierLabel: 'Basic School (KG & Primary)', responsibilities: 'Foundational literacy, numeracy, child protection, and early childhood learning governance.' },
  { id: 'pos-10', title: 'Dean of Faculty (Computing & Engineering)', department: 'Collegiate Directorate', schoolTier: 'UNIVERSITY', tierLabel: 'University', responsibilities: 'Undergraduate and postgraduate curriculum, faculty research grants, and departmental leadership.' },
  { id: 'pos-11', title: 'Dean of Students', department: 'Student Affairs', schoolTier: 'UNIVERSITY', tierLabel: 'University', responsibilities: 'Campus life, student leadership council, hall residences, and disciplinary council.' },
  { id: 'pos-12', title: 'Registrar', department: 'Registry & Records', schoolTier: 'UNIVERSITY', tierLabel: 'University', responsibilities: 'Academic transcripts, matriculation, congregation, student records custody, and council minutes.' }
];

const DEMO_ASSIGNMENTS_TEMPLATE = [
  { staffId: 1, staffName: 'Dr. Robert Vance', staffEmail: 'robert.vance@gbs.edu', positionTitle: 'Head of Academics', schoolTier: 'ALL', department: 'Academic Directorate', assignedDate: '2026-01-15' },
  { staffId: 2, staffName: 'Prof. Eleanor Sterling', staffEmail: 'eleanor.sterling@gbs.edu', positionTitle: 'Head of Department (Science & STEM)', schoolTier: 'SHS', department: 'Faculty of Natural Sciences', assignedDate: '2026-02-01' },
  { staffId: 3, staffName: 'Claire Montgomery', staffEmail: 'claire.m@gbs.edu', positionTitle: 'Head of Basic School', schoolTier: 'BASIC', department: 'Primary Directorate', assignedDate: '2026-02-10' }
];

async function getPositions(tenantId = 1) {
  try {
    const tid = parseInt(tenantId, 10) || 1;
    const { readPersistentStore } = require('../../core/database/persistentStore');
    const store = readPersistentStore();
    const byTenant = store.hrPositions?.[String(tid)];
    if (Array.isArray(byTenant)) {
      return success({ count: byTenant.length, positions: byTenant });
    }
    const seed = tid === 1 ? [...DEFAULT_POSITIONS_TEMPLATE] : DEFAULT_POSITIONS_TEMPLATE.slice(0, 4).map((p) => ({ ...p, id: `${p.id}-t${tid}`, tenantId: tid }));
    return success({ count: seed.length, positions: seed });
  } catch (error) {
    return failure('Failed to fetch positions');
  }
}

async function createPosition(payload, tenantId = 1) {
  try {
    const tid = parseInt(tenantId, 10) || 1;
    const { title, department = 'General Faculty', schoolTier = 'ALL', responsibilities = '' } = payload;
    if (!title || !title.trim()) {
      return failure('Position title is required.');
    }
    const tierMap = {
      BASIC: 'Basic School (KG & Primary)',
      JHS: 'Junior High School',
      SHS: 'Senior High School',
      UNIVERSITY: 'University',
      ALL: 'Institution-Wide'
    };
    const newPos = {
      id: `pos-${Date.now()}`,
      tenantId: tid,
      title: title.trim(),
      department: department.trim(),
      schoolTier: schoolTier.toUpperCase(),
      tierLabel: tierMap[schoolTier.toUpperCase()] || 'Institution-Wide',
      responsibilities: responsibilities.trim(),
      createdAt: new Date().toISOString()
    };
    const { readPersistentStore, writePersistentStore } = require('../../core/database/persistentStore');
    const existingRes = await getPositions(tid);
    const currentList = existingRes.success ? existingRes.data.positions : [];
    const updated = [newPos, ...currentList];
    writePersistentStore((curr) => ({
      ...curr,
      hrPositions: { ...(curr.hrPositions || {}), [String(tid)]: updated }
    }));
    return success(newPos, `Position '${newPos.title}' created successfully for ${newPos.tierLabel}.`);
  } catch (error) {
    return failure('Failed to create staff position');
  }
}

async function deletePosition(positionId, tenantId = 1) {
  try {
    const tid = parseInt(tenantId, 10) || 1;
    const { writePersistentStore } = require('../../core/database/persistentStore');
    const existingRes = await getPositions(tid);
    const currentList = existingRes.success ? existingRes.data.positions : [];
    const filtered = currentList.filter((p) => String(p.id) !== String(positionId));
    if (filtered.length === currentList.length) {
      return failure('Position not found');
    }
    writePersistentStore((curr) => ({
      ...curr,
      hrPositions: { ...(curr.hrPositions || {}), [String(tid)]: filtered }
    }));
    return success(null, 'Position deleted successfully');
  } catch (error) {
    return failure('Failed to delete position');
  }
}

async function getStaffAssignments(tenantId = 1) {
  try {
    const tid = parseInt(tenantId, 10) || 1;
    const { readPersistentStore } = require('../../core/database/persistentStore');
    const store = readPersistentStore();
    const byTenant = store.hrAssignments?.[String(tid)];
    if (Array.isArray(byTenant)) {
      return success({ count: byTenant.length, assignments: byTenant });
    }
    const seed = tid === 1 ? [...DEMO_ASSIGNMENTS_TEMPLATE] : [];
    return success({ count: seed.length, assignments: seed });
  } catch (error) {
    return failure('Failed to fetch staff assignments');
  }
}

async function assignStaffPosition(payload, tenantId = 1) {
  try {
    const tid = parseInt(tenantId, 10) || 1;
    const { staffId, staffName, staffEmail, positionTitle, schoolTier = 'ALL', department = 'Academics', notes = '' } = payload;
    const effStaffId = staffId || (staffName ? Date.now() : null);
    if (!effStaffId || !positionTitle) {
      return failure('staffId and positionTitle are required.');
    }
    const { writePersistentStore } = require('../../core/database/persistentStore');
    const existingRes = await getStaffAssignments(tid);
    const list = existingRes.success ? [...existingRes.data.assignments] : [];
    const existingIdx = list.findIndex((a) => String(a.staffId) === String(effStaffId));
    const record = {
      tenantId: tid,
      staffId: parseInt(effStaffId, 10) || effStaffId,
      staffName: staffName || `Staff Member #${effStaffId}`,
      staffEmail: staffEmail || '',
      positionTitle,
      schoolTier,
      department,
      assignedDate: new Date().toISOString().split('T')[0],
      notes
    };
    if (existingIdx >= 0) {
      list[existingIdx] = record;
    } else {
      list.unshift(record);
    }
    writePersistentStore((curr) => ({
      ...curr,
      hrAssignments: { ...(curr.hrAssignments || {}), [String(tid)]: list }
    }));
    return success(record, `Staff member '${record.staffName}' successfully assigned to '${positionTitle}' (${schoolTier})!`);
  } catch (error) {
    return failure('Failed to assign staff position');
  }
}

async function getStatus() {
  return {
    module: 'hr',
    status: 'OPERATIONAL',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  };
}

module.exports = {
  getStaffProfiles,
  calculateSalaryGrouping,
  getLeaveRequests,
  createLeaveRequest,
  updateLeaveStatus,
  getStats,
  getStatus,
  getPositions,
  createPosition,
  deletePosition,
  getStaffAssignments,
  assignStaffPosition
};

