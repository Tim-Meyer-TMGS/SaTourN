import { createHash } from 'node:crypto';

import {
  evaluateQualityForItem,
  getAreaValues,
  getAttributeValue,
  getCategoryValues,
  hasCheckableMedia,
  hasDetailsText,
  hasValidDatasetLicense
} from '../quality/criteria.js';

const DIRECT_FIELDS = Object.freeze([
  'global_id',
  'id',
  'title',
  'type',
  'country',
  'city',
  'zip',
  'street',
  'web',
  'email',
  'phone',
  'phone2',
  'author',
  'geo',
  'ratings',
  'timeIntervals',
  'kitchenTimeIntervals',
  'deliveryTimeIntervals',
  'timeIntervalExceptions',
  'alwaysOpen',
  'numbers',
  'attributes',
  'addresses',
  'created',
  'changed',
  'source',
  'source_id',
  'company',
  'district',
  'postoffice',
  'prices',
  'occurrences',
  'seasons'
]);

const LIST_FIELD_FALLBACKS = Object.freeze({
  areas: ['areas', 'areas_old'],
  categories: ['categories', 'categories_old'],
  keywords: ['keywords', 'keywords_old'],
  features: ['features', 'features_old'],
  cuisineTypes: ['cuisineTypes', 'cuisine_types', 'cuisine_types_old'],
  paymentMethods: ['paymentMethods', 'payment_old']
});

function hasContent(value) {
  if (value == null || value === '') return false;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'object') return Object.keys(value).length > 0;
  return true;
}

function removeEmptyValues(value) {
  if (Array.isArray(value)) {
    return value
      .map(removeEmptyValues)
      .filter(hasContent);
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value)
      .map(([key, nestedValue]) => [key, removeEmptyValues(nestedValue)])
      .filter(([, nestedValue]) => hasContent(nestedValue)));
  }

  return value;
}

function asArray(value) {
  if (value == null || value === '') return [];
  return Array.isArray(value) ? value : [value];
}

function firstPopulatedField(record, candidates) {
  for (const field of candidates) {
    if (hasContent(record?.[field])) return record[field];
  }
  return [];
}

function textPreference(entry) {
  const type = String(entry?.type || '').toLowerCase();
  if (type === 'text/html') return 0;
  if (type === 'text/plain') return 1;
  return 2;
}

function compactTexts(value) {
  const groups = new Map();

  for (const entry of asArray(value)) {
    if (!entry || typeof entry !== 'object') continue;
    const rel = String(entry.rel || '').trim();
    const key = rel.toLowerCase() || `__without_rel_${groups.size}`;
    const current = groups.get(key);
    if (!current || textPreference(entry) < textPreference(current)) {
      groups.set(key, entry);
    }
  }

  return Array.from(groups.values()).map((entry) => removeEmptyValues({
    rel: entry.rel,
    type: entry.type,
    value: entry.value ?? entry.text ?? entry.content
  }));
}

function compactMediaObjects(value) {
  return asArray(value).map((entry) => {
    if (!entry || typeof entry !== 'object') return entry;
    return removeEmptyValues({
      rel: entry.rel,
      url: entry.url,
      type: entry.type,
      title: entry.title,
      name: entry.name,
      caption: entry.caption,
      alt: entry.alt,
      altText: entry.altText,
      description: entry.description,
      copyright: entry.copyright,
      copyrightText: entry.copyrightText,
      creator: entry.creator,
      author: entry.author,
      source: entry.source,
      license: entry.license,
      licenseText: entry.licenseText,
      prio: entry.prio
    });
  });
}

function compactAttributes(value) {
  return asArray(value).map((entry) => (
    entry && typeof entry === 'object'
      ? removeEmptyValues({ key: entry.key, value: entry.value })
      : entry
  ));
}

function compactAddresses(value) {
  return asArray(value).map((entry) => (
    entry && typeof entry === 'object'
      ? removeEmptyValues({
        rel: entry.rel,
        name: entry.name,
        street: entry.street,
        zip: entry.zip,
        city: entry.city,
        phone: entry.phone,
        web: entry.web,
        email: entry.email
      })
      : entry
  ));
}

function textValues(values) {
  return Array.from(new Set(values
    .map((entry) => {
      if (entry && typeof entry === 'object') {
        return String(entry.value ?? entry.title ?? entry.name ?? entry.id ?? '').trim();
      }
      return String(entry ?? '').trim();
    })
    .filter(Boolean)));
}

function nullableTimestamp(value) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

export function compactEt4Record(record = {}) {
  const compact = {};

  for (const field of DIRECT_FIELDS) {
    if (hasContent(record[field])) compact[field] = record[field];
  }

  compact.texts = compactTexts(record.texts);
  compact.media_objects = compactMediaObjects(record.media_objects);
  compact.attributes = compactAttributes(record.attributes);
  compact.addresses = compactAddresses(record.addresses);

  for (const [targetField, candidates] of Object.entries(LIST_FIELD_FALLBACKS)) {
    compact[targetField] = textValues(asArray(firstPopulatedField(record, candidates)));
  }

  return removeEmptyValues(compact);
}

export function createEt4RecordRow(record, { experience }) {
  const normalizedExperience = String(experience || '').trim();
  if (!normalizedExperience) throw new Error('An experience is required for every ET4 record.');

  const payload = compactEt4Record(record);
  const globalId = String(payload.global_id || '').trim();
  if (!globalId) throw new Error('ET4 record is missing global_id.');

  const evaluation = evaluateQualityForItem(payload);
  const serializedPayload = JSON.stringify(payload);
  const licenseType = String(getAttributeValue(payload, 'license') || '').trim().toUpperCase() || null;

  return {
    experience: normalizedExperience,
    globalId,
    sourceId: String(payload.source_id ?? payload.id ?? '').trim() || null,
    recordType: String(payload.type || '').trim() || 'Unknown',
    title: String(payload.title || '').trim(),
    city: String(payload.city || '').trim(),
    areas: textValues(getAreaValues(payload)),
    categories: textValues(getCategoryValues(payload)),
    changedAt: nullableTimestamp(payload.changed),
    createdAt: nullableTimestamp(payload.created),
    contentHash: createHash('sha256').update(serializedPayload).digest('hex'),
    licenseType,
    hasLicense: hasValidDatasetLicense(payload),
    hasDescription: hasDetailsText(payload),
    hasImages: hasCheckableMedia(payload),
    qualityScore: Number.isFinite(evaluation.qualityScore) ? evaluation.qualityScore : null,
    qualityStatus: evaluation.qualityStatus,
    missingCriteria: evaluation.missingCriteria,
    fulfilledCriteria: evaluation.fulfilledCriteria,
    payload
  };
}

export function extractEt4Items(document = {}) {
  const items = document.items ?? document.Items ?? document.results ?? document.Results ?? [];
  return Array.isArray(items) ? items : [];
}
