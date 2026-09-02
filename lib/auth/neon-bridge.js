const AUTH_PATHS = new Set([
  'change-password',
  'get-session',
  'sign-in/email',
  'sign-out',
  'sign-up/email'
]);

function authBaseUrl() {
  const value = String(
    process.env.NEON_AUTH_BASE_URL
    || process.env.DATABASE_NEON_AUTH_BASE_URL
    || ''
  ).trim().replace(/\/$/, '');
  if (!value) {
    throw new Error('NEON_AUTH_BASE_URL or DATABASE_NEON_AUTH_BASE_URL is not configured.');
  }
  const url = new URL(value);
  if (url.protocol !== 'https:' && url.hostname !== 'localhost') {
    throw new Error('NEON_AUTH_BASE_URL must use HTTPS.');
  }
  return url.toString().replace(/\/$/, '');
}

function requestBody(request) {
  if (request.body == null) return undefined;
  return typeof request.body === 'string' ? request.body : JSON.stringify(request.body);
}

function upstreamHeaders(request, hasBody) {
  const headers = new Headers();
  const forwarded = ['accept', 'accept-language', 'cookie', 'origin', 'referer', 'user-agent'];
  for (const name of forwarded) {
    const value = request.headers?.[name];
    if (value) headers.set(name, Array.isArray(value) ? value.join(', ') : String(value));
  }
  if (hasBody) headers.set('content-type', 'application/json');
  const clientIp = request.headers?.['x-vercel-forwarded-for']
    || request.headers?.['x-real-ip']
    || request.headers?.['x-forwarded-for'];
  if (clientIp) headers.set('x-forwarded-for', String(clientIp));
  return headers;
}

export async function runNeonAuthRequest(request, path, bodyOverride, methodOverride) {
  if (!AUTH_PATHS.has(path)) throw new Error(`Unsupported Neon Auth path: ${path}`);
  const method = methodOverride || request.method;
  const body = bodyOverride === undefined ? requestBody(request) : JSON.stringify(bodyOverride);
  const hasBody = Boolean(body && method !== 'GET' && method !== 'HEAD');
  return fetch(`${authBaseUrl()}/${path}`, {
    method,
    headers: upstreamHeaders(request, hasBody),
    ...(hasBody ? { body } : {}),
    redirect: 'manual'
  });
}

function browserCookie(cookie) {
  return String(cookie)
    .replace(/;\s*Domain=[^;]*/gi, '')
    .replace(/;\s*Path=[^;]*/i, '; Path=/');
}

export function copyNeonAuthHeaders(response, authResponse) {
  const explicitCookies = authResponse.headers.getSetCookie?.() || [];
  const fallbackCookie = authResponse.headers.get('set-cookie');
  const setCookies = (explicitCookies.length ? explicitCookies : (fallbackCookie ? [fallbackCookie] : []))
    .map(browserCookie);
  authResponse.headers.forEach((value, key) => {
    const normalized = key.toLowerCase();
    if (normalized === 'set-cookie' || normalized === 'content-length' || normalized === 'content-encoding') return;
    response.setHeader(key, value);
  });
  if (setCookies.length) response.setHeader('Set-Cookie', setCookies);
  response.setHeader('Cache-Control', 'no-store');
  response.setHeader('Pragma', 'no-cache');
}

export async function forwardNeonAuthResponse(response, authResponse) {
  response.status(authResponse.status);
  copyNeonAuthHeaders(response, authResponse);
  return response.send(await authResponse.text());
}

export async function getNeonAuthSession(request) {
  if (!request.headers?.cookie) return null;
  const authResponse = await runNeonAuthRequest(request, 'get-session', undefined, 'GET');
  if (!authResponse.ok) return null;
  const payload = await authResponse.json();
  return payload?.user?.id ? payload : null;
}
