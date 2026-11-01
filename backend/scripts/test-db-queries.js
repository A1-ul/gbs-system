const prisma = require('../src/core/database/prisma.client');
const { Client } = require('pg');

async function check() {
  const pgClient = new Client('postgresql://postgres:Admin123@localhost:5432/gbs_system');
  await pgClient.connect();
  const pgInfo = await pgClient.query('SELECT current_database(), current_schema(), current_user, inet_server_port();');
  console.log('PG CLIENT INFO:', pgInfo.rows[0]);
  const pgTables = await pgClient.query("SELECT table_schema, table_name FROM information_schema.tables WHERE table_name = 'facility_tickets';");
  console.log('PG FACILITY_TICKETS SCHEMA:', pgTables.rows);
  await pgClient.end();

  try {
    const prismaInfo = await prisma.$queryRawUnsafe('SELECT current_database(), current_schema(), current_user, inet_server_port();');
    console.log('PRISMA INFO:', prismaInfo);
    const prismaTables = await prisma.$queryRawUnsafe("SELECT table_schema, table_name FROM information_schema.tables WHERE table_name = 'facility_tickets';");
    console.log('PRISMA FACILITY_TICKETS SCHEMA:', prismaTables);
  } catch (e) {
    console.error('PRISMA ERROR:', e.message);
  } finally {
    await prisma.$disconnect();
  }
}

check();
