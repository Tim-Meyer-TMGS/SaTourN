export async function handleRecordAiSearchSubmit({
  event,
  state,
  els,
  runAiRecordSearch,
  resolveRecordsByIds,
  extractAiSearchIds,
  normalizeItem,
  evaluateAllItems,
  buildRecordViewModel,
  fillRecordDynamicFilters,
  applyRecordFilters,
  clearRecordViewState,
  hideRecordAutocomplete,
  renderRecordsLoading,
  closeRecordAiSearchDialog,
  getErrorMessage,
  contextAreaLabel,
  selectedType,
  showRecordsMessage
}) {
  const submitterValue = event?.submitter?.value || '';
  if (submitterValue === 'cancel') return;
  event.preventDefault();

  const prompt = (els.recordAiSearchInput?.value || '').trim();
  if (!prompt) {
    if (els.recordAiSearchNote) {
      els.recordAiSearchNote.textContent = 'Bitte gib zuerst eine Suchanfrage ein.';
    }
    return;
  }

  if (els.recordAiSearchSubmit) els.recordAiSearchSubmit.disabled = true;
  if (els.recordAiSearchNote) {
    els.recordAiSearchNote.innerHTML = '<span class="inline-loading">KI-Suche wird ausgeführt ...</span>';
  }

  try {
    const aiPayload = await runAiRecordSearch({
      prompt,
      context: {
        area: contextAreaLabel(),
        city: state.context.city || '',
        type: selectedType()
      }
    });
    const ids = extractAiSearchIds(aiPayload);
    state.recordAiSearchPrompt = prompt;
    state.pendingRecordView = null;
    clearRecordViewState();
    state.recordServerSearchKeys = new Set();

    if (els.recordSearchInput) els.recordSearchInput.value = '';
    if (els.recordCategoryFilter) els.recordCategoryFilter.value = '';
    if (els.recordStatusFilter) els.recordStatusFilter.value = '';
    if (els.recordIssueFilter) els.recordIssueFilter.value = '';
    hideRecordAutocomplete();

    if (!ids.length) {
      state.recordItems = [];
      state.recordRows = [];
      state.filteredRecordRows = [];
      state.recordPage = 1;
      state.recordDataMeta = {
        mode: 'ai_search',
        collectedItems: 0,
        estimatedTotalItems: 0,
        truncated: false
      };
      fillRecordDynamicFilters();
      applyRecordFilters();
      showRecordsMessage(`KI-Suche aktiv: ${prompt}`);
      closeRecordAiSearchDialog(els.recordAiSearchDialog);
      return;
    }

    renderRecordsLoading();
    const recordsPayload = await resolveRecordsByIds({
      ids,
      type: selectedType()
    });
    const resolved = Array.isArray(recordsPayload?.items) ? recordsPayload.items : [];
    const evaluated = evaluateAllItems(
      resolved.map((raw) => normalizeItem(raw.raw || raw, raw._resolvedType || raw.type))
    );

    state.recordItems = evaluated;
    state.recordRows = evaluated.map(buildRecordViewModel);
    state.filteredRecordRows = [];
    state.recordPage = 1;
    state.recordDataMeta = {
      mode: 'ai_search',
      collectedItems: evaluated.length,
      estimatedTotalItems: ids.length,
      truncated: Boolean(aiPayload?.truncated)
    };

    fillRecordDynamicFilters();
    applyRecordFilters();
    closeRecordAiSearchDialog(els.recordAiSearchDialog);
  } catch (error) {
    console.error('KI-Suche fehlgeschlagen.', error);
    if (els.recordAiSearchNote) {
      els.recordAiSearchNote.textContent = getErrorMessage(
        error,
        'Die KI-Suche konnte nicht ausgeführt werden.'
      );
    }
  } finally {
    if (els.recordAiSearchSubmit) els.recordAiSearchSubmit.disabled = false;
  }
}

export async function handleRecordSearchSubmit({
  state,
  els,
  applyRecordFilters,
  renderRecordsLoading,
  resolveRecordSearch,
  looksLikeRecordId,
  searchSingleRecordById,
  searchRecordsByText,
  normalizeItem,
  evaluateAllItems,
  mergeRecordItems,
  getRecordIdentityKey,
  buildRecordViewModel,
  fillRecordDynamicFilters,
  showRecordsMessage
}) {
  state.recordPage = 1;
  state.recordAiSearchPrompt = '';
  applyRecordFilters();

  const query = (els.recordSearchInput?.value || '').trim();
  if (!query || state.filteredRecordRows.length) return;

  if (els.recordSearchButton) els.recordSearchButton.textContent = 'Suchen ...';
  renderRecordsLoading();

  try {
    const searchResult = await resolveRecordSearch({
      query,
      looksLikeRecordId,
      searchSingleRecordById,
      searchRecordsByText
    });
    const found = searchResult.items || [];

    if (!found.length) {
      applyRecordFilters();
      showRecordsMessage('Keine Datensätze gefunden.');
      return;
    }

    const evaluated = evaluateAllItems(found.map((raw) => normalizeItem(raw.raw || raw, raw.type)));
    const merged = mergeRecordItems(state.recordItems, evaluated);
    state.recordItems = merged;
    state.recordRows = merged.map(buildRecordViewModel);
    state.recordServerSearchKeys = new Set(evaluated.map(getRecordIdentityKey).filter(Boolean));
    state.recordDataMeta = {
      mode: searchResult.mode || 'search',
      collectedItems: found.length,
      estimatedTotalItems: searchResult.estimatedTotalItems || found.length,
      truncated: Boolean(searchResult.truncated)
    };

    fillRecordDynamicFilters();
    applyRecordFilters();
    showRecordsMessage(searchResult.truncated ? 'Suchtreffer geladen. Verfeinere die Suche bei Bedarf.' : '');
  } catch (error) {
    console.error('Datensatzsuche fehlgeschlagen.', error);
    applyRecordFilters();
    showRecordsMessage('Für diese Suche wurde kein Datensatz gefunden.');
  } finally {
    if (els.recordSearchButton) els.recordSearchButton.textContent = 'Suchen';
  }
}

export function queueRecordAutocomplete({
  state,
  els,
  looksLikeRecordId,
  hideRecordAutocomplete,
  loadRecordAutocomplete
}) {
  clearTimeout(state.recordAutocompleteTimer);
  state.recordAutocompleteRequestId += 1;
  const query = (els.recordSearchInput?.value || '').trim();

  if (!els.recordAutocompleteList || query.length < 3 || looksLikeRecordId(query)) {
    hideRecordAutocomplete();
    return;
  }

  state.recordAutocompleteTimer = setTimeout(() => {
    void loadRecordAutocomplete(query);
  }, 260);
}

export async function loadRecordAutocomplete({
  query,
  state,
  loadRecordAutocompleteSuggestions,
  renderRecordAutocomplete,
  hideRecordAutocomplete,
  selectedType
}) {
  const requestId = ++state.recordAutocompleteRequestId;

  try {
    const suggestions = await loadRecordAutocompleteSuggestions({
      query,
      selectedType: selectedType()
    });
    if (requestId !== state.recordAutocompleteRequestId) return;
    renderRecordAutocomplete(suggestions);
  } catch (error) {
    console.debug('Autocomplete konnte nicht geladen werden.', error);
    if (requestId === state.recordAutocompleteRequestId) hideRecordAutocomplete();
  }
}

export function renderRecordAutocomplete({
  suggestions,
  els,
  escapeHtml,
  formatNumber,
  hideRecordAutocomplete,
  onSubmitSuggestion
}) {
  if (!els.recordAutocompleteList) return;
  if (!suggestions.length) {
    hideRecordAutocomplete();
    return;
  }

  els.recordAutocompleteList.innerHTML = suggestions.map((suggestion, index) => `
    <button type="button" role="option" data-autocomplete-value="${escapeHtml(suggestion.value)}" aria-selected="${index === 0 ? 'true' : 'false'}">
      <span>${escapeHtml(suggestion.label)}</span>
      ${suggestion.count == null ? '' : `<small>${formatNumber(suggestion.count)}</small>`}
    </button>
  `).join('');
  els.recordAutocompleteList.hidden = false;

  els.recordAutocompleteList.querySelectorAll('button[data-autocomplete-value]').forEach((button) => {
    button.addEventListener('mousedown', (event) => event.preventDefault());
    button.addEventListener('click', () => {
      if (els.recordSearchInput) {
        els.recordSearchInput.value = button.dataset.autocompleteValue || button.textContent.trim();
      }
      hideRecordAutocomplete();
      void onSubmitSuggestion();
    });
  });
}

export function hideRecordAutocomplete({ state, els }) {
  clearTimeout(state.recordAutocompleteTimer);
  state.recordAutocompleteRequestId += 1;
  if (!els.recordAutocompleteList) return;
  els.recordAutocompleteList.hidden = true;
  els.recordAutocompleteList.innerHTML = '';
}
