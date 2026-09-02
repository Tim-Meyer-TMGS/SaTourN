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
    COUNT(*)::integer AS records,
    COUNT(DISTINCT global_id)::integer AS distinct_global_ids,
    COUNT(*) FILTER (WHERE has_license)::integer AS records_with_license,
    COUNT(*) FILTER (WHERE has_description)::integer AS records_with_description,
    COUNT(*) FILTER (WHERE has_images)::integer AS records_with_images,
    MIN(changed_at) AS oldest_change,
    MAX(changed_at) AS newest_change
  FROM et4_records
  WHERE experience = ${experience}
`;

const typeCounts = await sql`
  SELECT record_type, COUNT(*)::integer AS records
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

console.log(JSON.stringify({ experience, summary, typeCounts, storage }, null, 2));

