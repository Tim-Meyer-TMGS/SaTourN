function isOpenDataRelevantCriterion(criterionId) {
  return ['license_missing', 'image_author_missing'].includes(criterionId);
}

function computeTaskImpact(task, openDataRelevant) {
  if (task.priority === 'hoch' && openDataRelevant && task.affectedCount >= 5) return 'sehr_hoch';
  if (task.priority === 'hoch') return 'hoch';
  if (task.priority === 'mittel') return 'mittel';
  return 'niedrig';
}

export function impactRank(impact) {
  return { sehr_hoch: 4, hoch: 3, mittel: 2, niedrig: 1 }[impact] || 0;
}

export function priorityLabel(priority) {
  if (priority === 'hoch') return 'Kritisch';
  if (priority === 'mittel') return 'Prüfen';
  return 'Niedrig';
}

export function impactLabel(impact) {
  return {
    sehr_hoch: 'Sehr hoch',
    hoch: 'Hoch',
    mittel: 'Mittel',
    niedrig: 'Niedrig'
  }[impact] || 'Nicht bewertet';
}

export function impactBadgeClass(impact) {
  if (impact === 'sehr_hoch') return 'critical';
  if (impact === 'hoch') return 'review';
  if (impact === 'mittel') return 'medium';
  return 'good';
}

export function computePotential(tasks) {
  if (tasks.some((task) => task.impact === 'sehr_hoch')) return 'Sehr hoch';
  if (tasks.some((task) => task.impact === 'hoch')) return 'Hoch';
  if (tasks.some((task) => task.impact === 'mittel')) return 'Mittel';
  if (tasks.length) return 'Niedrig';
  return '-';
}

export function groupIssueSummaryForTasks(issueSummary = [], helpers) {
  const {
    getTaskFamilyId,
    getTaskFamilyMeta,
    priorityRank
  } = helpers;
  const groups = new Map();

  issueSummary.forEach((issue) => {
    if (!issue?.criterionId) return;
    const taskFamily = getTaskFamilyId(issue.criterionId);
    const familyMeta = getTaskFamilyMeta({ taskFamily, criterionId: issue.criterionId });
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

export function buildTaskRows(issueSummary, helpers) {
  const {
    qualityCriteria,
    getTaskFamilyMeta,
    isActiveCriterion,
    priorityRank,
    taskDescription,
    taskProblem
  } = helpers;

  return groupIssueSummaryForTasks(issueSummary, helpers)
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

export function filterTaskRows(taskRows, filters) {
  const {
    query = '',
    priority = '',
    type = '',
    check = '',
    impact = ''
  } = filters;
  const needle = String(query || '').trim().toLowerCase();

  return taskRows.filter((task) => {
    const text = `${task.label} ${task.description} ${task.recommendation}`.toLowerCase();
    if (needle && !text.includes(needle)) return false;
    if (priority && task.priority !== priority) return false;
    if (type && !task.affectedTypes.includes(type)) return false;
    if (check === 'auto' && task.autoCheck === false) return false;
    if (check === 'manual' && task.autoCheck !== false) return false;
    if (impact && task.impact !== impact) return false;
    return true;
  });
}

export function taskMatchesIdentifier(task, identifier) {
  if (!task || !identifier) return false;
  return task.taskId === identifier
    || task.criterionId === identifier
    || task.criterionIds?.includes(identifier);
}

export function findTaskById(tasks, identifier) {
  return tasks.find((task) => taskMatchesIdentifier(task, identifier)) || null;
}

export function resolveTaskTypeByCriterionId(task, criterionId) {
  if (!task || !criterionId || !task.criteriaByType) return '';
  return Object.entries(task.criteriaByType).find(([, id]) => id === criterionId)?.[0] || '';
}

export function computeTaskSummary(tasks) {
  const totalTasks = tasks.length;
  const highTasks = tasks.filter((task) => task.priority === 'hoch').length;
  const affectedHits = tasks.reduce((sum, task) => sum + task.affectedCount, 0);
  const openDataHits = tasks
    .filter((task) => task.openDataRelevant)
    .reduce((sum, task) => sum + task.affectedCount, 0);

  return {
    totalTasks,
    highTasks,
    affectedHits,
    openDataHits,
    potential: computePotential(tasks)
  };
}
