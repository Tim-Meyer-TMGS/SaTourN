import { getDatabaseClient, methodNotAllowed, sendJson } from '../_database.js';
import { buildRecordSearchQuery } from '../_record-query.js';
import { criterionInfo } from '../_quality.js';
import { authenticatedIdentity, sendAuthAccessError } from '../_auth.js';

function priorityRank(priority) {
  if (priority === 'hoch') return 3;
  if (priority === 'mittel') return 2;
  return 1;
}

export default async function handler(request, response) {
  if (request.method !== 'GET') return methodNotAllowed(response, ['GET']);

  try {
    const identity = await authenticatedIdentity(request);
    const filter = buildRecordSearchQuery({
      ...(request.query || {}),
      experience: 'statistik_sachsen',
      countOnly: 'false'
    }, identity);
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
  } catch (error) {
    if (sendAuthAccessError(response, error)) return;
    console.error('Database quality summary failed.', error);
    return sendJson(response, 500, { error: 'Database query failed' });
  }
}
