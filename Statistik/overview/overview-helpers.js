export function normalizeStatisticRow(row) {
  return {
    type: row.type,
    statistikCount: Number(row.statistikCount || 0),
    openDataCount: Number(row.openDataCount || 0)
  };
}

export function sortStatisticRows(rows, types) {
  return [...rows].sort((a, b) => types.indexOf(a.type) - types.indexOf(b.type));
}

export function upsertStatisticRow(rows, row, types) {
  const nextRows = [...rows];
  const existingIndex = nextRows.findIndex((entry) => entry.type === row.type);
  if (existingIndex >= 0) {
    nextRows.splice(existingIndex, 1, row);
  } else {
    nextRows.push(row);
  }
  return sortStatisticRows(nextRows, types);
}

export function buildOverviewQualityMeta({ canCalculateQuality, selectedType, totalTypes }) {
  if (canCalculateQuality) {
    return {
      mode: 'regional_scan',
      collectedItems: 0,
      estimatedTotalItems: 0,
      truncated: false,
      unsupportedCriteria: [],
      failedCounts: 0,
      pendingTypes: selectedType ? 1 : totalTypes,
      completedTypes: 0
    };
  }

  return {
    mode: 'sachsen_total',
    collectedItems: 0,
    estimatedTotalItems: 0,
    truncated: false,
    unsupportedCriteria: [],
    failedCounts: 0
  };
}

export function computeOverviewSummary(rows) {
  const statistikTotal = rows.reduce((sum, row) => sum + row.statistikCount, 0);
  const openDataTotal = rows.reduce((sum, row) => sum + row.openDataCount, 0);
  const openDataQuote = statistikTotal ? (openDataTotal / statistikTotal) * 100 : 0;
  return { statistikTotal, openDataTotal, openDataQuote };
}
