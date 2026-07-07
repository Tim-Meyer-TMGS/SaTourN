type IssueLinkInput = {
  criterionId: string;
  affectedTypes?: string[];
};

type TaskLinkInput = {
  criterionId: string;
  criterionIds: string[];
  criteriaByType: Record<string, string>;
  affectedTypes: string[];
};

export function buildIssueRecordsUrl(issue: IssueLinkInput, contextType: string) {
  const params = new URLSearchParams();
  params.set('criterionId', issue.criterionId);
  params.set('from', 'overview');

  if (contextType) {
    params.set('type', contextType);
  } else if (issue.affectedTypes?.length) {
    params.set('types', issue.affectedTypes.join(','));
  }

  return `/records?${params.toString()}`;
}

export function buildTaskRecordsUrl(task: TaskLinkInput, contextType: string, type = '') {
  const params = new URLSearchParams();
  const selectedType = type || contextType;
  const criterionId = selectedType ? (task.criteriaByType[selectedType] || task.criterionId) : task.criterionId;

  params.set('criterionId', criterionId);
  if (task.criterionIds.length > 1) params.set('criterionIds', task.criterionIds.join(','));
  params.set('from', 'tasks');

  if (selectedType) {
    params.set('type', selectedType);
  } else if (task.affectedTypes.length) {
    params.set('types', task.affectedTypes.join(','));
  }

  return `/records?${params.toString()}`;
}

export function buildNonOpenDataRecordsUrl(fallbackTypes: string[], contextType: string) {
  const params = new URLSearchParams();
  params.set('list', 'non_open_data');
  params.set('from', 'stats');

  if (contextType) {
    params.set('type', contextType);
  } else if (fallbackTypes.length) {
    params.set('types', fallbackTypes.join(','));
  }

  return `/records?${params.toString()}`;
}

export function buildTaskAwareRecordDetailUrl(
  detailUrl: string,
  criterionId: string,
  criterionLabel: string
) {
  const url = new URL(detailUrl, 'https://satourn.local');
  url.searchParams.set('source', 'task');
  url.searchParams.set('criterion_id', criterionId);
  url.searchParams.set('criterion_label', criterionLabel);
  return `${url.pathname}${url.search}`;
}
