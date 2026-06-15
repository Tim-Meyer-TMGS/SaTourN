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
const RESOLVE_CONCURRENCY = 4;

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

function getTypeFromGlobalId(globalId) {
  const prefix = String(globalId || '').trim().match(/^([a-z]+)_\d+$/i)?.[1]?.toLowerCase() || '';
  switch (prefix) {
    case 'poi': return 'POI';
    case 'tour': return 'Tour';
    case 'hotel': return 'Hotel';
    case 'event': return 'Event';
    case 'gastro': return 'Gastro';
    case 'package': return 'Package';
    default: return '';
  }
}

function getQueryVariants({ normalized, numericId, globalId }) {
  const variants = [];
  if (globalId) variants.push(`global_id:"${globalId}"`);
  if (numericId) variants.push(`id:"${numericId}"`);
  if (globalId) variants.push(globalId);
  if (numericId) variants.push(numericId);
  if (normalized && !variants.includes(normalized)) variants.push(normalized);
  return variants;
}

function getTargetTypes({ preferredType, hintedType }) {
  const prioritized = [preferredType, hintedType]
    .map((entry) => String(entry || '').trim())
    .filter(Boolean);
  const unique = Array.from(new Set(prioritized));
  return [...unique, ...TYPES.filter((type) => !unique.includes(type))];
}

async function resolveRecordByIdentifier(identifier, preferredType = '') {
  const normalized = String(identifier || '').trim();
  const derivedId = getIdFromGlobalId(normalized);
  const numericId = /^\d+$/.test(normalized) ? normalized : derivedId;
  const globalId = /^[A-Za-z]+_\d+$/.test(normalized) ? normalized : '';
  const hintedType = getTypeFromGlobalId(globalId);
  const variants = getQueryVariants({ normalized, numericId, globalId });
  const targetTypes = getTargetTypes({ preferredType, hintedType });

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
  return null;
}

async function mapWithConcurrency(values, limit, iteratee) {
  const results = new Array(values.length);
  let index = 0;

  async function worker() {
    while (index < values.length) {
      const currentIndex = index++;
      results[currentIndex] = await iteratee(values[currentIndex], currentIndex);
    }
  }

  const workerCount = Math.max(1, Math.min(limit, values.length));
  await Promise.all(Array.from({ length: workerCount }, () => worker()));
  return results;
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

    const resolutionResults = await mapWithConcurrency(
      identifiers,
      RESOLVE_CONCURRENCY,
      async (identifier) => ({
        identifier,
        item: await resolveRecordByIdentifier(identifier, preferredType)
      })
    );

    const resolved = resolutionResults.filter((entry) => entry.item).map((entry) => entry.item);
    const missingIds = resolutionResults.filter((entry) => !entry.item).map((entry) => entry.identifier);

    return res.json({
      items: resolved,
      missingIds
    });
  });
}
