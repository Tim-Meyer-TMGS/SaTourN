export function csvValue(value) {
  return `"${String(value ?? '').replaceAll('"', '""')}"`;
}

export function percent(value, total) {
  return total > 0 ? (value / total) * 100 : 0;
}

export function formatNumber(value) {
  return Number(value || 0).toLocaleString('de-DE');
}

export function formatPercent(value) {
  return `${Number(value || 0).toLocaleString('de-DE', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1
  })} %`;
}

export function formatDateTime(date) {
  return date.toLocaleString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export function formatRecordDate(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return String(value).slice(0, 10) || '-';
  return date.toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

export function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
