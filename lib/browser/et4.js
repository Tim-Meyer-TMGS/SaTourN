export function extractItems(payload) {
  const keys = ['items', 'results', 'Result', 'Documents', 'document', 'data'];
  for (const key of keys) {
    const value = payload?.[key];
    if (Array.isArray(value)) return value;
    if (value && typeof value === 'object') {
      for (const nestedKey of keys) {
        const nested = value?.[nestedKey];
        if (Array.isArray(nested)) return nested;
      }
    }
  }

  for (const value of Object.values(payload || {})) {
    if (Array.isArray(value) && value.length && typeof value[0] === 'object') {
      return value;
    }
  }

  return [];
}

export function extractTotal(payload) {
  const keys = [
    'overallcount', 'overallCount', 'total', 'Total', 'totalHits', 'TotalHits',
    'numFound', 'NumFound', 'count', 'Count', 'hits', 'Hits'
  ];

  for (const key of keys) {
    const value = payload?.[key];
    if (Number.isInteger(value)) return value;
    if (typeof value === 'string' && /^\d+$/.test(value)) return parseInt(value, 10);
  }

  for (const metaKey of ['meta', 'Meta', 'info', 'Info']) {
    const meta = payload?.[metaKey];
    if (meta && typeof meta === 'object') {
      for (const key of keys) {
        const value = meta?.[key];
        if (Number.isInteger(value)) return value;
        if (typeof value === 'string' && /^\d+$/.test(value)) return parseInt(value, 10);
      }
    }
  }

  return null;
}

export function extractId(item) {
  if (!item || typeof item !== 'object') return '';
  if (item?.global_id != null) return String(item.global_id);
  if (item?.globalId != null) return String(item.globalId);
  if (item?.id != null) return String(item.id);

  for (const key of ['Id', 'ID', 'objectId', 'ObjectId', 'oid', 'Oid']) {
    if (item?.[key] != null) return String(item[key]);
  }

  if (item?.channel != null && item?.id != null) {
    return `${String(item.channel)}_${String(item.id)}`;
  }

  return '';
}
