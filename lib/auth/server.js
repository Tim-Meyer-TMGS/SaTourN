import { betterAuth } from 'better-auth';
import { APIError } from 'better-auth/api';
import { admin } from 'better-auth/plugins';
import pg from 'pg';

import { isEmailAllowedForTenant, isValidApplicationRole } from './tenant-domains.js';

const { Pool } = pg;

function pgConnectionString(value) {
  const source = String(value || '').trim();
  if (!source) return source;
  const url = new URL(source);
  const sslMode = url.searchParams.get('sslmode');
  if (['prefer', 'require', 'verify-ca'].includes(sslMode || '')) {
    url.searchParams.set('sslmode', 'verify-full');
  }
  return url.toString();
}

const connectionString = pgConnectionString(process.env.DATABASE_URL);

export const authPool = new Pool({
  connectionString,
  max: 2,
  idleTimeoutMillis: 10_000,
  connectionTimeoutMillis: 10_000
});

const genericLoginMessage = 'Anmeldung nicht möglich. Bitte prüfen Sie Ihre Zugangsdaten oder wenden Sie sich an Ihren Administrator.';

async function loadIdentityForSession(userId) {
  const { rows } = await authPool.query(`
    SELECT
      profile.user_id,
      profile.role,
      profile.active AS user_active,
      profile.must_change_password,
      tenant.id AS tenant_id,
      tenant.slug AS tenant_slug,
      tenant.active AS tenant_active
    FROM app_user_profile AS profile
    JOIN app_tenant AS tenant ON tenant.id = profile.tenant_id
    WHERE profile.user_id = $1
  `, [userId]);
  return rows[0] || null;
}

async function recordSecurityEvent(action, targetId, metadata = {}) {
  try {
    await authPool.query(`
      INSERT INTO app_audit_log (actor_user_id, action, target_type, target_id, metadata)
      VALUES (NULL, $1, 'user', $2, $3::jsonb)
    `, [action, targetId || null, JSON.stringify(metadata)]);
  } catch {
    // Authentication must fail closed even if audit persistence is temporarily unavailable.
  }
}

async function validateSessionCreation(session) {
  const identity = await loadIdentityForSession(session.userId);
  const { rows } = await authPool.query('SELECT email FROM "user" WHERE id = $1', [session.userId]);
  const email = rows[0]?.email || '';
  const valid = Boolean(
    identity
    && identity.user_active
    && identity.tenant_active
    && isValidApplicationRole(identity.role)
    && isEmailAllowedForTenant(email, identity.tenant_slug)
  );
  if (!valid) {
    await recordSecurityEvent('LOGIN_IDENTITY_REJECTED', session.userId);
    throw new APIError('UNAUTHORIZED', { message: genericLoginMessage });
  }
}

const baseURL = String(process.env.BETTER_AUTH_URL || '').trim() || undefined;
const trustedOrigins = Array.from(new Set([
  baseURL,
  ...String(process.env.BETTER_AUTH_TRUSTED_ORIGINS || '')
    .split(',')
    .map((value) => value.trim())
].filter(Boolean)));

export const auth = betterAuth({
  appName: 'SaTourN Qualitätsmonitor',
  baseURL,
  secret: process.env.BETTER_AUTH_SECRET,
  database: authPool,
  trustedOrigins,
  emailAndPassword: {
    enabled: true,
    disableSignUp: true,
    minPasswordLength: 12,
    maxPasswordLength: 128,
    revokeSessionsOnPasswordReset: true
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24
  },
  rateLimit: {
    enabled: true,
    storage: 'database',
    modelName: 'authRateLimit',
    window: 60,
    max: 100,
    customRules: {
      '/sign-in/email': { window: 60, max: 5 }
    }
  },
  advanced: {
    cookiePrefix: 'satourn',
    useSecureCookies: process.env.NODE_ENV === 'production',
    ipAddress: {
      ipAddressHeaders: ['x-vercel-forwarded-for', 'x-real-ip', 'x-forwarded-for']
    },
    database: { joins: true }
  },
  databaseHooks: {
    session: {
      create: {
        before: async (session) => {
          await validateSessionCreation(session);
          return { data: session };
        },
        after: async (session) => {
          await authPool.query(
            'UPDATE app_user_profile SET last_login_at = NOW(), updated_at = NOW() WHERE user_id = $1',
            [session.userId]
          );
        }
      }
    }
  },
  plugins: [admin()]
});

export { genericLoginMessage };
