"use strict";

document.addEventListener('DOMContentLoaded', () => {
  // ============================================================
  // Config
  // ============================================================
  const xmlUrls = {
    POI:  'https://api.et4.de/Schema/eTouristV4/Poi/Sachsen-Tourismus/POITree.xml',
    Tour: 'https://api.et4.de/Schema/eTouristV4/Tour/Sachsen-Tourismus/TourTree.xml',
    Gastronomie: 'https://api.et4.de/Schema/eTouristV4/Gastro/Sachsen-Tourismus/GastroTree.xml',
    Event: 'https://api.et4.de/Schema/eTouristV4/Veranstaltung/Sachsen-Tourismus/VeranstaltungTree.xml',
    Hotel: 'https://api.et4.de/Schema/eTouristV4/Vermieter/Sachsen-Tourismus/VermieterTree.xml'
  };

  // Proxy, der meta.et4.de durchreicht (Area via XML, City via JSON)
  const proxyBase  = 'https://satourn.onrender.com/api/search';
  const areaApiUrl = `${proxyBase}?type=Area`;                 // XML
  const cityApiUrl = `${proxyBase}?type=City&format=json`;     // JSON

  // ============================================================
  // DOM
  // ============================================================
  const typeSelect      = document.getElementById('type');
  const areaSelect      = document.getElementById('areas');
  const citySelect      = document.getElementById('City'); // id "City" beibehalten
  const categorySelect  = document.getElementById('categories');
  const logicOpSelect   = document.getElementById('logicOperator'); // Werte: AND | OR
  const heightInput     = document.getElementById('height');
  const resultTA        = document.getElementById('resultTA');
  const resultNoTA      = document.getElementById('resultNoParams');
  const copyBtn         = document.getElementById('copyButton');
  const infoBtn         = document.getElementById('infoBtn');
  const infoBox         = document.getElementById('infoBox');
  const closeInfoBtn    = document.getElementById('closeInfoBox');
  const showMapCb       = document.getElementById('showMap');
  const formEl          = document.getElementById('urlForm');

  // ============================================================
  // State
  // ============================================================
  let allCities = []; // vollständige City-Liste (JSON von meta.et4, via Proxy)

  // ============================================================
  // Helpers
  // ============================================================
  const escapeForPath = (s) => String(s).replace(/"/g, '\\"'); // Quotes im sichtbaren Teil escapen

  function buildCategoryExpression(selectedValues, op) {
    // z. B. category:"Museen" OR category:"Theater"
    const parts = selectedValues.map(v => `category:"${escapeForPath(v)}"`);
    return parts.join(` ${op} `);
  }

  function setSelectOptions(selectEl, options, placeholder) {
    if (!selectEl) return;
    const frag = document.createDocumentFragment();
    const first = document.createElement('option');
    first.value = '';
    first.textContent = placeholder;
    frag.appendChild(first);
    for (const text of options) {
      const opt = new Option(text, text);
      frag.appendChild(opt);
    }
    selectEl.innerHTML = '';
    selectEl.appendChild(frag);
  }

  // ============================================================
  // Info-Box
  // ============================================================
  infoBtn?.addEventListener('click', () => infoBox.style.display = 'block');
  closeInfoBtn?.addEventListener('click', () => infoBox.style.display = 'none');
  window.addEventListener('click', e => { if (e.target === infoBox) infoBox.style.display = 'none'; });

  // ============================================================
  // Init
  // ============================================================
  loadAreas();
  loadCategories();
  loadCitiesJson().then(() => filterAndRenderCities()); // initial: alle Städte zeigen

  typeSelect?.addEventListener('change', loadCategories);
  areaSelect?.addEventListener('change', filterAndRenderCities);

  // ============================================================
  // Loaders
  // ============================================================
  async function loadAreas() {
    if (!areaSelect) return console.error('Kein <select id="areas"> gefunden!');
    try {
      const res = await fetch(areaApiUrl);
      const txt = await res.text();
      const xml = new DOMParser().parseFromString(txt, 'application/xml');
      const items = Array.from(xml.querySelectorAll('item > title'))
        .map(n => (n.textContent || '').trim())
        .filter(Boolean);
      setSelectOptions(areaSelect, items, 'Kein Gebiet wählen');
    } catch (err) {
      console.error('Fehler beim Laden der Gebiete:', err);
      setSelectOptions(areaSelect, [], 'Kein Gebiet wählen');
    }
  }

  async function loadCitiesJson() {
    if (!citySelect) { console.error('Kein <select id="City"> gefunden!'); return; }
    try {
      const res = await fetch(cityApiUrl, { headers: { 'Accept': 'application/json' } });
      const data = await res.json();
      // Erwartete Struktur: { items:[{ title, areas:[{value}], areas_old:[…] , …}, …] }
      allCities = Array.isArray(data?.items) ? data.items : [];
    } catch (err) {
      console.error('Fehler beim Laden der Städte (JSON):', err);
      allCities = [];
    }
  }

  async function loadCategories() {
    const sel = typeSelect?.value;
    if (!categorySelect) return;
    setSelectOptions(categorySelect, [], 'Keine Kategorie wählen');

    const url = xmlUrls[sel];
    if (!url) return;

    try {
      const res = await fetch(url);
      const txt = await res.text();
      const xml = new DOMParser().parseFromString(txt, 'application/xml');
      const cats = Array.from(xml.querySelectorAll('Category'))
        .map(cat => cat.getAttribute('Name'))
        .filter(Boolean);
      // Sortiert ausspielen (optional)
      cats.sort((a, b) => a.localeCompare(b, 'de'));
      // Mehrfachauswahl vorausgesetzt
      categorySelect.innerHTML = '';
      cats.forEach(name => categorySelect.append(new Option(name, name)));
    } catch (err) {
      console.error('Fehler beim Laden der Kategorien:', err);
      setSelectOptions(categorySelect, [], 'Keine Kategorie wählen');
    }
  }

  // ============================================================
  // Cities: lokal nach gewähltem Gebiet filtern
  // ============================================================
  function filterAndRenderCities() {
    if (!citySelect) return;
    const selectedArea = areaSelect?.value?.trim();

    let filtered = allCities;
    if (selectedArea) {
      const needle = selectedArea.toLowerCase();
      filtered = allCities.filter(item => {
        const areasNew = (item.areas || []).map(a => (a?.value || '').toLowerCase());
        const areasOld = (item.areas_old || []).map(a => (a || '').toLowerCase());
        return areasNew.includes(needle) || areasOld.includes(needle);
      });
    }

    // Duplikate via Titel entfernen & alphabetisch sortieren
    const byTitle = new Map();
    for (const c of filtered) {
      const t = (c.title || '').trim();
      if (t) byTitle.set(t, true);
    }
    const titles = Array.from(byTitle.keys()).sort((a, b) => a.localeCompare(b, 'de'));
    setSelectOptions(citySelect, titles, 'Keine Stadt wählen');
  }

  // ============================================================
  // URL-Builder & Form Submit
  // ============================================================
  formEl?.addEventListener('submit', (e) => {
    e.preventDefault();

    const type   = typeSelect?.value || ''; // POI | Tour | ...
    const height = String(heightInput?.value || '').trim();
    const op     = logicOpSelect?.value || 'OR'; // AND | OR
    const area   = areaSelect?.value || '';
    const city   = citySelect?.value || '';

    const selectedCats = Array.from(categorySelect?.selectedOptions || [])
      .map(o => o.value)
      .filter(Boolean);

    // Einzelne, komplett encodete Filter-Segmente
    const segments = [];

    if (area) {
      const seg = `area:"${escapeForPath(area)}"`;
      segments.push(encodeURIComponent(seg));
    }

    if (selectedCats.length) {
      const expr = buildCategoryExpression(selectedCats, op); // ein Segment für alle Kategorien
      segments.push(encodeURIComponent(expr));
    }

    if (city) {
      const seg = `city:"${escapeForPath(city)}"`;
      segments.push(encodeURIComponent(seg));
    }

    const base = 'https://pages.destination.one/de/open-data-sachsen-tourismus';
    const typePath = `search/${encodeURIComponent(type)}`;

    // Basis-Link OHNE Query-Parameter
    let cleanUrl = `${base}/default_withmap/${typePath}`;
    if (segments.length) cleanUrl += `/${segments.join('/')}`;
    if (showMapCb?.checked) cleanUrl += '/view:map,half';

    // Vollständige URL MIT Parametern
    let fullUrl = cleanUrl;
    const qp = new URLSearchParams({ i_target: 'et4pages' });
    if (height) qp.set('i_height', height);
    fullUrl += `?${qp.toString()}`;

    // Embed-Snippet (default/search) mit i_height
    const baseSrc = `${base}/default/search/${encodeURIComponent(type)}?i_target=et4pages`;
    const fullSrc = height ? `${baseSrc}&i_height=${encodeURIComponent(height)}` : baseSrc;
    const embedSnippet = `<script id="et4pages" type="text/javascript" src="${fullSrc}"></script>`;

    // Ausgabe
    if (resultTA)    resultTA.value   = embedSnippet;
    if (resultNoTA)  resultNoTA.value = cleanUrl;

    // Optional Debug:
    // console.log({ cleanUrl, fullUrl, embedSnippet });

    copyBtn?.classList.remove('hidden');
  });

  // ============================================================
  // Copy Button
  // ============================================================
  copyBtn?.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(resultTA?.value || '');
      alert('Embed-Code in die Zwischenablage kopiert!');
    } catch {
      // Fallback für ältere Browser
      if (resultTA) {
        resultTA.select();
        document.execCommand('copy');
      }
      alert('Embed-Code in die Zwischenablage kopiert!');
    }
  });
});
