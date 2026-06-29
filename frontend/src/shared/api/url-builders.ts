export function buildSearchApiUrl(apiBase: string, type: string, query: string, options: {
  limit?: number;
  offset?: number;
  isOpenData?: boolean;
} = {}) {
  const params = new URLSearchParams();
  params.set('type', type);
  params.set('limit', String(options.limit ?? 1));
  if (query) params.set('query', query);
  if (options.isOpenData === true) params.set('isOpenData', 'true');
  if (options.isOpenData === false) params.set('isOpenData', 'false');
  if (Number.isFinite(options.offset) && Number(options.offset) > 0) {
    params.set('offset', String(options.offset));
  }
  return `${apiBase}?${params.toString()}`;
}
