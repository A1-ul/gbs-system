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
const { initializeSocket } = require('./socket/socketServer');

// GBS Master Architecture - User Registration Count & Verification Engine mounted
const app = express();

// Security Middlewares
app.use(helmet());
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

// Request Parsing & Compression
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(cookieParser());
app.use(compression());

if (envConfig.env === 'development') {
  app.use(morgan('dev'));
}

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'GBS Enterprise Backend is online and operational.',
    timestamp: new Date().toISOString()
  });
});
app.get('/api/v1/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'GBS Enterprise Backend is online and operational.',
    timestamp: new Date().toISOString()
  });
});

// API Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/tenants', tenantRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/academics', academicRoutes);
app.use('/api/v1/academic', academicRoutes);
app.use('/api/v1/finance', financeRoutes);
app.use('/api/v1/fees', financeRoutes);
app.use('/api/v1/voice-auth', voiceAuthRoutes);
app.use('/api/v1/security/voice', voiceAuthRoutes);
app.use('/api/v1/ai-exam', aiExamRoutes);
app.use('/api/v1/tracking', trackingRoutes);
app.use('/api/v1/location', trackingRoutes);
app.use('/api/v1/dev-control', devControlRoutes);
app.use('/api/v1/developer-control-center', devControlRoutes);
app.use('/api/v1/timetables', timetableRoutes);
app.use('/api/v1/timetable', timetableRoutes);
app.use('/api/v1/attendance', attendanceRoutes);
app.use('/api/v1/assignments', assignmentRoutes);
app.use('/api/v1/assignment', assignmentRoutes);
app.use('/api/v1/meetings', meetingRoutes);
app.use('/api/v1/meeting', meetingRoutes);
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

// Production Frontend Static Asset Delivery & Single Page Application (SPA) Fallback
const candidateDistPaths = [
  path.resolve(__dirname, '../../public'),
  path.resolve(__dirname, '../../../frontend/dist'),
  path.resolve(__dirname, '../../dist')
];
const frontendDistPath = candidateDistPaths.find(p => fs.existsSync(p));
if (frontendDistPath) {
  app.use(express.static(frontendDistPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/health')) {
      return next();
    }
    const indexHtml = path.join(frontendDistPath, 'index.html');
    if (fs.existsSync(indexHtml)) {
      return res.sendFile(indexHtml);
    }
    next();
  });
}

// Unhandled route handler
app.all('*', (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

// Central Error Handler
app.use(errorHandler);

const PORT = envConfig.port || 5000;
const HOST = process.env.HOST || '0.0.0.0';

const server = app.listen(PORT, HOST, async () => {
  console.log(`🚀 [GBS SYSTEM] Server running on http://${HOST}:${PORT} (LAN & Mobile accessible) in ${envConfig.env} mode.`);
  try {
    initializeSocket(server);
    if (process.env.DATABASE_URL) {
      try {
        console.log('🔄 [DATABASE] Ensuring PostgreSQL schema tables exist...');
        const prismaClient = require('./database/prisma.client');
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
        `).catch(() => {});

        const { execSync } = require('child_process');
        execSync('npx prisma db push --skip-generate --accept-data-loss', { stdio: ['ignore', 'inherit', 'inherit'] });
        console.log('✅ [DATABASE] PostgreSQL schema tables verified.');
      } catch (dbSyncErr) {
        console.warn('⚠️ [DATABASE] Schema sync note:', dbSyncErr.message);
      }
    }
    const defaultData = await authService.seedDefaultAdmin();
    console.log(`✅ [DATABASE] Default Tenant '${defaultData.tenant.code}' & Super Admin seeded.`);
  } catch (err) {
    console.warn(`⚠️ [DATABASE] Default seed note:`, err.message);
  }
});

process.on('unhandledRejection', (err) => {
  console.error('UNHANDLED REJECTION! 💥 Shutting down...', err);
  server.close(() => {
    process.exit(1);
  });
});

module.exports = app;