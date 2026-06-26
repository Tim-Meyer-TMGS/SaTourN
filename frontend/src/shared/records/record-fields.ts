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

export function getRecordPhone(raw: unknown) {
  return getFirst(raw, ['phone', 'phone2', 'telephone', 'address.phone', 'addresses.phone']);
}

export function buildVerifiedEt4Url(item: { type?: unknown; globalId?: unknown }) {
  if (String(item.type || '') !== 'POI' || !item.globalId) return '';
  return `https://pages.et4.de/de/statistik_sachsen/wlan/detail/POI/${encodeURIComponent(String(item.globalId))}/x`;
}

function getKeywordValues(item: unknown) {
  const raw = item && typeof item === 'object' && 'raw' in item
    ? (item as { raw?: unknown }).raw
    : item;
  const direct = item && typeof item === 'object' ? item as Record<string, unknown> : {};
  const rawObject = raw && typeof raw === 'object' ? raw as Record<string, unknown> : {};
  return [
    rawObject.keywords_old,
    rawObject.keywords,
    direct.keywords_old,
    direct.keywords
  ].flatMap((value) => Array.isArray(value) ? value.map(textValue) : []).filter(Boolean);
}

export function getPrimarySystem(item: unknown) {
  const keywords = getKeywordValues(item).map((keyword) => keyword.toLowerCase());
  if (keywords.includes('import_source_feratel') || keywords.includes('hassystemid_feratel')) {
    return {
      id: 'feratel',
      name: 'feratel',
      short: 'FD'
    };
  }
  if (keywords.includes('import_source_outdooractive')) {
    return {
      id: 'outdooractive',
      name: 'outdooractive',
      short: 'OA'
    };
  }
  return {
    id: 'satourn',
    name: 'SaTourN',
    short: 'ST'
  };
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

export function buildQualityEvaluationInput(
  raw: unknown,
  options: {
    fallbackType?: string;
    fallbackArea?: string;
    fallbackCity?: string;
  } = {}
) {
  const globalId = getFirst(raw, ['global_id', 'globalId']);
  const type = options.fallbackType || getFirst(raw, ['type', 'typeName']) || getTypeFromGlobalId(globalId);

  return {
    raw,
    id: extractRecordId(raw),
    globalId,
    title: getFirst(raw, ['title', 'name', 'presentation.title']) || 'Ohne Titel',
    type,
    region: getRecordArea(raw, options.fallbackArea || ''),
    city: getFirst(raw, ['city', 'location.city', 'address.city']) || options.fallbackCity || '',
    category: getRecordCategory(raw),
    updatedAt: getFirst(raw, ['changed', 'updatedAt', 'lastModified', 'modified', 'changeDate'])
  };
}
