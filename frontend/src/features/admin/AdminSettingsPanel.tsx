import { useState } from 'react';

import { useUserSettingsStore } from '../../shared/state/user-settings-store';

export function AdminSettingsPanel() {
  const { outdooractive, setOutdooractive, clearOutdooractive } = useUserSettingsStore();
  const [projectKey, setProjectKey] = useState(outdooractive.projectKey);
  const [apiKey, setApiKey] = useState(outdooractive.apiKey);
  const [message, setMessage] = useState('');

  function saveForSession() {
    if (!projectKey.trim() || !apiKey.trim()) {
      setMessage('Bitte Project Key und API Key eingeben.');
      return;
    }
    setOutdooractive({ projectKey: projectKey.trim(), apiKey: apiKey.trim() });
    setMessage('Outdooractive-Zugang ist für diese Sitzung hinterlegt.');
  }

  function clear() {
    clearOutdooractive();
    setApiKey('');
    setMessage('Zugang entfernt.');
  }

  return (
    <section className="panel-card admin-settings-card">
      <header className="tool-card-header"><div><h2>Outdooractive-Zugang</h2><p>Wird beim direkten Abruf eines Outdooractive-Datensatzes verwendet.</p></div><span className="material-icons tool-card-icon" aria-hidden="true">key</span></header>
      <div className="tool-form-grid admin-settings-form">
        <label>Project Key<input value={projectKey} onChange={(event) => setProjectKey(event.target.value)} /></label>
        <label className="tool-form-wide">API Key<input type="password" value={apiKey} autoComplete="off" onChange={(event) => setApiKey(event.target.value)} /></label>
      </div>
      <div className="tool-actions"><button className="tool-primary-button" type="button" onClick={saveForSession}>Für diese Sitzung übernehmen</button>{outdooractive.apiKey ? <button type="button" onClick={clear}>Zugang entfernen</button> : null}</div>
      {message ? <p className="tool-message" role="status">{message}</p> : null}
      <p className="admin-storage-note">Der API-Key bleibt ausschließlich im Arbeitsspeicher und wird weder an Neon gesendet noch im Browser-Cache gespeichert.</p>
    </section>
  );
}
