import { fetchJson } from '../../shared/api/http-client';
import { getRuntimeConfig } from '../../shared/api/runtime-config';
import { buildSearchApiUrl } from '../../shared/api/url-builders';
import { evaluateAllItems, qualityCriteria } from '../../shared/legacy/quality';
import {
  buildRecordDetailUrl,
  extractRecordId,
  getFirst,
  getRecordArea,
  getRecordCategory,
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
  const globalId = getFirst(raw, ['global_id', 'globalId']);
  const resolvedType = fallbackType || getFirst(raw, ['type', 'typeName']);

  return {
    raw,
    id: extractRecordId(raw),
    globalId,
    title: getFirst(raw, ['title', 'name', 'presentation.title']) || 'Ohne Titel',
    type: resolvedType,
    region: getRecordArea(raw, context.area),
    city: getFirst(raw, ['city', 'location.city', 'address.city']) || context.city || '',
    category: getRecordCategory(raw),
    updatedAt: getFirst(raw, ['updatedAt', 'lastModified', 'modified', 'changeDate']),
    qualityScore: null,
    qualityStatus: '',
    missingCriteria: [],
    recommendations: []
  };
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

async function executeIdSearch(query: string, context: WorkContext, selectedType: string) {
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

async function executeTextSearch(query: string, context: WorkContext, selectedType: string) {
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

async function loadAiSearch(prompt: string, context: WorkContext, selectedType: string): Promise<SearchResult> {
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

  const ids = Array.isArray(aiPayload.ids)
    ? aiPayload.ids
    : Array.isArray(aiPayload.globalIds)
      ? aiPayload.globalIds
      : [];

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
  const normalized = resolvedItems.map((entry: ResolvedItem) => {
    if (entry && typeof entry === 'object' && 'raw' in entry) {
      const resolvedEntry = entry as { raw?: unknown; _resolvedType?: string; type?: string };
      return normalizeSearchItem(
        resolvedEntry.raw ?? entry,
        resolvedEntry._resolvedType || resolvedEntry.type || selectedType,
        context
      );
    }
    return normalizeSearchItem(entry, selectedType, context);
  });

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

export async function loadRecordsForFrontend(options: {
  mode: 'search' | 'ai_search';
  query: string;
  context: WorkContext;
  selectedType: string;
}) {
  const { mode, query, context, selectedType } = options;
  const baseResult = mode === 'ai_search'
    ? await loadAiSearch(query, context, selectedType)
    : looksLikeRecordId(query)
      ? await executeIdSearch(query, context, selectedType)
      : await executeTextSearch(query, context, selectedType);

  const evaluated = evaluateAllItems(baseResult.items) as Array<Record<string, unknown>>;
  return {
    rows: evaluated.map(toRecordRow),
    meta: baseResult.meta
  };
}

export async function loadCriterionRecordsForFrontend(options: {
  criterionId: string;
  context: WorkContext;
  selectedType: string;
}) {
  const { criterionId, context, selectedType } = options;
  const criterion = qualityCriteria.find((entry) => entry.id === criterionId);
  if (!criterionId || !selectedType) {
    throw new Error('Für diese Pflegeaufgabe fehlt ein konkreter Datentyp.');
  }

  const runtime = getRuntimeConfig();
  const params = new URLSearchParams();
  params.set('criterionId', criterionId);
  params.set('type', selectedType);
  params.set('limit', '200');
  params.set('scanPageSize', '200');
  params.set('maxPages', '20');
  const query = buildContextQuery(context);
  if (query) params.set('query', query);

  const payload = await fetchJson<QualityScanPayload>(`${runtime.qualityScanApiBase}?${params.toString()}`, {
    timeoutMs: 45_000
  });

  const items = Array.isArray(payload.items) ? payload.items : [];
  const rows = items.map((item) => toRecordRow({
    ...item,
    type: item.type || selectedType,
    raw: item.raw || item
  }));

  return {
    rows,
    meta: {
      mode: 'criterion',
      criterionId,
      criterionLabel: criterion?.label || criterionId,
      estimatedTotalItems: Number(payload.stats?.overallcount ?? payload.stats?.matchedItems ?? rows.length),
      truncated: payload.page?.complete === false
    } satisfies RecordSearchMeta
  };
}

export async function requestRecordMailDraftFrontend(options: {
  row: RecordRow;
  selectedCriterionId?: string;
}) {
  const runtime = getRuntimeConfig();
  const { row, selectedCriterionId = '' } = options;

  const relevantIds = selectedCriterionId && row.missingCriteria.includes(selectedCriterionId)
    ? [selectedCriterionId]
    : row.missingCriteria;

  const issues = relevantIds
    .map((criterionId) => {
      const criterion = qualityCriteria.find((entry) => entry.id === criterionId);
      if (!criterion) return null;
      return {
        criterionId,
        label: criterion.label,
        problem: criterion.label,
        recommendation: criterion.recommendation || 'Datensatz prüfen und fehlende Angaben ergänzen.'
      };
    })
    .filter(Boolean);

  return fetchJson<{
    to: string;
    cc?: string[];
    bcc?: string[];
    subject?: string;
    body?: string;
  }>(runtime.oiMailDraftApiBase, {
    method: 'POST',
    timeoutMs: 45_000,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      record: {
        id: row.id,
        globalId: row.globalId,
        type: row.type,
        title: row.title,
        city: row.city,
        region: row.region,
        email: row.email,
        web: row.web,
        et4Url: ''
      },
      issueContext: {
        source: selectedCriterionId ? 'records-filter' : 'records',
        criterionId: selectedCriterionId,
        criterionLabel: row.primaryIssue || ''
      },
      issues
    })
  });
}
