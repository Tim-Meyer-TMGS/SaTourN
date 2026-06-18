import { downloadText, extractId, extractItems, extractTotal, fetchJson as rawFetchJson } from '../lib/browser.js';
import { evaluateAllItems, evaluateQualityForItem, getQualityAggregations, getQualityScanConfig, qualityCriteria, qualityHelpers } from './quality.js';
import { getApiConfig } from './core/api-config.js';
import { buildSearchApiUrl } from './core/api-urls.js';
import { AREAS, REQUEST_CACHE_TTL_MS, STORAGE_KEYS, TYPES } from './core/app-constants.js';
import {
  buildOverviewQualityMeta,
  computeOverviewSummary,
  normalizeStatisticRow,
  sortStatisticRows,
  upsertStatisticRow as upsertStatisticRowModel
} from './overview/overview-helpers.js';
import {
  renderOverviewEmptyState,
  renderOverviewLoadingState,
  renderOverviewPage
} from './overview/overview-ui.js';
import { buildMailtoUrl, launchMailto } from './records/record-mail.js';
import { requestRecordMailDraft, resolveRecordsByIds, runAiRecordSearch } from './records/record-api.js';
import {
  criterionStatusClass,
  getCheckableImages,
  getCriterionDisplayStatus,
  getDetailUsability,
  getDisplayDescription,
  getOpeningHoursSummary,
  getTextByRel,
  textValue
} from './detail/record-detail-helpers.js';
import {
  renderDetailEmptyState,
  renderDetailLoadingState,
  renderRecordDetailPage
} from './detail/record-detail-ui.js';
import {
  buildPendingRecordViewMessage,
  filterRecordRows,
  getIdFromGlobalId,
  getPrimaryIssueId,
  uniqueValues
} from './records/records-helpers.js';
import {
  loadRecordRowsForIssueSelection as loadRecordRowsForIssueSelectionModel,
  loadRecordRowsForPendingView as loadRecordRowsForPendingViewModel,
  loadRecordRowsForView as loadRecordRowsForViewModel,
  openOverviewIssueOnRecordsPage as openOverviewIssueOnRecordsPageModel,
  openTaskRecordsOnRecordsPage as openTaskRecordsOnRecordsPageModel,
  resolveTaskCriterionId as resolveTaskCriterionIdModel
} from './records/records-controller.js';
import {
  buildVerifiedEt4Url as buildVerifiedEt4UrlModel,
  buildRecordDetailUrl,
  buildRecordViewModel as buildRecordViewModelModel,
  getFirst as getFirstModel,
  getRecordEmail as getRecordEmailModel,
  getRecordPhone as getRecordPhoneModel,
  getRecordThumbnailUrl as getRecordThumbnailUrlModel,
  getRecordWeb as getRecordWebModel,
  normalizeItem as normalizeItemModel,
  searchRecordsByText as searchRecordsByTextModel,
  searchSingleRecordById as searchSingleRecordByIdModel
} from './records/records-data.js';
import {
  handleRecordAiSearchSubmit as handleRecordAiSearchSubmitModel,
  handleRecordSearchSubmit as handleRecordSearchSubmitModel,
  hideRecordAutocomplete as hideRecordAutocompleteModel,
  loadRecordAutocomplete as loadRecordAutocompleteModel,
  queueRecordAutocomplete as queueRecordAutocompleteModel,
  renderRecordAutocomplete as renderRecordAutocompleteModel
} from './records/records-actions.js';
import {
  applyPendingRecordViewState,
  applyQuickRecordFilterState,
  applyRecordFiltersState,
  changeRecordPageState,
  fillRecordDynamicFiltersState,
  renderPendingRecordViewMessageState,
  resetRecordFiltersState,
  setRecordCountText,
  showRecordsMessageState
} from './records/records-filters.js';
import {
  renderRecordDataNoteState,
  renderRecordQuickCountsState,
  renderRecordsEmptyState,
  renderRecordsLoadingState,
  renderRecordStatusLegendState,
  renderRecordTableState
} from './records/records-ui.js';
import { getTaskDescription, getTaskIcon, getTaskImpactText, getTaskProblem } from './tasks/task-texts.js';
import {
  buildQualityCountRequestUrl,
  buildQualityListRequestUrl,
  buildQualitySnapshotRequestUrl,
  fetchCachedQualityList,
  fetchCachedQualitySnapshot,
  fetchQualityCount,
  fetchQualityScan
} from './quality/quality-api.js';
import {
  clearTaskRecordsState,
  renderTaskDetailState,
  renderTaskRecordsState,
  renderTasksEmptyState,
  renderTasksLoadingState,
  renderTaskTableState,
  showTaskMessageState
} from './tasks/tasks-ui.js';
import {
  closeRecordAiSearchDialog,
  extractAiSearchIds,
  getErrorMessage,
  handleRecordMailDraft as handleRecordMailDraftModel,
  openRecordAiSearchDialog as openRecordAiSearchDialogUi
} from './records/record-communication.js';
import {
  getRecordIdentityKey,
  loadRecordAutocompleteSuggestions,
  looksLikeRecordId,
  mergeRecordItems,
  resolveRecordSearch
} from './records/records-search.js';
import {
  csvValue,
  escapeHtml,
  formatDateTime,
  formatNumber,
  formatPercent,
  formatRecordDate,
  percent
} from './core/format-utils.js';
import {
  buildTaskRows as buildTaskRowsModel,
  computeTaskSummary,
  findTaskById as findTaskByIdModel,
  impactBadgeClass,
  impactLabel,
  impactRank,
  priorityLabel,
  resolveTaskTypeByCriterionId as resolveTaskTypeByCriterionIdModel,
  taskMatchesIdentifier as taskMatchesIdentifierModel,
  filterTaskRows as filterTaskRowsModel
} from './tasks/task-logic.js';
import { createRequestCache } from './core/request-cache.js';
import {
  clearRecordViewStateStorage,
  loadRecordListStateFromSession,
  loadRecordViewStateFromRouteStorage,
  loadStoredWorkContext,
  saveRecordListStateToSession,
  saveRecordViewStateToSession,
  saveStoredWorkContext
} from './core/state-storage.js';
import { getTaskFamilyId, getTaskFamilyMeta } from './tasks/task-families.js';

document.addEventListener('DOMContentLoaded', () => {
  const root = document.querySelector('.statistik[data-page]');
  if (!root) return;

  const {
    API_BASE,
    QUALITY_SCAN_API_BASE,
    QUALITY_COUNT_API_BASE,
    QUALITY_SNAPSHOT_API_BASE,
    QUALITY_LIST_API_BASE,
    OI_MAIL_DRAFT_API_BASE,
    OI_SEARCH_API_BASE,
    RECORDS_BY_GLOBAL_IDS_API_BASE,
    AUTOCOMPLETE_API_BASE,
    USE_QUALITY_CACHE
  } = getApiConfig(window, location);

  const WORK_CONTEXT_KEY = STORAGE_KEYS.workContext;
  const RECORD_VIEW_STATE_KEY = STORAGE_KEYS.recordViewState;
  const RECORD_LIST_STATE_KEY = STORAGE_KEYS.recordListState;
  const KPI_HISTORY_KEY = STORAGE_KEYS.kpiHistory;
  const CONSENT_STORAGE_KEY = STORAGE_KEYS.consentSettings;
  const RUNTIME_CONFIG = window.SATOURN_RUNTIME || {};

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
    recordAiSearchButton: document.getElementById('record-ai-search-button'),
    recordAiSearchDialog: document.getElementById('record-ai-search-dialog'),
    recordAiSearchForm: document.getElementById('record-ai-search-form'),
    recordAiSearchInput: document.getElementById('record-ai-search-input'),
    recordAiSearchSubmit: document.getElementById('record-ai-search-submit'),
    recordAiSearchNote: document.getElementById('record-ai-search-note'),
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
    helpSeverityGrid: document.getElementById('help-severity-grid'),
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
    recordAiSearchPrompt: '',
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
  const requestCache = createRequestCache({
    fetchJson: rawFetchJson,
    fetchJsonOptional: fetchJsonOptionalUncached,
    locationObject: location,
    shouldForceFresh,
    ttlConfig: REQUEST_CACHE_TTL_MS
  });

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
    els.quickAi?.addEventListener('click', () => showMessage('Die KI-Analyse wird als dezente Aktion in einem spaeteren Schritt angebunden.'));
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
    els.recordAiSearchButton?.addEventListener('click', openRecordAiSearchDialog);
    els.recordAiSearchForm?.addEventListener('submit', handleRecordAiSearchSubmit);
    els.recordSearchInput?.addEventListener('input', () => {
      state.recordServerSearchKeys = new Set();
      state.recordAiSearchPrompt = '';
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
      state.recordAiSearchPrompt = '';
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
    requestCache.clear();
  }

  async function fetchJsonCached(url, options = {}) {
    return requestCache.fetch(url, options);
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
      els.helpModelSummary.textContent = 'Nicht jeder Fehler wirkt gleich stark. Kritische Lücken schlagen deutlich auf den Score, normale Fehler schwächen ihn sichtbar und leichte Optimierungen runden den Datensatz später ab.';
    }
    renderHelpSeverityOverview();
    renderHelpTypeOverview();
  }

  function renderHelpTypeOverview() {
    if (!els.helpTypeGrid) return;
    const cards = TYPES.map((type) => buildHelpTypeCard(type)).join('');
    els.helpTypeGrid.innerHTML = cards;
  }

  function renderHelpSeverityOverview() {
    if (!els.helpSeverityGrid) return;

    const groups = [
      {
        key: 'critical',
        icon: 'error',
        iconClass: 'red',
        title: 'Kritische Fehler',
        impact: 'Wirken stark auf Score und Nutzbarkeit.',
        body: 'Diese Lücken solltest du zuerst schließen. Sie betreffen häufig Lizenz, Beschreibung oder andere zentrale Pflichtangaben.',
        action: 'Zuerst bearbeiten'
      },
      {
        key: 'error',
        icon: 'rule',
        iconClass: 'amber',
        title: 'Fehler',
        impact: 'Schwächen den Datensatz klar sichtbar.',
        body: 'Diese Angaben sind wichtig für Vollständigkeit und Verständlichkeit. Sie sollten nach den kritischen Punkten nachgezogen werden.',
        action: 'Danach bearbeiten'
      },
      {
        key: 'optimization',
        icon: 'auto_fix_high',
        iconClass: 'green',
        title: 'Leichte Optimierungen',
        impact: 'Verbessern Qualität und Feinschliff.',
        body: 'Diese Angaben machen den Datensatz runder und aussagekräftiger, sind aber nicht so gravierend wie harte Lücken.',
        action: 'Zum Schluss optimieren'
      }
    ];

    els.helpSeverityGrid.innerHTML = groups.map((group) => {
      const examples = getHelpSeverityExamples(group.key);
      return `
        <article class="panel-card help-score-card help-severity-card">
          <span class="help-score-icon ${group.iconClass} material-icons" aria-hidden="true">${group.icon}</span>
          <div>
            <h2>${escapeHtml(group.title)}</h2>
            <p><strong>${escapeHtml(group.impact)}</strong></p>
            <p>${escapeHtml(group.body)}</p>
            <div class="help-severity-examples">
              <span class="help-severity-action">${escapeHtml(group.action)}</span>
              <p>${escapeHtml(examples)}</p>
            </div>
          </div>
        </article>
      `;
    }).join('');
  }

  function renderHelpPrivacySection() {
    const localStorageEntries = [
      'Arbeitskontext: Gebiet, Ort und Datentyp',
      'Consent-Einstellungen für optionale Kategorien',
      'Zuletzt berechnete KPI-Vergleichswerte für die übersicht',
      'Temporare Listen- und Detailnavigation nur in der laufenden Sitzung'
    ];
    const externalServices = Array.isArray(RUNTIME_CONFIG.externalServices) ? RUNTIME_CONFIG.externalServices : [];
    const categoryRows = [
      ['Essenziell', 'Aktiv für Navigation, Proxy und Kernfunktionen', true],
      ['Externe UI-Dienste', hasConsent('external_ui') ? 'Vom Nutzer freigegeben' : 'Vorbereitet, aktuell nicht freigegeben', hasConsent('external_ui')],
      ['Automatisierung', hasConsent('automation') ? 'Freigegeben' : 'Vorbereitet, aktuell nicht freigegeben', hasConsent('automation')],
      ['Analytics', hasConsent('analytics') ? 'Freigegeben' : 'Nicht produktiv aktiv', hasConsent('analytics')]
    ];

    if (els.helpPrivacySummary) {
      const activeOptional = categoryRows.filter(([, , enabled]) => enabled).length - 1;
      els.helpPrivacySummary.textContent = activeOptional > 0
        ? `Essenzielle Funktionen sind aktiv. ${formatNumber(activeOptional)} optionale Kategorie ist derzeit freigegeben.`
        : 'Essenzielle Funktionen sind aktiv. Optionale Kategorien sind vorbereitet, derzeit aber standardmäßig deaktiviert.';
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

  function buildHelpTypeCardV2(type) {
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
            ${renderHelpCriterionListV2(minimumItems, 'required')}
          </section>
          <section>
            <h4>Optimal gepflegt</h4>
            ${renderHelpCriterionListV2(extraItems, 'optional')}
          </section>
        </div>
        <footer class="help-type-footer">
          <span>Fehlende Punkte ziehen den Score direkt ab.</span>
          <span>${formatNumber(autoCheckedCount)} automatisch geprüft, ${formatNumber(pendingCount)} fachlich vorbereitet</span>
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

  function renderHelpCriterionListV2(criteria, tone) {
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
    const preparedItems = domainCriteria
      .filter((criterion) => criterion.status === 'needs_verification')
      .sort((a, b) => (
        priorityRank(b.uiPriority) - priorityRank(a.uiPriority) ||
        a.label.localeCompare(b.label, 'de')
      ));
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
            <p class="data-note">Ab ${formatNumber(model.threshold)} Punkten liegt dieser Typ im guten Bereich.</p>
          </div>
          <span class="help-type-score">Ab ${formatNumber(model.threshold)} Punkten gut</span>
        </header>
        <div class="help-type-columns">
          <section>
            <h4>Mindestens für einen guten Stand</h4>
            ${renderHelpCriterionList(minimumItems, 'required')}
          </section>
          <section>
            <h4>Danach sinnvoll optimieren</h4>
            ${renderHelpCriterionList(extraItems, 'optional')}
          </section>
        </div>
        ${preparedItems.length ? `
          <section class="help-prepared-section">
            <h4>Fachlich vorbereitet, später automatisch prüfbar</h4>
            ${renderPreparedHelpCriterionList(preparedItems)}
          </section>
        ` : ''}
        <footer class="help-type-footer">
          <span>Fehlende Angaben ziehen den Score direkt ab.</span>
          <span>${renderHelpTypeFooterSummary(autoCheckedCount, pendingCount)}</span>
        </footer>
      </article>
    `;
  }

  function renderHelpCriterionList(criteria, tone) {
    if (!criteria.length) {
      return '<p class="help-empty-state">Keine weiteren Angaben in diesem Block.</p>';
    }
    return `
      <ul class="help-checklist">
        ${criteria.map((criterion) => `
          <li class="help-checkitem ${tone}">
            <span class="help-checkweight">${formatNumber(criterion.weight || 0)}</span>
            <div>
              <div class="help-checkheadline">
                <strong>${escapeHtml(criterion.label)}</strong>
                <span class="help-severity-badge ${getHelpSeverityClass(criterion)}">${escapeHtml(getHelpSeverityLabel(criterion))}</span>
              </div>
              <small>${escapeHtml(criterion.recommendation || '')}</small>
            </div>
          </li>
        `).join('')}
      </ul>
    `;
  }

  function renderPreparedHelpCriterionList(criteria) {
    if (!criteria.length) return '';
    return `
      <ul class="help-checklist prepared">
        ${criteria.map((criterion) => `
          <li class="help-checkitem prepared">
            <span class="help-checkweight muted">Spaeter</span>
            <div>
              <div class="help-checkheadline">
                <strong>${escapeHtml(criterion.label)}</strong>
                <span class="help-prepared-badge">Vorbereitet</span>
              </div>
              <small>${escapeHtml(criterion.recommendation || 'Diese Prüfung ist fachlich hinterlegt und wird später technisch nachgezogen.')}</small>
            </div>
          </li>
        `).join('')}
      </ul>
    `;
  }

  function getHelpSeverityClass(criterion) {
    const severity = getHelpCriterionSeverity(criterion);
    if (severity === 'critical') return 'critical';
    if (severity === 'error') return 'error';
    return 'optimization';
  }

  function getHelpSeverityLabel(criterion) {
    const severity = getHelpCriterionSeverity(criterion);
    if (severity === 'critical') return 'Kritischer Fehler';
    if (severity === 'error') return 'Fehler';
    return 'Leichte Optimierung';
  }

  function getHelpCriterionSeverity(criterion) {
    if (!criterion) return 'optimization';
    if (criterion.severity === 'critical' || criterion.severity === 'error' || criterion.severity === 'optimization') {
      return criterion.severity;
    }

    const priority = criterion.priority || '';
    const weight = Number(criterion.weight || 0);
    if (priority === 'hoch' || weight >= 8) return 'critical';
    if (priority === 'mittel' || weight >= 4) return 'error';
    return 'optimization';
  }

  function getHelpSeverityExamples(severity) {
    const labels = qualityCriteria
      .filter((criterion) => getHelpCriterionSeverity(criterion) === severity)
      .sort((a, b) => (
        Number(b.weight || 0) - Number(a.weight || 0) ||
        a.label.localeCompare(b.label, 'de')
      ))
      .map((criterion) => criterion.label)
      .filter((label, index, all) => all.indexOf(label) === index)
      .slice(0, 3);

    if (!labels.length) return 'Beispiele werden mit den aktiven Kriterien nachgezogen.';
    return `Beispiele: ${labels.join(', ')}`;
  }

  function renderHelpTypeFooterSummary(autoCheckedCount, pendingCount) {
    if (pendingCount > 0) {
      return `${formatNumber(autoCheckedCount)} Kriterien aktiv, ${formatNumber(pendingCount)} weitere später möglich`;
    }
    return `${formatNumber(autoCheckedCount)} Kriterien fliessen aktuell in den Score ein`;
  }

  function loadWorkContext() {
    return loadStoredWorkContext(WORK_CONTEXT_KEY, TYPES);
  }

  function saveWorkContext(context) {
    state.context = saveStoredWorkContext(WORK_CONTEXT_KEY, context, TYPES);
    renderWorkContext();
  }

  function saveRecordViewState(viewState) {
    saveRecordViewStateToSession(RECORD_VIEW_STATE_KEY, viewState, TYPES);
  }

  function loadRecordViewStateFromRoute() {
    return loadRecordViewStateFromRouteStorage(RECORD_VIEW_STATE_KEY, TYPES);
  }

  function clearRecordViewState() {
    clearRecordViewStateStorage(RECORD_VIEW_STATE_KEY);
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
    return buildSearchApiUrl(API_BASE, type, query, options);
  }

  async function fetchJsonOptionalUncached(url, options = {}) {
    const response = await fetch(url, { cache: 'no-store', ...options });
    const text = await response.text();
    if (response.status === 404) return null;
    if (!response.ok) throw new Error(`HTTP ${response.status}: ${text}`);
    return JSON.parse(text.trim());
  }

  function buildQualitySnapshotUrl() {
    const query = buildQuery(state.context);
    return buildQualitySnapshotRequestUrl(QUALITY_SNAPSHOT_API_BASE, {
      query,
      type: state.context.type || ''
    });
  }

  async function loadCachedQualitySnapshot() {
    if (!USE_QUALITY_CACHE) return null;
    state.qualitySnapshot = null;
    let snapshot = null;
    try {
      snapshot = await fetchCachedQualitySnapshot({
        apiBase: QUALITY_SNAPSHOT_API_BASE,
        fetchJson: fetchJsonCached,
        useQualityCache: USE_QUALITY_CACHE,
        query: buildQuery(state.context),
        type: state.context.type || ''
      });
    } catch (error) {
      console.warn('Qualitäts-Snapshot konnte nicht aus dem Cache geladen werden.', error);
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

  function canCalculateQualityForContext(context = state.context) {
    return Boolean(context.area || context.city);
  }

  function upsertStatisticRow(row) {
    state.latestRows = upsertStatisticRowModel(state.latestRows, row, TYPES);
  }

  function renderOverviewCurrent(options = {}) {
    renderOverview(state.latestRows, state.normalizedItems, options);
  }

  function resetOverviewQualityState() {
    state.normalizedItems = [];
    state.qualityAggregations = buildAggregationsFromIssueSummary([]);
    state.qualityDataMeta = buildOverviewQualityMeta({
      canCalculateQuality: canCalculateQualityForContext(),
      selectedType: state.context.type || '',
      totalTypes: TYPES.length
    });
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
        console.error('Qualitätsdaten konnten nicht geladen werden.', qualityResult.reason);
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
      showMessage('Die Daten konnten nicht geladen werden. Bitte später erneut versuchen.');
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
        onRow?.(row, sortStatisticRows(rows, TYPES));
        return row;
      } catch (error) {
        if (!isAbortLikeError(error)) {
          console.warn('Statistik-Count fehlgeschlagen.', type, error);
        }
        return null;
      }
    }));

    const finalRows = sortStatisticRows(results.filter(Boolean), TYPES);
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
          console.warn('Regionaler Qualitätsscan fehlgeschlagen.', type, error);
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
    return buildQualityCountRequestUrl(QUALITY_COUNT_API_BASE, criterionId, type, query);
  }

  function buildQualityListUrl({ criterionId, type, query }) {
    return buildQualityListRequestUrl(QUALITY_LIST_API_BASE, { criterionId, type, query });
  }

  async function loadCachedQualityList({ criterionId, type, query }) {
    try {
      return await fetchCachedQualityList({
        apiBase: QUALITY_LIST_API_BASE,
        fetchJson: fetchJsonCached,
        useQualityCache: USE_QUALITY_CACHE,
        criterionId,
        type,
        query
      });
    } catch (error) {
      console.warn('Qualitätsliste konnte nicht aus dem Cache geladen werden.', error);
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
        const payload = await fetchQualityCount({
          apiBase: QUALITY_COUNT_API_BASE,
          fetchJson: fetchJsonCached,
          criterionId: criterion.id,
          type,
          query
        });
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
    return buildTaskRowsModel(issueSummary, {
      qualityCriteria,
      getTaskFamilyId,
      getTaskFamilyMeta,
      isActiveCriterion,
      priorityRank,
      taskDescription,
      taskProblem
    });
  }

  function isActiveCriterion(criterionId) {
    const criterion = qualityCriteria.find((entry) => entry.id === criterionId);
    return Boolean(criterion && criterion.autoCheck !== false);
  }

  function applyTaskFilters() {
    state.filteredTaskRows = filterTaskRowsModel(state.taskRows, {
      query: (els.taskSearchInput?.value || '').trim(),
      priority: els.taskPriorityFilter?.value || '',
      type: els.taskTypeFilter?.value || '',
      check: els.taskCheckFilter?.value || '',
      impact: els.taskImpactFilter?.value || ''
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
    return findTaskByIdModel(tasks, identifier);
  }

  function taskMatchesIdentifier(task, identifier) {
    return taskMatchesIdentifierModel(task, identifier);
  }

  function resolveTaskTypeByCriterionId(task, criterionId) {
    return resolveTaskTypeByCriterionIdModel(task, criterionId);
  }

  function renderTaskKpis(tasks) {
    const {
      totalTasks,
      highTasks,
      affectedHits,
      openDataHits,
      potential
    } = computeTaskSummary(tasks);

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
    state.taskPage = renderTaskTableState(els, {
      rows: state.filteredTaskRows,
      selectedTask: state.selectedTask,
      taskPage: state.taskPage,
      taskRowsPerPage: state.taskRowsPerPage,
      taskIcon,
      priorityLabel,
      renderTypeChips,
      impactBadgeClass,
      impactLabel,
      formatNumber,
      escapeHtml,
      onSelectTask: selectTask
    });
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
    state.selectedTaskType = renderTaskDetailState(els, {
      task,
      selectedTaskType: state.selectedTaskType,
      escapeHtml,
      renderTypeChips,
      impactBadgeClass,
      impactLabel,
      taskImpactText,
      clearTaskRecords,
      openTaskRecordsOnRecordsPage
    });
    if (task) renderPrimarySystemsForTask(task);
  }

  function openTaskRecordsOnRecordsPage(task, type) {
    openTaskRecordsOnRecordsPageModel({
      task,
      type,
      context: state.context,
      saveRecordViewState,
      showTaskMessage
    });
  }

  function resolveTaskCriterionId(task, type = '') {
    return resolveTaskCriterionIdModel(task, type);
  }

  function openOverviewIssueOnRecordsPage(issue) {
    openOverviewIssueOnRecordsPageModel({
      issue,
      context: state.context,
      saveRecordViewState
    });
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
    const stats = renderTaskRecordsState(els, {
      task,
      type,
      rows,
      payload,
      formatNumber,
      escapeHtml,
      buildRecordDetailUrl,
      copyText
    });
    if (stats.budgetExhausted) console.debug('Qualitätsscan-Budget ausgeschoepft.', stats);
  }

  function renderTasksLoading() {
    renderTasksLoadingState(els);
  }

  function renderTasksEmpty(message) {
    renderTasksEmptyState(els, message);
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
    clearTaskRecordsState(els);
  }

  function showTaskMessage(message) {
    showTaskMessageState(els, message);
  }

  async function loadRecordsData() {
    const startedAt = new Date();
    state.recordServerSearchKeys = new Set();
    state.recordAiSearchPrompt = '';
    showRecordsMessage('');
    renderRecordsLoading();

    try {
      const usesCriterionView = Boolean(state.pendingRecordView?.criterionId);
      const selectedIssue = els.recordIssueFilter?.value || '';
      const selectedType = els.recordTypeFilter?.value || state.context.type || '';
      const result = usesCriterionView
        ? await loadRecordRowsForPendingView(state.pendingRecordView)
        : selectedIssue
          ? await loadRecordRowsForIssueSelection(selectedIssue, selectedType)
          : { rows: [], meta: null };
      state.recordItems = result.rows;
      state.recordRows = result.rows.map(buildRecordViewModel);
      if (!usesCriterionView && !selectedIssue) {
        state.recordDataMeta = {
          mode: 'empty',
          collectedItems: 0,
          estimatedTotalItems: 0,
          truncated: false
        };
      } else if (result.meta) {
        state.recordDataMeta = result.meta;
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

  async function loadRecordRowsForPendingView(view) {
    return loadRecordRowsForPendingViewModel({
      view,
      types: TYPES,
      mergeRecordItems,
      loadRecordRowsForView,
      loadRecordRowsForIssueSelection
    });
  }

  async function loadRecordRowsForIssueSelection(criterionId, selectedType = '') {
    return loadRecordRowsForIssueSelectionModel({
      criterionId,
      selectedType,
      qualityCriteria,
      types: TYPES,
      loadRecordRowsForView
    });
  }

  async function loadRecordRowsForView(view) {
    return loadRecordRowsForViewModel({
      view,
      context: state.context,
      buildQuery,
      loadCachedQualityList,
      extractItems,
      extractTotal,
      normalizeItem,
      evaluateAllItems,
      fetchQualityScan: (options) => fetchQualityScan({
        apiBase: QUALITY_SCAN_API_BASE,
        fetchJson: fetchJsonCached,
        ...options
      })
    });
  }

  function buildRecordViewModel(item) {
    return buildRecordViewModelModel(item, {
      extractId,
      getFirst,
      getRecordEmail,
      getRecordWeb,
      buildVerifiedEt4Url,
      getPrimaryIssueId,
      qualityCriteria,
      priorityRank,
      getRecordThumbnailUrl
    });
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
    fillRecordDynamicFiltersState({
      els,
      rows: state.recordRows
    });
  }

  function applyPendingRecordView() {
    applyPendingRecordViewState({
      els,
      state,
      types: TYPES
    });
  }

  function renderPendingRecordViewMessage() {
    renderPendingRecordViewMessageState({
      state,
      qualityCriteria,
      buildPendingRecordViewMessage,
      showRecordsMessage
    });
  }

  function applyRecordFilters() {
    applyRecordFiltersState({
      state,
      els,
      qualityCriteria,
      serverSearchKeys: state.recordServerSearchKeys,
      getIdentityKey: getRecordIdentityKey,
      filterRecordRows,
      renderRecordQuickCounts,
      renderRecordStatusLegend,
      renderRecordTable,
      renderRecordDataNote,
      renderPendingRecordViewMessage
    });
  }

  function openRecordAiSearchDialog() {
    openRecordAiSearchDialogUi({
      dialog: els.recordAiSearchDialog,
      input: els.recordAiSearchInput,
      note: els.recordAiSearchNote,
      prompt: state.recordAiSearchPrompt
    });
  }

  async function handleRecordAiSearchSubmit(event) {
    await handleRecordAiSearchSubmitModel({
      event,
      state,
      els,
      extractAiSearchIds,
      normalizeItem,
      evaluateAllItems,
      buildRecordViewModel,
      fillRecordDynamicFilters,
      applyRecordFilters,
      clearRecordViewState,
      hideRecordAutocomplete,
      renderRecordsLoading,
      closeRecordAiSearchDialog,
      getErrorMessage,
      contextAreaLabel,
      showRecordsMessage,
      selectedType: () => els.recordTypeFilter?.value || state.context.type || '',
      runAiRecordSearch: ({ prompt, context }) => runAiRecordSearch({
        apiBase: OI_SEARCH_API_BASE,
        fetchJson: fetchJsonCached,
        prompt,
        context
      }),
      resolveRecordsByIds: ({ ids, type }) => resolveRecordsByIds({
        apiBase: RECORDS_BY_GLOBAL_IDS_API_BASE,
        fetchJson: fetchJsonCached,
        ids,
        type
      })
    });
  }

  async function handleRecordSearchSubmit() {
    await handleRecordSearchSubmitModel({
      state,
      els,
      applyRecordFilters,
      renderRecordsLoading,
      resolveRecordSearch,
      looksLikeRecordId,
      searchSingleRecordById,
      searchRecordsByText,
      normalizeItem,
      evaluateAllItems,
      mergeRecordItems,
      getRecordIdentityKey,
      buildRecordViewModel,
      fillRecordDynamicFilters,
      showRecordsMessage
    });
  }

  async function handleRecordMailDraft(row, triggerNode) {
    await handleRecordMailDraftModel({
      row,
      triggerNode,
      pendingRecordView: state.pendingRecordView,
      selectedCriterionId: els.recordIssueFilter?.value || '',
      qualityCriteria,
      taskProblem,
      buildMailtoUrl,
      launchMailto,
      getErrorMessage,
      showRecordsMessage,
      requestRecordMailDraft: ({ payload }) => requestRecordMailDraft({
        apiBase: OI_MAIL_DRAFT_API_BASE,
        fetchJson: fetchJsonCached,
        payload
      })
    });
  }

  async function searchSingleRecordById(query) {
    return searchSingleRecordByIdModel(query, {
      context: state.context,
      selectedType: state.context.type || '',
      types: TYPES,
      buildQuery,
      cleanQueryValue,
      buildUrl,
      fetchJsonCached,
      extractItems,
      normalizeItem
    });
  }

  async function searchRecordsByText(query) {
    return searchRecordsByTextModel(query, {
      context: state.context,
      selectedType: els.recordTypeFilter?.value || state.context.type || '',
      types: TYPES,
      buildQuery,
      cleanQueryValue,
      buildUrl,
      fetchJsonCached,
      extractItems,
      extractTotal,
      normalizeItem,
      onTypeError: (type, error) => console.warn('Volltextsuche konnte nicht für Typ geladen werden.', type, error)
    });
  }

  function queueRecordAutocomplete() {
    queueRecordAutocompleteModel({
      state,
      els,
      looksLikeRecordId,
      hideRecordAutocomplete,
      loadRecordAutocomplete
    });
  }

  async function loadRecordAutocomplete(query) {
    await loadRecordAutocompleteModel({
      query,
      state,
      renderRecordAutocomplete,
      hideRecordAutocomplete,
      selectedType: () => els.recordTypeFilter?.value || state.context.type || '',
      loadRecordAutocompleteSuggestions: ({ query: term, selectedType }) => loadRecordAutocompleteSuggestions({
        query: term,
        selectedType,
        autocompleteApiBase: AUTOCOMPLETE_API_BASE,
        fetchJsonCached,
        textValue
      })
    });
  }

  function renderRecordAutocomplete(suggestions) {
    renderRecordAutocompleteModel({
      suggestions,
      els,
      escapeHtml,
      formatNumber,
      hideRecordAutocomplete,
      onSubmitSuggestion: handleRecordSearchSubmit
    });
  }

  function hideRecordAutocomplete() {
    hideRecordAutocompleteModel({ state, els });
  }

  function renderRecordTable() {
    state.recordPage = renderRecordTableState(els, {
      rows: state.filteredRecordRows,
      allRows: state.recordRows,
      recordPage: state.recordPage,
      recordRowsPerPage: state.recordRowsPerPage,
      recordDataMeta: state.recordDataMeta,
      escapeHtml,
      formatNumber,
      formatRecordDate,
      onMailDraft: handleRecordMailDraft,
      saveRecordListState
    });
  }

  function saveRecordListState(rows) {
    saveRecordListStateToSession(RECORD_LIST_STATE_KEY, rows, {
      buildDetailUrl: buildRecordDetailUrl
    });
  }

  function loadRecordListState() {
    return loadRecordListStateFromSession(RECORD_LIST_STATE_KEY);
  }

  function renderRecordsLoading() {
    renderRecordsLoadingState(els);
  }

  function renderRecordsEmpty(message) {
    renderRecordsEmptyState(els, message, showRecordsMessage);
  }

  function renderRecordQuickCounts() {
    renderRecordQuickCountsState(els, {
      rows: state.recordRows,
      mode: state.recordDataMeta.mode,
      setText
    });
  }

  function renderRecordStatusLegend() {
    renderRecordStatusLegendState(els, {
      rows: state.filteredRecordRows,
      mode: state.recordDataMeta.mode,
      setText
    });
  }

  function renderRecordDataNote() {
    renderRecordDataNoteState(els, state.recordDataMeta);
  }

  function resetRecordFilters() {
    resetRecordFiltersState({
      state,
      els,
      clearRecordViewState,
      loadRecordsData,
      applyRecordFilters
    });
  }

  function applyQuickRecordFilter(value) {
    applyQuickRecordFilterState({
      value,
      state,
      els,
      clearRecordViewState,
      loadRecordsData,
      applyRecordFilters
    });
  }

  function changeRecordPage(delta) {
    changeRecordPageState({
      state,
      delta,
      renderRecordTable
    });
  }

  function getRecordThumbnailUrl(item) {
    return getRecordThumbnailUrlModel(item, { qualityHelpers, getFirst });
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
    showRecordsMessageState(els, message);
  }

  function setText(node, value) {
    setRecordCountText(node, value, formatNumber);
  }

  async function loadRecordDetail() {
    showDetailMessage('');
    renderDetailLoadingState(els);
    const params = new URLSearchParams(location.search);
    const type = params.get('type') || state.context.type || '';
    const id = params.get('id') || '';
    const globalId = params.get('global_id') || params.get('globalId') || '';

    if (!id && !globalId) {
      renderDetailEmptyState(els, 'Noch kein Datensatz ausgewählt. Suche in der Datensatzliste nach Titel, ID oder Ort und öffne einen Eintrag.', escapeHtml, showDetailMessage);
      return;
    }

    try {
      const raw = await fetchRecordDetailItem({ type, id, globalId });
      if (!raw) {
        renderDetailEmptyState(els, 'Für diese ID wurde kein Datensatz gefunden. Bitte prüfe Typ und ID oder kehre zur Datensatzliste zurück.', escapeHtml, showDetailMessage);
        return;
      }
      const normalized = normalizeItem(raw, type || getFirst(raw, ['type', 'typeName']));
      const evaluated = evaluateQualityForItem(normalized);
      state.recordDetailItem = evaluated;
      state.recordDetailViewModel = getRecordDetailViewModel(evaluated);
      renderRecordDetailPage({
        els,
        model: state.recordDetailViewModel,
        escapeHtml,
        formatNumber,
        formatRecordDate,
        criterionStatusClass,
        getCriterionDisplayStatus,
        buildRecordDetailUrl,
        loadRecordListState,
        copyText
      });
      if (els.lastUpdated) els.lastUpdated.textContent = `Letzte Aktualisierung: ${formatDateTime(new Date())}`;
    } catch (error) {
      console.error('Datensatz-Detail konnte nicht geladen werden.', error);
      renderDetailEmptyState(els, 'Der Datensatz konnte nicht geladen werden.', escapeHtml, showDetailMessage);
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

  function getRecordDetailViewModel(item) {
    const raw = item.raw || item;
    const criteria = qualityCriteria.filter((criterion) => !criterion.types?.length || criterion.types.includes(item.type));
    const domainCriteria = qualityHelpers.getDomainCriteriaForType(item.type);
    const missing = new Set(item.missingCriteria || []);
    const fulfilled = new Set(item.fulfilledCriteria || []);
    const manual = new Set(item.manualCriteria || []);
    const images = getCheckableImages(item, qualityHelpers);
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
        preparedCount: domainCriteria.filter((criterion) => criterion.status === 'needs_verification').length,
        criteria: criteria.map((criterion) => ({
          id: criterion.id,
          label: criterion.label,
          recommendation: criterion.recommendation,
          status: missing.has(criterion.id) ? 'fehlt' : fulfilled.has(criterion.id) ? 'erfüllt' : manual.has(criterion.id) ? 'nicht bewertbar' : 'nicht relevant'
        })),
        preparedCriteria: domainCriteria
          .filter((criterion) => criterion.status === 'needs_verification')
          .map((criterion) => ({
            id: criterion.id,
            label: criterion.label,
            recommendation: criterion.recommendation,
            status: 'vorbereitet'
          })),
        manualDomainCriteria: domainCriteria
          .filter((criterion) => criterion.status === 'manual_review')
          .map((criterion) => ({
            id: criterion.id,
            label: criterion.label,
            recommendation: criterion.recommendation,
            status: 'manuell'
          })),
        sourceGuardedCriteria: domainCriteria
          .filter((criterion) => criterion.status === 'source_guarded' || criterion.status === 'not_applicable' || criterion.status === 'excluded_by_category')
          .map((criterion) => ({
            id: criterion.id,
            label: criterion.label,
            recommendation: criterion.recommendation,
            status: criterion.status
          }))
      },
      issues: criteria
        .filter((criterion) => missing.has(criterion.id))
        .sort((a, b) => priorityRank(b.priority) - priorityRank(a.priority))
        .slice(0, 5),
      usability: getDetailUsability(item, images, missingCopyright, qualityHelpers),
      texts: {
        description: getDisplayDescription(raw, qualityHelpers),
        teaser: getTextByRel(raw, 'teaser', qualityHelpers),
        openings: getOpeningHoursSummary(item, qualityHelpers),
        directions: getTextByRel(raw, 'directions', qualityHelpers) || (qualityHelpers.hasPublicTransportFeature(raw) ? 'ÖPNV-Information vorhanden.' : 'Keine ÖPNV-Information vorhanden.'),
        price: getTextByRel(raw, 'PRICE_INFO', qualityHelpers),
        priceReduced: getTextByRel(raw, 'PRICE_REDUCEDINFO', qualityHelpers),
        seoTitle: getTextByRel(raw, 'WEB_SEO_TITEL', qualityHelpers),
        seoDescription: getTextByRel(raw, 'WEB_SEO_BESCHREIBUNG', qualityHelpers)
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
        web: getRecordWeb(raw),
        email: getRecordEmail(raw),
        phone: getRecordPhone(raw),
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
      ['SEO-Titel', getTextByRel(raw, 'WEB_SEO_TITEL', qualityHelpers)],
      ['SEO-Beschreibung', getTextByRel(raw, 'WEB_SEO_BESCHREIBUNG', qualityHelpers)]
    ].filter(([, value]) => textValue(value));
  }

  function showDetailMessage(message) {
    if (!els.recordDetailMessage) return;
    els.recordDetailMessage.textContent = message || '';
    els.recordDetailMessage.hidden = !message;
  }

  function buildVerifiedEt4Url(item) {
    return buildVerifiedEt4UrlModel(item);
  }

  function normalizeItem(raw, fallbackType) {
    return normalizeItemModel(raw, fallbackType, {
      extractId,
      qualityHelpers,
      textValue,
      context: state.context
    });
  }

  function getFirst(obj, paths) {
    return getFirstModel(obj, paths, { qualityHelpers, textValue });
  }

  function getRecordEmail(raw) {
    return getRecordEmailModel(raw, { qualityHelpers, textValue }) || '';
  }

  function getRecordWeb(raw) {
    return getRecordWebModel(raw, { qualityHelpers, textValue }) || '';
  }

  function getRecordPhone(raw) {
    return getRecordPhoneModel(raw, { qualityHelpers, textValue }) || '';
  }

  function renderOverview(rows, items, options = {}) {
    const summary = computeOverviewSummary(rows);
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

    let previousKpis = null;
    try {
      previousKpis = JSON.parse(localStorage.getItem(KPI_HISTORY_KEY) || 'null');
    } catch {
      previousKpis = null;
    }

    const issues = buildTaskRows(aggregations.issueSummary || [])
      .filter((issue) => Number(issue.affectedCount || 0) > 0)
      .sort((a, b) => impactRank(b.impact) - impactRank(a.impact) || priorityRank(b.priority) - priorityRank(a.priority) || b.affectedCount - a.affectedCount)
      .slice(0, 5);

    renderOverviewPage(els, {
      summary,
      counts,
      assessedTotal,
      notOpenData,
      kpis,
      issues,
      contextType: state.context.type || '',
      qualityDataMeta: state.qualityDataMeta,
      sampleSize: items.length,
      formatNumber,
      formatPercent,
      percent,
      taskIcon,
      taskDescription,
      openOverviewIssueOnRecordsPage,
      previousKpis
    });
    if (options.saveHistory !== false) saveKpiHistory(kpis);
  }

  function renderOverviewLoading() {
    renderOverviewLoadingState(els);
  }

  function renderOverviewEmpty() {
    renderOverviewEmptyState(els);
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

  function showMessage(message) {
    if (!els.overviewMessage) return;
    els.overviewMessage.textContent = message || '';
    els.overviewMessage.hidden = !message;
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
    return getTaskProblem(id);
  }

  function taskImpactText(id) {
    return getTaskImpactText(id);
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
      console.debug('Kopieren nicht möglich.', error);
    }
  }

  function taskIcon(id) {
    return getTaskIcon(id);
  }

  function taskDescription(id) {
    return getTaskDescription(id);
  }

  function priorityRank(priority) {
    if (priority === 'hoch') return 3;
    if (priority === 'mittel') return 2;
    return 1;
  }

  function sumStatusCounts(counts) {
    return (counts.gut || 0) + (counts.pruefen || 0) + (counts.kritisch || 0) + (counts.nichtBerechenbar || 0);
  }

});
