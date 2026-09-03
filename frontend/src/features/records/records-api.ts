import { fetchJson } from '../../shared/api/http-client';
import { buildApiActionUrl, DATA_API_PATH, SYSTEM_API_PATH } from '../../shared/api/api-paths';
import { buildSearchApiUrl } from '../../shared/api/url-builders';
import { evaluateAllItems, type QualityCriterion } from '../../shared/quality/quality';
import { findQualityCriterion } from '../../shared/quality/quality-criteria';
import {
  buildQualityEvaluationInput,
  buildRecordDetailUrl,
  getRecordAuthorships,
  getRecordEmail,
  getRecordWeb
} from '../../shared/records/record-fields';
import type { WorkContext } from '../../shared/types/context';
import type { RecordRow, RecordSearchMeta } from './records-types';

type SearchPayload = {
  items?: unknown[];
  Items?: unknown[];
  results?: unknown[];
  Results?: unknown[];
  overallcount?: number;
  OverallCount?: number;
};

type AiSearchPayload = {
  ids?: string[];
  globalIds?: string[];
  prompt?: string;
  truncated?: boolean;
};

type ResolvedItem = { raw?: unknown; _resolvedType?: string; type?: string } | unknown;

type ResolvedPayload = {
  items?: ResolvedItem[];
};

type QualityScanPayload = {
  items?: Array<Record<string, unknown>>;
  stats?: {
    overallcount?: number;
    totalSourceItems?: number;
    matchedItems?: number;
  };
  page?: {
    complete?: boolean;
    nextCursor?: string | number | null;
  };
};

type SearchResult = {
  items: Record<string, unknown>[];
  meta: RecordSearchMeta;
};

type PaginationOptions = {
  page?: number;
  pageSize?: number;
};

const RECORD_TYPES = ['POI', 'Tour', 'Hotel', 'Event', 'Gastro', 'Package'] as const;
const RECORD_TYPE_SET = new Set<string>(RECORD_TYPES);

function getPageSize({ pageSize }: PaginationOptions = {}) {
  const value = Number(pageSize || 25);
  return Number.isFinite(value) ? Math.max(1, Math.min(200, value)) : 25;
}

function getOffset({ page, pageSize }: PaginationOptions = {}) {
  const normalizedPage = Math.max(1, Number(page || 1));
  return (normalizedPage - 1) * getPageSize({ pageSize });
}

function getPerRequestPageSize(requestCount: number, pagination: PaginationOptions = {}) {
  const pageSize = getPageSize(pagination);
  return requestCount > 1 ? Math.max(1, Math.floor(pageSize / requestCount)) : pageSize;
}

function getPerRequestOffset(requestCount: number, pagination: PaginationOptions = {}) {
  const normalizedPage = Math.max(1, Number(pagination.page || 1));
  return (normalizedPage - 1) * getPerRequestPageSize(requestCount, pagination);
}

function canPageQualityScanResults(requests: Array<{ criterion: QualityCriterion; type: string }>) {
  return requests.length > 0;
}

function cleanQueryValue(value: string) {
  return String(value || '').replace(/"/g, '').trim();
}

function buildContextQuery({ area, city }: WorkContext) {
  const parts: string[] = [];
  if (area) parts.push(`area:"${cleanQueryValue(area)}"`);
  if (city) parts.push(`city:"${cleanQueryValue(city)}"`);
  return parts.join(' AND ');
}

function looksLikeRecordId(query: string) {
  const value = String(query || '').trim();
  return /^\d{5,}$/.test(value) || /^[a-z]_\d{4,}$/i.test(value) || /^[a-z]+[-_:]\w{4,}$/i.test(value);
}

function extractItems(payload: SearchPayload | null | undefined) {
  return payload?.items || payload?.Items || payload?.results || payload?.Results || [];
}

function extractTotal(payload: SearchPayload | null | undefined, fallbackLength: number) {
  const total = Number(payload?.overallcount ?? payload?.OverallCount ?? fallbackLength);
  return Number.isFinite(total) ? total : fallbackLength;
}

function normalizeSearchItem(raw: unknown, fallbackType: string, context: WorkContext) {
  return {
    ...buildQualityEvaluationInput(raw, {
      fallbackType,
      fallbackArea: context.area,
      fallbackCity: context.city
    }),
    qualityScore: null,
    qualityStatus: '',
    missingCriteria: [],
    recommendations: []
  };
}

function normalizeResolvedItem(entry: ResolvedItem, selectedType: string, context: WorkContext) {
  if (entry && typeof entry === 'object' && 'raw' in entry) {
    const resolvedEntry = entry as { raw?: unknown; _resolvedType?: string; type?: string };
    return normalizeSearchItem(
      resolvedEntry.raw ?? entry,
      resolvedEntry._resolvedType || resolvedEntry.type || selectedType,
      context
    );
  }

  return normalizeSearchItem(entry, selectedType, context);
}

function extractAiResultIds(payload: AiSearchPayload | null | undefined) {
  const ids = Array.isArray(payload?.ids)
    ? payload.ids
    : Array.isArray(payload?.globalIds)
      ? payload.globalIds
      : [];

  return Array.from(new Set(ids.map((entry) => String(entry).trim()).filter(Boolean)));
}

function priorityRank(priority: string) {
  if (priority === 'hoch') return 3;
  if (priority === 'mittel') return 2;
  return 1;
}

function toRecordRow(item: Record<string, unknown>): RecordRow {
  const missingCriteria = Array.isArray(item.missingCriteria)
    ? item.missingCriteria.map((entry) => String(entry))
    : [];

  const primaryIssueId = [...missingCriteria].sort((left, right) => {
    const leftCriterion = findQualityCriterion(left);
    const rightCriterion = findQualityCriterion(right);
    return priorityRank(String(rightCriterion?.priority || '')) - priorityRank(String(leftCriterion?.priority || ''));
  })[0] || '';
  const authorships = Array.isArray(item.authorships)
    ? Array.from(new Set(item.authorships.map((entry) => String(entry).trim()).filter(Boolean)))
    : getRecordAuthorships(item.raw);

  return {
    id: String(item.id || ''),
    globalId: String(item.globalId || ''),
    title: String(item.title || 'Ohne Titel'),
    type: String(item.type || ''),
    city: String(item.city || ''),
    region: String(item.region || ''),
    category: String(item.category || ''),
    authorships,
    updatedAt: String(item.updatedAt || ''),
    qualityStatus: String(item.qualityStatus || 'nicht berechenbar'),
    qualityScore: Number.isFinite(Number(item.qualityScore)) ? Number(item.qualityScore) : null,
    primaryIssue: findQualityCriterion(primaryIssueId)?.label || '-',
    missingCriteria,
    email: getRecordEmail(item.raw),
    web: getRecordWeb(item.raw),
    detailUrl: buildRecordDetailUrl({
      id: item.id,
      globalId: item.globalId,
      type: item.type
    }),
    raw: item.raw
  };
}

function buildEvaluatedRecordRows(items: Record<string, unknown>[]) {
  const evaluated = evaluateAllItems(items) as Array<Record<string, unknown>>;
  return evaluated.map(toRecordRow);
}

function uniqueRecordItems(items: Record<string, unknown>[]) {
  const seen = new Set<string>();

  return items.filter((item) => {
    const key = String(item.globalId || `${item.type}:${item.id}`);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function uniqueRecordRows(rows: RecordRow[]) {
  const seen = new Set<string>();

  return rows.filter((row) => {
    const key = row.globalId || `${row.type}:${row.id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function fetchRecordsById(query: string, context: WorkContext, selectedType: string) {
  const targetTypes = selectedType ? [selectedType] : [...RECORD_TYPES];
  const contextQuery = buildContextQuery(context);
  const idQuery = cleanQueryValue(query);
  const variants = [idQuery, `id:"${idQuery}"`, `global_id:"${idQuery}"`, `globalid:${idQuery}`];

  const results: Record<string, unknown>[] = [];

  for (const type of targetTypes) {
    for (const variant of variants) {
      const combinedQuery = [contextQuery, variant].filter(Boolean).join(' AND ');
      const payload = await fetchJson<SearchPayload>(buildSearchApiUrl(DATA_API_PATH, type, combinedQuery, { limit: 10 }));
      const items = extractItems(payload).map((raw) => normalizeSearchItem(raw, type, context));
      results.push(...items);
      if (results.length) break;
    }
    if (results.length) break;
  }

  return {
    items: results,
    meta: {
      mode: 'id_search',
      estimatedTotalItems: results.length,
      truncated: false
    } satisfies RecordSearchMeta
  };
}

async function fetchRecordsByTextQuery(query: string, context: WorkContext, selectedType: string, pagination: PaginationOptions = {}) {
  const targetTypes = selectedType ? [selectedType] : [...RECORD_TYPES];
  const contextQuery = buildContextQuery(context);
  const termQuery = cleanQueryValue(query)
    .replace(/[\(\)\{\}\[\]]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!termQuery) {
    return {
      items: [],
      meta: {
        mode: 'search',
        estimatedTotalItems: 0,
        truncated: false
      } satisfies RecordSearchMeta
    };
  }

  const combinedQuery = [contextQuery, termQuery].filter(Boolean).join(' AND ');
  const perTypeLimit = selectedType ? getPageSize(pagination) : getPerRequestPageSize(targetTypes.length, pagination);
  const offset = selectedType ? getOffset(pagination) : 0;

  const payloads = await Promise.all(targetTypes.map(async (type): Promise<{ items: Record<string, unknown>[]; total: number }> => {
    try {
      const payload = await fetchJson<SearchPayload>(
        buildSearchApiUrl(DATA_API_PATH, type, combinedQuery, { limit: perTypeLimit, offset })
      );
      return {
        items: extractItems(payload).map((raw) => normalizeSearchItem(raw, type, context)),
        total: extractTotal(payload, 0)
      };
    } catch {
      return { items: [], total: 0 };
    }
  }));

  const items = payloads.flatMap((entry) => entry.items);
  const estimatedTotalItems = payloads.reduce((sum, entry) => sum + entry.total, 0);
  const truncated = payloads.some((entry) => entry.total > entry.items.length);

  return {
    items,
    meta: {
      mode: 'search',
      estimatedTotalItems,
      truncated
    } satisfies RecordSearchMeta
  };
}

async function fetchRecordsByAiPrompt(prompt: string, context: WorkContext, selectedType: string): Promise<SearchResult> {
  const aiPayload = await fetchJson<AiSearchPayload>(buildApiActionUrl(SYSTEM_API_PATH, 'ai-search'), {
    method: 'POST',
    timeoutMs: 60_000,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt,
      context: {
        area: context.area || '',
        city: context.city || '',
        type: selectedType || ''
      }
    })
  });

  const ids = extractAiResultIds(aiPayload);

  if (!ids.length) {
    return {
      items: [],
      meta: {
        mode: 'ai_search',
        prompt,
        estimatedTotalItems: 0,
        truncated: false
      } satisfies RecordSearchMeta
    };
  }

  const resolvedPayload = await fetchJson<ResolvedPayload>(buildApiActionUrl(DATA_API_PATH, 'records-by-ids'), {
    method: 'POST',
    timeoutMs: 45_000,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ids,
      type: selectedType || ''
    })
  });

  const resolvedItems = Array.isArray(resolvedPayload.items) ? resolvedPayload.items : [];
  const normalized = resolvedItems.map((entry) => normalizeResolvedItem(entry, selectedType, context));

  return {
    items: normalized,
    meta: {
      mode: 'ai_search',
      prompt,
      estimatedTotalItems: ids.length,
      truncated: Boolean(aiPayload.truncated)
    } satisfies RecordSearchMeta
  };
}

async function fetchNonOpenDataRecords(context: WorkContext, selectedTypes: string[], pagination: PaginationOptions = {}): Promise<SearchResult> {
  const targetTypes = (selectedTypes.length ? selectedTypes : [...RECORD_TYPES])
    .filter((type) => RECORD_TYPE_SET.has(type as (typeof RECORD_TYPES)[number]));
  const contextQuery = buildContextQuery(context);
  const perTypeLimit = getPerRequestPageSize(targetTypes.length, pagination);
  const perTypeOffset = getPerRequestOffset(targetTypes.length, pagination);

  const payloads = await Promise.all(targetTypes.map(async (type) => {
    const payload = await fetchJson<SearchPayload>(
      buildSearchApiUrl(DATA_API_PATH, type, contextQuery, {
        limit: perTypeLimit,
        offset: perTypeOffset,
        isOpenData: false
      }),
      { timeoutMs: 45_000 }
    );
    const pageItems = extractItems(payload);
    const total = extractTotal(payload, pageItems.length);

    return {
      items: pageItems.map((raw) => normalizeSearchItem(raw, type, context)),
      total,
      truncated: total > perTypeOffset + pageItems.length
    };
  }));

  const items = uniqueRecordItems(payloads.flatMap((entry) => entry.items)).slice(0, getPageSize(pagination));
  const estimatedTotalItems = payloads.reduce((sum, entry) => sum + entry.total, 0);

  return {
    items,
    meta: {
      mode: 'non_open_data',
      criterionId: 'license_missing',
      criterionLabel: 'Ohne gültige Open-Data-Lizenz',
      estimatedTotalItems,
      supportsPagination: true,
      truncated: payloads.some((entry) => entry.truncated)
    } satisfies RecordSearchMeta
  };
}

export async function loadRecordsForFrontend(options: {
  mode: 'search' | 'ai_search';
  query: string;
  context: WorkContext;
  selectedType: string;
  page?: number;
  pageSize?: number;
}) {
  const { mode, query, context, selectedType, page, pageSize } = options;
  const baseResult = mode === 'ai_search'
    ? await fetchRecordsByAiPrompt(query, context, selectedType)
    : looksLikeRecordId(query)
      ? await fetchRecordsById(query, context, selectedType)
      : await fetchRecordsByTextQuery(query, context, selectedType, { page, pageSize });

  return {
    rows: buildEvaluatedRecordRows(baseResult.items),
    meta: baseResult.meta
  };
}

export async function loadNonOpenDataRecordsForFrontend(options: {
  context: WorkContext;
  selectedTypes?: string[];
  page?: number;
  pageSize?: number;
}) {
  const baseResult = await fetchNonOpenDataRecords(options.context, options.selectedTypes || [], {
    page: options.page,
    pageSize: options.pageSize
  });
  return {
    rows: buildEvaluatedRecordRows(baseResult.items),
    meta: baseResult.meta
  };
}

export async function loadCriterionRecordsForFrontend(options: {
  criterionId: string;
  criterionIds?: string[];
  context: WorkContext;
  selectedType: string;
  selectedTypes?: string[];
  page?: number;
  pageSize?: number;
  cursor?: string | number | null;
}) {
  const { criterionId, criterionIds = [], context, selectedType, selectedTypes = [], page, pageSize, cursor } = options;
  const criterion = findQualityCriterion(criterionId);
  const criteria = Array.from(new Set((criterionIds.length ? criterionIds : [criterionId]).filter(Boolean)))
    .map((id) => findQualityCriterion(id))
    .filter((entry): entry is QualityCriterion => Boolean(entry));
  const explicitTypes = (selectedTypes.length ? selectedTypes : [selectedType]).filter(Boolean);
  const criterionTypes = criteria.length
    ? Array.from(new Set(criteria.flatMap((entry) => entry.types?.length ? entry.types : [...RECORD_TYPES])))
    : criterion?.types?.length ? criterion.types : [...RECORD_TYPES];
  const targetTypes = Array.from(new Set((explicitTypes.length ? explicitTypes : criterionTypes)
    .filter((type) => RECORD_TYPE_SET.has(type))
    .filter((type) => !criteria.length || criteria.some((entry) => !entry.types?.length || entry.types.includes(type)))));
  if (!criterionId || !targetTypes.length || !criteria.length) {
    throw new Error('Für diese Pflegeaufgabe fehlt ein konkreter Datentyp.');
  }

  const query = buildContextQuery(context);
  const requests = criteria.flatMap((activeCriterion) => targetTypes
    .filter((type) => !activeCriterion.types?.length || activeCriterion.types.includes(type))
    .map((type) => ({ criterion: activeCriterion, type })));
  const supportsPagination = canPageQualityScanResults(requests);
  const supportsCursorLoading = !supportsPagination && requests.length === 1;
  const resultLimit = getPerRequestPageSize(requests.length, { page, pageSize });
  const offset = supportsPagination ? getPerRequestOffset(requests.length, { page, pageSize }) : 0;
  const scanCursor = supportsCursorLoading ? cursor : null;

  const scanResults = await Promise.all(requests.map(async ({ criterion: activeCriterion, type }) => {
    const params = new URLSearchParams();
    params.set('criterionId', activeCriterion.id);
    params.set('type', type);
    params.set('limit', String(resultLimit));
    if (scanCursor !== null && scanCursor !== undefined && scanCursor !== '') {
      params.set('cursor', String(scanCursor));
    } else {
      params.set('offset', String(offset));
    }
    params.set('scanPageSize', '200');
    params.set('maxPages', '20');
    if (query) params.set('query', query);

    try {
      const payload = await fetchJson<QualityScanPayload>(`${buildApiActionUrl(DATA_API_PATH, 'quality-scan')}&${params.toString()}`, {
        timeoutMs: 45_000
      });

      return { type, payload, error: '' };
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : 'Unbekannter Fehler';
      return { type, payload: null, error: `${activeCriterion.label || activeCriterion.id} (${type}): ${message}` };
    }
  }));

  const payloads = scanResults.filter((entry): entry is { type: string; payload: QualityScanPayload; error: string } => Boolean(entry.payload));
  if (!payloads.length && scanResults.length) {
    throw new Error(`Fehlerliste konnte nicht geladen werden. ${scanResults.map((entry) => entry.error).filter(Boolean).join(' | ')}`);
  }

  const rows = uniqueRecordRows(payloads.flatMap(({ type, payload }) => {
    const items = Array.isArray(payload.items) ? payload.items : [];
    return items
      .map((item) => toRecordRow({
        ...item,
        type: item.type || type,
        raw: item.raw || item
      }));
  })).slice(0, getPageSize({ page, pageSize }));
  const estimatedTotalItems = payloads.reduce((sum, { payload }) => (
    sum + Number(payload.stats?.overallcount ?? payload.stats?.matchedItems ?? 0)
  ), 0);
  const nextCursor = supportsPagination
    ? null
    : supportsCursorLoading
      ? payloads.map(({ payload }) => payload.page?.nextCursor).find((value) => value !== null && value !== undefined) ?? null
      : null;

  return {
    rows,
    meta: {
      mode: 'criterion',
      criterionId,
      criterionLabel: criteria.length > 1 ? 'Gruppierte Pflegeaufgabe' : criterion?.label || criterionId,
      estimatedTotalItems: estimatedTotalItems || rows.length,
      nextCursor,
      supportsPagination,
      truncated: payloads.some(({ payload }) => payload.page?.complete === false)
    } satisfies RecordSearchMeta
  };
}
