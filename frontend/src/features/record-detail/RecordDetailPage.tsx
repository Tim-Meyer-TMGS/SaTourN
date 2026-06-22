import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import { fetchJson } from '../../shared/api/http-client';
import { getRuntimeConfig } from '../../shared/api/runtime-config';
import { evaluateQualityForItem, qualityCriteria } from '../../shared/legacy/quality';
import {
  arrayOfStrings,
  buildRecordDetailUrl,
  extractRecordId,
  getArrayFromPaths,
  getFirst,
  getRecordArea,
  getRecordCategory,
  getTypeFromGlobalId
} from '../../shared/records/record-fields';

const RECORD_LIST_STATE_KEY = 'satourn.frontend.recordListState';

type ResolvedPayload = {
  items?: unknown[];
  missingIds?: string[];
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
  recommendations: string[];
  description: string;
  teaser: string;
  openings: string;
  directions: string;
  price: string;
  priceReduced: string;
  et4Url: string;
  web: string;
  mediaImages: DetailImage[];
  raw: unknown;
};

type DetailImage = {
  url: string;
  title: string;
  alt: string;
  copyright: string;
  license: string;
};

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

  return {
    id: String(evaluated.id || baseItem.id || ''),
    globalId: String(evaluated.globalId || baseItem.globalId || ''),
    type: String(evaluated.type || baseItem.type || ''),
    title: String(evaluated.title || baseItem.title || 'Ohne Titel'),
    city: String(evaluated.city || baseItem.city || ''),
    region: String(evaluated.region || baseItem.region || ''),
    category: String(evaluated.category || baseItem.category || ''),
    updatedAt: String(evaluated.updatedAt || baseItem.updatedAt || ''),
    qualityStatus: String(evaluated.qualityStatus || 'nicht berechenbar'),
    qualityScore: Number.isFinite(Number(evaluated.qualityScore)) ? Number(evaluated.qualityScore) : null,
    missingCriteria: arrayOfStrings(evaluated.missingCriteria),
    fulfilledCriteria: arrayOfStrings(evaluated.fulfilledCriteria),
    manualCriteria: arrayOfStrings(evaluated.manualCriteria),
    recommendations: arrayOfStrings(evaluated.recommendations),
    description: getFirst(raw, ['description', 'details', 'longDescription', 'texts.description', 'presentation.description']),
    teaser: getFirst(raw, ['teaser', 'shortDescription', 'texts.teaser', 'presentation.teaser']),
    openings: getFirst(raw, ['openings', 'openingHours', 'opening_hours', 'hours', 'texts.openings']),
    directions: getFirst(raw, ['directions', 'arrival', 'publicTransport', 'oePNV', 'texts.directions']),
    price: getFirst(raw, ['price', 'prices', 'priceInfo', 'texts.price']),
    priceReduced: getFirst(raw, ['priceReduced', 'reducedPrice', 'texts.priceReduced']),
    et4Url: getFirst(raw, ['et4Url', 'urls.et4', 'links.et4', 'link']),
    web: getFirst(raw, ['web', 'url', 'website', 'address.web', 'addresses.web']),
    mediaImages: normalizeImages(raw),
    raw
  };
}

function getCriterionLabel(criterionId: string) {
  return qualityCriteria.find((entry) => entry.id === criterionId)?.label || criterionId;
}

function getCriterionRecommendation(criterionId: string) {
  return qualityCriteria.find((entry) => entry.id === criterionId)?.recommendation || '';
}

function getStatusClass(status: string) {
  if (status === 'gut') return 'good';
  if (status === 'kritisch') return 'critical';
  if (status === 'pruefen' || status === 'prüfen') return 'review';
  return 'muted';
}

function getContactRows(item: DetailItem) {
  return [
    ['Web', getFirst(item.raw, ['web', 'url', 'website', 'address.web', 'addresses.web'])],
    ['E-Mail', getFirst(item.raw, ['email', 'emailRequest', 'address.email', 'addresses.email', 'addresses_mail.email'])],
    ['Telefon', getFirst(item.raw, ['phone', 'telephone', 'address.phone', 'addresses.phone'])],
    ['Straße', getFirst(item.raw, ['street', 'address.street'])],
    ['PLZ', getFirst(item.raw, ['zip', 'address.zip'])],
    ['Lizenz', getFirst(item.raw, ['license', 'attributes.license'])]
  ].filter(([, value]) => value);
}

function getRawPreview(raw: unknown) {
  try {
    return JSON.stringify(raw, null, 2).slice(0, 2800);
  } catch {
    return 'Rohdaten konnten nicht dargestellt werden.';
  }
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

function getImageUrl(image: unknown) {
  if (typeof image === 'string') return image;
  return getFirst(image, ['url', 'uri', 'src', 'imageUrl', 'value.url', 'value.uri']);
}

function normalizeImages(raw: unknown): DetailImage[] {
  const images = getArrayFromPaths(raw, [
    'images',
    'media.images',
    'media',
    'picture',
    'pictures'
  ]);

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

export function RecordDetailPage() {
  const [searchParams] = useSearchParams();
  const [item, setItem] = useState<DetailItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copyMessage, setCopyMessage] = useState('');

  const type = searchParams.get('type') || '';
  const globalId = searchParams.get('global_id') || searchParams.get('globalId') || '';
  const id = searchParams.get('id') || '';
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
    return item.missingCriteria.map((criterionId) => ({
      id: criterionId,
      label: getCriterionLabel(criterionId),
      recommendation: getCriterionRecommendation(criterionId)
    }));
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
      <section className="overview-hero">
        <p className="detail-breadcrumb">
          <Link to="/records">Datensätze</Link>
          <span className="material-icons" aria-hidden="true">chevron_right</span>
          <span>Datensatz-Detail</span>
        </p>
        <h1>Datensatz-Detail</h1>
        <p>Qualitätsstatus, Pflegepunkte und Kerndaten des ausgewählten Datensatzes.</p>
      </section>

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
              <Link
                className={`context-edit icon-text-button${listNavigation.previous ? '' : ' disabled'}`}
                aria-disabled={!listNavigation.previous}
                to={listNavigation.previous?.detailUrl || buildRecordDetailUrl(listNavigation.previous || {})}
              >
                <span className="material-icons" aria-hidden="true">arrow_back</span>
                Vorheriger
              </Link>
              <Link
                className={`context-edit icon-text-button${listNavigation.next ? '' : ' disabled'}`}
                aria-disabled={!listNavigation.next}
                to={listNavigation.next?.detailUrl || buildRecordDetailUrl(listNavigation.next || {})}
              >
                Nächster
                <span className="material-icons" aria-hidden="true">arrow_forward</span>
              </Link>
              {item.et4Url ? (
                <a className="context-edit" href={item.et4Url} target="_blank" rel="noopener noreferrer">
                  Öffnen auf et4 pages
                </a>
              ) : null}
              {item.web ? (
                <a className="context-edit" href={item.web} target="_blank" rel="noopener noreferrer">
                  Website öffnen
                </a>
              ) : null}
              <button className="context-edit" type="button" onClick={() => void copyText(item.id, 'ID')}>
                ID kopieren
              </button>
              <button className="context-edit" type="button" onClick={() => void copyText(item.globalId, 'global_id')}>
                global_id kopieren
              </button>
              <button className="context-edit" type="button" onClick={() => void copyText(window.location.href, 'Link')}>
                Link kopieren
              </button>
            </div>
          </section>

          {copyMessage ? <div className="overview-message">{copyMessage}</div> : null}

          <section className="panel-card detail-head-card">
            <div>
              <h2>{item.title}</h2>
              <p>{[item.city, item.region, item.category].filter(Boolean).join(' - ') || 'Ort und Kategorie nicht angegeben'}</p>
              <div className="detail-chip-row">
                <span className="type-chip">{item.type || '-'}</span>
                <span className={`status-badge ${getStatusClass(item.qualityStatus)}`}>{item.qualityStatus}</span>
              </div>
            </div>
            <div className="detail-score-box">
              <span>Qualitäts-Score</span>
              <strong>{item.qualityScore ?? '-'}</strong>
              <small>{item.qualityScore == null ? 'nicht berechenbar' : 'von 100 Punkten'}</small>
            </div>
          </section>

          <section className="detail-grid">
            <article className="panel-card detail-card">
              <h2>Wichtigste Pflegepunkte</h2>
              {!missingIssues.length ? (
                <p className="empty-note">Keine automatisch erkannten Pflegepunkte.</p>
              ) : (
                <div className="detail-issue-list">
                  {missingIssues.slice(0, 8).map((issue) => (
                    <div className="detail-issue-row" key={issue.id}>
                      <span className="impact-dot critical" />
                      <span>
                        <strong>{issue.label}</strong>
                        <small>{issue.recommendation || 'Bitte im Pflegesystem prüfen und ergänzen.'}</small>
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </article>

            <article className="panel-card detail-card">
              <h2>Identität</h2>
              <dl className="detail-kv-list">
                <dt>ID</dt>
                <dd>{item.id || '-'}</dd>
                <dt>global_id</dt>
                <dd>{item.globalId || '-'}</dd>
                <dt>Typ</dt>
                <dd>{item.type || '-'}</dd>
                <dt>Aktualisiert</dt>
                <dd>{item.updatedAt || '-'}</dd>
              </dl>
            </article>

            <article className="panel-card detail-card">
              <h2>Kontakt und Pflege</h2>
              <dl className="detail-kv-list">
                {getContactRows(item).length ? getContactRows(item).map(([label, value]) => (
                  <div key={label}>
                    <dt>{label}</dt>
                    <dd>{value}</dd>
                  </div>
                )) : (
                  <div>
                    <dt>Kontakt</dt>
                    <dd>Nicht angegeben</dd>
                  </div>
                )}
              </dl>
            </article>

            <article className="panel-card detail-card">
              <h2>Kriterienstatus</h2>
              <div className="detail-criteria-group">
                {item.missingCriteria.map((criterionId) => (
                  <span className="criteria-chip fehlt" key={criterionId}>
                    <strong>{getCriterionLabel(criterionId)}</strong>
                    <small>fehlt</small>
                  </span>
                ))}
                {item.fulfilledCriteria.slice(0, 12).map((criterionId) => (
                  <span className="criteria-chip erfuellt" key={criterionId}>
                    <strong>{getCriterionLabel(criterionId)}</strong>
                    <small>erfüllt</small>
                  </span>
                ))}
              </div>
            </article>

            <article className="panel-card detail-card detail-wide-card">
              <h2>Beschreibung</h2>
              <div className="detail-text">
                <p>{item.description || 'Keine Beschreibung vorhanden.'}</p>
                {item.teaser ? <p className="data-note">{item.teaser}</p> : null}
              </div>
            </article>

            <article className="panel-card detail-card detail-wide-card">
              <h2>Medien</h2>
              {!item.mediaImages.length ? (
                <p className="empty-note">Keine prüfbaren Bilder vorhanden.</p>
              ) : (
                <>
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
                  <p className="data-note">{item.mediaImages.length} Bilder in der Vorschau.</p>
                </>
              )}
            </article>

            <article className="panel-card detail-card">
              <h2>Öffnungszeiten</h2>
              <div className="detail-text">
                <p>{item.openings || 'Keine Öffnungszeiten hinterlegt.'}</p>
              </div>
            </article>

            <article className="panel-card detail-card">
              <h2>ÖPNV-Anreise</h2>
              <div className="detail-text">
                <p>{item.directions || 'Keine ÖPNV- oder Anreiseinformation vorhanden.'}</p>
              </div>
            </article>

            {(item.price || item.priceReduced) ? (
              <article className="panel-card detail-card">
                <h2>Preisinfo</h2>
                <div className="detail-text">
                  {item.price ? <p>{item.price}</p> : null}
                  {item.priceReduced ? <p>{item.priceReduced}</p> : null}
                </div>
              </article>
            ) : null}
          </section>

          <section className="panel-card detail-card raw-card">
            <h2>Rohdaten-Auszug</h2>
            <pre>{getRawPreview(item.raw)}</pre>
          </section>
        </>
      ) : null}
    </>
  );
}
