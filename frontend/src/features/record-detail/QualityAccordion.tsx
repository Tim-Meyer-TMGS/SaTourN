import { useId, useState, type PropsWithChildren } from 'react';
import type { DetailQualityGroup } from './record-detail-types';

export function QualityAccordion({ group, children }: PropsWithChildren<{ group: DetailQualityGroup }>) {
  const [open, setOpen] = useState(false);
  const generatedId = useId();
  const contentId = `quality-group-${generatedId.replaceAll(':', '')}`;
  const summary = group.missingCount ? `${group.missingCount} ${group.missingCount === 1 ? 'Angabe fehlt' : 'Angaben fehlen'}` : group.reviewCount ? `${group.reviewCount} ${group.reviewCount === 1 ? 'Angabe prüfen' : 'Angaben prüfen'}` : group.score == null ? 'Nicht bewertet' : 'Alles vollständig';
  return <section className={`quality-accordion status-${group.status}`}>
    <h2><button type="button" aria-expanded={open} aria-controls={contentId} onClick={() => setOpen((value) => !value)}><span className="material-icons" aria-hidden="true">{open ? 'expand_less' : 'expand_more'}</span><span><strong>{group.label}</strong><small>{summary}</small></span><span className="quality-group-score">{group.score == null ? 'nicht bewertet' : `DQ ${group.score} / 100`}</span></button></h2>
    {open ? <div className="quality-accordion-content" id={contentId}>{children}</div> : null}
  </section>;
}
