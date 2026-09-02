import 'dotenv/config';
import { neon } from '@neondatabase/serverless';

function readOption(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? String(process.argv[index + 1] || '').trim() : '';
}

const experience = readOption('--experience');
if (!experience || !process.argv.includes('--confirm')) {
  throw new Error('Usage: node scripts/delete-et4-experience.mjs --experience <name> --confirm');
}
if (experience === 'statistik_sachsen' && !process.argv.includes('--allow-primary')) {
  throw new Error('Refusing to delete the primary experience without --allow-primary.');
}

const databaseUrl = String(process.env.DATABASE_URL || '').trim();
if (!databaseUrl) throw new Error('DATABASE_URL is required.');

const sql = neon(databaseUrl);
const [{ records }] = await sql`
  SELECT COUNT(*)::integer AS records
  FROM et4_records
  WHERE experience = ${experience}
`;
const [{ syncStates }] = await sql`
  SELECT COUNT(*)::integer AS "syncStates"
  FROM et4_sync_state
  WHERE experience = ${experience}
`;

await sql.transaction([
  sql`DELETE FROM et4_sync_seen WHERE experience = ${experience}`,
  sql`DELETE FROM et4_records WHERE experience = ${experience}`,
  sql`DELETE FROM et4_sync_state WHERE experience = ${experience}`
]);

console.log(JSON.stringify({ experience, deletedRecords: records, deletedSyncStates: syncStates }, null, 2));

