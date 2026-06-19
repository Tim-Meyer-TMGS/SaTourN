export function renderPrimarySystemsForTask({
  task,
  taskItems,
  renderPrimarySystemsForRecords
}) {
  const criterionIds = new Set(task?.criterionIds?.length ? task.criterionIds : [task?.criterionId].filter(Boolean));
  const relevantItems = taskItems.filter((item) => item.missingCriteria?.some((criterionId) => criterionIds.has(criterionId)));
  renderPrimarySystemsForRecords(relevantItems);
}

export function renderPrimarySystemsForRecords({
  rows,
  els,
  collectPrimarySystems,
  renderPrimarySystemLogo,
  escapeHtml,
  formatNumber,
  getPrimarySystem,
  getSourceId,
  exportTaskRecordsCsv,
  copyText,
  hidePrimarySystems
}) {
  const systems = collectPrimarySystems(rows);
  if (!systems.length) {
    hidePrimarySystems();
    return;
  }

  els.primarySystemCard.hidden = false;
  els.primarySystemList.innerHTML = systems.map((system) => `
    <div class="primary-system-row">
      ${renderPrimarySystemLogo(system)}
      <span><strong>${escapeHtml(system.name)} (${formatNumber(system.count)})</strong><small>${escapeHtml(system.note)}</small></span>
      <button class="plain-button" type="button" data-system-action="${escapeHtml(system.action)}" data-system-id="${escapeHtml(system.id)}">${escapeHtml(system.actionLabel)}</button>
    </div>
  `).join('');

  els.primarySystemList.querySelectorAll('[data-system-action]').forEach((button) => {
    button.addEventListener('click', () => {
      const systemRows = rows.filter((row) => getPrimarySystem(row).id === button.dataset.systemId);
      if (button.dataset.systemAction === 'export') exportTaskRecordsCsv(systemRows);
      if (button.dataset.systemAction === 'copy-source-id') {
        const firstSourceId = systemRows.map(getSourceId).find(Boolean);
        if (firstSourceId) copyText(firstSourceId);
      }
    });
  });
}

export function renderPrimarySystemLogo({
  system,
  escapeHtml
}) {
  if (system.logoImage) {
    return `
      <span class="primary-system-logo primary-system-logo-image">
        <img src="${escapeHtml(system.logoImage)}" alt="${escapeHtml(system.name)}">
      </span>
    `;
  }

  return `
    <span class="primary-system-logo primary-system-logo-${escapeHtml(system.id)}">
      <span class="primary-system-wordmark">${escapeHtml(system.logoText || system.short)}</span>
    </span>
  `;
}

export function hidePrimarySystems({
  els
}) {
  if (els.primarySystemCard) els.primarySystemCard.hidden = true;
  if (els.primarySystemList) els.primarySystemList.replaceChildren();
}
