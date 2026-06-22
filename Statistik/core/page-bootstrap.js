export function initSharedShell({
  els,
  fillContextControls,
  renderWorkContext,
  syncConsentControls,
  openContextDialog,
  handleContextSubmit,
  openConsentDialog,
  handleConsentSubmit,
  markForceFresh,
  initSharedShellModel
}) {
  initSharedShellModel({
    els,
    fillControls: fillContextControls,
    renderContext: renderWorkContext,
    syncConsentControls,
    openContextDialog,
    handleContextSubmit,
    openConsentDialog,
    handleConsentSubmit,
    markForceFresh
  });
}

export function initializePage({
  page,
  initOverview,
  initTasks,
  initRecords,
  initRecordDetail,
  initStats,
  initHelp,
  initializePageModel
}) {
  initializePageModel(page, {
    initOverview,
    initTasks,
    initRecords,
    initRecordDetail,
    initStats,
    initHelp
  });
}
