export function resetOverviewQualityState({
  state,
  buildAggregationsFromIssueSummary,
  buildOverviewQualityMeta,
  canCalculateQualityForContext,
  types
}) {
  state.normalizedItems = [];
  state.qualityAggregations = buildAggregationsFromIssueSummary([]);
  state.qualityDataMeta = buildOverviewQualityMeta({
    canCalculateQuality: canCalculateQualityForContext(),
    selectedType: state.context.type || '',
    totalTypes: types.length
  });
}

export async function loadOverviewDataAsync({
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
}) {
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
    state.latestRows = [...state.latestRows.filter((entry) => entry.type !== row.type), row];
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
