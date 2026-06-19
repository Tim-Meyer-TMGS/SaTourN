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
  canCalculateQualityForContext as canCalculateQualityForContextModel,
  loadQualityCountSummary as loadQualityCountSummaryModel,
  loadRegionalQualityEvaluation as loadRegionalQualityEvaluationModel,
  loadStatisticRows as loadStatisticRowsModel,
  loadStatisticRowsIncremental as loadStatisticRowsIncrementalModel
} from './overview/overview-data.js';
import {
  loadOverviewDataAsync as loadOverviewDataAsyncModel,
  resetOverviewQualityState as resetOverviewQualityStateModel
} from './overview/overview-controller.js';
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
  fetchRecordDetailItem as fetchRecordDetailItemModel,
  getAddressSummary as getAddressSummaryModel,
  getCoordinates as getCoordinatesModel,
  getExternalSystemIds as getExternalSystemIdsModel,
  getRawExcerpt as getRawExcerptModel,
  getRecordDetailContext as getRecordDetailContextModel,
  getRecordDetailViewModel as getRecordDetailViewModelModel
} from './detail/record-detail-data.js';
import { loadRecordDetail as loadRecordDetailModel } from './detail/record-detail-controller.js';
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
import { loadRecordsData as loadRecordsDataPageModel } from './records/records-page-controller.js';
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
  loadTaskIssueSummary as loadTaskIssueSummaryModel,
  loadTaskRecordRows as loadTaskRecordRowsModel
} from './tasks/task-data.js';
import { loadTasksData as loadTasksDataModel } from './tasks/task-controller.js';
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
  createInitialState as createInitialStateModel,
  initializeStateForPage as initializeStateForPageModel
} from './core/app-state.js';
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
  clearTransientRequestCache as clearTransientRequestCacheModel,
  createForceFreshController,
  fetchJsonCached as fetchJsonCachedModel,
  hasConsent as hasConsentModel,
  interceptQuickAiConsent as interceptQuickAiConsentModel,
  isAbortLikeError as isAbortLikeErrorModel,
  loadConsentState as loadConsentStateModel,
  openConsentDialog as openConsentDialogModel,
  readConsentFormState,
  saveConsentState as saveConsentStateModel,
  syncConsentControls as syncConsentControlsModel
} from './core/runtime-helpers.js';
import {
  fillContextControls as fillContextControlsModel,
  initSharedShell as initSharedShellModel,
  initializePage as initializePageModel,
  openContextDialog as openContextDialogModel,
  renderWorkContext as renderWorkContextModel
} from './core/page-shell.js';
import {
  collectPrimarySystems as collectPrimarySystemsModel,
  getKeywordValues as getKeywordValuesModel,
  getPrimarySystem as getPrimarySystemModel,
  getSourceId as getSourceIdModel,
  safeKeywordArray as safeKeywordArrayModel
} from './core/source-systems.js';
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

  let state = createInitialStateModel({
    loadWorkContext,
    getQualityAggregations
  });

  const forceFreshController = createForceFreshController();
  let consentState = loadConsentState();
  const requestCache = createRequestCache({
    fetchJson: rawFetchJson,
    fetchJsonOptional: fetchJsonOptionalUncached,
    locationObject: location,
    shouldForceFresh,
    ttlConfig: REQUEST_CACHE_TTL_MS
  });

  initializeStateForPageModel({
    page,
    state,
    loadRecordViewStateFromRoute,
    saveWorkContext
  });

  initSharedShell();
  initializePageModel(page, {
    initOverview,
    initTasks,
    initRecords,
    initRecordDetail,
    initStats,
    initHelp
  });

  function initSharedShell() {
    initSharedShellModel({
      els,
      fillControls: fillContextControls,
      renderContext: renderWorkContext,
      syncConsentControls,
      openContextDialog,
      handleContextSubmit,
      openConsentDialog,
      handleConsentSubmit,
      markForceFresh
    });
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
    forceFreshController.markForceFresh();
  }

  function shouldForceFresh() {
    return forceFreshController.shouldForceFresh();
  }

  function clearTransientRequestCache() {
    clearTransientRequestCacheModel(requestCache);
  }

  async function fetchJsonCached(url, options = {}) {
    return fetchJsonCachedModel(requestCache, url, options);
  }

  function isAbortLikeError(error) {
    return isAbortLikeErrorModel(error);
  }

  function loadConsentState() {
    return loadConsentStateModel(CONSENT_STORAGE_KEY, RUNTIME_CONFIG);
  }

  function saveConsentState() {
    consentState = saveConsentStateModel(consentState, CONSENT_STORAGE_KEY);
  }

  function hasConsent(category) {
    return hasConsentModel(consentState, category);
  }

  function syncConsentControls() {
    syncConsentControlsModel(els, consentState);
  }

  function openConsentDialog() {
    openConsentDialogModel(els, syncConsentControls);
  }

  function handleConsentSubmit(event) {
    if (event.submitter?.value === 'cancel') return;
    event.preventDefault();
    consentState = readConsentFormState(els, consentState);
    saveConsentState();
    renderHelpPrivacySection();
    els.consentDialog?.close?.();
  }

  function interceptQuickAiConsent(event) {
    interceptQuickAiConsentModel(consentState, event, showMessage);
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
    fillContextControlsModel(els, AREAS, TYPES);
  }

  function renderWorkContext() {
    renderWorkContextModel(els, state.context, AREAS);
  }

  function openContextDialog() {
    openContextDialogModel(els, state.context, fillContextControls);
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
    return canCalculateQualityForContextModel(context);
  }

  function upsertStatisticRow(row) {
    state.latestRows = upsertStatisticRowModel(state.latestRows, row, TYPES);
  }

  function renderOverviewCurrent(options = {}) {
    renderOverview(state.latestRows, state.normalizedItems, options);
  }

  function resetOverviewQualityState() {
    resetOverviewQualityStateModel({
      state,
      buildAggregationsFromIssueSummary,
      buildOverviewQualityMeta,
      canCalculateQualityForContext,
      types: TYPES
    });
  }

  async function loadOverviewDataAsync() {
    return loadOverviewDataAsyncModel({
      state,
      els,
      formatDateTime,
      showMessage,
      renderOverviewLoading,
      renderOverviewCurrent,
      renderOverviewEmpty,
      resetOverviewQualityState,
      loadStatisticRowsIncremental,
      loadRegionalQualityEvaluation,
      loadQualityCountSummary,
      canCalculateQualityForContext,
      buildAggregationsFromIssueSummary,
      isAbortLikeError
    });
  }

  async function loadStatisticRowsIncremental(onRow = null) {
    return loadStatisticRowsIncrementalModel({
      context: state.context,
      types: TYPES,
      buildQuery,
      buildUrl,
      fetchJsonCached,
      extractTotal,
      onRow,
      isAbortLikeError
    });
  }

  async function loadStatisticRows() {
    return loadStatisticRowsModel({
      context: state.context,
      types: TYPES,
      buildQuery,
      buildUrl,
      fetchJsonCached,
      extractTotal
    });
  }

  async function loadRegionalQualityEvaluation({ isStale = () => false, onUpdate = null } = {}) {
    return loadRegionalQualityEvaluationModel({
      context: state.context,
      types: TYPES,
      buildQuery,
      buildUrl,
      fetchJsonCached,
      extractItems,
      extractTotal,
      extractId,
      normalizeItem,
      evaluateAllItems,
      getQualityAggregations,
      isAbortLikeError,
      isStale,
      onUpdate: ({ items, aggregations, meta }) => {
        state.normalizedItems = items;
        state.qualityAggregations = aggregations;
        state.qualityDataMeta = meta;
        onUpdate?.(aggregations, meta, items);
      }
    });
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
    const issues = await loadQualityCountSummaryModel({
      context: state.context,
      types: TYPES,
      qualityCriteria,
      isActiveCriterion,
      getQualityScanConfig,
      fetchQualityCount: ({ criterionId, type, query }) => fetchQualityCount({
        apiBase: QUALITY_COUNT_API_BASE,
        fetchJson: fetchJsonCached,
        criterionId,
        type,
        query
      }),
      buildAggregationsFromIssueSummary,
      buildQuery,
      onUpdate: (partialIssues, meta) => {
        state.qualityDataMeta = meta;
        onUpdate?.(partialIssues, meta);
      }
    });

    state.qualityDataMeta = {
      ...state.qualityDataMeta,
      mode: 'api_counts',
      estimatedTotalItems: issues.reduce((sum, issue) => sum + issue.affectedCount, 0)
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
    return loadTasksDataModel({
      state,
      els,
      formatDateTime,
      showTaskMessage,
      renderTasksLoading,
      hidePrimarySystems,
      clearTaskRecords,
      canCalculateQualityForContext,
      loadTaskIssueSummary: (options) => loadTaskIssueSummaryModel({
        ...options,
        loadRegionalQualityEvaluation,
        loadQualityCountSummary
      }),
      buildTaskRows,
      findTaskById,
      taskMatchesIdentifier,
      resolveTaskTypeByCriterionId,
      applyTaskFilters,
      renderTaskDetail,
      renderTasksEmpty
    });
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
          ? 'Die Pflegeaufgaben stammen aus dem gecachten Nachtlauf. Der Lauf war begrenzt; einzelne Listen können weiter live nachgeladen werden.'
          : 'Die Pflegeaufgaben stammen aus dem gecachten Nachtlauf und basieren auf vollständig gescannten Datensätzen.';
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
    if (!task || !type) {
      showTaskMessage('Bitte wähle zuerst eine konkrete Aufgabe und einen Datentyp.');
      return;
    }

    showTaskMessage('');
    els.taskRecordsSection.hidden = false;
    els.taskRecordsExport.disabled = true;
    els.taskRecordsTitle.textContent = `${task.label} - ${type}`;
    els.taskRecordsNote.textContent = 'Datensätze werden geladen ...';
    els.taskRecordsBody.innerHTML = '<tr><td colspan="6" class="table-empty"><span class="loading-line">Datensätze werden geladen ...</span></td></tr>';

    try {
      const result = await loadTaskRecordRowsModel({
        task,
        type,
        context: state.context,
        resolveTaskCriterionId,
        buildQuery,
        loadCachedQualityList,
        fetchJsonCached,
        qualityScanApiBase: QUALITY_SCAN_API_BASE,
        extractItems,
        normalizeItem
      });
      if (!result.criterionId) {
        showTaskMessage('Für diesen Datentyp konnte kein passendes Qualitätskriterium bestimmt werden.');
        clearTaskRecords();
        return;
      }
      const { rows, payload } = result;
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
    if (stats.budgetExhausted) console.debug('Qualitätsscan-Budget ausgeschöpft.', stats);
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
    await loadRecordsDataPageModel({
      state,
      els,
      context: state.context,
      formatDateTime,
      showRecordsMessage,
      renderRecordsLoading,
      renderRecordsEmpty,
      loadRecordRowsForPendingView,
      loadRecordRowsForIssueSelection,
      buildRecordViewModel,
      fillRecordDynamicFilters,
      applyPendingRecordView,
      applyRecordFilters,
      renderPendingRecordViewMessage
    });
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
    await loadRecordDetailModel({
      state,
      els,
      locationObject: location,
      escapeHtml,
      formatDateTime,
      formatNumber,
      formatRecordDate,
      evaluateQualityForItem,
      renderDetailLoadingState,
      renderDetailEmptyState,
      renderRecordDetailPage,
      criterionStatusClass,
      getCriterionDisplayStatus,
      buildRecordDetailUrl,
      loadRecordListState,
      copyText,
      showDetailMessage,
      fetchRecordDetailItem,
      normalizeItem,
      getFirst,
      getRecordDetailViewModel
    });
  }

  async function fetchRecordDetailItem({ type, id, globalId }) {
    return fetchRecordDetailItemModel(
      { type, id, globalId },
      {
        types: TYPES,
        cleanQueryValue,
        getIdFromGlobalId,
        uniqueValues,
        buildUrl,
        fetchJsonCached,
        extractItems,
        extractId,
        getFirst
      }
    );
  }

  function getRecordDetailViewModel(item) {
    return getRecordDetailViewModelModel(item, {
      qualityCriteria,
      qualityHelpers,
      priorityRank,
      getCheckableImages,
      getDetailUsability,
      getDisplayDescription,
      getOpeningHoursSummary,
      getTextByRel,
      textValue,
      buildVerifiedEt4Url,
      getFirst,
      getRecordWeb,
      getRecordEmail,
      getRecordPhone,
      getExternalSystemIds,
      getAddressSummary,
      getCoordinates,
      getRawExcerpt,
      getPrimarySystem,
      getRecordDetailContext
    });
  }

  function getRecordDetailContext() {
    return getRecordDetailContextModel(RECORD_VIEW_STATE_KEY, qualityCriteria);
  }

  function getExternalSystemIds(raw) {
    return getExternalSystemIdsModel(raw, { qualityHelpers, getFirst, textValue });
  }

  function getAddressSummary(raw) {
    return getAddressSummaryModel(raw, textValue);
  }

  function getCoordinates(raw) {
    return getCoordinatesModel(raw, getFirst);
  }

  function getRawExcerpt(raw) {
    return getRawExcerptModel(raw, { getFirst, getTextByRel, qualityHelpers, textValue });
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
    return collectPrimarySystemsModel(rows, { getPrimarySystem });
  }

  function hidePrimarySystems() {
    if (els.primarySystemCard) els.primarySystemCard.hidden = true;
    if (els.primarySystemList) els.primarySystemList.replaceChildren();
  }

  function getSourceId(item) {
    return getSourceIdModel(item, { getFirst, textValue });
  }

  function getPrimarySystem(item) {
    return getPrimarySystemModel(item, textValue);
  }

  function getKeywordValues(item) {
    return getKeywordValuesModel(item, textValue);
  }

  function safeKeywordArray(value) {
    return safeKeywordArrayModel(value, textValue);
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
