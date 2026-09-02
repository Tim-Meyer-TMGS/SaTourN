import 'dotenv/config';

import { API_KEY, BASE_URL, EXPERIENCE, OPEN_DATA_EXPERIENCE, REQUEST_TIMEOUT_MS } from '../lib/config.js';
import { syncOpenDataMembership } from '../lib/database/sync-et4.js';

const result = await syncOpenDataMembership({
  databaseUrl: process.env.DATABASE_URL,
  apiKey: API_KEY,
  baseUrl: BASE_URL,
  inventoryExperience: EXPERIENCE,
  openDataExperience: OPEN_DATA_EXPERIENCE,
  template: process.env.DESTINATION_ONE_OPEN_DATA_TEMPLATE || 'ET2014A_LIGHT.json',
  requestTimeoutMs: REQUEST_TIMEOUT_MS,
  log: console.log
});

console.log(JSON.stringify(result, null, 2));
