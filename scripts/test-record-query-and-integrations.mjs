import assert from 'node:assert/strict';

import { buildRecordSearchQuery } from '../lib/api/record-query.js';
import { flattenDestinationOneCategories } from '../lib/database/destination-one.js';
import { decryptIntegrationSecret, encryptIntegrationSecret, maskSecret } from '../lib/integrations/tenant-secrets.js';

const identity = { access_all_areas: false, allowed_area_ids: ['Leipzig'] };
const query = buildRecordSearchQuery({
  types: 'POI,Tour',
  area: 'Leipzig',
  categoryId: 'cat_museum',
  authorship: 'TMGS',
  criterionId: 'image_missing',
  limit: 25,
  offset: 50
}, identity);
assert.match(query.whereSql, /record_type = ANY/);
assert.match(query.whereSql, /record_categories/);
assert.match(query.whereSql, /missing_criteria/);
assert.match(query.whereSql, /jsonb_array_elements/);
assert.equal(query.limit, 25);
assert.equal(query.offset, 50);

const catalog = flattenDestinationOneCategories([{ name: 'Kultur', children: [{ name: 'Museum' }] }]);
assert.deepEqual(catalog, [
  { name: 'Kultur', parentName: null, externalId: null },
  { name: 'Museum', parentName: 'Kultur', externalId: null }
]);

process.env.TENANT_INTEGRATION_SECRET = 'local-contract-secret-that-is-at-least-32-characters';
const encrypted = encryptIntegrationSecret('oa-secret-abcd');
assert.notEqual(encrypted, 'oa-secret-abcd');
assert.equal(decryptIntegrationSecret(encrypted), 'oa-secret-abcd');
assert.equal(maskSecret('oa-secret-abcd'), '••••••••abcd');
delete process.env.TENANT_INTEGRATION_SECRET;

console.log('Record query, category and tenant integration contracts passed.');
