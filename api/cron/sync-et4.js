import { timingSafeEqual } from 'node:crypto';

import { sendJson } from '../_database.js';
import {
  DEFAULT_ET4_SYNC_TYPES,
  syncEt4ToNeon,
  syncOpenDataMembership
} from '../../lib/database/sync-et4.js';

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
    const sharedOptions = {
      databaseUrl: process.env.DATABASE_URL,
      apiKey: process.env.DESTINATION_ONE_API_KEY || process.env.LICENSEKEY || process.env.LICENSE_KEY,
      baseUrl: process.env.DESTINATION_ONE_BASE_URL || 'https://meta.et4.de/rest.ashx/search/',
      types: DEFAULT_ET4_SYNC_TYPES,
      fullSync: false,
      template: process.env.DESTINATION_ONE_DATABASE_TEMPLATE || 'ET2022A.json',
      requestTimeoutMs: Number(process.env.REQUEST_TIMEOUT_MS) || 15000,
      log: console.log
    };
    const inventory = await syncEt4ToNeon({
      ...sharedOptions,
      experience: process.env.DESTINATION_ONE_EXPERIENCE || 'statistik_sachsen'
    });
    const openDataMembership = await syncOpenDataMembership({
      databaseUrl: sharedOptions.databaseUrl,
      apiKey: sharedOptions.apiKey,
      baseUrl: sharedOptions.baseUrl,
      inventoryExperience: process.env.DESTINATION_ONE_EXPERIENCE || 'statistik_sachsen',
      openDataExperience: process.env.DESTINATION_ONE_OPEN_DATA_EXPERIENCE || 'open-data-sachsen-tourismus',
      template: process.env.DESTINATION_ONE_OPEN_DATA_TEMPLATE || 'ET2014A_LIGHT.json',
      requestTimeoutMs: sharedOptions.requestTimeoutMs,
      log: console.log
    });
    return sendJson(response, 200, { ok: true, inventory, openDataMembership });
  } catch (error) {
    console.error('Scheduled ET4 sync failed.', error);
    return sendJson(response, 500, { error: 'Scheduled ET4 sync failed' });
  }
}
