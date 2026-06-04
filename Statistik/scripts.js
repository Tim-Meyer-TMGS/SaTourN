import { fetchText, parseXml, downloadText, createSelect, createStatusSetter, extractId, extractItems, extractTotal } from '../lib/browser.js';
import { evaluateAllItems, getCriteriaForType, getQualityAggregations, qualityCriteria, qualityHelpers } from './quality.js';

document.addEventListener('DOMContentLoaded', () => {
  const API_BASE = window.SATOURN_SEARCH_API_BASE
    || (location.hostname === 'localhost' || location.hostname === '127.0.0.1'
      ? 'http://localhost:3000/api/search'
      : 'https://satourn.onrender.com/api/search');
  const QUALITY_SCAN_API_BASE = window.SATOURN_QUALITY_SCAN_API_BASE
    || API_BASE.replace(/\/api\/search(?:\?.*)?$/, '/api/quality/scan');

  const CONCURRENCY = Math.max(1, Math.min(10, Number(window.SATOURN_STATISTIK_CONCURRENCY || 6)));
  const WARN_REQUEST_LIMIT = Number(window.SATOURN_STATISTIK_WARN_REQUESTS || 120);
  const QUALITY_ITEMS_PER_QUERY = Math.max(0, Math.min(50, Number(window.SATOURN_STATISTIK_QUALITY_ITEMS_PER_QUERY || 25)));
  const QUALITY_ITEM_MAX_ITEMS = Math.max(0, Math.min(5000, Number(window.SATOURN_STATISTIK_QUALITY_ITEM_MAX_ITEMS || 2000)));
  const AI_CHAT_CONFIG = {
    enabled: true,
    webhookUrl: 'https://n8n.oi.destination.one/webhook/b5b2471c-c5cf-4573-b965-ea60537d128d/chat',
    authHeaderName: 'satourn',
    authHeaderValue: 'satourn',
    maxItemsForContext: 50,
    timeoutMs: 30000,
    mockMode: false,
    ...(window.SATOURN_AI_CHAT_CONFIG || {})
  };

  const AI_SYSTEM_PROMPT_FOR_N8N = 'Du bist ein Datenqualitaets-Assistent fuer den SaTourN-Datenqualitaets-Monitor. Analysiere ausschliesslich den bereitgestellten Dashboard-Kontext. Beziehe dich auf die aktuell gefilterte Ansicht, aktive Fehlerlisten und aggregierte Kennzahlen. Erfinde keine Daten, die nicht im Kontext enthalten sind. Wenn Informationen fehlen, sage klar, dass sie in der aktuellen Ansicht oder im bereitgestellten Kontext nicht verfuegbar sind. Gib konkrete, priorisierte Empfehlungen zur Datenpflege. Antworte knapp, fachlich und handlungsorientiert.';

  const categoryTreeUrls = {
    Hotel: 'https://api.et4.de/Schema/eTouristV4/Vermieter/Sachsen-Tourismus/VermieterTree.xml',
    Event: 'https://api.et4.de/Schema/eTouristV4/Veranstaltung/Sachsen-Tourismus/VeranstaltungTree.xml',
    Gastro: 'https://api.et4.de/Schema/eTouristV4/Gastro/Sachsen-Tourismus/GastroTree.xml',
    Tour: 'https://api.et4.de/Schema/eTouristV4/Tour/Sachsen-Tourismus/TourTree.xml',
    POI: 'https://api.et4.de/Schema/eTouristV4/Poi/Sachsen-Tourismus/POITree.xml',
    Package: 'https://api.et4.de/Schema/eTouristV4/GlobalePauschale/Sachsen-Tourismus/GlobalePauschaleTree.xml'
  };

  const typesList = ['POI', 'Tour', 'Hotel', 'Event', 'Gastro', 'Package'];
  const ET4_PAGES_BASE_URL = 'https://pages.et4.de/de/statistik_sachsen/wlan/detail';
  const VERIFIED_ET4_PAGE_TYPES = new Set(['POI']);

  const elements = {
    typeContainer: document.getElementById('type-dropdown-container'),
    categoryContainer: document.getElementById('category-dropdown-container'),
    areaContainer: document.getElementById('area-dropdown-container'),
    placeContainer: document.getElementById('place-dropdown-container'),
    searchButton: document.getElementById('search-button'),
    cancelButton: document.getElementById('cancel-button'),
    exportButton: document.getElementById('export-button'),
    sortSelect: document.getElementById('sort-select'),
    qualitySearchInput: document.getElementById('quality-search-input'),
    qualityStatusSelect: document.getElementById('quality-status-select'),
    prioritySelect: document.getElementById('priority-select'),
    autoCheckSelect: document.getElementById('autocheck-select'),
    clearQualityFiltersButton: document.getElementById('clear-quality-filters-button'),
    viewNavButtons: Array.from(document.querySelectorAll('[data-statistik-view]')),
    viewPanels: Array.from(document.querySelectorAll('[data-view-panel]')),
    emptyState: document.getElementById('empty-state'),
    resultDiv: document.getElementById('result'),
    summary: document.getElementById('summary'),
    summaryStat: document.getElementById('summary-stat'),
    summaryOpen: document.getElementById('summary-open'),
    summaryPct: document.getElementById('summary-pct'),
    summaryErrors: document.getElementById('summary-errors'),
    qualitySummary: document.getElementById('quality-summary'),
    qualityScore: document.getElementById('quality-score'),
    qualityGood: document.getElementById('quality-good'),
    qualityCheck: document.getElementById('quality-check'),
    qualityCritical: document.getElementById('quality-critical'),
    qualityUnknown: document.getElementById('quality-unknown'),
    qualityTopIssue: document.getElementById('quality-top-issue'),
    issueSummary: document.getElementById('issue-summary'),
    issueList: document.getElementById('issue-list'),
    issueStatus: document.getElementById('issue-status'),
    qualitySampleNote: document.getElementById('quality-sample-note'),
    issueDetailSection: document.getElementById('issue-detail-section'),
    issueDetailTitle: document.getElementById('issue-detail-title'),
    issueDetailMeta: document.getElementById('issue-detail-meta'),
    issueDetailFilters: document.getElementById('issue-detail-filters'),
    issueDetailTable: document.getElementById('issue-detail-table'),
    issueCloseButton: document.getElementById('issue-close-button'),
    issuePagination: document.getElementById('issue-pagination'),
    issuePrevButton: document.getElementById('issue-prev-button'),
    issueNextButton: document.getElementById('issue-next-button'),
    issuePageStatus: document.getElementById('issue-page-status'),
    typeSummarySection: document.getElementById('type-summary-section'),
    typeSummaryTable: document.getElementById('type-summary-table'),
    criteriaMatrixSection: document.getElementById('criteria-matrix-section'),
    criteriaMatrixTable: document.getElementById('criteria-matrix-table'),
    chartContainer: document.getElementById('chart-container'),
    ratioChart: document.getElementById('ratio-chart'),
    typeChart: document.getElementById('type-chart'),
    allAreasCheckbox: document.getElementById('all-areas-checkbox'),
    loadingContainer: document.getElementById('loading-container'),
    coffeeFill: document.getElementById('coffee-fill'),
    statusPill: document.getElementById('status-pill'),
    statusText: document.getElementById('status-text'),
    progWrap: document.querySelector('.progWrap'),
    progBar: document.getElementById('prog-bar'),
    progMeta: document.getElementById('prog-meta'),
    prog: document.querySelector('.prog'),
    aiChatOpenButton: document.getElementById('ai-chat-open-button'),
    aiChatPanel: document.getElementById('ai-chat-panel'),
    aiChatCloseButton: document.getElementById('ai-chat-close-button'),
    aiChatContextNote: document.getElementById('ai-chat-context-note'),
    aiChatStatus: document.getElementById('ai-chat-status'),
    aiChatMessages: document.getElementById('ai-chat-messages'),
    aiChatChips: document.getElementById('ai-chat-chips'),
    aiChatForm: document.getElementById('ai-chat-form'),
    aiChatInput: document.getElementById('ai-chat-input'),
    aiChatSendButton: document.getElementById('ai-chat-send-button'),
    itemDetailPanel: document.getElementById('item-detail-panel'),
    itemDetailTitle: document.getElementById('item-detail-title'),
    itemDetailSubtitle: document.getElementById('item-detail-subtitle'),
    itemDetailContent: document.getElementById('item-detail-content'),
    itemDetailCloseButton: document.getElementById('item-detail-close-button')
  };

  const dashboardState = {
    selectedType: null,
    selectedCategory: null,
    selectedArea: null,
    selectedPlace: null,
    currentRun: null,
    areaCache: null,
    categoriesCache: new Map(),
    placeLoadSeq: 0,
    categoryLoadSeq: 0,
    latestRows: [],
    rawItemResponses: [],
    allItems: [],
    normalizedItems: [],
    filteredItems: [],
    qualityCriteria,
    qualityAggregations: getQualityAggregations([]),
    qualityDataMeta: {
      mode: 'sample',
      perQueryLimit: QUALITY_ITEMS_PER_QUERY,
      maxItems: QUALITY_ITEM_MAX_ITEMS,
      collectedItems: 0,
      estimatedTotalItems: 0,
      truncated: false,
      skippedResponses: 0,
      note: 'Qualitaetsdaten sind aktuell eine begrenzte Stichprobe aus den Statistik-Requests.'
    },
    activeFilters: {
      region: null,
      city: null,
      type: null,
      category: null,
      qualityStatus: null,
      criterionId: null,
      priority: null,
      autoCheck: null,
      search: ''
    },
    activeIssue: null,
    activeIssueType: null,
    activeView: 'overview',
    activePanel: 'overview',
    issueListPage: 0,
    issueListPageSize: 50,
    serverIssueList: {
      criterionId: null,
      type: null,
      items: [],
      diagnostic: null,
      page: null,
      stats: null,
      loading: false,
      error: null
    },
    activeDetailItem: null,
    sortBy: 'default',
    sortDirection: 'asc',
    aiChat: {
      open: false,
      isLoading: false,
      messages: []
    }
  };

  const state = dashboardState;

  window.satournDashboardState = dashboardState;
  window.satournQuality = {
    qualityCriteria,
    getCriteriaForType,
    evaluateAllItems,
    getQualityAggregations,
    helpers: qualityHelpers
  };
  window.satournAiChat = {
    config: AI_CHAT_CONFIG,
    systemPromptForN8n: AI_SYSTEM_PROMPT_FOR_N8N,
    buildAiContext,
    askN8nAiWebhook
  };

  const formatNumber = (value) => Number(value || 0).toLocaleString('de-DE');
  const QUALITY_EMPTY_TEXT = 'Fuer die aktuelle Auswahl wurden keine Qualitaetsprobleme gefunden.';
  const EMPTY_STATES = Object.freeze({
    initial: 'Noch keine Abfrage gestartet.',
    loading: 'Daten werden geladen ...',
    noResults: 'Fuer die aktuelle Auswahl wurden keine Datensaetze gefunden.',
    emptyJson: 'Die Abfrage war erfolgreich, enthielt aber keine auswertbaren Datensaetze.',
    noExport: 'Fuer die aktuelle Ansicht liegen keine exportierbaren Daten vor.',
    noAiData: 'Fuer die aktuelle Ansicht liegen keine auswertbaren Daten fuer die KI-Analyse vor.'
  });
  const ISSUE_LIST_COLUMNS = [
    'Titel',
    'ID',
    'Typ',
    'Gebiet',
    'Ort',
    'Kategorie',
    'Fehlendes Kriterium',
    'Prioritaet',
    'Qualitaets-Score',
    'Qualitaetsstatus',
    'Open-Data',
    'Lizenz',
    'Letzte Aktualisierung',
    'Empfohlene Aktion',
    'Link / URL'
  ];

  function panelMatchesActiveView(panel) {
    const viewIds = String(panel?.dataset?.viewPanel || '')
      .split(/\s+/)
      .map((value) => value.trim())
      .filter(Boolean);
    return viewIds.includes(state.activePanel);
  }

  function updateViewNavigation() {
    elements.viewNavButtons.forEach((button) => {
      const active = button.dataset.statistikView === state.activePanel;
      button.classList.toggle('active', active);
      if (active) {
        button.setAttribute('aria-current', 'page');
      } else {
        button.removeAttribute('aria-current');
      }
    });

    elements.viewPanels.forEach((panel) => {
      panel.classList.toggle('panel-hidden', !panelMatchesActiveView(panel));
    });
  }

  function setActivePanel(panelId) {
    if (!panelId) return;
    if (panelId === 'ai') {
      state.activePanel = 'ai';
      updateViewNavigation();
      openAiChatPanel();
      return;
    }

    state.activePanel = panelId;
    updateViewNavigation();
    updateAiContextNote();
  }

  const cleanQueryValue = (value) => String(value || '').replaceAll('"', '').trim();

  const shortError = (error) => {
    if (!error) return 'Unbekannter Fehler';
    if (error.name === 'AbortError') return 'Abgebrochen';
    return String(error.message || error).slice(0, 180);
  };

  const setPill = createStatusSetter(elements.statusPill);

  function setEmptyState(message, show = true) {
    if (!elements.emptyState) return;
    elements.emptyState.textContent = message || '';
    elements.emptyState.hidden = !show;
  }

  function debounce(fn, delay = 220) {
    let timer = null;
    return (...args) => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => fn(...args), delay);
    };
  }

  function setProgress(done, total) {
    const pct = total > 0 ? Math.round((done / total) * 100) : 0;
    if (elements.progBar) elements.progBar.style.width = `${Math.max(0, Math.min(100, pct))}%`;
    if (elements.progMeta) elements.progMeta.textContent = `${done}/${total}`;
    if (elements.prog) elements.prog.setAttribute('aria-valuenow', String(pct));
  }

  function showProgress(show) {
    elements.progWrap.hidden = !show;
  }

  function toggleLoading(show) {
    elements.loadingContainer.hidden = !show;
    if (show) setEmptyState(EMPTY_STATES.loading);
    if (elements.coffeeFill) {
      elements.coffeeFill.style.transform = show ? 'scaleY(1)' : 'scaleY(0)';
    }
  }

  function setRunning(running) {
    elements.searchButton.disabled = running;
    elements.cancelButton.disabled = !running;
    elements.exportButton.disabled = running || state.latestRows.length === 0;
    elements.sortSelect.disabled = running;
    disableInputs(running || elements.allAreasCheckbox.checked);
  }

  function resetOutput() {
    state.latestRows = [];
    resetQualityData();
    elements.resultDiv.replaceChildren();
    elements.resultDiv.hidden = true;
    elements.summary.hidden = true;
    elements.qualitySummary.hidden = true;
    elements.issueSummary.hidden = true;
    elements.issueList.replaceChildren();
    elements.issueStatus.textContent = '';
    elements.qualitySampleNote.hidden = true;
    elements.issueDetailSection.hidden = true;
    elements.issueDetailTable.replaceChildren();
    elements.issueDetailMeta.textContent = '';
    elements.issueDetailFilters.textContent = '';
    elements.issuePagination.hidden = true;
    elements.typeSummarySection.hidden = true;
    elements.typeSummaryTable.replaceChildren();
    elements.criteriaMatrixSection.hidden = true;
    elements.criteriaMatrixTable.replaceChildren();
    elements.chartContainer.hidden = true;
    elements.exportButton.disabled = true;
    closeItemDetailPanel({ restoreFocus: false });
    setEmptyState(EMPTY_STATES.initial);
    updateAiContextNote();
  }

  function buildUrl(type, rawQuery = '', isOpenData = false, limit = null) {
    const url = new URL(API_BASE, window.location.origin);
    url.searchParams.set('type', type || '');
    url.searchParams.set('query', rawQuery || '');
    if (isOpenData) url.searchParams.set('isOpenData', 'true');
    if (Number.isFinite(limit)) url.searchParams.set('limit', String(Math.max(1, Math.floor(limit))));
    return url.toString();
  }

  function parseJsonPayload(text) {
    try {
      return JSON.parse(text);
    } catch {
      const preview = String(text || '').slice(0, 300).replace(/\s+/g, ' ');
      throw new Error(`JSON Parse-Fehler. Inhalt: "${preview}..."`);
    }
  }

  function normalizeString(value) {
    if (value == null) return null;

    if (Array.isArray(value)) {
      return value.map(normalizeString).find(Boolean) || null;
    }

    if (typeof value === 'object') {
      for (const key of ['title', 'Title', 'name', 'Name', 'label', 'Label', 'value', 'Value', 'text', 'Text', 'id', 'ID']) {
        const nested = normalizeString(value[key]);
        if (nested) return nested;
      }
      return null;
    }

    const text = String(value).replace(/\s+/g, ' ').trim();
    return text || null;
  }

  function normalizeType(value) {
    const text = normalizeString(value);
    if (!text) return 'Unbekannt';

    const normalized = text.toLowerCase().replace(/[\s_-]+/g, '');
    const typeMap = new Map([
      ['poi', 'POI'],
      ['pointofinterest', 'POI'],
      ['sehenswuerdigkeit', 'POI'],
      ['tour', 'Tour'],
      ['route', 'Tour'],
      ['hotel', 'Hotel'],
      ['vermieter', 'Hotel'],
      ['unterkunft', 'Hotel'],
      ['event', 'Event'],
      ['veranstaltung', 'Event'],
      ['gastro', 'Gastro'],
      ['gastronomie', 'Gastro'],
      ['restaurant', 'Gastro'],
      ['package', 'Package'],
      ['pauschale', 'Package'],
      ['globalepauschale', 'Package'],
      ['angebot', 'Package'],
      ['area', 'Area'],
      ['gebiet', 'Area'],
      ['city', 'City'],
      ['ort', 'City'],
      ['stadt', 'City']
    ]);

    return typeMap.get(normalized) || text;
  }

  function safeArray(value) {
    if (value == null) return [];
    return Array.isArray(value) ? value : [value];
  }

  function getNestedValue(obj, path) {
    if (!obj || !path) return null;
    return String(path).split('.').reduce((current, segment) => {
      if (current == null) return null;
      if (Array.isArray(current)) {
        return current.map((item) => item?.[segment]).find((value) => value != null) ?? null;
      }
      return current?.[segment] ?? null;
    }, obj);
  }

  function hasMeaningfulValue(value) {
    if (value == null) return false;
    if (Array.isArray(value)) return value.some(hasMeaningfulValue);
    if (typeof value === 'object') return Object.values(value).some(hasMeaningfulValue);
    return String(value).trim() !== '';
  }

  function firstValue(obj, paths) {
    for (const path of paths) {
      const value = getNestedValue(obj, path);
      if (hasMeaningfulValue(value)) return value;
    }
    return null;
  }

  function normalizeContextValue(value) {
    const text = normalizeString(value);
    return text && text !== '-' ? text : null;
  }

  function normalizeBoolean(value) {
    if (typeof value === 'boolean') return value;
    const text = normalizeString(value);
    if (!text) return null;
    if (/^(true|1|ja|yes|y)$/i.test(text)) return true;
    if (/^(false|0|nein|no|n)$/i.test(text)) return false;
    return null;
  }

  function normalizeNumber(value) {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    const text = normalizeString(value);
    if (!text) return null;
    const normalized = Number(text.replace(',', '.'));
    return Number.isFinite(normalized) ? normalized : null;
  }

  function firstNormalizedValue(values) {
    return safeArray(values).map(normalizeString).find(Boolean) || null;
  }

  function normalizeLicense(rawItem) {
    return qualityHelpers.getAttributeValue(rawItem, 'license') || normalizeString(firstValue(rawItem, [
      'license',
      'licenses',
      'attribute_license',
      'attributeLicense',
      'copyright',
      'copyright.license',
      'media.license',
      'images.license'
    ]));
  }

  function normalizeOpenData(rawItem, context, license) {
    const explicit = normalizeBoolean(firstValue(rawItem, [
      'isOpenData',
      'openData',
      'opendata',
      'is_open_data',
      'open_data'
    ]));
    if (explicit != null) return explicit;
    if (context?.isOpenDataRequest) return true;
    if (!license) return null;
    return /\b(CC0|CC-BY|CC-BY-SA|PD)\b/i.test(license);
  }

  function normalizeCoordinates(rawItem) {
    const lat = normalizeNumber(firstValue(rawItem, [
      'lat',
      'latitude',
      'geo.main.latitude',
      'geo.lat',
      'geo.latitude',
      'coordinates.lat',
      'coordinates.latitude',
      'location.lat',
      'location.latitude'
    ]));
    const lon = normalizeNumber(firstValue(rawItem, [
      'lon',
      'lng',
      'long',
      'longitude',
      'geo.main.longitude',
      'geo.lon',
      'geo.lng',
      'geo.longitude',
      'coordinates.lon',
      'coordinates.lng',
      'coordinates.longitude',
      'location.lon',
      'location.lng',
      'location.longitude'
    ]));

    return lat != null && lon != null ? { lat, lon } : null;
  }

  function countMedia(rawItem) {
    const media = qualityHelpers.getMediaObjects(rawItem).filter(qualityHelpers.isCheckableMediaObject);
    return media.length || null;
  }

  function normalizeSourceUrl(rawItem) {
    return normalizeString(firstValue(rawItem, [
      'sourceUrl',
      'url',
      'Url',
      'link',
      'Link',
      'web',
      'website',
      'homepage',
      'source.url',
      'presentation.url',
      'presentation.link'
    ]));
  }

  function getGlobalId(rawItem) {
    return normalizeString(firstValue(rawItem, ['global_id', 'globalId', 'globalID']));
  }

  function buildEt4PagesUrl({ type, globalId } = {}) {
    const normalizedType = normalizeType(type);
    const normalizedGlobalId = normalizeString(globalId);
    if (!normalizedGlobalId || !VERIFIED_ET4_PAGE_TYPES.has(normalizedType)) return null;
    return `${ET4_PAGES_BASE_URL}/${encodeURIComponent(normalizedType)}/${encodeURIComponent(normalizedGlobalId)}/x`;
  }

  function normalizeErrors(rawItem, context) {
    return [
      ...safeArray(firstValue(rawItem, ['errors', 'error', 'validationErrors'])),
      ...safeArray(context?.errors)
    ].map(normalizeString).filter(Boolean);
  }

  function normalizeItem(rawItem, context = {}) {
    const raw = rawItem && typeof rawItem === 'object' ? rawItem : { value: rawItem };
    const type = normalizeType(firstValue(raw, ['type', 'Type', 'objectType', '@type', 'touristType']) || context.type);
    const license = normalizeLicense(raw);
    const errors = normalizeErrors(raw, context);
    const category = firstNormalizedValue(qualityHelpers.getCategoryValues(raw)) || normalizeContextValue(context.category);
    const region = firstNormalizedValue(qualityHelpers.getAreaValues(raw)) || normalizeContextValue(context.region);
    const globalId = getGlobalId(raw);

    return {
      id: normalizeString(extractId(raw)) || normalizeString(firstValue(raw, ['global_id', 'globalId', 'id', 'Id', 'ID'])) || null,
      globalId,
      title: normalizeString(firstValue(raw, [
        'title',
        'Title',
        'name',
        'Name',
        'headline',
        'presentation.title',
        'presentation.name'
      ])) || 'Ohne Titel',
      type,
      category,
      region,
      city: normalizeString(firstValue(raw, ['city', 'place', 'town', 'municipality', 'address.city', 'address.town'])) || normalizeContextValue(context.city),
      isOpenData: normalizeOpenData(raw, context, license),
      license,
      hasErrors: errors.length > 0,
      errors,
      missingCriteria: [],
      fulfilledCriteria: [],
      manualCriteria: [],
      qualityScore: null,
      qualityStatus: 'nicht berechenbar',
      recommendations: [],
      coordinates: normalizeCoordinates(raw),
      imageCount: countMedia(raw),
      descriptionAvailable: qualityHelpers.hasDetailsText(raw),
      openingHoursAvailable: qualityHelpers.hasOpeningHours(raw),
      bookingLinkAvailable: qualityHelpers.hasBookingLink(raw),
      updatedAt: normalizeString(firstValue(raw, ['updatedAt', 'modifiedAt', 'lastModified', 'changed', 'dateModified'])),
      pageUrl: buildEt4PagesUrl({ type, globalId }),
      sourceUrl: normalizeSourceUrl(raw),
      raw
    };
  }

  function normalizeItems(rawResponses) {
    return safeArray(rawResponses).flatMap((response) => {
      const payload = response?.payload ?? response?.raw ?? response;
      const context = response?.context || {};
      return extractItems(payload).map((item) => normalizeItem(item, context));
    });
  }

  function uniqueNormalizedItems(items) {
    const seen = new Set();
    return items.filter((item, index) => {
      const key = item.id || `${item.type}|${item.title}|${item.region || ''}|${item.city || ''}|${item.category || ''}|${index}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  function resetServerIssueList() {
    state.serverIssueList = {
      criterionId: null,
      type: null,
      items: [],
      diagnostic: null,
      page: null,
      stats: null,
      loading: false,
      error: null
    };
  }

  function resetQualityData() {
    state.rawItemResponses = [];
    state.allItems = [];
    state.normalizedItems = [];
    state.filteredItems = [];
    state.qualityAggregations = getQualityAggregations([]);
    state.qualityDataMeta = {
      mode: 'sample',
      perQueryLimit: QUALITY_ITEMS_PER_QUERY,
      maxItems: QUALITY_ITEM_MAX_ITEMS,
      collectedItems: 0,
      estimatedTotalItems: 0,
      truncated: false,
      skippedResponses: 0,
      note: 'Qualitaetsdaten sind aktuell eine begrenzte Stichprobe aus den Statistik-Requests.'
    };
    state.activeIssue = null;
    state.activeIssueType = null;
    resetServerIssueList();
    state.activeView = 'overview';
    state.issueListPage = 0;
    state.activeFilters.qualityStatus = null;
    state.activeFilters.criterionId = null;
    state.activeFilters.priority = null;
    state.activeFilters.autoCheck = null;
    state.activeFilters.search = '';
  }

  function syncActiveFilters(filters) {
    const activeFilters = filters || {
      area: elements.allAreasCheckbox.checked ? null : state.selectedArea,
      place: elements.allAreasCheckbox.checked ? null : state.selectedPlace,
      type: elements.allAreasCheckbox.checked ? null : state.selectedType,
      category: elements.allAreasCheckbox.checked ? null : state.selectedCategory
    };

    state.activeFilters.region = activeFilters.area || null;
    state.activeFilters.city = activeFilters.place || null;
    state.activeFilters.type = activeFilters.type || null;
    state.activeFilters.category = activeFilters.category || null;
    state.activeFilters.qualityStatus = elements.qualityStatusSelect?.value || null;
    state.activeFilters.priority = elements.prioritySelect?.value || null;
    state.activeFilters.autoCheck = elements.autoCheckSelect?.value === ''
      ? null
      : elements.autoCheckSelect?.value === 'true';
    state.activeFilters.search = normalizeString(elements.qualitySearchInput?.value) || '';
    state.sortBy = elements.sortSelect.value || 'default';
    state.sortDirection = state.sortBy.endsWith('-desc') ? 'desc' : 'asc';
  }

  function itemMatchesCriterionMeta(item, predicate) {
    const criterionIds = Array.from(new Set([
      ...safeArray(item?.missingCriteria),
      ...safeArray(item?.manualCriteria)
    ]));
    return criterionIds.some((criterionId) => {
      const criterion = getCriterionById(criterionId);
      return criterion ? predicate(criterion) : false;
    });
  }

  function itemMatchesActiveFilters(item, options = {}) {
    const filters = state.activeFilters;
    const includeCriterion = options.includeCriterion !== false;
    const matches = (actual, expected) => !expected || normalizeString(actual) === normalizeString(expected);

    if (!matches(item.region, filters.region)) return false;
    if (!matches(item.city, filters.city)) return false;
    if (!matches(item.type, filters.type)) return false;
    if (!matches(item.category, filters.category)) return false;
    if (filters.qualityStatus && item.qualityStatus !== filters.qualityStatus) return false;
    if (filters.priority && !itemMatchesCriterionMeta(item, (criterion) => normalizeString(criterion.priority) === filters.priority)) return false;
    if (filters.autoCheck != null && !itemMatchesCriterionMeta(item, (criterion) => (criterion.autoCheck !== false) === filters.autoCheck)) return false;
    if (includeCriterion && filters.criterionId && !safeArray(item.missingCriteria).includes(filters.criterionId)) return false;
    if (filters.search) {
      const haystack = [
        item.id,
        item.title,
        item.type,
        item.category,
        item.region,
        item.city
      ].map((value) => normalizeString(value) || '').join(' ').toLowerCase();
      if (!haystack.includes(String(filters.search).trim().toLowerCase())) return false;
    }

    return true;
  }

  function getBaseFilteredItems() {
    return state.normalizedItems.filter((item) => itemMatchesActiveFilters(item, { includeCriterion: false }));
  }

  function getIssueFilteredItems(items) {
    const criterionId = state.activeFilters.criterionId;
    if (!criterionId) return items;
    return safeArray(items).filter((item) => safeArray(item.missingCriteria).includes(criterionId));
  }

  function refreshFilteredItems() {
    const baseFilteredItems = getBaseFilteredItems();
    state.filteredItems = getIssueFilteredItems(baseFilteredItems);
    state.qualityAggregations = getQualityAggregations(baseFilteredItems);
    return state.filteredItems;
  }

  function refreshNormalizedItems() {
    const normalizedItems = evaluateAllItems(uniqueNormalizedItems(normalizeItems(state.rawItemResponses)));
    state.normalizedItems = normalizedItems;
    state.allItems = normalizedItems.map((item) => item.raw);
    refreshFilteredItems();
    return normalizedItems;
  }

  function refreshAfterActiveFilterChange() {
    closeItemDetailPanel({ restoreFocus: false });
    syncActiveFilters();
    if (state.activeIssue) {
      state.activeIssueType = state.activeFilters.type || null;
      state.issueListPage = 0;
      resetServerIssueList();
      if (state.activeIssueType) void loadServerIssueList();
    }
    if (hasQualityOutputContext()) {
      renderAll();
      updateAiContextNote();
      return;
    }
    refreshFilteredItems();
    updateAiContextNote();
  }

  function clearQualityFilters() {
    elements.qualitySearchInput.value = '';
    elements.qualityStatusSelect.value = '';
    elements.prioritySelect.value = '';
    elements.autoCheckSelect.value = '';
    state.activeFilters.search = '';
    state.activeFilters.qualityStatus = null;
    state.activeFilters.priority = null;
    state.activeFilters.autoCheck = null;
    refreshAfterActiveFilterChange();
  }

  function extractItemTitles(jsonText) {
    const getTitle = (item) => [
      item?.title,
      item?.Title,
      item?.name,
      item?.Name,
      item?.presentation?.title,
      item?.presentation?.name
    ].map((value) => String(value ?? '').trim()).find(Boolean) || '';

    return extractItems(parseJsonPayload(jsonText))
      .map(getTitle)
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b, 'de'));
  }

  async function loadAreaTitles(signal) {
    if (state.areaCache) return state.areaCache;
    const response = await fetchText(buildUrl('Area'), { signal });
    if (!response.ok) {
      throw new Error(`API-Fehler beim Laden der Gebiete: HTTP ${response.status}`);
    }
    try {
      const titles = extractItemTitles(response.text);
      state.areaCache = titles;
      return titles;
    } catch (err) {
      throw new Error(`${err.message} (URL: ${buildUrl('Area')}, status: ${response.status}, contentType: ${response.contentType})`);
    }
  }

  async function loadCityTitles(area, signal) {
    if (!area) return [];
    const query = `area:"${cleanQueryValue(area)}"`;
    const response = await fetchText(buildUrl('City', query), { signal });
    if (!response.ok) {
      throw new Error(`API-Fehler beim Laden der Orte: HTTP ${response.status}`);
    }
    try {
      return extractItemTitles(response.text);
    } catch (err) {
      throw new Error(`${err.message} (URL: ${buildUrl('City', query)}, status: ${response.status}, contentType: ${response.contentType})`);
    }
  }

  async function ensureCategoriesForType(type, signal) {
    if (!type) return [];
    if (state.categoriesCache.has(type)) return state.categoriesCache.get(type);

    const treeUrl = categoryTreeUrls[type];
    if (!treeUrl) {
      state.categoriesCache.set(type, []);
      return [];
    }

    try {
      const response = await fetchText(treeUrl, { signal });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status} beim Laden des Category-Tree`);
      }
      let xml;
      try {
        xml = parseXml(response.text);
      } catch (err) {
        throw new Error(`${err.message} (URL: ${treeUrl}, status: ${response.status}, contentType: ${response.contentType})`);
      }
      const categories = [...new Set(Array.from(xml.getElementsByTagName('Category'))
        .map((cat) => cat.getAttribute('Name'))
        .filter(Boolean))]
        .sort((a, b) => a.localeCompare(b, 'de'));
      state.categoriesCache.set(type, categories);
      return categories;
    } catch (error) {
      if (error.name === 'AbortError') throw error;
      console.warn('Kategorie-Tree nicht ladbar:', type, error);
      state.categoriesCache.set(type, []);
      return [];
    }
  }

  async function loadAreas() {
    setPill('run', 'Gebiete werden geladen');
    try {
      const areas = await loadAreaTitles();
      createSelect({
        id: 'areas-dropdown',
        container: elements.areaContainer,
        placeholder: 'Keine Auswahl',
        values: areas,
        onChange: async (value) => {
          state.selectedArea = value;
          state.selectedPlace = null;
          syncActiveFilters();
          refreshAfterActiveFilterChange();
          await loadPlaces(value);
        }
      });
      setPill('ok', 'bereit');
    } catch (error) {
      elements.areaContainer.textContent = 'Fehler beim Laden der Gebiete.';
      setPill('err', 'fehler');
      console.error(error);
    }
  }

  async function loadPlaces(area) {
    const loadId = ++state.placeLoadSeq;

    createSelect({
      id: 'places-dropdown',
      container: elements.placeContainer,
      placeholder: area ? 'Lädt...' : 'Keine Auswahl',
      values: [],
      onChange: (value) => {
        state.selectedPlace = value;
        syncActiveFilters();
        refreshAfterActiveFilterChange();
      }
    });

    if (!area) {
      setPill('ok', 'bereit');
      return;
    }

    const controller = new AbortController();
    setPill('run', 'Orte werden geladen');

    try {
      const places = await loadCityTitles(area, controller.signal);
      if (loadId !== state.placeLoadSeq || state.selectedArea !== area) return;

      createSelect({
        id: 'places-dropdown',
        container: elements.placeContainer,
        placeholder: 'Keine Auswahl',
        values: places,
        onChange: (value) => {
          state.selectedPlace = value;
          syncActiveFilters();
          refreshAfterActiveFilterChange();
        }
      });
      setPill('ok', 'bereit');
    } catch (error) {
      if (loadId !== state.placeLoadSeq) return;
      elements.placeContainer.textContent = 'Fehler beim Laden der Orte.';
      setPill('err', 'fehler');
      console.error(error);
    }
  }

  async function loadCategorySelect(type) {
    const loadId = ++state.categoryLoadSeq;
    state.selectedCategory = null;
    syncActiveFilters();
    refreshAfterActiveFilterChange();

    if (!type) {
      const select = createSelect({
        id: 'category-dropdown',
        container: elements.categoryContainer,
        placeholder: 'Erst Typ wählen',
        values: [],
        onChange: (value) => {
          state.selectedCategory = value;
          syncActiveFilters();
          refreshAfterActiveFilterChange();
        }
      });
      select.disabled = true;
      return;
    }

    createSelect({
      id: 'category-dropdown',
      container: elements.categoryContainer,
      placeholder: 'Lädt...',
      values: [],
      onChange: (value) => {
        state.selectedCategory = value;
        syncActiveFilters();
        refreshAfterActiveFilterChange();
      }
    });

    const categories = await ensureCategoriesForType(type);
    if (loadId !== state.categoryLoadSeq || state.selectedType !== type) return;

    createSelect({
      id: 'category-dropdown',
      container: elements.categoryContainer,
      placeholder: categories.length ? 'Keine Auswahl' : 'Keine Kategorien gefunden',
      values: categories,
      onChange: (value) => {
        state.selectedCategory = value;
        syncActiveFilters();
        refreshAfterActiveFilterChange();
      }
    });
    disableInputs(elements.allAreasCheckbox.checked || !!state.currentRun);
  }

  function loadTypes() {
    createSelect({
      id: 'type-dropdown',
      container: elements.typeContainer,
      placeholder: 'Keine Auswahl',
      values: typesList,
      onChange: async (value) => {
        state.selectedType = value;
        syncActiveFilters();
        refreshAfterActiveFilterChange();
        await loadCategorySelect(value);
      }
    });
  }

  function buildQuery({ area, place, category }) {
    const segments = [];
    if (area) segments.push(`area:"${cleanQueryValue(area)}"`);
    if (place) segments.push(`city:"${cleanQueryValue(place)}"`);
    if (category) segments.push(`category:"${cleanQueryValue(category)}"`);
    return segments.join(' AND ');
  }

  function buildActiveIssueBaseQuery() {
    return buildQuery({
      area: state.activeFilters.region,
      place: state.activeFilters.city,
      category: state.activeFilters.category
    });
  }

  function buildQualityScanUrl({ criterionId, type, cursor = 0 }) {
    const url = new URL(QUALITY_SCAN_API_BASE, window.location.origin);
    url.searchParams.set('criterionId', criterionId);
    url.searchParams.set('type', type);
    url.searchParams.set('query', buildActiveIssueBaseQuery());
    url.searchParams.set('limit', String(state.issueListPageSize));
    url.searchParams.set('scanPageSize', '100');
    url.searchParams.set('maxPages', '5');
    if (Number.isFinite(cursor) && cursor > 0) url.searchParams.set('cursor', String(cursor));
    return url.toString();
  }

  function canUseServerIssueList() {
    return Boolean(state.activeIssue && state.activeIssueType);
  }

  function isActiveServerIssueList() {
    return (
      state.serverIssueList?.criterionId === state.activeIssue &&
      state.serverIssueList?.type === state.activeIssueType
    );
  }

  async function loadServerIssueList({ cursor = 0, append = false } = {}) {
    if (!canUseServerIssueList()) {
      resetServerIssueList();
      return;
    }

    const criterionId = state.activeIssue;
    const type = state.activeIssueType;
    const previous = append && isActiveServerIssueList()
      ? state.serverIssueList
      : {
        criterionId,
        type,
        items: [],
        diagnostic: null,
        page: null,
        stats: null
      };
    state.serverIssueList = {
      ...previous,
      criterionId,
      type,
      loading: true,
      error: null
    };
    renderIssueList();

    try {
      const response = await fetch(buildQualityScanUrl({ criterionId, type, cursor }), {
        headers: { Accept: 'application/json,*/*;q=0.8' }
      });
      const text = await response.text();
      const payload = parseJsonPayload(text);
      if (!response.ok) {
        throw new Error(payload?.error || payload?.details || `HTTP ${response.status}`);
      }

      state.serverIssueList = {
        criterionId,
        type,
        items: append && isActiveServerIssueList()
          ? [...safeArray(state.serverIssueList.items), ...safeArray(payload.items)]
          : safeArray(payload.items),
        diagnostic: payload.diagnostic || null,
        page: payload.page || null,
        stats: payload.stats || null,
        loading: false,
        error: null
      };
    } catch (error) {
      state.serverIssueList = {
        ...(isActiveServerIssueList() ? state.serverIssueList : { criterionId, type, items: [] }),
        criterionId,
        type,
        loading: false,
        error: shortError(error)
      };
    }

    renderIssueList();
    updateAiContextNote();
  }

  function makeRow({ type, query, area, place = '-', category = '-' }) {
    return {
      index: 0,
      area: area || '-',
      place: place || '-',
      type,
      category: category || '-',
      query: query || '',
      statistikCount: null,
      openDataCount: null,
      errors: []
    };
  }

  function buildQueryRows(filters, areasList = [], categories = []) {
    const rows = [];
    const push = (row) => rows.push(makeRow(row));

    if (filters.allAreas) {
      areasList.forEach((area) => {
        typesList.forEach((type) => push({ type, query: buildQuery({ area }), area }));
      });
      return rows.map((row, index) => ({ ...row, index }));
    }

    const { area, place, type, category } = filters;

    if (!area && !place && type) {
      areasList.forEach((areaItem) => {
        if (categories.length) {
          categories.forEach((category) => {
            push({
              type,
              query: buildQuery({ area: areaItem, category }),
              area: areaItem,
              category
            });
          });
        } else {
          push({ type, query: buildQuery({ area: areaItem }), area: areaItem });
        }
      });
      return rows.map((row, index) => ({ ...row, index }));
    }

    if (!area && !place && !type) {
      typesList.forEach((typeItem) => push({ type: typeItem, query: '', area: 'Sachsen' }));
      return rows.map((row, index) => ({ ...row, index }));
    }

    if (area && !place && !type) {
      typesList.forEach((typeItem) => push({ type: typeItem, query: buildQuery({ area }), area }));
      return rows.map((row, index) => ({ ...row, index }));
    }

    if (area && type && !place) {
      push({ type, query: buildQuery({ area, category }), area, category });
      return rows.map((row, index) => ({ ...row, index }));
    }

    if (!area && place && !type) {
      typesList.forEach((typeItem) => push({ type: typeItem, query: buildQuery({ place }), area: '-', place }));
      return rows.map((row, index) => ({ ...row, index }));
    }

    if (!area && place && type) {
      push({ type, query: buildQuery({ place, category }), area: '-', place, category });
      return rows.map((row, index) => ({ ...row, index }));
    }

    if (area && place && !type) {
      typesList.forEach((typeItem) => push({ type: typeItem, query: buildQuery({ area, place }), area, place }));
      return rows.map((row, index) => ({ ...row, index }));
    }

    if (area && place && type) {
      push({ type, query: buildQuery({ area, place, category }), area, place, category });
      return rows.map((row, index) => ({ ...row, index }));
    }

    return rows.map((row, index) => ({ ...row, index }));
  }

  async function prepareRows(filters, signal) {
    let areas = [];
    let categories = [];

    if (filters.allAreas || (!filters.area && !filters.place && filters.type)) {
      areas = await loadAreaTitles(signal);
    }

    if (!filters.area && !filters.place && filters.type) {
      categories = filters.category
        ? [filters.category]
        : await ensureCategoriesForType(filters.type, signal);
    }

    return buildQueryRows(filters, areas, categories);
  }

  function collectRawItemsFromJob(job, payload, totalCount) {
    if (job.isOpenData) return;

    const meta = state.qualityDataMeta;
    const availableItems = extractItems(payload);
    const remaining = Math.max(0, meta.maxItems - meta.collectedItems);
    const shouldCollect = meta.perQueryLimit > 0 && meta.maxItems > 0 && remaining > 0;

    if (Number.isFinite(totalCount)) {
      meta.estimatedTotalItems += totalCount;
    }

    if (!shouldCollect) {
      meta.truncated = meta.truncated || availableItems.length > 0 || totalCount > 0;
      meta.skippedResponses += 1;
      return;
    }

    const sampledItems = availableItems.slice(0, Math.min(meta.perQueryLimit, remaining));
    meta.collectedItems += sampledItems.length;
    meta.truncated = meta.truncated || sampledItems.length < availableItems.length || totalCount > sampledItems.length;
    if (meta.collectedItems >= meta.maxItems) meta.truncated = true;

    if (!sampledItems.length) return;

    state.rawItemResponses.push({
      payload: { items: sampledItems },
      context: {
        type: job.row.type,
        region: job.row.area,
        city: job.row.place,
        category: job.row.category,
        query: job.row.query,
        isOpenDataRequest: false,
        errors: []
      }
    });
  }

  async function fetchCountForJob(job, signal) {
    const limit = job.isOpenData || QUALITY_ITEMS_PER_QUERY <= 0 ? 1 : QUALITY_ITEMS_PER_QUERY;
    const url = buildUrl(job.row.type, job.row.query, job.isOpenData, limit);
    const response = await fetchText(url, { signal });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} beim Abrufen der Zahl (URL: ${url})`);
    }
    try {
      const payload = parseJsonPayload(response.text);
      const count = extractTotal(payload);
      if (!Number.isFinite(count)) throw new Error('overallcount fehlt oder ist ungueltig');
      collectRawItemsFromJob(job, payload, count);
      return count;
    } catch (err) {
      const preview = String(response.text || '').slice(0, 400).replace(/\s+/g, ' ');
      throw new Error(`${err.message} (URL: ${url}, status: ${response.status}, contentType: ${response.contentType}, preview: "${preview}...")`);
    }
  }

  async function runQueue(rows, run) {
    const jobs = rows.flatMap((row) => [
      { row, kind: 'statistikCount', label: 'SaTourN', isOpenData: false },
      { row, kind: 'openDataCount', label: 'Open-Data', isOpenData: true }
    ]);

    const total = jobs.length;
    let done = 0;
    let cursor = 0;

    setProgress(0, total);

    async function worker() {
      while (cursor < jobs.length && !run.aborted) {
        const job = jobs[cursor];
        cursor += 1;

        try {
          job.row[job.kind] = await fetchCountForJob(job, run.controller.signal);
        } catch (error) {
          if (error.name === 'AbortError') {
            run.aborted = true;
          } else {
            job.row.errors.push(`${job.label}: ${shortError(error)}`);
          }
        } finally {
          done += 1;
          setProgress(done, total);
          setPill('run', `lädt ${done}/${total}`);
        }
      }
    }

    await Promise.all(Array.from({ length: Math.min(CONCURRENCY, total) }, worker));
  }

  function hasValidCounts(row) {
    return Number.isFinite(row.statistikCount) && Number.isFinite(row.openDataCount);
  }

  function rowPercent(row) {
    if (!hasValidCounts(row) || row.statistikCount <= 0) return null;
    return (Math.min(row.openDataCount, row.statistikCount) / row.statistikCount) * 100;
  }

  function computeSummary(rows) {
    const validRows = rows.filter(hasValidCounts);
    const statistikTotal = validRows.reduce((sum, row) => sum + row.statistikCount, 0);
    const openDataTotal = validRows.reduce((sum, row) => sum + row.openDataCount, 0);
    const pct = statistikTotal > 0
      ? (Math.min(openDataTotal, statistikTotal) / statistikTotal) * 100
      : 0;
    const errorRows = rows.filter((row) => row.errors.length > 0 || !hasValidCounts(row)).length;

    return { statistikTotal, openDataTotal, pct, errorRows };
  }

  function sortedRows(rows) {
    const copy = [...rows];
    const valueOrMinus = (value) => Number.isFinite(value) ? value : -1;

    switch (elements.sortSelect.value) {
      case 'pct-desc':
        return copy.sort((a, b) => valueOrMinus(rowPercent(b)) - valueOrMinus(rowPercent(a)));
      case 'pct-asc':
        return copy.sort((a, b) => valueOrMinus(rowPercent(a)) - valueOrMinus(rowPercent(b)));
      case 'stat-desc':
        return copy.sort((a, b) => valueOrMinus(b.statistikCount) - valueOrMinus(a.statistikCount));
      case 'open-desc':
        return copy.sort((a, b) => valueOrMinus(b.openDataCount) - valueOrMinus(a.openDataCount));
      case 'errors':
        return copy.sort((a, b) => Number(b.errors.length > 0 || !hasValidCounts(b)) - Number(a.errors.length > 0 || !hasValidCounts(a)));
      default:
        return copy.sort((a, b) => a.index - b.index);
    }
  }

  function renderSummary(rows) {
    const summary = computeSummary(rows);
    elements.summaryStat.textContent = formatNumber(summary.statistikTotal);
    elements.summaryOpen.textContent = formatNumber(summary.openDataTotal);
    elements.summaryPct.textContent = `${summary.pct.toFixed(2)}%`;
    elements.summaryErrors.textContent = formatNumber(summary.errorRows);
    elements.summary.hidden = rows.length === 0;
  }

  function appendCell(rowEl, value, className = '') {
    const cell = document.createElement('td');
    if (className) cell.className = className;
    cell.textContent = value;
    rowEl.appendChild(cell);
    return cell;
  }

  function resultRowMatchesSearch(row) {
    const search = normalizeString(state.activeFilters.search);
    if (!search) return true;
    const haystack = [
      row.area,
      row.place,
      row.type,
      row.category,
      row.errors?.join?.(' ')
    ].map((value) => normalizeString(value) || '').join(' ').toLowerCase();
    return haystack.includes(search.toLowerCase());
  }

  function resultRowValueMatches(actual, expected) {
    const expectedText = normalizeString(expected);
    if (!expectedText || expectedText === '-') return true;
    return normalizeString(actual) === expectedText;
  }

  function resultRowHasMatchingItem(row) {
    return state.normalizedItems.some((item) => (
      resultRowValueMatches(item.region, row.area)
      && resultRowValueMatches(item.city, row.place)
      && resultRowValueMatches(item.type, row.type)
      && resultRowValueMatches(item.category, row.category)
      && itemMatchesActiveFilters(item, { includeCriterion: true })
    ));
  }

  function getFilteredResultRows(rows) {
    const hasItemLevelFilters = Boolean(
      state.activeFilters.search
      || state.activeFilters.qualityStatus
      || state.activeFilters.priority
      || state.activeFilters.autoCheck != null
      || state.activeFilters.criterionId
    );

    return safeArray(rows).filter((row) => {
      if (!resultRowMatchesSearch(row)) return false;
      if (!hasItemLevelFilters) return true;
      if (!state.normalizedItems.length) return true;
      return resultRowHasMatchingItem(row);
    });
  }

  function renderTable(rows) {
    elements.resultDiv.replaceChildren();
    const visibleRows = getFilteredResultRows(rows);

    if (!visibleRows.length) {
      elements.resultDiv.hidden = true;
      return;
    }

    const table = document.createElement('table');
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    ['Gebiet', 'Ort', 'Typ', 'Kategorie', 'SaTourN', 'Open-Data', 'Open-Data %', 'Status']
      .forEach((label) => {
        const th = document.createElement('th');
        th.textContent = label;
        headerRow.appendChild(th);
      });
    thead.appendChild(headerRow);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');

    sortedRows(visibleRows).forEach((row) => {
      const tr = document.createElement('tr');
      const pct = rowPercent(row);
      const error = row.errors.length > 0 || !hasValidCounts(row);
      if (error) tr.classList.add('row-error');
      const detailItem = findItemForResultRow(row);
      if (detailItem) {
        tr.classList.add('detail-row-button');
        tr.tabIndex = 0;
        tr.setAttribute('role', 'button');
        tr.setAttribute('aria-label', `Details zu ${detailItem.title || detailItem.id || 'Datensatz'} anzeigen`);
        tr.addEventListener('click', () => openItemDetailPanel(detailItem));
        tr.addEventListener('keydown', (event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            openItemDetailPanel(detailItem);
          }
        });
      }

      appendCell(tr, row.area);
      appendCell(tr, row.place);
      appendCell(tr, row.type);
      appendCell(tr, row.category);
      appendCell(tr, Number.isFinite(row.statistikCount) ? formatNumber(row.statistikCount) : '-');
      appendCell(tr, Number.isFinite(row.openDataCount) ? formatNumber(row.openDataCount) : '-');
      appendCell(tr, pct == null ? '-' : `${pct.toFixed(2)}%`);
      appendCell(tr, error ? row.errors.join(' | ') || 'Unvollständig' : 'OK', error ? 'status-error' : 'status-ok');

      tbody.appendChild(tr);
    });

    table.appendChild(tbody);
    elements.resultDiv.appendChild(table);
    elements.resultDiv.hidden = false;
  }

  function hasQualityOutputContext() {
    return state.latestRows.length > 0 || state.normalizedItems.length > 0;
  }

  function formatQualityScore(score) {
    return Number.isFinite(score) ? `${formatNumber(score)} / 100` : 'keine Daten';
  }

  function priorityClass(priority) {
    const normalized = String(priority || '').toLowerCase();
    if (normalized === 'hoch') return 'priority-high';
    if (normalized === 'mittel') return 'priority-medium';
    return 'priority-low';
  }

  function renderQualitySampleNote() {
    const meta = state.qualityDataMeta || {};
    const collectedItems = Number(meta.collectedItems || 0);
    const estimatedTotalItems = Number(meta.estimatedTotalItems || 0);

    if (!hasQualityOutputContext()) {
      elements.qualitySampleNote.hidden = true;
      return;
    }

    if (!collectedItems) {
      elements.qualitySampleNote.textContent = `Qualitaetsdaten: ${EMPTY_STATES.emptyJson}`;
      elements.qualitySampleNote.hidden = false;
      return;
    }

    const parts = [`Qualitaetsdaten: ${formatNumber(collectedItems)} Datensaetze ausgewertet`];
    if (estimatedTotalItems > collectedItems) {
      parts.push(`Grundmenge laut Zaehlern ca. ${formatNumber(estimatedTotalItems)}`);
    }
    if (meta.truncated) {
      parts.push('Stichprobe begrenzt');
    }

    elements.qualitySampleNote.textContent = `${parts.join(' | ')}.`;
    elements.qualitySampleNote.hidden = false;
  }

  function renderQualitySummary() {
    if (!hasQualityOutputContext()) {
      elements.qualitySummary.hidden = true;
      return;
    }

    const aggregations = state.qualityAggregations || getQualityAggregations([]);
    const counts = aggregations.qualityStatusCounts || {};
    const mostCommon = aggregations.mostCommonMissingCriterion;

    elements.qualityScore.textContent = formatQualityScore(aggregations.averageQualityScore);
    elements.qualityGood.textContent = formatNumber(counts.gut);
    elements.qualityCheck.textContent = formatNumber(counts.pruefen);
    elements.qualityCritical.textContent = formatNumber(counts.kritisch);
    elements.qualityUnknown.textContent = formatNumber(counts.nichtBerechenbar);
    elements.qualityTopIssue.textContent = mostCommon
      ? `${mostCommon.label} (${formatNumber(mostCommon.affectedCount)})`
      : 'keine Daten';
    elements.qualitySummary.hidden = false;
  }

  function appendIssueCell(rowEl, value, className = '') {
    const cell = document.createElement('span');
    cell.className = `issue-cell${className ? ` ${className}` : ''}`;
    cell.textContent = value == null ? '' : value;
    rowEl.appendChild(cell);
    return cell;
  }

  function appendIssueHeader(listEl) {
    const header = document.createElement('div');
    header.className = 'issue-header';
    ['Kriterium', 'Anzahl', 'Datentypen', 'Prioritaet', 'Aktion']
      .forEach((label) => appendIssueCell(header, label));
    listEl.appendChild(header);
  }

  function updateIssueStatus(issues) {
    if (!state.activeIssue) {
      elements.issueStatus.textContent = '';
      return;
    }

    const issue = safeArray(issues).find((entry) => entry.criterionId === state.activeIssue);
    if (!issue) {
      const criterion = getActiveIssueCriterion();
      elements.issueStatus.textContent = criterion?.autoCheck === false
        ? 'Dieses Kriterium kann aus den verfuegbaren JSON-Daten nicht automatisch geprueft werden.'
        : 'Das ausgewaehlte Qualitaetsproblem kommt in der aktuellen Auswahl nicht vor.';
      return;
    }

    const affectedCount = getIssueFilteredItems(getBaseFilteredItems()).length;
    elements.issueStatus.textContent = `${issue.label}: Fehlerliste mit ${formatNumber(affectedCount)} betroffenen Datensaetzen vorbereitet.`;
  }

  function syncTypeSelectValue(type) {
    const dropdown = elements.typeContainer?.querySelector?.('select');
    if (!dropdown || !type) return;
    dropdown.value = type;
  }

  function selectQualityIssue(criterionId, options = {}) {
    const issue = safeArray(state.qualityAggregations?.issueSummary)
      .find((entry) => entry.criterionId === criterionId);
    const issueTypes = safeArray(issue?.affectedTypes);
    const issueType = options.type || (issueTypes.length === 1 ? issueTypes[0] : null);

    if (issueType) {
      state.selectedType = issueType;
      state.activeFilters.type = issueType;
      syncTypeSelectValue(issueType);
    }

    state.activeIssue = criterionId;
    state.activeIssueType = issueType;
    state.activeFilters.criterionId = criterionId;
    state.activeView = 'issueList';
    state.activePanel = 'issues';
    state.issueListPage = 0;
    resetServerIssueList();
    refreshFilteredItems();
    renderQualitySections();
    updateViewNavigation();
    if (state.activeIssueType) {
      void loadServerIssueList();
    }

    if (issue) {
      setPill('ok', 'Pflegebedarf gewaehlt');
    }
  }

  function renderIssueSummary() {
    if (!hasQualityOutputContext()) {
      elements.issueSummary.hidden = true;
      return;
    }

    const issues = safeArray(state.qualityAggregations?.issueSummary);
    elements.issueList.replaceChildren();
    elements.issueSummary.hidden = false;
    renderQualitySampleNote();

    if (!issues.length) {
      const empty = document.createElement('div');
      empty.className = 'issue-empty';
      empty.textContent = QUALITY_EMPTY_TEXT;
      elements.issueList.appendChild(empty);
      updateIssueStatus(issues);
      return;
    }

    appendIssueHeader(elements.issueList);

    issues.forEach((issue) => {
      const active = state.activeIssue === issue.criterionId;
      const row = document.createElement('button');
      row.type = 'button';
      row.className = `issue-row${active ? ' active' : ''}`;
      row.dataset.criterionId = issue.criterionId;
      row.setAttribute('aria-pressed', String(active));
      row.setAttribute('aria-label', `${issue.label}, ${formatNumber(issue.affectedCount)} betroffene Datensaetze`);
      row.addEventListener('click', () => selectQualityIssue(issue.criterionId));

      const criterionCell = appendIssueCell(row, '');
      const criterionLabel = document.createElement('strong');
      criterionLabel.textContent = issue.label || issue.criterionId;
      const criterionMeta = document.createElement('span');
      criterionMeta.className = 'issue-meta';
      criterionMeta.textContent = issue.autoCheck ? 'automatisch pruefbar' : 'manuell pruefen';
      criterionCell.append(criterionLabel, criterionMeta);

      appendIssueCell(row, `${formatNumber(issue.affectedCount)} Datensaetze`);
      appendIssueCell(row, safeArray(issue.affectedTypes).join(', ') || '-');

      const priorityCell = appendIssueCell(row, '');
      const priorityBadge = document.createElement('span');
      priorityBadge.className = `priority ${priorityClass(issue.priority)}`;
      priorityBadge.textContent = issue.priority || '-';
      priorityCell.appendChild(priorityBadge);

      appendIssueCell(row, issue.recommendation || '-');
      elements.issueList.appendChild(row);
    });

    updateIssueStatus(issues);
  }

  function appendHeaderCells(rowEl, labels) {
    labels.forEach((label) => {
      const th = document.createElement('th');
      th.textContent = label;
      rowEl.appendChild(th);
    });
  }

  function renderTableEmpty(container, message) {
    const empty = document.createElement('div');
    empty.className = 'issue-page-empty';
    empty.textContent = message;
    container.appendChild(empty);
  }

  function statusClass(status) {
    const normalized = normalizeString(status);
    if (normalized === 'gut') return 'status-ok';
    if (normalized === 'kritisch') return 'status-error';
    return '';
  }

  function getTypeItems(type) {
    return getBaseFilteredItems().filter((item) => normalizeString(item.type) === normalizeString(type));
  }

  function getTopIssueForType(type) {
    return getQualityAggregations(getTypeItems(type)).issueSummary[0] || null;
  }

  function appendButtonCell(rowEl, label, onClick, disabled = false) {
    const cell = document.createElement('td');
    if (disabled) {
      cell.textContent = label || '-';
    } else {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'table-link-button';
      button.textContent = label || '-';
      button.addEventListener('click', onClick);
      cell.appendChild(button);
    }
    rowEl.appendChild(cell);
    return cell;
  }

  function renderTypeSummary() {
    elements.typeSummaryTable.replaceChildren();

    if (!hasQualityOutputContext()) {
      elements.typeSummarySection.hidden = true;
      return;
    }

    const rows = safeArray(state.qualityAggregations?.typeSummary);
    elements.typeSummarySection.hidden = false;

    if (!rows.length) {
      renderTableEmpty(elements.typeSummaryTable, 'Fuer die aktuelle Auswahl liegen keine Datentyp-Aggregationen vor.');
      return;
    }

    const table = document.createElement('table');
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    appendHeaderCells(headerRow, [
      'Typ',
      'Datensaetze gesamt',
      'Open-Data',
      'Open-Data-Quote',
      'Qualitaets-Score',
      'Gut',
      'Pruefen',
      'Kritisch',
      'Haeufigstes Kriterium',
      'Naechste Massnahme'
    ]);
    thead.appendChild(headerRow);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    rows.forEach((row) => {
      const topIssue = getTopIssueForType(row.type);
      const tr = document.createElement('tr');
      appendCell(tr, textOrDash(row.type));
      appendCell(tr, formatNumber(row.totalCount));
      appendCell(tr, formatNumber(row.openDataCount));
      appendCell(tr, Number.isFinite(row.openDataRate) ? `${row.openDataRate.toFixed(2)}%` : '-');
      appendCell(tr, Number.isFinite(row.averageQualityScore) ? formatNumber(row.averageQualityScore) : '-');
      appendCell(tr, formatNumber(row.goodCount));
      appendCell(tr, formatNumber(row.checkCount));
      appendCell(tr, formatNumber(row.criticalCount));
      appendButtonCell(
        tr,
        topIssue?.label || row.mostCommonMissingCriterion || '-',
        () => selectQualityIssue(topIssue.criterionId, { type: row.type }),
        !topIssue
      );
      appendCell(tr, row.nextRecommendedAction || '-');
      tbody.appendChild(tr);
    });

    table.appendChild(tbody);
    elements.typeSummaryTable.appendChild(table);
  }

  function renderCriteriaMatrix() {
    elements.criteriaMatrixTable.replaceChildren();

    if (!hasQualityOutputContext()) {
      elements.criteriaMatrixSection.hidden = true;
      return;
    }

    const rows = safeArray(state.qualityAggregations?.criteriaMatrix);
    elements.criteriaMatrixSection.hidden = false;

    if (!rows.length) {
      renderTableEmpty(elements.criteriaMatrixTable, 'Es sind keine Qualitaetskriterien verfuegbar.');
      return;
    }

    const table = document.createElement('table');
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    appendHeaderCells(headerRow, [
      'Datentyp',
      'Kriterium',
      'Prioritaet',
      'Autom. pruefbar',
      'Erfuellt',
      'Nicht erfuellt',
      'Quote',
      'Status',
      'Datenfelder',
      'Hinweis',
      'Empfohlene Aktion'
    ]);
    thead.appendChild(headerRow);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    rows.forEach((row) => {
      const tr = document.createElement('tr');
      appendCell(tr, textOrDash(row.type));
      appendButtonCell(
        tr,
        row.label || row.criterionId,
        () => selectQualityIssue(row.criterionId, { type: row.type }),
        !row.criterionId
      );
      appendCell(tr, textOrDash(row.priority));
      appendCell(tr, row.autoCheck ? 'ja' : 'nein');
      appendCell(tr, formatNumber(row.fulfilledCount));
      appendCell(tr, formatNumber(row.missingCount));
      appendCell(tr, Number.isFinite(row.quote) ? `${row.quote.toFixed(2)}%` : '-');
      appendCell(tr, row.autoCheck ? textOrDash(row.status) : 'nicht automatisch pruefbar', statusClass(row.status));
      appendCell(tr, safeArray(row.fields).join(', ') || '-');
      appendCell(tr, row.note || '-');
      appendCell(tr, row.recommendation || '-');
      tbody.appendChild(tr);
    });

    table.appendChild(tbody);
    elements.criteriaMatrixTable.appendChild(table);
  }

  function getCriterionById(criterionId) {
    return qualityCriteria.find((criterion) => criterion.id === criterionId) || null;
  }

  function getActiveIssueCriterion() {
    return getCriterionById(state.activeIssue);
  }

  function getItemsByMissingCriterion(items, criterionId) {
    if (!criterionId) return [];
    return safeArray(items).filter((item) => safeArray(item.missingCriteria).includes(criterionId));
  }

  function textOrDash(value) {
    const text = normalizeString(value);
    return text || '-';
  }

  function openDataLabel(value) {
    if (value === true) return 'Ja';
    if (value === false) return 'Nein';
    return 'Unbekannt';
  }

  function getActiveFilterDescription() {
    const filters = state.activeFilters;
    const parts = [
      ['Gebiet', filters.region],
      ['Ort', filters.city],
      ['Typ', filters.type],
      ['Kategorie', filters.category]
    ]
      .filter(([, value]) => normalizeString(value))
      .map(([label, value]) => `${label} ${normalizeString(value)}`);

    return parts.length ? `Filter: ${parts.join(', ')}` : 'Filter: keine Einschraenkung';
  }

  function getIssueListItems() {
    if (isActiveServerIssueList()) {
      return safeArray(state.serverIssueList.items).filter((item) => itemMatchesActiveFilters(item, { includeCriterion: true }));
    }
    return getItemsByMissingCriterion(getBaseFilteredItems(), state.activeIssue);
  }

  function issueRecommendation(item, criterion) {
    if (criterion?.recommendation) return criterion.recommendation;
    return safeArray(item?.recommendations).map(normalizeString).find(Boolean) || '-';
  }

  function limitItemsForAi(items, maxItems = AI_CHAT_CONFIG.maxItemsForContext) {
    const list = safeArray(items);
    const limit = Math.max(0, Math.min(100, Number(maxItems) || 0));
    return {
      items: list.slice(0, limit),
      total: list.length,
      sampleSize: Math.min(list.length, limit),
      truncated: list.length > limit
    };
  }

  function reduceItemForAi(item) {
    const missingCriteria = safeArray(item?.missingCriteria).slice(0, 8);
    return {
      id: item?.id || '',
      title: item?.title || '',
      type: item?.type || '',
      region: item?.region || '',
      city: item?.city || '',
      category: item?.category || '',
      qualityScore: Number.isFinite(item?.qualityScore) ? item.qualityScore : null,
      qualityStatus: item?.qualityStatus || null,
      isOpenData: item?.isOpenData ?? null,
      license: item?.license || '',
      missingCriteria,
      recommendations: safeArray(item?.recommendations).slice(0, 5),
      globalId: item?.globalId || '',
      pageUrl: item?.pageUrl || '',
      sourceUrl: item?.sourceUrl || ''
    };
  }

  function getActiveIssueForAi() {
    const criterion = getActiveIssueCriterion();
    if (!state.activeIssue && !criterion) return null;
    return {
      id: criterion?.id || state.activeIssue,
      label: criterion?.label || state.activeIssue,
      priority: criterion?.priority || null,
      recommendation: criterion?.recommendation || null,
      autoCheck: criterion?.autoCheck ?? null,
      fields: safeArray(criterion?.fields)
    };
  }

  function getVisibleItemsForAi() {
    return state.activeIssue ? getIssueListItems() : getBaseFilteredItems();
  }

  function buildAiSummaryContext(baseItems) {
    const items = safeArray(baseItems);
    const aggregations = getQualityAggregations(items);
    const totalItems = items.length;
    const openDataCount = aggregations.openDataCapableCount || 0;
    const statusCounts = aggregations.qualityStatusCounts || {};

    return {
      totalItems,
      averageQualityScore: aggregations.averageQualityScore,
      openDataCount,
      openDataRate: totalItems > 0 ? openDataCount / totalItems : null,
      goodCount: statusCounts.gut || 0,
      checkCount: statusCounts.pruefen || 0,
      criticalCount: statusCounts.kritisch || 0,
      unknownCount: statusCounts.nichtBerechenbar || 0
    };
  }

  function buildAiIssueListContext() {
    return safeArray(state.qualityAggregations?.issueSummary).slice(0, 8).map((issue) => ({
      criterionId: issue.criterionId,
      label: issue.label,
      affectedCount: issue.affectedCount,
      priority: issue.priority,
      recommendation: issue.recommendation
    }));
  }

  function buildAiMatrixContext() {
    return safeArray(state.qualityAggregations?.criteriaMatrix)
      .filter((row) => Number(row?.missingCount || 0) > 0)
      .sort((a, b) => Number(b.missingCount || 0) - Number(a.missingCount || 0))
      .slice(0, 20)
      .map((row) => ({
        type: row.type,
        criterionId: row.criterionId,
        label: row.label,
        priority: row.priority,
        autoCheck: !!row.autoCheck,
        fulfilledCount: row.fulfilledCount,
        missingCount: row.missingCount,
        quote: row.quote,
        status: row.status,
        recommendation: row.recommendation
      }));
  }

  function buildAiDetailContext() {
    if (!state.activeDetailItem) return null;
    return reduceItemForAi(state.activeDetailItem);
  }

  function buildAiContext() {
    refreshFilteredItems();
    const baseItems = getBaseFilteredItems();
    const visibleItems = getVisibleItemsForAi();
    const sample = limitItemsForAi(visibleItems);

    return {
      dashboard: 'SaTourN-Statistik / Datenqualitaets-Monitor',
      activeView: state.activeView,
      activeFilters: {
        region: state.activeFilters.region,
        city: state.activeFilters.city,
        type: state.activeFilters.type,
        category: state.activeFilters.category,
        qualityStatus: state.activeFilters.qualityStatus,
        criterionId: state.activeFilters.criterionId,
        priority: state.activeFilters.priority,
        autoCheck: state.activeFilters.autoCheck,
        search: state.activeFilters.search || ''
      },
      activeFilterDescription: getActiveFilterDescription(),
      activeIssue: getActiveIssueForAi(),
      summary: buildAiSummaryContext(baseItems),
      topIssues: buildAiIssueListContext(),
      typeSummary: safeArray(state.qualityAggregations?.typeSummary).slice(0, 8).map((row) => ({
        type: row.type,
        totalCount: row.totalCount,
        openDataCount: row.openDataCount,
        openDataRate: row.openDataRate,
        averageQualityScore: row.averageQualityScore,
        mostCommonMissingCriterion: row.mostCommonMissingCriterion,
        nextRecommendedAction: row.nextRecommendedAction
      })),
      matrixSummary: buildAiMatrixContext(),
      visibleItemsSample: sample.items.map(reduceItemForAi),
      selectedItem: buildAiDetailContext(),
      dataLimit: {
        totalMatchingItems: sample.total,
        sampleSize: sample.sampleSize,
        truncated: sample.truncated || !!state.qualityDataMeta?.truncated,
        browserDataMode: state.qualityDataMeta?.mode || 'sample',
        collectedItems: state.qualityDataMeta?.collectedItems || state.normalizedItems.length,
        estimatedTotalItems: state.qualityDataMeta?.estimatedTotalItems || null,
        note: state.qualityDataMeta?.note || ''
      }
    };
  }

  function getAiContextNote() {
    if (!state.normalizedItems.length && !state.latestRows.length) {
      return 'Fuer die aktuelle Ansicht liegen keine auswertbaren Daten vor.';
    }
    if (state.activeDetailItem) {
      return `Die KI beruecksichtigt aktuell den Datensatz: ${state.activeDetailItem.title || state.activeDetailItem.id || 'ohne Titel'}.`;
    }
    const activeIssue = getActiveIssueForAi();
    if (activeIssue) {
      return `Die KI analysiert aktuell die Fehlerliste: ${activeIssue.label}.`;
    }
    return 'Die KI analysiert die aktuell gefilterte Dashboard-Ansicht.';
  }

  function getAiTransportMode() {
    const webhookUrl = normalizeString(AI_CHAT_CONFIG.webhookUrl);
    const mockActive = !AI_CHAT_CONFIG.enabled || AI_CHAT_CONFIG.mockMode === true || !webhookUrl;
    return {
      mockActive,
      label: mockActive ? 'Modus: Mock' : 'Modus: Webhook',
      reason: !AI_CHAT_CONFIG.enabled
        ? 'KI deaktiviert'
        : AI_CHAT_CONFIG.mockMode === true
          ? 'Mock explizit aktiviert'
          : webhookUrl
            ? 'n8n-Webhook aktiv'
            : 'keine Webhook-URL'
    };
  }

  function updateAiStatus(message = '') {
    const mode = getAiTransportMode();
    elements.aiChatStatus.textContent = message || `${mode.label} (${mode.reason})`;
  }

  function setAiLoading(isLoading) {
    state.aiChat.isLoading = isLoading;
    elements.aiChatSendButton.disabled = isLoading;
    elements.aiChatInput.disabled = isLoading;
    updateAiStatus(isLoading ? `${getAiTransportMode().label}: KI-Anfrage laeuft...` : '');
  }

  function addAiMessage(role, text, extra = {}) {
    state.aiChat.messages.push({
      role,
      text: normalizeString(text),
      suggestions: safeArray(extra.suggestions),
      warnings: safeArray(extra.warnings)
    });
    renderAiMessages();
  }

  function appendAiList(container, title, values) {
    const list = safeArray(values).map(normalizeString).filter(Boolean);
    if (!list.length) return;
    const ul = document.createElement('ul');
    ul.className = 'ai-chat-extra';
    list.forEach((value) => {
      const item = document.createElement('li');
      item.textContent = value;
      ul.appendChild(item);
    });
    const label = document.createElement('div');
    label.className = 'ai-chat-role';
    label.textContent = title;
    container.appendChild(label);
    container.appendChild(ul);
  }

  function renderAiMessages() {
    elements.aiChatMessages.replaceChildren();
    const messages = state.aiChat.messages.length
      ? state.aiChat.messages
      : [{ role: 'assistant', text: 'Stelle eine Frage zur aktuellen Auswahl oder nutze eine Schnellfrage.' }];

    messages.forEach((message) => {
      const item = document.createElement('div');
      item.className = `ai-chat-message ${message.role === 'user' ? 'user' : message.role === 'error' ? 'error' : 'assistant'}`;

      const role = document.createElement('div');
      role.className = 'ai-chat-role';
      role.textContent = message.role === 'user' ? 'Du' : message.role === 'error' ? 'Fehler' : 'Assistenz';
      item.appendChild(role);

      const text = document.createElement('div');
      text.className = 'ai-chat-text';
      text.textContent = message.text;
      item.appendChild(text);

      appendAiList(item, 'Hinweise', message.warnings);
      appendAiList(item, 'Vorschlaege', message.suggestions);
      elements.aiChatMessages.appendChild(item);
    });

    elements.aiChatMessages.scrollTop = elements.aiChatMessages.scrollHeight;
  }

  function updateAiContextNote() {
    elements.aiChatContextNote.textContent = getAiContextNote();
  }

  function openAiChatPanel() {
    state.aiChat.open = true;
    state.activePanel = 'ai';
    elements.aiChatPanel.hidden = false;
    elements.aiChatOpenButton.setAttribute('aria-expanded', 'true');
    updateViewNavigation();
    updateAiContextNote();
    updateAiStatus();
    renderAiMessages();
    elements.aiChatInput.focus();
  }

  function closeAiChatPanel() {
    state.aiChat.open = false;
    elements.aiChatPanel.hidden = true;
    elements.aiChatOpenButton.setAttribute('aria-expanded', 'false');
    elements.aiChatOpenButton.focus();
  }

  function buildMockAiResponse(userMessage, context) {
    const total = context?.dataLimit?.totalMatchingItems ?? context?.summary?.totalItems ?? 0;
    const topIssue = safeArray(context?.topIssues)[0];
    const issueText = topIssue?.label || 'kein dominantes Qualitaetsproblem';
    const mode = context?.activeIssue ? ` zur Fehlerliste "${context.activeIssue.label}"` : '';
    const filterText = context?.activeFilterDescription || 'Filter: keine Einschraenkung';
    const warning = context?.dataLimit?.truncated
      ? 'Der KI-Kontext enthaelt nur ein begrenztes Sample der verfuegbaren Datensaetze.'
      : 'Mock-Modus aktiv, es wurde keine externe Anfrage gesendet.';

    return {
      answer: `Mock-Antwort: In der aktuellen Auswahl${mode} wurden ${formatNumber(total)} Datensaetze beruecksichtigt. Das haeufigste Qualitaetsproblem ist ${issueText}. ${filterText}. Fuer echte KI-Antworten muss der n8n-Webhook konfiguriert werden.`,
      suggestions: [
        'Fehlerliste exportieren, wenn konkrete Pflegeaufgaben verteilt werden sollen.',
        'n8n-Webhook konfigurieren, um echte KI-Antworten zu erhalten.'
      ],
      warnings: [warning]
    };
  }

  function normalizeAiResponse(response) {
    if (typeof response === 'string') {
      return { answer: response, suggestions: [], warnings: [] };
    }
    return {
      answer: normalizeString(response?.answer || response?.text || response?.message || 'Die Anfrage konnte nicht verarbeitet werden.'),
      suggestions: safeArray(response?.suggestions),
      warnings: safeArray(response?.warnings)
    };
  }

  async function askN8nAiWebhook(userMessage, context) {
    const webhookUrl = normalizeString(AI_CHAT_CONFIG.webhookUrl);
    const useMock = getAiTransportMode().mockActive;
    if (useMock) return buildMockAiResponse(userMessage, context);

    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), Math.max(1000, Number(AI_CHAT_CONFIG.timeoutMs) || 30000));
    const headers = { 'Content-Type': 'application/json' };
    if (AI_CHAT_CONFIG.authHeaderName && AI_CHAT_CONFIG.authHeaderValue) {
      headers[AI_CHAT_CONFIG.authHeaderName] = AI_CHAT_CONFIG.authHeaderValue;
    }

    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers,
        signal: controller.signal,
        body: JSON.stringify({
          message: userMessage,
          context,
          meta: {
            source: 'satourn-dashboard',
            version: '1',
            timestamp: new Date().toISOString(),
            pageUrl: window.location.href
          }
        })
      });

      const text = await response.text();
      if (!response.ok) {
        const detail = text ? ` Antwort: ${text.slice(0, 180)}` : '';
        throw new Error(`Der KI-Dienst ist aktuell nicht erreichbar. HTTP ${response.status}.${detail}`);
      }
      if (!text) return { answer: 'Die Anfrage konnte nicht verarbeitet werden.', suggestions: [], warnings: [] };

      try {
        return normalizeAiResponse(JSON.parse(text));
      } catch {
        return normalizeAiResponse(text);
      }
    } catch (error) {
      if (error?.name === 'AbortError') throw new Error('Zeitueberschreitung bei der KI-Anfrage.');
      if (error instanceof TypeError) throw new Error('Der KI-Dienst konnte nicht erreicht werden. Bitte n8n-CORS, Netzwerk und Webhook-URL pruefen.');
      throw new Error(error?.message || 'Der KI-Dienst ist aktuell nicht erreichbar.');
    } finally {
      window.clearTimeout(timeout);
    }
  }

  async function submitAiChatMessage(message) {
    const userMessage = normalizeString(message);
    if (!userMessage || state.aiChat.isLoading) return;

    const context = buildAiContext();
    if (!context.summary.totalItems && !context.visibleItemsSample.length && !state.latestRows.length) {
      addAiMessage('error', EMPTY_STATES.noAiData);
      return;
    }

    addAiMessage('user', userMessage);
    elements.aiChatInput.value = '';
    setAiLoading(true);

    try {
      const result = await askN8nAiWebhook(userMessage, context);
      const normalized = normalizeAiResponse(result);
      addAiMessage('assistant', normalized.answer, {
        suggestions: normalized.suggestions,
        warnings: normalized.warnings
      });
    } catch (error) {
      addAiMessage('error', error?.message || 'Die Anfrage konnte nicht verarbeitet werden.');
    } finally {
      setAiLoading(false);
      elements.aiChatInput.focus();
    }
  }

  function issueSourceCell(cell, item) {
    const pageUrl = normalizeString(item?.pageUrl);
    const sourceUrl = normalizeString(item?.sourceUrl);
    const url = pageUrl || sourceUrl;
    if (!url) {
      cell.textContent = '-';
      return;
    }

    const link = document.createElement('a');
    link.href = url;
    link.textContent = pageUrl ? 'ET4 Pages' : 'Quelle';
    link.title = pageUrl ? 'Verifizierter ET4-Pages-Link' : 'Fallback-Quelle, kein verifizierter ET4-Pages-Link';
    link.className = 'issue-link';
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.addEventListener('click', (event) => event.stopPropagation());
    cell.appendChild(link);
  }

  function findItemForResultRow(row) {
    return state.normalizedItems.find((item) => (
      normalizeString(item.region) === normalizeString(row.area)
      && normalizeString(item.city) === normalizeString(row.place)
      && normalizeString(item.type) === normalizeString(row.type)
      && normalizeString(item.category) === normalizeString(row.category)
    )) || null;
  }

  function formatDetailValue(value) {
    if (value == null) return '-';
    if (typeof value === 'boolean') return value ? 'Ja' : 'Nein';
    if (Array.isArray(value)) return value.map(formatDetailValue).filter((entry) => entry !== '-').join(', ') || '-';
    if (typeof value === 'object') {
      const text = normalizeString(value);
      return text || JSON.stringify(value);
    }
    return normalizeString(value) || '-';
  }

  function appendDetailSection(title) {
    const section = document.createElement('section');
    section.className = 'item-detail-section';
    const heading = document.createElement('h3');
    heading.textContent = title;
    section.appendChild(heading);
    elements.itemDetailContent.appendChild(section);
    return section;
  }

  function appendDetailGrid(section, rows) {
    const grid = document.createElement('div');
    grid.className = 'item-detail-grid';
    rows.forEach(([label, value]) => {
      const labelEl = document.createElement('div');
      labelEl.className = 'item-detail-label';
      labelEl.textContent = label;
      const valueEl = document.createElement('div');
      valueEl.className = 'item-detail-value';
      valueEl.textContent = formatDetailValue(value);
      grid.appendChild(labelEl);
      grid.appendChild(valueEl);
    });
    section.appendChild(grid);
    return grid;
  }

  function appendDetailLink(section, label, url, note = '') {
    const normalizedUrl = normalizeString(url);
    if (!normalizedUrl) return;
    const wrapper = document.createElement('p');
    wrapper.className = 'item-detail-link';
    const link = document.createElement('a');
    link.href = normalizedUrl;
    link.textContent = label;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    wrapper.appendChild(link);
    if (note) {
      const noteEl = document.createElement('span');
      noteEl.textContent = ` ${note}`;
      wrapper.appendChild(noteEl);
    }
    section.appendChild(wrapper);
  }

  function readFieldCandidates(item, field) {
    const raw = item?.raw && typeof item.raw === 'object' ? item.raw : {};
    const fieldReaders = {
      'texts[rel=openings]': () => qualityHelpers.getTextsByRel(raw, 'openings').map((entry) => entry.value),
      'texts[rel=details]': () => qualityHelpers.getTextsByRel(raw, 'details').map((entry) => entry.value),
      'attributes[key=license]': () => [qualityHelpers.getAttributeValue(raw, 'license')],
      features: () => qualityHelpers.getFeatureValues(raw),
      features_old: () => safeArray(raw.features_old),
      media_objects: () => qualityHelpers.getMediaObjects(raw).map((mediaObject) => mediaObject.url || mediaObject.value),
      'media_objects.copyrightText': () => qualityHelpers.getMediaObjects(raw).map((mediaObject) => mediaObject.copyrightText),
      'media_objects[rel=booking].url': () => qualityHelpers.getMediaObjects(raw)
        .filter((mediaObject) => normalizeString(mediaObject.rel)?.toLowerCase() === 'booking')
        .map((mediaObject) => mediaObject.url)
    };
    if (fieldReaders[field]) {
      return fieldReaders[field]()
        .flatMap((value) => safeArray(value))
        .filter((value) => value != null)
        .map(formatDetailValue)
        .filter((value) => value && value !== '-');
    }

    const candidates = [
      field,
      `raw.${field}`,
      field.replace(/^raw\./, '')
    ];
    return Array.from(new Set(candidates))
      .flatMap((path) => {
        const value = qualityHelpers.getNestedValue(item, path)
          ?? qualityHelpers.getNestedValue(raw, path.replace(/^raw\./, ''));
        return safeArray(value);
      })
      .filter((value) => value != null)
      .map(formatDetailValue)
      .filter((value) => value && value !== '-');
  }

  function usedDataFieldsForCriterion(item, criterion) {
    return safeArray(criterion?.fields).map((field) => {
      const values = readFieldCandidates(item, field).slice(0, 3);
      return values.length ? `${field}: ${values.join(' | ')}` : `${field}: -`;
    });
  }

  function criterionMetaLines(item, criterion, statusText) {
    const fields = safeArray(criterion?.fields);
    const lines = [
      `Prioritaet: ${criterion?.priority || '-'}`,
      `Automatisch pruefbar: ${criterion?.autoCheck === false ? 'Nein' : 'Ja'}`
    ];
    if (statusText) lines.push(statusText);
    if (fields.length) lines.push(`Vermutete Datenfelder: ${fields.join(', ')}`);
    if (criterion?.note) lines.push(`Hinweis: ${criterion.note}`);
    if (criterion?.recommendation) lines.push(`Empfehlung: ${criterion.recommendation}`);
    const usedFields = usedDataFieldsForCriterion(item, criterion).slice(0, 6);
    if (usedFields.length) lines.push(`Feldwerte: ${usedFields.join('; ')}`);
    return lines;
  }

  function appendCriterionList(section, item, criterionIds, variant, emptyText, statusTextFactory) {
    const list = document.createElement('div');
    list.className = 'criterion-list';
    const ids = safeArray(criterionIds);
    if (!ids.length) {
      const empty = document.createElement('div');
      empty.className = 'issue-page-empty';
      empty.textContent = emptyText;
      list.appendChild(empty);
      section.appendChild(list);
      return;
    }

    ids.forEach((criterionId) => {
      const criterion = getCriterionById(criterionId) || { id: criterionId, label: criterionId };
      const card = document.createElement('div');
      card.className = `criterion-card ${variant}`;
      const title = document.createElement('strong');
      title.textContent = criterion.label || criterion.id;
      card.appendChild(title);
      criterionMetaLines(item, criterion, statusTextFactory?.(criterion) || '').forEach((line) => {
        const meta = document.createElement('span');
        meta.textContent = line;
        card.appendChild(meta);
      });
      list.appendChild(card);
    });

    section.appendChild(list);
  }

  function appendRecommendations(section, item) {
    const recommendations = safeArray(item?.recommendations).map(normalizeString).filter(Boolean);
    if (!recommendations.length) {
      appendDetailGrid(section, [['Empfehlung', '-']]);
      return;
    }

    const list = document.createElement('ul');
    list.className = 'ai-chat-extra';
    recommendations.forEach((recommendation) => {
      const entry = document.createElement('li');
      entry.textContent = recommendation;
      list.appendChild(entry);
    });
    section.appendChild(list);
  }

  function stringifyRawData(value) {
    try {
      return JSON.stringify(value || {}, null, 2);
    } catch {
      return 'Rohdaten konnten nicht serialisiert werden.';
    }
  }

  function appendRawDataSection(item) {
    const section = appendDetailSection('Rohdaten');
    const details = document.createElement('details');
    details.className = 'item-detail-raw';
    const summary = document.createElement('summary');
    summary.textContent = 'Rohdaten anzeigen';
    const pre = document.createElement('pre');
    pre.textContent = stringifyRawData(item?.raw || item);
    details.appendChild(summary);
    details.appendChild(pre);
    section.appendChild(details);
  }

  function openItemDetailPanel(item, options = {}) {
    if (!item) {
      setPill('err', 'keine Detaildaten');
      return;
    }

    state.activeDetailItem = item;
    elements.itemDetailContent.replaceChildren();
    elements.itemDetailTitle.textContent = textOrDash(item.title);
    elements.itemDetailSubtitle.textContent = `${textOrDash(item.type)} | ${textOrDash(item.region)} | ${textOrDash(item.city)}`;

    appendDetailGrid(appendDetailSection('Stammdaten'), [
      ['Titel', item.title],
      ['ID', item.id],
      ['Global-ID', item.globalId],
      ['Typ', item.type],
      ['Gebiet', item.region],
      ['Ort', item.city],
      ['Kategorie', item.category],
      ['Open-Data-Status', openDataLabel(item.isOpenData)],
      ['Lizenz', item.license],
      ['Qualitaets-Score', Number.isFinite(item.qualityScore) ? formatNumber(item.qualityScore) : '-'],
      ['Qualitaetsstatus', item.qualityStatus],
      ['Letzte Aktualisierung', item.updatedAt]
    ]);

    const linkSection = appendDetailSection('Links');
    appendDetailLink(linkSection, 'ET4 Pages oeffnen', item.pageUrl, '(verifiziertes POI-Mapping)');
    appendDetailLink(linkSection, 'Fallback-Quelle oeffnen', item.sourceUrl, item.pageUrl ? '(zusaetzliche Quelle)' : '(kein verifizierter ET4-Pages-Link fuer diesen Typ)');
    if (!item.pageUrl && !item.sourceUrl) appendDetailGrid(linkSection, [['Linkstatus', 'Kein Link verfuegbar']]);

    const missingSection = appendDetailSection('Fehlende Kriterien');
    appendCriterionList(
      missingSection,
      item,
      item.missingCriteria,
      'missing',
      'Keine fehlenden automatisch pruefbaren Kriterien im aktuellen Sample.',
      () => 'Status: fehlt oder unvollstaendig'
    );

    const fulfilledSection = appendDetailSection('Erfuellte Kriterien');
    appendCriterionList(
      fulfilledSection,
      item,
      item.fulfilledCriteria,
      'fulfilled',
      'Keine erfuellten automatisch pruefbaren Kriterien vorhanden.',
      () => 'Status: erfuellt'
    );

    const manualSection = appendDetailSection('Manuell zu pruefende Kriterien');
    appendCriterionList(
      manualSection,
      item,
      item.manualCriteria,
      'manual',
      'Keine manuellen Kriterien fuer diesen Datentyp hinterlegt.',
      (criterion) => criterion?.note || 'Status: redaktionell pruefen'
    );

    appendRecommendations(appendDetailSection('Empfohlene Massnahmen'), item);
    appendRawDataSection(item);

    elements.itemDetailPanel.hidden = false;
    updateAiContextNote();
    if (options.focus !== false) elements.itemDetailCloseButton.focus();
  }

  function closeItemDetailPanel(options = {}) {
    state.activeDetailItem = null;
    if (elements.itemDetailPanel) elements.itemDetailPanel.hidden = true;
    if (elements.itemDetailContent) elements.itemDetailContent.replaceChildren();
    updateAiContextNote();
    if (options.restoreFocus && elements.resultDiv) elements.resultDiv.focus?.();
  }

  function appendIssueTableCell(rowEl, value, className = '') {
    const cell = appendCell(rowEl, value, className);
    return cell;
  }

  function issueRowValues(item, criterion) {
    return {
      title: textOrDash(item?.title),
      id: textOrDash(item?.id),
      type: textOrDash(item?.type),
      region: textOrDash(item?.region),
      city: textOrDash(item?.city),
      category: textOrDash(item?.category),
      criterion: criterion?.label || state.activeIssue || '-',
      priority: criterion?.priority || '-',
      qualityScore: Number.isFinite(item?.qualityScore) ? formatNumber(item.qualityScore) : '-',
      qualityStatus: textOrDash(item?.qualityStatus),
      openData: openDataLabel(item?.isOpenData),
      license: textOrDash(item?.license),
      updatedAt: textOrDash(item?.updatedAt),
      recommendation: issueRecommendation(item, criterion)
    };
  }

  function serverIssueDiagnosticText() {
    if (!isActiveServerIssueList()) return null;
    const { diagnostic, page, stats, loading, error } = state.serverIssueList;
    const parts = [];

    if (loading) parts.push('Server-Scan laedt');
    if (error) parts.push(`Server-Scan Fehler: ${error}`);
    if (diagnostic) {
      parts.push(`Methode: ${diagnostic.method || '-'}`);
      parts.push(`Query: ${diagnostic.query || '-'}`);
      parts.push(`Verifiziert: ${diagnostic.verified ? 'ja' : 'nein'}`);
      if (safeArray(diagnostic.warnings).length) {
        parts.push(`Warnungen: ${safeArray(diagnostic.warnings).join(', ')}`);
      }
    }
    if (page) {
      parts.push(`Vollstaendig: ${page.complete ? 'ja' : 'nein'}`);
      parts.push(`Grund: ${page.reason || '-'}`);
    }
    if (stats) {
      if (Number.isFinite(stats.overallcount)) parts.push(`overallcount: ${formatNumber(stats.overallcount)}`);
      parts.push(`gescannt: ${formatNumber(stats.scannedItems || 0)} Items / ${formatNumber(stats.scannedPages || 0)} Seiten`);
    }

    return parts.length ? parts.join(' | ') : null;
  }

  function updateIssueListHeader(items) {
    const criterion = getActiveIssueCriterion();
    const label = criterion?.label || state.activeIssue || 'Unbekanntes Kriterium';
    const count = safeArray(items).length;
    const sourceText = isActiveServerIssueList()
      ? `Server-Fehlerliste fuer ${state.activeIssueType}`
      : 'Stichprobe aus der aktuellen Browser-Auswahl';

    elements.issueDetailTitle.textContent = `Fehlerliste: ${label}`;
    elements.issueDetailMeta.textContent = `${formatNumber(count)} betroffene Datensaetze | ${sourceText}`;
    elements.issueDetailFilters.textContent = [getActiveFilterDescription(), serverIssueDiagnosticText()]
      .filter(Boolean)
      .join(' | ');
  }

  function renderIssuePagination(totalItems) {
    const pageSize = state.issueListPageSize;
    const pageCount = Math.max(1, Math.ceil(totalItems / pageSize));
    state.issueListPage = Math.max(0, Math.min(state.issueListPage, pageCount - 1));
    const hasServerNext = isActiveServerIssueList() && Boolean(state.serverIssueList.page?.nextCursor);

    elements.issuePagination.hidden = totalItems <= pageSize && !hasServerNext;
    elements.issuePrevButton.disabled = state.issueListPage <= 0;
    elements.issueNextButton.disabled = state.issueListPage >= pageCount - 1 && !hasServerNext;
    elements.issuePageStatus.textContent = hasServerNext
      ? `Seite ${formatNumber(state.issueListPage + 1)} von ${formatNumber(pageCount)} | weitere Server-Seite verfuegbar`
      : `Seite ${formatNumber(state.issueListPage + 1)} von ${formatNumber(pageCount)}`;
  }

  function renderIssueList() {
    if (!state.activeIssue) {
      elements.issueDetailSection.hidden = true;
      elements.issueDetailTable.replaceChildren();
      elements.issuePagination.hidden = true;
      return;
    }

    const criterion = getActiveIssueCriterion();
    const items = getIssueListItems();
    updateIssueListHeader(items);
    elements.issueDetailTable.replaceChildren();
    elements.issueDetailSection.hidden = false;

    if (isActiveServerIssueList() && state.serverIssueList.loading && !items.length) {
      const loading = document.createElement('div');
      loading.className = 'issue-page-empty';
      loading.textContent = 'Server-Fehlerliste wird geladen ...';
      elements.issueDetailTable.appendChild(loading);
      renderIssuePagination(0);
      elements.issuePagination.hidden = true;
      return;
    }

    if (isActiveServerIssueList() && state.serverIssueList.error && !items.length) {
      const error = document.createElement('div');
      error.className = 'issue-page-empty';
      error.textContent = `Server-Fehlerliste konnte nicht geladen werden: ${state.serverIssueList.error}`;
      elements.issueDetailTable.appendChild(error);
      renderIssuePagination(0);
      elements.issuePagination.hidden = true;
      return;
    }

    if (!items.length) {
      const empty = document.createElement('div');
      empty.className = 'issue-page-empty';
      empty.textContent = criterion?.autoCheck === false
        ? 'Dieses Kriterium kann aus den verfuegbaren JSON-Daten nicht automatisch geprueft werden.'
        : `Fuer das Kriterium '${criterion?.label || state.activeIssue}' wurden in der aktuellen Auswahl keine betroffenen Datensaetze gefunden.`;
      elements.issueDetailTable.appendChild(empty);
      renderIssuePagination(0);
      elements.issuePagination.hidden = true;
      return;
    }

    renderIssuePagination(items.length);

    const start = state.issueListPage * state.issueListPageSize;
    const visibleItems = items.slice(start, start + state.issueListPageSize);
    const table = document.createElement('table');
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');

    ISSUE_LIST_COLUMNS.forEach((label) => {
      const th = document.createElement('th');
      th.textContent = label;
      headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    visibleItems.forEach((item) => {
      const values = issueRowValues(item, criterion);
      const tr = document.createElement('tr');
      tr.classList.add('detail-row-button');
      tr.tabIndex = 0;
      tr.setAttribute('role', 'button');
      tr.setAttribute('aria-label', `Details zu ${item?.title || item?.id || 'Datensatz'} anzeigen`);
      tr.addEventListener('click', () => openItemDetailPanel(item));
      tr.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          openItemDetailPanel(item);
        }
      });
      appendIssueTableCell(tr, values.title);
      appendIssueTableCell(tr, values.id);
      appendIssueTableCell(tr, values.type);
      appendIssueTableCell(tr, values.region);
      appendIssueTableCell(tr, values.city);
      appendIssueTableCell(tr, values.category);
      appendIssueTableCell(tr, values.criterion);
      appendIssueTableCell(tr, values.priority);
      appendIssueTableCell(tr, values.qualityScore);
      appendIssueTableCell(tr, values.qualityStatus);
      appendIssueTableCell(tr, values.openData);
      appendIssueTableCell(tr, values.license);
      appendIssueTableCell(tr, values.updatedAt);
      appendIssueTableCell(tr, values.recommendation);
      issueSourceCell(appendIssueTableCell(tr, ''), item);
      tbody.appendChild(tr);
    });

    table.appendChild(tbody);
    elements.issueDetailTable.appendChild(table);
  }

  function clearActiveIssue() {
    state.activeIssue = null;
    state.activeIssueType = null;
    state.activeFilters.criterionId = null;
    state.activeView = 'overview';
    state.activePanel = 'overview';
    state.issueListPage = 0;
    resetServerIssueList();
    closeItemDetailPanel({ restoreFocus: false });
    refreshFilteredItems();
    renderQualitySections();
    updateViewNavigation();
    setPill('ok', 'Uebersicht');
  }

  function renderQualitySections() {
    refreshFilteredItems();
    renderQualitySummary();
    renderIssueSummary();
    renderIssueList();
    renderTypeSummary();
    renderCriteriaMatrix();
    updateAiContextNote();
  }

  function canvasContext(canvas) {
    const rect = canvas.getBoundingClientRect();
    const width = Math.max(320, rect.width || canvas.clientWidth || 320);
    const height = Math.max(210, rect.height || 230);
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);
    return { ctx, width, height };
  }

  function themeColor(name, fallback) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
  }

  function drawEmptyChart(canvas, text) {
    const { ctx, width, height } = canvasContext(canvas);
    ctx.fillStyle = 'rgba(255,255,255,.72)';
    ctx.font = '13px Roboto, Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(text, width / 2, height / 2);
  }

  function drawRatioChart(rows) {
    const summary = computeSummary(rows);
    if (summary.statistikTotal <= 0) {
      drawEmptyChart(elements.ratioChart, 'Keine Werte');
      return;
    }

    const { ctx, width, height } = canvasContext(elements.ratioChart);
    const accent = themeColor('--accentA', '#00bcd4');
    const restColor = 'rgba(255,255,255,.16)';
    const open = Math.min(summary.openDataTotal, summary.statistikTotal);
    const ratio = open / summary.statistikTotal;
    const cx = width / 2;
    const cy = height / 2;
    const radius = Math.min(width, height) * .32;
    const lineWidth = Math.max(18, radius * .22);

    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.strokeStyle = restColor;
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.strokeStyle = accent;
    ctx.arc(cx, cy, radius, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * ratio);
    ctx.stroke();

    ctx.fillStyle = 'rgba(255,255,255,.94)';
    ctx.textAlign = 'center';
    ctx.font = '700 28px Roboto, Arial, sans-serif';
    ctx.fillText(`${(ratio * 100).toFixed(1)}%`, cx, cy - 2);
    ctx.font = '12px Roboto, Arial, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,.68)';
    ctx.fillText(`${formatNumber(open)} von ${formatNumber(summary.statistikTotal)}`, cx, cy + 22);
  }

  function drawTypeChart(rows) {
    const groups = new Map();
    rows.filter(hasValidCounts).forEach((row) => {
      const current = groups.get(row.type) || { type: row.type, statistik: 0, open: 0 };
      current.statistik += row.statistikCount;
      current.open += row.openDataCount;
      groups.set(row.type, current);
    });

    const values = Array.from(groups.values())
      .filter((item) => item.statistik > 0)
      .map((item) => ({
        ...item,
        pct: (Math.min(item.open, item.statistik) / item.statistik) * 100
      }))
      .sort((a, b) => b.pct - a.pct);

    if (!values.length) {
      drawEmptyChart(elements.typeChart, 'Keine Werte');
      return;
    }

    const { ctx, width, height } = canvasContext(elements.typeChart);
    const accent = themeColor('--accentA', '#00bcd4');
    const left = 78;
    const right = 54;
    const top = 20;
    const rowHeight = Math.min(29, (height - top - 16) / values.length);
    const barWidth = width - left - right;

    ctx.font = '12px Roboto, Arial, sans-serif';
    ctx.textBaseline = 'middle';

    values.forEach((item, index) => {
      const y = top + index * rowHeight;
      const barY = y + 5;
      const h = Math.max(10, rowHeight - 12);

      ctx.fillStyle = 'rgba(255,255,255,.78)';
      ctx.textAlign = 'right';
      ctx.fillText(item.type, left - 10, barY + h / 2);

      ctx.fillStyle = 'rgba(255,255,255,.12)';
      ctx.fillRect(left, barY, barWidth, h);

      ctx.fillStyle = accent;
      ctx.fillRect(left, barY, barWidth * (item.pct / 100), h);

      ctx.fillStyle = 'rgba(255,255,255,.86)';
      ctx.textAlign = 'left';
      ctx.fillText(`${item.pct.toFixed(1)}%`, left + barWidth + 8, barY + h / 2);
    });
  }

  function renderCharts(rows) {
    const hasValues = rows.some(hasValidCounts);
    elements.chartContainer.hidden = !hasValues;
    if (!hasValues) return;

    drawRatioChart(rows);
    drawTypeChart(rows);
  }

  function renderAll() {
    const visibleRows = getFilteredResultRows(state.latestRows);
    renderSummary(visibleRows);
    renderQualitySections();
    renderTable(visibleRows);
    renderCharts(visibleRows);
    elements.exportButton.disabled = state.latestRows.length === 0 || !!state.currentRun;
    setEmptyState(visibleRows.length ? '' : EMPTY_STATES.noResults, !visibleRows.length);
    updateViewNavigation();
  }

  function csvValue(value) {
    const text = value == null ? '' : String(value).replace(/\r?\n|\r/g, ' ');
    return `"${text.replaceAll('"', '""')}"`;
  }

  function downloadCsv(filename, rows) {
    const lines = safeArray(rows).map((line) => safeArray(line).map(csvValue).join(';'));
    downloadText(filename, lines.join('\n'), 'text/csv;charset=utf-8');
  }

  function normalizeFilenameUmlauts(value) {
    return String(value || '')
      .replaceAll('\u00e4', 'ae')
      .replaceAll('\u00f6', 'oe')
      .replaceAll('\u00fc', 'ue')
      .replaceAll('\u00c4', 'Ae')
      .replaceAll('\u00d6', 'Oe')
      .replaceAll('\u00dc', 'Ue')
      .replaceAll('\u00df', 'ss');
  }

  function slugifyFilenamePart(value) {
    return normalizeFilenameUmlauts(value)
      .trim()
      .toLowerCase()
      .replaceAll('ä', 'ae')
      .replaceAll('ö', 'oe')
      .replaceAll('ü', 'ue')
      .replaceAll('Ä', 'ae')
      .replaceAll('Ö', 'oe')
      .replaceAll('Ü', 'ue')
      .replaceAll('ß', 'ss')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80);
  }

  function buildCsvRowsForResults(rows) {
    return [
      ['Gebiet', 'Ort', 'Typ', 'Kategorie', 'SaTourN', 'Open-Data', 'Open-Data %', 'Status'],
      ...sortedRows(rows).map((row) => {
        const pct = rowPercent(row);
        return [
          row.area,
          row.place,
          row.type,
          row.category,
          Number.isFinite(row.statistikCount) ? row.statistikCount : '',
          Number.isFinite(row.openDataCount) ? row.openDataCount : '',
          pct == null ? '' : pct.toFixed(2),
          row.errors.join(' | ') || (hasValidCounts(row) ? 'OK' : 'Unvollstaendig')
        ];
      })
    ];
  }

  function buildCsvRowsForIssueList(items, criterion) {
    return [
      [
        'ID',
        'Titel',
        'Typ',
        'Gebiet',
        'Ort',
        'Kategorie',
        'Fehlendes Kriterium',
        'Kriterium-ID',
        'Prioritaet',
        'Automatisch pruefbar',
        'Qualitaets-Score',
        'Qualitaetsstatus',
        'Open-Data',
        'Lizenz',
        'Fehlende Felder',
        'Empfohlene Aktion',
        'Letzte Aktualisierung',
        'Global-ID',
        'URL',
        'Linktyp',
        'Quelle / Datensatztyp'
      ],
      ...safeArray(items).map((item) => [
        item?.id || '',
        item?.title || '',
        item?.type || '',
        item?.region || '',
        item?.city || '',
        item?.category || '',
        criterion?.label || state.activeIssue || '',
        criterion?.id || state.activeIssue || '',
        criterion?.priority || '',
        criterion?.autoCheck === false ? 'Nein' : 'Ja',
        Number.isFinite(item?.qualityScore) ? item.qualityScore : '',
        item?.qualityStatus || '',
        openDataLabel(item?.isOpenData),
        item?.license || '',
        safeArray(criterion?.fields).join(', '),
        issueRecommendation(item, criterion),
        item?.updatedAt || '',
        item?.globalId || '',
        item?.pageUrl || item?.sourceUrl || '',
        item?.pageUrl ? 'ET4 Pages' : item?.sourceUrl ? 'Fallback-Quelle' : '',
        item?.type || ''
      ])
    ];
  }

  function activeFilterFilenameParts() {
    return [
      state.activeFilters.region,
      state.activeFilters.city,
      state.activeFilters.type,
      state.activeFilters.category,
      state.activeFilters.qualityStatus,
      state.activeFilters.priority,
      state.activeFilters.autoCheck == null ? null : (state.activeFilters.autoCheck ? 'automatisch' : 'manuell'),
      state.activeFilters.search
    ].map(slugifyFilenamePart).filter(Boolean);
  }

  function issueListFilename(criterion) {
    const criterionPart = slugifyFilenamePart(criterion?.label || state.activeIssue || 'kriterium');
    const filterParts = activeFilterFilenameParts();
    return ['satourn', 'fehlerliste', criterionPart, ...filterParts].filter(Boolean).join('_') + '.csv';
  }

  function exportCurrentViewToCSV() {
    if (state.activeIssue) {
      const criterion = getActiveIssueCriterion();
      const items = getIssueListItems();
      if (!items.length) {
        setPill('err', 'keine Exportdaten');
        setEmptyState(EMPTY_STATES.noExport);
        return;
      }

      downloadCsv(issueListFilename(criterion), buildCsvRowsForIssueList(items, criterion));
      setPill('ok', 'Fehlerliste exportiert');
      return;
    }

    if (!state.latestRows.length) {
      setPill('err', 'keine Exportdaten');
      setEmptyState(EMPTY_STATES.noExport);
      return;
    }

    const rows = getFilteredResultRows(state.latestRows);
    if (!rows.length) {
      setPill('err', 'keine Exportdaten');
      setEmptyState(EMPTY_STATES.noExport);
      return;
    }

    downloadCsv('satourn_export.csv', buildCsvRowsForResults(rows));
    setPill('ok', 'CSV exportiert');
  }

  function currentFilters() {
    const filters = {
      allAreas: !!elements.allAreasCheckbox.checked,
      area: elements.allAreasCheckbox.checked ? null : state.selectedArea,
      place: elements.allAreasCheckbox.checked ? null : state.selectedPlace,
      type: elements.allAreasCheckbox.checked ? null : state.selectedType,
      category: elements.allAreasCheckbox.checked ? null : state.selectedCategory
    };
    syncActiveFilters(filters);
    return filters;
  }

  async function fetchData() {
    if (state.currentRun) return;

    resetOutput();
    showProgress(true);
    toggleLoading(true);
    setProgress(0, 0);
    setPill('run', 'startet');

    const run = {
      id: Date.now(),
      controller: new AbortController(),
      aborted: false
    };
    state.currentRun = run;
    setRunning(true);

    try {
      const rows = await prepareRows(currentFilters(), run.controller.signal);
      if (run.aborted) {
        setPill('err', 'abgebrochen');
        return;
      }

      const requestCount = rows.length * 2;

      if (!rows.length) {
        setPill('err', 'keine Abfrage');
        setEmptyState(EMPTY_STATES.noResults);
        return;
      }

      if (requestCount >= WARN_REQUEST_LIMIT) {
        const confirmed = window.confirm(`Diese Abfrage erzeugt ${requestCount} Requests. Fortfahren?`);
        if (!confirmed) {
          setPill('ok', 'bereit');
          return;
        }
      }

      state.latestRows = rows;
      await runQueue(rows, run);
      refreshNormalizedItems();

      if (run.aborted) {
        state.latestRows = [];
        resetQualityData();
        elements.exportButton.disabled = true;
        setPill('err', 'abgebrochen');
      } else {
        renderAll();
        const errorRows = computeSummary(rows).errorRows;
        setPill(errorRows ? 'err' : 'ok', errorRows ? `fertig mit ${errorRows} Fehlern` : 'fertig');
        setProgress(requestCount, requestCount);
      }
    } catch (error) {
      if (error.name === 'AbortError' || run.aborted) {
        setPill('err', 'abgebrochen');
      } else {
        elements.resultDiv.hidden = false;
        elements.resultDiv.textContent = `Fehler: ${shortError(error)}`;
        setEmptyState('Die Anfrage konnte nicht verarbeitet werden.');
        setPill('err', 'fehler');
        console.error(error);
      }
    } finally {
      if (state.currentRun?.id === run.id) state.currentRun = null;
      toggleLoading(false);
      setRunning(false);
      if (!state.latestRows.length) {
        showProgress(false);
        elements.exportButton.disabled = true;
      }
    }
  }

  function cancelRun() {
    if (!state.currentRun) return;
    state.currentRun.aborted = true;
    state.currentRun.controller.abort();
    setEmptyState('Abfrage wurde abgebrochen.');
    setPill('err', 'abbrechen...');
  }

  function disableInputs(disable) {
    [elements.typeContainer, elements.areaContainer, elements.placeContainer]
      .forEach((container) => {
        const dropdown = container?.querySelector?.('select');
        if (dropdown) dropdown.disabled = disable;
      });

    const categoryDropdown = elements.categoryContainer?.querySelector?.('select');
    if (categoryDropdown) categoryDropdown.disabled = disable || !state.selectedType;
    const disableQualityFilters = !!state.currentRun;
    [
      elements.qualitySearchInput,
      elements.qualityStatusSelect,
      elements.prioritySelect,
      elements.autoCheckSelect,
      elements.clearQualityFiltersButton
    ].forEach((element) => {
      if (element) element.disabled = disableQualityFilters;
    });
  }

  elements.allAreasCheckbox.addEventListener('change', () => {
    disableInputs(elements.allAreasCheckbox.checked || !!state.currentRun);
    currentFilters();
    refreshAfterActiveFilterChange();
  });
  elements.qualitySearchInput.addEventListener('input', debounce(refreshAfterActiveFilterChange));
  [
    elements.qualityStatusSelect,
    elements.prioritySelect,
    elements.autoCheckSelect
  ].forEach((element) => {
    element.addEventListener('change', refreshAfterActiveFilterChange);
  });
  elements.clearQualityFiltersButton.addEventListener('click', clearQualityFilters);

  elements.searchButton.addEventListener('click', fetchData);
  elements.cancelButton.addEventListener('click', cancelRun);
  elements.exportButton.addEventListener('click', exportCurrentViewToCSV);
  elements.viewNavButtons.forEach((button) => {
    button.addEventListener('click', () => setActivePanel(button.dataset.statistikView));
  });
  elements.aiChatOpenButton.addEventListener('click', openAiChatPanel);
  elements.aiChatCloseButton.addEventListener('click', closeAiChatPanel);
  elements.aiChatForm.addEventListener('submit', (event) => {
    event.preventDefault();
    submitAiChatMessage(elements.aiChatInput.value);
  });
  elements.aiChatChips.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-prompt]');
    if (!button) return;
    submitAiChatMessage(button.dataset.prompt);
  });
  elements.itemDetailCloseButton.addEventListener('click', () => closeItemDetailPanel({ restoreFocus: false }));
  elements.issueCloseButton.addEventListener('click', clearActiveIssue);
  elements.issuePrevButton.addEventListener('click', () => {
    state.issueListPage = Math.max(0, state.issueListPage - 1);
    renderIssueList();
  });
  elements.issueNextButton.addEventListener('click', () => {
    const nextClientPageStart = (state.issueListPage + 1) * state.issueListPageSize;
    const needsServerPage = (
      isActiveServerIssueList() &&
      nextClientPageStart >= safeArray(state.serverIssueList.items).length &&
      state.serverIssueList.page?.nextCursor != null
    );

    if (needsServerPage) {
      void loadServerIssueList({
        cursor: Number(state.serverIssueList.page.nextCursor) || 0,
        append: true
      }).then(() => {
        state.issueListPage += 1;
        renderIssueList();
      });
      return;
    }

    state.issueListPage += 1;
    renderIssueList();
  });
  elements.sortSelect.addEventListener('change', () => {
    syncActiveFilters();
    renderAll();
  });

  let resizeTimer;
  window.addEventListener('resize', () => {
    if (!state.latestRows.length || elements.chartContainer.hidden) return;
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => renderCharts(state.latestRows), 150);
  });

  showProgress(false);
  toggleLoading(false);
  setPill('ok', 'bereit');
  syncActiveFilters();
  updateViewNavigation();
  updateAiContextNote();
  updateAiStatus();
  renderAiMessages();
  loadTypes();
  loadCategorySelect(null);
  loadPlaces(null);
  loadAreas();
});
