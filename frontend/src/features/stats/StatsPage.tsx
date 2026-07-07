import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { calculatePercent, clampPercent, formatNumber, formatPercent } from '../../shared/format/formatters';
import { buildOpenDataSummary } from '../../shared/quality/quality-metrics';
import { buildNonOpenDataRecordsUrl } from '../../shared/records/record-list-links';
import { useContextStore } from '../../shared/state/context-store';
import { LoadingLine, MetricLoading } from '../../shared/ui/LoadingIndicators';
import { loadOverviewData, type OverviewData, type OverviewStatisticRow } from '../overview/overview-api';

const TYPE_COLORS = ['#0b74f2', '#2eb85c', '#f5aa1c', '#8b3ff2', '#ef3f42', '#16b8d9'];

type StatsRow = {
  type: string;
  total: number;
  openData: number;
  nonOpenData: number;
  openDataQuote: number;
  inventoryShare: number;
};

type StatsSummary = {
  totalRecords: number;
  openDataRecords: number;
  nonOpenDataRecords: number;
  openDataQuote: number;
  nonOpenDataQuote: number;
};

function mapStatsRows(rows: OverviewStatisticRow[]): StatsRow[] {
  const totalRecords = rows.reduce((sum, row) => sum + row.total, 0);

  return rows
    .filter((row) => row.total > 0)
    .map((row) => ({
      type: row.type,
      total: row.total,
      openData: row.openData,
      nonOpenData: Math.max(0, row.total - row.openData),
      openDataQuote: calculatePercent(row.openData, row.total),
      inventoryShare: calculatePercent(row.total, totalRecords)
    }));
}

function buildStatsSummary(rows: StatsRow[]): StatsSummary {
  const summary = buildOpenDataSummary(rows);

  return {
    totalRecords: summary.total,
    openDataRecords: summary.openData,
    nonOpenDataRecords: summary.notOpenData,
    openDataQuote: summary.openDataQuote,
    nonOpenDataQuote: summary.notOpenDataQuote
  };
}

function buildTypeDonutBackground(rows: StatsRow[]) {
  if (!rows.length) return 'conic-gradient(#e2e8f0 0 100%)';

  let cursor = 0;
  const segments = rows.map((row, index) => {
    const start = cursor;
    const end = cursor + row.inventoryShare;
    cursor = end;
    return `${TYPE_COLORS[index % TYPE_COLORS.length]} ${start}% ${end}%`;
  });

  return `conic-gradient(${segments.join(', ')})`;
}

function buildStatsPageModel(data: OverviewData | null) {
  const rows = mapStatsRows(data?.statisticRows || []);
  return {
    rows,
    summary: buildStatsSummary(rows),
    fallbackTypes: rows.map((row) => row.type),
    donutBackground: buildTypeDonutBackground(rows)
  };
}

export function StatsPage() {
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
        setError(caughtError instanceof Error ? caughtError.message : 'Open-Data-Statistik konnte nicht geladen werden.');
      } finally {
        if (active) setLoading(false);
      }
    }

    void load();

    return () => {
      active = false;
    };
  }, [context]);

  const statsModel = useMemo(() => buildStatsPageModel(data), [data]);
  const { rows, summary, fallbackTypes, donutBackground } = statsModel;
  const showLicenseTask = !loading && summary.nonOpenDataRecords > 0;

  return (
    <>
      <section className="overview-hero">
        <h1>Open-Data-Statistik</h1>
        <p>Aggregierte Kennzahlen für Ihren Arbeitskontext.</p>
      </section>

      {error ? <div className="overview-message">{error}</div> : null}

      <section className="stats-kpi-grid" aria-label="Open-Data-Kennzahlen">
        <article className="stats-kpi-card">
          <span className="stats-kpi-icon blue material-icons" aria-hidden="true">storage</span>
          <div>
            <span>Gesamtzahl Datensätze</span>
            <strong>{loading ? <MetricLoading /> : formatNumber(summary.totalRecords)}</strong>
            <small>100 % aller Datensätze</small>
          </div>
        </article>
        <article className="stats-kpi-card">
          <span className="stats-kpi-icon green material-icons" aria-hidden="true">lock_open</span>
          <div>
            <span>Open-Data-fähig</span>
            <strong>{loading ? <MetricLoading /> : formatNumber(summary.openDataRecords)}</strong>
            <small>{loading ? <MetricLoading /> : `${formatPercent(summary.openDataQuote)} aller Datensätze`}</small>
          </div>
        </article>
        <article className="stats-kpi-card">
          <span className="stats-kpi-icon purple material-icons" aria-hidden="true">percent</span>
          <div>
            <span>Open-Data-Quote</span>
            <strong>{loading ? <MetricLoading /> : formatPercent(summary.openDataQuote)}</strong>
            <small>Verhältnis Open-Data-fähig</small>
          </div>
        </article>
        <article className="stats-kpi-card">
          <span className="stats-kpi-icon amber material-icons" aria-hidden="true">pie_chart</span>
          <div>
            <span>Nicht Open-Data-fähig</span>
            <strong>{loading ? <MetricLoading /> : formatNumber(summary.nonOpenDataRecords)}</strong>
            <small>{loading ? <MetricLoading /> : `${formatPercent(summary.nonOpenDataQuote)} aller Datensätze`}</small>
          </div>
        </article>
      </section>

      <section className="stats-chart-grid">
        <article className="panel-card stats-chart-card">
          <header className="panel-head"><h2>Verteilung nach Datentyp (Anzahl)</h2></header>
          <div className="stats-donut-layout">
            <div className="stats-type-donut" aria-label="Verteilung nach Datentyp" style={{ background: donutBackground }}>
              <span>{loading ? <MetricLoading /> : formatNumber(summary.totalRecords)}</span>
              <small>Gesamt</small>
            </div>
            <div className="stats-chart-table-wrap">
              <table className="stats-mini-table">
                <thead>
                  <tr>
                    <th>Datentyp</th>
                    <th>Anzahl</th>
                    <th>Open-Data-fähig</th>
                    <th>Nicht Open-Data-fähig</th>
                    <th>Anteil</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={5} className="table-empty"><LoadingLine>Statistik wird geladen</LoadingLine></td></tr>
                  ) : null}
                  {!loading && !rows.length ? (
                    <tr><td colSpan={5} className="table-empty">Keine Daten gefunden.</td></tr>
                  ) : null}
                  {!loading && rows.map((row, index) => (
                    <tr key={row.type}>
                      <td><span className="legend-dot" style={{ background: TYPE_COLORS[index % TYPE_COLORS.length] }} />{row.type}</td>
                      <td>{formatNumber(row.total)}</td>
                      <td>{formatNumber(row.openData)}</td>
                      <td>{formatNumber(row.nonOpenData)}</td>
                      <td>{formatPercent(row.inventoryShare)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </article>

        <article className="panel-card stats-chart-card">
          <header className="panel-head"><h2>Open-Data-Quote nach Datentyp</h2></header>
          <div className="stats-quote-bars" aria-label="Open-Data-Quote nach Datentyp">
            {loading ? <div className="inline-loading">Statistik wird geladen ...</div> : null}
            {!loading && !rows.length ? <div className="empty-note">Keine Daten gefunden.</div> : null}
            {!loading && rows.map((row) => (
              <div className="stats-quote-row" key={row.type}>
                <span>{row.type}</span>
                <div className="stats-quote-track"><i style={{ width: `${clampPercent(row.openDataQuote)}%` }} /></div>
                <strong>{formatPercent(row.openDataQuote)}</strong>
              </div>
            ))}
          </div>
          <div className="stats-axis" aria-hidden="true"><span>0 %</span><span>20 %</span><span>40 %</span><span>60 %</span><span>80 %</span><span>100 %</span></div>
        </article>
      </section>

      {showLicenseTask ? (
        <section className="panel-card stats-task-card">
          <span className="stats-task-icon material-icons" aria-hidden="true">assignment</span>
          <div>
            <h2>Lizenzen pflegen</h2>
            <p className="stats-task-copy">Datensätze ohne gültige Open-Data-Lizenz direkt in den Pflegeaufgaben bearbeiten.</p>
          </div>
          <div className="stats-task-metric">
            <strong>{formatNumber(summary.nonOpenDataRecords)}</strong>
            <small>{formatPercent(summary.nonOpenDataQuote)} nicht Open-Data-fähig</small>
          </div>
          <Link className="primary-action stats-task-link" to={buildNonOpenDataRecordsUrl(fallbackTypes, context.type)}>
            Pflegeaufgabe öffnen
            <span className="material-icons" aria-hidden="true">arrow_forward</span>
          </Link>
        </section>
      ) : null}

      <section className="stats-data-note" aria-label="Datenbasis">
        <span><span className="material-icons" aria-hidden="true">info</span>Die dargestellten Zahlen basieren auf allen verfügbaren Daten in Ihrem Arbeitskontext.</span>
        <strong><span className="material-icons" aria-hidden="true">check_circle</span>Datenbasis: Vollständig</strong>
      </section>
    </>
  );
}
