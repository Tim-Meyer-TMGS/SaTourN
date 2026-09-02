import 'dotenv/config';
import { neon } from '@neondatabase/serverless';

function readOption(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? String(process.argv[index + 1] || '').trim().toLowerCase() : '';
}

const email = readOption('--email') || String(process.argv[2] || '').trim().toLowerCase();
if (!email || !process.argv.includes('--confirm')) {
  throw new Error('Usage: node scripts/revoke-user-sessions.mjs --email <email> --confirm');
}

const databaseUrl = String(process.env.DATABASE_URL || '').trim();
if (!databaseUrl) throw new Error('DATABASE_URL is required.');
const sql = neon(databaseUrl);

const revoked = await sql.query(`
  DELETE FROM "session"
  WHERE "userId" IN (SELECT id FROM "user" WHERE LOWER(email) = $1)
  RETURNING id
`, [email]);

console.log(JSON.stringify({ email, revokedSessions: revoked.length }, null, 2));
