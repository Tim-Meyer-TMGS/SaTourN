import { BIG_LIMIT_TYPES, MAX_LIMIT_CITIES, MAX_LIMIT_OTHERS } from './config.js';
import {
  isNonOpenDataMode,
  isOpenDataMode,
  NON_OPEN_DATA_LICENSE_QUERY,
  OPEN_DATA_LICENSE_QUERY,
  OPEN_DATA_LICENSE_VALUES
} from './open-data-rules.js';

export {
  NON_OPEN_DATA_LICENSE_QUERY,
  OPEN_DATA_LICENSE_QUERY,
  OPEN_DATA_LICENSE_VALUES
};

export const META_SEARCH_TYPES = Object.freeze([
  'All', 'Hotel', 'Event', 'Gastro', 'Tour', 'POI', 'City', 'Area', 'Package', 'Article', 'Web'
]);

export function normalizeMetaSearchType(value = '') {
  const normalized = String(Array.isArray(value) ? value[0] : value || '').trim().toLowerCase();
  if (!normalized || normalized === 'all') return 'All';
  if (['cities', 'orte', 'staedte', 'städte'].includes(normalized)) return 'City';
  return META_SEARCH_TYPES.find((type) => type.toLowerCase() === normalized) || null;
}

export function combineSearchQueries(...queries) {
  const parts = queries
    .map((query) => normalizeQueryParam(query).trim())
    .filter(Boolean);
  if (parts.length <= 1) return parts[0] || '';
  return parts.map((part) => `(${part})`).join(' AND ');
}

const STRUCTURED_FILTERS = Object.freeze([
  ['area', 'area'],
  ['city', 'city'],
  ['category', 'category'],
  ['feature', 'feature'],
  ['keyword', 'keyword'],
  ['zip', 'zip'],
  ['globalId', 'globalid'],
  ['id', 'id']
]);

function normalizeFilterValues(value) {
  const values = Array.isArray(value) ? value : value == null ? [] : [value];
  return Array.from(new Set(values
    .flatMap((entry) => String(entry || '').split(','))
    .map((entry) => entry.replace(/[\u0000-\u001f\u007f]/g, '').trim())
    .filter(Boolean)
    .slice(0, 50)
    .map((entry) => entry.slice(0, 200))));
}

function quoteFilterValue(value) {
  return `"${String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

function normalizeFilterOperator(value) {
  return String(Array.isArray(value) ? value[0] : value || '').toUpperCase() === 'AND' ? 'AND' : 'OR';
}

function buildFieldExpression(field, values, operator = 'OR', excluded = false) {
  if (!values.length) return '';
  const grouped = values.length === 1
    ? quoteFilterValue(values[0])
    : `(${values.map(quoteFilterValue).join(` ${operator} `)})`;
  return `${excluded ? '-' : ''}${field}:${grouped}`;
}

export function buildStructuredFilterQuery(params = {}) {
  const positive = [];
  const negative = [];

  for (const [paramName, fieldName] of STRUCTURED_FILTERS) {
    const values = normalizeFilterValues(params[paramName]);
    const operator = normalizeFilterOperator(params[`${paramName}Operator`]);
    const expression = buildFieldExpression(fieldName, values, operator);
    if (expression) positive.push(expression);

    const excludedValues = normalizeFilterValues(params[`exclude${paramName[0].toUpperCase()}${paramName.slice(1)}`]);
    const excludedExpression = buildFieldExpression(fieldName, excludedValues, operator, true);
    if (excludedExpression) negative.push(excludedExpression);
  }

  const parts = [...positive];
  if (negative.length) parts.push('all:all', ...negative);
  return parts.join(' AND ');
}

export function applyOpenDataFilter(query = '', isOpenData = '') {
  const normalizedQuery = normalizeQueryParam(query);

  if (isOpenDataMode(isOpenData)) {
    return combineSearchQueries(normalizedQuery, OPEN_DATA_LICENSE_QUERY);
  }

  if (isNonOpenDataMode(isOpenData)) {
    return combineSearchQueries(normalizedQuery, NON_OPEN_DATA_LICENSE_QUERY);
  }

  return normalizedQuery;
}

export function normalizeQueryParam(query = '') {
  const value = Array.isArray(query) ? query[0] : query;
  const normalized = String(value || '');
  if (normalized.startsWith('&q=')) {
    return normalized.slice(3);
  }
  return normalized;
}

export function isCitySearchQuery(qParamRaw = '') {
  const q = String(qParamRaw).toLowerCase();
  return (
    q.includes('facet:city') ||
    q.includes('city:') ||
    q.includes('cities:') ||
    q.includes('typ:stadt') ||
    q.includes('type:city')
  );
}

export function isCitiesRequest({ scope, type, qParam, forceCities }) {
  if (forceCities) return true;

  const scopeIsCities = String(scope || '').toLowerCase().trim() === 'cities';
  const typeIsCities = BIG_LIMIT_TYPES.has(String(type || '').toLowerCase().trim());
  const heuristics = isCitySearchQuery(qParam);

  return scopeIsCities || typeIsCities || heuristics;
}

export function computeFinalLimit({ requestedLimit, isCities }) {
  const want = Number.parseInt(requestedLimit, 10);
  const max = isCities ? MAX_LIMIT_CITIES : MAX_LIMIT_OTHERS;

  if (Number.isFinite(want)) {
    return Math.max(1, Math.min(want, max));
  }

  return max;
}

export function normalizeOffsetParam(offset = 0) {
  const value = Array.isArray(offset) ? offset[0] : offset;
  const normalized = Number.parseInt(value, 10);
  return Number.isFinite(normalized) && normalized > 0 ? normalized : 0;
}

export class MetaResponseError extends Error {
  constructor(status, message = '') {
    super(message || `META returned status ${status || 'UNKNOWN'}`);
    this.name = 'MetaResponseError';
    this.metaStatus = String(status || 'UNKNOWN');
  }
}

export function assertMetaResponseOk(payload) {
  const status = String(payload?.status || payload?.Status || '').trim().toUpperCase();
  if (status && status !== 'OK') {
    throw new MetaResponseError(status, String(payload?.message || payload?.Message || '').trim());
  }
  return payload;
}

export function parseMetaResponseText(text) {
  let payload;
  try {
    payload = JSON.parse(String(text || '').trim());
  } catch {
    throw new MetaResponseError('INVALID_JSON', 'META returned invalid JSON');
  }
  return assertMetaResponseOk(payload);
}

export function buildSearchUrl({ baseUrl, experience, template, type, qParam, limit, offset = 0, apiKey }) {
  const url = new URL(baseUrl);
  url.searchParams.set('experience', experience);
  if (apiKey) url.searchParams.set('licensekey', apiKey);
  url.searchParams.set('type', normalizeMetaSearchType(type) || String(type || '').trim() || 'All');
  const normalizedQuery = normalizeQueryParam(qParam).trim();
  if (normalizedQuery) url.searchParams.set('q', normalizedQuery);
  url.searchParams.set('limit', String(limit));
  const normalizedOffset = normalizeOffsetParam(offset);
  if (normalizedOffset > 0) url.searchParams.set('offset', String(normalizedOffset));
  url.searchParams.set('template', template);
  return url.toString();
}

export function autocompleteUrlFromSearchUrl(baseUrl) {
  const url = new URL(baseUrl);
  url.pathname = url.pathname.replace(/\/search\/?$/i, '/autocomplete/');
  if (!/\/autocomplete\/?$/i.test(url.pathname)) {
    url.pathname = '/rest.ashx/autocomplete/';
  }
  return url.toString();
}

export function buildAutocompleteUrl({ baseUrl, experience, type, term, limit, apiKey, mode = 'jquery', market = 'de' }) {
  const url = new URL(autocompleteUrlFromSearchUrl(baseUrl));
  url.searchParams.set('experience', experience);
  url.searchParams.set('licensekey', apiKey);
  if (type) url.searchParams.set('type', type);
  url.searchParams.set('term', term);
  url.searchParams.set('limit', String(limit));
  if (mode) url.searchParams.set('mode', mode);
  if (market) url.searchParams.set('mkt', market);
  return url.toString();
}
