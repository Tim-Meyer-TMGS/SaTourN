import { QualityAccordion } from './QualityAccordion';
import type { DetailQualityGroup } from './record-detail-types';

export function RecordQualityGroups({ groups }: { groups: DetailQualityGroup[] }) {
  return <section className="record-quality-groups" aria-label="Prüfgruppen">{groups.map((group) => <QualityAccordion key={group.id} group={group}><dl className="quality-field-list">{group.items.map((field) => <div key={`${group.id}-${field.id}`} className={`quality-field status-${field.status}`}><dt><span className="material-icons" aria-hidden="true">{field.status === 'fulfilled' ? 'check_circle' : field.status === 'missing' ? 'cancel' : field.status === 'review' ? 'error' : 'remove_circle_outline'}</span>{field.label}</dt><dd>{field.value}{field.recommendation && field.status !== 'fulfilled' ? <small>{field.recommendation}</small> : null}</dd></div>)}</dl></QualityAccordion>)}</section>;
}
