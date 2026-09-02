import { authenticatedIdentity, sendAuthAccessError } from './auth.js';
import {
  getDatabaseClient,
  methodNotAllowed,
  parseBody,
  positiveInteger,
  PRIMARY_EXPERIENCE,
  queryValues,
  sendJson
} from './http.js';
import { buildQualityFilter, criterionInfo, criterionPresentation, qualityListItem } from './quality.js';
import { buildRecordSearchQuery } from './record-query.js';

function badOperation(response) {
  return sendJson(response, 400, { error: 'Unsupported data action' });
}

async function searchRecords(request, response, identity) {
  if (request.method !== 'GET') return methodNotAllowed(response, ['GET']);
  const sql = getDatabaseClient();
  const search = buildRecordSearchQuery(request.query || {}, identity);
  const [{ count }] = await sql.query(
    `SELECT COUNT(*)::integer AS count FROM et4_records WHERE ${search.whereSql}`,
    search.parameters
  );

  if (search.countOnly) {
    return sendJson(response, 200, { status: 'OK', count: 0, overallcount: count, items: [] });
  }

  const parameters = [...search.parameters, search.limit, search.offset];
  const items = await sql.query(
    `SELECT payload
     FROM et4_records
     WHERE ${search.whereSql}
     ORDER BY changed_at DESC NULLS LAST, global_id
     LIMIT $${parameters.length - 1}
     OFFSET $${parameters.length}`,
    parameters
  );
  return sendJson(response, 200, {
    status: 'OK',
    count: items.length,
    overallcount: count,
    items: items.map((entry) => entry.payload)
  });
}

async function recordsByIds(request, response, identity) {
  if (request.method !== 'POST') return methodNotAllowed(response, ['POST']);
  const body = parseBody(request.body);
  const identifiers = Array.from(new Set([
    ...queryValues(body.ids),
    ...queryValues(body.globalIds)
  ])).slice(0, 50);
  if (!identifiers.length) return sendJson(response, 200, { items: [], missingIds: [] });

  const parameters = [PRIMARY_EXPERIENCE, identifiers];
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
  return sendJson(response, 200, {
    items,
    missingIds: identifiers.filter((identifier) => !byIdentifier.has(identifier))
  });
}

async function qualityCount(request, response, identity) {
  if (request.method !== 'GET') return methodNotAllowed(response, ['GET']);
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
}

async function qualityScan(request, response, identity) {
  if (request.method !== 'GET') return methodNotAllowed(response, ['GET']);
  const filter = buildQualityFilter(request.query || {}, identity);
  const limit = positiveInteger(request.query?.limit, 25, 200) || 1;
  const offset = positiveInteger(request.query?.cursor ?? request.query?.offset, 0, 1_000_000);
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
}

function priorityRank(priority) {
  if (priority === 'hoch') return 3;
  if (priority === 'mittel') return 2;
  return 1;
}

async function qualitySummary(request, response, identity) {
  if (request.method !== 'GET') return methodNotAllowed(response, ['GET']);
  const filter = buildRecordSearchQuery({ ...(request.query || {}), countOnly: 'false' }, identity);
  const sql = getDatabaseClient();
  const [summary] = await sql.query(
    `SELECT
       COUNT(*)::integer AS total_assessed,
       COUNT(*) FILTER (WHERE jsonb_array_length(missing_criteria) > 0)::integer AS with_issues,
       COUNT(*) FILTER (WHERE quality_status = 'gut')::integer AS good,
       COUNT(*) FILTER (WHERE quality_status = 'pruefen')::integer AS review,
       COUNT(*) FILTER (WHERE quality_status = 'kritisch')::integer AS critical,
       COUNT(*) FILTER (WHERE quality_score IS NULL)::integer AS not_calculable,
       ROUND(AVG(quality_score))::integer AS average_quality_score,
       COUNT(*) FILTER (WHERE has_license)::integer AS open_data_capable_count
     FROM et4_records
     WHERE ${filter.whereSql}`,
    filter.parameters
  );
  const issueRows = await sql.query(
    `SELECT criterion.value AS criterion_id, record.record_type, COUNT(*)::integer AS affected_count
     FROM et4_records AS record
     CROSS JOIN LATERAL jsonb_array_elements_text(record.missing_criteria) AS criterion(value)
     WHERE ${filter.whereSql}
     GROUP BY criterion.value, record.record_type`,
    filter.parameters
  );
  const issueMap = new Map();
  issueRows.forEach((row) => {
    const info = criterionInfo(row.criterion_id);
    const issue = issueMap.get(row.criterion_id) || {
      criterionId: row.criterion_id,
      label: info.label,
      priority: info.priority,
      recommendation: info.recommendation,
      affectedCount: 0,
      affectedTypes: []
    };
    issue.affectedCount += row.affected_count;
    issue.affectedTypes.push(row.record_type);
    issueMap.set(row.criterion_id, issue);
  });
  const issueSummary = Array.from(issueMap.values()).sort((left, right) => (
    priorityRank(right.priority) - priorityRank(left.priority)
    || right.affectedCount - left.affectedCount
    || left.label.localeCompare(right.label, 'de')
  ));

  return sendJson(response, 200, {
    totalAssessed: summary.total_assessed,
    withIssues: summary.with_issues,
    good: summary.good,
    review: summary.review,
    critical: summary.critical,
    notCalculable: summary.not_calculable,
    averageQualityScore: summary.average_quality_score,
    openDataCapableCount: summary.open_data_capable_count,
    issueSummary,
    statusCounts: {
      gut: summary.good,
      pruefen: summary.review,
      kritisch: summary.critical,
      nichtBerechenbar: summary.not_calculable
    },
    meta: { partial: false, source: 'database' }
  });
}

const operations = new Map([
  ['search', searchRecords],
  ['records-by-ids', recordsByIds],
  ['quality-count', qualityCount],
  ['quality-scan', qualityScan],
  ['quality-list', qualityScan],
  ['quality-summary', qualitySummary]
]);

export async function handleDataRequest(request, response) {
  const action = String(Array.isArray(request.query?.action) ? request.query.action[0] : request.query?.action || '').trim();
  const operation = operations.get(action);
  if (!operation) return badOperation(response);

  try {
    const identity = await authenticatedIdentity(request);
    return await operation(request, response, identity);
  } catch (error) {
    if (sendAuthAccessError(response, error)) return;
    console.error(`Data action ${action} failed.`, error);
    const status = /Unsupported|Unknown|JSON/.test(String(error?.message)) ? 400 : 500;
    return sendJson(response, status, { error: status === 400 ? error.message : 'Database query failed' });
  }
}
