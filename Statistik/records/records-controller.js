export function resolveTaskCriterionId(task, type = '') {
  if (!task) return '';
  if (type && task.criteriaByType?.[type]) return task.criteriaByType[type];
  return task.criterionId || task.criterionIds?.[0] || '';
}

export function openTaskRecordsOnRecordsPage({
  task,
  type,
  context,
  saveRecordViewState,
  showTaskMessage
}) {
  if (!task || !type) {
    showTaskMessage('Bitte w\u00e4hle zuerst eine konkrete Aufgabe und einen Datentyp.');
    return false;
  }

  const criterionId = resolveTaskCriterionId(task, type);
  if (!criterionId) {
    showTaskMessage('F\u00fcr diesen Datentyp konnte kein passendes Qualit\u00e4tskriterium bestimmt werden.');
    return false;
  }

  saveRecordViewState({
    criterionId,
    criterionIds: task.criterionIds || [criterionId],
    criteriaByType: task.criteriaByType || {},
    type,
    label: task.label,
    context
  });

  const params = new URLSearchParams();
  params.set('criterionId', criterionId);
  params.set('type', type);
  params.set('from', 'tasks');
  location.href = `records.html?${params.toString()}`;
  return true;
}

export function openOverviewIssueOnRecordsPage({
  issue,
  context,
  saveRecordViewState
}) {
  if (!issue?.criterionId) return false;

  const preferredType = context.type || (issue.affectedTypes?.length === 1 ? issue.affectedTypes[0] : '');
  const criterionId = resolveTaskCriterionId(issue, preferredType)
    || issue.criterionId
    || issue.criterionIds?.[0]
    || '';
  if (!criterionId) return false;

  saveRecordViewState({
    criterionId,
    criterionIds: issue.criterionIds || [criterionId],
    criteriaByType: issue.criteriaByType || {},
    type: preferredType,
    label: issue.label,
    context
  });

  const params = new URLSearchParams();
  params.set('criterionId', criterionId);
  if (preferredType) params.set('type', preferredType);
  params.set('from', 'overview');
  location.href = `records.html?${params.toString()}`;
  return true;
}

export async function loadRecordRowsForView({
  view,
  context,
  buildQuery,
  loadCachedQualityList,
  fetchQualityScan,
  extractItems,
  extractTotal,
  normalizeItem,
  evaluateAllItems
}) {
  const query = buildQuery(context);
  const cachedPayload = await loadCachedQualityList({
    criterionId: view.criterionId,
    type: view.type,
    query
  });
  const payload = cachedPayload || await fetchQualityScan({
    criterionId: view.criterionId,
    type: view.type,
    query,
    limit: 200,
    scanPageSize: 200,
    maxPages: 20
  });
  const sourceItems = extractItems(payload);
  const hasPreEvaluatedRows = sourceItems.some((item) => Array.isArray(item?.missingCriteria));
  const rows = sourceItems.map((item) => normalizeItem(item, view.type));
  const pageInfo = payload?.page || {};
  const stats = payload?.stats || {};

  return {
    rows: hasPreEvaluatedRows ? rows : evaluateAllItems(rows),
    meta: {
      mode: cachedPayload ? 'snapshot_list' : 'criterion',
      collectedItems: rows.length,
      estimatedTotalItems: Number(stats.totalMatchedItems || stats.overallcount || extractTotal(payload) || rows.length),
      truncated: !pageInfo.complete
    }
  };
}

export async function loadRecordRowsForIssueSelection({
  criterionId,
  selectedType = '',
  qualityCriteria,
  types,
  loadRecordRowsForView
}) {
  const criterion = qualityCriteria.find((entry) => entry.id === criterionId);
  if (!criterion) {
    return {
      rows: [],
      meta: { mode: 'criterion', collectedItems: 0, estimatedTotalItems: 0, truncated: false }
    };
  }

  const targetTypes = selectedType
    ? [selectedType]
    : types.filter((type) => !criterion.types?.length || criterion.types.includes(type));

  const payloads = await Promise.all(targetTypes.map((type) => loadRecordRowsForView({
    criterionId,
    type,
    label: criterion.label
  }).catch(() => ({
    rows: [],
    meta: { mode: 'criterion', collectedItems: 0, estimatedTotalItems: 0, truncated: false }
  }))));

  const rows = payloads.flatMap((entry) => entry.rows);
  return {
    rows,
    meta: {
      mode: 'criterion',
      collectedItems: rows.length,
      estimatedTotalItems: rows.length,
      truncated: payloads.some((entry) => entry.meta?.truncated)
    }
  };
}

export async function loadRecordRowsForPendingView({
  view,
  types,
  loadRecordRowsForView,
  loadRecordRowsForIssueSelection,
  mergeRecordItems
}) {
  if (!view?.criterionId) {
    return {
      rows: [],
      meta: { mode: 'criterion', collectedItems: 0, estimatedTotalItems: 0, truncated: false }
    };
  }

  if (view.type) {
    const criterionId = view.criteriaByType?.[view.type] || view.criterionId;
    return loadRecordRowsForView({
      ...view,
      criterionId,
      type: view.type
    });
  }

  const criterionIds = Array.isArray(view.criterionIds) && view.criterionIds.length
    ? view.criterionIds
    : [view.criterionId];

  if (criterionIds.length <= 1) {
    return loadRecordRowsForIssueSelection(view.criterionId, '');
  }

  const entries = Object.entries(view.criteriaByType || {})
    .filter(([type, criterionId]) => types.includes(type) && criterionIds.includes(criterionId));

  if (!entries.length) {
    return loadRecordRowsForIssueSelection(view.criterionId, '');
  }

  const payloads = await Promise.all(entries.map(async ([type, criterionId]) => {
    try {
      return await loadRecordRowsForView({
        criterionId,
        type,
        label: view.label
      });
    } catch {
      return {
        rows: [],
        meta: { mode: 'criterion', collectedItems: 0, estimatedTotalItems: 0, truncated: false }
      };
    }
  }));

  const rows = payloads.reduce((allRows, entry) => mergeRecordItems(allRows, entry.rows), []);
  return {
    rows,
    meta: {
      mode: 'criterion',
      collectedItems: rows.length,
      estimatedTotalItems: rows.length,
      truncated: payloads.some((entry) => entry.meta?.truncated)
    }
  };
}
