import { useEffect, useState } from 'react';

import { useAuth } from '../../shared/auth/auth-context';
import {
  adminApi,
  type AdminArea,
  type AdminAuditEntry,
  type AdminOverview,
  type AdminQualityCriterion,
  type AdminStatus,
  type AdminTenant,
  type AdminUser
} from './admin-api';
import { AuditPanel, QualityPanel, StatusPanel } from './AdminInfoPanels';
import { AdminSettingsPanel } from './AdminSettingsPanel';
import { adminErrorText, formatAdminDate } from './admin-ui';
import { TenantsPanel } from './TenantsPanel';
import { UsersPanel } from './UsersPanel';

type AdminTab = 'overview' | 'users' | 'tenants' | 'quality' | 'status' | 'audit' | 'settings';

const TABS: Array<{ id: AdminTab; label: string; icon: string }> = [
  { id: 'overview', label: 'Übersicht', icon: 'dashboard' },
  { id: 'users', label: 'Nutzer', icon: 'group' },
  { id: 'tenants', label: 'Nutzergruppen', icon: 'account_tree' },
  { id: 'quality', label: 'Prüfkriterien', icon: 'fact_check' },
  { id: 'status', label: 'Systemstatus', icon: 'monitor_heart' },
  { id: 'audit', label: 'Protokoll', icon: 'history' },
  { id: 'settings', label: 'Integrationen', icon: 'tune' }
];

export function AdminPage() {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const [tab, setTab] = useState<AdminTab>(isSuperAdmin ? 'overview' : 'settings');
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [tenants, setTenants] = useState<AdminTenant[]>([]);
  const [areas, setAreas] = useState<AdminArea[]>([]);
  const [criteria, setCriteria] = useState<AdminQualityCriterion[]>([]);
  const [status, setStatus] = useState<AdminStatus | null>(null);
  const [audit, setAudit] = useState<AdminAuditEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function loadUsersAndTenants() {
    const [userResult, tenantResult] = await Promise.all([adminApi.users(), adminApi.tenants()]);
    setUsers(userResult.users);
    setTenants(tenantResult.tenants);
    setAreas(tenantResult.areas);
  }

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    const load = !isSuperAdmin && tab !== 'settings' ? Promise.resolve() : tab === 'overview'
      ? adminApi.overview(controller.signal).then(setOverview)
      : tab === 'users' || tab === 'tenants'
        ? Promise.all([adminApi.users(controller.signal), adminApi.tenants(controller.signal)]).then(([userResult, tenantResult]) => {
          setUsers(userResult.users);
          setTenants(tenantResult.tenants);
          setAreas(tenantResult.areas);
        })
        : tab === 'quality'
          ? adminApi.quality(controller.signal).then((result) => setCriteria(result.criteria))
          : tab === 'status'
            ? adminApi.status(controller.signal).then(setStatus)
            : tab === 'audit'
              ? adminApi.audit(controller.signal).then((result) => setAudit(result.entries))
              : Promise.resolve();

    load.catch((requestError) => {
      if (requestError instanceof DOMException && requestError.name === 'AbortError') return;
      setError(adminErrorText(requestError));
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false);
    });
    return () => controller.abort();
  }, [isSuperAdmin, tab]);

  return (
    <section className="content-panel admin-page">
      <header className="panel-header"><div><h1>Administration</h1><p>{user?.name} · {user?.tenant.name}</p></div><span className="status-chip">{isSuperAdmin ? 'Super-Admin' : 'Gruppen-Admin'}</span></header>
      <nav className="admin-tabs" aria-label="Administration">
        {TABS.filter((entry) => isSuperAdmin || entry.id === 'settings').map((entry) => <button key={entry.id} type="button" className={tab === entry.id ? 'active' : ''} onClick={() => setTab(entry.id)}><span className="material-icons" aria-hidden="true">{entry.icon}</span>{entry.label}</button>)}
      </nav>
      {loading ? <div className="panel-card admin-loading" role="status">Daten werden geladen.</div> : null}
      {error ? <p className="tool-message tool-message-error" role="alert">{error}</p> : null}

      {!loading && tab === 'overview' && overview ? <>
        <section className="admin-metrics" aria-label="Systemübersicht">
          <article className="panel-card"><strong>{overview.metrics.active_users}</strong><span>Aktive Nutzer</span></article>
          <article className="panel-card"><strong>{overview.metrics.active_tenants}</strong><span>Nutzergruppen</span></article>
          <article className="panel-card"><strong>{overview.metrics.active_sessions}</strong><span>Aktive Sitzungen</span></article>
          <article className="panel-card"><strong>{overview.metrics.inactive_users}</strong><span>Gesperrte Nutzer</span></article>
        </section>
        <section className="panel-card admin-section-card"><header className="admin-section-header"><div><h2>Letzter Datenimport</h2><p>{formatAdminDate(overview.sync.last_import_at)}</p></div><span className={`status-badge ${overview.sync.failed_imports ? 'critical' : 'good'}`}>{overview.sync.failed_imports ? `${overview.sync.failed_imports} Fehler` : 'Ohne Fehler'}</span></header></section>
        <AuditPanel entries={overview.recentAudit} compact />
      </> : null}
      {!loading && tab === 'users' ? <UsersPanel users={users} tenants={tenants} reload={loadUsersAndTenants} /> : null}
      {!loading && tab === 'tenants' ? <TenantsPanel tenants={tenants} areas={areas} reload={loadUsersAndTenants} /> : null}
      {!loading && tab === 'quality' ? <QualityPanel criteria={criteria} /> : null}
      {!loading && tab === 'status' && status ? <StatusPanel status={status} /> : null}
      {!loading && tab === 'audit' ? <AuditPanel entries={audit} /> : null}
      {!loading && tab === 'settings' ? <AdminSettingsPanel /> : null}
    </section>
  );
}
