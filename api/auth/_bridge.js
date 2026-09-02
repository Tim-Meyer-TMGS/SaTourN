import { fromNodeHeaders } from 'better-auth/node';

import { auth } from '../../lib/auth/server.js';

function requestBody(request) {
  if (request.body == null) return undefined;
  return typeof request.body === 'string' ? request.body : JSON.stringify(request.body);
}

function requestOrigin(request) {
  const configured = String(process.env.BETTER_AUTH_URL || '').trim();
  if (configured) return configured.replace(/\/$/, '');
  const protocol = String(request.headers?.['x-forwarded-proto'] || 'http').split(',')[0].trim();
  const host = String(request.headers?.['x-forwarded-host'] || request.headers?.host || 'localhost:3000').split(',')[0].trim();
  return `${protocol}://${host}`;
}

export async function runBetterAuthRequest(request, path, bodyOverride) {
  const headers = fromNodeHeaders(request.headers || {});
  headers.delete('content-length');
  if (bodyOverride !== undefined) headers.set('content-type', 'application/json');
  const body = bodyOverride === undefined ? requestBody(request) : JSON.stringify(bodyOverride);
  return auth.handler(new Request(`${requestOrigin(request)}/api/auth/${path}`, {
    method: request.method,
    headers,
    ...(body && request.method !== 'GET' && request.method !== 'HEAD' ? { body } : {})
  }));
}

export function copyBetterAuthHeaders(response, authResponse) {
  const explicitCookies = authResponse.headers.getSetCookie?.() || [];
  const fallbackCookie = authResponse.headers.get('set-cookie');
  const setCookies = explicitCookies.length ? explicitCookies : (fallbackCookie ? [fallbackCookie] : []);
  authResponse.headers.forEach((value, key) => {
    if (key.toLowerCase() === 'set-cookie' || key.toLowerCase() === 'content-length') return;
    response.setHeader(key, value);
  });
  if (setCookies.length) response.setHeader('Set-Cookie', setCookies);
  response.setHeader('Cache-Control', 'no-store');
  response.setHeader('Pragma', 'no-cache');
}

export async function forwardBetterAuthResponse(response, authResponse) {
  response.status(authResponse.status);
  copyBetterAuthHeaders(response, authResponse);
  const text = await authResponse.text();
  return response.send(text);
}
