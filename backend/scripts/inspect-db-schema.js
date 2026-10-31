const { Client } = require('pg');

async function main() {
  const client = new Client('postgresql://postgres:Admin123@localhost:5432/gbs_system');
  await client.connect();
  const res = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;");
  console.log('Total Tables in PostgreSQL:', res.rows.length);
  console.log(res.rows.map(r => r.table_name).join(', '));
  await client.end();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
