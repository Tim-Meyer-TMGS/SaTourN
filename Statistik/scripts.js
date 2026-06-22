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
import {
  canCalculateQualityForContext as canCalculateQualityForContextBindingsModel,
  renderOverview as renderOverviewBindingsModel,
  renderOverviewCurrent as renderOverviewCurrentBindingsModel,
  renderOverviewEmpty as renderOverviewEmptyBindingsModel,
  renderOverviewLoading as renderOverviewLoadingBindingsModel,
  resetOverviewQualityState as resetOverviewQualityStateBindingsModel,
  upsertStatisticRow as upsertStatisticRowBindingsModel
} from './overview/overview-page-bindings.js';
import {
  applyStatsFiltersAndLoad as applyStatsFiltersAndLoadPageModel,
  computeStatsSummary as computeStatsSummaryPageModel,
  exportStatsCsv as exportStatsCsvPageModel,
  fillStatsFilters as fillStatsFiltersPageModel,
  loadStatsData as loadStatsDataPageModel,
  loadStatsDataAsync as loadStatsDataAsyncPageModel,
  renderStats as renderStatsPageModel,
  renderStatsEmpty as renderStatsEmptyPageModel,
  renderStatsError as renderStatsErrorPageModel,
  renderStatsLoading as renderStatsLoadingPageModel,
  resetStatsFilters as resetStatsFiltersPageModel,
  setStatsLoadingState as setStatsLoadingStatePageModel,
  showStatsMessage as showStatsMessagePageModel
} from './stats/stats-page.js';
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
  buildVerifiedEt4Url as buildVerifiedEt4UrlPageModel,
  getFirst as getFirstPageModel,
  getRecordEmail as getRecordEmailPageModel,
  getRecordPhone as getRecordPhonePageModel,
  getRecordThumbnailUrl as getRecordThumbnailUrlPageModel,
  getRecordWeb as getRecordWebPageModel,
  normalizeItem as normalizeItemPageModel,
  searchRecordsByText as searchRecordsByTextDataPageModel,
  searchSingleRecordById as searchSingleRecordByIdDataPageModel
} from './records/records-page-data.js';
import {
  applyPendingRecordView as applyPendingRecordViewPageModel,
  applyRecordFilters as applyRecordFiltersPageModel,
  buildRecordViewModel as buildRecordViewModelPageModel,
  fillRecordControls as fillRecordControlsPageModel,
  fillRecordDynamicFilters as fillRecordDynamicFiltersPageModel,
  renderPendingRecordViewMessage as renderPendingRecordViewMessagePageModel,
  renderRecordDataNote as renderRecordDataNotePageModel,
  renderRecordQuickCounts as renderRecordQuickCountsPageModel,
  renderRecordsEmpty as renderRecordsEmptyPageModel,
  renderRecordsLoading as renderRecordsLoadingPageModel,
  renderRecordStatusLegend as renderRecordStatusLegendPageModel,
  renderRecordTable as renderRecordTablePageModel
} from './records/records-page-view.js';
import {
  applyPendingRecordView as applyPendingRecordViewBindingsModel,
  applyRecordFilters as applyRecordFiltersBindingsModel,
  buildRecordViewModel as buildRecordViewModelBindingsModel,
  fillRecordControls as fillRecordControlsBindingsModel,
  fillRecordDynamicFilters as fillRecordDynamicFiltersBindingsModel,
  getRecordThumbnailUrl as getRecordThumbnailUrlBindingsModel,
  loadRecordListState as loadRecordListStateBindingsModel,
  openRecordAiSearchDialog as openRecordAiSearchDialogBindingsModel,
  renderPendingRecordViewMessage as renderPendingRecordViewMessageBindingsModel,
  renderRecordDataNote as renderRecordDataNoteBindingsModel,
  renderRecordQuickCounts as renderRecordQuickCountsBindingsModel,
  renderRecordsEmpty as renderRecordsEmptyBindingsModel,
  renderRecordsLoading as renderRecordsLoadingBindingsModel,
  renderRecordStatusLegend as renderRecordStatusLegendBindingsModel,
  renderRecordTable as renderRecordTableBindingsModel,
  saveRecordListState as saveRecordListStateBindingsModel,
  setText as setTextBindingsModel,
  showRecordsMessage as showRecordsMessageBindingsModel
} from './records/records-page-bindings.js';
import {
  fetchRecordDetailItem as fetchRecordDetailItemPageModel,
  getAddressSummary as getAddressSummaryPageModel,
  getCoordinates as getCoordinatesPageModel,
  getExternalSystemIds as getExternalSystemIdsPageModel,
  getRawExcerpt as getRawExcerptPageModel,
  getRecordDetailContext as getRecordDetailContextPageModel,
  getRecordDetailViewModel as getRecordDetailViewModelPageModel
} from './detail/record-detail-bindings.js';
import {
  buildVerifiedEt4Url as buildVerifiedEt4UrlBindingsModel,
  getAddressSummary as getAddressSummaryBindingsModel,
  getCoordinates as getCoordinatesBindingsModel,
  getExternalSystemIds as getExternalSystemIdsBindingsModel,
  getFirst as getFirstBindingsModel,
  getRawExcerpt as getRawExcerptBindingsModel,
  getRecordDetailContext as getRecordDetailContextBindingsModel,
  getRecordDetailViewModel as getRecordDetailViewModelBindingsModel,
  getRecordEmail as getRecordEmailBindingsModel,
  getRecordPhone as getRecordPhoneBindingsModel,
  getRecordWeb as getRecordWebBindingsModel,
  normalizeItem as normalizeItemBindingsModel,
  showDetailMessage as showDetailMessageBindingsModel
} from './detail/record-detail-page-bindings.js';
import {
  handleRecordAiSearchSubmit as handleRecordAiSearchSubmitModel,
  handleRecordSearchSubmit as handleRecordSearchSubmitModel,
  hideRecordAutocomplete as hideRecordAutocompleteModel,
  loadRecordAutocomplete as loadRecordAutocompleteModel,
  queueRecordAutocomplete as queueRecordAutocompleteModel,
  renderRecordAutocomplete as renderRecordAutocompleteModel
} from './records/records-actions.js';
import {
  handleRecordAiSearchSubmit as handleRecordAiSearchSubmitPageModel,
  handleRecordMailDraft as handleRecordMailDraftPageModel,
  handleRecordSearchSubmit as handleRecordSearchSubmitPageModel,
  hideRecordAutocomplete as hideRecordAutocompletePageModel,
  loadRecordAutocomplete as loadRecordAutocompletePageModel,
  openRecordAiSearchDialog as openRecordAiSearchDialogPageModel,
  queueRecordAutocomplete as queueRecordAutocompletePageModel,
  renderRecordAutocomplete as renderRecordAutocompletePageModel
} from './records/records-page-interactions.js';
import {
  handleRecordAiSearchSubmit as handleRecordAiSearchSubmitBindingsModel,
  handleRecordMailDraft as handleRecordMailDraftBindingsModel,
  handleRecordSearchSubmit as handleRecordSearchSubmitBindingsModel,
  hideRecordAutocomplete as hideRecordAutocompleteBindingsModel,
  loadRecordAutocomplete as loadRecordAutocompleteBindingsModel,
  queueRecordAutocomplete as queueRecordAutocompleteBindingsModel,
  renderRecordAutocomplete as renderRecordAutocompleteBindingsModel,
  searchRecordsByText as searchRecordsByTextBindingsModel,
  searchSingleRecordById as searchSingleRecordByIdBindingsModel
} from './records/records-page-search-bindings.js';
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
  changeTaskPage as changeTaskPageBindingsModel,
  clearTaskRecords as clearTaskRecordsBindingsModel,
  fillTaskTypeFilter as fillTaskTypeFilterBindingsModel,
  openOverviewIssueOnRecordsPage as openOverviewIssueOnRecordsPageBindingsModel,
  openTaskRecordsOnRecordsPage as openTaskRecordsOnRecordsPageBindingsModel,
  renderTaskDetail as renderTaskDetailBindingsModel,
  renderTaskKpis as renderTaskKpisBindingsModel,
  renderTaskRecords as renderTaskRecordsBindingsModel,
  renderTasksEmpty as renderTasksEmptyBindingsModel,
  renderTasksLoading as renderTasksLoadingBindingsModel,
  renderTaskTable as renderTaskTableBindingsModel,
  resetTaskFilters as resetTaskFiltersBindingsModel,
  resolveTaskCriterionId as resolveTaskCriterionIdBindingsModel,
  selectTask as selectTaskBindingsModel,
  showTaskMessage as showTaskMessageBindingsModel
} from './tasks/task-page-bindings.js';
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
  interceptQuickAiConsent as interceptQuickAiConsentModel,
  isAbortLikeError as isAbortLikeErrorModel,
  loadConsentState as loadConsentStateModel,
  openConsentDialog as openConsentDialogModel,
  readConsentFormState,
  saveConsentState as saveConsentStateModel,
  syncConsentControls as syncConsentControlsModel
} from './core/runtime-helpers.js';
import { renderHelpPage as renderHelpPageModel } from './help/help-page.js';
import {
  handleConsentSubmit as handleConsentSubmitPageModel,
  interceptQuickAiConsent as interceptQuickAiConsentPageModel,
  loadConsentState as loadConsentStatePageModel,
  openConsentDialog as openConsentDialogPageModel,
  saveConsentState as saveConsentStatePageModel,
  syncConsentControls as syncConsentControlsPageModel
} from './core/consent-ui.js';
import {
  contextAreaLabel as contextAreaLabelModel,
  fillContextControls as fillContextControlsModel,
  initSharedShell as initSharedShellModel,
  initializePage as initializePageModel,
  openContextDialog as openContextDialogModel,
  renderWorkContext as renderWorkContextModel
} from './core/page-shell.js';
import {
  initSharedShell as initSharedShellPageModel,
  initializePage as initializePagePageModel
} from './core/page-bootstrap.js';
import {
  initHelp as initHelpPageModel,
  initOverview as initOverviewPageModel,
  initRecordDetail as initRecordDetailPageModel,
  initRecords as initRecordsPageModel,
  initStats as initStatsPageModel,
  initTasks as initTasksPageModel
} from './core/page-initializers.js';
import {
  clearRecordViewState as clearRecordViewStatePageModel,
  fillContextControls as fillContextControlsPageModel,
  handleContextSubmit as handleContextSubmitPageModel,
  loadRecordViewStateFromRoute as loadRecordViewStateFromRoutePageModel,
  loadWorkContext as loadWorkContextPageModel,
  openContextDialog as openContextDialogPageModel,
  renderWorkContext as renderWorkContextPageModel,
  saveRecordViewState as saveRecordViewStatePageModel,
  saveWorkContext as saveWorkContextPageModel
} from './core/context-shell-controller.js';
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
import {
  loadRecordListState as loadRecordListStatePageModel,
  saveRecordListState as saveRecordListStatePageModel,
  setRecordCount as setRecordCountPageModel,
  showDetailMessage as showDetailMessagePageModel,
  showRecordsMessage as showRecordsMessagePageModel
} from './records/records-page-state.js';
import {
  hidePrimarySystems as hidePrimarySystemsPageModel,
  renderPrimarySystemLogo as renderPrimarySystemLogoPageModel,
  renderPrimarySystemsForRecords as renderPrimarySystemsForRecordsPageModel,
  renderPrimarySystemsForTask as renderPrimarySystemsForTaskPageModel
} from './core/source-systems-ui.js';
import {
  collectPrimarySystems as collectPrimarySystemsBindingsModel,
  exportTaskRecordsCsv as exportTaskRecordsCsvBindingsModel,
  getKeywordValues as getKeywordValuesBindingsModel,
  getPrimarySystem as getPrimarySystemBindingsModel,
  getSourceId as getSourceIdBindingsModel,
  hidePrimarySystems as hidePrimarySystemsBindingsModel,
  renderPrimarySystemLogo as renderPrimarySystemLogoBindingsModel,
  renderPrimarySystemsForRecords as renderPrimarySystemsForRecordsBindingsModel,
  renderPrimarySystemsForTask as renderPrimarySystemsForTaskBindingsModel,
  safeKeywordArray as safeKeywordArrayBindingsModel
} from './core/source-systems-page-bindings.js';
import { getTaskFamilyId, getTaskFamilyMeta } from './tasks/task-families.js';
import {
  openOverviewIssueOnRecordsPage as openOverviewIssueOnRecordsPagePageModel,
  openTaskRecordsOnRecordsPage as openTaskRecordsOnRecordsPagePageModel,
  resolveTaskCriterionId as resolveTaskCriterionIdPageModel
} from './tasks/task-record-links.js';
import {
  loadRecordRowsForIssueSelection as loadRecordRowsForIssueSelectionPageModel,
  loadRecordRowsForPendingView as loadRecordRowsForPendingViewPageModel,
  loadRecordRowsForView as loadRecordRowsForViewPageModel
} from './records/records-page-queries.js';
import {
  collectPrimarySystems as collectPrimarySystemsPageModel,
  getKeywordValues as getKeywordValuesPageModel,
  getPrimarySystem as getPrimarySystemPageModel,
  getSourceId as getSourceIdPageModel,
  safeKeywordArray as safeKeywordArrayPageModel
} from './core/source-systems-bindings.js';

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
  let consentState = loadConsentStatePageModel({
    consentStorageKey: CONSENT_STORAGE_KEY,
    runtimeConfig: RUNTIME_CONFIG,
    loadConsentStateModel
  });
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
  initializePagePageModel({
    page,
    initOverview,
    initTasks,
    initRecords,
    initRecordDetail,
    initStats,
    initHelp,
    initializePageModel
  });

  function initSharedShell() {
    initSharedShellPageModel({
      els,
      fillContextControls,
      renderWorkContext,
      syncConsentControls,
      openContextDialog,
      handleContextSubmit,
      openConsentDialog,
      handleConsentSubmit,
      markForceFresh,
      initSharedShellModel
    });
  }

  function initOverview() {
    initOverviewPageModel({
      els,
      clearTransientRequestCache,
      loadOverviewDataAsync,
      renderOverviewLoading,
      exportOverviewCsv,
      interceptQuickAiConsent,
      showMessage
    });
  }

  function initTasks() {
    initTasksPageModel({
      els,
      state,
      locationObject: location,
      fillTaskTypeFilter,
      renderTasksLoading,
      loadTasksData,
      applyTaskFilters,
      resetTaskFilters,
      changeTaskPage,
      exportTaskRecordsCsv
    });
  }

  function initRecords() {
    initRecordsPageModel({
      els,
      state,
      documentObject: document,
      fillRecordControls,
      renderRecordsLoading,
      loadRecordsData,
      openRecordAiSearchDialog,
      handleRecordAiSearchSubmit,
      applyRecordFilters,
      queueRecordAutocomplete,
      hideRecordAutocomplete,
      handleRecordSearchSubmit,
      resetRecordFilters,
      renderRecordTable,
      changeRecordPage,
      exportRecordListCsv,
      applyQuickRecordFilter
    });
  }

  function initRecordDetail() {
    initRecordDetailPageModel({
      els,
      state,
      locationObject: location,
      loadRecordDetail,
      copyText
    });
  }

  function initStats() {
    initStatsPageModel({
      els,
      fillStatsFilters,
      renderStatsLoading,
      loadStatsDataAsync,
      markForceFresh,
      applyStatsFiltersAndLoad,
      exportStatsCsv,
      resetStatsFilters
    });
  }

  function initHelp() {
    initHelpPageModel({
      els,
      types: TYPES,
      qualityCriteria,
      qualityHelpers,
      escapeHtml,
      formatNumber,
      priorityRank,
      renderHelpPageModel
    });
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

  function syncConsentControls() {
    syncConsentControlsPageModel({
      els,
      consentState,
      syncConsentControlsModel
    });
  }

  function openConsentDialog() {
    openConsentDialogPageModel({
      els,
      syncConsentControls,
      openConsentDialogModel
    });
  }

  function handleConsentSubmit(event) {
    consentState = handleConsentSubmitPageModel({
      event,
      els,
      consentState,
      readConsentFormState,
      saveConsentState: (nextState) => saveConsentStatePageModel({
        consentState: nextState,
        consentStorageKey: CONSENT_STORAGE_KEY,
        saveConsentStateModel
      }),
      onSaved: (nextState) => {
        consentState = nextState;
      }
    });
  }

  function interceptQuickAiConsent(event) {
    interceptQuickAiConsentPageModel({
      consentState,
      event,
      showMessage,
      interceptQuickAiConsentModel
    });
  }

  function loadWorkContext() {
    return loadWorkContextPageModel({
      workContextKey: WORK_CONTEXT_KEY,
      types: TYPES,
      loadStoredWorkContext
    });
  }

  function saveWorkContext(context) {
    return saveWorkContextPageModel({
      state,
      context,
      workContextKey: WORK_CONTEXT_KEY,
      types: TYPES,
      saveStoredWorkContext,
      renderWorkContext
    });
  }

  function saveRecordViewState(viewState) {
    saveRecordViewStatePageModel({
      recordViewStateKey: RECORD_VIEW_STATE_KEY,
      viewState,
      types: TYPES,
      saveRecordViewStateToSession
    });
  }

  function loadRecordViewStateFromRoute() {
    return loadRecordViewStateFromRoutePageModel({
      recordViewStateKey: RECORD_VIEW_STATE_KEY,
      types: TYPES,
      loadRecordViewStateFromRouteStorage
    });
  }

  function clearRecordViewState() {
    clearRecordViewStatePageModel({
      recordViewStateKey: RECORD_VIEW_STATE_KEY,
      clearRecordViewStateStorage
    });
  }

  function fillContextControls() {
    fillContextControlsPageModel({
      els,
      areas: AREAS,
      types: TYPES,
      fillContextControlsModel
    });
  }

  function renderWorkContext() {
    renderWorkContextPageModel({
      els,
      context: state.context,
      areas: AREAS,
      renderWorkContextModel
    });
  }

  function openContextDialog() {
    openContextDialogPageModel({
      els,
      context: state.context,
      fillContextControls,
      openContextDialogModel
    });
  }

  function handleContextSubmit(event) {
    handleContextSubmitPageModel({
      event,
      els,
      page,
      state,
      clearTransientRequestCache,
      markForceFresh,
      saveWorkContext,
      fillStatsFilters,
      loadOverviewDataAsync,
      loadTasksData,
      loadRecordsData,
      loadRecordDetail,
      loadStatsDataAsync
    });
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
    return canCalculateQualityForContextBindingsModel({
      context,
      canCalculateQualityForContextModel
    });
  }

  function upsertStatisticRow(row) {
    return upsertStatisticRowBindingsModel({
      state,
      row,
      types: TYPES,
      upsertStatisticRowModel
    });
  }

  function renderOverviewCurrent(options = {}) {
    renderOverviewCurrentBindingsModel({
      state,
      renderOverview,
      options
    });
  }

  function resetOverviewQualityState() {
    resetOverviewQualityStateBindingsModel({
      state,
      buildAggregationsFromIssueSummary,
      buildOverviewQualityMeta,
      canCalculateQualityForContext,
      types: TYPES,
      resetOverviewQualityStateModel
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
    fillStatsFiltersPageModel({
      els,
      areas: AREAS,
      types: TYPES,
      context: state.context
    });
  }

  async function loadStatsData() {
    return loadStatsDataPageModel({
      state,
      els,
      formatDateTime,
      percent,
      showStatsMessage,
      renderStatsLoading,
      setStatsLoadingState,
      loadCachedQualitySnapshot,
      loadStatisticRows,
      computeStatsSummary,
      renderStats,
      renderStatsError
    });
  }

  async function loadStatsDataAsync() {
    return loadStatsDataAsyncPageModel({
      state,
      els,
      formatDateTime,
      percent,
      showStatsMessage,
      renderStatsLoading,
      setStatsLoadingState,
      loadStatisticRowsIncremental,
      computeStatsSummary,
      renderStats,
      renderStatsError
    });
  }

  function computeStatsSummary(rows) {
    return computeStatsSummaryPageModel(rows, percent);
  }

  function renderStats() {
    renderStatsPageModel({
      els,
      state,
      computeStatsSummary,
      renderStatsEmpty,
      escapeHtml,
      formatNumber,
      formatPercent,
      percent
    });
  }

  function renderStatsLoading() {
    renderStatsLoadingPageModel({ els });
  }

  function renderStatsEmpty(message) {
    renderStatsEmptyPageModel({ els, message, showStatsMessage });
  }

  function renderStatsError() {
    renderStatsErrorPageModel({ els, showStatsMessage });
  }

  function showStatsMessage(message) {
    showStatsMessagePageModel(els, message);
  }

  function setStatsLoadingState(isLoading) {
    setStatsLoadingStatePageModel({ els, isLoading });
  }

  function resetStatsFilters() {
    resetStatsFiltersPageModel({
      saveWorkContext,
      fillStatsFilters,
      loadStatsDataAsync
    });
  }

  function applyStatsFiltersAndLoad() {
    applyStatsFiltersAndLoadPageModel({
      els,
      saveWorkContext,
      fillStatsFilters,
      loadStatsDataAsync
    });
  }

  function exportStatsCsv() {
    exportStatsCsvPageModel({
      state,
      csvValue,
      formatPercent,
      downloadText
    });
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
    state.filteredTaskRows = tasks;
    renderTaskKpisBindingsModel({
      els,
      state,
      computeTaskSummary,
      formatNumber,
      formatPercent,
      percent
    });
  }

  function renderTaskTable() {
    renderTaskTableBindingsModel({
      state,
      els,
      taskIcon,
      priorityLabel,
      renderTypeChips,
      impactBadgeClass,
      impactLabel,
      formatNumber,
      escapeHtml,
      selectTask,
      renderTaskTableState
    });
  }

  function selectTask(taskId) {
    selectTaskBindingsModel({
      taskId,
      state,
      findTaskById,
      clearTaskRecords,
      renderTaskTable,
      renderTaskDetail
    });
  }

  function renderTaskDetail() {
    renderTaskDetailBindingsModel({
      state,
      els,
      escapeHtml,
      renderTypeChips,
      impactBadgeClass,
      impactLabel,
      taskImpactText,
      clearTaskRecords,
      openTaskRecordsOnRecordsPage,
      hidePrimarySystems,
      renderPrimarySystemsForTask,
      renderTaskDetailState
    });
  }

  function openTaskRecordsOnRecordsPage(task, type) {
    openTaskRecordsOnRecordsPageBindingsModel({
      task,
      type,
      context: state.context,
      saveRecordViewState,
      showTaskMessage,
      openTaskRecordsOnRecordsPageModel,
      openTaskRecordsOnRecordsPagePageModel
    });
  }

  function resolveTaskCriterionId(task, type = '') {
    return resolveTaskCriterionIdBindingsModel({
      task,
      type,
      resolveTaskCriterionIdModel,
      resolveTaskCriterionIdPageModel
    });
  }

  function openOverviewIssueOnRecordsPage(issue) {
    openOverviewIssueOnRecordsPageBindingsModel({
      issue,
      context: state.context,
      saveRecordViewState,
      openOverviewIssueOnRecordsPageModel,
      openOverviewIssueOnRecordsPagePageModel
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
    renderTaskRecordsBindingsModel({
      els,
      task,
      type,
      rows,
      payload,
      formatNumber,
      escapeHtml,
      buildRecordDetailUrl,
      copyText,
      renderTaskRecordsState
    });
  }

  function renderTasksLoading() {
    renderTasksLoadingBindingsModel({ els, renderTasksLoadingState });
  }

  function renderTasksEmpty(message) {
    renderTasksEmptyBindingsModel({ els, message, renderTasksEmptyState });
  }

  function resetTaskFilters() {
    resetTaskFiltersBindingsModel({
      els,
      state,
      applyTaskFilters
    });
  }

  function changeTaskPage(delta) {
    changeTaskPageBindingsModel({
      state,
      delta,
      renderTaskTable
    });
  }

  function fillTaskTypeFilter() {
    fillTaskTypeFilterBindingsModel({
      els,
      types: TYPES
    });
  }

  function clearTaskRecords() {
    clearTaskRecordsBindingsModel({
      state,
      els,
      clearTaskRecordsState
    });
  }

  function showTaskMessage(message) {
    showTaskMessageBindingsModel({
      els,
      message,
      showTaskMessageState
    });
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
    return loadRecordRowsForPendingViewPageModel({
      view,
      types: TYPES,
      mergeRecordItems,
      loadRecordRowsForView,
      loadRecordRowsForIssueSelection,
      loadRecordRowsForPendingViewModel
    });
  }

  async function loadRecordRowsForIssueSelection(criterionId, selectedType = '') {
    return loadRecordRowsForIssueSelectionPageModel({
      criterionId,
      selectedType,
      qualityCriteria,
      types: TYPES,
      loadRecordRowsForView,
      loadRecordRowsForIssueSelectionModel
    });
  }

  async function loadRecordRowsForView(view) {
    return loadRecordRowsForViewPageModel({
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
      }),
      loadRecordRowsForViewModel
    });
  }

  function buildRecordViewModel(item) {
    return buildRecordViewModelBindingsModel({
      item,
      extractId,
      getFirst,
      getRecordEmail,
      getRecordWeb,
      buildVerifiedEt4Url,
      getPrimaryIssueId,
      qualityCriteria,
      priorityRank,
      getRecordThumbnailUrl,
      buildRecordViewModelModel
    });
  }

  function fillRecordControls() {
    fillRecordControlsBindingsModel({
      els,
      types: TYPES,
      qualityCriteria,
      isActiveCriterion,
      fillRecordControlsPageModel
    });
  }

  function fillRecordDynamicFilters() {
    fillRecordDynamicFiltersBindingsModel({
      els,
      rows: state.recordRows,
      fillRecordDynamicFiltersState,
      fillRecordDynamicFiltersPageModel
    });
  }

  function applyPendingRecordView() {
    applyPendingRecordViewBindingsModel({
      els,
      state,
      types: TYPES,
      applyPendingRecordViewState,
      applyPendingRecordViewPageModel
    });
  }

  function renderPendingRecordViewMessage() {
    renderPendingRecordViewMessageBindingsModel({
      state,
      qualityCriteria,
      buildPendingRecordViewMessage,
      showRecordsMessage,
      renderPendingRecordViewMessageState,
      renderPendingRecordViewMessagePageModel
    });
  }

  function applyRecordFilters() {
    applyRecordFiltersBindingsModel({
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
      renderPendingRecordViewMessage,
      applyRecordFiltersState,
      applyRecordFiltersPageModel
    });
  }

  function openRecordAiSearchDialog() {
    openRecordAiSearchDialogBindingsModel({
      dialog: els.recordAiSearchDialog,
      input: els.recordAiSearchInput,
      note: els.recordAiSearchNote,
      prompt: state.recordAiSearchPrompt,
      openRecordAiSearchDialogUi,
      openRecordAiSearchDialogPageModel
    });
  }

  async function handleRecordAiSearchSubmit(event) {
    await handleRecordAiSearchSubmitBindingsModel({
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
      contextAreaLabel: () => contextAreaLabelModel(state.context.area, AREAS),
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
      }),
      handleRecordAiSearchSubmitModel,
      handleRecordAiSearchSubmitPageModel
    });
  }

  async function handleRecordSearchSubmit() {
    await handleRecordSearchSubmitBindingsModel({
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
      showRecordsMessage,
      handleRecordSearchSubmitModel,
      handleRecordSearchSubmitPageModel
    });
  }

  async function handleRecordMailDraft(row, triggerNode) {
    await handleRecordMailDraftBindingsModel({
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
      }),
      handleRecordMailDraftModel,
      handleRecordMailDraftPageModel
    });
  }

  async function searchSingleRecordById(query) {
    return searchSingleRecordByIdBindingsModel({
      query,
      context: state.context,
      selectedType: state.context.type || '',
      types: TYPES,
      buildQuery,
      cleanQueryValue,
      buildUrl,
      fetchJsonCached,
      extractItems,
      normalizeItem,
      searchSingleRecordByIdModel,
      searchSingleRecordByIdDataPageModel
    });
  }

  async function searchRecordsByText(query) {
    return searchRecordsByTextBindingsModel({
      query,
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
      onTypeError: (type, error) => console.warn('Volltextsuche konnte nicht für Typ geladen werden.', type, error),
      searchRecordsByTextModel,
      searchRecordsByTextDataPageModel
    });
  }

  function queueRecordAutocomplete() {
    queueRecordAutocompleteBindingsModel({
      state,
      els,
      looksLikeRecordId,
      hideRecordAutocomplete,
      loadRecordAutocomplete,
      queueRecordAutocompleteModel,
      queueRecordAutocompletePageModel
    });
  }

  async function loadRecordAutocomplete(query) {
    await loadRecordAutocompleteBindingsModel({
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
      }),
      loadRecordAutocompleteModel,
      loadRecordAutocompletePageModel
    });
  }

  function renderRecordAutocomplete(suggestions) {
    renderRecordAutocompleteBindingsModel({
      suggestions,
      els,
      escapeHtml,
      formatNumber,
      hideRecordAutocomplete,
      onSubmitSuggestion: handleRecordSearchSubmit,
      renderRecordAutocompleteModel,
      renderRecordAutocompletePageModel
    });
  }

  function hideRecordAutocomplete() {
    hideRecordAutocompleteBindingsModel({
      state,
      els,
      hideRecordAutocompleteModel,
      hideRecordAutocompletePageModel
    });
  }

  function renderRecordTable() {
    renderRecordTableBindingsModel({
      state,
      els,
      escapeHtml,
      formatNumber,
      formatRecordDate,
      onMailDraft: handleRecordMailDraft,
      saveRecordListState,
      renderRecordTableState,
      renderRecordTablePageModel
    });
  }

  function saveRecordListState(rows) {
    saveRecordListStateBindingsModel({
      rows,
      storageKey: RECORD_LIST_STATE_KEY,
      buildDetailUrl: buildRecordDetailUrl,
      saveRecordListStateToSession,
      saveRecordListStatePageModel
    });
  }

  function loadRecordListState() {
    return loadRecordListStateBindingsModel({
      storageKey: RECORD_LIST_STATE_KEY,
      loadRecordListStateFromSession,
      loadRecordListStatePageModel
    });
  }

  function renderRecordsLoading() {
    renderRecordsLoadingBindingsModel({
      els,
      renderRecordsLoadingState,
      renderRecordsLoadingPageModel
    });
  }

  function renderRecordsEmpty(message) {
    renderRecordsEmptyBindingsModel({
      els,
      message,
      showRecordsMessage,
      renderRecordsEmptyState,
      renderRecordsEmptyPageModel
    });
  }

  function renderRecordQuickCounts() {
    renderRecordQuickCountsBindingsModel({
      els,
      rows: state.recordRows,
      mode: state.recordDataMeta.mode,
      setText,
      renderRecordQuickCountsState,
      renderRecordQuickCountsPageModel
    });
  }

  function renderRecordStatusLegend() {
    renderRecordStatusLegendBindingsModel({
      els,
      rows: state.filteredRecordRows,
      mode: state.recordDataMeta.mode,
      setText,
      renderRecordStatusLegendState,
      renderRecordStatusLegendPageModel
    });
  }

  function renderRecordDataNote() {
    renderRecordDataNoteBindingsModel({
      els,
      recordDataMeta: state.recordDataMeta,
      renderRecordDataNoteState,
      renderRecordDataNotePageModel
    });
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
    return getRecordThumbnailUrlBindingsModel({
      item,
      qualityHelpers,
      getFirst,
      getRecordThumbnailUrlModel,
      getRecordThumbnailUrlPageModel
    });
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
    showRecordsMessageBindingsModel({
      els,
      message,
      showRecordsMessageState,
      showRecordsMessagePageModel
    });
  }

  function setText(node, value) {
    setTextBindingsModel({
      node,
      value,
      formatNumber,
      setRecordCountText,
      setRecordCountPageModel
    });
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
    const identifier = String(globalId || id || '').trim();

    if (identifier) {
      try {
        const resolvedPayload = await resolveRecordsByIds({
          apiBase: RECORDS_BY_GLOBAL_IDS_API_BASE,
          fetchJson: fetchJsonCached,
          ids: [identifier],
          type
        });
        const resolvedItems = Array.isArray(resolvedPayload?.items) ? resolvedPayload.items : [];
        const resolvedEntry = resolvedItems[0];

        if (resolvedEntry) {
          if (resolvedEntry && typeof resolvedEntry === 'object' && 'raw' in resolvedEntry) {
            return resolvedEntry.raw || resolvedEntry;
          }
          return resolvedEntry;
        }
      } catch (error) {
        console.warn('Direkte Datensatz-Auflösung für Detailseite fehlgeschlagen. Fallback auf Search-Lookup.', error);
      }
    }

    return fetchRecordDetailItemPageModel({
      type,
      id,
      globalId,
      types: TYPES,
      cleanQueryValue,
      getIdFromGlobalId,
      uniqueValues,
      buildUrl,
      fetchJsonCached,
      extractItems,
      extractId,
      getFirst,
      fetchRecordDetailItemModel
    });
  }

  function getRecordDetailViewModel(item) {
    return getRecordDetailViewModelBindingsModel({
      item,
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
      getRecordDetailContext,
      getRecordDetailViewModelModel,
      getRecordDetailViewModelPageModel
    });
  }

  function getRecordDetailContext() {
    return getRecordDetailContextBindingsModel({
      storageKey: RECORD_VIEW_STATE_KEY,
      qualityCriteria,
      getRecordDetailContextModel,
      getRecordDetailContextPageModel
    });
  }

  function getExternalSystemIds(raw) {
    return getExternalSystemIdsBindingsModel({
      raw,
      qualityHelpers,
      getFirst,
      textValue,
      getExternalSystemIdsModel,
      getExternalSystemIdsPageModel
    });
  }

  function getAddressSummary(raw) {
    return getAddressSummaryBindingsModel({
      raw,
      textValue,
      getAddressSummaryModel,
      getAddressSummaryPageModel
    });
  }

  function getCoordinates(raw) {
    return getCoordinatesBindingsModel({
      raw,
      getFirst,
      getCoordinatesModel,
      getCoordinatesPageModel
    });
  }

  function getRawExcerpt(raw) {
    return getRawExcerptBindingsModel({
      raw,
      getFirst,
      getTextByRel,
      qualityHelpers,
      textValue,
      getRawExcerptModel,
      getRawExcerptPageModel
    });
  }

  function showDetailMessage(message) {
    showDetailMessageBindingsModel({
      els,
      message,
      showDetailMessagePageModel
    });
  }

  function buildVerifiedEt4Url(item) {
    return buildVerifiedEt4UrlBindingsModel({
      item,
      buildVerifiedEt4UrlModel,
      buildVerifiedEt4UrlPageModel
    });
  }

  function normalizeItem(raw, fallbackType) {
    return normalizeItemBindingsModel({
      raw,
      fallbackType,
      extractId,
      qualityHelpers,
      textValue,
      context: state.context,
      normalizeItemModel,
      normalizeItemPageModel
    });
  }

  function getFirst(obj, paths) {
    return getFirstBindingsModel({
      obj,
      paths,
      qualityHelpers,
      textValue,
      getFirstModel,
      getFirstPageModel
    });
  }

  function getRecordEmail(raw) {
    return getRecordEmailBindingsModel({
      raw,
      qualityHelpers,
      textValue,
      getRecordEmailModel,
      getRecordEmailPageModel
    });
  }

  function getRecordWeb(raw) {
    return getRecordWebBindingsModel({
      raw,
      qualityHelpers,
      textValue,
      getRecordWebModel,
      getRecordWebPageModel
    });
  }

  function getRecordPhone(raw) {
    return getRecordPhoneBindingsModel({
      raw,
      qualityHelpers,
      textValue,
      getRecordPhoneModel,
      getRecordPhonePageModel
    });
  }

  function renderOverview(rows, items, options = {}) {
    renderOverviewBindingsModel({
      state: { ...state, kpiHistoryKey: KPI_HISTORY_KEY },
      els,
      rows,
      items,
      options,
      computeOverviewSummary,
      sumStatusCounts,
      buildTaskRows,
      impactRank,
      priorityRank,
      formatNumber,
      formatPercent,
      percent,
      taskIcon,
      taskDescription,
      openOverviewIssueOnRecordsPage,
      renderOverviewPage,
      saveKpiHistory
    });
  }

  function renderOverviewLoading() {
    renderOverviewLoadingBindingsModel({
      renderOverviewLoadingState: () => renderOverviewLoadingState(els)
    });
  }

  function renderOverviewEmpty() {
    renderOverviewEmptyBindingsModel({
      renderOverviewEmptyState: () => renderOverviewEmptyState(els)
    });
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
    renderPrimarySystemsForTaskBindingsModel({
      task,
      taskItems: state.taskItems,
      renderPrimarySystemsForRecords,
      renderPrimarySystemsForTaskPageModel
    });
  }

  function renderPrimarySystemsForRecords(rows) {
    renderPrimarySystemsForRecordsBindingsModel({
      rows,
      els,
      collectPrimarySystems,
      renderPrimarySystemLogo,
      escapeHtml,
      formatNumber,
      getPrimarySystem,
      getSourceId,
      exportTaskRecordsCsv,
      copyText,
      hidePrimarySystems,
      renderPrimarySystemsForRecordsPageModel
    });
  }

  function renderPrimarySystemLogo(system) {
    return renderPrimarySystemLogoBindingsModel({
      system,
      escapeHtml,
      renderPrimarySystemLogoPageModel
    });
  }

  function collectPrimarySystems(rows) {
    return collectPrimarySystemsBindingsModel({
      rows,
      getPrimarySystem,
      collectPrimarySystemsModel,
      collectPrimarySystemsPageModel
    });
  }

  function hidePrimarySystems() {
    hidePrimarySystemsBindingsModel({
      els,
      hidePrimarySystemsPageModel
    });
  }

  function getSourceId(item) {
    return getSourceIdBindingsModel({
      item,
      getFirst,
      textValue,
      getSourceIdModel,
      getSourceIdPageModel
    });
  }

  function getPrimarySystem(item) {
    return getPrimarySystemBindingsModel({
      item,
      textValue,
      getPrimarySystemModel,
      getPrimarySystemPageModel
    });
  }

  function getKeywordValues(item) {
    return getKeywordValuesBindingsModel({
      item,
      textValue,
      getKeywordValuesModel,
      getKeywordValuesPageModel
    });
  }

  function safeKeywordArray(value) {
    return safeKeywordArrayBindingsModel({
      value,
      textValue,
      safeKeywordArrayModel,
      safeKeywordArrayPageModel
    });
  }

  function exportTaskRecordsCsv(forcedRows = null) {
    exportTaskRecordsCsvBindingsModel({
      state,
      forcedRows,
      getSourceId,
      csvValue,
      downloadText
    });
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
