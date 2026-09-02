import {
  authenticatedIdentity,
  publicIdentity,
  requireSuperAdmin,
  sendAuthAccessError
} from '../_auth.js';
import { getDatabaseClient, methodNotAllowed, sendJson } from '../_database.js';

export default async function handler(request, response) {
  if (request.method !== 'GET') return methodNotAllowed(response, ['GET']);
  try {
    const identity = requireSuperAdmin(await authenticatedIdentity(request));
    const sql = getDatabaseClient();
    const [metrics] = await sql.query(`
      SELECT
        (SELECT COUNT(*)::integer FROM app_user_profile WHERE active = TRUE) AS active_users,
        (SELECT COUNT(*)::integer FROM app_user_profile WHERE active = FALSE) AS inactive_users,
        (SELECT COUNT(*)::integer FROM app_tenant WHERE active = TRUE) AS active_tenants,
        (SELECT COUNT(*)::integer FROM "session" WHERE "expiresAt" > NOW()) AS active_sessions
    `);
    const recentAudit = await sql.query(`
      SELECT id, action, target_type, target_id, created_at
      FROM app_audit_log
      ORDER BY created_at DESC
      LIMIT 10
    `);
    return sendJson(response, 200, {
      user: publicIdentity(identity),
      metrics,
      recentAudit
    });
  } catch (error) {
    if (sendAuthAccessError(response, error)) return;
    console.error('Admin overview failed.', error);
    return sendJson(response, 500, { error: 'ADMIN_OVERVIEW_FAILED' });
  }
}
