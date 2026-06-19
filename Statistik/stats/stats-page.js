export function fillStatsFilters({
  els,
  areas,
  types,
  context
}) {
  if (els.statsAreaFilter && !els.statsAreaFilter.options.length) {
    areas.forEach(([label, value]) => els.statsAreaFilter.append(new Option(label, value)));
  }
  if (els.statsTypeFilter && !els.statsTypeFilter.options.length) {
    els.statsTypeFilter.append(new Option('Alle Datentypen', ''));
    types.forEach((type) => els.statsTypeFilter.append(new Option(type, type)));
  }
  if (els.statsAreaFilter) els.statsAreaFilter.value = context.area || '';
  if (els.statsCityFilter) els.statsCityFilter.value = context.city || '';
  if (els.statsTypeFilter) els.statsTypeFilter.value = context.type || '';
}

export function computeStatsSummary(rows, percent) {
  const totalRecords = rows.reduce((sum, row) => sum + row.statistikCount, 0);
  const openDataRecords = rows.reduce((sum, row) => sum + row.openDataCount, 0);
  const nonOpenDataRecords = Math.max(0, totalRecords - openDataRecords);

  return {
    totalRecords,
    openDataRecords,
    nonOpenDataRecords,
    openDataQuote: percent(openDataRecords, totalRecords)
  };
}

function renderStatsTypeDistribution({
  els,
  statsRows,
  summary,
  escapeHtml,
  formatNumber,
  formatPercent
}) {
  const palette = ['#0b74f2', '#2eb85c', '#f5aa1c', '#8b3ff2', '#ef3f42', '#16b8d9'];
  let cursor = 0;
  const segments = statsRows.map((row, index) => {
    const start = cursor;
    const end = cursor + row.inventoryShare;
    cursor = end;
    return `${palette[index % palette.length]} ${start}% ${end}%`;
  }).join(', ');

  if (els.statsTypeDonut) {
    els.statsTypeDonut.style.background = summary.totalRecords
      ? `conic-gradient(${segments})`
      : 'conic-gradient(#e2e8f0 0 100%)';
  }
  if (els.statsTypeDonutTotal) els.statsTypeDonutTotal.textContent = formatNumber(summary.totalRecords);
  if (els.statsTypeDistributionBody) {
    els.statsTypeDistributionBody.innerHTML = statsRows.map((row, index) => `
      <tr>
        <td><span class="legend-dot" style="background:${palette[index % palette.length]}"></span>${escapeHtml(row.type)}</td>
        <td>${formatNumber(row.statistikCount)}</td>
        <td>${formatPercent(row.inventoryShare)}</td>
      </tr>
    `).join('');
  }
}

function renderStatsQuoteBars({
  els,
  statsRows,
  escapeHtml,
  formatPercent
}) {
  if (!els.statsQuoteBars) return;
  els.statsQuoteBars.innerHTML = statsRows.map((row) => `
    <div class="stats-quote-row">
      <span>${escapeHtml(row.type)}</span>
      <div class="stats-quote-track"><i style="width:${Math.max(0, Math.min(100, row.openDataQuote))}%"></i></div>
      <strong>${formatPercent(row.openDataQuote)}</strong>
    </div>
  `).join('');
}

function renderStatsLicenseTask({
  els,
  summary,
  formatNumber,
  formatPercent,
  percent
}) {
  const hasLicenseTask = summary.nonOpenDataRecords > 0;
  if (els.statsLicenseTaskCard) els.statsLicenseTaskCard.hidden = !hasLicenseTask;
  if (!hasLicenseTask) return;
  if (els.statsLicenseTaskCount) {
    els.statsLicenseTaskCount.textContent = formatNumber(summary.nonOpenDataRecords);
  }
  if (els.statsLicenseTaskShare) {
    els.statsLicenseTaskShare.textContent = `${formatPercent(percent(summary.nonOpenDataRecords, summary.totalRecords))} nicht Open-Data-fähig`;
  }
}

function renderStatsTypeTable({
  els,
  statsRows,
  summary,
  escapeHtml,
  formatNumber,
  formatPercent
}) {
  if (!els.statsTypeTableBody) return;
  const rows = statsRows.map((row) => `
    <tr>
      <td>${escapeHtml(row.type)}</td>
      <td>${formatNumber(row.statistikCount)}</td>
      <td>${formatNumber(row.openDataCount)}</td>
      <td><span class="stats-table-quote"><strong>${formatPercent(row.openDataQuote)}</strong><span><i style="width:${Math.max(0, Math.min(100, row.openDataQuote))}%"></i></span></span></td>
      <td>${formatNumber(row.nonOpenDataCount)}</td>
    </tr>
  `).join('');

  els.statsTypeTableBody.innerHTML = `${rows}
    <tr class="stats-total-row">
      <td>Gesamt</td>
      <td>${formatNumber(summary.totalRecords)}</td>
      <td>${formatNumber(summary.openDataRecords)}</td>
      <td><span class="stats-table-quote"><strong>${formatPercent(summary.openDataQuote)}</strong><span><i style="width:${Math.max(0, Math.min(100, summary.openDataQuote))}%"></i></span></span></td>
      <td>${formatNumber(summary.nonOpenDataRecords)}</td>
    </tr>`;
}

export function showStatsMessage(els, message) {
  if (!els.statsMessage) return;
  els.statsMessage.textContent = message || '';
  els.statsMessage.hidden = !message;
}

export function renderStatsLoading({ els, documentObject = document }) {
  ['stats-total-records', 'stats-open-data-records', 'stats-open-data-quote', 'stats-non-open-data-records'].forEach((id) => {
    const node = documentObject.getElementById(id);
    if (node) node.textContent = '...';
  });
  if (els.statsOpenDataShare) els.statsOpenDataShare.textContent = '...';
  if (els.statsNonOpenDataShare) els.statsNonOpenDataShare.textContent = '...';
  if (els.statsTypeDonutTotal) els.statsTypeDonutTotal.textContent = '...';
  if (els.statsTypeDistributionBody) els.statsTypeDistributionBody.innerHTML = '<tr><td colspan="3" class="table-empty"><span class="loading-line">Statistik wird geladen ...</span></td></tr>';
  if (els.statsQuoteBars) els.statsQuoteBars.innerHTML = '<div class="inline-loading">Statistik wird geladen ...</div>';
  if (els.statsTypeTableBody) els.statsTypeTableBody.innerHTML = '<tr><td colspan="5" class="table-empty">Statistik wird geladen ...</td></tr>';
  if (els.statsLicenseTaskCard) els.statsLicenseTaskCard.hidden = true;
  if (els.statsLicenseTaskCount) els.statsLicenseTaskCount.textContent = '...';
  if (els.statsLicenseTaskShare) els.statsLicenseTaskShare.textContent = '...';
  if (els.statsExport) els.statsExport.disabled = true;
}

export function renderStatsEmpty({ els, message, showStatsMessage }) {
  showStatsMessage(message);
  if (els.statsTypeDistributionBody) els.statsTypeDistributionBody.innerHTML = '<tr><td colspan="3" class="table-empty">Keine Daten gefunden.</td></tr>';
  if (els.statsQuoteBars) els.statsQuoteBars.innerHTML = '<div class="empty-note">Keine Daten gefunden.</div>';
  if (els.statsTypeTableBody) els.statsTypeTableBody.innerHTML = '<tr><td colspan="5" class="table-empty">Keine Daten gefunden.</td></tr>';
  if (els.statsLicenseTaskCard) els.statsLicenseTaskCard.hidden = true;
  if (els.statsLicenseTaskCount) els.statsLicenseTaskCount.textContent = '-';
  if (els.statsLicenseTaskShare) els.statsLicenseTaskShare.textContent = 'Keine Datensätze';
  if (els.statsExport) els.statsExport.disabled = true;
}

export function renderStatsError({ els, showStatsMessage }) {
  showStatsMessage('Die Statistik konnte nicht vollständig geladen werden. Bitte erneut aktualisieren.');
  if (els.statsTypeDistributionBody) els.statsTypeDistributionBody.innerHTML = '<tr><td colspan="3" class="table-empty">Die Statistik konnte nicht vollständig geladen werden.</td></tr>';
  if (els.statsQuoteBars) els.statsQuoteBars.innerHTML = '<div class="empty-note">Die Statistik konnte nicht vollständig geladen werden.</div>';
  if (els.statsTypeTableBody) els.statsTypeTableBody.innerHTML = '<tr><td colspan="5" class="table-empty">Die Statistik konnte nicht vollständig geladen werden.</td></tr>';
  if (els.statsLicenseTaskCard) els.statsLicenseTaskCard.hidden = true;
  if (els.statsLicenseTaskCount) els.statsLicenseTaskCount.textContent = '-';
  if (els.statsLicenseTaskShare) els.statsLicenseTaskShare.textContent = 'Nicht geladen';
  if (els.statsExport) els.statsExport.disabled = true;
}

export function setStatsLoadingState({ els, isLoading }) {
  [els.statsRefresh, els.refreshButton].forEach((button) => {
    if (!button) return;
    button.disabled = isLoading;
  });
  if (els.statsRefresh) {
    els.statsRefresh.innerHTML = isLoading
      ? '<span class="material-icons" aria-hidden="true">hourglass_top</span>Aktualisieren ...'
      : '<span class="material-icons" aria-hidden="true">refresh</span>Aktualisieren';
  }
}

export function renderStats({
  els,
  state,
  computeStatsSummary,
  renderStatsEmpty,
  escapeHtml,
  formatNumber,
  formatPercent,
  percent
}) {
  const summary = state.statsSummary || computeStatsSummary([]);
  if (!summary.totalRecords) {
    renderStatsEmpty('Für diesen Arbeitskontext wurden keine Datensätze gefunden.');
    return;
  }

  if (els.statsTotalRecords) els.statsTotalRecords.textContent = formatNumber(summary.totalRecords);
  if (els.statsOpenDataRecords) els.statsOpenDataRecords.textContent = formatNumber(summary.openDataRecords);
  if (els.statsOpenDataShare) els.statsOpenDataShare.textContent = `${formatPercent(summary.openDataQuote)} aller Datensätze`;
  if (els.statsOpenDataQuote) els.statsOpenDataQuote.textContent = formatPercent(summary.openDataQuote);
  if (els.statsNonOpenDataRecords) els.statsNonOpenDataRecords.textContent = formatNumber(summary.nonOpenDataRecords);
  if (els.statsNonOpenDataShare) els.statsNonOpenDataShare.textContent = `${formatPercent(percent(summary.nonOpenDataRecords, summary.totalRecords))} aller Datensätze`;
  if (els.statsExport) els.statsExport.disabled = !state.statsRows.length;

  renderStatsTypeDistribution({
    els,
    statsRows: state.statsRows,
    summary,
    escapeHtml,
    formatNumber,
    formatPercent
  });
  renderStatsQuoteBars({
    els,
    statsRows: state.statsRows,
    escapeHtml,
    formatPercent
  });
  renderStatsLicenseTask({
    els,
    summary,
    formatNumber,
    formatPercent,
    percent
  });
  renderStatsTypeTable({
    els,
    statsRows: state.statsRows,
    summary,
    escapeHtml,
    formatNumber,
    formatPercent
  });
}

function mapStatsRows(rows, percent, totalRecords) {
  return rows.map((row) => ({
    ...row,
    nonOpenDataCount: Math.max(0, row.statistikCount - row.openDataCount),
    openDataQuote: percent(row.openDataCount, row.statistikCount),
    inventoryShare: percent(row.statistikCount, totalRecords)
  }));
}

export async function loadStatsData({
  state,
  els,
  formatDateTime,
  percent,
  showStatsMessage,
  renderStatsLoading,
  setStatsLoadingState,
  loadCachedQualitySnapshot,
  loadStatisticRows,
  computeStatsSummary,
  renderStats,
  renderStatsError
}) {
  const startedAt = new Date();
  showStatsMessage('');
  renderStatsLoading();
  setStatsLoadingState(true);

  try {
    const snapshot = await loadCachedQualitySnapshot();
    const baseRows = snapshot ? state.latestRows : await loadStatisticRows();
    const draftRows = baseRows.map((row) => ({
      ...row,
      nonOpenDataCount: Math.max(0, row.statistikCount - row.openDataCount),
      openDataQuote: percent(row.openDataCount, row.statistikCount),
      inventoryShare: 0
    }));
    const summary = computeStatsSummary(draftRows);
    state.statsRows = mapStatsRows(draftRows, percent, summary.totalRecords);
    state.statsSummary = computeStatsSummary(state.statsRows);
    renderStats();

    if (els.lastUpdated) {
      els.lastUpdated.textContent = `Letzte Aktualisierung: ${formatDateTime(new Date(snapshot?.generatedAt || startedAt))}`;
    }
  } catch (error) {
    console.error('Open-Data-Statistik konnte nicht vollständig geladen werden.', error);
    renderStatsError();
  } finally {
    setStatsLoadingState(false);
  }
}

export async function loadStatsDataAsync({
  state,
  els,
  formatDateTime,
  percent,
  showStatsMessage,
  renderStatsLoading,
  setStatsLoadingState,
  loadStatisticRowsIncremental,
  computeStatsSummary,
  renderStats,
  renderStatsError
}) {
  const startedAt = new Date();
  showStatsMessage('');
  renderStatsLoading();
  setStatsLoadingState(true);

  const applyStatsRows = (rows) => {
    const draftRows = rows.map((row) => ({
      ...row,
      nonOpenDataCount: Math.max(0, row.statistikCount - row.openDataCount),
      openDataQuote: percent(row.openDataCount, row.statistikCount),
      inventoryShare: 0
    }));
    const summary = computeStatsSummary(draftRows);
    state.statsRows = mapStatsRows(draftRows, percent, summary.totalRecords);
    state.statsSummary = computeStatsSummary(state.statsRows);
    renderStats();
  };

  try {
    const rows = await loadStatisticRowsIncremental((row, partialRows) => {
      applyStatsRows(partialRows);
    });
    applyStatsRows(rows);
    if (els.lastUpdated) {
      els.lastUpdated.textContent = `Letzte Aktualisierung: ${formatDateTime(startedAt)}`;
    }
  } catch (error) {
    console.error('Open-Data-Statistik konnte nicht geladen werden.', error);
    renderStatsError();
  } finally {
    setStatsLoadingState(false);
  }
}

export function resetStatsFilters({
  saveWorkContext,
  fillStatsFilters,
  loadStatsDataAsync
}) {
  saveWorkContext({ area: '', city: '', type: '' });
  fillStatsFilters();
  void loadStatsDataAsync();
}

export function applyStatsFiltersAndLoad({
  els,
  saveWorkContext,
  fillStatsFilters,
  loadStatsDataAsync
}) {
  saveWorkContext({
    area: els.statsAreaFilter?.value || '',
    city: els.statsCityFilter?.value.trim() || '',
    type: els.statsTypeFilter?.value || ''
  });
  fillStatsFilters();
  void loadStatsDataAsync();
}

export function exportStatsCsv({
  state,
  csvValue,
  formatPercent,
  downloadText
}) {
  if (!state.statsRows.length || !state.statsSummary) return;
  const summary = state.statsSummary;
  const rows = [
    ['Datentyp', 'Gesamtzahl', 'Open-Data-fähig', 'Open-Data-Quote', 'Nicht Open-Data-fähig'],
    ...state.statsRows.map((row) => [
      row.type,
      row.statistikCount,
      row.openDataCount,
      formatPercent(row.openDataQuote),
      row.nonOpenDataCount
    ]),
    ['Gesamt', summary.totalRecords, summary.openDataRecords, formatPercent(summary.openDataQuote), summary.nonOpenDataRecords]
  ];
  const text = rows.map((row) => row.map(csvValue).join(';')).join('\n');
  downloadText('satourn_open_data_statistik.csv', text, 'text/csv;charset=utf-8');
}
