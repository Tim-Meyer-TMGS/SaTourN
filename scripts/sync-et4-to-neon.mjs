import 'dotenv/config';

import { DEFAULT_ET4_SYNC_TYPES, syncEt4ToNeon } from '../lib/database/sync-et4.js';

function readOption(name, fallback = '') {
  const index = process.argv.indexOf(name);
  return index >= 0 ? String(process.argv[index + 1] || '').trim() : fallback;
}

function numberOption(name, fallback, maximum) {
  const parsed = Number.parseInt(readOption(name, String(fallback)), 10);
  return Math.max(1, Math.min(maximum, Number.isFinite(parsed) ? parsed : fallback));
}

function parseTypes(value) {
  const values = String(value || '').split(',').map((entry) => entry.trim()).filter(Boolean);
  return values.length ? values : [...DEFAULT_ET4_SYNC_TYPES];
}

const result = await syncEt4ToNeon({
  databaseUrl: process.env.DATABASE_URL,
  apiKey: process.env.DESTINATION_ONE_API_KEY || process.env.LICENSEKEY || process.env.LICENSE_KEY,
  baseUrl: process.env.DESTINATION_ONE_BASE_URL || 'https://meta.et4.de/rest.ashx/search/',
  experience: process.env.DESTINATION_ONE_EXPERIENCE || 'statistik_sachsen',
  types: parseTypes(readOption('--types')),
  explicitSince: readOption('--since') || null,
  fullSync: process.argv.includes('--full'),
  pageSize: numberOption('--page-size', 200, 200),
  batchSize: numberOption('--batch-size', 50, 100),
  maxPages: numberOption('--max-pages', 500, 5000),
  overlapMinutes: numberOption('--overlap-minutes', 10, 1440),
  template: readOption('--template', process.env.DESTINATION_ONE_DATABASE_TEMPLATE || 'ET2022A.json'),
  requestTimeoutMs: Number(process.env.REQUEST_TIMEOUT_MS) || 15_000,
  log: console.log
});

console.log(JSON.stringify(result, null, 2));
