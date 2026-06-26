import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import { fetchJson } from '../../shared/api/http-client';
import { getRuntimeConfig } from '../../shared/api/runtime-config';
import { qualityCriteria } from '../../shared/legacy/quality';
import {
  DetailActionBar,
  DetailBreadcrumb,
  DetailCenterColumn,
  DetailCriteriaCard,
  DetailHeadCard,
  DetailLeftColumn,
  DetailRightColumn
} from './record-detail-components';
import { normalizeDetailItem, priorityRank } from './record-detail-mapper';
import type { DetailItem, RecordListEntry, RecordListState, ResolvedPayload } from './record-detail-types';

const RECORD_LIST_STATE_KEY = 'satourn.frontend.recordListState';

function loadRecordListState(): RecordListState {
  if (typeof window === 'undefined') return { backUrl: '/records', rows: [] };

  try {
    const raw = window.sessionStorage.getItem(RECORD_LIST_STATE_KEY);
    if (!raw) return { backUrl: '/records', rows: [] };
    const parsed = JSON.parse(raw) as Partial<RecordListState>;
    return {
      backUrl: parsed.backUrl || '/records',
      rows: Array.isArray(parsed.rows) ? parsed.rows.filter((row) => row && (row.globalId || row.id)) : []
    };
  } catch {
    return { backUrl: '/records', rows: [] };
  }
}

export function RecordDetailPage() {
  const [searchParams] = useSearchParams();
  const [item, setItem] = useState<DetailItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copyMessage, setCopyMessage] = useState('');

  const type = searchParams.get('type') || '';
  const globalId = searchParams.get('global_id') || searchParams.get('globalId') || '';
  const id = searchParams.get('id') || '';
  const contextSource = searchParams.get('source') || '';
  const contextLabel = searchParams.get('criterion_label') || searchParams.get('criterionLabel') || '';
  const identifier = globalId || id;

  useEffect(() => {
    let active = true;

    async function loadDetail() {
      if (!identifier) {
        setError('Es wurde keine Datensatz-ID übergeben.');
        setItem(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError('');

      try {
        const runtime = getRuntimeConfig();
        const payload = await fetchJson<ResolvedPayload>(runtime.recordsByIdsApiBase, {
          method: 'POST',
          timeoutMs: 45_000,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ids: [identifier],
            type
          })
        });
        const rawItem = Array.isArray(payload.items) ? payload.items[0] : null;
        if (!rawItem) throw new Error('Für diese ID wurde kein Datensatz gefunden.');
        if (!active) return;
        setItem(normalizeDetailItem(rawItem, type));
      } catch (caughtError) {
        if (!active) return;
        setItem(null);
        setError(caughtError instanceof Error ? caughtError.message : 'Datensatz-Detail konnte nicht geladen werden.');
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadDetail();

    return () => {
      active = false;
    };
  }, [identifier, type]);

  const missingIssues = useMemo(() => {
    if (!item) return [];
    return item.missingCriteria
      .map((criterionId) => {
        const criterion = qualityCriteria.find((entry) => entry.id === criterionId);
        return {
          id: criterionId,
          label: criterion?.label || criterionId,
          recommendation: criterion?.recommendation || 'Bitte im Pflegesystem prüfen und ergänzen.',
          priority: criterion?.priority || ''
        };
      })
      .sort((left, right) => priorityRank(right.priority) - priorityRank(left.priority))
      .slice(0, 5);
  }, [item]);

  const listState = useMemo(() => loadRecordListState(), [identifier]);
  const listNavigation = useMemo(() => {
    if (!item) return { previous: null as RecordListEntry | null, next: null as RecordListEntry | null };
    const currentKey = item.globalId || item.id;
    const currentIndex = listState.rows.findIndex((row) => (
      (item.globalId && row.globalId === item.globalId) ||
      (item.id && row.id === item.id) ||
      (currentKey && (row.globalId || row.id) === currentKey)
    ));

    return {
      previous: currentIndex > 0 ? listState.rows[currentIndex - 1] : null,
      next: currentIndex >= 0 && currentIndex < listState.rows.length - 1 ? listState.rows[currentIndex + 1] : null
    };
  }, [item, listState]);

  async function copyText(value: string, label: string) {
    if (!value) return;

    try {
      await navigator.clipboard.writeText(value);
      setCopyMessage(`${label} kopiert.`);
      window.setTimeout(() => setCopyMessage(''), 2200);
    } catch {
      setCopyMessage(`${label} konnte nicht kopiert werden.`);
      window.setTimeout(() => setCopyMessage(''), 2200);
    }
  }

  return (
    <>
      <DetailBreadcrumb contextSource={contextSource} contextLabel={contextLabel} />

      {loading ? (
        <section className="panel-card detail-loading-card">
          <span className="loading-line">Datensatz wird geladen ...</span>
        </section>
      ) : null}

      {!loading && error ? (
        <section className="panel-card detail-loading-card">
          <p className="table-empty">{error}</p>
          <Link className="table-link-button" to="/records">Zurück zur Liste</Link>
        </section>
      ) : null}

      {!loading && item ? (
        <>
          <DetailActionBar
            item={item}
            backUrl={listState.backUrl}
            previous={listNavigation.previous}
            next={listNavigation.next}
            onCopy={(value, label) => void copyText(value, label)}
          />

          {copyMessage ? <div className="overview-message">{copyMessage}</div> : null}

          <DetailHeadCard item={item} />

          <section className="detail-grid">
            <DetailLeftColumn item={item} missingIssues={missingIssues} />
            <DetailCenterColumn item={item} />
            <DetailRightColumn item={item} />
          </section>

          <DetailCriteriaCard item={item} />
        </>
      ) : null}
    </>
  );
}
