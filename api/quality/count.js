import { getDatabaseClient, methodNotAllowed, sendJson } from '../_database.js';
import { buildQualityFilter, criterionPresentation } from '../_quality.js';
import { authenticatedIdentity, sendAuthAccessError } from '../_auth.js';

export default async function handler(request, response) {
  if (request.method !== 'GET') return methodNotAllowed(response, ['GET']);

  try {
    const identity = await authenticatedIdentity(request);
    const filter = buildQualityFilter(request.query || {}, identity);
    const sql = getDatabaseClient();
    const [{ count }] = await sql.query(
      `SELECT COUNT(*)::integer AS count FROM et4_records WHERE ${filter.whereSql}`,
      filter.parameters
    );
    return sendJson(response, 200, {
      overallcount: count,
      count,
      criterion: criterionPresentation(filter.criterion),
      diagnostic: { method: 'database', verified: true }
    });
  } catch (error) {
    if (sendAuthAccessError(response, error)) return;
    console.error('Database quality count failed.', error);
    const status = /Unsupported/.test(String(error?.message)) ? 400 : 500;
    return sendJson(response, status, { error: status === 400 ? error.message : 'Database query failed' });
  }
}
