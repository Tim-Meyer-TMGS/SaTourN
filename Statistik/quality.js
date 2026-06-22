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

export function isNonEmptyHtmlOrText(value) {
  const text = normalizeString(value);
  if (!text) return false;

  const withoutMarkup = text
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&[a-z0-9#]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return withoutMarkup.length > 0;
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

function collectRootArrays(item, field) {
  return [
    ...safeArray(item?.[field]),
    ...safeArray(item?.raw?.[field])
  ].filter((entry) => entry && typeof entry === 'object');
}

function normalizeComparable(value) {
  return normalizeString(value)?.toLowerCase().trim() || '';
}

export function getTextsByRel(item = {}, rel) {
  const targetRel = normalizeComparable(rel);
  if (!targetRel) return [];

  return collectRootArrays(item, 'texts').filter((entry) => normalizeComparable(entry.rel) === targetRel);
}

export function hasTextByRel(item = {}, rel) {
  return getTextsByRel(item, rel).some((entry) => isNonEmptyHtmlOrText(entry.value));
}

export function hasGeoCoordinates(item = {}) {
  if (hasCoordinatePair(item.coordinates)) return true;

  const lat = firstNumber(item, ['lat', 'latitude', 'geo.lat', 'coordinates.lat', 'location.lat']);
  const lon = firstNumber(item, ['lon', 'lng', 'long', 'longitude', 'geo.lon', 'geo.lng', 'coordinates.lon', 'coordinates.lng', 'location.lon', 'location.lng']);
  if (lat != null && lon != null) return true;

  return ['geo', 'coordinates', 'location'].some((field) => getFieldValues(item, field).some(hasCoordinatePair));
}

export function hasDescription(item = {}) {
  return hasDetailsText(item);
}

export function hasImages(item = {}) {
  return hasCheckableMedia(item);
}

export function hasImageAuthor(item = {}) {
  return findMissingCopyrightMedia(item).length === 0 && hasCheckableMedia(item);
}

export function hasOpeningHours(item = {}) {
  return (
    hasTextByRel(item, 'openings') ||
    safeArray(item.timeIntervals).some(hasValue) ||
    safeArray(item.raw?.timeIntervals).some(hasValue) ||
    item.alwaysOpen === true ||
    item.raw?.alwaysOpen === true
  );
}

export function hasBookingLink(item = {}) {
  const bookingMedia = getMediaObjects(item).filter((mediaObject) => normalizeComparable(mediaObject.rel) === 'booking');
  return bookingMedia.some((mediaObject) => isNonEmptyHtmlOrText(mediaObject.url));
}

export function hasDetailsText(item = {}) {
  return hasTextByRel(item, 'details');
}

export function hasTeaserText(item = {}) {
  return hasTextByRel(item, 'teaser');
}

export function hasStreetInfo(item = {}) {
  return hasAnyValue(item, ['street', 'address.street', 'addresses.street']);
}

export function hasPhoneInfo(item = {}) {
  return hasAnyValue(item, ['phone', 'phone2', 'addresses.phone']);
}

export function hasEmailInfo(item = {}) {
  return hasAnyValue(item, ['email', 'emailRequest', 'addresses.email']);
}

export function hasWebsiteInfo(item = {}) {
  return hasAnyValue(item, ['web', 'website', 'url', 'addresses.web']);
}

export function hasPriceInfo(item = {}) {
  return (
    hasAnyValue(item, ['prices', 'price']) ||
    hasTextByRel(item, 'PRICE_INFO') ||
    hasTextByRel(item, 'PRICE_REDUCEDINFO')
  );
}

export function hasSeasonInfo(item = {}) {
  return safeArray(item.seasons).some((entry) => hasValue(entry?.month) || hasValue(entry?.suitable))
    || safeArray(item.raw?.seasons).some((entry) => hasValue(entry?.month) || hasValue(entry?.suitable));
}

export function hasAddressRel(item = {}, relValues = []) {
  const targets = new Set(safeArray(relValues).map(normalizeComparable).filter(Boolean));
  if (!targets.size) return false;
  return collectRootArrays(item, 'addresses').some((entry) => {
    const rel = normalizeComparable(entry.rel);
    if (!targets.has(rel)) return false;
    return [
      entry.name,
      entry.street,
      entry.city,
      entry.zip,
      entry.web,
      entry.email,
      entry.phone
    ].some(hasValue);
  });
}

export function hasAuthorOrOrganisation(item = {}) {
  return hasAnyValue(item, ['author']) || hasAddressRel(item, ['author', 'organisation']);
}

export function getAttributeValue(item = {}, key) {
  const targetKey = normalizeComparable(key);
  if (!targetKey) return null;

  for (const entry of collectRootArrays(item, 'attributes')) {
    if (normalizeComparable(entry.key) === targetKey) {
      const value = normalizeString(entry.value);
      if (value) return value;
    }
  }

  return null;
}

export function hasAttributeValue(item = {}, key) {
  return Boolean(getAttributeValue(item, key));
}

export function hasValidDatasetLicense(item = {}) {
  const value = normalizeComparable(getAttributeValue(item, 'license'));
  return ['cc0', 'cc-by', 'cc-by-sa', 'pd'].includes(value);
}

export function getFeatureValues(item = {}) {
  return [
    ...safeArray(item.features).map((entry) => normalizeString(entry?.value ?? entry)).filter(Boolean),
    ...safeArray(item.raw?.features).map((entry) => normalizeString(entry?.value ?? entry)).filter(Boolean),
    ...safeArray(item.features_old).map(normalizeString).filter(Boolean),
    ...safeArray(item.raw?.features_old).map(normalizeString).filter(Boolean)
  ];
}

export function hasFeature(item = {}, value) {
  const target = normalizeComparable(value);
  if (!target) return false;
  return getFeatureValues(item).some((entry) => normalizeComparable(entry) === target);
}

export function hasAnyFeature(item = {}, values = []) {
  const targets = safeArray(values).map(normalizeComparable).filter(Boolean);
  if (!targets.length) return false;
  const targetSet = new Set(targets);
  return getFeatureValues(item).some((entry) => targetSet.has(normalizeComparable(entry)));
}

function isPublicTransportValue(value) {
  const text = normalizeComparable(value)
    .replace(/\u00f6/g, 'oe')
    .replace(/\u00d6/g, 'oe');
  return /\boepnv\b/.test(text) || (text.includes('pnv') && text.includes('erreichbar'));
}

export function hasPublicTransportFeature(item = {}) {
  return getFeatureValues(item).some(isPublicTransportValue);
}

export function getMediaObjects(item = {}) {
  return collectRootArrays(item, 'media_objects');
}

export function isCheckableMediaObject(mediaObject = {}) {
  const rel = normalizeComparable(mediaObject.rel);
  if (['booking', 'canonical', 'logo', 'socialmedia'].includes(rel)) return false;
  return /^image\//i.test(normalizeString(mediaObject.type) || '') && isNonEmptyHtmlOrText(mediaObject.url);
}

export function hasCheckableMedia(item = {}) {
  return getMediaObjects(item).some(isCheckableMediaObject);
}

export function findMissingCopyrightMedia(item = {}) {
  return getMediaObjects(item).filter((mediaObject) => (
    isCheckableMediaObject(mediaObject) &&
    !isNonEmptyHtmlOrText(mediaObject.copyrightText)
  ));
}

function collectValueList(item = {}, modernField, legacyField) {
  return [
    ...safeArray(item[modernField]).map((entry) => normalizeString(entry?.value ?? entry)).filter(Boolean),
    ...safeArray(item.raw?.[modernField]).map((entry) => normalizeString(entry?.value ?? entry)).filter(Boolean),
    ...safeArray(item[legacyField]).map(normalizeString).filter(Boolean),
    ...safeArray(item.raw?.[legacyField]).map(normalizeString).filter(Boolean)
  ];
}

export function getAreaValues(item = {}) {
  return collectValueList(item, 'areas', 'areas_old');
}

export function getCategoryValues(item = {}) {
  return collectValueList(item, 'categories', 'categories_old');
}

export function hasCategory(item = {}, value) {
  const target = normalizeComparable(value);
  if (!target) return false;
  return getCategoryValues(item).some((entry) => normalizeComparable(entry) === target);
}

export function hasAnyCategory(item = {}, values = []) {
  const targets = safeArray(values).map(normalizeComparable).filter(Boolean);
  if (!targets.length) return false;
  const targetSet = new Set(targets);
  return getCategoryValues(item).some((entry) => targetSet.has(normalizeComparable(entry)));
}

function textRelValues(item = {}, relValues = []) {
  return safeArray(relValues).flatMap((rel) => (
    getTextsByRel(item, rel)
      .map((entry) => normalizeString(entry.value))
      .filter(Boolean)
  ));
}

export function hasTourParkingInfo(item = {}) {
  if (hasTextByRel(item, 'TourMoreInfos_parking')) return true;
  return textRelValues(item, ['TourMoreInfos_directions', 'directions']).some((value) => /park/i.test(value));
}

function escapeMetaQueryValue(value) {
  return String(value)
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"');
}

function buildQuotedOrQuery(prefix, values = []) {
  const tokens = safeArray(values)
    .map(normalizeString)
    .filter(Boolean)
    .map((value) => `${prefix}:"${escapeMetaQueryValue(value)}"`);
  if (!tokens.length) return null;
  if (tokens.length === 1) return tokens[0];
  return `(${tokens.join(' OR ')})`;
}

function buildMissingPushdownQuery(query) {
  const normalized = normalizeString(query);
  if (!normalized) return 'all:all';
  return `all:all -${normalized}`;
}

export function getKeywordValues(item = {}) {
  return collectValueList(item, 'keywords', 'keywords_old');
}

export function hasKeyword(item = {}, value) {
  const target = normalizeComparable(value);
  if (!target) return false;
  return getKeywordValues(item).some((entry) => normalizeComparable(entry) === target);
}

const VALIDATED_FEATURE_VALUES = Object.freeze({
  poiParking: Object.freeze(['Parkpl\u00e4tze vorhanden']),
  poiPayments: Object.freeze(['Barzahlung', 'EC-Karte', 'Visa', 'Mastercard', 'kontaktlose Zahlung']),
  poiLanguages: Object.freeze(['Englisch', 'Polnisch', 'Tschechisch']),
  poiSuitability: Object.freeze(['Familie', 'f\u00fcr Gruppen', 'Senioren geeignet', 'f\u00fcr Schulklassen', 'f\u00fcr jedes Wetter']),
  hotelPayments: Object.freeze(['Barzahlung', 'EC-Karte', 'Visa', 'Mastercard', 'PayPal', 'kontaktlose Zahlung']),
  hotelLanguages: Object.freeze(['Englisch', 'Polnisch', 'Tschechisch', 'Franz\u00f6sisch']),
  hotelParking: Object.freeze(['Parkpl\u00e4tze', 'Parkgarage / Tiefgarage', '\u00d6ffentliches Parkhaus fu\u00dfl\u00e4ufig', 'Busparkplatz (-pl\u00e4tze)', 'E-Lades\u00e4ulen']),
  gastroParking: Object.freeze(['PKW-Parkplatz am Haus']),
  gastroPayments: Object.freeze(['Barzahlung', 'EC-Karte']),
  gastroLanguages: Object.freeze(['Englisch', 'Polnisch'])
});

const VALIDATED_CATEGORY_VALUES = Object.freeze({
  gastroCuisine: Object.freeze(['vegetarisch', 'deutsch', 'italienisch'])
});

const POI_EXCLUDED_CONTACT_AND_OPENING_CATEGORIES = Object.freeze([
  'Allee',
  'Architektur',
  'Aussichtspunkt/-turm',
  'Bildstock',
  'Brunnen',
  'Bruecke',
  'Denkmal',
  'Ferienstrasse',
  'Friedhof',
  'Fussgaengerzone',
  'Halde',
  'Historische Staette',
  'Industriemerkmal',
  'Marktplatz',
  'Orgel',
  'Pfahlbauten',
  'Ruine',
  'Schlucht',
  'Sehenswertes',
  'Sonstige Sehenswuerdigkeit',
  'Wegkreuz',
  'Angeln/Fischen',
  'Beachvolleyball',
  'Grillplatz',
  'Kinderspielplatz',
  'Langlauf',
  'Luftsport',
  'Schanze',
  'Ski-Nordisch',
  'Wassertreten',
  'Badestelle',
  'Biwak',
  'Geocaching',
  'Heilquelle',
  'See',
  'Berggipfel',
  'Felsen',
  'Geotop',
  'Insel',
  'Kanal',
  'Moor',
  'Naturdenkmal',
  'Naturerlebnispfad',
  'Naturlehrpfad',
  'Natursehenswuerdigkeit',
  'Pavillon',
  'Quelle',
  'Schleuse',
  'Steg',
  'Strand',
  'Teich',
  'Themenweg',
  'Trimm-Dich-Pfad',
  'Wald',
  'Wasserfall',
  'Bahnhof',
  'Bootsanlegestellen',
  'Bushaltestelle',
  'Busparkplatz',
  'freies WLAN',
  'Oeffentlicher Nahverkehr',
  'Parkmoeglichkeiten',
  'Parkplatz',
  'S-Bahn',
  'Strassenbahn',
  'WC',
  'eBike Akku-Wechselstation',
  'eBike Ladestation',
  'eBike Verleihstation',
  'eTankstelle',
  'Audioguide',
  'Panoramen',
  'Podcast',
  'Video',
  'Videocast',
  'Webcam',
  'Sendemast',
  'Staumauer',
  'Windrad'
]);

const POI_EXCLUSION_BY_CRITERION = Object.freeze({
  poi_street_missing: POI_EXCLUDED_CONTACT_AND_OPENING_CATEGORIES,
  poi_phone_missing: POI_EXCLUDED_CONTACT_AND_OPENING_CATEGORIES,
  poi_email_missing: POI_EXCLUDED_CONTACT_AND_OPENING_CATEGORIES,
  poi_website_missing: POI_EXCLUDED_CONTACT_AND_OPENING_CATEGORIES,
  poi_opening_hours_missing: POI_EXCLUDED_CONTACT_AND_OPENING_CATEGORIES,
  poi_price_missing: POI_EXCLUDED_CONTACT_AND_OPENING_CATEGORIES,
  poi_payment_options_missing: POI_EXCLUDED_CONTACT_AND_OPENING_CATEGORIES,
  opening_hours_missing: POI_EXCLUDED_CONTACT_AND_OPENING_CATEGORIES
});

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

function apiQueryCandidate({
  positiveQuery = null,
  missingQuery = null,
  prefixes = [],
  source = 'meta_query_language',
  confidence = 'needs_verification',
  note = ''
} = {}) {
  return Object.freeze({
    positiveQuery,
    missingQuery,
    prefixes: Object.freeze(safeArray(prefixes)),
    source,
    confidence,
    verified: false,
    note
  });
}

export const domainQualityModel = Object.freeze({
  applicability: 'all_criteria_apply',
  technicalStatusNote: 'Alle Kriterien in diesem Modell gelten fachlich. Der Status beschreibt nur, ob die technische Pruefung bereits belastbar angebunden ist.',
  statusDefinitions: Object.freeze({
    active: 'Fachlich gueltig und technisch in Count, Liste oder Detailbewertung angebunden.',
    needs_verification: 'Fachlich gueltig; Feldmapping und API-/Server-Pruefung muessen noch verifiziert werden.',
    source_guarded: 'Fachlich gueltig; fehlende Basisdaten werden bereits quellseitig vor der normalen Pflegeaufgabe abgefangen.',
    not_applicable: 'Fachlich gueltig; fuer den Typ oder die Datenbasis nicht als normaler Qualitaetsmangel zu bewerten.',
    excluded_by_category: 'Fachlich gueltig; fuer bestimmte Kategorien nicht erwartbar und deshalb nicht scorewirksam.',
    manual_review: 'Fachlich gueltig; nur manuell oder redaktionell bewertbar.'
  }),
  sourceGuaranteedFields: Object.freeze([
    {
      id: 'title',
      label: 'Titel',
      types: ['POI', 'Gastro', 'Tour', 'Hotel', 'Event'],
      reason: 'Wird von Destination.One fuer ausgegebene Datensaetze vorausgesetzt.'
    },
    {
      id: 'category',
      label: 'Kategorie / Betriebsart',
      types: ['POI', 'Gastro', 'Tour', 'Hotel', 'Event'],
      reason: 'Wird fachlich als Basisfeld gefuehrt, aber nicht als Pflegeaufgabe aktiviert.'
    },
    {
      id: 'geo',
      label: 'Geo-Informationen',
      types: ['POI', 'Gastro', 'Tour', 'Hotel', 'Event'],
      reason: 'Fehlende Geo-Informationen werden nicht als normale Datensaetze ausgegeben.'
    },
    {
      id: 'city',
      label: 'Ort',
      types: ['POI', 'Gastro', 'Tour', 'Hotel', 'Event'],
      reason: 'Fehlender Ort wird nicht als eigene Pflegeaufgabe modelliert.'
    },
    {
      id: 'tour_geometry',
      label: 'Tour-Geometrie / Tourdaten',
      types: ['Tour'],
      reason: 'Fehlende Tour-Basisdaten werden nicht als Datensatz im Monitor bewertet.'
    },
    {
      id: 'event_schedule',
      label: 'Veranstalter / Termine',
      types: ['Event'],
      reason: 'Fehlende Veranstaltungsbasisdaten werden nicht als Datensatz im Monitor bewertet.'
    }
  ]),
  criteria: Object.freeze([
    {
      id: 'geo_missing',
      label: 'Geo-Information fehlt',
      types: ['POI', 'Gastro', 'Tour', 'Hotel', 'Event'],
      level: 'minimum',
      fieldCandidates: ['geo', 'coordinates', 'location'],
      apiCandidate: apiQueryCandidate({
        positiveQuery: 'lat:* AND lon:*',
        missingQuery: 'all:all AND (-lat:* OR -lon:*)',
        prefixes: ['lat', 'lon'],
        confidence: 'partial_documented_prefixes',
        note: 'Prueft nur Koordinatenfelder; ob solche Objekte in der normalen Datenbasis ueberhaupt ausgegeben werden, bleibt quellseitig zu klaeren.'
      }),
      status: 'source_guarded',
      activeCriterionId: null,
      uiPriority: 'hoch',
      recommendation: 'Geo-Information pruefen, falls der Datensatz ausserhalb der normalen Datenbasis auftaucht.'
    },
    {
      id: 'touristtrip_incomplete',
      label: 'Tour-Basisdaten unvollstaendig',
      types: ['Tour'],
      level: 'minimum',
      fieldCandidates: ['touristType', 'touristTripType', 'distance', 'length', 'duration', 'itinerary', 'route', 'stages', 'waypoints'],
      apiCandidate: apiQueryCandidate({
        positiveQuery: 'length:[1 TO *] AND duration:[1 TO *]',
        missingQuery: 'all:all AND (-length:* OR -duration:*)',
        prefixes: ['length', 'duration'],
        confidence: 'partial_documented_prefixes',
        note: 'Prueft nur Laenge und Dauer. Geometrie, Route und weitere Tour-Basisdaten muessen separat verifiziert werden.'
      }),
      status: 'source_guarded',
      activeCriterionId: null,
      uiPriority: 'hoch',
      recommendation: 'Tour-Geometrie und Tour-Basisdaten pruefen, falls der Datensatz ausserhalb der normalen Datenbasis auftaucht.'
    },
    {
      id: 'manual_image_quality',
      label: 'Bildqualitaet redaktionell pruefen',
      types: ['POI', 'Gastro', 'Tour', 'Hotel', 'Event', 'Package'],
      level: 'very_good',
      fieldCandidates: ['media_objects'],
      status: 'manual_review',
      activeCriterionId: null,
      uiPriority: 'niedrig',
      recommendation: 'Bildqualitaet, Motiv, Ausschnitt und redaktionelle Eignung manuell pruefen.'
    },
    {
      id: 'hotel_phone',
      label: 'Telefon',
      types: ['Hotel'],
      level: 'minimum',
      fieldCandidates: ['phone', 'phone2', 'addresses.phone'],
      status: 'needs_verification',
      activeCriterionId: null,
      uiPriority: 'hoch',
      recommendation: 'Telefonnummer ergaenzen.'
    },
    {
      id: 'hotel_street',
      label: 'Strasse',
      types: ['Hotel'],
      level: 'minimum',
      fieldCandidates: ['street', 'address.street', 'addresses.street'],
      apiCandidate: apiQueryCandidate({
        positiveQuery: 'street:*',
        missingQuery: 'all:all -street:*',
        prefixes: ['street'],
        confidence: 'documented_prefix'
      }),
      status: 'needs_verification',
      activeCriterionId: null,
      uiPriority: 'hoch',
      recommendation: 'Strasse oder Anschrift ergaenzen.'
    },
    {
      id: 'hotel_details',
      label: 'Beschreibungstext',
      types: ['Hotel'],
      level: 'minimum',
      fieldCandidates: ['texts[rel=details]'],
      apiCandidate: apiQueryCandidate({
        positiveQuery: 'details:*',
        missingQuery: 'all:all -details:*',
        prefixes: ['details'],
        source: 'existing_quality_query',
        confidence: 'existing_prefix_needs_type_verification',
        note: 'details ist fuer POI, Gastro und Tour bereits aktiv; Hotel muss mit echten positiven und negativen Datensaetzen verifiziert werden.'
      }),
      status: 'needs_verification',
      activeCriterionId: null,
      uiPriority: 'hoch',
      recommendation: 'Beschreibungstext ergaenzen.'
    },
    {
      id: 'hotel_teaser',
      label: 'Teaser-Text',
      types: ['Hotel'],
      level: 'minimum',
      fieldCandidates: ['texts[rel=teaser]'],
      status: 'needs_verification',
      activeCriterionId: null,
      uiPriority: 'hoch',
      recommendation: 'Teaser-Text ergaenzen.'
    },
    {
      id: 'hotel_email',
      label: 'E-Mail',
      types: ['Hotel'],
      level: 'good',
      fieldCandidates: ['email', 'emailRequest', 'addresses.email'],
      status: 'needs_verification',
      activeCriterionId: null,
      uiPriority: 'mittel',
      recommendation: 'E-Mail-Adresse ergaenzen.'
    },
    {
      id: 'hotel_website',
      label: 'Webseite',
      types: ['Hotel'],
      level: 'good',
      fieldCandidates: ['web', 'website', 'url', 'addresses.web'],
      status: 'needs_verification',
      activeCriterionId: null,
      uiPriority: 'mittel',
      recommendation: 'Webseite ergaenzen.'
    },
    {
      id: 'hotel_features',
      label: 'Merkmale',
      types: ['Hotel'],
      level: 'good',
      fieldCandidates: ['features', 'features_old'],
      status: 'needs_verification',
      activeCriterionId: null,
      uiPriority: 'mittel',
      recommendation: 'Merkmale pruefen und ergaenzen.'
    },
    {
      id: 'hotel_payment',
      label: 'Zahlungsmoeglichkeiten',
      types: ['Hotel'],
      level: 'good',
      fieldCandidates: ['paymentMethods', 'payment_old', 'features'],
      status: 'active',
      activeCriterionId: 'hotel_payment_cash_missing',
      uiPriority: 'mittel',
      recommendation: 'Gepruefte Zahlungsarten als Merkmale ergaenzen.'
    },
    {
      id: 'hotel_price',
      label: 'Preisinformation',
      types: ['Hotel'],
      level: 'good',
      fieldCandidates: ['prices', 'price', 'numbers', 'attributes'],
      status: 'needs_verification',
      activeCriterionId: null,
      uiPriority: 'mittel',
      recommendation: 'Preisinformation ergaenzen.'
    },
    {
      id: 'hotel_contact_person',
      label: 'Ansprechperson',
      types: ['Hotel'],
      level: 'very_good',
      fieldCandidates: ['addresses[rel=contact_person]'],
      status: 'needs_verification',
      activeCriterionId: null,
      uiPriority: 'niedrig',
      recommendation: 'Ansprechperson ergaenzen.'
    },
    {
      id: 'hotel_public_transport',
      label: 'Erreichbarkeit per OePNV',
      types: ['Hotel'],
      level: 'very_good',
      fieldCandidates: ['features', 'features_old', 'texts[rel=directions]', 'texts[rel=station]'],
      status: 'active',
      activeCriterionId: 'public_transport_missing',
      uiPriority: 'mittel',
      recommendation: 'OePNV-Anreiseinformationen ergaenzen.'
    },
    {
      id: 'hotel_languages',
      label: 'Fremdsprachenkenntnisse',
      types: ['Hotel'],
      level: 'very_good',
      fieldCandidates: ['features', 'features_old', 'attributes'],
      status: 'active',
      activeCriterionId: 'hotel_language_english_missing',
      uiPriority: 'niedrig',
      recommendation: 'Gepruefte Fremdsprachen als Merkmale ergaenzen.'
    },
    {
      id: 'hotel_license',
      label: 'CC-Lizenz',
      types: ['Hotel'],
      level: 'very_good',
      fieldCandidates: ['attributes[key=license]'],
      status: 'active',
      activeCriterionId: 'license_missing',
      uiPriority: 'hoch',
      openDataRelevant: true,
      recommendation: 'Lizenzangabe ergaenzen oder Open-Data-Status pruefen.'
    },
    {
      id: 'hotel_parking',
      label: 'Parkplaetze',
      types: ['Hotel'],
      level: 'very_good',
      fieldCandidates: ['features', 'features_old', 'numbers'],
      status: 'active',
      activeCriterionId: 'hotel_parking_feature_missing',
      uiPriority: 'niedrig',
      recommendation: 'Parkplatzinformationen ergaenzen.'
    },
    {
      id: 'hotel_booking_link',
      label: 'Buchungslink',
      types: ['Hotel'],
      level: 'minimum',
      fieldCandidates: ['media_objects[rel=booking].url'],
      status: 'active',
      activeCriterionId: 'booking_link_missing',
      uiPriority: 'hoch',
      recommendation: 'Buchungs-, Reservierungs- oder Ticketlink ergaenzen.'
    },
    {
      id: 'tour_details',
      label: 'Beschreibungstext',
      types: ['Tour'],
      level: 'minimum',
      fieldCandidates: ['texts[rel=details]'],
      status: 'active',
      activeCriterionId: 'description_missing',
      uiPriority: 'hoch',
      recommendation: 'Beschreibungstext ergaenzen.'
    },
    {
      id: 'tour_teaser',
      label: 'Teaser-Text',
      types: ['Tour'],
      level: 'minimum',
      fieldCandidates: ['texts[rel=teaser]'],
      status: 'needs_verification',
      activeCriterionId: null,
      uiPriority: 'hoch',
      recommendation: 'Teaser-Text ergaenzen.'
    },
    {
      id: 'tour_season',
      label: 'Eignung oder Jahreszeit',
      types: ['Tour'],
      level: 'good',
      fieldCandidates: ['seasons', 'features', 'features_old'],
      status: 'active',
      activeCriterionId: 'tour_season_missing',
      uiPriority: 'mittel',
      recommendation: 'Eignung oder Jahreszeit ergaenzen.'
    },
    {
      id: 'tour_arrival_public_transport',
      label: 'Anreise mit OePNV',
      types: ['Tour'],
      level: 'good',
      fieldCandidates: ['features', 'features_old', 'texts[rel=directions]', 'texts[rel=station]'],
      status: 'active',
      activeCriterionId: 'public_transport_missing',
      uiPriority: 'mittel',
      recommendation: 'OePNV-Anreiseinformationen ergaenzen.'
    },
    {
      id: 'tour_parking',
      label: 'Parken',
      types: ['Tour'],
      level: 'good',
      fieldCandidates: ['features', 'features_old', 'texts[rel=directions]'],
      status: 'active',
      activeCriterionId: 'tour_parking_missing',
      uiPriority: 'mittel',
      recommendation: 'Parkinformationen ergaenzen.'
    },
    {
      id: 'tour_author',
      label: 'Autor oder Organisation',
      types: ['Tour'],
      level: 'good',
      fieldCandidates: ['author', 'addresses[rel=author]', 'addresses[rel=organisation]'],
      status: 'needs_verification',
      activeCriterionId: null,
      uiPriority: 'mittel',
      recommendation: 'Autor oder Organisation ergaenzen.'
    },
    {
      id: 'tour_start_target',
      label: 'Start- und Zielbeschreibungen',
      types: ['Tour'],
      level: 'very_good',
      fieldCandidates: ['texts[rel=start]', 'texts[rel=target]', 'texts[rel=directions]'],
      status: 'needs_verification',
      activeCriterionId: null,
      uiPriority: 'niedrig',
      recommendation: 'Start- und Zielbeschreibung ergaenzen.'
    },
    {
      id: 'tour_license',
      label: 'CC-Lizenz',
      types: ['Tour'],
      level: 'very_good',
      fieldCandidates: ['attributes[key=license]'],
      status: 'active',
      activeCriterionId: 'license_missing',
      uiPriority: 'hoch',
      openDataRelevant: true,
      recommendation: 'Lizenzangabe ergaenzen oder Open-Data-Status pruefen.'
    },
    {
      id: 'poi_street',
      label: 'Strasse',
      types: ['POI'],
      level: 'minimum',
      fieldCandidates: ['street', 'address.street', 'addresses.street'],
      apiCandidate: apiQueryCandidate({
        positiveQuery: 'street:*',
        missingQuery: 'all:all -street:*',
        prefixes: ['street'],
        confidence: 'documented_prefix'
      }),
      status: 'active',
      activeCriterionId: 'poi_street_missing',
      uiPriority: 'hoch',
      recommendation: 'Strasse oder Anschrift ergaenzen.'
    },
    {
      id: 'poi_details',
      label: 'Beschreibungstext',
      types: ['POI'],
      level: 'minimum',
      fieldCandidates: ['texts[rel=details]'],
      status: 'active',
      activeCriterionId: 'description_missing',
      uiPriority: 'hoch',
      recommendation: 'Beschreibungstext ergaenzen.'
    },
    {
      id: 'poi_teaser',
      label: 'Teaser-Text',
      types: ['POI'],
      level: 'minimum',
      fieldCandidates: ['texts[rel=teaser]'],
      status: 'active',
      activeCriterionId: 'poi_teaser_missing',
      uiPriority: 'hoch',
      recommendation: 'Teaser-Text ergaenzen.'
    },
    {
      id: 'poi_email',
      label: 'E-Mail',
      types: ['POI'],
      level: 'good',
      fieldCandidates: ['email', 'addresses.email'],
      status: 'active',
      activeCriterionId: 'poi_email_missing',
      uiPriority: 'mittel',
      recommendation: 'E-Mail-Adresse ergaenzen.'
    },
    {
      id: 'poi_website',
      label: 'Webseite',
      types: ['POI'],
      level: 'good',
      fieldCandidates: ['web', 'website', 'url', 'addresses.web'],
      status: 'active',
      activeCriterionId: 'poi_website_missing',
      uiPriority: 'mittel',
      recommendation: 'Webseite ergaenzen.'
    },
    {
      id: 'poi_phone',
      label: 'Telefon',
      types: ['POI'],
      level: 'good',
      fieldCandidates: ['phone', 'phone2', 'addresses.phone'],
      status: 'active',
      activeCriterionId: 'poi_phone_missing',
      uiPriority: 'mittel',
      recommendation: 'Telefonnummer ergaenzen.'
    },
    {
      id: 'poi_opening_hours',
      label: 'Oeffnungszeiten',
      types: ['POI'],
      level: 'good',
      fieldCandidates: ['texts[rel=openings]', 'timeIntervals', 'alwaysOpen'],
      status: 'active',
      activeCriterionId: 'opening_hours_missing',
      uiPriority: 'hoch',
      recommendation: 'Oeffnungszeiten ergaenzen oder aktualisieren.'
    },
    {
      id: 'poi_price',
      label: 'Preisinformation',
      types: ['POI'],
      level: 'good',
      fieldCandidates: ['prices', 'price', 'numbers', 'attributes'],
      status: 'active',
      activeCriterionId: 'poi_price_missing',
      uiPriority: 'mittel',
      recommendation: 'Preisinformation ergaenzen.'
    },
    {
      id: 'poi_payment',
      label: 'Zahlungsmoeglichkeiten',
      types: ['POI'],
      level: 'very_good',
      fieldCandidates: ['paymentMethods', 'payment_old', 'features'],
      status: 'active',
      activeCriterionId: 'poi_payment_options_missing',
      uiPriority: 'niedrig',
      recommendation: 'Zahlungsmoeglichkeiten ergaenzen.'
    },
    {
      id: 'poi_license',
      label: 'Lizenz',
      types: ['POI'],
      level: 'very_good',
      fieldCandidates: ['attributes[key=license]'],
      status: 'active',
      activeCriterionId: 'license_missing',
      uiPriority: 'hoch',
      openDataRelevant: true,
      recommendation: 'Lizenzangabe ergaenzen oder Open-Data-Status pruefen.'
    },
    {
      id: 'poi_public_transport',
      label: 'OePNV-Anreise',
      types: ['POI'],
      level: 'supporting',
      fieldCandidates: ['features', 'features_old', 'texts[rel=directions]', 'texts[rel=station]'],
      status: 'active',
      activeCriterionId: 'public_transport_missing',
      uiPriority: 'mittel',
      recommendation: 'OePNV-Anreiseinformationen ergaenzen.'
    },
    {
      id: 'poi_languages',
      label: 'Fremdsprachenkenntnisse',
      types: ['POI'],
      level: 'very_good',
      fieldCandidates: ['features', 'features_old', 'attributes'],
      status: 'active',
      activeCriterionId: 'poi_languages_missing',
      uiPriority: 'niedrig',
      recommendation: 'Gepruefte Fremdsprachen als Merkmale ergaenzen.'
    },
    {
      id: 'poi_parking',
      label: 'Parkplaetze',
      types: ['POI'],
      level: 'supporting',
      fieldCandidates: ['features', 'features_old', 'texts[rel=directions]'],
      status: 'active',
      activeCriterionId: 'poi_parking_feature_missing',
      uiPriority: 'niedrig',
      recommendation: 'Parkplatzinformation als Merkmal ergaenzen.'
    },
    {
      id: 'poi_suitability',
      label: 'Eignung',
      types: ['POI'],
      level: 'supporting',
      fieldCandidates: ['features', 'features_old'],
      status: 'active',
      activeCriterionId: 'poi_suitability_missing',
      uiPriority: 'niedrig',
      recommendation: 'Gepruefte Eignungsangaben als Merkmale ergaenzen.'
    },
    {
      id: 'gastro_phone',
      label: 'Telefon',
      types: ['Gastro'],
      level: 'minimum',
      fieldCandidates: ['phone', 'phone2', 'addresses.phone'],
      status: 'needs_verification',
      activeCriterionId: null,
      uiPriority: 'hoch',
      recommendation: 'Telefonnummer ergaenzen.'
    },
    {
      id: 'gastro_street',
      label: 'Strasse',
      types: ['Gastro'],
      level: 'minimum',
      fieldCandidates: ['street', 'address.street', 'addresses.street'],
      apiCandidate: apiQueryCandidate({
        positiveQuery: 'street:*',
        missingQuery: 'all:all -street:*',
        prefixes: ['street'],
        confidence: 'documented_prefix'
      }),
      status: 'needs_verification',
      activeCriterionId: null,
      uiPriority: 'hoch',
      recommendation: 'Strasse oder Anschrift ergaenzen.'
    },
    {
      id: 'gastro_details',
      label: 'Beschreibungstext',
      types: ['Gastro'],
      level: 'minimum',
      fieldCandidates: ['texts[rel=details]'],
      status: 'active',
      activeCriterionId: 'description_missing',
      uiPriority: 'hoch',
      recommendation: 'Beschreibungstext ergaenzen.'
    },
    {
      id: 'gastro_teaser',
      label: 'Teaser-Text',
      types: ['Gastro'],
      level: 'minimum',
      fieldCandidates: ['texts[rel=teaser]'],
      status: 'needs_verification',
      activeCriterionId: null,
      uiPriority: 'hoch',
      recommendation: 'Teaser-Text ergaenzen.'
    },
    {
      id: 'gastro_email',
      label: 'E-Mail',
      types: ['Gastro'],
      level: 'good',
      fieldCandidates: ['email', 'addresses.email'],
      status: 'needs_verification',
      activeCriterionId: null,
      uiPriority: 'mittel',
      recommendation: 'E-Mail-Adresse ergaenzen.'
    },
    {
      id: 'gastro_website',
      label: 'Webseite',
      types: ['Gastro'],
      level: 'good',
      fieldCandidates: ['web', 'website', 'url', 'addresses.web'],
      status: 'needs_verification',
      activeCriterionId: null,
      uiPriority: 'mittel',
      recommendation: 'Webseite ergaenzen.'
    },
    {
      id: 'gastro_opening_hours',
      label: 'Oeffnungszeiten',
      types: ['Gastro'],
      level: 'good',
      fieldCandidates: ['texts[rel=openings]', 'timeIntervals', 'alwaysOpen'],
      status: 'active',
      activeCriterionId: 'opening_hours_missing',
      uiPriority: 'hoch',
      recommendation: 'Oeffnungszeiten ergaenzen oder aktualisieren.'
    },
    {
      id: 'gastro_payment',
      label: 'Zahlungsmoeglichkeiten',
      types: ['Gastro'],
      level: 'good',
      fieldCandidates: ['paymentMethods', 'payment_old', 'features'],
      status: 'active',
      activeCriterionId: 'gastro_payment_options_missing',
      uiPriority: 'mittel',
      recommendation: 'Zahlungsmoeglichkeiten ergaenzen.'
    },
    {
      id: 'gastro_license',
      label: 'CC-Lizenz',
      types: ['Gastro'],
      level: 'very_good',
      fieldCandidates: ['attributes[key=license]'],
      status: 'active',
      activeCriterionId: 'license_missing',
      uiPriority: 'hoch',
      openDataRelevant: true,
      recommendation: 'Lizenzangabe ergaenzen oder Open-Data-Status pruefen.'
    },
    {
      id: 'gastro_cuisine_type',
      label: 'Kuechenart',
      types: ['Gastro'],
      level: 'very_good',
      fieldCandidates: ['cuisineTypes', 'cuisine_types_old', 'features'],
      status: 'active',
      activeCriterionId: 'gastro_cuisine_category_missing',
      uiPriority: 'niedrig',
      recommendation: 'Gepruefte Kuechenarten als Kategorien ergaenzen.'
    },
    {
      id: 'gastro_languages',
      label: 'Fremdsprachenkenntnisse',
      types: ['Gastro'],
      level: 'very_good',
      fieldCandidates: ['features', 'features_old', 'attributes'],
      status: 'active',
      activeCriterionId: 'gastro_languages_missing',
      uiPriority: 'niedrig',
      recommendation: 'Gepruefte Fremdsprachen als Merkmale ergaenzen.'
    },
    {
      id: 'gastro_directions',
      label: 'Anfahrt',
      types: ['Gastro'],
      level: 'very_good',
      fieldCandidates: ['texts[rel=directions]', 'features', 'features_old'],
      status: 'active',
      activeCriterionId: 'public_transport_missing',
      uiPriority: 'mittel',
      recommendation: 'Anreiseinformationen ergaenzen.'
    },
    {
      id: 'gastro_parking',
      label: 'Parkplaetze',
      types: ['Gastro'],
      level: 'very_good',
      fieldCandidates: ['features', 'features_old', 'texts[rel=directions]'],
      status: 'active',
      activeCriterionId: 'gastro_parking_feature_missing',
      uiPriority: 'niedrig',
      recommendation: 'Feature "PKW-Parkplatz am Haus" ergaenzen.'
    },
    {
      id: 'gastro_kitchen',
      label: 'Kueche',
      types: ['Gastro'],
      level: 'very_good',
      fieldCandidates: ['kitchenTimeIntervals', 'features', 'features_old'],
      status: 'needs_verification',
      activeCriterionId: null,
      uiPriority: 'niedrig',
      recommendation: 'Kuecheninformationen ergaenzen.'
    },
    {
      id: 'event_phone',
      label: 'Telefon',
      types: ['Event'],
      level: 'minimum',
      fieldCandidates: ['phone', 'phone2', 'addresses.phone'],
      status: 'needs_verification',
      activeCriterionId: null,
      uiPriority: 'hoch',
      recommendation: 'Telefonnummer ergaenzen.'
    },
    {
      id: 'event_street',
      label: 'Strasse',
      types: ['Event'],
      level: 'minimum',
      fieldCandidates: ['street', 'address.street', 'addresses.street'],
      apiCandidate: apiQueryCandidate({
        positiveQuery: 'street:*',
        missingQuery: 'all:all -street:*',
        prefixes: ['street'],
        confidence: 'documented_prefix'
      }),
      status: 'needs_verification',
      activeCriterionId: null,
      uiPriority: 'hoch',
      recommendation: 'Strasse oder Anschrift ergaenzen.'
    },
    {
      id: 'event_details',
      label: 'Beschreibungstext',
      types: ['Event'],
      level: 'minimum',
      fieldCandidates: ['texts[rel=details]'],
      apiCandidate: apiQueryCandidate({
        positiveQuery: 'details:*',
        missingQuery: 'all:all -details:*',
        prefixes: ['details'],
        source: 'existing_quality_query',
        confidence: 'existing_prefix_needs_type_verification',
        note: 'details ist fuer POI, Gastro und Tour bereits aktiv; Event muss mit echten positiven und negativen Datensaetzen verifiziert werden.'
      }),
      status: 'needs_verification',
      activeCriterionId: null,
      uiPriority: 'hoch',
      recommendation: 'Beschreibungstext ergaenzen.'
    },
    {
      id: 'event_teaser',
      label: 'Teaser-Text',
      types: ['Event'],
      level: 'minimum',
      fieldCandidates: ['texts[rel=teaser]'],
      status: 'needs_verification',
      activeCriterionId: null,
      uiPriority: 'hoch',
      recommendation: 'Teaser-Text ergaenzen.'
    },
    {
      id: 'event_email',
      label: 'E-Mail',
      types: ['Event'],
      level: 'good',
      fieldCandidates: ['email', 'addresses.email'],
      status: 'needs_verification',
      activeCriterionId: null,
      uiPriority: 'mittel',
      recommendation: 'E-Mail-Adresse ergaenzen.'
    },
    {
      id: 'event_website',
      label: 'Webseite',
      types: ['Event'],
      level: 'good',
      fieldCandidates: ['web', 'website', 'url', 'addresses.web'],
      status: 'needs_verification',
      activeCriterionId: null,
      uiPriority: 'mittel',
      recommendation: 'Webseite ergaenzen.'
    },
    {
      id: 'event_price',
      label: 'Preisinformationen',
      types: ['Event'],
      level: 'good',
      fieldCandidates: ['prices', 'price', 'numbers', 'attributes'],
      status: 'needs_verification',
      activeCriterionId: null,
      uiPriority: 'mittel',
      recommendation: 'Preisinformation ergaenzen.'
    },
    {
      id: 'event_payment',
      label: 'Zahlungsmoeglichkeiten',
      types: ['Event'],
      level: 'very_good',
      fieldCandidates: ['paymentMethods', 'payment_old', 'features'],
      status: 'needs_verification',
      activeCriterionId: null,
      uiPriority: 'niedrig',
      recommendation: 'Zahlungsmoeglichkeiten ergaenzen.'
    },
    {
      id: 'event_license',
      label: 'CC-Lizenz',
      types: ['Event'],
      level: 'very_good',
      fieldCandidates: ['attributes[key=license]'],
      apiCandidate: apiQueryCandidate({
        positiveQuery: 'attribute_license:(CC0 OR CC-BY OR CC-BY-SA OR PD)',
        missingQuery: 'all:all -attribute_license:(CC0 OR CC-BY OR CC-BY-SA OR PD)',
        prefixes: ['attribute_license'],
        source: 'existing_quality_query',
        confidence: 'existing_prefix_needs_type_verification',
        note: 'attribute_license ist fuer POI, Gastro, Tour, Hotel und Package bereits aktiv; Event muss mit echten Datensaetzen verifiziert werden.'
      }),
      status: 'needs_verification',
      activeCriterionId: null,
      uiPriority: 'hoch',
      openDataRelevant: true,
      recommendation: 'Lizenzangabe ergaenzen oder Open-Data-Status pruefen.'
    },
    {
      id: 'event_public_transport',
      label: 'OePNV-Anreise',
      types: ['Event'],
      level: 'supporting',
      fieldCandidates: ['features', 'features_old', 'texts[rel=directions]', 'texts[rel=station]'],
      status: 'active',
      activeCriterionId: 'public_transport_missing',
      uiPriority: 'mittel',
      recommendation: 'OePNV-Anreiseinformationen ergaenzen.'
    },
    {
      id: 'package_license',
      label: 'Lizenz',
      types: ['Package'],
      level: 'very_good',
      fieldCandidates: ['attributes[key=license]'],
      status: 'active',
      activeCriterionId: 'license_missing',
      uiPriority: 'hoch',
      openDataRelevant: true,
      recommendation: 'Lizenzangabe ergaenzen oder Open-Data-Status pruefen.'
    },
    {
      id: 'package_booking_link',
      label: 'Buchungslink',
      types: ['Package'],
      level: 'minimum',
      fieldCandidates: ['media_objects[rel=booking].url'],
      status: 'active',
      activeCriterionId: 'booking_link_missing',
      uiPriority: 'hoch',
      recommendation: 'Buchungs-, Reservierungs- oder Ticketlink ergaenzen.'
    },
    {
      id: 'media_image',
      label: 'Bildmaterial',
      types: ['POI', 'Gastro', 'Tour'],
      level: 'good',
      fieldCandidates: ['media_objects'],
      status: 'active',
      activeCriterionId: 'image_missing',
      uiPriority: 'mittel',
      recommendation: 'Bildmaterial ergaenzen.'
    },
    {
      id: 'media_image_author',
      label: 'Bildurheber',
      types: ['POI', 'Tour', 'Hotel', 'Event', 'Gastro', 'Package'],
      level: 'minimum',
      fieldCandidates: ['media_objects.copyrightText'],
      status: 'active',
      activeCriterionId: 'image_author_missing',
      uiPriority: 'hoch',
      openDataRelevant: true,
      recommendation: 'Fotograf oder Urheberhinweis ergaenzen.'
    }
  ])
});

export const qualityCriteria = Object.freeze([
  {
    id: 'opening_hours_missing',
    label: 'Oeffnungszeiten fehlen',
    types: ['POI', 'Gastro'],
    priority: 'hoch',
    autoCheck: true,
    weight: 10,
    qualityLevel: 'good',
    uiSeverity: 'kritisch',
    domainCriterionIds: ['poi_opening_hours', 'gastro_opening_hours'],
    fields: ['texts[rel=openings]', 'timeIntervals', 'alwaysOpen'],
    method: 'server_scan',
    api: {
      positiveQuery: 'openings:*',
      missingQuery: 'all:all -openings:*',
      verified: false,
      verifiedForTypes: [],
      note: 'Wildcard-Pushdown fachlich verworfen; Oeffnungszeiten werden ueber Server-Scan bewertet.'
    },
    recommendation: 'Oeffnungszeiten ergaenzen oder aktualisieren.',
    excludedCategories: POI_EXCLUSION_BY_CRITERION.opening_hours_missing,
    check: (item) => !hasOpeningHours(item)
  },
  {
    id: 'license_missing',
    label: 'Lizenzangabe fehlt',
    types: ['POI', 'Gastro', 'Tour', 'Hotel', 'Package'],
    priority: 'hoch',
    autoCheck: true,
    weight: 10,
    qualityLevel: 'very_good',
    uiSeverity: 'kritisch',
    openDataRelevant: true,
    domainCriterionIds: ['hotel_license', 'tour_license', 'poi_license', 'gastro_license', 'package_license'],
    fields: ['attributes[key=license]'],
    method: 'api_pushdown',
    api: {
      positiveQuery: 'attribute_license:(CC0 OR CC-BY OR CC-BY-SA OR PD)',
      missingQuery: 'all:all -attribute_license:(CC0 OR CC-BY OR CC-BY-SA OR PD)',
      verified: true,
      verifiedForTypes: ['POI', 'Gastro', 'Tour', 'Hotel', 'Package']
    },
    recommendation: 'Lizenzangabe ergaenzen oder Open-Data-Status pruefen.',
    check: (item) => !hasValidDatasetLicense(item)
  },
  {
    id: 'description_missing',
    label: 'Beschreibung fehlt',
    types: ['POI', 'Gastro', 'Tour'],
    priority: 'hoch',
    autoCheck: true,
    weight: 8,
    qualityLevel: 'minimum',
    uiSeverity: 'kritisch',
    domainCriterionIds: ['tour_details', 'poi_details', 'gastro_details'],
    fields: ['texts[rel=details]'],
    method: 'server_scan',
    api: {
      positiveQuery: 'details:*',
      missingQuery: 'all:all -details:*',
      verified: false,
      verifiedForTypes: [],
      note: 'Wildcard-Pushdown fachlich verworfen; Beschreibung wird ueber Server-Scan bewertet.'
    },
    recommendation: 'Beschreibung oder Kurzbeschreibung ergaenzen.',
    check: (item) => !hasDescription(item)
  },
  {
    id: 'poi_street_missing',
    label: 'Strasse fehlt',
    types: ['POI'],
    priority: 'hoch',
    autoCheck: true,
    weight: 8,
    qualityLevel: 'minimum',
    uiSeverity: 'kritisch',
    domainCriterionIds: ['poi_street'],
    fields: ['street', 'address.street', 'addresses.street'],
    method: 'server_scan',
    recommendation: 'Strasse oder Anschrift ergaenzen.',
    excludedCategories: POI_EXCLUSION_BY_CRITERION.poi_street_missing,
    check: (item) => !hasStreetInfo(item)
  },
  {
    id: 'poi_teaser_missing',
    label: 'Teaser fehlt',
    types: ['POI'],
    priority: 'hoch',
    autoCheck: true,
    weight: 6,
    qualityLevel: 'minimum',
    uiSeverity: 'kritisch',
    domainCriterionIds: ['poi_teaser'],
    fields: ['texts[rel=teaser]'],
    method: 'server_scan',
    recommendation: 'Teaser-Text ergaenzen.',
    check: (item) => !hasTeaserText(item)
  },
  {
    id: 'poi_email_missing',
    label: 'E-Mail fehlt',
    types: ['POI'],
    priority: 'mittel',
    autoCheck: true,
    weight: 5,
    qualityLevel: 'good',
    uiSeverity: 'kleines_problem',
    domainCriterionIds: ['poi_email'],
    fields: ['email', 'addresses.email'],
    method: 'server_scan',
    recommendation: 'E-Mail-Adresse ergaenzen.',
    excludedCategories: POI_EXCLUSION_BY_CRITERION.poi_email_missing,
    check: (item) => !hasEmailInfo(item)
  },
  {
    id: 'poi_website_missing',
    label: 'Webseite fehlt',
    types: ['POI'],
    priority: 'mittel',
    autoCheck: true,
    weight: 5,
    qualityLevel: 'good',
    uiSeverity: 'kleines_problem',
    domainCriterionIds: ['poi_website'],
    fields: ['web', 'website', 'url', 'addresses.web'],
    method: 'server_scan',
    recommendation: 'Webseite ergaenzen.',
    excludedCategories: POI_EXCLUSION_BY_CRITERION.poi_website_missing,
    check: (item) => !hasWebsiteInfo(item)
  },
  {
    id: 'poi_phone_missing',
    label: 'Telefon fehlt',
    types: ['POI'],
    priority: 'mittel',
    autoCheck: true,
    weight: 5,
    qualityLevel: 'good',
    uiSeverity: 'kleines_problem',
    domainCriterionIds: ['poi_phone'],
    fields: ['phone', 'phone2', 'addresses.phone'],
    method: 'server_scan',
    recommendation: 'Telefonnummer ergaenzen.',
    excludedCategories: POI_EXCLUSION_BY_CRITERION.poi_phone_missing,
    check: (item) => !hasPhoneInfo(item)
  },
  {
    id: 'image_missing',
    label: 'Bild fehlt',
    types: ['POI', 'Gastro', 'Tour'],
    priority: 'mittel',
    autoCheck: true,
    weight: 6,
    qualityLevel: 'good',
    uiSeverity: 'kleines_problem',
    domainCriterionIds: ['media_image'],
    fields: ['media_objects'],
    method: 'api_pushdown',
    api: {
      positiveQuery: 'media:*',
      missingQuery: 'all:all -media:*',
      verified: true,
      verifiedForTypes: ['POI', 'Gastro', 'Tour']
    },
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
    qualityLevel: 'minimum',
    uiSeverity: 'kritisch',
    openDataRelevant: true,
    domainCriterionIds: ['media_image_author'],
    fields: ['media_objects.copyrightText'],
    method: 'server_scan',
    api: {
      positiveQuery: null,
      missingQuery: null,
      prefilterQuery: 'media:*',
      prefilterVerified: true,
      verified: false,
      verifiedForTypes: []
    },
    unsupportedQueries: ['media_objects.copyrightText:*', 'copyrightText:*'],
    note: 'Server-Scan getestet mit POI ueber mehrere Cursor-Seiten. API-Pushdown auf copyrightText/media_objects.copyrightText bleibt nicht verifiziert.',
    recommendation: 'Fotograf oder Urheberhinweis ergaenzen.',
    check: (item) => hasImages(item) && !hasImageAuthor(item)
  },
  {
    id: 'public_transport_missing',
    label: 'OePNV-Anreise fehlt',
    types: ['POI', 'Gastro', 'Tour', 'Hotel', 'Event'],
    priority: 'mittel',
    autoCheck: true,
    weight: 5,
    qualityLevel: 'good',
    uiSeverity: 'kleines_problem',
    domainCriterionIds: ['hotel_public_transport', 'tour_arrival_public_transport', 'poi_public_transport', 'gastro_directions', 'event_public_transport'],
    fields: ['features', 'features_old'],
    method: 'api_pushdown',
    api: {
      positiveQuery: 'feature:"Mit \u00d6PNV erreichbar"',
      missingQuery: 'all:all -feature:"Mit \u00d6PNV erreichbar"',
      verified: true,
      verifiedForTypes: ['POI', 'Gastro', 'Tour', 'Hotel', 'Event'],
      requiresUtf8Value: 'Mit \u00d6PNV erreichbar'
    },
    recommendation: 'OePNV-Anreiseinformationen ergaenzen.',
    check: (item) => !hasPublicTransportFeature(item)
  },
  {
    id: 'hotel_language_english_missing',
    label: 'Fremdsprachenangabe fehlt',
    types: ['Hotel'],
    priority: 'niedrig',
    autoCheck: true,
    weight: 3,
    qualityLevel: 'very_good',
    uiSeverity: 'kleines_problem',
    domainCriterionIds: ['hotel_languages'],
    fields: ['features', 'features_old'],
    method: 'api_pushdown',
    api: {
      positiveQuery: buildQuotedOrQuery('feature', VALIDATED_FEATURE_VALUES.hotelLanguages),
      missingQuery: buildMissingPushdownQuery(buildQuotedOrQuery('feature', VALIDATED_FEATURE_VALUES.hotelLanguages)),
      verified: true,
      verifiedForTypes: ['Hotel']
    },
    recommendation: 'Mindestens eine gepruefte Fremdsprache als Merkmal ergaenzen.',
    check: (item) => !hasAnyFeature(item, VALIDATED_FEATURE_VALUES.hotelLanguages)
  },
  {
    id: 'hotel_payment_cash_missing',
    label: 'Zahlungsart fehlt',
    types: ['Hotel'],
    priority: 'niedrig',
    autoCheck: true,
    weight: 3,
    qualityLevel: 'good',
    uiSeverity: 'kleines_problem',
    domainCriterionIds: ['hotel_payment'],
    fields: ['features', 'features_old'],
    method: 'api_pushdown',
    api: {
      positiveQuery: buildQuotedOrQuery('feature', VALIDATED_FEATURE_VALUES.hotelPayments),
      missingQuery: buildMissingPushdownQuery(buildQuotedOrQuery('feature', VALIDATED_FEATURE_VALUES.hotelPayments)),
      verified: true,
      verifiedForTypes: ['Hotel']
    },
    recommendation: 'Mindestens eine gepruefte Zahlungsart als Merkmal ergaenzen.',
    check: (item) => !hasAnyFeature(item, VALIDATED_FEATURE_VALUES.hotelPayments)
  },
  {
    id: 'hotel_parking_feature_missing',
    label: 'Parkhinweis fehlt',
    types: ['Hotel'],
    priority: 'niedrig',
    autoCheck: true,
    weight: 3,
    qualityLevel: 'very_good',
    uiSeverity: 'kleines_problem',
    domainCriterionIds: ['hotel_parking'],
    fields: ['features', 'features_old'],
    method: 'api_pushdown',
    api: {
      positiveQuery: buildQuotedOrQuery('feature', VALIDATED_FEATURE_VALUES.hotelParking),
      missingQuery: buildMissingPushdownQuery(buildQuotedOrQuery('feature', VALIDATED_FEATURE_VALUES.hotelParking)),
      verified: true,
      verifiedForTypes: ['Hotel']
    },
    recommendation: 'Mindestens einen geprueften Parkhinweis als Merkmal ergaenzen.',
    check: (item) => !hasAnyFeature(item, VALIDATED_FEATURE_VALUES.hotelParking)
  },
  {
    id: 'tour_season_missing',
    label: 'Jahreszeitangabe fehlt',
    types: ['Tour'],
    priority: 'mittel',
    autoCheck: true,
    weight: 4,
    qualityLevel: 'good',
    uiSeverity: 'kleines_problem',
    domainCriterionIds: ['tour_season'],
    fields: ['seasons'],
    method: 'server_scan',
    recommendation: 'Saison- oder Eignungsangaben fuer die Tour ergaenzen.',
    check: (item) => !hasSeasonInfo(item)
  },
  {
    id: 'tour_parking_missing',
    label: 'Parkhinweis fehlt',
    types: ['Tour'],
    priority: 'mittel',
    autoCheck: true,
    weight: 4,
    qualityLevel: 'good',
    uiSeverity: 'kleines_problem',
    domainCriterionIds: ['tour_parking'],
    fields: ['texts[rel=TourMoreInfos_parking]', 'texts[rel=TourMoreInfos_directions]', 'texts[rel=directions]'],
    method: 'server_scan',
    recommendation: 'Parkmoeglichkeiten oder Parkhinweise fuer die Tour ergaenzen.',
    check: (item) => !hasTourParkingInfo(item)
  },
  {
    id: 'poi_price_missing',
    label: 'Preisinformation fehlt',
    types: ['POI'],
    priority: 'mittel',
    autoCheck: true,
    weight: 4,
    qualityLevel: 'good',
    uiSeverity: 'kleines_problem',
    domainCriterionIds: ['poi_price'],
    fields: ['prices', 'price', 'texts[rel=PRICE_INFO]', 'texts[rel=PRICE_REDUCEDINFO]'],
    method: 'server_scan',
    recommendation: 'Preis, Eintritt oder Kostenhinweis ergaenzen.',
    excludedCategories: POI_EXCLUSION_BY_CRITERION.poi_price_missing,
    check: (item) => !hasPriceInfo(item)
  },
  {
    id: 'poi_parking_feature_missing',
    label: 'Feature "Parkplaetze vorhanden" fehlt',
    types: ['POI'],
    priority: 'niedrig',
    autoCheck: true,
    weight: 3,
    qualityLevel: 'supporting',
    uiSeverity: 'kleines_problem',
    domainCriterionIds: ['poi_parking'],
    fields: ['features', 'features_old'],
    method: 'api_pushdown',
    api: {
      positiveQuery: buildQuotedOrQuery('feature', VALIDATED_FEATURE_VALUES.poiParking),
      missingQuery: buildMissingPushdownQuery(buildQuotedOrQuery('feature', VALIDATED_FEATURE_VALUES.poiParking)),
      verified: true,
      verifiedForTypes: ['POI']
    },
    recommendation: 'Feature "Parkplaetze vorhanden" ergaenzen.',
    check: (item) => !hasAnyFeature(item, VALIDATED_FEATURE_VALUES.poiParking)
  },
  {
    id: 'poi_payment_options_missing',
    label: 'Keine der geprueften Zahlungsarten vorhanden',
    types: ['POI'],
    priority: 'niedrig',
    autoCheck: true,
    weight: 4,
    qualityLevel: 'very_good',
    uiSeverity: 'kleines_problem',
    domainCriterionIds: ['poi_payment'],
    fields: ['features', 'features_old'],
    method: 'api_pushdown',
    api: {
      positiveQuery: buildQuotedOrQuery('feature', VALIDATED_FEATURE_VALUES.poiPayments),
      missingQuery: buildMissingPushdownQuery(buildQuotedOrQuery('feature', VALIDATED_FEATURE_VALUES.poiPayments)),
      verified: true,
      verifiedForTypes: ['POI']
    },
    recommendation: 'Mindestens eine gepruefte Zahlungsart als Merkmal ergaenzen.',
    excludedCategories: POI_EXCLUSION_BY_CRITERION.poi_payment_options_missing,
    check: (item) => !hasAnyFeature(item, VALIDATED_FEATURE_VALUES.poiPayments)
  },
  {
    id: 'poi_languages_missing',
    label: 'Keine der geprueften Fremdsprachen vorhanden',
    types: ['POI'],
    priority: 'niedrig',
    autoCheck: true,
    weight: 3,
    qualityLevel: 'very_good',
    uiSeverity: 'kleines_problem',
    domainCriterionIds: ['poi_languages'],
    fields: ['features', 'features_old'],
    method: 'api_pushdown',
    api: {
      positiveQuery: buildQuotedOrQuery('feature', VALIDATED_FEATURE_VALUES.poiLanguages),
      missingQuery: buildMissingPushdownQuery(buildQuotedOrQuery('feature', VALIDATED_FEATURE_VALUES.poiLanguages)),
      verified: true,
      verifiedForTypes: ['POI']
    },
    recommendation: 'Mindestens eine gepruefte Fremdsprache als Merkmal ergaenzen.',
    check: (item) => !hasAnyFeature(item, VALIDATED_FEATURE_VALUES.poiLanguages)
  },
  {
    id: 'poi_suitability_missing',
    label: 'Keine der geprueften Eignungsangaben vorhanden',
    types: ['POI'],
    priority: 'niedrig',
    autoCheck: true,
    weight: 3,
    qualityLevel: 'supporting',
    uiSeverity: 'kleines_problem',
    domainCriterionIds: ['poi_suitability'],
    fields: ['features', 'features_old'],
    method: 'api_pushdown',
    api: {
      positiveQuery: buildQuotedOrQuery('feature', VALIDATED_FEATURE_VALUES.poiSuitability),
      missingQuery: buildMissingPushdownQuery(buildQuotedOrQuery('feature', VALIDATED_FEATURE_VALUES.poiSuitability)),
      verified: true,
      verifiedForTypes: ['POI']
    },
    recommendation: 'Mindestens eine gepruefte Eignungsangabe als Merkmal ergaenzen.',
    check: (item) => !hasAnyFeature(item, VALIDATED_FEATURE_VALUES.poiSuitability)
  },
  {
    id: 'gastro_payment_options_missing',
    label: 'Keine der geprueften Zahlungsarten vorhanden',
    types: ['Gastro'],
    priority: 'mittel',
    autoCheck: true,
    weight: 4,
    qualityLevel: 'good',
    uiSeverity: 'kleines_problem',
    domainCriterionIds: ['gastro_payment'],
    fields: ['features', 'features_old'],
    method: 'api_pushdown',
    api: {
      positiveQuery: buildQuotedOrQuery('feature', VALIDATED_FEATURE_VALUES.gastroPayments),
      missingQuery: buildMissingPushdownQuery(buildQuotedOrQuery('feature', VALIDATED_FEATURE_VALUES.gastroPayments)),
      verified: true,
      verifiedForTypes: ['Gastro']
    },
    recommendation: 'Mindestens eine gepruefte Zahlungsart als Merkmal ergaenzen.',
    check: (item) => !hasAnyFeature(item, VALIDATED_FEATURE_VALUES.gastroPayments)
  },
  {
    id: 'gastro_languages_missing',
    label: 'Keine der geprueften Fremdsprachen vorhanden',
    types: ['Gastro'],
    priority: 'niedrig',
    autoCheck: true,
    weight: 3,
    qualityLevel: 'very_good',
    uiSeverity: 'kleines_problem',
    domainCriterionIds: ['gastro_languages'],
    fields: ['features', 'features_old'],
    method: 'api_pushdown',
    api: {
      positiveQuery: buildQuotedOrQuery('feature', VALIDATED_FEATURE_VALUES.gastroLanguages),
      missingQuery: buildMissingPushdownQuery(buildQuotedOrQuery('feature', VALIDATED_FEATURE_VALUES.gastroLanguages)),
      verified: true,
      verifiedForTypes: ['Gastro']
    },
    recommendation: 'Mindestens eine gepruefte Fremdsprache als Merkmal ergaenzen.',
    check: (item) => !hasAnyFeature(item, VALIDATED_FEATURE_VALUES.gastroLanguages)
  },
  {
    id: 'gastro_parking_feature_missing',
    label: 'Feature "PKW-Parkplatz am Haus" fehlt',
    types: ['Gastro'],
    priority: 'niedrig',
    autoCheck: true,
    weight: 3,
    qualityLevel: 'very_good',
    uiSeverity: 'kleines_problem',
    domainCriterionIds: ['gastro_parking'],
    fields: ['features', 'features_old'],
    method: 'api_pushdown',
    api: {
      positiveQuery: buildQuotedOrQuery('feature', VALIDATED_FEATURE_VALUES.gastroParking),
      missingQuery: buildMissingPushdownQuery(buildQuotedOrQuery('feature', VALIDATED_FEATURE_VALUES.gastroParking)),
      verified: true,
      verifiedForTypes: ['Gastro']
    },
    recommendation: 'Feature "PKW-Parkplatz am Haus" ergaenzen.',
    check: (item) => !hasAnyFeature(item, VALIDATED_FEATURE_VALUES.gastroParking)
  },
  {
    id: 'gastro_cuisine_category_missing',
    label: 'Keine der geprueften Kuechenarten vorhanden',
    types: ['Gastro'],
    priority: 'niedrig',
    autoCheck: true,
    weight: 4,
    qualityLevel: 'very_good',
    uiSeverity: 'kleines_problem',
    domainCriterionIds: ['gastro_cuisine_type'],
    fields: ['categories', 'categories_old'],
    method: 'api_pushdown',
    api: {
      positiveQuery: buildQuotedOrQuery('category', VALIDATED_CATEGORY_VALUES.gastroCuisine),
      missingQuery: buildMissingPushdownQuery(buildQuotedOrQuery('category', VALIDATED_CATEGORY_VALUES.gastroCuisine)),
      verified: true,
      verifiedForTypes: ['Gastro']
    },
    recommendation: 'Mindestens eine gepruefte Kuechenart als Kategorie ergaenzen.',
    check: (item) => !hasAnyCategory(item, VALIDATED_CATEGORY_VALUES.gastroCuisine)
  },
  {
    id: 'booking_link_missing',
    label: 'Buchungslink fehlt',
    types: ['Hotel', 'Package'],
    priority: 'hoch',
    autoCheck: true,
    weight: 8,
    qualityLevel: 'minimum',
    uiSeverity: 'kritisch',
    domainCriterionIds: ['hotel_booking_link', 'package_booking_link'],
    fields: ['media_objects[rel=booking].url'],
    method: 'server_scan',
    api: {
      positiveQuery: null,
      missingQuery: null,
      verified: false,
      verifiedForTypes: []
    },
    apiByType: {
      Hotel: {
        method: 'api_pushdown',
        positiveQuery: 'keyword:"Bookable"',
        missingQuery: 'all:all -keyword:"Bookable"',
        verified: true,
        note: 'Nicht ueber booking:* pruefen. API-Pushdown fuer Hotel-Buchbarkeit laeuft ueber keyword:"Bookable".'
      },
      Package: {
        method: 'server_scan',
        positiveQuery: null,
        missingQuery: null,
        verified: false,
        note: 'Server-Scan getestet mit Package ueber mehrere Cursor-Seiten. API-Pushdown bleibt nicht verifiziert.'
      }
    },
    recommendation: 'Buchungs-, Reservierungs- oder Ticketlink ergaenzen.',
    check: (item) => (
      normalizeType(item?.type) === 'Hotel'
        ? !hasKeyword(item, 'Bookable')
        : !hasBookingLink(item)
    )
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

export function getDomainCriteriaForType(type) {
  const normalizedType = normalizeType(type);
  if (!normalizedType) return [];

  return domainQualityModel.criteria.filter((criterion) => (
    safeArray(criterion.types).map(normalizeType).includes(normalizedType)
  ));
}

export function getDomainCriteriaForActiveCriterion(criterionId) {
  const normalizedCriterionId = normalizeString(criterionId);
  if (!normalizedCriterionId) return [];
  return domainQualityModel.criteria.filter((criterion) => criterion.activeCriterionId === normalizedCriterionId);
}

export function getDomainApiCandidatesForType(type) {
  const normalizedType = normalizeType(type);
  return domainQualityModel.criteria.filter((criterion) => (
    criterion.apiCandidate &&
    (!normalizedType || safeArray(criterion.types).map(normalizeType).includes(normalizedType))
  ));
}

export function getDomainCriterionApiCandidate(criterionId, type = null) {
  const normalizedCriterionId = normalizeString(criterionId);
  const normalizedType = normalizeType(type);
  if (!normalizedCriterionId) return null;

  const criterion = domainQualityModel.criteria.find((entry) => entry.id === normalizedCriterionId);
  if (!criterion?.apiCandidate) return null;
  if (normalizedType && !safeArray(criterion.types).map(normalizeType).includes(normalizedType)) return null;

  return {
    criterionId: criterion.id,
    label: criterion.label,
    types: safeArray(criterion.types),
    status: criterion.status,
    activeCriterionId: criterion.activeCriterionId || null,
    apiCandidate: criterion.apiCandidate
  };
}

export function getDomainQualityModelSummary() {
  const summary = {
    applicability: domainQualityModel.applicability,
    technicalStatusNote: domainQualityModel.technicalStatusNote,
    sourceGuaranteedCount: domainQualityModel.sourceGuaranteedFields.length,
    totalCriteria: domainQualityModel.criteria.length,
    applicableCriteria: domainQualityModel.criteria.length,
    statusCounts: {},
    typeCounts: {},
    levelCounts: {},
    apiCandidateCounts: {
      total: 0,
      documentedPrefix: 0,
      existingPrefixNeedsTypeVerification: 0,
      partialDocumentedPrefixes: 0
    },
    activeCriterionMappings: {}
  };

  domainQualityModel.criteria.forEach((criterion) => {
    const status = criterion.status || 'unknown';
    const level = criterion.level || 'unknown';
    summary.statusCounts[status] = (summary.statusCounts[status] || 0) + 1;
    summary.levelCounts[level] = (summary.levelCounts[level] || 0) + 1;
    safeArray(criterion.types).forEach((type) => {
      const normalizedType = normalizeType(type) || 'Unbekannt';
      summary.typeCounts[normalizedType] = (summary.typeCounts[normalizedType] || 0) + 1;
    });
    if (criterion.activeCriterionId) {
      const mapped = summary.activeCriterionMappings[criterion.activeCriterionId] || [];
      mapped.push(criterion.id);
      summary.activeCriterionMappings[criterion.activeCriterionId] = mapped;
    }
    if (criterion.apiCandidate) {
      summary.apiCandidateCounts.total += 1;
      if (criterion.apiCandidate.confidence === 'documented_prefix') {
        summary.apiCandidateCounts.documentedPrefix += 1;
      } else if (criterion.apiCandidate.confidence === 'existing_prefix_needs_type_verification') {
        summary.apiCandidateCounts.existingPrefixNeedsTypeVerification += 1;
      } else if (criterion.apiCandidate.confidence === 'partial_documented_prefixes') {
        summary.apiCandidateCounts.partialDocumentedPrefixes += 1;
      }
    }
  });

  return summary;
}

function getCriterionById(criterionId) {
  return qualityCriteria.find((criterion) => criterion.id === criterionId) || null;
}

export function getQualityScanConfig(criterionId, type) {
  const criterion = typeof criterionId === 'object'
    ? criterionId
    : getCriterionById(criterionId);
  const normalizedType = normalizeType(type);

  if (!criterion || !normalizedType) {
    return {
      method: 'unsupported',
      positiveQuery: null,
      missingQuery: null,
      prefilterQuery: null,
      verified: false,
      warnings: ['missing_criterion_or_type']
    };
  }

  const typeConfig = criterion.apiByType?.[normalizedType] || null;
  const apiConfig = typeConfig || criterion.api || {};
  const verifiedForType = Array.isArray(apiConfig.verifiedForTypes)
    ? apiConfig.verifiedForTypes.map(normalizeType).includes(normalizedType)
    : Boolean(apiConfig.verified);
  const method = apiConfig.method || criterion.method || (apiConfig.missingQuery ? 'api_pushdown' : 'server_scan');
  const canUseApiPushdown = method === 'api_pushdown' && Boolean(apiConfig.missingQuery) && verifiedForType;
  const warnings = [];

  if (method === 'api_pushdown' && !canUseApiPushdown) {
    warnings.push('api_query_not_verified_for_type');
  }

  if (criterion.unsupportedQueries?.length) {
    warnings.push('unsupported_queries_documented');
  }

  if (apiConfig.note) {
    warnings.push(apiConfig.note);
  }

  return {
    method: canUseApiPushdown ? 'api_pushdown' : 'server_scan',
    positiveQuery: canUseApiPushdown ? apiConfig.positiveQuery || null : null,
    missingQuery: canUseApiPushdown ? apiConfig.missingQuery || null : null,
    prefilterQuery: apiConfig.prefilterQuery || null,
    prefilterVerified: Boolean(apiConfig.prefilterVerified),
    verified: canUseApiPushdown,
    verifiedForType,
    requestedMethod: method,
    unsupportedQueries: criterion.unsupportedQueries || [],
    warnings
  };
}

function runCriterionCheck(criterion, item) {
  if (typeof criterion?.check !== 'function') return false;

  try {
    return Boolean(criterion.check(item || {}));
  } catch {
    return true;
  }
}

function isCriterionExcludedByCategory(criterion, item) {
  const excludedCategories = safeArray(criterion?.excludedCategories);
  if (!excludedCategories.length) return false;
  return hasAnyCategory(item, excludedCategories);
}

function getCriteriaResults(item) {
  const relevantCriteria = getCriteriaForType(item?.type);

  return relevantCriteria.map((criterion) => {
    const manual = criterion.autoCheck === false;
    const excluded = isCriterionExcludedByCategory(criterion, item);
    const missing = manual || excluded ? false : runCriterionCheck(criterion, item);

    return {
      criterionId: criterion.id,
      criterion,
      autoCheck: !manual,
      manual,
      excluded,
      weight: Number.isFinite(criterion.weight) ? criterion.weight : 0,
      missing,
      fulfilled: !manual && !excluded && !missing
    };
  });
}

export function calculateQualityScore(item, criteriaResults = getCriteriaResults(item || {})) {
  const scoredResults = safeArray(criteriaResults).filter((result) => (
    result.autoCheck &&
    !result.excluded &&
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
  const excludedCriteria = criteriaResults
    .filter((result) => result.excluded)
    .map((result) => result.criterionId);
  const qualityScore = calculateQualityScore(baseItem, criteriaResults);

  return {
    ...baseItem,
    missingCriteria,
    fulfilledCriteria,
    manualCriteria,
    excludedCriteria,
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

  if (key === 'excludedCriteria') {
    return results.filter((result) => result.excluded).map((result) => result.criterionId);
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
    const excludedCount = relevantItems.filter((item) => getCriteriaIdsForItem(item, 'excludedCriteria').includes(criterion.id)).length;
    const totalRelevantCount = Math.max(0, relevantItems.length - excludedCount);
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
      excludedCount,
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
  isNonEmptyHtmlOrText,
  hasAnyValue,
  hasGeoCoordinates,
  getTextsByRel,
  hasTextByRel,
  hasDetailsText,
  hasTeaserText,
  hasStreetInfo,
  hasPhoneInfo,
  hasEmailInfo,
  hasWebsiteInfo,
  hasPriceInfo,
  hasSeasonInfo,
  hasAddressRel,
  hasAuthorOrOrganisation,
  getAttributeValue,
  hasAttributeValue,
  hasValidDatasetLicense,
  getFeatureValues,
  hasFeature,
  hasAnyFeature,
  hasTourParkingInfo,
  hasPublicTransportFeature,
  getMediaObjects,
  isCheckableMediaObject,
  hasCheckableMedia,
  findMissingCopyrightMedia,
  getAreaValues,
  getCategoryValues,
  hasCategory,
  hasAnyCategory,
  getKeywordValues,
  hasKeyword,
  hasDescription,
  hasImages,
  hasImageAuthor,
  hasOpeningHours,
  hasBookingLink,
  hasFutureEventDate,
  isTouristTripReady,
  getDomainCriteriaForType,
  getDomainCriteriaForActiveCriterion,
  getDomainQualityModelSummary,
  getCriteriaForType,
  getQualityScanConfig,
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
