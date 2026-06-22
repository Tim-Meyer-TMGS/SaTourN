export function loadWorkContext({
  workContextKey,
  types,
  loadStoredWorkContext
}) {
  return loadStoredWorkContext(workContextKey, types);
}

export function saveWorkContext({
  state,
  context,
  workContextKey,
  types,
  saveStoredWorkContext,
  renderWorkContext
}) {
  state.context = saveStoredWorkContext(workContextKey, context, types);
  renderWorkContext();
  return state.context;
}

export function saveRecordViewState({
  recordViewStateKey,
  viewState,
  types,
  saveRecordViewStateToSession
}) {
  saveRecordViewStateToSession(recordViewStateKey, viewState, types);
}

export function loadRecordViewStateFromRoute({
  recordViewStateKey,
  types,
  loadRecordViewStateFromRouteStorage
}) {
  return loadRecordViewStateFromRouteStorage(recordViewStateKey, types);
}

export function clearRecordViewState({
  recordViewStateKey,
  clearRecordViewStateStorage
}) {
  clearRecordViewStateStorage(recordViewStateKey);
}

export function fillContextControls({
  els,
  areas,
  types,
  fillContextControlsModel
}) {
  fillContextControlsModel(els, areas, types);
}

export function renderWorkContext({
  els,
  context,
  areas,
  renderWorkContextModel
}) {
  renderWorkContextModel(els, context, areas);
}

export function openContextDialog({
  els,
  context,
  fillContextControls,
  openContextDialogModel
}) {
  openContextDialogModel(els, context, fillContextControls);
}

export function handleContextSubmit({
  event,
  els,
  page,
  state,
  clearTransientRequestCache,
  markForceFresh,
  saveWorkContext,
  fillStatsFilters,
  loadOverviewDataAsync,
  loadTasksData,
  loadRecordsData,
  loadRecordDetail,
  loadStatsDataAsync
}) {
  if (event.submitter?.value === 'cancel') return;

  event.preventDefault();
  clearTransientRequestCache();
  markForceFresh();

  saveWorkContext({
    area: els.contextArea?.value || '',
    city: els.contextCity?.value.trim() || '',
    type: els.contextType?.value || ''
  });

  els.contextDialog?.close?.();

  if (page === 'overview') void loadOverviewDataAsync();
  if (page === 'tasks') void loadTasksData();
  if (page === 'records') void loadRecordsData();
  if (page === 'record-detail') void loadRecordDetail();
  if (page === 'stats') {
    fillStatsFilters();
    void loadStatsDataAsync();
  }

  return state.context;
}
