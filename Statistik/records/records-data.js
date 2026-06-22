import {
  searchRecordsByText as executeRecordTextSearch,
  searchSingleRecordById as executeRecordIdSearch
} from './records-search.js';

export function getFirst(obj, paths, { qualityHelpers, textValue }) {
  for (const path of paths) {
    const value = qualityHelpers.getNestedValue(obj, path);
    const text = textValue(value);
    if (text) return text;
  }
  return '';
}

export function getRecordEmail(raw, helpers) {
  return getFirst(raw, [
    'email',
    'emailRequest',
    'address.email',
    'addresses.email',
    'addresses_mail.email'
  ], helpers) || '';
}

export function getRecordWeb(raw, helpers) {
  return getFirst(raw, [
    'web',
    'url',
    'website',
    'address.web',
    'addresses.web'
  ], helpers) || '';
}

export function getRecordPhone(raw, helpers) {
  return getFirst(raw, [
    'phone',
    'phone2',
    'address.phone',
    'addresses.phone'
  ], helpers) || '';
}

export function buildVerifiedEt4Url(item) {
  if (item.type !== 'POI' || !item.globalId) return '';
  return `https://pages.et4.de/de/statistik_sachsen/wlan/detail/POI/${encodeURIComponent(item.globalId)}/x`;
}

export function normalizeItem(raw, fallbackType, {
  extractId,
  qualityHelpers,
  textValue,
  context
}) {
  const helpers = { qualityHelpers, textValue };
  const globalId = getFirst(raw, ['global_id', 'globalId'], helpers);
  const resolvedType = fallbackType || getFirst(raw, ['type', 'typeName'], helpers) || '';
  return {
    raw,
    id: extractId(raw),
    globalId,
    title: getFirst(raw, ['title', 'name', 'presentation.title'], helpers) || 'Ohne Titel',
    type: resolvedType,
    region: qualityHelpers.getAreaValues(raw)?.[0] || context.area || '',
    city: getFirst(raw, ['city', 'location.city', 'address.city'], helpers) || context.city || '',
    category: qualityHelpers.getCategoryValues(raw)?.[0] || '',
    license: qualityHelpers.getAttributeValue(raw, 'license') || '',
    isOpenData: qualityHelpers.hasValidDatasetLicense(raw),
    updatedAt: getFirst(raw, ['updatedAt', 'lastModified', 'modified', 'changeDate'], helpers) || '',
    email: getFirst(raw, ['email'], helpers) || '',
    web: getFirst(raw, ['web', 'sourceUrl', 'url'], helpers) || '',
    qualityScore: Number.isFinite(Number(raw?.qualityScore)) ? Number(raw.qualityScore) : null,
    qualityStatus: textValue(raw?.qualityStatus) || '',
    missingCriteria: Array.isArray(raw?.missingCriteria) ? raw.missingCriteria.filter(Boolean) : [],
    recommendations: Array.isArray(raw?.recommendations) ? raw.recommendations.filter(Boolean) : []
  };
}

export function buildRecordDetailUrl(row) {
  const params = new URLSearchParams();
  if (row.type) params.set('type', row.type);
  if (row.globalId) params.set('global_id', row.globalId);
  else if (row.id) params.set('id', row.id);
  return `record-detail.html?${params.toString()}`;
}

export function getRecordThumbnailUrl(item, { qualityHelpers, getFirst }) {
  const media = qualityHelpers.getMediaObjects(item.raw || item)
    .find((entry) => qualityHelpers.isCheckableMediaObject(entry));
  return getFirst(media, ['url', 'contentUrl', 'previewUrl', 'thumbnailUrl']) || '';
}

export function buildRecordViewModel(item, {
  extractId,
  getFirst,
  getRecordEmail,
  getRecordWeb,
  buildVerifiedEt4Url,
  getPrimaryIssueId,
  qualityCriteria,
  priorityRank,
  getRecordThumbnailUrl
}) {
  const missingCriteria = Array.isArray(item.missingCriteria) ? item.missingCriteria : [];
  const primaryIssueId = getPrimaryIssueId(item, { qualityCriteria, priorityRank });
  const primaryCriterion = qualityCriteria.find((criterion) => criterion.id === primaryIssueId);
  const id = item.id || extractId(item.raw || item);
  const globalId = item.globalId || getFirst(item, ['global_id', 'globalId', 'raw.global_id', 'raw.globalId']);
  const raw = item.raw || item;
  const email = getRecordEmail(raw);
  const web = getRecordWeb(raw);

  return {
    item,
    id,
    globalId,
    title: item.title || 'Ohne Titel',
    type: item.type || '',
    thumbnailUrl: getRecordThumbnailUrl(item),
    city: item.city || '',
    region: item.region || '',
    category: item.category || '',
    qualityStatus: item.qualityStatus || 'nicht berechenbar',
    qualityScore: Number.isFinite(item.qualityScore) ? item.qualityScore : null,
    primaryIssueId,
    primaryIssue: primaryCriterion?.label || '-',
    recommendation: primaryCriterion?.recommendation || '',
    missingCriteria,
    email,
    web,
    et4Url: buildVerifiedEt4Url(item),
    updatedAt: item.updatedAt || '',
    detailUrl: buildRecordDetailUrl({ id, globalId, type: item.type || '' }),
    searchText: ''
  };
}

export async function searchSingleRecordById(query, {
  context,
  selectedType,
  types,
  buildQuery,
  cleanQueryValue,
  buildUrl,
  fetchJsonCached,
  extractItems,
  normalizeItem
}) {
  return executeRecordIdSearch({
    query,
    context,
    selectedType,
    types,
    buildQuery,
    cleanQueryValue,
    buildUrl,
    fetchJsonCached,
    extractItems,
    normalizeItem
  });
}

export async function searchRecordsByText(query, {
  context,
  selectedType,
  types,
  buildQuery,
  cleanQueryValue,
  buildUrl,
  fetchJsonCached,
  extractItems,
  extractTotal,
  normalizeItem,
  onTypeError
}) {
  return executeRecordTextSearch({
    query,
    context,
    selectedType,
    types,
    buildQuery,
    cleanQueryValue,
    buildUrl,
    fetchJsonCached,
    extractItems,
    extractTotal,
    normalizeItem,
    onTypeError
  });
}
