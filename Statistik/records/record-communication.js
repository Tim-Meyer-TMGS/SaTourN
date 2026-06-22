export function getErrorMessage(error, fallback) {
  const text = String(error?.message || '').trim();
  if (!text) return fallback;
  const httpPrefix = text.match(/^HTTP\s+\d+:\s*(.+)$/i);
  if (httpPrefix?.[1]) return httpPrefix[1].trim();
  return text;
}

export function openRecordAiSearchDialog({ dialog, input, note, prompt }) {
  if (!dialog) return;
  if (input) input.value = prompt || '';
  if (note) {
    note.textContent = 'Die KI liefert passende Datensatz-IDs. Diese Datensätze werden anschließend direkt geladen.';
  }
  if (typeof dialog.showModal === 'function') {
    dialog.showModal();
  } else {
    dialog.setAttribute('open', '');
  }
}

export function closeRecordAiSearchDialog(dialog) {
  if (!dialog) return;
  if (typeof dialog.close === 'function') {
    dialog.close();
  } else {
    dialog.removeAttribute('open');
  }
}

export function extractAiSearchIds(payload) {
  if (Array.isArray(payload?.ids)) return payload.ids;
  if (Array.isArray(payload?.globalIds)) return payload.globalIds;
  return [];
}

export function buildRecordMailIssueContext({
  pendingRecordView,
  selectedCriterionId,
  qualityCriteria,
  primaryIssue
}) {
  const criterionId = pendingRecordView?.criterionId || selectedCriterionId || '';
  const criterion = qualityCriteria.find((entry) => entry.id === criterionId);
  return {
    source: pendingRecordView?.criterionId ? 'task' : (criterionId ? 'records-filter' : 'records'),
    criterionId,
    criterionLabel: criterion?.label || primaryIssue || ''
  };
}

export function buildRecordMailIssues({
  row,
  issueContext,
  qualityCriteria,
  taskProblem
}) {
  const activeCriterionId = issueContext?.criterionId || '';
  const relevantIds = activeCriterionId && row.missingCriteria.includes(activeCriterionId)
    ? [activeCriterionId]
    : row.missingCriteria;

  return relevantIds
    .map((criterionId) => {
      const criterion = qualityCriteria.find((entry) => entry.id === criterionId);
      if (!criterion) return null;
      return {
        criterionId,
        label: criterion.label,
        problem: taskProblem(criterionId),
        recommendation: criterion.recommendation || row.recommendation || 'Datensatz prüfen und fehlende Angaben ergänzen.'
      };
    })
    .filter(Boolean);
}

export function buildRecordMailPayload({ row, issueContext, issues }) {
  return {
    record: {
      id: row.id || '',
      globalId: row.globalId || '',
      type: row.type || '',
      title: row.title || '',
      city: row.city || '',
      region: row.region || '',
      email: row.email || '',
      web: row.web || '',
      et4Url: row.et4Url || ''
    },
    issueContext,
    issues
  };
}

export async function handleRecordMailDraft({
  row,
  triggerNode,
  pendingRecordView,
  selectedCriterionId,
  qualityCriteria,
  taskProblem,
  requestRecordMailDraft,
  buildMailtoUrl,
  launchMailto,
  getErrorMessage,
  showRecordsMessage
}) {
  if (!row?.email || !row?.missingCriteria?.length) {
    showRecordsMessage('Für diesen Datensatz kann kein KI-Mailentwurf erzeugt werden.');
    return;
  }

  if (triggerNode) triggerNode.disabled = true;
  try {
    const issueContext = buildRecordMailIssueContext({
      pendingRecordView,
      selectedCriterionId,
      qualityCriteria,
      primaryIssue: row.primaryIssue || ''
    });
    const issues = buildRecordMailIssues({
      row,
      issueContext,
      qualityCriteria,
      taskProblem
    });
    const payload = await requestRecordMailDraft({
      payload: buildRecordMailPayload({ row, issueContext, issues })
    });
    const mailtoUrl = buildMailtoUrl(payload);
    if (!mailtoUrl) throw new Error('Mailto payload invalid');
    if (!launchMailto(mailtoUrl)) throw new Error('Mailto launch failed');
  } catch (error) {
    console.error('Mail-Entwurf konnte nicht erzeugt werden.', error);
    showRecordsMessage(getErrorMessage(error, 'Der KI-Mailentwurf konnte nicht erzeugt werden.'));
  } finally {
    if (triggerNode) triggerNode.disabled = !(row?.email && row?.missingCriteria?.length);
  }
}
