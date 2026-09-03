import { useState } from 'react';
import { buildApiActionUrl, DATA_API_PATH } from '../../shared/api/api-paths';
import { fetchJson } from '../../shared/api/http-client';
import { QualityAccordion } from './QualityAccordion';
import type { DetailItem, DetailQualityGroup } from './record-detail-types';

export function RecordQualityGroups({ groups, item }: { groups: DetailQualityGroup[]; item: DetailItem }) {
  const [oaData, setOaData] = useState<unknown>(null);
  const [oaMessage, setOaMessage] = useState('');
  async function loadOutdooractive() {
    if (!item.outdooractiveId) return;
    setOaMessage('Outdooractive-Daten werden geladen …');
    try {
      const result = await fetchJson<{ item: unknown }>(`${buildApiActionUrl(DATA_API_PATH, 'outdooractive-detail')}&id=${encodeURIComponent(item.outdooractiveId)}`);
      setOaData(result.item); setOaMessage('Outdooractive-Daten geladen.');
    } catch (error) { setOaMessage(error instanceof Error ? error.message : 'Outdooractive-Daten konnten nicht geladen werden.'); }
  }
  return <section className="record-quality-groups" aria-label="Prüfgruppen">{groups.map((group) => <QualityAccordion key={group.id} group={group}><dl className="quality-field-list">{group.items.map((field) => <div key={`${group.id}-${field.id}`} className={`quality-field status-${field.status}`}><dt><span className="material-icons" aria-hidden="true">{field.status === 'fulfilled' ? 'check_circle' : field.status === 'missing' ? 'cancel' : field.status === 'review' ? 'error' : 'remove_circle_outline'}</span>{field.label}</dt><dd>{field.value}{field.recommendation && field.status !== 'fulfilled' ? <small>{field.recommendation}</small> : null}</dd></div>)}</dl>{group.id === 'sources' && item.outdooractiveId ? <div className="outdooractive-inline-action"><button type="button" onClick={() => void loadOutdooractive()}>Outdooractive-Daten abrufen</button>{oaMessage ? <p role="status">{oaMessage}</p> : null}{oaData ? <details><summary>Technische Outdooractive-Daten</summary><pre className="tool-json-output">{JSON.stringify(oaData, null, 2)}</pre></details> : null}</div> : null}</QualityAccordion>)}</section>;
}
