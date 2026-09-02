import { authenticatedIdentity, sendAuthAccessError } from '../../lib/api/auth.js';
import { getDatabaseClient, methodNotAllowed, sendJson } from '../../lib/api/http.js';
import { copyBetterAuthHeaders, runBetterAuthRequest } from '../../lib/auth/bridge.js';

function parseBody(body) {
  if (!body) return {};
  return typeof body === 'string' ? JSON.parse(body) : body;
}

export default async function handler(request, response) {
  if (request.method !== 'POST') return methodNotAllowed(response, ['POST']);
  try {
    const identity = await authenticatedIdentity(request, { allowPasswordChange: true });
    const body = parseBody(request.body);
    const newPassword = String(body.newPassword || '');
    if (newPassword.length < 12 || newPassword.length > 128) {
      return sendJson(response, 400, { error: 'INVALID_PASSWORD', message: 'Das neue Passwort muss 12 bis 128 Zeichen lang sein.' });
    }
    const authResponse = await runBetterAuthRequest(request, 'change-password', {
      currentPassword: String(body.currentPassword || ''),
      newPassword,
      revokeOtherSessions: true
    });
    if (!authResponse.ok) {
      return sendJson(response, 400, { error: 'PASSWORD_CHANGE_FAILED', message: 'Das Passwort konnte nicht geändert werden.' });
    }

    const sql = getDatabaseClient();
    await sql.transaction([
      sql`UPDATE app_user_profile
          SET must_change_password = FALSE, password_changed_at = NOW(), updated_at = NOW()
          WHERE user_id = ${identity.id}`,
      sql`INSERT INTO app_audit_log (actor_user_id, action, target_type, target_id, metadata)
          VALUES (${identity.id}, 'PASSWORD_CHANGED', 'user', ${identity.id}, '{}'::jsonb)`
    ]);
    copyBetterAuthHeaders(response, authResponse);
    return sendJson(response, 200, { ok: true });
  } catch (error) {
    if (sendAuthAccessError(response, error)) return;
    console.error('Password change failed.', error);
    return sendJson(response, 500, { error: 'PASSWORD_CHANGE_FAILED' });
  }
}
