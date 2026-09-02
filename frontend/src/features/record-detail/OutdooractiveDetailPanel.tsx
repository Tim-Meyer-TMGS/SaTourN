import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

import { useUserSettingsStore } from '../../shared/state/user-settings-store';
import { loadOutdooractiveData } from '../../shared/api/external-data';
import type { DetailItem } from './record-detail-types';

function downloadJson(filename: string, payload: unknown) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function getOutdooractiveError(payload: unknown) {
  if (!payload || typeof payload !== 'object') return '';
  const answer = (payload as Record<string, unknown>).answer;
  if (!answer || typeof answer !== 'object') return '';
  const errors = (answer as Record<string, unknown>).errors;
  if (!Array.isArray(errors) || !errors.length) return '';
  const firstError = errors[0];
  if (!firstError || typeof firstError !== 'object') return 'Outdooractive konnte den Datensatz nicht laden.';
  return String((firstError as Record<string, unknown>).msg || 'Outdooractive konnte den Datensatz nicht laden.');
}

export function OutdooractiveDetailPanel({ item }: { item: DetailItem }) {
  const { outdooractive } = useUserSettingsStore();
  const [data, setData] = useState<unknown>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const abortRef = useRef<AbortController | null>(null);
  const isOutdooractiveRecord = item.primarySystem.id === 'outdooractive' || Boolean(item.outdooractiveId);

  useEffect(() => () => abortRef.current?.abort(), []);

  useEffect(() => {
    abortRef.current?.abort();
    setData(null);
    setError('');
    setLoading(false);
  }, [item.globalId]);

  if (!isOutdooractiveRecord) return null;

  async function loadOutdooractiveRecord() {
    if (!item.outdooractiveId || !outdooractive.apiKey) return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    setError('');
    setData(null);

    try {
      const result = await loadOutdooractiveData({
        projectKey: outdooractive.projectKey,
        apiKey: outdooractive.apiKey,
        display: 'verbose',
        ids: [item.outdooractiveId],
        signal: controller.signal
      });
      const record = result[item.outdooractiveId];
      if (record && typeof record === 'object' && '_error' in record) {
        throw new Error('Outdooractive hat für diesen Datensatz einen Fehler zurückgegeben.');
      }
      const outdooractiveError = getOutdooractiveError(record);
      if (outdooractiveError) throw new Error(outdooractiveError);
      setData(record ?? null);
    } catch (requestError) {
      if (!controller.signal.aborted) {
        setError(requestError instanceof Error ? requestError.message : 'Outdooractive-Daten konnten nicht geladen werden.');
      }
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = null;
        setLoading(false);
      }
    }
  }

  return (
    <section className="panel-card outdooractive-detail-panel" aria-labelledby="outdooractive-detail-title">
      <div className="outdooractive-detail-head">
        <div>
          <span className="detail-primary-system detail-primary-system-outdooractive">OA</span>
          <div>
            <h2 id="outdooractive-detail-title">Outdooractive-Quelldaten</h2>
            <p>Outdooractive-ID: <code>{item.outdooractiveId || 'nicht vorhanden'}</code></p>
          </div>
        </div>
        {item.outdooractiveId && outdooractive.apiKey ? (
          <button className="tool-primary-button" type="button" disabled={loading} onClick={() => void loadOutdooractiveRecord()}>
            <span className="material-icons" aria-hidden="true">cloud_download</span>
            {loading ? 'Quelldaten werden geladen …' : 'Direkt aus Outdooractive abrufen'}
          </button>
        ) : null}
      </div>

      {!item.outdooractiveId ? (
        <p className="tool-message tool-message-error">Der Datensatz ist Outdooractive zugeordnet, enthält aber keine Outdooractive-ID.</p>
      ) : null}
      {item.outdooractiveId && !outdooractive.apiKey ? (
        <p className="outdooractive-config-note">
          Für den direkten Abruf zuerst den persönlichen Outdooractive-Zugang in der <Link to="/admin">Administration hinterlegen</Link>.
        </p>
      ) : null}
      {error ? <p className="tool-message tool-message-error" role="alert">{error}</p> : null}
      {data !== null ? (
        <div className="outdooractive-result">
          <div className="tool-actions">
            <button type="button" onClick={() => downloadJson(`outdooractive-${item.outdooractiveId}.json`, data)}>
              JSON herunterladen
            </button>
          </div>
          <details>
            <summary>Technische Outdooractive-Daten anzeigen</summary>
            <pre className="tool-json-output">{JSON.stringify(data, null, 2)}</pre>
          </details>
        </div>
      ) : null}
    </section>
  );
}
