import { genericLoginMessage } from '../../lib/auth/config.js';
import { normalizeEmail } from '../../lib/auth/tenant-domains.js';
import { forwardNeonAuthResponse, runNeonAuthRequest } from '../../lib/auth/neon-bridge.js';
import { approvedLoginEmail, recordSuccessfulLogin } from '../../lib/api/auth.js';
import { methodNotAllowed, sendJson } from '../../lib/api/http.js';

function parseBody(body) {
  if (!body) return {};
  return typeof body === 'string' ? JSON.parse(body) : body;
}

export default async function handler(request, response) {
  if (request.method !== 'POST') return methodNotAllowed(response, ['POST']);
  try {
    const body = parseBody(request.body);
    const email = normalizeEmail(body.email);
    if (!await approvedLoginEmail(email)) {
      return sendJson(response, 401, { error: 'LOGIN_FAILED', message: genericLoginMessage });
    }
    const authResponse = await runNeonAuthRequest(request, 'sign-in/email', {
      email,
      password: String(body.password || ''),
      rememberMe: body.rememberMe !== false
    });
    if (!authResponse.ok) {
      return sendJson(response, authResponse.status === 429 ? 429 : 401, {
        error: 'LOGIN_FAILED',
        message: genericLoginMessage
      });
    }
    await recordSuccessfulLogin(email);
    return forwardNeonAuthResponse(response, authResponse);
  } catch (error) {
    console.error('Login request failed.', error instanceof Error ? error.message : error);
    return sendJson(response, 401, { error: 'LOGIN_FAILED', message: genericLoginMessage });
  }
}
