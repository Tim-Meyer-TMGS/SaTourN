export function canCalculateQualityForContext({
  context,
  canCalculateQualityForContextModel
}) {
  return canCalculateQualityForContextModel(context);
}

export function upsertStatisticRow({
  state,
  row,
  types,
  upsertStatisticRowModel
}) {
  state.latestRows = upsertStatisticRowModel(state.latestRows, row, types);
  return state.latestRows;
}

export function renderOverviewCurrent({
  state,
  renderOverview,
  options
}) {
  renderOverview(state.latestRows, state.normalizedItems, options);
}

export function resetOverviewQualityState({
  state,
  buildAggregationsFromIssueSummary,
  buildOverviewQualityMeta,
  canCalculateQualityForContext,
  types,
  resetOverviewQualityStateModel
}) {
  resetOverviewQualityStateModel({
    state,
    buildAggregationsFromIssueSummary,
    buildOverviewQualityMeta,
    canCalculateQualityForContext,
    types
  });
}

export function renderOverview({
  state,
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
}) {
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
    previousKpis = JSON.parse(localStorage.getItem(state.kpiHistoryKey) || 'null');
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
    previousKpis,
    options
  });

  saveKpiHistory(kpis);
}

export function renderOverviewLoading({
  renderOverviewLoadingState
}) {
  renderOverviewLoadingState();
}

export function renderOverviewEmpty({
  renderOverviewEmptyState
}) {
  renderOverviewEmptyState();
}
