const bcrypt = require('bcryptjs');
const prisma = require('../src/core/database/prisma.client');

const CANONICAL_ACCOUNTS = [
  { email: 'admin@gbs.com', password: 'Admin123!', role: 'SUPER_ADMIN', firstName: 'Arthur', lastName: 'Pendleton' },
  { email: 'teacher@gbs.com', password: 'Teacher123!', role: 'TEACHER', firstName: 'Sarah', lastName: 'Jenkins' },
  { email: 'student@gbs.com', password: 'Student123!', role: 'STUDENT', firstName: 'Samuel', lastName: 'Doe' },
  { email: 'parent@gbs.com', password: 'Parent123!', role: 'PARENT', firstName: 'Marcus', lastName: 'Doe' },
  { email: 'accountant@gbs.com', password: 'Accountant123!', role: 'ACCOUNTANT', firstName: 'Eleanor', lastName: 'Vance' },
  { email: 'staff@gbs.com', password: 'Staff123!', role: 'STAFF', firstName: 'David', lastName: 'Miller' }
];

async function activateAccounts() {
  console.log('Activating and synchronizing canonical user accounts in PostgreSQL...');
  
  for (const acc of CANONICAL_ACCOUNTS) {
    const hashedPassword = await bcrypt.hash(acc.password, 12);
    
    const existing = await prisma.user.findFirst({
      where: { email: acc.email }
    });

    if (existing) {
      await prisma.user.update({
        where: { id: existing.id },
        data: {
          isActive: true,
          isDeleted: false,
          deletedAt: null,
          isLocked: false,
          failedLoginAttempts: 0,
          password: hashedPassword,
          role: acc.role,
          firstName: acc.firstName,
          lastName: acc.lastName
        }
      });
      console.log(`✓ Activated existing user #${existing.id}: ${acc.email} (${acc.role})`);
    } else {
      const created = await prisma.user.create({
        data: {
          tenantId: 1,
          email: acc.email,
          username: acc.email.split('@')[0],
          password: hashedPassword,
          role: acc.role,
          firstName: acc.firstName,
          lastName: acc.lastName,
          isActive: true,
          isDeleted: false,
          isLocked: false
        }
      });
      console.log(`✓ Created active user #${created.id}: ${acc.email} (${acc.role})`);
    }
  }

  console.log('All canonical accounts are now 100% active and authenticated in PostgreSQL!');
}

activateAccounts()
  .catch((err) => {
    console.error('Activation failed:', err);
    process.exit(1);
  })
  .finally(() => {
    process.exit(0);
  });
