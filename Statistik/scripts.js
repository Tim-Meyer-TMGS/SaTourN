import { fetchText, parseXml, downloadText, createSelect, createStatusSetter, extractId, extractItems, extractTotal } from '../lib/browser.js';
import { evaluateAllItems, getCriteriaForType, getQualityAggregations, qualityCriteria, qualityHelpers } from './quality.js';

document.addEventListener('DOMContentLoaded', () => {
  const API_BASE = window.SATOURN_SEARCH_API_BASE
    || (location.hostname === 'localhost' || location.hostname === '127.0.0.1'
      ? 'http://localhost:3000/api/search'
      : 'https://satourn.onrender.com/api/search');

  const CONCURRENCY = Math.max(1, Math.min(10, Number(window.SATOURN_STATISTIK_CONCURRENCY || 6)));
  const WARN_REQUEST_LIMIT = Number(window.SATOURN_STATISTIK_WARN_REQUESTS || 120);
  const QUALITY_ITEMS_PER_QUERY = Math.max(0, Math.min(50, Number(window.SATOURN_STATISTIK_QUALITY_ITEMS_PER_QUERY || 25)));
  const QUALITY_ITEM_MAX_ITEMS = Math.max(0, Math.min(5000, Number(window.SATOURN_STATISTIK_QUALITY_ITEM_MAX_ITEMS || 2000)));

  const categoryTreeUrls = {
    Hotel: 'https://api.et4.de/Schema/eTouristV4/Vermieter/Sachsen-Tourismus/VermieterTree.xml',
    Event: 'https://api.et4.de/Schema/eTouristV4/Veranstaltung/Sachsen-Tourismus/VeranstaltungTree.xml',
    Gastro: 'https://api.et4.de/Schema/eTouristV4/Gastro/Sachsen-Tourismus/GastroTree.xml',
    Tour: 'https://api.et4.de/Schema/eTouristV4/Tour/Sachsen-Tourismus/TourTree.xml',
    POI: 'https://api.et4.de/Schema/eTouristV4/Poi/Sachsen-Tourismus/POITree.xml',
    Package: 'https://api.et4.de/Schema/eTouristV4/GlobalePauschale/Sachsen-Tourismus/GlobalePauschaleTree.xml'
  };

  const typesList = ['POI', 'Tour', 'Hotel', 'Event', 'Gastro', 'Package'];

  const elements = {
    typeContainer: document.getElementById('type-dropdown-container'),
    categoryContainer: document.getElementById('category-dropdown-container'),
    areaContainer: document.getElementById('area-dropdown-container'),
    placeContainer: document.getElementById('place-dropdown-container'),
    searchButton: document.getElementById('search-button'),
    cancelButton: document.getElementById('cancel-button'),
    exportButton: document.getElementById('export-button'),
    sortSelect: document.getElementById('sort-select'),
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
    prog: document.querySelector('.prog')
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
    activeView: 'overview',
    issueListPage: 0,
    issueListPageSize: 50,
    sortBy: 'default',
    sortDirection: 'asc'
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

  const formatNumber = (value) => Number(value || 0).toLocaleString('de-DE');
  const QUALITY_EMPTY_TEXT = 'Fuer die aktuelle Auswahl wurden keine Qualitaetsprobleme gefunden.';
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

  const cleanQueryValue = (value) => String(value || '').replaceAll('"', '').trim();

  const shortError = (error) => {
    if (!error) return 'Unbekannter Fehler';
    if (error.name === 'AbortError') return 'Abgebrochen';
    return String(error.message || error).slice(0, 180);
  };

  const setPill = createStatusSetter(elements.statusPill);

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
    elements.chartContainer.hidden = true;
    elements.exportButton.disabled = true;
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

  function normalizeLicense(rawItem) {
    return normalizeString(firstValue(rawItem, [
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
    return /\b(CC0|CC-BY|CC-BY-SA)\b/i.test(license);
  }

  function normalizeCoordinates(rawItem) {
    const lat = normalizeNumber(firstValue(rawItem, [
      'lat',
      'latitude',
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
    const media = firstValue(rawItem, ['images', 'image', 'media', 'photos', 'pictures']);
    if (!media) return null;
    const values = safeArray(media).filter(hasMeaningfulValue);
    return values.length || null;
  }

  function normalizeAvailability(rawItem, paths) {
    const value = firstValue(rawItem, paths);
    if (value == null) return null;
    return hasMeaningfulValue(value);
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
      'presentation.url',
      'presentation.link'
    ]));
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

    return {
      id: normalizeString(extractId(raw)) || normalizeString(firstValue(raw, ['global_id', 'globalId', 'id', 'Id', 'ID'])) || null,
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
      category: normalizeString(firstValue(raw, ['category', 'categories', 'Category', 'classification.category'])) || normalizeContextValue(context.category),
      region: normalizeString(firstValue(raw, ['area', 'region', 'state', 'federalState', 'address.region'])) || normalizeContextValue(context.region),
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
      descriptionAvailable: normalizeAvailability(raw, ['description', 'shortDescription', 'longDescription', 'teaser', 'text', 'presentation.description']),
      openingHoursAvailable: normalizeAvailability(raw, ['openingHours', 'opening_hours', 'hours', 'businessHours', 'times']),
      bookingLinkAvailable: normalizeAvailability(raw, ['bookingUrl', 'bookingLink', 'reservationUrl', 'ticketUrl', 'booking.url']),
      updatedAt: normalizeString(firstValue(raw, ['updatedAt', 'modifiedAt', 'lastModified', 'changed', 'dateModified'])),
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
    state.sortBy = elements.sortSelect.value || 'default';
    state.sortDirection = state.sortBy.endsWith('-desc') ? 'desc' : 'asc';
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
    if (hasQualityOutputContext()) {
      renderQualitySections();
      return;
    }
    refreshFilteredItems();
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

  function renderTable(rows) {
    elements.resultDiv.replaceChildren();

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

    sortedRows(rows).forEach((row) => {
      const tr = document.createElement('tr');
      const pct = rowPercent(row);
      const error = row.errors.length > 0 || !hasValidCounts(row);
      if (error) tr.classList.add('row-error');

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
    elements.resultDiv.hidden = rows.length === 0;
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
      elements.qualitySampleNote.textContent = 'Qualitaetsdaten: keine auswertbaren Datensaetze in der aktuellen Stichprobe.';
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
      elements.issueStatus.textContent = 'Das ausgewaehlte Qualitaetsproblem kommt in der aktuellen Auswahl nicht vor.';
      return;
    }

    const affectedCount = getIssueFilteredItems(getBaseFilteredItems()).length;
    elements.issueStatus.textContent = `${issue.label}: Fehlerliste mit ${formatNumber(affectedCount)} betroffenen Datensaetzen vorbereitet.`;
  }

  function selectQualityIssue(criterionId) {
    const issue = safeArray(state.qualityAggregations?.issueSummary)
      .find((entry) => entry.criterionId === criterionId);

    state.activeIssue = criterionId;
    state.activeFilters.criterionId = criterionId;
    state.activeView = 'issueList';
    state.issueListPage = 0;
    refreshFilteredItems();
    renderQualitySections();

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
    return getItemsByMissingCriterion(getBaseFilteredItems(), state.activeIssue);
  }

  function issueRecommendation(item, criterion) {
    if (criterion?.recommendation) return criterion.recommendation;
    return safeArray(item?.recommendations).map(normalizeString).find(Boolean) || '-';
  }

  function issueSourceCell(cell, item) {
    const url = normalizeString(item?.sourceUrl);
    if (!url) {
      cell.textContent = '-';
      return;
    }

    const link = document.createElement('a');
    link.href = url;
    link.textContent = 'Link';
    link.className = 'issue-link';
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    cell.appendChild(link);
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

  function updateIssueListHeader(items) {
    const criterion = getActiveIssueCriterion();
    const label = criterion?.label || state.activeIssue || 'Unbekanntes Kriterium';
    const count = safeArray(items).length;

    elements.issueDetailTitle.textContent = `Fehlerliste: ${label}`;
    elements.issueDetailMeta.textContent = `${formatNumber(count)} betroffene Datensaetze in der aktuellen Auswahl`;
    elements.issueDetailFilters.textContent = getActiveFilterDescription();
  }

  function renderIssuePagination(totalItems) {
    const pageSize = state.issueListPageSize;
    const pageCount = Math.max(1, Math.ceil(totalItems / pageSize));
    state.issueListPage = Math.max(0, Math.min(state.issueListPage, pageCount - 1));

    elements.issuePagination.hidden = totalItems <= pageSize;
    elements.issuePrevButton.disabled = state.issueListPage <= 0;
    elements.issueNextButton.disabled = state.issueListPage >= pageCount - 1;
    elements.issuePageStatus.textContent = `Seite ${formatNumber(state.issueListPage + 1)} von ${formatNumber(pageCount)}`;
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

    if (!items.length) {
      const empty = document.createElement('div');
      empty.className = 'issue-page-empty';
      empty.textContent = `Fuer das Kriterium '${criterion?.label || state.activeIssue}' wurden in der aktuellen Auswahl keine betroffenen Datensaetze gefunden.`;
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
    state.activeFilters.criterionId = null;
    state.activeView = 'overview';
    state.issueListPage = 0;
    refreshFilteredItems();
    renderQualitySections();
    setPill('ok', 'Uebersicht');
  }

  function renderQualitySections() {
    refreshFilteredItems();
    renderQualitySummary();
    renderIssueSummary();
    renderIssueList();
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
    renderSummary(state.latestRows);
    renderQualitySections();
    renderTable(state.latestRows);
    renderCharts(state.latestRows);
    elements.exportButton.disabled = state.latestRows.length === 0 || !!state.currentRun;
  }

  function downloadCsv() {
    if (!state.latestRows.length) return;

    const rows = sortedRows(state.latestRows);
    const lines = [
      ['Gebiet', 'Ort', 'Typ', 'Kategorie', 'SaTourN', 'Open-Data', 'Open-Data %', 'Status'],
      ...rows.map((row) => {
        const pct = rowPercent(row);
        return [
          row.area,
          row.place,
          row.type,
          row.category,
          Number.isFinite(row.statistikCount) ? row.statistikCount : '',
          Number.isFinite(row.openDataCount) ? row.openDataCount : '',
          pct == null ? '' : pct.toFixed(2),
          row.errors.join(' | ') || (hasValidCounts(row) ? 'OK' : 'Unvollständig')
        ];
      })
    ].map((line) => line.map((value) => `"${String(value ?? '').replaceAll('"', '""')}"`).join(';'));

    const filename = `satourn-statistik-${new Date().toISOString().slice(0, 10)}.csv`;
    downloadText(filename, lines.join('\n'), 'text/csv;charset=utf-8');
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
  }

  elements.allAreasCheckbox.addEventListener('change', () => {
    disableInputs(elements.allAreasCheckbox.checked || !!state.currentRun);
    currentFilters();
    refreshAfterActiveFilterChange();
  });

  elements.searchButton.addEventListener('click', fetchData);
  elements.cancelButton.addEventListener('click', cancelRun);
  elements.exportButton.addEventListener('click', downloadCsv);
  elements.issueCloseButton.addEventListener('click', clearActiveIssue);
  elements.issuePrevButton.addEventListener('click', () => {
    state.issueListPage = Math.max(0, state.issueListPage - 1);
    renderIssueList();
  });
  elements.issueNextButton.addEventListener('click', () => {
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
  loadTypes();
  loadCategorySelect(null);
  loadPlaces(null);
  loadAreas();
});
