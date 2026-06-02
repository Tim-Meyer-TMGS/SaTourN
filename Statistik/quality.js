const TYPE_ALIASES = new Map([
  ['poi', 'POI'],
  ['pointofinterest', 'POI'],
  ['sehenswuerdigkeit', 'POI'],
  ['tour', 'Tour'],
  ['route', 'Tour'],
  ['hotel', 'Hotel'],
  ['vermieter', 'Hotel'],
  ['unterkunft', 'Hotel'],
  ['event', 'Event'],
  ['veranstaltung', 'Event'],
  ['gastro', 'Gastro'],
  ['gastronomie', 'Gastro'],
  ['restaurant', 'Gastro'],
  ['package', 'Package'],
  ['pauschale', 'Package'],
  ['globalepauschale', 'Package'],
  ['angebot', 'Package']
]);

const FIELD_ALIASES = {
  openData: ['isOpenData', 'openData', 'opendata', 'open_data', 'is_open_data'],
  url: ['sourceUrl', 'url', 'link', 'website', 'homepage'],
  images: ['images', 'image', 'media', 'photos', 'pictures'],
  media: ['media', 'images', 'photos', 'pictures'],
  bookingUrl: ['bookingUrl', 'bookingLink', 'reservationUrl', 'ticketUrl', 'booking.url'],
  bookingLink: ['bookingLink', 'bookingUrl', 'reservationUrl', 'ticketUrl', 'booking.url'],
  description: ['description', 'shortDescription', 'longDescription', 'teaser', 'text', 'presentation.description'],
  openingHours: ['openingHours', 'opening_hours', 'hours', 'businessHours', 'times'],
  coordinates: ['coordinates', 'geo', 'location'],
  photographer: ['photographer', 'imageAuthor', 'image_author', 'copyright']
};

function safeArray(value) {
  if (value == null) return [];
  return Array.isArray(value) ? value : [value];
}

function normalizeString(value) {
  if (value == null) return null;

  if (Array.isArray(value)) {
    return value.map(normalizeString).find(Boolean) || null;
  }

  if (typeof value === 'object') {
    for (const key of ['title', 'Title', 'name', 'Name', 'label', 'Label', 'value', 'Value', 'text', 'Text', 'id', 'ID']) {
      const nested = normalizeString(value[key]);
      if (nested) return nested;
    }
    return null;
  }

  const text = String(value).replace(/\s+/g, ' ').trim();
  return text || null;
}

function normalizeType(value) {
  const text = normalizeString(value);
  if (!text) return '';
  const key = text.toLowerCase().replace(/[\s_-]+/g, '');
  return TYPE_ALIASES.get(key) || text;
}

function hasValue(value) {
  if (value == null) return false;
  if (typeof value === 'boolean') return true;
  if (typeof value === 'number') return Number.isFinite(value);
  if (Array.isArray(value)) return value.some(hasValue);
  if (typeof value === 'object') return Object.values(value).some(hasValue);
  return String(value).trim() !== '';
}

function flattenValues(value) {
  if (value == null) return [];
  if (Array.isArray(value)) return value.flatMap(flattenValues);
  return [value];
}

function collectPrimitiveValues(value) {
  if (value == null) return [];
  if (Array.isArray(value)) return value.flatMap(collectPrimitiveValues);
  if (value instanceof Date) return [value];
  if (typeof value === 'object') return Object.values(value).flatMap(collectPrimitiveValues);
  return [value];
}

export function getNestedValue(obj, path) {
  if (!obj || !path) return null;

  const segments = String(path)
    .replace(/\[(\w+)\]/g, '.$1')
    .split('.')
    .filter(Boolean);

  const read = (value, remaining) => {
    if (value == null) return null;
    if (!remaining.length) return value;

    if (Array.isArray(value)) {
      const nestedValues = value
        .map((item) => read(item, remaining))
        .filter((item) => item != null);
      return nestedValues.length ? nestedValues : null;
    }

    const [segment, ...rest] = remaining;
    return read(value?.[segment], rest);
  };

  return read(obj, segments);
}

function getFieldPaths(field) {
  const paths = new Set([field]);
  const aliases = FIELD_ALIASES[field] || [];

  aliases.forEach((alias) => paths.add(alias));
  Array.from(paths).forEach((path) => {
    if (!String(path).startsWith('raw.')) {
      paths.add(`raw.${path}`);
    }
  });

  return Array.from(paths);
}

function getFieldValues(item, field) {
  if (!item || !field) return [];

  return getFieldPaths(field)
    .flatMap((path) => flattenValues(getNestedValue(item, path)))
    .filter((value) => value != null);
}

function firstNumber(item, fields) {
  for (const field of fields) {
    for (const value of getFieldValues(item, field)) {
      if (typeof value === 'number' && Number.isFinite(value)) return value;
      const text = normalizeString(value);
      if (!text) continue;
      const numberValue = Number(text.replace(',', '.'));
      if (Number.isFinite(numberValue)) return numberValue;
    }
  }
  return null;
}

function hasCoordinatePair(value) {
  if (!value) return false;

  if (Array.isArray(value)) {
    const numbers = value
      .map((entry) => typeof entry === 'number' ? entry : Number(normalizeString(entry)?.replace(',', '.')))
      .filter(Number.isFinite);
    return numbers.length >= 2;
  }

  if (typeof value === 'object') {
    const lat = value.lat ?? value.latitude;
    const lon = value.lon ?? value.lng ?? value.long ?? value.longitude;
    return hasCoordinatePair([lat, lon]);
  }

  return false;
}

export function hasAnyValue(item, fields) {
  return safeArray(fields).some((field) => getFieldValues(item, field).some(hasValue));
}

export function hasGeoCoordinates(item = {}) {
  if (hasCoordinatePair(item.coordinates)) return true;

  const lat = firstNumber(item, ['lat', 'latitude', 'geo.lat', 'coordinates.lat', 'location.lat']);
  const lon = firstNumber(item, ['lon', 'lng', 'long', 'longitude', 'geo.lon', 'geo.lng', 'coordinates.lon', 'coordinates.lng', 'location.lon', 'location.lng']);
  if (lat != null && lon != null) return true;

  return ['geo', 'coordinates', 'location'].some((field) => getFieldValues(item, field).some(hasCoordinatePair));
}

export function hasDescription(item = {}) {
  if (item.descriptionAvailable === true) return true;
  return hasAnyValue(item, ['description', 'text', 'shortDescription', 'longDescription', 'teaser', 'presentation.description']);
}

export function hasImages(item = {}) {
  if (Number.isFinite(item.imageCount) && item.imageCount > 0) return true;
  return hasAnyValue(item, ['images', 'image', 'media', 'photos', 'pictures']);
}

export function hasImageAuthor(item = {}) {
  return hasAnyValue(item, [
    'imageAuthor',
    'image_author',
    'images.author',
    'images.creator',
    'images.copyright',
    'images.photographer',
    'media.author',
    'media.creator',
    'media.copyright',
    'media.photographer',
    'copyright',
    'photographer'
  ]);
}

export function hasOpeningHours(item = {}) {
  if (item.openingHoursAvailable === true) return true;
  return hasAnyValue(item, ['openingHours', 'opening_hours', 'hours', 'businessHours', 'times']);
}

export function hasBookingLink(item = {}) {
  if (item.bookingLinkAvailable === true) return true;
  return hasAnyValue(item, ['bookingUrl', 'bookingLink', 'reservationUrl', 'ticketUrl', 'booking.url']);
}

function parseDate(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  if (typeof value === 'number' && Number.isFinite(value)) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  const text = normalizeString(value);
  if (!text) return null;
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function hasFutureEventDate(item = {}) {
  const values = [
    'startDate',
    'endDate',
    'date',
    'dates',
    'eventDate',
    'eventDates',
    'eventSchedule',
    'schedule',
    'validFrom',
    'validThrough'
  ].flatMap((field) => getFieldValues(item, field).flatMap(collectPrimitiveValues));

  const now = Date.now();
  return values.some((value) => {
    const date = parseDate(value);
    return date && date.getTime() > now;
  });
}

function getFirstText(item, fields) {
  for (const field of fields) {
    for (const value of getFieldValues(item, field)) {
      const text = normalizeString(value);
      if (text) return text;
    }
  }
  return null;
}

export function isTouristTripReady(item = {}) {
  const title = getFirstText(item, ['name', 'title', 'presentation.title']);
  const hasName = !!title && !/^ohne titel$/i.test(title);

  return (
    hasName &&
    hasDescription(item) &&
    hasAnyValue(item, ['touristType', 'touristTripType']) &&
    hasAnyValue(item, ['distance', 'length', 'duration']) &&
    hasAnyValue(item, ['itinerary', 'route', 'stages', 'waypoints']) &&
    hasAnyValue(item, ['url', 'sourceUrl', 'link'])
  );
}

export const qualityCriteria = Object.freeze([
  {
    id: 'opening_hours_missing',
    label: 'Oeffnungszeiten fehlen',
    types: ['POI', 'Gastro'],
    priority: 'hoch',
    autoCheck: true,
    weight: 10,
    fields: ['openingHours', 'opening_hours', 'hours', 'businessHours', 'times'],
    apiFilter: null,
    recommendation: 'Oeffnungszeiten ergaenzen oder aktualisieren.',
    check: (item) => !hasOpeningHours(item)
  },
  {
    id: 'license_missing',
    label: 'Lizenzangabe fehlt',
    types: ['POI', 'Tour', 'Hotel', 'Event', 'Gastro', 'Package'],
    priority: 'hoch',
    autoCheck: true,
    weight: 10,
    fields: ['license', 'licenses', 'copyright', 'openData', 'isOpenData', 'attribute_license'],
    apiFilter: null,
    recommendation: 'Lizenzangabe ergaenzen oder Open-Data-Status pruefen.',
    check: (item) => !hasAnyValue(item, ['license', 'licenses', 'copyright', 'openData', 'isOpenData', 'attribute_license'])
  },
  {
    id: 'geo_missing',
    label: 'Geokoordinaten fehlen',
    types: ['POI', 'Tour', 'Hotel', 'Event', 'Gastro'],
    priority: 'hoch',
    autoCheck: true,
    weight: 8,
    fields: ['geo', 'coordinates', 'location', 'lat', 'lon', 'latitude', 'longitude'],
    apiFilter: null,
    recommendation: 'Geokoordinaten ergaenzen.',
    check: (item) => !hasGeoCoordinates(item)
  },
  {
    id: 'description_missing',
    label: 'Beschreibung fehlt',
    types: ['POI', 'Tour', 'Hotel', 'Event', 'Gastro', 'Package'],
    priority: 'hoch',
    autoCheck: true,
    weight: 8,
    fields: ['description', 'text', 'shortDescription', 'longDescription', 'teaser'],
    apiFilter: null,
    recommendation: 'Beschreibung oder Kurzbeschreibung ergaenzen.',
    check: (item) => !hasDescription(item)
  },
  {
    id: 'image_missing',
    label: 'Bild fehlt',
    types: ['POI', 'Tour', 'Hotel', 'Event', 'Gastro', 'Package'],
    priority: 'mittel',
    autoCheck: true,
    weight: 6,
    fields: ['images', 'media', 'photos', 'pictures'],
    apiFilter: null,
    recommendation: 'Bildmaterial ergaenzen.',
    check: (item) => !hasImages(item)
  },
  {
    id: 'image_author_missing',
    label: 'Bildurheber fehlt',
    types: ['POI', 'Tour', 'Hotel', 'Event', 'Gastro', 'Package'],
    priority: 'hoch',
    autoCheck: true,
    weight: 8,
    fields: ['images.author', 'media.creator', 'copyright', 'photographer'],
    apiFilter: null,
    recommendation: 'Fotograf oder Urheberhinweis ergaenzen.',
    check: (item) => hasImages(item) && !hasImageAuthor(item)
  },
  {
    id: 'public_transport_missing',
    label: 'OePNV-Anreise fehlt',
    types: ['POI', 'Tour', 'Event'],
    priority: 'mittel',
    autoCheck: true,
    weight: 5,
    fields: ['publicTransport', 'arrival', 'directions', 'mobility'],
    apiFilter: null,
    recommendation: 'OePNV-Anreiseinformationen ergaenzen.',
    check: (item) => !hasAnyValue(item, ['publicTransport', 'arrival', 'directions', 'mobility'])
  },
  {
    id: 'booking_link_missing',
    label: 'Buchungslink fehlt',
    types: ['Hotel', 'Package', 'Event'],
    priority: 'hoch',
    autoCheck: true,
    weight: 8,
    fields: ['bookingUrl', 'bookingLink', 'reservationUrl', 'ticketUrl'],
    apiFilter: null,
    recommendation: 'Buchungs-, Reservierungs- oder Ticketlink ergaenzen.',
    check: (item) => !hasBookingLink(item)
  },
  {
    id: 'touristtrip_incomplete',
    label: 'TouristTrip-Struktur unvollstaendig',
    types: ['Tour'],
    priority: 'mittel',
    autoCheck: true,
    weight: 8,
    fields: ['name', 'description', 'touristType', 'distance', 'itinerary', 'url'],
    apiFilter: null,
    recommendation: 'Tour fuer schema.org TouristTrip strukturieren.',
    check: (item) => !isTouristTripReady(item)
  },
  {
    id: 'manual_image_quality',
    label: 'Bildqualitaet redaktionell pruefen',
    types: ['POI', 'Tour', 'Hotel', 'Event', 'Gastro'],
    priority: 'mittel',
    autoCheck: false,
    weight: 0,
    fields: [],
    apiFilter: null,
    recommendation: 'Bildqualitaet manuell pruefen.',
    note: 'Dieses Kriterium ist nicht zuverlaessig automatisch aus JSON pruefbar.'
  }
]);

export function getCriteriaForType(type) {
  const normalizedType = normalizeType(type);
  if (!normalizedType) return [];

  return qualityCriteria.filter((criterion) => {
    if (!criterion.types?.length) return true;
    return criterion.types.map(normalizeType).includes(normalizedType);
  });
}

function runCriterionCheck(criterion, item) {
  if (typeof criterion?.check !== 'function') return false;

  try {
    return Boolean(criterion.check(item || {}));
  } catch {
    return true;
  }
}

function getCriteriaResults(item) {
  const relevantCriteria = getCriteriaForType(item?.type);

  return relevantCriteria.map((criterion) => {
    const manual = criterion.autoCheck === false;
    const missing = manual ? false : runCriterionCheck(criterion, item);

    return {
      criterionId: criterion.id,
      criterion,
      autoCheck: !manual,
      manual,
      weight: Number.isFinite(criterion.weight) ? criterion.weight : 0,
      missing,
      fulfilled: !manual && !missing
    };
  });
}

export function calculateQualityScore(item, criteriaResults = getCriteriaResults(item || {})) {
  const scoredResults = safeArray(criteriaResults).filter((result) => (
    result.autoCheck &&
    Number.isFinite(result.weight) &&
    result.weight > 0
  ));

  const totalWeight = scoredResults.reduce((sum, result) => sum + result.weight, 0);
  if (totalWeight <= 0) return null;

  const fulfilledWeight = scoredResults
    .filter((result) => !result.missing)
    .reduce((sum, result) => sum + result.weight, 0);

  const score = Math.round((fulfilledWeight / totalWeight) * 100);
  return Math.max(0, Math.min(100, score));
}

export function getQualityStatus(score) {
  if (score == null || !Number.isFinite(score)) return 'nicht berechenbar';
  if (score >= 80) return 'gut';
  if (score >= 60) return 'pruefen';
  return 'kritisch';
}

function hasStoredEvaluation(item) {
  if (
    !item ||
    !Array.isArray(item.missingCriteria) ||
    !Array.isArray(item.fulfilledCriteria) ||
    !Array.isArray(item.manualCriteria)
  ) {
    return false;
  }

  return (
    item.qualityScore != null ||
    (item.qualityStatus && item.qualityStatus !== 'nicht berechenbar') ||
    item.missingCriteria.length > 0 ||
    item.fulfilledCriteria.length > 0 ||
    item.manualCriteria.length > 0
  );
}

export function getMissingCriteria(item = {}) {
  if (hasStoredEvaluation(item)) return [...item.missingCriteria];
  return getCriteriaResults(item)
    .filter((result) => result.autoCheck && result.missing)
    .map((result) => result.criterionId);
}

export function getRecommendationsForItem(item = {}) {
  const missingCriteria = new Set(getMissingCriteria(item));
  const criteria = getCriteriaForType(item?.type);

  return Array.from(new Set(criteria
    .filter((criterion) => missingCriteria.has(criterion.id))
    .map((criterion) => normalizeString(criterion.recommendation))
    .filter(Boolean)));
}

export function evaluateQualityForItem(item = {}) {
  const baseItem = item && typeof item === 'object' ? item : { raw: item ?? null };
  const criteriaResults = getCriteriaResults(baseItem);
  const missingCriteria = criteriaResults
    .filter((result) => result.autoCheck && result.missing)
    .map((result) => result.criterionId);
  const fulfilledCriteria = criteriaResults
    .filter((result) => result.autoCheck && !result.missing)
    .map((result) => result.criterionId);
  const manualCriteria = criteriaResults
    .filter((result) => result.manual)
    .map((result) => result.criterionId);
  const qualityScore = calculateQualityScore(baseItem, criteriaResults);

  return {
    ...baseItem,
    missingCriteria,
    fulfilledCriteria,
    manualCriteria,
    qualityScore,
    qualityStatus: getQualityStatus(qualityScore),
    recommendations: Array.from(new Set(criteriaResults
      .filter((result) => result.autoCheck && result.missing)
      .map((result) => normalizeString(result.criterion.recommendation))
      .filter(Boolean)))
  };
}

export function evaluateAllItems(items = []) {
  return safeArray(items).map((item) => evaluateQualityForItem(item));
}

function getCriterionById(criterionId) {
  return qualityCriteria.find((criterion) => criterion.id === criterionId) || null;
}

function priorityValue(priority) {
  const value = normalizeString(priority)?.toLowerCase();
  if (value === 'hoch') return 3;
  if (value === 'mittel') return 2;
  if (value === 'niedrig') return 1;
  return 0;
}

function numberToPercent(value) {
  if (!Number.isFinite(value)) return null;
  return Math.round(value * 100) / 100;
}

function getItemType(item) {
  return normalizeType(item?.type) || 'Unbekannt';
}

function getRelevantItemsForCriterion(items, criterion) {
  return safeArray(items).filter((item) => getCriteriaForType(item?.type).some((entry) => entry.id === criterion.id));
}

function getCriteriaIdsForItem(item, key) {
  if (hasStoredEvaluation(item) && Array.isArray(item?.[key])) return item[key];
  const results = getCriteriaResults(item || {});

  if (key === 'missingCriteria') {
    return results.filter((result) => result.autoCheck && result.missing).map((result) => result.criterionId);
  }

  if (key === 'fulfilledCriteria') {
    return results.filter((result) => result.autoCheck && !result.missing).map((result) => result.criterionId);
  }

  if (key === 'manualCriteria') {
    return results.filter((result) => result.manual).map((result) => result.criterionId);
  }

  return [];
}

function getStatusCountsForItems(items) {
  const counts = {
    gut: 0,
    pruefen: 0,
    kritisch: 0,
    nichtBerechenbar: 0
  };

  safeArray(items).forEach((item) => {
    const status = item?.qualityStatus || getQualityStatus(item?.qualityScore);
    if (status === 'gut') counts.gut += 1;
    else if (status === 'pruefen') counts.pruefen += 1;
    else if (status === 'kritisch') counts.kritisch += 1;
    else counts.nichtBerechenbar += 1;
  });

  return counts;
}

export function getAverageQualityScore(items = []) {
  const scores = safeArray(items)
    .map((item) => item?.qualityScore)
    .filter((score) => Number.isFinite(score));

  if (!scores.length) return null;
  return Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length);
}

export function getQualityStatusCounts(items = []) {
  return getStatusCountsForItems(items);
}

export function getIssueSummary(items = []) {
  const summary = new Map();

  safeArray(items).forEach((item) => {
    getCriteriaIdsForItem(item, 'missingCriteria').forEach((criterionId) => {
      const criterion = getCriterionById(criterionId);
      if (!criterion) return;

      const current = summary.get(criterionId) || {
        criterionId,
        label: criterion.label,
        affectedCount: 0,
        affectedTypes: new Set(),
        priority: criterion.priority,
        autoCheck: criterion.autoCheck !== false,
        recommendation: criterion.recommendation
      };

      current.affectedCount += 1;
      current.affectedTypes.add(getItemType(item));
      summary.set(criterionId, current);
    });
  });

  return Array.from(summary.values())
    .map((entry) => ({
      ...entry,
      affectedTypes: Array.from(entry.affectedTypes).sort((a, b) => a.localeCompare(b, 'de'))
    }))
    .sort((a, b) => (
      b.affectedCount - a.affectedCount ||
      priorityValue(b.priority) - priorityValue(a.priority) ||
      a.label.localeCompare(b.label, 'de')
    ));
}

export function getMostCommonMissingCriterion(items = []) {
  return getIssueSummary(items)[0] || null;
}

export function getOpenDataCapableCount(items = []) {
  return safeArray(items).filter((item) => item?.isOpenData === true).length;
}

export function getAutoCheckCriteriaCount() {
  return qualityCriteria.filter((criterion) => criterion.autoCheck !== false).length;
}

export function getManualCriteriaCount() {
  return qualityCriteria.filter((criterion) => criterion.autoCheck === false).length;
}

function getMatrixStatus(quote) {
  if (quote == null || !Number.isFinite(quote)) return 'nicht verfuegbar';
  if (quote >= 80) return 'gut';
  if (quote >= 60) return 'pruefen';
  return 'kritisch';
}

export function getCriteriaMatrix(items = []) {
  const itemList = safeArray(items);
  const itemTypes = Array.from(new Set(itemList.map(getItemType))).filter(Boolean);
  const fallbackTypes = Array.from(new Set(qualityCriteria.flatMap((criterion) => criterion.types || []))).filter(Boolean);
  const types = (itemTypes.length ? itemTypes : fallbackTypes).sort((a, b) => a.localeCompare(b, 'de'));

  return types.flatMap((type) => getCriteriaForType(type).map((criterion) => {
    const relevantItems = getRelevantItemsForCriterion(itemList.filter((item) => getItemType(item) === type), criterion);
    const totalRelevantCount = relevantItems.length;
    const manual = criterion.autoCheck === false;
    const fulfilledCount = manual ? 0 : relevantItems.filter((item) => getCriteriaIdsForItem(item, 'fulfilledCriteria').includes(criterion.id)).length;
    const missingCount = manual ? 0 : relevantItems.filter((item) => getCriteriaIdsForItem(item, 'missingCriteria').includes(criterion.id)).length;
    const quote = manual || totalRelevantCount === 0
      ? null
      : numberToPercent((fulfilledCount / totalRelevantCount) * 100);

    return {
      type,
      criterionId: criterion.id,
      label: criterion.label,
      priority: criterion.priority,
      autoCheck: criterion.autoCheck !== false,
      fulfilledCount,
      missingCount,
      totalRelevantCount,
      quote,
      status: manual ? 'nicht verfuegbar' : getMatrixStatus(quote),
      fields: criterion.fields || [],
      recommendation: criterion.recommendation,
      note: criterion.note || null
    };
  }));
}

export function getTypeSummary(items = []) {
  const itemList = safeArray(items);
  const groups = new Map();

  itemList.forEach((item) => {
    const type = getItemType(item);
    const group = groups.get(type) || [];
    group.push(item);
    groups.set(type, group);
  });

  return Array.from(groups.entries())
    .map(([type, typeItems]) => {
      const statusCounts = getStatusCountsForItems(typeItems);
      const mostCommon = getMostCommonMissingCriterion(typeItems);
      const totalCount = typeItems.length;
      const openDataCount = getOpenDataCapableCount(typeItems);

      return {
        type,
        totalCount,
        openDataCount,
        openDataRate: totalCount > 0 ? numberToPercent((openDataCount / totalCount) * 100) : null,
        averageQualityScore: getAverageQualityScore(typeItems),
        goodCount: statusCounts.gut,
        checkCount: statusCounts.pruefen,
        criticalCount: statusCounts.kritisch,
        mostCommonMissingCriterion: mostCommon ? mostCommon.label : null,
        nextRecommendedAction: mostCommon ? mostCommon.recommendation : null
      };
    })
    .sort((a, b) => b.totalCount - a.totalCount || a.type.localeCompare(b.type, 'de'));
}

export function getQualityAggregations(items = []) {
  const itemList = safeArray(items);
  const mostCommonMissingCriterion = getMostCommonMissingCriterion(itemList);

  return {
    averageQualityScore: getAverageQualityScore(itemList),
    qualityStatusCounts: getQualityStatusCounts(itemList),
    mostCommonMissingCriterion,
    openDataCapableCount: getOpenDataCapableCount(itemList),
    autoCheckCriteriaCount: getAutoCheckCriteriaCount(),
    manualCriteriaCount: getManualCriteriaCount(),
    issueSummary: getIssueSummary(itemList),
    criteriaMatrix: getCriteriaMatrix(itemList),
    typeSummary: getTypeSummary(itemList)
  };
}

export const qualityHelpers = Object.freeze({
  getNestedValue,
  hasAnyValue,
  hasGeoCoordinates,
  hasDescription,
  hasImages,
  hasImageAuthor,
  hasOpeningHours,
  hasBookingLink,
  hasFutureEventDate,
  isTouristTripReady,
  getCriteriaForType,
  evaluateQualityForItem,
  evaluateAllItems,
  calculateQualityScore,
  getQualityStatus,
  getMissingCriteria,
  getRecommendationsForItem,
  getAverageQualityScore,
  getQualityStatusCounts,
  getMostCommonMissingCriterion,
  getOpenDataCapableCount,
  getAutoCheckCriteriaCount,
  getManualCriteriaCount,
  getIssueSummary,
  getCriteriaMatrix,
  getTypeSummary,
  getQualityAggregations
});
