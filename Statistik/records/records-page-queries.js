export async function loadRecordRowsForPendingView({
  view,
  types,
  mergeRecordItems,
  loadRecordRowsForView,
  loadRecordRowsForIssueSelection,
  loadRecordRowsForPendingViewModel
}) {
  return loadRecordRowsForPendingViewModel({
    view,
    types,
    mergeRecordItems,
    loadRecordRowsForView,
    loadRecordRowsForIssueSelection
  });
}

export async function loadRecordRowsForIssueSelection({
  criterionId,
  selectedType = '',
  qualityCriteria,
  types,
  loadRecordRowsForView,
  loadRecordRowsForIssueSelectionModel
}) {
  return loadRecordRowsForIssueSelectionModel({
    criterionId,
    selectedType,
    qualityCriteria,
    types,
    loadRecordRowsForView
  });
}

export async function loadRecordRowsForView({
  view,
  context,
  buildQuery,
  loadCachedQualityList,
  extractItems,
  extractTotal,
  normalizeItem,
  evaluateAllItems,
  fetchQualityScan,
  loadRecordRowsForViewModel
}) {
  return loadRecordRowsForViewModel({
    view,
    context,
    buildQuery,
    loadCachedQualityList,
    extractItems,
    extractTotal,
    normalizeItem,
    evaluateAllItems,
    fetchQualityScan
  });
}
