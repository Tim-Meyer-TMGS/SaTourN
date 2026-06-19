export function fillContextControls(els, areas, types) {
  if (els.contextArea && !els.contextArea.options.length) {
    areas.forEach(([label, value]) => els.contextArea.append(new Option(label, value)));
  }
  if (els.contextType && !els.contextType.options.length) {
    els.contextType.append(new Option('Alle Datentypen', ''));
    types.forEach((type) => els.contextType.append(new Option(type, type)));
  }
}

export function contextAreaLabel(areaValue, areas) {
  return areas.find(([, value]) => value === areaValue)?.[0] || 'Sachsen';
}

export function buildOverviewTitle(context) {
  if (context.type) return `${context.type}-Monitor`;
  return 'Datenqualitäts-Monitor';
}

export function buildOverviewSubtitle(context, { areaLabel, cityLabel, typeLabel }) {
  const scope = [];
  if (areaLabel) scope.push(areaLabel);
  if (context.city) scope.push(cityLabel);
  const scopeLabel = scope.join(' - ') || 'Sachsen';
  if (context.type) {
    return `Pflegeaufgaben, Qualitätsstatus und Open-Data-Quote für ${typeLabel} in ${scopeLabel}.`;
  }
  return `Pflegeaufgaben, Qualitätsstatus und Open-Data-Quote für ${scopeLabel}.`;
}

export function renderWorkContext(els, context, areas) {
  const areaLabel = contextAreaLabel(context.area, areas);
  const cityLabel = context.city || 'Alle Orte';
  const typeLabel = context.type || 'Alle Datentypen';

  if (els.contextSummary) {
    els.contextSummary.textContent = `${areaLabel} - ${cityLabel} - ${typeLabel}`;
  }
  if (els.overviewTitle) {
    els.overviewTitle.textContent = buildOverviewTitle(context);
  }
  if (els.overviewSubtitle) {
    els.overviewSubtitle.textContent = buildOverviewSubtitle(context, { areaLabel, cityLabel, typeLabel });
  }
}

export function openContextDialog(els, context, fillControls) {
  if (!els.contextDialog) return;
  fillControls();
  if (els.contextArea) els.contextArea.value = context.area || '';
  if (els.contextCity) els.contextCity.value = context.city || '';
  if (els.contextType) els.contextType.value = context.type || '';
  if (typeof els.contextDialog.showModal === 'function') {
    els.contextDialog.showModal();
  } else {
    els.contextDialog.setAttribute('open', '');
  }
}

export function initSharedShell({
  els,
  fillControls,
  renderContext,
  syncConsentControls,
  openContextDialog,
  handleContextSubmit,
  openConsentDialog,
  handleConsentSubmit,
  markForceFresh
}) {
  fillControls();
  renderContext();
  syncConsentControls();

  els.contextSummary?.addEventListener('click', openContextDialog);
  els.contextEdit?.addEventListener('click', openContextDialog);
  els.contextForm?.addEventListener('submit', handleContextSubmit);
  els.consentSettingsButton?.addEventListener('click', openConsentDialog);
  els.consentForm?.addEventListener('submit', handleConsentSubmit);
  els.refreshButton?.addEventListener('click', markForceFresh, { capture: true });
}

export function initializePage(page, initializers) {
  if (page === 'overview') initializers.initOverview();
  if (page === 'tasks') initializers.initTasks();
  if (page === 'records') initializers.initRecords();
  if (page === 'record-detail') initializers.initRecordDetail();
  if (page === 'stats') initializers.initStats();
  if (page === 'help') initializers.initHelp();
}
