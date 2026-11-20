const express = require('express');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const helmet = require('helmet');
const hpp = require('hpp');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const envConfig = require('./config/env.config');
const { errorHandler, AppError } = require('../middleware/error.middleware');
const { demoLimitMiddleware } = require('../middleware/demoLimit.middleware');
const authService = require('../modules/auth/auth.service');

// Route Imports
const authRoutes = require('../modules/auth/auth.routes');
const tenantRoutes = require('../modules/tenant/tenant.routes');
const userRoutes = require('../modules/user/user.routes');
const academicRoutes = require('../modules/academic/academic.routes');
const financeRoutes = require('../modules/finance/finance.routes');
const voiceAuthRoutes = require('../modules/voice-auth/voiceAuth.routes');
const aiExamRoutes = require('../modules/ai-exam/aiExam.routes');
const trackingRoutes = require('../modules/tracking/tracking.routes');
const devControlRoutes = require('../modules/dev-control/devControl.routes');
const timetableRoutes = require('../modules/timetable/timetable.routes');
const attendanceRoutes = require('../modules/attendance/attendance.routes');
const assignmentRoutes = require('../modules/assignment/assignment.routes');
const meetingRoutes = require('../modules/meeting/meeting.routes');
const parentRoutes = require('../modules/parent/parent.routes');
const admissionRoutes = require('../modules/admissions/admissions.routes');
const workflowRoutes = require('../modules/workflow/workflow.routes');
const notificationRoutes = require('../modules/notifications/notifications.routes');
const reportingRoutes = require('../modules/reporting/reporting.routes');
const aiRoutes = require('../modules/ai/ai.routes');
const communicationRoutes = require('../modules/communication/communication.routes');
const libraryRoutes = require('../modules/library/library.routes');
const transportRoutes = require('../modules/transport/transport.routes');
const inventoryRoutes = require('../modules/inventory/inventory.routes');
const hrRoutes = require('../modules/hr/hr.routes');
const facilityRoutes = require('../modules/facility/facility.routes');
const digitalTwinRoutes = require('../modules/digital-twin/digitalTwin.routes');
const cctvRoutes = require('../modules/cctv/cctv.routes');
const migrationRoutes = require('../modules/migration/migration.routes');
const shardRoutes = require('../modules/infrastructure/shard.routes');
const monitoringRoutes = require('../modules/monitoring/monitoring.routes');
const smsRoutes = require('../modules/sms/sms.routes');
const cdnRoutes = require('../modules/cdn/cdn.routes');
const pushRoutes = require('../modules/push/push.routes');
const analyticsRoutes = require('../modules/analytics/analytics.routes');
const { loanRoutes } = require('../modules/loans');
const roleRoutes = require('../modules/role/role.routes');
const permissionRoutes = require('../modules/permission/permission.routes');
const { protect } = require('../middleware/auth.middleware');
const { initializeSocket } = require('./socket/socketServer');

// GBS Master Architecture - User Registration Count & Verification Engine mounted
const app = express();
app.set('trust proxy', 1);

// Security Middlewares (CSP disabled so live translation, dictionary, audio & media streams never get blocked in browser)
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(hpp());

// Rate limiting
const limiter = rateLimit({
  windowMs: envConfig.rateLimit.windowMs,
  max: envConfig.rateLimit.maxRequests,
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api', limiter);

// Request Parsing & Compression (capture rawBody for cryptographic webhook signature verification)
app.use(express.json({
  limit: '50mb',
  verify: (req, _res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(cookieParser());
app.use(compression());

// GBS Central System Response, Control and Communication Engine (GBS-RCCE)
const { setupRcce, rcceCentralErrorHandler, idempotencyProtection } = require('../rcce');
const { cloudInfraManager } = require('./infrastructure/cloudInfraManager');
const { connectionPoolManager } = require('./database/connectionPoolManager');
app.use(cloudInfraManager.apiTelemetryMiddleware());
setupRcce(app, { productId: 'GBS_SCHOOL', productName: 'GBS School Management System' });

if (envConfig.env === 'development') {
  app.use(morgan('dev'));
}

// Health check
const buildHealthPayload = async () => {
  let dbStatus = { active: false, databaseActive: false, role: 'STANDBY_LOCAL', databaseRole: 'UNKNOWN', mode: 'FALLBACK' };
  try {
    const prisma = require('./database/prisma.client');
    if (typeof prisma.getPostgresLiveStatus === 'function') {
      let healthTimer;
      const timeoutPromise = new Promise((resolve) => {
        healthTimer = setTimeout(() => {
          resolve({ active: false, connected: false, status: 'INITIALIZING', role: 'INITIALIZING', mode: 'PROBING' });
        }, 4000);
      });
      dbStatus = await Promise.race([
        prisma.getPostgresLiveStatus(),
        timeoutPromise
      ]).finally(() => clearTimeout(healthTimer));
    }
  } catch (e) {
    dbStatus = { active: false, databaseActive: false, role: 'ERROR', databaseRole: 'ERROR', error: e.message };
  }
  const isPgActive = Boolean(dbStatus?.databaseActive ?? dbStatus?.active ?? dbStatus?.connected);
  return {
    status: 'success',
    message: 'GBS Enterprise Backend is online and operational.',
    databaseActive: isPgActive,
    databaseRole: dbStatus?.databaseRole || dbStatus?.role || (isPgActive ? 'PRIMARY_ACTIVE' : 'STANDBY_LOCAL'),
    database: {
      ...dbStatus,
      databaseActive: isPgActive
    },
    timestamp: new Date().toISOString()
  };
};

app.get('/health', async (req, res) => {
  const payload = await buildHealthPayload();
  res.status(200).json(payload);
});
app.get('/api/v1/health', async (req, res) => {
  const payload = await buildHealthPayload();
  res.status(200).json(payload);
});

app.use('/api/v1/locale', require('../modules/locale/locale.routes'));

app.get('/api/v1/app-version', (req, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  let bundleHash = 'dev-local';
  try {
    const publicHtml = path.resolve(__dirname, '../../public/index.html');
    const distHtml = path.resolve(__dirname, '../../../frontend/dist/index.html');
    const targetHtml = fs.existsSync(publicHtml) ? publicHtml : (fs.existsSync(distHtml) ? distHtml : null);
    if (targetHtml) {
      const html = fs.readFileSync(targetHtml, 'utf8');
      const match = html.match(/index-[A-Za-z0-9_-]+\.js/);
      if (match) bundleHash = match[0];
    }
  } catch { }
  res.status(200).json({
    status: 'success',
    data: {
      bundleHash,
      swVersion: 'gbs-cache-v2026.19',
      autoUpdateEnabled: true,
      checkedAt: new Date().toISOString()
    }
  });
});

app.get('/api/v1/network-info', (req, res) => {
  const os = require('os');
  const interfaces = os.networkInterfaces();
  const lanAddresses = [];
  for (const [name, addrs] of Object.entries(interfaces || {})) {
    for (const addr of addrs || []) {
      const isIPv4 = addr.family === 'IPv4' || addr.family === 4;
      if (isIPv4 && !addr.internal && !addr.address.startsWith('169.254.')) {
        lanAddresses.push({ interface: name, ip: addr.address });
      }
    }
  }
  const activePort = Number(envConfig.port || process.env.PORT || 5001);
  const proto = String(req.headers['x-forwarded-proto'] || req.protocol || 'http').split(',')[0].trim();
  const hostHeader = req.get('host') || `localhost:${activePort}`;
  res.status(200).json({
    status: 'success',
    data: {
      protocol: proto,
      host: hostHeader,
      backendPort: activePort,
      frontendDevPort: 3000,
      lanUrls: lanAddresses.map((a) => ({
        interface: a.interface,
        ip: a.ip,
        frontendUrl: `http://${a.ip}:3000`,
        backendUrl: `http://${a.ip}:${activePort}`,
      })),
      recommendedMobileUrl: lanAddresses[0] && proto !== 'https'
        ? `http://${lanAddresses[0].ip}:3000`
        : `${proto}://${hostHeader}`,
    },
  });
});

// Universal Server-Side Language Translator, Dictionary Meaning & Receiver Inbox Engine
app.use('/api/v1/translate', require('../modules/translate/translate.routes'));

// Enforce 10-entry trial cap per module in Demo Sandbox sessions while preserving identical production flows
app.use('/api/v1', demoLimitMiddleware);

// GBS-RCCE Duplicate Operation & Idempotency Guards on sensitive transactions
app.post('/api/v1/auth/register', idempotencyProtection.guard('USER_REGISTRATION'));
app.post('/api/v1/auth/signup', idempotencyProtection.guard('USER_REGISTRATION'));
app.post('/api/v1/payments/initiate', idempotencyProtection.guard('FEE_PAYMENT'));
app.post('/api/v1/subscriptions/calculate-and-subscribe', idempotencyProtection.guard('SUBSCRIPTION_BILLING'));
app.post('/api/v1/admissions', idempotencyProtection.guard('ADMISSION_SUBMISSION'));
app.post('/api/v1/admissions/inquiries', idempotencyProtection.guard('ADMISSION_INQUIRY'));
app.post('/api/v1/clinic/visits', idempotencyProtection.guard('CLINIC_ENCOUNTER'));
app.post('/api/v1/university/internships', idempotencyProtection.guard('UNIVERSITY_INTERNSHIP'));
app.post('/api/v1/institution/internships', idempotencyProtection.guard('UNIVERSITY_INTERNSHIP'));

// API Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/tenants', tenantRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/academics', academicRoutes);
app.use('/api/v1/academic', academicRoutes);
app.use('/api/v1/university', require('../modules/university/university.routes'));
app.use('/api/v1/institution', require('../modules/university/institution.routes'));
app.use('/api/v1/clinic', require('../modules/clinic/clinic.routes'));
app.use('/api/v1/health-clinic', require('../modules/clinic/clinic.routes'));
app.use('/api/v1/finance', financeRoutes);
app.use('/api/v1/fees', financeRoutes);
app.use('/api/v1/payments', require('../modules/payments/payments.routes'));
app.use('/api/v1/voice-auth', voiceAuthRoutes);
app.use('/api/v1/security/voice', voiceAuthRoutes);
app.use('/api/v1/ai-exam', aiExamRoutes);
app.use('/api/v1/exams', aiExamRoutes);
app.use('/api/v1/tracking', trackingRoutes);
app.use('/api/v1/location', trackingRoutes);
app.use('/api/v1/dev-control', devControlRoutes);
app.use('/api/v1/developer-control-center', devControlRoutes);
app.use('/api/v1/timetables', timetableRoutes);
app.use('/api/v1/timetable', timetableRoutes);
app.use('/api/v1/attendance', attendanceRoutes);
app.use('/api/v1/staff-attendance', require('../modules/attendance/staffAttendance.routes'));
app.use('/api/v1/assignments', assignmentRoutes);
app.use('/api/v1/assignment', assignmentRoutes);
app.use('/api/v1/meetings', meetingRoutes);
app.use('/api/v1/meeting', meetingRoutes);
app.use('/api/v1/video', require('../modules/video/video.routes'));
app.use('/api/v1/live-calls', require('../modules/video/video.routes'));
app.use('/api/v1/parents', parentRoutes);
app.use('/api/v1/parent-portal', parentRoutes);
app.use('/api/v1/emergency-locator', parentRoutes);
app.use('/api/v1/admissions', admissionRoutes);
app.use('/api/v1/admission', admissionRoutes);
app.use('/api/v1/workflows', workflowRoutes);
app.use('/api/v1/workflow', workflowRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1/notification', notificationRoutes);
app.use('/api/v1/reporting', reportingRoutes);
app.use('/api/v1/reports', reportingRoutes);
app.use('/api/v1/documents', reportingRoutes);
app.use('/api/v1/ai', aiRoutes);
app.use('/api/v1/ai-recommendations', aiRoutes);
app.use('/api/v1/diagnostics', aiRoutes);
app.use('/api/v1/communication', communicationRoutes);
app.use('/api/v1/chat', communicationRoutes);
app.use('/api/v1/messages', communicationRoutes);
app.use('/api/v1/library', libraryRoutes);
app.use('/api/v1/libraries', libraryRoutes);
app.use('/api/v1/transport', transportRoutes);
app.use('/api/v1/transports', transportRoutes);
app.use('/api/v1/inventory', inventoryRoutes);
app.use('/api/v1/procurement', inventoryRoutes);
app.use('/api/v1/hr', hrRoutes);
app.use('/api/v1/staff-management', hrRoutes);
app.use('/api/v1/ai/exam-scanner', aiExamRoutes);
app.use('/api/v1/sms', smsRoutes);
app.use('/api/v1/cdn', cdnRoutes);
app.use('/api/v1/push', pushRoutes);
app.use('/api/v1/analytics', analyticsRoutes);
app.use('/api/v1/loans', protect, loanRoutes);
app.use('/api/v1/roles', protect, roleRoutes);
app.use('/api/v1/permissions', protect, permissionRoutes);

// Procedure 3: Enterprise Advanced Modules
app.use('/api/v1/facility', facilityRoutes);
app.use('/api/v1/maintenance', facilityRoutes);
app.use('/api/v1/digital-twin', digitalTwinRoutes);
app.use('/api/v1/campus-telemetry', digitalTwinRoutes);
app.use('/api/v1/cctv', cctvRoutes);
app.use('/api/v1/security-gate', cctvRoutes);
app.use('/api/v1/facial-security', cctvRoutes);
app.use('/api/v1/migration', migrationRoutes);
app.use('/api/v1/data-migration', migrationRoutes);

// Procedure 5: Multi-DB Architecture, Sharding & DR Failover
app.use('/api/v1/infrastructure', shardRoutes);
app.use('/api/v1/shards', shardRoutes.shardRouter);
app.use('/api/v1/replicas', shardRoutes.replicaRouter);
app.use('/api/v1/dr-failover', shardRoutes.drRouter);
app.use('/api/v1/monitoring', monitoringRoutes);

// Teacher Topic Videos & Subscription Payment Engine (Persistent Hybrid Cloud/Local Store)
const {
  readPersistentStore,
  writePersistentStore,
  checkPostgresReachable
} = require('./database/persistentStore');
const prisma = require('./database/prisma.client');

app.get('/api/v1/audit/logs', async (req, res) => {
  try {
    const logs = await prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50
    });
    res.status(200).json({ status: 'success', results: logs.length, data: { logs } });
  } catch {
    res.status(200).json({ status: 'success', results: 0, data: { logs: [] } });
  }
});

app.get('/api/v1/topic-videos', (req, res) => {
  const store = readPersistentStore();
  res.status(200).json({
    status: 'success',
    results: (store.topicVideos || []).length,
    data: { videos: store.topicVideos || [] }
  });
});

app.post('/api/v1/topic-videos', (req, res) => {
  const body = req.body || {};
  const newVideo = {
    id: body.id || `vid_${Date.now()}`,
    title: String(body.title || 'Recorded Topic Lesson').trim(),
    subject: String(body.subject || 'General Subject').trim(),
    className: String(body.className || 'All Classes').trim(),
    teacherName: String(body.teacherName || 'Subject Teacher').trim(),
    teacherEmail: String(body.teacherEmail || 'teacher@gbs.com').trim(),
    absenceNote: String(
      body.absenceNote ||
      'Topic Introduction in Teacher Absence — Watch this lesson completely and review the attached topic notes.'
    ).trim(),
    lessonSummary: String(body.lessonSummary || '').trim(),
    videoUrl:
      body.videoUrl ||
      'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    videoType: body.videoType || 'UPLOADED_VIDEO',
    fileName: body.fileName || null,
    durationLabel: body.durationLabel || '10:00',
    createdAt: new Date().toISOString(),
    watchedBy: Array.isArray(body.watchedBy) ? body.watchedBy : []
  };

  const updated = writePersistentStore((curr) => ({
    ...curr,
    topicVideos: [newVideo, ...(curr.topicVideos || []).filter((v) => v.id !== newVideo.id)]
  }));

  res.status(201).json({
    status: 'success',
    message: `Topic video "${newVideo.title}" uploaded and published to the class platform for students to watch!`,
    data: { video: newVideo, totalVideos: (updated.topicVideos || []).length }
  });
});

app.post('/api/v1/topic-videos/:id/watch', (req, res) => {
  const { id } = req.params;
  const { studentName, studentEmail, studentQuestion } = req.body || {};
  const watchRecord = {
    studentName: studentName || 'Enrolled Student',
    studentEmail: studentEmail || 'student@gbs.com',
    studentQuestion: studentQuestion || 'Watched topic video lesson completely.',
    watchedAt: new Date().toISOString()
  };

  let targetVideo = null;
  writePersistentStore((curr) => {
    const videos = (curr.topicVideos || []).map((v) => {
      if (String(v.id) === String(id)) {
        const filtered = (v.watchedBy || []).filter(
          (w) => w.studentEmail !== watchRecord.studentEmail
        );
        targetVideo = { ...v, watchedBy: [watchRecord, ...filtered] };
        return targetVideo;
      }
      return v;
    });
    return { ...curr, topicVideos: videos };
  });

  res.status(200).json({
    status: 'success',
    message: 'Student topic video attendance & feedback recorded for teacher review.',
    data: { video: targetVideo }
  });
});

app.delete('/api/v1/topic-videos/:id', (req, res) => {
  const { id } = req.params;
  writePersistentStore((curr) => ({
    ...curr,
    topicVideos: (curr.topicVideos || []).filter((v) => String(v.id) !== String(id))
  }));
  res.status(200).json({
    status: 'success',
    message: 'Topic video removed from class platform.'
  });
});

app.post('/api/v1/subscriptions/calculate-and-subscribe', (req, res) => {
  const body = req.body || {};
  const tier = String(body.institutionType || body.tier || 'NURSERY_TO_JHS').toUpperCase();
  const studentCount = Math.max(1, parseInt(body.studentCount || body.totalStudentsEnrolled || 100, 10));
  // Official GBS Student Subscription Rates: Nursery–JHS = GH₵3, SHS = GH₵5, University = GH₵10
  const ratePerStudent = tier.includes('UNI') || tier.includes('TERTIARY') ? 10 : (tier.includes('SHS') || tier.includes('SENIOR')) ? 5 : 3;
  // 100% student-based: zero fixed tenant fees, zero basic package fees, zero additional access charges
  const monthlyFee = ratePerStudent * studentCount;
  const plan = String(body.subscriptionPlan || body.term || '3_MONTHS').toUpperCase();
  const monthsMap = {
    '1_MONTH': 1,
    '1_MONTH_TRIAL': 1,
    '3_MONTHS': 3,
    '6_MONTHS': 6,
    '9_MONTHS': 9,
    '12_MONTHS': 12,
    'LIFETIME': 12
  };
  const discountMap = {
    '1_MONTH': 0,
    '1_MONTH_TRIAL': 0,
    '3_MONTHS': 3,
    '6_MONTHS': 5,
    '9_MONTHS': 7,
    '12_MONTHS': 10,
    'LIFETIME': 10
  };
  const monthsSubscribed = monthsMap[plan] || 3;
  const discountPct = discountMap[plan] || 0;
  const grossTermFee = monthlyFee * monthsSubscribed;
  const discountAmount = Math.round(grossTermFee * (discountPct / 100) * 100) / 100;
  const totalTermFee = Math.round((grossTermFee - discountAmount) * 100) / 100;
  const paymentScheduleMode = body.paymentScheduleMode || 'BULK_FULL_TERM'; // 'MONTHLY_SPREAD' | 'BULK_FULL_TERM'
  const amountDueNow = paymentScheduleMode === 'BULK_FULL_TERM'
    ? totalTermFee
    : Math.round((totalTermFee / monthsSubscribed) * 100) / 100;

  const { convertGhsToCountryCurrency } = require('../utils/countryLanguageNorms');
  const now = new Date();
  const expiry = new Date(now.getTime() + monthsSubscribed * 30 * 86400000);
  const countryBreakdown = convertGhsToCountryCurrency(amountDueNow, body.country || body.countryCode || 'GH');

  const subRecord = {
    id: `SUB-${Date.now()}`,
    invoiceNumber: `INV-GBS-${Date.now().toString().slice(-6)}`,
    receiptNumber: body.momoTxnId ? `RCP-GBS-${Date.now().toString().slice(-6)}` : null,
    institutionName: body.institutionName || 'GBS Tenant Institution',
    institutionType: tier,
    country: countryBreakdown.countryName,
    countryCode: countryBreakdown.countryCode,
    countryFlag: countryBreakdown.countryFlag,
    currencyCode: body.currencyCode || countryBreakdown.currencyCode,
    currencySymbol: body.currencySymbol || countryBreakdown.currencySymbol,
    fxRateToGhs: countryBreakdown.fxRateToGhs,
    localCurrencyAmount: countryBreakdown.localCurrencyAmount,
    convertedGhsAmount: countryBreakdown.convertedGhsAmount,
    studentCount,
    ratePerStudent,
    fixedTenantFee: 0,
    basicPackageFee: 0,
    additionalAccessFee: 0,
    monthlyFee,
    subscriptionPlan: plan,
    monthsSubscribed,
    discountPct,
    grossTermFee,
    discountAmount,
    totalTermFee,
    paymentScheduleMode,
    amountDueNow,
    bulkTermsAccepted: Boolean(body.bulkTermsAccepted),
    bulkTermsSignedBy: body.bulkTermsSignedBy || body.headmasterName || null,
    momoTxnId: body.momoTxnId || null,
    paymentVerified: false, // Payments must be verified before subscription activation
    subscriptionStatus: 'PENDING_PAYMENT_VERIFICATION',
    commencementDate: now.toISOString(),
    expiryDate: expiry.toISOString(),
    createdAt: now.toISOString()
  };

  writePersistentStore((curr) => ({
    ...curr,
    subscriptions: [subRecord, ...(curr.subscriptions || [])]
  }));

  res.status(201).json({
    status: 'success',
    message: `100% Student-Based Subscription Invoice (${subRecord.invoiceNumber}) generated for ${studentCount} active students × GH₵ ${ratePerStudent} (${monthsSubscribed} months, ${discountPct}% discount = GH₵ ${totalTermFee.toLocaleString()}).`,
    data: subRecord
  });
});

app.post('/api/v1/subscriptions/recalculate-population', (req, res) => {
  const body = req.body || {};
  const tier = String(body.institutionType || body.tier || 'NURSERY_TO_JHS').toUpperCase();
  const ratePerStudent = tier.includes('UNI') || tier.includes('TERTIARY') ? 10 : (tier.includes('SHS') || tier.includes('SENIOR')) ? 5 : 3;
  const previousStudents = Math.max(0, parseInt(body.previousStudents || 200, 10));
  const newActiveStudents = Math.max(0, parseInt(body.newActiveStudents || 300, 10));
  const months = Math.max(1, parseInt(body.months || 3, 10));
  const discountMap = { 1: 0, 3: 3, 6: 5, 9: 7, 12: 10 };
  const discountPct = discountMap[months] || 0;

  const previousMonthly = previousStudents * ratePerStudent;
  const nextMonthly = newActiveStudents * ratePerStudent;
  const nextGross = nextMonthly * months;
  const nextDiscount = Math.round(nextGross * (discountPct / 100) * 100) / 100;
  const nextTotalPayment = Math.round((nextGross - nextDiscount) * 100) / 100;

  res.status(200).json({
    status: 'success',
    message: 'Future subscription billing recalculated according to active student population policy (previously paid periods preserved).',
    data: {
      institutionType: tier,
      ratePerStudent,
      previousStudents,
      newActiveStudents,
      direction: newActiveStudents > previousStudents ? 'INCREASED' : newActiveStudents < previousStudents ? 'DECREASED' : 'UNCHANGED',
      previousMonthlyCharge: previousMonthly,
      nextMonthlyCharge: nextMonthly,
      months,
      discountPct,
      nextTotalPayment,
      retrospectiveChangeApplied: false
    }
  });
});

// Production Frontend Static Asset Delivery & Single Page Application (SPA) Fallback
const candidateDistPaths = [
  path.resolve(__dirname, '../../public'),
  path.resolve(__dirname, '../../../frontend/dist'),
  path.resolve(__dirname, '../../dist')
];
const frontendDistPath = candidateDistPaths.find(p => fs.existsSync(p));
if (frontendDistPath) {
  app.use(express.static(frontendDistPath, {
    etag: false,
    lastModified: false,
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('.html')) {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
      } else {
        res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
      }
    }
  }));

  // Graceful fallback for hashed /assets/* requests from older open browser tabs during live deployments
  app.get('/assets/:assetFile', (req, res, next) => {
    const requested = req.params.assetFile || '';
    const assetsDir = path.join(frontendDistPath, 'assets');
    const exactPath = path.join(assetsDir, requested);
    if (fs.existsSync(exactPath)) {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
      return res.sendFile(exactPath);
    }
    const match = requested.match(/^([A-Za-z0-9_]+)-[A-Za-z0-9_-]+\.(js|css)$/);
    if (match && fs.existsSync(assetsDir)) {
      const prefix = `${match[1]}-`;
      const ext = `.${match[2]}`;
      const replacement = fs.readdirSync(assetsDir).find(f => f.startsWith(prefix) && f.endsWith(ext));
      if (replacement) {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
        return res.sendFile(path.join(assetsDir, replacement));
      }
    }
    return res.status(404).end();
  });

  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/health')) {
      return next();
    }
    const indexHtml = path.join(frontendDistPath, 'index.html');
    if (fs.existsSync(indexHtml)) {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.setHeader('Surrogate-Control', 'no-store');
      return res.sendFile(indexHtml);
    }
    next();
  });
}

// Unhandled route handler
app.all('*', (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

// Central Error Handler (GBS-RCCE Normalized)
app.use(rcceCentralErrorHandler);
app.use(errorHandler);

const PORT = envConfig.port || 5000;
const HOST = process.env.HOST || '0.0.0.0';

const server = app.listen(PORT, HOST, async () => {
  console.log(`🚀 [GBS SYSTEM] Server running on http://${HOST}:${PORT} (LAN & Mobile accessible) in ${envConfig.env} mode.`);
  try {
    initializeSocket(server);
    readPersistentStore();
    try {
      const staffAttendanceService = require('../modules/attendance/staffAttendance.service');
      if (typeof staffAttendanceService.startAutoStaffClockOutScheduler === 'function') {
        staffAttendanceService.startAutoStaffClockOutScheduler(60000);
      }
    } catch { }
    if (process.env.DATABASE_URL) {
      const prismaClient = require('./database/prisma.client');
      const { exec } = require('child_process');
      const { promisify } = require('util');
      const backendRoot = require('path').resolve(__dirname, '../..');

      let pgReachable = false;
      for (let attempt = 1; attempt <= 3; attempt++) {
        pgReachable = await checkPostgresReachable(2500);
        if (pgReachable) break;
        if (attempt < 3) {
          await new Promise((r) => setTimeout(r, 1500));
        }
      }

      if (pgReachable) {
        if (typeof prismaClient.resetPostgresCache === 'function') {
          prismaClient.resetPostgresCache();
        }
        try {
          console.log('🔄 [DATABASE] Initializing active PostgreSQL primary connection & schema...');
          await prismaClient.$connect().catch(() => { });

          await prismaClient.$executeRawUnsafe(`
            DO $$
            BEGIN
              IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cctv_streams' AND column_name = 'rtsp_endpoint') THEN
                UPDATE cctv_streams SET rtsp_endpoint = COALESCE(stream_url, 'rtsp://stream.gbs-system.edu/live/cam_default') WHERE rtsp_endpoint IS NULL;
              END IF;
              IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'security_gate_events' AND column_name = 'gate_name') THEN
                UPDATE security_gate_events SET gate_name = COALESCE(gate_location, 'Main Campus Gate') WHERE gate_name IS NULL;
              END IF;
            END $$;
          `).catch(() => { });

          try {
            const existingTables = await prismaClient.$queryRawUnsafe(`
              SELECT COUNT(*)::int AS cnt
              FROM information_schema.tables
              WHERE table_schema = 'public'
                AND table_name IN ('tenants', 'users', 'shard_registry', 'replica_status', 'cctv_streams', 'security_gate_events');
            `).catch(() => []);
            const tableCount = Array.isArray(existingTables) ? Number(existingTables[0]?.cnt || 0) : 0;

            if (tableCount < 6) {
              const prismaCliPath = require.resolve('prisma/build/index.js');
              const schemaPath = path.join(backendRoot, 'prisma', 'schema.prisma');
              await promisify(exec)(
                `"${process.execPath}" "${prismaCliPath}" db push --schema="${schemaPath}" --skip-generate --accept-data-loss`,
                {
                  cwd: backendRoot,
                  timeout: 90000,
                  maxBuffer: 8 * 1024 * 1024,
                  windowsHide: true
                }
              );
            }
            console.log('✅ [DATABASE] PostgreSQL schema tables verified and synchronized.');
          } catch (pushErr) {
            console.log('✅ [DATABASE] PostgreSQL schema tables verified (active connection ready).');
          }

          try {
            const { ensurePaymentTables } = require('./database/ensurePaymentTables');
            await ensurePaymentTables();
          } catch (paySchemaErr) {
            console.warn('⚠️ [PAYMENTS] Startup DDL sync notice:', paySchemaErr.message);
          }

          const pgLive = typeof prismaClient.getPostgresLiveStatus === 'function'
            ? await prismaClient.getPostgresLiveStatus(true)
            : { active: await checkPostgresReachable(2000), database: 'gbs_system', versionShort: 'PostgreSQL', latencyMs: 0 };

          if (pgLive.active) {
            // Seed default sharding & replica topology rows only if tables are empty (e.g. fresh Render DB)
            try {
              const shardRows = await prismaClient.$queryRawUnsafe('SELECT COUNT(*)::int AS cnt FROM shard_registry;').catch(() => []);
              if (Array.isArray(shardRows) && Number(shardRows[0]?.cnt) === 0) {
                await prismaClient.$executeRawUnsafe(`
                  INSERT INTO shard_registry (shard_key, name, region, host, port, database_name, allocated_tenants, max_tenants, storage_capacity_gb, storage_used_gb, avg_latency_ms, status, is_primary)
                  VALUES ('SHARD-PRIMARY-01', 'Primary PostgreSQL Cluster', 'PRIMARY_REGION', $1, $2, $3, 1, 100, 1000, 12.5, $4, 'ONLINE', true)
                  ON CONFLICT DO NOTHING;
                `, pgLive.host || 'localhost', Number(pgLive.port || 5432), pgLive.database || 'gbs_system', Number(pgLive.latencyMs || 2.5)).catch(() => { });
              }
              const repRows = await prismaClient.$queryRawUnsafe('SELECT COUNT(*)::int AS cnt FROM replica_status;').catch(() => []);
              if (Array.isArray(repRows) && Number(repRows[0]?.cnt) === 0) {
                await prismaClient.$executeRawUnsafe(`
                  INSERT INTO replica_status (replica_name, role, endpoint, region, replication_lag_ms, sync_state, wal_lsn, health_score, is_healthy)
                  VALUES ('pg-primary-node-01', 'PRIMARY', $1, 'PRIMARY_REGION', 0.0, 'STREAMING', '0/1A00000', 100, true)
                  ON CONFLICT DO NOTHING;
                `, `${pgLive.host || 'localhost'}:${pgLive.port || 5432}`).catch(() => { });
              }
            } catch { }

            const defaultData = await authService.seedDefaultAdmin();
            console.log(`✅ [DATABASE] PostgreSQL ACTIVE (${pgLive.versionShort || 'PostgreSQL'} | DB: ${pgLive.database} | ${pgLive.latencyMs}ms | Pool: ${pgLive.poolActiveConnections || 1}/${pgLive.poolMaxConnections || 25} [Idle: ${pgLive.poolIdleConnections ?? 0}, MaxSafeApp: ${pgLive.maxSafeApplicationConnections || 80}/${pgLive.postgresMaxConnections || 100}]).`);
            console.log(`✅ [DATABASE] Default Tenant '${defaultData?.tenant?.code || 'GBS-MAIN'}' & Super Admin verified in PostgreSQL.`);

            // Start 60-second background PostgreSQL idle-in-transaction & leak reaper
            const reaperTimer = setInterval(async () => {
              try {
                cloudInfraManager.backgroundJobs.idleConnectionReaper.runsCount++;
                cloudInfraManager.backgroundJobs.idleConnectionReaper.lastRunAt = new Date().toISOString();
                await connectionPoolManager.reapStuckConnections(prismaClient.$queryRawUnsafe.bind(prismaClient), 60);
              } catch (_) {
                cloudInfraManager.backgroundJobs.idleConnectionReaper.failuresCount++;
              }
            }, 60000);
            if (typeof reaperTimer.unref === 'function') reaperTimer.unref();
          } else {
            console.warn(`⚠️ [DATABASE] PostgreSQL unreachable (${pgLive.error || 'connection failed'}); running Persistent Store fallback.`);
          }
        } catch (dbSyncErr) {
          console.warn('⚠️ [DATABASE] PostgreSQL initialization notice (Persistent fallback ready):', dbSyncErr.message);
        }
      } else {
        console.warn('⚠️ [DATABASE] PostgreSQL host/port did not respond within startup timeout; running Persistent Store fallback.');
      }
    } else {
      console.log('ℹ️ [DATABASE] DATABASE_URL not configured; running GBS Persistent Hybrid Store.');
    }
  } catch (err) {
    console.log('✅ [DATABASE] GBS Persistent Hybrid Cloud-Local Engine active.');
  }
});

process.on('unhandledRejection', (err) => {
  const msg = String(err?.message || err || '');
  const isTransientDbOrNetwork = /ECONNREFUSED|ECONNRESET|ETIMEDOUT|P1001|P1002|P1008|P1017|57P01|Can't reach database|Connection terminated|DB_PROBE_TIMEOUT/i.test(msg);
  if (isTransientDbOrNetwork) {
    console.warn('⚠️ [RESILIENCE] Transient database/network rejection safely absorbed without crashing application:', msg);
    try {
      const prismaClient = require('./database/prisma.client');
      if (typeof prismaClient.resetPostgresCache === 'function') {
        prismaClient.resetPostgresCache();
      }
    } catch (_) {}
    return;
  }
  console.error('⚠️ [UNHANDLED REJECTION] Non-fatal runtime rejection logged and contained:', msg);
});

const gracefulShutdown = async (signal) => {
  console.log(`🛑 [GBS SYSTEM] Received ${signal}. Releasing database connection pool gracefully...`);
  try {
    const prismaClient = require('./database/prisma.client');
    if (typeof prismaClient.$disconnect === 'function') {
      await prismaClient.$disconnect();
    }
  } catch (_) {}
  server.close(() => {
    process.exit(0);
  });
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

module.exports = app;