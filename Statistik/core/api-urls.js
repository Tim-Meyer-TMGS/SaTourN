export function buildSearchApiUrl(apiBase, type, query, options = {}) {
  const params = new URLSearchParams();
  params.set('type', type);
  params.set('limit', String(options.limit ?? 1));
  if (query) params.set('query', query);
  if (options.isOpenData) params.set('isOpenData', 'true');
  if (Number.isFinite(options.offset) && options.offset > 0) params.set('offset', String(options.offset));
  return `${apiBase}?${params.toString()}`;
}

export function buildQualitySnapshotApiUrl(apiBase, { query = '', type = '' } = {}) {
  const params = new URLSearchParams();
  if (query) params.set('query', query);
  if (type) params.set('type', type);
  return `${apiBase}?${params.toString()}`;
}

export function buildQualityCountApiUrl(apiBase, criterionId, type, query = '') {
  const params = new URLSearchParams();
  params.set('criterionId', criterionId);
  params.set('type', type);
  if (query) params.set('query', query);
  return `${apiBase}?${params.toString()}`;
}

export function buildQualityListApiUrl(apiBase, { criterionId, type, query = '' }) {
  const params = new URLSearchParams();
  params.set('criterionId', criterionId);
  params.set('type', type);
  if (query) params.set('query', query);
  return `${apiBase}?${params.toString()}`;
}

export function buildQualityScanApiUrl(apiBase, { criterionId, type, query = '', limit = 200, scanPageSize = 200, maxPages = 20 }) {
  const params = new URLSearchParams();
  params.set('criterionId', criterionId);
  params.set('type', type);
  params.set('limit', String(limit));
  params.set('scanPageSize', String(scanPageSize));
  params.set('maxPages', String(maxPages));
  if (query) params.set('query', query);
  return `${apiBase}?${params.toString()}`;
}
