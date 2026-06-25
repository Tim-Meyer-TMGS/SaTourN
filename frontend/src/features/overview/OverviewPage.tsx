import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { useContextStore } from '../../shared/state/context-store';
import { loadOverviewData, type OverviewData, type OverviewIssue } from './overview-api';

function formatNumber(value: number) {
  return new Intl.NumberFormat('de-DE').format(value);
}

function formatPercent(value: number) {
  return `${value.toLocaleString('de-DE', { maximumFractionDigits: 1 })} %`;
}

function percent(value: number, total: number) {
  return total > 0 ? (value / total) * 100 : 0;
}

function priorityClass(priority: string) {
  return priority === 'hoch' ? 'critical' : 'review';
}

function priorityLabel(priority: string) {
  return priority === 'hoch' ? 'Kritisch' : 'Prüfen';
}

function taskIcon(criterionId: string) {
  if (criterionId.includes('license')) return 'description';
  if (criterionId.includes('description')) return 'warning';
  if (criterionId.includes('opening')) return 'schedule';
  if (criterionId.includes('transport')) return 'train';
  if (criterionId.includes('image')) return 'image';
  if (criterionId.includes('booking')) return 'link';
  if (criterionId.includes('payment')) return 'payments';
  return 'assignment';
}

function issueRecordsUrl(issue: OverviewIssue, contextType: string) {
  const params = new URLSearchParams();
  params.set('criterionId', issue.criterionId);
  params.set('from', 'overview');
  const preferredType = contextType || issue.affectedTypes[0] || '';
  if (preferredType) params.set('type', preferredType);
  return `/records?${params.toString()}`;
}

export function OverviewPage() {
  const { context } = useContextStore();
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError('');

      try {
        const result = await loadOverviewData(context);
        if (!active) return;
        setData(result);
      } catch (caughtError) {
        if (!active) return;
        setData(null);
        setError(caughtError instanceof Error ? caughtError.message : 'Übersicht konnte nicht geladen werden.');
      } finally {
        if (active) setLoading(false);
      }
    }

    void load();

    return () => {
      active = false;
    };
  }, [context]);

  const summary = useMemo(() => {
    const rows = data?.statisticRows || [];
    const total = rows.reduce((sum, row) => sum + row.total, 0);
    const openData = rows.reduce((sum, row) => sum + row.openData, 0);
    const notOpenData = Math.max(0, total - openData);
    const openDataQuote = percent(openData, total);
    const issueTotal = (data?.issues || []).reduce((sum, issue) => sum + issue.affectedCount, 0);

    return {
      total,
      openData,
      notOpenData,
      openDataQuote,
      issueTotal
    };
  }, [data]);

  const topIssues = useMemo(() => (data?.issues || []).slice(0, 5), [data]);
  const canCalculateScore = Boolean(context.area || context.city);
  const openDataWidth = percent(summary.openData, summary.total);
  const notOpenDataWidth = percent(summary.notOpenData, summary.total);

  return (
    <>
      <section className="overview-hero">
        <h1>Datenqualitäts-Monitor</h1>
        <p>Pflegeaufgaben, Qualitätsstatus und Open-Data-Quote für {context.area || context.city || 'Sachsen'}.</p>
      </section>

      <section className="kpi-grid" aria-label="Kennzahlen">
        <article className="kpi-card">
          <div className="card-label">Qualitäts-Score <span className="material-icons info-icon" aria-hidden="true">info</span></div>
          <div className="kpi-value"><span>-</span> <small>/ 100</small></div>
          <div className="score-track"><span style={{ width: '0%' }} /></div>
          <p>Gesamtbewertung der Datenqualität</p>
        </article>

        <article className="kpi-card">
          <div className="card-label">Gesamt-Datensätze <span className="material-icons info-icon" aria-hidden="true">info</span></div>
          <div className="kpi-value">{loading ? '...' : formatNumber(summary.total)}</div>
          <p>Aktueller Datenbestand</p>
        </article>

        <article className="kpi-card">
          <div className="card-label">Gute Datensätze <span className="material-icons info-icon" aria-hidden="true">info</span></div>
          <div className="kpi-value">-</div>
          <strong>Nicht berechnet</strong>
          <p>Vollständig und aktuell</p>
        </article>

        <article className="kpi-card">
          <div className="card-label">Mit Pflegebedarf <span className="material-icons info-icon" aria-hidden="true">info</span></div>
          <div className="kpi-value">{loading ? '...' : formatNumber(summary.issueTotal)}</div>
          <strong>{summary.total ? formatPercent(percent(summary.issueTotal, summary.total)) : '-'}</strong>
          <p>Ergänzungen empfohlen</p>
        </article>

        <article className="kpi-card">
          <div className="card-label">Kritische Datensätze <span className="material-icons info-icon" aria-hidden="true">info</span></div>
          <div className="kpi-value">-</div>
          <strong>Nicht berechnet</strong>
          <p>Dringender Handlungsbedarf</p>
        </article>

        <article className="kpi-card">
          <div className="card-label">Open-Data-Quote <span className="material-icons info-icon" aria-hidden="true">info</span></div>
          <div className="kpi-value">{loading ? '...' : formatPercent(summary.openDataQuote)}</div>
          <strong>{loading ? '-' : `${formatNumber(summary.openData)} von ${formatNumber(summary.total)}`}</strong>
          <p>Open-Data-fähige Datensätze</p>
        </article>
      </section>

      {error ? <div className="overview-message">{error}</div> : null}

      <section className="dashboard-grid">
        <article className="panel-card tasks-card">
          <header className="panel-head">
            <h2>Wichtigste Pflegeaufgaben</h2>
          </header>
          <div className="task-list" aria-live="polite">
            {loading ? <div className="inline-loading">Pflegeaufgaben werden geladen ...</div> : null}
            {!loading && !topIssues.length ? (
              <div className="empty-note">Für die aktuelle Auswahl wurden keine Pflegeaufgaben gefunden.</div>
            ) : null}
            {!loading && topIssues.map((issue) => (
              <Link className="task-row" to={issueRecordsUrl(issue, context.type)} key={issue.criterionId}>
                <span className={`task-icon ${priorityClass(issue.priority)} material-icons`} aria-hidden="true">{taskIcon(issue.criterionId)}</span>
                <span className="task-copy">
                  <strong>{issue.label}</strong>
                  <small>{issue.recommendation || 'Bitte im Pflegesystem prüfen und ergänzen.'}</small>
                </span>
                <span className="task-count">{formatNumber(issue.affectedCount)}</span>
                <span className={`status-badge ${priorityClass(issue.priority)}`}>{priorityLabel(issue.priority)}</span>
                <span className="task-open material-icons" aria-hidden="true">chevron_right</span>
              </Link>
            ))}
          </div>
          <Link className="panel-link" to="/tasks">Alle Pflegeaufgaben ansehen <span className="material-icons" aria-hidden="true">arrow_forward</span></Link>
        </article>

        <div className="side-panels">
          <article className="panel-card status-card">
            <header className="panel-head">
              <h2>Qualitäts-Status-Verteilung</h2>
            </header>
            <div className="status-layout">
              <div className="donut" aria-label="Qualitätsstatus-Verteilung" style={{ background: 'conic-gradient(#e2e8f0 0 100%)' }} />
              <div className="legend">
                <div className="legend-row"><span className="legend-dot muted" /><span>Nicht berechnet</span><strong>-</strong></div>
              </div>
            </div>
            <p className="data-note">{canCalculateScore ? 'Qualitätsstatus wird hier noch nicht vollständig berechnet.' : 'Für ganz Sachsen wird kein Qualitäts-Score angezeigt. Pflegeaufgaben laden im Hintergrund.'}</p>
          </article>

          <article className="panel-card open-data-card">
            <header className="panel-head">
              <h2>Open-Data-Status</h2>
            </header>
            <div className="stacked-bar" aria-hidden="true">
              <span className="bar-good" style={{ width: `${openDataWidth}%` }} />
              <span className="bar-review" style={{ width: `${notOpenDataWidth}%` }} />
            </div>
            <div className="open-data-stats">
              <div>
                <span>Open-Data-fähig</span>
                <strong>{loading ? '-' : formatNumber(summary.openData)}</strong>
                <small>{loading ? '-' : formatPercent(openDataWidth)}</small>
              </div>
              <div>
                <span>Nicht Open-Data-fähig</span>
                <strong>{loading ? '-' : formatNumber(summary.notOpenData)}</strong>
                <small>{loading ? '-' : formatPercent(notOpenDataWidth)}</small>
              </div>
            </div>
            <Link className="panel-link align-right" to="/stats">Mehr zur Open-Data-Quote <span className="material-icons" aria-hidden="true">arrow_forward</span></Link>
          </article>
        </div>
      </section>

      <section className="quick-actions panel-card" aria-labelledby="quick-actions-title">
        <h2 id="quick-actions-title">Schnellzugriff</h2>
        <div className="quick-action-grid">
          <Link className="quick-action" to="/tasks">
            <span className="quick-icon blue material-icons" aria-hidden="true">assignment</span>
            <span><strong>Pflegeaufgaben</strong><small>Offene Aufgaben ansehen</small></span>
          </Link>
          <Link className="quick-action" to="/records">
            <span className="quick-icon blue material-icons" aria-hidden="true">storage</span>
            <span><strong>Datensätze prüfen</strong><small>Konkrete Datensätze suchen</small></span>
          </Link>
          <Link className="quick-action" to="/stats">
            <span className="quick-icon green material-icons" aria-hidden="true">bar_chart</span>
            <span><strong>Open-Data-Statistik</strong><small>Zahlen und Entwicklungen</small></span>
          </Link>
          <Link className="quick-action" to="/help">
            <span className="quick-icon amber material-icons" aria-hidden="true">help_outline</span>
            <span><strong>Score verstehen</strong><small>Matrix und Kriterien ansehen</small></span>
          </Link>
        </div>
      </section>
    </>
  );
}
