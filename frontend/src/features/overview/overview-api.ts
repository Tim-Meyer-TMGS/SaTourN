import { fetchJson } from '../../shared/api/http-client';
import { getRuntimeConfig } from '../../shared/api/runtime-config';
import { buildSearchApiUrl } from '../../shared/api/url-builders';
import { DATA_TYPES } from '../../shared/config/constants';
import { getQualityScanConfig, qualityCriteria, type QualityCriterion } from '../../shared/legacy/quality';
import type { WorkContext } from '../../shared/types/context';

export type OverviewStatisticRow = {
  type: string;
  total: number;
  openData: number;
};

export type OverviewIssue = {
  criterionId: string;
  label: string;
  priority: string;
  affectedCount: number;
  affectedTypes: string[];
  recommendation?: string;
};

export type OverviewData = {
  statisticRows: OverviewStatisticRow[];
  issues: OverviewIssue[];
  qualitySummary: OverviewQualitySummary | null;
  qualitySummaryAvailable: boolean;
};

type CountPayload = {
  overallcount?: number;
  OverallCount?: number;
  count?: number;
};

export type OverviewQualityStatusCounts = {
  gut?: number;
  pruefen?: number;
  kritisch?: number;
  nichtBerechenbar?: number;
};

export type OverviewQualitySummary = {
  totalAssessed: number;
  withIssues: number;
  good: number;
  review: number;
  critical: number;
  notCalculable: number;
  averageQualityScore: number | null;
  openDataCapableCount: number;
  issueSummary: OverviewIssue[];
  statusCounts: OverviewQualityStatusCounts;
  meta?: {
    partial?: boolean;
    failedTypes?: Array<{ type: string; error: string }>;
    incompleteTypes?: Array<{ type: string; reason: string }>;
  };
};

function cleanQueryValue(value: string) {
  return String(value || '').replace(/"/g, '').trim();
}

function buildContextQuery({ area, city }: WorkContext) {
  const parts: string[] = [];
  if (area) parts.push(`area:"${cleanQueryValue(area)}"`);
  if (city) parts.push(`city:"${cleanQueryValue(city)}"`);
  return parts.join(' AND ');
}

function extractTotal(payload: CountPayload | null | undefined) {
  const total = Number(payload?.overallcount ?? payload?.OverallCount ?? payload?.count ?? 0);
  return Number.isFinite(total) ? total : 0;
}

function priorityRank(priority: string) {
  if (priority === 'hoch') return 3;
  if (priority === 'mittel') return 2;
  return 1;
}

function hasConcreteQualityContext(context: WorkContext) {
  return Boolean(context.city || (context.area && context.area !== 'Sachsen'));
}

function canLoadPushdownCount(criterion: QualityCriterion, type: string) {
  const config = getQualityScanConfig(criterion, type);
  return config.method === 'api_pushdown' && config.verified && Boolean(config.missingQuery);
}

async function loadStatisticRow(type: string, context: WorkContext): Promise<OverviewStatisticRow> {
  const runtime = getRuntimeConfig();
  const query = buildContextQuery(context);
  const [totalPayload, openDataPayload] = await Promise.all([
    fetchJson<CountPayload>(buildSearchApiUrl(runtime.searchApiBase, type, query, { limit: 1 })),
    fetchJson<CountPayload>(buildSearchApiUrl(runtime.searchApiBase, type, query, { limit: 1, isOpenData: true }))
  ]);

  return {
    type,
    total: extractTotal(totalPayload),
    openData: extractTotal(openDataPayload)
  };
}

async function loadQualitySummary(context: WorkContext): Promise<OverviewQualitySummary | null> {
  if (!hasConcreteQualityContext(context)) return null;

  const runtime = getRuntimeConfig();
  const query = buildContextQuery(context);
  if (!query) return null;

  const params = new URLSearchParams();
  params.set('query', query);
  params.set('scanPageSize', '200');
  params.set('maxPages', '20');
  params.set('timeoutMs', '20000');
  if (context.type) params.set('type', context.type);

  return fetchJson<OverviewQualitySummary>(`${runtime.qualitySummaryApiBase}?${params.toString()}`);
}

async function loadIssueCount(criterionId: string, type: string, context: WorkContext) {
  const runtime = getRuntimeConfig();
  const params = new URLSearchParams();
  params.set('criterionId', criterionId);
  params.set('type', type);
  const query = buildContextQuery(context);
  if (query) params.set('query', query);

  const payload = await fetchJson<CountPayload>(`${runtime.qualityCountApiBase}?${params.toString()}`);
  return extractTotal(payload);
}

export async function loadOverviewData(context: WorkContext): Promise<OverviewData> {
  const targetTypes = context.type ? [context.type] : [...DATA_TYPES];

  const [statisticRows, qualitySummary] = await Promise.all([
    Promise.all(targetTypes.map((type) => loadStatisticRow(type, context))),
    loadQualitySummary(context).catch(() => null)
  ]);

  if (qualitySummary) {
    return {
      statisticRows,
      issues: qualitySummary.issueSummary || [],
      qualitySummary,
      qualitySummaryAvailable: true
    };
  }

  const issueMap = new Map<string, OverviewIssue>();
  const activeCriteria = qualityCriteria.filter((criterion) => criterion.autoCheck !== false);

  await Promise.all(activeCriteria.flatMap((criterion) => (
    targetTypes
      .filter((type) => !criterion.types?.length || criterion.types.includes(type))
      .filter((type) => canLoadPushdownCount(criterion, type))
      .map(async (type) => {
        try {
          const count = await loadIssueCount(criterion.id, type, context);
          if (!count) return;

          const existing = issueMap.get(criterion.id) || {
            criterionId: criterion.id,
            label: criterion.label,
            priority: criterion.priority || '',
            affectedCount: 0,
            affectedTypes: [],
            recommendation: criterion.recommendation
          };
          existing.affectedCount += count;
          if (!existing.affectedTypes.includes(type)) existing.affectedTypes.push(type);
          issueMap.set(criterion.id, existing);
        } catch {
          // Unsupported server-scan criteria are intentionally ignored in this preview layer.
        }
      })
  )));

  const issues = Array.from(issueMap.values())
    .sort((left, right) => (
      priorityRank(right.priority) - priorityRank(left.priority) ||
      right.affectedCount - left.affectedCount ||
      left.label.localeCompare(right.label, 'de')
    ));

  return {
    statisticRows,
    issues,
    qualitySummary: null,
    qualitySummaryAvailable: false
  };
}
