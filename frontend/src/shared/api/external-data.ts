import { fetchJson } from './http-client';
import { buildSearchApiUrl } from './url-builders';
import {
  buildQualityEvaluationInput,
  buildRecordDetailUrl
} from '../records/record-fields';

type SearchPayload = {
  items?: unknown[];
  Items?: unknown[];
  results?: unknown[];
  Results?: unknown[];
  overallcount?: number;
  OverallCount?: number;
};

export type RandomSampleItem = ReturnType<typeof buildQualityEvaluationInput> & {
  detailUrl: string;
};

export type RandomSampleResult = {
  items: RandomSampleItem[];
  requested: number;
  available: number;
};

export type OutdooractiveResult = Record<string, unknown>;

function extractItems(payload: SearchPayload | null | undefined) {
  return payload?.items || payload?.Items || payload?.results || payload?.Results || [];
}

function extractTotal(payload: SearchPayload | null | undefined) {
  const total = Number(payload?.overallcount ?? payload?.OverallCount ?? 0);
  return Number.isFinite(total) ? Math.max(0, total) : 0;
}

function shuffle<T>(values: T[]) {
  const result = [...values];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const target = Math.floor(Math.random() * (index + 1));
    [result[index], result[target]] = [result[target], result[index]];
  }
  return result;
}

function distributeTarget(targetCount: number, types: string[]) {
  const base = Math.floor(targetCount / types.length);
  let remainder = targetCount - (base * types.length);
  return types.map((type) => {
    const count = base + (remainder > 0 ? 1 : 0);
    remainder = Math.max(0, remainder - 1);
    return { type, count };
  });
}

async function loadTypeSample(options: {
  apiBase: string;
  type: string;
  count: number;
  query: string;
  openDataOnly: boolean;
  signal?: AbortSignal;
}) {
  const { apiBase, type, count, query, openDataOnly, signal } = options;
  if (count <= 0) return { items: [] as RandomSampleItem[], total: 0 };

  const countPayload = await fetchJson<SearchPayload>(
    buildSearchApiUrl(apiBase, type, query, { countOnly: true, openDataOnly }),
    { signal }
  );
  const total = extractTotal(countPayload);
  if (!total) return { items: [] as RandomSampleItem[], total };

  const candidateCount = Math.min(total, Math.max(count, Math.min(500, count * 2)));
  let remaining = candidateCount;
  let offset = Math.floor(Math.random() * total);
  const requests: Array<Promise<SearchPayload>> = [];

  while (remaining > 0) {
    const limit = Math.min(200, remaining, total - offset);
    requests.push(fetchJson<SearchPayload>(
      buildSearchApiUrl(apiBase, type, query, { limit, offset, openDataOnly }),
      { signal }
    ));
    remaining -= limit;
    offset = (offset + limit) % total;
  }

  const payloads = await Promise.all(requests);

  const candidates = payloads.flatMap(extractItems);
  const normalized = shuffle(candidates).slice(0, count).map((raw) => {
    const item = buildQualityEvaluationInput(raw, { fallbackType: type });
    return {
      ...item,
      detailUrl: buildRecordDetailUrl(item)
    };
  });

  return { items: normalized, total };
}

export async function loadRandomSample(options: {
  apiBase: string;
  types: string[];
  targetCount: number;
  query: string;
  openDataOnly: boolean;
  signal?: AbortSignal;
}): Promise<RandomSampleResult> {
  const { apiBase, types, targetCount, query, openDataOnly, signal } = options;
  const plan = distributeTarget(targetCount, types);
  const results = await Promise.all(plan.map(({ type, count }) => loadTypeSample({
    apiBase,
    type,
    count,
    query,
    openDataOnly,
    signal
  })));

  const seen = new Set<string>();
  const items = shuffle(results.flatMap((result) => result.items)).filter((item) => {
    const key = item.globalId || `${item.type}:${item.id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return {
    items,
    requested: targetCount,
    available: results.reduce((sum, result) => sum + result.total, 0)
  };
}

function parseOutdooractiveResponse(text: string) {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

export async function loadOutdooractiveData(options: {
  projectKey: string;
  apiKey: string;
  display: 'verbose' | 'snippet';
  ids: string[];
  signal?: AbortSignal;
}): Promise<OutdooractiveResult> {
  const { projectKey, apiKey, display, ids, signal } = options;
  const results: OutdooractiveResult = {};
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < ids.length) {
      const id = ids[nextIndex];
      nextIndex += 1;
      const url = new URL(
        `https://api-oa.com/api/v2/project/${encodeURIComponent(projectKey)}/contents/${encodeURIComponent(id)}`
      );
      url.searchParams.set('display', display);
      url.searchParams.set('format', 'json');
      url.searchParams.set('key', apiKey);

      try {
        const response = await fetch(url, {
          method: 'GET',
          headers: { Accept: 'application/json' },
          cache: 'no-store',
          signal
        });
        const text = await response.text();
        results[id] = response.ok
          ? parseOutdooractiveResponse(text)
          : { _error: true, status: response.status, body: text };
      } catch (error) {
        if (signal?.aborted) throw error;
        results[id] = {
          _error: true,
          status: 0,
          body: error instanceof Error ? error.message : String(error)
        };
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(4, ids.length) }, () => worker()));
  return results;
}
