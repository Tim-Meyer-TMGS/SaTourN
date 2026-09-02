import { randomBytes } from 'node:crypto';

import 'dotenv/config';
import { neon } from '@neondatabase/serverless';

import { normalizeEmail } from '../lib/auth/tenant-domains.js';

function readOption(name, fallback = '') {
  const index = process.argv.indexOf(name);
  return index >= 0 ? String(process.argv[index + 1] || '').trim() : fallback;
}

function temporaryPassword() {
  return `${randomBytes(18).toString('base64url')}!7a`;
}

const positional = process.argv.slice(2).filter((value) => !String(value).startsWith('--'));
const email = normalizeEmail(readOption('--email') || positional[0]);
const name = readOption('--name') || positional[1] || 'Administrator';
const password = readOption('--password') || positional[2] || temporaryPassword();
const databaseUrl = String(process.env.DATABASE_URL || '').trim();
const authUrl = String(
  process.env.NEON_AUTH_BASE_URL
  || process.env.DATABASE_NEON_AUTH_BASE_URL
  || ''
).trim().replace(/\/$/, '');
const authOrigin = String(process.env.NEON_AUTH_TRUSTED_ORIGIN || '').trim();

if (!databaseUrl) throw new Error('DATABASE_URL is required.');
if (!authUrl) throw new Error('NEON_AUTH_BASE_URL or DATABASE_NEON_AUTH_BASE_URL is required.');
if (!authOrigin) throw new Error('NEON_AUTH_TRUSTED_ORIGIN is required.');
if (!email) throw new Error('An email address is required.');
if (password.length < 12 || password.length > 128) {
  throw new Error('The temporary password must contain 12 to 128 characters.');
}

const sql = neon(databaseUrl);
const [profile] = await sql.query(`
  SELECT profile.user_id, profile.role, tenant.slug AS tenant_slug
  FROM app_user_profile AS profile
  JOIN app_tenant AS tenant ON tenant.id = profile.tenant_id
  WHERE LOWER(profile.email) = $1 AND profile.active = TRUE AND tenant.active = TRUE
`, [email]);
if (!profile) throw new Error('No active SaTourN profile exists for this email address.');
if (profile.role !== 'SUPER_ADMIN') throw new Error('The existing SaTourN profile is not a super admin.');

const [existingUser] = await sql.query(
  'SELECT id::text, email FROM neon_auth."user" WHERE LOWER(email) = $1',
  [email]
);
if (existingUser) throw new Error('The Neon Auth user already exists; no password was changed.');

const response = await fetch(`${authUrl}/sign-up/email`, {
  method: 'POST',
  headers: {
    'content-type': 'application/json',
    accept: 'application/json',
    origin: authOrigin
  },
  body: JSON.stringify({ email, password, name })
});
const responseText = await response.text();
let created;
try {
  created = JSON.parse(responseText);
} catch {
  created = null;
}
if (!response.ok || !created?.user?.id) {
  throw new Error(`Neon Auth user creation failed (${response.status}): ${responseText.slice(0, 500)}`);
}

await sql.transaction([
  sql`UPDATE app_user_profile
      SET auth_user_id = ${created.user.id}::uuid, email = ${email}, updated_at = NOW()
      WHERE user_id = ${profile.user_id}`,
  sql`INSERT INTO app_audit_log (actor_user_id, action, target_type, target_id, metadata)
      VALUES (${profile.user_id}, 'NEON_AUTH_LINKED', 'user', ${created.user.id},
        ${JSON.stringify({ tenant: profile.tenant_slug })}::jsonb)`,
  sql`DELETE FROM neon_auth.session WHERE "userId" = ${created.user.id}::uuid`
]);

console.log(JSON.stringify({
  created: true,
  email,
  tenant: profile.tenant_slug,
  role: profile.role,
  mustChangePassword: true,
  temporaryPassword: password
}, null, 2));
