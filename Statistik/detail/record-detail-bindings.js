export async function fetchRecordDetailItem({
  type,
  id,
  globalId,
  types,
  cleanQueryValue,
  getIdFromGlobalId,
  uniqueValues,
  buildUrl,
  fetchJsonCached,
  extractItems,
  extractId,
  getFirst,
  fetchRecordDetailItemModel
}) {
  return fetchRecordDetailItemModel(
    { type, id, globalId },
    {
      types,
      cleanQueryValue,
      getIdFromGlobalId,
      uniqueValues,
      buildUrl,
      fetchJsonCached,
      extractItems,
      extractId,
      getFirst
    }
  );
}

export function getRecordDetailViewModel({
  item,
  qualityCriteria,
  qualityHelpers,
  priorityRank,
  getCheckableImages,
  getDetailUsability,
  getDisplayDescription,
  getOpeningHoursSummary,
  getTextByRel,
  textValue,
  buildVerifiedEt4Url,
  getFirst,
  getRecordWeb,
  getRecordEmail,
  getRecordPhone,
  getExternalSystemIds,
  getAddressSummary,
  getCoordinates,
  getRawExcerpt,
  getPrimarySystem,
  getRecordDetailContext,
  getRecordDetailViewModelModel
}) {
  return getRecordDetailViewModelModel(item, {
    qualityCriteria,
    qualityHelpers,
    priorityRank,
    getCheckableImages,
    getDetailUsability,
    getDisplayDescription,
    getOpeningHoursSummary,
    getTextByRel,
    textValue,
    buildVerifiedEt4Url,
    getFirst,
    getRecordWeb,
    getRecordEmail,
    getRecordPhone,
    getExternalSystemIds,
    getAddressSummary,
    getCoordinates,
    getRawExcerpt,
    getPrimarySystem,
    getRecordDetailContext
  });
}

export function getRecordDetailContext({
  storageKey,
  qualityCriteria,
  getRecordDetailContextModel
}) {
  return getRecordDetailContextModel(storageKey, qualityCriteria);
}

export function getExternalSystemIds({
  raw,
  qualityHelpers,
  getFirst,
  textValue,
  getExternalSystemIdsModel
}) {
  return getExternalSystemIdsModel(raw, { qualityHelpers, getFirst, textValue });
}

export function getAddressSummary({
  raw,
  textValue,
  getAddressSummaryModel
}) {
  return getAddressSummaryModel(raw, textValue);
}

export function getCoordinates({
  raw,
  getFirst,
  getCoordinatesModel
}) {
  return getCoordinatesModel(raw, getFirst);
}

export function getRawExcerpt({
  raw,
  getFirst,
  getTextByRel,
  qualityHelpers,
  textValue,
  getRawExcerptModel
}) {
  return getRawExcerptModel(raw, { getFirst, getTextByRel, qualityHelpers, textValue });
}
