export function loadConsentState({
  consentStorageKey,
  runtimeConfig,
  loadConsentStateModel
}) {
  return loadConsentStateModel(consentStorageKey, runtimeConfig);
}

export function saveConsentState({
  consentState,
  consentStorageKey,
  saveConsentStateModel
}) {
  return saveConsentStateModel(consentState, consentStorageKey);
}

export function hasConsent({
  consentState,
  category,
  hasConsentModel
}) {
  return hasConsentModel(consentState, category);
}

export function syncConsentControls({
  els,
  consentState,
  syncConsentControlsModel
}) {
  syncConsentControlsModel(els, consentState);
}

export function openConsentDialog({
  els,
  syncConsentControls,
  openConsentDialogModel
}) {
  openConsentDialogModel(els, syncConsentControls);
}

export function handleConsentSubmit({
  event,
  els,
  consentState,
  readConsentFormState,
  saveConsentState,
  onSaved
}) {
  if (event.submitter?.value === 'cancel') return consentState;
  event.preventDefault();
  const nextState = readConsentFormState(els, consentState);
  const savedState = saveConsentState(nextState);
  onSaved(savedState);
  els.consentDialog?.close?.();
  return savedState;
}

export function interceptQuickAiConsent({
  consentState,
  event,
  showMessage,
  interceptQuickAiConsentModel
}) {
  interceptQuickAiConsentModel(consentState, event, showMessage);
}
