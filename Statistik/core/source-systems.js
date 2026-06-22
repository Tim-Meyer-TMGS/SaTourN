export function getKeywordValues(item, textValue) {
  const raw = item?.raw || item || {};
  return [
    ...safeKeywordArray(raw.keywords_old, textValue),
    ...safeKeywordArray(raw.keywords, textValue),
    ...safeKeywordArray(item?.keywords_old, textValue),
    ...safeKeywordArray(item?.keywords, textValue)
  ].filter(Boolean);
}

export function safeKeywordArray(value, textValue) {
  if (!Array.isArray(value)) return [];
  return value.map((entry) => textValue(entry));
}

export function getSourceId(item, { getFirst, textValue }) {
  const direct = getFirst(item, ['source_id', 'sourceId', 'raw.source_id', 'raw.sourceId']);
  if (direct) return direct;
  const sourceKeyword = getKeywordValues(item, textValue).find((keyword) => keyword.toLowerCase().startsWith('import_sourceid_'));
  return sourceKeyword ? sourceKeyword.replace(/^import_sourceid_/i, '') : '';
}

export function getPrimarySystem(item, textValue) {
  const keywords = getKeywordValues(item, textValue).map((keyword) => keyword.toLowerCase());
  if (keywords.includes('import_source_feratel') || keywords.includes('hassystemid_feratel')) {
    return {
      id: 'feratel',
      short: 'FD',
      logoImage: './assets/logos/feratel.png',
      name: 'feratel',
      note: 'Datensatz mit import_source_feratel oder HasSystemId_Feratel.',
      action: 'export',
      actionLabel: 'Liste exportieren'
    };
  }
  if (keywords.includes('import_source_outdooractive')) {
    return {
      id: 'outdooractive',
      short: 'OA',
      logoImage: './assets/logos/outdooractive.png',
      name: 'outdooractive',
      note: 'Datensatz mit import_source_outdooractive.',
      action: 'copy-source-id',
      actionLabel: 'ID kopieren'
    };
  }
  return {
    id: 'satourn',
    short: 'ST',
    logoImage: '../SaTourN-RGB.png',
    name: 'SaTourN',
    note: 'Kein externes Importsystem in keywords_old/keywords erkannt.',
    action: 'export',
    actionLabel: 'Liste exportieren'
  };
}

export function collectPrimarySystems(rows, { getPrimarySystem }) {
  const map = new Map();
  rows
    .map(getPrimarySystem)
    .filter((system) => system.id !== 'satourn')
    .forEach((system) => {
      if (!map.has(system.id)) map.set(system.id, { ...system, count: 0 });
      map.get(system.id).count += 1;
    });
  return Array.from(map.values());
}
