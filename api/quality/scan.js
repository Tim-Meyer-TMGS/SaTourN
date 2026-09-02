import { getDatabaseClient, methodNotAllowed, positiveInteger, sendJson } from '../_database.js';
import {
  buildQualityFilter,
  criterionPresentation,
  qualityListItem
} from '../_quality.js';

export default async function handler(request, response) {
  if (request.method !== 'GET') return methodNotAllowed(response, ['GET']);

  try {
    const filter = buildQualityFilter(request.query || {});
    const limit = positiveInteger(request.query?.limit, 25, 200) || 1;
    const rawOffset = request.query?.cursor ?? request.query?.offset;
    const offset = positiveInteger(rawOffset, 0, 1_000_000);
    const sql = getDatabaseClient();
    const [{ count }] = await sql.query(
      `SELECT COUNT(*)::integer AS count FROM et4_records WHERE ${filter.whereSql}`,
      filter.parameters
    );
    const parameters = [...filter.parameters, limit, offset];
    const rows = await sql.query(
      `SELECT global_id, source_id, record_type, title, city, areas, categories,
              changed_at, quality_score, quality_status, missing_criteria,
              fulfilled_criteria, payload
       FROM et4_records
       WHERE ${filter.whereSql}
       ORDER BY quality_score ASC NULLS FIRST, changed_at DESC NULLS LAST, global_id
       LIMIT $${parameters.length - 1}
       OFFSET $${parameters.length}`,
      parameters
    );
    const nextOffset = offset + rows.length;

    return sendJson(response, 200, {
      items: rows.map(qualityListItem),
      criterion: criterionPresentation(filter.criterion),
      diagnostic: { method: 'database', verified: true },
      page: {
        cursor: offset,
        nextCursor: nextOffset < count ? nextOffset : null,
        complete: nextOffset >= count,
        reason: 'database'
      },
      stats: {
        overallcount: count,
        matchedItems: rows.length,
        totalSourceItems: count,
        scannedItems: rows.length,
        scannedPages: 1,
        budgetExhausted: false,
        paginationRepeated: false
      }
    });
  } catch (error) {
    console.error('Database quality scan failed.', error);
    const status = /Unsupported/.test(String(error?.message)) ? 400 : 500;
    return sendJson(response, status, { error: status === 400 ? error.message : 'Database query failed' });
  }
}

