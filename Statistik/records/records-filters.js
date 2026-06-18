export function showRecordsMessageState(els, message) {
  if (!els.recordsMessage) return;
  els.recordsMessage.textContent = message || '';
  els.recordsMessage.hidden = !message;
}

export function setRecordCountText(node, value, formatNumber) {
  if (node) node.textContent = formatNumber(value);
}

export function fillRecordDynamicFiltersState({ els, rows }) {
  if (!els.recordCategoryFilter) return;
  const current = els.recordCategoryFilter.value;
  const categories = Array.from(new Set(rows.map((row) => row.category).filter(Boolean)))
    .sort((a, b) => a.localeCompare(b, 'de'))
    .slice(0, 80);
  els.recordCategoryFilter.replaceChildren(new Option('Kategorie: Alle', ''));
  categories.forEach((category) => els.recordCategoryFilter.append(new Option(`Kategorie: ${category}`, category)));
  if (categories.includes(current)) els.recordCategoryFilter.value = current;
}

export function applyPendingRecordViewState({ els, state, types }) {
  const view = state.pendingRecordView;
  if (!view) return;
  if (els.recordSearchInput && view.query) els.recordSearchInput.value = view.query;
  if (els.recordTypeFilter && types.includes(view.type)) els.recordTypeFilter.value = view.type;
  if (els.recordStatusFilter && view.status) els.recordStatusFilter.value = view.status;
  const hasGroupedCriteria = Array.isArray(view.criterionIds) && view.criterionIds.length > 1;
  if (els.recordIssueFilter) {
    els.recordIssueFilter.value = !hasGroupedCriteria && view.criterionId ? view.criterionId : '';
  }
  state.recordPage = 1;
}

export function renderPendingRecordViewMessageState({
  state,
  qualityCriteria,
  buildPendingRecordViewMessage,
  showRecordsMessage
}) {
  showRecordsMessage(buildPendingRecordViewMessage({
    recordAiSearchPrompt: state.recordAiSearchPrompt,
    pendingRecordView: state.pendingRecordView,
    qualityCriteria
  }));
}

export function applyRecordFiltersState({
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
}) {
  const query = (els.recordSearchInput?.value || '').trim();
  const type = els.recordTypeFilter?.value || '';
  const category = els.recordCategoryFilter?.value || '';
  const status = els.recordStatusFilter?.value || '';
  const issue = els.recordIssueFilter?.value || '';

  state.filteredRecordRows = filterRecordRows(state.recordRows, {
    query,
    type,
    category,
    status,
    issue,
    qualityCriteria,
    serverSearchKeys,
    getIdentityKey
  });

  renderRecordQuickCounts();
  renderRecordStatusLegend();
  renderRecordTable();
  renderRecordDataNote();
  renderPendingRecordViewMessage();
}

export function resetRecordFiltersState({
  state,
  els,
  clearRecordViewState,
  loadRecordsData,
  applyRecordFilters
}) {
  const reloadFullList = state.recordDataMeta.mode === 'criterion' || state.recordDataMeta.mode === 'ai_search';
  if (els.recordSearchInput) els.recordSearchInput.value = '';
  if (els.recordAiSearchInput) els.recordAiSearchInput.value = '';
  if (els.recordTypeFilter) els.recordTypeFilter.value = '';
  if (els.recordCategoryFilter) els.recordCategoryFilter.value = '';
  if (els.recordStatusFilter) els.recordStatusFilter.value = '';
  if (els.recordIssueFilter) els.recordIssueFilter.value = '';
  state.recordServerSearchKeys = new Set();
  state.recordAiSearchPrompt = '';
  state.pendingRecordView = null;
  clearRecordViewState();
  state.recordPage = 1;
  if (reloadFullList) {
    void loadRecordsData();
    return;
  }
  applyRecordFilters();
}

export function applyQuickRecordFilterState({
  value,
  state,
  els,
  clearRecordViewState,
  loadRecordsData,
  applyRecordFilters
}) {
  if (els.recordSearchInput) els.recordSearchInput.value = '';
  if (els.recordCategoryFilter) els.recordCategoryFilter.value = '';
  if (els.recordStatusFilter) els.recordStatusFilter.value = '';
  if (els.recordIssueFilter) els.recordIssueFilter.value = '';
  state.recordServerSearchKeys = new Set();
  state.pendingRecordView = null;
  clearRecordViewState();
  if (value === 'critical' && els.recordStatusFilter) els.recordStatusFilter.value = 'kritisch';
  if (value !== 'critical' && els.recordIssueFilter) els.recordIssueFilter.value = value;
  state.recordPage = 1;
  if (value !== 'critical') {
    void loadRecordsData();
    return;
  }
  applyRecordFilters();
}

export function changeRecordPageState({ state, delta, renderRecordTable }) {
  state.recordPage += delta;
  renderRecordTable();
}
