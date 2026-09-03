import assert from 'node:assert/strict';

import 'dotenv/config';
import { neon } from '@neondatabase/serverless';

import { adminOperations } from '../lib/api/admin-service.js';
import { isEmailAllowedForTenant } from '../lib/auth/tenant-domains.js';

if (!String(process.env.DATABASE_URL || '').trim()) throw new Error('DATABASE_URL is required.');

function responseMock() {
  return {
    headers: {},
    statusCode: 200,
    body: null,
    setHeader(name, value) { this.headers[name] = value; },
    status(value) { this.statusCode = value; return this; },
    json(value) { this.body = value; return this; }
  };
}

const identity = {
  id: '00000000-0000-0000-0000-000000000001',
  profile_id: 'admin-read-contract',
  name: 'Admin contract test',
  email: 'contract@sachsen-tour.de',
  role: 'SUPER_ADMIN',
  tenant_id: 'tenant_tmgs',
  tenant_name: 'TMGS',
  tenant_slug: 'tmgs',
  is_root: true,
  access_all_areas: true,
  theme: 'tmgs',
  allowed_area_ids: [],
  must_change_password: false,
  last_login_at: null,
  password_changed_at: null
};

const results = {};
for (const action of ['admin-overview', 'admin-users', 'admin-tenants', 'admin-quality', 'admin-audit', 'admin-status']) {
  const response = responseMock();
  await adminOperations.get(action)({ method: 'GET', query: {} }, response, identity);
  assert.equal(response.statusCode, 200, `${action} must return 200`);
  results[action] = response.body;
}

assert.ok(results['admin-overview'].metrics.active_users >= 1);
assert.ok(results['admin-users'].users.length >= 1);
assert.ok(results['admin-users'].users.every((user) => isEmailAllowedForTenant(user.email, user.tenant_slug)));
assert.ok(results['admin-tenants'].tenants.length >= 9);
assert.ok(results['admin-tenants'].areas.length >= 13);
const tenantMappings = new Map(results['admin-tenants'].tenants.map((tenant) => [tenant.id, tenant.area_ids]));
assert.deepEqual(tenantMappings.get('tenant_chemnitz'), ['area_chemnitz']);
assert.deepEqual(tenantMappings.get('tenant_chemnitz_zwickau'), [
  'area_chemnitz',
  'area_chemnitz_zwickau_region',
  'area_rochlitzer_muldental',
  'area_zwickau'
]);
assert.deepEqual(tenantMappings.get('tenant_dresden'), ['area_dresden', 'area_dresden_elbland']);
assert.deepEqual(tenantMappings.get('tenant_leipzig'), ['area_leipzig', 'area_leipzig_region']);
assert.deepEqual(tenantMappings.get('tenant_oberlausitz'), ['area_lausitzer_seenland', 'area_oberlausitz']);
assert.deepEqual(tenantMappings.get('tenant_erzgebirge'), ['area_erzgebirge']);
assert.deepEqual(tenantMappings.get('tenant_saechsische_schweiz'), ['area_saechsische_schweiz']);
assert.deepEqual(tenantMappings.get('tenant_vogtland'), ['area_vogtland']);
assert.ok(results['admin-quality'].criteria.length >= 1);
assert.equal(results['admin-status'].database.ok, true);

const sql = neon(process.env.DATABASE_URL);
const [accountId] = await sql.query(`
  SELECT data_type, udt_name
  FROM information_schema.columns
  WHERE table_schema = 'neon_auth' AND table_name = 'account' AND column_name = 'id'
`);
assert.equal(accountId?.udt_name, 'uuid');

console.log(JSON.stringify({
  adminApi: 'verified',
  users: results['admin-users'].users.length,
  tenants: results['admin-tenants'].tenants.length,
  areas: results['admin-tenants'].areas.length,
  criteria: results['admin-quality'].criteria.length,
  auditEntries: results['admin-audit'].entries.length,
  accountIdType: accountId.udt_name
}, null, 2));
