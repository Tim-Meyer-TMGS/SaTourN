import assert from 'node:assert/strict';

import 'dotenv/config';

process.env.NEON_AUTH_BASE_URL ||= 'https://example.neonauth.example/neondb/auth';

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

for (const action of [
  'admin-overview',
  'admin-users',
  'admin-user-update',
  'admin-user-reset-password',
  'admin-user-revoke-sessions',
  'admin-tenants',
  'admin-tenant-update',
  'admin-tenant-areas',
  'admin-quality',
  'admin-audit',
  'admin-status'
]) {
  const protectedAdminAction = await invoke(systemHandler, { method: 'GET', query: { action } });
  assert.equal(protectedAdminAction.statusCode, 401, `${action} must require authentication`);
}

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

const scopedQuery = buildRecordSearchQuery(
  { area: 'Leipzig' },
  { access_all_areas: false, allowed_area_ids: ['Leipzig', 'Leipzig Region'] }
);
assert.match(scopedQuery.whereSql, /areas \?\|/);
assert.ok(scopedQuery.parameters.some((value) => Array.isArray(value) && value.includes('Leipzig')));

const emptyScopeQuery = buildRecordSearchQuery(
  {},
  { access_all_areas: false, allowed_area_ids: [] }
);
assert.match(emptyScopeQuery.whereSql, /FALSE/);

assert.throws(
  () => buildRecordSearchQuery(
    { area: 'Dresden' },
    { access_all_areas: false, allowed_area_ids: ['Leipzig'] }
  ),
  (error) => error?.status === 403 && error?.code === 'AREA_FORBIDDEN'
);

console.log('Consolidated API entrypoint contract passed.');
