export const QUALITY_SNAPSHOT_SCHEMA_VERSION = 1;

export function createQualitySnapshotManifest({
  contexts,
  storageMode,
  generatedAt = new Date().toISOString()
}) {
  const normalizedContexts = Array.isArray(contexts) ? contexts : [];

  return {
    schemaVersion: QUALITY_SNAPSHOT_SCHEMA_VERSION,
    generatedAt,
    complete: normalizedContexts.every((context) => context.complete === true),
    storageMode,
    contexts: normalizedContexts
  };
}

