export function renderPrimarySystemsForTask({
  task,
  taskItems,
  renderPrimarySystemsForRecords,
  renderPrimarySystemsForTaskPageModel
}) {
  renderPrimarySystemsForTaskPageModel({
    task,
    taskItems,
    renderPrimarySystemsForRecords
  });
}

export function renderPrimarySystemsForRecords({
  rows,
  els,
  collectPrimarySystems,
  renderPrimarySystemLogo,
  escapeHtml,
  formatNumber,
  getPrimarySystem,
  getSourceId,
  exportTaskRecordsCsv,
  copyText,
  hidePrimarySystems,
  renderPrimarySystemsForRecordsPageModel
}) {
  renderPrimarySystemsForRecordsPageModel({
    rows,
    els,
    collectPrimarySystems,
    renderPrimarySystemLogo,
    escapeHtml,
    formatNumber,
    getPrimarySystem,
    getSourceId,
    exportTaskRecordsCsv,
    copyText,
    hidePrimarySystems
  });
}

export function renderPrimarySystemLogo({
  system,
  escapeHtml,
  renderPrimarySystemLogoPageModel
}) {
  return renderPrimarySystemLogoPageModel({
    system,
    escapeHtml
  });
}

export function collectPrimarySystems({
  rows,
  getPrimarySystem,
  collectPrimarySystemsModel,
  collectPrimarySystemsPageModel
}) {
  return collectPrimarySystemsPageModel({
    rows,
    getPrimarySystem,
    collectPrimarySystemsModel
  });
}

export function hidePrimarySystems({
  els,
  hidePrimarySystemsPageModel
}) {
  hidePrimarySystemsPageModel({
    els
  });
}

export function getSourceId({
  item,
  getFirst,
  textValue,
  getSourceIdModel,
  getSourceIdPageModel
}) {
  return getSourceIdPageModel({
    item,
    getFirst,
    textValue,
    getSourceIdModel
  });
}

export function getPrimarySystem({
  item,
  textValue,
  getPrimarySystemModel,
  getPrimarySystemPageModel
}) {
  return getPrimarySystemPageModel({
    item,
    textValue,
    getPrimarySystemModel
  });
}

export function getKeywordValues({
  item,
  textValue,
  getKeywordValuesModel,
  getKeywordValuesPageModel
}) {
  return getKeywordValuesPageModel({
    item,
    textValue,
    getKeywordValuesModel
  });
}

export function safeKeywordArray({
  value,
  textValue,
  safeKeywordArrayModel,
  safeKeywordArrayPageModel
}) {
  return safeKeywordArrayPageModel({
    value,
    textValue,
    safeKeywordArrayModel
  });
}

export function exportTaskRecordsCsv({
  state,
  forcedRows,
  getSourceId,
  csvValue,
  downloadText
}) {
  if (!state.selectedTask) return;
  const scopedRows = Array.isArray(forcedRows) ? forcedRows : null;
  const rowsToExport = scopedRows || (
    state.taskRecordRows.length
      ? state.taskRecordRows
      : state.taskItems.filter((item) => item.missingCriteria?.includes(state.selectedTask.criterionId))
  );
  if (!rowsToExport.length) return;

  const rows = [
    ['Titel', 'Typ', 'Ort', 'Gebiet', 'Problem', 'Nächster Schritt', 'ID', 'global_id', 'source_id'],
    ...rowsToExport.map((row) => [
      row.title,
      row.type,
      row.city,
      row.region,
      state.selectedTask.label,
      state.selectedTask.recommendation,
      row.id,
      row.globalId,
      getSourceId(row)
    ])
  ];

  const text = rows.map((row) => row.map(csvValue).join(';')).join('\n');
  downloadText('satourn_pflegeaufgabe_datensaetze.csv', text, 'text/csv;charset=utf-8');
}
