document.addEventListener('DOMContentLoaded', () => {
  // ------------------------------
  //  statische XML-Category-Trees
  // ------------------------------
  const xmlUrls = {
    POI:          "https://api.et4.de/Schema/eTouristV4/Poi/Sachsen-Tourismus/POITree.xml",
    Tour:         "https://api.et4.de/Schema/eTouristV4/Tour/Sachsen-Tourismus/TourTree.xml",
    Gastronomie:  "https://api.et4.de/Schema/eTouristV4/Gastro/Sachsen-Tourismus/GastroTree.xml",
    Event:        "https://api.et4.de/Schema/eTouristV4/Veranstaltung/Sachsen-Tourismus/VeranstaltungTree.xml",
    Hotel:        "https://api.et4.de/Schema/eTouristV4/Vermieter/Sachsen-Tourismus/VermieterTree.xml"
  };

  // ------------------------------
  //  Proxy-Endpoints (ohne Lizenz)
  // ------------------------------
  const buildProxyUrl = (type, rawQuery = '') => {
    const base = 'https://satourn.onrender.com/api/search';
    const p    = new URLSearchParams();
    p.append('type', type);
    const q = rawQuery.startsWith('&q=') ? rawQuery.slice(3) : rawQuery;
    if (q) p.append('query', q);
    return `${base}?${p.toString()}`;
  };
  const areaApiUrl = () => buildProxyUrl('Area');
  const cityApiUrl = () => buildProxyUrl('City');

  // ------------------------------
  //  DOM-Elemente
  // ------------------------------
  const typeSelect             = document.getElementById('type');
  const areaSelect             = document.getElementById('areas');
  const citySelect             = document.getElementById('City');
  const categorySelect         = document.getElementById('categories');
  const logicOperatorSelect    = document.getElementById('logicOperator');
  const heightInput            = document.getElementById('height');
  const resultTextarea         = document.getElementById('result');
  const resultNoParamsTextarea = document.getElementById('resultNoParams');
  const copyButton             = document.getElementById('copyButton');
  const infoBtn                = document.getElementById('infoBtn');
  const infoBox                = document.getElementById('infoBox');
  const closeInfoBox           = document.getElementById('closeInfoBox');

  // ------------------------------
  //  Info-Box
  // ------------------------------
  infoBtn.addEventListener('click',   () => infoBox.style.display = 'block');
  closeInfoBox.addEventListener('click', () => infoBox.style.display = 'none');
  window.addEventListener('click', e => {
    if (e.target === infoBox) infoBox.style.display = 'none';
  });

  // ------------------------------
  //  Initialisierung
  // ------------------------------
  loadAreas();
  loadCity();
  loadCategories();
  typeSelect.addEventListener('change', loadCategories);

  // ------------------------------
  //  Gebiete per Proxy laden
  // ------------------------------
  async function loadAreas() {
    try {
      const res  = await fetch(areaApiUrl());
      const xml  = new DOMParser().parseFromString(await res.text(), 'application/xml');
      const opts = Array.from(xml.querySelectorAll('item title'))
                     .map(el => el.textContent);
      areaSelect.innerHTML = '<option value="">Kein Gebiet wählen</option>'+
        opts.map(n => `<option value="${n}">${n}</option>`).join('');
    } catch (err) {
      console.error('Gebiete laden fehlgeschlagen:', err);
    }
  }

  // ------------------------------
  //  Städte per Proxy laden
  // ------------------------------
  async function loadCity() {
    try {
      const res  = await fetch(cityApiUrl());
      const xml  = new DOMParser().parseFromString(await res.text(), 'application/xml');
      const opts = Array.from(xml.querySelectorAll('item > title'))
                     .map(el => el.textContent);
      citySelect.innerHTML = '<option value="">Keine Stadt wählen</option>'+
        opts.map(n => `<option value="${n}">${n}</option>`).join('');
    } catch (err) {
      console.error('Städte laden fehlgeschlagen:', err);
    }
  }

  // ------------------------------
  //  Kategorien aus statischem XML laden
  // ------------------------------
  async function loadCategories() {
    const t = typeSelect.value;
    categorySelect.innerHTML = '<option value="">Keine Kategorie wählen</option>';
    if (!xmlUrls[t]) return;

    try {
      const res  = await fetch(xmlUrls[t]);
      const xml  = new DOMParser().parseFromString(await res.text(), 'application/xml');
      const cats = Array.from(xml.querySelectorAll('Category'))
                     .map(el => el.getAttribute('Name'));
      categorySelect.innerHTML += cats
        .map(n => `<option value="${n}">${n}</option>`).join('');
    } catch (err) {
      console.error('Kategorien laden fehlgeschlagen:', err);
    }
  }

  // ------------------------------
  //  Formular absenden → URL bauen
  // ------------------------------
  document.getElementById('urlForm').addEventListener('submit', e => {
    e.preventDefault();
    const type  = typeSelect.value;
    const area  = areaSelect.value;
    const city  = citySelect.value;
    const height = heightInput.value;
    const op    = logicOperatorSelect.value;
    const cats  = Array.from(categorySelect.selectedOptions)
                   .map(o => o.value).filter(v => v)
                   .map(v => `category:"${v}"`)
                   .join(` ${op} `);
    const showMap = document.getElementById('showMap').checked;

    let url = `https://pages.destination.one/de/open-data-sachsen-tourismus/default_withmap/search/${type}`;
    if (area) url += `/area:"${encodeURIComponent(area)}"`;
    if (cats) url += `/${encodeURIComponent(cats)}`;
    if (city) url += `/city:"${encodeURIComponent(city)}"`;
    if (showMap) url += '/view:map,half';
    url += `?i_target=et4pages&i_height=${height}`;

    resultTextarea.value         = url;
    resultNoParamsTextarea.value = url.split('?')[0];
    copyButton.classList.remove('hidden');
  });

  // ------------------------------
  //  Copy-Button
  // ------------------------------
  copyButton.addEventListener('click', () => {
    resultTextarea.select();
    document.execCommand('copy');
    alert('URL in Zwischenablage kopiert!');
  });
});
