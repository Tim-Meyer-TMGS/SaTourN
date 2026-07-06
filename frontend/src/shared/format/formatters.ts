export function formatNumber(value: number) {
  return new Intl.NumberFormat('de-DE').format(value);
}

export function calculatePercent(value: number, total: number) {
  return total > 0 ? (value / total) * 100 : 0;
}

export function formatPercent(value: number) {
  return `${value.toLocaleString('de-DE', { maximumFractionDigits: 1 })} %`;
}

export function clampPercent(value: number) {
  return Math.max(0, Math.min(100, value));
}

export function formatRecordDate(value: unknown) {
  if (!value) return '-';

  const text = String(value);
  const date = new Date(text);
  if (!Number.isFinite(date.getTime())) return text.slice(0, 10) || '-';

  return date.toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}
