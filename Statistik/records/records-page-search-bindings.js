export async function handleRecordAiSearchSubmit({
  event,
  state,
  els,
  extractAiSearchIds,
  normalizeItem,
  evaluateAllItems,
  buildRecordViewModel,
  fillRecordDynamicFilters,
  applyRecordFilters,
  clearRecordViewState,
  hideRecordAutocomplete,
  renderRecordsLoading,
  closeRecordAiSearchDialog,
  getErrorMessage,
  contextAreaLabel,
  showRecordsMessage,
  selectedType,
  runAiRecordSearch,
  resolveRecordsByIds,
  handleRecordAiSearchSubmitModel,
  handleRecordAiSearchSubmitPageModel
}) {
  await handleRecordAiSearchSubmitPageModel({
    event,
    state,
    els,
    extractAiSearchIds,
    normalizeItem,
    evaluateAllItems,
    buildRecordViewModel,
    fillRecordDynamicFilters,
    applyRecordFilters,
    clearRecordViewState,
    hideRecordAutocomplete,
    renderRecordsLoading,
    closeRecordAiSearchDialog,
    getErrorMessage,
    contextAreaLabel,
    showRecordsMessage,
    selectedType,
    runAiRecordSearch,
    resolveRecordsByIds,
    handleRecordAiSearchSubmitModel
  });
}

export async function handleRecordSearchSubmit({
  state,
  els,
  applyRecordFilters,
  renderRecordsLoading,
  resolveRecordSearch,
  looksLikeRecordId,
  searchSingleRecordById,
  searchRecordsByText,
  normalizeItem,
  evaluateAllItems,
  mergeRecordItems,
  getRecordIdentityKey,
  buildRecordViewModel,
  fillRecordDynamicFilters,
  showRecordsMessage,
  handleRecordSearchSubmitModel,
  handleRecordSearchSubmitPageModel
}) {
  await handleRecordSearchSubmitPageModel({
    state,
    els,
    applyRecordFilters,
    renderRecordsLoading,
    resolveRecordSearch,
    looksLikeRecordId,
    searchSingleRecordById,
    searchRecordsByText,
    normalizeItem,
    evaluateAllItems,
    mergeRecordItems,
    getRecordIdentityKey,
    buildRecordViewModel,
    fillRecordDynamicFilters,
    showRecordsMessage,
    handleRecordSearchSubmitModel
  });
}

export async function handleRecordMailDraft({
  row,
  triggerNode,
  pendingRecordView,
  selectedCriterionId,
  qualityCriteria,
  taskProblem,
  buildMailtoUrl,
  launchMailto,
  getErrorMessage,
  showRecordsMessage,
  requestRecordMailDraft,
  handleRecordMailDraftModel,
  handleRecordMailDraftPageModel
}) {
  await handleRecordMailDraftPageModel({
    row,
    triggerNode,
    pendingRecordView,
    selectedCriterionId,
    qualityCriteria,
    taskProblem,
    buildMailtoUrl,
    launchMailto,
    getErrorMessage,
    showRecordsMessage,
    requestRecordMailDraft,
    handleRecordMailDraftModel
  });
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
  searchSingleRecordByIdModel,
  searchSingleRecordByIdDataPageModel
}) {
  return searchSingleRecordByIdDataPageModel({
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
  searchRecordsByTextModel,
  searchRecordsByTextDataPageModel
}) {
  return searchRecordsByTextDataPageModel({
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
  });
}

export function queueRecordAutocomplete({
  state,
  els,
  looksLikeRecordId,
  hideRecordAutocomplete,
  loadRecordAutocomplete,
  queueRecordAutocompleteModel,
  queueRecordAutocompletePageModel
}) {
  queueRecordAutocompletePageModel({
    state,
    els,
    looksLikeRecordId,
    hideRecordAutocomplete,
    loadRecordAutocomplete,
    queueRecordAutocompleteModel
  });
}

export async function loadRecordAutocomplete({
  query,
  state,
  renderRecordAutocomplete,
  hideRecordAutocomplete,
  selectedType,
  loadRecordAutocompleteSuggestions,
  loadRecordAutocompleteModel,
  loadRecordAutocompletePageModel
}) {
  await loadRecordAutocompletePageModel({
    query,
    state,
    renderRecordAutocomplete,
    hideRecordAutocomplete,
    selectedType,
    loadRecordAutocompleteSuggestions,
    loadRecordAutocompleteModel
  });
}

export function renderRecordAutocomplete({
  suggestions,
  els,
  escapeHtml,
  formatNumber,
  hideRecordAutocomplete,
  onSubmitSuggestion,
  renderRecordAutocompleteModel,
  renderRecordAutocompletePageModel
}) {
  renderRecordAutocompletePageModel({
    suggestions,
    els,
    escapeHtml,
    formatNumber,
    hideRecordAutocomplete,
    onSubmitSuggestion,
    renderRecordAutocompleteModel
  });
}

export function hideRecordAutocomplete({
  state,
  els,
  hideRecordAutocompleteModel,
  hideRecordAutocompletePageModel
}) {
  hideRecordAutocompletePageModel({
    state,
    els,
    hideRecordAutocompleteModel
  });
}
