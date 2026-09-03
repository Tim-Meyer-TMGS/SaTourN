import type { AdminAuditEntry, AdminQualityCriterion, AdminStatus } from './admin-api';
import { formatAdminDate } from './admin-ui';

export function QualityPanel({ criteria }: { criteria: AdminQualityCriterion[] }) {
  return (
    <section className="panel-card admin-section-card">
      <header className="admin-section-header"><div><h2>Prüfkriterien</h2><p>Aktueller Stand der im Qualitätsmonitor verwendeten Prüfungen.</p></div><span className="status-chip">Nur Ansicht</span></header>
      <div className="tool-table-wrap"><table className="tool-table admin-table"><thead><tr><th>Kriterium</th><th>Datentypen</th><th>Priorität</th><th>Verfahren</th><th>Status</th></tr></thead><tbody>
        {criteria.map((criterion) => <tr key={criterion.id}>
          <td><strong>{criterion.label}</strong><small>{criterion.recommendation}</small></td>
          <td>{criterion.types.join(', ') || 'Alle'}</td><td>{criterion.severity}</td>
          <td>{criterion.method === 'api_pushdown' ? 'Datenbankfilter' : 'Serverprüfung'}</td>
          <td><span className={`status-badge ${criterion.active ? 'good' : 'muted'}`}>{criterion.active ? 'Aktiv' : 'Manuell'}</span></td>
        </tr>)}
      </tbody></table></div>
    </section>
  );
}

export function StatusPanel({ status }: { status: AdminStatus }) {
  return (
    <div className="admin-status-layout">
      <section className="admin-metrics">
        <article className="panel-card"><strong>{status.database.latencyMs} ms</strong><span>Datenbankantwort</span></article>
        <article className="panel-card"><strong>{status.authentication.active_users}</strong><span>Aktive Nutzer</span></article>
        <article className="panel-card"><strong>{status.authentication.active_sessions}</strong><span>Aktive Sitzungen</span></article>
        <article className="panel-card"><strong>{status.imports.filter((entry) => entry.status === 'failed').length}</strong><span>Fehlgeschlagene Imports</span></article>
      </section>
      <section className="panel-card admin-section-card"><header className="admin-section-header"><div><h2>Datenimport</h2><p>Status je Datentyp.</p></div></header>
        <div className="tool-table-wrap"><table className="tool-table admin-table"><thead><tr><th>Datentyp</th><th>Status</th><th>Letzter Erfolg</th><th>Datensätze</th><th>Fehler</th></tr></thead><tbody>
          {status.imports.map((entry) => <tr key={entry.record_type}><td>{entry.record_type}</td><td><span className={`status-badge ${entry.status === 'success' ? 'good' : 'critical'}`}>{entry.status}</span></td><td>{formatAdminDate(entry.last_success_at)}</td><td>{entry.imported_count ?? '–'}</td><td>{entry.error_message || '–'}</td></tr>)}
        </tbody></table></div>
      </section>
    </div>
  );
}

export function AuditPanel({ entries, compact = false }: { entries: AdminAuditEntry[]; compact?: boolean }) {
  return (
    <section className="panel-card admin-section-card"><header className="admin-section-header"><div><h2>{compact ? 'Letzte Änderungen' : 'Änderungsprotokoll'}</h2><p>Administrative Änderungen an Konten und Nutzergruppen.</p></div></header>
      <div className="tool-table-wrap"><table className="tool-table admin-table"><thead><tr><th>Zeit</th><th>Aktion</th><th>Ausgeführt von</th><th>Ziel</th>{!compact ? <th>Details</th> : null}</tr></thead><tbody>
        {entries.map((entry) => <tr key={entry.id}><td>{formatAdminDate(entry.created_at)}</td><td>{entry.action}</td><td>{entry.actor_name || entry.actor_email || 'System'}</td><td>{entry.target_type}{entry.target_id ? ` · ${entry.target_id}` : ''}</td>{!compact ? <td><code className="admin-audit-metadata">{Object.keys(entry.metadata || {}).length ? JSON.stringify(entry.metadata) : '–'}</code></td> : null}</tr>)}
        {!entries.length ? <tr><td colSpan={compact ? 4 : 5} className="table-empty">Noch keine Einträge vorhanden.</td></tr> : null}
      </tbody></table></div>
    </section>
  );
}
