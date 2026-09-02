import { neon } from '@neondatabase/serverless';

let databaseClient;

export function getDatabaseClient() {
  const databaseUrl = String(process.env.DATABASE_URL || '').trim();
  if (!databaseUrl) throw new Error('DATABASE_URL is not configured.');
  databaseClient ||= neon(databaseUrl);
  return databaseClient;
}

export function sendJson(response, status, payload) {
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.setHeader('Cache-Control', 'private, max-age=0, must-revalidate');
  return response.status(status).json(payload);
}

export function methodNotAllowed(response, allowedMethods) {
  response.setHeader('Allow', allowedMethods.join(', '));
  return sendJson(response, 405, { error: 'Method not allowed' });
}

export function queryValues(value) {
  const values = Array.isArray(value) ? value : value == null ? [] : [value];
  return Array.from(new Set(values
    .flatMap((entry) => String(entry || '').split(','))
    .map((entry) => entry.trim())
    .filter(Boolean)
    .slice(0, 50)));
}

export function positiveInteger(value, fallback, maximum) {
  const parsed = Number.parseInt(String(Array.isArray(value) ? value[0] : value ?? ''), 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(0, Math.min(maximum, parsed));
}

