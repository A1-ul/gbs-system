'use strict';

const prisma = require('../../core/database/prisma.client');
const { readPersistentStore, writePersistentStore } = require('../../core/database/persistentStore');
const { AppError } = require('../../middleware/error.middleware');
const { isDemoSandboxRequest } = require('../../middleware/demoLimit.middleware');
const socketServer = require('../../core/socket/socketServer');

const STAFF_ROLES = new Set([
  'ADMIN',
  'SUPER_ADMIN',
  'HEADMASTER',
  'PRINCIPAL',
  'TEACHER',
  'SECRETARY',
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
  SECRETARY: 'Front Office & Secretariat',
  ACCOUNTANT: 'Finance & Bursary',
  HR: 'Human Resources',
  STAFF: 'Campus Operations',
  ADMIN: 'Headmaster Administration',
  SUPER_ADMIN: 'Headmaster Administration',
  HEADMASTER: 'Headmaster Administration'
};

const DEFAULT_SETTINGS = Object.freeze({
  reportingTime: '07:30',
  closingTime: '16:00',
  lateCutoffTime: '08:00',
  autoClockOutDelayMinutes: 120,
  activeTerm: 'Term 1 (2026/2027)',
  academicYear: '2026-2027',
  workplaceLocationName: 'Main School Campus',
  enforceClockOutReasonBeforeClose: true,
  requirePhotoProof: true
});

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function formatHumanDate(date = new Date()) {
  try {
    return date.toLocaleDateString('en-GB', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
  } catch {
    return `${DAY_NAMES[date.getDay()] || ''}, ${formatLocalDateStr(date)}`;
  }
}

function format12HourTime(hhmm = '07:30') {
  const clean = parseHHMM(hhmm, '07:30');
  const [h, m] = clean.split(':').map((v) => parseInt(v, 10));
  const suffix = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${pad2(h12)}:${pad2(m)} ${suffix}`;
}

function hhmmToMinutes(hhmm = '07:30') {
  const clean = parseHHMM(hhmm, '07:30');
  const [h, m] = clean.split(':').map((v) => parseInt(v, 10));
  return h * 60 + m;
}

let staffAttendanceSchemaEnsured = false;
async function ensureStaffAttendanceSchema() {
  if (staffAttendanceSchemaEnsured) return;
  try {
    const online = typeof prisma.isPostgresOnline === 'function' ? await prisma.isPostgresOnline() : false;
    if (!online) return;
    await prisma.$executeRawUnsafe(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tenant_attendance_policies') THEN
          ALTER TABLE tenant_attendance_policies ADD COLUMN IF NOT EXISTS reporting_time VARCHAR(16) DEFAULT '07:30';
          ALTER TABLE tenant_attendance_policies ADD COLUMN IF NOT EXISTS workplace_location_name VARCHAR(255);
          ALTER TABLE tenant_attendance_policies ADD COLUMN IF NOT EXISTS require_photo_proof BOOLEAN DEFAULT TRUE;
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'staff_attendance_records') THEN
          ALTER TABLE staff_attendance_records ADD COLUMN IF NOT EXISTS day_of_week VARCHAR(32);
          ALTER TABLE staff_attendance_records ADD COLUMN IF NOT EXISTS clock_in_time_label VARCHAR(64);
          ALTER TABLE staff_attendance_records ADD COLUMN IF NOT EXISTS workplace_location TEXT;
          ALTER TABLE staff_attendance_records ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION;
          ALTER TABLE staff_attendance_records ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;
          ALTER TABLE staff_attendance_records ADD COLUMN IF NOT EXISTS accuracy_meters DOUBLE PRECISION;
          ALTER TABLE staff_attendance_records ADD COLUMN IF NOT EXISTS location_source VARCHAR(48);
          ALTER TABLE staff_attendance_records ADD COLUMN IF NOT EXISTS clock_in_photo_url TEXT;
          ALTER TABLE staff_attendance_records ADD COLUMN IF NOT EXISTS reporting_time_snapshot VARCHAR(16);
          ALTER TABLE staff_attendance_records ADD COLUMN IF NOT EXISTS closing_time_snapshot VARCHAR(16);
          ALTER TABLE staff_attendance_records ADD COLUMN IF NOT EXISTS punctuality_status VARCHAR(32);
          ALTER TABLE staff_attendance_records ADD COLUMN IF NOT EXISTS minutes_late INTEGER DEFAULT 0;
          ALTER TABLE staff_attendance_records ADD COLUMN IF NOT EXISTS verification_status VARCHAR(32) DEFAULT 'PENDING_VERIFICATION';
          ALTER TABLE staff_attendance_records ADD COLUMN IF NOT EXISTS verified_by VARCHAR(160);
          ALTER TABLE staff_attendance_records ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;
          ALTER TABLE staff_attendance_records ADD COLUMN IF NOT EXISTS verification_note TEXT;
        END IF;
      END $$;
    `).catch(() => { });
    staffAttendanceSchemaEnsured = true;
  } catch { }
}

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
  const reportingTime = parseHHMM(saved.reportingTime || DEFAULT_SETTINGS.reportingTime, DEFAULT_SETTINGS.reportingTime);
  const closingTime = parseHHMM(saved.closingTime || DEFAULT_SETTINGS.closingTime, DEFAULT_SETTINGS.closingTime);
  const lateCutoffTime = parseHHMM(saved.lateCutoffTime || saved.reportingTime || DEFAULT_SETTINGS.lateCutoffTime, DEFAULT_SETTINGS.lateCutoffTime);
  return {
    tenantId: parseInt(cleanTid, 10) || 1,
    reportingTime,
    reportingTimeLabel: format12HourTime(reportingTime),
    closingTime,
    closingTimeLabel: format12HourTime(closingTime),
    lateCutoffTime,
    lateCutoffTimeLabel: format12HourTime(lateCutoffTime),
    autoClockOutDelayMinutes: Math.max(30, parseInt(saved.autoClockOutDelayMinutes || DEFAULT_SETTINGS.autoClockOutDelayMinutes, 10) || 120),
    activeTerm: String(saved.activeTerm || DEFAULT_SETTINGS.activeTerm).trim(),
    academicYear: String(saved.academicYear || DEFAULT_SETTINGS.academicYear).trim(),
    workplaceLocationName: String(saved.workplaceLocationName || DEFAULT_SETTINGS.workplaceLocationName).trim(),
    enforceClockOutReasonBeforeClose:
      saved.enforceClockOutReasonBeforeClose !== undefined
        ? Boolean(saved.enforceClockOutReasonBeforeClose)
        : DEFAULT_SETTINGS.enforceClockOutReasonBeforeClose,
    requirePhotoProof:
      saved.requirePhotoProof !== undefined
        ? Boolean(saved.requirePhotoProof)
        : DEFAULT_SETTINGS.requirePhotoProof,
    updatedBy: saved.updatedBy || null,
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
    await ensureStaffAttendanceSchema();
    await prisma.$executeRawUnsafe(
      `UPDATE staff_attendance_records
       SET day_of_week = $1,
           clock_in_time_label = $2,
           workplace_location = $3,
           latitude = $4,
           longitude = $5,
           accuracy_meters = $6,
           location_source = $7,
           clock_in_photo_url = $8,
           reporting_time_snapshot = $9,
           closing_time_snapshot = $10,
           punctuality_status = $11,
           minutes_late = $12,
           verification_status = $13,
           verified_by = $14,
           verified_at = $15,
           verification_note = $16
       WHERE id = $17`,
      entry.dayOfWeek || null,
      entry.clockInTimeLabel || null,
      entry.workplaceLocation || null,
      typeof entry.latitude === 'number' ? entry.latitude : null,
      typeof entry.longitude === 'number' ? entry.longitude : null,
      typeof entry.accuracyMeters === 'number' ? entry.accuracyMeters : null,
      entry.locationSource || null,
      entry.clockInPhotoDataUrl || null,
      entry.reportingTimeSnapshot || null,
      entry.closingTimeSnapshot || null,
      entry.punctualityStatus || null,
      Number(entry.minutesLate || 0),
      entry.verificationStatus || 'PENDING_VERIFICATION',
      entry.verifiedBy || null,
      entry.verifiedAt ? new Date(entry.verifiedAt) : null,
      entry.verificationNote || null,
      String(entry.id)
    ).catch(() => { });
  } catch { }
}

/**
 * Automatically clocks out any open CLOCKED_IN shift once (closingTime + 2 hours) has elapsed,
 * or if the shift belongs to an earlier date whose auto-close threshold has passed.
 */
let lastAutoSweepByTenant = new Map();
async function runAutoClockOutSweep(tenantIdFilter = null, force = false) {
  const cacheKey = tenantIdFilter ? String(parseInt(tenantIdFilter, 10) || 1) : 'ALL';
  const nowCheck = Date.now();
  if (!force && nowCheck - (lastAutoSweepByTenant.get(cacheKey) || 0) < 30000) {
    return { autoClosedCount: 0, records: [], skippedRecent: true };
  }
  lastAutoSweepByTenant.set(cacheKey, nowCheck);
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
  const nowObj = new Date();
  const dateStr = todayDateStr();
  const dayOfWeek = DAY_NAMES[nowObj.getDay()] || 'Weekday';
  const dateFmt = formatHumanDate(nowObj);
  const settings = getTenantSettings(String(tenantId));
  const baseMorning = new Date(`${dateStr}T07:38:00.000Z`).toISOString();
  const docIn = new Date(`${dateStr}T07:25:00.000Z`).toISOString();
  const nurseIn = new Date(`${dateStr}T07:30:00.000Z`).toISOString();
  const bursarIn = new Date(`${dateStr}T07:50:00.000Z`).toISOString();
  const baseFields = {
    dayOfWeek,
    clockInDateFormatted: dateFmt,
    reportingTimeSnapshot: settings.reportingTime,
    reportingTimeLabel: settings.reportingTimeLabel,
    closingTimeSnapshot: settings.closingTime,
    closingTimeLabel: settings.closingTimeLabel,
    punctualityStatus: 'ON_TIME',
    minutesLate: 0,
    latitude: null,
    longitude: null,
    accuracyMeters: null,
    locationSource: 'WORKPLACE_LOCATION_DECLARED',
    clockInPhotoDataUrl: null,
    verificationStatus: 'PENDING_VERIFICATION',
    verifiedBy: null,
    verifiedAt: null,
    verificationNote: ''
  };
  return [
    {
      ...baseFields,
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
      clockInTimeLabel: '07:25:00 AM',
      workplaceLocation: 'School Clinic Sickbay — Main Campus',
      clockOutAt: null,
      durationMinutes: null,
      hoursWorkedLabel: 'Active On Duty',
      clockInNote: 'Morning clinic ward round & sickbay pharmacy check.',
      clockOutNote: '',
      status: 'CLOCKED_IN',
      lateFlag: false
    },
    {
      ...baseFields,
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
      clockInTimeLabel: '07:30:00 AM',
      workplaceLocation: 'School Clinic Triage Desk — Main Campus',
      clockOutAt: null,
      durationMinutes: null,
      hoursWorkedLabel: 'Active On Duty',
      clockInNote: 'Morning triage desk & first-aid emergency standby.',
      clockOutNote: '',
      status: 'CLOCKED_IN',
      lateFlag: false
    },
    {
      ...baseFields,
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
      clockInTimeLabel: '07:38:00 AM',
      workplaceLocation: 'Academic Block A — Staff Room',
      clockOutAt: null,
      durationMinutes: null,
      hoursWorkedLabel: 'Active On Duty',
      clockInNote: 'Morning assembly & laboratory instruction.',
      clockOutNote: '',
      status: 'CLOCKED_IN',
      lateFlag: false
    },
    {
      ...baseFields,
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
      clockInTimeLabel: '07:50:00 AM',
      workplaceLocation: 'Administration Block — Bursary Office',
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
  const reportingTime = parseHHMM(payload.reportingTime || current.reportingTime, current.reportingTime);
  const closingTime = parseHHMM(payload.closingTime || current.closingTime, current.closingTime);
  let lateCutoffTime = parseHHMM(payload.lateCutoffTime || current.lateCutoffTime, current.lateCutoffTime);
  if (hhmmToMinutes(lateCutoffTime) < hhmmToMinutes(reportingTime)) {
    lateCutoffTime = reportingTime;
  }

  const nextSettings = {
    tenantId: parseInt(tid, 10) || 1,
    reportingTime,
    reportingTimeLabel: format12HourTime(reportingTime),
    closingTime,
    closingTimeLabel: format12HourTime(closingTime),
    lateCutoffTime,
    lateCutoffTimeLabel: format12HourTime(lateCutoffTime),
    autoClockOutDelayMinutes:
      payload.autoClockOutDelayMinutes !== undefined
        ? Math.max(30, parseInt(payload.autoClockOutDelayMinutes, 10) || 120)
        : current.autoClockOutDelayMinutes,
    activeTerm: String(payload.activeTerm || current.activeTerm).trim(),
    academicYear: String(payload.academicYear || current.academicYear).trim(),
    workplaceLocationName: String(
      payload.workplaceLocationName !== undefined ? payload.workplaceLocationName : current.workplaceLocationName
    ).trim() || DEFAULT_SETTINGS.workplaceLocationName,
    enforceClockOutReasonBeforeClose:
      payload.enforceClockOutReasonBeforeClose !== undefined
        ? Boolean(payload.enforceClockOutReasonBeforeClose)
        : current.enforceClockOutReasonBeforeClose,
    requirePhotoProof:
      payload.requirePhotoProof !== undefined
        ? Boolean(payload.requirePhotoProof)
        : current.requirePhotoProof,
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
      await ensureStaffAttendanceSchema();
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
      await prisma.$executeRawUnsafe(
        `UPDATE tenant_attendance_policies
         SET reporting_time = $1, workplace_location_name = $2, require_photo_proof = $3
         WHERE "tenantId" = $4`,
        nextSettings.reportingTime,
        nextSettings.workplaceLocationName,
        Boolean(nextSettings.requirePhotoProof),
        parseInt(tid, 10) || 1
      ).catch(() => { });
    }
  } catch { }

  try {
    socketServer.emitToTenant(parseInt(tid, 10) || 1, 'staff_attendance_policy_updated', {
      tenantId: parseInt(tid, 10) || 1,
      settings: nextSettings
    });
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
  const isExecutiveSelf = ['ADMIN', 'SUPER_ADMIN', 'HEADMASTER', 'PRINCIPAL', 'DEVELOPER'].includes(id.staffRole);

  // Extract & validate workplace location, GPS coordinates, and live camera photo proof
  const rawLat = payload.latitude !== undefined && payload.latitude !== null && payload.latitude !== '' ? Number(payload.latitude) : null;
  const rawLng = payload.longitude !== undefined && payload.longitude !== null && payload.longitude !== '' ? Number(payload.longitude) : null;
  const hasValidGps =
    rawLat !== null &&
    rawLng !== null &&
    Number.isFinite(rawLat) &&
    Number.isFinite(rawLng) &&
    Math.abs(rawLat) <= 90 &&
    Math.abs(rawLng) <= 180;
  const latitude = hasValidGps ? Number(rawLat.toFixed(6)) : null;
  const longitude = hasValidGps ? Number(rawLng.toFixed(6)) : null;
  const accuracyMeters =
    hasValidGps && Number.isFinite(Number(payload.accuracyMeters))
      ? Math.max(0, Math.round(Number(payload.accuracyMeters)))
      : null;

  const rawLocationText = String(payload.workplaceLocation || payload.locationName || payload.location || '').trim();
  const workplaceLocation =
    rawLocationText ||
    (hasValidGps ? `GPS Verified (${latitude}, ${longitude})` : '');

  if (!workplaceLocation && !hasValidGps) {
    throw new AppError(
      'Please add your exact workplace location (or capture live GPS location) before clocking in.',
      400
    );
  }

  const rawPhoto = String(payload.clockInPhotoDataUrl || payload.photoProofDataUrl || payload.photoDataUrl || '').trim();
  let clockInPhotoDataUrl = null;
  if (rawPhoto) {
    if (!/^data:image\/(jpeg|jpg|png|webp);base64,/i.test(rawPhoto)) {
      throw new AppError('Workplace proof photo must be a valid captured JPEG, PNG, or WebP image.', 400);
    }
    if (rawPhoto.length > 3.5 * 1024 * 1024) {
      throw new AppError('Workplace proof photo is too large. Please capture a standard camera image.', 400);
    }
    clockInPhotoDataUrl = rawPhoto;
  } else if (settings.requirePhotoProof !== false && !isExecutiveSelf && payload.allowWithoutPhoto !== true) {
    throw new AppError(
      'Please take a live workplace picture on the system as evidence of your exact workplace location before clocking in.',
      400
    );
  }

  const locationSource = hasValidGps
    ? (rawLocationText ? 'GPS_AND_ADDRESS_VERIFIED' : 'GPS_VERIFIED')
    : 'WORKPLACE_LOCATION_DECLARED';

  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const reportingMins = hhmmToMinutes(settings.reportingTime || DEFAULT_SETTINGS.reportingTime);
  const lateCutoffMins = Math.max(reportingMins, hhmmToMinutes(settings.lateCutoffTime || settings.reportingTime));
  const lateFlag = nowMinutes > lateCutoffMins;
  const minutesLate = Math.max(0, nowMinutes - reportingMins);
  const minutesEarly = Math.max(0, reportingMins - nowMinutes);
  const punctualityStatus = lateFlag
    ? 'LATE'
    : nowMinutes <= reportingMins
      ? 'EARLY_OR_ON_TIME'
      : 'ON_TIME';

  const dayOfWeek = DAY_NAMES[now.getDay()] || '';
  const clockInDateFormatted = formatHumanDate(now);
  const clockInTimeLabel = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

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
    dayOfWeek,
    clockInDateFormatted,
    clockInTimeLabel,
    clockInAt: now.toISOString(),
    clockOutAt: null,
    scheduledCloseAt: closeDate.toISOString(),
    autoCloseAt: autoCloseDate.toISOString(),
    reportingTimeSnapshot: settings.reportingTime,
    reportingTimeLabel: settings.reportingTimeLabel || format12HourTime(settings.reportingTime),
    closingTimeSnapshot: settings.closingTime,
    closingTimeLabel: settings.closingTimeLabel || format12HourTime(settings.closingTime),
    punctualityStatus,
    minutesLate,
    minutesEarly,
    workplaceLocation,
    latitude,
    longitude,
    accuracyMeters,
    locationSource,
    clockInPhotoDataUrl,
    photoCapturedAt: clockInPhotoDataUrl ? (payload.photoCapturedAt || now.toISOString()) : null,
    sentToHeadmasterAt: now.toISOString(),
    verificationStatus: isExecutiveSelf ? 'VERIFIED' : 'PENDING_VERIFICATION',
    verifiedBy: isExecutiveSelf ? id.staffName : null,
    verifiedAt: isExecutiveSelf ? now.toISOString() : null,
    verificationNote: isExecutiveSelf ? 'Headmaster self clock-in' : '',
    durationMinutes: null,
    hoursWorkedLabel: 'Active On Duty',
    clockInNote: String(payload.notes || payload.clockInNote || `Reported at ${workplaceLocation} and submitted workplace proof for Headmaster verification.`).trim(),
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

  try {
    socketServer.emitToTenant(parseInt(tid, 10) || 1, 'staff_clock_in_submitted', {
      id: entry.id,
      staffName: entry.staffName,
      staffRole: entry.staffRole,
      department: entry.department,
      shiftDate: entry.shiftDate,
      dayOfWeek: entry.dayOfWeek,
      clockInTimeLabel: entry.clockInTimeLabel,
      workplaceLocation: entry.workplaceLocation,
      hasPhotoProof: Boolean(entry.clockInPhotoDataUrl),
      punctualityStatus: entry.punctualityStatus,
      verificationStatus: entry.verificationStatus
    });
  } catch { }

  return entry;
}

async function verifyStaffClockInRecord(req) {
  const tid = String(parseInt(req.tenantId || req.user?.tenantId || 1, 10) || 1);
  const recordId = String(req.params.recordId || '').trim();
  if (!recordId) {
    throw new AppError('Attendance record ID is required for verification.', 400);
  }
  const decisionRaw = String(req.body?.decision || req.body?.verificationStatus || 'VERIFIED').trim().toUpperCase();
  const allowedDecisions = new Set(['VERIFIED', 'QUERIED', 'REJECTED']);
  if (!allowedDecisions.has(decisionRaw)) {
    throw new AppError('Verification decision must be VERIFIED, QUERIED, or REJECTED.', 400);
  }
  const verifierName = `${req.user?.firstName || ''} ${req.user?.lastName || ''}`.trim() || req.user?.name || req.user?.email || 'Headmaster';
  const verifierRole = String(req.user?.role || 'ADMIN').toUpperCase();
  const verificationNote = String(req.body?.verificationNote || req.body?.note || '').trim() ||
    (decisionRaw === 'VERIFIED'
      ? 'Workplace location, time, date, and photo evidence verified by Headmaster.'
      : decisionRaw === 'QUERIED'
        ? 'Headmaster requested clarification regarding workplace proof.'
        : 'Clock-in proof rejected by Headmaster.');
  const nowIso = new Date().toISOString();

  let updatedEntry = null;
  writePersistentStore((curr) => {
    const prevMap = curr.staffAttendanceLogs || {};
    const list = Array.isArray(prevMap[tid]) ? [...prevMap[tid]] : [];
    const idx = list.findIndex((item) => String(item.id) === recordId);
    if (idx === -1) return curr;
    updatedEntry = {
      ...list[idx],
      verificationStatus: decisionRaw,
      verifiedBy: verifierName,
      verifiedByRole: verifierRole,
      verifiedAt: nowIso,
      verificationNote,
      markedPresent: decisionRaw !== 'REJECTED'
    };
    list[idx] = updatedEntry;
    return {
      ...curr,
      staffAttendanceLogs: {
        ...prevMap,
        [tid]: list
      }
    };
  });

  if (!updatedEntry) {
    throw new AppError(`Staff attendance record "${recordId}" was not found in this institution.`, 404);
  }

  await syncAttendanceRecordToPrisma(updatedEntry);

  try {
    socketServer.emitToTenant(parseInt(tid, 10) || 1, 'staff_clock_in_verified', {
      id: updatedEntry.id,
      staffId: updatedEntry.staffId,
      staffEmail: updatedEntry.staffEmail,
      staffName: updatedEntry.staffName,
      verificationStatus: updatedEntry.verificationStatus,
      verifiedBy: updatedEntry.verifiedBy,
      verifiedAt: updatedEntry.verifiedAt,
      verificationNote: updatedEntry.verificationNote
    });
  } catch { }

  return updatedEntry;
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
  const pendingVerificationCount = logs.filter((l) => l.status !== 'BYPASSED_UNMARKED' && (!l.verificationStatus || l.verificationStatus === 'PENDING_VERIFICATION')).length;
  const verifiedPresentCount = logs.filter((l) => l.verificationStatus === 'VERIFIED').length;
  const queriedCount = logs.filter((l) => l.verificationStatus === 'QUERIED' || l.verificationStatus === 'REJECTED').length;
  const lateArrivalsCount = logs.filter((l) => Boolean(l.lateFlag)).length;
  const withPhotoProofCount = logs.filter((l) => Boolean(l.clockInPhotoDataUrl)).length;
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
      pendingVerificationCount,
      verifiedPresentCount,
      queriedCount,
      lateArrivalsCount,
      withPhotoProofCount,
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
  verifyStaffClockInRecord,
  getMyStaffAttendanceStatus,
  getAllStaffAttendance,
  getTenantSettings,
  updateAttendanceSettings,
  runAutoClockOutSweep,
  startAutoStaffClockOutScheduler
};
