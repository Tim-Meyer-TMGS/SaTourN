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
  isActiveCriterion
}) {
  if (els.recordTypeFilter && els.recordTypeFilter.options.length <= 1) {
    types.forEach((type) => els.recordTypeFilter.append(new Option(`Typ: ${type}`, type)));
  }

  if (els.recordIssueFilter && els.recordIssueFilter.options.length <= 1) {
    qualityCriteria
      .filter((criterion) => isActiveCriterion(criterion.id))
      .forEach((criterion) => els.recordIssueFilter.append(new Option(`Problem: ${criterion.label}`, criterion.id)));
  }
}

export function fillRecordDynamicFilters({
  els,
  rows,
  fillRecordDynamicFiltersState
}) {
  fillRecordDynamicFiltersState({
    els,
    rows
  });
}

export function applyPendingRecordView({
  els,
  state,
  types,
  applyPendingRecordViewState
}) {
  applyPendingRecordViewState({
    els,
    state,
    types
  });
}

export function renderPendingRecordViewMessage({
  state,
  qualityCriteria,
  buildPendingRecordViewMessage,
  showRecordsMessage,
  renderPendingRecordViewMessageState
}) {
  renderPendingRecordViewMessageState({
    state,
    qualityCriteria,
    buildPendingRecordViewMessage,
    showRecordsMessage
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
  applyRecordFiltersState
}) {
  applyRecordFiltersState({
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
    renderPendingRecordViewMessage
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
  renderRecordTableState
}) {
  state.recordPage = renderRecordTableState(els, {
    rows: state.filteredRecordRows,
    allRows: state.recordRows,
    recordPage: state.recordPage,
    recordRowsPerPage: state.recordRowsPerPage,
    recordDataMeta: state.recordDataMeta,
    escapeHtml,
    formatNumber,
    formatRecordDate,
    onMailDraft,
    saveRecordListState
  });
}

export function renderRecordsLoading({
  els,
  renderRecordsLoadingState
}) {
  renderRecordsLoadingState(els);
}

export function renderRecordsEmpty({
  els,
  message,
  showRecordsMessage,
  renderRecordsEmptyState
}) {
  renderRecordsEmptyState(els, message, showRecordsMessage);
}

export function renderRecordQuickCounts({
  els,
  rows,
  mode,
  setText,
  renderRecordQuickCountsState
}) {
  renderRecordQuickCountsState(els, {
    rows,
    mode,
    setText
  });
}

export function renderRecordStatusLegend({
  els,
  rows,
  mode,
  setText,
  renderRecordStatusLegendState
}) {
  renderRecordStatusLegendState(els, {
    rows,
    mode,
    setText
  });
}

export function renderRecordDataNote({
  els,
  recordDataMeta,
  renderRecordDataNoteState
}) {
  renderRecordDataNoteState(els, recordDataMeta);
}
