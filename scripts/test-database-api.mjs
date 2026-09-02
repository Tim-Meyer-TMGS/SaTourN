import assert from 'node:assert/strict';

import 'dotenv/config';

import cronSyncHandler from '../api/cron/sync-et4.js';
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
    }
  };
}

async function invoke(handler, request) {
  const response = responseMock();
  await handler(request, response);
  assert.equal(response.statusCode, 200, JSON.stringify(response.body));
  return response.body;
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
