const IMPORT_TYPES = new Set(['All', 'Hotel', 'Event', 'Gastro', 'Tour', 'POI', 'City', 'Area', 'Package', 'Article']);

export class DestinationOneResponseError extends Error {
  constructor(status, message = '') {
    super(message || `destination.one returned status ${status || 'UNKNOWN'}`);
    this.name = 'DestinationOneResponseError';
    this.upstreamStatus = String(status || 'UNKNOWN');
  }
}

export function parseDestinationOneResponse(text) {
  let payload;
  try {
    payload = JSON.parse(String(text || '').trim());
  } catch {
    throw new DestinationOneResponseError('INVALID_JSON', 'destination.one returned invalid JSON');
  }
  const status = String(payload?.status || payload?.Status || '').trim().toUpperCase();
  if (status && status !== 'OK') {
    throw new DestinationOneResponseError(status, String(payload?.message || payload?.Message || '').trim());
  }
  return payload;
}

export function buildDestinationOneImportUrl({ baseUrl, experience, template, type, query, limit, offset = 0, apiKey }) {
  const normalizedType = String(type || '').trim() || 'All';
  if (!IMPORT_TYPES.has(normalizedType)) throw new Error(`Unsupported destination.one import type: ${normalizedType}`);
  const url = new URL(baseUrl);
  url.searchParams.set('experience', experience);
  url.searchParams.set('licensekey', apiKey);
  url.searchParams.set('type', normalizedType);
  if (String(query || '').trim()) url.searchParams.set('q', String(query).trim());
  url.searchParams.set('limit', String(limit));
  if (Number(offset) > 0) url.searchParams.set('offset', String(Math.floor(Number(offset))));
  url.searchParams.set('template', template);
  return url.toString();
}
