export async function loadRecordsData({
  state,
  els,
  context,
  formatDateTime,
  showRecordsMessage,
  renderRecordsLoading,
  renderRecordsEmpty,
  loadRecordRowsForPendingView,
  loadRecordRowsForIssueSelection,
  buildRecordViewModel,
  fillRecordDynamicFilters,
  applyPendingRecordView,
  applyRecordFilters,
  renderPendingRecordViewMessage
}) {
  const startedAt = new Date();
  state.recordServerSearchKeys = new Set();
  state.recordAiSearchPrompt = '';
  showRecordsMessage('');
  renderRecordsLoading();

  try {
    const usesCriterionView = Boolean(state.pendingRecordView?.criterionId);
    const selectedIssue = els.recordIssueFilter?.value || '';
    const selectedType = els.recordTypeFilter?.value || context.type || '';
    const result = usesCriterionView
      ? await loadRecordRowsForPendingView(state.pendingRecordView)
      : selectedIssue
        ? await loadRecordRowsForIssueSelection(selectedIssue, selectedType)
        : { rows: [], meta: null };

    state.recordItems = result.rows;
    state.recordRows = result.rows.map(buildRecordViewModel);

    if (!usesCriterionView && !selectedIssue) {
      state.recordDataMeta = {
        mode: 'empty',
        collectedItems: 0,
        estimatedTotalItems: 0,
        truncated: false
      };
    } else if (result.meta) {
      state.recordDataMeta = result.meta;
    }

    state.recordPage = 1;
    fillRecordDynamicFilters();
    applyPendingRecordView();
    applyRecordFilters();
    renderPendingRecordViewMessage();

    if (els.lastUpdated) {
      els.lastUpdated.textContent = `Letzte Aktualisierung: ${formatDateTime(startedAt)}`;
    }
  } catch (error) {
    console.error('Datensätze konnten nicht geladen werden.', error);
    renderRecordsEmpty('Die Datensätze konnten nicht geladen werden. Bitte versuche es später erneut.');
  }
}
