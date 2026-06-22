function renderRecordTitleCell(row, { escapeHtml }) {
  const image = row.thumbnailUrl
    ? `<img src="${escapeHtml(row.thumbnailUrl)}" alt="">`
    : '<span class="record-thumb-placeholder" aria-hidden="true"></span>';
  const ids = [row.id ? `ID: ${row.id}` : '', row.globalId || ''].filter(Boolean).join(' - ');
  return `
    <span class="record-title-cell">
      <span class="record-thumb">${image}</span>
      <span><strong>${escapeHtml(row.title)}</strong><small>${escapeHtml(ids)}</small></span>
    </span>
  `;
}

function renderRecordStatus(status, { escapeHtml }) {
  const cls = status === 'gut' ? 'good' : status === 'kritisch' ? 'critical' : status === 'pruefen' ? 'review' : 'muted';
  const label = status === 'nicht berechenbar' ? 'nicht bewertbar' : status === 'pruefen' ? 'pr\u00fcfen' : status;
  return `<span class="record-status"><i class="status-dot ${cls}"></i>${escapeHtml(label || '-')}</span>`;
}

function renderRecordScore(score, { formatNumber }) {
  if (!Number.isFinite(score)) return '-';
  const cls = score >= 80 ? 'good' : score >= 60 ? 'review' : 'critical';
  return `
    <span class="record-score">
      <strong>${formatNumber(score)} <small>/ 100</small></strong>
      <span class="score-mini-track"><i class="${cls}" style="width:${Math.max(0, Math.min(100, score))}%"></i></span>
    </span>
  `;
}

export function renderRecordsLoadingState(els) {
  if (els.recordTableBody) els.recordTableBody.innerHTML = '<tr><td colspan="7" class="table-empty"><span class="loading-line">Datens\u00e4tze werden geladen ...</span></td></tr>';
  if (els.recordResultSummary) els.recordResultSummary.textContent = 'Datens\u00e4tze werden geladen ...';
  if (els.recordPageRange) els.recordPageRange.textContent = '-';
  if (els.recordExport) els.recordExport.disabled = true;
}

export function renderRecordsEmptyState(els, message, showRecordsMessage) {
  if (els.recordTableBody) els.recordTableBody.innerHTML = '<tr><td colspan="7" class="table-empty">Die Datens\u00e4tze konnten nicht geladen werden.</td></tr>';
  if (els.recordResultSummary) els.recordResultSummary.textContent = '0 Datens\u00e4tze';
  if (els.recordPageRange) els.recordPageRange.textContent = '0 Datens\u00e4tze';
  if (els.recordExport) els.recordExport.disabled = true;
  showRecordsMessage(message);
}

export function renderRecordQuickCountsState(els, { rows, mode, setText }) {
  if (mode === 'empty') {
    [els.quickCountCritical, els.quickCountLicense, els.quickCountDescription, els.quickCountImage, els.quickCountOpenings].forEach((node) => {
      if (node) node.textContent = '-';
    });
    return;
  }

  setText(els.quickCountCritical, rows.filter((row) => row.qualityStatus === 'kritisch').length);
  setText(els.quickCountLicense, rows.filter((row) => row.missingCriteria.includes('license_missing')).length);
  setText(els.quickCountDescription, rows.filter((row) => row.missingCriteria.includes('description_missing')).length);
  setText(els.quickCountImage, rows.filter((row) => row.missingCriteria.includes('image_missing')).length);
  setText(els.quickCountOpenings, rows.filter((row) => row.missingCriteria.includes('opening_hours_missing')).length);
}

export function renderRecordStatusLegendState(els, { rows, mode, setText }) {
  if (mode === 'empty') {
    [els.legendGood, els.legendReview, els.legendCritical, els.legendUnknown].forEach((node) => {
      if (node) node.textContent = '-';
    });
    return;
  }

  setText(els.legendGood, rows.filter((row) => row.qualityStatus === 'gut').length);
  setText(els.legendReview, rows.filter((row) => row.qualityStatus === 'pruefen').length);
  setText(els.legendCritical, rows.filter((row) => row.qualityStatus === 'kritisch').length);
  setText(els.legendUnknown, rows.filter((row) => row.qualityStatus === 'nicht berechenbar').length);
}

export function renderRecordDataNoteState(els, recordDataMeta) {
  if (!els.recordDataNote) return;

  if (recordDataMeta.mode === 'empty') {
    els.recordDataNote.textContent = 'Es wird keine Browser-Stichprobe geladen. W\u00e4hle ein konkretes Problem oder \u00f6ffne eine Pflegeaufgabe, um echte Datensatzlisten per API zu laden.';
    return;
  }
  if (recordDataMeta.mode === 'criterion') {
    els.recordDataNote.textContent = recordDataMeta.truncated
      ? 'Diese Liste basiert auf einem begrenzten Qualit\u00e4ts-Scan f\u00fcr die ausgew\u00e4hlte Pflegeaufgabe.'
      : 'Diese Liste basiert auf einem Qualit\u00e4ts-Scan f\u00fcr die ausgew\u00e4hlte Pflegeaufgabe.';
    return;
  }
  if (recordDataMeta.mode === 'ai_search') {
    els.recordDataNote.textContent = 'Diese Liste basiert auf einer KI-Suche und anschlie\u00dfend geladenen Datens\u00e4tzen per global_id.';
    return;
  }
  if (recordDataMeta.mode === 'snapshot_list') {
    els.recordDataNote.textContent = recordDataMeta.truncated
      ? 'Diese Liste stammt aus dem gecachten Nachtlauf und ist auf die gespeicherten Treffer begrenzt.'
      : 'Diese Liste stammt aus dem gecachten Nachtlauf.';
    return;
  }

  els.recordDataNote.textContent = recordDataMeta.truncated
    ? 'Diese Liste basiert auf einem begrenzten API-/Server-Scan. Die Qualit\u00e4tsbewertung basiert auf den aktivierten Kriterien und verf\u00fcgbaren Daten.'
    : 'Die Qualit\u00e4tsbewertung basiert auf den aktivierten Kriterien und verf\u00fcgbaren Daten.';
}

export function renderRecordTableState(els, {
  rows,
  allRows,
  recordPage,
  recordRowsPerPage,
  recordDataMeta,
  escapeHtml,
  formatNumber,
  formatRecordDate,
  onMailDraft,
  saveRecordListState
}) {
  const totalPages = Math.max(1, Math.ceil(rows.length / recordRowsPerPage));
  const currentPage = Math.max(1, Math.min(recordPage, totalPages));
  const start = (currentPage - 1) * recordRowsPerPage;
  const visibleRows = rows.slice(start, start + recordRowsPerPage);

  if (!visibleRows.length) {
    const emptyText = allRows.length
      ? 'F\u00fcr diese Filter wurden keine Datens\u00e4tze gefunden.'
      : 'Noch keine Datens\u00e4tze geladen. W\u00e4hle einen Arbeitskontext oder starte eine Suche.';
    els.recordTableBody.innerHTML = `<tr><td colspan="7" class="table-empty">${emptyText}</td></tr>`;
  } else {
    els.recordTableBody.innerHTML = visibleRows.map((row) => `
      <tr>
        <td>${renderRecordTitleCell(row, { escapeHtml })}</td>
        <td><span class="type-chip ${row.type.toLowerCase()}">${escapeHtml(row.type || '-')}</span></td>
        <td>${escapeHtml(row.city || '-')}<small>${escapeHtml(row.region || '')}</small></td>
        <td>${escapeHtml(row.category || '-')}</td>
        <td>${escapeHtml(row.primaryIssue)}</td>
        <td>${escapeHtml(formatRecordDate(row.updatedAt))}</td>
        <td>
          <span class="row-actions">
            <button class="icon-button" type="button" data-record-mail="${escapeHtml(row.globalId || row.id || '')}" aria-label="E-Mail entwerfen"${row.email && row.missingCriteria.length ? '' : ' disabled'}><span class="material-icons" aria-hidden="true">mail</span></button>
            <a class="icon-button" href="${escapeHtml(row.detailUrl)}" aria-label="Datensatz ansehen"><span class="material-icons" aria-hidden="true">visibility</span></a>
            <a class="icon-button" href="${escapeHtml(row.detailUrl)}" aria-label="Detail \u00f6ffnen"><span class="material-icons" aria-hidden="true">chevron_right</span></a>
          </span>
        </td>
      </tr>
    `).join('');
  }

  const end = Math.min(rows.length, start + visibleRows.length);
  const totalText = recordDataMeta.truncated ? `${formatNumber(rows.length)} geladenen Treffern` : `${formatNumber(rows.length)} Datens\u00e4tzen`;

  if (els.recordPageRange) {
    els.recordPageRange.textContent = rows.length ? `Zeige ${formatNumber(start + 1)} bis ${formatNumber(end)} von ${totalText}` : '0 Datens\u00e4tze';
  }
  if (els.recordResultSummary) {
    if (recordDataMeta.mode === 'ai_search') {
      els.recordResultSummary.textContent = `KI-Suche: ${formatNumber(rows.length)} Datens\u00e4tze geladen`;
    } else {
      els.recordResultSummary.textContent = `Ergebnisse: ${recordDataMeta.truncated ? `${formatNumber(rows.length)} geladene Treffer` : `${formatNumber(rows.length)} Datens\u00e4tze`}`;
    }
  }
  if (els.recordPageStatus) els.recordPageStatus.textContent = `${currentPage} / ${totalPages}`;
  if (els.recordPrevPage) els.recordPrevPage.disabled = currentPage <= 1;
  if (els.recordNextPage) els.recordNextPage.disabled = currentPage >= totalPages;
  if (els.recordExport) els.recordExport.disabled = !rows.length;

  els.recordTableBody.querySelectorAll('[data-record-mail]').forEach((button) => {
    button.addEventListener('click', () => {
      const row = rows.find((entry) => (entry.globalId || entry.id) === button.dataset.recordMail);
      if (row) void onMailDraft(row, button);
    });
  });

  saveRecordListState(rows);
  return currentPage;
}

export { renderRecordScore, renderRecordStatus, renderRecordTitleCell };
