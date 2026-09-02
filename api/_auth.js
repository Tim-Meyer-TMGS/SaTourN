import { fromNodeHeaders } from 'better-auth/node';

import { auth } from '../lib/auth/server.js';
import { emailDomain, isEmailAllowedForTenant, isValidApplicationRole } from '../lib/auth/tenant-domains.js';
import { getDatabaseClient, sendJson } from './_database.js';

export class AuthAccessError extends Error {
  constructor(status, code, message) {
    super(message);
    this.name = 'AuthAccessError';
    this.status = status;
    this.code = code;
  }
}

export async function authenticatedIdentity(request, { allowPasswordChange = false } = {}) {
  const session = await auth.api.getSession({ headers: fromNodeHeaders(request.headers || {}) });
  if (!session?.user?.id) throw new AuthAccessError(401, 'UNAUTHORIZED', 'Unauthorized');

  const sql = getDatabaseClient();
  const [identity] = await sql.query(`
    SELECT
      auth_user.id,
      auth_user.name,
      auth_user.email,
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
    FROM "user" AS auth_user
    JOIN app_user_profile AS profile ON profile.user_id = auth_user.id
    JOIN app_tenant AS tenant ON tenant.id = profile.tenant_id
    LEFT JOIN app_tenant_area AS tenant_area ON tenant_area.tenant_id = tenant.id
    LEFT JOIN app_area AS area ON area.id = tenant_area.area_id
    WHERE auth_user.id = $1
    GROUP BY auth_user.id, profile.user_id, tenant.id
  `, [session.user.id]);

  const valid = Boolean(
    identity
    && identity.active
    && identity.tenant_active
    && isValidApplicationRole(identity.role)
    && emailDomain(identity.email)
    && isEmailAllowedForTenant(identity.email, identity.tenant_slug)
  );
  if (!valid) throw new AuthAccessError(401, 'UNAUTHORIZED', 'Unauthorized');
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
