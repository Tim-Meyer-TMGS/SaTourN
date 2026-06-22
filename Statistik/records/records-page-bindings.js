export function buildRecordViewModel({
  item,
  extractId,
  getFirst,
  getRecordEmail,
  getRecordWeb,
  buildVerifiedEt4Url,
  getPrimaryIssueId,
  qualityCriteria,
  priorityRank,
  getRecordThumbnailUrl,
  buildRecordViewModelModel
}) {
  return buildRecordViewModelModel(item, {
    extractId,
    getFirst,
    getRecordEmail,
    getRecordWeb,
    buildVerifiedEt4Url,
    getPrimaryIssueId,
    qualityCriteria,
    priorityRank,
    getRecordThumbnailUrl
  });
}

export function fillRecordControls({
  els,
  types,
  qualityCriteria,
  isActiveCriterion,
  fillRecordControlsPageModel
}) {
  fillRecordControlsPageModel({
    els,
    types,
    qualityCriteria,
    isActiveCriterion
  });
}

export function fillRecordDynamicFilters({
  els,
  rows,
  fillRecordDynamicFiltersState,
  fillRecordDynamicFiltersPageModel
}) {
  fillRecordDynamicFiltersPageModel({
    els,
    rows,
    fillRecordDynamicFiltersState
  });
}

export function applyPendingRecordView({
  els,
  state,
  types,
  applyPendingRecordViewState,
  applyPendingRecordViewPageModel
}) {
  applyPendingRecordViewPageModel({
    els,
    state,
    types,
    applyPendingRecordViewState
  });
}

export function renderPendingRecordViewMessage({
  state,
  qualityCriteria,
  buildPendingRecordViewMessage,
  showRecordsMessage,
  renderPendingRecordViewMessageState,
  renderPendingRecordViewMessagePageModel
}) {
  renderPendingRecordViewMessagePageModel({
    state,
    qualityCriteria,
    buildPendingRecordViewMessage,
    showRecordsMessage,
    renderPendingRecordViewMessageState
  });
}

export function applyRecordFilters({
  state,
  els,
  qualityCriteria,
  serverSearchKeys,
  getIdentityKey,
  filterRecordRows,
  renderRecordQuickCounts,
  renderRecordStatusLegend,
  renderRecordTable,
  renderRecordDataNote,
  renderPendingRecordViewMessage,
  applyRecordFiltersState,
  applyRecordFiltersPageModel
}) {
  applyRecordFiltersPageModel({
    state,
    els,
    qualityCriteria,
    serverSearchKeys,
    getIdentityKey,
    filterRecordRows,
    renderRecordQuickCounts,
    renderRecordStatusLegend,
    renderRecordTable,
    renderRecordDataNote,
    renderPendingRecordViewMessage,
    applyRecordFiltersState
  });
}

export function openRecordAiSearchDialog({
  dialog,
  input,
  note,
  prompt,
  openRecordAiSearchDialogUi,
  openRecordAiSearchDialogPageModel
}) {
  openRecordAiSearchDialogPageModel({
    dialog,
    input,
    note,
    prompt,
    openRecordAiSearchDialogUi
  });
}

export function renderRecordTable({
  state,
  els,
  escapeHtml,
  formatNumber,
  formatRecordDate,
  onMailDraft,
  saveRecordListState,
  renderRecordTableState,
  renderRecordTablePageModel
}) {
  renderRecordTablePageModel({
    state,
    els,
    escapeHtml,
    formatNumber,
    formatRecordDate,
    onMailDraft,
    saveRecordListState,
    renderRecordTableState
  });
}

export function saveRecordListState({
  rows,
  storageKey,
  buildDetailUrl,
  saveRecordListStateToSession,
  saveRecordListStatePageModel
}) {
  saveRecordListStatePageModel({
    rows,
    storageKey,
    buildDetailUrl,
    saveRecordListStateToSession
  });
}

export function loadRecordListState({
  storageKey,
  loadRecordListStateFromSession,
  loadRecordListStatePageModel
}) {
  return loadRecordListStatePageModel({
    storageKey,
    loadRecordListStateFromSession
  });
}

export function renderRecordsLoading({
  els,
  renderRecordsLoadingState,
  renderRecordsLoadingPageModel
}) {
  renderRecordsLoadingPageModel({
    els,
    renderRecordsLoadingState
  });
}

export function renderRecordsEmpty({
  els,
  message,
  showRecordsMessage,
  renderRecordsEmptyState,
  renderRecordsEmptyPageModel
}) {
  renderRecordsEmptyPageModel({
    els,
    message,
    showRecordsMessage,
    renderRecordsEmptyState
  });
}

export function renderRecordQuickCounts({
  els,
  rows,
  mode,
  setText,
  renderRecordQuickCountsState,
  renderRecordQuickCountsPageModel
}) {
  renderRecordQuickCountsPageModel({
    els,
    rows,
    mode,
    setText,
    renderRecordQuickCountsState
  });
}

export function renderRecordStatusLegend({
  els,
  rows,
  mode,
  setText,
  renderRecordStatusLegendState,
  renderRecordStatusLegendPageModel
}) {
  renderRecordStatusLegendPageModel({
    els,
    rows,
    mode,
    setText,
    renderRecordStatusLegendState
  });
}

export function renderRecordDataNote({
  els,
  recordDataMeta,
  renderRecordDataNoteState,
  renderRecordDataNotePageModel
}) {
  renderRecordDataNotePageModel({
    els,
    recordDataMeta,
    renderRecordDataNoteState
  });
}

export function getRecordThumbnailUrl({
  item,
  qualityHelpers,
  getFirst,
  getRecordThumbnailUrlModel,
  getRecordThumbnailUrlPageModel
}) {
  return getRecordThumbnailUrlPageModel({
    item,
    qualityHelpers,
    getFirst,
    getRecordThumbnailUrlModel
  });
}

export function showRecordsMessage({
  els,
  message,
  showRecordsMessageState,
  showRecordsMessagePageModel
}) {
  showRecordsMessagePageModel({
    els,
    message,
    showRecordsMessageState
  });
}

export function setText({
  node,
  value,
  formatNumber,
  setRecordCountText,
  setRecordCountPageModel
}) {
  setRecordCountPageModel({
    node,
    value,
    formatNumber,
    setRecordCountText
  });
}
