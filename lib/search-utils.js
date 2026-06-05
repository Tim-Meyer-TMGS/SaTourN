import { BIG_LIMIT_TYPES, MAX_LIMIT_CITIES, MAX_LIMIT_OTHERS } from './config.js';

export const OPEN_DATA_LICENSE_QUERY = '(attribute_license:CC0 OR attribute_license:CC-BY OR attribute_license:CC-BY-SA)';

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

export function buildSearchUrl({ baseUrl, experience, template, type, qParam, limit, offset = 0, apiKey }) {
  const url = new URL(baseUrl);
  url.searchParams.set('experience', experience);
  url.searchParams.set('licensekey', apiKey);
  url.searchParams.set('type', type || '');
  url.searchParams.set('q', qParam);
  url.searchParams.set('limit', String(limit));
  url.searchParams.set('offset', String(normalizeOffsetParam(offset)));
  url.searchParams.set('template', template);
  return url.toString();
}
