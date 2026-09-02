import { authenticatedIdentity, publicIdentity, sendAuthAccessError } from '../../lib/api/auth.js';
import { methodNotAllowed, sendJson } from '../../lib/api/http.js';

export default async function handler(request, response) {
  if (request.method !== 'GET') return methodNotAllowed(response, ['GET']);
  try {
    const identity = await authenticatedIdentity(request, { allowPasswordChange: true });
    return sendJson(response, 200, { authenticated: true, user: publicIdentity(identity) });
  } catch (error) {
    if (sendAuthAccessError(response, error)) return;
    console.error('Session validation failed.', error);
    return sendJson(response, 500, { error: 'SESSION_VALIDATION_FAILED' });
  }
}
