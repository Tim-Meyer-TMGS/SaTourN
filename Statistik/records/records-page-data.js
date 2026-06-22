export function getRecordThumbnailUrl({
  item,
  qualityHelpers,
  getFirst,
  getRecordThumbnailUrlModel
}) {
  return getRecordThumbnailUrlModel(item, { qualityHelpers, getFirst });
}

export async function searchSingleRecordById({
  query,
  context,
  selectedType,
  types,
  buildQuery,
  cleanQueryValue,
  buildUrl,
  fetchJsonCached,
  extractItems,
  normalizeItem,
  searchSingleRecordByIdModel
}) {
  return searchSingleRecordByIdModel(query, {
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

export async function searchRecordsByText({
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
  onTypeError,
  searchRecordsByTextModel
}) {
  return searchRecordsByTextModel(query, {
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

export function normalizeItem({
  raw,
  fallbackType,
  extractId,
  qualityHelpers,
  textValue,
  context,
  normalizeItemModel
}) {
  return normalizeItemModel(raw, fallbackType, {
    extractId,
    qualityHelpers,
    textValue,
    context
  });
}

export function getFirst({
  obj,
  paths,
  qualityHelpers,
  textValue,
  getFirstModel
}) {
  return getFirstModel(obj, paths, { qualityHelpers, textValue });
}

export function getRecordEmail({
  raw,
  qualityHelpers,
  textValue,
  getRecordEmailModel
}) {
  return getRecordEmailModel(raw, { qualityHelpers, textValue }) || '';
}

export function getRecordWeb({
  raw,
  qualityHelpers,
  textValue,
  getRecordWebModel
}) {
  return getRecordWebModel(raw, { qualityHelpers, textValue }) || '';
}

export function getRecordPhone({
  raw,
  qualityHelpers,
  textValue,
  getRecordPhoneModel
}) {
  return getRecordPhoneModel(raw, { qualityHelpers, textValue }) || '';
}

export function buildVerifiedEt4Url({
  item,
  buildVerifiedEt4UrlModel
}) {
  return buildVerifiedEt4UrlModel(item);
}
