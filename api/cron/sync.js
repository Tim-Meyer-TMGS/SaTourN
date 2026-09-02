import { timingSafeEqual } from 'node:crypto';

import { sendJson } from '../../lib/api/http.js';
import { DEFAULT_ET4_SYNC_TYPES, syncEt4ToNeon } from '../../lib/database/sync-et4.js';

function validAuthorization(request) {
  const secret = String(process.env.CRON_SECRET || '');
  const authorization = String(request.headers?.authorization || '');
  const expected = `Bearer ${secret}`;
  if (!secret || authorization.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(authorization), Buffer.from(expected));
}

export default async function handler(request, response) {
  if (request.method !== 'GET') return sendJson(response, 405, { error: 'Method not allowed' });
  if (!validAuthorization(request)) return sendJson(response, 401, { error: 'Unauthorized' });

  try {
    const result = await syncEt4ToNeon({
      databaseUrl: process.env.DATABASE_URL,
      apiKey: process.env.DESTINATION_ONE_API_KEY || process.env.LICENSEKEY || process.env.LICENSE_KEY,
      baseUrl: process.env.DESTINATION_ONE_BASE_URL || 'https://meta.et4.de/rest.ashx/search/',
      experience: process.env.DESTINATION_ONE_EXPERIENCE || 'statistik_sachsen',
      types: DEFAULT_ET4_SYNC_TYPES,
      fullSync: String(process.env.DESTINATION_ONE_FULL_SYNC || '').toLowerCase() === 'true',
      template: process.env.DESTINATION_ONE_DATABASE_TEMPLATE || 'ET2022A.json',
      requestTimeoutMs: Number(process.env.REQUEST_TIMEOUT_MS) || 15_000,
      log: console.log
    });
    return sendJson(response, 200, { ok: true, sync: result });
  } catch (error) {
    console.error('Scheduled destination.one import failed.', error);
    return sendJson(response, 500, { error: 'Scheduled data import failed' });
  }
}
