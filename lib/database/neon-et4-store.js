import { createHash } from 'node:crypto';

function asJson(value) {
  return JSON.stringify(value ?? null);
}

export function categoryId(experience, taxonomy, name) {
  return `cat_${createHash('md5').update(`${experience}:${taxonomy}:${name}`).digest('hex')}`;
}

export async function upsertCategoryCatalog(sql, { experience, taxonomy, categories }) {
  const entries = Array.isArray(categories) ? categories : [];
  if (!entries.length) return 0;
  const statements = entries.map((entry) => sql`
    INSERT INTO categories (id, experience, external_id, name, parent_id, taxonomy, updated_at)
    VALUES (
      ${categoryId(experience, taxonomy, entry.name)}, ${experience}, ${entry.externalId}, ${entry.name},
      ${entry.parentName ? categoryId(experience, taxonomy, entry.parentName) : null}, ${taxonomy}, NOW()
    )
    ON CONFLICT (experience, taxonomy, name) DO UPDATE SET
      external_id = EXCLUDED.external_id, parent_id = EXCLUDED.parent_id, updated_at = NOW()
  `);
  await sql.transaction(statements);
  return entries.length;
}

export async function upsertEt4Rows(sql, rows, { batchSize = 50, onProgress } = {}) {
  const normalizedBatchSize = Math.max(1, Math.min(100, Number(batchSize) || 50));
  let processed = 0;

  for (let start = 0; start < rows.length; start += normalizedBatchSize) {
    const batch = rows.slice(start, start + normalizedBatchSize);
    const queries = batch.flatMap((row) => {
      const recordUpsert = sql`
      INSERT INTO et4_records (
        experience, global_id, source_id, record_type, title, city, areas, categories,
        changed_at, created_at, synced_at, content_hash, is_active, license_type, has_license,
        has_description, has_images, quality_score, quality_status, missing_criteria,
        fulfilled_criteria, payload
      ) VALUES (
        ${row.experience}, ${row.globalId}, ${row.sourceId}, ${row.recordType}, ${row.title},
        ${row.city}, ${asJson(row.areas)}::jsonb, ${asJson(row.categories)}::jsonb,
        ${row.changedAt}, ${row.createdAt}, NOW(), ${row.contentHash}, TRUE,
        ${row.licenseType}, ${row.hasLicense}, ${row.hasDescription}, ${row.hasImages}, ${row.qualityScore},
        ${row.qualityStatus}, ${asJson(row.missingCriteria)}::jsonb,
        ${asJson(row.fulfilledCriteria)}::jsonb, ${asJson(row.payload)}::jsonb
      )
      ON CONFLICT (experience, global_id) DO UPDATE SET
        source_id = EXCLUDED.source_id,
        record_type = EXCLUDED.record_type,
        title = EXCLUDED.title,
        city = EXCLUDED.city,
        areas = EXCLUDED.areas,
        categories = EXCLUDED.categories,
        changed_at = EXCLUDED.changed_at,
        created_at = EXCLUDED.created_at,
        synced_at = NOW(),
        content_hash = EXCLUDED.content_hash,
        is_active = TRUE,
        license_type = EXCLUDED.license_type,
        has_license = EXCLUDED.has_license,
        has_description = EXCLUDED.has_description,
        has_images = EXCLUDED.has_images,
        quality_score = EXCLUDED.quality_score,
        quality_status = EXCLUDED.quality_status,
        missing_criteria = EXCLUDED.missing_criteria,
        fulfilled_criteria = EXCLUDED.fulfilled_criteria,
        payload = EXCLUDED.payload
      WHERE et4_records.content_hash IS DISTINCT FROM EXCLUDED.content_hash
         OR et4_records.is_active = FALSE
      `;
      const categoryUpserts = row.categories.map((name) => sql`
        INSERT INTO categories (id, experience, name, taxonomy, updated_at)
        VALUES (${categoryId(row.experience, row.recordType, name)}, ${row.experience}, ${name}, ${row.recordType}, NOW())
        ON CONFLICT (experience, taxonomy, name) DO UPDATE SET updated_at = NOW()
      `);
      const relationReset = sql`DELETE FROM record_categories WHERE experience = ${row.experience} AND record_global_id = ${row.globalId}`;
      const relationUpserts = row.categories.map((name) => sql`
        INSERT INTO record_categories (experience, record_global_id, category_id, relation_type)
        VALUES (${row.experience}, ${row.globalId}, ${categoryId(row.experience, row.recordType, name)}, 'category')
        ON CONFLICT DO NOTHING
      `);
      return [recordUpsert, ...categoryUpserts, relationReset, ...relationUpserts];
    });

    await sql.transaction(queries);
    processed += batch.length;
    onProgress?.(processed, rows.length);
  }

  return processed;
}

export async function getEt4SyncState(sql, { experience, recordType }) {
  const [state] = await sql`
    SELECT experience, record_type, last_changed_at, last_success_at, status, imported_count
    FROM et4_sync_state
    WHERE experience = ${experience} AND record_type = ${recordType}
  `;
  return state || null;
}

export async function markEt4SyncStarted(sql, { experience, recordType }) {
  await sql`
    INSERT INTO et4_sync_state (
      experience, record_type, last_attempt_at, status, imported_count, error_message
    ) VALUES (${experience}, ${recordType}, NOW(), 'running', 0, NULL)
    ON CONFLICT (experience, record_type) DO UPDATE SET
      last_attempt_at = NOW(),
      status = 'running',
      imported_count = 0,
      error_message = NULL
  `;
}

export async function markEt4SyncSucceeded(sql, {
  experience,
  recordType,
  watermark,
  importedCount
}) {
  await sql`
    UPDATE et4_sync_state
    SET last_changed_at = ${watermark},
        last_success_at = NOW(),
        status = 'success',
        imported_count = ${importedCount},
        error_message = NULL
    WHERE experience = ${experience} AND record_type = ${recordType}
  `;
}

export async function markEt4SyncFailed(sql, { experience, recordType, error }) {
  const errorMessage = String(error?.message || error || 'Unknown sync error').slice(0, 1000);
  await sql`
    UPDATE et4_sync_state
    SET status = 'failed', error_message = ${errorMessage}
    WHERE experience = ${experience} AND record_type = ${recordType}
  `;
}

export async function recordEt4SyncSeenIds(sql, {
  syncToken,
  experience,
  recordType,
  globalIds
}) {
  const ids = Array.from(new Set(globalIds.map((value) => String(value || '').trim()).filter(Boolean)));
  if (!ids.length) return 0;

  const queries = ids.map((globalId) => sql`
    INSERT INTO et4_sync_seen (sync_token, experience, record_type, global_id)
    VALUES (${syncToken}, ${experience}, ${recordType}, ${globalId})
    ON CONFLICT DO NOTHING
  `);
  await sql.transaction(queries);
  return ids.length;
}

export async function reconcileEt4FullSync(sql, { syncToken, experience, recordType }) {
  const deleted = await sql`
    DELETE FROM et4_records AS record
    WHERE record.experience = ${experience}
      AND record.record_type = ${recordType}
      AND NOT EXISTS (
        SELECT 1
        FROM et4_sync_seen AS seen
        WHERE seen.sync_token = ${syncToken}
          AND seen.experience = record.experience
          AND seen.record_type = record.record_type
          AND seen.global_id = record.global_id
      )
    RETURNING record.global_id
  `;
  return deleted.length;
}

export async function clearEt4SyncSeenIds(sql, { syncToken }) {
  await sql`DELETE FROM et4_sync_seen WHERE sync_token = ${syncToken}`;
}
