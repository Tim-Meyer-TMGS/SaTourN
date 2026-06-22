export function renderTaskKpis({
  els,
  state,
  computeTaskSummary,
  formatNumber,
  formatPercent,
  percent
}) {
  const {
    totalTasks,
    highTasks,
    affectedHits,
    openDataHits,
    potential
  } = computeTaskSummary(state.filteredTaskRows);

  if (els.taskKpiOpen) els.taskKpiOpen.textContent = formatNumber(totalTasks);
  if (els.taskKpiHigh) els.taskKpiHigh.textContent = formatNumber(highTasks);
  if (els.taskKpiHighDetail) els.taskKpiHighDetail.textContent = totalTasks ? `${formatPercent(percent(highTasks, totalTasks))} aller Aufgaben` : '-';
  if (els.taskKpiAffected) els.taskKpiAffected.textContent = formatNumber(affectedHits);
  if (els.taskKpiOpenData) els.taskKpiOpenData.textContent = formatPercent(percent(openDataHits, affectedHits));
  if (els.taskKpiPotential) els.taskKpiPotential.textContent = potential;
  if (els.taskListTitle) els.taskListTitle.textContent = `Alle Pflegeaufgaben (${formatNumber(totalTasks)})`;
  if (els.taskDataNote) {
    if (state.qualityDataMeta.mode === 'snapshot') {
      els.taskDataNote.textContent = state.qualityDataMeta.truncated
        ? 'Die Pflegeaufgaben stammen aus dem gecachten Nachtlauf. Der Lauf war begrenzt; einzelne Listen können weiter live nachgeladen werden.'
        : 'Die Pflegeaufgaben stammen aus dem gecachten Nachtlauf und basieren auf vollständig gescannten Datensätzen.';
      return;
    }
    const unsupportedCount = state.qualityDataMeta.unsupportedCriteria?.length || 0;
    const failedText = state.qualityDataMeta.failedCounts ? ` ${formatNumber(state.qualityDataMeta.failedCounts)} Count-Abfragen konnten nicht geladen werden.` : '';
    els.taskDataNote.textContent = unsupportedCount || failedText
      ? `Einzelne Aufgaben werden bei Bedarf live nachgeladen.${failedText}`
      : 'Pflegeaufgaben sind geladen.';
  }
}

export function renderTaskTable({
  state,
  els,
  taskIcon,
  priorityLabel,
  renderTypeChips,
  impactBadgeClass,
  impactLabel,
  formatNumber,
  escapeHtml,
  selectTask,
  renderTaskTableState
}) {
  state.taskPage = renderTaskTableState(els, {
    rows: state.filteredTaskRows,
    selectedTask: state.selectedTask,
    taskPage: state.taskPage,
    taskRowsPerPage: state.taskRowsPerPage,
    taskIcon,
    priorityLabel,
    renderTypeChips,
    impactBadgeClass,
    impactLabel,
    formatNumber,
    escapeHtml,
    onSelectTask: selectTask
  });
}

export function selectTask({
  taskId,
  state,
  findTaskById,
  clearTaskRecords,
  renderTaskTable,
  renderTaskDetail
}) {
  state.selectedTask = findTaskById(state.filteredTaskRows, taskId)
    || findTaskById(state.taskRows, taskId)
    || null;
  state.selectedTaskType = '';
  clearTaskRecords();
  renderTaskTable();
  renderTaskDetail();
}

export function renderTaskDetail({
  state,
  els,
  escapeHtml,
  renderTypeChips,
  impactBadgeClass,
  impactLabel,
  taskImpactText,
  clearTaskRecords,
  openTaskRecordsOnRecordsPage,
  hidePrimarySystems,
  renderPrimarySystemsForTask,
  renderTaskDetailState
}) {
  const task = state.selectedTask;
  hidePrimarySystems();
  state.selectedTaskType = renderTaskDetailState(els, {
    task,
    selectedTaskType: state.selectedTaskType,
    escapeHtml,
    renderTypeChips,
    impactBadgeClass,
    impactLabel,
    taskImpactText,
    clearTaskRecords,
    openTaskRecordsOnRecordsPage
  });
  if (task) renderPrimarySystemsForTask(task);
}

export function openTaskRecordsOnRecordsPage({
  task,
  type,
  context,
  saveRecordViewState,
  showTaskMessage,
  openTaskRecordsOnRecordsPageModel,
  openTaskRecordsOnRecordsPagePageModel
}) {
  openTaskRecordsOnRecordsPagePageModel({
    task,
    type,
    context,
    saveRecordViewState,
    showTaskMessage,
    openTaskRecordsOnRecordsPageModel
  });
}

export function resolveTaskCriterionId({
  task,
  type,
  resolveTaskCriterionIdModel,
  resolveTaskCriterionIdPageModel
}) {
  return resolveTaskCriterionIdPageModel({
    task,
    type,
    resolveTaskCriterionIdModel
  });
}

export function openOverviewIssueOnRecordsPage({
  issue,
  context,
  saveRecordViewState,
  openOverviewIssueOnRecordsPageModel,
  openOverviewIssueOnRecordsPagePageModel
}) {
  openOverviewIssueOnRecordsPagePageModel({
    issue,
    context,
    saveRecordViewState,
    openOverviewIssueOnRecordsPageModel
  });
}

export function renderTaskRecords({
  els,
  task,
  type,
  rows,
  payload,
  formatNumber,
  escapeHtml,
  buildRecordDetailUrl,
  copyText,
  renderTaskRecordsState
}) {
  const stats = renderTaskRecordsState(els, {
    task,
    type,
    rows,
    payload,
    formatNumber,
    escapeHtml,
    buildRecordDetailUrl,
    copyText
  });
  if (stats.budgetExhausted) console.debug('Qualitätsscan-Budget ausgeschöpft.', stats);
}

export function renderTasksLoading({ els, renderTasksLoadingState }) {
  renderTasksLoadingState(els);
}

export function renderTasksEmpty({ els, message, renderTasksEmptyState }) {
  renderTasksEmptyState(els, message);
}

export function resetTaskFilters({
  els,
  state,
  applyTaskFilters
}) {
  if (els.taskSearchInput) els.taskSearchInput.value = '';
  if (els.taskPriorityFilter) els.taskPriorityFilter.value = '';
  if (els.taskTypeFilter) els.taskTypeFilter.value = '';
  if (els.taskCheckFilter) els.taskCheckFilter.value = '';
  if (els.taskImpactFilter) els.taskImpactFilter.value = '';
  state.taskPage = 1;
  applyTaskFilters();
}

export function changeTaskPage({
  state,
  delta,
  renderTaskTable
}) {
  state.taskPage += delta;
  renderTaskTable();
}

export function fillTaskTypeFilter({
  els,
  types
}) {
  if (!els.taskTypeFilter || els.taskTypeFilter.options.length > 1) return;
  types.forEach((type) => els.taskTypeFilter.append(new Option(`Datentyp: ${type}`, type)));
}

export function clearTaskRecords({
  state,
  els,
  clearTaskRecordsState
}) {
  state.taskRecordRows = [];
  state.taskRecordMeta = null;
  clearTaskRecordsState(els);
}

export function showTaskMessage({
  els,
  message,
  showTaskMessageState
}) {
  showTaskMessageState(els, message);
}
