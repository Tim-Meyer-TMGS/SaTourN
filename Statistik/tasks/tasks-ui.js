export function showTaskMessageState(els, message) {
  if (!els.taskMessage) return;
  els.taskMessage.textContent = message || '';
  els.taskMessage.hidden = !message;
}

export function clearTaskRecordsState(els) {
  if (els.taskRecordsSection) els.taskRecordsSection.hidden = true;
  if (els.taskRecordsExport) els.taskRecordsExport.disabled = true;
}

export function renderTasksLoadingState(els) {
  [els.taskKpiOpen, els.taskKpiHigh, els.taskKpiAffected, els.taskKpiOpenData, els.taskKpiPotential].forEach((node) => {
    if (node) node.textContent = '...';
  });
  if (els.taskKpiHighDetail) els.taskKpiHighDetail.textContent = '...';
  if (els.taskTableBody) els.taskTableBody.innerHTML = '<tr><td colspan="6" class="table-empty"><span class="loading-line">Pflegeaufgaben werden geladen ...</span></td></tr>';
  if (els.taskTableCount) els.taskTableCount.textContent = '-';
  if (els.taskDetailContent) els.taskDetailContent.innerHTML = '<p class="empty-note">Pflegeaufgaben werden geladen ...</p>';
}

export function renderTasksEmptyState(els, message) {
  [els.taskKpiOpen, els.taskKpiHigh, els.taskKpiAffected, els.taskKpiOpenData, els.taskKpiPotential].forEach((node) => {
    if (node) node.textContent = '-';
  });
  if (els.taskKpiHighDetail) els.taskKpiHighDetail.textContent = '-';
  if (els.taskTableBody) els.taskTableBody.innerHTML = '<tr><td colspan="6" class="table-empty">Noch keine Pflegeaufgaben geladen.</td></tr>';
  if (els.taskTableCount) els.taskTableCount.textContent = '0 Aufgaben';
  if (els.taskDetailContent) els.taskDetailContent.innerHTML = '<p class="empty-note">Wähle einen Arbeitskontext und starte die Abfrage.</p>';
  showTaskMessageState(els, message);
}

export function renderTaskTableState(els, {
  rows,
  selectedTask,
  taskPage,
  taskRowsPerPage,
  taskIcon,
  priorityLabel,
  renderTypeChips,
  impactBadgeClass,
  impactLabel,
  formatNumber,
  escapeHtml,
  onSelectTask
}) {
  const totalPages = Math.max(1, Math.ceil(rows.length / taskRowsPerPage));
  const currentPage = Math.max(1, Math.min(taskPage, totalPages));
  const start = (currentPage - 1) * taskRowsPerPage;
  const visibleRows = rows.slice(start, start + taskRowsPerPage);

  if (!visibleRows.length) {
    els.taskTableBody.innerHTML = '<tr><td colspan="6" class="table-empty">Für diese Auswahl wurden keine Pflegeaufgaben gefunden.</td></tr>';
  } else {
    els.taskTableBody.innerHTML = visibleRows.map((task) => `
      <tr>
        <td>
          <button class="task-table-action ${task === selectedTask ? 'active' : ''}" type="button" data-task-id="${escapeHtml(task.taskId)}">
            <span class="task-icon ${task.priority === 'hoch' ? 'critical' : 'review'}" aria-hidden="true">${taskIcon(task.iconCriterionId || task.criterionId)}</span>
            <span><strong>${escapeHtml(task.label)}</strong><small>${escapeHtml(task.description)}</small></span>
          </button>
        </td>
        <td>${formatNumber(task.affectedCount)}</td>
        <td><span class="status-badge ${task.priority === 'hoch' ? 'critical' : 'review'}">${priorityLabel(task.priority)}</span></td>
        <td>${renderTypeChips(task.affectedTypes)}</td>
        <td><span class="status-badge ${impactBadgeClass(task.impact)}">${impactLabel(task.impact)}</span></td>
        <td><button class="row-arrow" type="button" data-task-id="${escapeHtml(task.taskId)}" aria-label="Aufgabe anzeigen"><span class="material-icons" aria-hidden="true">chevron_right</span></button></td>
      </tr>
    `).join('');
  }

  els.taskTableBody.querySelectorAll('[data-task-id]').forEach((button) => {
    button.addEventListener('click', () => onSelectTask(button.dataset.taskId));
  });

  const end = Math.min(rows.length, start + visibleRows.length);
  if (els.taskTableCount) {
    els.taskTableCount.textContent = rows.length ? `${formatNumber(start + 1)}-${formatNumber(end)} von ${formatNumber(rows.length)} Aufgaben` : '0 Aufgaben';
  }
  if (els.taskPageStatus) els.taskPageStatus.textContent = `${currentPage} / ${totalPages}`;
  if (els.taskPrevPage) els.taskPrevPage.disabled = currentPage <= 1;
  if (els.taskNextPage) els.taskNextPage.disabled = currentPage >= totalPages;

  return currentPage;
}

export function renderTaskDetailState(els, {
  task,
  selectedTaskType,
  escapeHtml,
  renderTypeChips,
  impactBadgeClass,
  impactLabel,
  taskImpactText,
  clearTaskRecords,
  openTaskRecordsOnRecordsPage
}) {
  if (!task) {
    if (els.taskDetailContent) els.taskDetailContent.innerHTML = '<p class="empty-note">Wähle eine Pflegeaufgabe aus der Liste.</p>';
    return selectedTaskType;
  }

  const needsTypeChoice = task.affectedTypes.length > 1 && !selectedTaskType;
  const typeChoice = task.affectedTypes.length > 1
    ? `<label class="detail-type-select">Datentyp für Datensatzliste<select id="task-detail-type">${task.affectedTypes.map((type) => `<option value="${escapeHtml(type)}"${type === selectedTaskType ? ' selected' : ''}>${escapeHtml(type)}</option>`).join('')}</select></label>`
    : '';
  const selectedType = selectedTaskType || task.affectedTypes[0] || '';

  els.taskDetailContent.innerHTML = `
    <h3>${escapeHtml(task.label)}</h3>
    <dl class="task-detail-list">
      <dt>Problem</dt>
      <dd>${escapeHtml(task.problem)}</dd>
      <dt>Auswirkung</dt>
      <dd><span class="impact-dot ${impactBadgeClass(task.impact)}"></span>${escapeHtml(impactLabel(task.impact))}. ${escapeHtml(task.impactText || taskImpactText(task.criterionId))}</dd>
      <dt>Empfohlene Aktion</dt>
      <dd>${escapeHtml(task.recommendation)}</dd>
      <dt>Betroffene Typen</dt>
      <dd>${renderTypeChips(task.affectedTypes)}</dd>
    </dl>
    ${typeChoice}
    <button id="task-open-records" class="primary-action" type="button">${needsTypeChoice ? 'Datentyp auswählen und Datensätze anzeigen' : 'Datensätze anzeigen'}<span class="material-icons" aria-hidden="true">arrow_forward</span></button>
  `;

  const typeSelect = document.getElementById('task-detail-type');
  let resolvedTaskType = selectedTaskType;
  if (typeSelect && !resolvedTaskType) resolvedTaskType = typeSelect.value;

  typeSelect?.addEventListener('change', () => {
    resolvedTaskType = typeSelect.value;
    clearTaskRecords();
  });
  document.getElementById('task-open-records')?.addEventListener('click', () => {
    const type = typeSelect?.value || selectedType;
    if (type) resolvedTaskType = type;
    openTaskRecordsOnRecordsPage(task, type);
  });

  return resolvedTaskType;
}

export function renderTaskRecordsState(els, {
  task,
  type,
  rows,
  payload,
  formatNumber,
  escapeHtml,
  buildRecordDetailUrl,
  copyText
}) {
  const page = payload?.page || {};
  const stats = payload?.stats || {};
  const completeText = page.complete ? 'Liste geladen.' : 'Liste geladen, weitere Treffer können später nachgeladen werden.';
  els.taskRecordsNote.textContent = `${completeText} ${formatNumber(rows.length)} Datensätze angezeigt.`;
  els.taskRecordsExport.disabled = !rows.length;

  if (!rows.length) {
    els.taskRecordsBody.innerHTML = '<tr><td colspan="6" class="table-empty">Für diese Aufgabe wurden keine Datensätze gefunden.</td></tr>';
    return stats;
  }

  els.taskRecordsBody.innerHTML = rows.map((row) => `
    <tr>
      <td><strong>${escapeHtml(row.title)}</strong><small>${escapeHtml(row.globalId || row.id || '')}</small></td>
      <td>${escapeHtml(row.type || type)}</td>
      <td>${escapeHtml([row.city, row.region].filter(Boolean).join(' / ') || '-')}</td>
      <td>${escapeHtml(task.label)}</td>
      <td>${escapeHtml(task.recommendation)}</td>
      <td><span class="row-actions"><button class="plain-button" type="button" data-copy-id="${escapeHtml(row.globalId || row.id || '')}">ID kopieren</button><a class="plain-button" href="${escapeHtml(buildRecordDetailUrl(row))}">Detail öffnen</a></span></td>
    </tr>
  `).join('');

  els.taskRecordsBody.querySelectorAll('[data-copy-id]').forEach((button) => {
    button.addEventListener('click', () => copyText(button.dataset.copyId || ''));
  });

  return stats;
}
