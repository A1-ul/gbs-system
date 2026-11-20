'use strict';

const prisma = require('../../core/database/prisma.client');
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

const DEFAULT_SETTINGS = Object.freeze({
  closingTime: '16:00',
  lateCutoffTime: '08:15',
  autoClockOutDelayMinutes: 120,
  activeTerm: 'Term 1 (2026/2027)',
  academicYear: '2026-2027',
  enforceClockOutReasonBeforeClose: true
});

function pad2(n) {
  return String(n).padStart(2, '0');
}

function formatLocalDateStr(date = new Date()) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

function todayDateStr() {
  return formatLocalDateStr(new Date());
}

function parseHHMM(hhmm = '16:00', fallback = '16:00') {
  const m = String(hhmm || '').trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return fallback;
  const h = Math.min(23, Math.max(0, parseInt(m[1], 10)));
  const min = Math.min(59, Math.max(0, parseInt(m[2], 10)));
  return `${pad2(h)}:${pad2(min)}`;
}

function computeClosingAndAutoCloseDates(shiftDate, closingTime = '16:00', autoDelayMinutes = 120) {
  const datePart = String(shiftDate || todayDateStr()).slice(0, 10);
  const cleanHHMM = parseHHMM(closingTime, '16:00');
  const [y, mo, d] = datePart.split('-').map((v) => parseInt(v, 10));
  const [hh, mm] = cleanHHMM.split(':').map((v) => parseInt(v, 10));
  const closeDate = new Date(y, mo - 1, d, hh, mm, 0, 0);
  const autoCloseDate = new Date(closeDate.getTime() + Math.max(15, Number(autoDelayMinutes) || 120) * 60000);
  return { closeDate, autoCloseDate };
}

function formatDurationMinutes(mins) {
  const m = Math.max(0, Math.round(Number(mins) || 0));
  const hrs = Math.floor(m / 60);
  const rem = m % 60;
  return `${hrs}h ${String(rem).padStart(2, '0')}m`;
}

function getTenantSettings(tid = '1') {
  const cleanTid = String(parseInt(tid, 10) || 1);
  const store = readPersistentStore();
  const saved = store.staffAttendanceSettings?.[cleanTid] || {};
  return {
    tenantId: parseInt(cleanTid, 10) || 1,
    closingTime: parseHHMM(saved.closingTime || DEFAULT_SETTINGS.closingTime, DEFAULT_SETTINGS.closingTime),
    lateCutoffTime: parseHHMM(saved.lateCutoffTime || DEFAULT_SETTINGS.lateCutoffTime, DEFAULT_SETTINGS.lateCutoffTime),
    autoClockOutDelayMinutes: Math.max(30, parseInt(saved.autoClockOutDelayMinutes || DEFAULT_SETTINGS.autoClockOutDelayMinutes, 10) || 120),
    activeTerm: String(saved.activeTerm || DEFAULT_SETTINGS.activeTerm).trim(),
    academicYear: String(saved.academicYear || DEFAULT_SETTINGS.academicYear).trim(),
    enforceClockOutReasonBeforeClose:
      saved.enforceClockOutReasonBeforeClose !== undefined
        ? Boolean(saved.enforceClockOutReasonBeforeClose)
        : DEFAULT_SETTINGS.enforceClockOutReasonBeforeClose,
    updatedAt: saved.updatedAt || null
  };
}

function getTenantInstitutionName(req, tid = '1') {
  const cleanTid = String(parseInt(tid, 10) || 1);
  const store = readPersistentStore();
  const reg = (store.institutionRegistrations || []).find(
    (r) => String(r.tenantId || r.id) === cleanTid
  );
  const tenantRec = (store.tenants || []).find((t) => String(t.id) === cleanTid);
  return (
    req?.tenant?.name ||
    req?.user?.institutionName ||
    reg?.institutionName ||
    tenantRec?.name ||
    'GBS Registered Institution'
  );
}

async function syncAttendanceRecordToPrisma(entry) {
  try {
    if (typeof prisma.isPostgresOnline === 'function') {
      const online = await prisma.isPostgresOnline();
      if (!online || !prisma.staffAttendanceRecord) return;
    } else if (!prisma.staffAttendanceRecord) {
      return;
    }
    await prisma.staffAttendanceRecord.upsert({
      where: { id: String(entry.id) },
      update: {
        status: entry.status,
        clockOutAt: entry.clockOutAt ? new Date(entry.clockOutAt) : null,
        durationMinutes: entry.durationMinutes,
        hoursWorkedLabel: entry.hoursWorkedLabel || null,
        clockOutNote: entry.clockOutNote || null,
        clockOutReason: entry.clockOutReason || null,
        autoClockOut: Boolean(entry.autoClockOut),
        bypassedClockIn: Boolean(entry.bypassedClockIn),
        markedPresent: Boolean(entry.markedPresent !== false && !entry.bypassedClockIn)
      },
      create: {
        id: String(entry.id),
        tenantId: parseInt(entry.tenantId, 10) || 1,
        staffId: String(entry.staffId),
        staffName: String(entry.staffName),
        staffEmail: entry.staffEmail || null,
        staffRole: String(entry.staffRole),
        designation: entry.designation || null,
        department: entry.department || null,
        isClinicStaff: Boolean(entry.isClinicStaff),
        termLabel: entry.termLabel || DEFAULT_SETTINGS.activeTerm,
        academicYear: entry.academicYear || DEFAULT_SETTINGS.academicYear,
        shiftDate: String(entry.shiftDate),
        clockInAt: entry.clockInAt ? new Date(entry.clockInAt) : null,
        clockOutAt: entry.clockOutAt ? new Date(entry.clockOutAt) : null,
        scheduledCloseAt: entry.scheduledCloseAt ? new Date(entry.scheduledCloseAt) : null,
        durationMinutes: entry.durationMinutes ?? null,
        hoursWorkedLabel: entry.hoursWorkedLabel || null,
        clockInNote: entry.clockInNote || null,
        clockOutNote: entry.clockOutNote || null,
        clockOutReason: entry.clockOutReason || null,
        bypassedClockIn: Boolean(entry.bypassedClockIn),
        markedPresent: Boolean(entry.markedPresent !== false && !entry.bypassedClockIn),
        autoClockOut: Boolean(entry.autoClockOut),
        lateFlag: Boolean(entry.lateFlag),
        status: String(entry.status || 'CLOCKED_IN')
      }
    }).catch(() => { });
  } catch { }
}

/**
 * Automatically clocks out any open CLOCKED_IN shift once (closingTime + 2 hours) has elapsed,
 * or if the shift belongs to an earlier date whose auto-close threshold has passed.
 */
async function runAutoClockOutSweep(tenantIdFilter = null) {
  const store = readPersistentStore();
  const map = store.staffAttendanceLogs || {};
  const tenantIds = tenantIdFilter ? [String(parseInt(tenantIdFilter, 10) || 1)] : Object.keys(map);
  const nowMs = Date.now();
  const updatedRecords = [];

  for (const tid of tenantIds) {
    const list = Array.isArray(map[tid]) ? [...map[tid]] : [];
    if (list.length === 0) continue;
    const settings = getTenantSettings(tid);
    let tenantChanged = false;

    const nextList = list.map((log) => {
      if (log.status !== 'CLOCKED_IN' || !log.clockInAt) return log;
      const { autoCloseDate } = computeClosingAndAutoCloseDates(
        log.shiftDate,
        settings.closingTime,
        settings.autoClockOutDelayMinutes
      );
      const thresholdMs = log.autoCloseAt ? new Date(log.autoCloseAt).getTime() : autoCloseDate.getTime();
      if (Number.isFinite(thresholdMs) && nowMs >= thresholdMs) {
        tenantChanged = true;
        const inMs = new Date(log.clockInAt).getTime();
        const effectiveOutMs = Math.max(inMs + 60000, thresholdMs);
        const mins = Math.max(1, Math.round((effectiveOutMs - inMs) / 60000));
        const closed = {
          ...log,
          clockOutAt: new Date(effectiveOutMs).toISOString(),
          durationMinutes: mins,
          hoursWorkedLabel: formatDurationMinutes(mins),
          clockOutReason: 'Auto-clocked out by system 2 hours after institution closing time.',
          clockOutNote: `Auto clock-out (${settings.closingTime} + ${Math.round((settings.autoClockOutDelayMinutes || 120) / 60)}h post-close safety sweep). Staff forgot to clock out manually.`,
          autoClockOut: true,
          status: 'AUTO_CLOCKED_OUT'
        };
        updatedRecords.push(closed);
        return closed;
      }
      return log;
    });

    if (tenantChanged) {
      writePersistentStore((curr) => ({
        ...curr,
        staffAttendanceLogs: {
          ...(curr.staffAttendanceLogs || {}),
          [tid]: nextList
        }
      }));
    }
  }

  for (const rec of updatedRecords) {
    await syncAttendanceRecordToPrisma(rec);
  }
  return { autoClosedCount: updatedRecords.length, records: updatedRecords };
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

async function updateAttendanceSettings(req) {
  const tid = String(parseInt(req.tenantId || req.user?.tenantId || 1, 10) || 1);
  const payload = req.body || {};
  const current = getTenantSettings(tid);
  const nextSettings = {
    tenantId: parseInt(tid, 10) || 1,
    closingTime: parseHHMM(payload.closingTime || current.closingTime, current.closingTime),
    lateCutoffTime: parseHHMM(payload.lateCutoffTime || current.lateCutoffTime, current.lateCutoffTime),
    autoClockOutDelayMinutes:
      payload.autoClockOutDelayMinutes !== undefined
        ? Math.max(30, parseInt(payload.autoClockOutDelayMinutes, 10) || 120)
        : current.autoClockOutDelayMinutes,
    activeTerm: String(payload.activeTerm || current.activeTerm).trim(),
    academicYear: String(payload.academicYear || current.academicYear).trim(),
    enforceClockOutReasonBeforeClose:
      payload.enforceClockOutReasonBeforeClose !== undefined
        ? Boolean(payload.enforceClockOutReasonBeforeClose)
        : current.enforceClockOutReasonBeforeClose,
    updatedBy: `${req.user?.firstName || ''} ${req.user?.lastName || ''}`.trim() || req.user?.email || 'Headmaster',
    updatedAt: new Date().toISOString()
  };

  writePersistentStore((curr) => ({
    ...curr,
    staffAttendanceSettings: {
      ...(curr.staffAttendanceSettings || {}),
      [tid]: nextSettings
    }
  }));

  try {
    const online = typeof prisma.isPostgresOnline === 'function' ? await prisma.isPostgresOnline() : false;
    if (online && prisma.tenantAttendancePolicy) {
      await prisma.tenantAttendancePolicy.upsert({
        where: { tenantId: parseInt(tid, 10) || 1 },
        update: {
          closingTime: nextSettings.closingTime,
          lateCutoffTime: nextSettings.lateCutoffTime,
          autoClockOutDelayMinutes: nextSettings.autoClockOutDelayMinutes,
          activeTerm: nextSettings.activeTerm,
          academicYear: nextSettings.academicYear,
          enforceClockOutReasonBeforeClose: nextSettings.enforceClockOutReasonBeforeClose
        },
        create: {
          tenantId: parseInt(tid, 10) || 1,
          closingTime: nextSettings.closingTime,
          lateCutoffTime: nextSettings.lateCutoffTime,
          autoClockOutDelayMinutes: nextSettings.autoClockOutDelayMinutes,
          activeTerm: nextSettings.activeTerm,
          academicYear: nextSettings.academicYear,
          enforceClockOutReasonBeforeClose: nextSettings.enforceClockOutReasonBeforeClose
        }
      }).catch(() => { });
    }
  } catch { }

  await runAutoClockOutSweep(tid);
  return nextSettings;
}

async function bypassClockInStaff(req) {
  const tid = String(parseInt(req.tenantId || req.user?.tenantId || 1, 10) || 1);
  const payload = req.body || {};
  const id = resolveIdentity(req, payload);
  const shiftDate = String(payload.shiftDate || todayDateStr()).slice(0, 10);
  const settings = getTenantSettings(tid);
  const existingLogs = ensureTenantStaffLogs(req);

  const alreadyLoggedToday = existingLogs.find(
    (log) =>
      log.shiftDate === shiftDate &&
      (log.status === 'CLOCKED_IN' || log.status === 'CLOCKED_OUT' || log.status === 'AUTO_CLOCKED_OUT' || log.status === 'BYPASSED_UNMARKED') &&
      (String(log.staffId) === id.staffId ||
        (id.staffEmail && String(log.staffEmail || '').toLowerCase() === id.staffEmail) ||
        (id.staffName && String(log.staffName || '').toLowerCase() === id.staffName.toLowerCase()))
  );

  if (alreadyLoggedToday) {
    return alreadyLoggedToday;
  }

  const now = new Date();
  const entry = {
    id: `SATT-BYP-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
    tenantId: parseInt(tid, 10) || 1,
    staffId: id.staffId,
    staffName: id.staffName,
    staffEmail: id.staffEmail,
    staffRole: id.staffRole,
    designation: id.designation,
    department: id.department,
    isClinicStaff: id.isClinicStaff,
    termLabel: settings.activeTerm,
    academicYear: settings.academicYear,
    shiftDate,
    clockInAt: null,
    clockOutAt: null,
    bypassedAt: now.toISOString(),
    durationMinutes: 0,
    hoursWorkedLabel: 'Bypassed (Not Marked Present)',
    clockInNote: 'Staff chose Bypass Clock-In on welcome screen — NOT marked present at work or on duty.',
    clockOutNote: '',
    clockOutReason: '',
    bypassedClockIn: true,
    markedPresent: false,
    autoClockOut: false,
    status: 'BYPASSED_UNMARKED',
    lateFlag: false
  };

  writePersistentStore((curr) => {
    const prevMap = curr.staffAttendanceLogs || {};
    const list = Array.isArray(prevMap[tid]) ? prevMap[tid] : existingLogs;
    return {
      ...curr,
      staffAttendanceLogs: {
        ...prevMap,
        [tid]: [entry, ...list].slice(0, 2000)
      }
    };
  });

  await syncAttendanceRecordToPrisma(entry);
  return entry;
}

async function clockInStaff(req) {
  const tid = String(parseInt(req.tenantId || req.user?.tenantId || 1, 10) || 1);
  await runAutoClockOutSweep(tid);
  const payload = req.body || {};
  const id = resolveIdentity(req, payload);
  const shiftDate = String(payload.shiftDate || todayDateStr()).slice(0, 10);
  const settings = getTenantSettings(tid);
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

  const now = payload.clockInAt ? new Date(payload.clockInAt) : new Date();
  const [lateH, lateM] = parseHHMM(settings.lateCutoffTime, '08:15').split(':').map((v) => parseInt(v, 10));
  const lateFlag = now.getHours() > lateH || (now.getHours() === lateH && now.getMinutes() > lateM);
  let { closeDate, autoCloseDate } = computeClosingAndAutoCloseDates(
    shiftDate,
    settings.closingTime,
    settings.autoClockOutDelayMinutes
  );
  // If staff clocks in AFTER today's auto-close cutoff already passed (e.g. evening/night/late shift),
  // schedule closing and +2h auto-clock-out for the next shift cycle (+24h) instead of retroactively in the past.
  if (!payload.clockInAt && now.getTime() >= autoCloseDate.getTime()) {
    closeDate = new Date(closeDate.getTime() + 24 * 60 * 60 * 1000);
    autoCloseDate = new Date(autoCloseDate.getTime() + 24 * 60 * 60 * 1000);
  }

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
    termLabel: settings.activeTerm,
    academicYear: settings.academicYear,
    shiftDate,
    clockInAt: now.toISOString(),
    clockOutAt: null,
    scheduledCloseAt: closeDate.toISOString(),
    autoCloseAt: autoCloseDate.toISOString(),
    durationMinutes: null,
    hoursWorkedLabel: 'Active On Duty',
    clockInNote: String(payload.notes || payload.clockInNote || 'Reported to school and clocked in to begin duties.').trim(),
    clockOutNote: '',
    clockOutReason: '',
    bypassedClockIn: false,
    markedPresent: true,
    autoClockOut: false,
    status: 'CLOCKED_IN',
    lateFlag
  };

  writePersistentStore((curr) => {
    const prevMap = curr.staffAttendanceLogs || {};
    const rawList = Array.isArray(prevMap[tid]) ? prevMap[tid] : existingLogs;
    // If staff previously clicked Bypass today and now decides to Clock In properly, supersede today's bypass record cleanly
    const filteredList = rawList.filter(
      (item) =>
        !(
          item.status === 'BYPASSED_UNMARKED' &&
          item.shiftDate === shiftDate &&
          (String(item.staffId) === id.staffId ||
            (id.staffEmail && String(item.staffEmail || '').toLowerCase() === id.staffEmail))
        )
    );
    return {
      ...curr,
      staffAttendanceLogs: {
        ...prevMap,
        [tid]: [entry, ...filteredList].slice(0, 2000)
      }
    };
  });

  await syncAttendanceRecordToPrisma(entry);
  return entry;
}

async function clockOutStaff(req) {
  const tid = String(parseInt(req.tenantId || req.user?.tenantId || 1, 10) || 1);
  await runAutoClockOutSweep(tid);
  const payload = req.body || {};
  const id = resolveIdentity(req, payload);
  const settings = getTenantSettings(tid);
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
  const { closeDate: defaultCloseDate } = computeClosingAndAutoCloseDates(
    target.shiftDate,
    settings.closingTime,
    settings.autoClockOutDelayMinutes
  );
  const closeDate = target.scheduledCloseAt ? new Date(target.scheduledCloseAt) : defaultCloseDate;
  const isBeforeClosingTime = outDate.getTime() < closeDate.getTime();
  const explicitReason = String(payload.reason || payload.clockOutReason || '').trim();
  const explicitNotes = String(payload.notes || payload.clockOutNote || '').trim();
  const genericNotes = new Set([
    'closing duty clocked out cleanly.',
    'clinic shift closed and clocked out cleanly.',
    'shift completed cleanly at close of duty.'
  ]);
  const meaningfulReason =
    explicitReason || (explicitNotes && !genericNotes.has(explicitNotes.toLowerCase()) ? explicitNotes : '');

  if (isBeforeClosingTime && settings.enforceClockOutReasonBeforeClose && meaningfulReason.length < 4) {
    throw new AppError(
      `School/work closing time is ${settings.closingTime}. Clocking out early requires an explicit Clock-Out Reason (minimum 4 characters).`,
      400
    );
  }

  const mins = Math.max(1, Math.round((outDate.getTime() - inDate.getTime()) / 60000));
  const finalReason =
    meaningfulReason || (isBeforeClosingTime ? 'Early departure approved with reason.' : 'End of school/work closing time.');

  const updated = {
    ...target,
    clockOutAt: outDate.toISOString(),
    durationMinutes: mins,
    hoursWorkedLabel: formatDurationMinutes(mins),
    clockOutReason: finalReason,
    clockOutNote: explicitNotes || finalReason,
    earlyDeparture: isBeforeClosingTime,
    autoClockOut: false,
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

  await syncAttendanceRecordToPrisma(updated);
  return updated;
}

async function getMyStaffAttendanceStatus(req) {
  const tid = String(parseInt(req.tenantId || req.user?.tenantId || 1, 10) || 1);
  await runAutoClockOutSweep(tid);
  const id = resolveIdentity(req, req.query || {});
  const settings = getTenantSettings(tid);
  const institutionName = getTenantInstitutionName(req, tid);
  const logs = ensureTenantStaffLogs(req);
  const mine = logs.filter(
    (log) =>
      String(log.staffId) === id.staffId ||
      (id.staffEmail && String(log.staffEmail || '').toLowerCase() === id.staffEmail)
  );
  const activeShift = mine.find((log) => log.status === 'CLOCKED_IN') || null;
  const today = todayDateStr();
  const latestToday = mine.find((log) => log.shiftDate === today) || null;
  const bypassedToday = latestToday?.status === 'BYPASSED_UNMARKED';
  const currentStatus = activeShift ? 'CLOCKED_IN' : latestToday?.status || 'NOT_CLOCKED_IN';
  const needsWelcomePrompt =
    !activeShift &&
    !bypassedToday &&
    latestToday?.status !== 'CLOCKED_OUT' &&
    latestToday?.status !== 'AUTO_CLOCKED_OUT';

  const { closeDate: defaultCloseDate } = computeClosingAndAutoCloseDates(today, settings.closingTime, settings.autoClockOutDelayMinutes);
  const closeDate = activeShift?.scheduledCloseAt ? new Date(activeShift.scheduledCloseAt) : defaultCloseDate;
  const isBeforeClosingTime = Date.now() < closeDate.getTime();

  return {
    staffId: id.staffId,
    staffName: id.staffName,
    staffRole: id.staffRole,
    department: id.department,
    institutionName,
    settings,
    isBeforeClosingTime,
    needsWelcomePrompt,
    bypassedToday,
    markedPresentToday: Boolean(
      activeShift || (latestToday && latestToday.status !== 'BYPASSED_UNMARKED' && latestToday.markedPresent !== false)
    ),
    currentStatus,
    activeShift,
    latestToday,
    recentLogs: mine.slice(0, 30)
  };
}

async function getAllStaffAttendance(req) {
  const tid = String(parseInt(req.tenantId || req.user?.tenantId || 1, 10) || 1);
  await runAutoClockOutSweep(tid);
  const settings = getTenantSettings(tid);
  const institutionName = getTenantInstitutionName(req, tid);
  const logs = ensureTenantStaffLogs(req);
  const filterCategory = String(req.query?.category || 'ALL').trim().toUpperCase();
  const filterStatus = String(req.query?.status || 'ALL').trim().toUpperCase();
  const filterDept = String(req.query?.department || 'ALL').trim().toUpperCase();
  const filterRole = String(req.query?.role || 'ALL').trim().toUpperCase();
  const filterTerm = String(req.query?.term || 'ALL').trim();
  const filterDate = String(req.query?.date || '').trim();
  const filterDateFrom = String(req.query?.dateFrom || '').trim();
  const filterDateTo = String(req.query?.dateTo || '').trim();
  const search = String(req.query?.search || '').trim().toLowerCase();

  const filtered = logs.filter((log) => {
    const roleUpper = String(log.staffRole || '').toUpperCase();
    const isClinic = Boolean(
      log.isClinicStaff ||
      ['CLINIC_DOCTOR', 'CLINIC_NURSE', 'MEDICAL_DOCTOR', 'NURSE'].includes(roleUpper) ||
      String(log.department || '').toLowerCase().includes('clinic')
    );
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
    if (filterTerm && filterTerm !== 'ALL' && String(log.termLabel || settings.activeTerm) !== filterTerm) {
      return false;
    }
    if (filterDate && String(log.shiftDate || '') !== filterDate) return false;
    if (filterDateFrom && String(log.shiftDate || '') < filterDateFrom) return false;
    if (filterDateTo && String(log.shiftDate || '') > filterDateTo) return false;
    if (search) {
      const hay = `${log.staffName || ''} ${log.staffEmail || ''} ${log.staffRole || ''} ${log.designation || ''} ${log.department || ''} ${log.clockOutReason || ''} ${log.termLabel || ''}`.toLowerCase();
      if (!hay.includes(search)) return false;
    }
    return true;
  });

  const today = todayDateStr();
  const todayLogs = logs.filter((l) => l.shiftDate === today);
  const clockedInNow = logs.filter((l) => l.status === 'CLOCKED_IN').length;
  const clockedOutCount = logs.filter((l) => l.status === 'CLOCKED_OUT').length;
  const autoClockedOutCount = logs.filter((l) => l.status === 'AUTO_CLOCKED_OUT').length;
  const bypassedCount = logs.filter((l) => l.status === 'BYPASSED_UNMARKED').length;
  const clockedOutToday = todayLogs.filter((l) => l.status === 'CLOCKED_OUT' || l.status === 'AUTO_CLOCKED_OUT').length;
  const clinicMedicalCount = logs.filter((l) => l.isClinicStaff).length;
  const clinicOnDutyNow = logs.filter((l) => l.isClinicStaff && l.status === 'CLOCKED_IN').length;
  const availableTerms = Array.from(
    new Set([settings.activeTerm, ...logs.map((l) => l.termLabel).filter(Boolean)])
  );

  return {
    institutionName,
    settings,
    availableTerms,
    records: filtered,
    logs: filtered,
    summary: {
      totalRecords: logs.length,
      totalLogs: logs.length,
      clockedInNow,
      onDutyCount: clockedInNow,
      clockedOutToday,
      clockedOutCount,
      autoClockedOutCount,
      bypassedCount,
      presentTodayCount: todayLogs.filter((l) => l.status !== 'BYPASSED_UNMARKED' && l.markedPresent !== false).length,
      clinicMedicalCount,
      clinicStaffCount: clinicMedicalCount,
      clinicOnDutyNow,
      todayCount: todayLogs.length
    }
  };
}

let schedulerTimer = null;
function startAutoStaffClockOutScheduler(intervalMs = 60000) {
  if (schedulerTimer) return schedulerTimer;
  schedulerTimer = setInterval(() => {
    runAutoClockOutSweep().catch(() => { });
  }, intervalMs);
  if (typeof schedulerTimer.unref === 'function') {
    schedulerTimer.unref();
  }
  return schedulerTimer;
}

module.exports = {
  clockInStaff,
  clockOutStaff,
  bypassClockInStaff,
  getMyStaffAttendanceStatus,
  getAllStaffAttendance,
  getTenantSettings,
  updateAttendanceSettings,
  runAutoClockOutSweep,
  startAutoStaffClockOutScheduler
};
