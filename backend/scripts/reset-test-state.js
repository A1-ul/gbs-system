'use strict';

const prisma = require('../src/core/database/prisma.client');

async function resetState() {
  console.log('Resetting test state in PostgreSQL...');

  // 1. Unlock all tenants
  await prisma.tenant.updateMany({
    data: {
      status: 'ACTIVE',
      isActive: true,
      isDeleted: false
    }
  });
  console.log('✓ All tenants set to ACTIVE and isActive: true');

  // 2. Unlock all users
  await prisma.user.updateMany({
    data: {
      isLocked: false,
      isActive: true,
      isDeleted: false,
      failedLoginAttempts: 0
    }
  });
  console.log('✓ All users unlocked and set to isActive: true, failedLoginAttempts: 0');

  // 3. Clear system locks
  await prisma.systemLock.updateMany({
    data: {
      isLocked: false
    }
  });
  console.log('✓ All system locks cleared (isLocked: false)');
}

resetState()
  .then(() => console.log('State reset complete.'))
  .catch((err) => console.error('Error resetting state:', err))
  .finally(() => prisma.$disconnect());
