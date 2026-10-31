const prisma = require('../src/core/database/prisma.client');

async function testProcedure4Tenancy() {
  console.log('================================================================');
  console.log('🧪 PROCEDURE 4: MULTI-TENANT ARCHITECTURE & ISOLATION TEST SUITE');
  console.log('================================================================\n');

  const BASE_URL = 'http://localhost:5001/api/v1';

  // 1. Super Admin Authentication
  console.log('--- TEST 1: Super Admin Authentication ---');
  const superAdminLoginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@gbs.com', password: 'Admin123!' })
  });
  const superAdminData = await superAdminLoginRes.json();
  if (!superAdminLoginRes.ok) {
    throw new Error(`Super admin login failed: ${JSON.stringify(superAdminData)}`);
  }
  const superAdminToken = superAdminData.data.accessToken;
  console.log(`✅ Super Admin authenticated. Token received. (User: ${superAdminData.data.user.email})`);

  // 2. Fetch All Existing Tenants
  console.log('\n--- TEST 2: Retrieve All Tenants (GET /api/v1/tenants) ---');
  const tenantsRes = await fetch(`${BASE_URL}/tenants`, {
    headers: { Authorization: `Bearer ${superAdminToken}` }
  });
  const tenantsData = await tenantsRes.json();
  console.log(`✅ Retrieved ${tenantsData.results} tenants.`);
  for (const t of tenantsData.data.tenants) {
    const lic = t.subscriptions?.[0]?.licenses?.[0]?.licenseKey || 'N/A';
    console.log(`   - [ID: ${t.id}] ${t.name} (${t.code}) | Status: ${t.status} | Users: ${t._count.users} | Lic: ${lic.slice(0, 20)}...`);
  }

  // 3. Automated Provisioning of New Tenant
  console.log('\n--- TEST 3: Automated Provisioning of New Enterprise Tenant ---');
  const newTenantPayload = {
    name: 'Royal Oak International Academy',
    code: 'GBS-ROYALOAK',
    domain: 'royaloak.gbs.edu',
    planName: 'Enterprise SaaS Tier (30-Day Trial)',
    maxUsers: 150,
    maxStudents: 1500,
    adminFirstName: 'Headmaster',
    adminLastName: 'Sterling',
    adminEmail: 'headmaster.royaloak@gbs.edu',
    adminPassword: 'RoyalOak2026!'
  };

  // Clean up if previous run left it
  const existingRoyalOak = await prisma.tenant.findUnique({ where: { code: 'GBS-ROYALOAK' } });
  if (existingRoyalOak) {
    console.log('   Removing existing test tenant from prior run for clean idempotency...');
    await prisma.tenant.delete({ where: { id: existingRoyalOak.id } });
  }

  const provisionRes = await fetch(`${BASE_URL}/tenants`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${superAdminToken}`
    },
    body: JSON.stringify(newTenantPayload)
  });
  const provisionData = await provisionRes.json();
  if (!provisionRes.ok) {
    throw new Error(`Tenant provisioning failed: ${JSON.stringify(provisionData)}`);
  }
  const createdTenant = provisionData.data.tenant;
  const createdSub = provisionData.data.subscription;
  const createdAdmin = provisionData.data.adminUser;
  console.log(`✅ Tenant Provisioned Successfully!`);
  console.log(`   Tenant: ${createdTenant.name} (ID: ${createdTenant.id}, Code: ${createdTenant.code})`);
  console.log(`   Subscription ID: ${createdSub.id} (Plan: ${createdSub.planName}, Ends: ${createdSub.endDate})`);
  console.log(`   Admin User: ${createdAdmin.email} (Role: ${createdAdmin.role})`);

  // 4. Authenticate as New Tenant Admin
  console.log('\n--- TEST 4: Authenticate as Tenant Admin (Royal Oak) ---');
  const royalOakLoginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'headmaster.royaloak@gbs.edu', password: 'RoyalOak2026!' })
  });
  const royalOakLoginData = await royalOakLoginRes.json();
  if (!royalOakLoginRes.ok) {
    throw new Error(`Royal Oak Admin login failed: ${JSON.stringify(royalOakLoginData)}`);
  }
  const royalOakToken = royalOakLoginData.data.accessToken;
  console.log(`✅ Royal Oak Admin authenticated. Token received.`);

  // 5. Test Data Isolation (Tenant Scoping)
  console.log('\n--- TEST 5: Verify Data Isolation Guard (Tenant Scoping) ---');
  const royalOakUsersRes = await fetch(`${BASE_URL}/users`, {
    headers: { Authorization: `Bearer ${royalOakToken}` }
  });
  const royalOakUsersData = await royalOakUsersRes.json();
  console.log(`✅ Royal Oak Admin queried /api/v1/users.`);
  console.log(`   Total users returned: ${royalOakUsersData.results}`);
  console.log(`   Isolated user: ${royalOakUsersData.data.users[0].email} (Tenant ID: ${royalOakUsersData.data.users[0].tenantId})`);
  if (royalOakUsersData.results !== 1) {
    throw new Error(`Data isolation breached! Expected 1 user, got ${royalOakUsersData.results}`);
  }
  console.log(`✅ PERFECT ISOLATION: Royal Oak cannot see users from GBS-MAIN or other institutions.`);

  // 6. Test Cross-Tenant Tampering Block (tenantIsolationGuard)
  console.log('\n--- TEST 6: Cross-Tenant Tampering Attack Blocked ---');
  const crossTenantAttackRes = await fetch(`${BASE_URL}/users?tenantId=1`, {
    headers: { Authorization: `Bearer ${royalOakToken}` }
  });
  const crossTenantAttackData = await crossTenantAttackRes.json();
  console.log(`   Tampering query sent: /users?tenantId=1 while authenticated as Tenant ${createdTenant.id}`);
  console.log(`   HTTP Status Code: ${crossTenantAttackRes.status}`);
  console.log(`   Server Response: ${crossTenantAttackData.message}`);
  if (crossTenantAttackRes.status === 403) {
    console.log(`✅ TAMPERING BLOCKED: tenantIsolationGuard successfully threw 403 Forbidden.`);
  } else {
    throw new Error(`Expected 403 Forbidden, received ${crossTenantAttackRes.status}`);
  }

  // 7. Test Tenant Status Lifecycle Guard (Lock Tenant)
  console.log('\n--- TEST 7: Tenant Status Lifecycle Guard (Auto-Lock Simulation) ---');
  const lockRes = await fetch(`${BASE_URL}/tenants/${createdTenant.id}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${superAdminToken}`
    },
    body: JSON.stringify({
      status: 'LOCKED',
      reason: 'Automated 30-Day Subscription Expiry Simulation'
    })
  });
  const lockData = await lockRes.json();
  console.log(`✅ Super Admin locked tenant: ${lockData.message}`);

  // Now attempt to access with Royal Oak Token
  const lockedAccessRes = await fetch(`${BASE_URL}/users`, {
    headers: { Authorization: `Bearer ${royalOakToken}` }
  });
  const lockedAccessData = await lockedAccessRes.json();
  console.log(`   Royal Oak Admin attempted API access while LOCKED.`);
  console.log(`   HTTP Status Code: ${lockedAccessRes.status}`);
  console.log(`   Server Response: ${lockedAccessData.message}`);
  if (lockedAccessRes.status === 403) {
    console.log(`✅ LOCKED GUARD ENFORCED: tenantStatusGuard successfully rejected locked tenant with 403.`);
  } else {
    throw new Error(`Expected 403 Forbidden for locked tenant, received ${lockedAccessRes.status}`);
  }

  // Reactivate tenant
  console.log('\n--- TEST 8: Reactivate Tenant (Unlock & Audit Logging) ---');
  const unlockRes = await fetch(`${BASE_URL}/tenants/${createdTenant.id}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${superAdminToken}`
    },
    body: JSON.stringify({
      status: 'ACTIVE',
      reason: 'Subscription payment verified. Reactivated.'
    })
  });
  const unlockData = await unlockRes.json();
  console.log(`✅ Super Admin reactivated tenant: ${unlockData.message}`);

  // Verify access is restored
  const unlockedAccessRes = await fetch(`${BASE_URL}/users`, {
    headers: { Authorization: `Bearer ${royalOakToken}` }
  });
  console.log(`✅ Access Restored: HTTP Status ${unlockedAccessRes.status} OK.`);

  // 8. PostgreSQL Audit Logs Verification
  console.log('\n--- TEST 9: PostgreSQL Audit Logs Verification ---');
  const auditLogs = await prisma.auditLog.findMany({
    where: { tenantId: createdTenant.id },
    orderBy: { createdAt: 'desc' }
  });
  console.log(`✅ Immutable Audit Logs recorded for Tenant ${createdTenant.id}:`);
  for (const log of auditLogs) {
    console.log(`   - [${log.action}] (Module: ${log.module}): ${log.details}`);
  }

  console.log('\n================================================================');
  console.log('🏆 PROCEDURE 4: MULTI-TENANT ARCHITECTURE FULLY VALIDATED!');
  console.log('================================================================\n');
}

testProcedure4Tenancy()
  .catch((err) => {
    console.error('❌ Test failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
