import { evaluateAllItems, qualityCriteria } from '../../../../Statistik/quality.js';

import { fetchJson } from '../../shared/api/http-client';
import { getRuntimeConfig } from '../../shared/api/runtime-config';
import { buildSearchApiUrl } from '../../shared/api/url-builders';
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

type ResolvedPayload = {
  items?: Array<{ raw?: unknown; _resolvedType?: string; type?: string } | unknown>;
};

const RECORD_TYPES = ['POI', 'Tour', 'Hotel', 'Event', 'Gastro', 'Package'] as const;

function cleanQueryValue(value: string) {
  return String(value || '').replaceAll('"', '').trim();
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

function extractId(raw: unknown) {
  if (!raw || typeof raw !== 'object') return '';
  const item = raw as Record<string, unknown>;
  return String(item.id ?? item.ID ?? item.Id ?? '');
}

function getNestedValue(source: unknown, path: string): unknown {
  if (!source || !path) return null;

  return path
    .replace(/\[(\w+)\]/g, '.$1')
    .split('.')
    .filter(Boolean)
    .reduce<unknown>((current, segment) => {
      if (!current || typeof current !== 'object') return null;
      return (current as Record<string, unknown>)[segment] ?? null;
    }, source);
}

function textValue(value: unknown): string {
  if (value == null) return '';
  if (Array.isArray(value)) return value.map(textValue).find(Boolean) || '';
  if (typeof value === 'object') {
    const candidate = value as Record<string, unknown>;
    return (
      textValue(candidate.title)
      || textValue(candidate.name)
      || textValue(candidate.label)
      || textValue(candidate.value)
      || textValue(candidate.text)
      || ''
    );
  }
  return String(value).trim();
}

function getFirst(raw: unknown, paths: string[]) {
  for (const path of paths) {
    const text = textValue(getNestedValue(raw, path));
    if (text) return text;
  }
  return '';
}

function getCategory(raw: unknown) {
  const categories = getNestedValue(raw, 'categories');
  if (Array.isArray(categories)) return categories.map((entry) => textValue(entry)).find(Boolean) || '';
  return textValue(categories);
}

function getArea(raw: unknown, fallbackArea: string) {
  const areas = getNestedValue(raw, 'areas');
  if (Array.isArray(areas)) return areas.map((entry) => textValue(entry)).find(Boolean) || fallbackArea;
  return textValue(areas) || fallbackArea;
}

function getRecordEmail(raw: unknown) {
  return getFirst(raw, ['email', 'emailRequest', 'address.email', 'addresses.email', 'addresses_mail.email']);
}

function getRecordWeb(raw: unknown) {
  return getFirst(raw, ['web', 'url', 'website', 'address.web', 'addresses.web']);
}

function buildRecordDetailUrl(item: { type?: unknown; globalId?: unknown; id?: unknown }) {
  const params = new URLSearchParams();
  const type = String(item.type || '');
  const globalId = String(item.globalId || '');
  const id = String(item.id || '');

  if (type) params.set('type', type);
  if (globalId) params.set('global_id', globalId);
  else if (id) params.set('id', id);

  return `/record-detail?${params.toString()}`;
}

function normalizeSearchItem(raw: unknown, fallbackType: string, context: WorkContext) {
  const globalId = getFirst(raw, ['global_id', 'globalId']);
  const resolvedType = fallbackType || getFirst(raw, ['type', 'typeName']);

  return {
    raw,
    id: extractId(raw),
    globalId,
    title: getFirst(raw, ['title', 'name', 'presentation.title']) || 'Ohne Titel',
    type: resolvedType,
    region: getArea(raw, context.area),
    city: getFirst(raw, ['city', 'location.city', 'address.city']) || context.city || '',
    category: getCategory(raw),
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

  const payloads = await Promise.all(targetTypes.map(async (type) => {
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

async function loadAiSearch(prompt: string, context: WorkContext, selectedType: string) {
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
  const normalized = resolvedItems.map((entry) => {
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
