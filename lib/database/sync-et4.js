import { randomUUID } from 'node:crypto';

import { neon } from '@neondatabase/serverless';

import { buildDestinationOneImportUrl, parseDestinationOneResponse } from './destination-one.js';
import { createEt4RecordRow, extractEt4Items } from './compact-et4-record.js';
import {
  clearEt4SyncSeenIds,
  getEt4SyncState,
  markEt4SyncFailed,
  markEt4SyncStarted,
  markEt4SyncSucceeded,
  reconcileEt4FullSync,
  recordEt4SyncSeenIds,
  upsertEt4Rows
} from './neon-et4-store.js';

export const DEFAULT_ET4_SYNC_TYPES = Object.freeze([
  'POI', 'Tour', 'Hotel', 'Event', 'Gastro', 'Package', 'City', 'Area', 'Article'
]);

function parseTimestamp(value, label) {
  if (!value) return null;
  const timestamp = new Date(value);
  if (Number.isNaN(timestamp.getTime())) throw new Error(`${label} is not a valid timestamp.`);
  return timestamp;
}

function et4Timestamp(value) {
  return value.toISOString().replace(/\.\d{3}Z$/, 'Z');
}

async function fetchEt4Page(options) {
  const targetUrl = buildDestinationOneImportUrl({
    baseUrl: options.baseUrl,
    experience: options.experience,
    template: options.template,
    type: options.type,
    query: options.query,
    limit: options.limit,
    offset: options.offset,
    apiKey: options.apiKey
  });
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.requestTimeoutMs);
  try {
    const response = await fetch(targetUrl, {
      signal: controller.signal,
      headers: { Accept: 'application/json,*/*;q=0.8' }
    });
    const text = await response.text();
    if (!response.ok) throw new Error(`ET4 returned HTTP ${response.status}: ${text.slice(0, 300)}`);
    try {
      return parseDestinationOneResponse(text);
    } catch (error) {
      throw new Error(`ET4 returned no usable JSON for ${options.type}: ${text.slice(0, 300)}`, { cause: error });
    }
  } finally {
    clearTimeout(timeout);
  }
}

function totalFromPayload(payload, fallback) {
  const value = Number(payload?.overallcount ?? payload?.overallCount ?? payload?.count);
  return Number.isFinite(value) && value >= 0 ? value : fallback;
}

export async function syncEt4ToNeon(options = {}) {
  const {
    databaseUrl,
    apiKey,
    baseUrl = 'https://meta.et4.de/rest.ashx/search/',
    experience = 'statistik_sachsen',
    types = DEFAULT_ET4_SYNC_TYPES,
    explicitSince = null,
    fullSync = false,
    pageSize = 200,
    batchSize = 50,
    maxPages = 500,
    overlapMinutes = 10,
    template = 'ET2022A.json',
    requestTimeoutMs = 15000,
    log = () => {}
  } = options;

  if (!String(databaseUrl || '').trim()) throw new Error('DATABASE_URL is required.');
  if (!String(apiKey || '').trim()) throw new Error('LICENSEKEY or DESTINATION_ONE_API_KEY is required.');
  const selectedTypes = Array.from(new Set(types));
  const unsupported = selectedTypes.filter((type) => !DEFAULT_ET4_SYNC_TYPES.includes(type));
  if (unsupported.length) throw new Error(`Unsupported ET4 types: ${unsupported.join(', ')}`);

  const sql = neon(databaseUrl);
  const results = [];

  for (const recordType of selectedTypes) {
    const syncStartedAt = new Date();
    const syncToken = fullSync ? randomUUID() : null;
    const state = await getEt4SyncState(sql, { experience, recordType });
    const stateTimestamp = parseTimestamp(state?.last_changed_at, 'stored last_changed_at');
    const baseSince = parseTimestamp(explicitSince, 'explicit since') || stateTimestamp;
    if (!fullSync && !baseSince) {
      throw new Error(`No sync state exists for ${recordType}. Use a full sync or provide an explicit since value.`);
    }

    const since = baseSince ? new Date(baseSince.getTime() - overlapMinutes * 60 * 1000) : null;
    const query = fullSync ? '' : `changed:[${et4Timestamp(since)} TO ${et4Timestamp(syncStartedAt)}]`;
    await markEt4SyncStarted(sql, { experience, recordType });

    let offset = 0;
    let importedCount = 0;
    let expectedCount = null;
    let pages = 0;
    const seenPageStarts = new Set();

    try {
      while (pages < maxPages) {
        const payload = await fetchEt4Page({
          apiKey,
          baseUrl,
          experience,
          type: recordType,
          query,
          limit: pageSize,
          offset,
          template,
          requestTimeoutMs
        });
        const items = extractEt4Items(payload);
        expectedCount ??= totalFromPayload(payload, items.length);
        pages += 1;

        const pageStartId = String(items[0]?.global_id || items[0]?.id || '');
        if (pageStartId && seenPageStarts.has(pageStartId)) {
          throw new Error(`ET4 repeated a page for ${recordType} at offset ${offset}.`);
        }
        if (pageStartId) seenPageStarts.add(pageStartId);

        const rows = items.map((record) => createEt4RecordRow(record, { experience }));
        await upsertEt4Rows(sql, rows, { batchSize });
        if (syncToken) {
          await recordEt4SyncSeenIds(sql, {
            syncToken,
            experience,
            recordType,
            globalIds: rows.map((row) => row.globalId)
          });
        }
        importedCount += rows.length;
        log(`${experience} / ${recordType}: ${importedCount}/${expectedCount}`);

        offset += items.length;
        if (!items.length || items.length < pageSize || offset >= expectedCount) break;
      }

      if (pages >= maxPages && importedCount < expectedCount) {
        throw new Error(`Maximum page count reached for ${recordType} (${importedCount}/${expectedCount}).`);
      }

      const deletedCount = syncToken
        ? await reconcileEt4FullSync(sql, { syncToken, experience, recordType })
        : 0;
      if (syncToken) await clearEt4SyncSeenIds(sql, { syncToken });
      await markEt4SyncSucceeded(sql, {
        experience,
        recordType,
        watermark: syncStartedAt.toISOString(),
        importedCount
      });
      results.push({ recordType, mode: fullSync ? 'full' : 'changed', importedCount, deletedCount, pages });
    } catch (error) {
      if (syncToken) await clearEt4SyncSeenIds(sql, { syncToken });
      await markEt4SyncFailed(sql, { experience, recordType, error });
      throw error;
    }
  }

  return { experience, template, results };
}
