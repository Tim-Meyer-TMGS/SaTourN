document.addEventListener('DOMContentLoaded', () => {
  // ---- XML-Kategorien-URLs (direkt, ohne Proxy) ----
  const xmlUrls = {
    POI:          'https://api.et4.de/Schema/eTouristV4/Poi/Sachsen-Tourismus/POITree.xml',
    Tour:         'https://api.et4.de/Schema/eTouristV4/Tour/Sachsen-Tourismus/TourTree.xml',
    Gastronomie:  'https://api.et4.de/Schema/eTouristV4/Gastro/Sachsen-Tourismus/GastroTree.xml',
    Event:        'https://api.et4.de/Schema/eTouristV4/Veranstaltung/Sachsen-Tourismus/VeranstaltungTree.xml',
    Hotel:        'https://api.et4.de/Schema/eTouristV4/Vermieter/Sachsen-Tourismus/VermieterTree.xml'
  };

  // ---- Proxy-Endpoints für Area & City ----
  const proxyBase  = 'https://satourn.onrender.com/api/search';
  const areaApiUrl = `${proxyBase}?type=Area`;
  const cityApiUrl = `${proxyBase}?type=City`;

  // ---- DOM-Elemente ----
  const typeSelect     = document.getElementById('type');
  const areaSelect     = document.getElementById('areas');
  const citySelect     = document.getElementById('City');
  const categorySelect = document.getElementById('categories');
  const logicOpSelect  = document.getElementById('logicOperator');
  const heightInput    = document.getElementById('height');
  const resultTA       = document.getElementById('result');
  const resultNoTA     = document.getElementById('resultNoParams');
  const copyBtn        = document.getElementById('copyButton');
  const infoBtn        = document.getElementById('infoBtn');
  const infoBox        = document.getElementById('infoBox');
  const closeInfoBtn   = document.getElementById('closeInfoBox');

  // ---- Info-Box-Logik ----
  infoBtn.addEventListener('click',    () => infoBox.style.display = 'block');
  closeInfoBtn.addEventListener('click', () => infoBox.style.display = 'none');
  window.addEventListener('click', e => {
    if (e.target === infoBox) infoBox.style.display = 'none';
  });

  // ---- Initiales Befüllen ----
  loadAreas();
  loadCity();
  loadCategories();
  typeSelect.addEventListener('change', loadCategories);

  // ---- Funktionen zum Laden der Selects ----
  async function loadAreas() {
    if (!areaSelect) return console.error('Kein <select id="areas"> gefunden!');
    try {
      const res = await fetch(areaApiUrl);
      const txt = await res.text();
      const xml = new DOMParser().parseFromString(txt, 'application/xml');
      const items = Array.from(xml.querySelectorAll('item > title'));
      areaSelect.innerHTML = '<option value="">Kein Gebiet wählen</option>';
      items.forEach(el => areaSelect.append(new Option(el.textContent, el.textContent)));
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
      const items = Array.from(xml.querySelectorAll('item > title'));
      citySelect.innerHTML = '<option value="">Keine Stadt wählen</option>';
      items.forEach(el => citySelect.append(new Option(el.textContent, el.textContent)));
    } catch (err) {
      console.error('Fehler beim Laden der Städte:', err);
    }
  }

  async function loadCategories() {
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
        categorySelect.append(new Option(name, name));
      });
    } catch (err) {
      console.error('Fehler beim Laden der Kategorien:', err);
    }
  }

  // ---- Formular abschicken ----
  document.getElementById('urlForm').addEventListener('submit', e => {
    e.preventDefault();

    // 1) Original-URL (default_withmap), inkl. Filter-Pfad
    const type   = encodeURIComponent(typeSelect.value);
    const height = encodeURIComponent(heightInput.value);
    const op     = logicOpSelect.value;
    const area   = areaSelect.value;
    const city   = citySelect.value;
    const cats   = Array.from(categorySelect.selectedOptions)
                      .map(o => `category:"${o.value}"`)
                      .join(` ${op} `);

    let url = `https://pages.destination.one/de/open-data-sachsen-tourismus/default_withmap/search/${type}`;
    if (area) url += `/area:"${encodeURIComponent(area)}"`;
    if (cats) url += `/${encodeURIComponent(cats)}`;
    if (city) url += `/city:"${encodeURIComponent(city)}"`;  // ← hier kein extra }
    if (document.getElementById('showMap').checked) {
      url += '/view:map,half';
    }
    url += `?i_target=et4pages&i_height=${height}`;

    // 2) Embed-Snippet (default/search) mit i_height
    const baseSrc = `https://pages.destination.one/de/open-data-sachsen-tourismus/default/search/${type}?i_target=et4pages`;
    const fullSrc = `${baseSrc}&i_height=${height}`;
    const embedSnippet = `<script id="et4pages" type="text/javascript" src="${fullSrc}"></script>`;

    // Ausgabe:
    // - resultTA: Embed-Snippet
    // - resultNoTA: originaler Link OHNE alle Parameter
    resultTA.value   = embedSnippet;
    resultNoTA.value = url.replace(/\?.*$/, '');

    copyBtn.classList.remove('hidden');
  });

  // ---- Copy-Button ----
  copyBtn.addEventListener('click', () => {
    resultTA.select();
    document.execCommand('copy');
    alert('Embed-Code in Zwischenablage kopiert!');
  });
});
