const prisma = require('../src/core/database/prisma.client');

async function main() {
  try {
    await prisma.$executeRawUnsafe(`ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'HR'`);
    console.log('Added HR to UserRole enum');
  } catch (e) {
    console.log('HR enum status:', e.message);
  }

  try {
    await prisma.$executeRawUnsafe(`ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'ALUMNI'`);
    console.log('Added ALUMNI to UserRole enum');
  } catch (e) {
    console.log('ALUMNI enum status:', e.message);
  }

  await prisma.$disconnect();
}

main();
