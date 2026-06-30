import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';

import { DATA_TYPES } from '../../shared/config/constants';
import { formatRecordDate } from '../../shared/format/formatters';
import { qualityCriteria } from '../../shared/legacy/quality';
import { useContextStore } from '../../shared/state/context-store';
import {
  loadCriterionRecordsForFrontend,
  loadNonOpenDataRecordsForFrontend,
  loadRecordsForFrontend
} from './records-api';
import type { RecordRow, RecordSearchMeta } from './records-types';

const PAGE_SIZE_OPTIONS = [25, 50, 100] as const;
const RECORD_LIST_STATE_KEY = 'satourn.frontend.recordListState';
const QUICK_FILTERS = [
  { id: 'license_missing', label: 'Ohne Lizenz' },
  { id: 'description_missing', label: 'Ohne Beschreibung' },
  { id: 'image_missing', label: 'Ohne Bilder' },
  { id: 'opening_hours_missing', label: 'Ohne Öffnungszeiten' }
] as const;
const DATA_TYPE_SET = new Set<string>(DATA_TYPES);

function downloadText(filename: string, text: string, mimeType: string) {
  const blob = new Blob([text], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function csvValue(value: unknown) {
  const text = String(value ?? '').replace(/\r?\n/g, ' ').trim();
  return `"${text.replace(/"/g, '""')}"`;
}

function getStatusClass(status: string) {
  if (status === 'gut') return 'good';
  if (status === 'kritisch') return 'critical';
  if (status === 'pruefen' || status === 'prüfen') return 'review';
  return 'muted';
}

function buildRecordsCsv(rows: RecordRow[]) {
  const header = [
    'Titel',
    'Typ',
    'Ort',
    'Gebiet',
    'Kategorie',
    'Status',
    'Score',
    'Hauptproblem',
    'Fehlende Kriterien',
    'ID',
    'global_id',
    'E-Mail',
    'Website'
  ];

  const body = rows.map((row) => [
    row.title,
    row.type,
    row.city,
    row.region,
    row.category,
    row.qualityStatus,
    row.qualityScore ?? '',
    row.primaryIssue,
    row.missingCriteria.join(', '),
    row.id,
    row.globalId,
    row.email,
    row.web
  ]);

  return [header, ...body].map((line) => line.map(csvValue).join(';')).join('\n');
}

function saveRecordListState(
  rows: RecordRow[],
  backUrl: string,
  buildDetailUrl: (row: RecordRow) => string = (row) => row.detailUrl
) {
  if (typeof window === 'undefined') return;

  try {
    window.sessionStorage.setItem(RECORD_LIST_STATE_KEY, JSON.stringify({
      backUrl: backUrl || '/records',
      rows: rows.map((row) => ({
        id: row.id,
        globalId: row.globalId,
        type: row.type,
        title: row.title,
        detailUrl: buildDetailUrl(row)
      }))
    }));
  } catch {
    // sessionStorage is an optional navigation enhancement.
  }
}

function splitUniqueValues(value: string) {
  return Array.from(new Set(
    value
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean)
  ));
}

function parseSelectedTypes(value: string) {
  return splitUniqueValues(value).filter((entry) => DATA_TYPE_SET.has(entry));
}

function shouldResetLoadedRows(mode: RecordSearchMeta['mode']) {
  return mode === 'ai_search' || mode === 'criterion' || mode === 'non_open_data';
}

function buildTaskAwareDetailUrl(
  row: RecordRow,
  criterionId: string,
  criterionLabel: string
) {
  const url = new URL(row.detailUrl, 'https://satourn.local');
  url.searchParams.set('source', 'task');
  url.searchParams.set('criterion_id', criterionId);
  url.searchParams.set('criterion_label', criterionLabel);
  return `${url.pathname}${url.search}`;
}

export function RecordsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const { context, setContext } = useContextStore();
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState<'search' | 'ai_search'>('search');
  const [rows, setRows] = useState<RecordRow[]>([]);
  const [meta, setMeta] = useState<RecordSearchMeta>({
    mode: 'idle',
    estimatedTotalItems: 0,
    truncated: false
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [issueFilter, setIssueFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(25);
  const urlCriterionId = searchParams.get('criterionId') || '';
  const urlCriterionIdsParam = searchParams.get('criterionIds') || '';
  const urlTypesParam = searchParams.get('types') || '';
  const urlListMode = searchParams.get('list') || '';
  const urlCriterionIds = useMemo(() => splitUniqueValues(urlCriterionIdsParam), [urlCriterionIdsParam]);
  const urlType = searchParams.get('type') || '';
  const urlTypes = useMemo(() => parseSelectedTypes(urlTypesParam), [urlTypesParam]);

  const resultSummary = useMemo(() => {
    if (loading) return 'Datensätze werden geladen ...';
    if (error) return error;
    if (meta.mode === 'ai_search' && meta.prompt) return `KI-Suche: ${rows.length} Datensätze geladen`;
    if (meta.mode === 'non_open_data') return `Nicht Open-Data-fähig: ${rows.length} Datensätze geladen`;
    if (meta.mode === 'criterion') return `Gefiltert nach Pflegeaufgabe: ${meta.criterionLabel || meta.criterionId || 'Auswahl'} - ${rows.length} Datensätze geladen`;
    if (!rows.length) return 'Noch keine Datensätze geladen.';
    const extra = meta.truncated ? ' - Ergebnisliste gekürzt' : '';
    return `${rows.length} Datensätze geladen${extra}`;
  }, [error, loading, meta, rows.length]);

  const categories = useMemo(() => {
    return Array.from(new Set(rows.map((row) => row.category).filter(Boolean))).sort((left, right) => left.localeCompare(right, 'de'));
  }, [rows]);

  const issues = useMemo(() => {
    return Array.from(new Set(rows.flatMap((row) => row.missingCriteria)))
      .map((criterionId) => ({
        id: criterionId,
        label: qualityCriteria.find((entry) => entry.id === criterionId)?.label || criterionId
      }))
      .sort((left, right) => left.label.localeCompare(right.label, 'de'));
  }, [rows]);

  const activeTypeFilter = urlCriterionId
    ? urlType
    : context.type;

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      if (activeTypeFilter && row.type !== activeTypeFilter) return false;
      if (categoryFilter && row.category !== categoryFilter) return false;
      if (issueFilter && !row.missingCriteria.includes(issueFilter)) return false;
      return true;
    });
  }, [activeTypeFilter, categoryFilter, issueFilter, rows]);

  const quickCounts = useMemo(() => {
    return Object.fromEntries(
      QUICK_FILTERS.map((filter) => [
        filter.id,
        rows.filter((row) => row.missingCriteria.includes(filter.id)).length
      ])
    ) as Record<(typeof QUICK_FILTERS)[number]['id'], number>;
  }, [rows]);

  const pageCount = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const currentPage = Math.min(page, pageCount);

  const pagedRows = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredRows.slice(startIndex, startIndex + pageSize);
  }, [currentPage, filteredRows, pageSize]);

  const pageRangeText = useMemo(() => {
    if (!filteredRows.length) return '0 Datensätze';
    const startIndex = (currentPage - 1) * pageSize + 1;
    const endIndex = Math.min(filteredRows.length, currentPage * pageSize);
    return `${startIndex}-${endIndex} von ${filteredRows.length}`;
  }, [currentPage, filteredRows.length, pageSize]);

  const activeUrlCriterionIds = useMemo(() => {
    if (urlCriterionIds.length) return urlCriterionIds;
    return urlCriterionId ? [urlCriterionId] : [];
  }, [urlCriterionId, urlCriterionIds]);
  const currentListUrl = `${location.pathname}${location.search}`;

  function resolveRowCriterionId(row: RecordRow) {
    if (issueFilter && row.missingCriteria.includes(issueFilter)) return issueFilter;
    return activeUrlCriterionIds.find((criterionId) => row.missingCriteria.includes(criterionId)) || '';
  }

  function buildDetailUrl(row: RecordRow) {
    const rowCriterionId = resolveRowCriterionId(row);
    if (!rowCriterionId) return row.detailUrl;

    const criterionLabel = qualityCriteria.find((entry) => entry.id === rowCriterionId)?.label || row.primaryIssue || rowCriterionId;
    return buildTaskAwareDetailUrl(row, rowCriterionId, criterionLabel);
  }

  useEffect(() => {
    if (!rows.length) return;
    // Detail pages need the current filtered list for "previous/next" navigation.
    saveRecordListState(filteredRows, currentListUrl, buildDetailUrl);
  }, [currentListUrl, filteredRows, issueFilter, rows.length]);

  useEffect(() => {
    let active = true;

    async function loadRequestedRecordList() {
      if (!urlCriterionId && urlListMode !== 'non_open_data') return;

      const selectedTypes = urlTypes.length
        ? urlTypes
        : [urlType].filter((entry) => DATA_TYPE_SET.has(entry));
      if (urlType && !DATA_TYPE_SET.has(urlType)) {
        setError('Für diese Pflegeaufgabe fehlt ein konkreter Datentyp.');
        return;
      }

      setLoading(true);
      setError('');
      setMode('search');
      setPage(1);
      setIssueFilter('');

      try {
        const result = urlListMode === 'non_open_data'
          ? await loadNonOpenDataRecordsForFrontend({
            context,
            selectedTypes: selectedTypes.length ? selectedTypes : (context.type ? [context.type] : [])
          })
          : await loadCriterionRecordsForFrontend({
            criterionId: urlCriterionId,
            criterionIds: urlCriterionIds,
            context,
            selectedType: selectedTypes[0] || '',
            selectedTypes
          });
        if (!active) return;
        setRows(result.rows);
        setMeta(result.meta);
        setCategoryFilter('');
        saveRecordListState(result.rows, currentListUrl, (row) => {
          const rowCriterionId = urlListMode === 'non_open_data'
            ? (row.missingCriteria.includes('license_missing') ? 'license_missing' : '')
            : activeUrlCriterionIds.find((criterionId) => row.missingCriteria.includes(criterionId)) || urlCriterionId;
          if (rowCriterionId) {
            const criterionLabel = qualityCriteria.find((entry) => entry.id === rowCriterionId)?.label || result.meta.criterionLabel || rowCriterionId;
            return buildTaskAwareDetailUrl(row, rowCriterionId, criterionLabel);
          }
          return row.detailUrl;
        });
      } catch (caughtError) {
        if (!active) return;
        setRows([]);
        setMeta({
          mode: urlListMode === 'non_open_data' ? 'non_open_data' : 'criterion',
          criterionId: urlCriterionId,
          estimatedTotalItems: 0,
          truncated: false
        });
        setError(caughtError instanceof Error ? caughtError.message : 'Fehlerliste konnte nicht geladen werden.');
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadRequestedRecordList();

    return () => {
      active = false;
    };
  }, [
    activeUrlCriterionIds,
    context.area,
    context.city,
    context.type,
    currentListUrl,
    urlListMode,
    urlCriterionId,
    urlCriterionIds,
    urlType,
    urlTypes
  ]);

  async function runRecordSearch(nextMode: 'search' | 'ai_search') {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) {
      setError(nextMode === 'ai_search' ? 'Bitte gib zuerst eine KI-Suchanfrage ein.' : 'Bitte gib zuerst eine Suchanfrage ein.');
      return;
    }

    setLoading(true);
    setError('');
    setMode(nextMode);
    setPage(1);

    try {
      const result = await loadRecordsForFrontend({
        mode: nextMode,
        query: trimmedQuery,
        context,
        selectedType: context.type
      });
      saveRecordListState(result.rows, currentListUrl);
      setRows(result.rows);
      setMeta(result.meta);
      setCategoryFilter('');
      setIssueFilter('');
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : 'Datensätze konnten nicht geladen werden.';
      setRows([]);
      setMeta({
        mode: nextMode,
        prompt: nextMode === 'ai_search' ? trimmedQuery : undefined,
        estimatedTotalItems: 0,
        truncated: false
      });
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  function toggleQuickCriterionFilter(criterionId: string) {
    setIssueFilter((current) => current === criterionId ? '' : criterionId);
    setPage(1);
  }

  function resetRecordFilters() {
    setCategoryFilter('');
    setIssueFilter('');
    setPage(1);

    if (meta.mode === 'ai_search') {
      setQuery('');
    }

    if (shouldResetLoadedRows(meta.mode)) {
      setSearchParams({});
      setMode('search');
      setMeta({
        mode: 'idle',
        estimatedTotalItems: 0,
        truncated: false
      });
      setRows([]);
    }
  }

  function exportFilteredRowsAsCsv() {
    if (!filteredRows.length) return;
    const csv = `\uFEFF${buildRecordsCsv(filteredRows)}`;
    downloadText('satourn_datensaetze.csv', csv, 'text/csv;charset=utf-8');
  }

  return (
    <>
      <section className="overview-hero">
        <h1>Datensätze</h1>
        <p>Suche und prüfe einzelne Datensätze oder arbeite gefilterte Listen ab.</p>
      </section>

      <section className="record-filter-card" aria-label="Datensätze suchen und filtern">
        <div className="record-search-block">
          <label className="record-search-field">
            <span className="sr-only">Datensatz suchen</span>
            <input
              type="search"
              value={query}
              placeholder="Suche nach Titel, ID, global_id, Ort, Kategorie oder Problem ..."
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') void runRecordSearch('search');
              }}
            />
          </label>
          <div className="record-search-actions">
            <button className="context-edit" type="button" disabled={loading} onClick={() => void runRecordSearch('search')}>
              {loading && mode === 'search' ? 'Sucht ...' : 'Suchen'}
            </button>
            <button className="plain-button icon-text-button" type="button" disabled={loading} onClick={() => void runRecordSearch('ai_search')}>
              <span className="material-icons" aria-hidden="true">auto_awesome</span>
              {loading && mode === 'ai_search' ? 'KI sucht ...' : 'AI-Search'}
            </button>
          </div>
          <small>Du kannst auch direkt eine ID oder global_id eingeben.</small>
        </div>

        <label>
          <span>Typ</span>
          <select value={context.type} onChange={(event) => setContext({ type: event.target.value as typeof context.type })}>
            <option value="">Typ: Alle</option>
            {DATA_TYPES.map((type) => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </label>

        <label>
          <span>Kategorie</span>
          <select value={categoryFilter} onChange={(event) => {
            setCategoryFilter(event.target.value);
            setPage(1);
          }}>
            <option value="">Kategorie: Alle</option>
            {categories.map((category) => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
        </label>

        <label>
          <span>Problem / Kriterium</span>
          <select value={issueFilter} onChange={(event) => {
            setIssueFilter(event.target.value);
            setPage(1);
          }}>
            <option value="">Problem / Kriterium: Alle</option>
            {issues.map((issue) => (
              <option key={issue.id} value={issue.id}>{issue.label}</option>
            ))}
          </select>
        </label>

        <button className="plain-button" type="button" onClick={resetRecordFilters}>
          Filter zurücksetzen
        </button>

        <div className="quick-filter-row" aria-label="Schnellfilter">
          <strong>Schnellfilter:</strong>
          {QUICK_FILTERS.map((filter) => (
            <button
              key={filter.id}
              className={`quick-filter-button${issueFilter === filter.id ? ' active' : ''}`}
              type="button"
              disabled={!rows.length}
              onClick={() => toggleQuickCriterionFilter(filter.id)}
            >
              {filter.label} <span>{quickCounts[filter.id]}</span>
            </button>
          ))}
        </div>

        {meta.mode === 'ai_search' && meta.prompt ? (
          <div className="overview-message record-mode-message">
            KI-Suche aktiv: {meta.prompt}
          </div>
        ) : null}
      </section>

      {error ? <div className="overview-message">{error}</div> : null}

      <section className="record-result-head">
        <p>{resultSummary}</p>
        <div className="record-actions">
          <button className="context-edit icon-text-button" type="button" disabled={!filteredRows.length} onClick={exportFilteredRowsAsCsv}>
            <span className="material-icons" aria-hidden="true">file_download</span>
            CSV exportieren
          </button>
        </div>
      </section>

      <section className="panel-card records-table-card">
        <div className="tasks-table-wrap">
          <table className="records-main-table">
            <thead>
              <tr>
                <th>Titel</th>
                <th>Typ</th>
                <th>Ort / Gebiet</th>
                <th>Kategorie</th>
                <th>Status</th>
                <th>Score</th>
                <th>Hauptproblem</th>
                <th>Aktualisiert</th>
                <th>Aktionen</th>
              </tr>
            </thead>
            <tbody>
              {!pagedRows.length ? (
                <tr>
                  <td colSpan={9} className="table-empty">
                    {loading ? <span className="loading-line">Datensätze werden geladen ...</span> : 'Keine Datensätze geladen.'}
                  </td>
                </tr>
              ) : pagedRows.map((row) => (
                <tr key={row.globalId || `${row.type}:${row.id}`}>
                  <td>
                    <Link className="table-title-link" to={buildDetailUrl(row)}>
                      {row.title}
                    </Link>
                    <small>{row.globalId || row.id}</small>
                  </td>
                  <td>{row.type || '-'}</td>
                  <td>{[row.city, row.region].filter(Boolean).join(' / ') || '-'}</td>
                  <td>{row.category || '-'}</td>
                  <td>
                    <span className={`status-badge ${getStatusClass(row.qualityStatus)}`}>
                      {row.qualityStatus || 'nicht berechenbar'}
                    </span>
                  </td>
                  <td>{row.qualityScore ?? '-'}</td>
                  <td>{row.primaryIssue || '-'}</td>
                  <td>{formatRecordDate(row.updatedAt)}</td>
                  <td>
                    <div className="table-actions">
                      <Link className="table-link-button" to={buildDetailUrl(row)}>
                        Detail
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <footer className="table-footer record-table-footer">
          <span>{pageRangeText}</span>
          <label>
            <span className="sr-only">Datensätze pro Seite</span>
            <select value={pageSize} onChange={(event) => {
              setPageSize(Number(event.target.value));
              setPage(1);
            }}>
              {PAGE_SIZE_OPTIONS.map((size) => (
                <option key={size} value={size}>{size} pro Seite</option>
              ))}
            </select>
          </label>
          <div className="pager" aria-label="Datensatz Seiten">
            <button className="icon-button" type="button" aria-label="Vorherige Seite" disabled={currentPage <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>
              <span className="material-icons" aria-hidden="true">chevron_left</span>
            </button>
            <span>{currentPage} / {pageCount}</span>
            <button className="icon-button" type="button" aria-label="Nächste Seite" disabled={currentPage >= pageCount} onClick={() => setPage((value) => Math.min(pageCount, value + 1))}>
              <span className="material-icons" aria-hidden="true">chevron_right</span>
            </button>
          </div>
        </footer>
      </section>
    </>
  );
}
