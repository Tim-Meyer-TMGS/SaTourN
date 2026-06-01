import fetch from 'node-fetch';

import {
  API_KEY,
  BASE_URL,
  EXPERIENCE,
  REQUEST_TIMEOUT_MS,
  TEMPLATE
} from '../lib/config.js';
import {
  buildSearchUrl,
  computeFinalLimit,
  isCitiesRequest,
  isCitySearchQuery,
  normalizeQueryParam
} from '../lib/search-utils.js';

const OPEN_DATA_LICENSE_QUERY = '(attribute_license:CC0 OR attribute_license:CC-BY OR attribute_license:CC-BY-SA)';

export function registerSearchRoute(app, cache) {
  app.get('/api/search', async (req, res) => {
    const { type, query = '', isOpenData = 'false', limit, scope, forceCities } = req.query;

    if (!API_KEY) {
      console.error('DESTINATION_ONE_API_KEY, LICENSEKEY or LICENSE_KEY is missing');
      return res.status(500).json({ error: 'Server configuration missing: LICENSEKEY' });
    }

    let qParam = normalizeQueryParam(query);
    if (String(isOpenData).toLowerCase() === 'true') {
      qParam = qParam
        ? `${qParam} AND ${OPEN_DATA_LICENSE_QUERY}`
        : OPEN_DATA_LICENSE_QUERY;
    }

    const cities = isCitiesRequest({
      scope,
      type,
      qParam,
      forceCities: String(forceCities || '') === '1'
    });

    const finalLimit = computeFinalLimit({ requestedLimit: limit, isCities: cities });

    const targetUrl = buildSearchUrl({
      baseUrl: BASE_URL,
      experience: EXPERIENCE,
      template: TEMPLATE,
      type,
      qParam,
      limit: finalLimit,
      apiKey: API_KEY
    });

    const diagnostics = {
      scope: scope || null,
      type: (type || '').trim() || null,
      requestedLimit: limit || null,
      isCities: cities,
      reason: {
        scope: String(scope || '').toLowerCase().trim() === 'cities',
        type: String(type || '').toLowerCase().trim(),
        heuristics: isCitySearchQuery(qParam),
        forceCities: String(forceCities || '') === '1'
      },
      finalLimit
    };

    console.log('/api/search', JSON.stringify(diagnostics));

    res.setHeader('X-Final-Limit', String(finalLimit));
    res.setHeader('X-Is-Cities', String(cities));

    const cacheKey = cities ? targetUrl : null;
    if (cacheKey) {
      const cached = cache.get(cacheKey);
      if (cached) return res.type('application/xml').send(cached);
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(targetUrl, { signal: controller.signal });
      const text = await response.text();

      if (!response.ok) {
        console.error('Destination.One upstream error:', response.status, text.slice(0, 500));
        return res.status(response.status).json({
          error: 'Upstream error',
          details: text.slice(0, 500)
        });
      }

      if (cacheKey) cache.set(cacheKey, text);
      return res.type('application/xml').send(text);
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
