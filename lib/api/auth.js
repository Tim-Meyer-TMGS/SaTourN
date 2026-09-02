import { getNeonAuthSession } from '../auth/neon-bridge.js';
import { isValidApplicationRole, normalizeEmail } from '../auth/tenant-domains.js';
import { getDatabaseClient, sendJson } from './http.js';

export class AuthAccessError extends Error {
  constructor(status, code, message) {
    super(message);
    this.name = 'AuthAccessError';
    this.status = status;
    this.code = code;
  }
}

export async function approvedLoginEmail(email) {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) return false;
  const sql = getDatabaseClient();
  const [profile] = await sql.query(`
    SELECT profile.role
    FROM app_user_profile AS profile
    JOIN app_tenant AS tenant ON tenant.id = profile.tenant_id
    WHERE LOWER(profile.email) = $1
      AND profile.active = TRUE
      AND tenant.active = TRUE
  `, [normalizedEmail]);
  return Boolean(profile && isValidApplicationRole(profile.role));
}

export async function recordSuccessfulLogin(email) {
  const sql = getDatabaseClient();
  await sql.query(`
    UPDATE app_user_profile
    SET last_login_at = NOW(), updated_at = NOW()
    WHERE LOWER(email) = $1
  `, [normalizeEmail(email)]);
}

export async function authenticatedIdentity(request, { allowPasswordChange = false } = {}) {
  const session = await getNeonAuthSession(request);
  if (!session?.user?.id) throw new AuthAccessError(401, 'UNAUTHORIZED', 'Unauthorized');

  const sql = getDatabaseClient();
  const [identity] = await sql.query(`
    SELECT
      auth_user.id::text AS id,
      auth_user.name,
      auth_user.email,
      profile.user_id AS profile_id,
      profile.auth_user_id,
      profile.role,
      profile.active,
      profile.must_change_password,
      profile.last_login_at,
      profile.password_changed_at,
      tenant.id AS tenant_id,
      tenant.name AS tenant_name,
      tenant.slug AS tenant_slug,
      tenant.is_root,
      tenant.access_all_areas,
      tenant.active AS tenant_active,
      tenant.theme,
      COALESCE(
        jsonb_agg(area.external_id ORDER BY area.external_id)
          FILTER (WHERE area.external_id IS NOT NULL AND area.active = TRUE),
        '[]'::jsonb
      ) AS allowed_area_ids
    FROM neon_auth."user" AS auth_user
    JOIN app_user_profile AS profile
      ON profile.auth_user_id = auth_user.id
      OR (profile.auth_user_id IS NULL AND LOWER(profile.email) = LOWER(auth_user.email))
    JOIN app_tenant AS tenant ON tenant.id = profile.tenant_id
    LEFT JOIN app_tenant_area AS tenant_area ON tenant_area.tenant_id = tenant.id
    LEFT JOIN app_area AS area ON area.id = tenant_area.area_id
    WHERE auth_user.id = $1::uuid
    GROUP BY auth_user.id, profile.user_id, tenant.id
  `, [session.user.id]);

  const valid = Boolean(
    identity
    && identity.active
    && identity.tenant_active
    && isValidApplicationRole(identity.role)
    && normalizeEmail(identity.email) === normalizeEmail(session.user.email)
  );
  if (!valid) throw new AuthAccessError(401, 'UNAUTHORIZED', 'Unauthorized');

  if (!identity.auth_user_id) {
    await sql.query(`
      UPDATE app_user_profile
      SET auth_user_id = $1::uuid, updated_at = NOW()
      WHERE user_id = $2 AND auth_user_id IS NULL
    `, [session.user.id, identity.profile_id]);
  }
  if (identity.must_change_password && !allowPasswordChange) {
    throw new AuthAccessError(403, 'PASSWORD_CHANGE_REQUIRED', 'Password change required');
  }

  return {
    ...identity,
    allowed_area_ids: Array.isArray(identity.allowed_area_ids) ? identity.allowed_area_ids : [],
    session: session.session
  };
}

export function requireSuperAdmin(identity) {
  if (identity?.role !== 'SUPER_ADMIN') {
    throw new AuthAccessError(403, 'FORBIDDEN', 'Forbidden');
  }
  return identity;
}

export function sendAuthAccessError(response, error) {
  if (!(error instanceof AuthAccessError)) return false;
  sendJson(response, error.status, { error: error.code });
  return true;
}

export function publicIdentity(identity) {
  return {
    id: identity.id,
    name: identity.name,
    email: identity.email,
    role: identity.role,
    tenant: {
      id: identity.tenant_id,
      name: identity.tenant_name,
      slug: identity.tenant_slug,
      isRoot: identity.is_root,
      accessAllAreas: identity.access_all_areas,
      theme: identity.theme
    },
    mustChangePassword: identity.must_change_password,
    lastLoginAt: identity.last_login_at,
    passwordChangedAt: identity.password_changed_at
  };
}
