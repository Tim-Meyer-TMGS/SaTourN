import { downloadText, extractId, extractItems, extractTotal, fetchJson } from '../lib/browser.js';
import { evaluateAllItems, getQualityAggregations, qualityHelpers } from './quality.js';

document.addEventListener('DOMContentLoaded', () => {
  const root = document.querySelector('.statistik[data-page]');
  if (!root) return;

  const API_BASE = window.SATOURN_SEARCH_API_BASE
    || (location.hostname === 'localhost' || location.hostname === '127.0.0.1'
      ? 'http://localhost:3000/api/search'
      : 'https://satourn.onrender.com/api/search');

  const TYPES = ['POI', 'Tour', 'Hotel', 'Event', 'Gastro', 'Package'];
  const WORK_CONTEXT_KEY = 'satournWorkContext';
  const KPI_HISTORY_KEY = 'satournOverviewKpis';
  const QUALITY_ITEMS_PER_QUERY = Math.max(0, Math.min(50, Number(window.SATOURN_STATISTIK_QUALITY_ITEMS_PER_QUERY || 25)));
  const QUALITY_ITEM_MAX_ITEMS = Math.max(0, Math.min(5000, Number(window.SATOURN_STATISTIK_QUALITY_ITEM_MAX_ITEMS || 2000)));
  const AREAS = [
    ['Sachsen', ''],
    ['Leipzig', 'Leipzig'],
    ['Leipzig Region', 'Leipzig Region'],
    ['Vogtland', 'Vogtland'],
    ['Erzgebirge', 'Erzgebirge'],
    ['Oberlausitz', 'Oberlausitz'],
    ['Sächsische Schweiz', 'Sächsische Schweiz'],
    ['Dresden', 'Dresden'],
    ['Dresden Elbland', 'Dresden Elbland'],
    ['Chemnitz', 'Chemnitz']
  ];

  const page = root.dataset.page || 'overview';
  const els = {
    contextSummary: document.getElementById('work-context-summary'),
    contextEdit: document.getElementById('work-context-edit'),
    contextDialog: document.getElementById('work-context-dialog'),
    contextForm: document.getElementById('work-context-form'),
    contextArea: document.getElementById('context-area'),
    contextCity: document.getElementById('context-city'),
    contextType: document.getElementById('context-type'),
    lastUpdated: document.getElementById('last-updated'),
    refreshButton: document.getElementById('refresh-button'),
    overviewSubtitle: document.getElementById('overview-subtitle'),
    overviewMessage: document.getElementById('overview-message'),
    kpiQualityScore: document.getElementById('kpi-quality-score'),
    kpiQualityTrack: document.getElementById('kpi-quality-track'),
    kpiQualityDelta: document.getElementById('kpi-quality-delta'),
    kpiTotal: document.getElementById('kpi-total'),
    kpiTotalDelta: document.getElementById('kpi-total-delta'),
    kpiGood: document.getElementById('kpi-good'),
    kpiGoodPercent: document.getElementById('kpi-good-percent'),
    kpiReview: document.getElementById('kpi-review'),
    kpiReviewPercent: document.getElementById('kpi-review-percent'),
    kpiCritical: document.getElementById('kpi-critical'),
    kpiCriticalPercent: document.getElementById('kpi-critical-percent'),
    kpiOpenData: document.getElementById('kpi-open-data'),
    kpiOpenDataDetail: document.getElementById('kpi-open-data-detail'),
    topTasksList: document.getElementById('top-tasks-list'),
    qualityDonut: document.getElementById('quality-donut'),
    qualityLegend: document.getElementById('quality-legend'),
    qualityDataNote: document.getElementById('quality-data-note'),
    openDataCapableBar: document.getElementById('open-data-capable-bar'),
    openDataMissingBar: document.getElementById('open-data-missing-bar'),
    openDataUnknownBar: document.getElementById('open-data-unknown-bar'),
    openDataCapable: document.getElementById('open-data-capable'),
    openDataCapablePercent: document.getElementById('open-data-capable-percent'),
    openDataMissing: document.getElementById('open-data-missing'),
    openDataMissingPercent: document.getElementById('open-data-missing-percent'),
    openDataUnknown: document.getElementById('open-data-unknown'),
    openDataUnknownPercent: document.getElementById('open-data-unknown-percent'),
    quickExport: document.getElementById('quick-export'),
    quickAi: document.getElementById('quick-ai')
  };

  let state = {
    context: loadWorkContext(),
    latestRows: [],
    normalizedItems: [],
    qualityAggregations: getQualityAggregations([]),
    qualityDataMeta: {
      mode: 'sample',
      collectedItems: 0,
      estimatedTotalItems: 0,
      truncated: false
    },
    lastKpis: null
  };

  initSharedShell();
  if (page === 'overview') initOverview();

  function initSharedShell() {
    fillContextControls();
    renderWorkContext();

    els.contextSummary?.addEventListener('click', openContextDialog);
    els.contextEdit?.addEventListener('click', openContextDialog);
    els.contextForm?.addEventListener('submit', handleContextSubmit);
  }

  function initOverview() {
    renderOverviewLoading();
    els.refreshButton?.addEventListener('click', () => loadOverviewData());
    els.quickExport?.addEventListener('click', exportOverviewCsv);
    els.quickAi?.addEventListener('click', () => showMessage('Die KI-Analyse wird als dezente Aktion in einem spaeteren Schritt angebunden.'));
    void loadOverviewData();
  }

  function loadWorkContext() {
    try {
      const parsed = JSON.parse(localStorage.getItem(WORK_CONTEXT_KEY) || '{}');
      return {
        area: typeof parsed.area === 'string' ? parsed.area : '',
        city: typeof parsed.city === 'string' ? parsed.city : '',
        type: TYPES.includes(parsed.type) ? parsed.type : ''
      };
    } catch {
      return { area: '', city: '', type: '' };
    }
  }

  function saveWorkContext(context) {
    state.context = {
      area: context.area || '',
      city: context.city || '',
      type: TYPES.includes(context.type) ? context.type : ''
    };
    localStorage.setItem(WORK_CONTEXT_KEY, JSON.stringify(state.context));
    renderWorkContext();
  }

  function fillContextControls() {
    if (els.contextArea && !els.contextArea.options.length) {
      AREAS.forEach(([label, value]) => els.contextArea.append(new Option(label, value)));
    }
    if (els.contextType && !els.contextType.options.length) {
      els.contextType.append(new Option('Alle Datentypen', ''));
      TYPES.forEach((type) => els.contextType.append(new Option(type, type)));
    }
  }

  function contextAreaLabel(areaValue = state.context.area) {
    return AREAS.find(([, value]) => value === areaValue)?.[0] || 'Sachsen';
  }

  function renderWorkContext() {
    const areaLabel = contextAreaLabel();
    const cityLabel = state.context.city || 'Alle Orte';
    const typeLabel = state.context.type || 'Alle Datentypen';
    if (els.contextSummary) {
      els.contextSummary.textContent = `${areaLabel} - ${cityLabel} - ${typeLabel}`;
    }
    if (els.overviewSubtitle) {
      els.overviewSubtitle.textContent = `Hier ist die aktuelle Lage fuer ${areaLabel}.`;
    }
  }

  function openContextDialog() {
    if (!els.contextDialog) return;
    fillContextControls();
    els.contextArea.value = state.context.area || '';
    els.contextCity.value = state.context.city || '';
    els.contextType.value = state.context.type || '';
    if (typeof els.contextDialog.showModal === 'function') {
      els.contextDialog.showModal();
    } else {
      els.contextDialog.setAttribute('open', '');
    }
  }

  function handleContextSubmit(event) {
    if (event.submitter?.value === 'cancel') return;
    event.preventDefault();
    saveWorkContext({
      area: els.contextArea?.value || '',
      city: els.contextCity?.value.trim() || '',
      type: els.contextType?.value || ''
    });
    els.contextDialog?.close?.();
    if (page === 'overview') void loadOverviewData();
  }

  function buildQuery({ area, city }) {
    const parts = [];
    if (area) parts.push(`area:"${cleanQueryValue(area)}"`);
    if (city) parts.push(`city:"${cleanQueryValue(city)}"`);
    return parts.join(' AND ');
  }

  function cleanQueryValue(value) {
    return String(value || '').replaceAll('"', '').trim();
  }

  function buildUrl(type, query, options = {}) {
    const params = new URLSearchParams();
    params.set('type', type);
    params.set('limit', String(options.limit ?? 1));
    if (query) params.set('query', query);
    if (options.isOpenData) params.set('isOpenData', 'true');
    return `${API_BASE}?${params.toString()}`;
  }

  async function loadOverviewData() {
    const startedAt = new Date();
    showMessage('');
    renderOverviewLoading();

    try {
      const rows = await loadStatisticRows();
      const qualityItems = await loadQualitySampleRows();
      const evaluated = evaluateAllItems(qualityItems);
      state.latestRows = rows;
      state.normalizedItems = evaluated;
      state.qualityAggregations = getQualityAggregations(evaluated);
      renderOverview(rows, evaluated);
      els.lastUpdated.textContent = `Letzte Aktualisierung: ${formatDateTime(startedAt)}`;
    } catch (error) {
      console.error('Startseite konnte nicht geladen werden.', error);
      showMessage('Die Daten konnten nicht geladen werden. Bitte spaeter erneut versuchen.');
      renderOverviewEmpty();
    }
  }

  async function loadStatisticRows() {
    const query = buildQuery(state.context);
    const targetTypes = state.context.type ? [state.context.type] : TYPES;
    return Promise.all(targetTypes.map(async (type) => {
      const [totalPayload, openDataPayload] = await Promise.all([
        fetchJson(buildUrl(type, query, { limit: 1 })),
        fetchJson(buildUrl(type, query, { limit: 1, isOpenData: true }))
      ]);
      return {
        type,
        statistikCount: Number(extractTotal(totalPayload) || 0),
        openDataCount: Number(extractTotal(openDataPayload) || 0)
      };
    }));
  }

  async function loadQualitySampleRows() {
    const query = buildQuery(state.context);
    const targetTypes = state.context.type ? [state.context.type] : TYPES;
    state.qualityDataMeta = {
      mode: 'sample',
      collectedItems: 0,
      estimatedTotalItems: 0,
      truncated: false
    };

    const batches = [];
    for (const type of targetTypes) {
      if (state.qualityDataMeta.collectedItems >= QUALITY_ITEM_MAX_ITEMS) {
        state.qualityDataMeta.truncated = true;
        break;
      }
      const payload = await fetchJson(buildUrl(type, query, { limit: QUALITY_ITEMS_PER_QUERY }));
      const total = Number(extractTotal(payload) || 0);
      const items = extractItems(payload).slice(0, QUALITY_ITEMS_PER_QUERY);
      state.qualityDataMeta.estimatedTotalItems += total;
      state.qualityDataMeta.collectedItems += items.length;
      if (total > items.length || state.qualityDataMeta.collectedItems >= QUALITY_ITEM_MAX_ITEMS) {
        state.qualityDataMeta.truncated = true;
      }
      batches.push(...items.map((raw) => normalizeItem(raw, type)));
    }
    return batches.slice(0, QUALITY_ITEM_MAX_ITEMS);
  }

  function normalizeItem(raw, fallbackType) {
    const globalId = getFirst(raw, ['global_id', 'globalId']);
    return {
      raw,
      id: extractId(raw),
      globalId,
      title: getFirst(raw, ['title', 'name', 'presentation.title']) || 'Ohne Titel',
      type: getFirst(raw, ['type', 'typeName']) || fallbackType,
      region: qualityHelpers.getAreaValues(raw)?.[0] || state.context.area || '',
      city: getFirst(raw, ['city', 'location.city', 'address.city']) || state.context.city || '',
      category: qualityHelpers.getCategoryValues(raw)?.[0] || '',
      license: qualityHelpers.getAttributeValue(raw, 'license') || '',
      isOpenData: qualityHelpers.hasValidDatasetLicense(raw),
      updatedAt: getFirst(raw, ['updatedAt', 'lastModified', 'modified', 'changeDate']) || ''
    };
  }

  function getFirst(obj, paths) {
    for (const path of paths) {
      const value = qualityHelpers.getNestedValue(obj, path);
      const text = textValue(value);
      if (text) return text;
    }
    return '';
  }

  function textValue(value) {
    if (value == null) return '';
    if (Array.isArray(value)) return value.map(textValue).find(Boolean) || '';
    if (typeof value === 'object') {
      for (const key of ['title', 'name', 'label', 'value', 'text', 'id']) {
        const nested = textValue(value[key]);
        if (nested) return nested;
      }
      return '';
    }
    return String(value).replace(/\s+/g, ' ').trim();
  }

  function renderOverview(rows, items) {
    const summary = computeSummary(rows);
    const aggregations = state.qualityAggregations;
    const counts = aggregations.qualityStatusCounts || {};
    const assessedTotal = sumStatusCounts(counts);
    const openDataUnknown = 0;
    const notOpenData = Math.max(0, summary.statistikTotal - summary.openDataTotal - openDataUnknown);
    const kpis = {
      timestamp: new Date().toISOString(),
      qualityScore: Number.isFinite(aggregations.averageQualityScore) ? aggregations.averageQualityScore : null,
      totalRecords: summary.statistikTotal,
      goodRecords: counts.gut || 0,
      recordsToReview: counts.pruefen || 0,
      criticalRecords: counts.kritisch || 0,
      openDataQuote: summary.openDataQuote
    };

    els.kpiQualityScore.textContent = kpis.qualityScore == null ? '-' : formatNumber(kpis.qualityScore);
    els.kpiQualityTrack.style.width = `${Math.max(0, Math.min(100, kpis.qualityScore || 0))}%`;
    els.kpiTotal.textContent = formatNumber(summary.statistikTotal);
    els.kpiGood.textContent = formatNumber(counts.gut || 0);
    els.kpiGoodPercent.textContent = formatPercent(percent(counts.gut || 0, assessedTotal));
    els.kpiReview.textContent = formatNumber(counts.pruefen || 0);
    els.kpiReviewPercent.textContent = formatPercent(percent(counts.pruefen || 0, assessedTotal));
    els.kpiCritical.textContent = formatNumber(counts.kritisch || 0);
    els.kpiCriticalPercent.textContent = formatPercent(percent(counts.kritisch || 0, assessedTotal));
    els.kpiOpenData.textContent = formatPercent(summary.openDataQuote);
    els.kpiOpenDataDetail.textContent = `${formatNumber(summary.openDataTotal)} von ${formatNumber(summary.statistikTotal)}`;

    renderKpiDeltas(kpis);
    renderTopTasks(aggregations.issueSummary || []);
    renderQualityDistribution(counts, assessedTotal);
    renderOpenDataStatus(summary.openDataTotal, notOpenData, openDataUnknown, summary.statistikTotal);
    renderDataNote(items.length);
    saveKpiHistory(kpis);
  }

  function renderOverviewLoading() {
    ['kpi-quality-score', 'kpi-total', 'kpi-good', 'kpi-review', 'kpi-critical', 'kpi-open-data'].forEach((id) => {
      const node = document.getElementById(id);
      if (node) node.textContent = '...';
    });
    if (els.topTasksList) els.topTasksList.innerHTML = '<div class="inline-loading">Pflegeaufgaben werden geladen ...</div>';
    if (els.qualityDataNote) els.qualityDataNote.textContent = 'Qualitaetsdaten werden geladen ...';
  }

  function renderOverviewEmpty() {
    ['kpi-quality-score', 'kpi-total', 'kpi-good', 'kpi-review', 'kpi-critical', 'kpi-open-data'].forEach((id) => {
      const node = document.getElementById(id);
      if (node) node.textContent = '-';
    });
    if (els.topTasksList) els.topTasksList.innerHTML = '<div class="empty-note">Fuer diese Auswahl wurden keine Pflegeaufgaben geladen.</div>';
    if (els.qualityDataNote) els.qualityDataNote.textContent = 'Keine auswertbaren Qualitaetsdaten geladen.';
  }

  function computeSummary(rows) {
    const statistikTotal = rows.reduce((sum, row) => sum + row.statistikCount, 0);
    const openDataTotal = rows.reduce((sum, row) => sum + row.openDataCount, 0);
    const openDataQuote = statistikTotal ? (openDataTotal / statistikTotal) * 100 : 0;
    return { statistikTotal, openDataTotal, openDataQuote };
  }

  function renderTopTasks(issueSummary) {
    const issues = [...issueSummary]
      .sort((a, b) => priorityRank(b.priority) - priorityRank(a.priority) || b.affectedCount - a.affectedCount)
      .slice(0, 5);

    if (!issues.length) {
      els.topTasksList.innerHTML = '<div class="empty-note">Fuer die aktuelle Auswahl wurden keine Pflegeaufgaben gefunden.</div>';
      return;
    }

    els.topTasksList.replaceChildren(...issues.map((issue) => {
      const link = document.createElement('a');
      link.className = 'task-row';
      link.href = '/Statistik/tasks.html';
      const statusClass = issue.priority === 'hoch' ? 'critical' : 'review';
      link.innerHTML = `
        <span class="task-icon ${statusClass}" aria-hidden="true">${taskIcon(issue.criterionId)}</span>
        <span class="task-copy"><strong>${escapeHtml(issue.label)}</strong><small>${escapeHtml(taskDescription(issue.criterionId))}</small></span>
        <span class="task-count">${formatNumber(issue.affectedCount)}</span>
        <span class="status-badge ${statusClass}">${issue.priority === 'hoch' ? 'Kritisch' : 'Pruefen'}</span>
        <span class="task-open" aria-hidden="true">&gt;</span>
      `;
      return link;
    }));
  }

  function renderQualityDistribution(counts, total) {
    const good = counts.gut || 0;
    const review = counts.pruefen || 0;
    const critical = counts.kritisch || 0;
    const unknown = counts.nichtBerechenbar || 0;
    const goodPct = percent(good, total);
    const reviewPct = percent(review, total);
    const criticalPct = percent(critical, total);

    els.qualityDonut.style.background = total
      ? `conic-gradient(#22b46b 0 ${goodPct}%, #f5aa1c ${goodPct}% ${goodPct + reviewPct}%, #ef3f42 ${goodPct + reviewPct}% ${goodPct + reviewPct + criticalPct}%, #98a2b3 ${goodPct + reviewPct + criticalPct}% 100%)`
      : 'conic-gradient(#e2e8f0 0 100%)';

    const rows = [
      ['Gut', good, goodPct, 'good'],
      ['Pruefen', review, reviewPct, 'review'],
      ['Kritisch', critical, criticalPct, 'critical'],
      ['Nicht bewertbar', unknown, percent(unknown, total), 'muted']
    ];
    els.qualityLegend.innerHTML = rows.map(([label, count, pctValue, cls]) => `
      <div class="legend-row"><span class="legend-dot ${cls}"></span><span>${label}</span><strong>${formatPercent(pctValue)} (${formatNumber(count)})</strong></div>
    `).join('');
  }

  function renderOpenDataStatus(capable, missing, unknown, total) {
    const capablePct = percent(capable, total);
    const missingPct = percent(missing, total);
    const unknownPct = percent(unknown, total);
    els.openDataCapableBar.style.width = `${capablePct}%`;
    els.openDataMissingBar.style.width = `${missingPct}%`;
    els.openDataUnknownBar.style.width = `${unknownPct}%`;
    els.openDataCapable.textContent = formatNumber(capable);
    els.openDataCapablePercent.textContent = formatPercent(capablePct);
    els.openDataMissing.textContent = formatNumber(missing);
    els.openDataMissingPercent.textContent = formatPercent(missingPct);
    els.openDataUnknown.textContent = formatNumber(unknown);
    els.openDataUnknownPercent.textContent = formatPercent(unknownPct);
  }

  function renderDataNote(sampleSize) {
    const note = state.qualityDataMeta.truncated
      ? `Basierend auf einer begrenzten Stichprobe von ${formatNumber(sampleSize)} Datensaetzen.`
      : `Basierend auf ${formatNumber(sampleSize)} bewerteten Datensaetzen.`;
    els.qualityDataNote.textContent = note;
    if (state.qualityDataMeta.truncated) console.debug('Qualitaetsdaten sind begrenzt.', state.qualityDataMeta);
  }

  function renderKpiDeltas(kpis) {
    let previous = null;
    try {
      previous = JSON.parse(localStorage.getItem(KPI_HISTORY_KEY) || 'null');
    } catch {
      previous = null;
    }
    renderDelta(els.kpiTotalDelta, previous?.totalRecords, kpis.totalRecords, 'Datensaetze seit dem letzten Besuch');
    renderDelta(els.kpiQualityDelta, previous?.qualityScore, kpis.qualityScore, 'Punkte seit dem letzten Besuch');
  }

  function renderDelta(node, previous, current, suffix) {
    if (!node || !Number.isFinite(previous) || !Number.isFinite(current)) {
      if (node) node.hidden = true;
      return;
    }
    const delta = current - previous;
    if (!delta) {
      node.hidden = true;
      return;
    }
    node.textContent = `${delta > 0 ? '+' : ''}${formatNumber(delta)} ${suffix}`;
    node.hidden = false;
  }

  function saveKpiHistory(kpis) {
    localStorage.setItem(KPI_HISTORY_KEY, JSON.stringify(kpis));
  }

  function exportOverviewCsv() {
    if (!state.latestRows.length) {
      showMessage('Fuer diese Ansicht liegen noch keine exportierbaren Daten vor.');
      return;
    }
    const rows = [
      ['Typ', 'SaTourN', 'Open-Data', 'Open-Data %'],
      ...state.latestRows.map((row) => [
        row.type,
        row.statistikCount,
        row.openDataCount,
        formatPercent(percent(row.openDataCount, row.statistikCount))
      ])
    ];
    const text = rows.map((row) => row.map(csvValue).join(';')).join('\n');
    downloadText('satourn_startseite_uebersicht.csv', text, 'text/csv;charset=utf-8');
  }

  function csvValue(value) {
    return `"${String(value ?? '').replaceAll('"', '""')}"`;
  }

  function showMessage(message) {
    if (!els.overviewMessage) return;
    els.overviewMessage.textContent = message || '';
    els.overviewMessage.hidden = !message;
  }

  function taskIcon(id) {
    if (id === 'license_missing') return 'L';
    if (id === 'image_author_missing' || id === 'image_missing') return 'B';
    if (id === 'opening_hours_missing') return 'Z';
    if (id === 'public_transport_missing') return 'O';
    return '!';
  }

  function taskDescription(id) {
    const descriptions = {
      license_missing: 'Datensaetze ohne Lizenzangabe',
      image_author_missing: 'Bilder ohne Urheberangabe',
      description_missing: 'Keine Beschreibung oder Details',
      opening_hours_missing: 'Keine Oeffnungszeiten hinterlegt',
      public_transport_missing: 'Keine OePNV-Information vorhanden',
      booking_link_missing: 'Kein Buchungs- oder Reservierungslink',
      image_missing: 'Kein Bildmaterial vorhanden'
    };
    return descriptions[id] || 'Ergaenzung empfohlen';
  }

  function priorityRank(priority) {
    if (priority === 'hoch') return 3;
    if (priority === 'mittel') return 2;
    return 1;
  }

  function sumStatusCounts(counts) {
    return (counts.gut || 0) + (counts.pruefen || 0) + (counts.kritisch || 0) + (counts.nichtBerechenbar || 0);
  }

  function percent(value, total) {
    return total > 0 ? (value / total) * 100 : 0;
  }

  function formatNumber(value) {
    return Number(value || 0).toLocaleString('de-DE');
  }

  function formatPercent(value) {
    return `${Number(value || 0).toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} %`;
  }

  function formatDateTime(date) {
    return date.toLocaleString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }
});
