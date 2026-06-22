export async function loadTasksData({
  state,
  els,
  formatDateTime,
  showTaskMessage,
  renderTasksLoading,
  hidePrimarySystems,
  clearTaskRecords,
  canCalculateQualityForContext,
  loadTaskIssueSummary,
  buildTaskRows,
  findTaskById,
  taskMatchesIdentifier,
  resolveTaskTypeByCriterionId,
  applyTaskFilters,
  renderTaskDetail,
  renderTasksEmpty
}) {
  const startedAt = new Date();
  const loadId = ++state.taskLoadId;
  showTaskMessage('');
  renderTasksLoading();
  hidePrimarySystems();
  clearTaskRecords();

  const applyIssueSummary = (issueSummary) => {
    if (loadId !== state.taskLoadId) return;
    const selectedId = state.selectedTask?.taskId || state.selectedTask?.criterionId || state.pendingTaskId || '';
    state.taskItems = [];
    state.taskRows = buildTaskRows(issueSummary);
    state.selectedTask = findTaskById(state.taskRows, selectedId)
      || state.taskRows[0]
      || null;
    if (state.selectedTask && taskMatchesIdentifier(state.selectedTask, state.pendingTaskId)) state.pendingTaskId = '';
    const preferredTaskType = resolveTaskTypeByCriterionId(state.selectedTask, selectedId);
    state.selectedTaskType = preferredTaskType
      || (state.selectedTask?.affectedTypes?.includes(state.selectedTaskType) ? state.selectedTaskType : '');
    state.taskPage = Math.min(state.taskPage || 1, Math.max(1, Math.ceil(state.taskRows.length / state.taskRowsPerPage)));
    applyTaskFilters();
    renderTaskDetail();
  };

  try {
    const taskData = await loadTaskIssueSummary({
      loadId,
      isStale: () => loadId !== state.taskLoadId,
      canCalculateQuality: canCalculateQualityForContext(),
      onUpdate: ({ issueSummary, items, aggregations, meta }) => {
        if (loadId !== state.taskLoadId) return;
        if (Array.isArray(items)) state.taskItems = items;
        if (aggregations) state.qualityAggregations = aggregations;
        if (meta) state.qualityDataMeta = meta;
        applyIssueSummary(issueSummary);
      }
    });
    if (loadId !== state.taskLoadId) return;
    if (Array.isArray(taskData.items)) state.taskItems = taskData.items;
    if (taskData.aggregations) state.qualityAggregations = taskData.aggregations;
    if (taskData.meta) state.qualityDataMeta = taskData.meta;
    applyIssueSummary(taskData.issueSummary);
    state.taskPage = 1;
    applyTaskFilters();
    renderTaskDetail();
    if (els.lastUpdated) {
      els.lastUpdated.textContent = `Letzte Aktualisierung: ${formatDateTime(startedAt)}`;
    }
  } catch (error) {
    console.error('Pflegeaufgaben konnten nicht geladen werden.', error);
    renderTasksEmpty('Die Pflegeaufgaben konnten nicht geladen werden.');
  }
}
