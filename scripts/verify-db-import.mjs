import 'dotenv/config';
import { neon } from '@neondatabase/serverless';

function readOption(name, fallback = '') {
  const index = process.argv.indexOf(name);
  return index >= 0 ? String(process.argv[index + 1] || '').trim() : fallback;
}

const experience = readOption('--experience', 'statistik_sachsen');
const databaseUrl = String(process.env.DATABASE_URL || '').trim();
if (!databaseUrl) throw new Error('DATABASE_URL is required.');

const sql = neon(databaseUrl);
const [summary] = await sql`
  SELECT
    COUNT(*) FILTER (WHERE is_active)::integer AS records,
    COUNT(DISTINCT global_id) FILTER (WHERE is_active)::integer AS distinct_global_ids,
    COUNT(*) FILTER (WHERE NOT is_active)::integer AS inactive_records,
    COUNT(*) FILTER (WHERE is_active AND has_license)::integer AS records_with_license,
    COUNT(*) FILTER (WHERE is_active AND is_open_data_published)::integer AS records_published_open_data,
    COUNT(*) FILTER (WHERE is_active AND has_description)::integer AS records_with_description,
    COUNT(*) FILTER (WHERE is_active AND has_images)::integer AS records_with_images,
    MIN(changed_at) FILTER (WHERE is_active) AS oldest_change,
    MAX(changed_at) FILTER (WHERE is_active) AS newest_change
  FROM et4_records
  WHERE experience = ${experience}
`;

const typeCounts = await sql`
  SELECT
    record_type,
    COUNT(*) FILTER (WHERE is_active)::integer AS records,
    COUNT(*) FILTER (WHERE is_active AND has_license)::integer AS records_with_license,
    COUNT(*) FILTER (WHERE is_active AND is_open_data_published)::integer AS records_published_open_data
  FROM et4_records
  WHERE experience = ${experience}
  GROUP BY record_type
  ORDER BY record_type
`;

const [storage] = await sql`
  SELECT
    pg_size_pretty(pg_relation_size('et4_records')) AS table_size,
    pg_size_pretty(pg_indexes_size('et4_records')) AS index_size,
    pg_size_pretty(pg_total_relation_size('et4_records')) AS total_size
`;

const syncStates = await sql`
  SELECT record_type, status, imported_count, last_changed_at, last_success_at
  FROM et4_sync_state
  WHERE experience = ${experience}
  ORDER BY record_type
`;

const [staging] = await sql`
  SELECT COUNT(*)::integer AS pending_seen_ids
  FROM et4_sync_seen
  WHERE experience = ${experience}
`;

const licenseValues = await sql`
  SELECT LOWER(attribute->>'value') AS license, COUNT(*)::integer AS records
  FROM et4_records AS record
  CROSS JOIN LATERAL jsonb_array_elements(record.payload->'attributes') AS attribute
  WHERE record.experience = ${experience}
    AND LOWER(attribute->>'key') = 'license'
  GROUP BY LOWER(attribute->>'value')
  ORDER BY records DESC, license
`;

console.log(JSON.stringify({ experience, summary, typeCounts, licenseValues, syncStates, staging, storage }, null, 2));
