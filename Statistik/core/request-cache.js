function cloneJsonValue(value) {
  if (value == null) return value;
  return JSON.parse(JSON.stringify(value));
}

export function createRequestCache({
  fetchJson,
  fetchJsonOptional,
  locationObject,
  shouldForceFresh,
  ttlConfig
}) {
  const transientRequestCache = new Map();
  const transientRequestInflight = new Map();

  function clear() {
    transientRequestCache.clear();
    transientRequestInflight.clear();
  }

  function getCacheTtl(url) {
    try {
      const parsed = new URL(url, locationObject.href);
      if (/\/api\/quality\/snapshot$/.test(parsed.pathname)) return ttlConfig.qualitySnapshot;
      if (/\/api\/quality\/list$/.test(parsed.pathname)) return ttlConfig.qualityList;
      if (/\/api\/quality\/count$/.test(parsed.pathname)) return ttlConfig.qualityCount;
      if (/\/api\/quality\/scan$/.test(parsed.pathname)) return ttlConfig.qualityScan;
      if (/\/api\/autocomplete$/.test(parsed.pathname)) return ttlConfig.autocomplete;
      if (/\/api\/search$/.test(parsed.pathname) && parsed.searchParams.get('limit') === '1') return ttlConfig.searchCount;
    } catch {
      return 0;
    }
    return 0;
  }

  async function fetchCached(url, options = {}) {
    const {
      optional404 = false,
      forceFresh = shouldForceFresh(),
      cacheTtlMs = getCacheTtl(url),
      method = 'GET',
      headers,
      body,
      timeout,
      signal
    } = options;
    const isCacheableRequest = String(method || 'GET').toUpperCase() === 'GET';
    const cacheKey = isCacheableRequest ? url : '';

    if (!forceFresh && isCacheableRequest && cacheTtlMs > 0) {
      const cached = transientRequestCache.get(cacheKey);
      if (cached && cached.expiresAt > Date.now()) return cloneJsonValue(cached.value);
      const inflight = transientRequestInflight.get(cacheKey);
      if (inflight) return cloneJsonValue(await inflight);
    }

    const request = (async () => {
      const payload = optional404
        ? await fetchJsonOptional(url, { method, headers, body, timeout, signal })
        : await fetchJson(url, { method, headers, body, timeout, signal });
      if (isCacheableRequest && cacheTtlMs > 0) {
        transientRequestCache.set(cacheKey, {
          value: cloneJsonValue(payload),
          expiresAt: Date.now() + cacheTtlMs
        });
      }
      return payload;
    })();

    if (!forceFresh && isCacheableRequest && cacheTtlMs > 0) transientRequestInflight.set(cacheKey, request);

    try {
      return cloneJsonValue(await request);
    } finally {
      if (cacheKey) transientRequestInflight.delete(cacheKey);
    }
  }

  return {
    clear,
    fetch: fetchCached,
    getCacheTtl
  };
}
