import { randomBytes } from 'node:crypto';

import 'dotenv/config';

import { auth, authPool } from '../lib/auth/server.js';
import { isEmailAllowedForTenant, normalizeEmail } from '../lib/auth/tenant-domains.js';

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
const tenantSlug = (readOption('--tenant') || positional[2] || 'tmgs').toLowerCase();
const password = readOption('--password') || positional[3] || temporaryPassword();

if (!email || !isEmailAllowedForTenant(email, tenantSlug)) {
  throw new Error('The email address is not permitted for the selected tenant.');
}
if (password.length < 12 || password.length > 128) {
  throw new Error('The temporary password must contain 12 to 128 characters.');
}

const existing = await authPool.query('SELECT id FROM "user" WHERE LOWER(email) = $1', [email]);
if (existing.rowCount) throw new Error('The user already exists; no password was changed.');

const tenant = await authPool.query('SELECT id FROM app_tenant WHERE slug = $1 AND active = TRUE', [tenantSlug]);
if (!tenant.rowCount) throw new Error('The selected tenant does not exist or is inactive.');

const created = await auth.api.createUser({
  body: { email, password, name, role: 'admin' }
});
const user = created?.user || created;
if (!user?.id) throw new Error('Better Auth did not return the created user.');

const client = await authPool.connect();
try {
  await client.query('BEGIN');
  await client.query('UPDATE "user" SET "emailVerified" = TRUE WHERE id = $1', [user.id]);
  await client.query(`
    INSERT INTO app_user_profile (user_id, tenant_id, role, active, must_change_password)
    VALUES ($1, $2, 'SUPER_ADMIN', TRUE, TRUE)
  `, [user.id, tenant.rows[0].id]);
  await client.query(`
    INSERT INTO app_audit_log (actor_user_id, action, target_type, target_id, metadata)
    VALUES ($1, 'INITIAL_SUPER_ADMIN_CREATED', 'user', $1, $2::jsonb)
  `, [user.id, JSON.stringify({ tenant: tenantSlug })]);
  await client.query('COMMIT');
} catch (error) {
  await client.query('ROLLBACK');
  await authPool.query('DELETE FROM "user" WHERE id = $1', [user.id]);
  throw error;
} finally {
  client.release();
  await authPool.end();
}

console.log(JSON.stringify({
  created: true,
  email,
  tenant: tenantSlug,
  role: 'SUPER_ADMIN',
  mustChangePassword: true,
  temporaryPassword: password
}, null, 2));
