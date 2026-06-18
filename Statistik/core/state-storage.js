function normalizeType(value, allowedTypes = []) {
  return allowedTypes.includes(value) ? value : '';
}

export function loadStoredWorkContext(storageKey, allowedTypes, storageObject = localStorage) {
  try {
    const parsed = JSON.parse(storageObject.getItem(storageKey) || '{}');
    return {
      area: typeof parsed.area === 'string' ? parsed.area : '',
      city: typeof parsed.city === 'string' ? parsed.city : '',
      type: normalizeType(parsed.type, allowedTypes)
    };
  } catch {
    return { area: '', city: '', type: '' };
  }
}

export function saveStoredWorkContext(storageKey, context, allowedTypes, storageObject = localStorage) {
  const normalizedContext = {
    area: context?.area || '',
    city: context?.city || '',
    type: normalizeType(context?.type, allowedTypes)
  };
  storageObject.setItem(storageKey, JSON.stringify(normalizedContext));
  return normalizedContext;
}

export function saveRecordViewStateToSession(storageKey, viewState, allowedTypes, storageObject = sessionStorage) {
  try {
    storageObject.setItem(storageKey, JSON.stringify({
      criterionId: viewState.criterionId || '',
      criterionIds: Array.isArray(viewState.criterionIds) ? viewState.criterionIds.filter(Boolean) : [],
      criteriaByType: viewState.criteriaByType && typeof viewState.criteriaByType === 'object' ? viewState.criteriaByType : {},
      type: normalizeType(viewState.type, allowedTypes),
      status: viewState.status || '',
      query: viewState.query || '',
      label: viewState.label || '',
      context: {
        area: viewState.context?.area || '',
        city: viewState.context?.city || '',
        type: normalizeType(viewState.context?.type, allowedTypes)
      },
      createdAt: Date.now()
    }));
  } catch {
    // sessionStorage may be unavailable in strict privacy contexts.
  }
}

export function loadRecordViewStateFromRouteStorage(
  storageKey,
  allowedTypes,
  locationObject = location,
  storageObject = sessionStorage
) {
  const params = new URLSearchParams(locationObject.search);
  const hasRouteState = ['criterionId', 'type', 'status', 'q'].some((key) => params.has(key));
  if (!hasRouteState) return null;

  let cached = {};
  try {
    cached = JSON.parse(storageObject.getItem(storageKey) || '{}');
  } catch {
    cached = {};
  }

  return {
    criterionId: params.get('criterionId') || cached.criterionId || '',
    criterionIds: Array.isArray(cached.criterionIds) ? cached.criterionIds.filter(Boolean) : [],
    criteriaByType: cached.criteriaByType && typeof cached.criteriaByType === 'object' ? cached.criteriaByType : {},
    type: params.get('type') || cached.type || '',
    status: params.get('status') || cached.status || '',
    query: params.get('q') || cached.query || '',
    label: cached.label || '',
    context: cached.context && typeof cached.context === 'object'
      ? {
        area: cached.context.area || '',
        city: cached.context.city || '',
        type: normalizeType(cached.context.type, allowedTypes)
      }
      : null
  };
}

export function clearRecordViewStateStorage(
  storageKey,
  historyObject = history,
  locationObject = location,
  storageObject = sessionStorage,
  fallbackPath = 'records.html'
) {
  try {
    storageObject.removeItem(storageKey);
  } catch {
    // no-op
  }
  if (locationObject.search) {
    historyObject.replaceState(null, '', fallbackPath);
  }
}

export function saveRecordListStateToSession(
  storageKey,
  rows,
  { locationObject = location, storageObject = sessionStorage, buildDetailUrl }
) {
  try {
    storageObject.setItem(storageKey, JSON.stringify({
      backUrl: `records.html${locationObject.search || ''}`,
      createdAt: Date.now(),
      rows: rows.slice(0, 250).map((row) => ({
        id: row.id || '',
        globalId: row.globalId || '',
        type: row.type || '',
        title: row.title || '',
        detailUrl: row.detailUrl || buildDetailUrl(row)
      }))
    }));
  } catch {
    // sessionStorage may be unavailable or full.
  }
}

export function loadRecordListStateFromSession(storageKey, storageObject = sessionStorage) {
  try {
    const parsed = JSON.parse(storageObject.getItem(storageKey) || '{}');
    return {
      backUrl: typeof parsed.backUrl === 'string' ? parsed.backUrl : 'records.html',
      rows: Array.isArray(parsed.rows) ? parsed.rows : []
    };
  } catch {
    return { backUrl: 'records.html', rows: [] };
  }
}
