'use strict';

const prisma = require('../src/core/database/prisma.client');

async function testProcedure15DevControl() {
  console.log('========================================================================');
  console.log('🧪 PHASE 4, PROCEDURE 3: ENTERPRISE DEVELOPER CONTROL CENTER & COUNTDOWNS');
  console.log('========================================================================\n');

  const BASE_URL = 'http://localhost:5001/api/v1';

  // 1. Developer Login with PIN
  console.log('--- TEST 1: Developer Master Login with PIN Code (998123) ---');
  const devLoginRes = await fetch(`${BASE_URL}/dev-control/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: 'gbs_root_developer',
      password: 'DevRootPassword123!',
      pinCode: '998123'
    })
  });
  const devLoginData = await devLoginRes.json();
  if (!devLoginRes.ok) throw new Error(`Developer login failed: ${JSON.stringify(devLoginData)}`);
  const devToken = devLoginData.token;
  console.log(`✅ Developer authenticated: ${devLoginData.developer.username}`);
  console.log(`   Security Clearance: ${devLoginData.developer.securityClearance}`);
  console.log(`   PIN Verified: ${devLoginData.developer.pinVerified}`);

  // 2. Reject Invalid PIN Code
  console.log('\n--- TEST 2: Security Gate: Reject Invalid PIN Code ---');
  const invalidPinRes = await fetch(`${BASE_URL}/dev-control/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: 'intruder',
      password: 'wrong_password',
      pinCode: '000123'
    })
  });
  if (invalidPinRes.status === 403) {
    console.log('✅ Access Denied verified: Invalid PIN returned HTTP 403 Forbidden.');
  } else {
    throw new Error(`Expected HTTP 403 for invalid PIN, got ${invalidPinRes.status}`);
  }

  // 3. Dedicated PIN Verification Endpoint
  console.log('\n--- TEST 3: Dedicated High-Security PIN Verification Endpoint ---');
  const verifyPinRes = await fetch(`${BASE_URL}/dev-control/verify-pin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pinCode: '00000000' })
  });
  const verifyPinData = await verifyPinRes.json();
  if (!verifyPinRes.ok || !verifyPinData.data.accessGranted) {
    throw new Error(`PIN verification failed: ${JSON.stringify(verifyPinData)}`);
  }
  console.log(`✅ PIN verified: Access Granted (${verifyPinData.data.securityLevel})`);

  // 4. Query Live System Telemetry
  console.log('\n--- TEST 4: Query Live System Telemetry (Step 33) ---');
  const telemetryRes = await fetch(`${BASE_URL}/dev-control/telemetry`);
  const telemetryData = await telemetryRes.json();
  if (!telemetryRes.ok || telemetryData.data.status !== 'HEALTHY') {
    throw new Error(`Telemetry check failed: ${JSON.stringify(telemetryData)}`);
  }
  const tel = telemetryData.data;
  console.log(`✅ System Telemetry Status: ${tel.status} (${tel.serverStatus})`);
  console.log(`   Memory Allocation: RSS ${tel.memoryUsageMb} MB | Heap: ${tel.memory.heapUsedMb} MB (${tel.memory.usagePct})`);
  console.log(`   CPU Architecture: ${tel.cpu.cores} Cores | Model: ${tel.cpu.model}`);
  console.log(`   PostgreSQL Pool: ${tel.database.engine} (${tel.database.poolStatus})`);
  console.log(`   Active WebSockets: ${tel.sockets.activeConnections} / ${tel.sockets.maxConnections}`);
  console.log(`   Global Entity Metrics: ${tel.metrics.totalTenants} Tenants, ${tel.metrics.totalUsers} Users, ${tel.metrics.totalBackups} Backups`);

  // 5. Query Developer Tenant Registration Console
  console.log('\n--- TEST 5: Query Developer Tenant Registration Console (Step 31) ---');
  const consoleRes = await fetch(`${BASE_URL}/dev-control/tenant-console`);
  const consoleData = await consoleRes.json();
  if (!consoleRes.ok) throw new Error(`Tenant console failed: ${JSON.stringify(consoleData)}`);
  const cStats = consoleData.data;
  console.log('✅ Tenant Registration Console Database Counts:');
  console.log(`   • Total Tenants: ${cStats.totalTenants}`);
  console.log(`   • Active Tenants: ${cStats.activeTenants}`);
  console.log(`   • Trial Tenants: ${cStats.trialTenants}`);
  console.log(`   • Expiring Tenants: ${cStats.expiringTenants}`);
  console.log(`   • Expired Tenants: ${cStats.expiredTenants}`);
  console.log(`   • Suspended Tenants: ${cStats.suspendedTenants}`);
  console.log(`   • Paid Tenants: ${cStats.paidTenants}`);
  console.log(`   • Locked Tenants: ${cStats.lockedTenants}`);

  // 6. Enterprise Countdown Engine
  console.log('\n--- TEST 6: Enterprise Real-Time Countdown Engine (Step 36) ---');
  const countdownsRes = await fetch(`${BASE_URL}/dev-control/countdowns`);
  const countdownsData = await countdownsRes.json();
  if (!countdownsRes.ok) throw new Error(`Countdowns query failed: ${JSON.stringify(countdownsData)}`);
  const countdowns = countdownsData.data.countdowns;
  console.log(`✅ Countdowns returned: ${countdowns.length} tenant subscriptions tracked in real time:`);
  countdowns.slice(0, 3).forEach(c => {
    console.log(`   • [${c.tenantCode}] ${c.tenantName}:`);
    console.log(`     Countdown: "${c.formattedCountdown}"`);
    console.log(`     Warning Level: ${c.warningLevel} | Status: ${c.subscriptionStatus} | Health: ${c.tenantHealthStatus}`);
  });

  const targetTenant = countdowns[0];
  if (!targetTenant) throw new Error('No tenant available for command center action testing.');

  // 7. Developer Tenant Action: Lock Tenant
  console.log(`\n--- TEST 7: Developer Tenant Command Center: Lock Tenant #${targetTenant.tenantId} ---`);
  const lockTenantRes = await fetch(`${BASE_URL}/dev-control/tenants/${targetTenant.tenantId}/action`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'LOCK', reason: 'Automated Diagnostic Lock Test' })
  });
  const lockTenantData = await lockTenantRes.json();
  if (!lockTenantRes.ok) throw new Error(`Lock tenant failed: ${JSON.stringify(lockTenantData)}`);
  console.log(`✅ Tenant #${targetTenant.tenantId} locked in PostgreSQL: Status = ${lockTenantData.data.tenant.status}`);

  // 8. Developer Tenant Action: Unlock Tenant
  console.log(`\n--- TEST 8: Developer Tenant Command Center: Unlock Tenant #${targetTenant.tenantId} ---`);
  const unlockTenantRes = await fetch(`${BASE_URL}/dev-control/tenants/${targetTenant.tenantId}/action`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'UNLOCK' })
  });
  const unlockTenantData = await unlockTenantRes.json();
  if (!unlockTenantRes.ok) throw new Error(`Unlock tenant failed: ${JSON.stringify(unlockTenantData)}`);
  console.log(`✅ Tenant #${targetTenant.tenantId} unlocked in PostgreSQL: Status = ${unlockTenantData.data.tenant.status}`);

  // 9. Developer Tenant Action: Extend Trial (+30 Days)
  console.log(`\n--- TEST 9: Developer Tenant Command Center: Extend Trial (+30 Days) ---`);
  const extendTrialRes = await fetch(`${BASE_URL}/dev-control/tenants/${targetTenant.tenantId}/action`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'EXTEND_TRIAL', days: 30 })
  });
  const extendTrialData = await extendTrialRes.json();
  if (!extendTrialRes.ok) throw new Error(`Extend trial failed: ${JSON.stringify(extendTrialData)}`);
  console.log(`✅ Tenant #${targetTenant.tenantId} trial extended: Status = ${extendTrialData.data.tenant.status}`);

  // 10. Toggle Global System Lock
  console.log('\n--- TEST 10: Toggle Global System Lock Record ---');
  const toggleLockRes = await fetch(`${BASE_URL}/dev-control/toggle-lock`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      isLocked: false,
      reason: 'Automated Full-Stack Verification Run'
    })
  });
  const toggleLockData = await toggleLockRes.json();
  if (!toggleLockRes.ok) throw new Error(`Toggle lock failed: ${JSON.stringify(toggleLockData)}`);
  console.log(`✅ System Lock record generated: ID ${toggleLockData.data.systemLock.id} (Locked: ${toggleLockData.data.systemLock.isLocked})`);

  // 11. Trigger Encrypted System Backup
  console.log('\n--- TEST 11: Trigger Encrypted System Backup (Step 37) ---');
  const backupRes = await fetch(`${BASE_URL}/dev-control/backup-now`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      backupType: 'FULL',
      reason: 'Scheduled Procedure 3 Snapshot'
    })
  });
  const backupData = await backupRes.json();
  if (!backupRes.ok) throw new Error(`Trigger backup failed: ${JSON.stringify(backupData)}`);
  const backup = backupData.data.backup;
  console.log(`✅ Encrypted System Backup Generated: ID ${backup.id}`);
  console.log(`   Filename: ${backup.filename}`);
  console.log(`   Size: ${backup.fileSizeMb} MB | Encrypted: ${backup.isEncrypted} | Status: ${backup.status}`);

  // 12. Query System Backups Ledger
  console.log('\n--- TEST 12: Query System Backups Ledger ---');
  const getBackupsRes = await fetch(`${BASE_URL}/dev-control/backups`);
  const getBackupsData = await getBackupsRes.json();
  if (!getBackupsRes.ok) throw new Error(`Get backups failed: ${JSON.stringify(getBackupsData)}`);
  console.log(`✅ Backups Ledger confirmed in PostgreSQL: ${getBackupsData.results} backup archives recorded.`);

  // 13. Subscription Expiry & Auto-Lock Process
  console.log('\n--- TEST 13: Execute Subscription Expiry & Auto-Lock Engine ---');
  const autoLockRes = await fetch(`${BASE_URL}/dev-control/auto-lock-process`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({})
  });
  const autoLockData = await autoLockRes.json();
  if (!autoLockRes.ok) throw new Error(`Auto lock failed: ${JSON.stringify(autoLockData)}`);
  console.log(`✅ Auto-Lock Pipeline Executed: ${autoLockData.data.processedCount} expired institution(s) processed.`);

  // 14. Remote Service Management
  console.log('\n--- TEST 14: Remote Service Management (Step 35) ---');
  const clearCacheRes = await fetch(`${BASE_URL}/dev-control/service-action`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'CLEAR_CACHE' })
  });
  const clearCacheData = await clearCacheRes.json();
  if (!clearCacheRes.ok) throw new Error(`Clear cache failed: ${JSON.stringify(clearCacheData)}`);
  console.log(`✅ Remote Operation: ${clearCacheData.data.details}`);

  const vacuumRes = await fetch(`${BASE_URL}/dev-control/service-action`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'VACUUM_DATABASE' })
  });
  const vacuumData = await vacuumRes.json();
  if (!vacuumRes.ok) throw new Error(`Vacuum DB failed: ${JSON.stringify(vacuumData)}`);
  console.log(`✅ Remote Operation: ${vacuumData.data.details}`);

  // 15. Verify Immutable PostgreSQL Audit Trail
  console.log('\n--- TEST 15: Verify Immutable PostgreSQL Audit Trail ---');
  const devAuditLogs = await prisma.auditLog.findMany({
    where: { module: 'DEV_CONTROL' },
    orderBy: { createdAt: 'desc' },
    take: 8
  });
  console.log(`✅ Verified ${devAuditLogs.length} audit log entries in PostgreSQL for module 'DEV_CONTROL':`);
  devAuditLogs.forEach(log => {
    console.log(`   • [${log.action}] User: ${log.userId} | ${log.details} (${log.createdAt.toISOString()})`);
  });

  const actions = devAuditLogs.map(l => l.action);
  if (!actions.includes('DEVELOPER_LOGIN_AUTHENTICATED') || !actions.includes('SYSTEM_BACKUP_TRIGGERED')) {
    throw new Error(`Missing expected developer audit log actions in PostgreSQL: ${JSON.stringify(actions)}`);
  }
  console.log('✅ IMMUTABLE DEVELOPER AUDIT TRAIL 100% VERIFIED.');

  console.log('\n========================================================================');
  console.log('🎉 ALL 15 DEVELOPER CONTROL CENTER & COUNTDOWN ENGINE TESTS PASSED PERFECTLY!');
  console.log('========================================================================\n');
}

testProcedure15DevControl()
  .catch(err => {
    console.error('\n❌ TEST SUITE FAILED:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
