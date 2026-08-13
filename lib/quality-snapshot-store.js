import { FileKeyValueStore } from './file-key-value-store.js';
import { createKeyValueStore } from './kv-store.js';
import { latestSnapshotIndexKey } from './quality-cache.js';

export function createQualitySnapshotStore() {
  const outputDirectory = String(process.env.QUALITY_SNAPSHOT_OUTPUT_DIR || '').trim();
  if (outputDirectory) {
    return new FileKeyValueStore(outputDirectory, {
      indexKey: latestSnapshotIndexKey()
    });
  }
  return createKeyValueStore();
}

export async function prepareQualitySnapshotStore(store) {
  if (store.mode === 'memory' && process.env.QUALITY_SNAPSHOT_ALLOW_MEMORY !== '1') {
    throw new Error(
      'Set REDIS_URL for persistent snapshots or QUALITY_SNAPSHOT_OUTPUT_DIR for static files. '
      + 'QUALITY_SNAPSHOT_ALLOW_MEMORY=1 is intended only for local dry runs.'
    );
  }
  await store.ping();
}

export function getSnapshotPath(store, key) {
  return typeof store.publicPathForKey === 'function'
    ? store.publicPathForKey(key)
    : null;
}

