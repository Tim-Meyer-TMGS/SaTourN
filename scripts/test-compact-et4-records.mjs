import assert from 'node:assert/strict';

import { compactEt4Record, createEt4RecordRow, extractEt4Items } from '../lib/database/compact-et4-record.js';

const source = {
  global_id: 'p_42',
  id: 42,
  title: 'Beispiel',
  type: 'POI',
  city: 'Leipzig',
  created: '2026-01-01T10:00:00+01:00',
  changed: '2026-02-01T10:00:00+01:00',
  categories_old: ['Museum'],
  areas_old: ['Leipzig', 'Sachsen'],
  keywords_old: ['import_source_outdooractive', 'import_sourceid_123'],
  texts: [
    { rel: 'details', type: 'text/plain', value: 'Beschreibung' },
    { rel: 'details', type: 'text/html', value: '<p>Beschreibung</p>' },
    { rel: 'teaser', type: 'text/plain', value: 'Kurztext' }
  ],
  attributes: [{ key: 'license', value: 'CC-BY' }],
  media_objects: [{
    rel: 'default',
    type: 'image/jpeg',
    url: 'https://example.test/image.jpg',
    copyrightText: 'Fotografin',
    width: 4000,
    height: 3000
  }],
  unused: 'wird nicht gespeichert'
};

const compact = compactEt4Record(source);
assert.equal(compact.unused, undefined);
assert.equal(compact.categories[0], 'Museum');
assert.equal(compact.areas[0], 'Leipzig');
assert.equal(compact.texts.length, 2);
assert.equal(compact.texts[0].type, 'text/html');
assert.equal(compact.media_objects[0].width, undefined);
assert.equal(compact.media_objects[0].value, undefined);
assert.equal(compact.media_objects[0].copyrightText, 'Fotografin');

const row = createEt4RecordRow(source, { experience: 'statistik_sachsen' });
assert.equal(row.globalId, 'p_42');
assert.equal(row.recordType, 'POI');
assert.deepEqual(row.areas, ['Leipzig', 'Sachsen']);
assert.equal(row.hasLicense, true);
assert.equal(row.hasDescription, true);
assert.equal(row.hasImages, true);
assert.match(row.contentHash, /^[a-f0-9]{64}$/);
assert.equal(extractEt4Items({ items: [source] }).length, 1);

console.log('Compact ET4 record contract passed.');
