export function openTaskRecordsOnRecordsPage({
  task,
  type,
  context,
  saveRecordViewState,
  showTaskMessage,
  openTaskRecordsOnRecordsPageModel
}) {
  openTaskRecordsOnRecordsPageModel({
    task,
    type,
    context,
    saveRecordViewState,
    showTaskMessage
  });
}

export function resolveTaskCriterionId({
  task,
  type = '',
  resolveTaskCriterionIdModel
}) {
  return resolveTaskCriterionIdModel(task, type);
}

export function openOverviewIssueOnRecordsPage({
  issue,
  context,
  saveRecordViewState,
  openOverviewIssueOnRecordsPageModel
}) {
  openOverviewIssueOnRecordsPageModel({
    issue,
    context,
    saveRecordViewState
  });
}
