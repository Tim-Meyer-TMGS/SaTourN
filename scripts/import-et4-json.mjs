import { readFile } from 'node:fs/promises';

import 'dotenv/config';
import { neon } from '@neondatabase/serverless';

import { createEt4RecordRow, extractEt4Items } from '../lib/database/compact-et4-record.js';
import { upsertEt4Rows } from '../lib/database/neon-et4-store.js';

function readOption(name, fallback = '') {
  const index = process.argv.indexOf(name);
  return index >= 0 ? String(process.argv[index + 1] || '').trim() : fallback;
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
await upsertEt4Rows(sql, rows, {
  batchSize,
  onProgress: (processed, total) => console.log(`Imported ${processed}/${total}`)
});

console.log(JSON.stringify({ experience, records: rows.length, imported: true }, null, 2));
