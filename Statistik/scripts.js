import { fetchText, parseXml, downloadText, createSelect, createStatusSetter } from '../lib/browser.js';

document.addEventListener('DOMContentLoaded', () => {
  const API_BASE = window.SATOURN_SEARCH_API_BASE
    || (location.hostname === 'localhost' || location.hostname === '127.0.0.1'
      ? 'http://localhost:3000/api/search'
      : 'https://satourn.onrender.com/api/search');

  const CONCURRENCY = Math.max(1, Math.min(10, Number(window.SATOURN_STATISTIK_CONCURRENCY || 6)));
  const WARN_REQUEST_LIMIT = Number(window.SATOURN_STATISTIK_WARN_REQUESTS || 120);

  const xmlUrls = {
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

  const state = {
    selectedType: null,
    selectedCategory: null,
    selectedArea: null,
    selectedPlace: null,
    currentRun: null,
    areaCache: null,
    categoriesCache: new Map(),
    placeLoadSeq: 0,
    categoryLoadSeq: 0,
    latestRows: []
  };

  const formatNumber = (value) => Number(value || 0).toLocaleString('de-DE');

  const cleanQueryValue = (value) => String(value || '').replaceAll('"', '').trim();

  function getElementsByLocalName(root, name) {
    try {
      return Array.from((root || document).getElementsByTagName('*')).filter((el) => el.localName === name);
    } catch (e) {
      return [];
    }
  }

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
    elements.resultDiv.replaceChildren();
    elements.resultDiv.hidden = true;
    elements.summary.hidden = true;
    elements.chartContainer.hidden = true;
    elements.exportButton.disabled = true;
  }

  function buildUrl(type, rawQuery = '', isOpenData = false) {
    const url = new URL(API_BASE, window.location.origin);
    url.searchParams.set('type', type || '');
    url.searchParams.set('query', rawQuery || '');
    if (isOpenData) url.searchParams.set('isOpenData', 'true');
    return url.toString();
  }

  function parseCount(xmlText) {
    const xml = parseXml(xmlText);
    const raw = getElementsByLocalName(xml, 'overallcount')[0]?.textContent;
    if (raw == null) throw new Error('overallcount fehlt');

    const count = Number.parseInt(raw, 10);
    if (!Number.isFinite(count)) throw new Error(`overallcount ungültig: ${raw}`);
    return count;
  }


  function extractItemTitles(xmlText) {
    const xml = parseXml(xmlText);
    return getElementsByLocalName(xml, 'item')
      .map((item) => getElementsByLocalName(item, 'title')[0]?.textContent?.trim())
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b, 'de'));
  }

  async function loadAreaTitles(signal) {
    if (state.areaCache) return state.areaCache;
    const response = await fetchText(buildUrl('Area'), signal);
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
    const response = await fetchText(buildUrl('City', query), signal);
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

    const treeUrl = xmlUrls[type];
    if (!treeUrl) {
      state.categoriesCache.set(type, []);
      return [];
    }

    try {
      const response = await fetchText(treeUrl, signal);
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

    if (!type) {
      const select = createSelect({
        id: 'category-dropdown',
        container: elements.categoryContainer,
        placeholder: 'Erst Typ wählen',
        values: [],
        onChange: (value) => {
          state.selectedCategory = value;
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

  async function fetchCountForJob(job, signal) {
    const url = buildUrl(job.row.type, job.row.query, job.isOpenData);
    const response = await fetchText(url, signal);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} beim Abrufen der Zahl (URL: ${url})`);
    }
    try {
      return parseCount(response.text);
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
    return {
      allAreas: !!elements.allAreasCheckbox.checked,
      area: elements.allAreasCheckbox.checked ? null : state.selectedArea,
      place: elements.allAreasCheckbox.checked ? null : state.selectedPlace,
      type: elements.allAreasCheckbox.checked ? null : state.selectedType,
      category: elements.allAreasCheckbox.checked ? null : state.selectedCategory
    };
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

      if (run.aborted) {
        state.latestRows = [];
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
  });

  elements.searchButton.addEventListener('click', fetchData);
  elements.cancelButton.addEventListener('click', cancelRun);
  elements.exportButton.addEventListener('click', downloadCsv);
  elements.sortSelect.addEventListener('change', renderAll);

  let resizeTimer;
  window.addEventListener('resize', () => {
    if (!state.latestRows.length || elements.chartContainer.hidden) return;
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => renderCharts(state.latestRows), 150);
  });

  showProgress(false);
  toggleLoading(false);
  setPill('ok', 'bereit');
  loadTypes();
  loadCategorySelect(null);
  loadPlaces(null);
  loadAreas();
});
