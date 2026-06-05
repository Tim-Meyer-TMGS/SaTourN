import fetch from 'node-fetch';

import {
  API_KEY,
  BASE_URL,
  EXPERIENCE,
  REQUEST_TIMEOUT_MS,
  TEMPLATE
} from '../lib/config.js';
import { extractId, extractItems, extractTotal } from '../lib/browser/et4.js';
import { createKeyValueStore } from '../lib/kv-store.js';
import {
  latestSnapshotIndexKey,
  normalizeQualityContext,
  qualityListKey,
  qualitySnapshotKey
} from '../lib/quality-cache.js';
import {
  buildSearchUrl,
  normalizeOffsetParam,
  normalizeQueryParam,
  OPEN_DATA_LICENSE_QUERY
} from '../lib/search-utils.js';
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

const TYPES = ['POI', 'Tour', 'Hotel', 'Event', 'Gastro', 'Package'];
const DEFAULT_CONTEXTS = [{ label: 'Sachsen', area: '', city: '', type: '', query: '' }];
const PAGE_SIZE = numberFromEnv('QUALITY_SNAPSHOT_PAGE_SIZE', 200);
const MAX_PAGES_PER_TYPE = numberFromEnv('QUALITY_SNAPSHOT_MAX_PAGES_PER_TYPE', 250);
const LIST_LIMIT_PER_BUCKET = numberFromEnv('QUALITY_SNAPSHOT_LIST_LIMIT', 2000);
const SNAPSHOT_TTL_MS = numberFromEnv('QUALITY_SNAPSHOT_TTL_HOURS', 48) * 60 * 60 * 1000;
const REQUEST_DELAY_MS = numberFromEnv('QUALITY_SNAPSHOT_REQUEST_DELAY_MS', 0);
const SNAPSHOT_VERSION = 1;

function numberFromEnv(name, fallback) {
  const value = Number(process.env[name]);
  return Number.isFinite(value) ? value : fallback;
}

function sleep(ms) {
  return ms > 0 ? new Promise((resolve) => setTimeout(resolve, ms)) : Promise.resolve();
}

function parseContexts() {
  const raw = process.env.QUALITY_SNAPSHOT_CONTEXTS;
  if (!raw || !raw.trim()) return DEFAULT_CONTEXTS;

  try {
    const parsed = JSON.parse(raw);
    const values = Array.isArray(parsed) ? parsed : [parsed];
    return values.map(normalizeContext).filter(Boolean);
  } catch {
    return raw
      .split(';')
      .map((entry) => normalizeContext({ label: entry.trim(), area: entry.trim() }))
      .filter(Boolean);
  }
}

function normalizeContext(context = {}) {
  const query = normalizeQueryParam(context.query || buildContextQuery(context));
  const type = TYPES.includes(context.type) ? context.type : '';
  return {
    label: context.label || [context.area, context.city, type].filter(Boolean).join(' - ') || 'Sachsen',
    area: context.area || '',
    city: context.city || '',
    type,
    query
  };
}

function cleanQueryValue(value) {
  return String(value || '').replaceAll('"', '').trim();
}

function buildContextQuery({ area = '', city = '' } = {}) {
  const parts = [];
  if (area) parts.push(`area:"${cleanQueryValue(area)}"`);
  if (city) parts.push(`city:"${cleanQueryValue(city)}"`);
  return parts.join(' AND ');
}

function combineQueries(baseQuery, criterionQuery) {
  const base = normalizeQueryParam(baseQuery);
  const criterion = normalizeQueryParam(criterionQuery);
  if (!base) return criterion;
  if (!criterion) return base;
  return `(${base}) AND (${criterion})`;
}

async function fetchJsonPage({ type, query, limit, offset }) {
  if (!API_KEY) throw new Error('Server configuration missing: LICENSEKEY');

  await sleep(REQUEST_DELAY_MS);
  const targetUrl = buildSearchUrl({
    baseUrl: BASE_URL,
    experience: EXPERIENCE,
    template: TEMPLATE,
    type,
    qParam: query,
    limit,
    offset,
    apiKey: API_KEY
  });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(targetUrl, {
      signal: controller.signal,
      headers: { Accept: 'application/json,*/*;q=0.8' }
    });
    const text = await response.text();
    if (!response.ok) {
      throw new Error(`Destination.One HTTP ${response.status}: ${text.slice(0, 300)}`);
    }
    return JSON.parse(text.trim());
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchCount(type, query) {
  const payload = await fetchJsonPage({ type, query, limit: 1, offset: 0 });
  return Number(extractTotal(payload) || 0);
}

function safeArray(value) {
  if (value == null) return [];
  return Array.isArray(value) ? value : [value];
}

function textValue(value) {
  if (value == null) return '';
  if (Array.isArray(value)) return value.map(textValue).find(Boolean) || '';
  if (typeof value === 'object') {
    for (const key of ['title', 'Title', 'name', 'Name', 'label', 'Label', 'value', 'Value', 'text', 'Text', 'id', 'ID']) {
      const nested = textValue(value[key]);
      if (nested) return nested;
    }
    return '';
  }
  return String(value).replace(/\s+/g, ' ').trim();
}

function firstText(item, paths) {
  for (const path of paths) {
    const value = String(path).split('.').reduce((current, segment) => current?.[segment], item);
    const text = textValue(value);
    if (text) return text;
  }
  return '';
}

function normalizeItemForEvaluation(rawItem, type) {
  return {
    ...rawItem,
    type: firstText(rawItem, ['type', 'Type', 'objectType', '@type', 'touristType']) || type,
    raw: rawItem
  };
}

function firstListText(values) {
  return values.map(textValue).find(Boolean) || '';
}

function countCheckableMedia(rawItem) {
  return getMediaObjects(rawItem).filter(isCheckableMediaObject).length;
}

function getGlobalId(rawItem) {
  return firstText(rawItem, ['global_id', 'globalId', 'globalID']);
}

function getKeywords(rawItem) {
  return [
    ...safeArray(rawItem?.keywords_old),
    ...safeArray(rawItem?.keywords)
  ].map(textValue).filter(Boolean);
}

function reduceItemForCache(item, criterion) {
  const raw = item.raw || item;
  const type = item.type || '';
  const globalId = getGlobalId(raw);
  return {
    id: firstText(raw, ['id', 'Id', 'ID', 'objectId']) || extractId(raw) || item.id || '',
    globalId,
    title: firstText(item, ['title', 'Title', 'name', 'Name', 'headline', 'presentation.title', 'raw.title', 'raw.name', 'raw.presentation.title']) || 'Ohne Titel',
    type,
    category: firstListText(getCategoryValues(raw)),
    region: firstListText(getAreaValues(raw)),
    city: firstText(item, ['city', 'place', 'town', 'municipality', 'address.city', 'raw.city', 'raw.place']),
    license: getAttributeValue(raw, 'license') || '',
    imageCount: countCheckableMedia(raw) || null,
    qualityScore: item.qualityScore,
    qualityStatus: item.qualityStatus,
    missingCriteria: item.missingCriteria || [],
    recommendations: item.recommendations || [],
    keywords_old: getKeywords(raw),
    activeCriterion: criterion ? {
      id: criterion.id,
      label: criterion.label,
      priority: criterion.priority,
      recommendation: criterion.recommendation
    } : null,
    sourceUrl: firstText(item, ['sourceUrl', 'url', 'link', 'website', 'homepage', 'presentation.url', 'raw.url', 'raw.link', 'raw.presentation.url'])
  };
}

function criterionForResponse(criterion, type) {
  const scanConfig = getQualityScanConfig(criterion, type);
  return {
    id: criterion.id,
    label: criterion.label,
    priority: criterion.priority,
    autoCheck: criterion.autoCheck,
    recommendation: criterion.recommendation,
    method: scanConfig.method,
    verified: scanConfig.verified,
    missingQuery: scanConfig.missingQuery || null,
    positiveQuery: scanConfig.positiveQuery || null,
    unsupportedQueries: criterion.unsupportedQueries || []
  };
}

function emptyStatusCounts() {
  return {
    gut: 0,
    pruefen: 0,
    kritisch: 0,
    nichtBerechenbar: 0
  };
}

function incrementStatus(counts, status) {
  if (status === 'gut') counts.gut += 1;
  else if (status === 'pruefen') counts.pruefen += 1;
  else if (status === 'kritisch') counts.kritisch += 1;
  else counts.nichtBerechenbar += 1;
}

function priorityValue(priority) {
  if (priority === 'hoch') return 3;
  if (priority === 'mittel') return 2;
  if (priority === 'niedrig') return 1;
  return 0;
}

function addIssue(issueMap, criterion, type) {
  if (!issueMap.has(criterion.id)) {
    issueMap.set(criterion.id, {
      criterionId: criterion.id,
      label: criterion.label,
      affectedCount: 0,
      affectedTypes: new Set(),
      typeCounts: {},
      priority: criterion.priority,
      autoCheck: criterion.autoCheck !== false,
      recommendation: criterion.recommendation,
      countMode: 'snapshot_scan'
    });
  }
  const issue = issueMap.get(criterion.id);
  issue.affectedCount += 1;
  issue.affectedTypes.add(type);
  issue.typeCounts[type] = (issue.typeCounts[type] || 0) + 1;
}

function addListItem(listBuckets, criterion, type, query, item) {
  const key = `${criterion.id}:${type}`;
  if (!listBuckets.has(key)) {
    listBuckets.set(key, {
      criterion,
      type,
      query,
      totalCount: 0,
      items: [],
      truncated: false
    });
  }
  const bucket = listBuckets.get(key);
  bucket.totalCount += 1;
  if (bucket.items.length < LIST_LIMIT_PER_BUCKET) {
    bucket.items.push(reduceItemForCache(item, criterion));
  } else {
    bucket.truncated = true;
  }
}

async function scanType({ type, query, rows, issueMap, listBuckets, overallStatusCounts }) {
  const openDataQuery = combineQueries(query, OPEN_DATA_LICENSE_QUERY);
  const [statistikCount, openDataCount] = await Promise.all([
    fetchCount(type, query),
    fetchCount(type, openDataQuery)
  ]);

  rows.push({ type, statistikCount, openDataCount });

  const typeStats = {
    type,
    totalCount: statistikCount,
    openDataCount,
    openDataRate: statistikCount ? Math.round((openDataCount / statistikCount) * 10000) / 100 : null,
    qualityStatusCounts: emptyStatusCounts(),
    scoreSum: 0,
    scoreCount: 0,
    scannedItems: 0,
    scannedPages: 0,
    complete: false,
    repeatedPage: false
  };

  const seenIds = new Set();
  const seenPageKeys = new Set();
  let offset = 0;

  while (typeStats.scannedPages < MAX_PAGES_PER_TYPE) {
    const payload = await fetchJsonPage({ type, query, limit: PAGE_SIZE, offset });
    const pageItems = extractItems(payload);
    typeStats.scannedPages += 1;

    const pageKey = pageItems.map((item) => extractId(item)).filter(Boolean).slice(0, 10).join('|');
    if (pageKey && seenPageKeys.has(pageKey)) {
      typeStats.repeatedPage = true;
      break;
    }
    if (pageKey) seenPageKeys.add(pageKey);

    for (const rawItem of pageItems) {
      const itemId = extractId(rawItem) || `${type}:${offset}:${typeStats.scannedItems}`;
      if (seenIds.has(itemId)) continue;
      seenIds.add(itemId);

      const evaluated = evaluateQualityForItem(normalizeItemForEvaluation(rawItem, type));
      typeStats.scannedItems += 1;
      incrementStatus(typeStats.qualityStatusCounts, evaluated.qualityStatus);
      incrementStatus(overallStatusCounts, evaluated.qualityStatus);
      if (Number.isFinite(evaluated.qualityScore)) {
        typeStats.scoreSum += evaluated.qualityScore;
        typeStats.scoreCount += 1;
      }

      safeArray(evaluated.missingCriteria).forEach((criterionId) => {
        const criterion = qualityCriteria.find((entry) => entry.id === criterionId);
        if (!criterion || !getCriteriaForType(type).some((entry) => entry.id === criterion.id)) return;
        addIssue(issueMap, criterion, type);
        addListItem(listBuckets, criterion, type, query, evaluated);
      });
    }

    offset = normalizeOffsetParam(offset + pageItems.length);
    if (!pageItems.length || pageItems.length < PAGE_SIZE || offset >= statistikCount) {
      typeStats.complete = true;
      break;
    }
  }

  typeStats.averageQualityScore = typeStats.scoreCount
    ? Math.round(typeStats.scoreSum / typeStats.scoreCount)
    : null;
  typeStats.goodCount = typeStats.qualityStatusCounts.gut;
  typeStats.checkCount = typeStats.qualityStatusCounts.pruefen;
  typeStats.criticalCount = typeStats.qualityStatusCounts.kritisch;
  typeStats.truncated = !typeStats.complete;
  return typeStats;
}

function buildIssueSummary(issueMap) {
  return Array.from(issueMap.values())
    .map((issue) => ({
      ...issue,
      affectedTypes: Array.from(issue.affectedTypes).sort((a, b) => a.localeCompare(b, 'de'))
    }))
    .sort((a, b) => (
      b.affectedCount - a.affectedCount ||
      priorityValue(b.priority) - priorityValue(a.priority) ||
      a.label.localeCompare(b.label, 'de')
    ));
}

async function storeLists(store, context, listBuckets, typeStatsByType) {
  const written = [];
  for (const bucket of listBuckets.values()) {
    const key = qualityListKey({
      criterionId: bucket.criterion.id,
      type: bucket.type,
      query: context.query
    });
    const typeStats = typeStatsByType.get(bucket.type);
    const payload = {
      generatedAt: new Date().toISOString(),
      items: bucket.items,
      criterion: criterionForResponse(bucket.criterion, bucket.type),
      diagnostic: {
        method: 'snapshot_scan',
        query: context.query,
        verified: Boolean(typeStats?.complete),
        warnings: bucket.truncated ? ['list_cache_truncated'] : []
      },
      page: {
        cursor: 0,
        nextCursor: null,
        complete: !bucket.truncated && Boolean(typeStats?.complete),
        reason: bucket.truncated ? 'list_cache_limit_reached' : 'snapshot_scan'
      },
      stats: {
        matchedItems: bucket.items.length,
        totalMatchedItems: bucket.totalCount,
        scannedItems: typeStats?.scannedItems || 0,
        scannedPages: typeStats?.scannedPages || 0,
        totalSourceItems: typeStats?.totalCount || 0,
        overallcount: bucket.totalCount,
        budgetExhausted: bucket.truncated || !typeStats?.complete,
        paginationRepeated: Boolean(typeStats?.repeatedPage)
      }
    };
    await store.setJson(key, payload, { ttlMs: SNAPSHOT_TTL_MS });
    written.push({
      key,
      criterionId: bucket.criterion.id,
      type: bucket.type,
      count: bucket.totalCount,
      cachedItems: bucket.items.length,
      truncated: bucket.truncated
    });
  }
  return written;
}

async function buildSnapshotForContext(store, context) {
  const startedAt = new Date();
  const targetTypes = context.type ? [context.type] : TYPES;
  const rows = [];
  const issueMap = new Map();
  const listBuckets = new Map();
  const typeStats = [];
  const typeStatsByType = new Map();
  const overallStatusCounts = emptyStatusCounts();
  let scoreSum = 0;
  let scoreCount = 0;

  for (const type of targetTypes) {
    console.log(`Scanning ${context.label} / ${type} ...`);
    const stats = await scanType({
      type,
      query: context.query,
      rows,
      issueMap,
      listBuckets,
      overallStatusCounts
    });
    typeStats.push(stats);
    typeStatsByType.set(type, stats);
    if (Number.isFinite(stats.averageQualityScore) && stats.scoreCount > 0) {
      scoreSum += stats.scoreSum;
      scoreCount += stats.scoreCount;
    }
  }

  const listCache = await storeLists(store, context, listBuckets, typeStatsByType);
  const finishedAt = new Date();
  const complete = typeStats.every((entry) => entry.complete);
  const issueSummary = buildIssueSummary(issueMap);
  const totalRecords = rows.reduce((sum, row) => sum + row.statistikCount, 0);
  const openDataRecords = rows.reduce((sum, row) => sum + row.openDataCount, 0);

  const snapshot = {
    version: SNAPSHOT_VERSION,
    context: normalizeQualityContext(context),
    label: context.label,
    generatedAt: finishedAt.toISOString(),
    startedAt: startedAt.toISOString(),
    durationMs: finishedAt.getTime() - startedAt.getTime(),
    complete,
    rows,
    aggregations: {
      averageQualityScore: scoreCount ? Math.round(scoreSum / scoreCount) : null,
      qualityStatusCounts: overallStatusCounts,
      openDataCapableCount: openDataRecords,
      issueSummary,
      typeSummary: typeStats.map((entry) => ({
        type: entry.type,
        totalCount: entry.totalCount,
        openDataCount: entry.openDataCount,
        openDataRate: entry.openDataRate,
        averageQualityScore: entry.averageQualityScore,
        qualityStatusCounts: entry.qualityStatusCounts,
        goodCount: entry.goodCount,
        checkCount: entry.checkCount,
        criticalCount: entry.criticalCount,
        scannedItems: entry.scannedItems,
        scannedPages: entry.scannedPages,
        complete: entry.complete,
        truncated: entry.truncated
      }))
    },
    qualityDataMeta: {
      mode: 'snapshot',
      source: 'render_key_value',
      collectedItems: typeStats.reduce((sum, entry) => sum + entry.scannedItems, 0),
      estimatedTotalItems: totalRecords,
      truncated: !complete,
      failedCounts: 0,
      unsupportedCriteria: [],
      listLimit: LIST_LIMIT_PER_BUCKET,
      listCache
    }
  };

  const snapshotKey = qualitySnapshotKey(context);
  await store.setJson(snapshotKey, snapshot, { ttlMs: SNAPSHOT_TTL_MS });
  return {
    key: snapshotKey,
    context: snapshot.context,
    label: context.label,
    generatedAt: snapshot.generatedAt,
    complete,
    totalRecords,
    openDataRecords,
    scannedItems: snapshot.qualityDataMeta.collectedItems,
    listCaches: listCache.length
  };
}

async function main() {
  if (!API_KEY) throw new Error('LICENSEKEY is missing.');

  const store = createKeyValueStore();
  if (store.mode === 'memory' && process.env.QUALITY_SNAPSHOT_ALLOW_MEMORY !== '1') {
    throw new Error('REDIS_URL is required for the snapshot job. Set QUALITY_SNAPSHOT_ALLOW_MEMORY=1 only for local dry runs.');
  }
  await store.ping();
  const contexts = parseContexts();
  const results = [];

  for (const context of contexts) {
    results.push(await buildSnapshotForContext(store, context));
  }

  await store.setJson(latestSnapshotIndexKey(), {
    generatedAt: new Date().toISOString(),
    contexts: results
  }, { ttlMs: SNAPSHOT_TTL_MS });

  console.log(JSON.stringify({
    ok: true,
    cacheMode: store.mode,
    contexts: results
  }, null, 2));
}

main().catch((error) => {
  console.error('Quality snapshot job failed.', error);
  process.exitCode = 1;
});
