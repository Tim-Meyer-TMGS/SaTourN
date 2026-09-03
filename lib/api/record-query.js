import { AuthAccessError } from './auth.js';
import { positiveInteger, PRIMARY_EXPERIENCE, queryValues } from './http.js';

const RECORD_TYPES = new Set(['POI', 'Tour', 'Hotel', 'Event', 'Gastro', 'Package', 'City', 'Area', 'Article']);

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

function addNotEqualityFilter(state, column, rawValue) {
  const values = queryValues(rawValue);
  if (!values.length) return;
  const placeholders = values.map((value) => addParameter(state, value));
  state.conditions.push(`${column} NOT IN (${placeholders.join(', ')})`);
}

function addJsonArrayFilter(state, expression, rawValue, operator = 'OR') {
  const values = queryValues(rawValue);
  if (!values.length) return;
  const comparisons = values.map((value) => `${expression} ? ${addParameter(state, value)}`);
  state.conditions.push(`(${comparisons.join(operator === 'AND' ? ' AND ' : ' OR ')})`);
}

function addJsonArrayExclusion(state, expression, rawValue) {
  const values = queryValues(rawValue);
  if (!values.length) return;
  const comparisons = values.map((value) => `${expression} ? ${addParameter(state, value)}`);
  state.conditions.push(`NOT (${comparisons.join(' OR ')})`);
}

function extractFilter(query, field) {
  const values = [];
  const pattern = new RegExp(`\\b${field}:(?:"([^"]+)"|([^\\s()]+))`, 'gi');
  let match;
  while ((match = pattern.exec(query))) values.push(match[1] || match[2]);
  return values;
}

function remainingSearchTerm(query) {
  return String(query || '')
    .replace(/\b(?:area|city|category|feature|keyword|zip|global_id|globalid|id):(?:"[^"]+"|[^\s()]+)/gi, ' ')
    .replace(/\ball:all\b/gi, ' ')
    .replace(/\bAND\b|\bOR\b/gi, ' ')
    .replace(/[(){}\[\]]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function addIdentityAreaScope(state, identity) {
  if (!identity || identity.access_all_areas) return;
  const allowedAreas = new Set(identity.allowed_area_ids || []);
  if (!allowedAreas.size) {
    state.conditions.push('FALSE');
    return;
  }
  state.conditions.push(`areas ?| ${addParameter(state, [...allowedAreas])}::text[]`);
}

export function buildRecordSearchQuery(query = {}, identity = null) {
  const state = {
    conditions: ['experience = $1', 'is_active = TRUE'],
    parameters: [PRIMARY_EXPERIENCE]
  };
  const type = scalar(query.type);
  if (type && type !== 'All') {
    if (!RECORD_TYPES.has(type)) throw new Error('Unsupported record type.');
    state.conditions.push(`record_type = ${addParameter(state, type)}`);
  }
  const types = queryValues(query.types);
  if (!type && types.length) {
    const unsupported = types.filter((entry) => !RECORD_TYPES.has(entry));
    if (unsupported.length) throw new Error('Unsupported record type.');
    state.conditions.push(`record_type = ANY(${addParameter(state, types)}::text[])`);
  }

  const queryText = scalar(query.query);
  addEqualityFilter(state, 'city', [...queryValues(query.city), ...extractFilter(queryText, 'city')]);
  addEqualityFilter(state, 'global_id', [
    ...queryValues(query.globalId),
    ...extractFilter(queryText, 'global_id'),
    ...extractFilter(queryText, 'globalid')
  ]);
  addEqualityFilter(state, 'source_id', [...queryValues(query.id), ...extractFilter(queryText, 'id')]);
  const requestedAreas = [...queryValues(query.area), ...extractFilter(queryText, 'area')];
  if (identity && !identity.access_all_areas) {
    const allowedAreas = new Set(identity.allowed_area_ids || []);
    if (requestedAreas.some((area) => !allowedAreas.has(area))) {
      throw new AuthAccessError(403, 'AREA_FORBIDDEN', 'Forbidden');
    }
  }
  addIdentityAreaScope(state, identity);
  addJsonArrayFilter(state, 'areas', requestedAreas);
  addJsonArrayExclusion(state, 'areas', query.excludeArea);
  addNotEqualityFilter(state, 'city', query.excludeCity);
  addJsonArrayFilter(state, 'categories', [...queryValues(query.category), ...extractFilter(queryText, 'category')], scalar(query.categoryOperator).toUpperCase());
  const categoryIds = queryValues(query.categoryId ?? query.categoryIds);
  if (categoryIds.length) {
    state.conditions.push(`EXISTS (
      SELECT 1
      FROM record_categories AS record_category
      WHERE record_category.experience = et4_records.experience
        AND record_category.record_global_id = et4_records.global_id
        AND record_category.category_id = ANY(${addParameter(state, categoryIds)}::text[])
    )`);
  }
  addJsonArrayExclusion(state, 'categories', query.excludeCategory);
  addJsonArrayFilter(state, "payload->'features'", [...queryValues(query.feature), ...extractFilter(queryText, 'feature')], scalar(query.featureOperator).toUpperCase());
  addJsonArrayExclusion(state, "payload->'features'", query.excludeFeature);
  addJsonArrayFilter(state, "payload->'keywords'", [...queryValues(query.keyword), ...extractFilter(queryText, 'keyword')]);
  addJsonArrayExclusion(state, "payload->'keywords'", query.excludeKeyword);
  addEqualityFilter(state, "payload->>'zip'", [...queryValues(query.zip), ...extractFilter(queryText, 'zip')]);
  addJsonArrayFilter(state, 'missing_criteria', query.criterionId ?? query.criterionIds, scalar(query.criterionOperator).toUpperCase() || 'OR');

  const authorships = queryValues(query.authorship ?? query.authorships);
  if (authorships.length) {
    const clauses = authorships.map((authorship) => {
      const placeholder = addParameter(state, authorship);
      return `(
        LOWER(COALESCE(payload->>'author', payload->>'organisation', payload->>'organization', '')) = LOWER(${placeholder})
        OR EXISTS (
          SELECT 1 FROM jsonb_array_elements(COALESCE(payload->'addresses', '[]'::jsonb)) AS address(value)
          WHERE LOWER(COALESCE(address.value->>'rel', '')) IN ('author', 'organisation', 'organization')
            AND LOWER(COALESCE(address.value->>'name', address.value->>'company', address.value->>'title', address.value->>'value', '')) = LOWER(${placeholder})
        )
      )`;
    });
    state.conditions.push(`(${clauses.join(' OR ')})`);
  }

  const openDataMode = scalar(query.isOpenData).toLowerCase();
  if (openDataMode === 'true' || scalar(query.openDataPublished).toLowerCase() === 'true') {
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
