import { useEffect, useState } from 'react';

import { useUserSettingsStore } from '../../shared/state/user-settings-store';
import { useAuth } from '../../shared/auth/auth-context';
import { buildApiActionUrl, getRuntimeConfig } from '../../shared/api/runtime-config';

type AdminOverview = {
  metrics: {
    active_users: number;
    inactive_users: number;
    active_tenants: number;
    active_sessions: number;
  };
};

export function AdminPage() {
  const { user } = useAuth();
  const { outdooractive, setOutdooractive, clearOutdooractive } = useUserSettingsStore();
  const [projectKey, setProjectKey] = useState(outdooractive.projectKey);
  const [apiKey, setApiKey] = useState(outdooractive.apiKey);
  const [message, setMessage] = useState('');
  const [overview, setOverview] = useState<AdminOverview | null>(null);

  useEffect(() => {
    setProjectKey(outdooractive.projectKey);
    setApiKey(outdooractive.apiKey);
  }, [outdooractive]);

  useEffect(() => {
    const controller = new AbortController();
    fetch(buildApiActionUrl(getRuntimeConfig().systemApiBase, 'admin-overview'), { credentials: 'same-origin', cache: 'no-store', signal: controller.signal })
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error('Admin-Übersicht nicht verfügbar.'))))
      .then((payload: AdminOverview) => setOverview(payload))
      .catch((error) => {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        setOverview(null);
      });
    return () => controller.abort();
  }, []);

  function saveForSession() {
    if (!projectKey.trim() || !apiKey.trim()) {
      setMessage('Bitte Project Key und API Key eingeben.');
      return;
    }

    setOutdooractive({
      projectKey: projectKey.trim(),
      apiKey: apiKey.trim()
    });
    setMessage('Outdooractive-Zugang ist für diese Sitzung hinterlegt.');
  }

  function clearSettings() {
    clearOutdooractive();
    setMessage('Outdooractive-Zugang wurde aus der Sitzung entfernt.');
  }

  return (
    <section className="content-panel admin-page">
      <header className="panel-header">
        <div>
          <h1>Administration</h1>
          <p>{user?.name} · {user?.tenant.name} · Super-Admin</p>
        </div>
        <span className="status-chip">Aktiv</span>
      </header>

      {overview ? (
        <section className="admin-metrics" aria-label="Systemübersicht">
          <article className="panel-card"><strong>{overview.metrics.active_users}</strong><span>Aktive Nutzer</span></article>
          <article className="panel-card"><strong>{overview.metrics.active_tenants}</strong><span>Nutzergruppen</span></article>
          <article className="panel-card"><strong>{overview.metrics.active_sessions}</strong><span>Aktive Sitzungen</span></article>
          <article className="panel-card"><strong>{overview.metrics.inactive_users}</strong><span>Deaktivierte Nutzer</span></article>
        </section>
      ) : null}

      <section className="panel-card admin-settings-card" aria-labelledby="admin-outdooractive-title">
        <header className="tool-card-header">
          <div>
            <h2 id="admin-outdooractive-title">Outdooractive-Zugang</h2>
            <p>Dieser Zugang wird für den direkten Abruf in Outdooractive-Datensatzdetails verwendet.</p>
          </div>
          <span className="material-icons tool-card-icon" aria-hidden="true">key</span>
        </header>

        <div className="tool-form-grid admin-settings-form">
          <label>
            Project Key
            <input value={projectKey} onChange={(event) => setProjectKey(event.target.value)} />
          </label>
          <label className="tool-form-wide">
            API Key
            <input
              type="password"
              value={apiKey}
              autoComplete="off"
              placeholder="Outdooractive API Key"
              onChange={(event) => setApiKey(event.target.value)}
            />
          </label>
        </div>

        <div className="tool-actions">
          <button className="tool-primary-button" type="button" onClick={saveForSession}>
            <span className="material-icons" aria-hidden="true">save</span>
            Für diese Sitzung übernehmen
          </button>
          {outdooractive.apiKey ? <button type="button" onClick={clearSettings}>Zugang entfernen</button> : null}
        </div>

        {message ? <p className="tool-message" role="status">{message}</p> : null}
        <p className="admin-storage-note">
          Der Key bleibt aktuell ausschließlich im Arbeitsspeicher und ist nach einem Neuladen entfernt. Die nutzerbezogene Speicherung folgt separat.
        </p>
      </section>

      <section className="admin-placeholder-grid" aria-label="Geplante Administration">
        <article className="panel-card">
          <span className="material-icons" aria-hidden="true">group</span>
          <h2>Nutzer und Gruppen</h2>
          <p>Die vollständige Nutzer- und Gruppenverwaltung wird hier als nächster Schritt ergänzt.</p>
        </article>
        <article className="panel-card">
          <span className="material-icons" aria-hidden="true">filter_alt</span>
          <h2>Eigene Filter</h2>
          <p>Persönliche Prüfbereiche und zusätzliche Filter werden später pro Nutzer gespeichert.</p>
        </article>
      </section>
    </section>
  );
}
