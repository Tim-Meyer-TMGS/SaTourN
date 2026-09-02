import { readFile } from 'node:fs/promises';

import 'dotenv/config';
import { neon } from '@neondatabase/serverless';

import { createEt4RecordRow, extractEt4Items } from '../lib/database/compact-et4-record.js';

function readOption(name, fallback = '') {
  const index = process.argv.indexOf(name);
  return index >= 0 ? String(process.argv[index + 1] || '').trim() : fallback;
}

function asJson(value) {
  return JSON.stringify(value ?? null);
}

const filePath = readOption('--file');
const experience = readOption('--experience');
const batchSize = Math.max(1, Math.min(100, Number.parseInt(readOption('--batch-size', '50'), 10) || 50));
const dryRun = process.argv.includes('--dry-run');

if (!filePath || !experience) {
  throw new Error('Usage: node scripts/import-et4-json.mjs --file <json> --experience <name> [--batch-size 50] [--dry-run]');
}

const document = JSON.parse(await readFile(filePath, 'utf8'));
const rows = extractEt4Items(document).map((record) => createEt4RecordRow(record, { experience }));

if (dryRun) {
  console.log(JSON.stringify({ experience, records: rows.length, dryRun: true }, null, 2));
  process.exit(0);
}

const databaseUrl = String(process.env.DATABASE_URL || '').trim();
if (!databaseUrl) throw new Error('DATABASE_URL is required unless --dry-run is used.');

const sql = neon(databaseUrl);
let imported = 0;

for (let start = 0; start < rows.length; start += batchSize) {
  const batch = rows.slice(start, start + batchSize);
  const queries = batch.map((row) => sql`
    INSERT INTO et4_records (
      experience, global_id, source_id, record_type, title, city, areas, categories,
      changed_at, created_at, synced_at, content_hash, is_active, has_license,
      has_description, has_images, quality_score, quality_status, missing_criteria,
      fulfilled_criteria, payload
    ) VALUES (
      ${row.experience}, ${row.globalId}, ${row.sourceId}, ${row.recordType}, ${row.title},
      ${row.city}, ${asJson(row.areas)}::jsonb, ${asJson(row.categories)}::jsonb,
      ${row.changedAt}, ${row.createdAt}, NOW(), ${row.contentHash}, TRUE,
      ${row.hasLicense}, ${row.hasDescription}, ${row.hasImages}, ${row.qualityScore},
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
      has_license = EXCLUDED.has_license,
      has_description = EXCLUDED.has_description,
      has_images = EXCLUDED.has_images,
      quality_score = EXCLUDED.quality_score,
      quality_status = EXCLUDED.quality_status,
      missing_criteria = EXCLUDED.missing_criteria,
      fulfilled_criteria = EXCLUDED.fulfilled_criteria,
      payload = EXCLUDED.payload
  `);

  await sql.transaction(queries);
  imported += batch.length;
  console.log(`Imported ${imported}/${rows.length}`);
}

console.log(JSON.stringify({ experience, records: rows.length, imported: true }, null, 2));
