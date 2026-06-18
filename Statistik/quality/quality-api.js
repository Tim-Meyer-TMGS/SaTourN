import {
  buildQualityCountApiUrl,
  buildQualityListApiUrl,
  buildQualityScanApiUrl,
  buildQualitySnapshotApiUrl
} from '../core/api-urls.js';
export function buildQualitySnapshotRequestUrl(apiBase, { query = '', type = '' } = {}) {
  return buildQualitySnapshotApiUrl(apiBase, { query, type });
}

export function buildQualityCountRequestUrl(apiBase, criterionId, type, query = '') {
  return buildQualityCountApiUrl(apiBase, criterionId, type, query);
}

export function buildQualityListRequestUrl(apiBase, { criterionId, type, query = '' }) {
  return buildQualityListApiUrl(apiBase, { criterionId, type, query });
}

export function buildQualityScanRequestUrl(apiBase, options) {
  return buildQualityScanApiUrl(apiBase, options);
}

export async function fetchCachedQualitySnapshot({
  apiBase,
  fetchJson,
  useQualityCache,
  query = '',
  type = ''
}) {
  if (!useQualityCache) return null;
  return fetchJson(buildQualitySnapshotRequestUrl(apiBase, { query, type }), { optional404: true });
}

export async function fetchCachedQualityList({
  apiBase,
  fetchJson,
  useQualityCache,
  criterionId,
  type,
  query = ''
}) {
  if (!useQualityCache) return null;
  return fetchJson(buildQualityListRequestUrl(apiBase, { criterionId, type, query }), { optional404: true });
}

export async function fetchQualityCount({
  apiBase,
  fetchJson,
  criterionId,
  type,
  query = ''
}) {
  return fetchJson(buildQualityCountRequestUrl(apiBase, criterionId, type, query));
}

export async function fetchQualityScan({
  apiBase,
  fetchJson,
  criterionId,
  type,
  query = '',
  limit = 200,
  scanPageSize = 200,
  maxPages = 20
}) {
  return fetchJson(buildQualityScanRequestUrl(apiBase, {
    criterionId,
    type,
    query,
    limit,
    scanPageSize,
    maxPages
  }));
}
