const { Client } = require('pg');

async function main() {
  const client = new Client('postgresql://postgres:Admin123@localhost:5432/gbs_system');
  await client.connect();
  const res = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;");
  for (const r of res.rows) {
    try {
      const cnt = await client.query(`SELECT count(*) FROM "${r.table_name}"`);
      const count = parseInt(cnt.rows[0].count, 10);
      if (count > 0) {
        console.log(`${r.table_name.padEnd(35)}: ${count}`);
      }
    } catch (e) {
      // skip
    }
  }
  await client.end();
}

main().catch(console.error);
