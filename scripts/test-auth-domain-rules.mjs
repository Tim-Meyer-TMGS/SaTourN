import assert from 'node:assert/strict';

import {
  allowedDomainsForTenant,
  emailDomain,
  isEmailAllowedForTenant
} from '../lib/auth/tenant-domains.js';

assert.equal(emailDomain(' User@Sachsen-Tour.de '), 'sachsen-tour.de');
assert.equal(emailDomain('not-an-email'), '');
assert.equal(isEmailAllowedForTenant('meyer.tmgs@sachsen-tour.de', 'tmgs'), true);
assert.equal(isEmailAllowedForTenant('user@evil-sachsen-tour.de', 'tmgs'), false);
assert.equal(isEmailAllowedForTenant('user@sub.sachsen-tour.de', 'tmgs'), false);
assert.equal(isEmailAllowedForTenant('user@example.org', 'chemnitz-zwickau-region'), false);
assert.equal(isEmailAllowedForTenant('user@example.org', 'dresden'), false);
assert.deepEqual(allowedDomainsForTenant('unknown'), []);

console.log('Tenant email domain rules passed.');
