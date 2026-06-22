export function normalizeCriterionStatus(status) {
  if (status === 'erfuellt' || status === 'erfüllt') return 'erfuellt';
  return status;
}

export function getCriterionDisplayStatus(status) {
  const normalizedStatus = normalizeCriterionStatus(status);
  return {
    erfuellt: 'Erfüllt',
    fehlt: 'Fehlt',
    'nicht bewertbar': 'Nicht bewertbar',
    'nicht relevant': 'Nicht relevant',
    vorbereitet: 'Vorbereitet',
    manuell: 'Manuell',
    source_guarded: 'Quellseitig abgefangen',
    not_applicable: 'Nicht erforderlich',
    excluded_by_category: 'Kategoriebedingt ausgenommen'
  }[normalizedStatus] || normalizedStatus;
}

export function criterionStatusClass(status) {
  const normalizedStatus = normalizeCriterionStatus(status);
  if (normalizedStatus === 'erfuellt') return 'erfuellt';
  if (normalizedStatus === 'vorbereitet' || normalizedStatus === 'manuell') return 'vorbereitet';
  if (normalizedStatus === 'source_guarded' || normalizedStatus === 'not_applicable' || normalizedStatus === 'excluded_by_category') {
    return 'nicht-bewertbar';
  }
  return {
    fehlt: 'fehlt',
    'nicht bewertbar': 'nicht-bewertbar',
    'nicht relevant': 'nicht-bewertbar'
  }[normalizedStatus] || 'nicht-bewertbar';
}

export function getDetailUsability(item, images, missingCopyright, qualityHelpers) {
  const raw = item.raw || item;
  const licenseOk = qualityHelpers.hasValidDatasetLicense(raw);
  const hasDescriptionValue = qualityHelpers.hasDetailsText(raw);
  const hasOpenings = qualityHelpers.hasOpeningHours(raw);
  const hasTransport = qualityHelpers.hasPublicTransportFeature(raw);
  const bookingRelevant = ['Hotel', 'Package'].includes(item.type);

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
      value: bookingRelevant
        ? (qualityHelpers.hasBookingLink(raw) ? 'vorhanden' : 'fehlt')
        : 'nicht relevant',
      ok: !bookingRelevant || qualityHelpers.hasBookingLink(raw),
      relevant: bookingRelevant
    },
    { label: 'Öffnungszeiten', value: hasOpenings ? 'vorhanden' : 'fehlt', ok: hasOpenings }
  ];
}

export function getDisplayDescription(raw, qualityHelpers) {
  return getTextByRel(raw, 'details', qualityHelpers) || '';
}

export function getTextByRel(raw, rel, qualityHelpers) {
  const values = qualityHelpers.getTextsByRel(raw, rel)
    .sort((a, b) => textTypeRank(a?.type) - textTypeRank(b?.type))
    .map((entry) => htmlToPlainText(textValue(entry.value || entry.text || entry.content || entry)))
    .filter(Boolean);
  return values[0] || '';
}

export function textTypeRank(type) {
  const normalized = String(type || '').toLowerCase();
  if (normalized === 'text/html') return 0;
  if (normalized === 'text/plain') return 1;
  return 2;
}

export function htmlToPlainText(value) {
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

export function getCheckableImages(item, qualityHelpers) {
  const raw = item.raw || item;
  return qualityHelpers.getMediaObjects(raw)
    .filter((media) => qualityHelpers.isCheckableMediaObject(media))
    .sort((a, b) => {
      const relRank = (rel) => (rel === 'default' ? 0 : 1);
      return relRank(a.rel) - relRank(b.rel) || Number(a.prio || 99) - Number(b.prio || 99);
    })
    .map((media) => ({
      ...media,
      url: textValue(media.url || media.contentUrl),
      alt: textValue(media.alt),
      value: textValue(media.value || media.title),
      description: textValue(media.description),
      copyrightText: textValue(media.copyrightText),
      copyrightEmail: textValue(media.copyrightEmail),
      copyrightWeb: textValue(media.copyrightWeb),
      license: textValue(media.license),
      width: textValue(media.width),
      height: textValue(media.height)
    }))
    .filter((media) => media.url);
}

export function formatImageSize(image) {
  return image.width && image.height ? `${image.width} x ${image.height}px` : 'nicht angegeben';
}

export function getOpeningHoursSummary(item, qualityHelpers) {
  const raw = item.raw || item;
  if (raw.alwaysOpen === true) return 'Immer geöffnet.';

  const openingText = getTextByRel(raw, 'openings', qualityHelpers);
  if (openingText) return openingText;

  const intervals = raw.timeIntervals || raw.raw?.timeIntervals || [];
  if (Array.isArray(intervals) && intervals.length) return formatTimeIntervals(intervals);

  return 'Keine Öffnungszeiten angegeben.';
}

export function formatTimeIntervals(intervals) {
  const rows = intervals
    .map((interval) => {
      const days = formatWeekdays(interval.weekdays);
      const start = formatIntervalTime(interval.start);
      const end = formatIntervalTime(interval.end);
      if (!days && !start && !end) return '';
      return `${days || 'Zeitraum'}: ${[start, end].filter(Boolean).join(' bis ') || 'Zeit vorhanden'}`;
    })
    .filter(Boolean)
    .slice(0, 7);

  return rows.length ? rows.join('\n') : 'Öffnungszeiten vorhanden.';
}

export function formatWeekdays(days) {
  const map = {
    Monday: 'Montag',
    Tuesday: 'Dienstag',
    Wednesday: 'Mittwoch',
    Thursday: 'Donnerstag',
    Friday: 'Freitag',
    Saturday: 'Samstag',
    Sunday: 'Sonntag'
  };
  return Array.isArray(days) ? days.map((day) => map[day] || day).join(', ') : '';
}

export function formatIntervalTime(value) {
  const match = String(value || '').match(/T(\d{2}):(\d{2})/);
  return match ? `${match[1]}:${match[2]}` : '';
}

export function textValue(value) {
  if (value == null) return '';
  if (Array.isArray(value)) return value.map(textValue).find(Boolean) || '';
  if (typeof value === 'object') {
    for (const key of ['title', 'name', 'label', 'value', 'text', 'id']) {
      const nested = textValue(value[key]);
      if (nested) return nested;
    }
    return '';
  }
  return String(value).replace(/\s+/g, ' ').trim();
}
