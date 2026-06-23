import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import { fetchJson } from '../../shared/api/http-client';
import { getRuntimeConfig } from '../../shared/api/runtime-config';
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
  buildVerifiedEt4Url,
  extractRecordId,
  getArrayFromPaths,
  getFirst,
  getPrimarySystem,
  getRecordArea,
  getRecordCategory,
  getRecordPhone,
  getTypeFromGlobalId
} from '../../shared/records/record-fields';

const RECORD_LIST_STATE_KEY = 'satourn.frontend.recordListState';

type ResolvedPayload = {
  items?: unknown[];
};

type RecordListEntry = {
  id: string;
  globalId: string;
  type: string;
  title: string;
  detailUrl: string;
};

type RecordListState = {
  backUrl: string;
  rows: RecordListEntry[];
};

type DetailImage = {
  url: string;
  title: string;
  alt: string;
  copyright: string;
  license: string;
};

type DetailUsability = {
  label: string;
  value: string;
  ok: boolean;
  relevant?: boolean;
};

type DetailCriterion = {
  id: string;
  label: string;
  recommendation?: string;
  status: string;
};

type DetailCriteriaSection = {
  title: string;
  note: string;
  criteria: DetailCriterion[];
};

type DetailItem = {
  id: string;
  globalId: string;
  type: string;
  title: string;
  city: string;
  region: string;
  category: string;
  updatedAt: string;
  qualityStatus: string;
  qualityScore: number | null;
  missingCriteria: string[];
  fulfilledCriteria: string[];
  manualCriteria: string[];
  description: string;
  teaser: string;
  openings: string;
  directions: string;
  price: string;
  priceReduced: string;
  et4Url: string;
  web: string;
  email: string;
  phone: string;
  street: string;
  zip: string;
  license: string;
  primarySystem: string;
  coordinates: string;
  usability: DetailUsability[];
  criteriaSections: DetailCriteriaSection[];
  mediaImages: DetailImage[];
  mediaNote: string;
};

function textValue(value: unknown): string {
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
      || textValue(candidate.content)
      || ''
    );
  }
  return String(value).replace(/\s+/g, ' ').trim();
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

function getCoordinates(raw: unknown) {
  const lat = getFirst(raw, ['geo.main.latitude', 'latitude']);
  const lon = getFirst(raw, ['geo.main.longitude', 'longitude']);
  return lat && lon ? `${lat}, ${lon}` : '';
}

function priorityRank(priority: string | undefined) {
  if (priority === 'hoch') return 3;
  if (priority === 'mittel') return 2;
  return 1;
}

function criterionStatusClass(status: string) {
  if (status === 'erfuellt' || status === 'erfüllt') return 'erfuellt';
  if (status === 'vorbereitet' || status === 'manuell') return 'vorbereitet';
  if (status === 'fehlt') return 'fehlt';
  return 'nicht-bewertbar';
}

function criterionDisplayStatus(status: string) {
  const normalized = status === 'erfuellt' ? 'erfüllt' : status;
  const labels: Record<string, string> = {
    erfüllt: 'Erfüllt',
    fehlt: 'Fehlt',
    'nicht bewertbar': 'Nicht bewertbar',
    'nicht relevant': 'Nicht relevant',
    vorbereitet: 'Vorbereitet',
    manuell: 'Manuell',
    source_guarded: 'Quellseitig abgefangen',
    not_applicable: 'Nicht erforderlich',
    excluded_by_category: 'Kategoriebedingt ausgenommen'
  };
  return labels[normalized] || normalized;
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
      value: bookingRelevant ? (hasBookingLink(raw) ? 'vorhanden' : 'fehlt') : 'nicht relevant',
      ok: !bookingRelevant || hasBookingLink(raw),
      relevant: bookingRelevant
    },
    { label: 'Öffnungszeiten', value: hasOpeningsValue ? 'vorhanden' : 'fehlt', ok: hasOpeningsValue }
  ];
}

function normalizeDetailItem(rawInput: unknown, fallbackType: string): DetailItem {
  const raw = rawInput && typeof rawInput === 'object' && 'raw' in rawInput
    ? (rawInput as { raw?: unknown }).raw ?? rawInput
    : rawInput;
  const resolvedType = getFirst(rawInput, ['_resolvedType', 'type']) || fallbackType || getTypeFromGlobalId(getFirst(raw, ['global_id', 'globalId']));
  const baseItem = {
    raw,
    id: extractRecordId(raw),
    globalId: getFirst(raw, ['global_id', 'globalId']),
    title: getFirst(raw, ['title', 'name', 'presentation.title']) || 'Ohne Titel',
    type: resolvedType,
    region: getRecordArea(raw),
    city: getFirst(raw, ['city', 'location.city', 'address.city']),
    category: getRecordCategory(raw),
    updatedAt: getFirst(raw, ['changed', 'updatedAt', 'lastModified', 'modified', 'changeDate'])
  };

  const evaluated = evaluateQualityForItem(baseItem) as Record<string, unknown>;
  const evaluatedType = String(evaluated.type || baseItem.type || '');
  const evaluatedGlobalId = String(evaluated.globalId || baseItem.globalId || '');
  const images = normalizeImages(raw);
  const missingCopyrightCount = findMissingCopyrightMedia(raw).length;
  const primarySystem = getPrimarySystem({ ...baseItem, raw });
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
    web: getFirst(raw, ['web', 'url', 'website', 'address.web', 'addresses.web']),
    email: getFirst(raw, ['email', 'emailRequest', 'address.email', 'addresses.email', 'addresses_mail.email']),
    phone: getRecordPhone(raw),
    street: getFirst(raw, ['street', 'address.street']),
    zip: getFirst(raw, ['zip', 'address.zip']),
    license: getAttributeValue(raw, 'license') || '',
    primarySystem: primarySystem.name,
    coordinates: getCoordinates(raw),
    usability: buildUsability(raw, evaluatedType, images),
    criteriaSections: buildCriteriaSections({
      type: evaluatedType,
      missingCriteria,
      fulfilledCriteria,
      manualCriteria
    }),
    mediaImages: images,
    mediaNote: `${images.length} Bilder vorhanden. ${missingCopyrightCount} ohne Urheberangabe. ${images.filter((image) => !image.alt).length} ohne Alt-Text.`
  };
}

function loadRecordListState(): RecordListState {
  if (typeof window === 'undefined') return { backUrl: '/records', rows: [] };

  try {
    const raw = window.sessionStorage.getItem(RECORD_LIST_STATE_KEY);
    if (!raw) return { backUrl: '/records', rows: [] };
    const parsed = JSON.parse(raw) as Partial<RecordListState>;
    return {
      backUrl: parsed.backUrl || '/records',
      rows: Array.isArray(parsed.rows) ? parsed.rows.filter((row) => row && (row.globalId || row.id)) : []
    };
  } catch {
    return { backUrl: '/records', rows: [] };
  }
}

export function RecordDetailPage() {
  const [searchParams] = useSearchParams();
  const [item, setItem] = useState<DetailItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copyMessage, setCopyMessage] = useState('');

  const type = searchParams.get('type') || '';
  const globalId = searchParams.get('global_id') || searchParams.get('globalId') || '';
  const id = searchParams.get('id') || '';
  const contextSource = searchParams.get('source') || '';
  const contextLabel = searchParams.get('criterion_label') || searchParams.get('criterionLabel') || '';
  const identifier = globalId || id;

  useEffect(() => {
    let active = true;

    async function loadDetail() {
      if (!identifier) {
        setError('Es wurde keine Datensatz-ID übergeben.');
        setItem(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError('');

      try {
        const runtime = getRuntimeConfig();
        const payload = await fetchJson<ResolvedPayload>(runtime.recordsByIdsApiBase, {
          method: 'POST',
          timeoutMs: 45_000,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ids: [identifier],
            type
          })
        });
        const rawItem = Array.isArray(payload.items) ? payload.items[0] : null;
        if (!rawItem) throw new Error('Für diese ID wurde kein Datensatz gefunden.');
        if (!active) return;
        setItem(normalizeDetailItem(rawItem, type));
      } catch (caughtError) {
        if (!active) return;
        setItem(null);
        setError(caughtError instanceof Error ? caughtError.message : 'Datensatz-Detail konnte nicht geladen werden.');
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadDetail();

    return () => {
      active = false;
    };
  }, [identifier, type]);

  const missingIssues = useMemo(() => {
    if (!item) return [];
    return item.missingCriteria
      .map((criterionId) => {
        const criterion = qualityCriteria.find((entry) => entry.id === criterionId);
        return {
          id: criterionId,
          label: criterion?.label || criterionId,
          recommendation: criterion?.recommendation || 'Bitte im Pflegesystem prüfen und ergänzen.',
          priority: criterion?.priority || ''
        };
      })
      .sort((left, right) => priorityRank(right.priority) - priorityRank(left.priority))
      .slice(0, 5);
  }, [item]);

  const listState = useMemo(() => loadRecordListState(), [identifier]);
  const listNavigation = useMemo(() => {
    if (!item) return { previous: null as RecordListEntry | null, next: null as RecordListEntry | null };
    const currentKey = item.globalId || item.id;
    const currentIndex = listState.rows.findIndex((row) => (
      (item.globalId && row.globalId === item.globalId) ||
      (item.id && row.id === item.id) ||
      (currentKey && (row.globalId || row.id) === currentKey)
    ));

    return {
      previous: currentIndex > 0 ? listState.rows[currentIndex - 1] : null,
      next: currentIndex >= 0 && currentIndex < listState.rows.length - 1 ? listState.rows[currentIndex + 1] : null
    };
  }, [item, listState]);

  async function copyText(value: string, label: string) {
    if (!value) return;

    try {
      await navigator.clipboard.writeText(value);
      setCopyMessage(`${label} kopiert.`);
      window.setTimeout(() => setCopyMessage(''), 2200);
    } catch {
      setCopyMessage(`${label} konnte nicht kopiert werden.`);
      window.setTimeout(() => setCopyMessage(''), 2200);
    }
  }

  return (
    <>
      <nav className="detail-breadcrumb" aria-label="Breadcrumb">
        {contextSource === 'task' && contextLabel ? (
          <>
            <Link to="/tasks">Pflegeaufgaben</Link>
            <span className="material-icons" aria-hidden="true">chevron_right</span>
            <Link to="/records">{contextLabel}</Link>
            <span className="material-icons" aria-hidden="true">chevron_right</span>
          </>
        ) : (
          <>
            <Link to="/records">Datensätze</Link>
            <span className="material-icons" aria-hidden="true">chevron_right</span>
          </>
        )}
        <span>Datensatz-Detail</span>
      </nav>

      {contextSource === 'task' && contextLabel ? (
        <div className="detail-context-note">Aus Pflegeaufgabe: {contextLabel}</div>
      ) : null}

      {loading ? (
        <section className="panel-card detail-loading-card">
          <span className="loading-line">Datensatz wird geladen ...</span>
        </section>
      ) : null}

      {!loading && error ? (
        <section className="panel-card detail-loading-card">
          <p className="table-empty">{error}</p>
          <Link className="table-link-button" to="/records">Zurück zur Liste</Link>
        </section>
      ) : null}

      {!loading && item ? (
        <>
          <section className="detail-action-bar">
            <Link className="context-edit icon-text-button" to={listState.backUrl || '/records'}>
              <span className="material-icons" aria-hidden="true">arrow_back</span>
              Zurück zur Liste
            </Link>
            <div className="detail-action-links">
              {listNavigation.previous ? (
                <Link className="context-edit icon-text-button" to={listNavigation.previous.detailUrl}>
                  <span className="material-icons" aria-hidden="true">arrow_back</span>
                  Vorheriger
                </Link>
              ) : (
                <button className="context-edit icon-text-button" type="button" disabled>
                  <span className="material-icons" aria-hidden="true">arrow_back</span>
                  Vorheriger
                </button>
              )}
              {listNavigation.next ? (
                <Link className="context-edit icon-text-button" to={listNavigation.next.detailUrl}>
                  Nächster
                  <span className="material-icons" aria-hidden="true">arrow_forward</span>
                </Link>
              ) : (
                <button className="context-edit icon-text-button" type="button" disabled>
                  Nächster
                  <span className="material-icons" aria-hidden="true">arrow_forward</span>
                </button>
              )}
              {item.et4Url ? (
                <a className="context-edit" href={item.et4Url} target="_blank" rel="noopener noreferrer">
                  Öffnen auf et4 pages
                </a>
              ) : null}
              <details className="detail-actions-menu">
                <summary className="context-edit icon-text-button">
                  Aktionen
                  <span className="material-icons" aria-hidden="true">expand_more</span>
                </summary>
                <div>
                  <button type="button" onClick={() => void copyText(item.id, 'ID')}>ID kopieren</button>
                  <button type="button" onClick={() => void copyText(item.globalId, 'global_id')}>global_id kopieren</button>
                  <button type="button" onClick={() => void copyText(window.location.href, 'Link')}>Link kopieren</button>
                </div>
              </details>
            </div>
          </section>

          {copyMessage ? <div className="overview-message">{copyMessage}</div> : null}

          <section className="panel-card detail-head-card">
            <div className="detail-head-left">
              <h1 id="record-detail-title">
                {item.title}
                <span className={`type-chip ${item.type.toLowerCase()}`}>{item.type || '-'}</span>
              </h1>
              <p>{[item.city, item.region, item.category].filter(Boolean).join(' - ') || 'Ort und Kategorie nicht angegeben'}</p>
            </div>
          </section>

          <section className="detail-grid">
            <div className="detail-left-column">
              <article className="panel-card">
                <header className="panel-head"><h2>Wichtigste Baustellen</h2></header>
                {!missingIssues.length ? (
                  <p className="empty-note">Keine priorisierten Baustellen gefunden.</p>
                ) : (
                  <div className="detail-issues-list">
                    {missingIssues.map((issue) => (
                      <div className="detail-issue-row" key={issue.id}>
                        <span className={`impact-dot ${issue.priority === 'hoch' ? 'critical' : 'review'}`} />
                        <span>
                          <strong>{issue.label}</strong>
                          <small>{issue.recommendation}</small>
                        </span>
                        <span className={`status-badge ${issue.priority === 'hoch' ? 'critical' : 'medium'}`}>
                          {issue.priority === 'hoch' ? 'hoch' : 'mittel'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </article>

              <article className="panel-card">
                <header className="panel-head"><h2>Nutzbarkeit</h2></header>
                <div className="usability-grid">
                  {item.usability.map((entry) => (
                    <div key={entry.label}>
                      <span>{entry.label}</span>
                      <strong className={entry.ok ? 'ok' : entry.relevant === false ? 'muted' : 'bad'}>{entry.value}</strong>
                    </div>
                  ))}
                </div>
              </article>

              <article className="panel-card">
                <header className="panel-head"><h2>Kategorien &amp; Gebiet</h2></header>
                <dl className="detail-kv-list">
                  <dt>Kategorie</dt>
                  <dd>{item.category || 'Nicht angegeben'}</dd>
                  <dt>Gebiet</dt>
                  <dd>{item.region || 'Nicht angegeben'}</dd>
                  <dt>Ort</dt>
                  <dd>{item.city || 'Nicht angegeben'}</dd>
                </dl>
              </article>
            </div>

            <div className="detail-center-column">
              <article className="panel-card">
                <header className="panel-head"><h2>Beschreibung</h2></header>
                <div className="detail-text">
                  <p>{item.description || 'Keine Beschreibung vorhanden.'}</p>
                  {item.teaser ? <p className="data-note">{item.teaser}</p> : null}
                </div>
              </article>

              <article className="panel-card">
                <header className="panel-head"><h2>Medien</h2></header>
                {!item.mediaImages.length ? (
                  <p className="empty-note">Keine prüfbaren Bilder vorhanden.</p>
                ) : (
                  <div className="detail-media-grid">
                    {item.mediaImages.map((image) => (
                      <figure className="detail-media-item" key={image.url}>
                        <img src={image.url} alt={image.alt || image.title} loading="lazy" />
                        <figcaption>
                          <strong>{image.title}</strong>
                          <span>{image.copyright || 'Urheber fehlt'}</span>
                          <small>Lizenz: {image.license || 'nicht angegeben'}</small>
                        </figcaption>
                      </figure>
                    ))}
                  </div>
                )}
                {item.mediaImages.length ? <p className="data-note">{item.mediaNote}</p> : null}
              </article>

              <article className="panel-card">
                <header className="panel-head"><h2>Öffnungszeiten</h2></header>
                <div className="detail-text"><p>{item.openings}</p></div>
              </article>

              <article className="panel-card">
                <header className="panel-head"><h2>ÖPNV-Anreise</h2></header>
                <div className="detail-text"><p>{item.directions}</p></div>
              </article>

              {(item.price || item.priceReduced) ? (
                <article className="panel-card">
                  <header className="panel-head"><h2>Preisinfo</h2></header>
                  <div className="detail-text">
                    {item.price ? <p>{item.price}</p> : null}
                    {item.priceReduced ? <p>{item.priceReduced}</p> : null}
                  </div>
                </article>
              ) : null}
            </div>

            <aside className="detail-right-column">
              <article className="panel-card">
                <header className="panel-head"><h2>Detail-Informationen</h2></header>
                <dl className="detail-kv-list">
                  <dt>ID</dt>
                  <dd>{item.id || '-'}</dd>
                  <dt>global_id</dt>
                  <dd>{item.globalId || '-'}</dd>
                  <dt>Pflegesystem</dt>
                  <dd>{item.primarySystem}</dd>
                  <dt>ET4 pages</dt>
                  <dd>{item.et4Url ? <a href={item.et4Url} target="_blank" rel="noopener noreferrer">Öffnen auf et4 pages</a> : 'Nicht verfügbar'}</dd>
                  <dt>Web</dt>
                  <dd>{item.web ? <a href={item.web} target="_blank" rel="noopener noreferrer">Datensatz öffnen</a> : 'Nicht angegeben'}</dd>
                  <dt>E-Mail</dt>
                  <dd>{item.email || 'Nicht angegeben'}</dd>
                  <dt>Telefon</dt>
                  <dd>{item.phone || 'Nicht angegeben'}</dd>
                  <dt>Adresse</dt>
                  <dd>{[item.street, item.zip, item.city].filter(Boolean).join(', ') || 'Nicht angegeben'}</dd>
                  <dt>Lizenz</dt>
                  <dd>{item.license || 'Lizenz fehlt'}</dd>
                  <dt>Koordinaten</dt>
                  <dd>{item.coordinates || 'Nicht angegeben'}</dd>
                  <dt>Letzte Aktualisierung</dt>
                  <dd>{item.updatedAt || '-'}</dd>
                </dl>
              </article>

            </aside>
          </section>

          <section className="panel-card detail-criteria-card">
            <header className="panel-head"><h2>Gesamte Qualitätsbewertung</h2></header>
            <div className="detail-criteria-list">
              {item.criteriaSections.map((section) => (
                <section className="detail-criteria-section" key={section.title}>
                  <header className="detail-criteria-head">
                    <h3>{section.title}</h3>
                    <p>{section.note}</p>
                  </header>
                  <div className="detail-criteria-group">
                    {section.criteria.map((criterion) => (
                      <span className={`criteria-chip ${criterionStatusClass(criterion.status)}`} key={`${section.title}-${criterion.id}`}>
                        <strong>{criterion.label}</strong>
                        <small>{criterionDisplayStatus(criterion.status)}</small>
                      </span>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </section>
        </>
      ) : null}
    </>
  );
}
