document.addEventListener('DOMContentLoaded', () => {
  // ---- XML-Kategorien-URLs (direkt, ohne Proxy) ----
  const xmlUrls = {
    POI:          'https://api.et4.de/Schema/eTouristV4/Poi/Sachsen-Tourismus/POITree.xml',
    Tour:         'https://api.et4.de/Schema/eTouristV4/Tour/Sachsen-Tourismus/TourTree.xml',
    Gastronomie:  'https://api.et4.de/Schema/eTouristV4/Gastro/Sachsen-Tourismus/GastroTree.xml',
    Event:        'https://api.et4.de/Schema/eTouristV4/Veranstaltung/Sachsen-Tourismus/VeranstaltungTree.xml',
    Hotel:        'https://api.et4.de/Schema/eTouristV4/Vermieter/Sachsen-Tourismus/VermieterTree.xml'
  };

  // ---- Proxy-Endpoint (Lizenzkey geschützt) ----
  const proxyBase  = 'https://satourn.onrender.com/api/search';

  // ---- DOM-Elemente ----
  const typeSelect     = document.getElementById('type');
  const areaSelect     = document.getElementById('areas');
  const citySelect     = document.getElementById('City');
  const categorySelect = document.getElementById('categories');
  const logicOpSelect  = document.getElementById('logicOperator');
  const heightInput    = document.getElementById('height');
  const resultTA       = document.getElementById('resultTA');
  const resultNoTA     = document.getElementById('resultNoParams');
  const copyBtn        = document.getElementById('copyButton');
  const infoBtn        = document.getElementById('infoBtn');
  const infoBox        = document.getElementById('infoBox');
  const closeInfoBtn   = document.getElementById('closeInfoBox');
  const showMapChk     = document.getElementById('showMap');
  const urlForm        = document.getElementById('urlForm');

  // ---- helpers ----
  const encodeSeg = (s) => encodeURIComponent(s);
  const ensureEl = (el, id) => { if (!el) console.error(`Kein <${id}> gefunden!`); return Boolean(el); };
  const norm = (s) => (s || '').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ').trim();

  // ---- Info-Box-Logik ----
  if (infoBtn && infoBox && closeInfoBtn) {
    infoBtn.addEventListener('click',    () => infoBox.style.display = 'block');
    closeInfoBtn.addEventListener('click', () => infoBox.style.display = 'none');
    window.addEventListener('click', e => { if (e.target === infoBox) infoBox.style.display = 'none'; });
  }

  // ---- Initiales Befüllen ----
  loadAreas();
  loadCategories();
  if (areaSelect) {
    areaSelect.addEventListener('change', () => {
      // City zurücksetzen und (de)aktivieren
      if (citySelect) {
        citySelect.innerHTML = '<option value="">Keine Stadt wählen</option>';
        citySelect.disabled = !areaSelect.value;
      }
      loadCity(areaSelect.value);
    });
  }
  if (typeSelect) typeSelect.addEventListener('change', loadCategories);

  // ---- Funktionen zum Laden der Selects ----
  async function loadAreas() {
    if (!ensureEl(areaSelect, 'select id="areas"')) return;
    try {
      const res = await fetch(`${proxyBase}?type=Area&experience=sachsen-tourismus&template=ET2014A.xml`);
      const txt = await res.text();
      const xml = new DOMParser().parseFromString(txt, 'application/xml');
      const items = Array.from(xml.querySelectorAll('item > title'));
      areaSelect.innerHTML = '<option value="">Kein Gebiet wählen</option>';
      items.forEach(el => areaSelect.append(new Option(el.textContent, el.textContent)));
      if (citySelect) citySelect.disabled = true;
    } catch (err) {
      console.error('Fehler beim Laden der Gebiete:', err);
    }
  }

  async function loadCity(area) {
    if (!ensureEl(citySelect, 'select id="City"')) return;
    citySelect.innerHTML = '<option value="">Keine Stadt wählen</option>';

    const chosen = (area || '').trim();
    if (!chosen) { citySelect.disabled = true; return; }

    try {
      // Schritt A: Versuch mit q-Filter (falls Proxy das irgendwann korrekt weiterreicht)
      const paramsA = new URLSearchParams({
        type: 'City',
        experience: 'sachsen-tourismus',
        template: 'ET2014A.xml',
        q: `area:"${chosen}"`
      });
      const urlA = `${proxyBase}?${paramsA.toString()}`;
      let res = await fetch(urlA);
      let txt = await res.text();
      let xml = new DOMParser().parseFromString(txt, 'application/xml');
      let items = Array.from(xml.querySelectorAll('item'));

      // Heuristik: wenn >200, dann wurde nicht gefiltert → Schritt B
      if (items.length > 200) {
        const paramsB = new URLSearchParams({
          type: 'City',
          experience: 'sachsen-tourismus',
          template: 'ET2014A.xml'
        });
        const urlB = `${proxyBase}?${paramsB.toString()}`;
        res = await fetch(urlB);
        txt = await res.text();
        xml = new DOMParser().parseFromString(txt, 'application/xml');
        items = Array.from(xml.querySelectorAll('item'));

        // Clientseitige, robuste Filterung auf Area
        const needle = norm(chosen);
        items = items.filter(it => {
          const candidates = [
            ...Array.from(it.querySelectorAll('areas, Area, area, region, Region, gebiet, Gebiet')),
            ...Array.from(it.querySelectorAll('attributes > area, attributes > Area')),
            ...Array.from(it.querySelectorAll('field[name="area"], field[name="areas"]')),
            ...Array.from(it.querySelectorAll('keywords > keyword')),
            ...Array.from(it.querySelectorAll('facets > facet[name="area"] value'))
          ]
          .map(n => n.textContent)
          .filter(Boolean)
          .map(norm);

          return candidates.some(c => c === needle || c.includes(needle) || needle.includes(c));
        });
      }

      const options = items
        .map(it => it.querySelector('title')?.textContent?.trim())
        .filter(Boolean)
        .filter((v, i, arr) => arr.indexOf(v) === i)
        .sort((a, b) => a.localeCompare(b, 'de'));

      options.forEach(name => citySelect.append(new Option(name, name)));
      citySelect.disabled = options.length === 0;
      console.info(`[CityLoader] Gebiet="${chosen}" → ${options.length} Städte angezeigt.`);
    } catch (err) {
      console.error('Fehler beim Laden der Städte:', err);
    }
  }

  async function loadCategories() {
    if (!ensureEl(typeSelect, 'select id="type"') || !ensureEl(categorySelect, 'select id="categories"')) return;
    const sel = typeSelect.value;
    categorySelect.innerHTML = '<option value="">Keine Kategorie wählen</option>';
    const url = xmlUrls[sel];
    if (!url) return;
    try {
      const res = await fetch(url);
      const txt = await res.text();
      const xml = new DOMParser().parseFromString(txt, 'application/xml');
      Array.from(xml.querySelectorAll('Category')).forEach(cat => {
        const name = cat.getAttribute('Name');
        if (name) categorySelect.append(new Option(name, name));
      });
    } catch (err) {
      console.error('Fehler beim Laden der Kategorien:', err);
    }
  }

  // ---- URL-Bausteine erzeugen ----
  function buildFilterPath({ area, catsSegment, city }) {
    const segs = [];
    if (area) segs.push(`area:\"${area}\"`);
    if (catsSegment) segs.push(catsSegment);
    if (city) segs.push(`city:\"${city}\"`);
    if (!segs.length) return '';
    return '/' + segs.map(encodeSeg).join('/');
  }

  function buildCategorySegment() {
    const op   = logicOpSelect ? logicOpSelect.value : 'AND';
    const vals = Array.from(categorySelect?.selectedOptions || []).map(o => `category:\"${o.value}\"`);
    if (!vals.length) return '';
    return vals.join(` ${op} `);
  }

  // ---- Formular abschicken ----
  if (urlForm) {
    urlForm.addEventListener('submit', e => {
      e.preventDefault();

      const type   = encodeSeg(typeSelect?.value || 'POI');
      const height = (heightInput?.value || '1200').trim();
      const area   = areaSelect?.value || '';
      const city   = citySelect?.value || '';
      const catsSegment = buildCategorySegment();
      const filterPath  = buildFilterPath({ area, catsSegment, city });

      let directUrl = `https://pages.destination.one/de/open-data-sachsen-tourismus/default_withmap/search/${type}${filterPath}`;
      if (showMapChk?.checked) directUrl += '/view:map,half';
      const directUrlWithQuery = `${directUrl}?i_target=et4pages&i_height=${encodeSeg(height)}`;

      const embedSrc = `https://pages.destination.one/de/open-data-sachsen-tourismus/default/search/${type}${filterPath}?i_target=et4pages&i_height=${encodeSeg(height)}`;
      const embedSnippet = `<script id="et4pages" type="text/javascript" src="${embedSrc}"></script>`;

      if (resultTA)   resultTA.value   = embedSnippet;
      if (resultNoTA) resultNoTA.value = directUrl;

      if (copyBtn) copyBtn.classList.remove('hidden');
    });
  }

  // ---- Copy-Button ----
  if (copyBtn && resultTA) {
    copyBtn.addEventListener('click', () => {
      resultTA.select();
      document.execCommand('copy');
      alert('Embed-Code in Zwischenablage kopiert!');
    });
  }
});
