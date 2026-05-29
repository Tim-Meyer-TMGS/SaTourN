import fetch from 'node-fetch';

import {
  DZT_LICENSEKEY,
  KG_DS_LIST_URL,
  KG_LANG,
  REQUEST_TIMEOUT_MS
} from '../lib/config.js';

const KG_BASE = 'https://proxy.opendatagermany.io/api/ts';
const MAX_PAGE_SIZE = 25;

const sanitizePositiveInt = (value, fallback, max) => {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return Math.min(parsed, max);
};

async function fetchJsonWithTimeout(url, headers) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, { headers, signal: controller.signal });
    const text = await response.text();

    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        body: { error: 'Upstream error', details: text.slice(0, 500) }
      };
    }

    try {
      return { ok: true, status: response.status, body: JSON.parse(text) };
    } catch {
      return {
        ok: false,
        status: 502,
        body: { error: 'Invalid upstream JSON' }
      };
    }
  } finally {
    clearTimeout(timeout);
  }
}

function kgHeaders({ inLang = KG_LANG, page, pageSize, hop } = {}) {
  const headers = {
    'x-api-key': DZT_LICENSEKEY,
    accept: 'application/json'
  };

  if (inLang) headers.inLang = String(inLang);
  if (page) headers.page = String(page);
  if (pageSize) headers['page-size'] = String(pageSize);
  if (hop) headers['x-hop'] = String(hop);

  return headers;
}

export function registerKgRoutes(app, cache) {
  app.get('/api/kg/things', async (req, res) => {
    if (!DZT_LICENSEKEY) {
      return res.status(500).json({ error: 'Server configuration missing: DZT_LICENSEKEY' });
    }

    const kw = String(req.query.kw || '').trim().slice(0, 160);
    const inLang = String(req.query.inLang || KG_LANG).slice(0, 8);
    const page = sanitizePositiveInt(req.query.page, 1, 500);
    const pageSize = sanitizePositiveInt(req.query.pageSize || req.query['page-size'], 10, MAX_PAGE_SIZE);

    const url = new URL(`${KG_BASE}/v2/kg/things`);
    if (kw) url.searchParams.set('kw', kw);
    url.searchParams.set('filterDsList', KG_DS_LIST_URL);

    const cacheKey = `kg:list:${inLang}:${page}:${pageSize}:${kw}`;
    const cached = cache.get(cacheKey);
    if (cached) return res.json(cached);

    let upstream;
    try {
      upstream = await fetchJsonWithTimeout(url, kgHeaders({ inLang, page, pageSize }));
    } catch (error) {
      const isAbort = error && (error.name === 'AbortError' || /aborted|timeout/i.test(String(error)));
      return res.status(isAbort ? 504 : 500).json({
        error: isAbort ? 'Upstream timeout' : 'Fetch error'
      });
    }

    if (!upstream.ok) return res.status(upstream.status).json(upstream.body);

    cache.set(cacheKey, upstream.body);
    return res.json(upstream.body);
  });

  app.get('/api/kg/things/:id', async (req, res) => {
    if (!DZT_LICENSEKEY) {
      return res.status(500).json({ error: 'Server configuration missing: DZT_LICENSEKEY' });
    }

    const id = String(req.params.id || '').trim();
    const ns = String(req.query.ns || '').trim();
    const inLang = String(req.query.inLang || KG_LANG).slice(0, 8);
    const hop = sanitizePositiveInt(req.query.hop || req.query['x-hop'], 3, 10);

    if (!id || !ns || !/^https?:\/\//i.test(ns)) {
      return res.status(400).json({ error: 'Missing or invalid KG id/ns' });
    }

    const url = new URL(`${KG_BASE}/v1/kg/things/${encodeURIComponent(id)}`);
    url.searchParams.set('ns', ns);

    const cacheKey = `kg:thing:${inLang}:${hop}:${ns}:${id}`;
    const cached = cache.get(cacheKey);
    if (cached) return res.json(cached);

    let upstream;
    try {
      upstream = await fetchJsonWithTimeout(url, kgHeaders({ inLang, hop }));
    } catch (error) {
      const isAbort = error && (error.name === 'AbortError' || /aborted|timeout/i.test(String(error)));
      return res.status(isAbort ? 504 : 500).json({
        error: isAbort ? 'Upstream timeout' : 'Fetch error'
      });
    }

    if (!upstream.ok) return res.status(upstream.status).json(upstream.body);

    cache.set(cacheKey, upstream.body);
    return res.json(upstream.body);
  });
}
