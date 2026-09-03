import { useEffect, useState } from 'react';
import { adminApi } from './admin-api';
import { adminErrorText } from './admin-ui';

export function AdminSettingsPanel() {
  const [projectKey, setProjectKey] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [maskedKey, setMaskedKey] = useState('');
  const [active, setActive] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    adminApi.tenantIntegration(undefined, controller.signal).then(({ integration }) => {
      if (!integration) return;
      setProjectKey(integration.projectKey); setMaskedKey(integration.apiKeyMasked); setActive(integration.active);
    }).catch((error) => { if (!controller.signal.aborted) setMessage(adminErrorText(error)); });
    return () => controller.abort();
  }, []);
  async function save() {
    if (!projectKey.trim() || (!apiKey.trim() && !maskedKey)) { setMessage('Project Key und API Key sind erforderlich.'); return; }
    setBusy(true); setMessage('');
    try {
      const result = await adminApi.saveTenantIntegration({ projectKey: projectKey.trim(), apiKey: apiKey.trim() || undefined, active });
      setMaskedKey(result.integration.apiKeyMasked); setApiKey(''); setMessage('Outdooractive-Zugang gespeichert.');
    } catch (error) { setMessage(adminErrorText(error)); } finally { setBusy(false); }
  }
  return <section className="panel-card admin-settings-card"><header className="tool-card-header"><div><h2>Outdooractive</h2><p>Der Zugang gilt für Ihre Nutzergruppe. API-Aufrufe erfolgen ausschließlich über den Server.</p></div><span className={`status-badge ${active && maskedKey ? 'good' : 'muted'}`}>{active && maskedKey ? 'Verbunden' : 'Nicht konfiguriert'}</span></header><div className="tool-form-grid admin-settings-form"><label>Project Key<input value={projectKey} onChange={(event) => setProjectKey(event.target.value)} /></label><label className="tool-form-wide">API Key<input type="password" value={apiKey} placeholder={maskedKey || 'API Key eingeben'} autoComplete="new-password" onChange={(event) => setApiKey(event.target.value)} /></label><label className="admin-check"><input type="checkbox" checked={active} onChange={(event) => setActive(event.target.checked)} /> Integration aktiv</label></div><div className="tool-actions"><button className="primary" type="button" disabled={busy} onClick={() => void save()}>{busy ? 'Wird gespeichert …' : 'Speichern'}</button></div>{message ? <p className="tool-message" role="status">{message}</p> : null}<p className="admin-storage-note">Der API Key wird verschlüsselt gespeichert und nie unmaskiert an den Browser zurückgegeben.</p></section>;
}
