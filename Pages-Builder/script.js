<script>
document.addEventListener('DOMContentLoaded', () => {
  // ---- XML-Kategorien-URLs (direkt, ohne Proxy) ----
  const xmlUrls = {
    POI:  'https://api.et4.de/Schema/eTouristV4/Poi/Sachsen-Tourismus/POITree.xml',
    Tour: 'https://api.et4.de/Schema/eTouristV4/Tour/Sachsen-Tourismus/TourTree.xml',
    Gastronomie: 'https://api.et4.de/Schema/eTouristV4/Gastro/Sachsen-Tourismus/GastroTree.xml',
    Event: 'https://api.et4.de/Schema/eTouristV4/Veranstaltung/Sachsen-Tourismus/VeranstaltungTree.xml',
    Hotel: 'https://api.et4.de/Schema/eTouristV4/Vermieter/Sachsen-Tourismus/VermieterTree.xml'
  };

  // ---- Proxy-Endpoints für Area & City ----
  const proxyBase = 'https://satourn.onrender.com/api/search';
  const areaApiUrl = `${proxyBase}?type=Area`;
  const cityApiUrl = `${proxyBase}?type=City`;

  // ---- DOM-Elemente ----
  const typeSelect      = document.getElementById('type');
  const areaSelect      = document.getElementById('areas');
  const citySelect      = document.getElementById('City');          // (id "City" beibehalten)
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

  // ---- Info-Box-Logik ----
  infoBtn?.addEventListener('click', () => infoBox.style.display = 'block');
  closeInfoBtn?.addEventListener('click', () => infoBox.style.display = 'none');
  window.addEventListener('click', e => { if (e.target === infoBox) infoBox.style.display = 'none'; });

  // ---- Initiales Befüllen ----
  loadAreas();
  loadCity();
  loadCategories();
  typeSelect?.addEventListener('change', loadCategories);

  // ---- Helper ----
  const escapeForPath = (s) => String(s).replace(/"/g, '\\"'); // Quotes im sichtbaren Teil escapen

  function buildCategoryExpression(selectedValues, op) {
    // Z. B. category:"Museen" OR category:"Theater"
    const parts = selectedValues.map(v => `category:"${escapeForPath(v)}"`);
    return parts.join(` ${op} `);
  }

  // ---- Funktionen zum Laden der Selects ----
  async function loadAreas() {
    if (!areaSelect) return console.error('Kein <select id="areas"> gefunden!');
    try {
      const res = await fetch(areaApiUrl);
      const txt = await res.text();
      const xml = new DOMParser().parseFromString(txt, 'application/xml');
      const items = Array.from(xml.querySelectorAll('item > title')).map(n => n.textContent.trim()).filter(Boolean);

      areaSelect.innerHTML = '<option value="">Kein Gebiet wählen</option>';
      items.forEach(title => areaSelect.append(new Option(title, title)));
    } catch (err) {
      console.error('Fehler beim Laden der Gebiete:', err);
    }
  }

  async function loadCity() {
    if (!citySelect) return console.error('Kein <select id="City"> gefunden!');
    try {
      const res = await fetch(cityApiUrl);
      const txt = await res.text();
      const xml = new DOMParser().parseFromString(txt, 'application/xml');
      const items = Array.from(xml.querySelectorAll('item > title')).map(n => n.textContent.trim()).filter(Boolean);

      citySelect.innerHTML = '<option value="">Keine Stadt wählen</option>';
      items.forEach(title => citySelect.append(new Option(title, title)));
    } catch (err) {
      console.error('Fehler beim Laden der Städte:', err);
    }
  }

  async function loadCategories() {
    const sel = typeSelect?.value;
    categorySelect.innerHTML = '<option value="">Keine Kategorie wählen</option>';
    const url = xmlUrls[sel];
    if (!url) return;
    try {
      const res = await fetch(url);
      const txt = await res.text();
      const xml = new DOMParser().parseFromString(txt, 'application/xml');
      const cats = Array.from(xml.querySelectorAll('Category'))
        .map(cat => cat.getAttribute('Name'))
        .filter(Boolean);
      cats.forEach(name => categorySelect.append(new Option(name, name)));
    } catch (err) {
      console.error('Fehler beim Laden der Kategorien:', err);
    }
  }

  // ---- Formular abschicken ----
  document.getElementById('urlForm')?.addEventListener('submit', e => {
    e.preventDefault();

    const type   = typeSelect.value;           // POI | Tour | ...
    const height = String(heightInput.value || '').trim();
    const op     = logicOpSelect.value;        // AND | OR
    const area   = areaSelect.value;
    const city   = citySelect.value;

    const selectedCats = Array.from(categorySelect.selectedOptions)
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
    resultTA.value  = embedSnippet;
    resultNoTA.value = cleanUrl;

    // Für Debugging (optional):
    // console.log({ cleanUrl, fullUrl, embedSnippet });

    copyBtn?.classList.remove('hidden');
  });

  // ---- Copy-Button ----
  copyBtn?.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(resultTA.value);
      alert('Embed-Code in die Zwischenablage kopiert!');
    } catch {
      // Fallback für ältere Browser
      resultTA.select();
      document.execCommand('copy');
      alert('Embed-Code in die Zwischenablage kopiert!');
    }
  });
});
</script>
