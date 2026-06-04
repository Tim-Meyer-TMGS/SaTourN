import { downloadText, extractId, extractItems, extractTotal, fetchJson } from '../lib/browser.js';
import { evaluateAllItems, getQualityAggregations, qualityCriteria, qualityHelpers } from './quality.js';

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
    taskRecordsExport: document.getElementById('task-records-export')
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
    taskRecordMeta: null
  };

  initSharedShell();
  if (page === 'overview') initOverview();
  if (page === 'tasks') initTasks();

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
    if (page === 'tasks') void loadTasksData();
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
          recommendation: criterion?.recommendation || issue.recommendation || 'Datensatz pruefen und fehlende Angaben ergaenzen.'
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
        ? 'Die Anzahl betroffener Datensaetze basiert auf den aktuellen Filtern und einer begrenzten Stichprobe.'
        : 'Die Anzahl betroffener Datensaetze basiert auf den aktuell geladenen Qualitaetsdaten.';
    }
  }

  function renderTaskTable() {
    const rows = state.filteredTaskRows;
    const totalPages = Math.max(1, Math.ceil(rows.length / state.taskRowsPerPage));
    state.taskPage = Math.max(1, Math.min(state.taskPage, totalPages));
    const start = (state.taskPage - 1) * state.taskRowsPerPage;
    const visibleRows = rows.slice(start, start + state.taskRowsPerPage);

    if (!visibleRows.length) {
      els.taskTableBody.innerHTML = '<tr><td colspan="7" class="table-empty">Fuer diese Auswahl wurden keine Pflegeaufgaben gefunden.</td></tr>';
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
          <td><button class="row-arrow" type="button" data-task-id="${escapeHtml(task.criterionId)}" aria-label="Aufgabe anzeigen">&gt;</button></td>
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
      if (els.taskDetailContent) els.taskDetailContent.innerHTML = '<p class="empty-note">Waehle eine Pflegeaufgabe aus der Liste.</p>';
      return;
    }

    const needsTypeChoice = task.affectedTypes.length > 1 && !state.selectedTaskType;
    const typeChoice = task.affectedTypes.length > 1
      ? `<label class="detail-type-select">Datentyp fuer Datensatzliste<select id="task-detail-type">${task.affectedTypes.map((type) => `<option value="${escapeHtml(type)}"${type === state.selectedTaskType ? ' selected' : ''}>${escapeHtml(type)}</option>`).join('')}</select></label>`
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
        <dt>Pruefbarkeit</dt>
        <dd>${task.autoCheck === false ? 'Manuell zu pruefen' : 'Automatisch pruefbar'}</dd>
        <dt>Datenbasis</dt>
        <dd>${state.qualityDataMeta.truncated ? 'Begrenzte Stichprobe' : 'Geladene Qualitaetsdaten'}</dd>
      </dl>
      ${typeChoice}
      <button id="task-open-records" class="primary-action" type="button">${needsTypeChoice ? 'Datentyp auswaehlen und Datensaetze anzeigen' : 'Datensaetze anzeigen'}<span aria-hidden="true">&gt;</span></button>
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
      showTaskMessage('Bitte waehle zuerst eine konkrete Aufgabe und einen Datentyp.');
      return;
    }

    showTaskMessage('');
    els.taskRecordsSection.hidden = false;
    els.taskRecordsExport.disabled = true;
    els.taskRecordsTitle.textContent = `${task.label} - ${type}`;
    els.taskRecordsNote.textContent = 'Datensaetze werden geladen ...';
    els.taskRecordsBody.innerHTML = '<tr><td colspan="6" class="table-empty">Datensaetze werden geladen ...</td></tr>';

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
      console.error('Datensaetze zur Pflegeaufgabe konnten nicht geladen werden.', error);
      els.taskRecordsNote.textContent = 'Die Datensaetze konnten nicht geladen werden.';
      els.taskRecordsBody.innerHTML = '<tr><td colspan="6" class="table-empty">Die Datensaetze konnten nicht geladen werden.</td></tr>';
    }
  }

  function renderTaskRecords(task, type, rows, payload) {
    const page = payload?.page || {};
    const stats = payload?.stats || {};
    const completeText = page.complete ? 'Server-Scan abgeschlossen.' : 'Server-Scan mit begrenztem Budget geladen.';
    els.taskRecordsNote.textContent = `${completeText} ${formatNumber(rows.length)} Datensaetze angezeigt.`;
    els.taskRecordsExport.disabled = !rows.length;

    if (!rows.length) {
      els.taskRecordsBody.innerHTML = '<tr><td colspan="6" class="table-empty">Fuer diese Aufgabe wurden keine Datensaetze gefunden.</td></tr>';
      return;
    }

    els.taskRecordsBody.innerHTML = rows.map((row) => `
      <tr>
        <td><strong>${escapeHtml(row.title)}</strong><small>${escapeHtml(row.globalId || row.id || '')}</small></td>
        <td>${escapeHtml(row.type || type)}</td>
        <td>${escapeHtml([row.city, row.region].filter(Boolean).join(' / ') || '-')}</td>
        <td>${escapeHtml(task.label)}</td>
        <td>${escapeHtml(task.recommendation)}</td>
        <td><button class="plain-button" type="button" data-copy-id="${escapeHtml(row.globalId || row.id || '')}">ID kopieren</button></td>
      </tr>
    `).join('');

    els.taskRecordsBody.querySelectorAll('[data-copy-id]').forEach((button) => {
      button.addEventListener('click', () => copyText(button.dataset.copyId || ''));
    });
    if (stats.budgetExhausted) console.debug('Qualitaetsscan-Budget ausgeschoepft.', stats);
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
    if (els.taskDetailContent) els.taskDetailContent.innerHTML = '<p class="empty-note">Waehle einen Arbeitskontext und starte die Abfrage.</p>';
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
    if (priority === 'mittel') return 'Pruefen';
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
      license_missing: 'Fuer diese Datensaetze ist keine gueltige Lizenzangabe hinterlegt.',
      image_author_missing: 'Bildmaterial ist vorhanden, aber der Urheberhinweis fehlt.',
      description_missing: 'Fuer diese Datensaetze fehlt eine belastbare Beschreibung mit Details.',
      opening_hours_missing: 'Es sind keine Oeffnungszeiten oder vergleichbare Zeitinformationen hinterlegt.',
      public_transport_missing: 'Informationen zur Anreise mit dem OePNV fehlen.',
      booking_link_missing: 'Es ist kein Buchungs-, Reservierungs- oder Ticketlink hinterlegt.',
      image_missing: 'Fuer diese Datensaetze ist kein pruefbares Bildmaterial vorhanden.'
    };
    return problems[id] || 'Fuer diese Datensaetze fehlt eine fuer die Datenpflege relevante Angabe.';
  }

  function taskImpactText(id) {
    const impacts = {
      license_missing: 'Ohne Lizenz sind Daten nicht Open-Data-faehig und nur eingeschraenkt weiterverwendbar.',
      image_author_missing: 'Ohne Urheberangabe ist die Weitergabe von Bildmaterial rechtlich eingeschraenkt.',
      description_missing: 'Fehlende Beschreibungen reduzieren Auffindbarkeit, Verstaendlichkeit und Nutzbarkeit.',
      opening_hours_missing: 'Fehlende Oeffnungszeiten erschweren Planung und Ausspielung in Portalen.',
      public_transport_missing: 'Fehlende OePNV-Hinweise schwächen nachhaltige Anreiseinformationen.',
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
        note: 'Tour-Datensaetze mit vorhandener Source-ID. Kein Link, solange die URL-Struktur nicht verifiziert ist.',
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
      ['Titel', 'Typ', 'Ort', 'Gebiet', 'Problem', 'Naechster Schritt', 'ID', 'global_id', 'source_id'],
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
