import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { calculatePercent, formatNumber, formatPercent } from '../../shared/format/formatters';
import {
  buildOpenDataSummary,
  buildQualityDistribution,
  buildQualityStatusGradient
} from '../../shared/quality/quality-metrics';
import { buildTaskRecordsUrl } from '../../shared/records/record-list-links';
import { useContextStore } from '../../shared/state/context-store';
import { getTaskFamilyId, getTaskFamilyMeta } from '../../shared/tasks/task-families';
import { InlineLoading, MetricLoading } from '../../shared/ui/LoadingIndicators';
import { loadOverviewData, type OverviewData, type OverviewIssue } from './overview-api';
import { RandomSamplePanel } from './RandomSamplePanel';

type OverviewTaskIssue = {
  taskId: string;
  criterionId: string;
  criterionIds: string[];
  criteriaByType: Record<string, string>;
  label: string;
  priority: string;
  recommendation?: string;
  affectedCount: number;
  affectedTypes: string[];
  iconCriterionId: string;
};

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

function priorityRank(priority: string) {
  if (priority === 'hoch') return 3;
  if (priority === 'mittel') return 2;
  return 1;
}

function buildOverviewTaskIssues(issues: OverviewIssue[]): OverviewTaskIssue[] {
  const grouped = new Map<string, {
    taskId: string;
    criterionId: string;
    criterionIds: Set<string>;
    criteriaByType: Record<string, string>;
    label: string;
    priority: string;
    recommendation?: string;
    affectedCount: number;
    affectedTypes: Set<string>;
    iconCriterionId: string;
  }>();

  for (const issue of issues) {
    if (!issue.criterionId || issue.affectedCount <= 0) continue;
    const taskFamily = getTaskFamilyId(issue.criterionId);
    const familyMeta = getTaskFamilyMeta(taskFamily);
    const current = grouped.get(taskFamily) || {
      taskId: taskFamily,
      criterionId: issue.criterionId,
      criterionIds: new Set<string>(),
      criteriaByType: {},
      label: familyMeta?.label || issue.label,
      priority: issue.priority,
      recommendation: familyMeta?.recommendation || issue.recommendation,
      affectedCount: 0,
      affectedTypes: new Set<string>(),
      iconCriterionId: familyMeta?.iconCriterionId || issue.criterionId
    };

    current.criterionIds.add(issue.criterionId);
    current.affectedCount += issue.affectedCount;
    if (priorityRank(issue.priority) > priorityRank(current.priority)) current.priority = issue.priority;

    for (const type of issue.affectedTypes || []) {
      if (!type) continue;
      current.affectedTypes.add(type);
      current.criteriaByType[type] = issue.criterionId;
    }

    grouped.set(taskFamily, current);
  }

  return Array.from(grouped.values())
    .map((issue) => ({
      ...issue,
      criterionIds: Array.from(issue.criterionIds),
      affectedTypes: Array.from(issue.affectedTypes).sort((left, right) => left.localeCompare(right, 'de'))
    }))
    .sort((left, right) => (
      priorityRank(right.priority) - priorityRank(left.priority)
      || right.affectedCount - left.affectedCount
      || left.label.localeCompare(right.label, 'de')
    ));
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
        console.error('Übersicht konnte nicht geladen werden.', caughtError);
        setData(null);
        setError('Übersicht konnte nicht geladen werden. Bitte aktualisiere die Seite.');
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

  const topIssues = useMemo(() => buildOverviewTaskIssues(data?.issues || []).slice(0, 5), [data]);
  const qualitySummary = data?.qualitySummary || null;
  const hasQualitySummary = Boolean(qualitySummary);
  const qualityTotal = qualitySummary?.totalAssessed || 0;
  const qualityScore = qualitySummary?.averageQualityScore ?? null;
  const qualityDistribution = buildQualityDistribution(qualitySummary);
  const openDataWidth = calculatePercent(summary.openData, summary.total);
  const notOpenDataWidth = calculatePercent(summary.notOpenData, summary.total);
  const scoreWidth = qualityScore == null ? 0 : Math.max(0, Math.min(100, qualityScore));
  const statusGradient = hasQualitySummary
    ? buildQualityStatusGradient(qualityDistribution)
    : 'conic-gradient(#e2e8f0 0 100%)';
  const summaryPartial = Boolean(
    qualitySummary?.meta?.partial ||
    qualitySummary?.meta?.failedTypes?.length ||
    qualitySummary?.meta?.incompleteTypes?.length
  );
  const contextLabel = [context.area, context.city].filter(Boolean).join(' · ') || 'Sachsen';

  return (
    <>
      <section className="overview-hero">
        <h1>Datenqualitäts-Monitor</h1>
        <p>Pflegeaufgaben, Qualitätsstatus und Open-Data-Quote für {contextLabel}.</p>
      </section>

      <section className="kpi-grid" aria-label="Kennzahlen">
        <article className="kpi-card">
          <div className="card-label">Qualitäts-Score</div>
          <div className="kpi-value"><span>{loading ? <MetricLoading /> : (qualityScore ?? '-')}</span>{qualityScore != null ? <small> / 100</small> : null}</div>
          <div className="score-track"><span style={{ width: `${scoreWidth}%` }} /></div>
          <p>Gesamtbewertung der Datenqualität</p>
        </article>

        <article className="kpi-card">
          <div className="card-label">Gesamt-Datensätze</div>
          <div className="kpi-value">{loading ? <MetricLoading /> : formatNumber(summary.total)}</div>
          <p>Aktueller Datenbestand</p>
        </article>

        <article className="kpi-card">
          <div className="card-label">Gute Datensätze</div>
          <div className="kpi-value">{loading ? <MetricLoading /> : (hasQualitySummary ? formatNumber(qualitySummary?.good || 0) : '-')}</div>
          <strong>{hasQualitySummary ? `${formatPercent(calculatePercent(qualitySummary?.good || 0, qualityTotal))}` : 'Nicht berechnet'}</strong>
          <p>Guter Qualitätsstatus</p>
        </article>

        <article className="kpi-card">
          <div className="card-label">Mit Pflegebedarf</div>
          <div className="kpi-value">{loading ? <MetricLoading /> : (hasQualitySummary ? formatNumber(qualitySummary?.withIssues || 0) : '-')}</div>
          <strong>{hasQualitySummary ? `${formatPercent(calculatePercent(qualitySummary?.withIssues || 0, qualityTotal))}` : 'Nicht berechnet'}</strong>
          <p>Ergänzungen empfohlen</p>
        </article>

        <article className="kpi-card">
          <div className="card-label">Kritische Datensätze</div>
          <div className="kpi-value">{loading ? <MetricLoading /> : (hasQualitySummary ? formatNumber(qualitySummary?.critical || 0) : '-')}</div>
          <strong>{hasQualitySummary ? `${formatPercent(calculatePercent(qualitySummary?.critical || 0, qualityTotal))}` : 'Nicht berechnet'}</strong>
          <p>Dringender Handlungsbedarf</p>
        </article>

        <article className="kpi-card">
          <div className="card-label">Open-Data-Quote</div>
          <div className="kpi-value">{loading ? <MetricLoading /> : formatPercent(summary.openDataQuote)}</div>
          <strong>{loading ? '-' : `${formatNumber(summary.openData)} von ${formatNumber(summary.total)}`}</strong>
          <p>Als Open Data veröffentlichte Datensätze</p>
        </article>
      </section>

      {error ? <div className="overview-message">{error}</div> : null}

      <section className="dashboard-grid">
        <article className="panel-card tasks-card">
          <header className="panel-head">
            <h2>Wichtigste Pflegeaufgaben</h2>
          </header>
          <div className="task-list" aria-live="polite">
            {loading ? <InlineLoading>Pflegeaufgaben werden geladen</InlineLoading> : null}
            {!loading && !topIssues.length ? (
              <div className="empty-note">Für die aktuelle Auswahl wurden keine Pflegeaufgaben gefunden.</div>
            ) : null}
            {!loading && topIssues.map((issue) => (
              <Link className="task-row" to={buildTaskRecordsUrl(issue, context.type)} key={issue.taskId}>
                <span className={`task-icon ${priorityClass(issue.priority)} material-icons`} aria-hidden="true">{taskIcon(issue.iconCriterionId)}</span>
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
            {summaryPartial ? (
              <p className="data-note subtle-note">Daten teilweise geladen.</p>
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
                <span>Als Open Data veröffentlicht</span>
                <strong>{loading ? '-' : formatNumber(summary.openData)}</strong>
                <small>{loading ? '-' : formatPercent(openDataWidth)}</small>
              </div>
              <div>
                <span>Nicht als Open Data veröffentlicht</span>
                <strong>{loading ? '-' : formatNumber(summary.notOpenData)}</strong>
                <small>{loading ? '-' : formatPercent(notOpenDataWidth)}</small>
              </div>
            </div>
            <Link className="panel-link align-right" to="/stats">Mehr zur Open-Data-Quote <span className="material-icons" aria-hidden="true">arrow_forward</span></Link>
          </article>
        </div>
      </section>

      <RandomSamplePanel />

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
