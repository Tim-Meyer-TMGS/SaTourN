import fetch from 'node-fetch';

import {
  API_KEY,
  BASE_URL,
  EXPERIENCE,
  REQUEST_TIMEOUT_MS,
  TEMPLATE
} from '../lib/config.js';
import { extractId, extractItems, extractTotal } from '../lib/browser/et4.js';
import {
  buildSearchUrl,
  computeFinalLimit,
  isCitiesRequest,
  normalizeOffsetParam,
  normalizeQueryParam
} from '../lib/search-utils.js';
import {
  normalizeQualityContext,
  qualityCountKey,
  qualityListKey,
  qualitySnapshotKey
} from '../lib/quality-cache.js';
import {
  evaluateQualityForItem,
  getAreaValues,
  getAttributeValue,
  getCategoryValues,
  getCriteriaForType,
  getMediaObjects,
  getQualityScanConfig,
  isCheckableMediaObject,
  qualityCriteria
} from '../Statistik/quality.js';

const DEFAULT_RESULT_LIMIT = 50;
const MAX_RESULT_LIMIT = 200;
const DEFAULT_SCAN_PAGE_SIZE = 100;
const MAX_SCAN_PAGE_SIZE = 200;
const DEFAULT_MAX_PAGES = 5;
const MAX_SCAN_PAGES = 20;
const DEFAULT_SCAN_TIMEOUT_MS = 8000;
const ET4_PAGES_BASE_URL = 'https://pages.et4.de/de/statistik_sachsen/wlan/detail';
const VERIFIED_ET4_PAGE_TYPES = new Set(['POI']);
const QUALITY_COUNT_CACHE_TTL_MS = Number(process.env.QUALITY_COUNT_CACHE_TTL_MS) || 5 * 60 * 1000;
const qualityCountCache = new Map();

function clampInteger(value, fallback, min, max) {
  const numberValue = Number.parseInt(Array.isArray(value) ? value[0] : value, 10);
  if (!Number.isFinite(numberValue)) return fallback;
  return Math.max(min, Math.min(max, numberValue));
}

function findCriterion(criterionId) {
  return qualityCriteria.find((criterion) => criterion.id === criterionId) || null;
}

function firstText(item, paths) {
  for (const path of paths) {
    const value = String(path).split('.').reduce((current, segment) => current?.[segment], item);
    if (value == null) continue;
    if (Array.isArray(value)) {
      const text = value.map((entry) => (
        entry && typeof entry === 'object'
          ? firstText(entry, ['title', 'name', 'value', 'text'])
          : String(entry ?? '').replace(/\s+/g, ' ').trim()
      )).find(Boolean);
      if (text) return text;
      continue;
    }
    if (typeof value === 'object') {
      const text = firstText(value, ['title', 'Title', 'name', 'Name', 'value', 'Value', 'text', 'Text']);
      if (text) return text;
      continue;
    }
    const text = String(value).replace(/\s+/g, ' ').trim();
    if (text) return text;
  }
  return null;
}

function normalizeItemForEvaluation(rawItem, type) {
  return {
    ...rawItem,
    type: firstText(rawItem, ['type', 'Type', 'objectType', '@type', 'touristType']) || type,
    raw: rawItem
  };
}

function firstListText(values) {
  return values.map((value) => firstText({ value }, ['value'])).find(Boolean) || null;
}

function countCheckableMedia(rawItem) {
  return getMediaObjects(rawItem).filter(isCheckableMediaObject).length;
}

function getGlobalId(rawItem) {
  return firstText(rawItem, ['global_id', 'globalId', 'globalID']);
}

function textList(value) {
  if (!Array.isArray(value)) return [];
  return value.map((entry) => firstText({ value: entry }, ['value'])).filter(Boolean);
}

function getKeywordValues(rawItem) {
  return [
    ...textList(rawItem?.keywords_old),
    ...textList(rawItem?.keywords)
  ];
}

function normalizeEt4PageType(type) {
  const normalized = String(type || '').trim().toLowerCase().replace(/[\s_-]+/g, '');
  if (normalized === 'poi' || normalized === 'pointofinterest') return 'POI';
  return String(type || '').trim();
}

function buildEt4PagesUrl(type, globalId) {
  const pageType = normalizeEt4PageType(type);
  if (!pageType || !globalId || !VERIFIED_ET4_PAGE_TYPES.has(pageType)) return null;
  return `${ET4_PAGES_BASE_URL}/${encodeURIComponent(pageType)}/${encodeURIComponent(globalId)}/x`;
}

function reduceItemForResponse(item, criterion) {
  const raw = item.raw || item;
  const category = firstListText(getCategoryValues(raw))
    || firstText(item, ['category', 'categories', 'Category', 'classification.category', 'raw.category', 'raw.categories']);
  const region = firstListText(getAreaValues(raw))
    || firstText(item, ['area', 'region', 'state', 'federalState', 'address.region', 'raw.area', 'raw.region', 'raw.areas']);
  const license = getAttributeValue(raw, 'license')
    || firstText(item, ['license', 'attribute_license', 'raw.license', 'raw.attribute_license']);
  const mediaCount = countCheckableMedia(raw);
  const type = item.type || null;
  const globalId = getGlobalId(raw);

  return {
    id: extractId(raw) || item.id || null,
    globalId,
    title: firstText(item, ['title', 'Title', 'name', 'Name', 'headline', 'presentation.title', 'raw.title', 'raw.name', 'raw.presentation.title']) || 'Ohne Titel',
    type,
    category,
    region,
    city: firstText(item, ['city', 'place', 'town', 'municipality', 'address.city', 'raw.city', 'raw.place']),
    license,
    imageCount: mediaCount || null,
    qualityScore: item.qualityScore,
    qualityStatus: item.qualityStatus,
    missingCriteria: item.missingCriteria || [],
    recommendations: item.recommendations || [],
    keywords_old: getKeywordValues(raw),
    activeCriterion: criterion ? {
      id: criterion.id,
      label: criterion.label,
      priority: criterion.priority,
      recommendation: criterion.recommendation
    } : null,
    pageUrl: buildEt4PagesUrl(type, globalId),
    sourceUrl: firstText(item, ['sourceUrl', 'url', 'link', 'website', 'homepage', 'presentation.url', 'raw.url', 'raw.link', 'raw.presentation.url'])
  };
}

function reduceCriterionForResponse(criterion, type = null) {
  const scanConfig = type ? getQualityScanConfig(criterion, type) : null;

  return {
    id: criterion.id,
    label: criterion.label,
    priority: criterion.priority,
    autoCheck: criterion.autoCheck,
    recommendation: criterion.recommendation,
    method: scanConfig?.method || criterion.method || 'server_scan',
    verified: scanConfig?.verified ?? false,
    missingQuery: scanConfig?.missingQuery || null,
    positiveQuery: scanConfig?.positiveQuery || null,
    api: criterion.api || null,
    apiByType: criterion.apiByType || null,
    unsupportedQueries: criterion.unsupportedQueries || []
  };
}

function combineQueries(baseQuery, criterionQuery) {
  const base = normalizeQueryParam(baseQuery);
  const criterion = normalizeQueryParam(criterionQuery);

  if (!base) return criterion;
  if (!criterion) return base;
  return `(${base}) AND (${criterion})`;
}

async function fetchJsonPage(url, signal) {
  const response = await fetch(url, {
    signal,
    headers: { Accept: 'application/json,*/*;q=0.8' }
  });
  const text = await response.text();

  if (!response.ok) {
    throw new Error(`Destination.One HTTP ${response.status}: ${text.slice(0, 300)}`);
  }

  try {
    return JSON.parse(text.trim());
  } catch {
    throw new Error(`Destination.One returned non-JSON: ${text.slice(0, 300)}`);
  }
}

function isCriterionRelevantForType(criterion, type) {
  return getCriteriaForType(type).some((item) => item.id === criterion.id);
}

function filterSnapshotByType(snapshot, type) {
  const normalizedType = String(type || '').trim();
  if (!snapshot || !normalizedType) return snapshot;

  const rows = (snapshot.rows || []).filter((row) => row.type === normalizedType);
  const typeSummary = (snapshot.aggregations?.typeSummary || []).filter((row) => row.type === normalizedType);
  const selectedTypeSummary = typeSummary[0] || null;
  const issueSummary = (snapshot.aggregations?.issueSummary || [])
    .map((issue) => {
      const count = Number(issue.typeCounts?.[normalizedType] || 0);
      return {
        ...issue,
        affectedCount: count,
        affectedTypes: count > 0 ? [normalizedType] : [],
        typeCounts: count > 0 ? { [normalizedType]: count } : {}
      };
    })
    .filter((issue) => issue.affectedCount > 0);

  return {
    ...snapshot,
    rows,
    aggregations: {
      ...snapshot.aggregations,
      averageQualityScore: selectedTypeSummary?.averageQualityScore ?? null,
      qualityStatusCounts: selectedTypeSummary?.qualityStatusCounts || {},
      issueSummary,
      typeSummary
    },
    qualityDataMeta: {
      ...snapshot.qualityDataMeta,
      filteredType: normalizedType
    }
  };
}

async function readJsonCache(store, key) {
  if (!store) return null;
  try {
    return await store.getJson(key);
  } catch (error) {
    console.warn('Quality cache read failed.', error.message || error);
    return null;
  }
}

async function writeJsonCache(store, key, value, options = {}) {
  if (!store) return false;
  try {
    await store.setJson(key, value, options);
    return true;
  } catch (error) {
    console.warn('Quality cache write failed.', error.message || error);
    return false;
  }
}

export function registerQualityRoute(app, { keyValueStore = null } = {}) {
  app.get('/api/quality/snapshot', async (req, res) => {
    const context = normalizeQualityContext({
      query: req.query.query || '',
      type: req.query.type || ''
    });
    const exactKey = qualitySnapshotKey(context);
    let snapshot = await readJsonCache(keyValueStore, exactKey);

    if (!snapshot && context.type) {
      const fallbackContext = normalizeQualityContext({ query: context.query, type: '' });
      const fallback = await readJsonCache(keyValueStore, qualitySnapshotKey(fallbackContext));
      snapshot = filterSnapshotByType(fallback, context.type);
    }

    if (!snapshot) {
      return res.status(404).json({
        error: 'Quality snapshot not found',
        cache: {
          mode: keyValueStore?.mode || 'none',
          key: exactKey
        }
      });
    }

    return res.json({
      ...snapshot,
      cached: true,
      cache: {
        mode: keyValueStore?.mode || 'none',
        key: exactKey
      }
    });
  });

  app.get('/api/quality/list', async (req, res) => {
    const criterion = findCriterion(String(req.query.criterionId || '').trim());
    const type = String(req.query.type || '').trim();

    if (!criterion) {
      return res.status(400).json({ error: 'Unknown or missing criterionId' });
    }
    if (!type) {
      return res.status(400).json({ error: 'Missing required type' });
    }

    const key = qualityListKey({
      criterionId: criterion.id,
      type,
      query: req.query.query || ''
    });
    const payload = await readJsonCache(keyValueStore, key);
    if (!payload) {
      return res.status(404).json({
        error: 'Quality list cache not found',
        cache: {
          mode: keyValueStore?.mode || 'none',
          key
        }
      });
    }

    return res.json({
      ...payload,
      cached: true,
      cache: {
        mode: keyValueStore?.mode || 'none',
        key
      }
    });
  });

  app.get('/api/quality/count', async (req, res) => {
    const {
      criterionId,
      type,
      query = '',
      timeoutMs
    } = req.query;

    if (!API_KEY) {
      return res.status(500).json({ error: 'Server configuration missing: LICENSEKEY' });
    }

    const criterion = findCriterion(String(criterionId || '').trim());
    if (!criterion) {
      return res.status(400).json({ error: 'Unknown or missing criterionId' });
    }

    const normalizedType = String(type || '').trim();
    if (!normalizedType) {
      return res.status(400).json({ error: 'Missing required type. Count one Destination.One type per request.' });
    }

    if (!isCriterionRelevantForType(criterion, normalizedType)) {
      return res.json({
        count: 0,
        criterion: reduceCriterionForResponse(criterion, normalizedType),
        diagnostic: {
          method: 'unsupported',
          sourceQuery: normalizeQueryParam(query),
          criterionQuery: null,
          verified: false,
          reason: 'criterion_not_relevant_for_type'
        }
      });
    }

    if (criterion.autoCheck === false) {
      return res.status(400).json({ error: 'Criterion is not automatically checkable' });
    }

    const qParam = normalizeQueryParam(query);
    const scanConfig = getQualityScanConfig(criterion, normalizedType);
    if (scanConfig.method !== 'api_pushdown' || !scanConfig.verified || !scanConfig.missingQuery) {
      return res.status(400).json({
        error: 'Criterion/type is not verified for API pushdown counts',
        criterion: reduceCriterionForResponse(criterion, normalizedType),
        diagnostic: {
          method: scanConfig.method,
          sourceQuery: qParam,
          criterionQuery: scanConfig.missingQuery,
          positiveQuery: scanConfig.positiveQuery,
          verified: scanConfig.verified,
          verifiedForType: scanConfig.verifiedForType,
          warnings: scanConfig.warnings,
          unsupportedQueries: scanConfig.unsupportedQueries
        }
      });
    }

    const effectiveQuery = combineQueries(qParam, scanConfig.missingQuery);
    const cacheKey = JSON.stringify({ criterionId: criterion.id, type: normalizedType, query: effectiveQuery });
    const kvCacheKey = qualityCountKey({ criterionId: criterion.id, type: normalizedType, query: effectiveQuery });
    const kvCached = await readJsonCache(keyValueStore, kvCacheKey);
    if (kvCached) {
      return res.json({
        ...kvCached,
        cached: true,
        cache: {
          mode: keyValueStore?.mode || 'none',
          key: kvCacheKey
        }
      });
    }
    const cached = qualityCountCache.get(cacheKey);
    if (cached && Date.now() - cached.createdAt < QUALITY_COUNT_CACHE_TTL_MS) {
      return res.json({ ...cached.payload, cached: true });
    }

    const controller = new AbortController();
    const countTimeoutMs = clampInteger(timeoutMs, DEFAULT_SCAN_TIMEOUT_MS, 1000, REQUEST_TIMEOUT_MS);
    const timeout = setTimeout(() => controller.abort(), countTimeoutMs);

    try {
      const targetUrl = buildSearchUrl({
        baseUrl: BASE_URL,
        experience: EXPERIENCE,
        template: TEMPLATE,
        type: normalizedType,
        qParam: effectiveQuery,
        limit: 1,
        offset: 0,
        apiKey: API_KEY
      });
      const payload = await fetchJsonPage(targetUrl, controller.signal);
      const count = extractTotal(payload);
      const responsePayload = {
        count: Number.isFinite(count) ? count : 0,
        criterion: reduceCriterionForResponse(criterion, normalizedType),
        diagnostic: {
          method: scanConfig.method,
          query: effectiveQuery,
          sourceQuery: qParam,
          criterionQuery: scanConfig.missingQuery,
          positiveQuery: scanConfig.positiveQuery,
          verified: scanConfig.verified,
          verifiedForType: scanConfig.verifiedForType,
          warnings: scanConfig.warnings,
          unsupportedQueries: scanConfig.unsupportedQueries
        },
        cached: false
      };
      qualityCountCache.set(cacheKey, { createdAt: Date.now(), payload: responsePayload });
      await writeJsonCache(keyValueStore, kvCacheKey, responsePayload, { ttlMs: QUALITY_COUNT_CACHE_TTL_MS });
      return res.json(responsePayload);
    } catch (error) {
      const isAbort = error && (error.name === 'AbortError' || /aborted|timeout/i.test(String(error)));
      return res.status(isAbort ? 504 : 500).json({
        error: isAbort ? 'Quality count timeout' : 'Quality count failed',
        details: isAbort ? undefined : String(error.message || error).slice(0, 300),
        diagnostic: {
          method: scanConfig.method,
          query: effectiveQuery,
          sourceQuery: qParam,
          criterionQuery: scanConfig.missingQuery,
          positiveQuery: scanConfig.positiveQuery,
          verified: scanConfig.verified,
          verifiedForType: scanConfig.verifiedForType,
          warnings: scanConfig.warnings,
          unsupportedQueries: scanConfig.unsupportedQueries
        }
      });
    } finally {
      clearTimeout(timeout);
    }
  });

  app.get('/api/quality/scan', async (req, res) => {
    const {
      criterionId,
      type,
      query = '',
      cursor,
      offset,
      limit,
      scanPageSize,
      maxPages,
      timeoutMs
    } = req.query;

    if (!API_KEY) {
      return res.status(500).json({ error: 'Server configuration missing: LICENSEKEY' });
    }

    const criterion = findCriterion(String(criterionId || '').trim());
    if (!criterion) {
      return res.status(400).json({ error: 'Unknown or missing criterionId' });
    }

    const normalizedType = String(type || '').trim();
    if (!normalizedType) {
      return res.status(400).json({ error: 'Missing required type. Scan one Destination.One type per request.' });
    }

    if (!isCriterionRelevantForType(criterion, normalizedType)) {
      return res.json({
        items: [],
        criterion: reduceCriterionForResponse(criterion, normalizedType),
        page: {
          cursor: normalizeOffsetParam(cursor ?? offset),
          nextCursor: null,
          complete: true,
          reason: 'criterion_not_relevant_for_type'
        },
        stats: {
          scannedItems: 0,
          scannedPages: 0,
          matchedItems: 0,
          totalSourceItems: 0,
          budgetExhausted: false,
          paginationRepeated: false
        }
      });
    }

    if (criterion.autoCheck === false) {
      return res.status(400).json({ error: 'Criterion is not automatically checkable' });
    }

    const qParam = normalizeQueryParam(query);
    const scanConfig = getQualityScanConfig(criterion, normalizedType);
    const effectiveQuery = scanConfig.method === 'api_pushdown'
      ? combineQueries(qParam, scanConfig.missingQuery)
      : qParam;
    const resultLimit = clampInteger(limit, DEFAULT_RESULT_LIMIT, 1, MAX_RESULT_LIMIT);
    const pageSize = clampInteger(scanPageSize, DEFAULT_SCAN_PAGE_SIZE, 1, MAX_SCAN_PAGE_SIZE);
    const pageBudget = clampInteger(maxPages, DEFAULT_MAX_PAGES, 1, MAX_SCAN_PAGES);
    const scanTimeoutMs = clampInteger(timeoutMs, DEFAULT_SCAN_TIMEOUT_MS, 1000, REQUEST_TIMEOUT_MS);
    const startOffset = normalizeOffsetParam(cursor ?? offset);
    const cities = isCitiesRequest({ type: normalizedType, qParam: effectiveQuery, scope: null, forceCities: false });
    const finalPageSize = computeFinalLimit({ requestedLimit: pageSize, isCities: cities });

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), scanTimeoutMs);
    const items = [];
    const seenIds = new Set();
    const seenPageKeys = new Set();
    let currentOffset = startOffset;
    let totalSourceItems = null;
    let scannedItems = 0;
    let scannedPages = 0;
    let complete = false;
    let budgetExhausted = false;
    let paginationRepeated = false;
    let reason = null;

    try {
      while (items.length < resultLimit && scannedPages < pageBudget) {
        const targetUrl = buildSearchUrl({
          baseUrl: BASE_URL,
          experience: EXPERIENCE,
          template: TEMPLATE,
          type: normalizedType,
          qParam: effectiveQuery,
          limit: finalPageSize,
          offset: currentOffset,
          apiKey: API_KEY
        });

        const payload = await fetchJsonPage(targetUrl, controller.signal);
        const pageItems = extractItems(payload);
        const pageTotal = extractTotal(payload);
        if (Number.isFinite(pageTotal)) totalSourceItems = pageTotal;

        scannedPages += 1;
        scannedItems += pageItems.length;

        const pageKey = pageItems.map((item) => extractId(item)).filter(Boolean).slice(0, 5).join('|');
        if (pageKey && seenPageKeys.has(pageKey)) {
          paginationRepeated = true;
          reason = 'pagination_repeated';
          break;
        }
        if (pageKey) seenPageKeys.add(pageKey);

        let processedInPage = 0;
        for (const rawItem of pageItems) {
          processedInPage += 1;
          const itemId = extractId(rawItem);
          if (itemId && seenIds.has(itemId)) continue;
          if (itemId) seenIds.add(itemId);

          const evaluated = evaluateQualityForItem(normalizeItemForEvaluation(rawItem, normalizedType));
          if (evaluated.missingCriteria?.includes(criterion.id)) {
            items.push(reduceItemForResponse(evaluated, criterion));
            if (items.length >= resultLimit) break;
          }
        }

        currentOffset += processedInPage;

        if (processedInPage < pageItems.length) {
          reason = 'result_limit_reached';
          break;
        }

        if (!pageItems.length || pageItems.length < finalPageSize) {
          complete = true;
          reason = 'source_exhausted';
          break;
        }

        if (Number.isFinite(totalSourceItems) && currentOffset >= totalSourceItems) {
          complete = true;
          reason = 'source_exhausted';
          break;
        }
      }

      if (!complete && !reason) {
        if (items.length >= resultLimit) {
          reason = 'result_limit_reached';
        } else {
          budgetExhausted = scannedPages >= pageBudget;
          reason = budgetExhausted ? 'scan_budget_exhausted' : 'source_exhausted';
        }
      }

      res.json({
        items,
        criterion: reduceCriterionForResponse(criterion, normalizedType),
        diagnostic: {
          method: scanConfig.method,
          query: effectiveQuery,
          sourceQuery: qParam,
          criterionQuery: scanConfig.missingQuery,
          positiveQuery: scanConfig.positiveQuery,
          verified: scanConfig.verified,
          verifiedForType: scanConfig.verifiedForType,
          warnings: scanConfig.warnings,
          unsupportedQueries: scanConfig.unsupportedQueries
        },
        page: {
          cursor: startOffset,
          nextCursor: complete || paginationRepeated ? null : currentOffset,
          complete,
          reason
        },
        stats: {
          scannedItems,
          scannedPages,
          matchedItems: items.length,
          totalSourceItems,
          overallcount: totalSourceItems,
          budgetExhausted,
          paginationRepeated
        }
      });
    } catch (error) {
      const isAbort = error && (error.name === 'AbortError' || /aborted|timeout/i.test(String(error)));
      res.status(isAbort ? 504 : 500).json({
        error: isAbort ? 'Quality scan timeout' : 'Quality scan failed',
        details: isAbort ? undefined : String(error.message || error).slice(0, 300),
        diagnostic: {
          method: scanConfig?.method || 'unknown',
          query: effectiveQuery,
          sourceQuery: qParam,
          criterionQuery: scanConfig?.missingQuery || null,
          positiveQuery: scanConfig?.positiveQuery || null,
          verified: Boolean(scanConfig?.verified),
          verifiedForType: Boolean(scanConfig?.verifiedForType),
          warnings: scanConfig?.warnings || [],
          unsupportedQueries: scanConfig?.unsupportedQueries || []
        },
        page: {
          cursor: startOffset,
          nextCursor: currentOffset > startOffset ? currentOffset : startOffset,
          complete: false,
          reason: isAbort ? 'timeout' : 'error'
        },
        stats: {
          scannedItems,
          scannedPages,
          matchedItems: items.length,
          totalSourceItems,
          overallcount: totalSourceItems,
          budgetExhausted,
          paginationRepeated
        }
      });
    } finally {
      clearTimeout(timeout);
    }
  });
}
