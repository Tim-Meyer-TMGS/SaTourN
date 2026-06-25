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
