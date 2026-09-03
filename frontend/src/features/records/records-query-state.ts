import type { RecordsQuery } from './records-types';

const list = (params: URLSearchParams, key: string) => Array.from(new Set(
  (params.get(key) || '').split(',').map((value) => value.trim()).filter(Boolean)
));

const positive = (value: string | null, fallback: number) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

export function readRecordsQuery(params: URLSearchParams): RecordsQuery {
  return {
    q: params.get('q') || '',
    mode: params.get('mode') === 'ai_search' ? 'ai_search' : 'search',
    types: list(params, 'types').length ? list(params, 'types') : list(params, 'type'),
    categoryIds: list(params, 'categoryIds').length ? list(params, 'categoryIds') : list(params, 'categoryId'),
    categories: list(params, 'categories').length ? list(params, 'categories') : list(params, 'category'),
    authorships: list(params, 'authorships').length ? list(params, 'authorships') : list(params, 'authorship'),
    criterionIds: list(params, 'criterionIds').length ? list(params, 'criterionIds') : list(params, 'criterionId'),
    areaIds: list(params, 'areaIds'),
    city: params.get('city') || '',
    nonOpenData: params.get('list') === 'non_open_data' || params.get('nonOpenData') === 'true',
    page: positive(params.get('page'), 1),
    pageSize: Math.min(100, positive(params.get('pageSize'), 25))
  };
}

export function updateRecordsQuery(params: URLSearchParams, patch: Partial<RecordsQuery>) {
  const next = new URLSearchParams(params);
  const keys: Array<keyof RecordsQuery> = ['q', 'mode', 'types', 'categoryIds', 'categories', 'authorships', 'criterionIds', 'areaIds', 'city', 'nonOpenData', 'page', 'pageSize'];
  const names: Record<keyof RecordsQuery, string> = {
    q: 'q', mode: 'mode', types: 'types', categoryIds: 'categoryIds', categories: 'category', authorships: 'authorship',
    criterionIds: 'criterionIds', areaIds: 'areaIds', city: 'city', nonOpenData: 'nonOpenData', page: 'page', pageSize: 'pageSize'
  };
  keys.forEach((key) => {
    if (!(key in patch)) return;
    const value = patch[key];
    const name = names[key];
    if (Array.isArray(value)) {
      if (value.length) next.set(name, value.join(',')); else next.delete(name);
    } else if (typeof value === 'boolean') {
      if (value) next.set(name, 'true'); else next.delete(name);
    } else if (value && !(key === 'page' && value === 1) && !(key === 'pageSize' && value === 25) && !(key === 'mode' && value === 'search')) {
      next.set(name, String(value));
    } else {
      next.delete(name);
    }
  });
  return next;
}
