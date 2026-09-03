import { randomUUID } from 'node:crypto';

import { createTemporaryPassword, hashPassword } from '../auth/passwords.js';
import {
  allowedDomainsForTenant,
  isEmailAllowedForTenant,
  isValidApplicationRole,
  normalizeEmail
} from '../auth/tenant-domains.js';
import { qualityCriteria } from '../quality/criteria.js';
import { decryptIntegrationSecret, maskSecret, saveTenantIntegration, tenantIntegration } from '../integrations/tenant-secrets.js';
import { getDatabaseClient, methodNotAllowed, parseBody, positiveInteger, sendJson } from './http.js';
import { publicIdentity, requireSuperAdmin } from './auth.js';

export class AdminRequestError extends Error {
  constructor(status, code, message) {
    super(message);
    this.name = 'AdminRequestError';
    this.status = status;
    this.code = code;
  }
}

function fail(status, code, message) {
  throw new AdminRequestError(status, code, message);
}

function hasOwn(value, key) {
  return Object.prototype.hasOwnProperty.call(value || {}, key);
}

function requiredText(value, label, maximum = 160) {
  const text = String(value || '').trim();
  if (!text || text.length > maximum) fail(400, 'INVALID_INPUT', `${label} ist ungültig.`);
  return text;
}

function applicationRole(value) {
  const role = String(value || '').trim().toUpperCase();
  if (!isValidApplicationRole(role)) fail(400, 'INVALID_ROLE', 'Die ausgewählte Rolle ist ungültig.');
  return role;
}

function tenantSlug(value) {
  const slug = String(value || '').trim().toLowerCase();
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 80) {
    fail(400, 'INVALID_TENANT_SLUG', 'Der Slug darf nur Kleinbuchstaben, Zahlen und Bindestriche enthalten.');
  }
  return slug;
}

function assertTenantEmail(email, tenant) {
  if (!isEmailAllowedForTenant(email, tenant.slug)) {
    const configured = allowedDomainsForTenant(tenant.slug).length > 0;
    fail(
      400,
      configured ? 'EMAIL_DOMAIN_FORBIDDEN' : 'TENANT_DOMAIN_NOT_CONFIGURED',
      configured
        ? 'Die E-Mail-Adresse ist für die ausgewählte Nutzergruppe nicht zulässig.'
        : 'Für diese Nutzergruppe ist noch keine erlaubte E-Mail-Domain im Servercode hinterlegt.'
    );
  }
}

async function findTenant(sql, id, { activeOnly = false } = {}) {
  const parameters = [String(id || '').trim()];
  const [tenant] = await sql.query(
    `SELECT id, name, slug, parent_tenant_id, is_root, access_all_areas, active, theme
     FROM app_tenant
     WHERE id = $1${activeOnly ? ' AND active = TRUE' : ''}`,
    parameters
  );
  if (!tenant) fail(404, 'TENANT_NOT_FOUND', 'Die Nutzergruppe wurde nicht gefunden.');
  return tenant;
}

async function listUsers(sql) {
  return sql.query(`
    SELECT
      profile.user_id AS id,
      profile.auth_user_id::text AS auth_user_id,
      auth_user.name,
      profile.email,
      profile.role,
      profile.active,
      profile.must_change_password,
      profile.last_login_at,
      profile.password_changed_at,
      profile.created_at,
      tenant.id AS tenant_id,
      tenant.name AS tenant_name,
      tenant.slug AS tenant_slug,
      (SELECT COUNT(*)::integer
       FROM neon_auth."session" AS session
       WHERE session."userId" = profile.auth_user_id
         AND session."expiresAt" > NOW()) AS active_sessions
    FROM app_user_profile AS profile
    JOIN app_tenant AS tenant ON tenant.id = profile.tenant_id
    LEFT JOIN neon_auth."user" AS auth_user ON auth_user.id = profile.auth_user_id
    ORDER BY profile.active DESC, auth_user.name NULLS LAST, profile.email
  `);
}

async function listTenants(sql) {
  return sql.query(`
    SELECT
      tenant.id,
      tenant.name,
      tenant.slug,
      tenant.parent_tenant_id,
      parent.name AS parent_name,
      tenant.is_root,
      tenant.access_all_areas,
      tenant.active,
      tenant.theme,
      (SELECT COUNT(*)::integer FROM app_user_profile AS profile WHERE profile.tenant_id = tenant.id) AS user_count,
      COALESCE((
        SELECT jsonb_agg(mapping.area_id ORDER BY area.name)
        FROM app_tenant_area AS mapping
        JOIN app_area AS area ON area.id = mapping.area_id
        WHERE mapping.tenant_id = tenant.id
      ), '[]'::jsonb) AS area_ids
    FROM app_tenant AS tenant
    LEFT JOIN app_tenant AS parent ON parent.id = tenant.parent_tenant_id
    ORDER BY tenant.is_root DESC, tenant.name
  `);
}

async function listAreas(sql) {
  return sql.query(`
    SELECT id, external_id, name, slug, active
    FROM app_area
    ORDER BY active DESC, name
  `);
}

async function overview(request, response, identity) {
  if (request.method !== 'GET') return methodNotAllowed(response, ['GET']);
  const sql = getDatabaseClient();
  const [metrics] = await sql.query(`
    SELECT
      (SELECT COUNT(*)::integer FROM app_user_profile WHERE active = TRUE) AS active_users,
      (SELECT COUNT(*)::integer FROM app_user_profile WHERE active = FALSE) AS inactive_users,
      (SELECT COUNT(*)::integer FROM app_tenant WHERE active = TRUE) AS active_tenants,
      (SELECT COUNT(*)::integer FROM neon_auth."session" WHERE "expiresAt" > NOW()) AS active_sessions
  `);
  const [sync] = await sql.query(`
    SELECT MAX(last_success_at) AS last_import_at,
           BOOL_AND(status = 'success') AS all_imports_successful,
           COUNT(*) FILTER (WHERE status = 'failed')::integer AS failed_imports
    FROM et4_sync_state
  `);
  const recentAudit = await auditRows(sql, 10, 0);
  return sendJson(response, 200, { user: publicIdentity(identity), metrics, sync, recentAudit });
}

async function users(request, response, identity) {
  if (request.method === 'GET') {
    return sendJson(response, 200, { users: await listUsers(getDatabaseClient()) });
  }
  if (request.method !== 'POST') return methodNotAllowed(response, ['GET', 'POST']);
  return createUser(request, response, identity);
}

async function createUser(request, response, identity) {
  const body = parseBody(request.body);
  const name = requiredText(body.name, 'Name', 160);
  const email = normalizeEmail(body.email);
  const role = applicationRole(body.role || 'USER');
  const sql = getDatabaseClient();
  const tenant = await findTenant(sql, body.tenantId, { activeOnly: true });
  assertTenantEmail(email, tenant);
  if (role === 'SUPER_ADMIN' && !tenant.is_root) {
    fail(400, 'SUPER_ADMIN_REQUIRES_ROOT', 'Super-Admins müssen dem Root-Mandanten zugeordnet sein.');
  }

  const [existing] = await sql.query(`
    SELECT email FROM app_user_profile WHERE LOWER(email) = $1
    UNION ALL SELECT email FROM neon_auth."user" WHERE LOWER(email) = $1
    UNION ALL SELECT email FROM public."user" WHERE LOWER(email) = $1
    LIMIT 1
  `, [email]);
  if (existing) fail(409, 'USER_EXISTS', 'Für diese E-Mail-Adresse existiert bereits ein Konto.');

  const authUserId = randomUUID();
  const password = createTemporaryPassword();
  const passwordHash = await hashPassword(password);
  const actor = identity.profile_id;

  await sql.transaction([
    sql`INSERT INTO neon_auth."user"
          (id, name, email, "emailVerified", "createdAt", "updatedAt", role, banned)
        VALUES (${authUserId}::uuid, ${name}, ${email}, FALSE, NOW(), NOW(), 'user', FALSE)`,
    sql`INSERT INTO neon_auth."account"
          ("accountId", "providerId", "userId", password, "createdAt", "updatedAt")
        VALUES (${authUserId}, 'credential', ${authUserId}::uuid, ${passwordHash}, NOW(), NOW())`,
    sql`INSERT INTO public."user" (id, name, email, "emailVerified", "createdAt", "updatedAt")
        VALUES (${authUserId}, ${name}, ${email}, FALSE, NOW(), NOW())`,
    sql`INSERT INTO app_user_profile
          (user_id, tenant_id, role, active, must_change_password, email, auth_user_id)
        VALUES (${authUserId}, ${tenant.id}, ${role}, TRUE, TRUE, ${email}, ${authUserId}::uuid)`,
    sql`INSERT INTO app_audit_log (actor_user_id, action, target_type, target_id, metadata)
        VALUES (${actor}, 'USER_CREATED', 'user', ${authUserId},
          ${JSON.stringify({ email, tenant: tenant.slug, role })}::jsonb)`
  ]);

  return sendJson(response, 201, {
    user: { id: authUserId, name, email, role, tenantId: tenant.id },
    temporaryPassword: password,
    mustChangePassword: true
  });
}

async function userUpdate(request, response, identity) {
  if (request.method !== 'POST') return methodNotAllowed(response, ['POST']);
  const body = parseBody(request.body);
  const userId = requiredText(body.userId, 'Nutzer-ID', 200);
  const sql = getDatabaseClient();
  const [current] = await sql.query(`
    SELECT profile.user_id, profile.auth_user_id::text, profile.email, profile.role,
           profile.active, profile.tenant_id, auth_user.name
    FROM app_user_profile AS profile
    JOIN neon_auth."user" AS auth_user ON auth_user.id = profile.auth_user_id
    WHERE profile.user_id = $1
  `, [userId]);
  if (!current) fail(404, 'USER_NOT_FOUND', 'Der Nutzer wurde nicht gefunden.');

  const nextName = hasOwn(body, 'name') ? requiredText(body.name, 'Name', 160) : current.name;
  const nextEmail = hasOwn(body, 'email') ? normalizeEmail(body.email) : current.email;
  const nextRole = hasOwn(body, 'role') ? applicationRole(body.role) : current.role;
  const nextActive = hasOwn(body, 'active') ? body.active === true : current.active;
  const nextTenant = await findTenant(sql, hasOwn(body, 'tenantId') ? body.tenantId : current.tenant_id, { activeOnly: true });
  assertTenantEmail(nextEmail, nextTenant);
  if (nextRole === 'SUPER_ADMIN' && !nextTenant.is_root) {
    fail(400, 'SUPER_ADMIN_REQUIRES_ROOT', 'Super-Admins müssen dem Root-Mandanten zugeordnet sein.');
  }
  if (nextEmail !== current.email) {
    const [duplicate] = await sql.query(`
      SELECT user_id FROM app_user_profile
      WHERE LOWER(email) = $1 AND user_id <> $2
      LIMIT 1
    `, [nextEmail, current.user_id]);
    if (duplicate) fail(409, 'USER_EXISTS', 'Für diese E-Mail-Adresse existiert bereits ein Konto.');
  }

  const isSelf = String(current.auth_user_id) === String(identity.id);
  if (isSelf && (!nextActive || nextRole !== 'SUPER_ADMIN' || nextTenant.id !== current.tenant_id)) {
    fail(400, 'SELF_LOCKOUT_FORBIDDEN', 'Das eigene Super-Admin-Konto kann hier nicht gesperrt oder herabgestuft werden.');
  }
  if (current.role === 'SUPER_ADMIN' && (nextRole !== 'SUPER_ADMIN' || !nextActive)) {
    const [{ count }] = await sql.query(
      `SELECT COUNT(*)::integer AS count FROM app_user_profile WHERE role = 'SUPER_ADMIN' AND active = TRUE`,
      []
    );
    if (count <= 1) fail(400, 'LAST_SUPER_ADMIN', 'Der letzte aktive Super-Admin kann nicht deaktiviert oder herabgestuft werden.');
  }

  const securityChanged = nextEmail !== current.email
    || nextRole !== current.role
    || nextActive !== current.active
    || nextTenant.id !== current.tenant_id
    || body.forcePasswordChange === true;
  const metadata = {
    emailChanged: nextEmail !== current.email,
    role: { from: current.role, to: nextRole },
    tenant: { from: current.tenant_id, to: nextTenant.id },
    active: { from: current.active, to: nextActive },
    forcePasswordChange: body.forcePasswordChange === true
  };

  const statements = [
    sql`UPDATE neon_auth."user"
        SET name = ${nextName}, email = ${nextEmail}, "updatedAt" = NOW()
        WHERE id = ${current.auth_user_id}::uuid`,
    sql`UPDATE public."user"
        SET name = ${nextName}, email = ${nextEmail}, "updatedAt" = NOW()
        WHERE id = ${current.user_id}`,
    sql`UPDATE app_user_profile
        SET email = ${nextEmail}, role = ${nextRole}, active = ${nextActive},
            tenant_id = ${nextTenant.id},
            must_change_password = CASE WHEN ${body.forcePasswordChange === true} THEN TRUE ELSE must_change_password END,
            updated_at = NOW()
        WHERE user_id = ${current.user_id}`,
    sql`INSERT INTO app_audit_log (actor_user_id, action, target_type, target_id, metadata)
        VALUES (${identity.profile_id}, 'USER_UPDATED', 'user', ${current.user_id},
          ${JSON.stringify(metadata)}::jsonb)`
  ];
  if (securityChanged) {
    statements.push(sql`DELETE FROM neon_auth."session" WHERE "userId" = ${current.auth_user_id}::uuid`);
  }
  await sql.transaction(statements);
  return sendJson(response, 200, { ok: true, sessionsRevoked: securityChanged });
}

async function userResetPassword(request, response, identity) {
  if (request.method !== 'POST') return methodNotAllowed(response, ['POST']);
  const body = parseBody(request.body);
  const userId = requiredText(body.userId, 'Nutzer-ID', 200);
  const sql = getDatabaseClient();
  const [target] = await sql.query(`
    SELECT profile.user_id, profile.auth_user_id::text, profile.email, auth_account.id::text AS account_id
    FROM app_user_profile AS profile
    JOIN neon_auth."account" AS auth_account
      ON auth_account."userId" = profile.auth_user_id AND auth_account."providerId" = 'credential'
    WHERE profile.user_id = $1
  `, [userId]);
  if (!target) fail(404, 'USER_NOT_FOUND', 'Der Nutzer wurde nicht gefunden.');
  if (String(target.auth_user_id) === String(identity.id)) {
    fail(400, 'SELF_PASSWORD_RESET_FORBIDDEN', 'Das eigene Passwort wird über das persönliche Passwortformular geändert.');
  }

  const password = createTemporaryPassword();
  const passwordHash = await hashPassword(password);
  await sql.transaction([
    sql`UPDATE neon_auth."account"
        SET password = ${passwordHash}, "updatedAt" = NOW()
        WHERE id = ${target.account_id}::uuid`,
    sql`DELETE FROM neon_auth."session" WHERE "userId" = ${target.auth_user_id}::uuid`,
    sql`UPDATE app_user_profile
        SET must_change_password = TRUE, password_changed_at = NULL, updated_at = NOW()
        WHERE user_id = ${target.user_id}`,
    sql`INSERT INTO app_audit_log (actor_user_id, action, target_type, target_id, metadata)
        VALUES (${identity.profile_id}, 'PASSWORD_RESET', 'user', ${target.user_id}, '{}'::jsonb)`
  ]);
  return sendJson(response, 200, { temporaryPassword: password, mustChangePassword: true });
}

async function userRevokeSessions(request, response, identity) {
  if (request.method !== 'POST') return methodNotAllowed(response, ['POST']);
  const userId = requiredText(parseBody(request.body).userId, 'Nutzer-ID', 200);
  const sql = getDatabaseClient();
  const [target] = await sql.query(
    'SELECT user_id, auth_user_id::text FROM app_user_profile WHERE user_id = $1',
    [userId]
  );
  if (!target) fail(404, 'USER_NOT_FOUND', 'Der Nutzer wurde nicht gefunden.');
  if (String(target.auth_user_id) === String(identity.id)) {
    fail(400, 'SELF_SESSION_REVOKE_FORBIDDEN', 'Die eigene Sitzung wird über „Abmelden“ beendet.');
  }
  const revoked = await sql.query(
    'DELETE FROM neon_auth."session" WHERE "userId" = $1::uuid RETURNING id',
    [target.auth_user_id]
  );
  await sql.query(`
    INSERT INTO app_audit_log (actor_user_id, action, target_type, target_id, metadata)
    VALUES ($1, 'SESSIONS_REVOKED', 'user', $2, $3::jsonb)
  `, [identity.profile_id, target.user_id, JSON.stringify({ count: revoked.length })]);
  return sendJson(response, 200, { revokedSessions: revoked.length });
}

async function tenants(request, response, identity) {
  const sql = getDatabaseClient();
  if (request.method === 'GET') {
    return sendJson(response, 200, { tenants: await listTenants(sql), areas: await listAreas(sql) });
  }
  if (request.method !== 'POST') return methodNotAllowed(response, ['GET', 'POST']);
  const body = parseBody(request.body);
  const name = requiredText(body.name, 'Name', 160);
  const slug = tenantSlug(body.slug);
  const theme = requiredText(body.theme || 'satourn', 'Farbschema', 80);
  const parent = await findTenant(sql, body.parentTenantId || 'tenant_tmgs', { activeOnly: true });
  const [existing] = await sql.query('SELECT id FROM app_tenant WHERE slug = $1 LIMIT 1', [slug]);
  if (existing) fail(409, 'TENANT_EXISTS', 'Eine Nutzergruppe mit diesem Slug existiert bereits.');
  const id = `tenant_${randomUUID().replaceAll('-', '')}`;
  await sql.transaction([
    sql`INSERT INTO app_tenant
          (id, name, slug, parent_tenant_id, is_root, access_all_areas, active, theme)
        VALUES (${id}, ${name}, ${slug}, ${parent.id}, FALSE, FALSE, TRUE, ${theme})`,
    sql`INSERT INTO app_audit_log (actor_user_id, action, target_type, target_id, metadata)
        VALUES (${identity.profile_id}, 'TENANT_CREATED', 'tenant', ${id},
          ${JSON.stringify({ name, slug, parent: parent.id, theme })}::jsonb)`
  ]);
  return sendJson(response, 201, {
    tenant: { id, name, slug, parentTenantId: parent.id, active: true, theme },
    domainConfigured: allowedDomainsForTenant(slug).length > 0
  });
}

async function tenantUpdate(request, response, identity) {
  if (request.method !== 'POST') return methodNotAllowed(response, ['POST']);
  const body = parseBody(request.body);
  const sql = getDatabaseClient();
  const current = await findTenant(sql, body.tenantId);
  const nextName = hasOwn(body, 'name') ? requiredText(body.name, 'Name', 160) : current.name;
  const nextTheme = hasOwn(body, 'theme') ? requiredText(body.theme, 'Farbschema', 80) : current.theme;
  const nextActive = hasOwn(body, 'active') ? body.active === true : current.active;
  let parentId = current.parent_tenant_id;
  if (hasOwn(body, 'parentTenantId')) {
    const requestedParentId = String(body.parentTenantId || '').trim();
    if (!requestedParentId) {
      if (!current.is_root) fail(400, 'PARENT_TENANT_REQUIRED', 'Eine Nutzergruppe benötigt einen aktiven Parent-Mandanten.');
      parentId = null;
    } else {
      const parent = await findTenant(sql, requestedParentId, { activeOnly: true });
      parentId = parent.id;
    }
  }
  if (current.is_root && (!nextActive || parentId)) {
    fail(400, 'ROOT_TENANT_PROTECTED', 'Der Root-Mandant kann nicht deaktiviert oder untergeordnet werden.');
  }
  if (!current.is_root && parentId === current.id) {
    fail(400, 'TENANT_CYCLE', 'Eine Nutzergruppe kann nicht ihr eigener Parent sein.');
  }
  if (!current.is_root && parentId) {
    const [cycle] = await sql.query(`
      WITH RECURSIVE descendants AS (
        SELECT id FROM app_tenant WHERE parent_tenant_id = $1
        UNION ALL
        SELECT child.id FROM app_tenant AS child JOIN descendants ON child.parent_tenant_id = descendants.id
      )
      SELECT id FROM descendants WHERE id = $2 LIMIT 1
    `, [current.id, parentId]);
    if (cycle) fail(400, 'TENANT_CYCLE', 'Diese Parent-Zuordnung würde einen Kreis erzeugen.');
  }

  const statements = [
    sql`UPDATE app_tenant
        SET name = ${nextName}, parent_tenant_id = ${parentId}, active = ${nextActive},
            theme = ${nextTheme}, updated_at = NOW()
        WHERE id = ${current.id}`,
    sql`INSERT INTO app_audit_log (actor_user_id, action, target_type, target_id, metadata)
        VALUES (${identity.profile_id}, 'TENANT_UPDATED', 'tenant', ${current.id},
          ${JSON.stringify({ active: { from: current.active, to: nextActive }, theme: { from: current.theme, to: nextTheme }, parent: { from: current.parent_tenant_id, to: parentId } })}::jsonb)`
  ];
  if (current.active && !nextActive) {
    statements.push(sql`DELETE FROM neon_auth."session"
                        WHERE "userId" IN (SELECT auth_user_id FROM app_user_profile WHERE tenant_id = ${current.id})`);
  }
  await sql.transaction(statements);
  return sendJson(response, 200, { ok: true, sessionsRevoked: current.active && !nextActive });
}

async function tenantAreas(request, response, identity) {
  if (request.method !== 'POST') return methodNotAllowed(response, ['POST']);
  const body = parseBody(request.body);
  const sql = getDatabaseClient();
  const tenant = await findTenant(sql, body.tenantId);
  if (tenant.access_all_areas) fail(400, 'ROOT_AREAS_IMPLICIT', 'Der Root-Mandant besitzt bereits Zugriff auf alle Areas.');
  const areaIds = Array.from(new Set((Array.isArray(body.areaIds) ? body.areaIds : [])
    .map((value) => String(value || '').trim()).filter(Boolean)));
  const validAreas = areaIds.length
    ? await sql.query('SELECT id FROM app_area WHERE active = TRUE AND id = ANY($1::text[])', [areaIds])
    : [];
  if (validAreas.length !== areaIds.length) fail(400, 'INVALID_AREAS', 'Mindestens eine ausgewählte Area ist ungültig.');
  const previous = await sql.query('SELECT area_id FROM app_tenant_area WHERE tenant_id = $1', [tenant.id]);
  const statements = [sql`DELETE FROM app_tenant_area WHERE tenant_id = ${tenant.id}`];
  areaIds.forEach((areaId) => statements.push(sql`
    INSERT INTO app_tenant_area (tenant_id, area_id) VALUES (${tenant.id}, ${areaId})
  `));
  statements.push(sql`
    INSERT INTO app_audit_log (actor_user_id, action, target_type, target_id, metadata)
    VALUES (${identity.profile_id}, 'TENANT_AREAS_UPDATED', 'tenant', ${tenant.id},
      ${JSON.stringify({ from: previous.map((row) => row.area_id), to: areaIds })}::jsonb)
  `);
  await sql.transaction(statements);
  return sendJson(response, 200, { ok: true, areaIds });
}

async function quality(request, response) {
  if (request.method !== 'GET') return methodNotAllowed(response, ['GET']);
  return sendJson(response, 200, {
    criteria: qualityCriteria.map((criterion) => ({
      id: criterion.id,
      label: criterion.label,
      recommendation: criterion.recommendation || '',
      active: criterion.autoCheck !== false,
      severity: criterion.uiSeverity || criterion.priority || 'normal',
      types: criterion.types || [],
      method: criterion.method || 'server_scan'
    }))
  });
}

async function auditRows(sql, limit, offset) {
  return sql.query(`
    SELECT log.id, log.action, log.target_type, log.target_id, log.metadata, log.created_at,
           actor.email AS actor_email, actor_user.name AS actor_name
    FROM app_audit_log AS log
    LEFT JOIN app_user_profile AS actor ON actor.user_id = log.actor_user_id
    LEFT JOIN neon_auth."user" AS actor_user ON actor_user.id = actor.auth_user_id
    ORDER BY log.created_at DESC
    LIMIT $1 OFFSET $2
  `, [limit, offset]);
}

async function audit(request, response) {
  if (request.method !== 'GET') return methodNotAllowed(response, ['GET']);
  const limit = positiveInteger(request.query?.limit, 50, 200) || 1;
  const offset = positiveInteger(request.query?.offset, 0, 1_000_000);
  const sql = getDatabaseClient();
  const [{ count }] = await sql.query('SELECT COUNT(*)::integer AS count FROM app_audit_log');
  return sendJson(response, 200, { entries: await auditRows(sql, limit, offset), count, limit, offset });
}

async function status(request, response) {
  if (request.method !== 'GET') return methodNotAllowed(response, ['GET']);
  const sql = getDatabaseClient();
  const started = Date.now();
  await sql`SELECT 1`;
  const databaseLatencyMs = Date.now() - started;
  const syncStates = await sql.query(`
    SELECT record_type, status, last_attempt_at, last_success_at, imported_count, error_message
    FROM et4_sync_state
    ORDER BY record_type
  `);
  const [auth] = await sql.query(`
    SELECT
      (SELECT COUNT(*)::integer FROM app_user_profile WHERE active = TRUE) AS active_users,
      (SELECT COUNT(*)::integer FROM app_user_profile WHERE active = FALSE) AS inactive_users,
      (SELECT COUNT(*)::integer FROM neon_auth."session" WHERE "expiresAt" > NOW()) AS active_sessions
  `);
  return sendJson(response, 200, {
    database: { ok: true, latencyMs: databaseLatencyMs },
    authentication: auth,
    imports: syncStates
  });
}

function integrationTenantId(identity, value) {
  const requested = String(value || identity.tenant_id).trim();
  if (identity.role === 'SUPER_ADMIN') return requested;
  if (identity.role === 'GROUP_ADMIN' && requested === identity.tenant_id) return requested;
  fail(403, 'FORBIDDEN', 'Diese Integration darf nicht verwaltet werden.');
}

async function tenantIntegrationSettings(request, response, identity) {
  if (!['GROUP_ADMIN', 'SUPER_ADMIN'].includes(identity.role)) fail(403, 'FORBIDDEN', 'Diese Integration darf nicht verwaltet werden.');
  const sql = getDatabaseClient();
  if (request.method === 'GET') {
    const tenantId = integrationTenantId(identity, request.query?.tenantId);
    await findTenant(sql, tenantId);
    const integration = await tenantIntegration(sql, tenantId);
    return sendJson(response, 200, { integration: integration ? {
      tenantId,
      provider: integration.provider,
      projectKey: integration.project_key,
      apiKeyMasked: maskSecret(decryptIntegrationSecret(integration.api_key_encrypted)),
      active: integration.active,
      lastTestedAt: integration.last_tested_at,
      lastTestSucceeded: integration.last_test_succeeded,
      updatedAt: integration.updated_at
    } : null });
  }
  if (request.method !== 'POST') return methodNotAllowed(response, ['GET', 'POST']);
  const body = parseBody(request.body);
  const tenantId = integrationTenantId(identity, body.tenantId);
  await findTenant(sql, tenantId);
  const projectKey = requiredText(body.projectKey, 'Project Key', 200);
  const apiKey = String(body.apiKey || '').trim();
  if (apiKey && apiKey.length > 1000) fail(400, 'INVALID_INPUT', 'Der API Key ist ungültig.');
  const integration = await saveTenantIntegration(sql, { tenantId, projectKey, apiKey, active: body.active !== false, actorId: identity.profile_id });
  await sql.query(`INSERT INTO app_audit_log (actor_user_id, action, target_type, target_id, metadata) VALUES ($1, 'TENANT_INTEGRATION_UPDATED', 'tenant_integration', $2, $3::jsonb)`, [identity.profile_id, integration.id, JSON.stringify({ tenantId, provider: 'outdooractive', projectKey, keyChanged: Boolean(apiKey), active: integration.active })]);
  return sendJson(response, 200, { ok: true, integration: { tenantId, provider: 'outdooractive', projectKey, apiKeyMasked: maskSecret(decryptIntegrationSecret(integration.api_key_encrypted)), active: integration.active } });
}

function secured(operation) {
  return async (request, response, identity) => {
    requireSuperAdmin(identity);
    return operation(request, response, identity);
  };
}

export const adminOperations = new Map([
  ['admin-overview', secured(overview)],
  ['admin-users', secured(users)],
  ['admin-user-update', secured(userUpdate)],
  ['admin-user-reset-password', secured(userResetPassword)],
  ['admin-user-revoke-sessions', secured(userRevokeSessions)],
  ['admin-tenants', secured(tenants)],
  ['admin-tenant-update', secured(tenantUpdate)],
  ['admin-tenant-areas', secured(tenantAreas)],
  ['admin-quality', secured(quality)],
  ['admin-audit', secured(audit)],
  ['admin-status', secured(status)]
  ,['admin-tenant-integration', tenantIntegrationSettings]
]);
