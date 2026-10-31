'use strict';

const prisma = require('../src/core/database/prisma.client');

async function main() {
  await prisma.$executeRawUnsafe('ALTER TABLE library_loans ALTER COLUMN borrower_id DROP NOT NULL;');
  await prisma.$executeRawUnsafe('ALTER TABLE transport_assignments ALTER COLUMN student_id DROP NOT NULL;');
  await prisma.$executeRawUnsafe('ALTER TABLE inventory_requests ALTER COLUMN requester_id DROP NOT NULL;');
  await prisma.$executeRawUnsafe('ALTER TABLE staff_leave_requests ALTER COLUMN staff_id DROP NOT NULL;');
  console.log('✅ Columns altered to nullable successfully');
  await prisma.$disconnect();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
