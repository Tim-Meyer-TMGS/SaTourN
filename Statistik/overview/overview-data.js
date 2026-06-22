import {
  buildOverviewQualityMeta,
  sortStatisticRows
} from './overview-helpers.js';

export function canCalculateQualityForContext(context) {
  return Boolean(context?.area || context?.city);
}

export function getRegionalScanPageSize(windowObject = window) {
  const value = Number(windowObject.SATOURN_REGION_QUALITY_PAGE_SIZE || 200);
  return Number.isFinite(value) ? Math.max(1, Math.min(200, value)) : 200;
}

export function getRegionalScanMaxPages(windowObject = window) {
  const value = Number(windowObject.SATOURN_REGION_QUALITY_MAX_PAGES || 50);
  return Number.isFinite(value) ? Math.max(1, Math.min(250, value)) : 50;
}

function getQualityScanMeta(shared) {
  const estimatedTotalItems = Object.values(shared.estimatedByType)
    .filter(Number.isFinite)
    .reduce((sum, value) => sum + value, 0);

  return {
    mode: 'regional_scan',
    collectedItems: shared.items.length,
    estimatedTotalItems,
    truncated: shared.truncated,
    unsupportedCriteria: [],
    failedCounts: shared.failedTypes,
    pendingTypes: Math.max(0, shared.totalTypes - shared.completedTypes),
    completedTypes: shared.completedTypes
  };
}

function emitRegionalQualityUpdate(shared, onUpdate, dependencies) {
  const aggregations = dependencies.getQualityAggregations(shared.items);
  const meta = getQualityScanMeta(shared);
  onUpdate?.({
    items: [...shared.items],
    aggregations,
    meta
  });
}

export async function loadStatisticRowsIncremental({
  context,
  types,
  buildQuery,
  buildUrl,
  fetchJsonCached,
  extractTotal,
  onRow = null,
  isAbortLikeError = () => false
}) {
  const query = buildQuery(context);
  const targetTypes = context.type ? [context.type] : types;
  const rows = [];

  const results = await Promise.all(targetTypes.map(async (type) => {
    try {
      const [totalPayload, openDataPayload] = await Promise.all([
        fetchJsonCached(buildUrl(type, query, { limit: 1 })),
        fetchJsonCached(buildUrl(type, query, { limit: 1, isOpenData: true }))
      ]);
      const row = {
        type,
        statistikCount: Number(extractTotal(totalPayload) || 0),
        openDataCount: Number(extractTotal(openDataPayload) || 0)
      };
      rows.push(row);
      onRow?.(row, sortStatisticRows(rows, types));
      return row;
    } catch (error) {
      if (!isAbortLikeError(error)) {
        console.warn('Statistik-Count fehlgeschlagen.', type, error);
      }
      return null;
    }
  }));

  const finalRows = sortStatisticRows(results.filter(Boolean), types);
  if (!finalRows.length && targetTypes.length) {
    throw new Error('No statistic rows loaded');
  }
  return finalRows;
}

export async function loadStatisticRows({
  context,
  types,
  buildQuery,
  buildUrl,
  fetchJsonCached,
  extractTotal
}) {
  const query = buildQuery(context);
  const targetTypes = context.type ? [context.type] : types;
  return Promise.all(targetTypes.map(async (type) => {
    const [totalPayload, openDataPayload] = await Promise.all([
      fetchJsonCached(buildUrl(type, query, { limit: 1 })),
      fetchJsonCached(buildUrl(type, query, { limit: 1, isOpenData: true }))
    ]);
    return {
      type,
      statistikCount: Number(extractTotal(totalPayload) || 0),
      openDataCount: Number(extractTotal(openDataPayload) || 0)
    };
  }));
}

export async function loadRegionalQualityEvaluation({
  context,
  types,
  buildQuery,
  buildUrl,
  fetchJsonCached,
  extractItems,
  extractTotal,
  extractId,
  normalizeItem,
  evaluateAllItems,
  getQualityAggregations,
  isAbortLikeError = () => false,
  isStale = () => false,
  onUpdate = null,
  pageSize = getRegionalScanPageSize(),
  maxPages = getRegionalScanMaxPages()
}) {
  const query = buildQuery(context);
  const targetTypes = context.type ? [context.type] : types;
  const shared = {
    items: [],
    estimatedByType: {},
    completedTypes: 0,
    failedTypes: 0,
    totalTypes: targetTypes.length,
    truncated: false
  };

  emitRegionalQualityUpdate(shared, onUpdate, { getQualityAggregations });

  await Promise.all(targetTypes.map(async (type) => {
    const seenIds = new Set();
    let offset = 0;
    let pages = 0;
    let complete = false;

    try {
      while (!isStale() && pages < maxPages) {
        const payload = await fetchJsonCached(buildUrl(type, query, { limit: pageSize, offset }));
        const pageItems = extractItems(payload);
        const pageTotal = extractTotal(payload);
        if (Number.isFinite(pageTotal)) shared.estimatedByType[type] = pageTotal;
        pages += 1;

        const normalized = pageItems
          .filter((rawItem) => {
            const itemId = extractId(rawItem) || `${type}:${offset}:${seenIds.size}`;
            if (seenIds.has(itemId)) return false;
            seenIds.add(itemId);
            return true;
          })
          .map((rawItem) => normalizeItem(rawItem, type));

        const evaluated = evaluateAllItems(normalized);
        shared.items.push(...evaluated);
        emitRegionalQualityUpdate(shared, onUpdate, { getQualityAggregations });

        offset += pageItems.length;
        if (!pageItems.length || pageItems.length < pageSize || (Number.isFinite(pageTotal) && offset >= pageTotal)) {
          complete = true;
          break;
        }
      }
    } catch (error) {
      if (!isAbortLikeError(error) && !isStale()) {
        shared.failedTypes += 1;
        console.warn('Regionaler Qualitätsscan fehlgeschlagen.', type, error);
      }
    } finally {
      if (!complete && !isStale()) shared.truncated = true;
      shared.completedTypes += 1;
      emitRegionalQualityUpdate(shared, onUpdate, { getQualityAggregations });
    }
  }));

  return {
    items: [...shared.items],
    aggregations: getQualityAggregations(shared.items),
    meta: getQualityScanMeta(shared)
  };
}

export async function loadQualityCountSummary({
  context,
  types,
  qualityCriteria,
  isActiveCriterion,
  getQualityScanConfig,
  fetchQualityCount,
  buildAggregationsFromIssueSummary,
  buildQuery,
  onUpdate = null
}) {
  const query = buildQuery(context);
  const targetTypes = context.type ? [context.type] : types;
  const activeCriteria = qualityCriteria.filter((criterion) => isActiveCriterion(criterion.id));
  const issueMap = new Map();
  const unsupported = [];
  let failedCounts = 0;

  const buildIssues = () => Array.from(issueMap.values()).map((issue) => ({
    ...issue,
    affectedTypes: issue.affectedTypes.sort((a, b) => a.localeCompare(b, 'de'))
  }));

  const emit = () => {
    const issues = buildIssues();
    const meta = {
      ...buildOverviewQualityMeta({
        canCalculateQuality: false,
        selectedType: context.type || '',
        totalTypes: types.length
      }),
      mode: 'api_counts',
      estimatedTotalItems: issues.reduce((sum, issue) => sum + issue.affectedCount, 0),
      unsupportedCriteria: unsupported,
      failedCounts
    };
    onUpdate?.(issues, meta, buildAggregationsFromIssueSummary(issues));
    return issues;
  };

  const jobs = activeCriteria.flatMap((criterion) => (
    targetTypes
      .filter((type) => !criterion.types?.length || criterion.types.includes(type))
      .map((type) => ({ criterion, type, scanConfig: getQualityScanConfig(criterion, type) }))
  ));

  await Promise.all(jobs.map(async ({ criterion, type, scanConfig }) => {
    if (scanConfig.method !== 'api_pushdown' || !scanConfig.verified || !scanConfig.missingQuery) {
      unsupported.push({ criterionId: criterion.id, type, method: scanConfig.method });
      emit();
      return;
    }

    try {
      const payload = await fetchQualityCount({
        criterionId: criterion.id,
        type,
        query
      });
      const count = Number(payload?.count || 0);
      if (!issueMap.has(criterion.id)) {
        issueMap.set(criterion.id, {
          criterionId: criterion.id,
          label: criterion.label,
          affectedCount: 0,
          affectedTypes: [],
          typeCounts: {},
          priority: criterion.priority,
          autoCheck: criterion.autoCheck !== false,
          recommendation: criterion.recommendation,
          countMode: 'api_count'
        });
      }
      const issue = issueMap.get(criterion.id);
      issue.affectedCount += count;
      issue.typeCounts[type] = count;
      if (count > 0 && !issue.affectedTypes.includes(type)) issue.affectedTypes.push(type);
      emit();
    } catch (error) {
      failedCounts += 1;
      emit();
      console.warn('Qualitäts-Count fehlgeschlagen.', criterion.id, type, error);
    }
  }));

  return buildIssues();
}
