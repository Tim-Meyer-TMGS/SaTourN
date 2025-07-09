document.addEventListener('DOMContentLoaded', () => {
  // ---- XML-Kategorien-URLs (direkt, ohne Proxy) ----
  const xmlUrls = {
    POI:          "https://api.et4.de/Schema/eTouristV4/Poi/Sachsen-Tourismus/POITree.xml",
    Tour:         "https://api.et4.de/Schema/eTouristV4/Tour/Sachsen-Tourismus/TourTree.xml",
    Gastronomie:  "https://api.et4.de/Schema/eTouristV4/Gastro/Sachsen-Tourismus/GastroTree.xml",
    Event:        "https://api.et4.de/Schema/eTouristV4/Veranstaltung/Sachsen-Tourismus/VeranstaltungTree.xml",
    Hotel:        "https://api.et4.de/Schema/eTouristV4/Vermieter/Sachsen-Tourismus/VermieterTree.xml"
  };

  // ---- Proxy-Endpointe für Areas und Cities ----
  const proxyBase   = 'https://satourn.onrender.com/api/search';
  const areaApiUrl  = `${proxyBase}?type=Area`;
  const cityApiUrl  = `${proxyBase}?type=City`;

  // ---- DOM-Referenzen ----
  const typeSelect     = document.getElementById('type');
  const areaSelect     = document.getElementById('areas');
  const citySelect     = document.getElementById('City');
  const categorySelect = document.getElementById('categories');
  const logicOperator  = document.getElementById('logicOperator');
  const heightInput    = document.getElementById('height');
  const resultArea     = document.getElementById('result');
  const resultNoParams = document.getElementById('resultNoParams');
  const copyButton     = document.getElementById('copyButton');

  const infoBtn    = document.getElementById('infoBtn');
  const infoBox    = document.getElementById('infoBox');
  const closeInfo  = document.getElementById('closeInfoBox');

  // ---- Info-Box toggling ----
  infoBtn.addEventListener('click',   () => infoBox.style.display = 'block');
  closeInfo.addEventListener('click', () => infoBox.style.display = 'none');
  window.addEventListener('click', e => {
    if (e.target === infoBox) infoBox.style.display = 'none';
  });

  // ---- Dropdowns initial befüllen ----
  loadAreas();
  loadCity();
  loadCategories();
  typeSelect.addEventListener('change', loadCategories);

  // ---- Funktionen ----

  async function loadAreas() {
    if (!areaSelect) return console.error('Kein <select id="areas"> gefunden');
    try {
      const res  = await fetch(areaApiUrl);
      const txt  = await res.text();
      const xml  = new DOMParser().parseFromString(txt, 'application/xml');
      const list = xml.querySelectorAll('item > title');
      areaSelect.innerHTML = '<option value="">Kein Gebiet wählen</option>';
      list.forEach(el => {
        areaSelect.append(new Option(el.textContent, el.textContent));
      });
    } catch (err) {
      console.error('Fehler beim Laden der Gebiete:', err);
    }
  }

  async function loadCity() {
    if (!citySelect) return console.error('Kein <select id="City"> gefunden');
    try {
      const res  = await fetch(cityApiUrl);
      const txt  = await res.text();
      const xml  = new DOMParser().parseFromString(txt, 'application/xml');
      const list = xml.querySelectorAll('item > title');
      citySelect.innerHTML = '<option value="">Keine Stadt wählen</option>';
      list.forEach(el => {
        citySelect.append(new Option(el.textContent, el.textContent));
      });
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
      xml.querySelectorAll('Category').forEach(cat => {
        const name = cat.getAttribute('Name');
        categorySelect.append(new Option(name, name));
      });
    } catch (err) {
      console.error('Fehler beim Laden der Kategorien:', err);
    }
  }

  // ---- Formular-Submit ----
  document.getElementById('urlForm').addEventListener('submit', e => {
    e.preventDefault();

    const type = typeSelect.value;
    const height = heightInput.value;
    const op = logicOperator.value;
    const area = areaSelect.value;
    const city = citySelect.value;
    const cats = Array.from(categorySelect.selectedOptions)
      .map(o => o.value)
      .filter(v => v)
      .map(v => `category:"${v}"`)
      .join(` ${op} `);
    const mapPart = document.getElementById('showMap').checked
      ? '/view:map,half'
      : '';

    let url = `https://pages.destination.one/de/open-data-sachsen-tourismus/default_withmap/search/${type}`;
    if (area) url += `/area:"${encodeURIComponent(area)}"`;
    if (cats) url += `/${encodeURIComponent(cats)}`;
    if (city) url += `/city:"${encodeURIComponent(city)}"`;
    url += mapPart + `?i_target=et4pages&i_height=${height}`;

    resultArea.value     = url;
    resultNoParams.value = url.split('?')[0];
    copyButton.classList.remove('hidden');
  });

  copyButton.addEventListener('click', () => {
    resultArea.select();
    document.execCommand('copy');
    alert('URL wurde in die Zwischenablage kopiert!');
  });
});
