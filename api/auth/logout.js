import { forwardNeonAuthResponse, runNeonAuthRequest } from '../../lib/auth/neon-bridge.js';
import { methodNotAllowed } from '../../lib/api/http.js';

export default async function handler(request, response) {
  if (request.method !== 'POST') return methodNotAllowed(response, ['POST']);
  const authResponse = await runNeonAuthRequest(request, 'sign-out', {});
  return forwardNeonAuthResponse(response, authResponse);
}
