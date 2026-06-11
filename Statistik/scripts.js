import { downloadText, extractId, extractItems, extractTotal, fetchJson as rawFetchJson } from '../lib/browser.js';
import { evaluateAllItems, evaluateQualityForItem, getQualityAggregations, getQualityScanConfig, qualityCriteria, qualityHelpers } from './quality.js';

document.addEventListener('DOMContentLoaded', () => {
  const root = document.querySelector('.statistik[data-page]');
  if (!root) return;

  const API_BASE = window.SATOURN_SEARCH_API_BASE
    || (location.hostname === 'localhost' || location.hostname === '127.0.0.1'
      ? 'http://localhost:3000/api/search'
      : 'https://satourn.onrender.com/api/search');
  const QUALITY_SCAN_API_BASE = window.SATOURN_QUALITY_SCAN_API_BASE
    || API_BASE.replace(/\/api\/search(?:\?.*)?$/, '/api/quality/scan');
  const QUALITY_COUNT_API_BASE = window.SATOURN_QUALITY_COUNT_API_BASE
    || API_BASE.replace(/\/api\/search(?:\?.*)?$/, '/api/quality/count');
  const QUALITY_SNAPSHOT_API_BASE = window.SATOURN_QUALITY_SNAPSHOT_API_BASE
    || API_BASE.replace(/\/api\/search(?:\?.*)?$/, '/api/quality/snapshot');
  const QUALITY_LIST_API_BASE = window.SATOURN_QUALITY_LIST_API_BASE
    || API_BASE.replace(/\/api\/search(?:\?.*)?$/, '/api/quality/list');
  const AUTOCOMPLETE_API_BASE = window.SATOURN_AUTOCOMPLETE_API_BASE
    || API_BASE.replace(/\/api\/search(?:\?.*)?$/, '/api/autocomplete');
  const USE_QUALITY_CACHE = window.SATOURN_USE_QUALITY_CACHE === true
    || window.SATOURN_USE_QUALITY_CACHE === '1';

  const TYPES = ['POI', 'Tour', 'Hotel', 'Event', 'Gastro', 'Package'];
  const WORK_CONTEXT_KEY = 'satournWorkContext';
  const RECORD_VIEW_STATE_KEY = 'satournRecordViewState';
  const RECORD_LIST_STATE_KEY = 'satournRecordListState';
  const KPI_HISTORY_KEY = 'satournOverviewKpis';
  const CONSENT_STORAGE_KEY = 'satournConsentSettings';
  const RUNTIME_CONFIG = window.SATOURN_RUNTIME || {};
  const REQUEST_CACHE_TTL_MS = Object.freeze({
    searchCount: 45_000,
    autocomplete: 15_000,
    qualityCount: 60_000,
    qualityScan: 20_000,
    qualityList: 120_000,
    qualitySnapshot: 120_000
  });
  const transientRequestCache = new Map();
  const transientRequestInflight = new Map();
  const TASK_FAMILY_BY_CRITERION = Object.freeze({
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
  });
  const TASK_FAMILY_META = Object.freeze({
    payment_options_missing: {
      label: 'Zahlungsmoeglichkeiten fehlen',
      description: 'Keine der geprueften Zahlungsarten vorhanden',
      problem: 'Fuer diese Datensaetze fehlt mindestens eine gepflegte Zahlungsart.',
      impactText: 'Fehlende Zahlungsarten erschweren Planung, Vergleich und Erwartungsmanagement.',
      recommendation: 'Mindestens eine gepruefte Zahlungsart als Merkmal ergaenzen.',
      iconCriterionId: 'poi_payment_options_missing'
    },
    languages_missing: {
      label: 'Fremdsprachenangaben fehlen',
      description: 'Keine der geprueften Fremdsprachen vorhanden',
      problem: 'Fuer diese Datensaetze fehlt mindestens eine gepflegte Fremdsprachenangabe.',
      impactText: 'Fehlende Sprachangaben schraenken Auffindbarkeit und Nutzbarkeit fuer internationale Gaeste ein.',
      recommendation: 'Mindestens eine gepruefte Fremdsprache als Merkmal ergaenzen.',
      iconCriterionId: 'poi_languages_missing'
    },
    parking_missing: {
      label: 'Parkhinweise fehlen',
      description: 'Keine Parkinformation oder kein gepruefter Parkhinweis vorhanden',
      problem: 'Fuer diese Datensaetze fehlt eine belastbare Parkinformation oder ein Parkhinweis.',
      impactText: 'Fehlende Parkhinweise erschweren die Anreiseplanung vor Ort.',
      recommendation: 'Parkmoeglichkeiten oder gepruefte Parkhinweise ergaenzen.',
      iconCriterionId: 'tour_parking_missing'
    }
  });
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
    overviewTitle: document.getElementById('overview-title'),
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
    openDataCapable: document.getElementById('open-data-capable'),
    openDataCapablePercent: document.getElementById('open-data-capable-percent'),
    openDataMissing: document.getElementById('open-data-missing'),
    openDataMissingPercent: document.getElementById('open-data-missing-percent'),
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
    recordAutocompleteList: document.getElementById('record-autocomplete-list'),
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
    detailCopyId: document.getElementById('detail-copy-id'),
    detailCopyGlobalId: document.getElementById('detail-copy-global-id'),
    detailPrevRecord: document.getElementById('detail-prev-record'),
    detailNextRecord: document.getElementById('detail-next-record'),
    detailBackLink: document.getElementById('detail-back-link'),
    detailBreadcrumb: document.getElementById('detail-breadcrumb'),
    detailContextNote: document.getElementById('detail-context-note'),
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
    detailPriceCard: document.getElementById('detail-price-card'),
    detailPrice: document.getElementById('detail-price'),
    detailInfo: document.getElementById('detail-info'),
    detailCriteriaCard: document.getElementById('detail-criteria-card'),
    detailCriteriaList: document.getElementById('detail-criteria-list'),
    statsAreaFilter: document.getElementById('stats-area-filter'),
    statsCityFilter: document.getElementById('stats-city-filter'),
    statsTypeFilter: document.getElementById('stats-type-filter'),
    statsResetFilters: document.getElementById('stats-reset-filters'),
    statsRefresh: document.getElementById('stats-refresh'),
    statsExport: document.getElementById('stats-export'),
    statsMessage: document.getElementById('stats-message'),
    statsTotalRecords: document.getElementById('stats-total-records'),
    statsOpenDataRecords: document.getElementById('stats-open-data-records'),
    statsOpenDataShare: document.getElementById('stats-open-data-share'),
    statsOpenDataQuote: document.getElementById('stats-open-data-quote'),
    statsNonOpenDataRecords: document.getElementById('stats-non-open-data-records'),
    statsNonOpenDataShare: document.getElementById('stats-non-open-data-share'),
    statsTypeDonut: document.getElementById('stats-type-donut'),
    statsTypeDonutTotal: document.getElementById('stats-type-donut-total'),
    statsTypeDistributionBody: document.getElementById('stats-type-distribution-body'),
    statsQuoteBars: document.getElementById('stats-quote-bars'),
    statsTypeTableBody: document.getElementById('stats-type-table-body'),
    statsLicenseTaskCard: document.getElementById('stats-license-task-card'),
    statsLicenseTaskCount: document.getElementById('stats-license-task-count'),
    statsLicenseTaskShare: document.getElementById('stats-license-task-share'),
    helpModelSummary: document.getElementById('help-model-summary'),
    helpTypeGrid: document.getElementById('help-type-grid'),
    helpPrivacySummary: document.getElementById('help-privacy-summary'),
    helpLocalStorageList: document.getElementById('help-local-storage-list'),
    helpExternalServicesList: document.getElementById('help-external-services-list'),
    helpConsentCategoryList: document.getElementById('help-consent-category-list'),
    consentSettingsButton: document.getElementById('consent-settings-button'),
    consentDialog: document.getElementById('consent-dialog'),
    consentForm: document.getElementById('consent-form'),
    consentExternalUi: document.getElementById('consent-external-ui'),
    consentAutomation: document.getElementById('consent-automation'),
    consentAnalytics: document.getElementById('consent-analytics')
  };

  let state = {
    context: loadWorkContext(),
    latestRows: [],
    qualitySnapshot: null,
    normalizedItems: [],
    qualityAggregations: getQualityAggregations([]),
    qualityDataMeta: {
      mode: 'api_counts',
      collectedItems: 0,
      estimatedTotalItems: 0,
      truncated: false,
      unsupportedCriteria: [],
      failedCounts: 0
    },
    lastKpis: null,
    taskItems: [],
    taskRows: [],
    filteredTaskRows: [],
    selectedTask: null,
    selectedTaskType: '',
    pendingTaskId: '',
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
    recordAutocompleteTimer: null,
    recordAutocompleteRequestId: 0,
    recordServerSearchKeys: new Set(),
    recordDataMeta: {
      mode: 'empty',
      collectedItems: 0,
      estimatedTotalItems: 0,
      truncated: false
    },
    statsRows: [],
    statsSummary: null,
    pendingRecordView: null,
    recordDetailItem: null,
    recordDetailViewModel: null,
    overviewLoadId: 0,
    taskLoadId: 0
  };

  let consentState = loadConsentState();

  if (page === 'records') {
    state.pendingRecordView = loadRecordViewStateFromRoute();
    if (state.pendingRecordView?.context) {
      saveWorkContext(state.pendingRecordView.context);
    }
  }

  initSharedShell();
  if (page === 'overview') initOverview();
  if (page === 'tasks') initTasks();
  if (page === 'records') initRecords();
  if (page === 'record-detail') initRecordDetail();
  if (page === 'stats') initStats();
  if (page === 'help') initHelp();

  function initSharedShell() {
    fillContextControls();
    renderWorkContext();
    syncConsentControls();

    els.contextSummary?.addEventListener('click', openContextDialog);
    els.contextEdit?.addEventListener('click', openContextDialog);
    els.contextForm?.addEventListener('submit', handleContextSubmit);
    els.consentSettingsButton?.addEventListener('click', openConsentDialog);
    els.consentForm?.addEventListener('submit', handleConsentSubmit);
    els.refreshButton?.addEventListener('click', markForceFresh, { capture: true });
  }

  function initOverview() {
    renderOverviewLoading();
    els.refreshButton?.addEventListener('click', () => {
      clearTransientRequestCache();
      void loadOverviewDataAsync();
    });
    els.quickExport?.addEventListener('click', exportOverviewCsv);
    els.quickAi?.addEventListener('click', interceptQuickAiConsent, { capture: true });
    els.quickAi?.addEventListener('click', () => showMessage('Die KI-Analyse wird als dezente Aktion in einem späteren Schritt angebunden.'));
    void loadOverviewDataAsync();
  }

  function initTasks() {
    const params = new URLSearchParams(location.search);
    state.pendingTaskId = params.get('task') || params.get('criterionId') || '';
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
      state.recordServerSearchKeys = new Set();
      clearTimeout(state.recordSearchTimer);
      state.recordSearchTimer = setTimeout(() => {
        state.recordPage = 1;
        applyRecordFilters();
      }, 180);
      queueRecordAutocomplete();
    });
    els.recordSearchInput?.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        hideRecordAutocomplete();
        void handleRecordSearchSubmit();
      } else if (event.key === 'Escape') {
        hideRecordAutocomplete();
      }
    });
    els.recordSearchInput?.addEventListener('focus', queueRecordAutocomplete);
    els.recordSearchButton?.addEventListener('click', () => {
      hideRecordAutocomplete();
      void handleRecordSearchSubmit();
    });
    els.recordSearchClear?.addEventListener('click', () => {
      if (els.recordSearchInput) els.recordSearchInput.value = '';
      hideRecordAutocomplete();
      state.recordPage = 1;
      applyRecordFilters();
    });
    document.addEventListener('click', (event) => {
      if (!event.target.closest?.('.record-search-block')) hideRecordAutocomplete();
    });
    [els.recordTypeFilter, els.recordCategoryFilter, els.recordStatusFilter, els.recordIssueFilter].forEach((node) => {
      node?.addEventListener('change', () => {
        state.recordPage = 1;
        if ((node === els.recordIssueFilter || node === els.recordTypeFilter) && els.recordIssueFilter?.value) {
          void loadRecordsData();
          return;
        }
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
    els.detailCopyId?.addEventListener('click', () => copyText(state.recordDetailViewModel?.identity.id || ''));
    els.detailCopyGlobalId?.addEventListener('click', () => copyText(state.recordDetailViewModel?.identity.globalId || ''));
    void loadRecordDetail();
  }

  function initStats() {
    fillStatsFilters();
    renderStatsLoading();
    els.refreshButton?.addEventListener('click', () => loadStatsDataAsync());
    els.statsRefresh?.addEventListener('click', markForceFresh, { capture: true });
    els.statsRefresh?.addEventListener('click', applyStatsFiltersAndLoad);
    els.statsExport?.addEventListener('click', exportStatsCsv);
    els.statsResetFilters?.addEventListener('click', resetStatsFilters);
    [els.statsAreaFilter, els.statsTypeFilter].forEach((node) => {
      node?.addEventListener('change', () => {
        applyStatsFiltersAndLoad();
      });
    });
    els.statsCityFilter?.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter') return;
      event.preventDefault();
      applyStatsFiltersAndLoad();
    });
    void loadStatsDataAsync();
  }

  function initHelp() {
    renderHelpPage();
  }

  function markForceFresh() {
    state.forceFreshUntil = Date.now() + 1500;
  }

  function shouldForceFresh() {
    return Number(state.forceFreshUntil || 0) > Date.now();
  }

  function clearTransientRequestCache() {
    transientRequestCache.clear();
    transientRequestInflight.clear();
  }

  function cloneJsonValue(value) {
    if (value == null) return value;
    return JSON.parse(JSON.stringify(value));
  }

  function getRequestCacheTtl(url) {
    try {
      const parsed = new URL(url, location.href);
      if (/\/api\/quality\/snapshot$/.test(parsed.pathname)) return REQUEST_CACHE_TTL_MS.qualitySnapshot;
      if (/\/api\/quality\/list$/.test(parsed.pathname)) return REQUEST_CACHE_TTL_MS.qualityList;
      if (/\/api\/quality\/count$/.test(parsed.pathname)) return REQUEST_CACHE_TTL_MS.qualityCount;
      if (/\/api\/quality\/scan$/.test(parsed.pathname)) return REQUEST_CACHE_TTL_MS.qualityScan;
      if (/\/api\/autocomplete$/.test(parsed.pathname)) return REQUEST_CACHE_TTL_MS.autocomplete;
      if (/\/api\/search$/.test(parsed.pathname) && parsed.searchParams.get('limit') === '1') return REQUEST_CACHE_TTL_MS.searchCount;
    } catch {
      return 0;
    }
    return 0;
  }

  async function fetchJsonCached(url, options = {}) {
    const {
      optional404 = false,
      forceFresh = shouldForceFresh(),
      cacheTtlMs = getRequestCacheTtl(url)
    } = options;

    if (!forceFresh && cacheTtlMs > 0) {
      const cached = transientRequestCache.get(url);
      if (cached && cached.expiresAt > Date.now()) return cloneJsonValue(cached.value);
      const inflight = transientRequestInflight.get(url);
      if (inflight) return cloneJsonValue(await inflight);
    }

    const request = (async () => {
      const payload = optional404
        ? await fetchJsonOptionalUncached(url)
        : await rawFetchJson(url);
      if (cacheTtlMs > 0) {
        transientRequestCache.set(url, {
          value: cloneJsonValue(payload),
          expiresAt: Date.now() + cacheTtlMs
        });
      }
      return payload;
    })();

    if (!forceFresh && cacheTtlMs > 0) transientRequestInflight.set(url, request);

    try {
      return cloneJsonValue(await request);
    } finally {
      transientRequestInflight.delete(url);
    }
  }

  function isAbortLikeError(error) {
    const message = String(error?.message || error || '');
    return error?.name === 'AbortError' || /aborted|abort|timeout/i.test(message);
  }

  function getConsentDefaults() {
    const defaults = RUNTIME_CONFIG.consent?.optionalDefaults || {};
    return {
      essential: true,
      external_ui: Boolean(defaults.external_ui),
      automation: Boolean(defaults.automation),
      analytics: Boolean(defaults.analytics)
    };
  }

  function loadConsentState() {
    const defaults = getConsentDefaults();
    try {
      const parsed = JSON.parse(localStorage.getItem(CONSENT_STORAGE_KEY) || '{}');
      return {
        essential: true,
        external_ui: parsed.external_ui ?? defaults.external_ui,
        automation: parsed.automation ?? defaults.automation,
        analytics: parsed.analytics ?? defaults.analytics,
        updatedAt: parsed.updatedAt || ''
      };
    } catch {
      return {
        essential: true,
        external_ui: defaults.external_ui,
        automation: defaults.automation,
        analytics: defaults.analytics,
        updatedAt: ''
      };
    }
  }

  function saveConsentState() {
    const payload = {
      external_ui: Boolean(consentState.external_ui),
      automation: Boolean(consentState.automation),
      analytics: Boolean(consentState.analytics),
      updatedAt: new Date().toISOString()
    };
    consentState = {
      essential: true,
      ...payload
    };
    try {
      localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // localStorage may be unavailable in strict privacy contexts.
    }
    window.dispatchEvent(new CustomEvent('satourn:consent-change', {
      detail: { ...consentState }
    }));
  }

  function hasConsent(category) {
    if (!category || category === 'essential') return true;
    return Boolean(consentState?.[category]);
  }

  function syncConsentControls() {
    if (els.consentExternalUi) els.consentExternalUi.checked = hasConsent('external_ui');
    if (els.consentAutomation) els.consentAutomation.checked = hasConsent('automation');
    if (els.consentAnalytics) els.consentAnalytics.checked = hasConsent('analytics');
  }

  function openConsentDialog() {
    syncConsentControls();
    if (typeof els.consentDialog?.showModal === 'function') {
      els.consentDialog.showModal();
    } else {
      els.consentDialog?.setAttribute('open', '');
    }
  }

  function handleConsentSubmit(event) {
    if (event.submitter?.value === 'cancel') return;
    event.preventDefault();
    consentState.external_ui = Boolean(els.consentExternalUi?.checked);
    consentState.automation = Boolean(els.consentAutomation?.checked);
    consentState.analytics = Boolean(els.consentAnalytics?.checked);
    saveConsentState();
    renderHelpPrivacySection();
    els.consentDialog?.close?.();
  }

  function interceptQuickAiConsent(event) {
    if (hasConsent('automation')) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    showMessage('Optionale Automatisierung ist derzeit nicht freigegeben.');
  }

  function renderHelpPage() {
    if (els.helpModelSummary) {
      els.helpModelSummary.textContent = 'Fehlende automatisch gepruefte Kriterien ziehen den Score direkt um ihr Gewicht ab. Weitere fachlich relevante Kriterien bleiben sichtbar vorbereitet, wirken aber erst nach technischer Verifikation oder wenn sie fuer die Kategorie wirklich erwartet werden.';
    }
    renderHelpTypeOverview();
    renderHelpPrivacySection();
  }

  function renderHelpTypeOverview() {
    if (!els.helpTypeGrid) return;
    const cards = TYPES.map((type) => buildHelpTypeCard(type)).join('');
    els.helpTypeGrid.innerHTML = cards;
  }

  function renderHelpPrivacySection() {
    const localStorageEntries = [
      'Arbeitskontext: Gebiet, Ort und Datentyp',
      'Consent-Einstellungen fuer optionale Kategorien',
      'Zuletzt berechnete KPI-Vergleichswerte fuer die Uebersicht',
      'Temporare Listen- und Detailnavigation nur in der laufenden Sitzung'
    ];
    const externalServices = Array.isArray(RUNTIME_CONFIG.externalServices) ? RUNTIME_CONFIG.externalServices : [];
    const categoryRows = [
      ['Essenziell', 'Aktiv fuer Navigation, Proxy und Kernfunktionen', true],
      ['Externe UI-Dienste', hasConsent('external_ui') ? 'Vom Nutzer freigegeben' : 'Vorbereitet, aktuell nicht freigegeben', hasConsent('external_ui')],
      ['Automatisierung', hasConsent('automation') ? 'Freigegeben' : 'Vorbereitet, aktuell nicht freigegeben', hasConsent('automation')],
      ['Analytics', hasConsent('analytics') ? 'Freigegeben' : 'Nicht produktiv aktiv', hasConsent('analytics')]
    ];

    if (els.helpPrivacySummary) {
      const activeOptional = categoryRows.filter(([, , enabled]) => enabled).length - 1;
      els.helpPrivacySummary.textContent = activeOptional > 0
        ? `Essenzielle Funktionen sind aktiv. ${formatNumber(activeOptional)} optionale Kategorie ist derzeit freigegeben.`
        : 'Essenzielle Funktionen sind aktiv. Optionale Kategorien sind vorbereitet, derzeit aber standardmaessig deaktiviert.';
    }
    if (els.helpLocalStorageList) {
      els.helpLocalStorageList.innerHTML = localStorageEntries
        .map((entry) => `<li>${escapeHtml(entry)}</li>`)
        .join('');
    }
    if (els.helpExternalServicesList) {
      els.helpExternalServicesList.innerHTML = externalServices.length
        ? externalServices.map((service) => `<li><strong>${escapeHtml(service.host || service.id)}</strong><br><small>${escapeHtml(service.purpose || '')}</small></li>`).join('')
        : '<li>Keine externen Dienste hinterlegt.</li>';
    }
    if (els.helpConsentCategoryList) {
      els.helpConsentCategoryList.innerHTML = categoryRows
        .map(([label, text, enabled]) => `<li><strong>${escapeHtml(label)}</strong><br><small>${escapeHtml(text)}</small><span class="status-badge ${enabled ? 'good' : 'muted'}">${enabled ? 'Aktiv' : 'Aus'}</span></li>`)
        .join('');
    }
  }

  function buildHelpTypeCard(type) {
    const criteria = qualityCriteria
      .filter((criterion) => (criterion.types || []).includes(type))
      .sort((a, b) => (
        priorityRank(b.priority) - priorityRank(a.priority) ||
        Number(b.weight || 0) - Number(a.weight || 0) ||
        a.label.localeCompare(b.label, 'de')
      ));
    const domainCriteria = qualityHelpers.getDomainCriteriaForType(type);
    const autoCheckedCount = criteria.length;
    const pendingCount = domainCriteria.filter((criterion) => criterion.status === 'needs_verification').length;
    const model = buildHelpTypeScoreModel(criteria);
    const minimumItems = model.minimumCriteria.length
      ? model.minimumCriteria
      : criteria.slice(0, 1);
    const extraItems = criteria.filter((criterion) => !model.minimumIds.has(criterion.id));
    return `
      <article class="panel-card help-type-card">
        <header class="help-type-head">
          <div>
            <h3>${escapeHtml(type)}</h3>
            <p class="data-note">Maximal mögliche Gewichtspunkte: ${formatNumber(model.totalWeight)}</p>
          </div>
          <span class="help-type-score">${formatNumber(model.threshold)} Punkte für grün</span>
        </header>
        <div class="help-type-columns">
          <section>
            <h4>Minimal für guten Score</h4>
            ${renderHelpCriterionList(minimumItems, 'required')}
          </section>
          <section>
            <h4>Optimal gepflegt</h4>
            ${renderHelpCriterionList(extraItems, 'optional')}
          </section>
        </div>
        <footer class="help-type-footer">
          <span>Fehlende Punkte ziehen den Score direkt ab.</span>
          <span>${formatNumber(autoCheckedCount)} automatisch geprueft, ${formatNumber(pendingCount)} fachlich vorbereitet</span>
        </footer>
      </article>
    `;
  }

  function buildHelpTypeScoreModel(criteria) {
    const totalWeight = criteria.reduce((sum, criterion) => sum + Number(criterion.weight || 0), 0);
    const threshold = Math.ceil(totalWeight * 0.8);
    const subsets = [];
    const count = criteria.length;

    for (let mask = 1; mask < (1 << count); mask += 1) {
      const selected = [];
      let weight = 0;
      for (let index = 0; index < count; index += 1) {
        if ((mask & (1 << index)) === 0) continue;
        const criterion = criteria[index];
        selected.push(criterion);
        weight += Number(criterion.weight || 0);
      }
      if (weight >= threshold) {
        subsets.push({ selected, weight });
      }
    }

    subsets.sort((a, b) => (
      a.selected.length - b.selected.length ||
      a.weight - b.weight
    ));

    const best = subsets[0] || { selected: criteria, weight: totalWeight };
    return {
      totalWeight,
      threshold,
      minimumCriteria: best.selected,
      minimumIds: new Set(best.selected.map((criterion) => criterion.id))
    };
  }

  function renderHelpCriterionList(criteria, tone) {
    if (!criteria.length) {
      return '<p class="help-empty-state">Keine weiteren Kriterien.</p>';
    }
    return `
      <ul class="help-checklist">
        ${criteria.map((criterion) => `
          <li class="help-checkitem ${tone}">
            <span class="help-checkweight">${formatNumber(criterion.weight || 0)}</span>
            <div>
              <strong>${escapeHtml(criterion.label)}</strong>
              <small>${escapeHtml(criterion.recommendation || '')}</small>
            </div>
          </li>
        `).join('')}
      </ul>
    `;
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

  function saveRecordViewState(viewState) {
    try {
      sessionStorage.setItem(RECORD_VIEW_STATE_KEY, JSON.stringify({
        criterionId: viewState.criterionId || '',
        type: TYPES.includes(viewState.type) ? viewState.type : '',
        status: viewState.status || '',
        query: viewState.query || '',
        label: viewState.label || '',
        context: {
          area: viewState.context?.area || '',
          city: viewState.context?.city || '',
          type: TYPES.includes(viewState.context?.type) ? viewState.context.type : ''
        },
        createdAt: Date.now()
      }));
    } catch {
      // sessionStorage may be unavailable in strict privacy contexts.
    }
  }

  function loadRecordViewStateFromRoute() {
    const params = new URLSearchParams(location.search);
    const hasRouteState = ['criterionId', 'type', 'status', 'q'].some((key) => params.has(key));
    if (!hasRouteState) return null;

    let cached = {};
    try {
      cached = JSON.parse(sessionStorage.getItem(RECORD_VIEW_STATE_KEY) || '{}');
    } catch {
      cached = {};
    }

    return {
      criterionId: params.get('criterionId') || cached.criterionId || '',
      type: params.get('type') || cached.type || '',
      status: params.get('status') || cached.status || '',
      query: params.get('q') || cached.query || '',
      label: cached.label || '',
      context: cached.context || null
    };
  }

  function clearRecordViewState() {
    try {
      sessionStorage.removeItem(RECORD_VIEW_STATE_KEY);
    } catch {
      // no-op
    }
    if (location.search) {
      history.replaceState(null, '', 'records.html');
    }
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
    if (els.overviewTitle) {
      els.overviewTitle.textContent = buildOverviewTitle();
    }
    if (els.overviewSubtitle) {
      els.overviewSubtitle.textContent = buildOverviewSubtitle({ areaLabel, cityLabel, typeLabel });
    }
  }

  function buildOverviewTitle() {
    if (state.context.type) return `${state.context.type}-Monitor`;
    return 'Datenqualitäts-Monitor';
  }

  function buildOverviewSubtitle({ areaLabel, cityLabel, typeLabel }) {
    const scope = [];
    if (areaLabel) scope.push(areaLabel);
    if (state.context.city) scope.push(cityLabel);
    const scopeLabel = scope.join(' - ') || 'Sachsen';
    if (state.context.type) {
      return `Pflegeaufgaben, Qualitätsstatus und Open-Data-Quote für ${typeLabel} in ${scopeLabel}.`;
    }
    return `Pflegeaufgaben, Qualitätsstatus und Open-Data-Quote für ${scopeLabel}.`;
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
    clearTransientRequestCache();
    markForceFresh();
    saveWorkContext({
      area: els.contextArea?.value || '',
      city: els.contextCity?.value.trim() || '',
      type: els.contextType?.value || ''
    });
    els.contextDialog?.close?.();
    if (page === 'overview') void loadOverviewDataAsync();
    if (page === 'tasks') void loadTasksData();
    if (page === 'records') void loadRecordsData();
    if (page === 'record-detail') void loadRecordDetail();
    if (page === 'stats') {
      fillStatsFilters();
      void loadStatsDataAsync();
    }
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
    if (Number.isFinite(options.offset) && options.offset > 0) params.set('offset', String(options.offset));
    return `${API_BASE}?${params.toString()}`;
  }

  async function fetchJsonOptionalUncached(url) {
    const response = await fetch(url, { cache: 'no-store' });
    const text = await response.text();
    if (response.status === 404) return null;
    if (!response.ok) throw new Error(`HTTP ${response.status}: ${text}`);
    return JSON.parse(text.trim());
  }

  function buildQualitySnapshotUrl() {
    const params = new URLSearchParams();
    const query = buildQuery(state.context);
    if (query) params.set('query', query);
    if (state.context.type) params.set('type', state.context.type);
    return `${QUALITY_SNAPSHOT_API_BASE}?${params.toString()}`;
  }

  async function loadCachedQualitySnapshot() {
    if (!USE_QUALITY_CACHE) return null;
    state.qualitySnapshot = null;
    let snapshot = null;
    try {
      snapshot = await fetchJsonCached(buildQualitySnapshotUrl(), { optional404: true });
    } catch (error) {
      console.warn('Qualitaets-Snapshot konnte nicht aus dem Cache geladen werden.', error);
      return null;
    }
    if (!snapshot?.rows?.length) return null;
    state.qualitySnapshot = snapshot;
    state.latestRows = snapshot.rows.map(normalizeStatisticRow);
    state.qualityAggregations = snapshot.aggregations || buildAggregationsFromIssueSummary([]);
    state.qualityDataMeta = snapshot.qualityDataMeta || {
      mode: 'snapshot',
      collectedItems: 0,
      estimatedTotalItems: 0,
      truncated: false,
      unsupportedCriteria: [],
      failedCounts: 0
    };
    return snapshot;
  }

  function normalizeStatisticRow(row) {
    return {
      type: row.type,
      statistikCount: Number(row.statistikCount || 0),
      openDataCount: Number(row.openDataCount || 0)
    };
  }

  function canCalculateQualityForContext(context = state.context) {
    return Boolean(context.area || context.city);
  }

  function sortStatisticRows(rows) {
    return [...rows].sort((a, b) => TYPES.indexOf(a.type) - TYPES.indexOf(b.type));
  }

  function upsertStatisticRow(row) {
    const existingIndex = state.latestRows.findIndex((entry) => entry.type === row.type);
    if (existingIndex >= 0) {
      state.latestRows.splice(existingIndex, 1, row);
    } else {
      state.latestRows.push(row);
    }
    state.latestRows = sortStatisticRows(state.latestRows);
  }

  function renderOverviewCurrent(options = {}) {
    renderOverview(state.latestRows, state.normalizedItems, options);
  }

  function resetOverviewQualityState() {
    state.normalizedItems = [];
    state.qualityAggregations = buildAggregationsFromIssueSummary([]);
    state.qualityDataMeta = canCalculateQualityForContext()
      ? {
        mode: 'regional_scan',
        collectedItems: 0,
        estimatedTotalItems: 0,
        truncated: false,
        unsupportedCriteria: [],
        failedCounts: 0,
        pendingTypes: state.context.type ? 1 : TYPES.length,
        completedTypes: 0
      }
      : {
        mode: 'sachsen_total',
        collectedItems: 0,
        estimatedTotalItems: 0,
        truncated: false,
        unsupportedCriteria: [],
        failedCounts: 0
      };
  }

  async function loadOverviewData() {
    const startedAt = new Date();
    showMessage('');
    renderOverviewLoading();

    try {
      const snapshot = await loadCachedQualitySnapshot();
      if (snapshot) {
        renderOverview(state.latestRows, []);
        if (els.lastUpdated) els.lastUpdated.textContent = `Letzte Aktualisierung: ${formatDateTime(new Date(snapshot.generatedAt || startedAt))}`;
        return;
      }

      const rows = await loadStatisticRows();
      const issueSummary = await loadQualityCountSummary();
      state.latestRows = rows;
      state.normalizedItems = [];
      state.qualityAggregations = buildAggregationsFromIssueSummary(issueSummary);
      renderOverview(rows, []);
      els.lastUpdated.textContent = `Letzte Aktualisierung: ${formatDateTime(startedAt)}`;
    } catch (error) {
      console.error('Startseite konnte nicht geladen werden.', error);
      showMessage('Die Daten konnten nicht geladen werden. Bitte später erneut versuchen.');
      renderOverviewEmpty();
    }
  }

  async function loadOverviewDataAsync() {
    const startedAt = new Date();
    const loadId = ++state.overviewLoadId;
    showMessage('');
    renderOverviewLoading();
    state.latestRows = [];
    resetOverviewQualityState();
    renderOverviewCurrent({ saveHistory: false });

    const isStale = () => loadId !== state.overviewLoadId;
    const statisticPromise = loadStatisticRowsIncremental((row) => {
      if (isStale()) return;
      upsertStatisticRow(row);
      renderOverviewCurrent({ saveHistory: false });
    });

    const qualityPromise = canCalculateQualityForContext()
      ? loadRegionalQualityEvaluation({
        isStale,
        onUpdate: () => renderOverviewCurrent({ saveHistory: false })
      })
      : loadQualityCountSummary({
        onUpdate: (issueSummary, meta) => {
          if (isStale()) return;
          state.qualityAggregations = buildAggregationsFromIssueSummary(issueSummary);
          state.qualityDataMeta = {
            ...meta,
            mode: 'sachsen_total'
          };
          renderOverviewCurrent({ saveHistory: false });
        }
      });

    try {
      const [statisticResult, qualityResult] = await Promise.allSettled([statisticPromise, qualityPromise]);
      if (isStale()) return;

      if (statisticResult.status === 'fulfilled') {
        state.latestRows = statisticResult.value;
      } else if (!isAbortLikeError(statisticResult.reason)) {
        console.error('Statistik-Counts konnten nicht geladen werden.', statisticResult.reason);
      }

      if (qualityResult.status === 'fulfilled') {
        if (canCalculateQualityForContext()) {
          state.normalizedItems = qualityResult.value.items;
          state.qualityAggregations = qualityResult.value.aggregations;
          state.qualityDataMeta = qualityResult.value.meta;
        } else {
          state.qualityAggregations = buildAggregationsFromIssueSummary(qualityResult.value);
          state.qualityDataMeta = {
            ...state.qualityDataMeta,
            mode: 'sachsen_total'
          };
        }
      } else if (!isAbortLikeError(qualityResult.reason)) {
        console.error('Qualitaetsdaten konnten nicht geladen werden.', qualityResult.reason);
      }

      renderOverviewCurrent({ saveHistory: true });
      if (els.lastUpdated) {
        els.lastUpdated.textContent = `Letzte Aktualisierung: ${formatDateTime(startedAt)}`;
      }

      if (statisticResult.status === 'rejected' && qualityResult.status === 'rejected') {
        throw statisticResult.reason || qualityResult.reason;
      }
    } catch (error) {
      console.error('Startseite konnte nicht geladen werden.', error);
      showMessage('Die Daten konnten nicht geladen werden. Bitte spaeter erneut versuchen.');
      renderOverviewEmpty();
    }
  }

  async function loadStatisticRowsIncremental(onRow = null) {
    const query = buildQuery(state.context);
    const targetTypes = state.context.type ? [state.context.type] : TYPES;
    const rows = [];

    const results = await Promise.all(targetTypes.map(async (type) => {
      try {
        const [totalPayload, openDataPayload] = await Promise.all([
          fetchJsonCached(buildUrl(type, query, { limit: 1 })),
          fetchJsonCached(buildUrl(type, query, { limit: 1, isOpenData: true }))
        ]);
        const row = {
          type,
          statistikCount: Number(extractTotal(totalPayload) || 0),
          openDataCount: Number(extractTotal(openDataPayload) || 0)
        };
        rows.push(row);
        onRow?.(row, sortStatisticRows(rows));
        return row;
      } catch (error) {
        if (!isAbortLikeError(error)) {
          console.warn('Statistik-Count fehlgeschlagen.', type, error);
        }
        return null;
      }
    }));

    const finalRows = sortStatisticRows(results.filter(Boolean));
    if (!finalRows.length && targetTypes.length) {
      throw new Error('No statistic rows loaded');
    }
    return finalRows;
  }

  async function loadStatisticRows() {
    const query = buildQuery(state.context);
    const targetTypes = state.context.type ? [state.context.type] : TYPES;
    return Promise.all(targetTypes.map(async (type) => {
      const [totalPayload, openDataPayload] = await Promise.all([
        fetchJsonCached(buildUrl(type, query, { limit: 1 })),
        fetchJsonCached(buildUrl(type, query, { limit: 1, isOpenData: true }))
      ]);
      return {
        type,
        statistikCount: Number(extractTotal(totalPayload) || 0),
        openDataCount: Number(extractTotal(openDataPayload) || 0)
      };
    }));
  }

  function getRegionalScanPageSize() {
    const value = Number(window.SATOURN_REGION_QUALITY_PAGE_SIZE || 200);
    return Number.isFinite(value) ? Math.max(1, Math.min(200, value)) : 200;
  }

  function getRegionalScanMaxPages() {
    const value = Number(window.SATOURN_REGION_QUALITY_MAX_PAGES || 50);
    return Number.isFinite(value) ? Math.max(1, Math.min(250, value)) : 50;
  }

  function getQualityScanMeta(shared) {
    const estimatedTotalItems = Object.values(shared.estimatedByType)
      .filter(Number.isFinite)
      .reduce((sum, value) => sum + value, 0);
    return {
      mode: 'regional_scan',
      collectedItems: shared.items.length,
      estimatedTotalItems,
      truncated: shared.truncated,
      unsupportedCriteria: [],
      failedCounts: shared.failedTypes,
      pendingTypes: Math.max(0, shared.totalTypes - shared.completedTypes),
      completedTypes: shared.completedTypes
    };
  }

  function emitRegionalQualityUpdate(shared, onUpdate) {
    state.normalizedItems = [...shared.items];
    state.qualityAggregations = getQualityAggregations(state.normalizedItems);
    state.qualityDataMeta = getQualityScanMeta(shared);
    onUpdate?.(state.qualityAggregations, state.qualityDataMeta, state.normalizedItems);
  }

  async function loadRegionalQualityEvaluation({ isStale = () => false, onUpdate = null } = {}) {
    const query = buildQuery(state.context);
    const targetTypes = state.context.type ? [state.context.type] : TYPES;
    const pageSize = getRegionalScanPageSize();
    const maxPages = getRegionalScanMaxPages();
    const shared = {
      items: [],
      estimatedByType: {},
      completedTypes: 0,
      failedTypes: 0,
      totalTypes: targetTypes.length,
      truncated: false
    };

    emitRegionalQualityUpdate(shared, onUpdate);

    await Promise.all(targetTypes.map(async (type) => {
      const seenIds = new Set();
      let offset = 0;
      let pages = 0;
      let complete = false;

      try {
        while (!isStale() && pages < maxPages) {
          const payload = await fetchJsonCached(buildUrl(type, query, { limit: pageSize, offset }));
          const pageItems = extractItems(payload);
          const pageTotal = extractTotal(payload);
          if (Number.isFinite(pageTotal)) shared.estimatedByType[type] = pageTotal;
          pages += 1;

          const normalized = pageItems
            .filter((rawItem) => {
              const itemId = extractId(rawItem) || `${type}:${offset}:${seenIds.size}`;
              if (seenIds.has(itemId)) return false;
              seenIds.add(itemId);
              return true;
            })
            .map((rawItem) => normalizeItem(rawItem, type));
          const evaluated = evaluateAllItems(normalized);
          shared.items.push(...evaluated);
          emitRegionalQualityUpdate(shared, onUpdate);

          offset += pageItems.length;
          if (!pageItems.length || pageItems.length < pageSize || (Number.isFinite(pageTotal) && offset >= pageTotal)) {
            complete = true;
            break;
          }
        }
      } catch (error) {
        if (!isAbortLikeError(error) && !isStale()) {
          shared.failedTypes += 1;
          console.warn('Regionaler Qualitaetsscan fehlgeschlagen.', type, error);
        }
      } finally {
        if (!complete && !isStale()) shared.truncated = true;
        shared.completedTypes += 1;
        emitRegionalQualityUpdate(shared, onUpdate);
      }
    }));

    return {
      items: [...shared.items],
      aggregations: getQualityAggregations(shared.items),
      meta: getQualityScanMeta(shared)
    };
  }

  function fillStatsFilters() {
    if (els.statsAreaFilter && !els.statsAreaFilter.options.length) {
      AREAS.forEach(([label, value]) => els.statsAreaFilter.append(new Option(label, value)));
    }
    if (els.statsTypeFilter && !els.statsTypeFilter.options.length) {
      els.statsTypeFilter.append(new Option('Alle Datentypen', ''));
      TYPES.forEach((type) => els.statsTypeFilter.append(new Option(type, type)));
    }
    if (els.statsAreaFilter) els.statsAreaFilter.value = state.context.area || '';
    if (els.statsCityFilter) els.statsCityFilter.value = state.context.city || '';
    if (els.statsTypeFilter) els.statsTypeFilter.value = state.context.type || '';
  }

  async function loadStatsData() {
    const startedAt = new Date();
    showStatsMessage('');
    renderStatsLoading();
    setStatsLoadingState(true);

    try {
      const snapshot = await loadCachedQualitySnapshot();
      const rows = snapshot
        ? state.latestRows
        : await loadStatisticRows();
      state.statsRows = rows.map((row) => ({
        ...row,
        nonOpenDataCount: Math.max(0, row.statistikCount - row.openDataCount),
        openDataQuote: percent(row.openDataCount, row.statistikCount),
        inventoryShare: 0
      }));
      state.statsSummary = computeStatsSummary(state.statsRows);
      state.statsRows.forEach((row) => {
        row.inventoryShare = percent(row.statistikCount, state.statsSummary.totalRecords);
      });
      renderStats();
      if (els.lastUpdated) {
        els.lastUpdated.textContent = `Letzte Aktualisierung: ${formatDateTime(new Date(snapshot?.generatedAt || startedAt))}`;
      }
    } catch (error) {
      console.error('Open-Data-Statistik konnte nicht vollständig geladen werden.', error);
      renderStatsError();
    } finally {
      setStatsLoadingState(false);
    }
  }

  async function loadStatsDataAsync() {
    const startedAt = new Date();
    showStatsMessage('');
    renderStatsLoading();
    setStatsLoadingState(true);

    const applyStatsRows = (rows) => {
      state.statsRows = rows.map((row) => ({
        ...row,
        nonOpenDataCount: Math.max(0, row.statistikCount - row.openDataCount),
        openDataQuote: percent(row.openDataCount, row.statistikCount),
        inventoryShare: 0
      }));
      state.statsSummary = computeStatsSummary(state.statsRows);
      state.statsRows.forEach((row) => {
        row.inventoryShare = percent(row.statistikCount, state.statsSummary.totalRecords);
      });
      renderStats();
    };

    try {
      const rows = await loadStatisticRowsIncremental((row, partialRows) => {
        applyStatsRows(partialRows);
      });
      applyStatsRows(rows);
      if (els.lastUpdated) {
        els.lastUpdated.textContent = `Letzte Aktualisierung: ${formatDateTime(startedAt)}`;
      }
    } catch (error) {
      console.error('Open-Data-Statistik konnte nicht geladen werden.', error);
      renderStatsError();
    } finally {
      setStatsLoadingState(false);
    }
  }

  function computeStatsSummary(rows) {
    const totalRecords = rows.reduce((sum, row) => sum + row.statistikCount, 0);
    const openDataRecords = rows.reduce((sum, row) => sum + row.openDataCount, 0);
    const nonOpenDataRecords = Math.max(0, totalRecords - openDataRecords);
    return {
      totalRecords,
      openDataRecords,
      nonOpenDataRecords,
      openDataQuote: percent(openDataRecords, totalRecords)
    };
  }

  function renderStats() {
    const summary = state.statsSummary || computeStatsSummary([]);
    if (!summary.totalRecords) {
      renderStatsEmpty('Für diesen Arbeitskontext wurden keine Datensätze gefunden.');
      return;
    }

    if (els.statsTotalRecords) els.statsTotalRecords.textContent = formatNumber(summary.totalRecords);
    if (els.statsOpenDataRecords) els.statsOpenDataRecords.textContent = formatNumber(summary.openDataRecords);
    if (els.statsOpenDataShare) els.statsOpenDataShare.textContent = `${formatPercent(summary.openDataQuote)} aller Datensätze`;
    if (els.statsOpenDataQuote) els.statsOpenDataQuote.textContent = formatPercent(summary.openDataQuote);
    if (els.statsNonOpenDataRecords) els.statsNonOpenDataRecords.textContent = formatNumber(summary.nonOpenDataRecords);
    if (els.statsNonOpenDataShare) els.statsNonOpenDataShare.textContent = `${formatPercent(percent(summary.nonOpenDataRecords, summary.totalRecords))} aller Datensätze`;
    if (els.statsExport) els.statsExport.disabled = !state.statsRows.length;

    renderStatsTypeDistribution(summary);
    renderStatsQuoteBars();
    renderStatsLicenseTask(summary);
  }

  function renderStatsTypeDistribution(summary) {
    const palette = ['#0b74f2', '#2eb85c', '#f5aa1c', '#8b3ff2', '#ef3f42', '#16b8d9'];
    let cursor = 0;
    const segments = state.statsRows.map((row, index) => {
      const start = cursor;
      const end = cursor + row.inventoryShare;
      cursor = end;
      return `${palette[index % palette.length]} ${start}% ${end}%`;
    }).join(', ');

    if (els.statsTypeDonut) {
      els.statsTypeDonut.style.background = summary.totalRecords
        ? `conic-gradient(${segments})`
        : 'conic-gradient(#e2e8f0 0 100%)';
    }
    if (els.statsTypeDonutTotal) els.statsTypeDonutTotal.textContent = formatNumber(summary.totalRecords);
    if (els.statsTypeDistributionBody) {
      els.statsTypeDistributionBody.innerHTML = state.statsRows.map((row, index) => `
        <tr>
          <td><span class="legend-dot" style="background:${palette[index % palette.length]}"></span>${escapeHtml(row.type)}</td>
          <td>${formatNumber(row.statistikCount)}</td>
          <td>${formatPercent(row.inventoryShare)}</td>
        </tr>
      `).join('');
    }
  }

  function renderStatsQuoteBars() {
    if (!els.statsQuoteBars) return;
    els.statsQuoteBars.innerHTML = state.statsRows.map((row) => `
      <div class="stats-quote-row">
        <span>${escapeHtml(row.type)}</span>
        <div class="stats-quote-track"><i style="width:${Math.max(0, Math.min(100, row.openDataQuote))}%"></i></div>
        <strong>${formatPercent(row.openDataQuote)}</strong>
      </div>
    `).join('');
  }

  function renderStatsLicenseTask(summary) {
    const hasLicenseTask = summary.nonOpenDataRecords > 0;
    if (els.statsLicenseTaskCard) els.statsLicenseTaskCard.hidden = !hasLicenseTask;
    if (!hasLicenseTask) return;
    if (els.statsLicenseTaskCount) {
      els.statsLicenseTaskCount.textContent = formatNumber(summary.nonOpenDataRecords);
    }
    if (els.statsLicenseTaskShare) {
      els.statsLicenseTaskShare.textContent = `${formatPercent(percent(summary.nonOpenDataRecords, summary.totalRecords))} nicht Open-Data-f\u00e4hig`;
    }
  }

  function renderStatsTypeTable(summary) {
    if (!els.statsTypeTableBody) return;
    const rows = state.statsRows.map((row) => `
      <tr>
        <td>${escapeHtml(row.type)}</td>
        <td>${formatNumber(row.statistikCount)}</td>
        <td>${formatNumber(row.openDataCount)}</td>
        <td><span class="stats-table-quote"><strong>${formatPercent(row.openDataQuote)}</strong><span><i style="width:${Math.max(0, Math.min(100, row.openDataQuote))}%"></i></span></span></td>
        <td>${formatNumber(row.nonOpenDataCount)}</td>
      </tr>
    `).join('');
    els.statsTypeTableBody.innerHTML = `${rows}
      <tr class="stats-total-row">
        <td>Gesamt</td>
        <td>${formatNumber(summary.totalRecords)}</td>
        <td>${formatNumber(summary.openDataRecords)}</td>
        <td><span class="stats-table-quote"><strong>${formatPercent(summary.openDataQuote)}</strong><span><i style="width:${Math.max(0, Math.min(100, summary.openDataQuote))}%"></i></span></span></td>
        <td>${formatNumber(summary.nonOpenDataRecords)}</td>
      </tr>`;
  }

  function renderStatsLoading() {
    ['stats-total-records', 'stats-open-data-records', 'stats-open-data-quote', 'stats-non-open-data-records'].forEach((id) => {
      const node = document.getElementById(id);
      if (node) node.textContent = '...';
    });
    if (els.statsOpenDataShare) els.statsOpenDataShare.textContent = '...';
    if (els.statsNonOpenDataShare) els.statsNonOpenDataShare.textContent = '...';
    if (els.statsTypeDonutTotal) els.statsTypeDonutTotal.textContent = '...';
    if (els.statsTypeDistributionBody) els.statsTypeDistributionBody.innerHTML = '<tr><td colspan="3" class="table-empty"><span class="loading-line">Statistik wird geladen ...</span></td></tr>';
    if (els.statsQuoteBars) els.statsQuoteBars.innerHTML = '<div class="inline-loading">Statistik wird geladen ...</div>';
    if (els.statsTypeTableBody) els.statsTypeTableBody.innerHTML = '<tr><td colspan="5" class="table-empty">Statistik wird geladen ...</td></tr>';
    if (els.statsLicenseTaskCard) els.statsLicenseTaskCard.hidden = true;
    if (els.statsLicenseTaskCount) els.statsLicenseTaskCount.textContent = '...';
    if (els.statsLicenseTaskShare) els.statsLicenseTaskShare.textContent = '...';
    if (els.statsExport) els.statsExport.disabled = true;
  }

  function renderStatsEmpty(message) {
    showStatsMessage(message);
    if (els.statsTypeDistributionBody) els.statsTypeDistributionBody.innerHTML = '<tr><td colspan="3" class="table-empty">Keine Daten gefunden.</td></tr>';
    if (els.statsQuoteBars) els.statsQuoteBars.innerHTML = '<div class="empty-note">Keine Daten gefunden.</div>';
    if (els.statsTypeTableBody) els.statsTypeTableBody.innerHTML = '<tr><td colspan="5" class="table-empty">Keine Daten gefunden.</td></tr>';
    if (els.statsLicenseTaskCard) els.statsLicenseTaskCard.hidden = true;
    if (els.statsLicenseTaskCount) els.statsLicenseTaskCount.textContent = '-';
    if (els.statsLicenseTaskShare) els.statsLicenseTaskShare.textContent = 'Keine Datens\u00e4tze';
    if (els.statsExport) els.statsExport.disabled = true;
  }

  function renderStatsError() {
    showStatsMessage('Die Statistik konnte nicht vollständig geladen werden. Bitte erneut aktualisieren.');
    if (els.statsTypeDistributionBody) els.statsTypeDistributionBody.innerHTML = '<tr><td colspan="3" class="table-empty">Die Statistik konnte nicht vollständig geladen werden.</td></tr>';
    if (els.statsQuoteBars) els.statsQuoteBars.innerHTML = '<div class="empty-note">Die Statistik konnte nicht vollständig geladen werden.</div>';
    if (els.statsTypeTableBody) els.statsTypeTableBody.innerHTML = '<tr><td colspan="5" class="table-empty">Die Statistik konnte nicht vollständig geladen werden.</td></tr>';
    if (els.statsLicenseTaskCard) els.statsLicenseTaskCard.hidden = true;
    if (els.statsLicenseTaskCount) els.statsLicenseTaskCount.textContent = '-';
    if (els.statsLicenseTaskShare) els.statsLicenseTaskShare.textContent = 'Nicht geladen';
    if (els.statsExport) els.statsExport.disabled = true;
  }

  function showStatsMessage(message) {
    if (!els.statsMessage) return;
    els.statsMessage.textContent = message || '';
    els.statsMessage.hidden = !message;
  }

  function setStatsLoadingState(isLoading) {
    [els.statsRefresh, els.refreshButton].forEach((button) => {
      if (!button) return;
      button.disabled = isLoading;
    });
    if (els.statsRefresh) {
      els.statsRefresh.innerHTML = isLoading
        ? '<span class="material-icons" aria-hidden="true">hourglass_top</span>Aktualisieren ...'
        : '<span class="material-icons" aria-hidden="true">refresh</span>Aktualisieren';
    }
  }

  function resetStatsFilters() {
    saveWorkContext({ area: '', city: '', type: '' });
    fillStatsFilters();
    void loadStatsDataAsync();
  }

  function applyStatsFiltersAndLoad() {
    saveWorkContext({
      area: els.statsAreaFilter?.value || '',
      city: els.statsCityFilter?.value.trim() || '',
      type: els.statsTypeFilter?.value || ''
    });
    fillStatsFilters();
    void loadStatsDataAsync();
  }

  function exportStatsCsv() {
    if (!state.statsRows.length || !state.statsSummary) return;
    const summary = state.statsSummary;
    const rows = [
      ['Datentyp', 'Gesamtzahl', 'Open-Data-fähig', 'Open-Data-Quote', 'Nicht Open-Data-fähig'],
      ...state.statsRows.map((row) => [
        row.type,
        row.statistikCount,
        row.openDataCount,
        formatPercent(row.openDataQuote),
        row.nonOpenDataCount
      ]),
      ['Gesamt', summary.totalRecords, summary.openDataRecords, formatPercent(summary.openDataQuote), summary.nonOpenDataRecords]
    ];
    const text = rows.map((row) => row.map(csvValue).join(';')).join('\n');
    downloadText('satourn_open_data_statistik.csv', text, 'text/csv;charset=utf-8');
  }

  function buildQualityCountUrl(criterionId, type, query) {
    const params = new URLSearchParams();
    params.set('criterionId', criterionId);
    params.set('type', type);
    if (query) params.set('query', query);
    return `${QUALITY_COUNT_API_BASE}?${params.toString()}`;
  }

  function buildQualityListUrl({ criterionId, type, query }) {
    const params = new URLSearchParams();
    params.set('criterionId', criterionId);
    params.set('type', type);
    if (query) params.set('query', query);
    return `${QUALITY_LIST_API_BASE}?${params.toString()}`;
  }

  async function loadCachedQualityList({ criterionId, type, query }) {
    if (!USE_QUALITY_CACHE) return null;
    try {
      return await fetchJsonCached(buildQualityListUrl({ criterionId, type, query }), { optional404: true });
    } catch (error) {
      console.warn('Qualitaetsliste konnte nicht aus dem Cache geladen werden.', error);
      return null;
    }
  }

  async function loadQualityCountSummary({ onUpdate = null } = {}) {
    const query = buildQuery(state.context);
    const targetTypes = state.context.type ? [state.context.type] : TYPES;
    const activeCriteria = qualityCriteria.filter((criterion) => isActiveCriterion(criterion.id));
    const issueMap = new Map();
    const unsupported = [];
    let failedCounts = 0;

    const buildIssues = () => Array.from(issueMap.values()).map((issue) => ({
      ...issue,
      affectedTypes: issue.affectedTypes.sort((a, b) => a.localeCompare(b, 'de'))
    }));

    const emit = () => {
      const issues = buildIssues();
      const meta = {
        mode: 'api_counts',
        collectedItems: 0,
        estimatedTotalItems: issues.reduce((sum, issue) => sum + issue.affectedCount, 0),
        truncated: false,
        unsupportedCriteria: unsupported,
        failedCounts
      };
      state.qualityDataMeta = meta;
      onUpdate?.(issues, meta);
      return issues;
    };

    const jobs = activeCriteria.flatMap((criterion) => (
      targetTypes
        .filter((type) => !criterion.types?.length || criterion.types.includes(type))
        .map((type) => ({ criterion, type, scanConfig: getQualityScanConfig(criterion, type) }))
    ));

    await Promise.all(jobs.map(async ({ criterion, type, scanConfig }) => {
      if (scanConfig.method !== 'api_pushdown' || !scanConfig.verified || !scanConfig.missingQuery) {
        unsupported.push({ criterionId: criterion.id, type, method: scanConfig.method });
        emit();
        return;
      }

      try {
        const payload = await fetchJsonCached(buildQualityCountUrl(criterion.id, type, query));
        const count = Number(payload?.count || 0);
        if (!issueMap.has(criterion.id)) {
          issueMap.set(criterion.id, {
            criterionId: criterion.id,
            label: criterion.label,
            affectedCount: 0,
            affectedTypes: [],
            typeCounts: {},
            priority: criterion.priority,
            autoCheck: criterion.autoCheck !== false,
            recommendation: criterion.recommendation,
            countMode: 'api_count'
          });
        }
        const issue = issueMap.get(criterion.id);
        issue.affectedCount += count;
        issue.typeCounts[type] = count;
        if (count > 0 && !issue.affectedTypes.includes(type)) issue.affectedTypes.push(type);
        emit();
      } catch (error) {
        failedCounts += 1;
        emit();
        console.warn('Qualitäts-Count fehlgeschlagen.', criterion.id, type, error);
      }
    }));

    const issues = Array.from(issueMap.values()).map((issue) => ({
      ...issue,
      affectedTypes: issue.affectedTypes.sort((a, b) => a.localeCompare(b, 'de'))
    }));

    state.qualityDataMeta = {
      mode: 'api_counts',
      collectedItems: 0,
      estimatedTotalItems: issues.reduce((sum, issue) => sum + issue.affectedCount, 0),
      truncated: false,
      unsupportedCriteria: unsupported,
      failedCounts
    };

    return issues;
  }

  function buildAggregationsFromIssueSummary(issueSummary) {
    return {
      averageQualityScore: null,
      qualityStatusCounts: {},
      openDataCapableCount: 0,
      issueSummary
    };
  }

  async function loadTasksData() {
    const startedAt = new Date();
    const loadId = ++state.taskLoadId;
    showTaskMessage('');
    renderTasksLoading();
    hidePrimarySystems();
    clearTaskRecords();

    const applyIssueSummary = (issueSummary) => {
      if (loadId !== state.taskLoadId) return;
      const selectedId = state.selectedTask?.taskId || state.selectedTask?.criterionId || state.pendingTaskId || '';
      state.taskItems = [];
      state.taskRows = buildTaskRows(issueSummary);
      state.selectedTask = findTaskById(state.taskRows, selectedId)
        || state.taskRows[0]
        || null;
      if (state.selectedTask && taskMatchesIdentifier(state.selectedTask, state.pendingTaskId)) state.pendingTaskId = '';
      const preferredTaskType = resolveTaskTypeByCriterionId(state.selectedTask, selectedId);
      state.selectedTaskType = preferredTaskType
        || (state.selectedTask?.affectedTypes?.includes(state.selectedTaskType) ? state.selectedTaskType : '');
      state.taskPage = Math.min(state.taskPage || 1, Math.max(1, Math.ceil(state.taskRows.length / state.taskRowsPerPage)));
      applyTaskFilters();
      renderTaskDetail();
    };

    try {
      const issueSummary = canCalculateQualityForContext()
        ? await loadRegionalQualityEvaluation({
          isStale: () => loadId !== state.taskLoadId,
          onUpdate: (aggregations, meta, items) => {
            if (loadId !== state.taskLoadId) return;
            state.taskItems = items || [];
            state.qualityAggregations = aggregations;
            state.qualityDataMeta = meta;
            applyIssueSummary(aggregations?.issueSummary || []);
          }
        }).then((result) => {
          state.taskItems = result.items || [];
          state.qualityAggregations = result.aggregations;
          state.qualityDataMeta = result.meta;
          return result.aggregations?.issueSummary || [];
        })
        : await loadQualityCountSummary({
          onUpdate: (partialIssueSummary) => applyIssueSummary(partialIssueSummary)
        });
      if (loadId !== state.taskLoadId) return;
      applyIssueSummary(issueSummary);
      state.taskPage = 1;
      applyTaskFilters();
      renderTaskDetail();
      if (els.lastUpdated) {
        els.lastUpdated.textContent = `Letzte Aktualisierung: ${formatDateTime(startedAt)}`;
      }
    } catch (error) {
      console.error('Pflegeaufgaben konnten nicht geladen werden.', error);
      renderTasksEmpty('Die Pflegeaufgaben konnten nicht geladen werden.');
    }
  }

  function buildTaskRows(issueSummary) {
    return groupIssueSummaryForTasks(issueSummary)
      .filter((issue) => issue.affectedCount > 0 && isActiveCriterion(issue.criterionId))
      .map((issue) => {
        const criterion = qualityCriteria.find((entry) => entry.id === issue.criterionId);
        const familyMeta = getTaskFamilyMeta(issue);
        const affectedTypes = (issue.affectedTypes || []).filter(Boolean);
        const openDataRelevant = isOpenDataRelevantCriterion(issue.criterionId);
        const impact = computeTaskImpact(issue, openDataRelevant);
        return {
          ...issue,
          taskId: issue.taskId || issue.criterionId,
          criterion,
          affectedTypes,
          openDataRelevant,
          impact,
          description: familyMeta?.description || taskDescription(issue.criterionId),
          problem: familyMeta?.problem || taskProblem(issue.criterionId),
          recommendation: familyMeta?.recommendation || criterion?.recommendation || issue.recommendation || 'Datensatz prüfen und fehlende Angaben ergänzen.',
          impactText: familyMeta?.impactText || null,
          iconCriterionId: familyMeta?.iconCriterionId || issue.criterionId
        };
      })
      .sort((a, b) => (
        impactRank(b.impact) - impactRank(a.impact) ||
        priorityRank(b.priority) - priorityRank(a.priority) ||
        b.affectedCount - a.affectedCount ||
        a.label.localeCompare(b.label, 'de')
      ));
  }

  function groupIssueSummaryForTasks(issueSummary = []) {
    const groups = new Map();

    issueSummary.forEach((issue) => {
      if (!issue?.criterionId) return;
      const taskFamily = getTaskFamilyId(issue.criterionId);
      const familyMeta = TASK_FAMILY_META[taskFamily];
      const existing = groups.get(taskFamily) || {
        taskId: taskFamily,
        taskFamily,
        criterionId: issue.criterionId,
        criterionIds: new Set(),
        criteriaByType: {},
        label: familyMeta?.label || issue.label,
        affectedCount: 0,
        affectedTypes: new Set(),
        priority: issue.priority,
        autoCheck: issue.autoCheck !== false,
        recommendation: familyMeta?.recommendation || issue.recommendation
      };

      existing.criterionIds.add(issue.criterionId);
      existing.affectedCount += Number(issue.affectedCount || 0);
      existing.autoCheck = existing.autoCheck && issue.autoCheck !== false;
      if (priorityRank(issue.priority) > priorityRank(existing.priority)) existing.priority = issue.priority;
      (issue.affectedTypes || []).forEach((type) => {
        if (!type) return;
        existing.affectedTypes.add(type);
        if (!existing.criteriaByType[type]) existing.criteriaByType[type] = issue.criterionId;
      });
      groups.set(taskFamily, existing);
    });

    return Array.from(groups.values()).map((entry) => ({
      ...entry,
      criterionIds: Array.from(entry.criterionIds),
      affectedTypes: Array.from(entry.affectedTypes).sort((a, b) => a.localeCompare(b, 'de'))
    }));
  }

  function getTaskFamilyId(criterionId) {
    return TASK_FAMILY_BY_CRITERION[criterionId] || criterionId;
  }

  function getTaskFamilyMeta(taskOrIssue) {
    return TASK_FAMILY_META[taskOrIssue?.taskFamily || getTaskFamilyId(taskOrIssue?.criterionId)];
  }

  function isActiveCriterion(criterionId) {
    const criterion = qualityCriteria.find((entry) => entry.id === criterionId);
    return Boolean(criterion && criterion.autoCheck !== false);
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

  function findTaskById(tasks, identifier) {
    return tasks.find((task) => taskMatchesIdentifier(task, identifier)) || null;
  }

  function taskMatchesIdentifier(task, identifier) {
    if (!task || !identifier) return false;
    return task.taskId === identifier
      || task.criterionId === identifier
      || task.criterionIds?.includes(identifier);
  }

  function resolveTaskTypeByCriterionId(task, criterionId) {
    if (!task || !criterionId || !task.criteriaByType) return '';
    return Object.entries(task.criteriaByType).find(([, id]) => id === criterionId)?.[0] || '';
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
      if (state.qualityDataMeta.mode === 'snapshot') {
        els.taskDataNote.textContent = state.qualityDataMeta.truncated
          ? 'Die Pflegeaufgaben stammen aus dem gecachten Nachtlauf. Der Lauf war begrenzt; einzelne Listen koennen weiter live nachgeladen werden.'
          : 'Die Pflegeaufgaben stammen aus dem gecachten Nachtlauf und basieren auf vollstaendig gescannten Datensaetzen.';
        return;
      }
      const unsupportedCount = state.qualityDataMeta.unsupportedCriteria?.length || 0;
      const failedText = state.qualityDataMeta.failedCounts ? ` ${formatNumber(state.qualityDataMeta.failedCounts)} Count-Abfragen konnten nicht geladen werden.` : '';
      els.taskDataNote.textContent = unsupportedCount || failedText
        ? `Einzelne Aufgaben werden bei Bedarf live nachgeladen.${failedText}`
        : 'Pflegeaufgaben sind geladen.';
    }
  }

  function renderTaskTable() {
    const rows = state.filteredTaskRows;
    const totalPages = Math.max(1, Math.ceil(rows.length / state.taskRowsPerPage));
    state.taskPage = Math.max(1, Math.min(state.taskPage, totalPages));
    const start = (state.taskPage - 1) * state.taskRowsPerPage;
    const visibleRows = rows.slice(start, start + state.taskRowsPerPage);

    if (!visibleRows.length) {
      els.taskTableBody.innerHTML = '<tr><td colspan="6" class="table-empty">Für diese Auswahl wurden keine Pflegeaufgaben gefunden.</td></tr>';
    } else {
      els.taskTableBody.innerHTML = visibleRows.map((task) => `
        <tr>
          <td>
            <button class="task-table-action ${task === state.selectedTask ? 'active' : ''}" type="button" data-task-id="${escapeHtml(task.taskId)}">
              <span class="task-icon ${task.priority === 'hoch' ? 'critical' : 'review'}" aria-hidden="true">${taskIcon(task.iconCriterionId || task.criterionId)}</span>
              <span><strong>${escapeHtml(task.label)}</strong><small>${escapeHtml(task.description)}</small></span>
            </button>
          </td>
          <td>${formatNumber(task.affectedCount)}</td>
          <td><span class="status-badge ${task.priority === 'hoch' ? 'critical' : 'review'}">${priorityLabel(task.priority)}</span></td>
          <td>${renderTypeChips(task.affectedTypes)}</td>
          <td><span class="status-badge ${impactBadgeClass(task.impact)}">${impactLabel(task.impact)}</span></td>
          <td><button class="row-arrow" type="button" data-task-id="${escapeHtml(task.taskId)}" aria-label="Aufgabe anzeigen"><span class="material-icons" aria-hidden="true">chevron_right</span></button></td>
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

  function selectTask(taskId) {
    state.selectedTask = findTaskById(state.filteredTaskRows, taskId)
      || findTaskById(state.taskRows, taskId)
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
        <dd><span class="impact-dot ${impactBadgeClass(task.impact)}"></span>${escapeHtml(impactLabel(task.impact))}. ${escapeHtml(task.impactText || taskImpactText(task.criterionId))}</dd>
        <dt>Empfohlene Aktion</dt>
        <dd>${escapeHtml(task.recommendation)}</dd>
        <dt>Betroffene Typen</dt>
        <dd>${renderTypeChips(task.affectedTypes)}</dd>
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
      openTaskRecordsOnRecordsPage(task, state.selectedTaskType || type);
    });

    renderPrimarySystemsForTask(task);
  }

  function openTaskRecordsOnRecordsPage(task, type) {
    if (!task || !type) {
      showTaskMessage('Bitte wähle zuerst eine konkrete Aufgabe und einen Datentyp.');
      return;
    }
    const criterionId = resolveTaskCriterionId(task, type);
    if (!criterionId) {
      showTaskMessage('Für diesen Datentyp konnte kein passendes Qualitätskriterium bestimmt werden.');
      return;
    }

    saveRecordViewState({
      criterionId,
      type,
      label: task.label,
      context: state.context
    });

    const params = new URLSearchParams();
    params.set('criterionId', criterionId);
    params.set('type', type);
    params.set('from', 'tasks');
    location.href = `records.html?${params.toString()}`;
  }

  function resolveTaskCriterionId(task, type = '') {
    if (!task) return '';
    if (type && task.criteriaByType?.[type]) return task.criteriaByType[type];
    return task.criterionId || task.criterionIds?.[0] || '';
  }

  function openOverviewIssueOnRecordsPage(issue) {
    if (!issue?.criterionId) return;

    const preferredType = state.context.type
      || (issue.affectedTypes?.length === 1 ? issue.affectedTypes[0] : '');

    saveRecordViewState({
      criterionId: issue.criterionId,
      type: preferredType,
      label: issue.label,
      context: state.context
    });

    const params = new URLSearchParams();
    params.set('criterionId', issue.criterionId);
    if (preferredType) params.set('type', preferredType);
    params.set('from', 'overview');
    location.href = `records.html?${params.toString()}`;
  }

  async function loadTaskRecords() {
    const task = state.selectedTask;
    const type = state.selectedTaskType || task?.affectedTypes?.[0] || '';
    const criterionId = resolveTaskCriterionId(task, type);
    if (!task || !type) {
      showTaskMessage('Bitte wähle zuerst eine konkrete Aufgabe und einen Datentyp.');
      return;
    }
    if (!criterionId) {
      showTaskMessage('Für diesen Datentyp konnte kein passendes Qualitätskriterium bestimmt werden.');
      return;
    }

    showTaskMessage('');
    els.taskRecordsSection.hidden = false;
    els.taskRecordsExport.disabled = true;
    els.taskRecordsTitle.textContent = `${task.label} - ${type}`;
    els.taskRecordsNote.textContent = 'Datensätze werden geladen ...';
    els.taskRecordsBody.innerHTML = '<tr><td colspan="6" class="table-empty"><span class="loading-line">Datensätze werden geladen ...</span></td></tr>';

    try {
      const params = new URLSearchParams();
      params.set('criterionId', criterionId);
      params.set('type', type);
      params.set('limit', '200');
      params.set('scanPageSize', '200');
      params.set('maxPages', '20');
      const query = buildQuery(state.context);
      if (query) params.set('query', query);

      const cachedPayload = await loadCachedQualityList({
        criterionId,
        type,
        query
      });
      const payload = cachedPayload || await fetchJsonCached(`${QUALITY_SCAN_API_BASE}?${params.toString()}`);
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
    const completeText = page.complete ? 'Liste geladen.' : 'Liste geladen, weitere Treffer können später nachgeladen werden.';
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
    if (els.taskTableBody) els.taskTableBody.innerHTML = '<tr><td colspan="6" class="table-empty"><span class="loading-line">Pflegeaufgaben werden geladen ...</span></td></tr>';
    if (els.taskTableCount) els.taskTableCount.textContent = '-';
    if (els.taskDetailContent) els.taskDetailContent.innerHTML = '<p class="empty-note">Pflegeaufgaben werden geladen ...</p>';
  }

  function renderTasksEmpty(message) {
    [els.taskKpiOpen, els.taskKpiHigh, els.taskKpiAffected, els.taskKpiOpenData, els.taskKpiPotential].forEach((node) => {
      if (node) node.textContent = '-';
    });
    if (els.taskKpiHighDetail) els.taskKpiHighDetail.textContent = '-';
    if (els.taskTableBody) els.taskTableBody.innerHTML = '<tr><td colspan="6" class="table-empty">Noch keine Pflegeaufgaben geladen.</td></tr>';
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
    state.recordServerSearchKeys = new Set();
    showRecordsMessage('');
    renderRecordsLoading();

    try {
      const usesCriterionView = Boolean(state.pendingRecordView?.criterionId);
      const selectedIssue = els.recordIssueFilter?.value || '';
      const selectedType = els.recordTypeFilter?.value || state.context.type || '';
      const evaluated = usesCriterionView
        ? state.pendingRecordView?.type
          ? await loadRecordRowsForView(state.pendingRecordView)
          : await loadRecordRowsForIssueSelection(state.pendingRecordView.criterionId, '')
        : selectedIssue
          ? await loadRecordRowsForIssueSelection(selectedIssue, selectedType)
          : [];
      state.recordItems = evaluated;
      state.recordRows = evaluated.map(buildRecordViewModel);
      if (!usesCriterionView && !selectedIssue) {
        state.recordDataMeta = {
          mode: 'empty',
          collectedItems: 0,
          estimatedTotalItems: 0,
          truncated: false
        };
      }
      state.recordPage = 1;
      fillRecordDynamicFilters();
      applyPendingRecordView();
      applyRecordFilters();
      renderPendingRecordViewMessage();
      if (els.lastUpdated) els.lastUpdated.textContent = `Letzte Aktualisierung: ${formatDateTime(startedAt)}`;
    } catch (error) {
      console.error('Datensätze konnten nicht geladen werden.', error);
      renderRecordsEmpty('Die Datensätze konnten nicht geladen werden. Bitte versuche es später erneut.');
    }
  }

  async function loadRecordRowsForIssueSelection(criterionId, selectedType = '') {
    const criterion = qualityCriteria.find((entry) => entry.id === criterionId);
    if (!criterion) return [];
    const targetTypes = selectedType
      ? [selectedType]
      : TYPES.filter((type) => !criterion.types?.length || criterion.types.includes(type));
    const payloads = await Promise.all(targetTypes.map((type) => loadRecordRowsForView({
      criterionId,
      type,
      label: criterion.label
    }).catch((error) => {
      console.warn('Fehlerliste konnte nicht geladen werden.', criterionId, type, error);
      return [];
    })));
    state.recordDataMeta = {
      mode: 'criterion',
      collectedItems: payloads.flat().length,
      estimatedTotalItems: payloads.flat().length,
      truncated: false
    };
    return payloads.flat();
  }

  async function loadRecordRowsForView(view) {
    const query = buildQuery(state.context);
    const params = new URLSearchParams();
    params.set('criterionId', view.criterionId);
    params.set('type', view.type);
    params.set('limit', '200');
    params.set('scanPageSize', '200');
    params.set('maxPages', '20');
    if (query) params.set('query', query);

    const cachedPayload = await loadCachedQualityList({
      criterionId: view.criterionId,
      type: view.type,
      query
    });
    const payload = cachedPayload || await fetchJsonCached(`${QUALITY_SCAN_API_BASE}?${params.toString()}`);
    const rows = extractItems(payload).map((item) => normalizeItem(item, view.type));
    const pageInfo = payload?.page || {};
    const stats = payload?.stats || {};
    state.recordDataMeta = {
      mode: cachedPayload ? 'snapshot_list' : 'criterion',
      collectedItems: rows.length,
      estimatedTotalItems: Number(stats.totalMatchedItems || stats.overallcount || extractTotal(payload) || rows.length),
      truncated: !pageInfo.complete
    };
    return evaluateAllItems(rows);
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

  function applyPendingRecordView() {
    const view = state.pendingRecordView;
    if (!view) return;
    if (els.recordSearchInput && view.query) els.recordSearchInput.value = view.query;
    if (els.recordTypeFilter && TYPES.includes(view.type)) els.recordTypeFilter.value = view.type;
    if (els.recordStatusFilter && view.status) els.recordStatusFilter.value = view.status;
    if (els.recordIssueFilter && view.criterionId) els.recordIssueFilter.value = view.criterionId;
    state.recordPage = 1;
  }

  function renderPendingRecordViewMessage() {
    const view = state.pendingRecordView;
    if (!view) return;
    const criterion = qualityCriteria.find((entry) => entry.id === view.criterionId);
    const label = view.label || criterion?.label || view.criterionId;
    const typeText = view.type ? ` (${view.type})` : '';
    showRecordsMessage(label ? `Gefiltert nach Pflegeaufgabe: ${label}${typeText}.` : 'Gefiltert nach Pflegeaufgabe.');
  }

  function applyRecordFilters() {
    const query = (els.recordSearchInput?.value || '').trim();
    const type = els.recordTypeFilter?.value || '';
    const category = els.recordCategoryFilter?.value || '';
    const status = els.recordStatusFilter?.value || '';
    const issue = els.recordIssueFilter?.value || '';

    state.filteredRecordRows = state.recordRows.filter((row) => {
      if (query && !itemMatchesRecordSearch(row, query) && !state.recordServerSearchKeys.has(getRecordIdentityKey(row))) return false;
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
    if (!query || state.filteredRecordRows.length) return;

    if (els.recordSearchButton) els.recordSearchButton.textContent = 'Suchen ...';
    renderRecordsLoading();
    try {
      const searchResult = looksLikeRecordId(query)
        ? {
            items: await searchSingleRecordById(query),
            estimatedTotalItems: 0,
            truncated: false,
            mode: 'id_search'
          }
        : await searchRecordsByText(query);
      const found = searchResult.items || [];
      if (!found.length) {
        applyRecordFilters();
        showRecordsMessage('Keine Datensätze gefunden.');
        return;
      }
      const evaluated = evaluateAllItems(found.map((raw) => normalizeItem(raw.raw || raw, raw.type)));
      const merged = mergeRecordItems(state.recordItems, evaluated);
      state.recordItems = merged;
      state.recordRows = merged.map(buildRecordViewModel);
      state.recordServerSearchKeys = new Set(evaluated.map(getRecordIdentityKey).filter(Boolean));
      state.recordDataMeta = {
        mode: searchResult.mode || 'search',
        collectedItems: found.length,
        estimatedTotalItems: searchResult.estimatedTotalItems || found.length,
        truncated: Boolean(searchResult.truncated)
      };
      fillRecordDynamicFilters();
      applyRecordFilters();
      showRecordsMessage(searchResult.truncated ? 'Suchtreffer geladen. Verfeinere die Suche bei Bedarf.' : '');
    } catch (error) {
      console.error('Datensatzsuche fehlgeschlagen.', error);
      applyRecordFilters();
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
      `global_id:"${idQuery}"`,
      `globalid:${idQuery}`
    ];
    const results = [];

    for (const type of targetTypes) {
      for (const variant of queryVariants) {
        const combinedQuery = [contextQuery, variant].filter(Boolean).join(' AND ');
        const payload = await fetchJsonCached(buildUrl(type, combinedQuery, { limit: 10 }));
        results.push(...extractItems(payload).map((raw) => normalizeItem(raw, type)));
        if (results.length) break;
      }
      if (results.length) break;
    }
    return results;
  }

  async function searchRecordsByText(query) {
    const termQuery = cleanFullTextQuery(query);
    if (!termQuery) return { items: [], estimatedTotalItems: 0, truncated: false, mode: 'search' };

    const selectedType = els.recordTypeFilter?.value || state.context.type || '';
    const targetTypes = selectedType ? [selectedType] : TYPES;
    const contextQuery = buildQuery(state.context);
    const combinedQuery = [contextQuery, termQuery].filter(Boolean).join(' AND ');
    const perTypeLimit = selectedType ? 40 : 15;
    const payloads = await Promise.all(targetTypes.map(async (type) => {
      try {
        const payload = await fetchJsonCached(buildUrl(type, combinedQuery, { limit: perTypeLimit }));
        return {
          type,
          payload,
          items: extractItems(payload).map((raw) => normalizeItem(raw, type)),
          total: extractTotal(payload)
        };
      } catch (error) {
        console.warn('Volltextsuche konnte fuer Typ nicht geladen werden.', type, error);
        return { type, payload: null, items: [], total: 0 };
      }
    }));
    const items = payloads.flatMap((entry) => entry.items);
    const estimatedTotalItems = payloads.reduce((sum, entry) => sum + Number(entry.total || entry.items.length || 0), 0);
    const truncated = payloads.some((entry) => Number(entry.total || 0) > entry.items.length);
    return { items, estimatedTotalItems, truncated, mode: 'search' };
  }

  function cleanFullTextQuery(query) {
    return cleanQueryValue(query)
      .replace(/[\(\)\{\}\[\]]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function queueRecordAutocomplete() {
    clearTimeout(state.recordAutocompleteTimer);
    state.recordAutocompleteRequestId += 1;
    const query = (els.recordSearchInput?.value || '').trim();
    if (!els.recordAutocompleteList || query.length < 3 || looksLikeRecordId(query)) {
      hideRecordAutocomplete();
      return;
    }
    state.recordAutocompleteTimer = setTimeout(() => {
      void loadRecordAutocomplete(query);
    }, 260);
  }

  async function loadRecordAutocomplete(query) {
    const requestId = ++state.recordAutocompleteRequestId;
    const params = new URLSearchParams({
      term: query,
      limit: '8'
    });
    const selectedType = els.recordTypeFilter?.value || state.context.type || '';
    if (selectedType) params.set('type', selectedType);

    try {
      const payload = await fetchJsonCached(`${AUTOCOMPLETE_API_BASE}?${params.toString()}`);
      if (requestId !== state.recordAutocompleteRequestId) return;
      renderRecordAutocomplete(normalizeAutocompleteSuggestions(payload));
    } catch (error) {
      console.debug('Autocomplete konnte nicht geladen werden.', error);
      if (requestId === state.recordAutocompleteRequestId) hideRecordAutocomplete();
    }
  }

  function normalizeAutocompleteSuggestions(payload) {
    const rawSuggestions = Array.isArray(payload)
      ? payload
      : payload?.items || payload?.Items || payload?.results || payload?.Results
        || payload?.suggestions || payload?.Suggestions || payload?.data || payload?.Data || [];
    const seen = new Set();
    return rawSuggestions
      .map((entry) => {
        if (typeof entry === 'string') {
          return { label: entry, value: entry, count: null };
        }
        const label = textValue(entry?.label)
          || textValue(entry?.Label)
          || textValue(entry?.term)
          || textValue(entry?.Term)
          || textValue(entry?.value)
          || textValue(entry?.Value)
          || textValue(entry?.name)
          || textValue(entry?.Name)
          || textValue(entry?.title)
          || textValue(entry?.Title);
        const value = textValue(entry?.value)
          || textValue(entry?.Value)
          || textValue(entry?.term)
          || textValue(entry?.Term)
          || label;
        const count = Number(entry?.count ?? entry?.Count ?? entry?.documents ?? entry?.Documents ?? NaN);
        return {
          label,
          value,
          count: Number.isFinite(count) ? count : null
        };
      })
      .filter((entry) => entry.label && entry.value)
      .filter((entry) => {
        const key = entry.value.toLocaleLowerCase('de-DE');
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(0, 8);
  }

  function renderRecordAutocomplete(suggestions) {
    if (!els.recordAutocompleteList) return;
    if (!suggestions.length) {
      hideRecordAutocomplete();
      return;
    }
    els.recordAutocompleteList.innerHTML = suggestions.map((suggestion, index) => `
      <button type="button" role="option" data-autocomplete-value="${escapeHtml(suggestion.value)}" aria-selected="${index === 0 ? 'true' : 'false'}">
        <span>${escapeHtml(suggestion.label)}</span>
        ${suggestion.count == null ? '' : `<small>${formatNumber(suggestion.count)}</small>`}
      </button>
    `).join('');
    els.recordAutocompleteList.hidden = false;
    els.recordAutocompleteList.querySelectorAll('button[data-autocomplete-value]').forEach((button) => {
      button.addEventListener('mousedown', (event) => event.preventDefault());
      button.addEventListener('click', () => {
        if (els.recordSearchInput) els.recordSearchInput.value = button.dataset.autocompleteValue || button.textContent.trim();
        hideRecordAutocomplete();
        void handleRecordSearchSubmit();
      });
    });
  }

  function hideRecordAutocomplete() {
    clearTimeout(state.recordAutocompleteTimer);
    state.recordAutocompleteRequestId += 1;
    if (!els.recordAutocompleteList) return;
    els.recordAutocompleteList.hidden = true;
    els.recordAutocompleteList.innerHTML = '';
  }

  function mergeRecordItems(existing, incoming) {
    const map = new Map();
    [...existing, ...incoming].forEach((item) => {
      const key = getRecordIdentityKey(item);
      if (key) map.set(key, item);
    });
    return Array.from(map.values());
  }

  function getRecordIdentityKey(record) {
    return record?.globalId || record?.global_id || record?.id || `${record?.type || ''}:${record?.title || ''}`;
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
      els.recordTableBody.innerHTML = `<tr><td colspan="7" class="table-empty">${emptyText}</td></tr>`;
    } else {
      els.recordTableBody.innerHTML = visibleRows.map((row) => `
        <tr>
          <td>${renderRecordTitleCell(row)}</td>
          <td><span class="type-chip ${row.type.toLowerCase()}">${escapeHtml(row.type || '-')}</span></td>
          <td>${escapeHtml(row.city || '-')}<small>${escapeHtml(row.region || '')}</small></td>
          <td>${escapeHtml(row.category || '-')}</td>
          <td>${escapeHtml(row.primaryIssue)}</td>
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
    const totalText = state.recordDataMeta.truncated ? `${formatNumber(rows.length)} geladenen Treffern` : `${formatNumber(rows.length)} Datensätzen`;
    if (els.recordPageRange) {
      els.recordPageRange.textContent = rows.length ? `Zeige ${formatNumber(start + 1)} bis ${formatNumber(end)} von ${totalText}` : '0 Datensätze';
    }
    if (els.recordResultSummary) {
      els.recordResultSummary.textContent = `Ergebnisse: ${state.recordDataMeta.truncated ? `${formatNumber(rows.length)} geladene Treffer` : `${formatNumber(rows.length)} Datensätze`}`;
    }
    if (els.recordPageStatus) els.recordPageStatus.textContent = `${state.recordPage} / ${totalPages}`;
    if (els.recordPrevPage) els.recordPrevPage.disabled = state.recordPage <= 1;
    if (els.recordNextPage) els.recordNextPage.disabled = state.recordPage >= totalPages;
    if (els.recordExport) els.recordExport.disabled = !rows.length;
    saveRecordListState(rows);
  }

  function saveRecordListState(rows) {
    try {
      sessionStorage.setItem(RECORD_LIST_STATE_KEY, JSON.stringify({
        backUrl: `records.html${location.search || ''}`,
        createdAt: Date.now(),
        rows: rows.slice(0, 250).map((row) => ({
          id: row.id || '',
          globalId: row.globalId || '',
          type: row.type || '',
          title: row.title || '',
          detailUrl: row.detailUrl || buildRecordDetailUrl(row)
        }))
      }));
    } catch {
      // sessionStorage may be unavailable or full.
    }
  }

  function loadRecordListState() {
    try {
      const parsed = JSON.parse(sessionStorage.getItem(RECORD_LIST_STATE_KEY) || '{}');
      return {
        backUrl: typeof parsed.backUrl === 'string' ? parsed.backUrl : 'records.html',
        rows: Array.isArray(parsed.rows) ? parsed.rows : []
      };
    } catch {
      return { backUrl: 'records.html', rows: [] };
    }
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
    if (els.recordTableBody) els.recordTableBody.innerHTML = '<tr><td colspan="7" class="table-empty"><span class="loading-line">Datensätze werden geladen ...</span></td></tr>';
    if (els.recordResultSummary) els.recordResultSummary.textContent = 'Datensätze werden geladen ...';
    if (els.recordPageRange) els.recordPageRange.textContent = '-';
    if (els.recordExport) els.recordExport.disabled = true;
  }

  function renderRecordsEmpty(message) {
    if (els.recordTableBody) els.recordTableBody.innerHTML = '<tr><td colspan="7" class="table-empty">Die Datensätze konnten nicht geladen werden.</td></tr>';
    if (els.recordResultSummary) els.recordResultSummary.textContent = '0 Datensätze';
    if (els.recordPageRange) els.recordPageRange.textContent = '0 Datensätze';
    if (els.recordExport) els.recordExport.disabled = true;
    showRecordsMessage(message);
  }

  function renderRecordQuickCounts() {
    if (state.recordDataMeta.mode === 'empty') {
      [els.quickCountCritical, els.quickCountLicense, els.quickCountDescription, els.quickCountImage, els.quickCountOpenings].forEach((node) => {
        if (node) node.textContent = '-';
      });
      return;
    }
    const rows = state.recordRows;
    setText(els.quickCountCritical, rows.filter((row) => row.qualityStatus === 'kritisch').length);
    setText(els.quickCountLicense, rows.filter((row) => row.missingCriteria.includes('license_missing')).length);
    setText(els.quickCountDescription, rows.filter((row) => row.missingCriteria.includes('description_missing')).length);
    setText(els.quickCountImage, rows.filter((row) => row.missingCriteria.includes('image_missing')).length);
    setText(els.quickCountOpenings, rows.filter((row) => row.missingCriteria.includes('opening_hours_missing')).length);
  }

  function renderRecordStatusLegend() {
    if (state.recordDataMeta.mode === 'empty') {
      [els.legendGood, els.legendReview, els.legendCritical, els.legendUnknown].forEach((node) => {
        if (node) node.textContent = '-';
      });
      return;
    }
    const rows = state.filteredRecordRows;
    setText(els.legendGood, rows.filter((row) => row.qualityStatus === 'gut').length);
    setText(els.legendReview, rows.filter((row) => row.qualityStatus === 'pruefen').length);
    setText(els.legendCritical, rows.filter((row) => row.qualityStatus === 'kritisch').length);
    setText(els.legendUnknown, rows.filter((row) => row.qualityStatus === 'nicht berechenbar').length);
  }

  function renderRecordDataNote() {
    if (!els.recordDataNote) return;
    if (state.recordDataMeta.mode === 'empty') {
      els.recordDataNote.textContent = 'Es wird keine Browser-Stichprobe geladen. Wähle ein konkretes Problem oder öffne eine Pflegeaufgabe, um echte Datensatzlisten per API zu laden.';
      return;
    }
    if (state.recordDataMeta.mode === 'criterion') {
      els.recordDataNote.textContent = state.recordDataMeta.truncated
        ? 'Diese Liste basiert auf einem begrenzten Qualitäts-Scan für die ausgewählte Pflegeaufgabe.'
        : 'Diese Liste basiert auf einem Qualitäts-Scan für die ausgewählte Pflegeaufgabe.';
      return;
    }
    if (state.recordDataMeta.mode === 'snapshot_list') {
      els.recordDataNote.textContent = state.recordDataMeta.truncated
        ? 'Diese Liste stammt aus dem gecachten Nachtlauf und ist auf die gespeicherten Treffer begrenzt.'
        : 'Diese Liste stammt aus dem gecachten Nachtlauf.';
      return;
    }
    els.recordDataNote.textContent = state.recordDataMeta.truncated
      ? 'Diese Liste basiert auf einem begrenzten API-/Server-Scan. Die Qualitätsbewertung basiert auf den aktivierten Kriterien und verfügbaren Daten.'
      : 'Die Qualitätsbewertung basiert auf den aktivierten Kriterien und verfügbaren Daten.';
  }

  function resetRecordFilters() {
    const reloadFullList = state.recordDataMeta.mode === 'criterion';
    if (els.recordSearchInput) els.recordSearchInput.value = '';
    if (els.recordTypeFilter) els.recordTypeFilter.value = '';
    if (els.recordCategoryFilter) els.recordCategoryFilter.value = '';
    if (els.recordStatusFilter) els.recordStatusFilter.value = '';
    if (els.recordIssueFilter) els.recordIssueFilter.value = '';
    state.recordServerSearchKeys = new Set();
    state.pendingRecordView = null;
    clearRecordViewState();
    state.recordPage = 1;
    if (reloadFullList) {
      void loadRecordsData();
      return;
    }
    applyRecordFilters();
  }

  function applyQuickRecordFilter(value) {
    if (els.recordSearchInput) els.recordSearchInput.value = '';
    if (els.recordCategoryFilter) els.recordCategoryFilter.value = '';
    if (els.recordStatusFilter) els.recordStatusFilter.value = '';
    if (els.recordIssueFilter) els.recordIssueFilter.value = '';
    state.recordServerSearchKeys = new Set();
    state.pendingRecordView = null;
    clearRecordViewState();
    if (value === 'critical' && els.recordStatusFilter) els.recordStatusFilter.value = 'kritisch';
    if (value !== 'critical' && els.recordIssueFilter) els.recordIssueFilter.value = value;
    state.recordPage = 1;
    if (value !== 'critical') {
      void loadRecordsData();
      return;
    }
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
    return `record-detail.html?${params.toString()}`;
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
        state.recordDataMeta.truncated ? 'begrenzter API-/Server-Scan' : 'geladene Daten'
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
      renderDetailEmpty('Noch kein Datensatz ausgewählt. Suche in der Datensatzliste nach Titel, ID oder Ort und öffne einen Eintrag.');
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
    const derivedId = getIdFromGlobalId(globalId);
    const variants = globalId
      ? uniqueValues([
        `global_id:"${identifier}"`,
        identifier,
        derivedId ? `id:"${derivedId}"` : '',
        derivedId
      ])
      : [`id:"${identifier}"`, identifier];

    for (const targetType of targetTypes) {
      for (const variant of variants) {
        const payload = await fetchJsonCached(buildUrl(targetType, variant, { limit: 5 }));
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

  function getIdFromGlobalId(globalId) {
    const match = String(globalId || '').trim().match(/^[a-z]+_(\d+)$/i);
    return match ? match[1] : '';
  }

  function uniqueValues(values) {
    return Array.from(new Set(values.filter(Boolean)));
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
    const addresses = getAddressSummary(raw);
    const externalIds = getExternalSystemIds(raw);
    const primarySystem = getPrimarySystem(item);
    const context = getRecordDetailContext();

    return {
      context,
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
        price: getTextByRel(raw, 'PRICE_INFO'),
        priceReduced: getTextByRel(raw, 'PRICE_REDUCEDINFO'),
        seoTitle: getTextByRel(raw, 'WEB_SEO_TITEL'),
        seoDescription: getTextByRel(raw, 'WEB_SEO_BESCHREIBUNG')
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
        sourceUrl: getFirst(raw, ['source.url', 'raw.source.url']) || '',
        web: getFirst(raw, ['web', 'url']) || '',
        email: getFirst(raw, ['email']) || '',
        phone: getFirst(raw, ['phone']) || '',
        street: getFirst(raw, ['street', 'address.street']) || '',
        zip: getFirst(raw, ['zip', 'address.zip']) || '',
        coordinates: getCoordinates(raw),
        addresses,
        externalIds,
        primarySystem,
        et4Url
      },
      rawExcerpt: getRawExcerpt(raw)
    };
  }

  function getRecordDetailContext() {
    let recordView = {};
    try {
      recordView = JSON.parse(sessionStorage.getItem(RECORD_VIEW_STATE_KEY) || '{}');
    } catch {
      recordView = {};
    }
    const criterion = qualityCriteria.find((entry) => entry.id === recordView.criterionId);
    return {
      source: recordView.criterionId ? 'task' : 'records',
      label: recordView.label || criterion?.label || '',
      criterionId: recordView.criterionId || '',
      type: recordView.type || ''
    };
  }

  function getExternalSystemIds(raw) {
    return [
      ['Outdooractive-ID', qualityHelpers.getAttributeValue(raw, 'SYSTEMID_outdooractive')],
      ['Google-Places-ID', qualityHelpers.getAttributeValue(raw, 'SYSTEMID_GOOGLEPLACES')],
      ['source_id', getFirst(raw, ['source_id', 'sourceId'])]
    ].filter(([, value]) => textValue(value));
  }

  function getAddressSummary(raw) {
    const addresses = Array.isArray(raw.addresses) ? raw.addresses : [];
    return ['author', 'organisation', 'copyright', 'contact_person']
      .map((rel) => {
        const entry = addresses.find((address) => address?.rel === rel);
        if (!entry) return null;
        const contact = [
          textValue(entry.name),
          textValue(entry.street),
          [textValue(entry.zip), textValue(entry.city)].filter(Boolean).join(' '),
          textValue(entry.web),
          textValue(entry.email),
          textValue(entry.phone)
        ].filter(Boolean).join(' | ');
        return contact ? [addressRelLabel(rel), contact] : null;
      })
      .filter(Boolean);
  }

  function addressRelLabel(rel) {
    return {
      author: 'Autor',
      organisation: 'Organisation',
      copyright: 'Copyright',
      contact_person: 'Kontaktperson'
    }[rel] || rel;
  }

  function getCoordinates(raw) {
    const lat = getFirst(raw, ['geo.main.latitude', 'latitude']);
    const lon = getFirst(raw, ['geo.main.longitude', 'longitude']);
    return lat && lon ? `${lat}, ${lon}` : '';
  }

  function getRawExcerpt(raw) {
    return [
      ['created', getFirst(raw, ['created'])],
      ['changed', getFirst(raw, ['changed'])],
      ['channel', getFirst(raw, ['channel'])],
      ['rating eT4', getFirst(raw, ['ratings.0.value'])],
      ['SEO-Titel', getTextByRel(raw, 'WEB_SEO_TITEL')],
      ['SEO-Beschreibung', getTextByRel(raw, 'WEB_SEO_BESCHREIBUNG')]
    ].filter(([, value]) => textValue(value));
  }

  function renderRecordDetail(model) {
    renderDetailContext(model);
    renderDetailNavigation(model);

    els.detailHeadCard.innerHTML = `
      <div class="detail-head-left">
        <h1 id="record-detail-title">${escapeHtml(model.identity.title)} <span class="type-chip ${model.identity.type.toLowerCase()}">${escapeHtml(model.identity.type || '-')}</span></h1>
        <p>${escapeHtml([model.identity.city, model.identity.region, model.identity.category].filter(Boolean).join(' - ') || 'Ort und Kategorie nicht angegeben')}</p>
      </div>
    `;
    els.detailHeadCard.querySelectorAll('[data-copy-detail]').forEach((button) => {
      button.addEventListener('click', () => copyText(button.dataset.copyDetail || ''));
    });

    els.detailContent.hidden = false;
    els.detailCriteriaCard.hidden = true;
    renderDetailIssues(model);
    renderDetailUsability(model);
    renderDetailTextCards(model);
    renderDetailMedia(model);
    renderDetailInfo(model);

    if (model.details.et4Url && els.detailEt4Link) {
      els.detailEt4Link.href = model.details.et4Url;
      els.detailEt4Link.hidden = false;
    }
  }

  function renderDetailContext(model) {
    if (!els.detailBreadcrumb) return;
    if (model.context.source === 'task' && model.context.label) {
      els.detailBreadcrumb.innerHTML = `
        <a href="tasks.html">Pflegeaufgaben</a>
        <span class="material-icons" aria-hidden="true">chevron_right</span>
        <a href="records.html">${escapeHtml(model.context.label)}</a>
        <span class="material-icons" aria-hidden="true">chevron_right</span>
        <span>Datensatz-Detail</span>
      `;
      if (els.detailContextNote) {
        els.detailContextNote.textContent = `Aus Pflegeaufgabe: ${model.context.label}`;
        els.detailContextNote.hidden = false;
      }
      return;
    }
    els.detailBreadcrumb.innerHTML = `
      <a href="records.html">Datensätze</a>
      <span class="material-icons" aria-hidden="true">chevron_right</span>
      <span>Datensatz-Detail</span>
    `;
    if (els.detailContextNote) els.detailContextNote.hidden = true;
  }

  function renderDetailNavigation(model) {
    const listState = loadRecordListState();
    const currentKey = model.identity.globalId || model.identity.id;
    const currentIndex = listState.rows.findIndex((row) => (
      (model.identity.globalId && row.globalId === model.identity.globalId) ||
      (model.identity.id && row.id === model.identity.id)
    ));
    if (els.detailBackLink) els.detailBackLink.href = listState.backUrl || 'records.html';

    const previous = currentIndex > 0 ? listState.rows[currentIndex - 1] : null;
    const next = currentIndex >= 0 && currentIndex < listState.rows.length - 1 ? listState.rows[currentIndex + 1] : null;
    wireDetailNavButton(els.detailPrevRecord, previous, currentKey);
    wireDetailNavButton(els.detailNextRecord, next, currentKey);
  }

  function wireDetailNavButton(button, target, currentKey) {
    if (!button) return;
    button.disabled = !target || !(target.globalId || target.id) || (target.globalId || target.id) === currentKey;
    button.onclick = null;
    if (!button.disabled) {
      button.onclick = () => {
        location.href = target.detailUrl || buildRecordDetailUrl(target);
      };
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
    els.detailTransport.innerHTML = `<p>${escapeHtml(model.texts.directions)}</p>`;
    if (els.detailPriceCard && els.detailPrice) {
      const prices = [model.texts.price, model.texts.priceReduced].filter(Boolean);
      els.detailPriceCard.hidden = !prices.length;
      els.detailPrice.innerHTML = prices.map((price) => `<p>${escapeHtml(price)}</p>`).join('');
    }
  }

  function renderDetailMedia(model) {
    if (!model.media.images.length) {
      els.detailMedia.innerHTML = '<p class="empty-note">Keine prüfbaren Bilder vorhanden.</p>';
      els.detailMediaNote.textContent = '';
      return;
    }
    els.detailMedia.innerHTML = model.media.images.slice(0, 5).map((image) => `
      <figure class="detail-media-item">
        <img src="${escapeHtml(image.url)}" alt="${escapeHtml(image.alt || image.value || '')}" loading="lazy">
        <figcaption>
          <strong>${escapeHtml(image.value || 'Bild')}</strong>
          <span>${escapeHtml(image.copyrightText || 'Urheber fehlt')}</span>
          <small>Lizenz: ${escapeHtml(image.license || 'nicht angegeben')}</small>
        </figcaption>
      </figure>
    `).join('');
    els.detailMediaNote.textContent = `${formatNumber(model.media.images.length)} Bilder vorhanden. ${formatNumber(model.media.missingCopyrightCount)} ohne Urheberangabe. ${formatNumber(model.media.missingAltCount)} ohne Alt-Text.`;
  }

  function renderDetailInfo(model) {
    const rows = [
      ['ID', escapeHtml(model.identity.id || '-')],
      ['global_id', escapeHtml(model.identity.globalId || '-')],
      ['Pflegesystem', escapeHtml(model.details.primarySystem.name)],
      ['ET4 pages', model.details.et4Url ? `<a href="${escapeHtml(model.details.et4Url)}" target="_blank" rel="noopener">Öffnen auf et4 pages</a>` : 'Nicht verfügbar'],
      ['Web', model.details.web ? `<a href="${escapeHtml(model.details.web)}" target="_blank" rel="noopener">Datensatz öffnen</a>` : 'Nicht angegeben'],
      ['E-Mail', escapeHtml(model.details.email || 'Nicht angegeben')],
      ['Telefon', escapeHtml(model.details.phone || 'Nicht angegeben')],
      ['Adresse', escapeHtml([model.details.street, model.details.zip, model.identity.city].filter(Boolean).join(', ') || 'Nicht angegeben')],
      ['Lizenz', escapeHtml(model.details.license || 'Lizenz fehlt')],
      ['Letzte Aktualisierung', escapeHtml(formatRecordDate(model.identity.updatedAt))]
    ];
    els.detailInfo.innerHTML = renderKvRows(rows, true);
    els.detailInfo.querySelectorAll('[data-copy-detail]').forEach((button) => {
      button.addEventListener('click', () => copyText(button.dataset.copyDetail || ''));
    });
  }

  function renderDetailCriteria(model) {
    els.detailCriteriaList.innerHTML = model.quality.criteria.map((criterion) => `
      <span class="criteria-chip ${criterionStatusClass(criterion.status)}">
        <strong>${escapeHtml(criterion.label)}</strong>
        <small>${escapeHtml(criterion.status)}</small>
      </span>
    `).join('');
  }

  function criterionStatusClass(status) {
    return {
      'erfüllt': 'erfuellt',
      fehlt: 'fehlt',
      'nicht bewertbar': 'nicht-bewertbar',
      'nicht relevant': 'nicht-bewertbar'
    }[status] || 'nicht-bewertbar';
  }

  function renderDetailLoading() {
    if (els.detailHeadCard) els.detailHeadCard.innerHTML = '<div class="table-empty"><span class="loading-line">Datensatz wird geladen ...</span></div>';
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
      .sort((a, b) => textTypeRank(a?.type) - textTypeRank(b?.type))
      .map((entry) => htmlToPlainText(textValue(entry.value || entry.text || entry.content || entry)))
      .filter(Boolean);
    return values[0] || '';
  }

  function textTypeRank(type) {
    const normalized = String(type || '').toLowerCase();
    if (normalized === 'text/html') return 0;
    if (normalized === 'text/plain') return 1;
    return 2;
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
        copyrightText: textValue(media.copyrightText),
        copyrightEmail: textValue(media.copyrightEmail),
        copyrightWeb: textValue(media.copyrightWeb),
        license: textValue(media.license),
        width: textValue(media.width),
        height: textValue(media.height)
      }))
      .filter((media) => media.url);
  }

  function formatImageSize(image) {
    return image.width && image.height ? `${image.width} x ${image.height}px` : 'nicht angegeben';
  }

  function getOpeningHoursSummary(item) {
    const raw = item.raw || item;
    if (raw.alwaysOpen === true) return 'Immer geöffnet.';
    const openingText = getTextByRel(raw, 'openings');
    if (openingText) return openingText;
    const intervals = raw.timeIntervals || raw.raw?.timeIntervals || [];
    if (Array.isArray(intervals) && intervals.length) return formatTimeIntervals(intervals);
    return 'Keine Öffnungszeiten angegeben.';
  }

  function formatTimeIntervals(intervals) {
    const rows = intervals
      .map((interval) => {
        const days = formatWeekdays(interval.weekdays);
        const start = formatIntervalTime(interval.start);
        const end = formatIntervalTime(interval.end);
        if (!days && !start && !end) return '';
        return `${days || 'Zeitraum'}: ${[start, end].filter(Boolean).join(' bis ') || 'Zeit vorhanden'}`;
      })
      .filter(Boolean)
      .slice(0, 7);
    return rows.length ? rows.join('\n') : 'Öffnungszeiten vorhanden.';
  }

  function formatWeekdays(days) {
    const map = {
      Monday: 'Montag',
      Tuesday: 'Dienstag',
      Wednesday: 'Mittwoch',
      Thursday: 'Donnerstag',
      Friday: 'Freitag',
      Saturday: 'Samstag',
      Sunday: 'Sonntag'
    };
    return Array.isArray(days) ? days.map((day) => map[day] || day).join(', ') : '';
  }

  function formatIntervalTime(value) {
    const match = String(value || '').match(/T(\d{2}):(\d{2})/);
    return match ? `${match[1]}:${match[2]}` : '';
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

  function renderOverview(rows, items, options = {}) {
    const summary = computeSummary(rows);
    const aggregations = state.qualityAggregations;
    const counts = aggregations.qualityStatusCounts || {};
    const assessedTotal = sumStatusCounts(counts);
    const notOpenData = Math.max(0, summary.statistikTotal - summary.openDataTotal);
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

    if (
      state.qualityDataMeta.mode === 'api_counts' ||
      state.qualityDataMeta.mode === 'sachsen_total' ||
      (state.qualityDataMeta.mode === 'regional_scan' && !state.qualityDataMeta.collectedItems)
    ) {
      els.kpiQualityScore.textContent = '-';
      els.kpiQualityTrack.style.width = '0%';
      els.kpiGood.textContent = '-';
      els.kpiGoodPercent.textContent = 'Nicht berechnet';
      els.kpiReview.textContent = '-';
      els.kpiReviewPercent.textContent = 'Nicht berechnet';
      els.kpiCritical.textContent = '-';
      els.kpiCriticalPercent.textContent = 'Nicht berechnet';
    }

    renderKpiDeltas(kpis);
    renderTopTasks(aggregations.issueSummary || []);
    renderQualityDistribution(counts, assessedTotal);
    renderOpenDataStatus(summary.openDataTotal, notOpenData, summary.statistikTotal);
    renderDataNote(items.length);
    if (options.saveHistory !== false) saveKpiHistory(kpis);
  }

  function renderOverviewLoading() {
    ['kpi-quality-score', 'kpi-total', 'kpi-good', 'kpi-review', 'kpi-critical', 'kpi-open-data'].forEach((id) => {
      const node = document.getElementById(id);
      if (node) node.textContent = '...';
    });
    if (els.topTasksList) els.topTasksList.innerHTML = '<div class="inline-loading">Pflegeaufgaben werden geladen ...</div>';
    setQualityDataNoteLoading();
  }

  function renderOverviewEmpty() {
    ['kpi-quality-score', 'kpi-total', 'kpi-good', 'kpi-review', 'kpi-critical', 'kpi-open-data'].forEach((id) => {
      const node = document.getElementById(id);
      if (node) node.textContent = '-';
    });
    if (els.topTasksList) els.topTasksList.innerHTML = '<div class="empty-note">Für diese Auswahl wurden keine Pflegeaufgaben geladen.</div>';
    setQualityDataNoteText('Keine auswertbaren Qualitätsdaten geladen.');
  }

  function setQualityDataNoteLoading() {
    if (!els.qualityDataNote) return;
    els.qualityDataNote.hidden = false;
    els.qualityDataNote.innerHTML = '<span class="inline-loading" aria-label="Qualitaetsdaten werden geladen"></span>';
  }

  function setQualityDataNoteText(text) {
    if (!els.qualityDataNote) return;
    els.qualityDataNote.hidden = false;
    els.qualityDataNote.textContent = text;
  }

  function hideQualityDataNote() {
    if (!els.qualityDataNote) return;
    els.qualityDataNote.hidden = true;
    els.qualityDataNote.textContent = '';
  }

  function computeSummary(rows) {
    const statistikTotal = rows.reduce((sum, row) => sum + row.statistikCount, 0);
    const openDataTotal = rows.reduce((sum, row) => sum + row.openDataCount, 0);
    const openDataQuote = statistikTotal ? (openDataTotal / statistikTotal) * 100 : 0;
    return { statistikTotal, openDataTotal, openDataQuote };
  }

  function renderTopTasks(issueSummary) {
    const issues = [...issueSummary]
      .filter((issue) => Number(issue.affectedCount || 0) > 0)
      .sort((a, b) => priorityRank(b.priority) - priorityRank(a.priority) || b.affectedCount - a.affectedCount)
      .slice(0, 5);

    if (!issues.length) {
      els.topTasksList.innerHTML = '<div class="empty-note">Für die aktuelle Auswahl wurden keine Pflegeaufgaben gefunden.</div>';
      return;
    }

    els.topTasksList.replaceChildren(...issues.map((issue) => {
      const link = document.createElement('a');
      link.className = 'task-row';
      const preferredType = state.context.type || (issue.affectedTypes?.length === 1 ? issue.affectedTypes[0] : '');
      const params = new URLSearchParams();
      params.set('criterionId', issue.criterionId);
      if (preferredType) params.set('type', preferredType);
      params.set('from', 'overview');
      link.href = `records.html?${params.toString()}`;
      link.addEventListener('click', (event) => {
        event.preventDefault();
        openOverviewIssueOnRecordsPage(issue);
      });
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
    if (state.qualityDataMeta.mode === 'regional_scan' && !state.qualityDataMeta.collectedItems) {
      els.qualityDonut.style.background = 'conic-gradient(#e2e8f0 0 100%)';
      els.qualityLegend.innerHTML = `
        <div class="legend-row"><span class="legend-dot muted"></span><span>Wird berechnet</span><strong>-</strong></div>
      `;
      return;
    }

    if ((state.qualityDataMeta.mode === 'sachsen_total' || state.qualityDataMeta.mode === 'api_counts') && !total) {
      els.qualityDonut.style.background = 'conic-gradient(#e2e8f0 0 100%)';
      els.qualityLegend.innerHTML = `
        <div class="legend-row"><span class="legend-dot muted"></span><span>Nicht berechnet</span><strong>-</strong></div>
      `;
      return;
    }

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
      ['Kritisch', critical, criticalPct, 'critical']
    ];
    if (unknown > 0) rows.push(['Nicht bewertbar', unknown, percent(unknown, total), 'muted']);
    els.qualityLegend.innerHTML = rows.map(([label, count, pctValue, cls]) => `
      <div class="legend-row"><span class="legend-dot ${cls}"></span><span>${label}</span><strong>${formatPercent(pctValue)} (${formatNumber(count)})</strong></div>
    `).join('');
  }

  function renderOpenDataStatus(capable, missing, total) {
    const capablePct = percent(capable, total);
    const missingPct = percent(missing, total);
    els.openDataCapableBar.style.width = `${capablePct}%`;
    els.openDataMissingBar.style.width = `${missingPct}%`;
    els.openDataCapable.textContent = formatNumber(capable);
    els.openDataCapablePercent.textContent = formatPercent(capablePct);
    els.openDataMissing.textContent = formatNumber(missing);
    els.openDataMissingPercent.textContent = formatPercent(missingPct);
  }

  function renderDataNote(sampleSize) {
    if (state.qualityDataMeta.mode === 'sachsen_total') {
      setQualityDataNoteText('Fuer ganz Sachsen wird kein Qualitaets-Score angezeigt. Pflegeaufgaben laden im Hintergrund.');
      return;
    }
    if (state.qualityDataMeta.mode === 'regional_scan') {
      const pending = state.qualityDataMeta.pendingTypes || 0;
      if (pending) {
        setQualityDataNoteLoading();
        return;
      }
      if (state.qualityDataMeta.truncated) {
        setQualityDataNoteText('Weitere Treffer koennen spaeter nachgeladen werden.');
        return;
      }
      hideQualityDataNote();
      return;
    }
    if (state.qualityDataMeta.mode === 'snapshot') {
      hideQualityDataNote();
      return;
    }
    if (state.qualityDataMeta.mode === 'api_counts') {
      setQualityDataNoteLoading();
      return;
    }
    const note = state.qualityDataMeta.truncated
      ? `Regionale Bewertung geladen. Weitere Treffer koennen spaeter nachgeladen werden.`
      : `Basierend auf ${formatNumber(sampleSize)} bewerteten Datensätzen.`;
    setQualityDataNoteText(note);
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
    if (id === 'poi_street_missing') return 'Fuer diese POI fehlt eine belastbare Strassen- oder Anschriftsangabe.';
    if (id === 'poi_teaser_missing') return 'Fuer diese POI fehlt ein kurzer Teaser-Text.';
    if (id === 'poi_email_missing') return 'Fuer diese POI fehlt eine E-Mail-Adresse.';
    if (id === 'poi_website_missing') return 'Fuer diese POI fehlt eine Webseite.';
    if (id === 'poi_phone_missing') return 'Fuer diese POI fehlt eine Telefonnummer.';
    if (id === 'poi_price_missing') return 'Fuer diese POI fehlt eine Preis-, Eintritts- oder Kosteninformation.';
    if (id === 'tour_season_missing') return 'Fuer diese Tour fehlt eine belastbare Saison- oder Eignungsangabe.';
    if (id === 'tour_parking_missing') return 'Fuer diese Tour fehlt eine belastbare Parkinformation.';
    const problems = {
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
      hotel_language_english_missing: 'Keine der geprueften Fremdsprachen ist als Merkmal hinterlegt.',
      hotel_payment_cash_missing: 'Keine der geprueften Zahlungsarten ist als Merkmal hinterlegt.',
      hotel_parking_feature_missing: 'Keine der geprueften Parkinformationen ist als Merkmal hinterlegt.',
      gastro_payment_options_missing: 'Keine der geprüften Zahlungsarten ist als Merkmal hinterlegt.',
      gastro_languages_missing: 'Keine der geprüften Fremdsprachen ist als Merkmal hinterlegt.',
      gastro_parking_feature_missing: 'Das Merkmal "PKW-Parkplatz am Haus" fehlt.',
      gastro_cuisine_category_missing: 'Keine der geprüften Küchenarten ist als Kategorie hinterlegt.'
    };
    return problems[id] || 'Für diese Datensätze fehlt eine für die Datenpflege relevante Angabe.';
  }

  function taskImpactText(id) {
    if (id === 'poi_street_missing') return 'Fehlende Anschriften erschweren Orientierung, Routing und redaktionelle Pflege.';
    if (id === 'poi_teaser_missing') return 'Fehlende Teaser schwaechen Kurzansicht, Auffindbarkeit und Erstverstaendnis.';
    if (id === 'poi_email_missing') return 'Fehlende E-Mail-Adressen erschweren Rueckfragen und Kontaktaufnahme.';
    if (id === 'poi_website_missing') return 'Fehlende Webseiten schwaechen Weiterleitung zu vertiefenden Informationen.';
    if (id === 'poi_phone_missing') return 'Fehlende Telefonnummern erschweren direkte Rueckfragen und Kontaktaufnahme.';
    if (id === 'poi_price_missing') return 'Fehlende Preis- oder Eintrittshinweise erschweren Erwartungsmanagement und Besuchsplanung.';
    if (id === 'tour_season_missing') return 'Fehlende Saisonangaben erschweren Einordnung, Planung und passende Nutzung der Tour.';
    if (id === 'tour_parking_missing') return 'Fehlende Parkhinweise erschweren die Anreiseplanung fuer Touren mit Startpunkt vor Ort.';
    const impacts = {
      license_missing: 'Ohne Lizenz sind Daten nicht Open-Data-fähig und nur eingeschränkt weiterverwendbar.',
      image_author_missing: 'Ohne Urheberangabe ist die Weitergabe von Bildmaterial rechtlich eingeschränkt.',
      description_missing: 'Fehlende Beschreibungen reduzieren Auffindbarkeit, Verstaendlichkeit und Nutzbarkeit.',
      opening_hours_missing: 'Fehlende Öffnungszeiten erschweren Planung und Ausspielung in Portalen.',
      public_transport_missing: 'Fehlende ÖPNV-Hinweise schwächen nachhaltige Anreiseinformationen.',
      booking_link_missing: 'Ohne Buchungslink koennen Nutzer Angebote schwerer direkt abschliessen.',
      image_missing: 'Ohne Bilder wirken Eintraege weniger attraktiv und sind in vielen Kanaelen schwaecher.',
      poi_parking_feature_missing: 'Fehlende Parkangaben erschweren Anreiseplanung mit dem Auto.',
      poi_payment_options_missing: 'Fehlende Zahlungsarten schwaechen Nutzbarkeit und Vorbereitung vor Ort.',
      poi_languages_missing: 'Fehlende Sprachangaben reduzieren Zugänglichkeit für internationale Gäste.',
      poi_suitability_missing: 'Fehlende Eignungsangaben erschweren Zielgruppenansprache und Orientierung.',
      hotel_language_english_missing: 'Fehlende Sprachangaben reduzieren die Zugaenglichkeit fuer internationale Gaeste.',
      hotel_payment_cash_missing: 'Fehlende Zahlungsarten erschweren Nutzung und Erwartungsmanagement vor Ort.',
      hotel_parking_feature_missing: 'Fehlende Parkhinweise erschweren Anreiseplanung und Erwartungsmanagement vor Ort.',
      gastro_payment_options_missing: 'Fehlende Zahlungsarten erschweren die Nutzung und Vorbereitung für Gäste.',
      gastro_languages_missing: 'Fehlende Sprachangaben reduzieren Zugänglichkeit für internationale Gäste.',
      gastro_parking_feature_missing: 'Fehlende Parkangaben erschweren die Anreiseplanung für Gäste.',
      gastro_cuisine_category_missing: 'Fehlende Küchenarten schwächen Auffindbarkeit und thematische Einordnung.'
    };
    return impacts[id] || 'Die fehlende Information reduziert die praktische Nutzbarkeit der Daten.';
  }

  function renderPrimarySystemsForTask(task) {
    const criterionIds = new Set(task?.criterionIds?.length ? task.criterionIds : [task?.criterionId].filter(Boolean));
    const relevantItems = state.taskItems.filter((item) => item.missingCriteria?.some((criterionId) => criterionIds.has(criterionId)));
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
        ${renderPrimarySystemLogo(system)}
        <span><strong>${escapeHtml(system.name)} (${formatNumber(system.count)})</strong><small>${escapeHtml(system.note)}</small></span>
        <button class="plain-button" type="button" data-system-action="${escapeHtml(system.action)}" data-system-id="${escapeHtml(system.id)}">${escapeHtml(system.actionLabel)}</button>
      </div>
    `).join('');
    els.primarySystemList.querySelectorAll('[data-system-action]').forEach((button) => {
      button.addEventListener('click', () => {
        const systemRows = rows.filter((row) => getPrimarySystem(row).id === button.dataset.systemId);
        if (button.dataset.systemAction === 'export') exportTaskRecordsCsv(systemRows);
        if (button.dataset.systemAction === 'copy-source-id') {
          const firstSourceId = systemRows.map(getSourceId).find(Boolean);
          if (firstSourceId) copyText(firstSourceId);
        }
      });
    });
  }

  function renderPrimarySystemLogo(system) {
    if (system.logoImage) {
      return `
        <span class="primary-system-logo primary-system-logo-image">
          <img src="${escapeHtml(system.logoImage)}" alt="${escapeHtml(system.name)}">
        </span>
      `;
    }
    return `
      <span class="primary-system-logo primary-system-logo-${escapeHtml(system.id)}">
        <span class="primary-system-wordmark">${escapeHtml(system.logoText || system.short)}</span>
      </span>
    `;
  }

  function collectPrimarySystems(rows) {
    const map = new Map();
    rows.map(getPrimarySystem).filter((system) => system.id !== 'satourn').forEach((system) => {
      if (!map.has(system.id)) map.set(system.id, { ...system, count: 0 });
      map.get(system.id).count += 1;
    });
    return Array.from(map.values());
  }

  function hidePrimarySystems() {
    if (els.primarySystemCard) els.primarySystemCard.hidden = true;
    if (els.primarySystemList) els.primarySystemList.replaceChildren();
  }

  function getSourceId(item) {
    const direct = getFirst(item, ['source_id', 'sourceId', 'raw.source_id', 'raw.sourceId']);
    if (direct) return direct;
    const sourceKeyword = getKeywordValues(item).find((keyword) => keyword.toLowerCase().startsWith('import_sourceid_'));
    return sourceKeyword ? sourceKeyword.replace(/^import_sourceid_/i, '') : '';
  }

  function getPrimarySystem(item) {
    const keywords = getKeywordValues(item).map((keyword) => keyword.toLowerCase());
    if (keywords.includes('import_source_feratel') || keywords.includes('hassystemid_feratel')) {
      return {
        id: 'feratel',
        short: 'FD',
        logoImage: './assets/logos/feratel.png',
        name: 'feratel',
        note: 'Datensatz mit import_source_feratel oder HasSystemId_Feratel.',
        action: 'export',
        actionLabel: 'Liste exportieren'
      };
    }
    if (keywords.includes('import_source_outdooractive')) {
      return {
        id: 'outdooractive',
        short: 'OA',
        logoImage: './assets/logos/outdooractive.png',
        name: 'outdooractive',
        note: 'Datensatz mit import_source_outdooractive.',
        action: 'copy-source-id',
        actionLabel: 'ID kopieren'
      };
    }
    return {
      id: 'satourn',
      short: 'ST',
      logoImage: '../SaTourN-RGB.png',
      name: 'SaTourN',
      note: 'Kein externes Importsystem in keywords_old/keywords erkannt.',
      action: 'export',
      actionLabel: 'Liste exportieren'
    };
  }

  function getKeywordValues(item) {
    const raw = item?.raw || item || {};
    return [
      ...safeKeywordArray(raw.keywords_old),
      ...safeKeywordArray(raw.keywords),
      ...safeKeywordArray(item?.keywords_old),
      ...safeKeywordArray(item?.keywords)
    ].filter(Boolean);
  }

  function safeKeywordArray(value) {
    if (!Array.isArray(value)) return [];
    return value.map((entry) => textValue(entry));
  }

  function normalizeTypeName(type) {
    return String(type || '').trim().toLowerCase();
  }

  function exportTaskRecordsCsv(forcedRows = null) {
    if (!state.selectedTask) return;
    const scopedRows = Array.isArray(forcedRows) ? forcedRows : null;
    const rowsToExport = scopedRows || (
      state.taskRecordRows.length
        ? state.taskRecordRows
        : state.taskItems.filter((item) => item.missingCriteria?.includes(state.selectedTask.criterionId))
    );
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
    if (id === 'poi_street_missing') return 'pin_drop';
    if (id === 'poi_teaser_missing') return 'notes';
    if (id === 'poi_email_missing') return 'mail';
    if (id === 'poi_website_missing') return 'language';
    if (id === 'poi_phone_missing') return 'call';
    if (id === 'poi_price_missing') return 'sell';
    if (id === 'license_missing') return 'description';
    if (id === 'image_author_missing' || id === 'image_missing') return 'image';
    if (id === 'opening_hours_missing') return 'schedule';
    if (id === 'public_transport_missing') return 'directions_transit';
    if (id === 'booking_link_missing') return 'link';
    if (id === 'poi_parking_feature_missing' || id === 'gastro_parking_feature_missing') return 'local_parking';
    if (id === 'poi_payment_options_missing' || id === 'gastro_payment_options_missing') return 'payments';
    if (id === 'poi_languages_missing' || id === 'gastro_languages_missing') return 'translate';
    if (id === 'poi_suitability_missing') return 'groups';
    if (id === 'hotel_language_english_missing') return 'translate';
    if (id === 'hotel_payment_cash_missing') return 'payments';
    if (id === 'hotel_parking_feature_missing') return 'local_parking';
    if (id === 'tour_season_missing') return 'event';
    if (id === 'tour_parking_missing') return 'local_parking';
    if (id === 'gastro_cuisine_category_missing') return 'restaurant_menu';
    return 'warning';
  }

  function taskDescription(id) {
    if (id === 'poi_street_missing') return 'Keine Strasse oder Anschrift hinterlegt';
    if (id === 'poi_teaser_missing') return 'Kein Teaser-Text vorhanden';
    if (id === 'poi_email_missing') return 'Keine E-Mail-Adresse vorhanden';
    if (id === 'poi_website_missing') return 'Keine Webseite vorhanden';
    if (id === 'poi_phone_missing') return 'Keine Telefonnummer vorhanden';
    if (id === 'poi_price_missing') return 'Keine Preisinformation vorhanden';
    if (id === 'tour_season_missing') return 'Keine Saisonangabe vorhanden';
    if (id === 'tour_parking_missing') return 'Keine Parkinformation vorhanden';
    const descriptions = {
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
      hotel_language_english_missing: 'Keine gepruefte Fremdsprache vorhanden',
      hotel_payment_cash_missing: 'Keine gepruefte Zahlungsart vorhanden',
      hotel_parking_feature_missing: 'Keine gepruefte Parkinformation vorhanden',
      gastro_payment_options_missing: 'Keine geprüfte Zahlungsart vorhanden',
      gastro_languages_missing: 'Keine geprüfte Fremdsprache vorhanden',
      gastro_parking_feature_missing: 'Merkmal "PKW-Parkplatz am Haus" fehlt',
      gastro_cuisine_category_missing: 'Keine geprüfte Küchenart vorhanden'
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
