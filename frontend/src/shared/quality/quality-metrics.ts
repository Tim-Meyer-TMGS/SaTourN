import { calculatePercent } from '../format/formatters';

export type StatisticRowLike = {
  total: number;
  openData: number;
};

export type QualitySummaryLike = {
  good?: number;
  review?: number;
  critical?: number;
  notCalculable?: number;
} | null | undefined;

export function canShowQualityScore(area: string, city: string) {
  return Boolean(city || (area && area !== 'Sachsen'));
}

export function buildOpenDataSummary(rows: StatisticRowLike[]) {
  const total = rows.reduce((sum, row) => sum + row.total, 0);
  const openData = rows.reduce((sum, row) => sum + row.openData, 0);
  const notOpenData = Math.max(0, total - openData);

  return {
    total,
    openData,
    notOpenData,
    openDataQuote: calculatePercent(openData, total),
    notOpenDataQuote: calculatePercent(notOpenData, total)
  };
}

export function buildQualityDistribution(summary: QualitySummaryLike) {
  const total = (summary?.good || 0)
    + (summary?.review || 0)
    + (summary?.critical || 0)
    + (summary?.notCalculable || 0);
  const goodWidth = calculatePercent(summary?.good || 0, total);
  const reviewWidth = calculatePercent(summary?.review || 0, total);
  const criticalWidth = calculatePercent(summary?.critical || 0, total);

  return {
    total,
    goodWidth,
    reviewWidth,
    criticalWidth,
    notCalculatedWidth: Math.max(0, 100 - goodWidth - reviewWidth - criticalWidth)
  };
}

export function buildQualityStatusGradient(distribution: ReturnType<typeof buildQualityDistribution>) {
  const reviewStart = distribution.goodWidth;
  const criticalStart = distribution.goodWidth + distribution.reviewWidth;
  const mutedStart = criticalStart + distribution.criticalWidth;

  return [
    'conic-gradient(',
    `#2bb673 0 ${distribution.goodWidth}%, `,
    `#f2a91b ${reviewStart}% ${criticalStart}%, `,
    `#ef4444 ${criticalStart}% ${mutedStart}%, `,
    `#98a2b3 ${mutedStart}% 100%`,
    ')'
  ].join('');
}
