import 'dotenv/config';
import { neon } from '@neondatabase/serverless';

if (!process.argv.includes('--confirm')) {
  throw new Error('Deletion requires --confirm.');
}

const databaseUrl = String(process.env.DATABASE_URL || '').trim();
if (!databaseUrl) throw new Error('DATABASE_URL is required.');

const sql = neon(databaseUrl);
const candidates = await sql`
  SELECT experience, global_id, record_type, title
  FROM et4_records
  WHERE is_active = FALSE
  ORDER BY experience, record_type, global_id
`;

if (!candidates.length) {
  console.log(JSON.stringify({ deleted: 0, records: [] }, null, 2));
  process.exit(0);
}

const deleted = await sql`
  DELETE FROM et4_records
  WHERE is_active = FALSE
  RETURNING experience, global_id, record_type, title
`;

console.log(JSON.stringify({ deleted: deleted.length, records: deleted }, null, 2));

