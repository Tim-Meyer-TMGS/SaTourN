document.addEventListener('DOMContentLoaded', function () {
  // ===== Meta-API Basis (ohne Proxy) =====
  var ET4_BASE    = 'https://meta.et4.de/rest.ashx/search/';
  var EXPERIENCE  = 'sachsen-tourismus';
  var TEMPLATE    = 'ET2014A.xml';
  var LICENSE_KEY = 'ENTER_YOUR_LICENSEKEY'; // <— HIER deinen Key eintragen

  // ===== Kategorie-XMLs (direkt) =====
  var xmlUrls = {
    POI:         'https://api.et4.de/Schema/eTouristV4/Poi/Sachsen-Tourismus/POITree.xml',
    Tour:        'https://api.et4.de/Schema/eTouristV4/Tour/Sachsen-Tourismus/TourTree.xml',
    Gastronomie: 'https://api.et4.de/Schema/eTouristV4/Gastro/Sachsen-Tourismus/GastroTree.xml',
    Event:       'https://api.et4.de/Schema/eTouristV4/Veranstaltung/Sachsen-Tourismus/VeranstaltungTree.xml',
    Hotel:       'https://api.et4.de/Schema/eTouristV4/Vermieter/Sachsen-Tourismus/VermieterTree.xml'
  };

  // ===== DOM =====
  var typeSelect     = document.getElementById('type');
  var areaSelect     = document.getElementById('areas');
  var citySelect     = document.getElementById('City'); // Achtung: großes C
  var categorySelect = document.getElementById('categories');
  var logicOpSelect  = document.getElementById('logicOperator');
  var heightInput    = document.getElementById('height');
  var resultTA       = document.getElementById('resultTA');
  var resultNoTA     = document.getElementById('resultNoParams');
  var copyBtn        = document.getElementById('copyButton');
  var infoBtn        = document.getElementById('infoBtn');
  var infoBox        = document.getElementById('infoBox');
  var closeInfoBtn   = document.getElementById('closeInfoBox');
  var showMapChk     = document.getElementById('showMap');
  var urlForm        = document.getElementById('urlForm');

  // ===== Helpers =====
  function ensureEl(el, label) {
    if (!el) { console.error('Fehlendes Element:', label); }
    return !!el;
  }
  function et4Url(params) {
    var sp = new URLSearchParams({
      experience: EXPERIENCE,
      licensekey: LICENSE_KEY,
      template: TEMPLATE
    });
    Object.keys(params).forEach(function (k) {
      if (params[k] !== undefined && params[k] !== null) sp.set(k, params[k]);
    });
    return ET4_BASE + '?' + sp.toString();
  }

  // ===== Info-Box =====
  if (infoBtn && infoBox && closeInfoBtn) {
    infoBtn.addEventListener('click', function () { infoBox.style.display = 'block'; });
    closeInfoBtn.addEventListener('click', function () { infoBox.style.display = 'none'; });
    window.addEventListener('click', function (e) {
      if (e.target === infoBox) infoBox.style.display = 'none';
    });
  }

  // ===== Initial laden =====
  loadAreas();
  loadCategories();

  if (areaSelect) {
    areaSelect.addEventListener('change', function () {
      if (citySelect) {
        citySelect.innerHTML = '<option value="">Keine Stadt wählen</option>';
        citySelect.disabled = !areaSelect.value;
      }
      loadCity(areaSelect.value);
    });
  }
  if (typeSelect) typeSelect.addEventListener('change', loadCategories);

  // ===== Areas laden =====
  async function loadAreas() {
    if (!ensureEl(areaSelect, '#areas')) return;
    try {
      var url = et4Url({ type: 'Area', limit: '1000' });
      var res = await fetch(url, { headers: { 'Accept': 'application/xml' }, mode: 'cors' });
      var txt = await res.text();
      var xml = new DOMParser().parseFromString(txt, 'application/xml');
      var items = Array.prototype.slice.call(xml.querySelectorAll('item > title'));
      areaSelect.innerHTML = '<option value="">Kein Gebiet wählen</option>';
      items.forEach(function (el) {
        var t = (el.textContent || '').trim();
        if (t) areaSelect.append(new Option(t, t));
      });
      if (citySelect) citySelect.disabled = true;
    } catch (err) {
      console.error('Fehler beim Laden der Gebiete:', err);
    }
  }

  // ===== Cities laden (abhängig vom Gebiet) =====
  async function loadCity(area) {
    if (!ensureEl(citySelect, '#City')) return;
    citySelect.innerHTML = '<option value="">Keine Stadt wählen</option>';
    var chosen = (area || '').trim();
    if (!chosen) { citySelect.disabled = true; return; }

    try {
      var q = 'area:"' + chosen + '"';
      var url = et4Url({ type: 'City', q: q, limit: '1000' });
      var res = await fetch(url, { headers: { 'Accept': 'application/xml' }, mode: 'cors' });
      var txt = await res.text();
      var xml = new DOMParser().parseFromString(txt, 'application/xml');
      var items = Array.prototype.slice.call(xml.querySelectorAll('item > title'));
      items.forEach(function (el) {
        var t = (el.textContent || '').trim();
        if (t) citySelect.append(new Option(t, t));
      });
      citySelect.disabled = items.length === 0;
    } catch (err) {
      console.error('Fehler beim Laden der Städte:', err);
    }
  }

  // ===== Kategorien laden (aus XML) =====
  async function loadCategories() {
    if (!ensureEl(typeSelect, '#type') || !ensureEl(categorySelect, '#categories')) return;
    var sel = typeSelect.value;
    categorySelect.innerHTML = '<option value="">Keine Kategorie wählen</option>';
    var url = xmlUrls[sel];
    if (!url) return;
    try {
      var res = await fetch(url);
      var txt = await res.text();
      var xml = new DOMParser().parseFromString(txt, 'application/xml');
      Array.prototype.slice.call(xml.querySelectorAll('Category')).forEach(function (cat) {
        var name = cat.getAttribute('Name');
        if (name) categorySelect.append(new Option(name, name));
      });
    } catch (err) {
      console.error('Fehler beim Laden der Kategorien:', err);
    }
  }

  // ===== Filter-Pfad bauen =====
  function buildCategorySegment() {
    var op = logicOpSelect ? (logicOpSelect.value || 'AND') : 'AND';
    var selected = Array.prototype.slice.call((categorySelect && categorySelect.selectedOptions) || []);
    var vals = selected.map(function (o) { return 'category:"' + o.value + '"'; });
    return vals.length ? vals.join(' ' + op + ' ') : '';
  }
  function buildFilterPath(opts) {
    var segs = [];
    if (opts.area) segs.push('area:"' + opts.area + '"');
    if (opts.catsSegment) segs.push(opts.catsSegment);
    if (opts.city) segs.push('city:"' + opts.city + '"');
    if (!segs.length) return '';
    return '/' + segs.map(encodeURIComponent).join('/');
  }

  // ===== Formular submit =====
  if (urlForm) {
    urlForm.addEventListener('submit', function (e) {
      e.preventDefault();

      var type   = encodeURIComponent((typeSelect && typeSelect.value) || 'POI');
      var height = ((heightInput && heightInput.value) || '1200').trim();
      var area   = (areaSelect && areaSelect.value) || '';
      var city   = (citySelect && citySelect.value) || '';
      var catsSegment = buildCategorySegment();
      var filterPath  = buildFilterPath({ area: area, catsSegment: catsSegment, city: city });

      // 1) Direkter Link (default_withmap), inkl. optionaler Map-Ansicht
      var directUrl = 'https://pages.destination.one/de/open-data-sachsen-tourismus/default_withmap/search/' + type + filterPath;
      if (showMapChk && showMapChk.checked) directUrl += '/view:map,half';
      var directUrlWithQuery = directUrl + '?i_target=et4pages&i_height=' + encodeURIComponent(height);

      // 2) Embed-Snippet (default/search) inkl. gleichem Filter-Pfad
      var embedSrc = 'https://pages.destination.one/de/open-data-sachsen-tourismus/default/search/' + type + filterPath + '?i_target=et4pages&i_height=' + encodeURIComponent(height);
      var embedSnippet = '<script id="et4pages" type="text/javascript" src="' + embedSrc + '"></script>';

      if (resultTA)   resultTA.value   = embedSnippet;
      if (resultNoTA) resultNoTA.value = directUrl;

      if (copyBtn) copyBtn.classList.remove('hidden');
    });
  }

  // ===== Copy-Button =====
  if (copyBtn && resultTA) {
    copyBtn.addEventListener('click', function () {
      resultTA.select();
      document.execCommand('copy');
      alert('Embed-Code in Zwischenablage kopiert!');
    });
  }
});
