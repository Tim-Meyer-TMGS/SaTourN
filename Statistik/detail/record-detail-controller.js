export async function loadRecordDetail({
  state,
  els,
  locationObject,
  escapeHtml,
  formatDateTime,
  formatNumber,
  formatRecordDate,
  evaluateQualityForItem,
  renderDetailLoadingState,
  renderDetailEmptyState,
  renderRecordDetailPage,
  criterionStatusClass,
  getCriterionDisplayStatus,
  buildRecordDetailUrl,
  loadRecordListState,
  copyText,
  showDetailMessage,
  fetchRecordDetailItem,
  normalizeItem,
  getFirst,
  getRecordDetailViewModel
}) {
  showDetailMessage('');
  renderDetailLoadingState(els);

  const params = new URLSearchParams(locationObject.search);
  const type = params.get('type') || state.context.type || '';
  const id = params.get('id') || '';
  const globalId = params.get('global_id') || params.get('globalId') || '';

  if (!id && !globalId) {
    renderDetailEmptyState(
      els,
      'Noch kein Datensatz ausgewählt. Suche in der Datensatzliste nach Titel, ID oder Ort und öffne einen Eintrag.',
      escapeHtml,
      showDetailMessage
    );
    return;
  }

  try {
    const raw = await fetchRecordDetailItem({ type, id, globalId });
    if (!raw) {
      renderDetailEmptyState(
        els,
        'Für diese ID wurde kein Datensatz gefunden. Bitte prüfe Typ und ID oder kehre zur Datensatzliste zurück.',
        escapeHtml,
        showDetailMessage
      );
      return;
    }

    const normalized = normalizeItem(raw, type || getFirst(raw, ['type', 'typeName']));
    const evaluated = evaluateQualityForItem(normalized);
    state.recordDetailItem = evaluated;
    state.recordDetailViewModel = getRecordDetailViewModel(evaluated);

    renderRecordDetailPage({
      els,
      model: state.recordDetailViewModel,
      escapeHtml,
      formatNumber,
      formatRecordDate,
      criterionStatusClass,
      getCriterionDisplayStatus,
      buildRecordDetailUrl,
      loadRecordListState,
      copyText
    });

    if (els.lastUpdated) {
      els.lastUpdated.textContent = `Letzte Aktualisierung: ${formatDateTime(new Date())}`;
    }
  } catch (error) {
    console.error('Datensatz-Detail konnte nicht geladen werden.', error);
    renderDetailEmptyState(els, 'Der Datensatz konnte nicht geladen werden.', escapeHtml, showDetailMessage);
  }
}
