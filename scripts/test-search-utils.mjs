import assert from 'node:assert/strict';

import {
  assertMetaResponseOk,
  buildSearchUrl,
  buildStructuredFilterQuery,
  combineSearchQueries,
  MetaResponseError,
  normalizeMetaSearchType,
  parseMetaResponseText
} from '../lib/search-utils.js';

const unfilteredUrl = new URL(buildSearchUrl({
  baseUrl: 'https://meta.et4.de/rest.ashx/search/',
  experience: 'open-data-sachsen-tourismus',
  template: 'ET2014A_LIGHT.json',
  type: '',
  qParam: '',
  limit: 1,
  offset: 0,
  apiKey: ''
}));

assert.equal(unfilteredUrl.searchParams.get('type'), 'All');
assert.equal(unfilteredUrl.searchParams.has('q'), false);
assert.equal(unfilteredUrl.searchParams.has('offset'), false);
assert.equal(unfilteredUrl.searchParams.has('licensekey'), false);
assert.equal(normalizeMetaSearchType('poi'), 'POI');
assert.equal(normalizeMetaSearchType('cities'), 'City');
assert.equal(normalizeMetaSearchType('unknown'), null);

const filterQuery = buildStructuredFilterQuery({
  area: 'Leipzig Region',
  city: ['Leipzig', 'Markkleeberg'],
  category: ['Museum', 'Galerie'],
  feature: ['WLAN', 'Barrierefrei'],
  featureOperator: 'AND',
  excludeKeyword: 'intern'
});

assert.equal(
  filterQuery,
  'area:"Leipzig Region" AND city:("Leipzig" OR "Markkleeberg") AND category:("Museum" OR "Galerie") AND feature:("WLAN" AND "Barrierefrei") AND all:all AND -keyword:"intern"'
);
assert.equal(
  combineSearchQueries('title:"Museum" OR title:"Galerie"', 'city:"Leipzig"'),
  '(title:"Museum" OR title:"Galerie") AND (city:"Leipzig")'
);

assert.deepEqual(parseMetaResponseText('{"status":"OK","overallcount":2}'), {
  status: 'OK',
  overallcount: 2
});
assert.throws(
  () => assertMetaResponseOk({ status: 'INVALID_LICENSE', message: 'invalid' }),
  (error) => error instanceof MetaResponseError && error.metaStatus === 'INVALID_LICENSE'
);
assert.throws(
  () => parseMetaResponseText('<html>error</html>'),
  (error) => error instanceof MetaResponseError && error.metaStatus === 'INVALID_JSON'
);

console.log('Search utility contract passed.');
