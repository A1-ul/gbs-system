const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function runSeed() {
  console.log('🌱 [GBS DATABASE SEEDER] Starting database seeding process...');

  // 1. Master Tenants
  const tenantA = await prisma.tenant.upsert({
    where: { code: 'GBS-MAIN' },
    update: {},
    create: {
      name: 'GBS International School (Main Campus)',
      code: 'GBS-MAIN',
      domain: 'main.gbs-international.edu',
      status: 'ACTIVE'
    }
  });

  const tenantB = await prisma.tenant.upsert({
    where: { code: 'GBS-CAMPUS-B' },
    update: {},
    create: {
      name: 'GBS International School (East Wing)',
      code: 'GBS-CAMPUS-B',
      domain: 'east.gbs-international.edu',
      status: 'ACTIVE'
    }
  });

  console.log(`✅ Tenants initialized: ${tenantA.code}, ${tenantB.code}`);

  // 2. Subscriptions
  await prisma.subscription.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      tenantId: tenantA.id,
      planName: 'ENTERPRISE_PREMIUM',
      startDate: new Date(),
      endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      gracePeriodDays: 14,
      autoLock: true,
      status: 'ACTIVE',
      amountPaid: 12000.00,
      currency: 'USD'
    }
  });

  // 3. User Accounts across Roles
  const seedAccounts = [
    { email: 'admin@gbs.com', username: 'superadmin', password: 'Admin123!', role: 'SUPER_ADMIN', firstName: 'GBS Super', lastName: 'Admin' },
    { email: 'teacher@gbs.com', username: 'teacher1', password: 'Teacher123!', role: 'TEACHER', firstName: 'Sarah', lastName: 'Teacher' },
    { email: 'student@gbs.com', username: 'student1', password: 'Student123!', role: 'STUDENT', firstName: 'Alex', lastName: 'Student' },
    { email: 'parent@gbs.com', username: 'parent1', password: 'Parent123!', role: 'PARENT', firstName: 'John', lastName: 'Parent' },
    { email: 'accountant@gbs.com', username: 'finance1', password: 'Accountant123!', role: 'ACCOUNTANT', firstName: 'David', lastName: 'Accountant' },
    { email: 'staff@gbs.com', username: 'staff1', password: 'Staff123!', role: 'STAFF', firstName: 'Emma', lastName: 'Staff' }
  ];

  for (const acc of seedAccounts) {
    const existing = await prisma.user.findUnique({ where: { email: acc.email } });
    if (!existing) {
      const hashedPassword = await bcrypt.hash(acc.password, 10);
      await prisma.user.create({
        data: {
          tenantId: tenantA.id,
          firstName: acc.firstName,
          lastName: acc.lastName,
          username: acc.username,
          email: acc.email,
          password: hashedPassword,
          role: acc.role,
          permissions: ['ALL'],
          isActive: true
        }
      });
      console.log(`   + Seeded user: ${acc.email} (${acc.role})`);
    }
  }

  // 4. Initial Audit Log
  await prisma.auditLog.create({
    data: {
      tenantId: tenantA.id,
      action: 'SYSTEM_SEED_INITIALIZED',
      module: 'DATABASE',
      details: 'GBS Enterprise Seed completed successfully with core tenants, roles, and administrative users.'
    }
  });

  console.log('🎉 [GBS DATABASE SEEDER] Seeding completed successfully.');
}

if (require.main === module) {
  runSeed()
    .catch((e) => {
      console.error('❌ [SEED ERROR]', e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}

module.exports = { runSeed };
