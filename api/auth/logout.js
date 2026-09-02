import { methodNotAllowed } from '../_database.js';
import { forwardBetterAuthResponse, runBetterAuthRequest } from './_bridge.js';

export default async function handler(request, response) {
  if (request.method !== 'POST') return methodNotAllowed(response, ['POST']);
  const authResponse = await runBetterAuthRequest(request, 'sign-out', {});
  return forwardBetterAuthResponse(response, authResponse);
}
