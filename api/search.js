import { getDatabaseClient, methodNotAllowed, sendJson } from './_database.js';
import { buildRecordSearchQuery } from './_record-query.js';
import { authenticatedIdentity, sendAuthAccessError } from './_auth.js';

export default async function handler(request, response) {
  if (request.method !== 'GET') return methodNotAllowed(response, ['GET']);

  try {
    const identity = await authenticatedIdentity(request);
    const sql = getDatabaseClient();
    const search = buildRecordSearchQuery(request.query || {}, identity);
    const [{ count }] = await sql.query(
      `SELECT COUNT(*)::integer AS count FROM et4_records WHERE ${search.whereSql}`,
      search.parameters
    );

    if (search.countOnly) {
      return sendJson(response, 200, {
        status: 'OK',
        count: 0,
        overallcount: count,
        items: []
      });
    }

    const itemParameters = [...search.parameters, search.limit, search.offset];
    const items = await sql.query(
      `SELECT payload
       FROM et4_records
       WHERE ${search.whereSql}
       ORDER BY changed_at DESC NULLS LAST, global_id
       LIMIT $${itemParameters.length - 1}
       OFFSET $${itemParameters.length}`,
      itemParameters
    );

    return sendJson(response, 200, {
      status: 'OK',
      count: items.length,
      overallcount: count,
      items: items.map((entry) => entry.payload)
    });
  } catch (error) {
    if (sendAuthAccessError(response, error)) return;
    console.error('Database search failed.', error);
    const status = /Unsupported record type/.test(String(error?.message)) ? 400 : 500;
    return sendJson(response, status, { error: status === 400 ? error.message : 'Database query failed' });
  }
}
