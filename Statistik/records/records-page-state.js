export function saveRecordListState({
  rows,
  storageKey,
  buildDetailUrl,
  saveRecordListStateToSession
}) {
  saveRecordListStateToSession(storageKey, rows, {
    buildDetailUrl
  });
}

export function loadRecordListState({
  storageKey,
  loadRecordListStateFromSession
}) {
  return loadRecordListStateFromSession(storageKey);
}

export function showRecordsMessage({
  els,
  message,
  showRecordsMessageState
}) {
  showRecordsMessageState(els, message);
}

export function setRecordCount({
  node,
  value,
  formatNumber,
  setRecordCountText
}) {
  setRecordCountText(node, value, formatNumber);
}

export function showDetailMessage({
  els,
  message
}) {
  if (!els.recordDetailMessage) return;
  els.recordDetailMessage.textContent = message || '';
  els.recordDetailMessage.hidden = !message;
}
