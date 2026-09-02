import assert from 'node:assert/strict';

import 'dotenv/config';

process.env.BETTER_AUTH_URL ||= 'http://localhost:3000';
process.env.BETTER_AUTH_SECRET ||= 'local-entrypoint-contract-secret-at-least-32-characters';

const { default: cronHandler } = await import('../api/cron/sync.js');
const { default: dataHandler } = await import('../api/data.js');
const { default: systemHandler } = await import('../api/system.js');
const { buildRecordSearchQuery } = await import('../lib/api/record-query.js');

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
  await handler({ headers: {}, query: {}, ...request }, response);
  return response;
}

const invalidDataAction = await invoke(dataHandler, { method: 'GET', query: { action: 'unknown' } });
assert.equal(invalidDataAction.statusCode, 400);

const protectedData = await invoke(dataHandler, { method: 'GET', query: { action: 'search' } });
assert.equal(protectedData.statusCode, 401);

const health = await invoke(systemHandler, { method: 'GET', query: { action: 'health' } });
assert.equal(health.statusCode, 200);
assert.equal(health.body?.database, true);

const invalidSystemAction = await invoke(systemHandler, { method: 'GET', query: { action: 'unknown' } });
assert.equal(invalidSystemAction.statusCode, 400);

const protectedCron = await invoke(cronHandler, { method: 'GET' });
assert.equal(protectedCron.statusCode, 401);

const query = buildRecordSearchQuery({
  experience: 'must-not-be-used',
  isOpenData: 'true',
  query: 'category:Museum'
}, { access_all_areas: true, allowed_area_ids: [] });
assert.equal(query.parameters[0], 'statistik_sachsen');
assert.match(query.whereSql, /has_license = TRUE/);
assert.match(query.whereSql, /categories/);
assert.doesNotMatch(query.whereSql, /is_open_data_published/);

console.log('Consolidated API entrypoint contract passed.');
