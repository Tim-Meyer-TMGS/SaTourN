import { randomBytes, randomUUID, scrypt, timingSafeEqual } from 'node:crypto';

import 'dotenv/config';
import { neon } from '@neondatabase/serverless';

import { normalizeEmail } from '../lib/auth/tenant-domains.js';

const VALID_ROLES = new Set(['USER', 'GROUP_ADMIN', 'SUPER_ADMIN']);
const SCRYPT_OPTIONS = Object.freeze({ N: 16_384, r: 16, p: 1, dkLen: 64 });

function readOption(name, fallback = '') {
  const index = process.argv.indexOf(name);
  return index >= 0 ? String(process.argv[index + 1] || '').trim() : fallback;
}

function temporaryPassword() {
  return `${randomBytes(18).toString('base64url')}!7a`;
}

function generatePasswordKey(password, salt) {
  return new Promise((resolve, reject) => {
    scrypt(password.normalize('NFKC'), salt, SCRYPT_OPTIONS.dkLen, {
      N: SCRYPT_OPTIONS.N,
      r: SCRYPT_OPTIONS.r,
      p: SCRYPT_OPTIONS.p,
      maxmem: 128 * SCRYPT_OPTIONS.N * SCRYPT_OPTIONS.r * 2
    }, (error, key) => (error ? reject(error) : resolve(key)));
  });
}

async function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const key = await generatePasswordKey(password, salt);
  return `${salt}:${key.toString('hex')}`;
}

async function verifyPasswordHash(hash, password) {
  const [salt, expectedHex] = String(hash || '').split(':');
  if (!salt || !expectedHex) return false;
  const actual = await generatePasswordKey(password, salt);
  const expected = Buffer.from(expectedHex, 'hex');
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

async function authRequest(authUrl, authOrigin, path, body) {
  const response = await fetch(`${authUrl}/${path}`, {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      origin: authOrigin
    },
    body: JSON.stringify(body),
    redirect: 'manual'
  });
  const responseText = await response.text();
  let payload = null;
  try {
    payload = JSON.parse(responseText);
  } catch {
    // The status and shortened response below are enough for diagnostics.
  }
  return { response, responseText, payload };
}

const operation = readOption('--operation').toLowerCase();
const email = normalizeEmail(readOption('--email'));
const name = readOption('--name') || email;
const tenantSlug = readOption('--tenant', 'tmgs').toLowerCase();
const role = readOption('--role', 'USER').toUpperCase();
const password = readOption('--password') || temporaryPassword();
const confirmed = process.argv.includes('--confirm');
const databaseUrl = String(process.env.DATABASE_URL || '').trim();
const authUrl = String(
  process.env.NEON_AUTH_BASE_URL
  || process.env.DATABASE_NEON_AUTH_BASE_URL
  || ''
).trim().replace(/\/$/, '');
const authOrigin = String(process.env.NEON_AUTH_TRUSTED_ORIGIN || '').trim();

if (!confirmed || !['create', 'reset-password'].includes(operation) || !email) {
  throw new Error('Usage: --operation <create|reset-password> --email <address> [--name <name>] [--tenant tmgs] [--role USER] [--password <password>] --confirm');
}
if (!databaseUrl) throw new Error('DATABASE_URL is required.');
if (!authUrl) throw new Error('NEON_AUTH_BASE_URL or DATABASE_NEON_AUTH_BASE_URL is required.');
if (!authOrigin) throw new Error('NEON_AUTH_TRUSTED_ORIGIN is required.');
if (!VALID_ROLES.has(role)) throw new Error(`Unsupported application role: ${role}`);
if (password.length < 12 || password.length > 128) {
  throw new Error('The temporary password must contain 12 to 128 characters.');
}

const sql = neon(databaseUrl);
const [tenant] = await sql.query(
  'SELECT id, slug FROM app_tenant WHERE slug = $1 AND active = TRUE',
  [tenantSlug]
);
if (!tenant) throw new Error(`No active tenant exists for slug: ${tenantSlug}`);

async function findState() {
  const [profile] = await sql.query(
    'SELECT user_id, email, auth_user_id::text, role, active, tenant_id FROM app_user_profile WHERE LOWER(email) = $1',
    [email]
  );
  const [authUser] = await sql.query(
    'SELECT id::text, email, name FROM neon_auth."user" WHERE LOWER(email) = $1',
    [email]
  );
  const [legacyUser] = await sql.query(
    'SELECT id, email FROM public."user" WHERE LOWER(email) = $1',
    [email]
  );
  return { profile, authUser, legacyUser };
}

async function clearAuthSessions(authUserId) {
  await sql.query('DELETE FROM neon_auth."session" WHERE "userId" = $1::uuid', [authUserId]);
}

async function verifyLogin(authUserId) {
  const login = await authRequest(authUrl, authOrigin, 'sign-in/email', {
    email,
    password,
    rememberMe: false
  });
  await clearAuthSessions(authUserId);
  if (!login.response.ok || !login.payload?.user?.id) {
    throw new Error(`Credential verification failed (${login.response.status}): ${login.responseText.slice(0, 300)}`);
  }
}

let result;

if (operation === 'create') {
  const existing = await findState();
  if (existing.profile || existing.authUser || existing.legacyUser) {
    throw new Error('The user already exists in at least one SaTourN authentication table.');
  }

  const signup = await authRequest(authUrl, authOrigin, 'sign-up/email', { email, password, name });
  const signupDisabled = signup.payload?.code === 'EMAIL_PASSWORD_SIGN_UP_DISABLED';
  if (!signup.response.ok && !signupDisabled) {
    throw new Error(`Neon Auth user creation failed (${signup.response.status}): ${signup.responseText.slice(0, 300)}`);
  }
  const authUserId = signup.payload?.user?.id || randomUUID();
  const passwordHash = signupDisabled ? await hashPassword(password) : '';
  if (!signupDisabled && !signup.payload?.user?.id) {
    throw new Error('Neon Auth user creation returned no user identifier.');
  }
  if (signupDisabled && !await verifyPasswordHash(passwordHash, password)) {
    throw new Error('Generated password hash failed local verification.');
  }

  try {
    const statements = [
      ...(signupDisabled ? [
        sql`INSERT INTO neon_auth."user"
              (id, name, email, "emailVerified", "createdAt", "updatedAt", role, banned)
            VALUES (${authUserId}::uuid, ${name}, ${email}, FALSE, NOW(), NOW(), 'user', FALSE)`,
        sql`INSERT INTO neon_auth."account"
              ("accountId", "providerId", "userId", password, "createdAt", "updatedAt")
            VALUES (${authUserId}, 'credential', ${authUserId}::uuid, ${passwordHash}, NOW(), NOW())`
      ] : []),
      sql`INSERT INTO public."user" (id, name, email, "emailVerified", "createdAt", "updatedAt")
          VALUES (${authUserId}, ${name}, ${email}, FALSE, NOW(), NOW())`,
      sql`INSERT INTO app_user_profile
            (user_id, tenant_id, role, active, must_change_password, email, auth_user_id)
          VALUES (${authUserId}, ${tenant.id}, ${role}, TRUE, TRUE, ${email}, ${authUserId}::uuid)`,
      sql`INSERT INTO app_audit_log (actor_user_id, action, target_type, target_id, metadata)
          VALUES (NULL, 'CLI_USER_CREATED', 'user', ${authUserId},
            ${JSON.stringify({ tenant: tenant.slug, role })}::jsonb)`,
      sql`DELETE FROM neon_auth."session" WHERE "userId" = ${authUserId}::uuid`
    ];
    await sql.transaction(statements);
  } catch (error) {
    await sql.query('DELETE FROM neon_auth."user" WHERE id = $1::uuid', [authUserId]);
    throw error;
  }

  await verifyLogin(authUserId);
  result = { created: true, email, name, tenant: tenant.slug, role };
} else {
  const existing = await findState();
  if (!existing.profile?.active || !existing.authUser) {
    throw new Error('No active, linked SaTourN user exists for this email address.');
  }
  if (existing.profile.tenant_id !== tenant.id) {
    throw new Error(`The existing user does not belong to tenant: ${tenant.slug}`);
  }

  const [account] = await sql.query(
    'SELECT id FROM neon_auth."account" WHERE "userId" = $1::uuid AND "providerId" = $2',
    [existing.authUser.id, 'credential']
  );
  if (!account) throw new Error('The Neon Auth user has no credential account.');

  const passwordHash = await hashPassword(password);
  if (!await verifyPasswordHash(passwordHash, password)) {
    throw new Error('Generated password hash failed local verification.');
  }

  await sql.transaction([
    sql`UPDATE neon_auth."account"
        SET password = ${passwordHash}, "updatedAt" = NOW()
        WHERE id = ${account.id}`,
    sql`DELETE FROM neon_auth."session" WHERE "userId" = ${existing.authUser.id}::uuid`,
    sql`UPDATE app_user_profile
        SET must_change_password = TRUE, password_changed_at = NULL, updated_at = NOW()
        WHERE user_id = ${existing.profile.user_id}`,
    sql`INSERT INTO app_audit_log (actor_user_id, action, target_type, target_id, metadata)
        VALUES (NULL, 'CLI_PASSWORD_RESET', 'user', ${existing.profile.user_id}, '{}'::jsonb)`
  ]);

  await verifyLogin(existing.authUser.id);
  result = {
    passwordReset: true,
    email,
    name: existing.authUser.name,
    tenant: tenant.slug,
    role: existing.profile.role
  };
}

console.log(JSON.stringify({
  ...result,
  mustChangePassword: true,
  activeSessions: 0,
  temporaryPassword: password
}, null, 2));
