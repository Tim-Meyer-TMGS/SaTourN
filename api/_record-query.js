import { positiveInteger, queryValues } from './_database.js';

const RECORD_TYPES = new Set(['POI', 'Tour', 'Hotel', 'Event', 'Gastro', 'Package']);

function scalar(value) {
  return String(Array.isArray(value) ? value[0] : value ?? '').trim();
}

function addParameter(state, value) {
  state.parameters.push(value);
  return `$${state.parameters.length}`;
}

function addEqualityFilter(state, column, rawValue) {
  const values = queryValues(rawValue);
  if (!values.length) return;
  const placeholders = values.map((value) => addParameter(state, value));
  state.conditions.push(`${column} IN (${placeholders.join(', ')})`);
}

function addJsonArrayFilter(state, expression, rawValue, operator = 'OR') {
  const values = queryValues(rawValue);
  if (!values.length) return;
  const comparisons = values.map((value) => `${expression} ? ${addParameter(state, value)}`);
  state.conditions.push(`(${comparisons.join(operator === 'AND' ? ' AND ' : ' OR ')})`);
}

function extractQuotedFilter(query, field) {
  const values = [];
  const pattern = new RegExp(`\\b${field}:"([^"]+)"`, 'gi');
  let match;
  while ((match = pattern.exec(query))) values.push(match[1]);
  return values;
}

function remainingSearchTerm(query) {
  return String(query || '')
    .replace(/\b(?:area|city|global_id|globalid|id):"[^"]+"/gi, ' ')
    .replace(/\ball:all\b/gi, ' ')
    .replace(/\bAND\b|\bOR\b/gi, ' ')
    .replace(/[(){}\[\]]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function buildRecordSearchQuery(query = {}) {
  const state = {
    conditions: ['experience = $1', 'is_active = TRUE'],
    parameters: [scalar(query.experience) || 'statistik_sachsen']
  };
  const type = scalar(query.type);
  if (type && type !== 'All') {
    if (!RECORD_TYPES.has(type)) throw new Error('Unsupported record type.');
    state.conditions.push(`record_type = ${addParameter(state, type)}`);
  }

  const queryText = scalar(query.query);
  addEqualityFilter(state, 'city', [...queryValues(query.city), ...extractQuotedFilter(queryText, 'city')]);
  addEqualityFilter(state, 'global_id', [
    ...queryValues(query.globalId),
    ...extractQuotedFilter(queryText, 'global_id'),
    ...extractQuotedFilter(queryText, 'globalid')
  ]);
  addEqualityFilter(state, 'source_id', [...queryValues(query.id), ...extractQuotedFilter(queryText, 'id')]);
  addJsonArrayFilter(state, 'areas', [...queryValues(query.area), ...extractQuotedFilter(queryText, 'area')]);
  addJsonArrayFilter(state, 'categories', query.category, scalar(query.categoryOperator).toUpperCase());
  addJsonArrayFilter(state, "payload->'features'", query.feature, scalar(query.featureOperator).toUpperCase());
  addJsonArrayFilter(state, "payload->'keywords'", query.keyword);
  addEqualityFilter(state, "payload->>'zip'", query.zip);

  const openDataPublished = scalar(query.openDataPublished).toLowerCase() === 'true';
  const openDataMode = scalar(query.isOpenData).toLowerCase();
  if (openDataPublished) {
    state.conditions.push('is_open_data_published = TRUE');
  } else if (openDataMode === 'true') {
    state.conditions.push('has_license = TRUE');
  } else if (openDataMode === 'false') {
    state.conditions.push('has_license = FALSE');
  }

  const term = remainingSearchTerm(queryText);
  if (term) {
    const placeholder = addParameter(state, `%${term}%`);
    state.conditions.push(`(
      title ILIKE ${placeholder}
      OR city ILIKE ${placeholder}
      OR global_id ILIKE ${placeholder}
      OR source_id ILIKE ${placeholder}
    )`);
  }

  const limit = positiveInteger(query.limit, 25, 200) || 1;
  const offset = positiveInteger(query.offset, 0, 1_000_000);
  return {
    whereSql: state.conditions.join(' AND '),
    parameters: state.parameters,
    limit,
    offset,
    countOnly: scalar(query.countOnly).toLowerCase() === 'true'
  };
}
