export function buildPendingRecordViewMessage({ recordAiSearchPrompt = '', pendingRecordView = null, qualityCriteria = [] }) {
  if (recordAiSearchPrompt) {
    return `KI-Suche aktiv: ${recordAiSearchPrompt}`;
  }

  if (!pendingRecordView) {
    return '';
  }

  const criterion = qualityCriteria.find((entry) => entry.id === pendingRecordView.criterionId);
  const label = pendingRecordView.label || criterion?.label || pendingRecordView.criterionId;
  const typeText = pendingRecordView.type ? ` (${pendingRecordView.type})` : '';
  return label ? `Gefiltert nach Pflegeaufgabe: ${label}${typeText}.` : 'Gefiltert nach Pflegeaufgabe.';
}

export function getRecordSearchText(row, qualityCriteria) {
  if (!row.searchText) {
    const issueLabels = row.missingCriteria
      .map((id) => qualityCriteria.find((criterion) => criterion.id === id)?.label || id)
      .join(' ');
    row.searchText = [
      row.title,
      row.id,
      row.globalId,
      row.city,
      row.region,
      row.category,
      row.type,
      row.primaryIssue,
      issueLabels
    ].join(' ').toLowerCase();
  }
  return row.searchText;
}

export function itemMatchesRecordSearch(row, query, qualityCriteria) {
  const needle = String(query || '').toLowerCase();
  return getRecordSearchText(row, qualityCriteria).includes(needle);
}

export function filterRecordRows(rows, {
  query = '',
  type = '',
  category = '',
  status = '',
  issue = '',
  qualityCriteria = [],
  serverSearchKeys = new Set(),
  getIdentityKey
}) {
  return rows.filter((row) => {
    if (query && !itemMatchesRecordSearch(row, query, qualityCriteria) && !serverSearchKeys.has(getIdentityKey(row))) return false;
    if (type && row.type !== type) return false;
    if (category && row.category !== category) return false;
    if (status && row.qualityStatus !== status) return false;
    if (issue && !row.missingCriteria.includes(issue)) return false;
    return true;
  });
}

export function getPrimaryIssueId(item, { qualityCriteria = [], priorityRank }) {
  const missing = Array.isArray(item.missingCriteria) ? item.missingCriteria : [];
  return [...missing]
    .sort((a, b) => {
      const ca = qualityCriteria.find((criterion) => criterion.id === a);
      const cb = qualityCriteria.find((criterion) => criterion.id === b);
      return priorityRank(cb?.priority) - priorityRank(ca?.priority);
    })[0] || '';
}

export function getIdFromGlobalId(globalId) {
  const match = String(globalId || '').trim().match(/^[a-z]+_(\d+)$/i);
  return match ? match[1] : '';
}

export function uniqueValues(values) {
  return Array.from(new Set(values.filter(Boolean)));
}
