export function createInitialQualityDataMeta() {
  return {
    mode: 'api_counts',
    collectedItems: 0,
    estimatedTotalItems: 0,
    truncated: false,
    unsupportedCriteria: [],
    failedCounts: 0
  };
}

export function createInitialRecordDataMeta() {
  return {
    mode: 'empty',
    collectedItems: 0,
    estimatedTotalItems: 0,
    truncated: false
  };
}

export function createInitialState({
  loadWorkContext,
  getQualityAggregations
}) {
  return {
    context: loadWorkContext(),
    latestRows: [],
    qualitySnapshot: null,
    normalizedItems: [],
    qualityAggregations: getQualityAggregations([]),
    qualityDataMeta: createInitialQualityDataMeta(),
    lastKpis: null,
    taskItems: [],
    taskRows: [],
    filteredTaskRows: [],
    selectedTask: null,
    selectedTaskType: '',
    pendingTaskId: '',
    taskPage: 1,
    taskRowsPerPage: 7,
    taskRecordRows: [],
    taskRecordMeta: null,
    recordItems: [],
    recordRows: [],
    filteredRecordRows: [],
    recordPage: 1,
    recordRowsPerPage: 25,
    recordSearchTimer: null,
    recordAutocompleteTimer: null,
    recordAutocompleteRequestId: 0,
    recordServerSearchKeys: new Set(),
    recordAiSearchPrompt: '',
    recordDataMeta: createInitialRecordDataMeta(),
    statsRows: [],
    statsSummary: null,
    pendingRecordView: null,
    recordDetailItem: null,
    recordDetailViewModel: null,
    overviewLoadId: 0,
    taskLoadId: 0
  };
}

export function initializeStateForPage({
  page,
  state,
  loadRecordViewStateFromRoute,
  saveWorkContext
}) {
  if (page !== 'records') return state;

  state.pendingRecordView = loadRecordViewStateFromRoute();
  if (state.pendingRecordView?.context) {
    saveWorkContext(state.pendingRecordView.context);
  }
  return state;
}
