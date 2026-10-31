const prisma = require('../src/core/database/prisma.client');

async function listUsers() {
  const users = await prisma.user.findMany({
    select: { id: true, email: true, username: true, role: true, tenantId: true }
  });
  console.log('Registered Users:');
  console.log(JSON.stringify(users, null, 2));
}

listUsers().finally(() => prisma.$disconnect());
