import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { DATA_TYPES } from '../../shared/config/constants';
import { qualityCriteria } from '../../shared/legacy/quality';
import { useContextStore } from '../../shared/state/context-store';
import { loadOverviewData, type OverviewData, type OverviewIssue } from '../overview/overview-api';

const ROWS_PER_PAGE = 10;

type TaskFamilyMeta = {
  label: string;
  description: string;
  problem: string;
  impactText: string;
  recommendation: string;
  iconCriterionId: string;
};

const TASK_FAMILY_BY_CRITERION: Record<string, string> = {
  hotel_payment_cash_missing: 'payment_options_missing',
  poi_payment_options_missing: 'payment_options_missing',
  gastro_payment_options_missing: 'payment_options_missing',
  hotel_language_english_missing: 'languages_missing',
  poi_languages_missing: 'languages_missing',
  gastro_languages_missing: 'languages_missing',
  hotel_parking_feature_missing: 'parking_missing',
  tour_parking_missing: 'parking_missing',
  poi_parking_feature_missing: 'parking_missing',
  gastro_parking_feature_missing: 'parking_missing'
};

const TASK_FAMILY_META: Record<string, TaskFamilyMeta> = {
  payment_options_missing: {
    label: 'Zahlungsmöglichkeiten fehlen',
    description: 'Keine der geprüften Zahlungsarten vorhanden',
    problem: 'Für diese Datensätze fehlt mindestens eine gepflegte Zahlungsart.',
    impactText: 'Fehlende Zahlungsarten erschweren Planung, Vergleich und Erwartungsmanagement.',
    recommendation: 'Mindestens eine geprüfte Zahlungsart als Merkmal ergänzen.',
    iconCriterionId: 'poi_payment_options_missing'
  },
  languages_missing: {
    label: 'Fremdsprachenangaben fehlen',
    description: 'Keine der geprüften Fremdsprachen vorhanden',
    problem: 'Für diese Datensätze fehlt mindestens eine gepflegte Fremdsprachenangabe.',
    impactText: 'Fehlende Sprachangaben schränken Auffindbarkeit und Nutzbarkeit für internationale Gäste ein.',
    recommendation: 'Mindestens eine geprüfte Fremdsprache als Merkmal ergänzen.',
    iconCriterionId: 'poi_languages_missing'
  },
  parking_missing: {
    label: 'Parkhinweise fehlen',
    description: 'Keine Parkinformation oder kein geprüfter Parkhinweis vorhanden',
    problem: 'Für diese Datensätze fehlt eine belastbare Parkinformation oder ein Parkhinweis.',
    impactText: 'Fehlende Parkhinweise erschweren die Anreiseplanung vor Ort.',
    recommendation: 'Parkmöglichkeiten oder geprüfte Parkhinweise ergänzen.',
    iconCriterionId: 'tour_parking_missing'
  }
};

type TaskRow = {
  taskId: string;
  taskFamily: string;
  criterionId: string;
  criterionIds: string[];
  criteriaByType: Record<string, string>;
  label: string;
  description: string;
  problem: string;
  recommendation: string;
  impactText?: string | null;
  iconCriterionId: string;
  priority: string;
  affectedCount: number;
  affectedTypes: string[];
  impact: 'sehr_hoch' | 'hoch' | 'mittel' | 'niedrig';
  openDataRelevant: boolean;
};

type TaskFilters = {
  query: string;
  priority: string;
  type: string;
  impact: string;
};

function formatNumber(value: number) {
  return new Intl.NumberFormat('de-DE').format(value);
}

function percent(value: number, total: number) {
  return total > 0 ? (value / total) * 100 : 0;
}

function formatPercent(value: number) {
  return `${value.toLocaleString('de-DE', { maximumFractionDigits: 1 })} %`;
}

function priorityRank(priority: string) {
  if (priority === 'hoch') return 3;
  if (priority === 'mittel') return 2;
  return 1;
}

function priorityLabel(priority: string) {
  if (priority === 'hoch') return 'Kritisch';
  if (priority === 'mittel') return 'Prüfen';
  return 'Niedrig';
}

function priorityClass(priority: string) {
  if (priority === 'hoch') return 'critical';
  if (priority === 'mittel') return 'review';
  return 'muted';
}

function impactRank(impact: TaskRow['impact']) {
  return { sehr_hoch: 4, hoch: 3, mittel: 2, niedrig: 1 }[impact] || 0;
}

function impactLabel(impact: string) {
  const labels: Record<string, string> = {
    sehr_hoch: 'Sehr hoch',
    hoch: 'Hoch',
    mittel: 'Mittel',
    niedrig: 'Niedrig'
  };

  return labels[impact] || 'Nicht bewertet';
}

function impactClass(impact: string) {
  if (impact === 'sehr_hoch') return 'critical';
  if (impact === 'hoch') return 'review';
  if (impact === 'mittel') return 'medium';
  return 'good';
}

function getTaskFamilyId(criterionId: string) {
  return TASK_FAMILY_BY_CRITERION[criterionId] || criterionId;
}

function getTaskFamilyMeta(taskFamily: string) {
  return TASK_FAMILY_META[taskFamily] || null;
}

function isOpenDataRelevantCriterion(criterionId: string) {
  const criterion = qualityCriteria.find((entry) => entry.id === criterionId);
  return criterion?.openDataRelevant === true || ['license_missing', 'image_author_missing'].includes(criterionId);
}

function computeTaskImpact(priority: string, openDataRelevant: boolean, affectedCount: number): TaskRow['impact'] {
  if (priority === 'hoch' && openDataRelevant && affectedCount >= 5) return 'sehr_hoch';
  if (priority === 'hoch') return 'hoch';
  if (priority === 'mittel') return 'mittel';
  return 'niedrig';
}

function getTaskProblem(id: string) {
  const problems: Record<string, string> = {
    poi_street_missing: 'Für diese POI fehlt eine belastbare Straßen- oder Anschriftsangabe.',
    poi_teaser_missing: 'Für diese POI fehlt ein kurzer Teaser-Text.',
    poi_email_missing: 'Für diese POI fehlt eine E-Mail-Adresse.',
    poi_website_missing: 'Für diese POI fehlt eine Webseite.',
    poi_phone_missing: 'Für diese POI fehlt eine Telefonnummer.',
    poi_price_missing: 'Für diese POI fehlt eine Preis-, Eintritts- oder Kosteninformation.',
    tour_season_missing: 'Für diese Tour fehlt eine belastbare Saison- oder Eignungsangabe.',
    tour_parking_missing: 'Für diese Tour fehlt eine belastbare Parkinformation.',
    license_missing: 'Für diese Datensätze ist keine gültige Lizenzangabe hinterlegt.',
    image_author_missing: 'Bildmaterial ist vorhanden, aber der Urheberhinweis fehlt.',
    description_missing: 'Für diese Datensätze fehlt eine belastbare Beschreibung mit Details.',
    opening_hours_missing: 'Es sind keine Öffnungszeiten oder vergleichbare Zeitinformationen hinterlegt.',
    public_transport_missing: 'Informationen zur Anreise mit dem ÖPNV fehlen.',
    booking_link_missing: 'Es ist kein Buchungs-, Reservierungs- oder Ticketlink hinterlegt.',
    image_missing: 'Für diese Datensätze ist kein prüfbares Bildmaterial vorhanden.',
    poi_parking_feature_missing: 'Das Merkmal "Parkplätze vorhanden" fehlt.',
    poi_payment_options_missing: 'Keine der geprüften Zahlungsarten ist als Merkmal hinterlegt.',
    poi_languages_missing: 'Keine der geprüften Fremdsprachen ist als Merkmal hinterlegt.',
    poi_suitability_missing: 'Keine der geprüften Eignungsangaben ist als Merkmal hinterlegt.',
    hotel_language_english_missing: 'Keine der geprüften Fremdsprachen ist als Merkmal hinterlegt.',
    hotel_payment_cash_missing: 'Keine der geprüften Zahlungsarten ist als Merkmal hinterlegt.',
    hotel_parking_feature_missing: 'Keine der geprüften Parkinformationen ist als Merkmal hinterlegt.',
    gastro_payment_options_missing: 'Keine der geprüften Zahlungsarten ist als Merkmal hinterlegt.',
    gastro_languages_missing: 'Keine der geprüften Fremdsprachen ist als Merkmal hinterlegt.',
    gastro_parking_feature_missing: 'Das Merkmal "PKW-Parkplatz am Haus" fehlt.',
    gastro_cuisine_category_missing: 'Keine der geprüften Küchenarten ist als Kategorie hinterlegt.'
  };

  return problems[id] || 'Für diese Datensätze fehlt eine für die Datenpflege relevante Angabe.';
}

function getTaskDescription(id: string) {
  const descriptions: Record<string, string> = {
    poi_street_missing: 'Keine Straße oder Anschrift hinterlegt',
    poi_teaser_missing: 'Kein Teaser-Text vorhanden',
    poi_email_missing: 'Keine E-Mail-Adresse vorhanden',
    poi_website_missing: 'Keine Webseite vorhanden',
    poi_phone_missing: 'Keine Telefonnummer vorhanden',
    poi_price_missing: 'Keine Preisinformation vorhanden',
    tour_season_missing: 'Keine Saisonangabe vorhanden',
    tour_parking_missing: 'Keine Parkinformation vorhanden',
    license_missing: 'Datensätze ohne Lizenzangabe',
    image_author_missing: 'Bilder ohne Urheberangabe',
    description_missing: 'Keine Beschreibung oder Details',
    opening_hours_missing: 'Keine Öffnungszeiten hinterlegt',
    public_transport_missing: 'Keine ÖPNV-Information vorhanden',
    booking_link_missing: 'Kein Buchungs- oder Reservierungslink',
    image_missing: 'Kein Bildmaterial vorhanden',
    poi_parking_feature_missing: 'Merkmal "Parkplätze vorhanden" fehlt',
    poi_payment_options_missing: 'Keine geprüfte Zahlungsart vorhanden',
    poi_languages_missing: 'Keine geprüfte Fremdsprache vorhanden',
    poi_suitability_missing: 'Keine geprüfte Eignungsangabe vorhanden',
    hotel_language_english_missing: 'Keine geprüfte Fremdsprache vorhanden',
    hotel_payment_cash_missing: 'Keine geprüfte Zahlungsart vorhanden',
    hotel_parking_feature_missing: 'Keine geprüfte Parkinformation vorhanden',
    gastro_payment_options_missing: 'Keine geprüfte Zahlungsart vorhanden',
    gastro_languages_missing: 'Keine geprüfte Fremdsprache vorhanden',
    gastro_parking_feature_missing: 'Merkmal "PKW-Parkplatz am Haus" fehlt',
    gastro_cuisine_category_missing: 'Keine geprüfte Küchenart vorhanden'
  };

  return descriptions[id] || 'Ergänzung empfohlen';
}

function getTaskImpactText(id: string) {
  const impacts: Record<string, string> = {
    license_missing: 'Ohne Lizenz sind Daten nicht Open-Data-fähig und nur eingeschränkt weiterverwendbar.',
    image_author_missing: 'Ohne Urheberangabe ist die Weitergabe von Bildmaterial rechtlich eingeschränkt.',
    description_missing: 'Fehlende Beschreibungen reduzieren Auffindbarkeit, Verständlichkeit und Nutzbarkeit.',
    opening_hours_missing: 'Fehlende Öffnungszeiten erschweren Planung und Ausspielung in Portalen.',
    public_transport_missing: 'Fehlende ÖPNV-Hinweise schwächen nachhaltige Anreiseinformationen.',
    booking_link_missing: 'Ohne Buchungslink können Nutzer Angebote schwerer direkt abschließen.',
    image_missing: 'Ohne Bilder wirken Einträge weniger attraktiv und sind in vielen Kanälen schwächer.'
  };

  return impacts[id] || 'Die fehlende Information reduziert die praktische Nutzbarkeit der Daten.';
}

function getTaskIcon(id: string) {
  if (id === 'poi_street_missing') return 'pin_drop';
  if (id === 'poi_teaser_missing') return 'notes';
  if (id === 'poi_email_missing') return 'mail';
  if (id === 'poi_website_missing') return 'language';
  if (id === 'poi_phone_missing') return 'call';
  if (id === 'poi_price_missing') return 'sell';
  if (id.includes('license')) return 'description';
  if (id.includes('image')) return 'image';
  if (id.includes('opening')) return 'schedule';
  if (id.includes('transport')) return 'directions_transit';
  if (id.includes('booking')) return 'link';
  if (id.includes('parking')) return 'local_parking';
  if (id.includes('payment')) return 'payments';
  if (id.includes('languages')) return 'translate';
  if (id.includes('cuisine')) return 'restaurant_menu';
  return 'assignment';
}

function buildTaskRows(issues: OverviewIssue[]): TaskRow[] {
  const grouped = new Map<string, {
    taskId: string;
    taskFamily: string;
    criterionId: string;
    criterionIds: Set<string>;
    criteriaByType: Record<string, string>;
    label: string;
    priority: string;
    recommendation?: string;
    affectedCount: number;
    affectedTypes: Set<string>;
  }>();

  for (const issue of issues) {
    if (!issue.criterionId || issue.affectedCount <= 0) continue;
    const taskFamily = getTaskFamilyId(issue.criterionId);
    const familyMeta = getTaskFamilyMeta(taskFamily);
    const current = grouped.get(taskFamily) || {
      taskId: taskFamily,
      taskFamily,
      criterionId: issue.criterionId,
      criterionIds: new Set<string>(),
      criteriaByType: {},
      label: familyMeta?.label || issue.label,
      priority: issue.priority || '',
      recommendation: familyMeta?.recommendation || issue.recommendation,
      affectedCount: 0,
      affectedTypes: new Set<string>()
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
    .map((entry) => {
      const criterion = qualityCriteria.find((item) => item.id === entry.criterionId);
      const familyMeta = getTaskFamilyMeta(entry.taskFamily);
      const affectedTypes = Array.from(entry.affectedTypes).sort((left, right) => left.localeCompare(right, 'de'));
      const openDataRelevant = Array.from(entry.criterionIds).some(isOpenDataRelevantCriterion);
      const impact = computeTaskImpact(entry.priority, openDataRelevant, entry.affectedCount);

      return {
        ...entry,
        criterionIds: Array.from(entry.criterionIds),
        affectedTypes,
        description: familyMeta?.description || getTaskDescription(entry.criterionId),
        problem: familyMeta?.problem || getTaskProblem(entry.criterionId),
        recommendation: familyMeta?.recommendation || criterion?.recommendation || entry.recommendation || 'Datensatz prüfen und fehlende Angaben ergänzen.',
        impactText: familyMeta?.impactText || getTaskImpactText(entry.criterionId),
        iconCriterionId: familyMeta?.iconCriterionId || entry.criterionId,
        openDataRelevant,
        impact
      } satisfies TaskRow;
    })
    .sort((left, right) => (
      impactRank(right.impact) - impactRank(left.impact)
      || priorityRank(right.priority) - priorityRank(left.priority)
      || right.affectedCount - left.affectedCount
      || left.label.localeCompare(right.label, 'de')
    ));
}

function filterTasks(tasks: TaskRow[], filters: TaskFilters) {
  const query = filters.query.trim().toLowerCase();

  return tasks.filter((task) => {
    const text = `${task.label} ${task.description} ${task.problem} ${task.recommendation}`.toLowerCase();
    if (query && !text.includes(query)) return false;
    if (filters.priority && task.priority !== filters.priority) return false;
    if (filters.type && !task.affectedTypes.includes(filters.type)) return false;
    if (filters.impact && task.impact !== filters.impact) return false;
    return true;
  });
}

function computePotential(tasks: TaskRow[]) {
  if (tasks.some((task) => task.impact === 'sehr_hoch')) return 'Sehr hoch';
  if (tasks.some((task) => task.impact === 'hoch')) return 'Hoch';
  if (tasks.some((task) => task.impact === 'mittel')) return 'Mittel';
  if (tasks.length) return 'Niedrig';
  return '-';
}

function buildTaskRecordsUrl(task: TaskRow, contextType: string, type = '') {
  const params = new URLSearchParams();
  params.set('criterionId', type ? (task.criteriaByType[type] || task.criterionId) : task.criterionId);
  if (task.criterionIds.length > 1) params.set('criterionIds', task.criterionIds.join(','));
  params.set('from', 'tasks');

  if (type) {
    params.set('type', type);
  } else if (contextType) {
    params.set('type', contextType);
  } else if (task.affectedTypes.length) {
    params.set('types', task.affectedTypes.join(','));
  }

  return `/records?${params.toString()}`;
}

export function TasksPage() {
  const { context } = useContextStore();
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState<TaskFilters>({ query: '', priority: '', type: '', impact: '' });
  const [selectedTaskId, setSelectedTaskId] = useState('');
  const [page, setPage] = useState(1);

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
        setError(caughtError instanceof Error ? caughtError.message : 'Pflegeaufgaben konnten nicht geladen werden.');
      } finally {
        if (active) setLoading(false);
      }
    }

    void load();

    return () => {
      active = false;
    };
  }, [context]);

  const tasks = useMemo(() => buildTaskRows(data?.issues || []), [data]);
  const filteredTasks = useMemo(() => filterTasks(tasks, filters), [tasks, filters]);
  const totalPages = Math.max(1, Math.ceil(filteredTasks.length / ROWS_PER_PAGE));
  const visibleTasks = filteredTasks.slice((page - 1) * ROWS_PER_PAGE, page * ROWS_PER_PAGE);
  const selectedTask = tasks.find((task) => task.taskId === selectedTaskId) || filteredTasks[0] || null;

  const summary = useMemo(() => {
    const affectedHits = filteredTasks.reduce((sum, task) => sum + task.affectedCount, 0);
    const openDataHits = filteredTasks
      .filter((task) => task.openDataRelevant)
      .reduce((sum, task) => sum + task.affectedCount, 0);

    return {
      totalTasks: filteredTasks.length,
      highTasks: filteredTasks.filter((task) => task.priority === 'hoch').length,
      affectedHits,
      openDataHits,
      potential: computePotential(filteredTasks)
    };
  }, [filteredTasks]);

  useEffect(() => {
    setPage(1);
  }, [filters, context]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  useEffect(() => {
    if (selectedTaskId && !tasks.some((task) => task.taskId === selectedTaskId)) {
      setSelectedTaskId('');
    }
  }, [selectedTaskId, tasks]);

  function updateFilter(key: keyof TaskFilters, value: string) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  function resetFilters() {
    setFilters({ query: '', priority: '', type: '', impact: '' });
  }

  return (
    <>
      <section className="overview-hero">
        <h1>Datenpflegeaufgaben</h1>
        <p>Übersicht der offenen Pflegeaufgaben nach Priorität und Auswirkung.</p>
      </section>

      <section className="task-kpi-grid" aria-label="Pflegeaufgaben Kennzahlen">
        <article className="task-kpi-card">
          <span className="task-kpi-icon critical material-icons" aria-hidden="true">flag</span>
          <div>
            <span>Offene Aufgaben</span>
            <strong>{loading ? '...' : formatNumber(summary.totalTasks)}</strong>
            <small>Offene Pflegeaufgaben</small>
          </div>
        </article>
        <article className="task-kpi-card">
          <span className="task-kpi-icon critical material-icons" aria-hidden="true">priority_high</span>
          <div>
            <span>Hohe Priorität</span>
            <strong>{loading ? '...' : formatNumber(summary.highTasks)}</strong>
            <small>{summary.totalTasks ? `${formatPercent(percent(summary.highTasks, summary.totalTasks))} der Aufgaben` : '-'}</small>
          </div>
        </article>
        <article className="task-kpi-card">
          <span className="task-kpi-icon review material-icons" aria-hidden="true">groups</span>
          <div>
            <span>Betroffene Datensätze</span>
            <strong>{loading ? '...' : formatNumber(summary.affectedHits)}</strong>
            <small>Treffer in Pflegeaufgaben</small>
          </div>
        </article>
        <article className="task-kpi-card">
          <span className="task-kpi-icon good material-icons" aria-hidden="true">pie_chart</span>
          <div>
            <span>Open-Data-Relevanz</span>
            <strong>{loading ? '...' : formatPercent(percent(summary.openDataHits, summary.affectedHits))}</strong>
            <small>Der betroffenen Treffer</small>
          </div>
        </article>
        <article className="task-kpi-card">
          <span className="task-kpi-icon blue material-icons" aria-hidden="true">track_changes</span>
          <div>
            <span>Potenzial</span>
            <strong>{loading ? '...' : summary.potential}</strong>
            <small>Durch Pflege erreichbar</small>
          </div>
        </article>
      </section>

      <section className="task-filter-card" aria-label="Pflegeaufgaben filtern">
        <label className="task-search">
          <span className="sr-only">Suche in Aufgaben</span>
          <input
            type="search"
            placeholder="Suchen in Aufgaben ..."
            value={filters.query}
            onChange={(event) => updateFilter('query', event.target.value)}
          />
        </label>
        <label>
          <span className="sr-only">Priorität</span>
          <select value={filters.priority} onChange={(event) => updateFilter('priority', event.target.value)}>
            <option value="">Priorität: Alle</option>
            <option value="hoch">Priorität: Hoch</option>
            <option value="mittel">Priorität: Mittel</option>
            <option value="niedrig">Priorität: Niedrig</option>
          </select>
        </label>
        <label>
          <span className="sr-only">Datentyp</span>
          <select value={filters.type} onChange={(event) => updateFilter('type', event.target.value)}>
            <option value="">Datentyp: Alle</option>
            {DATA_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
          </select>
        </label>
        <label>
          <span className="sr-only">Auswirkung</span>
          <select value={filters.impact} onChange={(event) => updateFilter('impact', event.target.value)}>
            <option value="">Auswirkung: Alle</option>
            <option value="sehr_hoch">Auswirkung: Sehr hoch</option>
            <option value="hoch">Auswirkung: Hoch</option>
            <option value="mittel">Auswirkung: Mittel</option>
            <option value="niedrig">Auswirkung: Niedrig</option>
          </select>
        </label>
        <button className="plain-button" type="button" onClick={resetFilters}>Filter zurücksetzen</button>
      </section>

      {error ? <div className="overview-message">{error}</div> : null}

      <section className="tasks-workspace">
        <article className="panel-card tasks-table-card">
          <header className="panel-head">
            <h2>Alle Pflegeaufgaben</h2>
          </header>
          <div className="tasks-table-wrap">
            <table className="tasks-table">
              <thead>
                <tr>
                  <th>Pflegeaufgabe</th>
                  <th>Betroffene Datensätze</th>
                  <th>Priorität</th>
                  <th>Betroffene Typen</th>
                  <th>Auswirkung</th>
                  <th><span className="sr-only">Aktion</span></th>
                </tr>
              </thead>
              <tbody aria-live="polite">
                {loading ? (
                  <tr><td colSpan={6} className="table-empty">Pflegeaufgaben werden geladen ...</td></tr>
                ) : null}
                {!loading && !visibleTasks.length ? (
                  <tr><td colSpan={6} className="table-empty">Für die aktuelle Auswahl wurden keine Pflegeaufgaben gefunden.</td></tr>
                ) : null}
                {!loading && visibleTasks.map((task) => (
                  <tr key={task.taskId}>
                    <td>
                      <button
                        className={`task-table-action${selectedTask?.taskId === task.taskId ? ' active' : ''}`}
                        type="button"
                        onClick={() => setSelectedTaskId(task.taskId)}
                      >
                        <span className={`task-icon ${priorityClass(task.priority)} material-icons`} aria-hidden="true">{getTaskIcon(task.iconCriterionId)}</span>
                        <span>
                          <strong>{task.label}</strong>
                          <small>{task.description}</small>
                        </span>
                      </button>
                    </td>
                    <td><strong>{formatNumber(task.affectedCount)}</strong></td>
                    <td><span className={`status-badge ${priorityClass(task.priority)}`}>{priorityLabel(task.priority)}</span></td>
                    <td>
                      <span className="type-chip-row">
                        {task.affectedTypes.map((type) => <span key={type} className={`type-chip ${type.toLowerCase()}`}>{type}</span>)}
                      </span>
                    </td>
                    <td><span className={`status-badge ${impactClass(task.impact)}`}>{impactLabel(task.impact)}</span></td>
                    <td>
                      <Link className="row-arrow material-icons" to={buildTaskRecordsUrl(task, context.type)} aria-label={`${task.label} in Datensätzen öffnen`}>
                        chevron_right
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <footer className="table-footer">
            <span>{loading ? '-' : `${formatNumber(filteredTasks.length)} Pflegeaufgaben`}</span>
            <div className="pager" aria-label="Pflegeaufgaben Seiten">
              <button className="icon-button" type="button" aria-label="Vorherige Seite" disabled={page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>
                <span className="material-icons" aria-hidden="true">chevron_left</span>
              </button>
              <span>{page} / {totalPages}</span>
              <button className="icon-button" type="button" aria-label="Nächste Seite" disabled={page >= totalPages} onClick={() => setPage((current) => Math.min(totalPages, current + 1))}>
                <span className="material-icons" aria-hidden="true">chevron_right</span>
              </button>
            </div>
          </footer>
        </article>

        <aside className="task-side-column">
          <article className="panel-card task-detail-card">
            <header className="panel-head">
              <h2>Aufgabe im Detail</h2>
            </header>
            <div className="task-detail-content">
              {!selectedTask ? (
                <p className="empty-note">Wähle eine Pflegeaufgabe aus der Liste.</p>
              ) : (
                <>
                  <h3>{selectedTask.label}</h3>
                  <dl className="task-detail-list">
                    <dt>Problem</dt>
                    <dd>{selectedTask.problem}</dd>
                    <dt>Auswirkung</dt>
                    <dd><span className={`impact-dot ${impactClass(selectedTask.impact)}`} aria-hidden="true" />{selectedTask.impactText}</dd>
                    <dt>Nächster Schritt</dt>
                    <dd>{selectedTask.recommendation}</dd>
                    <dt>Betroffene Datentypen</dt>
                    <dd>
                      <span className="type-chip-row">
                        {selectedTask.affectedTypes.map((type) => <span key={type} className={`type-chip ${type.toLowerCase()}`}>{type}</span>)}
                      </span>
                    </dd>
                  </dl>
                  <div className="task-detail-actions">
                    <Link className="primary-action" to={buildTaskRecordsUrl(selectedTask, context.type)}>
                      Datensätze anzeigen
                      <span className="material-icons" aria-hidden="true">arrow_forward</span>
                    </Link>
                    {selectedTask.affectedTypes.length > 1 ? (
                      <div className="task-type-links" aria-label="Nach Datentyp öffnen">
                        {selectedTask.affectedTypes.map((type) => (
                          <Link key={type} className="table-link-button" to={buildTaskRecordsUrl(selectedTask, '', type)}>
                            {type}
                          </Link>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </>
              )}
            </div>
          </article>
        </aside>
      </section>

      <section className="panel-card task-type-legend" aria-label="Datentypen">
        <strong>Datentypen</strong>
        {DATA_TYPES.map((type) => (
          <span key={type}><i className={`type-dot ${type.toLowerCase()}`} />{type}</span>
        ))}
      </section>
    </>
  );
}
