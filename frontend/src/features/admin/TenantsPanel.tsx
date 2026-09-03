import { useState } from 'react';

import { adminApi, type AdminArea, type AdminTenant } from './admin-api';
import { AdminDialog, adminErrorText } from './admin-ui';

export function TenantsPanel({ tenants, areas, reload }: {
  tenants: AdminTenant[];
  areas: AdminArea[];
  reload: () => Promise<void>;
}) {
  const [editing, setEditing] = useState<AdminTenant | 'new' | null>(null);
  const [form, setForm] = useState({ name: '', slug: '', parentTenantId: 'tenant_tmgs', theme: 'satourn', active: true, areaIds: [] as string[], integrationProjectKey: '', integrationApiKey: '', integrationMaskedKey: '', integrationActive: true });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  async function openEditor(tenant: AdminTenant | 'new') {
    setMessage('');
    setEditing(tenant);
    setForm(tenant === 'new' ? {
      name: '', slug: '', parentTenantId: 'tenant_tmgs', theme: 'satourn', active: true, areaIds: [], integrationProjectKey: '', integrationApiKey: '', integrationMaskedKey: '', integrationActive: true
    } : {
      name: tenant.name, slug: tenant.slug, parentTenantId: tenant.parent_tenant_id || '',
      theme: tenant.theme, active: tenant.active, areaIds: tenant.area_ids || [], integrationProjectKey: '', integrationApiKey: '', integrationMaskedKey: '', integrationActive: true
    });
    if (tenant !== 'new') {
      try {
        const { integration } = await adminApi.tenantIntegration(tenant.id);
        if (integration) setForm((current) => ({ ...current, integrationProjectKey: integration.projectKey, integrationMaskedKey: integration.apiKeyMasked, integrationActive: integration.active }));
      } catch (error) { setMessage(adminErrorText(error)); }
    }
  }

  async function saveTenant() {
    if (!editing) return;
    setBusy(true);
    setMessage('');
    try {
      if (editing === 'new') {
        const result = await adminApi.createTenant({ name: form.name, slug: form.slug, parentTenantId: form.parentTenantId, theme: form.theme });
        if (!result.domainConfigured) window.alert('Die Nutzergruppe wurde angelegt. Vor dem ersten Nutzer muss ihre E-Mail-Domain im Servercode freigegeben werden.');
      } else {
        if (editing.active && !form.active && !window.confirm(`${editing.name} wirklich deaktivieren? Alle Sitzungen dieser Gruppe werden beendet.`)) return;
        await adminApi.updateTenant({ tenantId: editing.id, name: form.name, parentTenantId: form.parentTenantId || null, theme: form.theme, active: form.active });
        if (!editing.access_all_areas) await adminApi.updateTenantAreas(editing.id, form.areaIds);
        if (form.integrationProjectKey && (form.integrationApiKey || form.integrationMaskedKey)) await adminApi.saveTenantIntegration({ tenantId: editing.id, projectKey: form.integrationProjectKey, apiKey: form.integrationApiKey || undefined, active: form.integrationActive });
      }
      setEditing(null);
      await reload();
    } catch (error) {
      setMessage(adminErrorText(error));
    } finally {
      setBusy(false);
    }
  }

  function toggleArea(areaId: string) {
    setForm((current) => ({
      ...current,
      areaIds: current.areaIds.includes(areaId)
        ? current.areaIds.filter((id) => id !== areaId)
        : [...current.areaIds, areaId]
    }));
  }

  function areaNames(tenant: AdminTenant) {
    if (tenant.access_all_areas) return 'Alle Gebiete';
    const names = tenant.area_ids
      .map((areaId) => areas.find((area) => area.id === areaId)?.name)
      .filter((name): name is string => Boolean(name));
    return names.length ? names.join(', ') : 'Keine Gebiete';
  }

  return (
    <section className="panel-card admin-section-card">
      <header className="admin-section-header">
        <div><h2>Nutzergruppen und Gebiete</h2><p>Gebietszugriffe werden serverseitig erzwungen.</p></div>
        <button className="tool-primary-button" type="button" onClick={() => void openEditor('new')}>Nutzergruppe anlegen</button>
      </header>
      {message ? <p className="tool-message" role="status">{message}</p> : null}
      <div className="admin-tenant-grid">
        {tenants.map((tenant) => <article className="admin-tenant-card" key={tenant.id}>
          <header><div><h3>{tenant.name}</h3><small>{tenant.slug}</small></div><span className={`status-badge ${tenant.active ? 'good' : 'muted'}`}>{tenant.active ? 'Aktiv' : 'Inaktiv'}</span></header>
          <dl>
            <div><dt>Parent</dt><dd>{tenant.parent_name || '–'}</dd></div>
            <div><dt>Nutzer</dt><dd>{tenant.user_count}</dd></div>
            <div className="admin-tenant-areas"><dt>Gebiete ({tenant.access_all_areas ? 'alle' : tenant.area_ids.length})</dt><dd>{areaNames(tenant)}</dd></div>
            <div><dt>Theme</dt><dd>{tenant.theme}</dd></div>
          </dl>
          <button type="button" onClick={() => void openEditor(tenant)}>Bearbeiten</button>
        </article>)}
      </div>

      {editing ? <AdminDialog title={editing === 'new' ? 'Nutzergruppe anlegen' : 'Nutzergruppe bearbeiten'} onClose={() => setEditing(null)}>
        <div className="admin-dialog-body admin-form-grid">
          <label>Name<input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>
          <label>Slug<input value={form.slug} disabled={editing !== 'new'} onChange={(event) => setForm({ ...form, slug: event.target.value.toLowerCase() })} /></label>
          <label>Parent<select value={form.parentTenantId} disabled={editing !== 'new' && editing.is_root} onChange={(event) => setForm({ ...form, parentTenantId: event.target.value })}>{tenants.filter((tenant) => tenant.active && (editing === 'new' || tenant.id !== editing.id)).map((tenant) => <option key={tenant.id} value={tenant.id}>{tenant.name}</option>)}</select></label>
          <label>Theme<input value={form.theme} onChange={(event) => setForm({ ...form, theme: event.target.value })} /></label>
          {editing !== 'new' ? <label className="admin-check"><input type="checkbox" checked={form.active} disabled={editing.is_root} onChange={(event) => setForm({ ...form, active: event.target.checked })} /> Nutzergruppe aktiv</label> : null}
          {editing !== 'new' && !editing.access_all_areas ? <fieldset className="admin-area-picker admin-form-full"><legend>Zugelassene Gebiete</legend>{areas.filter((area) => area.active).map((area) => <label key={area.id}><input type="checkbox" checked={form.areaIds.includes(area.id)} onChange={() => toggleArea(area.id)} /> {area.name}</label>)}</fieldset> : null}
          {editing !== 'new' && editing.access_all_areas ? <p className="admin-form-full admin-note">Der Root-Mandant hat automatisch Zugriff auf alle Gebiete.</p> : null}
          {editing !== 'new' ? <fieldset className="admin-area-picker admin-form-full"><legend>Integration · Outdooractive</legend><label>Project Key<input value={form.integrationProjectKey} onChange={(event) => setForm({ ...form, integrationProjectKey: event.target.value })} /></label><label>API Key<input type="password" autoComplete="new-password" value={form.integrationApiKey} placeholder={form.integrationMaskedKey || 'API Key eingeben'} onChange={(event) => setForm({ ...form, integrationApiKey: event.target.value })} /></label><label><input type="checkbox" checked={form.integrationActive} onChange={(event) => setForm({ ...form, integrationActive: event.target.checked })} /> Integration aktiv</label><small>Der API Key wird verschlüsselt gespeichert und nur maskiert angezeigt.</small></fieldset> : null}
          {message ? <p className="tool-message tool-message-error admin-form-full">{message}</p> : null}
        </div>
        <footer><button type="button" onClick={() => setEditing(null)}>Abbrechen</button><button className="primary" type="button" disabled={busy} onClick={() => void saveTenant()}>Speichern</button></footer>
      </AdminDialog> : null}
    </section>
  );
}
