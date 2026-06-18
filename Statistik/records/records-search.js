export function looksLikeRecordId(query) {
  const value = String(query || '').trim();
  return /^\d{5,}$/.test(value) || /^[a-z]_\d{4,}$/i.test(value) || /^[a-z]+[-_:]\w{4,}$/i.test(value);
}

export function getRecordIdentityKey(record) {
  return record?.globalId || record?.global_id || record?.id || `${record?.type || ''}:${record?.title || ''}`;
}

export function mergeRecordItems(existing, incoming) {
  const map = new Map();
  [...existing, ...incoming].forEach((item) => {
    const key = getRecordIdentityKey(item);
    if (key) map.set(key, item);
  });
  return Array.from(map.values());
}

export function cleanFullTextQuery(query, cleanQueryValue) {
  return cleanQueryValue(query)
    .replace(/[\(\)\{\}\[\]]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export async function searchSingleRecordById({
  query,
  context,
  selectedType,
  types,
  buildQuery,
  cleanQueryValue,
  buildUrl,
  fetchJsonCached,
  extractItems,
  normalizeItem
}) {
  const targetTypes = selectedType ? [selectedType] : types;
  const contextQuery = buildQuery(context);
  const idQuery = cleanQueryValue(query);
  const queryVariants = [
    idQuery,
    `id:"${idQuery}"`,
    `global_id:"${idQuery}"`,
    `globalid:${idQuery}`
  ];
  const results = [];

  for (const type of targetTypes) {
    for (const variant of queryVariants) {
      const combinedQuery = [contextQuery, variant].filter(Boolean).join(' AND ');
      const payload = await fetchJsonCached(buildUrl(type, combinedQuery, { limit: 10 }));
      results.push(...extractItems(payload).map((raw) => normalizeItem(raw, type)));
      if (results.length) break;
    }
    if (results.length) break;
  }

  return results;
}

export async function searchRecordsByText({
  query,
  context,
  selectedType,
  types,
  buildQuery,
  cleanQueryValue,
  buildUrl,
  fetchJsonCached,
  extractItems,
  extractTotal,
  normalizeItem,
  onTypeError
}) {
  const termQuery = cleanFullTextQuery(query, cleanQueryValue);
  if (!termQuery) return { items: [], estimatedTotalItems: 0, truncated: false, mode: 'search' };

  const targetTypes = selectedType ? [selectedType] : types;
  const contextQuery = buildQuery(context);
  const combinedQuery = [contextQuery, termQuery].filter(Boolean).join(' AND ');
  const perTypeLimit = selectedType ? 40 : 15;
  const payloads = await Promise.all(targetTypes.map(async (type) => {
    try {
      const payload = await fetchJsonCached(buildUrl(type, combinedQuery, { limit: perTypeLimit }));
      return {
        type,
        items: extractItems(payload).map((raw) => normalizeItem(raw, type)),
        total: extractTotal(payload)
      };
    } catch (error) {
      onTypeError?.(type, error);
      return { type, items: [], total: 0 };
    }
  }));

  const items = payloads.flatMap((entry) => entry.items);
  const estimatedTotalItems = payloads.reduce((sum, entry) => sum + Number(entry.total || entry.items.length || 0), 0);
  const truncated = payloads.some((entry) => Number(entry.total || 0) > entry.items.length);
  return { items, estimatedTotalItems, truncated, mode: 'search' };
}

export async function resolveRecordSearch({
  query,
  looksLikeRecordId,
  searchSingleRecordById,
  searchRecordsByText
}) {
  if (looksLikeRecordId(query)) {
    return {
      items: await searchSingleRecordById(query),
      estimatedTotalItems: 0,
      truncated: false,
      mode: 'id_search'
    };
  }

  return searchRecordsByText(query);
}

export async function loadRecordAutocompleteSuggestions({
  query,
  selectedType,
  autocompleteApiBase,
  fetchJsonCached,
  textValue
}) {
  const params = new URLSearchParams({
    term: query,
    limit: '8'
  });
  if (selectedType) params.set('type', selectedType);
  const payload = await fetchJsonCached(`${autocompleteApiBase}?${params.toString()}`);
  return normalizeAutocompleteSuggestions(payload, textValue);
}

function normalizeAutocompleteSuggestions(payload, textValue) {
  const rawSuggestions = Array.isArray(payload)
    ? payload
    : payload?.items || payload?.Items || payload?.results || payload?.Results
      || payload?.suggestions || payload?.Suggestions || payload?.data || payload?.Data || [];
  const seen = new Set();
  return rawSuggestions
    .map((entry) => {
      if (typeof entry === 'string') {
        return { label: entry, value: entry, count: null };
      }
      const label = textValue(entry?.label)
        || textValue(entry?.Label)
        || textValue(entry?.term)
        || textValue(entry?.Term)
        || textValue(entry?.value)
        || textValue(entry?.Value)
        || textValue(entry?.name)
        || textValue(entry?.Name)
        || textValue(entry?.title)
        || textValue(entry?.Title);
      const value = textValue(entry?.value)
        || textValue(entry?.Value)
        || textValue(entry?.term)
        || textValue(entry?.Term)
        || label;
      const count = Number(entry?.count ?? entry?.Count ?? entry?.documents ?? entry?.Documents ?? NaN);
      return {
        label,
        value,
        count: Number.isFinite(count) ? count : null
      };
    })
    .filter((entry) => entry.label && entry.value)
    .filter((entry) => {
      const key = entry.value.toLocaleLowerCase('de-DE');
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 8);
}
