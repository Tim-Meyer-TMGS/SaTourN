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

function normalizeRecordIdentifiers(input) {
  return Array.from(new Set(
    (Array.isArray(input) ? input : [])
      .map((entry) => String(entry || '').trim())
      .filter((entry) => /^\d+$/.test(entry) || /^[A-Za-z]+_\d+$/.test(entry))
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

async function resolveRecordByIdentifier(identifier, preferredType = '') {
  const normalized = String(identifier || '').trim();
  const derivedId = getIdFromGlobalId(normalized);
  const numericId = /^\d+$/.test(normalized) ? normalized : derivedId;
  const globalId = /^[A-Za-z]+_\d+$/.test(normalized) ? normalized : '';
  const variants = [
    globalId ? `global_id:"${globalId}"` : '',
    globalId,
    numericId ? `id:"${numericId}"` : '',
    numericId,
    normalized
  ].filter(Boolean);
  const targetTypeGroups = preferredType ? [[preferredType], TYPES.filter((type) => type !== preferredType)] : [TYPES];

  for (const targetTypes of targetTypeGroups) {
    for (const type of targetTypes) {
      for (const variant of variants) {
        try {
          const payload = await fetchSearchPayload({ type, query: variant, limit: 5 });
          const item = findMatchingItem(extractItems(payload), globalId, numericId || normalized);
          if (item) return { ...item, _resolvedType: type };
        } catch (error) {
          console.warn('Record lookup by identifier failed.', normalized, type, error.message || error);
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
    const ids = normalizeRecordIdentifiers(req.body?.ids);
    const globalIds = normalizeRecordIdentifiers(req.body?.globalIds);
    const identifiers = Array.from(new Set([...ids, ...globalIds])).slice(0, MAX_IDS);

    if (!identifiers.length) {
      return res.json({ items: [], missingIds: [] });
    }

    const resolved = [];
    const missingIds = [];

    for (const identifier of identifiers) {
      const item = await resolveRecordByIdentifier(identifier, preferredType);
      if (item) {
        resolved.push(item);
      } else {
        missingIds.push(identifier);
      }
    }

    return res.json({
      items: resolved,
      missingIds
    });
  });
}
