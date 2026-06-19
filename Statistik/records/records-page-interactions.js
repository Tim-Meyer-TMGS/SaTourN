export function openRecordAiSearchDialog({
  dialog,
  input,
  note,
  prompt,
  openRecordAiSearchDialogUi
}) {
  openRecordAiSearchDialogUi({
    dialog,
    input,
    note,
    prompt
  });
}

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
  handleRecordAiSearchSubmitModel
}) {
  await handleRecordAiSearchSubmitModel({
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
    resolveRecordsByIds
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
  handleRecordSearchSubmitModel
}) {
  await handleRecordSearchSubmitModel({
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
    showRecordsMessage
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
  handleRecordMailDraftModel
}) {
  await handleRecordMailDraftModel({
    row,
    triggerNode,
    pendingRecordView,
    selectedCriterionId,
    qualityCriteria,
    taskProblem,
    requestRecordMailDraft,
    buildMailtoUrl,
    launchMailto,
    getErrorMessage,
    showRecordsMessage
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

export function queueRecordAutocomplete({
  state,
  els,
  looksLikeRecordId,
  hideRecordAutocomplete,
  loadRecordAutocomplete,
  queueRecordAutocompleteModel
}) {
  queueRecordAutocompleteModel({
    state,
    els,
    looksLikeRecordId,
    hideRecordAutocomplete,
    loadRecordAutocomplete
  });
}

export async function loadRecordAutocomplete({
  query,
  state,
  renderRecordAutocomplete,
  hideRecordAutocomplete,
  selectedType,
  loadRecordAutocompleteSuggestions,
  loadRecordAutocompleteModel
}) {
  await loadRecordAutocompleteModel({
    query,
    state,
    renderRecordAutocomplete,
    hideRecordAutocomplete,
    selectedType,
    loadRecordAutocompleteSuggestions
  });
}

export function renderRecordAutocomplete({
  suggestions,
  els,
  escapeHtml,
  formatNumber,
  hideRecordAutocomplete,
  onSubmitSuggestion,
  renderRecordAutocompleteModel
}) {
  renderRecordAutocompleteModel({
    suggestions,
    els,
    escapeHtml,
    formatNumber,
    hideRecordAutocomplete,
    onSubmitSuggestion
  });
}

export function hideRecordAutocomplete({
  state,
  els,
  hideRecordAutocompleteModel
}) {
  hideRecordAutocompleteModel({ state, els });
}
