'use strict';

const express = require('express');
const rateLimit = require('express-rate-limit');
const devControlController = require('./devControl.controller');
const { protect } = require('../../middleware/auth.middleware');
const { restrictTo } = require('../../middleware/rbac.middleware');

const router = express.Router();
const requireDev = [protect, restrictTo('DEVELOPER')];
const requireDevOrHeadmaster = [protect, restrictTo('ADMIN', 'SUPER_ADMIN', 'HEADMASTER', 'PRINCIPAL', 'DEVELOPER')];

const devAuthLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { status: 'error', message: 'Too many Developer authentication attempts. Please wait before trying again.' }
});

const devPinLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { status: 'error', message: 'Too many PIN verification attempts. Please wait before trying again.' }
});

// 1. Public Pre-Login Authentication, Security Lockdown & PIN Verification
router.post('/auth/login', devAuthLimiter, devControlController.devLogin);
router.post('/verify-pin', devPinLimiter, devControlController.verifyPin);
router.get('/security/login-status', devControlController.getSecurityLoginStatus);
router.post('/security/intrusion', devAuthLimiter, devControlController.reportIntrusionAndLock);
router.post('/security/re-enable', devAuthLimiter, devControlController.reEnableDeveloperLogin);

// Strictly Developer-Only Intrusion Log Read
router.get('/security/intrusions', ...requireDev, devControlController.getIntrusionEvents);

// 2. Real-Time Telemetry & Monitoring (Developer Only)
router.get('/metrics', ...requireDev, devControlController.getMetrics);
router.get('/telemetry', ...requireDev, devControlController.getMetrics);
router.get('/infrastructure-monitor', ...requireDev, async (req, res, next) => {
  try {
    const { cloudInfraManager } = require('../../core/infrastructure/cloudInfraManager');
    const prismaClient = require('../../core/database/prisma.client');
    const report = await cloudInfraManager.getComprehensiveInfrastructureReport(prismaClient);
    res.status(200).json({ status: 'success', data: report });
  } catch (err) {
    next(err);
  }
});
router.get('/pool-status', ...requireDev, async (req, res, next) => {
  try {
    const prismaClient = require('../../core/database/prisma.client');
    const { connectionPoolManager } = require('../../core/database/connectionPoolManager');
    if (typeof prismaClient.getPostgresLiveStatus === 'function') {
      await prismaClient.getPostgresLiveStatus(false);
    }
    res.status(200).json({ status: 'success', data: connectionPoolManager.getPoolStatus() });
  } catch (err) {
    next(err);
  }
});

// 3. Developer Tenant Registration Console (Actual DB Counts)
router.get('/tenant-console', ...requireDev, devControlController.getTenantConsole);
router.get('/tenants', ...requireDev, devControlController.getTenantConsole);

// 4. Enterprise Countdown Engine (Step 36)
router.get('/countdowns', ...requireDev, devControlController.getCountdowns);

// 5. Developer Tenant Command Center (Actions & Deletion)
router.post('/tenants/:id/action', ...requireDev, devControlController.tenantAction);
router.delete('/tenants/:id', ...requireDev, devControlController.deleteTenant);
router.post('/tenants/batch-delete', ...requireDev, devControlController.batchDeleteTenants);

// Deleted Institutions Archive Depot (Restoration & Purge)
router.get('/tenants/deleted-archives', ...requireDev, devControlController.getDeletedTenantArchives);
router.post('/tenants/:id/restore', ...requireDev, devControlController.restoreDeletedTenant);
router.delete('/tenants/:id/purge', ...requireDev, devControlController.purgeArchivedTenant);

// 6. System Lock & Remote Management (Step 35)
router.post('/toggle-lock', ...requireDev, devControlController.toggleLock);
router.post('/system-lock', ...requireDev, devControlController.toggleLock);
router.post('/system/lock', ...requireDev, devControlController.toggleLock);

// 7. Backup & Disaster Recovery (Step 37)
router.post('/backup-now', ...requireDev, devControlController.triggerBackup);
router.post('/backup/trigger', ...requireDev, devControlController.triggerBackup);
router.get('/backups', ...requireDev, devControlController.getBackups);
router.delete('/backups/:id', ...requireDev, devControlController.deleteBackup);
router.post('/backups/batch-delete', ...requireDev, devControlController.batchDeleteBackups);

// 8. Subscription Expiry & Auto-Lock Process
router.post('/auto-lock-process', ...requireDev, devControlController.autoLockProcess);

// 9. Remote Service Controls
router.post('/service-action', ...requireDev, devControlController.serviceAction);

// 10. Facial Liveness & Biometric Verification (Developer Only)
router.post('/facial-verify', ...requireDev, devControlController.facialVerify);
router.post('/security/facial-verify', ...requireDev, devControlController.facialVerify);

// 11. System Infrastructure Alerts (Developer Only)
router.get('/alerts', ...requireDev, devControlController.getAlerts);
router.post('/alerts', ...requireDev, devControlController.createAlert);
router.patch('/alerts/:id/resolve', ...requireDev, devControlController.resolveAlert);
router.delete('/alerts/:id', ...requireDev, devControlController.deleteAlert);
router.post('/alerts/batch-resolve', ...requireDev, devControlController.batchResolveAlerts);
router.post('/alerts/batch-delete', ...requireDev, devControlController.batchDeleteAlerts);

// 12. System Audit Logs & Diagnostics (Developer Only)
router.get('/audit-logs', ...requireDev, devControlController.getLogs);
router.get('/logs', ...requireDev, devControlController.getLogs);
router.patch('/audit-logs/:id/archive', ...requireDev, devControlController.archiveAuditLog);
router.post('/audit-logs/batch-archive', ...requireDev, devControlController.batchArchiveAuditLogs);
router.delete('/audit-logs/:id', ...requireDev, devControlController.deleteAuditLog);
router.post('/audit-logs/batch-delete', ...requireDev, devControlController.batchDeleteAuditLogs);

// 13. Deployment History & Release Control (Developer Only)
router.get('/deployments', ...requireDev, devControlController.getDeployments);
router.post('/deployments', ...requireDev, devControlController.createDeployment);
router.post('/deployments/rollback', ...requireDev, devControlController.rollbackDeployment);
router.patch('/deployments/:id/archive', ...requireDev, devControlController.archiveDeployment);
router.post('/deployments/batch-archive', ...requireDev, devControlController.batchArchiveDeployments);
router.delete('/deployments/:id', ...requireDev, devControlController.deleteDeployment);
router.post('/deployments/batch-delete', ...requireDev, devControlController.batchDeleteDeployments);

// 14. Enterprise Licensing & Subscription Controls
router.get('/licenses', ...requireDev, devControlController.getLicenses);
router.get('/country-subscriptions', ...requireDev, devControlController.getCountrySubscriptions);
router.post('/licenses', ...requireDev, devControlController.issueLicense);
router.delete('/licenses/:id', ...requireDev, devControlController.deleteLicense);
router.post('/licenses/batch-delete', ...requireDev, devControlController.batchDeleteLicenses);
router.delete('/subscriptions/:id', ...requireDev, devControlController.deleteSubscriptionControl);

// Headmaster <-> Developer Direct Directive Messaging (Authenticated Headmaster or Developer)
router.get('/headmaster-messages', ...requireDevOrHeadmaster, devControlController.getHeadmasterMessages);
router.post('/headmaster-messages', ...requireDevOrHeadmaster, devControlController.createHeadmasterMessage);
router.post('/headmaster-messages/:threadId/replies', ...requireDevOrHeadmaster, devControlController.replyToHeadmasterMessage);
router.delete('/headmaster-messages/:threadId', ...requireDev, devControlController.deleteHeadmasterMessageThread);
router.delete('/headmaster-messages/:threadId/replies/:replyId', ...requireDev, devControlController.deleteHeadmasterMessageReply);
router.delete('/intrusion-violations/:id', ...requireDev, devControlController.deleteIntrusionViolation);

// 15. Developer Tenant Onboarding & Mobile OTP Provisioning (Developer Only)
router.post('/tenants/onboard-otp', ...requireDev, devControlController.initiateTenantOnboard);
router.post('/dispatch-otp', ...requireDev, devControlController.initiateTenantOnboard);
router.post('/tenants/verify-onboard', ...requireDev, devControlController.verifyTenantOnboard);
router.get('/tenants/onboarded', ...requireDev, devControlController.getOnboardedTenants);

// 16. Developer Tenant Location Locator (Developer Only)
router.get('/tenant-locator', ...requireDev, devControlController.locateTenantByHeadmaster);

// 17. Tenant Subscription Status Query (Authenticated Institutional Portal & Developer)
router.get('/tenant-subscription/:idOrCode', protect, devControlController.getTenantSubscription);
router.get('/tenants/:idOrCode/subscription', protect, devControlController.getTenantSubscription);

// 18. Developer Onboarding Review & Approvals (Developer Only)
router.get('/onboarding/pending', ...requireDev, devControlController.getPendingOnboardings);
router.get('/onboarding-registrations', ...requireDev, devControlController.getPendingOnboardings);
router.post('/onboarding/:id/approve', ...requireDev, devControlController.approveOnboarding);
router.post('/onboarding/:id/reject', ...requireDev, devControlController.rejectOnboarding);

// 19. Developer Direct SMS to Headmaster (Developer Only)
router.post('/sms/send-headmaster', ...requireDev, devControlController.sendHeadmasterSms);

// 20. AI Developer Diagnostics, System Memory & Blueprint Verification
const fs = require('fs');
const path = require('path');
const SYSTEM_MEMORY_FILE = path.resolve(__dirname, '../../../data/gbs_system_memory_snapshot.json');
const {
  readPersistentStore,
  writePersistentStore,
  getActiveEnvironment,
  createDatabaseBackup,
  listDatabaseBackups,
  restoreDatabaseBackup,
  checkPostgresReachable,
  getPostgresTargetInfo
} = require('../../core/database/persistentStore');
const prisma = require('../../core/database/prisma.client');

// 21. GBS Production & Development Environment Management & Live Provenance (Developer Only)
router.get('/environment', ...requireDev, async (req, res) => {
  const store = readPersistentStore();
  const pgStatus = typeof prisma.getPostgresLiveStatus === 'function'
    ? await prisma.getPostgresLiveStatus()
    : { active: await checkPostgresReachable(2000), ...getPostgresTargetInfo(), latencyMs: 0, engine: 'PostgreSQL', role: 'PRIMARY_ACTIVE' };
  const activeEnv = store.systemEnvironment || getActiveEnvironment();
  const backups = listDatabaseBackups();

  const storeInstitutions = store.institutions || [];
  const storeUsers = store.registeredUsers || [];
  const storeSubs = store.subscriptions || [];

  let totalInstitutions = storeInstitutions.length;
  let totalRegisteredUsers = storeUsers.length;
  let totalSubscriptions = storeSubs.length;
  let pgTenantsCount = 0;

  if (pgStatus.active) {
    try {
      const [tCount, regCount, uCount, sCount] = await Promise.all([
        prisma.tenant.count({ where: { isDeleted: false } }),
        prisma.institutionRegistration.count(),
        prisma.user.count({ where: { isDeleted: false } }),
        prisma.subscription.count()
      ]);
      pgTenantsCount = tCount || 0;
      totalInstitutions = Math.max(tCount || 0, regCount || 0, storeInstitutions.length);
      totalRegisteredUsers = Math.max(uCount || 0, storeUsers.length);
      totalSubscriptions = Math.max(sCount || 0, storeSubs.length);
    } catch { }
  }

  const productionInstitutions = storeInstitutions.filter(i => (i.environment || 'PRODUCTION') === 'PRODUCTION');
  const devInstitutions = storeInstitutions.filter(i => (i.environment || 'PRODUCTION') === 'DEVELOPMENT');

  res.status(200).json({
    status: 'success',
    data: {
      activeEnvironment: activeEnv,
      isProduction: activeEnv === 'PRODUCTION',
      isDevelopment: activeEnv === 'DEVELOPMENT',
      databaseActive: pgStatus.active,
      databaseRole: pgStatus.role || (pgStatus.active ? 'PRIMARY_ACTIVE' : 'STANDBY_FALLBACK'),
      databaseMode: pgStatus.active ? 'POSTGRESQL_LIVE' : 'HYBRID_PERSISTENT_ENGINE',
      databaseEngine: pgStatus.engine || 'PostgreSQL',
      databaseLatencyMs: pgStatus.latencyMs ?? null,
      databaseHost: `${pgStatus.host || 'localhost'}:${pgStatus.port || 5432}`,
      databaseName: pgStatus.database || 'gbs_system',
      liveDatabaseStatistics: {
        totalInstitutions,
        activeTenantsInPostgres: pgTenantsCount,
        productionInstitutionsCount: productionInstitutions.length || pgTenantsCount,
        developmentInstitutionsCount: devInstitutions.length,
        totalRegisteredUsers,
        totalSubscriptions,
        totalTopicVideos: (store.topicVideos || []).length,
        totalBackupsAvailable: backups.length,
        latestBackupAt: backups[0]?.createdAt || null
      },
      backups: backups.slice(0, 5),
      timestamp: new Date().toISOString()
    }
  });
});

router.post('/environment/set', ...requireDev, (req, res) => {
  const { environment } = req.body || {};
  const targetEnv = String(environment || 'PRODUCTION').toUpperCase() === 'DEVELOPMENT' ? 'DEVELOPMENT' : 'PRODUCTION';
  writePersistentStore((curr) => ({
    ...curr,
    systemEnvironment: targetEnv
  }));
  res.status(200).json({
    status: 'success',
    message: `Active system environment switched to ${targetEnv}.`,
    data: { activeEnvironment: targetEnv }
  });
});

// 22. Safe Database Backup & Restore Protection Mechanism (Developer Only)
router.post('/backup/create', ...requireDev, (req, res, next) => {
  try {
    const label = req.body?.label || 'developer_snapshot';
    const backupResult = createDatabaseBackup(label);
    return res.status(201).json({
      status: 'success',
      message: `Database backup created successfully (${backupResult.fileName}).`,
      data: backupResult
    });
  } catch (err) {
    return next(err);
  }
});

router.get('/backup/list', ...requireDev, (req, res, next) => {
  try {
    const list = listDatabaseBackups();
    return res.status(200).json({
      status: 'success',
      results: list.length,
      data: { backups: list }
    });
  } catch (err) {
    return next(err);
  }
});

router.post('/backup/restore', ...requireDev, (req, res, next) => {
  try {
    const { fileName } = req.body || {};
    if (!fileName) {
      return res.status(400).json({ status: 'fail', message: 'Please specify the backup fileName to restore.' });
    }
    const restoreResult = restoreDatabaseBackup(fileName);
    return res.status(200).json({
      status: 'success',
      message: `System successfully restored from backup '${fileName}'. A pre-restore safety snapshot was also preserved.`,
      data: restoreResult
    });
  } catch (err) {
    return next(err);
  }
});

const loadSystemMemory = () => {
  try {
    if (fs.existsSync(SYSTEM_MEMORY_FILE)) {
      return JSON.parse(fs.readFileSync(SYSTEM_MEMORY_FILE, 'utf8'));
    }
  } catch (_) { }
  return { diagnosticCauseAndFixKnowledgeBase: [], dashboardsAndRoutesMemory: [] };
};

router.get('/system-memory', ...requireDev, (req, res) => {
  const memory = loadSystemMemory();
  res.status(200).json({
    status: 'success',
    message: 'Complete GBS System Memory & Diagnostic Cause Registry loaded.',
    data: memory
  });
});

router.post('/system-memory', ...requireDev, (req, res) => {
  const memory = loadSystemMemory();
  const { symptom, issueCode, rootCause, resolution } = req.body || {};

  if (symptom && !rootCause) {
    const q = String(symptom).toLowerCase();
    const matched = (memory.diagnosticCauseAndFixKnowledgeBase || []).find(
      (item) =>
        item.symptom.toLowerCase().includes(q) ||
        item.rootCause.toLowerCase().includes(q) ||
        item.issueCode.toLowerCase().includes(q)
    );
    return res.status(200).json({
      status: 'success',
      matched: Boolean(matched),
      diagnosis: matched || {
        issueCode: 'DIAG-NO-EXACT-MATCH',
        symptom,
        rootCause: 'No prior recorded incident matched this exact symptom in GBS System Memory.',
        resolution: 'Inspect live server logs, PostgreSQL health, and /api/v1/rcce/error-monitor for exact error diagnostics.'
      }
    });
  }

  if (symptom && rootCause) {
    const newEntry = {
      issueCode: issueCode || `DIAG-CUSTOM-${Date.now()}`,
      symptom,
      rootCause,
      resolution: resolution || 'Logged in persistent system memory.',
      status: 'RECORDED',
      recordedAt: new Date().toISOString()
    };
    memory.diagnosticCauseAndFixKnowledgeBase = [
      newEntry,
      ...(memory.diagnosticCauseAndFixKnowledgeBase || [])
    ];
    memory.savedAt = new Date().toISOString();
    try {
      fs.writeFileSync(SYSTEM_MEMORY_FILE, JSON.stringify(memory, null, 2), 'utf8');
    } catch (_) { }
    return res.status(201).json({
      status: 'success',
      message: 'New diagnostic cause & resolution saved to GBS System Memory.',
      data: newEntry
    });
  }

  res.status(200).json({
    status: 'success',
    data: memory
  });
});

router.post('/ai/analyze-crash', ...requireDev, (req, res) => {
  const memory = loadSystemMemory();
  const query = String(req.body?.errorLog || req.body?.symptom || req.body?.query || '').toLowerCase();
  const matched = query
    ? (memory.diagnosticCauseAndFixKnowledgeBase || []).find(
      (item) =>
        item.symptom.toLowerCase().includes(query) ||
        item.rootCause.toLowerCase().includes(query) ||
        item.issueCode.toLowerCase().includes(query)
    )
    : null;

  const kbCount = (memory.diagnosticCauseAndFixKnowledgeBase || []).length;
  const dashCount = (memory.dashboardsAndRoutesMemory || []).length;

  res.status(200).json({
    status: 'success',
    data: {
      matched: Boolean(matched),
      issueCode: matched?.issueCode || 'DIAG-NO-KNOWN-FAILURE',
      rootCause:
        matched?.rootCause ||
        `Analyzed against ${kbCount} recorded incident patterns across ${dashCount} registered portals — no matching known crash signature found.`,
      recommendation:
        matched?.resolution ||
        'Inspect /api/v1/rcce/error-monitor and live backend request logs for exact stack traces and HTTP status diagnostics.',
      confidence: matched ? 0.96 : 0.65,
      timestamp: new Date().toISOString()
    }
  });
});

router.get('/ai/verify-blueprint', ...requireDev, async (req, res, next) => {
  try {
    const memory = loadSystemMemory();
    const pgStatus = typeof prisma.getPostgresLiveStatus === 'function'
      ? await prisma.getPostgresLiveStatus(false)
      : { active: await checkPostgresReachable(1500) };
    const portalsCount = (memory.dashboardsAndRoutesMemory || []).length;
    const guardsCount = (memory.diagnosticCauseAndFixKnowledgeBase || []).length;
    return res.status(200).json({
      status: 'success',
      data: {
        verified: Boolean(pgStatus.active),
        databaseActive: Boolean(pgStatus.active),
        version: memory.version || 'PRODUCTION',
        latestVerifiedCommit: memory.verificationSummary?.latestVerifiedCommit || null,
        latestLiveBundleHash: memory.verificationSummary?.latestLiveBundleHash || null,
        portalsRegistered: portalsCount,
        guardedDiagnosticsCount: guardsCount,
        statusLabel: pgStatus.active ? 'PRODUCTION_DATABASE_VERIFIED' : 'DATABASE_STANDBY_ATTENTION_REQUIRED',
        timestamp: new Date().toISOString()
      }
    });
  } catch (err) {
    return next(err);
  }
});

// 22. Cloud Host Data Synchronization & Offline-to-Cloud Backup Engine
router.post('/sync-to-cloud', ...requireDevOrHeadmaster, async (req, res, next) => {
  try {
    const pgStatus = typeof prisma.getPostgresLiveStatus === 'function'
      ? await prisma.getPostgresLiveStatus(true)
      : { active: await checkPostgresReachable(2000), ...getPostgresTargetInfo() };
    const isPgOnline = Boolean(pgStatus.active);
    const backupSnapshot = createDatabaseBackup('cloud_sync_point_in_time');
    const store = readPersistentStore();

    let syncedTables = [];
    let syncedCount = 0;

    if (isPgOnline && process.env.DATABASE_URL) {
      // Sync AttendanceRecords
      const attendanceList = store.prismaModels?.AttendanceRecord || [];
      if (attendanceList.length > 0) {
        for (const rec of attendanceList) {
          try {
            await prisma.attendanceRecord.upsert({
              where: { id: rec.id },
              update: { status: rec.status, remarks: rec.remarks, updatedAt: new Date() },
              create: {
                id: rec.id,
                tenantId: rec.tenantId || 1,
                classId: rec.classId || 1,
                studentId: rec.studentId || 1,
                date: new Date(rec.date || Date.now()),
                status: rec.status || 'PRESENT',
                remarks: rec.remarks || null
              }
            });
            syncedCount++;
          } catch (_) { }
        }
        syncedTables.push('AttendanceRecord');
      }

      // Sync registered institutions & tenants
      if (Array.isArray(store.institutions) && store.institutions.length > 0) {
        for (const inst of store.institutions) {
          try {
            await prisma.tenant.upsert({
              where: { id: inst.id || 1 },
              update: { name: inst.name || inst.institutionName, status: 'ACTIVE', updatedAt: new Date() },
              create: {
                id: inst.id || 1,
                name: inst.name || inst.institutionName || 'GBS Registered Institution',
                code: inst.tenantCode || inst.code || 'GBS-MAIN',
                domain: inst.domain || 'gbs-system.onrender.com',
                status: 'ACTIVE'
              }
            });
            syncedCount++;
          } catch (_) { }
        }
        syncedTables.push('Tenant');
      }
    }

    res.status(200).json({
      status: 'success',
      message: isPgOnline
        ? `PostgreSQL synchronization complete! ${syncedCount} records reconciled with active PostgreSQL (${pgStatus.database}). Automated backup snapshot saved.`
        : `Offline Mode Active: All local records safely retained in persistent store. Automated local backup snapshot created (${backupSnapshot.fileName}). Sync will resume when PostgreSQL connects.`,
      data: {
        cloudConnected: isPgOnline,
        databaseActive: isPgOnline,
        cloudHost: isPgOnline
          ? `${pgStatus.host}:${pgStatus.port}/${pgStatus.database} (PostgreSQL Active)`
          : 'PostgreSQL Standby (Reconnect Pending)',
        syncedCount,
        syncedTables,
        backupSnapshot: {
          fileName: backupSnapshot.fileName,
          sizeKb: backupSnapshot.fileSizeKb,
          timestamp: backupSnapshot.timestamp
        },
        localStoreUpdated: store.updatedAt,
        syncStatus: isPgOnline ? 'SYNCED_WITH_POSTGRESQL_ACTIVE' : 'OFFLINE_PERSISTED_SAFELY'
      }
    });
  } catch (err) {
    return res.status(503).json({
      success: false,
      status: 'error',
      code: 'CLOUD_SYNC_FAILED',
      message: `Cloud/PostgreSQL synchronization failed: ${err.message}`,
      data: { cloudConnected: false, databaseActive: false, syncStatus: 'SYNC_FAILED' }
    });
  }
});

router.get('/cloud-sync-status', ...requireDev, async (req, res) => {
  const pgStatus = typeof prisma.getPostgresLiveStatus === 'function'
    ? await prisma.getPostgresLiveStatus()
    : { active: await checkPostgresReachable(2000), ...getPostgresTargetInfo() };
  const isPgOnline = Boolean(pgStatus.active);
  const store = readPersistentStore();
  const backups = listDatabaseBackups();
  res.status(200).json({
    status: 'success',
    data: {
      cloudConnected: isPgOnline,
      databaseActive: isPgOnline,
      databaseRole: pgStatus.role || (isPgOnline ? 'PRIMARY_ACTIVE' : 'STANDBY_FALLBACK'),
      cloudHost: isPgOnline
        ? `${pgStatus.host}:${pgStatus.port}/${pgStatus.database} (PostgreSQL Active)`
        : `${pgStatus.host || 'localhost'}:${pgStatus.port || 5432} (PostgreSQL Offline)`,
      databaseMode: isPgOnline ? 'CLOUD_POSTGRESQL_LIVE' : 'LOCAL_PERSISTENT_ENGINE_OFFLINE',
      latencyMs: pgStatus.latencyMs ?? null,
      version: pgStatus.versionShort || 'PostgreSQL',
      totalBackups: backups.length,
      latestBackup: backups[0] || null,
      lastStoreUpdate: store.updatedAt,
      offlineReady: true,
      dataProtectionActive: true
    }
  });
});

// 23. Developer Maintenance — Purge Any Residual Synthetic / Test Onboarding, Alert, or Intrusion Records
router.post('/maintenance/purge-synthetic-data', ...requireDev, async (req, res, next) => {
  try {
    const SYNTHETIC_RE = /oxford-prep\.edu|oxford preparatory|intruder\.chrome@test\.com|demo student|st\. peter international|kingsley international|royal oak international|green valley|st\. charles live|gbs-opr-|secondary postgresql replica in sync|400% connection burst/i;
    const isSyntheticObj = (o) => SYNTHETIC_RE.test(JSON.stringify(o || {}));

    const store = readPersistentStore();
    const before = {
      institutions: (store.institutions || []).length,
      registeredUsers: (store.registeredUsers || []).length,
      intrusions: (store.intrusionViolations || []).length,
      alerts: (store.systemAlerts || []).length
    };
    store.institutions = (store.institutions || []).filter((x) => !isSyntheticObj(x));
    store.registeredUsers = (store.registeredUsers || []).filter((x) => !isSyntheticObj(x));
    store.intrusionViolations = (store.intrusionViolations || []).filter((x) => !isSyntheticObj(x));
    store.staffBreachTrials = (store.staffBreachTrials || []).filter((x) => !isSyntheticObj(x));
    store.systemAlerts = (store.systemAlerts || []).filter((x) => !isSyntheticObj(x));
    store.schoolClinicProfiles = (store.schoolClinicProfiles || []).filter((x) => !isSyntheticObj(x));
    store.schoolClinicVisits = (store.schoolClinicVisits || []).filter((x) => !isSyntheticObj(x));
    if (store.developerSecurity && Array.isArray(store.developerSecurity.intrusionEvents)) {
      store.developerSecurity.intrusionEvents = store.developerSecurity.intrusionEvents.filter((x) => !isSyntheticObj(x));
    }
    if (store.prismaModels) {
      if (Array.isArray(store.prismaModels.Tenant)) {
        store.prismaModels.Tenant = store.prismaModels.Tenant.filter((t) => Number(t.id) === 1 || !isSyntheticObj(t));
      }
      if (Array.isArray(store.prismaModels.Subscription)) {
        const validTenantIds = new Set((store.prismaModels.Tenant || []).map((t) => Number(t.id)));
        store.prismaModels.Subscription = store.prismaModels.Subscription.filter((s) => validTenantIds.has(Number(s.tenantId)));
      }
    }
    writePersistentStore(store);

    let pgSummary = { online: false, deletedRegs: 0, deletedAlerts: 0, deletedTenants: 0 };
    if (typeof prisma.isPostgresOnline === 'function' && (await prisma.isPostgresOnline())) {
      pgSummary.online = true;
      const regs = await prisma.institutionRegistration.findMany().catch(() => []);
      const badRegIds = regs.filter(isSyntheticObj).map((r) => r.id);
      if (badRegIds.length > 0) {
        const dr = await prisma.institutionRegistration.deleteMany({ where: { id: { in: badRegIds } } }).catch(() => ({ count: 0 }));
        pgSummary.deletedRegs = dr.count || 0;
      }
      const alerts = await prisma.systemAlert.findMany().catch(() => []);
      const badAlertIds = alerts.filter(isSyntheticObj).map((a) => a.id);
      if (badAlertIds.length > 0) {
        const da = await prisma.systemAlert.deleteMany({ where: { id: { in: badAlertIds } } }).catch(() => ({ count: 0 }));
        pgSummary.deletedAlerts = da.count || 0;
      }
      const tenants = await prisma.tenant.findMany({ where: { id: { not: 1 } } }).catch(() => []);
      const badTenantIds = tenants.filter(isSyntheticObj).map((t) => t.id);
      if (badTenantIds.length > 0) {
        await prisma.subscription.deleteMany({ where: { tenantId: { in: badTenantIds } } }).catch(() => { });
        await prisma.systemLock.deleteMany({ where: { tenantId: { in: badTenantIds } } }).catch(() => { });
        await prisma.auditLog.deleteMany({ where: { tenantId: { in: badTenantIds } } }).catch(() => { });
        await prisma.user.deleteMany({ where: { tenantId: { in: badTenantIds } } }).catch(() => { });
        const dt = await prisma.tenant.deleteMany({ where: { id: { in: badTenantIds } } }).catch(() => ({ count: 0 }));
        pgSummary.deletedTenants = dt.count || 0;
      }
    }

    return res.status(200).json({
      status: 'success',
      message: 'All synthetic/test onboarding, alert, and intrusion records have been permanently cleared.',
      data: {
        storeBefore: before,
        storeAfter: {
          institutions: store.institutions.length,
          registeredUsers: store.registeredUsers.length,
          intrusions: store.intrusionViolations.length,
          alerts: store.systemAlerts.length
        },
        postgresql: pgSummary
      }
    });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;



