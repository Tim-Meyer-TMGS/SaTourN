import { downloadText, extractId, extractItems, extractTotal, fetchJson } from '../lib/browser.js';
import { evaluateAllItems, evaluateQualityForItem, getQualityAggregations, qualityCriteria, qualityHelpers } from './quality.js';

document.addEventListener('DOMContentLoaded', () => {
  const root = document.querySelector('.statistik[data-page]');
  if (!root) return;

  const API_BASE = window.SATOURN_SEARCH_API_BASE
    || (location.hostname === 'localhost' || location.hostname === '127.0.0.1'
      ? 'http://localhost:3000/api/search'
      : 'https://satourn.onrender.com/api/search');
  const QUALITY_SCAN_API_BASE = window.SATOURN_QUALITY_SCAN_API_BASE
    || API_BASE.replace(/\/api\/search(?:\?.*)?$/, '/api/quality/scan');

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
    quickAi: document.getElementById('quick-ai'),
    taskKpiOpen: document.getElementById('task-kpi-open'),
    taskKpiHigh: document.getElementById('task-kpi-high'),
    taskKpiHighDetail: document.getElementById('task-kpi-high-detail'),
    taskKpiAffected: document.getElementById('task-kpi-affected'),
    taskKpiOpenData: document.getElementById('task-kpi-open-data'),
    taskKpiPotential: document.getElementById('task-kpi-potential'),
    taskSearchInput: document.getElementById('task-search-input'),
    taskPriorityFilter: document.getElementById('task-priority-filter'),
    taskTypeFilter: document.getElementById('task-type-filter'),
    taskCheckFilter: document.getElementById('task-check-filter'),
    taskImpactFilter: document.getElementById('task-impact-filter'),
    taskResetFilters: document.getElementById('task-reset-filters'),
    taskMessage: document.getElementById('tasks-message'),
    taskListTitle: document.getElementById('task-list-title'),
    taskTableBody: document.getElementById('tasks-table-body'),
    taskTableCount: document.getElementById('task-table-count'),
    taskPrevPage: document.getElementById('task-prev-page'),
    taskNextPage: document.getElementById('task-next-page'),
    taskPageStatus: document.getElementById('task-page-status'),
    taskDetailContent: document.getElementById('task-detail-content'),
    primarySystemCard: document.getElementById('primary-system-card'),
    primarySystemList: document.getElementById('primary-system-list'),
    taskDataNote: document.getElementById('task-data-note'),
    taskRecordsSection: document.getElementById('task-records-section'),
    taskRecordsTitle: document.getElementById('task-records-title'),
    taskRecordsNote: document.getElementById('task-records-note'),
    taskRecordsBody: document.getElementById('task-records-body'),
    taskRecordsExport: document.getElementById('task-records-export'),
    recordSearchInput: document.getElementById('record-search-input'),
    recordSearchClear: document.getElementById('record-search-clear'),
    recordSearchButton: document.getElementById('record-search-button'),
    recordTypeFilter: document.getElementById('record-type-filter'),
    recordCategoryFilter: document.getElementById('record-category-filter'),
    recordStatusFilter: document.getElementById('record-status-filter'),
    recordIssueFilter: document.getElementById('record-issue-filter'),
    recordResetFilters: document.getElementById('record-reset-filters'),
    recordsMessage: document.getElementById('records-message'),
    recordResultSummary: document.getElementById('record-result-summary'),
    recordExport: document.getElementById('record-export'),
    recordTableBody: document.getElementById('records-table-body'),
    recordPageRange: document.getElementById('record-page-range'),
    recordPageSize: document.getElementById('record-page-size'),
    recordPrevPage: document.getElementById('record-prev-page'),
    recordNextPage: document.getElementById('record-next-page'),
    recordPageStatus: document.getElementById('record-page-status'),
    recordDataNote: document.getElementById('record-data-note'),
    quickCountCritical: document.getElementById('quick-count-critical'),
    quickCountLicense: document.getElementById('quick-count-license'),
    quickCountDescription: document.getElementById('quick-count-description'),
    quickCountImage: document.getElementById('quick-count-image'),
    quickCountOpenings: document.getElementById('quick-count-openings'),
    legendGood: document.getElementById('legend-good'),
    legendReview: document.getElementById('legend-review'),
    legendCritical: document.getElementById('legend-critical'),
    legendUnknown: document.getElementById('legend-unknown'),
    detailEt4Link: document.getElementById('detail-et4-link'),
    detailCopyLink: document.getElementById('detail-copy-link'),
    recordDetailMessage: document.getElementById('record-detail-message'),
    detailHeadCard: document.getElementById('detail-head-card'),
    detailContent: document.getElementById('detail-content'),
    detailIssuesList: document.getElementById('detail-issues-list'),
    detailUsability: document.getElementById('detail-usability'),
    detailTaxonomy: document.getElementById('detail-taxonomy'),
    detailDescription: document.getElementById('detail-description'),
    detailMedia: document.getElementById('detail-media'),
    detailMediaNote: document.getElementById('detail-media-note'),
    detailOpenings: document.getElementById('detail-openings'),
    detailTransport: document.getElementById('detail-transport'),
    detailInfo: document.getElementById('detail-info'),
    detailCriteriaCard: document.getElementById('detail-criteria-card'),
    detailCriteriaList: document.getElementById('detail-criteria-list')
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
    lastKpis: null,
    taskItems: [],
    taskRows: [],
    filteredTaskRows: [],
    selectedTask: null,
    selectedTaskType: '',
    taskPage: 1,
    taskRowsPerPage: 7,
    taskRecordRows: [],
    taskRecordMeta: null,
    recordItems: [],
    recordRows: [],
    filteredRecordRows: [],
    recordPage: 1,
    recordRowsPerPage: 25,
    recordSearchTimer: null,
    recordDataMeta: {
      mode: 'sample',
      collectedItems: 0,
      estimatedTotalItems: 0,
      truncated: false
    },
    recordDetailItem: null,
    recordDetailViewModel: null
  };

  initSharedShell();
  if (page === 'overview') initOverview();
  if (page === 'tasks') initTasks();
  if (page === 'records') initRecords();
  if (page === 'record-detail') initRecordDetail();

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
    els.quickAi?.addEventListener('click', () => showMessage('Die KI-Analyse wird als dezente Aktion in einem späteren Schritt angebunden.'));
    void loadOverviewData();
  }

  function initTasks() {
    fillTaskTypeFilter();
    renderTasksLoading();
    els.refreshButton?.addEventListener('click', () => loadTasksData());
    els.taskSearchInput?.addEventListener('input', () => {
      state.taskPage = 1;
      applyTaskFilters();
    });
    [els.taskPriorityFilter, els.taskTypeFilter, els.taskCheckFilter, els.taskImpactFilter].forEach((node) => {
      node?.addEventListener('change', () => {
        state.taskPage = 1;
        applyTaskFilters();
      });
    });
    els.taskResetFilters?.addEventListener('click', resetTaskFilters);
    els.taskPrevPage?.addEventListener('click', () => changeTaskPage(-1));
    els.taskNextPage?.addEventListener('click', () => changeTaskPage(1));
    els.taskRecordsExport?.addEventListener('click', exportTaskRecordsCsv);
    void loadTasksData();
  }

  function initRecords() {
    fillRecordControls();
    renderRecordsLoading();
    els.refreshButton?.addEventListener('click', () => loadRecordsData());
    els.recordSearchInput?.addEventListener('input', () => {
      clearTimeout(state.recordSearchTimer);
      state.recordSearchTimer = setTimeout(() => {
        state.recordPage = 1;
        applyRecordFilters();
      }, 180);
    });
    els.recordSearchInput?.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        void handleRecordSearchSubmit();
      }
    });
    els.recordSearchButton?.addEventListener('click', () => {
      void handleRecordSearchSubmit();
    });
    els.recordSearchClear?.addEventListener('click', () => {
      if (els.recordSearchInput) els.recordSearchInput.value = '';
      state.recordPage = 1;
      applyRecordFilters();
    });
    [els.recordTypeFilter, els.recordCategoryFilter, els.recordStatusFilter, els.recordIssueFilter].forEach((node) => {
      node?.addEventListener('change', () => {
        state.recordPage = 1;
        applyRecordFilters();
      });
    });
    els.recordResetFilters?.addEventListener('click', resetRecordFilters);
    els.recordPageSize?.addEventListener('change', () => {
      state.recordRowsPerPage = Number(els.recordPageSize.value || 25);
      state.recordPage = 1;
      renderRecordTable();
    });
    els.recordPrevPage?.addEventListener('click', () => changeRecordPage(-1));
    els.recordNextPage?.addEventListener('click', () => changeRecordPage(1));
    els.recordExport?.addEventListener('click', exportRecordListCsv);
    document.querySelectorAll('[data-record-quick]').forEach((button) => {
      button.addEventListener('click', () => applyQuickRecordFilter(button.dataset.recordQuick || ''));
    });
    void loadRecordsData();
  }

  function initRecordDetail() {
    els.refreshButton?.addEventListener('click', () => loadRecordDetail());
    els.detailCopyLink?.addEventListener('click', () => copyText(location.href));
    void loadRecordDetail();
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
      els.overviewSubtitle.textContent = `Hier ist die aktuelle Lage für ${areaLabel}.`;
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
    if (page === 'tasks') void loadTasksData();
    if (page === 'records') void loadRecordsData();
    if (page === 'record-detail') void loadRecordDetail();
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
      showMessage('Die Daten konnten nicht geladen werden. Bitte später erneut versuchen.');
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

  async function loadTasksData() {
    const startedAt = new Date();
    showTaskMessage('');
    renderTasksLoading();
    hidePrimarySystems();
    clearTaskRecords();

    try {
      const qualityItems = await loadQualitySampleRows();
      const evaluated = evaluateAllItems(qualityItems);
      state.taskItems = evaluated;
      state.taskRows = buildTaskRows(getQualityAggregations(evaluated).issueSummary || []);
      state.selectedTask = state.taskRows[0] || null;
      state.selectedTaskType = '';
      state.taskPage = 1;
      applyTaskFilters();
      renderTaskDetail();
      if (els.lastUpdated) els.lastUpdated.textContent = `Letzte Aktualisierung: ${formatDateTime(startedAt)}`;
    } catch (error) {
      console.error('Pflegeaufgaben konnten nicht geladen werden.', error);
      renderTasksEmpty('Die Pflegeaufgaben konnten nicht geladen werden.');
    }
  }

  function buildTaskRows(issueSummary) {
    return issueSummary
      .filter((issue) => issue.affectedCount > 0 && isActiveCriterion(issue.criterionId))
      .map((issue) => {
        const criterion = qualityCriteria.find((entry) => entry.id === issue.criterionId);
        const affectedTypes = (issue.affectedTypes || []).filter(Boolean);
        const openDataRelevant = isOpenDataRelevantCriterion(issue.criterionId);
        const impact = computeTaskImpact(issue, openDataRelevant);
        return {
          ...issue,
          criterion,
          affectedTypes,
          openDataRelevant,
          impact,
          description: taskDescription(issue.criterionId),
          problem: taskProblem(issue.criterionId),
          recommendation: criterion?.recommendation || issue.recommendation || 'Datensatz prüfen und fehlende Angaben ergänzen.'
        };
      })
      .sort((a, b) => (
        impactRank(b.impact) - impactRank(a.impact) ||
        priorityRank(b.priority) - priorityRank(a.priority) ||
        b.affectedCount - a.affectedCount ||
        a.label.localeCompare(b.label, 'de')
      ));
  }

  function isActiveCriterion(criterionId) {
    return [
      'opening_hours_missing',
      'license_missing',
      'description_missing',
      'image_missing',
      'image_author_missing',
      'public_transport_missing',
      'booking_link_missing'
    ].includes(criterionId);
  }

  function applyTaskFilters() {
    const query = (els.taskSearchInput?.value || '').trim().toLowerCase();
    const priority = els.taskPriorityFilter?.value || '';
    const type = els.taskTypeFilter?.value || '';
    const check = els.taskCheckFilter?.value || '';
    const impact = els.taskImpactFilter?.value || '';

    state.filteredTaskRows = state.taskRows.filter((task) => {
      const text = `${task.label} ${task.description} ${task.recommendation}`.toLowerCase();
      if (query && !text.includes(query)) return false;
      if (priority && task.priority !== priority) return false;
      if (type && !task.affectedTypes.includes(type)) return false;
      if (check === 'auto' && task.autoCheck === false) return false;
      if (check === 'manual' && task.autoCheck !== false) return false;
      if (impact && task.impact !== impact) return false;
      return true;
    });

    if (!state.filteredTaskRows.includes(state.selectedTask)) {
      state.selectedTask = state.filteredTaskRows[0] || null;
      state.selectedTaskType = '';
      clearTaskRecords();
    }

    renderTaskKpis(state.filteredTaskRows);
    renderTaskTable();
    renderTaskDetail();
  }

  function renderTaskKpis(tasks) {
    const totalTasks = tasks.length;
    const highTasks = tasks.filter((task) => task.priority === 'hoch').length;
    const affectedHits = tasks.reduce((sum, task) => sum + task.affectedCount, 0);
    const openDataHits = tasks
      .filter((task) => task.openDataRelevant)
      .reduce((sum, task) => sum + task.affectedCount, 0);
    const potential = computePotential(tasks);

    if (els.taskKpiOpen) els.taskKpiOpen.textContent = formatNumber(totalTasks);
    if (els.taskKpiHigh) els.taskKpiHigh.textContent = formatNumber(highTasks);
    if (els.taskKpiHighDetail) els.taskKpiHighDetail.textContent = totalTasks ? `${formatPercent(percent(highTasks, totalTasks))} aller Aufgaben` : '-';
    if (els.taskKpiAffected) els.taskKpiAffected.textContent = formatNumber(affectedHits);
    if (els.taskKpiOpenData) els.taskKpiOpenData.textContent = formatPercent(percent(openDataHits, affectedHits));
    if (els.taskKpiPotential) els.taskKpiPotential.textContent = potential;
    if (els.taskListTitle) els.taskListTitle.textContent = `Alle Pflegeaufgaben (${formatNumber(totalTasks)})`;
    if (els.taskDataNote) {
      els.taskDataNote.textContent = state.qualityDataMeta.truncated
        ? 'Die Anzahl betroffener Datensätze basiert auf den aktuellen Filtern und einer begrenzten Stichprobe.'
        : 'Die Anzahl betroffener Datensätze basiert auf den aktuell geladenen Qualitätsdaten.';
    }
  }

  function renderTaskTable() {
    const rows = state.filteredTaskRows;
    const totalPages = Math.max(1, Math.ceil(rows.length / state.taskRowsPerPage));
    state.taskPage = Math.max(1, Math.min(state.taskPage, totalPages));
    const start = (state.taskPage - 1) * state.taskRowsPerPage;
    const visibleRows = rows.slice(start, start + state.taskRowsPerPage);

    if (!visibleRows.length) {
      els.taskTableBody.innerHTML = '<tr><td colspan="7" class="table-empty">Für diese Auswahl wurden keine Pflegeaufgaben gefunden.</td></tr>';
    } else {
      els.taskTableBody.innerHTML = visibleRows.map((task) => `
        <tr>
          <td>
            <button class="task-table-action ${task === state.selectedTask ? 'active' : ''}" type="button" data-task-id="${escapeHtml(task.criterionId)}">
              <span class="task-icon ${task.priority === 'hoch' ? 'critical' : 'review'}" aria-hidden="true">${taskIcon(task.criterionId)}</span>
              <span><strong>${escapeHtml(task.label)}</strong><small>${escapeHtml(task.description)}</small></span>
            </button>
          </td>
          <td>${formatNumber(task.affectedCount)}</td>
          <td><span class="status-badge ${task.priority === 'hoch' ? 'critical' : 'review'}">${priorityLabel(task.priority)}</span></td>
          <td>${renderTypeChips(task.affectedTypes)}</td>
          <td><span class="status-badge good">${task.autoCheck === false ? 'Manuell' : 'Automatisch'}</span></td>
          <td><span class="status-badge ${impactBadgeClass(task.impact)}">${impactLabel(task.impact)}</span></td>
          <td><button class="row-arrow" type="button" data-task-id="${escapeHtml(task.criterionId)}" aria-label="Aufgabe anzeigen"><span class="material-icons" aria-hidden="true">chevron_right</span></button></td>
        </tr>
      `).join('');
    }

    els.taskTableBody.querySelectorAll('[data-task-id]').forEach((button) => {
      button.addEventListener('click', () => selectTask(button.dataset.taskId));
    });

    const end = Math.min(rows.length, start + visibleRows.length);
    if (els.taskTableCount) {
      els.taskTableCount.textContent = rows.length ? `${formatNumber(start + 1)}-${formatNumber(end)} von ${formatNumber(rows.length)} Aufgaben` : '0 Aufgaben';
    }
    if (els.taskPageStatus) els.taskPageStatus.textContent = `${state.taskPage} / ${totalPages}`;
    if (els.taskPrevPage) els.taskPrevPage.disabled = state.taskPage <= 1;
    if (els.taskNextPage) els.taskNextPage.disabled = state.taskPage >= totalPages;
  }

  function selectTask(criterionId) {
    state.selectedTask = state.filteredTaskRows.find((task) => task.criterionId === criterionId)
      || state.taskRows.find((task) => task.criterionId === criterionId)
      || null;
    state.selectedTaskType = '';
    clearTaskRecords();
    renderTaskTable();
    renderTaskDetail();
  }

  function renderTaskDetail() {
    const task = state.selectedTask;
    hidePrimarySystems();
    if (!task) {
      if (els.taskDetailContent) els.taskDetailContent.innerHTML = '<p class="empty-note">Wähle eine Pflegeaufgabe aus der Liste.</p>';
      return;
    }

    const needsTypeChoice = task.affectedTypes.length > 1 && !state.selectedTaskType;
    const typeChoice = task.affectedTypes.length > 1
      ? `<label class="detail-type-select">Datentyp für Datensatzliste<select id="task-detail-type">${task.affectedTypes.map((type) => `<option value="${escapeHtml(type)}"${type === state.selectedTaskType ? ' selected' : ''}>${escapeHtml(type)}</option>`).join('')}</select></label>`
      : '';
    const selectedType = state.selectedTaskType || task.affectedTypes[0] || '';

    els.taskDetailContent.innerHTML = `
      <h3>${escapeHtml(task.label)}</h3>
      <dl class="task-detail-list">
        <dt>Problem</dt>
        <dd>${escapeHtml(task.problem)}</dd>
        <dt>Auswirkung</dt>
        <dd><span class="impact-dot ${impactBadgeClass(task.impact)}"></span>${escapeHtml(impactLabel(task.impact))}. ${escapeHtml(taskImpactText(task.criterionId))}</dd>
        <dt>Empfohlene Aktion</dt>
        <dd>${escapeHtml(task.recommendation)}</dd>
        <dt>Betroffene Typen</dt>
        <dd>${renderTypeChips(task.affectedTypes)}</dd>
        <dt>Prüfbarkeit</dt>
        <dd>${task.autoCheck === false ? 'Manuell zu prüfen' : 'Automatisch prüfbar'}</dd>
        <dt>Datenbasis</dt>
        <dd>${state.qualityDataMeta.truncated ? 'Begrenzte Stichprobe' : 'Geladene Qualitätsdaten'}</dd>
      </dl>
      ${typeChoice}
      <button id="task-open-records" class="primary-action" type="button">${needsTypeChoice ? 'Datentyp auswählen und Datensätze anzeigen' : 'Datensätze anzeigen'}<span class="material-icons" aria-hidden="true">arrow_forward</span></button>
    `;

    const typeSelect = document.getElementById('task-detail-type');
    if (typeSelect && !state.selectedTaskType) state.selectedTaskType = typeSelect.value;
    typeSelect?.addEventListener('change', () => {
      state.selectedTaskType = typeSelect.value;
      clearTaskRecords();
    });
    document.getElementById('task-open-records')?.addEventListener('click', () => {
      const type = typeSelect?.value || selectedType;
      if (type) state.selectedTaskType = type;
      void loadTaskRecords();
    });

    renderPrimarySystemsForTask(task);
  }

  async function loadTaskRecords() {
    const task = state.selectedTask;
    const type = state.selectedTaskType || task?.affectedTypes?.[0] || '';
    if (!task || !type) {
      showTaskMessage('Bitte wähle zuerst eine konkrete Aufgabe und einen Datentyp.');
      return;
    }

    showTaskMessage('');
    els.taskRecordsSection.hidden = false;
    els.taskRecordsExport.disabled = true;
    els.taskRecordsTitle.textContent = `${task.label} - ${type}`;
    els.taskRecordsNote.textContent = 'Datensätze werden geladen ...';
    els.taskRecordsBody.innerHTML = '<tr><td colspan="6" class="table-empty">Datensätze werden geladen ...</td></tr>';

    try {
      const params = new URLSearchParams();
      params.set('criterionId', task.criterionId);
      params.set('type', type);
      params.set('limit', '25');
      params.set('scanPageSize', '50');
      params.set('maxPages', '4');
      const query = buildQuery(state.context);
      if (query) params.set('query', query);

      const payload = await fetchJson(`${QUALITY_SCAN_API_BASE}?${params.toString()}`);
      const rows = extractItems(payload).map((item) => normalizeItem(item, type));
      state.taskRecordRows = rows;
      state.taskRecordMeta = payload;
      renderTaskRecords(task, type, rows, payload);
      renderPrimarySystemsForRecords(rows);
    } catch (error) {
      console.error('Datensätze zur Pflegeaufgabe konnten nicht geladen werden.', error);
      els.taskRecordsNote.textContent = 'Die Datensätze konnten nicht geladen werden.';
      els.taskRecordsBody.innerHTML = '<tr><td colspan="6" class="table-empty">Die Datensätze konnten nicht geladen werden.</td></tr>';
    }
  }

  function renderTaskRecords(task, type, rows, payload) {
    const page = payload?.page || {};
    const stats = payload?.stats || {};
    const completeText = page.complete ? 'Server-Scan abgeschlossen.' : 'Server-Scan mit begrenztem Budget geladen.';
    els.taskRecordsNote.textContent = `${completeText} ${formatNumber(rows.length)} Datensätze angezeigt.`;
    els.taskRecordsExport.disabled = !rows.length;

    if (!rows.length) {
      els.taskRecordsBody.innerHTML = '<tr><td colspan="6" class="table-empty">Für diese Aufgabe wurden keine Datensätze gefunden.</td></tr>';
      return;
    }

    els.taskRecordsBody.innerHTML = rows.map((row) => `
      <tr>
        <td><strong>${escapeHtml(row.title)}</strong><small>${escapeHtml(row.globalId || row.id || '')}</small></td>
        <td>${escapeHtml(row.type || type)}</td>
        <td>${escapeHtml([row.city, row.region].filter(Boolean).join(' / ') || '-')}</td>
        <td>${escapeHtml(task.label)}</td>
        <td>${escapeHtml(task.recommendation)}</td>
        <td><span class="row-actions"><button class="plain-button" type="button" data-copy-id="${escapeHtml(row.globalId || row.id || '')}">ID kopieren</button><a class="plain-button" href="${escapeHtml(buildRecordDetailUrl(row))}">Detail öffnen</a></span></td>
      </tr>
    `).join('');

    els.taskRecordsBody.querySelectorAll('[data-copy-id]').forEach((button) => {
      button.addEventListener('click', () => copyText(button.dataset.copyId || ''));
    });
    if (stats.budgetExhausted) console.debug('Qualitätsscan-Budget ausgeschoepft.', stats);
  }

  function renderTasksLoading() {
    [els.taskKpiOpen, els.taskKpiHigh, els.taskKpiAffected, els.taskKpiOpenData, els.taskKpiPotential].forEach((node) => {
      if (node) node.textContent = '...';
    });
    if (els.taskKpiHighDetail) els.taskKpiHighDetail.textContent = '...';
    if (els.taskTableBody) els.taskTableBody.innerHTML = '<tr><td colspan="7" class="table-empty">Pflegeaufgaben werden geladen ...</td></tr>';
    if (els.taskTableCount) els.taskTableCount.textContent = '-';
    if (els.taskDetailContent) els.taskDetailContent.innerHTML = '<p class="empty-note">Pflegeaufgaben werden geladen ...</p>';
  }

  function renderTasksEmpty(message) {
    [els.taskKpiOpen, els.taskKpiHigh, els.taskKpiAffected, els.taskKpiOpenData, els.taskKpiPotential].forEach((node) => {
      if (node) node.textContent = '-';
    });
    if (els.taskKpiHighDetail) els.taskKpiHighDetail.textContent = '-';
    if (els.taskTableBody) els.taskTableBody.innerHTML = '<tr><td colspan="7" class="table-empty">Noch keine Pflegeaufgaben geladen.</td></tr>';
    if (els.taskTableCount) els.taskTableCount.textContent = '0 Aufgaben';
    if (els.taskDetailContent) els.taskDetailContent.innerHTML = '<p class="empty-note">Wähle einen Arbeitskontext und starte die Abfrage.</p>';
    showTaskMessage(message);
  }

  function resetTaskFilters() {
    if (els.taskSearchInput) els.taskSearchInput.value = '';
    if (els.taskPriorityFilter) els.taskPriorityFilter.value = '';
    if (els.taskTypeFilter) els.taskTypeFilter.value = '';
    if (els.taskCheckFilter) els.taskCheckFilter.value = '';
    if (els.taskImpactFilter) els.taskImpactFilter.value = '';
    state.taskPage = 1;
    applyTaskFilters();
  }

  function changeTaskPage(delta) {
    state.taskPage += delta;
    renderTaskTable();
  }

  function fillTaskTypeFilter() {
    if (!els.taskTypeFilter || els.taskTypeFilter.options.length > 1) return;
    TYPES.forEach((type) => els.taskTypeFilter.append(new Option(`Datentyp: ${type}`, type)));
  }

  function clearTaskRecords() {
    state.taskRecordRows = [];
    state.taskRecordMeta = null;
    if (els.taskRecordsSection) els.taskRecordsSection.hidden = true;
    if (els.taskRecordsExport) els.taskRecordsExport.disabled = true;
  }

  function showTaskMessage(message) {
    if (!els.taskMessage) return;
    els.taskMessage.textContent = message || '';
    els.taskMessage.hidden = !message;
  }

  async function loadRecordsData() {
    const startedAt = new Date();
    showRecordsMessage('');
    renderRecordsLoading();

    try {
      const qualityItems = await loadQualitySampleRows();
      const evaluated = evaluateAllItems(qualityItems);
      state.recordItems = evaluated;
      state.recordRows = evaluated.map(buildRecordViewModel);
      state.recordDataMeta = { ...state.qualityDataMeta };
      state.recordPage = 1;
      fillRecordDynamicFilters();
      applyRecordFilters();
      if (els.lastUpdated) els.lastUpdated.textContent = `Letzte Aktualisierung: ${formatDateTime(startedAt)}`;
    } catch (error) {
      console.error('Datensätze konnten nicht geladen werden.', error);
      renderRecordsEmpty('Die Datensätze konnten nicht geladen werden. Bitte versuche es später erneut.');
    }
  }

  function buildRecordViewModel(item) {
    const missingCriteria = Array.isArray(item.missingCriteria) ? item.missingCriteria : [];
    const primaryIssueId = getPrimaryIssueId(item);
    const primaryCriterion = qualityCriteria.find((criterion) => criterion.id === primaryIssueId);
    const id = item.id || extractId(item.raw || item);
    const globalId = item.globalId || getFirst(item, ['global_id', 'globalId', 'raw.global_id', 'raw.globalId']);
    return {
      item,
      id,
      globalId,
      title: item.title || 'Ohne Titel',
      type: item.type || '',
      thumbnailUrl: getRecordThumbnailUrl(item),
      city: item.city || '',
      region: item.region || '',
      category: item.category || '',
      qualityStatus: item.qualityStatus || 'nicht berechenbar',
      qualityScore: Number.isFinite(item.qualityScore) ? item.qualityScore : null,
      primaryIssueId,
      primaryIssue: primaryCriterion?.label || '-',
      recommendation: primaryCriterion?.recommendation || '',
      missingCriteria,
      updatedAt: item.updatedAt || '',
      detailUrl: buildRecordDetailUrl({ id, globalId, type: item.type || '' }),
      searchText: ''
    };
  }

  function fillRecordControls() {
    if (els.recordTypeFilter && els.recordTypeFilter.options.length <= 1) {
      TYPES.forEach((type) => els.recordTypeFilter.append(new Option(`Typ: ${type}`, type)));
    }
    if (els.recordIssueFilter && els.recordIssueFilter.options.length <= 1) {
      qualityCriteria
        .filter((criterion) => isActiveCriterion(criterion.id))
        .forEach((criterion) => els.recordIssueFilter.append(new Option(`Problem: ${criterion.label}`, criterion.id)));
    }
  }

  function fillRecordDynamicFilters() {
    if (!els.recordCategoryFilter) return;
    const current = els.recordCategoryFilter.value;
    const categories = Array.from(new Set(state.recordRows.map((row) => row.category).filter(Boolean)))
      .sort((a, b) => a.localeCompare(b, 'de'))
      .slice(0, 80);
    els.recordCategoryFilter.replaceChildren(new Option('Kategorie: Alle', ''));
    categories.forEach((category) => els.recordCategoryFilter.append(new Option(`Kategorie: ${category}`, category)));
    if (categories.includes(current)) els.recordCategoryFilter.value = current;
  }

  function applyRecordFilters() {
    const query = (els.recordSearchInput?.value || '').trim();
    const type = els.recordTypeFilter?.value || '';
    const category = els.recordCategoryFilter?.value || '';
    const status = els.recordStatusFilter?.value || '';
    const issue = els.recordIssueFilter?.value || '';

    state.filteredRecordRows = state.recordRows.filter((row) => {
      if (query && !itemMatchesRecordSearch(row, query)) return false;
      if (type && row.type !== type) return false;
      if (category && row.category !== category) return false;
      if (status && row.qualityStatus !== status) return false;
      if (issue && !row.missingCriteria.includes(issue)) return false;
      return true;
    });

    renderRecordQuickCounts();
    renderRecordStatusLegend();
    renderRecordTable();
    renderRecordDataNote();
    showRecordsMessage('');
  }

  async function handleRecordSearchSubmit() {
    state.recordPage = 1;
    applyRecordFilters();
    const query = (els.recordSearchInput?.value || '').trim();
    if (!query || state.filteredRecordRows.length || !looksLikeRecordId(query)) return;

    if (els.recordSearchButton) els.recordSearchButton.textContent = 'Suchen ...';
    try {
      const found = await searchSingleRecordById(query);
      if (!found.length) {
        showRecordsMessage('Für diese ID wurde kein Datensatz gefunden. Bitte prüfe die Eingabe oder suche nach dem Titel.');
        return;
      }
      const evaluated = evaluateAllItems(found.map((raw) => normalizeItem(raw.raw || raw, raw.type)));
      const merged = mergeRecordItems(state.recordItems, evaluated);
      state.recordItems = merged;
      state.recordRows = merged.map(buildRecordViewModel);
      fillRecordDynamicFilters();
      applyRecordFilters();
    } catch (error) {
      console.error('Gezielte Datensatzsuche fehlgeschlagen.', error);
      showRecordsMessage('Für diese Suche wurde kein Datensatz gefunden.');
    } finally {
      if (els.recordSearchButton) els.recordSearchButton.textContent = 'Suchen';
    }
  }

  async function searchSingleRecordById(query) {
    const targetTypes = state.context.type ? [state.context.type] : TYPES;
    const contextQuery = buildQuery(state.context);
    const idQuery = cleanQueryValue(query);
    const queryVariants = [
      idQuery,
      `id:"${idQuery}"`,
      `global_id:"${idQuery}"`
    ];
    const results = [];

    for (const type of targetTypes) {
      for (const variant of queryVariants) {
        const combinedQuery = [contextQuery, variant].filter(Boolean).join(' AND ');
        const payload = await fetchJson(buildUrl(type, combinedQuery, { limit: 10 }));
        results.push(...extractItems(payload).map((raw) => normalizeItem(raw, type)));
        if (results.length) break;
      }
      if (results.length) break;
    }
    return results;
  }

  function mergeRecordItems(existing, incoming) {
    const map = new Map();
    [...existing, ...incoming].forEach((item) => {
      const key = item.globalId || item.id || `${item.type}:${item.title}`;
      if (key) map.set(key, item);
    });
    return Array.from(map.values());
  }

  function renderRecordTable() {
    const rows = state.filteredRecordRows;
    const totalPages = Math.max(1, Math.ceil(rows.length / state.recordRowsPerPage));
    state.recordPage = Math.max(1, Math.min(state.recordPage, totalPages));
    const start = (state.recordPage - 1) * state.recordRowsPerPage;
    const visibleRows = rows.slice(start, start + state.recordRowsPerPage);

    if (!visibleRows.length) {
      const emptyText = state.recordRows.length
        ? 'Für diese Filter wurden keine Datensätze gefunden.'
        : 'Noch keine Datensätze geladen. Wähle einen Arbeitskontext oder starte eine Suche.';
      els.recordTableBody.innerHTML = `<tr><td colspan="9" class="table-empty">${emptyText}</td></tr>`;
    } else {
      els.recordTableBody.innerHTML = visibleRows.map((row) => `
        <tr>
          <td>${renderRecordTitleCell(row)}</td>
          <td><span class="type-chip ${row.type.toLowerCase()}">${escapeHtml(row.type || '-')}</span></td>
          <td>${escapeHtml(row.city || '-')}<small>${escapeHtml(row.region || '')}</small></td>
          <td>${escapeHtml(row.category || '-')}</td>
          <td>${renderRecordStatus(row.qualityStatus)}</td>
          <td>${escapeHtml(row.primaryIssue)}</td>
          <td>${renderRecordScore(row.qualityScore)}</td>
          <td>${escapeHtml(formatRecordDate(row.updatedAt))}</td>
          <td>
            <span class="row-actions">
              <a class="icon-button" href="${escapeHtml(row.detailUrl)}" aria-label="Datensatz ansehen"><span class="material-icons" aria-hidden="true">visibility</span></a>
              <a class="icon-button" href="${escapeHtml(row.detailUrl)}" aria-label="Detail öffnen"><span class="material-icons" aria-hidden="true">chevron_right</span></a>
            </span>
          </td>
        </tr>
      `).join('');
    }

    const end = Math.min(rows.length, start + visibleRows.length);
    const totalText = state.recordDataMeta.truncated ? `${formatNumber(rows.length)} Stichprobentreffern` : `${formatNumber(rows.length)} Datensätzen`;
    if (els.recordPageRange) {
      els.recordPageRange.textContent = rows.length ? `Zeige ${formatNumber(start + 1)} bis ${formatNumber(end)} von ${totalText}` : '0 Datensätze';
    }
    if (els.recordResultSummary) {
      els.recordResultSummary.textContent = `Ergebnisse: ${state.recordDataMeta.truncated ? `${formatNumber(rows.length)} Stichprobentreffer` : `${formatNumber(rows.length)} Datensätze`}`;
    }
    if (els.recordPageStatus) els.recordPageStatus.textContent = `${state.recordPage} / ${totalPages}`;
    if (els.recordPrevPage) els.recordPrevPage.disabled = state.recordPage <= 1;
    if (els.recordNextPage) els.recordNextPage.disabled = state.recordPage >= totalPages;
    if (els.recordExport) els.recordExport.disabled = !rows.length;
  }

  function renderRecordTitleCell(row) {
    const image = row.thumbnailUrl
      ? `<img src="${escapeHtml(row.thumbnailUrl)}" alt="">`
      : '<span class="record-thumb-placeholder" aria-hidden="true"></span>';
    const ids = [row.id ? `ID: ${row.id}` : '', row.globalId || ''].filter(Boolean).join(' - ');
    return `
      <span class="record-title-cell">
        <span class="record-thumb">${image}</span>
        <span><strong>${escapeHtml(row.title)}</strong><small>${escapeHtml(ids)}</small></span>
      </span>
    `;
  }

  function renderRecordStatus(status) {
    const cls = status === 'gut' ? 'good' : status === 'kritisch' ? 'critical' : status === 'pruefen' ? 'review' : 'muted';
    const label = status === 'nicht berechenbar' ? 'nicht bewertbar' : status === 'pruefen' ? 'prüfen' : status;
    return `<span class="record-status"><i class="status-dot ${cls}"></i>${escapeHtml(label || '-')}</span>`;
  }

  function renderRecordScore(score) {
    if (!Number.isFinite(score)) return '-';
    const cls = score >= 80 ? 'good' : score >= 60 ? 'review' : 'critical';
    return `
      <span class="record-score">
        <strong>${formatNumber(score)} <small>/ 100</small></strong>
        <span class="score-mini-track"><i class="${cls}" style="width:${Math.max(0, Math.min(100, score))}%"></i></span>
      </span>
    `;
  }

  function renderRecordsLoading() {
    if (els.recordTableBody) els.recordTableBody.innerHTML = '<tr><td colspan="9" class="table-empty">Datensätze werden geladen ...</td></tr>';
    if (els.recordResultSummary) els.recordResultSummary.textContent = 'Datensätze werden geladen ...';
    if (els.recordPageRange) els.recordPageRange.textContent = '-';
    if (els.recordExport) els.recordExport.disabled = true;
  }

  function renderRecordsEmpty(message) {
    if (els.recordTableBody) els.recordTableBody.innerHTML = '<tr><td colspan="9" class="table-empty">Die Datensätze konnten nicht geladen werden.</td></tr>';
    if (els.recordResultSummary) els.recordResultSummary.textContent = '0 Datensätze';
    if (els.recordPageRange) els.recordPageRange.textContent = '0 Datensätze';
    if (els.recordExport) els.recordExport.disabled = true;
    showRecordsMessage(message);
  }

  function renderRecordQuickCounts() {
    const rows = state.recordRows;
    setText(els.quickCountCritical, rows.filter((row) => row.qualityStatus === 'kritisch').length);
    setText(els.quickCountLicense, rows.filter((row) => row.missingCriteria.includes('license_missing')).length);
    setText(els.quickCountDescription, rows.filter((row) => row.missingCriteria.includes('description_missing')).length);
    setText(els.quickCountImage, rows.filter((row) => row.missingCriteria.includes('image_missing')).length);
    setText(els.quickCountOpenings, rows.filter((row) => row.missingCriteria.includes('opening_hours_missing')).length);
  }

  function renderRecordStatusLegend() {
    const rows = state.filteredRecordRows;
    setText(els.legendGood, rows.filter((row) => row.qualityStatus === 'gut').length);
    setText(els.legendReview, rows.filter((row) => row.qualityStatus === 'pruefen').length);
    setText(els.legendCritical, rows.filter((row) => row.qualityStatus === 'kritisch').length);
    setText(els.legendUnknown, rows.filter((row) => row.qualityStatus === 'nicht berechenbar').length);
  }

  function renderRecordDataNote() {
    if (!els.recordDataNote) return;
    els.recordDataNote.textContent = state.recordDataMeta.truncated
      ? 'Diese Liste basiert auf einer begrenzten Stichprobe. Die Qualitätsbewertung basiert auf den aktivierten Kriterien und verfügbaren Daten.'
      : 'Die Qualitätsbewertung basiert auf den aktivierten Kriterien und verfügbaren Daten.';
  }

  function resetRecordFilters() {
    if (els.recordSearchInput) els.recordSearchInput.value = '';
    if (els.recordTypeFilter) els.recordTypeFilter.value = '';
    if (els.recordCategoryFilter) els.recordCategoryFilter.value = '';
    if (els.recordStatusFilter) els.recordStatusFilter.value = '';
    if (els.recordIssueFilter) els.recordIssueFilter.value = '';
    state.recordPage = 1;
    applyRecordFilters();
  }

  function applyQuickRecordFilter(value) {
    resetRecordFilters();
    if (value === 'critical' && els.recordStatusFilter) els.recordStatusFilter.value = 'kritisch';
    if (value !== 'critical' && els.recordIssueFilter) els.recordIssueFilter.value = value;
    state.recordPage = 1;
    applyRecordFilters();
  }

  function changeRecordPage(delta) {
    state.recordPage += delta;
    renderRecordTable();
  }

  function itemMatchesRecordSearch(row, query) {
    const needle = query.toLowerCase();
    return getRecordSearchText(row).includes(needle);
  }

  function getRecordSearchText(row) {
    if (!row.searchText) {
      const issueLabels = row.missingCriteria
        .map((id) => qualityCriteria.find((criterion) => criterion.id === id)?.label || id)
        .join(' ');
      row.searchText = [
        row.title,
        row.id,
        row.globalId,
        row.city,
        row.region,
        row.category,
        row.type,
        row.primaryIssue,
        issueLabels
      ].join(' ').toLowerCase();
    }
    return row.searchText;
  }

  function looksLikeRecordId(query) {
    const value = String(query || '').trim();
    return /^\d{5,}$/.test(value) || /^[a-z]_\d{4,}$/i.test(value) || /^[a-z]+[-_:]\w{4,}$/i.test(value);
  }

  function getPrimaryIssueId(item) {
    const missing = Array.isArray(item.missingCriteria) ? item.missingCriteria : [];
    return [...missing]
      .sort((a, b) => {
        const ca = qualityCriteria.find((criterion) => criterion.id === a);
        const cb = qualityCriteria.find((criterion) => criterion.id === b);
        return priorityRank(cb?.priority) - priorityRank(ca?.priority);
      })[0] || '';
  }

  function getRecordThumbnailUrl(item) {
    const media = qualityHelpers.getMediaObjects(item.raw || item)
      .find((entry) => qualityHelpers.isCheckableMediaObject(entry));
    return getFirst(media, ['url', 'contentUrl', 'previewUrl', 'thumbnailUrl']) || '';
  }

  function buildRecordDetailUrl(row) {
    const params = new URLSearchParams();
    if (row.type) params.set('type', row.type);
    if (row.globalId) params.set('global_id', row.globalId);
    else if (row.id) params.set('id', row.id);
    return `/Statistik/record-detail.html?${params.toString()}`;
  }

  function exportRecordListCsv() {
    if (!state.filteredRecordRows.length) return;
    const rows = [
      ['Titel', 'Typ', 'Ort', 'Gebiet', 'Kategorie', 'Qualitätsstatus', 'Qualitäts-Score', 'Hauptproblem', 'Fehlende Kriterien', 'ID', 'global_id', 'Aktualisiert', 'Datenbasis'],
      ...state.filteredRecordRows.map((row) => [
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
        row.updatedAt,
        state.recordDataMeta.truncated ? 'Stichprobe' : 'geladene Daten'
      ])
    ];
    const text = rows.map((row) => row.map(csvValue).join(';')).join('\n');
    downloadText('satourn_datensaetze_liste.csv', text, 'text/csv;charset=utf-8');
  }

  function showRecordsMessage(message) {
    if (!els.recordsMessage) return;
    els.recordsMessage.textContent = message || '';
    els.recordsMessage.hidden = !message;
  }

  function setText(node, value) {
    if (node) node.textContent = formatNumber(value);
  }

  async function loadRecordDetail() {
    showDetailMessage('');
    renderDetailLoading();
    const params = new URLSearchParams(location.search);
    const type = params.get('type') || state.context.type || '';
    const id = params.get('id') || '';
    const globalId = params.get('global_id') || params.get('globalId') || '';

    if (!id && !globalId) {
      renderDetailEmpty('Noch kein Datensatz ausgewaehlt. Suche in der Datensatzliste nach Titel, ID oder Ort und oeffne einen Eintrag.');
      return;
    }

    try {
      const raw = await fetchRecordDetailItem({ type, id, globalId });
      if (!raw) {
        renderDetailEmpty('Für diese ID wurde kein Datensatz gefunden. Bitte prüfe Typ und ID oder kehre zur Datensatzliste zurück.');
        return;
      }
      const normalized = normalizeItem(raw, type || getFirst(raw, ['type', 'typeName']));
      const evaluated = evaluateQualityForItem(normalized);
      state.recordDetailItem = evaluated;
      state.recordDetailViewModel = getRecordDetailViewModel(evaluated);
      renderRecordDetail(state.recordDetailViewModel);
      if (els.lastUpdated) els.lastUpdated.textContent = `Letzte Aktualisierung: ${formatDateTime(new Date())}`;
    } catch (error) {
      console.error('Datensatz-Detail konnte nicht geladen werden.', error);
      renderDetailEmpty('Der Datensatz konnte nicht geladen werden.');
    }
  }

  async function fetchRecordDetailItem({ type, id, globalId }) {
    const targetTypes = type ? [type] : TYPES;
    const identifier = cleanQueryValue(globalId || id);
    const variants = globalId
      ? [`global_id:"${identifier}"`, identifier]
      : [`id:"${identifier}"`, identifier];

    for (const targetType of targetTypes) {
      for (const variant of variants) {
        const payload = await fetchJson(buildUrl(targetType, variant, { limit: 5 }));
        const item = extractItems(payload).find((entry) => {
          const entryId = String(extractId(entry) || '');
          const entryGlobalId = String(getFirst(entry, ['global_id', 'globalId']) || '');
          return (id && entryId === String(id)) || (globalId && entryGlobalId === String(globalId)) || entryId === identifier || entryGlobalId === identifier;
        }) || extractItems(payload)[0];
        if (item) return item;
      }
    }
    return null;
  }

  function getRecordDetailViewModel(item) {
    const raw = item.raw || item;
    const criteria = qualityCriteria.filter((criterion) => !criterion.types?.length || criterion.types.includes(item.type));
    const missing = new Set(item.missingCriteria || []);
    const fulfilled = new Set(item.fulfilledCriteria || []);
    const manual = new Set(item.manualCriteria || []);
    const images = getCheckableImages(item);
    const missingCopyright = qualityHelpers.findMissingCopyrightMedia(raw);
    const et4Url = buildVerifiedEt4Url(item);

    return {
      identity: {
        title: item.title || 'Ohne Titel',
        type: item.type || '',
        id: item.id || '',
        globalId: item.globalId || '',
        category: item.category || '',
        city: item.city || '',
        region: item.region || '',
        updatedAt: item.updatedAt || getFirst(raw, ['changed', 'updatedAt', 'lastModified'])
      },
      quality: {
        status: item.qualityStatus || 'nicht berechenbar',
        score: Number.isFinite(item.qualityScore) ? item.qualityScore : null,
        fulfilledCount: criteria.filter((criterion) => fulfilled.has(criterion.id)).length,
        missingCount: criteria.filter((criterion) => missing.has(criterion.id)).length,
        manualCount: criteria.filter((criterion) => manual.has(criterion.id)).length,
        criteria: criteria.map((criterion) => ({
          id: criterion.id,
          label: criterion.label,
          recommendation: criterion.recommendation,
          status: missing.has(criterion.id) ? 'fehlt' : fulfilled.has(criterion.id) ? 'erfüllt' : manual.has(criterion.id) ? 'nicht bewertbar' : 'nicht relevant'
        }))
      },
      issues: criteria
        .filter((criterion) => missing.has(criterion.id))
        .sort((a, b) => priorityRank(b.priority) - priorityRank(a.priority))
        .slice(0, 5),
      usability: getDetailUsability(item, images, missingCopyright),
      texts: {
        description: getDisplayDescription(raw),
        teaser: getTextByRel(raw, 'teaser'),
        openings: getOpeningHoursSummary(item),
        directions: getTextByRel(raw, 'directions') || (qualityHelpers.hasPublicTransportFeature(raw) ? 'ÖPNV-Information vorhanden.' : 'Keine ÖPNV-Information vorhanden.'),
        price: getTextByRel(raw, 'PRICE_INFO')
      },
      media: {
        images,
        missingCopyrightCount: missingCopyright.length,
        missingAltCount: images.filter((image) => !textValue(image.alt)).length
      },
      details: {
        license: qualityHelpers.getAttributeValue(raw, 'license') || '',
        licenseUrl: qualityHelpers.getAttributeValue(raw, 'licenseurl') || '',
        source: getFirst(raw, ['source', 'provider', 'channel']) || 'Destination.One',
        web: getFirst(raw, ['web', 'url']) || '',
        email: getFirst(raw, ['email']) || '',
        phone: getFirst(raw, ['phone']) || '',
        outdooractiveId: qualityHelpers.getAttributeValue(raw, 'SYSTEMID_outdooractive') || '',
        googlePlacesId: qualityHelpers.getAttributeValue(raw, 'SYSTEMID_GOOGLEPLACES') || '',
        et4Url
      }
    };
  }

  function renderRecordDetail(model) {
    els.detailHeadCard.innerHTML = `
      <div class="detail-head-left">
        <h1 id="record-detail-title">${escapeHtml(model.identity.title)} <span class="type-chip ${model.identity.type.toLowerCase()}">${escapeHtml(model.identity.type || '-')}</span></h1>
        <p>${escapeHtml([model.identity.city, model.identity.region, model.identity.category].filter(Boolean).join(' - ') || 'Ort und Kategorie nicht angegeben')}</p>
        <div class="detail-id-row">
          <button type="button" class="context-edit" data-copy-detail="${escapeHtml(model.identity.id)}">ID: ${escapeHtml(model.identity.id || '-')}</button>
          <button type="button" class="context-edit" data-copy-detail="${escapeHtml(model.identity.globalId)}">global_id: ${escapeHtml(model.identity.globalId || '-')}</button>
          <span class="context-edit">Letzte Aktualisierung: ${escapeHtml(formatRecordDate(model.identity.updatedAt))}</span>
        </div>
      </div>
      <div class="detail-quality-summary">
        <div>${renderRecordStatus(model.quality.status)}<strong>${model.quality.score == null ? '-' : `${formatNumber(model.quality.score)} / 100`}</strong></div>
        <dl>
          <dt>Positive Kriterien</dt><dd>${formatNumber(model.quality.fulfilledCount)}</dd>
          <dt>Fehlende Kriterien</dt><dd>${formatNumber(model.quality.missingCount)}</dd>
          <dt>Nicht bewertbar</dt><dd>${formatNumber(model.quality.manualCount)}</dd>
        </dl>
      </div>
    `;
    els.detailHeadCard.querySelectorAll('[data-copy-detail]').forEach((button) => {
      button.addEventListener('click', () => copyText(button.dataset.copyDetail || ''));
    });

    els.detailContent.hidden = false;
    els.detailCriteriaCard.hidden = false;
    renderDetailIssues(model);
    renderDetailUsability(model);
    renderDetailTextCards(model);
    renderDetailMedia(model);
    renderDetailInfo(model);
    renderDetailCriteria(model);

    if (model.details.et4Url && els.detailEt4Link) {
      els.detailEt4Link.href = model.details.et4Url;
      els.detailEt4Link.hidden = false;
    }
  }

  function renderDetailIssues(model) {
    if (!model.issues.length) {
      els.detailIssuesList.innerHTML = '<p class="empty-note">Keine priorisierten Baustellen gefunden.</p>';
      return;
    }
    els.detailIssuesList.innerHTML = model.issues.map((criterion) => `
      <div class="detail-issue-row">
        <span class="impact-dot ${criterion.priority === 'hoch' ? 'critical' : 'review'}"></span>
        <span><strong>${escapeHtml(criterion.label)}</strong><small>${escapeHtml(criterion.recommendation)}</small></span>
        <span class="status-badge ${criterion.priority === 'hoch' ? 'critical' : 'medium'}">${criterion.priority === 'hoch' ? 'hoch' : 'mittel'}</span>
      </div>
    `).join('');
  }

  function renderDetailUsability(model) {
    els.detailUsability.innerHTML = model.usability.map((entry) => `
      <div><span>${escapeHtml(entry.label)}</span><strong class="${entry.ok ? 'ok' : entry.relevant === false ? 'muted' : 'bad'}">${escapeHtml(entry.value)}</strong></div>
    `).join('');
    els.detailTaxonomy.innerHTML = renderKvRows([
      ['Kategorie', model.identity.category || 'Nicht angegeben'],
      ['Gebiet', model.identity.region || 'Nicht angegeben'],
      ['Ort', model.identity.city || 'Nicht angegeben']
    ]);
  }

  function renderDetailTextCards(model) {
    els.detailDescription.innerHTML = `<p>${escapeHtml(model.texts.description || 'Keine Beschreibung vorhanden.')}</p>${model.texts.teaser ? `<p class="data-note">${escapeHtml(model.texts.teaser)}</p>` : ''}`;
    els.detailOpenings.innerHTML = `<p>${escapeHtml(model.texts.openings)}</p>`;
    els.detailTransport.innerHTML = `<p>${escapeHtml(model.texts.directions)}</p>${model.texts.price ? `<p class="data-note">${escapeHtml(model.texts.price)}</p>` : ''}`;
  }

  function renderDetailMedia(model) {
    if (!model.media.images.length) {
      els.detailMedia.innerHTML = '<p class="empty-note">Keine prüfbaren Bilder vorhanden.</p>';
      els.detailMediaNote.textContent = '';
      return;
    }
    els.detailMedia.innerHTML = model.media.images.slice(0, 5).map((image) => `
      <figure>
        <img src="${escapeHtml(image.url)}" alt="${escapeHtml(image.alt || image.value || '')}" loading="lazy">
        <figcaption>${escapeHtml(image.value || image.description || 'Bild')}</figcaption>
      </figure>
    `).join('');
    els.detailMediaNote.textContent = `${formatNumber(model.media.images.length)} Bilder vorhanden. ${formatNumber(model.media.missingCopyrightCount)} ohne Urheberangabe. ${formatNumber(model.media.missingAltCount)} ohne Alt-Text.`;
  }

  function renderDetailInfo(model) {
    const rows = [
      ['ID', escapeHtml(model.identity.id || '-')],
      ['global_id', escapeHtml(model.identity.globalId || '-')],
      ['Quelle', escapeHtml(model.details.source || '-')],
      ['ET4 pages', model.details.et4Url ? `<a href="${escapeHtml(model.details.et4Url)}" target="_blank" rel="noopener">Öffnen auf et4 pages</a>` : 'Nicht verfügbar'],
      ['Web', model.details.web ? `<a href="${escapeHtml(model.details.web)}" target="_blank" rel="noopener">Datensatz öffnen</a>` : 'Nicht angegeben'],
      ['Lizenz', escapeHtml(model.details.license || 'Lizenz fehlt')],
      ['Outdooractive-ID', escapeHtml(model.details.outdooractiveId || 'Nicht vorhanden')],
      ['Google-Places-ID', escapeHtml(model.details.googlePlacesId || 'Nicht vorhanden')]
    ];
    els.detailInfo.innerHTML = renderKvRows(rows, true);
  }

  function renderDetailCriteria(model) {
    els.detailCriteriaList.innerHTML = model.quality.criteria.map((criterion) => `
      <span class="criteria-chip ${criterion.status.replaceAll(' ', '-')}">
        <strong>${escapeHtml(criterion.label)}</strong>
        <small>${escapeHtml(criterion.status)}</small>
      </span>
    `).join('');
  }

  function renderDetailLoading() {
    if (els.detailHeadCard) els.detailHeadCard.innerHTML = '<div class="table-empty">Datensatz wird geladen ...</div>';
    if (els.detailContent) els.detailContent.hidden = true;
    if (els.detailCriteriaCard) els.detailCriteriaCard.hidden = true;
    if (els.detailEt4Link) els.detailEt4Link.hidden = true;
  }

  function renderDetailEmpty(message) {
    if (els.detailHeadCard) els.detailHeadCard.innerHTML = `<div class="table-empty">${escapeHtml(message)}</div>`;
    if (els.detailContent) els.detailContent.hidden = true;
    if (els.detailCriteriaCard) els.detailCriteriaCard.hidden = true;
    showDetailMessage('');
  }

  function showDetailMessage(message) {
    if (!els.recordDetailMessage) return;
    els.recordDetailMessage.textContent = message || '';
    els.recordDetailMessage.hidden = !message;
  }

  function getDetailUsability(item, images, missingCopyright) {
    const raw = item.raw || item;
    const licenseOk = qualityHelpers.hasValidDatasetLicense(raw);
    const hasDescriptionValue = qualityHelpers.hasDetailsText(raw);
    const hasOpenings = qualityHelpers.hasOpeningHours(raw);
    const hasTransport = qualityHelpers.hasPublicTransportFeature(raw);
    const bookingRelevant = ['Hotel', 'Package'].includes(item.type);
    return [
      { label: 'Open Data', value: licenseOk ? 'ja' : 'nein', ok: licenseOk },
      { label: 'Lizenzstatus', value: licenseOk ? 'gültig' : 'Lizenz fehlt', ok: licenseOk },
      { label: 'Beschreibung', value: hasDescriptionValue ? 'vorhanden' : 'fehlt', ok: hasDescriptionValue },
      { label: 'Bilder', value: images.length ? 'vorhanden' : 'fehlt', ok: images.length > 0 },
      { label: 'Bildrechte', value: missingCopyright.length ? `${missingCopyright.length} ohne Urheber` : 'vorhanden', ok: missingCopyright.length === 0 },
      { label: 'ÖPNV-Info', value: hasTransport ? 'vorhanden' : 'nicht vorhanden', ok: hasTransport },
      { label: 'Buchungslink', value: bookingRelevant ? qualityHelpers.hasBookingLink(raw) ? 'vorhanden' : 'fehlt' : 'nicht relevant', ok: !bookingRelevant || qualityHelpers.hasBookingLink(raw), relevant: bookingRelevant },
      { label: 'Öffnungszeiten', value: hasOpenings ? 'vorhanden' : 'fehlt', ok: hasOpenings }
    ];
  }

  function getDisplayDescription(raw) {
    return getTextByRel(raw, 'details') || '';
  }

  function getTextByRel(raw, rel) {
    const values = qualityHelpers.getTextsByRel(raw, rel)
      .map((entry) => htmlToPlainText(textValue(entry.value || entry.text || entry.content || entry)))
      .filter(Boolean);
    return values[0] || '';
  }

  function htmlToPlainText(value) {
    return String(value || '')
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;|&#160;/gi, ' ')
      .replace(/&amp;/gi, '&')
      .replace(/&quot;/gi, '"')
      .replace(/&#039;|&apos;/gi, "'")
      .replace(/\s+/g, ' ')
      .trim();
  }

  function getCheckableImages(item) {
    const raw = item.raw || item;
    return qualityHelpers.getMediaObjects(raw)
      .filter((media) => qualityHelpers.isCheckableMediaObject(media))
      .sort((a, b) => {
        const relRank = (rel) => rel === 'default' ? 0 : 1;
        return relRank(a.rel) - relRank(b.rel) || Number(a.prio || 99) - Number(b.prio || 99);
      })
      .map((media) => ({
        ...media,
        url: textValue(media.url || media.contentUrl),
        alt: textValue(media.alt),
        value: textValue(media.value || media.title),
        description: textValue(media.description),
        copyrightText: textValue(media.copyrightText)
      }))
      .filter((media) => media.url);
  }

  function getOpeningHoursSummary(item) {
    const raw = item.raw || item;
    if (raw.alwaysOpen === true) return 'Immer geöffnet.';
    const openingText = getTextByRel(raw, 'openings');
    if (openingText) return openingText;
    const intervals = raw.timeIntervals || raw.raw?.timeIntervals || [];
    if (Array.isArray(intervals) && intervals.length) return 'Öffnungszeiten vorhanden.';
    return 'Keine Öffnungszeiten angegeben.';
  }

  function buildVerifiedEt4Url(item) {
    if (item.type !== 'POI' || !item.globalId) return '';
    return `https://pages.et4.de/de/statistik_sachsen/wlan/detail/POI/${encodeURIComponent(item.globalId)}/x`;
  }

  function renderKvRows(rows, allowHtml = false) {
    return rows.map(([key, value]) => `
      <dt>${escapeHtml(key)}</dt>
      <dd>${allowHtml ? value : escapeHtml(value)}</dd>
    `).join('');
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
    if (els.qualityDataNote) els.qualityDataNote.textContent = 'Qualitätsdaten werden geladen ...';
  }

  function renderOverviewEmpty() {
    ['kpi-quality-score', 'kpi-total', 'kpi-good', 'kpi-review', 'kpi-critical', 'kpi-open-data'].forEach((id) => {
      const node = document.getElementById(id);
      if (node) node.textContent = '-';
    });
    if (els.topTasksList) els.topTasksList.innerHTML = '<div class="empty-note">Für diese Auswahl wurden keine Pflegeaufgaben geladen.</div>';
    if (els.qualityDataNote) els.qualityDataNote.textContent = 'Keine auswertbaren Qualitätsdaten geladen.';
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
      els.topTasksList.innerHTML = '<div class="empty-note">Für die aktuelle Auswahl wurden keine Pflegeaufgaben gefunden.</div>';
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
        <span class="status-badge ${statusClass}">${issue.priority === 'hoch' ? 'Kritisch' : 'Prüfen'}</span>
        <span class="task-open material-icons" aria-hidden="true">chevron_right</span>
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
      ['Prüfen', review, reviewPct, 'review'],
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
      ? `Basierend auf einer begrenzten Stichprobe von ${formatNumber(sampleSize)} Datensätzen.`
      : `Basierend auf ${formatNumber(sampleSize)} bewerteten Datensätzen.`;
    els.qualityDataNote.textContent = note;
    if (state.qualityDataMeta.truncated) console.debug('Qualitätsdaten sind begrenzt.', state.qualityDataMeta);
  }

  function renderKpiDeltas(kpis) {
    let previous = null;
    try {
      previous = JSON.parse(localStorage.getItem(KPI_HISTORY_KEY) || 'null');
    } catch {
      previous = null;
    }
    renderDelta(els.kpiTotalDelta, previous?.totalRecords, kpis.totalRecords, 'Datensätze seit dem letzten Besuch');
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
      showMessage('Für diese Ansicht liegen noch keine exportierbaren Daten vor.');
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
    downloadText('satourn_startseite_übersicht.csv', text, 'text/csv;charset=utf-8');
  }

  function csvValue(value) {
    return `"${String(value ?? '').replaceAll('"', '""')}"`;
  }

  function showMessage(message) {
    if (!els.overviewMessage) return;
    els.overviewMessage.textContent = message || '';
    els.overviewMessage.hidden = !message;
  }

  function isOpenDataRelevantCriterion(criterionId) {
    return ['license_missing', 'image_author_missing'].includes(criterionId);
  }

  function computeTaskImpact(task, openDataRelevant) {
    if (task.priority === 'hoch' && openDataRelevant && task.affectedCount >= 5) return 'sehr_hoch';
    if (task.priority === 'hoch') return 'hoch';
    if (task.priority === 'mittel') return 'mittel';
    return 'niedrig';
  }

  function computePotential(tasks) {
    if (tasks.some((task) => task.impact === 'sehr_hoch')) return 'Sehr hoch';
    if (tasks.some((task) => task.impact === 'hoch')) return 'Hoch';
    if (tasks.some((task) => task.impact === 'mittel')) return 'Mittel';
    if (tasks.length) return 'Niedrig';
    return '-';
  }

  function impactRank(impact) {
    return { sehr_hoch: 4, hoch: 3, mittel: 2, niedrig: 1 }[impact] || 0;
  }

  function priorityLabel(priority) {
    if (priority === 'hoch') return 'Kritisch';
    if (priority === 'mittel') return 'Prüfen';
    return 'Niedrig';
  }

  function impactLabel(impact) {
    return {
      sehr_hoch: 'Sehr hoch',
      hoch: 'Hoch',
      mittel: 'Mittel',
      niedrig: 'Niedrig'
    }[impact] || 'Nicht bewertet';
  }

  function impactBadgeClass(impact) {
    if (impact === 'sehr_hoch') return 'critical';
    if (impact === 'hoch') return 'review';
    if (impact === 'mittel') return 'medium';
    return 'good';
  }

  function renderTypeChips(types) {
    if (!types?.length) return '<span class="muted-text">-</span>';
    const visible = types.slice(0, 4);
    const hidden = types.length - visible.length;
    return `
      <span class="type-chip-row">
        ${visible.map((type) => `<span class="type-chip ${type.toLowerCase()}">${escapeHtml(type)}</span>`).join('')}
        ${hidden > 0 ? `<span class="type-chip more">+${hidden}</span>` : ''}
      </span>
    `;
  }

  function taskProblem(id) {
    const problems = {
      license_missing: 'Für diese Datensätze ist keine gültige Lizenzangabe hinterlegt.',
      image_author_missing: 'Bildmaterial ist vorhanden, aber der Urheberhinweis fehlt.',
      description_missing: 'Für diese Datensätze fehlt eine belastbare Beschreibung mit Details.',
      opening_hours_missing: 'Es sind keine Öffnungszeiten oder vergleichbare Zeitinformationen hinterlegt.',
      public_transport_missing: 'Informationen zur Anreise mit dem ÖPNV fehlen.',
      booking_link_missing: 'Es ist kein Buchungs-, Reservierungs- oder Ticketlink hinterlegt.',
      image_missing: 'Für diese Datensätze ist kein prüfbares Bildmaterial vorhanden.'
    };
    return problems[id] || 'Für diese Datensätze fehlt eine für die Datenpflege relevante Angabe.';
  }

  function taskImpactText(id) {
    const impacts = {
      license_missing: 'Ohne Lizenz sind Daten nicht Open-Data-fähig und nur eingeschränkt weiterverwendbar.',
      image_author_missing: 'Ohne Urheberangabe ist die Weitergabe von Bildmaterial rechtlich eingeschränkt.',
      description_missing: 'Fehlende Beschreibungen reduzieren Auffindbarkeit, Verstaendlichkeit und Nutzbarkeit.',
      opening_hours_missing: 'Fehlende Öffnungszeiten erschweren Planung und Ausspielung in Portalen.',
      public_transport_missing: 'Fehlende ÖPNV-Hinweise schwächen nachhaltige Anreiseinformationen.',
      booking_link_missing: 'Ohne Buchungslink koennen Nutzer Angebote schwerer direkt abschliessen.',
      image_missing: 'Ohne Bilder wirken Eintraege weniger attraktiv und sind in vielen Kanaelen schwaecher.'
    };
    return impacts[id] || 'Die fehlende Information reduziert die praktische Nutzbarkeit der Daten.';
  }

  function renderPrimarySystemsForTask(task) {
    const relevantItems = state.taskItems.filter((item) => item.missingCriteria?.includes(task.criterionId));
    renderPrimarySystemsForRecords(relevantItems);
  }

  function renderPrimarySystemsForRecords(rows) {
    const systems = collectPrimarySystems(rows);
    if (!systems.length) {
      hidePrimarySystems();
      return;
    }
    els.primarySystemCard.hidden = false;
    els.primarySystemList.innerHTML = systems.map((system) => `
      <div class="primary-system-row">
        <span class="primary-system-logo">${escapeHtml(system.short)}</span>
        <span><strong>${escapeHtml(system.name)}</strong><small>${escapeHtml(system.note)}</small></span>
        <button class="plain-button" type="button" data-system-action="${escapeHtml(system.action)}">${escapeHtml(system.actionLabel)}</button>
      </div>
    `).join('');
    els.primarySystemList.querySelectorAll('[data-system-action]').forEach((button) => {
      button.addEventListener('click', () => {
        if (button.dataset.systemAction === 'export') exportTaskRecordsCsv();
        if (button.dataset.systemAction === 'copy-source-id') {
          const firstSourceId = rows.map(getSourceId).find(Boolean);
          if (firstSourceId) copyText(firstSourceId);
        }
      });
    });
  }

  function collectPrimarySystems(rows) {
    const systems = [];
    const hasOutdooractive = rows.some((item) => isTourType(item.type) && getSourceId(item));
    const hasHotel = rows.some((item) => normalizeTypeName(item.type) === 'hotel');

    if (hasOutdooractive) {
      systems.push({
        short: 'OA',
        name: 'outdooractive',
        note: 'Tour-Datensätze mit vorhandener Source-ID. Kein Link, solange die URL-Struktur nicht verifiziert ist.',
        action: 'copy-source-id',
        actionLabel: 'ID kopieren'
      });
    }
    if (hasHotel) {
      systems.push({
        short: 'FD',
        name: 'Feratel Deskline',
        note: 'Unterkuenfte werden fachlich in Feratel Deskline gepflegt. Im Datenbestand liegt keine verifizierte externe ID vor.',
        action: 'export',
        actionLabel: 'Liste exportieren'
      });
    }
    return systems;
  }

  function hidePrimarySystems() {
    if (els.primarySystemCard) els.primarySystemCard.hidden = true;
    if (els.primarySystemList) els.primarySystemList.replaceChildren();
  }

  function getSourceId(item) {
    return getFirst(item, ['source_id', 'sourceId', 'raw.source_id', 'raw.sourceId']);
  }

  function isTourType(type) {
    const value = normalizeTypeName(type);
    return value === 'tour';
  }

  function normalizeTypeName(type) {
    return String(type || '').trim().toLowerCase();
  }

  function exportTaskRecordsCsv() {
    if (!state.selectedTask) return;
    const rowsToExport = state.taskRecordRows.length
      ? state.taskRecordRows
      : state.taskItems.filter((item) => item.missingCriteria?.includes(state.selectedTask.criterionId));
    if (!rowsToExport.length) return;
    const rows = [
      ['Titel', 'Typ', 'Ort', 'Gebiet', 'Problem', 'Nächster Schritt', 'ID', 'global_id', 'source_id'],
      ...rowsToExport.map((row) => [
        row.title,
        row.type,
        row.city,
        row.region,
        state.selectedTask.label,
        state.selectedTask.recommendation,
        row.id,
        row.globalId,
        getSourceId(row)
      ])
    ];
    const text = rows.map((row) => row.map(csvValue).join(';')).join('\n');
    downloadText('satourn_pflegeaufgabe_datensaetze.csv', text, 'text/csv;charset=utf-8');
  }

  async function copyText(value) {
    if (!value) return;
    try {
      await navigator.clipboard?.writeText(value);
    } catch (error) {
      console.debug('Kopieren nicht moeglich.', error);
    }
  }

  function taskIcon(id) {
    if (id === 'license_missing') return 'description';
    if (id === 'image_author_missing' || id === 'image_missing') return 'image';
    if (id === 'opening_hours_missing') return 'schedule';
    if (id === 'public_transport_missing') return 'directions_transit';
    if (id === 'booking_link_missing') return 'link';
    return 'warning';
  }

  function taskDescription(id) {
    const descriptions = {
      license_missing: 'Datensätze ohne Lizenzangabe',
      image_author_missing: 'Bilder ohne Urheberangabe',
      description_missing: 'Keine Beschreibung oder Details',
      opening_hours_missing: 'Keine Öffnungszeiten hinterlegt',
      public_transport_missing: 'Keine ÖPNV-Information vorhanden',
      booking_link_missing: 'Kein Buchungs- oder Reservierungslink',
      image_missing: 'Kein Bildmaterial vorhanden'
    };
    return descriptions[id] || 'Ergänzung empfohlen';
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

  function formatRecordDate(value) {
    if (!value) return '-';
    const date = new Date(value);
    if (!Number.isFinite(date.getTime())) return String(value).slice(0, 10) || '-';
    return date.toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
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
