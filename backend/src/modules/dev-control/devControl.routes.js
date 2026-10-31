'use strict';

const express = require('express');
const devControlController = require('./devControl.controller');

const router = express.Router();

// 1. Authentication & PIN Security
router.post('/auth/login', devControlController.devLogin);
router.post('/verify-pin', devControlController.verifyPin);

// 2. Real-Time Telemetry & Monitoring (Step 33)
router.get('/metrics', devControlController.getMetrics);
router.get('/telemetry', devControlController.getMetrics);

// 3. Developer Tenant Registration Console (Actual DB Counts)
router.get('/tenant-console', devControlController.getTenantConsole);

// 4. Enterprise Countdown Engine (Step 36)
router.get('/countdowns', devControlController.getCountdowns);

// 5. Developer Tenant Command Center (Actions)
router.post('/tenants/:id/action', devControlController.tenantAction);

// 6. System Lock & Remote Management (Step 35)
router.post('/toggle-lock', devControlController.toggleLock);
router.post('/system-lock', devControlController.toggleLock);
router.post('/system/lock', devControlController.toggleLock);

// 7. Backup & Disaster Recovery (Step 37)
router.post('/backup-now', devControlController.triggerBackup);
router.post('/backup/trigger', devControlController.triggerBackup);
router.get('/backups', devControlController.getBackups);
router.delete('/backups/:id', devControlController.deleteBackup);
router.post('/backups/batch-delete', devControlController.batchDeleteBackups);

// 8. Subscription Expiry & Auto-Lock Process
router.post('/auto-lock-process', devControlController.autoLockProcess);

// 9. Remote Service Controls
router.post('/service-action', devControlController.serviceAction);

// 10. Facial Liveness & Biometric Verification (Blueprint Box 11, Step 1b & 2b)
router.post('/facial-verify', devControlController.facialVerify);
router.post('/security/facial-verify', devControlController.facialVerify);

// 11. System Infrastructure Alerts (Blueprint Box 9 & 10)
router.get('/alerts', devControlController.getAlerts);
router.post('/alerts', devControlController.createAlert);
router.patch('/alerts/:id/resolve', devControlController.resolveAlert);
router.delete('/alerts/:id', devControlController.deleteAlert);
router.post('/alerts/batch-resolve', devControlController.batchResolveAlerts);
router.post('/alerts/batch-delete', devControlController.batchDeleteAlerts);

// 12. System Audit Logs & Diagnostics (Blueprint Box 9)
router.get('/audit-logs', devControlController.getLogs);
router.get('/logs', devControlController.getLogs);

// 13. Deployment History & Release Control
router.get('/deployments', devControlController.getDeployments);
router.post('/deployments/rollback', devControlController.rollbackDeployment);

// 14. Enterprise Licensing & Subscription Controls
router.get('/licenses', devControlController.getLicenses);
router.post('/licenses', devControlController.issueLicense);

// 15. Developer Tenant Onboarding & Mobile OTP Provisioning
router.post('/tenants/onboard-otp', devControlController.initiateTenantOnboard);
router.post('/tenants/verify-onboard', devControlController.verifyTenantOnboard);
router.get('/tenants/onboarded', devControlController.getOnboardedTenants);

// 16. Developer Tenant Location Locator (Search by Headmaster's Mobile Contact)
router.get('/tenant-locator', devControlController.locateTenantByHeadmaster);

// 17. Tenant Subscription Status Query (For Headmaster & Admin Portal)
router.get('/tenant-subscription/:idOrCode', devControlController.getTenantSubscription);
router.get('/tenants/:idOrCode/subscription', devControlController.getTenantSubscription);

module.exports = router;


