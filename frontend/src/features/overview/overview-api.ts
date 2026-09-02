import { fetchJson } from '../../shared/api/http-client';
import { buildApiActionUrl, getRuntimeConfig } from '../../shared/api/runtime-config';
import { buildSearchApiUrl } from '../../shared/api/url-builders';
import { DATA_TYPES } from '../../shared/config/constants';
import { getQualityScanConfig, qualityCriteria, type QualityCriterion } from '../../shared/legacy/quality';
import type { WorkContext } from '../../shared/types/context';

export type OverviewStatisticRow = {
  type: string;
  total: number;
  openData: number;
  licensed: number;
  isOther?: boolean;
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

function canLoadPushdownCount(criterion: QualityCriterion, type: string) {
  const config = getQualityScanConfig(criterion, type);
  return config.method === 'api_pushdown' && config.verified && Boolean(config.missingQuery);
}

async function loadStatisticRow(type: string, context: WorkContext): Promise<OverviewStatisticRow> {
  const runtime = getRuntimeConfig();
  const filters = {
    area: context.area || undefined,
    city: context.city || undefined
  };
  const [totalPayload, openDataPayload] = await Promise.all([
    fetchJson<CountPayload>(buildSearchApiUrl(runtime.dataApiBase, type, '', { countOnly: true, filters })),
    fetchJson<CountPayload>(buildSearchApiUrl(runtime.dataApiBase, type, '', { countOnly: true, isOpenData: true, filters }))
  ]);
  const openDataCount = extractTotal(openDataPayload);

  return {
    type,
    total: extractTotal(totalPayload),
    openData: openDataCount,
    licensed: openDataCount
  };
}

export async function loadStatisticRows(context: WorkContext): Promise<OverviewStatisticRow[]> {
  if (context.type) return [await loadStatisticRow(context.type, context)];

  const [typedRows, aggregate] = await Promise.all([
    Promise.all(DATA_TYPES.map((type) => loadStatisticRow(type, context))),
    loadStatisticRow('', context)
  ]);
  const typedTotal = typedRows.reduce((sum, row) => sum + row.total, 0);
  const typedOpenData = typedRows.reduce((sum, row) => sum + row.openData, 0);
  const typedLicensed = typedRows.reduce((sum, row) => sum + row.licensed, 0);
  const otherRow: OverviewStatisticRow = {
    type: 'Weitere (City, Area, Article, Web)',
    total: Math.max(0, aggregate.total - typedTotal),
    openData: Math.max(0, aggregate.openData - typedOpenData),
    licensed: Math.max(0, aggregate.licensed - typedLicensed),
    isOther: true
  };

  return otherRow.total || otherRow.openData ? [...typedRows, otherRow] : typedRows;
}

async function loadQualitySummary(context: WorkContext): Promise<OverviewQualitySummary | null> {
  const runtime = getRuntimeConfig();
  const query = buildContextQuery(context);

  const params = new URLSearchParams();
  if (query) params.set('query', query);
  params.set('scanPageSize', '200');
  params.set('maxPages', '50');
  params.set('timeoutMs', '20000');
  if (context.type) params.set('type', context.type);

  return fetchJson<OverviewQualitySummary>(`${buildApiActionUrl(runtime.dataApiBase, 'quality-summary')}&${params.toString()}`);
}

async function loadIssueCount(criterionId: string, type: string, context: WorkContext) {
  const runtime = getRuntimeConfig();
  const params = new URLSearchParams();
  params.set('criterionId', criterionId);
  params.set('type', type);
  const query = buildContextQuery(context);
  if (query) params.set('query', query);

  const payload = await fetchJson<CountPayload>(`${buildApiActionUrl(runtime.dataApiBase, 'quality-count')}&${params.toString()}`);
  return extractTotal(payload);
}

export async function loadOverviewIssues(context: WorkContext): Promise<{
  issues: OverviewIssue[];
  qualitySummary: OverviewQualitySummary | null;
  qualitySummaryAvailable: boolean;
}> {
  const targetTypes = context.type ? [context.type] : [...DATA_TYPES];
  const qualitySummary = await loadQualitySummary(context).catch(() => null);

  if (qualitySummary) {
    return {
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
    issues,
    qualitySummary: null,
    qualitySummaryAvailable: false
  };
}

export async function loadOverviewData(context: WorkContext): Promise<OverviewData> {
  const [statisticRows, issueData] = await Promise.all([
    loadStatisticRows(context),
    loadOverviewIssues(context)
  ]);

  return {
    statisticRows,
    ...issueData
  };
}
