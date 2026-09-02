import { forwardBetterAuthResponse, runBetterAuthRequest } from '../../lib/auth/bridge.js';
import { methodNotAllowed } from '../../lib/api/http.js';

export default async function handler(request, response) {
  if (request.method !== 'POST') return methodNotAllowed(response, ['POST']);
  const authResponse = await runBetterAuthRequest(request, 'sign-out', {});
  return forwardBetterAuthResponse(response, authResponse);
}
