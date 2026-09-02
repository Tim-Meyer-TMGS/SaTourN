import { qualityCriteria } from '../Statistik/quality.js';
import { buildRecordSearchQuery } from './_record-query.js';

const criteriaById = new Map(qualityCriteria.map((criterion) => [criterion.id, criterion]));

export function qualityCriterion(criterionId) {
  return criteriaById.get(String(criterionId || '').trim()) || null;
}

export function buildQualityFilter(query = {}, identity = null) {
  const search = buildRecordSearchQuery({
    ...query,
    experience: 'statistik_sachsen',
    countOnly: 'false',
    limit: '200'
  }, identity);
  const criterionId = String(Array.isArray(query.criterionId) ? query.criterionId[0] : query.criterionId || '').trim();
  const criterion = qualityCriterion(criterionId);
  if (!criterion) throw new Error('Unsupported quality criterion.');
  search.parameters.push(criterionId);
  return {
    ...search,
    criterion,
    criterionId,
    whereSql: `${search.whereSql} AND missing_criteria ? $${search.parameters.length}`
  };
}

function textValue(value) {
  if (value == null) return '';
  if (Array.isArray(value)) return value.map(textValue).find(Boolean) || '';
  if (typeof value === 'object') return textValue(value.value ?? value.name ?? value.title);
  return String(value).trim();
}

function values(value) {
  const list = Array.isArray(value) ? value : value == null ? [] : [value];
  return list.map(textValue).filter(Boolean);
}

export function qualityListItem(row) {
  const payload = row.payload || {};
  const addresses = Array.isArray(payload.addresses) ? payload.addresses : [];
  const authorships = Array.from(new Set(addresses
    .filter((entry) => ['author', 'organisation', 'organization'].includes(String(entry?.rel || '').toLowerCase()))
    .map((entry) => textValue(entry?.name))
    .filter(Boolean)));

  return {
    id: row.source_id || payload.id || '',
    globalId: row.global_id,
    title: row.title,
    type: row.record_type,
    city: row.city,
    region: values(row.areas)[0] || '',
    category: values(row.categories)[0] || '',
    authorships,
    updatedAt: row.changed_at || '',
    qualityScore: row.quality_score,
    qualityStatus: row.quality_status,
    missingCriteria: row.missing_criteria || [],
    fulfilledCriteria: row.fulfilled_criteria || [],
    raw: payload
  };
}

export function criterionPresentation(criterion) {
  return {
    id: criterion.id,
    label: criterion.label,
    priority: criterion.priority,
    autoCheck: criterion.autoCheck !== false,
    recommendation: criterion.recommendation,
    method: 'database'
  };
}

export function criterionInfo(criterionId) {
  const criterion = qualityCriterion(criterionId);
  return criterion ? {
    label: criterion.label,
    priority: criterion.priority || '',
    recommendation: criterion.recommendation || ''
  } : {
    label: criterionId,
    priority: '',
    recommendation: ''
  };
}
