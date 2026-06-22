function addressRelLabel(rel) {
  return {
    author: 'Autor',
    organisation: 'Organisation',
    copyright: 'Copyright',
    contact_person: 'Kontaktperson'
  }[rel] || rel;
}

export async function fetchRecordDetailItem(
  { type, id, globalId },
  {
    types,
    cleanQueryValue,
    getIdFromGlobalId,
    uniqueValues,
    buildUrl,
    fetchJsonCached,
    extractItems,
    extractId,
    getFirst
  }
) {
  const targetTypes = type ? [type] : types;
  const identifier = cleanQueryValue(globalId || id);
  const derivedId = getIdFromGlobalId(globalId);
  const variants = globalId
    ? uniqueValues([
      `global_id:"${identifier}"`,
      identifier,
      derivedId ? `id:"${derivedId}"` : '',
      derivedId
    ])
    : [`id:"${identifier}"`, identifier];

  for (const targetType of targetTypes) {
    for (const variant of variants) {
      const payload = await fetchJsonCached(buildUrl(targetType, variant, { limit: 5 }));
      const items = extractItems(payload);
      const item = items.find((entry) => {
        const entryId = String(extractId(entry) || '');
        const entryGlobalId = String(getFirst(entry, ['global_id', 'globalId']) || '');
        return (
          (id && entryId === String(id)) ||
          (globalId && entryGlobalId === String(globalId)) ||
          entryId === identifier ||
          entryGlobalId === identifier
        );
      }) || items[0];
      if (item) return item;
    }
  }

  return null;
}

export function getRecordDetailContext(storageKey, qualityCriteria, storageObject = sessionStorage) {
  let recordView = {};
  try {
    recordView = JSON.parse(storageObject.getItem(storageKey) || '{}');
  } catch {
    recordView = {};
  }

  const criterion = qualityCriteria.find((entry) => entry.id === recordView.criterionId);
  return {
    source: recordView.criterionId ? 'task' : 'records',
    label: recordView.label || criterion?.label || '',
    criterionId: recordView.criterionId || '',
    type: recordView.type || ''
  };
}

export function getExternalSystemIds(raw, { qualityHelpers, getFirst, textValue }) {
  return [
    ['Outdooractive-ID', qualityHelpers.getAttributeValue(raw, 'SYSTEMID_outdooractive')],
    ['Google-Places-ID', qualityHelpers.getAttributeValue(raw, 'SYSTEMID_GOOGLEPLACES')],
    ['source_id', getFirst(raw, ['source_id', 'sourceId'])]
  ].filter(([, value]) => textValue(value));
}

export function getAddressSummary(raw, textValue) {
  const addresses = Array.isArray(raw.addresses) ? raw.addresses : [];
  return ['author', 'organisation', 'copyright', 'contact_person']
    .map((rel) => {
      const entry = addresses.find((address) => address?.rel === rel);
      if (!entry) return null;
      const contact = [
        textValue(entry.name),
        textValue(entry.street),
        [textValue(entry.zip), textValue(entry.city)].filter(Boolean).join(' '),
        textValue(entry.web),
        textValue(entry.email),
        textValue(entry.phone)
      ].filter(Boolean).join(' | ');
      return contact ? [addressRelLabel(rel), contact] : null;
    })
    .filter(Boolean);
}

export function getCoordinates(raw, getFirst) {
  const lat = getFirst(raw, ['geo.main.latitude', 'latitude']);
  const lon = getFirst(raw, ['geo.main.longitude', 'longitude']);
  return lat && lon ? `${lat}, ${lon}` : '';
}

export function getRawExcerpt(raw, { getFirst, getTextByRel, qualityHelpers, textValue }) {
  return [
    ['created', getFirst(raw, ['created'])],
    ['changed', getFirst(raw, ['changed'])],
    ['channel', getFirst(raw, ['channel'])],
    ['rating eT4', getFirst(raw, ['ratings.0.value'])],
    ['SEO-Titel', getTextByRel(raw, 'WEB_SEO_TITEL', qualityHelpers)],
    ['SEO-Beschreibung', getTextByRel(raw, 'WEB_SEO_BESCHREIBUNG', qualityHelpers)]
  ].filter(([, value]) => textValue(value));
}

export function getRecordDetailViewModel(item, {
  qualityCriteria,
  qualityHelpers,
  priorityRank,
  getCheckableImages,
  getDetailUsability,
  getDisplayDescription,
  getOpeningHoursSummary,
  getTextByRel,
  textValue,
  buildVerifiedEt4Url,
  getFirst,
  getRecordWeb,
  getRecordEmail,
  getRecordPhone,
  getExternalSystemIds,
  getAddressSummary,
  getCoordinates,
  getRawExcerpt,
  getPrimarySystem,
  getRecordDetailContext
}) {
  const raw = item.raw || item;
  const criteria = qualityCriteria.filter((criterion) => !criterion.types?.length || criterion.types.includes(item.type));
  const domainCriteria = qualityHelpers.getDomainCriteriaForType(item.type);
  const missing = new Set(item.missingCriteria || []);
  const fulfilled = new Set(item.fulfilledCriteria || []);
  const manual = new Set(item.manualCriteria || []);
  const images = getCheckableImages(item, qualityHelpers);
  const missingCopyright = qualityHelpers.findMissingCopyrightMedia(raw);
  const et4Url = buildVerifiedEt4Url(item);
  const addresses = getAddressSummary(raw);
  const externalIds = getExternalSystemIds(raw);
  const primarySystem = getPrimarySystem(item);
  const context = getRecordDetailContext();

  return {
    context,
    identity: {
      title: item.title || 'Ohne Titel',
      type: item.type || '',
      id: item.id || '',
      globalId: item.globalId || '',
      category: item.category || '',
      city: item.city || '',
      region: item.region || '',
      updatedAt: item.updatedAt || getFirst(raw, ['changed', 'updatedAt', 'lastModified'])
    },
    quality: {
      status: item.qualityStatus || 'nicht berechenbar',
      score: Number.isFinite(item.qualityScore) ? item.qualityScore : null,
      fulfilledCount: criteria.filter((criterion) => fulfilled.has(criterion.id)).length,
      missingCount: criteria.filter((criterion) => missing.has(criterion.id)).length,
      manualCount: criteria.filter((criterion) => manual.has(criterion.id)).length,
      preparedCount: domainCriteria.filter((criterion) => criterion.status === 'needs_verification').length,
      criteria: criteria.map((criterion) => ({
        id: criterion.id,
        label: criterion.label,
        recommendation: criterion.recommendation,
        status: missing.has(criterion.id)
          ? 'fehlt'
          : fulfilled.has(criterion.id)
            ? 'erfüllt'
            : manual.has(criterion.id)
              ? 'nicht bewertbar'
              : 'nicht relevant'
      })),
      preparedCriteria: domainCriteria
        .filter((criterion) => criterion.status === 'needs_verification')
        .map((criterion) => ({
          id: criterion.id,
          label: criterion.label,
          recommendation: criterion.recommendation,
          status: 'vorbereitet'
        })),
      manualDomainCriteria: domainCriteria
        .filter((criterion) => criterion.status === 'manual_review')
        .map((criterion) => ({
          id: criterion.id,
          label: criterion.label,
          recommendation: criterion.recommendation,
          status: 'manuell'
        })),
      sourceGuardedCriteria: domainCriteria
        .filter((criterion) => (
          criterion.status === 'source_guarded' ||
          criterion.status === 'not_applicable' ||
          criterion.status === 'excluded_by_category'
        ))
        .map((criterion) => ({
          id: criterion.id,
          label: criterion.label,
          recommendation: criterion.recommendation,
          status: criterion.status
        }))
    },
    issues: criteria
      .filter((criterion) => missing.has(criterion.id))
      .sort((a, b) => priorityRank(b.priority) - priorityRank(a.priority))
      .slice(0, 5),
    usability: getDetailUsability(item, images, missingCopyright, qualityHelpers),
    texts: {
      description: getDisplayDescription(raw, qualityHelpers),
      teaser: getTextByRel(raw, 'teaser', qualityHelpers),
      openings: getOpeningHoursSummary(item, qualityHelpers),
      directions: getTextByRel(raw, 'directions', qualityHelpers) ||
        (qualityHelpers.hasPublicTransportFeature(raw)
          ? 'ÖPNV-Information vorhanden.'
          : 'Keine ÖPNV-Information vorhanden.'),
      price: getTextByRel(raw, 'PRICE_INFO', qualityHelpers),
      priceReduced: getTextByRel(raw, 'PRICE_REDUCEDINFO', qualityHelpers),
      seoTitle: getTextByRel(raw, 'WEB_SEO_TITEL', qualityHelpers),
      seoDescription: getTextByRel(raw, 'WEB_SEO_BESCHREIBUNG', qualityHelpers)
    },
    media: {
      images,
      missingCopyrightCount: missingCopyright.length,
      missingAltCount: images.filter((image) => !textValue(image.alt)).length
    },
    details: {
      license: qualityHelpers.getAttributeValue(raw, 'license') || '',
      licenseUrl: qualityHelpers.getAttributeValue(raw, 'licenseurl') || '',
      source: getFirst(raw, ['source', 'provider', 'channel']) || 'Destination.One',
      sourceUrl: getFirst(raw, ['source.url', 'raw.source.url']) || '',
      web: getRecordWeb(raw),
      email: getRecordEmail(raw),
      phone: getRecordPhone(raw),
      street: getFirst(raw, ['street', 'address.street']) || '',
      zip: getFirst(raw, ['zip', 'address.zip']) || '',
      coordinates: getCoordinates(raw),
      addresses,
      externalIds,
      primarySystem,
      et4Url
    },
    rawExcerpt: getRawExcerpt(raw)
  };
}
