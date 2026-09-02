import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

import { getRuntimeConfig } from '../../shared/api/runtime-config';
import { useContextStore } from '../../shared/state/context-store';
import { loadRandomSample, type RandomSampleResult } from '../../shared/api/external-data';

const RECORD_TYPES = ['POI', 'Event', 'Gastro', 'Tour', 'Hotel', 'Package'];

function safeQueryValue(value: string) {
  return String(value || '').replace(/"/g, '').trim();
}

function buildSampleQuery(area: string, city: string, additionalQuery: string) {
  const parts: string[] = [];
  if (area) parts.push(`area:"${safeQueryValue(area)}"`);
  if (city) parts.push(`city:"${safeQueryValue(city)}"`);
  if (additionalQuery.trim()) parts.push(`(${additionalQuery.trim()})`);
  return parts.join(' AND ');
}

function downloadJson(filename: string, payload: unknown) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function RandomSamplePanel() {
  const { context } = useContextStore();
  const [expanded, setExpanded] = useState(false);
  const [selectedTypes, setSelectedTypes] = useState<string[]>(() => context.type ? [context.type] : RECORD_TYPES.slice(0, 5));
  const [targetCount, setTargetCount] = useState(20);
  const [source, setSource] = useState<'inventory' | 'open-data'>('open-data');
  const [additionalQuery, setAdditionalQuery] = useState('');
  const [result, setResult] = useState<RandomSampleResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => () => abortRef.current?.abort(), []);

  useEffect(() => {
    setSelectedTypes(context.type ? [context.type] : RECORD_TYPES.slice(0, 5));
    setResult(null);
  }, [context]);

  function toggleType(type: string) {
    setSelectedTypes((current) => current.includes(type)
      ? current.filter((entry) => entry !== type)
      : [...current, type]);
  }

  async function runSample() {
    if (!selectedTypes.length) {
      setError('Bitte mindestens einen Datentyp auswählen.');
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const runtime = getRuntimeConfig();
      const sample = await loadRandomSample({
        apiBase: runtime.searchApiBase,
        types: selectedTypes,
        targetCount,
        query: buildSampleQuery(context.area, context.city, additionalQuery),
        openDataPublished: source === 'open-data',
        signal: controller.signal
      });
      setResult(sample);
    } catch (requestError) {
      if (!controller.signal.aborted) {
        setError(requestError instanceof Error ? requestError.message : 'Die Beispieldaten konnten nicht geladen werden.');
      }
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = null;
        setLoading(false);
      }
    }
  }

  const idExport = useMemo(() => result?.items.map((item) => ({
    type: item.type,
    id: item.id,
    globalId: item.globalId
  })) || [], [result]);

  return (
    <section className="panel-card overview-sample-panel" aria-labelledby="sample-panel-title">
      <header className="tool-card-header">
        <div>
          <h2 id="sample-panel-title">Beispieldaten abrufen</h2>
          <p>Eine zufällige Stichprobe aus dem aktuellen Arbeitskontext zusammenstellen.</p>
        </div>
        <button className="context-edit icon-text-button" type="button" onClick={() => setExpanded((current) => !current)}>
          <span className="material-icons" aria-hidden="true">casino</span>
          {expanded ? 'Schließen' : 'Stichprobe konfigurieren'}
        </button>
      </header>

      {expanded ? (
        <>
          <div className="tool-form-grid">
            <label>
              Anzahl
              <input
                type="number"
                min="1"
                max="500"
                value={targetCount}
                onChange={(event) => setTargetCount(Math.max(1, Math.min(500, Number(event.target.value) || 1)))}
              />
            </label>
            <label>
              Datenquelle
              <select value={source} onChange={(event) => setSource(event.target.value as 'inventory' | 'open-data')}>
                <option value="open-data">Open Data veröffentlicht</option>
                <option value="inventory">SaTourN-Bestand</option>
              </select>
            </label>
            <label>
              Zusätzlicher META-Filter (optional)
              <input
                type="text"
                value={additionalQuery}
                placeholder="z. B. category:Museum"
                onChange={(event) => setAdditionalQuery(event.target.value)}
              />
            </label>
          </div>

          <fieldset className="tool-type-picker">
            <legend>Datentypen</legend>
            {RECORD_TYPES.map((type) => (
              <label key={type}>
                <input
                  type="checkbox"
                  checked={selectedTypes.includes(type)}
                  onChange={() => toggleType(type)}
                />
                {type}
              </label>
            ))}
          </fieldset>

          <div className="tool-context-note">
            Kontext: {context.area || 'alle Gebiete'} · {context.city || 'alle Orte'}
          </div>

          <div className="tool-actions">
            <button className="tool-primary-button" type="button" disabled={loading} onClick={() => void runSample()}>
              <span className="material-icons" aria-hidden="true">shuffle</span>
              {loading ? 'Beispieldaten werden geladen …' : 'Beispieldaten abrufen'}
            </button>
            {result?.items.length ? (
              <>
                <button type="button" onClick={() => downloadJson('satourn-beispieldaten.json', result.items.map((item) => item.raw))}>
                  JSON herunterladen
                </button>
                <button type="button" onClick={() => downloadJson('satourn-beispieldaten-ids.json', idExport)}>
                  ID-Liste herunterladen
                </button>
              </>
            ) : null}
          </div>

          {error ? <p className="tool-message tool-message-error" role="alert">{error}</p> : null}
          {result ? (
            <div className="tool-results">
              <p className="tool-message">
                {result.items.length} von {result.requested} gewünschten Datensätzen ausgewählt
                {result.items.length < result.requested ? ` (${result.available} im gewählten Kontext verfügbar)` : ''}.
              </p>
              <div className="tool-table-wrap">
                <table className="tool-table">
                  <thead>
                    <tr><th>Typ</th><th>Titel</th><th>Ort</th><th>global_id</th><th>Aktion</th></tr>
                  </thead>
                  <tbody>
                    {result.items.map((item) => (
                      <tr key={item.globalId || `${item.type}:${item.id}`}>
                        <td>{item.type}</td>
                        <td>{item.title}</td>
                        <td>{item.city || item.region || '–'}</td>
                        <td><code>{item.globalId || item.id}</code></td>
                        <td><Link className="table-link-button" to={item.detailUrl}>Öffnen</Link></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}
        </>
      ) : (
        <p className="data-note">Quelle, Datentypen und Anzahl auswählen und die Ergebnisse direkt prüfen oder als JSON exportieren.</p>
      )}
    </section>
  );
}
