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

function qualityContextAllowsScore(area: string, city: string) {
  return Boolean(city || (area && area !== 'Sachsen'));
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
  if (contextType) {
    params.set('type', contextType);
  } else if (issue.affectedTypes.length) {
    params.set('types', issue.affectedTypes.join(','));
  }
  return `/records?${params.toString()}`;
}

function buildOpenDataSummary(rows: OverviewData['statisticRows']) {
  const total = rows.reduce((sum, row) => sum + row.total, 0);
  const openData = rows.reduce((sum, row) => sum + row.openData, 0);
  const notOpenData = Math.max(0, total - openData);

  return {
    total,
    openData,
    notOpenData,
    openDataQuote: percent(openData, total)
  };
}

function buildQualityDistribution(summary: OverviewData['qualitySummary']) {
  const total = (summary?.good || 0)
    + (summary?.review || 0)
    + (summary?.critical || 0)
    + (summary?.notCalculable || 0);
  const goodWidth = percent(summary?.good || 0, total);
  const reviewWidth = percent(summary?.review || 0, total);
  const criticalWidth = percent(summary?.critical || 0, total);

  return {
    total,
    goodWidth,
    reviewWidth,
    criticalWidth,
    notCalculatedWidth: Math.max(0, 100 - goodWidth - reviewWidth - criticalWidth)
  };
}

function buildQualityStatusGradient(distribution: ReturnType<typeof buildQualityDistribution>) {
  const reviewStart = distribution.goodWidth;
  const criticalStart = distribution.goodWidth + distribution.reviewWidth;
  const mutedStart = criticalStart + distribution.criticalWidth;

  return [
    'conic-gradient(',
    `#2bb673 0 ${distribution.goodWidth}%, `,
    `#f2a91b ${reviewStart}% ${criticalStart}%, `,
    `#ef4444 ${criticalStart}% ${mutedStart}%, `,
    `#98a2b3 ${mutedStart}% 100%`,
    ')'
  ].join('');
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
    return buildOpenDataSummary(rows);
  }, [data]);

  const topIssues = useMemo(() => (data?.issues || []).slice(0, 5), [data]);
  const qualitySummary = data?.qualitySummary || null;
  const canCalculateScore = qualityContextAllowsScore(context.area, context.city);
  const hasQualitySummary = Boolean(qualitySummary);
  const qualityTotal = qualitySummary?.totalAssessed || 0;
  const qualityScore = qualitySummary?.averageQualityScore ?? null;
  const qualityDistribution = buildQualityDistribution(qualitySummary);
  const openDataWidth = percent(summary.openData, summary.total);
  const notOpenDataWidth = percent(summary.notOpenData, summary.total);
  const scoreWidth = qualityScore == null ? 0 : Math.max(0, Math.min(100, qualityScore));
  const statusGradient = hasQualitySummary
    ? buildQualityStatusGradient(qualityDistribution)
    : 'conic-gradient(#e2e8f0 0 100%)';
  const summaryPartial = Boolean(
    qualitySummary?.meta?.partial ||
    qualitySummary?.meta?.failedTypes?.length ||
    qualitySummary?.meta?.incompleteTypes?.length
  );

  return (
    <>
      <section className="overview-hero">
        <h1>Datenqualitäts-Monitor</h1>
        <p>Pflegeaufgaben, Qualitätsstatus und Open-Data-Quote für {context.area || context.city || 'Sachsen'}.</p>
      </section>

      <section className="kpi-grid" aria-label="Kennzahlen">
        <article className="kpi-card">
          <div className="card-label">Qualitäts-Score <span className="material-icons info-icon" aria-hidden="true">info</span></div>
          <div className="kpi-value"><span>{loading ? '...' : (qualityScore ?? '-')}</span> <small>/ 100</small></div>
          <div className="score-track"><span style={{ width: `${scoreWidth}%` }} /></div>
          <p>Gesamtbewertung der Datenqualität</p>
        </article>

        <article className="kpi-card">
          <div className="card-label">Gesamt-Datensätze <span className="material-icons info-icon" aria-hidden="true">info</span></div>
          <div className="kpi-value">{loading ? '...' : formatNumber(summary.total)}</div>
          <p>Aktueller Datenbestand</p>
        </article>

        <article className="kpi-card">
          <div className="card-label">Gute Datensätze <span className="material-icons info-icon" aria-hidden="true">info</span></div>
          <div className="kpi-value">{loading ? '...' : (hasQualitySummary ? formatNumber(qualitySummary?.good || 0) : '-')}</div>
          <strong>{hasQualitySummary ? `${formatPercent(percent(qualitySummary?.good || 0, qualityTotal))}` : 'Nicht berechnet'}</strong>
          <p>Vollständig und aktuell</p>
        </article>

        <article className="kpi-card">
          <div className="card-label">Mit Pflegebedarf <span className="material-icons info-icon" aria-hidden="true">info</span></div>
          <div className="kpi-value">{loading ? '...' : (hasQualitySummary ? formatNumber(qualitySummary?.withIssues || 0) : '-')}</div>
          <strong>{hasQualitySummary ? `${formatPercent(percent(qualitySummary?.withIssues || 0, qualityTotal))}` : 'Nicht berechnet'}</strong>
          <p>Ergänzungen empfohlen</p>
        </article>

        <article className="kpi-card">
          <div className="card-label">Kritische Datensätze <span className="material-icons info-icon" aria-hidden="true">info</span></div>
          <div className="kpi-value">{loading ? '...' : (hasQualitySummary ? formatNumber(qualitySummary?.critical || 0) : '-')}</div>
          <strong>{hasQualitySummary ? `${formatPercent(percent(qualitySummary?.critical || 0, qualityTotal))}` : 'Nicht berechnet'}</strong>
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
              <div className="donut" aria-label="Qualitätsstatus-Verteilung" style={{ background: statusGradient }} />
              <div className="legend">
                {hasQualitySummary ? (
                  <>
                    <div className="legend-row"><span className="legend-dot good" /><span>Gut</span><strong>{formatPercent(qualityDistribution.goodWidth)} ({formatNumber(qualitySummary?.good || 0)})</strong></div>
                    <div className="legend-row"><span className="legend-dot review" /><span>Prüfen</span><strong>{formatPercent(qualityDistribution.reviewWidth)} ({formatNumber(qualitySummary?.review || 0)})</strong></div>
                    <div className="legend-row"><span className="legend-dot critical" /><span>Kritisch</span><strong>{formatPercent(qualityDistribution.criticalWidth)} ({formatNumber(qualitySummary?.critical || 0)})</strong></div>
                    {(qualitySummary?.notCalculable || 0) > 0 ? (
                      <div className="legend-row"><span className="legend-dot muted" /><span>Nicht berechnet</span><strong>{formatPercent(qualityDistribution.notCalculatedWidth)} ({formatNumber(qualitySummary?.notCalculable || 0)})</strong></div>
                    ) : null}
                  </>
                ) : (
                  <div className="legend-row"><span className="legend-dot muted" /><span>Nicht berechnet</span><strong>-</strong></div>
                )}
              </div>
            </div>
            <p className="data-note">
              {hasQualitySummary
                ? `Qualitätsstatus basiert auf ${formatNumber(qualityTotal)} bewerteten Datensätzen im aktuellen Arbeitskontext.`
                : (canCalculateScore ? 'Qualitätsstatus konnte für diesen Kontext noch nicht geladen werden.' : 'Für ganz Sachsen wird kein Qualitäts-Score angezeigt. Pflegeaufgaben laden im Hintergrund.')}
            </p>
            {summaryPartial ? (
              <p className="data-note subtle-note">Einige Datentypen wurden nur teilweise bewertet. Die Zahlen werden angezeigt, sobald verfügbare Ergebnisse vorliegen.</p>
            ) : null}
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
