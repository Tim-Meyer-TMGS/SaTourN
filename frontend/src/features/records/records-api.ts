import { fetchJson } from '../../shared/api/http-client';
import { getRuntimeConfig } from '../../shared/api/runtime-config';
import { buildSearchApiUrl } from '../../shared/api/url-builders';
import { evaluateAllItems, qualityCriteria, type QualityCriterion } from '../../shared/legacy/quality';
import {
  buildQualityEvaluationInput,
  buildRecordDetailUrl,
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
  };
};

type SearchResult = {
  items: Record<string, unknown>[];
  meta: RecordSearchMeta;
};

const RECORD_TYPES = ['POI', 'Tour', 'Hotel', 'Event', 'Gastro', 'Package'] as const;
const RECORD_TYPE_SET = new Set<string>(RECORD_TYPES);
const NON_OPEN_DATA_PAGE_SIZE = 200;
const NON_OPEN_DATA_MAX_PAGES = 20;

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
    const leftCriterion = qualityCriteria.find((entry) => entry.id === left);
    const rightCriterion = qualityCriteria.find((entry) => entry.id === right);
    return priorityRank(String(rightCriterion?.priority || '')) - priorityRank(String(leftCriterion?.priority || ''));
  })[0] || '';

  return {
    id: String(item.id || ''),
    globalId: String(item.globalId || ''),
    title: String(item.title || 'Ohne Titel'),
    type: String(item.type || ''),
    city: String(item.city || ''),
    region: String(item.region || ''),
    category: String(item.category || ''),
    updatedAt: String(item.updatedAt || ''),
    qualityStatus: String(item.qualityStatus || 'nicht berechenbar'),
    qualityScore: Number.isFinite(Number(item.qualityScore)) ? Number(item.qualityScore) : null,
    primaryIssue: qualityCriteria.find((entry) => entry.id === primaryIssueId)?.label || '-',
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
  const runtime = getRuntimeConfig();
  const targetTypes = selectedType ? [selectedType] : [...RECORD_TYPES];
  const contextQuery = buildContextQuery(context);
  const idQuery = cleanQueryValue(query);
  const variants = [idQuery, `id:"${idQuery}"`, `global_id:"${idQuery}"`, `globalid:${idQuery}`];

  const results: Record<string, unknown>[] = [];

  for (const type of targetTypes) {
    for (const variant of variants) {
      const combinedQuery = [contextQuery, variant].filter(Boolean).join(' AND ');
      const payload = await fetchJson<SearchPayload>(buildSearchApiUrl(runtime.searchApiBase, type, combinedQuery, { limit: 10 }));
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

async function fetchRecordsByTextQuery(query: string, context: WorkContext, selectedType: string) {
  const runtime = getRuntimeConfig();
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
  const perTypeLimit = selectedType ? 40 : 15;

  const payloads = await Promise.all(targetTypes.map(async (type): Promise<{ items: Record<string, unknown>[]; total: number }> => {
    try {
      const payload = await fetchJson<SearchPayload>(
        buildSearchApiUrl(runtime.searchApiBase, type, combinedQuery, { limit: perTypeLimit })
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
  const runtime = getRuntimeConfig();
  const aiPayload = await fetchJson<AiSearchPayload>(runtime.oiSearchApiBase, {
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

  const resolvedPayload = await fetchJson<ResolvedPayload>(runtime.recordsByIdsApiBase, {
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

async function fetchNonOpenDataRecords(context: WorkContext, selectedTypes: string[]): Promise<SearchResult> {
  const runtime = getRuntimeConfig();
  const targetTypes = (selectedTypes.length ? selectedTypes : [...RECORD_TYPES])
    .filter((type) => RECORD_TYPE_SET.has(type as (typeof RECORD_TYPES)[number]));
  const contextQuery = buildContextQuery(context);

  const payloads = await Promise.all(targetTypes.map(async (type) => {
    const items: Record<string, unknown>[] = [];
    let total = 0;
    let offset = 0;

    for (let page = 0; page < NON_OPEN_DATA_MAX_PAGES; page += 1) {
      const payload = await fetchJson<SearchPayload>(
        buildSearchApiUrl(runtime.searchApiBase, type, contextQuery, {
          limit: NON_OPEN_DATA_PAGE_SIZE,
          offset,
          isOpenData: false
        }),
        { timeoutMs: 45_000 }
      );
      const pageItems = extractItems(payload);
      total = extractTotal(payload, total || pageItems.length);
      items.push(...pageItems.map((raw) => normalizeSearchItem(raw, type, context)));
      if (!pageItems.length || items.length >= total) break;
      offset += pageItems.length;
    }

    return {
      items,
      total,
      truncated: total > items.length
    };
  }));

  const items = uniqueRecordItems(payloads.flatMap((entry) => entry.items));
  const estimatedTotalItems = payloads.reduce((sum, entry) => sum + entry.total, 0);

  return {
    items,
    meta: {
      mode: 'non_open_data',
      criterionId: 'license_missing',
      criterionLabel: 'Nicht Open-Data-fähig',
      estimatedTotalItems,
      truncated: payloads.some((entry) => entry.truncated)
    } satisfies RecordSearchMeta
  };
}

export async function loadRecordsForFrontend(options: {
  mode: 'search' | 'ai_search';
  query: string;
  context: WorkContext;
  selectedType: string;
}) {
  const { mode, query, context, selectedType } = options;
  const baseResult = mode === 'ai_search'
    ? await fetchRecordsByAiPrompt(query, context, selectedType)
    : looksLikeRecordId(query)
      ? await fetchRecordsById(query, context, selectedType)
      : await fetchRecordsByTextQuery(query, context, selectedType);

  return {
    rows: buildEvaluatedRecordRows(baseResult.items),
    meta: baseResult.meta
  };
}

export async function loadNonOpenDataRecordsForFrontend(options: {
  context: WorkContext;
  selectedTypes?: string[];
}) {
  const baseResult = await fetchNonOpenDataRecords(options.context, options.selectedTypes || []);
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
}) {
  const { criterionId, criterionIds = [], context, selectedType, selectedTypes = [] } = options;
  const criterion = qualityCriteria.find((entry) => entry.id === criterionId);
  const criteria = Array.from(new Set((criterionIds.length ? criterionIds : [criterionId]).filter(Boolean)))
    .map((id) => qualityCriteria.find((entry) => entry.id === id))
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

  const runtime = getRuntimeConfig();
  const query = buildContextQuery(context);
  const requests = criteria.flatMap((activeCriterion) => targetTypes
    .filter((type) => !activeCriterion.types?.length || activeCriterion.types.includes(type))
    .map((type) => ({ criterion: activeCriterion, type })));

  const scanResults = await Promise.all(requests.map(async ({ criterion: activeCriterion, type }) => {
    const params = new URLSearchParams();
    params.set('criterionId', activeCriterion.id);
    params.set('type', type);
    params.set('limit', '200');
    params.set('scanPageSize', '200');
    params.set('maxPages', '20');
    if (query) params.set('query', query);

    try {
      const payload = await fetchJson<QualityScanPayload>(`${runtime.qualityScanApiBase}?${params.toString()}`, {
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
  }));
  const estimatedTotalItems = payloads.reduce((sum, { payload }) => (
    sum + Number(payload.stats?.overallcount ?? payload.stats?.matchedItems ?? 0)
  ), 0);

  return {
    rows,
    meta: {
      mode: 'criterion',
      criterionId,
      criterionLabel: criteria.length > 1 ? 'Gruppierte Pflegeaufgabe' : criterion?.label || criterionId,
      estimatedTotalItems: estimatedTotalItems || rows.length,
      truncated: payloads.some(({ payload }) => payload.page?.complete === false)
    } satisfies RecordSearchMeta
  };
}
