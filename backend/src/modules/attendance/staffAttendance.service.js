'use strict';

const { readPersistentStore, writePersistentStore } = require('../../core/database/persistentStore');
const { AppError } = require('../../middleware/error.middleware');
const { isDemoSandboxRequest } = require('../../middleware/demoLimit.middleware');

const STAFF_ROLES = new Set([
  'ADMIN',
  'SUPER_ADMIN',
  'HEADMASTER',
  'PRINCIPAL',
  'TEACHER',
  'STAFF',
  'HR',
  'ACCOUNTANT',
  'CLINIC_DOCTOR',
  'CLINIC_NURSE',
  'MEDICAL_DOCTOR',
  'NURSE'
]);

const ROLE_TO_DEPARTMENT = {
  CLINIC_DOCTOR: 'School Clinic (Medical)',
  MEDICAL_DOCTOR: 'School Clinic (Medical)',
  CLINIC_NURSE: 'School Clinic (Medical)',
  NURSE: 'School Clinic (Medical)',
  TEACHER: 'Academic Faculty',
  ACCOUNTANT: 'Finance & Bursary',
  HR: 'Human Resources',
  STAFF: 'Campus Operations',
  ADMIN: 'Headmaster Administration',
  SUPER_ADMIN: 'Headmaster Administration',
  HEADMASTER: 'Headmaster Administration'
};

function todayDateStr() {
  return new Date().toISOString().slice(0, 10);
}

function formatDurationMinutes(mins) {
  const m = Math.max(0, Math.round(Number(mins) || 0));
  const hrs = Math.floor(m / 60);
  const rem = m % 60;
  return `${hrs}h ${String(rem).padStart(2, '0')}m`;
}

function buildDemoStarterStaffLogs(tenantId = 1) {
  const dateStr = todayDateStr();
  const baseMorning = new Date(`${dateStr}T07:38:00.000Z`).toISOString();
  const docIn = new Date(`${dateStr}T07:25:00.000Z`).toISOString();
  const nurseIn = new Date(`${dateStr}T07:30:00.000Z`).toISOString();
  const bursarIn = new Date(`${dateStr}T07:50:00.000Z`).toISOString();
  return [
    {
      id: `SATT-DEMO-DOC-${tenantId}`,
      tenantId: Number(tenantId) || 1,
      staffId: 'stf_clinic_doc_1',
      staffName: 'Dr. Comfort Owusu',
      staffEmail: 'doctor.clinic@gbs.edu',
      staffRole: 'CLINIC_DOCTOR',
      designation: 'Resident School Clinic Doctor',
      department: 'School Clinic (Medical)',
      isClinicStaff: true,
      shiftDate: dateStr,
      clockInAt: docIn,
      clockOutAt: null,
      durationMinutes: null,
      hoursWorkedLabel: 'Active On Duty',
      clockInNote: 'Morning clinic ward round & sickbay pharmacy check.',
      clockOutNote: '',
      status: 'CLOCKED_IN',
      lateFlag: false
    },
    {
      id: `SATT-DEMO-NRS-${tenantId}`,
      tenantId: Number(tenantId) || 1,
      staffId: 'stf_clinic_nurse_1',
      staffName: 'Nurse Akosua Boateng',
      staffEmail: 'nurse.clinic@gbs.edu',
      staffRole: 'CLINIC_NURSE',
      designation: 'Senior School Clinic Nurse',
      department: 'School Clinic (Medical)',
      isClinicStaff: true,
      shiftDate: dateStr,
      clockInAt: nurseIn,
      clockOutAt: null,
      durationMinutes: null,
      hoursWorkedLabel: 'Active On Duty',
      clockInNote: 'Morning triage desk & first-aid emergency standby.',
      clockOutNote: '',
      status: 'CLOCKED_IN',
      lateFlag: false
    },
    {
      id: `SATT-DEMO-TCH-${tenantId}`,
      tenantId: Number(tenantId) || 1,
      staffId: 'usr_teacher_master',
      staffName: 'Sarah Jenkins',
      staffEmail: 'teacher@gbs.com',
      staffRole: 'TEACHER',
      designation: 'Senior Educator & Form Master',
      department: 'Academic Faculty',
      isClinicStaff: false,
      shiftDate: dateStr,
      clockInAt: baseMorning,
      clockOutAt: null,
      durationMinutes: null,
      hoursWorkedLabel: 'Active On Duty',
      clockInNote: 'Morning assembly & laboratory instruction.',
      clockOutNote: '',
      status: 'CLOCKED_IN',
      lateFlag: false
    },
    {
      id: `SATT-DEMO-ACC-${tenantId}`,
      tenantId: Number(tenantId) || 1,
      staffId: 'usr_accountant_master',
      staffName: 'David Mensah',
      staffEmail: 'accountant@gbs.com',
      staffRole: 'ACCOUNTANT',
      designation: 'Institutional Bursar & Accountant',
      department: 'Finance & Bursary',
      isClinicStaff: false,
      shiftDate: dateStr,
      clockInAt: bursarIn,
      clockOutAt: null,
      durationMinutes: null,
      hoursWorkedLabel: 'Active On Duty',
      clockInNote: 'Bursary ledger reconciliation & fee clearance desk.',
      clockOutNote: '',
      status: 'CLOCKED_IN',
      lateFlag: false
    }
  ];
}

function ensureTenantStaffLogs(req) {
  const tid = String(parseInt(req.tenantId || req.user?.tenantId || 1, 10) || 1);
  const store = readPersistentStore();
  const existing = Array.isArray(store.staffAttendanceLogs?.[tid]) ? store.staffAttendanceLogs[tid] : null;
  if (existing && existing.length > 0) return existing;
  if (isDemoSandboxRequest(req)) {
    const starter = buildDemoStarterStaffLogs(tid);
    writePersistentStore((curr) => ({
      ...curr,
      staffAttendanceLogs: {
        ...(curr.staffAttendanceLogs || {}),
        [tid]: starter
      }
    }));
    return starter;
  }
  return [];
}

function resolveIdentity(req, payload = {}) {
  const callerRole = String(req.user?.role || 'STAFF').toUpperCase();
  const isSupervisor = ['ADMIN', 'SUPER_ADMIN', 'HEADMASTER', 'PRINCIPAL', 'HR', 'DEVELOPER'].includes(callerRole);

  // Clinic staff (Doctors / Nurses) or HR/Headmaster can specify explicit staffRole / designation
  const requestedRole = String(payload.staffRole || callerRole).trim().toUpperCase();
  const effectiveRole = STAFF_ROLES.has(requestedRole) ? requestedRole : callerRole;
  const staffName = (isSupervisor || payload.isClinicStaff) && payload.staffName
    ? String(payload.staffName).trim()
    : `${req.user?.firstName || ''} ${req.user?.lastName || ''}`.trim() || req.user?.name || req.user?.email || 'Institutional Staff';
  const staffEmail = (isSupervisor || payload.isClinicStaff) && payload.staffEmail
    ? String(payload.staffEmail).trim().toLowerCase()
    : String(req.user?.email || '').trim().toLowerCase();
  const staffId = String(
    ((isSupervisor || payload.isClinicStaff) && payload.staffId)
      ? payload.staffId
      : (req.user?.id || staffEmail || staffName)
  ).trim();

  const isClinicStaff =
    Boolean(payload.isClinicStaff) ||
    ['CLINIC_DOCTOR', 'CLINIC_NURSE', 'MEDICAL_DOCTOR', 'NURSE'].includes(effectiveRole) ||
    String(payload.department || '').toLowerCase().includes('clinic') ||
    String(payload.designation || '').toLowerCase().includes('doctor') ||
    String(payload.designation || '').toLowerCase().includes('nurse');

  const department = String(
    payload.department ||
    (isClinicStaff ? 'School Clinic (Medical)' : ROLE_TO_DEPARTMENT[effectiveRole] || 'Campus Operations')
  ).trim();

  const designation = String(
    payload.designation ||
    (effectiveRole === 'CLINIC_DOCTOR'
      ? 'School Clinic Doctor'
      : effectiveRole === 'CLINIC_NURSE'
        ? 'School Clinic Nurse'
        : effectiveRole)
  ).trim();

  return { staffId, staffName, staffEmail, staffRole: effectiveRole, department, designation, isClinicStaff };
}

async function clockInStaff(req) {
  const tid = String(parseInt(req.tenantId || req.user?.tenantId || 1, 10) || 1);
  const payload = req.body || {};
  const id = resolveIdentity(req, payload);
  const shiftDate = String(payload.shiftDate || todayDateStr()).slice(0, 10);
  const existingLogs = ensureTenantStaffLogs(req);

  const openShift = existingLogs.find(
    (log) =>
      log.status === 'CLOCKED_IN' &&
      log.shiftDate === shiftDate &&
      (String(log.staffId) === id.staffId ||
        (id.staffEmail && String(log.staffEmail || '').toLowerCase() === id.staffEmail) ||
        (id.staffName && String(log.staffName || '').toLowerCase() === id.staffName.toLowerCase()))
  );

  if (openShift) {
    throw new AppError(
      `${id.staffName} is already clocked in since ${new Date(openShift.clockInAt).toLocaleTimeString()}. Please clock out at close of shift first.`,
      409
    );
  }

  const now = new Date();
  const lateFlag = now.getHours() > 8 || (now.getHours() === 8 && now.getMinutes() > 15);
  const entry = {
    id: `SATT-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
    tenantId: parseInt(tid, 10) || 1,
    staffId: id.staffId,
    staffName: id.staffName,
    staffEmail: id.staffEmail,
    staffRole: id.staffRole,
    designation: id.designation,
    department: id.department,
    isClinicStaff: id.isClinicStaff,
    shiftDate,
    clockInAt: now.toISOString(),
    clockOutAt: null,
    durationMinutes: null,
    hoursWorkedLabel: 'Active On Duty',
    clockInNote: String(payload.notes || payload.clockInNote || 'Reported for duty and clocked in cleanly.').trim(),
    clockOutNote: '',
    status: 'CLOCKED_IN',
    lateFlag
  };

  writePersistentStore((curr) => {
    const prevMap = curr.staffAttendanceLogs || {};
    const list = Array.isArray(prevMap[tid]) ? prevMap[tid] : existingLogs;
    return {
      ...curr,
      staffAttendanceLogs: {
        ...prevMap,
        [tid]: [entry, ...list].slice(0, 1000)
      }
    };
  });

  return entry;
}

async function clockOutStaff(req) {
  const tid = String(parseInt(req.tenantId || req.user?.tenantId || 1, 10) || 1);
  const payload = req.body || {};
  const id = resolveIdentity(req, payload);
  const existingLogs = ensureTenantStaffLogs(req);

  const matchIdx = existingLogs.findIndex(
    (log) =>
      log.status === 'CLOCKED_IN' &&
      ((payload.shiftId && String(log.id) === String(payload.shiftId)) ||
        String(log.staffId) === id.staffId ||
        (id.staffEmail && String(log.staffEmail || '').toLowerCase() === id.staffEmail) ||
        (id.staffName && String(log.staffName || '').toLowerCase() === id.staffName.toLowerCase()))
  );

  if (matchIdx === -1) {
    throw new AppError(`No active clocked-in shift found for ${id.staffName}. Please clock in first.`, 400);
  }

  const target = existingLogs[matchIdx];
  const outDate = new Date();
  const inDate = new Date(target.clockInAt);
  const mins = Math.max(1, Math.round((outDate.getTime() - inDate.getTime()) / 60000));
  const updated = {
    ...target,
    clockOutAt: outDate.toISOString(),
    durationMinutes: mins,
    hoursWorkedLabel: formatDurationMinutes(mins),
    clockOutNote: String(payload.notes || payload.clockOutNote || 'Shift completed cleanly at close of duty.').trim(),
    status: 'CLOCKED_OUT'
  };

  writePersistentStore((curr) => {
    const prevMap = curr.staffAttendanceLogs || {};
    const list = Array.isArray(prevMap[tid]) ? [...prevMap[tid]] : [...existingLogs];
    const idx = list.findIndex((item) => String(item.id) === String(updated.id));
    if (idx !== -1) list[idx] = updated;
    return {
      ...curr,
      staffAttendanceLogs: {
        ...prevMap,
        [tid]: list
      }
    };
  });

  return updated;
}

async function getMyStaffAttendanceStatus(req) {
  const id = resolveIdentity(req, req.query || {});
  const logs = ensureTenantStaffLogs(req);
  const mine = logs.filter(
    (log) =>
      String(log.staffId) === id.staffId ||
      (id.staffEmail && String(log.staffEmail || '').toLowerCase() === id.staffEmail)
  );
  const activeShift = mine.find((log) => log.status === 'CLOCKED_IN') || null;
  const today = todayDateStr();
  const latestToday = mine.find((log) => log.shiftDate === today) || null;
  return {
    staffId: id.staffId,
    staffName: id.staffName,
    staffRole: id.staffRole,
    department: id.department,
    currentStatus: activeShift ? 'CLOCKED_IN' : latestToday?.status || 'NOT_CLOCKED_IN',
    activeShift,
    recentLogs: mine.slice(0, 20)
  };
}

async function getAllStaffAttendance(req) {
  const logs = ensureTenantStaffLogs(req);
  const filterCategory = String(req.query?.category || 'ALL').trim().toUpperCase();
  const filterStatus = String(req.query?.status || 'ALL').trim().toUpperCase();
  const filterDept = String(req.query?.department || 'ALL').trim().toUpperCase();
  const filterRole = String(req.query?.role || 'ALL').trim().toUpperCase();
  const filterDate = String(req.query?.date || '').trim();
  const search = String(req.query?.search || '').trim().toLowerCase();

  const filtered = logs.filter((log) => {
    const roleUpper = String(log.staffRole || '').toUpperCase();
    const isClinic = Boolean(log.isClinicStaff || ['CLINIC_DOCTOR', 'CLINIC_NURSE', 'MEDICAL_DOCTOR', 'NURSE'].includes(roleUpper) || String(log.department || '').toLowerCase().includes('clinic'));
    if (filterCategory === 'CLINIC' && !isClinic) return false;
    if (filterCategory === 'FACULTY' && roleUpper !== 'TEACHER') return false;
    if (filterCategory === 'ADMIN_OPS' && (isClinic || roleUpper === 'TEACHER')) return false;

    if (filterStatus !== 'ALL' && String(log.status || '').toUpperCase() !== filterStatus) return false;

    if (filterDept === 'CLINIC' && !isClinic) {
      return false;
    }
    if (filterDept !== 'ALL' && filterDept !== 'CLINIC' && !String(log.department || '').toUpperCase().includes(filterDept)) {
      return false;
    }
    if (filterRole !== 'ALL') {
      if (filterRole === 'CLINIC_MEDICAL') {
        if (!isClinic) return false;
      } else if (roleUpper !== filterRole) {
        return false;
      }
    }
    if (filterDate && String(log.shiftDate || '') !== filterDate) return false;
    if (search) {
      const hay = `${log.staffName || ''} ${log.staffEmail || ''} ${log.staffRole || ''} ${log.designation || ''} ${log.department || ''}`.toLowerCase();
      if (!hay.includes(search)) return false;
    }
    return true;
  });

  const today = todayDateStr();
  const todayLogs = logs.filter((l) => l.shiftDate === today);
  const clockedInNow = logs.filter((l) => l.status === 'CLOCKED_IN').length;
  const clockedOutCount = logs.filter((l) => l.status === 'CLOCKED_OUT').length;
  const clockedOutToday = todayLogs.filter((l) => l.status === 'CLOCKED_OUT').length;
  const clinicMedicalCount = logs.filter((l) => l.isClinicStaff).length;
  const clinicOnDutyNow = logs.filter((l) => l.isClinicStaff && l.status === 'CLOCKED_IN').length;

  return {
    records: filtered,
    logs: filtered,
    summary: {
      totalRecords: logs.length,
      totalLogs: logs.length,
      clockedInNow,
      onDutyCount: clockedInNow,
      clockedOutToday,
      clockedOutCount,
      clinicMedicalCount,
      clinicStaffCount: clinicMedicalCount,
      clinicOnDutyNow,
      todayCount: todayLogs.length
    }
  };
}

module.exports = {
  clockInStaff,
  clockOutStaff,
  getMyStaffAttendanceStatus,
  getAllStaffAttendance
};
