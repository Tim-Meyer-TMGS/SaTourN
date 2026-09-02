import { useEffect, useState } from 'react';

import { useUserSettingsStore } from '../../shared/state/user-settings-store';

export function AdminPage() {
  const { outdooractive, setOutdooractive, clearOutdooractive } = useUserSettingsStore();
  const [projectKey, setProjectKey] = useState(outdooractive.projectKey);
  const [apiKey, setApiKey] = useState(outdooractive.apiKey);
  const [message, setMessage] = useState('');

  useEffect(() => {
    setProjectKey(outdooractive.projectKey);
    setApiKey(outdooractive.apiKey);
  }, [outdooractive]);

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
          <p>Nutzerbezogene Zugänge und Einstellungen für Zusatzfunktionen.</p>
        </div>
        <span className="status-chip">Vorbereitung</span>
      </header>

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
          Aktuell bleibt der Key ausschließlich im Arbeitsspeicher und ist nach einem Neuladen entfernt. Mit Login und Neon wird dieselbe Einstellung nutzerbezogen und serverseitig gespeichert.
        </p>
      </section>

      <section className="admin-placeholder-grid" aria-label="Geplante Administration">
        <article className="panel-card">
          <span className="material-icons" aria-hidden="true">group</span>
          <h2>Nutzer und Gruppen</h2>
          <p>Rollen, Gruppenzugehörigkeit und eigene Experience werden mit dem Login ergänzt.</p>
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
