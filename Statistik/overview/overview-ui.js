function setQualityDataNoteLoading(els) {
  if (!els.qualityDataNote) return;
  els.qualityDataNote.hidden = false;
  els.qualityDataNote.innerHTML = '<span class="inline-loading" aria-label="Qualitätsdaten werden geladen"></span>';
}

function setQualityDataNoteText(els, text) {
  if (!els.qualityDataNote) return;
  els.qualityDataNote.hidden = false;
  els.qualityDataNote.textContent = text;
}

function hideQualityDataNote(els) {
  if (!els.qualityDataNote) return;
  els.qualityDataNote.hidden = true;
  els.qualityDataNote.textContent = '';
}

function renderTopTasks(els, {
  issues,
  contextType,
  taskIcon,
  taskDescription,
  formatNumber,
  openOverviewIssueOnRecordsPage
}) {
  if (!issues.length) {
    els.topTasksList.innerHTML = '<div class="empty-note">Für die aktuelle Auswahl wurden keine Pflegeaufgaben gefunden.</div>';
    return;
  }

  els.topTasksList.replaceChildren(...issues.map((issue) => {
    const link = document.createElement('a');
    link.className = 'task-row';
    const preferredType = contextType || (issue.affectedTypes?.length === 1 ? issue.affectedTypes[0] : '');
    const params = new URLSearchParams();
    params.set('criterionId', issue.criterionId);
    if (preferredType) params.set('type', preferredType);
    params.set('from', 'overview');
    link.href = `records.html?${params.toString()}`;
    link.addEventListener('click', (event) => {
      event.preventDefault();
      openOverviewIssueOnRecordsPage(issue);
    });
    const statusClass = issue.priority === 'hoch' ? 'critical' : 'review';
    link.innerHTML = `
      <span class="task-icon ${statusClass}" aria-hidden="true">${taskIcon(issue.criterionId)}</span>
      <span class="task-copy"><strong>${issue.label}</strong><small>${taskDescription(issue.criterionId)}</small></span>
      <span class="task-count">${formatNumber(issue.affectedCount)}</span>
      <span class="status-badge ${statusClass}">${issue.priority === 'hoch' ? 'Kritisch' : 'Prüfen'}</span>
      <span class="task-open material-icons" aria-hidden="true">chevron_right</span>
    `;
    return link;
  }));
}

function renderQualityDistribution(els, {
  mode,
  collectedItems,
  counts,
  total,
  percent,
  formatPercent,
  formatNumber
}) {
  if (mode === 'regional_scan' && !collectedItems) {
    els.qualityDonut.style.background = 'conic-gradient(#e2e8f0 0 100%)';
    els.qualityLegend.innerHTML = `
      <div class="legend-row"><span class="legend-dot muted"></span><span>Wird berechnet</span><strong>-</strong></div>
    `;
    return;
  }

  if ((mode === 'sachsen_total' || mode === 'api_counts') && !total) {
    els.qualityDonut.style.background = 'conic-gradient(#e2e8f0 0 100%)';
    els.qualityLegend.innerHTML = `
      <div class="legend-row"><span class="legend-dot muted"></span><span>Nicht berechnet</span><strong>-</strong></div>
    `;
    return;
  }

  const good = counts.gut || 0;
  const review = counts.pruefen || 0;
  const critical = counts.kritisch || 0;
  const unknown = counts.nichtBerechenbar || 0;
  const goodPct = percent(good, total);
  const reviewPct = percent(review, total);
  const criticalPct = percent(critical, total);

  els.qualityDonut.style.background = total
    ? `conic-gradient(#22b46b 0 ${goodPct}%, #f5aa1c ${goodPct}% ${goodPct + reviewPct}%, #ef3f42 ${goodPct + reviewPct}% ${goodPct + reviewPct + criticalPct}%, #98a2b3 ${goodPct + reviewPct + criticalPct}% 100%)`
    : 'conic-gradient(#e2e8f0 0 100%)';

  const rows = [
    ['Gut', good, goodPct, 'good'],
    ['Prüfen', review, reviewPct, 'review'],
    ['Kritisch', critical, criticalPct, 'critical']
  ];
  if (unknown > 0) rows.push(['Nicht bewertbar', unknown, percent(unknown, total), 'muted']);
  els.qualityLegend.innerHTML = rows.map(([label, count, pctValue, cls]) => `
    <div class="legend-row"><span class="legend-dot ${cls}"></span><span>${label}</span><strong>${formatPercent(pctValue)} (${formatNumber(count)})</strong></div>
  `).join('');
}

function renderOpenDataStatus(els, { capable, missing, total, percent, formatNumber, formatPercent }) {
  const capablePct = percent(capable, total);
  const missingPct = percent(missing, total);
  els.openDataCapableBar.style.width = `${capablePct}%`;
  els.openDataMissingBar.style.width = `${missingPct}%`;
  els.openDataCapable.textContent = formatNumber(capable);
  els.openDataCapablePercent.textContent = formatPercent(capablePct);
  els.openDataMissing.textContent = formatNumber(missing);
  els.openDataMissingPercent.textContent = formatPercent(missingPct);
}

function renderDataNote(els, {
  mode,
  pendingTypes,
  truncated,
  sampleSize,
  formatNumber,
  qualityDataMeta
}) {
  if (mode === 'sachsen_total') {
    setQualityDataNoteText(els, 'Für ganz Sachsen wird kein Qualitätsscore angezeigt. Pflegeaufgaben laden im Hintergrund.');
    return;
  }
  if (mode === 'regional_scan') {
    if (pendingTypes) {
      setQualityDataNoteLoading(els);
      return;
    }
    if (truncated) {
      setQualityDataNoteText(els, 'Weitere Treffer können später nachgeladen werden.');
      return;
    }
    hideQualityDataNote(els);
    return;
  }
  if (mode === 'snapshot') {
    hideQualityDataNote(els);
    return;
  }
  if (mode === 'api_counts') {
    setQualityDataNoteLoading(els);
    return;
  }
  const note = truncated
    ? 'Regionale Bewertung geladen. Weitere Treffer können später nachgeladen werden.'
    : `Basierend auf ${formatNumber(sampleSize)} bewerteten Datensätzen.`;
  setQualityDataNoteText(els, note);
  if (truncated) console.debug('Qualitätsdaten sind begrenzt.', qualityDataMeta);
}

function renderDelta(node, previous, current, suffix, formatNumber) {
  if (!node || !Number.isFinite(previous) || !Number.isFinite(current)) {
    if (node) node.hidden = true;
    return;
  }
  const delta = current - previous;
  if (!delta) {
    node.hidden = true;
    return;
  }
  node.textContent = `${delta > 0 ? '+' : ''}${formatNumber(delta)} ${suffix}`;
  node.hidden = false;
}

export function renderOverviewLoadingState(els) {
  ['kpi-quality-score', 'kpi-total', 'kpi-good', 'kpi-review', 'kpi-critical', 'kpi-open-data'].forEach((id) => {
    const node = document.getElementById(id);
    if (node) node.textContent = '...';
  });
  if (els.topTasksList) els.topTasksList.innerHTML = '<div class="inline-loading">Pflegeaufgaben werden geladen ...</div>';
  setQualityDataNoteLoading(els);
}

export function renderOverviewEmptyState(els) {
  ['kpi-quality-score', 'kpi-total', 'kpi-good', 'kpi-review', 'kpi-critical', 'kpi-open-data'].forEach((id) => {
    const node = document.getElementById(id);
    if (node) node.textContent = '-';
  });
  if (els.topTasksList) els.topTasksList.innerHTML = '<div class="empty-note">Für diese Auswahl wurden keine Pflegeaufgaben geladen.</div>';
  setQualityDataNoteText(els, 'Keine auswertbaren Qualitätsdaten geladen.');
}

export function renderOverviewPage(els, {
  summary,
  counts,
  assessedTotal,
  notOpenData,
  kpis,
  issues,
  contextType,
  qualityDataMeta,
  sampleSize,
  formatNumber,
  formatPercent,
  percent,
  taskIcon,
  taskDescription,
  openOverviewIssueOnRecordsPage,
  previousKpis
}) {
  els.kpiQualityScore.textContent = kpis.qualityScore == null ? '-' : formatNumber(kpis.qualityScore);
  els.kpiQualityTrack.style.width = `${Math.max(0, Math.min(100, kpis.qualityScore || 0))}%`;
  els.kpiTotal.textContent = formatNumber(summary.statistikTotal);
  els.kpiGood.textContent = formatNumber(counts.gut || 0);
  els.kpiGoodPercent.textContent = formatPercent(percent(counts.gut || 0, assessedTotal));
  els.kpiReview.textContent = formatNumber(counts.pruefen || 0);
  els.kpiReviewPercent.textContent = formatPercent(percent(counts.pruefen || 0, assessedTotal));
  els.kpiCritical.textContent = formatNumber(counts.kritisch || 0);
  els.kpiCriticalPercent.textContent = formatPercent(percent(counts.kritisch || 0, assessedTotal));
  els.kpiOpenData.textContent = formatPercent(summary.openDataQuote);
  els.kpiOpenDataDetail.textContent = `${formatNumber(summary.openDataTotal)} von ${formatNumber(summary.statistikTotal)}`;

  if (
    qualityDataMeta.mode === 'api_counts' ||
    qualityDataMeta.mode === 'sachsen_total' ||
    (qualityDataMeta.mode === 'regional_scan' && !qualityDataMeta.collectedItems)
  ) {
    els.kpiQualityScore.textContent = '-';
    els.kpiQualityTrack.style.width = '0%';
    els.kpiGood.textContent = '-';
    els.kpiGoodPercent.textContent = 'Nicht berechnet';
    els.kpiReview.textContent = '-';
    els.kpiReviewPercent.textContent = 'Nicht berechnet';
    els.kpiCritical.textContent = '-';
    els.kpiCriticalPercent.textContent = 'Nicht berechnet';
  }

  renderDelta(els.kpiTotalDelta, previousKpis?.totalRecords, kpis.totalRecords, 'Datensätze seit dem letzten Besuch', formatNumber);
  renderDelta(els.kpiQualityDelta, previousKpis?.qualityScore, kpis.qualityScore, 'Punkte seit dem letzten Besuch', formatNumber);
  renderTopTasks(els, { issues, contextType, taskIcon, taskDescription, formatNumber, openOverviewIssueOnRecordsPage });
  renderQualityDistribution(els, { mode: qualityDataMeta.mode, collectedItems: qualityDataMeta.collectedItems, counts, total: assessedTotal, percent, formatPercent, formatNumber });
  renderOpenDataStatus(els, { capable: summary.openDataTotal, missing: notOpenData, total: summary.statistikTotal, percent, formatNumber, formatPercent });
  renderDataNote(els, {
    mode: qualityDataMeta.mode,
    pendingTypes: qualityDataMeta.pendingTypes || 0,
    truncated: qualityDataMeta.truncated,
    sampleSize,
    formatNumber,
    qualityDataMeta
  });
}
