import { getDatabaseClient, methodNotAllowed, queryValues, sendJson } from '../_database.js';
import { authenticatedIdentity, sendAuthAccessError } from '../_auth.js';

function parseBody(body) {
  if (!body) return {};
  if (typeof body === 'string') return JSON.parse(body);
  return body;
}

export default async function handler(request, response) {
  if (request.method !== 'POST') return methodNotAllowed(response, ['POST']);

  try {
    const identity = await authenticatedIdentity(request);
    const body = parseBody(request.body);
    const identifiers = Array.from(new Set([
      ...queryValues(body.ids),
      ...queryValues(body.globalIds)
    ])).slice(0, 50);
    if (!identifiers.length) return sendJson(response, 200, { items: [], missingIds: [] });

    const parameters = ['statistik_sachsen', identifiers];
    const conditions = [
      'experience = $1',
      'is_active = TRUE',
      '(global_id = ANY($2::text[]) OR source_id = ANY($2::text[]))'
    ];
    const type = String(body.type || '').trim();
    if (type) {
      parameters.push(type);
      conditions.push(`record_type = $${parameters.length}`);
    }
    if (!identity.access_all_areas) {
      if (!identity.allowed_area_ids.length) {
        conditions.push('FALSE');
      } else {
        parameters.push(identity.allowed_area_ids);
        conditions.push(`areas ?| $${parameters.length}::text[]`);
      }
    }

    const sql = getDatabaseClient();
    const rows = await sql.query(
      `SELECT global_id, source_id, record_type, payload
       FROM et4_records
       WHERE ${conditions.join(' AND ')}`,
      parameters
    );
    const byIdentifier = new Map();
    rows.forEach((row) => {
      byIdentifier.set(row.global_id, row);
      if (row.source_id) byIdentifier.set(row.source_id, row);
    });
    const items = identifiers
      .map((identifier) => byIdentifier.get(identifier))
      .filter(Boolean)
      .map((row) => ({ ...row.payload, _resolvedType: row.record_type }));
    const missingIds = identifiers.filter((identifier) => !byIdentifier.has(identifier));

    return sendJson(response, 200, { items, missingIds });
  } catch (error) {
    if (sendAuthAccessError(response, error)) return;
    console.error('Database record lookup failed.', error);
    return sendJson(response, 500, { error: 'Database query failed' });
  }
}
