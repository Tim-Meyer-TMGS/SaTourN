import { fetchJson } from '../api/http-client';
import { getRuntimeConfig } from '../api/runtime-config';
import { qualityCriteria } from '../legacy/quality';

export type MailDraftRecord = {
  id: string;
  globalId: string;
  type: string;
  title: string;
  city: string;
  region: string;
  email: string;
  web: string;
  et4Url?: string;
  missingCriteria: string[];
  primaryIssue?: string;
};

export type MailDraftPayload = {
  to: string;
  cc?: string[];
  bcc?: string[];
  subject?: string;
  body?: string;
};

type MailDraftIssue = {
  criterionId: string;
  label: string;
  problem: string;
  recommendation: string;
};

function isMailDraftIssue(value: MailDraftIssue | null): value is MailDraftIssue {
  return Boolean(value);
}

export function buildMailDraftUrl(payload: MailDraftPayload) {
  const to = String(payload.to || '').trim();
  if (!to) return '';

  // Keep the mailto payload conservative. Long URLs are unreliable across
  // desktop mail clients, so the backend response is shortened before opening.
  const params: string[] = [];
  if (payload.subject) params.push(`subject=${encodeURIComponent(String(payload.subject).slice(0, 240))}`);
  if (payload.body) params.push(`body=${encodeURIComponent(String(payload.body).slice(0, 3500))}`);
  if (Array.isArray(payload.cc) && payload.cc.length) params.push(`cc=${encodeURIComponent(payload.cc.join(','))}`);
  if (Array.isArray(payload.bcc) && payload.bcc.length) params.push(`bcc=${encodeURIComponent(payload.bcc.join(','))}`);

  const query = params.join('&');
  return query ? `mailto:${to}?${query}` : `mailto:${to}`;
}

export function openMailDraftInMailClient(mailtoUrl: string) {
  if (!mailtoUrl) return false;
  const link = document.createElement('a');
  link.href = mailtoUrl;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  link.remove();
  return true;
}

function selectRelevantCriterionIds(record: MailDraftRecord, selectedCriterionId: string) {
  if (selectedCriterionId && record.missingCriteria.includes(selectedCriterionId)) {
    return [selectedCriterionId];
  }

  return record.missingCriteria;
}

function buildMailDraftIssues(criterionIds: string[]) {
  return criterionIds
    .map((criterionId) => {
      const criterion = qualityCriteria.find((entry) => entry.id === criterionId);
      if (!criterion) return null;
      return {
        criterionId,
        label: criterion.label,
        problem: criterion.label,
        recommendation: criterion.recommendation || 'Datensatz prüfen und fehlende Angaben ergänzen.'
      };
    })
    .filter(isMailDraftIssue);
}

function buildMailDraftRequestBody({
  record,
  selectedCriterionId,
  source
}: {
  record: MailDraftRecord;
  selectedCriterionId: string;
  source: string;
}) {
  return {
    record: {
      id: record.id,
      globalId: record.globalId,
      type: record.type,
      title: record.title,
      city: record.city,
      region: record.region,
      email: record.email,
      web: record.web,
      et4Url: record.et4Url || ''
    },
    issueContext: {
      source,
      criterionId: selectedCriterionId,
      criterionLabel: record.primaryIssue || ''
    },
    issues: buildMailDraftIssues(selectRelevantCriterionIds(record, selectedCriterionId))
  };
}

export async function requestRecordMailDraft(options: {
  record: MailDraftRecord;
  selectedCriterionId?: string;
  source?: string;
}) {
  const runtime = getRuntimeConfig();
  const { record, selectedCriterionId = '', source = 'records' } = options;

  return fetchJson<MailDraftPayload>(runtime.oiMailDraftApiBase, {
    method: 'POST',
    timeoutMs: 45_000,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(buildMailDraftRequestBody({ record, selectedCriterionId, source }))
  });
}
