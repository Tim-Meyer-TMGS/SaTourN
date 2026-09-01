import fetch from 'node-fetch';

import {
  API_KEY,
  BASE_URL,
  COUNT_TEMPLATE,
  EXPERIENCE,
  OPEN_DATA_EXPERIENCE,
  REQUEST_TIMEOUT_MS,
  TEMPLATE
} from '../lib/config.js';
import {
  applyOpenDataFilter,
  buildStructuredFilterQuery,
  buildAutocompleteUrl,
  buildSearchUrl,
  combineSearchQueries,
  computeFinalLimit,
  isCitiesRequest,
  normalizeMetaSearchType,
  normalizeOffsetParam,
  parseMetaResponseText
} from '../lib/search-utils.js';

export function registerSearchRoute(app, cache) {
  app.get('/api/autocomplete', async (req, res) => {
    const {
      type = '',
      term = '',
      limit = '8',
      mode = 'jquery',
      mkt = 'de'
    } = req.query;

    if (!API_KEY) {
      console.error('DESTINATION_ONE_API_KEY, LICENSEKEY or LICENSE_KEY is missing');
      return res.status(500).json({ error: 'Server configuration missing: LICENSEKEY' });
    }

    const cleanTerm = String(Array.isArray(term) ? term[0] : term || '').trim();
    if (cleanTerm.length < 2) return res.json([]);

    const requestedLimit = Number.parseInt(Array.isArray(limit) ? limit[0] : limit, 10);
    const finalLimit = Number.isFinite(requestedLimit) ? Math.max(1, Math.min(requestedLimit, 10)) : 8;
    const cleanType = String(Array.isArray(type) ? type[0] : type || '').trim();
    const cleanMode = String(Array.isArray(mode) ? mode[0] : mode || 'jquery').trim();
    const cleanMarket = String(Array.isArray(mkt) ? mkt[0] : mkt || 'de').trim();

    const targetUrl = buildAutocompleteUrl({
      baseUrl: BASE_URL,
      experience: EXPERIENCE,
      type: cleanType,
      term: cleanTerm,
      limit: finalLimit,
      apiKey: API_KEY,
      mode: cleanMode,
      market: cleanMarket
    });

    const cached = cache.get(targetUrl);
    if (cached) return res.type('application/json').send(cached);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(targetUrl, {
        signal: controller.signal,
        headers: { Accept: 'application/json,*/*;q=0.8' }
      });
      const text = await response.text();

      if (!response.ok) {
        console.error('Destination.One autocomplete upstream error:', response.status, text.slice(0, 500));
        return res.status(response.status).json({
          error: 'Upstream error',
          details: text.slice(0, 500)
        });
      }

      try {
        JSON.parse(text.trim());
      } catch {
        console.error('Destination.One autocomplete returned non-JSON:', text.slice(0, 500));
        return res.status(502).json({
          error: 'Upstream did not return JSON',
          details: text.slice(0, 500)
        });
      }

      cache.set(targetUrl, text);
      return res.type('application/json').send(text);
    } catch (error) {
      const isAbort = error && (error.name === 'AbortError' || /aborted|timeout/i.test(String(error)));
      console.error('Destination.One autocomplete fetch error:', error);
      return res.status(isAbort ? 504 : 500).json({
        error: isAbort ? 'Upstream timeout' : 'Fetch error'
      });
    } finally {
      clearTimeout(timeout);
    }
  });

  app.get('/api/search', async (req, res) => {
    const {
      type,
      query = '',
      isOpenData = '',
      openDataPublished = '',
      countOnly = '',
      limit,
      offset,
      scope,
      forceCities
    } = req.query;

    const usePublishedOpenData = String(openDataPublished || '').toLowerCase() === 'true';
    if (!usePublishedOpenData && !API_KEY) {
      console.error('DESTINATION_ONE_API_KEY, LICENSEKEY or LICENSE_KEY is missing');
      return res.status(500).json({ error: 'Server configuration missing: LICENSEKEY' });
    }

    const structuredQuery = buildStructuredFilterQuery(req.query);
    const userQuery = combineSearchQueries(query, structuredQuery);
    if (userQuery.length > 4000) {
      return res.status(400).json({ error: 'Search query is too long' });
    }
    const qParam = applyOpenDataFilter(userQuery, usePublishedOpenData ? '' : isOpenData);
    const isCountOnly = String(countOnly || '').toLowerCase() === 'true';
    const normalizedType = normalizeMetaSearchType(type);
    if (!normalizedType) {
      return res.status(400).json({ error: 'Unsupported Destination.One type' });
    }

    const cities = isCitiesRequest({
      scope,
      type: normalizedType,
      qParam,
      forceCities: String(forceCities || '') === '1'
    });

    const finalLimit = isCountOnly ? 1 : computeFinalLimit({ requestedLimit: limit, isCities: cities });
    const finalOffset = normalizeOffsetParam(offset);

    const targetUrl = buildSearchUrl({
      baseUrl: BASE_URL,
      experience: usePublishedOpenData ? OPEN_DATA_EXPERIENCE : EXPERIENCE,
      template: isCountOnly ? COUNT_TEMPLATE : TEMPLATE,
      type: normalizedType,
      qParam,
      limit: finalLimit,
      offset: finalOffset,
      apiKey: usePublishedOpenData ? '' : API_KEY
    });

    res.setHeader('X-Final-Limit', String(finalLimit));
    res.setHeader('X-Final-Offset', String(finalOffset));
    res.setHeader('X-Is-Cities', String(cities));

    const cacheKey = cities ? targetUrl : null;
    if (cacheKey) {
      const cached = cache.get(cacheKey);
      if (cached) return res.type('application/json').send(cached);
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(targetUrl, {
        signal: controller.signal,
        headers: { Accept: 'application/json,*/*;q=0.8' }
      });
      const text = await response.text();

      if (!response.ok) {
        console.error('Destination.One upstream error:', response.status, text.slice(0, 500));
        return res.status(response.status).json({
          error: 'Upstream error',
          details: text.slice(0, 500)
        });
      }

      try {
        parseMetaResponseText(text);
      } catch (parseError) {
        console.error('Destination.One returned an invalid META response:', parseError.metaStatus || parseError.message);
        return res.status(502).json({
          error: 'Invalid upstream response',
          upstreamStatus: parseError.metaStatus || 'INVALID_JSON'
        });
      }

      if (cacheKey) cache.set(cacheKey, text);
      return res.type('application/json').send(text);
    } catch (error) {
      const isAbort = error && (error.name === 'AbortError' || /aborted|timeout/i.test(String(error)));
      console.error('Destination.One fetch error:', error);
      return res.status(isAbort ? 504 : 500).json({
        error: isAbort ? 'Upstream timeout' : 'Fetch error'
      });
    } finally {
      clearTimeout(timeout);
    }
  });
}
