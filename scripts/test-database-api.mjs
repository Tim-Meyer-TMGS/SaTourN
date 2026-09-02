import assert from 'node:assert/strict';

import 'dotenv/config';

import cronSyncHandler from '../api/cron/sync-et4.js';
import loginHandler from '../api/auth/login.js';
import logoutHandler from '../api/auth/logout.js';
import sessionHandler from '../api/auth/session.js';
import healthHandler from '../api/health.js';
import recordLookupHandler from '../api/records/by-global-ids.js';
import qualityCountHandler from '../api/quality/count.js';
import qualityScanHandler from '../api/quality/scan.js';
import qualitySummaryHandler from '../api/quality/summary.js';
import searchHandler from '../api/search.js';

function responseMock() {
  return {
    headers: {},
    statusCode: 200,
    body: null,
    setHeader(name, value) {
      this.headers[name] = value;
    },
    status(value) {
      this.statusCode = value;
      return this;
    },
    json(value) {
      this.body = value;
      return this;
    },
    send(value) {
      this.body = value;
      return this;
    }
  };
}

let authCookie = '';

async function invoke(handler, request) {
  const response = responseMock();
  await handler({
    ...request,
    headers: {
      host: 'localhost:3000',
      origin: 'http://localhost:3000',
      'x-real-ip': '127.0.0.1',
      ...(authCookie ? { cookie: authCookie } : {}),
      ...(request.headers || {})
    }
  }, response);
  assert.equal(response.statusCode, 200, JSON.stringify(response.body));
  return response.body;
}

const testPassword = String(process.env.TEST_ADMIN_PASSWORD || '');
const testEmail = String(process.env.TEST_ADMIN_EMAIL || '').trim().toLowerCase();
if (!testPassword) throw new Error('TEST_ADMIN_PASSWORD is required for the authenticated live API test.');
if (!testEmail) throw new Error('TEST_ADMIN_EMAIL is required for the authenticated live API test.');

const unauthorizedResponse = responseMock();
await searchHandler({
  method: 'GET',
  headers: { 'x-real-ip': '127.0.0.1' },
  query: { countOnly: 'true' }
}, unauthorizedResponse);
assert.equal(unauthorizedResponse.statusCode, 401);

const loginResponse = responseMock();
await loginHandler({
  method: 'POST',
  headers: {
    host: 'localhost:3000',
    origin: 'http://localhost:3000',
    'x-real-ip': '127.0.0.1',
    'content-type': 'application/json'
  },
  body: { email: testEmail, password: testPassword }
}, loginResponse);
assert.equal(loginResponse.statusCode, 200, String(loginResponse.body));
const setCookies = loginResponse.headers['Set-Cookie'] || loginResponse.headers['set-cookie'] || [];
authCookie = (Array.isArray(setCookies) ? setCookies : [setCookies])
  .map((cookie) => String(cookie).split(';')[0])
  .filter(Boolean)
  .join('; ');
assert.ok(authCookie, 'Login did not return a session cookie.');

const sessionPayload = await invoke(sessionHandler, { method: 'GET' });
assert.equal(sessionPayload.user.email, testEmail);
assert.equal(sessionPayload.user.role, 'SUPER_ADMIN');
assert.equal(sessionPayload.user.tenant.slug, 'tmgs');

if (sessionPayload.user.mustChangePassword) {
  const protectedResponse = responseMock();
  await searchHandler({
    method: 'GET',
    headers: { cookie: authCookie },
    query: { countOnly: 'true' }
  }, protectedResponse);
  assert.equal(protectedResponse.statusCode, 403);
  assert.equal(protectedResponse.body?.error, 'PASSWORD_CHANGE_REQUIRED');
  await invoke(logoutHandler, { method: 'POST', body: {} });
  const revokedSessionResponse = responseMock();
  await sessionHandler({ method: 'GET', headers: { cookie: authCookie, 'x-real-ip': '127.0.0.1' } }, revokedSessionResponse);
  assert.equal(revokedSessionResponse.statusCode, 401);
  console.log(JSON.stringify({
    authenticationContract: 'passed',
    initialPasswordChangeGate: 'passed',
    role: sessionPayload.user.role,
    tenant: sessionPayload.user.tenant.slug
  }, null, 2));
  process.exit(0);
}

const countPayload = await invoke(searchHandler, {
  method: 'GET',
  query: { type: 'POI', countOnly: 'true' }
});
assert.ok(countPayload.overallcount > 0);

const healthPayload = await invoke(healthHandler, { method: 'GET' });
assert.equal(healthPayload.ok, true);

const allInventoryPayload = await invoke(searchHandler, {
  method: 'GET',
  query: { type: '', countOnly: 'true' }
});
assert.ok(allInventoryPayload.overallcount >= countPayload.overallcount);

const publishedPayload = await invoke(searchHandler, {
  method: 'GET',
  query: { type: 'POI', countOnly: 'true', openDataPublished: 'true' }
});
assert.ok(publishedPayload.overallcount > 0);
assert.ok(publishedPayload.overallcount < countPayload.overallcount);

const allPublishedPayload = await invoke(searchHandler, {
  method: 'GET',
  query: { type: '', countOnly: 'true', openDataPublished: 'true' }
});
assert.ok(allPublishedPayload.overallcount >= publishedPayload.overallcount);
assert.ok(allPublishedPayload.overallcount < allInventoryPayload.overallcount);

const nonOpenDataPayload = await invoke(searchHandler, {
  method: 'GET',
  query: { type: 'POI', countOnly: 'true', isOpenData: 'false' }
});

const licenseCountPayload = await invoke(qualityCountHandler, {
  method: 'GET',
  query: { type: 'POI', criterionId: 'license_missing' }
});
assert.equal(licenseCountPayload.overallcount, nonOpenDataPayload.overallcount);

const qualityScanPayload = await invoke(qualityScanHandler, {
  method: 'GET',
  query: { type: 'POI', criterionId: 'license_missing', limit: '2' }
});
assert.equal(qualityScanPayload.items.length, 2);
assert.ok(qualityScanPayload.stats.overallcount > 0);

const qualitySummaryPayload = await invoke(qualitySummaryHandler, {
  method: 'GET',
  query: { type: 'POI' }
});
assert.equal(qualitySummaryPayload.totalAssessed, countPayload.overallcount);
assert.ok(Array.isArray(qualitySummaryPayload.issueSummary));

const listPayload = await invoke(searchHandler, {
  method: 'GET',
  query: { type: 'POI', limit: '2' }
});
assert.equal(listPayload.items.length, 2);
assert.ok(listPayload.items[0].global_id);

const globalId = listPayload.items[0].global_id;
const detailPayload = await invoke(recordLookupHandler, {
  method: 'POST',
  body: { ids: [globalId], type: 'POI' }
});
assert.equal(detailPayload.items.length, 1);
assert.equal(detailPayload.items[0].global_id, globalId);
assert.deepEqual(detailPayload.missingIds, []);

process.env.CRON_SECRET = 'local-contract-secret';
const cronPayload = await invoke(cronSyncHandler, {
  method: 'GET',
  headers: { authorization: 'Bearer local-contract-secret' }
});
delete process.env.CRON_SECRET;
assert.equal(cronPayload.ok, true);
assert.equal(cronPayload.inventory.results.length, 9);
assert.ok(cronPayload.openDataMembership.importedCount >= cronPayload.openDataMembership.publishedCount);
assert.ok(cronPayload.openDataMembership.publishedCount > 0);

await invoke(logoutHandler, { method: 'POST', body: {} });

console.log(JSON.stringify({
  databaseApiContract: 'passed',
  poiCount: countPayload.overallcount,
  inventoryCount: allInventoryPayload.overallcount,
  publishedPoiCount: publishedPayload.overallcount,
  publishedCount: allPublishedPayload.overallcount,
  poiWithoutLicense: licenseCountPayload.overallcount,
  detailGlobalId: globalId,
  scheduledInventorySync: 'passed',
  scheduledOpenDataMembershipSync: 'passed'
}, null, 2));
