export function getNestedValue(source: unknown, path: string): unknown {
  if (!source || !path) return null;

  return path
    .replace(/\[(\w+)\]/g, '.$1')
    .split('.')
    .filter(Boolean)
    .reduce<unknown>((current, segment) => {
      if (!current || typeof current !== 'object') return null;
      return (current as Record<string, unknown>)[segment] ?? null;
    }, source);
}

export function textValue(value: unknown): string {
  if (value == null) return '';
  if (Array.isArray(value)) return value.map(textValue).find(Boolean) || '';
  if (typeof value === 'object') {
    const candidate = value as Record<string, unknown>;
    return (
      textValue(candidate.title)
      || textValue(candidate.name)
      || textValue(candidate.label)
      || textValue(candidate.value)
      || textValue(candidate.text)
      || ''
    );
  }
  return String(value).trim();
}

export function getFirst(raw: unknown, paths: string[]) {
  for (const path of paths) {
    const text = textValue(getNestedValue(raw, path));
    if (text) return text;
  }
  return '';
}

export function extractRecordId(raw: unknown) {
  if (!raw || typeof raw !== 'object') return '';
  const item = raw as Record<string, unknown>;
  return String(item.id ?? item.ID ?? item.Id ?? '');
}

export function getRecordCategory(raw: unknown) {
  const categories = getNestedValue(raw, 'categories');
  if (Array.isArray(categories)) return categories.map((entry) => textValue(entry)).find(Boolean) || '';
  return textValue(categories);
}

export function getRecordArea(raw: unknown, fallbackArea = '') {
  const areas = getNestedValue(raw, 'areas');
  if (Array.isArray(areas)) return areas.map((entry) => textValue(entry)).find(Boolean) || fallbackArea;
  return textValue(areas) || fallbackArea;
}

export function getArrayFromPaths(raw: unknown, paths: string[]) {
  for (const path of paths) {
    const value = getNestedValue(raw, path);
    if (Array.isArray(value)) return value;
  }
  return [];
}

export function arrayOfStrings(value: unknown) {
  return Array.isArray(value) ? value.map((entry) => String(entry)) : [];
}

export function getTypeFromGlobalId(globalId: string) {
  const prefix = String(globalId || '').match(/^([a-z]+)_\d+$/i)?.[1]?.toLowerCase() || '';
  switch (prefix) {
    case 'poi': return 'POI';
    case 'tour': return 'Tour';
    case 'hotel': return 'Hotel';
    case 'event': return 'Event';
    case 'gastro': return 'Gastro';
    case 'package': return 'Package';
    default: return '';
  }
}

export function getRecordEmail(raw: unknown) {
  return getFirst(raw, ['email', 'emailRequest', 'address.email', 'addresses.email', 'addresses_mail.email']);
}

export function getRecordWeb(raw: unknown) {
  return getFirst(raw, ['web', 'url', 'website', 'address.web', 'addresses.web']);
}

export function buildRecordDetailUrl(item: { type?: unknown; globalId?: unknown; id?: unknown }) {
  const params = new URLSearchParams();
  const type = String(item.type || '');
  const globalId = String(item.globalId || '');
  const id = String(item.id || '');

  if (type) params.set('type', type);
  if (globalId) params.set('global_id', globalId);
  else if (id) params.set('id', id);

  return `/record-detail?${params.toString()}`;
}
