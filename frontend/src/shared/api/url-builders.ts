type SearchFilterValue = string | string[] | undefined;

type StructuredSearchFilters = {
  area?: SearchFilterValue;
  city?: SearchFilterValue;
  category?: SearchFilterValue;
  feature?: SearchFilterValue;
  keyword?: SearchFilterValue;
  zip?: SearchFilterValue;
  globalId?: SearchFilterValue;
  id?: SearchFilterValue;
  excludeArea?: SearchFilterValue;
  excludeCity?: SearchFilterValue;
  excludeCategory?: SearchFilterValue;
  excludeFeature?: SearchFilterValue;
  excludeKeyword?: SearchFilterValue;
  categoryOperator?: 'AND' | 'OR';
  featureOperator?: 'AND' | 'OR';
};

function appendStructuredFilters(params: URLSearchParams, filters: StructuredSearchFilters = {}) {
  Object.entries(filters).forEach(([name, rawValue]) => {
    const values = Array.isArray(rawValue) ? rawValue : [rawValue];
    values.filter(Boolean).forEach((value) => params.append(name, String(value)));
  });
}

export function buildSearchApiUrl(apiBase: string, type: string, query: string, options: {
  limit?: number;
  offset?: number;
  isOpenData?: boolean;
  openDataOnly?: boolean;
  countOnly?: boolean;
  filters?: StructuredSearchFilters;
} = {}) {
  const params = new URLSearchParams();
  params.set('action', 'search');
  params.set('type', type);
  params.set('limit', String(options.limit ?? 1));
  if (query) params.set('query', query);
  if (options.isOpenData === true) params.set('isOpenData', 'true');
  if (options.isOpenData === false) params.set('isOpenData', 'false');
  if (options.openDataOnly === true) params.set('isOpenData', 'true');
  if (options.countOnly === true) params.set('countOnly', 'true');
  appendStructuredFilters(params, options.filters);
  if (Number.isFinite(options.offset) && Number(options.offset) > 0) {
    params.set('offset', String(options.offset));
  }
  return `${apiBase}?${params.toString()}`;
}
