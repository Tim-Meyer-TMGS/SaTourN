export function createForceFreshController() {
  const runtimeState = {
    forceFreshUntil: 0
  };

  return {
    markForceFresh() {
      runtimeState.forceFreshUntil = Date.now() + 1500;
    },
    shouldForceFresh() {
      return Number(runtimeState.forceFreshUntil || 0) > Date.now();
    }
  };
}

export function clearTransientRequestCache(requestCache) {
  requestCache.clear();
}

export async function fetchJsonCached(requestCache, url, options = {}) {
  return requestCache.fetch(url, options);
}

export function isAbortLikeError(error) {
  const message = String(error?.message || error || '');
  return error?.name === 'AbortError' || /aborted|abort|timeout/i.test(message);
}

export function getConsentDefaults(runtimeConfig) {
  const defaults = runtimeConfig?.consent?.optionalDefaults || {};
  return {
    essential: true,
    external_ui: Boolean(defaults.external_ui),
    automation: Boolean(defaults.automation),
    analytics: Boolean(defaults.analytics)
  };
}

export function loadConsentState(consentStorageKey, runtimeConfig, storageObject = localStorage) {
  const defaults = getConsentDefaults(runtimeConfig);
  try {
    const parsed = JSON.parse(storageObject.getItem(consentStorageKey) || '{}');
    return {
      essential: true,
      external_ui: parsed.external_ui ?? defaults.external_ui,
      automation: parsed.automation ?? defaults.automation,
      analytics: parsed.analytics ?? defaults.analytics,
      updatedAt: parsed.updatedAt || ''
    };
  } catch {
    return {
      essential: true,
      external_ui: defaults.external_ui,
      automation: defaults.automation,
      analytics: defaults.analytics,
      updatedAt: ''
    };
  }
}

export function saveConsentState(consentState, consentStorageKey, {
  windowObject = window,
  storageObject = localStorage
} = {}) {
  const payload = {
    external_ui: Boolean(consentState.external_ui),
    automation: Boolean(consentState.automation),
    analytics: Boolean(consentState.analytics),
    updatedAt: new Date().toISOString()
  };

  try {
    storageObject.setItem(consentStorageKey, JSON.stringify(payload));
  } catch {
    // localStorage may be unavailable in strict privacy contexts.
  }

  const nextState = {
    essential: true,
    ...payload
  };

  windowObject.dispatchEvent(new CustomEvent('satourn:consent-change', {
    detail: { ...nextState }
  }));

  return nextState;
}

export function hasConsent(consentState, category) {
  if (!category || category === 'essential') return true;
  return Boolean(consentState?.[category]);
}

export function syncConsentControls(els, consentState) {
  if (els.consentExternalUi) els.consentExternalUi.checked = hasConsent(consentState, 'external_ui');
  if (els.consentAutomation) els.consentAutomation.checked = hasConsent(consentState, 'automation');
  if (els.consentAnalytics) els.consentAnalytics.checked = hasConsent(consentState, 'analytics');
}

export function openConsentDialog(els, syncControls) {
  syncControls();
  if (typeof els.consentDialog?.showModal === 'function') {
    els.consentDialog.showModal();
  } else {
    els.consentDialog?.setAttribute('open', '');
  }
}

export function readConsentFormState(els, consentState) {
  return {
    ...consentState,
    external_ui: Boolean(els.consentExternalUi?.checked),
    automation: Boolean(els.consentAutomation?.checked),
    analytics: Boolean(els.consentAnalytics?.checked)
  };
}

export function interceptQuickAiConsent(consentState, event, showMessage) {
  if (hasConsent(consentState, 'automation')) return false;
  event.preventDefault();
  event.stopImmediatePropagation();
  showMessage('Optionale Automatisierung ist derzeit nicht freigegeben.');
  return true;
}
