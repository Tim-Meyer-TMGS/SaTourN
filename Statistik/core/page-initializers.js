export function initOverview({
  els,
  clearTransientRequestCache,
  loadOverviewDataAsync,
  renderOverviewLoading,
  exportOverviewCsv,
  interceptQuickAiConsent,
  showMessage
}) {
  renderOverviewLoading();
  els.refreshButton?.addEventListener('click', () => {
    clearTransientRequestCache();
    void loadOverviewDataAsync();
  });
  els.quickExport?.addEventListener('click', exportOverviewCsv);
  els.quickAi?.addEventListener('click', interceptQuickAiConsent, { capture: true });
  els.quickAi?.addEventListener('click', () => showMessage('Die KI-Analyse wird als dezente Aktion in einem späteren Schritt angebunden.'));
  void loadOverviewDataAsync();
}

export function initTasks({
  els,
  state,
  locationObject = location,
  fillTaskTypeFilter,
  renderTasksLoading,
  loadTasksData,
  applyTaskFilters,
  resetTaskFilters,
  changeTaskPage,
  exportTaskRecordsCsv
}) {
  const params = new URLSearchParams(locationObject.search);
  state.pendingTaskId = params.get('task') || params.get('criterionId') || '';
  fillTaskTypeFilter();
  renderTasksLoading();
  els.refreshButton?.addEventListener('click', () => loadTasksData());
  els.taskSearchInput?.addEventListener('input', () => {
    state.taskPage = 1;
    applyTaskFilters();
  });
  [els.taskPriorityFilter, els.taskTypeFilter, els.taskCheckFilter, els.taskImpactFilter].forEach((node) => {
    node?.addEventListener('change', () => {
      state.taskPage = 1;
      applyTaskFilters();
    });
  });
  els.taskResetFilters?.addEventListener('click', resetTaskFilters);
  els.taskPrevPage?.addEventListener('click', () => changeTaskPage(-1));
  els.taskNextPage?.addEventListener('click', () => changeTaskPage(1));
  els.taskRecordsExport?.addEventListener('click', exportTaskRecordsCsv);
  void loadTasksData();
}

export function initRecords({
  els,
  state,
  documentObject = document,
  fillRecordControls,
  renderRecordsLoading,
  loadRecordsData,
  openRecordAiSearchDialog,
  handleRecordAiSearchSubmit,
  applyRecordFilters,
  queueRecordAutocomplete,
  hideRecordAutocomplete,
  handleRecordSearchSubmit,
  resetRecordFilters,
  renderRecordTable,
  changeRecordPage,
  exportRecordListCsv,
  applyQuickRecordFilter
}) {
  fillRecordControls();
  renderRecordsLoading();
  els.refreshButton?.addEventListener('click', () => loadRecordsData());
  els.recordAiSearchButton?.addEventListener('click', openRecordAiSearchDialog);
  els.recordAiSearchForm?.addEventListener('submit', handleRecordAiSearchSubmit);
  els.recordSearchInput?.addEventListener('input', () => {
    state.recordServerSearchKeys = new Set();
    state.recordAiSearchPrompt = '';
    clearTimeout(state.recordSearchTimer);
    state.recordSearchTimer = setTimeout(() => {
      state.recordPage = 1;
      applyRecordFilters();
    }, 180);
    queueRecordAutocomplete();
  });
  els.recordSearchInput?.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      hideRecordAutocomplete();
      void handleRecordSearchSubmit();
    } else if (event.key === 'Escape') {
      hideRecordAutocomplete();
    }
  });
  els.recordSearchInput?.addEventListener('focus', queueRecordAutocomplete);
  els.recordSearchButton?.addEventListener('click', () => {
    hideRecordAutocomplete();
    void handleRecordSearchSubmit();
  });
  els.recordSearchClear?.addEventListener('click', () => {
    if (els.recordSearchInput) els.recordSearchInput.value = '';
    hideRecordAutocomplete();
    state.recordAiSearchPrompt = '';
    state.recordPage = 1;
    applyRecordFilters();
  });
  documentObject.addEventListener('click', (event) => {
    if (!event.target.closest?.('.record-search-block')) hideRecordAutocomplete();
  });
  [els.recordTypeFilter, els.recordCategoryFilter, els.recordStatusFilter, els.recordIssueFilter].forEach((node) => {
    node?.addEventListener('change', () => {
      state.recordPage = 1;
      if ((node === els.recordIssueFilter || node === els.recordTypeFilter) && els.recordIssueFilter?.value) {
        void loadRecordsData();
        return;
      }
      applyRecordFilters();
    });
  });
  els.recordResetFilters?.addEventListener('click', resetRecordFilters);
  els.recordPageSize?.addEventListener('change', () => {
    state.recordRowsPerPage = Number(els.recordPageSize.value || 25);
    state.recordPage = 1;
    renderRecordTable();
  });
  els.recordPrevPage?.addEventListener('click', () => changeRecordPage(-1));
  els.recordNextPage?.addEventListener('click', () => changeRecordPage(1));
  els.recordExport?.addEventListener('click', exportRecordListCsv);
  documentObject.querySelectorAll('[data-record-quick]').forEach((button) => {
    button.addEventListener('click', () => applyQuickRecordFilter(button.dataset.recordQuick || ''));
  });
  void loadRecordsData();
}

export function initRecordDetail({
  els,
  state,
  locationObject = location,
  loadRecordDetail,
  copyText
}) {
  els.refreshButton?.addEventListener('click', () => loadRecordDetail());
  els.detailCopyLink?.addEventListener('click', () => copyText(locationObject.href));
  els.detailCopyId?.addEventListener('click', () => copyText(state.recordDetailViewModel?.identity.id || ''));
  els.detailCopyGlobalId?.addEventListener('click', () => copyText(state.recordDetailViewModel?.identity.globalId || ''));
  void loadRecordDetail();
}

export function initStats({
  els,
  fillStatsFilters,
  renderStatsLoading,
  loadStatsDataAsync,
  markForceFresh,
  applyStatsFiltersAndLoad,
  exportStatsCsv,
  resetStatsFilters
}) {
  fillStatsFilters();
  renderStatsLoading();
  els.refreshButton?.addEventListener('click', () => loadStatsDataAsync());
  els.statsRefresh?.addEventListener('click', markForceFresh, { capture: true });
  els.statsRefresh?.addEventListener('click', applyStatsFiltersAndLoad);
  els.statsExport?.addEventListener('click', exportStatsCsv);
  els.statsResetFilters?.addEventListener('click', resetStatsFilters);
  [els.statsAreaFilter, els.statsTypeFilter].forEach((node) => {
    node?.addEventListener('change', () => {
      applyStatsFiltersAndLoad();
    });
  });
  els.statsCityFilter?.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    applyStatsFiltersAndLoad();
  });
  void loadStatsDataAsync();
}

export function initHelp({
  els,
  types,
  qualityCriteria,
  qualityHelpers,
  escapeHtml,
  formatNumber,
  priorityRank,
  renderHelpPageModel
}) {
  renderHelpPageModel({
    els,
    types,
    qualityCriteria,
    qualityHelpers,
    escapeHtml,
    formatNumber,
    priorityRank
  });
}
