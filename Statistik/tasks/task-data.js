export async function loadTaskIssueSummary({
  loadId,
  isStale,
  canCalculateQuality,
  loadRegionalQualityEvaluation,
  loadQualityCountSummary,
  onUpdate = null
}) {
  if (canCalculateQuality) {
    const result = await loadRegionalQualityEvaluation({
      isStale,
      onUpdate: (aggregations, meta, items) => {
        if (isStale()) return;
        onUpdate?.({
          issueSummary: aggregations?.issueSummary || [],
          items: items || [],
          aggregations,
          meta,
          loadId
        });
      }
    });

    return {
      issueSummary: result.aggregations?.issueSummary || [],
      items: result.items || [],
      aggregations: result.aggregations,
      meta: result.meta
    };
  }

  const issueSummary = await loadQualityCountSummary({
    onUpdate: (partialIssueSummary, meta) => {
      if (isStale()) return;
      onUpdate?.({
        issueSummary: partialIssueSummary || [],
        items: [],
        aggregations: null,
        meta,
        loadId
      });
    }
  });

  return {
    issueSummary,
    items: [],
    aggregations: null,
    meta: null
  };
}

export async function loadTaskRecordRows({
  task,
  type,
  context,
  resolveTaskCriterionId,
  buildQuery,
  loadCachedQualityList,
  fetchJsonCached,
  qualityScanApiBase,
  extractItems,
  normalizeItem
}) {
  if (!task || !type) {
    return {
      criterionId: '',
      rows: [],
      payload: null
    };
  }

  const criterionId = resolveTaskCriterionId(task, type);
  if (!criterionId) {
    return {
      criterionId: '',
      rows: [],
      payload: null
    };
  }

  const params = new URLSearchParams();
  params.set('criterionId', criterionId);
  params.set('type', type);
  params.set('limit', '200');
  params.set('scanPageSize', '200');
  params.set('maxPages', '20');
  const query = buildQuery(context);
  if (query) params.set('query', query);

  const cachedPayload = await loadCachedQualityList({
    criterionId,
    type,
    query
  });
  const payload = cachedPayload || await fetchJsonCached(`${qualityScanApiBase}?${params.toString()}`);
  const rows = extractItems(payload).map((item) => normalizeItem(item, type));

  return {
    criterionId,
    rows,
    payload
  };
}
