import assert from 'node:assert/strict';
import 'dotenv/config';
import { neon } from '@neondatabase/serverless';
import { buildRecordSearchQuery } from '../lib/api/record-query.js';

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required.');
const sql = neon(process.env.DATABASE_URL);
const [integrity] = await sql.query(`
  SELECT
    (SELECT COUNT(*)::integer FROM categories) AS categories,
    (SELECT COUNT(*)::integer FROM record_categories) AS relations,
    (SELECT COUNT(*)::integer FROM record_categories rc LEFT JOIN et4_records r ON r.experience=rc.experience AND r.global_id=rc.record_global_id WHERE r.global_id IS NULL) AS orphan_records,
    (SELECT COUNT(*)::integer FROM record_categories rc LEFT JOIN categories c ON c.id=rc.category_id WHERE c.id IS NULL) AS orphan_categories
`);
assert.ok(integrity.categories > 0);
assert.ok(integrity.relations > 0);
assert.equal(integrity.orphan_records, 0);
assert.equal(integrity.orphan_categories, 0);

const identity = { access_all_areas: false, allowed_area_ids: ['Leipzig', 'Leipzig Region'] };
const base = buildRecordSearchQuery({ limit: 25, offset: 0 }, identity);
const [{ count: scopedTotal }] = await sql.query(`SELECT COUNT(*)::integer AS count FROM et4_records WHERE ${base.whereSql}`, base.parameters);
assert.ok(scopedTotal > 25);
const pageParameters = [...base.parameters, base.limit, base.offset];
const page = await sql.query(`SELECT global_id, areas FROM et4_records WHERE ${base.whereSql} ORDER BY changed_at DESC NULLS LAST, global_id LIMIT $${pageParameters.length - 1} OFFSET $${pageParameters.length}`, pageParameters);
assert.equal(page.length, 25);
assert.ok(page.every((row) => row.areas.some((area) => identity.allowed_area_ids.includes(area))));

const [museum] = await sql.query(`SELECT id, name FROM categories WHERE name ILIKE '%museum%' OR name ILIKE '%museen%' ORDER BY name LIMIT 1`);
assert.ok(museum);
const categoryFilter = buildRecordSearchQuery({ categoryId: museum.id }, { access_all_areas: true, allowed_area_ids: [] });
const [{ count: categoryTotal }] = await sql.query(`SELECT COUNT(*)::integer AS count FROM et4_records WHERE ${categoryFilter.whereSql}`, categoryFilter.parameters);
assert.ok(categoryTotal > 0);

const criterionFilter = buildRecordSearchQuery({ criterionId: 'image_missing' }, identity);
const criterionRows = await sql.query(`SELECT missing_criteria FROM et4_records WHERE ${criterionFilter.whereSql} LIMIT 20`, criterionFilter.parameters);
assert.ok(criterionRows.every((row) => row.missing_criteria.includes('image_missing')));

console.log(JSON.stringify({
  categories: integrity.categories,
  relations: integrity.relations,
  scopedTotal,
  pageSize: page.length,
  category: museum.name,
  categoryTotal,
  criterionSample: criterionRows.length
}, null, 2));
