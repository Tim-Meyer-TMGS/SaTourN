import {
  evaluateQualityForItem,
  findMissingCopyrightMedia,
  getAttributeValue,
  getDomainCriteriaForType,
  getMediaObjects,
  getTextsByRel,
  hasBookingLink,
  hasDetailsText,
  hasOpeningHours,
  hasPublicTransportFeature,
  hasValidDatasetLicense,
  isCheckableMediaObject,
  qualityCriteria
} from '../../shared/legacy/quality';
import {
  arrayOfStrings,
  buildQualityEvaluationInput,
  buildVerifiedEt4Url,
  getArrayFromPaths,
  getFirst,
  getNestedValue,
  getPrimarySystem,
  getRecordEmail,
  getRecordPhone,
  getRecordWeb,
  getTypeFromGlobalId,
  textValue
} from '../../shared/records/record-fields';
import type { DetailCriteriaSection, DetailImage, DetailInfoEntry, DetailItem, DetailPrimarySystem, DetailUsability } from './record-detail-types';

function legacyAssetUrl(path: string) {
  const baseUrl = import.meta.env.BASE_URL || '/';
  const appRoot = baseUrl.replace(/frontend-preview\/?$/, '');
  return `${appRoot}${path.replace(/^\/+/, '')}`;
}

function buildPrimarySystemDisplay(system: { id: string; name: string; short: string }): DetailPrimarySystem {
  const logoBySystem: Record<string, string> = {
    feratel: legacyAssetUrl('Statistik/assets/logos/feratel.png'),
    outdooractive: legacyAssetUrl('Statistik/assets/logos/outdooractive.png')
  };

  return {
    ...system,
    logoUrl: logoBySystem[system.id] || ''
  };
}

function htmlToPlainText(value: unknown) {
  return String(value || '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#039;|&apos;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function textTypeRank(type: unknown) {
  const normalized = String(type || '').toLowerCase();
  if (normalized === 'text/html') return 0;
  if (normalized === 'text/plain') return 1;
  return 2;
}

function getTextByRel(raw: unknown, rel: string) {
  return getTextsByRel(raw, rel)
    .sort((left, right) => textTypeRank((left as Record<string, unknown>)?.type) - textTypeRank((right as Record<string, unknown>)?.type))
    .map((entry) => htmlToPlainText((entry as Record<string, unknown>)?.value || (entry as Record<string, unknown>)?.text || (entry as Record<string, unknown>)?.content || entry))
    .filter(Boolean)[0] || '';
}

function formatWeekdays(days: unknown) {
  const labels: Record<string, string> = {
    Monday: 'Montag',
    Tuesday: 'Dienstag',
    Wednesday: 'Mittwoch',
    Thursday: 'Donnerstag',
    Friday: 'Freitag',
    Saturday: 'Samstag',
    Sunday: 'Sonntag'
  };
  return Array.isArray(days) ? days.map((day) => labels[String(day)] || String(day)).join(', ') : '';
}

function formatIntervalTime(value: unknown) {
  const match = String(value || '').match(/T(\d{2}):(\d{2})/);
  return match ? `${match[1]}:${match[2]}` : '';
}

function addressRelLabel(rel: string) {
  const labels: Record<string, string> = {
    author: 'Autor',
    organisation: 'Organisation',
    copyright: 'Copyright',
    contact_person: 'Kontaktperson'
  };

  return labels[rel] || rel;
}

function buildInfoEntries(rows: Array<[string, unknown]>): DetailInfoEntry[] {
  return rows
    .map(([label, value]) => ({ label, value: textValue(value) }))
    .filter((entry) => entry.value);
}

function getExternalSystemIds(raw: unknown): DetailInfoEntry[] {
  return buildInfoEntries([
    ['Outdooractive-ID', getAttributeValue(raw, 'SYSTEMID_outdooractive')],
    ['Google-Places-ID', getAttributeValue(raw, 'SYSTEMID_GOOGLEPLACES')],
    ['source_id', getFirst(raw, ['source_id', 'sourceId'])]
  ]);
}

function getAddressSummary(raw: unknown): DetailInfoEntry[] {
  const addresses = getNestedValue(raw, 'addresses');
  if (!Array.isArray(addresses)) return [];

  return ['author', 'organisation', 'copyright', 'contact_person']
    .map((rel) => {
      const entry = addresses.find((address) => (address as Record<string, unknown>)?.rel === rel) as Record<string, unknown> | undefined;
      if (!entry) return null;

      const contact = [
        textValue(entry.name),
        textValue(entry.street),
        [textValue(entry.zip), textValue(entry.city)].filter(Boolean).join(' '),
        textValue(entry.web),
        textValue(entry.email),
        textValue(entry.phone)
      ].filter(Boolean).join(' | ');

      return contact ? { label: addressRelLabel(rel), value: contact } : null;
    })
    .filter((entry): entry is DetailInfoEntry => Boolean(entry));
}

function getCoordinates(raw: unknown) {
  const lat = getFirst(raw, ['geo.main.latitude', 'latitude']);
  const lon = getFirst(raw, ['geo.main.longitude', 'longitude']);
  return lat && lon ? `${lat}, ${lon}` : '';
}

function getRawExcerpt(raw: unknown): DetailInfoEntry[] {
  return buildInfoEntries([
    ['created', getFirst(raw, ['created'])],
    ['changed', getFirst(raw, ['changed'])],
    ['channel', getFirst(raw, ['channel'])],
    ['rating eT4', getFirst(raw, ['ratings.0.value'])],
    ['SEO-Titel', getTextByRel(raw, 'WEB_SEO_TITEL')],
    ['SEO-Beschreibung', getTextByRel(raw, 'WEB_SEO_BESCHREIBUNG')]
  ]);
}

function getOpeningHoursSummary(raw: unknown) {
  if ((raw as { alwaysOpen?: boolean })?.alwaysOpen === true) return 'Immer geöffnet.';
  const openingText = getTextByRel(raw, 'openings');
  if (openingText) return openingText;

  const intervals = getArrayFromPaths(raw, ['timeIntervals', 'raw.timeIntervals']);
  const rows = intervals
    .map((interval) => {
      const item = interval as Record<string, unknown>;
      const days = formatWeekdays(item.weekdays);
      const start = formatIntervalTime(item.start);
      const end = formatIntervalTime(item.end);
      if (!days && !start && !end) return '';
      return `${days || 'Zeitraum'}: ${[start, end].filter(Boolean).join(' bis ') || 'Zeit vorhanden'}`;
    })
    .filter(Boolean)
    .slice(0, 7);

  return rows.length ? rows.join('\n') : 'Keine Öffnungszeiten angegeben.';
}

function buildCriteriaSections(item: {
  type: string;
  missingCriteria: string[];
  fulfilledCriteria: string[];
  manualCriteria: string[];
}): DetailCriteriaSection[] {
  const criteria = qualityCriteria.filter((criterion) => !criterion.types?.length || criterion.types.includes(item.type));
  const domainCriteria = getDomainCriteriaForType(item.type);
  const missing = new Set(item.missingCriteria);
  const fulfilled = new Set(item.fulfilledCriteria);
  const manual = new Set(item.manualCriteria);

  const automatic = criteria.map((criterion) => ({
    id: criterion.id,
    label: criterion.label,
    recommendation: criterion.recommendation,
    status: missing.has(criterion.id)
      ? 'fehlt'
      : fulfilled.has(criterion.id)
        ? 'erfuellt'
        : manual.has(criterion.id)
          ? 'nicht bewertbar'
          : 'nicht relevant'
  }));

  const prepared = domainCriteria
    .filter((criterion) => criterion.status === 'needs_verification')
    .map((criterion) => ({
      id: criterion.id,
      label: criterion.label,
      recommendation: criterion.recommendation,
      status: 'vorbereitet'
    }));

  const manualDomain = domainCriteria
    .filter((criterion) => criterion.status === 'manual_review')
    .map((criterion) => ({
      id: criterion.id,
      label: criterion.label,
      recommendation: criterion.recommendation,
      status: 'manuell'
    }));

  const sourceGuarded = domainCriteria
    .filter((criterion) => (
      criterion.status === 'source_guarded' ||
      criterion.status === 'not_applicable' ||
      criterion.status === 'excluded_by_category'
    ))
    .map((criterion) => ({
      id: criterion.id,
      label: criterion.label,
      recommendation: criterion.recommendation,
      status: criterion.status || 'nicht relevant'
    }));

  return [
    {
      title: 'Automatisch bewertet',
      note: 'Diese Kriterien fließen heute bereits in die Datensatzbewertung ein.',
      criteria: automatic
    },
    {
      title: 'Fachlich vorbereitet',
      note: 'Diese Prüfungen sind für diesen Datentyp fachlich vorgesehen, aber noch nicht automatisch scorewirksam.',
      criteria: prepared
    },
    {
      title: 'Manuell zu prüfen',
      note: 'Diese Punkte brauchen weiterhin eine redaktionelle Sichtprüfung.',
      criteria: manualDomain
    },
    {
      title: 'Nicht als normale Pflegeaufgabe',
      note: 'Diese Punkte sind fachlich relevant, werden aber bewusst nicht als normale automatische Pflegeaufgabe behandelt.',
      criteria: sourceGuarded
    }
  ].filter((section) => section.criteria.length);
}

function getImageUrl(image: unknown) {
  if (typeof image === 'string') return image;
  return getFirst(image, ['url', 'contentUrl', 'uri', 'src', 'imageUrl', 'value.url', 'value.uri']);
}

function normalizeImages(raw: unknown): DetailImage[] {
  const mediaObjects = getMediaObjects(raw).filter((media) => isCheckableMediaObject(media));
  const fallbackImages = getArrayFromPaths(raw, [
    'images',
    'media.images',
    'media',
    'picture',
    'pictures'
  ]);
  const images = mediaObjects.length ? mediaObjects : fallbackImages;

  return images
    .map((image) => ({
      url: getImageUrl(image),
      title: getFirst(image, ['title', 'name', 'value', 'caption']) || 'Bild',
      alt: getFirst(image, ['alt', 'altText', 'description']),
      copyright: getFirst(image, ['copyright', 'copyrightText', 'creator', 'author', 'source']),
      license: getFirst(image, ['license', 'licenseText'])
    }))
    .filter((image) => image.url)
    .slice(0, 5);
}

function buildUsability(raw: unknown, itemType: string, images: DetailImage[]): DetailUsability[] {
  const missingCopyright = findMissingCopyrightMedia(raw);
  const licenseOk = hasValidDatasetLicense(raw);
  const hasDescriptionValue = hasDetailsText(raw);
  const hasOpeningsValue = hasOpeningHours(raw);
  const hasTransport = hasPublicTransportFeature(raw);
  const bookingRelevant = ['Hotel', 'Package'].includes(itemType);
  const hasBooking = hasBookingLink(raw);

  return [
    { label: 'Open Data', value: licenseOk ? 'ja' : 'nein', ok: licenseOk },
    { label: 'Lizenzstatus', value: licenseOk ? 'gültig' : 'Lizenz fehlt', ok: licenseOk },
    { label: 'Beschreibung', value: hasDescriptionValue ? 'vorhanden' : 'fehlt', ok: hasDescriptionValue },
    { label: 'Bilder', value: images.length ? 'vorhanden' : 'fehlt', ok: images.length > 0 },
    {
      label: 'Bildrechte',
      value: missingCopyright.length ? `${missingCopyright.length} ohne Urheber` : 'vorhanden',
      ok: missingCopyright.length === 0
    },
    { label: 'ÖPNV-Info', value: hasTransport ? 'vorhanden' : 'nicht vorhanden', ok: hasTransport },
    {
      label: 'Buchungslink',
      value: bookingRelevant ? (hasBooking ? 'vorhanden' : 'fehlt') : 'nicht relevant',
      ok: !bookingRelevant || hasBooking,
      relevant: bookingRelevant
    },
    { label: 'Öffnungszeiten', value: hasOpeningsValue ? 'vorhanden' : 'fehlt', ok: hasOpeningsValue }
  ];
}

export function priorityRank(priority: string | undefined) {
  if (priority === 'hoch') return 3;
  if (priority === 'mittel') return 2;
  return 1;
}

function unwrapResolvedRawItem(rawInput: unknown) {
  return rawInput && typeof rawInput === 'object' && 'raw' in rawInput
    ? (rawInput as { raw?: unknown }).raw ?? rawInput
    : rawInput;
}

function resolveDetailType(rawInput: unknown, raw: unknown, fallbackType: string) {
  return getFirst(rawInput, ['_resolvedType', 'type']) ||
    fallbackType ||
    getTypeFromGlobalId(getFirst(raw, ['global_id', 'globalId']));
}

function buildMediaNote(images: DetailImage[], missingCopyrightCount: number) {
  const missingAltTextCount = images.filter((image) => !image.alt).length;
  return `${images.length} Bilder vorhanden. ${missingCopyrightCount} ohne Urheberangabe. ${missingAltTextCount} ohne Alt-Text.`;
}

export function normalizeDetailItem(rawInput: unknown, fallbackType: string): DetailItem {
  const raw = unwrapResolvedRawItem(rawInput);
  const resolvedType = resolveDetailType(rawInput, raw, fallbackType);
  const baseItem = buildQualityEvaluationInput(raw, { fallbackType: resolvedType });

  const evaluated = evaluateQualityForItem(baseItem) as Record<string, unknown>;
  const evaluatedType = String(evaluated.type || baseItem.type || '');
  const evaluatedGlobalId = String(evaluated.globalId || baseItem.globalId || '');
  const images = normalizeImages(raw);
  const missingCopyrightCount = findMissingCopyrightMedia(raw).length;
  const primarySystem = buildPrimarySystemDisplay(getPrimarySystem({ ...baseItem, raw }));
  const missingCriteria = arrayOfStrings(evaluated.missingCriteria);
  const fulfilledCriteria = arrayOfStrings(evaluated.fulfilledCriteria);
  const manualCriteria = arrayOfStrings(evaluated.manualCriteria);

  return {
    id: String(evaluated.id || baseItem.id || ''),
    globalId: evaluatedGlobalId,
    type: evaluatedType,
    title: String(evaluated.title || baseItem.title || 'Ohne Titel'),
    city: String(evaluated.city || baseItem.city || ''),
    region: String(evaluated.region || baseItem.region || ''),
    category: String(evaluated.category || baseItem.category || ''),
    updatedAt: String(evaluated.updatedAt || baseItem.updatedAt || ''),
    qualityStatus: String(evaluated.qualityStatus || 'nicht berechenbar'),
    qualityScore: Number.isFinite(Number(evaluated.qualityScore)) ? Number(evaluated.qualityScore) : null,
    missingCriteria,
    fulfilledCriteria,
    manualCriteria,
    description: getTextByRel(raw, 'details') || getFirst(raw, ['description', 'details', 'longDescription', 'texts.description', 'presentation.description']),
    teaser: getTextByRel(raw, 'teaser') || getFirst(raw, ['teaser', 'shortDescription', 'texts.teaser', 'presentation.teaser']),
    openings: getOpeningHoursSummary(raw),
    directions: getTextByRel(raw, 'directions') || (hasPublicTransportFeature(raw) ? 'ÖPNV-Information vorhanden.' : 'Keine ÖPNV-Information vorhanden.'),
    price: getTextByRel(raw, 'PRICE_INFO') || getFirst(raw, ['price', 'prices', 'priceInfo', 'texts.price']),
    priceReduced: getTextByRel(raw, 'PRICE_REDUCEDINFO') || getFirst(raw, ['priceReduced', 'reducedPrice', 'texts.priceReduced']),
    et4Url: buildVerifiedEt4Url({ type: evaluatedType, globalId: evaluatedGlobalId }) || getFirst(raw, ['et4Url', 'urls.et4', 'links.et4', 'link']),
    web: getRecordWeb(raw),
    email: getRecordEmail(raw),
    phone: getRecordPhone(raw),
    street: getFirst(raw, ['street', 'address.street']),
    zip: getFirst(raw, ['zip', 'address.zip']),
    license: getAttributeValue(raw, 'license') || '',
    licenseUrl: getAttributeValue(raw, 'licenseurl') || '',
    source: getFirst(raw, ['source', 'provider', 'channel']) || 'Destination.One',
    sourceUrl: getFirst(raw, ['source.url', 'raw.source.url']),
    coordinates: getCoordinates(raw),
    primarySystem,
    externalIds: getExternalSystemIds(raw),
    addressEntries: getAddressSummary(raw),
    rawExcerpt: getRawExcerpt(raw),
    usability: buildUsability(raw, evaluatedType, images),
    criteriaSections: buildCriteriaSections({
      type: evaluatedType,
      missingCriteria,
      fulfilledCriteria,
      manualCriteria
    }),
    mediaImages: images,
    mediaNote: buildMediaNote(images, missingCopyrightCount)
  };
}
