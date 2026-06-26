import { Link } from 'react-router-dom';

import { formatRecordDate } from '../../shared/format/formatters';
import type { DetailInfoEntry, DetailItem, MissingIssue, RecordListEntry } from './record-detail-types';

export function criterionStatusClass(status: string) {
  if (status === 'erfuellt' || status === 'erfüllt') return 'erfuellt';
  if (status === 'vorbereitet' || status === 'manuell') return 'vorbereitet';
  if (status === 'fehlt') return 'fehlt';
  return 'nicht-bewertbar';
}

export function criterionDisplayStatus(status: string) {
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

function DetailInfoList({ entries, wide = false }: { entries: DetailInfoEntry[]; wide?: boolean }) {
  return (
    <dl className={`detail-kv-list${wide ? ' detail-kv-list-wide' : ''}`}>
      {entries.map((entry) => (
        <div key={entry.label}>
          <dt>{entry.label}</dt>
          <dd>{entry.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function DetailBreadcrumb({
  contextSource,
  contextLabel
}: {
  contextSource: string;
  contextLabel: string;
}) {
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
    </>
  );
}

export function DetailActionBar({
  item,
  backUrl,
  previous,
  next,
  onCopy
}: {
  item: DetailItem;
  backUrl: string;
  previous: RecordListEntry | null;
  next: RecordListEntry | null;
  onCopy: (value: string, label: string) => void;
}) {
  return (
    <section className="detail-action-bar">
      <Link className="context-edit icon-text-button" to={backUrl || '/records'}>
        <span className="material-icons" aria-hidden="true">arrow_back</span>
        Zurück zur Liste
      </Link>
      <div className="detail-action-links">
        {previous ? (
          <Link className="context-edit icon-text-button" to={previous.detailUrl}>
            <span className="material-icons" aria-hidden="true">arrow_back</span>
            Vorheriger
          </Link>
        ) : (
          <button className="context-edit icon-text-button" type="button" disabled>
            <span className="material-icons" aria-hidden="true">arrow_back</span>
            Vorheriger
          </button>
        )}
        {next ? (
          <Link className="context-edit icon-text-button" to={next.detailUrl}>
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
            <button type="button" onClick={() => onCopy(item.id, 'ID')}>ID kopieren</button>
            <button type="button" onClick={() => onCopy(item.globalId, 'global_id')}>global_id kopieren</button>
            <button type="button" onClick={() => onCopy(window.location.href, 'Link')}>Link kopieren</button>
          </div>
        </details>
      </div>
    </section>
  );
}

export function DetailHeadCard({ item }: { item: DetailItem }) {
  return (
    <section className="panel-card detail-head-card">
      <div className="detail-head-left">
        <h1 id="record-detail-title">
          {item.title}
          <span className={`type-chip ${item.type.toLowerCase()}`}>{item.type || '-'}</span>
        </h1>
        <p>{[item.city, item.region, item.category].filter(Boolean).join(' - ') || 'Ort und Kategorie nicht angegeben'}</p>
      </div>
    </section>
  );
}

export function DetailLeftColumn({ item, missingIssues }: { item: DetailItem; missingIssues: MissingIssue[] }) {
  return (
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
  );
}

export function DetailCenterColumn({ item }: { item: DetailItem }) {
  return (
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
  );
}

export function DetailRightColumn({ item }: { item: DetailItem }) {
  return (
    <aside className="detail-right-column">
      <article className="panel-card">
        <header className="panel-head"><h2>Detail-Informationen</h2></header>
        <dl className="detail-kv-list">
          <dt>ID</dt>
          <dd>{item.id || '-'}</dd>
          <dt>global_id</dt>
          <dd>{item.globalId || '-'}</dd>
          <dt>Pflegesystem</dt>
          <dd>
            <span className={`detail-primary-system detail-primary-system-${item.primarySystem.id}`}>
              {item.primarySystem.logoUrl ? (
                <img src={item.primarySystem.logoUrl} alt={item.primarySystem.name} />
              ) : (
                <span>{item.primarySystem.short}</span>
              )}
            </span>
          </dd>
          <dt>Quelle</dt>
          <dd>{item.sourceUrl ? <a href={item.sourceUrl} target="_blank" rel="noopener noreferrer">{item.source}</a> : item.source}</dd>
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
          <dt>Koordinaten</dt>
          <dd>{item.coordinates || 'Nicht angegeben'}</dd>
          <dt>Lizenz</dt>
          <dd>{item.license || 'Lizenz fehlt'}</dd>
          <dt>Lizenz-URL</dt>
          <dd>{item.licenseUrl ? <a href={item.licenseUrl} target="_blank" rel="noopener noreferrer">Lizenz öffnen</a> : 'Nicht angegeben'}</dd>
          <dt>Letzte Aktualisierung</dt>
          <dd>{formatRecordDate(item.updatedAt)}</dd>
        </dl>
      </article>

      {item.externalIds.length ? (
        <article className="panel-card">
          <header className="panel-head"><h2>Externe IDs</h2></header>
          <DetailInfoList entries={item.externalIds} />
        </article>
      ) : null}

      {item.addressEntries.length ? (
        <article className="panel-card">
          <header className="panel-head"><h2>Kontakt- und Adressrollen</h2></header>
          <DetailInfoList entries={item.addressEntries} wide />
        </article>
      ) : null}

      {item.rawExcerpt.length ? (
        <article className="panel-card">
          <header className="panel-head"><h2>Technischer Auszug</h2></header>
          <DetailInfoList entries={item.rawExcerpt} wide />
        </article>
      ) : null}
    </aside>
  );
}

export function DetailCriteriaCard({ item }: { item: DetailItem }) {
  return (
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
  );
}
