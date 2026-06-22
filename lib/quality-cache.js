import { stableHash } from './kv-store.js';
import { normalizeQueryParam } from './search-utils.js';

const QUALITY_CACHE_VERSION = 'v1';
const QUALITY_CACHE_PREFIX = `dq:${QUALITY_CACHE_VERSION}`;

function normalizeType(type = '') {
  return String(type || '').trim();
}

function normalizeCriterionId(criterionId = '') {
  return String(criterionId || '').trim();
}

export function normalizeQualityContext({ query = '', type = '' } = {}) {
  return {
    query: normalizeQueryParam(query).trim(),
    type: normalizeType(type)
  };
}

export function qualitySnapshotKey(context = {}) {
  return `${QUALITY_CACHE_PREFIX}:snapshot:${stableHash(normalizeQualityContext(context))}`;
}

export function qualityListKey({ criterionId = '', type = '', query = '' } = {}) {
  return `${QUALITY_CACHE_PREFIX}:list:${stableHash({
    criterionId: normalizeCriterionId(criterionId),
    ...normalizeQualityContext({ query, type })
  })}`;
}

export function qualityCountKey({ criterionId = '', type = '', query = '' } = {}) {
  return `${QUALITY_CACHE_PREFIX}:count:${stableHash({
    criterionId: normalizeCriterionId(criterionId),
    ...normalizeQualityContext({ query, type })
  })}`;
}

export function latestSnapshotIndexKey() {
  return `${QUALITY_CACHE_PREFIX}:snapshot:index`;
}

