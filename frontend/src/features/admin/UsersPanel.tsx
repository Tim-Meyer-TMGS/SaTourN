import { useMemo, useState } from 'react';

import { adminApi, type AdminRole, type AdminTenant, type AdminUser } from './admin-api';
import { AdminDialog, adminErrorText, formatAdminDate, TemporaryPasswordDialog } from './admin-ui';

const ROLE_LABELS: Record<AdminRole, string> = {
  USER: 'Nutzer',
  GROUP_ADMIN: 'Gruppen-Admin',
  SUPER_ADMIN: 'Super-Admin'
};

export function UsersPanel({ users, tenants, reload }: {
  users: AdminUser[];
  tenants: AdminTenant[];
  reload: () => Promise<void>;
}) {
  const [search, setSearch] = useState('');
  const [tenantFilter, setTenantFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState<AdminRole | ''>('');
  const [statusFilter, setStatusFilter] = useState<'active' | 'inactive' | ''>('');
  const [editing, setEditing] = useState<AdminUser | 'new' | null>(null);
  const [temporaryPassword, setTemporaryPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [form, setForm] = useState({ name: '', email: '', tenantId: 'tenant_tmgs', role: 'USER' as AdminRole, active: true, forcePasswordChange: false });

  const visibleUsers = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('de');
    return users.filter((entry) => (
      (!tenantFilter || entry.tenant_id === tenantFilter)
      && (!roleFilter || entry.role === roleFilter)
      && (!statusFilter || (statusFilter === 'active' ? entry.active : !entry.active))
      && (!term || `${entry.name} ${entry.email} ${entry.tenant_name}`.toLocaleLowerCase('de').includes(term))
    ));
  }, [roleFilter, search, statusFilter, tenantFilter, users]);

  function openEditor(user: AdminUser | 'new') {
    setMessage('');
    setEditing(user);
    setForm(user === 'new' ? {
      name: '', email: '', tenantId: tenants.find((tenant) => tenant.active)?.id || '', role: 'USER', active: true, forcePasswordChange: false
    } : {
      name: user.name, email: user.email, tenantId: user.tenant_id, role: user.role,
      active: user.active, forcePasswordChange: false
    });
  }

  async function saveUser() {
    if (!editing) return;
    setBusy(true);
    setMessage('');
    try {
      if (editing === 'new') {
        const result = await adminApi.createUser({ name: form.name, email: form.email, tenantId: form.tenantId, role: form.role });
        setTemporaryPassword(result.temporaryPassword);
      } else {
        if (editing.active && !form.active && !window.confirm(`${editing.name} wirklich deaktivieren? Alle Sitzungen werden beendet.`)) return;
        await adminApi.updateUser({
          userId: editing.id, name: form.name, email: form.email, tenantId: form.tenantId,
          role: form.role, active: form.active, forcePasswordChange: form.forcePasswordChange
        });
      }
      setEditing(null);
      await reload();
    } catch (error) {
      setMessage(adminErrorText(error));
    } finally {
      setBusy(false);
    }
  }

  async function resetPassword(user: AdminUser) {
    if (!window.confirm(`Passwort für ${user.email} zurücksetzen und alle Sitzungen beenden?`)) return;
    setBusy(true);
    setMessage('');
    try {
      const result = await adminApi.resetPassword(user.id);
      setTemporaryPassword(result.temporaryPassword);
      await reload();
    } catch (error) {
      setMessage(adminErrorText(error));
    } finally {
      setBusy(false);
    }
  }

  async function revokeSessions(user: AdminUser) {
    if (!window.confirm(`Alle Sitzungen von ${user.email} beenden?`)) return;
    setBusy(true);
    setMessage('');
    try {
      const result = await adminApi.revokeSessions(user.id);
      setMessage(`${result.revokedSessions} Sitzung(en) beendet.`);
      await reload();
    } catch (error) {
      setMessage(adminErrorText(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="panel-card admin-section-card">
      <header className="admin-section-header">
        <div><h2>Nutzer</h2><p>Konten anlegen, zuordnen und sperren.</p></div>
        <button className="tool-primary-button" type="button" onClick={() => openEditor('new')}>Nutzer anlegen</button>
      </header>
      <div className="admin-toolbar">
        <input type="search" value={search} placeholder="Name oder E-Mail" onChange={(event) => setSearch(event.target.value)} />
        <select value={tenantFilter} onChange={(event) => setTenantFilter(event.target.value)}>
          <option value="">Alle Nutzergruppen</option>
          {tenants.map((tenant) => <option key={tenant.id} value={tenant.id}>{tenant.name}</option>)}
        </select>
        <select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value as AdminRole | '')}>
          <option value="">Alle Rollen</option>
          {Object.entries(ROLE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
        <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as 'active' | 'inactive' | '')}>
          <option value="">Alle Status</option>
          <option value="active">Aktiv</option>
          <option value="inactive">Gesperrt</option>
        </select>
      </div>
      {message ? <p className="tool-message" role="status">{message}</p> : null}
      <div className="tool-table-wrap">
        <table className="tool-table admin-table">
          <thead><tr><th>Nutzer</th><th>Gruppe</th><th>Rolle</th><th>Status</th><th>Letzte Anmeldung</th><th>Aktionen</th></tr></thead>
          <tbody>
            {visibleUsers.map((entry) => (
              <tr key={entry.id}>
                <td><strong>{entry.name}</strong><small>{entry.email}</small></td>
                <td>{entry.tenant_name}</td>
                <td>{ROLE_LABELS[entry.role]}</td>
                <td><span className={`status-badge ${entry.active ? 'good' : 'muted'}`}>{entry.active ? 'Aktiv' : 'Gesperrt'}</span>{entry.must_change_password ? <small>Passwortwechsel offen</small> : null}</td>
                <td>{formatAdminDate(entry.last_login_at)}<small>{entry.active_sessions} aktive Sitzung(en)</small></td>
                <td><div className="admin-row-actions">
                  <button type="button" onClick={() => openEditor(entry)}>Bearbeiten</button>
                  <button type="button" disabled={busy} onClick={() => void resetPassword(entry)}>Passwort</button>
                  <button type="button" disabled={busy || entry.active_sessions === 0} onClick={() => void revokeSessions(entry)}>Abmelden</button>
                </div></td>
              </tr>
            ))}
            {!visibleUsers.length ? <tr><td colSpan={6} className="table-empty">Keine Nutzer gefunden.</td></tr> : null}
          </tbody>
        </table>
      </div>

      {editing ? <AdminDialog title={editing === 'new' ? 'Nutzer anlegen' : 'Nutzer bearbeiten'} onClose={() => setEditing(null)}>
        <div className="admin-dialog-body admin-form-grid">
          <label>Name<input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>
          <label>E-Mail<input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></label>
          <label>Nutzergruppe<select value={form.tenantId} onChange={(event) => setForm({ ...form, tenantId: event.target.value })}>{tenants.filter((tenant) => tenant.active).map((tenant) => <option key={tenant.id} value={tenant.id}>{tenant.name}</option>)}</select></label>
          <label>Rolle<select value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value as AdminRole })}>{Object.entries(ROLE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          {editing !== 'new' ? <>
            <label className="admin-check"><input type="checkbox" checked={form.active} onChange={(event) => setForm({ ...form, active: event.target.checked })} /> Konto aktiv</label>
            <label className="admin-check"><input type="checkbox" checked={form.forcePasswordChange} onChange={(event) => setForm({ ...form, forcePasswordChange: event.target.checked })} /> Passwortwechsel verlangen</label>
          </> : null}
          {message ? <p className="tool-message tool-message-error admin-form-full">{message}</p> : null}
        </div>
        <footer><button type="button" onClick={() => setEditing(null)}>Abbrechen</button><button className="primary" type="button" disabled={busy} onClick={() => void saveUser()}>Speichern</button></footer>
      </AdminDialog> : null}
      {temporaryPassword ? <TemporaryPasswordDialog password={temporaryPassword} onClose={() => setTemporaryPassword('')} /> : null}
    </section>
  );
}
