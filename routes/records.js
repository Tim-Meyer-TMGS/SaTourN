import fetch from 'node-fetch';

import {
  API_KEY,
  BASE_URL,
  EXPERIENCE,
  REQUEST_TIMEOUT_MS,
  TEMPLATE
} from '../lib/config.js';
import { buildSearchUrl } from '../lib/search-utils.js';

const TYPES = ['POI', 'Tour', 'Hotel', 'Event', 'Gastro', 'Package'];
const MAX_IDS = 50;

function normalizeGlobalIds(input) {
  return Array.from(new Set(
    (Array.isArray(input) ? input : [])
      .map((entry) => String(entry || '').trim())
      .filter((entry) => /^[A-Za-z]+_\d+$/.test(entry))
  )).slice(0, MAX_IDS);
}

async function fetchSearchPayload({ type, query, limit = 5 }) {
  const targetUrl = buildSearchUrl({
    baseUrl: BASE_URL,
    experience: EXPERIENCE,
    template: TEMPLATE,
    type,
    qParam: query,
    limit,
    offset: 0,
    apiKey: API_KEY
  });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(targetUrl, {
      signal: controller.signal,
      headers: { Accept: 'application/json,*/*;q=0.8' }
    });
    const text = await response.text();
    if (!response.ok) throw new Error(`Search upstream error ${response.status}: ${text.slice(0, 500)}`);
    return JSON.parse(text.trim());
  } finally {
    clearTimeout(timeout);
  }
}

function extractItems(payload) {
  return payload?.items || payload?.Items || payload?.results || payload?.Results || [];
}

function extractId(value) {
  return value?.id ?? value?.ID ?? value?.Id ?? '';
}

function getField(obj, path) {
  return path.split('.').reduce((current, key) => (current && current[key] != null ? current[key] : undefined), obj);
}

function findMatchingItem(items, globalId, identifier) {
  return items.find((item) => {
    const itemId = String(extractId(item) || '').trim();
    const itemGlobalId = String(getField(item, 'global_id') || getField(item, 'globalId') || '').trim();
    return itemGlobalId === globalId || itemId === identifier || itemGlobalId === identifier;
  }) || null;
}

function getIdFromGlobalId(globalId) {
  const match = String(globalId || '').trim().match(/^[a-z]+_(\d+)$/i);
  return match ? match[1] : '';
}

async function resolveRecordByGlobalId(globalId, preferredType = '') {
  const identifier = getIdFromGlobalId(globalId);
  const variants = [
    `global_id:"${globalId}"`,
    globalId,
    identifier ? `id:"${identifier}"` : '',
    identifier
  ].filter(Boolean);
  const targetTypeGroups = preferredType ? [[preferredType], TYPES.filter((type) => type !== preferredType)] : [TYPES];

  for (const targetTypes of targetTypeGroups) {
    for (const type of targetTypes) {
      for (const variant of variants) {
        try {
          const payload = await fetchSearchPayload({ type, query: variant, limit: 5 });
          const item = findMatchingItem(extractItems(payload), globalId, identifier);
          if (item) return { ...item, _resolvedType: type };
        } catch (error) {
          console.warn('Record by global id lookup failed.', globalId, type, error.message || error);
        }
      }
    }
  }
  return null;
}

export function registerRecordRoutes(app) {
  app.post('/api/records/by-global-ids', async (req, res) => {
    if (!API_KEY) {
      return res.status(500).json({ error: 'Server configuration missing: LICENSEKEY' });
    }

    const preferredType = String(req.body?.type || '').trim();
    const globalIds = normalizeGlobalIds(req.body?.globalIds);

    if (!globalIds.length) {
      return res.json({ items: [], missingGlobalIds: [] });
    }

    const resolved = [];
    const missingGlobalIds = [];

    for (const globalId of globalIds) {
      const item = await resolveRecordByGlobalId(globalId, preferredType);
      if (item) {
        resolved.push(item);
      } else {
        missingGlobalIds.push(globalId);
      }
    }

    return res.json({
      items: resolved,
      missingGlobalIds
    });
  });
}
