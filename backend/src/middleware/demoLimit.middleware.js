'use strict';

const jwt = require('jsonwebtoken');
const envConfig = require('../core/config/env.config');
const { readPersistentStore, writePersistentStore } = require('../core/database/persistentStore');
const { resolveTenantId } = require('../utils/resolveTenantId');

const MAX_DEMO_ENTRIES = 10;

const DEMO_ACCOUNT_EMAILS = new Set([
  'admin@gbs.com',
  'teacher@gbs.com',
  'student@gbs.com',
  'parent@gbs.com',
  'accountant@gbs.com',
  'finance@gbs.com',
  'staff@gbs.com',
  'hr@gbs.com',
  'alumni@gbs.com'
]);

const DEMO_ACCOUNT_USERNAMES = new Set([
  'superadmin',
  'teacher1',
  'student1',
  'parent1',
  'finance1',
  'staff1',
  'hr1',
  'alumni1'
]);

const DEMO_ACCOUNT_IDS = new Set([
  'usr_super_admin',
  'usr_superadmin',
  'usr_admin',
  'usr_admin_master',
  'usr_teacher_master',
  'usr_teacher1',
  'usr_student_master',
  'usr_student1',
  'usr_parent_master',
  'usr_parent1',
  'usr_accountant_master',
  'usr_accountant_alt',
  'usr_finance1',
  'usr_staff_master',
  'usr_staff1',
  'usr_hr_master',
  'usr_hr1',
  'usr_alumni_master',
  'usr_alumni1'
]);

const EXEMPT_PATH_PREFIXES = [
  '/health',
  '/network-info',
  '/translate',
  '/auth/',
  '/rcce/',
  '/dev-control/',
  '/developer-control-center/',
  '/tenants/register',
  '/onboarding',
  '/sms/'
];

const NON_CREATE_ACTION_REGEX = /\/(login|logout|refresh-token|verify|verify-pin|webhook|reconcile|calculate|scan|grade|sync|heartbeat|ack|live-location|location|watch|export|status|forgot-password|reset-password|reset-demo|demo-reset|approve|reject|vet|voice|batch-delete|batch-archive|batch-resolve|restore|purge|recalculate-population|advance-student|pull-record)(\/|$)/i;

const RESOURCE_BUCKETS = [
  { prefix: '/transport/routes', bucket: 'transport_routes', label: 'Bus Commuter Routes' },
  { prefix: '/transports/routes', bucket: 'transport_routes', label: 'Bus Commuter Routes' },
  { prefix: '/transport/vehicles', bucket: 'transport_vehicles', label: 'Fleet Vehicles & Drivers' },
  { prefix: '/transports/vehicles', bucket: 'transport_vehicles', label: 'Fleet Vehicles & Drivers' },
  { prefix: '/transport/assignments', bucket: 'transport_assignments', label: 'Student Bus Assignments' },
  { prefix: '/transports/assignments', bucket: 'transport_assignments', label: 'Student Bus Assignments' },
  { prefix: '/university', bucket: 'university', label: 'University Internships, Exams & Streams' },
  { prefix: '/clinic', bucket: 'clinic', label: 'School Clinic & Medical Records' },
  { prefix: '/health-clinic', bucket: 'clinic', label: 'School Clinic & Medical Records' },
  { prefix: '/users', bucket: 'users', label: 'User & Staff Records' },
  { prefix: '/academics', bucket: 'academics', label: 'Academic Classes & Records' },
  { prefix: '/academic', bucket: 'academics', label: 'Academic Classes & Records' },
  { prefix: '/finance', bucket: 'finance', label: 'Fees & Financial Entries' },
  { prefix: '/fees', bucket: 'finance', label: 'Fees & Financial Entries' },
  { prefix: '/payments/initiate', bucket: 'payments', label: 'Payment Transactions' },
  { prefix: '/assignments', bucket: 'assignments', label: 'Assignments & Submissions' },
  { prefix: '/assignment', bucket: 'assignments', label: 'Assignments & Submissions' },
  { prefix: '/ai-exam', bucket: 'exams', label: 'Exams & Question Papers' },
  { prefix: '/exams', bucket: 'exams', label: 'Exams & Question Papers' },
  { prefix: '/admissions', bucket: 'admissions', label: 'Admission Applications' },
  { prefix: '/admission', bucket: 'admissions', label: 'Admission Applications' },
  { prefix: '/parents', bucket: 'parents', label: 'Parent & Guardian Requests' },
  { prefix: '/parent-portal', bucket: 'parents', label: 'Parent & Guardian Requests' },
  { prefix: '/library', bucket: 'library', label: 'Library Books & Loans' },
  { prefix: '/libraries', bucket: 'library', label: 'Library Books & Loans' },
  { prefix: '/inventory', bucket: 'inventory', label: 'Inventory & Store Requests' },
  { prefix: '/procurement', bucket: 'inventory', label: 'Inventory & Store Requests' },
  { prefix: '/hr', bucket: 'hr', label: 'HR Staff & Leave Entries' },
  { prefix: '/staff-management', bucket: 'hr', label: 'HR Staff & Leave Entries' },
  { prefix: '/facility', bucket: 'facility', label: 'Facility & Maintenance Tickets' },
  { prefix: '/maintenance', bucket: 'facility', label: 'Facility & Maintenance Tickets' },
  { prefix: '/meetings', bucket: 'meetings', label: 'Online Learning Meetings' },
  { prefix: '/meeting', bucket: 'meetings', label: 'Online Learning Meetings' },
  { prefix: '/communication', bucket: 'communication', label: 'Messages & Announcements' },
  { prefix: '/chat', bucket: 'communication', label: 'Messages & Announcements' },
  { prefix: '/messages', bucket: 'communication', label: 'Messages & Announcements' },
  { prefix: '/workflows', bucket: 'workflows', label: 'Institutional Approval Workflows' },
  { prefix: '/workflow', bucket: 'workflows', label: 'Institutional Approval Workflows' },
  { prefix: '/reporting', bucket: 'reports', label: 'Academic & Audit Reports' },
  { prefix: '/reports', bucket: 'reports', label: 'Academic & Audit Reports' },
  { prefix: '/documents', bucket: 'reports', label: 'Official Institutional Documents' },
  { prefix: '/notifications', bucket: 'notifications', label: 'Portal Notifications' },
  { prefix: '/notification', bucket: 'notifications', label: 'Portal Notifications' },
  { prefix: '/loans', bucket: 'loans', label: 'Staff Loan Applications' },
  { prefix: '/timetables', bucket: 'timetables', label: 'Timetable Schedule Slots' },
  { prefix: '/timetable', bucket: 'timetables', label: 'Timetable Schedule Slots' },
  { prefix: '/attendance', bucket: 'attendance', label: 'Attendance Records' },
  { prefix: '/topic-videos', bucket: 'topic_videos', label: 'Topic Video Guides' }
];

function decodeAuthHint(req) {
  if (req.user) return req.user;
  const authHeader = String(req.headers?.authorization || '');
  if (authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7).trim();
    if (token.startsWith('gbs_dev_token_')) {
      return { role: 'DEVELOPER', tenantId: 1 };
    }
    try {
      const decoded = jwt.verify(token, envConfig.jwt.secret);
      if (decoded && typeof decoded === 'object') return decoded;
    } catch (_) {
      // ignore invalid/opaque builtin tokens; check headers next
    }
  }
  const email = String(req.headers?.['x-user-email'] || '').trim().toLowerCase();
  const role = String(req.headers?.['x-user-role'] || '').trim().toUpperCase();
  const tenantId = resolveTenantId(req, 1);
  if (email || role) {
    return { email, role, tenantId };
  }
  return null;
}

function isDemoSandboxRequest(req) {
  const actor = decodeAuthHint(req);
  const role = String(actor?.role || req.headers?.['x-user-role'] || '').trim().toUpperCase();
  if (role === 'DEVELOPER') return false;

  if (actor?.isDemo === true) return true;

  const email = String(actor?.email || req.headers?.['x-user-email'] || '').trim().toLowerCase();
  const username = String(actor?.username || '').trim().toLowerCase();
  const idStr = String(actor?.id || actor?.userId || '').trim().toLowerCase();

  if (
    DEMO_ACCOUNT_EMAILS.has(email) ||
    DEMO_ACCOUNT_USERNAMES.has(username) ||
    DEMO_ACCOUNT_IDS.has(idStr)
  ) {
    return true;
  }

  const modeHeader = String(req.headers?.['x-gbs-mode'] || '').trim().toUpperCase();
  const tid = resolveTenantId(req, 1);
  if (modeHeader === 'DEMO_SANDBOX' && tid === 1) {
    return true;
  }

  return false;
}

function classifyDemoResourceBucket(req) {
  if (String(req.method || 'GET').toUpperCase() !== 'POST') return null;

  let path = String(req.originalUrl || req.url || req.path || '').split('?')[0].toLowerCase();
  if (path.startsWith('/api/v1')) {
    path = path.slice('/api/v1'.length) || '/';
  }

  if (EXEMPT_PATH_PREFIXES.some((prefix) => path.startsWith(prefix))) {
    return null;
  }
  if (NON_CREATE_ACTION_REGEX.test(path)) {
    return null;
  }

  const matched = RESOURCE_BUCKETS.find((b) => path === b.prefix || path.startsWith(`${b.prefix}/`));
  if (matched) return matched;

  return null;
}

function getDemoUsageSummary() {
  const store = readPersistentStore();
  const raw = store.demoTrialCounters && typeof store.demoTrialCounters === 'object'
    ? store.demoTrialCounters
    : {};
  const modules = {};
  let totalUsed = 0;

  for (const { bucket, label } of RESOURCE_BUCKETS) {
    if (!modules[bucket]) {
      const used = Math.max(0, Number(raw[bucket] || 0));
      totalUsed += used;
      modules[bucket] = {
        module: bucket,
        label,
        used,
        limit: MAX_DEMO_ENTRIES,
        remaining: Math.max(0, MAX_DEMO_ENTRIES - used),
        limitReached: used >= MAX_DEMO_ENTRIES
      };
    }
  }

  for (const [bucket, count] of Object.entries(raw)) {
    if (!modules[bucket]) {
      const used = Math.max(0, Number(count || 0));
      totalUsed += used;
      modules[bucket] = {
        module: bucket,
        label: bucket,
        used,
        limit: MAX_DEMO_ENTRIES,
        remaining: Math.max(0, MAX_DEMO_ENTRIES - used),
        limitReached: used >= MAX_DEMO_ENTRIES
      };
    }
  }

  return {
    maxPerModule: MAX_DEMO_ENTRIES,
    totalUsed,
    counters: raw,
    modules
  };
}

function resetDemoUsageCounters() {
  writePersistentStore((curr) => ({
    ...curr,
    demoTrialCounters: {},
    updatedAt: new Date().toISOString()
  }));
  return getDemoUsageSummary();
}

function demoLimitMiddleware(req, res, next) {
  if (!isDemoSandboxRequest(req)) {
    return next();
  }

  const classification = classifyDemoResourceBucket(req);
  if (!classification) {
    return next();
  }

  const { bucket, label } = classification;
  const store = readPersistentStore();
  const counters = store.demoTrialCounters && typeof store.demoTrialCounters === 'object'
    ? store.demoTrialCounters
    : {};
  const used = Math.max(0, Number(counters[bucket] || 0));

  res.setHeader('X-GBS-Demo-Mode', 'true');
  res.setHeader('X-GBS-Demo-Limit', String(MAX_DEMO_ENTRIES));
  res.setHeader('X-GBS-Demo-Used', String(used));
  res.setHeader('X-GBS-Demo-Remaining', String(Math.max(0, MAX_DEMO_ENTRIES - used)));

  if (used >= MAX_DEMO_ENTRIES) {
    const limitMsg = `Demo Trial Limit Reached (${used}/${MAX_DEMO_ENTRIES} entries used for ${label}). Demo Sandbox runs the full real workflow for learning up to ${MAX_DEMO_ENTRIES} entries per module. Switch to a Live School account for unlimited records, or click "Reset Demo Data" in the top banner to practice again.`;
    return res.status(403).json({
      success: false,
      status: 'error',
      code: 'DEMO_TRIAL_LIMIT_REACHED',
      message: limitMsg,
      data: {
        limit: MAX_DEMO_ENTRIES,
        used,
        remaining: 0,
        module: bucket,
        label
      },
      errors: [{ message: limitMsg, code: 'DEMO_TRIAL_LIMIT_REACHED' }],
      timestamp: new Date().toISOString(),
      requestId: req.requestId || 'REQ-DEMO-LIMIT'
    });
  }

  let incremented = false;
  res.once('finish', () => {
    if (incremented) return;
    if (res.statusCode >= 200 && res.statusCode < 300) {
      incremented = true;
      writePersistentStore((curr) => {
        const nextCounters = {
          ...(curr.demoTrialCounters && typeof curr.demoTrialCounters === 'object' ? curr.demoTrialCounters : {})
        };
        nextCounters[bucket] = Math.max(0, Number(nextCounters[bucket] || 0)) + 1;
        return {
          ...curr,
          demoTrialCounters: nextCounters,
          updatedAt: new Date().toISOString()
        };
      });
    }
  });

  return next();
}

module.exports = {
  MAX_DEMO_ENTRIES,
  DEMO_ACCOUNT_EMAILS,
  DEMO_ACCOUNT_USERNAMES,
  DEMO_ACCOUNT_IDS,
  isDemoSandboxRequest,
  classifyDemoResourceBucket,
  getDemoUsageSummary,
  resetDemoUsageCounters,
  demoLimitMiddleware
};
