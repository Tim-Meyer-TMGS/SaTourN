import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';

import { DATA_TYPES } from '../../shared/config/constants';
import { getQualityCriterionLabel } from '../../shared/quality/quality-criteria';
import { buildTaskAwareRecordDetailUrl } from '../../shared/records/record-list-links';
import { useContextStore } from '../../shared/state/context-store';
import { InlineLoading, LoadingLine } from '../../shared/ui/LoadingIndicators';
import { loadRecordFilterOptions, loadRecordsForFrontend, loadRecordsPageForFrontend } from './records-api';
import { readRecordsQuery, updateRecordsQuery } from './records-query-state';
import type { RecordRow, RecordSearchMeta, RecordsQuery } from './records-types';

const PAGE_SIZE_OPTIONS = [25, 50, 100] as const;
const RECORD_LIST_STATE_KEY = 'satourn.frontend.recordListState';
const QUICK_FILTERS = [
  { id: 'license_missing', label: 'Ohne Lizenz' },
  { id: 'description_missing', label: 'Ohne Beschreibung' },
  { id: 'image_missing', label: 'Ohne Bilder' },
  { id: 'opening_hours_missing', label: 'Ohne Öffnungszeiten' }
] as const;

function statusClass(status: string) {
  if (status === 'gut') return 'good';
  if (status === 'kritisch') return 'critical';
  if (/pr(?:ue|ü)fen/.test(status)) return 'review';
  return 'muted';
}

function saveListState(rows: RecordRow[], backUrl: string, detailUrl: (row: RecordRow) => string) {
  try {
    window.sessionStorage.setItem(RECORD_LIST_STATE_KEY, JSON.stringify({
      backUrl,
      rows: rows.map((row) => ({ id: row.id, globalId: row.globalId, type: row.type, title: row.title, detailUrl: detailUrl(row) }))
    }));
  } catch {
    // Previous/next navigation remains optional. The filter state lives in the URL.
  }
}

function csvValue(value: unknown) {
  return `"${String(value ?? '').replace(/\r?\n/g, ' ').replace(/"/g, '""').trim()}"`;
}

function exportCsv(rows: RecordRow[]) {
  const fields = [['Titel', 'Typ', 'Ort', 'Gebiet', 'Kategorie', 'DQ-Wert', 'Qualitätsstatus'], ...rows.map((row) => [
    row.title, row.type, row.city, row.region, row.category, row.qualityScore ?? '', row.qualityStatus
  ])];
  const blob = new Blob([`\uFEFF${fields.map((line) => line.map(csvValue).join(';')).join('\n')}`], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'satourn_datensaetze.csv';
  link.click();
  URL.revokeObjectURL(url);
}

export function RecordsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const { context } = useContextStore();
  const state = useMemo(() => readRecordsQuery(searchParams), [searchParams]);
  const [draftQuery, setDraftQuery] = useState(state.q);
  const [rows, setRows] = useState<RecordRow[]>([]);
  const [meta, setMeta] = useState<RecordSearchMeta>({ mode: 'idle', estimatedTotalItems: 0, truncated: false });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [filterOptions, setFilterOptions] = useState<{ categories: string[]; authorships: string[]; criterionIds: string[] }>({ categories: [], authorships: [], criterionIds: [] });
  const currentListUrl = `${location.pathname}${location.search}`;

  const setQueryState = (patch: Partial<RecordsQuery>, resetPage = true) => {
    setSearchParams(updateRecordsQuery(searchParams, resetPage ? { ...patch, page: 1 } : patch));
  };

  useEffect(() => setDraftQuery(state.q), [state.q]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    const request = state.mode === 'ai_search' && state.q
      ? loadRecordsForFrontend({ mode: 'ai_search', query: state.q, context, selectedType: state.types[0] || '', page: state.page, pageSize: state.pageSize })
      : loadRecordsPageForFrontend(state, context);
    request.then((result) => {
      if (!active) return;
      setRows(result.rows);
      setMeta(result.meta);
    }).catch((requestError) => {
      if (!active) return;
      console.error('Datensätze konnten nicht geladen werden.', requestError);
      setRows([]);
      setMeta({ mode: 'search', estimatedTotalItems: 0, totalItems: 0, totalPages: 0, truncated: false });
      setError('Die Datensätze konnten nicht geladen werden.');
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [context.area, context.city, state]);

  useEffect(() => {
    let active = true;
    loadRecordFilterOptions(state, context).then((result) => { if (active) setFilterOptions(result); }).catch((requestError) => console.error('Filteroptionen konnten nicht geladen werden.', requestError));
    return () => { active = false; };
  }, [context.area, context.city, state.types.join(',')]);

  const categories = useMemo(() => Array.from(new Set([...state.categories, ...filterOptions.categories])).sort((a, b) => a.localeCompare(b, 'de')), [filterOptions.categories, state.categories]);
  const authorships = useMemo(() => Array.from(new Set([...state.authorships, ...filterOptions.authorships])).sort((a, b) => a.localeCompare(b, 'de')), [filterOptions.authorships, state.authorships]);
  const issues = useMemo(() => Array.from(new Set([...state.criterionIds, ...filterOptions.criterionIds])).map((id) => ({ id, label: getQualityCriterionLabel(id) })).sort((a, b) => a.label.localeCompare(b.label, 'de')), [filterOptions.criterionIds, state.criterionIds]);
  const totalItems = meta.totalItems ?? meta.estimatedTotalItems;
  const totalPages = Math.max(1, meta.totalPages ?? Math.ceil(totalItems / state.pageSize));
  const start = rows.length ? (state.page - 1) * state.pageSize + 1 : 0;
  const end = rows.length ? start + rows.length - 1 : 0;

  function detailUrl(row: RecordRow) {
    const criterionId = state.criterionIds.find((value) => row.missingCriteria.includes(value));
    return criterionId ? buildTaskAwareRecordDetailUrl(row.detailUrl, criterionId, getQualityCriterionLabel(criterionId)) : row.detailUrl;
  }

  useEffect(() => {
    if (rows.length) saveListState(rows, currentListUrl, detailUrl);
  }, [currentListUrl, rows]);

  function submit(mode: RecordsQuery['mode']) {
    if (mode === 'ai_search' && !draftQuery.trim()) {
      setError('Gib eine Suchanfrage ein.');
      return;
    }
    setQueryState({ q: draftQuery.trim(), mode });
  }

  const taskContext = Boolean(searchParams.get('criterionId') || searchParams.get('criterionIds'));

  return <>
    <section className="overview-hero"><h1>Datensätze</h1><p>Datensätze suchen, filtern und prüfen.</p></section>

    <section className="record-filter-card" aria-label="Datensätze suchen und filtern">
      <div className="record-search-block">
        <label className="record-search-field"><span>Suche</span><input type="search" value={draftQuery} placeholder="Titel, ID oder Ort" onChange={(event) => setDraftQuery(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') submit('search'); }} /></label>
        <div className="record-search-actions"><button className="primary" type="button" disabled={loading} onClick={() => submit('search')}>{loading && state.mode === 'search' ? <InlineLoading>Sucht</InlineLoading> : 'Suchen'}</button><button type="button" disabled={loading} onClick={() => submit('ai_search')}><span className="material-icons" aria-hidden="true">auto_awesome</span> KI-Suche</button></div>
      </div>
      <label><span>Datentyp</span><select value={state.types[0] || ''} onChange={(event) => setQueryState({ types: event.target.value ? [event.target.value] : [] })}><option value="">Alle Datentypen</option>{DATA_TYPES.map((type) => <option key={type}>{type}</option>)}</select></label>
      <label><span>Kategorie</span><select value={state.categories[0] || ''} onChange={(event) => setQueryState({ categories: event.target.value ? [event.target.value] : [] })}><option value="">Alle Kategorien</option>{categories.map((category) => <option key={category}>{category}</option>)}</select></label>
      <label><span>Autorschaft</span><select value={state.authorships[0] || ''} onChange={(event) => setQueryState({ authorships: event.target.value ? [event.target.value] : [] })}><option value="">Alle Autorschaften</option>{authorships.map((value) => <option key={value}>{value}</option>)}</select></label>
      <label><span>Qualitätskriterium</span><select value={state.criterionIds[0] || ''} onChange={(event) => setQueryState({ criterionIds: event.target.value ? [event.target.value] : [] })}><option value="">Alle Kriterien</option>{issues.map((issue) => <option key={issue.id} value={issue.id}>{issue.label}</option>)}</select></label>
      <button type="button" onClick={() => { setDraftQuery(''); setSearchParams({}); }}>Filter zurücksetzen</button>
      <div className="quick-filter-row" aria-label="Schnellfilter"><strong>Schnellfilter</strong>{QUICK_FILTERS.map((filter) => <button key={filter.id} className={state.criterionIds.includes(filter.id) ? 'quick-filter-button active' : 'quick-filter-button'} type="button" onClick={() => setQueryState({ criterionIds: state.criterionIds.includes(filter.id) ? [] : [filter.id] })}>{filter.label}</button>)}</div>
      {taskContext ? <p className="record-mode-message">Pflegeaufgabenfilter aktiv</p> : null}
    </section>

    {error ? <p className="overview-message" role="alert">{error}</p> : null}
    <section className="record-result-head"><p>{loading ? <InlineLoading>Datensätze werden geladen</InlineLoading> : `${totalItems} Datensätze`}</p><button type="button" disabled={!rows.length} onClick={() => exportCsv(rows)}>CSV exportieren</button></section>
    <section className="panel-card records-table-card">
      <div className="tasks-table-wrap"><table className="records-main-table"><thead><tr><th>Titel</th><th>Typ</th><th>Ort / Gebiet</th><th>DQ-Wert</th><th>Offener Prüfpunkt</th><th><span className="sr-only">Aktion</span></th></tr></thead><tbody aria-live="polite">{!rows.length ? <tr><td colSpan={6} className="table-empty">{loading ? <LoadingLine>Datensätze werden geladen</LoadingLine> : 'Keine Datensätze gefunden.'}</td></tr> : rows.map((row) => <tr key={row.globalId || `${row.type}:${row.id}`}><td><Link className="table-title-link" to={detailUrl(row)}>{row.title}</Link></td><td>{row.type || '–'}</td><td>{[row.city, row.region].filter(Boolean).join(' / ') || '–'}</td><td><span className={`status-badge ${statusClass(row.qualityStatus)}`}>{row.qualityScore != null ? `${row.qualityScore} / 100` : 'nicht bewertet'}</span></td><td>{row.primaryIssue !== '-' ? row.primaryIssue : 'Kein offener Prüfpunkt'}</td><td><Link className="table-link-button" to={detailUrl(row)}>Öffnen</Link></td></tr>)}</tbody></table></div>
      <footer className="table-footer record-table-footer"><span>{start}–{end} von {totalItems}</span><label><span className="sr-only">Datensätze pro Seite</span><select value={state.pageSize} onChange={(event) => setQueryState({ pageSize: Number(event.target.value) })}>{PAGE_SIZE_OPTIONS.map((size) => <option key={size} value={size}>{size} pro Seite</option>)}</select></label><div className="pager" aria-label="Seitennavigation"><button type="button" aria-label="Vorherige Seite" disabled={state.page <= 1 || loading} onClick={() => setQueryState({ page: state.page - 1 }, false)}>‹</button><span>{state.page} / {totalPages}</span><button type="button" aria-label="Nächste Seite" disabled={state.page >= totalPages || loading} onClick={() => setQueryState({ page: state.page + 1 }, false)}>›</button></div></footer>
    </section>
  </>;
}
