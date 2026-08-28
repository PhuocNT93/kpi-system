import 'dotenv/config';
import { Client } from 'pg';

async function fixAdmin() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  
  const empRes = await client.query('SELECT employee_id FROM employee ORDER BY join_date ASC LIMIT 1');
  const empId = empRes.rows[0].employee_id;
  
  await client.query("UPDATE employee SET email = 'admin@kpi.com' WHERE employee_id = $1", [empId]);
  await client.query("UPDATE app_user SET employee_id = $1 WHERE email = 'admin@kpi.com'", [empId]);
  
  console.log('Successfully linked admin@kpi.com to employee ' + empId);
  await client.end();
}

fixAdmin().catch(console.error);
