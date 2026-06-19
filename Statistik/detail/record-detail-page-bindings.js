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
  getRecordDetailViewModelModel,
  getRecordDetailViewModelPageModel
}) {
  return getRecordDetailViewModelPageModel({
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
  });
}

export function getRecordDetailContext({
  storageKey,
  qualityCriteria,
  getRecordDetailContextModel,
  getRecordDetailContextPageModel
}) {
  return getRecordDetailContextPageModel({
    storageKey,
    qualityCriteria,
    getRecordDetailContextModel
  });
}

export function getExternalSystemIds({
  raw,
  qualityHelpers,
  getFirst,
  textValue,
  getExternalSystemIdsModel,
  getExternalSystemIdsPageModel
}) {
  return getExternalSystemIdsPageModel({
    raw,
    qualityHelpers,
    getFirst,
    textValue,
    getExternalSystemIdsModel
  });
}

export function getAddressSummary({
  raw,
  textValue,
  getAddressSummaryModel,
  getAddressSummaryPageModel
}) {
  return getAddressSummaryPageModel({
    raw,
    textValue,
    getAddressSummaryModel
  });
}

export function getCoordinates({
  raw,
  getFirst,
  getCoordinatesModel,
  getCoordinatesPageModel
}) {
  return getCoordinatesPageModel({
    raw,
    getFirst,
    getCoordinatesModel
  });
}

export function getRawExcerpt({
  raw,
  getFirst,
  getTextByRel,
  qualityHelpers,
  textValue,
  getRawExcerptModel,
  getRawExcerptPageModel
}) {
  return getRawExcerptPageModel({
    raw,
    getFirst,
    getTextByRel,
    qualityHelpers,
    textValue,
    getRawExcerptModel
  });
}

export function showDetailMessage({
  els,
  message,
  showDetailMessagePageModel
}) {
  showDetailMessagePageModel({
    els,
    message
  });
}

export function buildVerifiedEt4Url({
  item,
  buildVerifiedEt4UrlModel,
  buildVerifiedEt4UrlPageModel
}) {
  return buildVerifiedEt4UrlPageModel({
    item,
    buildVerifiedEt4UrlModel
  });
}

export function normalizeItem({
  raw,
  fallbackType,
  extractId,
  qualityHelpers,
  textValue,
  context,
  normalizeItemModel,
  normalizeItemPageModel
}) {
  return normalizeItemPageModel({
    raw,
    fallbackType,
    extractId,
    qualityHelpers,
    textValue,
    context,
    normalizeItemModel
  });
}

export function getFirst({
  obj,
  paths,
  qualityHelpers,
  textValue,
  getFirstModel,
  getFirstPageModel
}) {
  return getFirstPageModel({
    obj,
    paths,
    qualityHelpers,
    textValue,
    getFirstModel
  });
}

export function getRecordEmail({
  raw,
  qualityHelpers,
  textValue,
  getRecordEmailModel,
  getRecordEmailPageModel
}) {
  return getRecordEmailPageModel({
    raw,
    qualityHelpers,
    textValue,
    getRecordEmailModel
  });
}

export function getRecordWeb({
  raw,
  qualityHelpers,
  textValue,
  getRecordWebModel,
  getRecordWebPageModel
}) {
  return getRecordWebPageModel({
    raw,
    qualityHelpers,
    textValue,
    getRecordWebModel
  });
}

export function getRecordPhone({
  raw,
  qualityHelpers,
  textValue,
  getRecordPhoneModel,
  getRecordPhonePageModel
}) {
  return getRecordPhonePageModel({
    raw,
    qualityHelpers,
    textValue,
    getRecordPhoneModel
  });
}
