import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import { DATA_TYPES } from '../../shared/config/constants';
import { formatRecordDate } from '../../shared/format/formatters';
import { qualityCriteria } from '../../shared/legacy/quality';
import { useContextStore } from '../../shared/state/context-store';
import { loadCriterionRecordsForFrontend, loadRecordsForFrontend, requestRecordMailDraftFrontend } from './records-api';
import type { RecordRow, RecordSearchMeta } from './records-types';

const PAGE_SIZE_OPTIONS = [25, 50, 100] as const;
const RECORD_LIST_STATE_KEY = 'satourn.frontend.recordListState';
const QUICK_FILTERS = [
  { id: 'license_missing', label: 'Ohne Lizenz' },
  { id: 'description_missing', label: 'Ohne Beschreibung' },
  { id: 'image_missing', label: 'Ohne Bilder' },
  { id: 'opening_hours_missing', label: 'Ohne Öffnungszeiten' }
] as const;

function buildMailtoUrl(payload: {
  to: string;
  cc?: string[];
  bcc?: string[];
  subject?: string;
  body?: string;
}) {
  const to = String(payload.to || '').trim();
  if (!to) return '';

  const params: string[] = [];
  if (payload.subject) params.push(`subject=${encodeURIComponent(String(payload.subject).slice(0, 240))}`);
  if (payload.body) params.push(`body=${encodeURIComponent(String(payload.body).slice(0, 3500))}`);
  if (Array.isArray(payload.cc) && payload.cc.length) params.push(`cc=${encodeURIComponent(payload.cc.join(','))}`);
  if (Array.isArray(payload.bcc) && payload.bcc.length) params.push(`bcc=${encodeURIComponent(payload.bcc.join(','))}`);

  const query = params.join('&');
  return query ? `mailto:${to}?${query}` : `mailto:${to}`;
}

function launchMailto(mailtoUrl: string) {
  if (!mailtoUrl) return false;
  const link = document.createElement('a');
  link.href = mailtoUrl;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  link.remove();
  return true;
}

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

function saveRecordListState(rows: RecordRow[], buildDetailUrl: (row: RecordRow) => string = (row) => row.detailUrl) {
  if (typeof window === 'undefined') return;

  try {
    window.sessionStorage.setItem(RECORD_LIST_STATE_KEY, JSON.stringify({
      backUrl: '/records',
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

export function RecordsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
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
  const [mailLoadingKey, setMailLoadingKey] = useState('');
  const urlCriterionId = searchParams.get('criterionId') || '';
  const urlType = searchParams.get('type') || '';

  const resultSummary = useMemo(() => {
    if (loading) return 'Datensätze werden geladen ...';
    if (error) return error;
    if (meta.mode === 'ai_search' && meta.prompt) return `KI-Suche: ${rows.length} Datensätze geladen`;
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

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      if (context.type && row.type !== context.type) return false;
      if (categoryFilter && row.category !== categoryFilter) return false;
      if (issueFilter && !row.missingCriteria.includes(issueFilter)) return false;
      return true;
    });
  }, [categoryFilter, context.type, issueFilter, rows]);

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

  function buildDetailUrl(row: RecordRow) {
    if (!issueFilter) return row.detailUrl;

    const criterionLabel = qualityCriteria.find((entry) => entry.id === issueFilter)?.label || row.primaryIssue || issueFilter;
    const url = new URL(row.detailUrl, 'https://satourn.local');
    url.searchParams.set('source', 'task');
    url.searchParams.set('criterion_id', issueFilter);
    url.searchParams.set('criterion_label', criterionLabel);
    return `${url.pathname}${url.search}`;
  }

  useEffect(() => {
    if (!rows.length) return;
    saveRecordListState(filteredRows, buildDetailUrl);
  }, [filteredRows, issueFilter, rows.length]);

  useEffect(() => {
    let active = true;

    async function loadCriterionFromUrl() {
      if (!urlCriterionId) return;
      if (urlType && context.type !== urlType) {
        setContext({ type: urlType as typeof context.type });
        return;
      }

      const selectedType = urlType || context.type;
      if (!selectedType) {
        setError('Für diese Pflegeaufgabe fehlt ein konkreter Datentyp.');
        return;
      }

      setLoading(true);
      setError('');
      setMode('search');
      setPage(1);
      setIssueFilter(urlCriterionId);

      try {
        const result = await loadCriterionRecordsForFrontend({
          criterionId: urlCriterionId,
          context,
          selectedType
        });
        if (!active) return;
        setRows(result.rows);
        setMeta(result.meta);
        setCategoryFilter('');
        saveRecordListState(result.rows, (row) => {
          const criterionLabel = result.meta.criterionLabel || urlCriterionId;
          const url = new URL(row.detailUrl, 'https://satourn.local');
          url.searchParams.set('source', 'task');
          url.searchParams.set('criterion_id', urlCriterionId);
          url.searchParams.set('criterion_label', criterionLabel);
          return `${url.pathname}${url.search}`;
        });
      } catch (caughtError) {
        if (!active) return;
        setRows([]);
        setMeta({
          mode: 'criterion',
          criterionId: urlCriterionId,
          estimatedTotalItems: 0,
          truncated: false
        });
        setError(caughtError instanceof Error ? caughtError.message : 'Fehlerliste konnte nicht geladen werden.');
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadCriterionFromUrl();

    return () => {
      active = false;
    };
  }, [context, setContext, urlCriterionId, urlType]);

  async function handleSubmit(nextMode: 'search' | 'ai_search') {
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
      saveRecordListState(result.rows);
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

  async function handleMailDraft(row: RecordRow) {
    if (!row.email || !row.missingCriteria.length) return;

    const key = row.globalId || row.id;
    setMailLoadingKey(key);
    setError('');

    try {
      const payload = await requestRecordMailDraftFrontend({
        row,
        selectedCriterionId: issueFilter
      });
      const mailtoUrl = buildMailtoUrl({
        to: payload.to,
        cc: payload.cc,
        bcc: payload.bcc,
        subject: payload.subject,
        body: payload.body
      });
      if (!launchMailto(mailtoUrl)) {
        throw new Error('Mailprogramm konnte nicht geöffnet werden.');
      }
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : 'Mailentwurf konnte nicht erzeugt werden.';
      setError(message);
    } finally {
      setMailLoadingKey('');
    }
  }

  function applyQuickFilter(criterionId: string) {
    setIssueFilter((current) => current === criterionId ? '' : criterionId);
    setPage(1);
  }

  function resetFilters() {
    setCategoryFilter('');
    setIssueFilter('');
    setPage(1);

    if (meta.mode === 'ai_search') {
      setMode('search');
      setMeta({
        mode: 'idle',
        estimatedTotalItems: 0,
        truncated: false
      });
      setRows([]);
      setQuery('');
    }

    if (meta.mode === 'criterion') {
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

  function exportCsv() {
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
                if (event.key === 'Enter') void handleSubmit('search');
              }}
            />
          </label>
          <div className="record-search-actions">
            <button className="context-edit" type="button" disabled={loading} onClick={() => void handleSubmit('search')}>
              {loading && mode === 'search' ? 'Sucht ...' : 'Suchen'}
            </button>
            <button className="plain-button icon-text-button" type="button" disabled={loading} onClick={() => void handleSubmit('ai_search')}>
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

        <button className="plain-button" type="button" onClick={resetFilters}>
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
              onClick={() => applyQuickFilter(filter.id)}
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
          <button className="context-edit icon-text-button" type="button" disabled={!filteredRows.length} onClick={exportCsv}>
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
                      <button
                        type="button"
                        className="table-link-button"
                        disabled={!row.email || !row.missingCriteria.length || mailLoadingKey === (row.globalId || row.id)}
                        onClick={() => void handleMailDraft(row)}
                      >
                        {mailLoadingKey === (row.globalId || row.id) ? 'Lädt ...' : 'E-Mail'}
                      </button>
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
