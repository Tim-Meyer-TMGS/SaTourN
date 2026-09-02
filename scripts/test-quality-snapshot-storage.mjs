import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { FileKeyValueStore } from '../lib/file-key-value-store.js';
import { createQualitySnapshotManifest } from '../lib/quality-snapshot-contract.js';

const outputDirectory = await mkdtemp(path.join(os.tmpdir(), 'satourn-snapshot-'));
const indexKey = 'dq:v1:snapshot:index';
const snapshotKey = 'dq:v1:snapshot:test';

try {
  const store = new FileKeyValueStore(outputDirectory, { indexKey });
  await store.ping();
  await store.setJson(snapshotKey, { complete: true });

  const manifest = createQualitySnapshotManifest({
    storageMode: store.mode,
    contexts: [{ complete: true, path: store.publicPathForKey(snapshotKey) }]
  });
  await store.setJson(indexKey, manifest);

  assert.equal(store.publicPathForKey(indexKey), 'index.json');
  assert.match(store.publicPathForKey(snapshotKey), /^snapshots\/[a-f0-9]{24}\.json$/);
  assert.deepEqual(await store.getJson(snapshotKey), { complete: true });

  const writtenManifest = JSON.parse(
    await readFile(path.join(outputDirectory, 'index.json'), 'utf8')
  );
  assert.equal(writtenManifest.schemaVersion, 1);
  assert.equal(writtenManifest.complete, true);
  assert.equal(writtenManifest.storageMode, 'file');
} finally {
  await rm(outputDirectory, { recursive: true, force: true });
}

console.log('Quality snapshot storage contract passed.');

