import { Link } from 'react-router-dom';
import type { DetailItem, RecordListEntry } from './record-detail-types';

function canCreateMailDraft(item: DetailItem, loading: boolean) {
  return Boolean(item.email && item.missingCriteria.length && !loading);
}

export function DetailBreadcrumb({ contextSource, contextLabel }: { contextSource: string; contextLabel: string }) {
  return <><nav className="detail-breadcrumb" aria-label="Brotkrümelnavigation">{contextSource === 'task' && contextLabel ? <><Link to="/tasks">Pflegeaufgaben</Link><span className="material-icons" aria-hidden="true">chevron_right</span><Link to="/records">{contextLabel}</Link><span className="material-icons" aria-hidden="true">chevron_right</span></> : <><Link to="/records">Datensätze</Link><span className="material-icons" aria-hidden="true">chevron_right</span></>}<span>Datensatz</span></nav>{contextSource === 'task' && contextLabel ? <div className="detail-context-note">Pflegeaufgabe: {contextLabel}</div> : null}</>;
}

export function DetailActionBar({ item, backUrl, previous, next, mailDraftLoading, onCopy, onCreateMailDraft }: {
  item: DetailItem;
  backUrl: string;
  previous: RecordListEntry | null;
  next: RecordListEntry | null;
  mailDraftLoading: boolean;
  onCopy: (value: string, label: string) => void;
  onCreateMailDraft: () => void;
}) {
  return <section className="detail-action-bar"><Link className="context-edit icon-text-button" to={backUrl || '/records'}><span className="material-icons" aria-hidden="true">arrow_back</span>Zurück zur Liste</Link><div className="detail-action-links">{previous ? <Link className="context-edit icon-text-button" to={previous.detailUrl}><span className="material-icons" aria-hidden="true">arrow_back</span>Vorheriger</Link> : <button className="context-edit icon-text-button" type="button" disabled><span className="material-icons" aria-hidden="true">arrow_back</span>Vorheriger</button>}{next ? <Link className="context-edit icon-text-button" to={next.detailUrl}>Nächster<span className="material-icons" aria-hidden="true">arrow_forward</span></Link> : <button className="context-edit icon-text-button" type="button" disabled>Nächster<span className="material-icons" aria-hidden="true">arrow_forward</span></button>}{item.et4Url ? <a className="context-edit" href={item.et4Url} target="_blank" rel="noopener noreferrer">In ET4 pages öffnen</a> : null}<details className="detail-actions-menu"><summary className="context-edit icon-text-button">Weitere Aktionen<span className="material-icons" aria-hidden="true">expand_more</span></summary><div><button type="button" disabled={!canCreateMailDraft(item, mailDraftLoading)} onClick={onCreateMailDraft}>{mailDraftLoading ? 'Mailentwurf wird erstellt …' : 'Mailentwurf erstellen'}</button><button type="button" onClick={() => onCopy(item.id, 'ID')}>ID kopieren</button><button type="button" onClick={() => onCopy(item.globalId, 'global_id')}>global_id kopieren</button><button type="button" onClick={() => onCopy(window.location.href, 'Link')}>Link kopieren</button></div></details></div></section>;
}
