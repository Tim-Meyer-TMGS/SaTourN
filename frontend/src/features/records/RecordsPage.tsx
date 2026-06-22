import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { qualityCriteria } from '../../../../Statistik/quality.js';
import { AREAS, DATA_TYPES } from '../../shared/config/constants';
import { useContextStore } from '../../shared/state/context-store';
import { loadRecordsForFrontend, requestRecordMailDraftFrontend } from './records-api';
import type { RecordRow, RecordSearchMeta } from './records-types';

const PAGE_SIZE_OPTIONS = [10, 25, 50] as const;

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

export function RecordsPage() {
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
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [issueFilter, setIssueFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(25);
  const [mailLoadingKey, setMailLoadingKey] = useState('');

  const resultSummary = useMemo(() => {
    if (loading) return 'Datensätze werden geladen ...';
    if (error) return error;
    if (meta.mode === 'ai_search' && meta.prompt) return `KI-Suche: ${rows.length} Datensätze geladen`;
    if (!rows.length) return 'Noch keine Datensätze geladen.';
    const extra = meta.truncated ? ' – Ergebnisliste gekürzt' : '';
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
      if (statusFilter && row.qualityStatus !== statusFilter) return false;
      if (categoryFilter && row.category !== categoryFilter) return false;
      if (issueFilter && !row.missingCriteria.includes(issueFilter)) return false;
      return true;
    });
  }, [categoryFilter, context.type, issueFilter, rows, statusFilter]);

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
    return `${startIndex}–${endIndex} von ${filteredRows.length}`;
  }, [currentPage, filteredRows.length, pageSize]);

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
      setRows(result.rows);
      setMeta(result.meta);
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

  function resetFilters() {
    setStatusFilter('');
    setCategoryFilter('');
    setIssueFilter('');
    setPage(1);
  }

  return (
    <section className="content-panel">
      <header className="panel-header">
        <div>
          <h1>Datensätze</h1>
          <p>Erste Pilotseite für Suche, KI-Suche, Kontextbezug, Filter, Paging und Ergebnislisten gegen den bestehenden Proxy.</p>
        </div>
        <span className="status-chip">Pilotseite</span>
      </header>

      <div className="records-grid">
        <section className="placeholder-block">
          <h2>Arbeitskontext</h2>

          <div className="form-grid">
            <label className="field-block">
              <span>Gebiet</span>
              <select
                value={context.area}
                onChange={(event) => setContext({ area: event.target.value })}
              >
                {AREAS.map(([label, value]) => (
                  <option key={value || 'all'} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>

            <label className="field-block">
              <span>Ort</span>
              <input
                type="text"
                value={context.city}
                placeholder="Alle Orte"
                onChange={(event) => setContext({ city: event.target.value })}
              />
            </label>

            <label className="field-block">
              <span>Datentyp</span>
              <select
                value={context.type}
                onChange={(event) => setContext({ type: event.target.value as typeof context.type })}
              >
                <option value="">Alle Datentypen</option>
                {DATA_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </section>

        <section className="placeholder-block">
          <h2>Suche</h2>
          <div className="form-grid single-column">
            <label className="field-block">
              <span>{mode === 'ai_search' ? 'KI-Suchanfrage' : 'Suchanfrage'}</span>
              <textarea
                rows={mode === 'ai_search' ? 4 : 2}
                value={query}
                placeholder={mode === 'ai_search'
                  ? 'z. B. Museen in Sachsen oder Wanderwege mit Hund'
                  : 'Titel, ID, global_id, Ort, Kategorie oder Problem'}
                onChange={(event) => setQuery(event.target.value)}
              />
            </label>

            <div className="button-row">
              <button
                type="button"
                className="action-button primary"
                onClick={() => void handleSubmit('search')}
                disabled={loading}
              >
                {loading && mode === 'search' ? 'Suche läuft ...' : 'Suchen'}
              </button>
              <button
                type="button"
                className="action-button secondary"
                onClick={() => void handleSubmit('ai_search')}
                disabled={loading}
              >
                {loading && mode === 'ai_search' ? 'KI-Suche läuft ...' : 'AI-Search'}
              </button>
            </div>
          </div>
        </section>

        <section className="placeholder-block">
          <h2>Filter und Seite</h2>
          <div className="form-grid">
            <label className="field-block">
              <span>Status</span>
              <select
                value={statusFilter}
                onChange={(event) => {
                  setStatusFilter(event.target.value);
                  setPage(1);
                }}
              >
                <option value="">Alle Status</option>
                <option value="gut">Gut</option>
                <option value="pruefen">Prüfen</option>
                <option value="kritisch">Kritisch</option>
                <option value="nicht berechenbar">Nicht berechenbar</option>
              </select>
            </label>

            <label className="field-block">
              <span>Kategorie</span>
              <select
                value={categoryFilter}
                onChange={(event) => {
                  setCategoryFilter(event.target.value);
                  setPage(1);
                }}
              >
                <option value="">Alle Kategorien</option>
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </label>

            <label className="field-block">
              <span>Problem</span>
              <select
                value={issueFilter}
                onChange={(event) => {
                  setIssueFilter(event.target.value);
                  setPage(1);
                }}
              >
                <option value="">Alle Probleme</option>
                {issues.map((issue) => (
                  <option key={issue.id} value={issue.id}>
                    {issue.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="field-block">
              <span>Pro Seite</span>
              <select
                value={pageSize}
                onChange={(event) => {
                  setPageSize(Number(event.target.value));
                  setPage(1);
                }}
              >
                {PAGE_SIZE_OPTIONS.map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="button-row">
            <button type="button" className="action-button secondary" onClick={resetFilters}>
              Filter zurücksetzen
            </button>
          </div>
        </section>
      </div>

      <section className="records-results">
        <div className="records-toolbar">
          <strong>{resultSummary}</strong>
          <div className="toolbar-meta">
            <span className="page-range-text">{pageRangeText}</span>
            {meta.mode === 'ai_search' && meta.prompt ? (
              <span className="status-chip subtle">KI-Suche aktiv: {meta.prompt}</span>
            ) : null}
          </div>
        </div>

        <div className="table-wrap">
          <table className="records-table">
            <thead>
              <tr>
                <th>Titel</th>
                <th>Typ</th>
                <th>Ort / Gebiet</th>
                <th>Kategorie</th>
                <th>Status</th>
                <th>Score</th>
                <th>Hauptproblem</th>
                <th>Aktionen</th>
              </tr>
            </thead>
            <tbody>
              {!pagedRows.length ? (
                <tr>
                  <td colSpan={8} className="table-empty">
                    {loading ? 'Datensätze werden geladen ...' : 'Keine Datensätze geladen.'}
                  </td>
                </tr>
              ) : pagedRows.map((row) => (
                <tr key={row.globalId || `${row.type}:${row.id}`}>
                  <td>
                    <Link className="table-title-link" to={row.detailUrl}>
                      {row.title}
                    </Link>
                  </td>
                  <td>{row.type || '-'}</td>
                  <td>{[row.city, row.region].filter(Boolean).join(' / ') || '-'}</td>
                  <td>{row.category || '-'}</td>
                  <td>{row.qualityStatus || 'nicht berechenbar'}</td>
                  <td>{row.qualityScore ?? '-'}</td>
                  <td>{row.primaryIssue || '-'}</td>
                  <td>
                    <div className="table-actions">
                      <Link className="table-link-button" to={row.detailUrl}>
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

        <div className="pagination-bar">
          <button
            type="button"
            className="action-button secondary"
            disabled={currentPage <= 1}
            onClick={() => setPage((value) => Math.max(1, value - 1))}
          >
            Zurück
          </button>
          <span className="page-status">
            Seite {currentPage} / {pageCount}
          </span>
          <button
            type="button"
            className="action-button secondary"
            disabled={currentPage >= pageCount}
            onClick={() => setPage((value) => Math.min(pageCount, value + 1))}
          >
            Weiter
          </button>
        </div>
      </section>
    </section>
  );
}
