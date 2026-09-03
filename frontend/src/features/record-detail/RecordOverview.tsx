import type { DetailItem, MissingIssue } from './record-detail-types';

export function RecordOverview({ item, issue }: { item: DetailItem; issue?: MissingIssue }) {
  const image = item.mediaImages[0];
  return <section className="panel-card record-overview">
    <div className="record-overview-image">{image ? <img src={image.url} alt={image.alt || image.title || item.title} /> : <span className="material-icons" aria-hidden="true">image_not_supported</span>}</div>
    <div className="record-overview-content"><div className="record-overview-title"><div><span className={`type-chip ${item.type.toLowerCase()}`}>{item.type || 'Datensatz'}</span><h1 id="record-detail-title">{item.title}</h1><p>{[item.city, item.region, item.category].filter(Boolean).join(' · ') || 'Ort und Kategorie fehlen'}</p></div><span className={`status-badge ${item.qualityStatus === 'gut' ? 'good' : item.qualityStatus === 'kritisch' ? 'critical' : 'review'}`}>{item.qualityScore == null ? 'nicht bewertet' : `DQ ${item.qualityScore} / 100`}</span></div>
      {item.teaser ? <p className="record-teaser">{item.teaser}</p> : null}
      <details className="record-description"><summary>Beschreibung anzeigen</summary><p>{item.description || 'Keine Beschreibung gespeichert.'}</p></details>
      <div className="record-overview-footer"><div><span>Offener Prüfpunkt</span><strong>{issue?.label || 'Kein priorisierter Prüfpunkt'}</strong>{issue?.recommendation ? <small>{issue.recommendation}</small> : null}</div><div><span>Pflegesystem</span><strong>{item.primarySystem.name}</strong>{item.sourceUrl ? <a href={item.sourceUrl} target="_blank" rel="noopener noreferrer">Pflegesystem öffnen</a> : null}</div></div>
    </div>
  </section>;
}
