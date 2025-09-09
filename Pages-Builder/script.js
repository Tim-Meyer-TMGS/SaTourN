"use strict";

/**
 * SaTourN Embed-URL-Builder (destination.one)
 * - Areas & Cities werden per XML geladen (Proxy liefert XML)
 * - City-Liste wird lokal nach gewähltem Gebiet gefiltert
 * - Kategorien (AND/OR), optionale Kartenansicht
 * - Embed-Snippet-Ausgabe
 */

document.addEventListener("DOMContentLoaded", () => {
  // ============================================================
  // Config
  // ============================================================
  const xmlUrls = {
    POI:  "https://api.et4.de/Schema/eTouristV4/Poi/Sachsen-Tourismus/POITree.xml",
    Tour: "https://api.et4.de/Schema/eTouristV4/Tour/Sachsen-Tourismus/TourTree.xml",
    Gastronomie: "https://api.et4.de/Schema/eTouristV4/Gastro/Sachsen-Tourismus/GastroTree.xml",
    Event: "https://api.et4.de/Schema/eTouristV4/Veranstaltung/Sachsen-Tourismus/VeranstaltungTree.xml",
    Hotel: "https://api.et4.de/Schema/eTouristV4/Vermieter/Sachsen-Tourismus/VermieterTree.xml",
  };

  // Proxy, der meta.et4.de/destination.one durchreicht
  const proxyBase  = "https://satourn.onrender.com/api/search";
  const areaApiUrl = `${proxyBase}?type=Area`; // XML
  const cityApiUrl = `${proxyBase}?type=City`; // <-- jetzt explizit XML (ohne template)

  // destination.one Basis
  const d1Base = "https://pages.destination.one/de/open-data-sachsen-tourismus";

  // ============================================================
  // DOM
  // ============================================================
  const typeSelect     = document.getElementById("type");
  const areaSelect     = document.getElementById("areas");
  const citySelect     = document.getElementById("City"); // id "City" beibehalten
  const categorySelect = document.getElementById("categories");
  const logicOpSelect  = document.getElementById("logicOperator"); // AND | OR
  const heightInput    = document.getElementById("height");
  const showMapCb      = document.getElementById("showMap");
  const formEl         = document.getElementById("urlForm");

  const resultTA       = document.getElementById("resultTA");
  const resultNoTA     = document.getElementById("resultNoParams");
  const copyBtn        = document.getElementById("copyButton");

  const infoBtn        = document.getElementById("infoBtn");
  const infoBox        = document.getElementById("infoBox");
  const closeInfoBtn   = document.getElementById("closeInfoBox");

  // ============================================================
  // State
  // ============================================================
  /** Vollständige City-Objekte (aus XML extrahiert) */
  let allCityItems = []; // { title: string, areas: string[] }
  /** City-Titelliste (dedupliziert, sortiert) */
  let allCityTitles = [];
  /** Index: normalisierter Area-Name -> Set<String> (City-Titel) */
  const areaToCities = new Map();

  // ============================================================
  // Helper
  // ============================================================
  const escapeForPath = (s) => String(s).replace(/"/g, '\\"');

  /** String-Normalisierung (für zuverlässige Vergleiche) */
  function normalizeKey(s) {
    return (s ?? "")
      .toString()
      .replace(/\u00A0/g, " ")               // NBSP → Space
      .normalize("NFD")                       // trenne Diakritika
      .replace(/\p{M}/gu, "")                 // entferne Diakritika
      .replace(/ß/g, "ss")                    // ß → ss
      .toLowerCase()
      .trim()
      .replace(/\s+/g, " ");                  // Mehrfachspaces -> 1
  }

  function setSelectOptions(selectEl, titles, placeholder) {
    if (!selectEl) return;
    const frag = document.createDocumentFragment();
    const first = new Option(placeholder, "");
    frag.appendChild(first);
    for (const t of titles) frag.appendChild(new Option(t, t));
    selectEl.innerHTML = "";
    selectEl.appendChild(frag);
  }

  function buildCategoryExpression(selectedValues, op) {
    const parts = selectedValues.map(v => `category:"${escapeForPath(v)}"`);
    return parts.join(` ${op} `);
  }

  // Extrahiere Textinhalt eines Elements (trim) – inkl. direkter Textknoten
  function textContent(el) {
    return (el?.textContent || "").trim();
  }

  // Sammle alle Area-Namen aus einem <item>-Knoten (robust gg. verschiedene XML-Schemata)
  function extractAreasFromItem(itemEl) {
    const result = new Set();

    // 1) Häufiger: <areas><value>Erzgebirge</value>...</areas>
    const valueNodes = itemEl.querySelectorAll("areas > value, areas_old > value");
    valueNodes.forEach(n => {
      const t = textContent(n);
      if (t) result.add(t);
    });

    // 2) Manche liefern <areas><item><value>…</value></item></areas> oder direkte Texte
    const areaContainers = itemEl.querySelectorAll("areas, areas_old, area, gebiet, region");
    areaContainers.forEach(container => {
      // direkte <value>-Kinder
      container.querySelectorAll("value").forEach(vn => {
        const t = textContent(vn);
        if (t) result.add(t);
      });
      // falls keine <value>-Kinder → gesamten Textinhalt (kann notfalls kommagetrennt sein)
      if (!container.querySelector("value")) {
        const raw = textContent(container);
        raw.split(/[;,|]/).map(s => s.trim()).forEach(t => { if (t) result.add(t); });
      }
    });

    return Array.from(result);
  }

  // ============================================================
  // Info-Box
  // ============================================================
  infoBtn?.addEventListener("click", () => (infoBox.style.display = "block"));
  closeInfoBtn?.addEventListener("click", () => (infoBox.style.display = "none"));
  window.addEventListener("click", (e) => {
    if (e.target === infoBox) infoBox.style.display = "none";
  });

  // ============================================================
  // Init
  // ============================================================
  (async function init() {
    await Promise.all([loadAreas(), loadCategories(), loadCitiesXml()]);
    buildAreaIndex();           // Index für Area→Cities
    renderCitiesForArea();      // initiale Cityliste (alle oder nach bereits gewähltem Gebiet)

    // Events
    typeSelect?.addEventListener("change", loadCategories);
    areaSelect?.addEventListener("change", renderCitiesForArea);
    areaSelect?.addEventListener("input", renderCitiesForArea);
  })();

  // ============================================================
  // Loader: Areas (XML)
  // ============================================================
  async function loadAreas() {
    if (!areaSelect) return console.error('Kein <select id="areas"> gefunden!');
    try {
      const res = await fetch(areaApiUrl, { headers: { "Accept": "application/xml" } });
      const txt = await res.text();
      const xml = new DOMParser().parseFromString(txt, "application/xml");
      const items = Array.from(xml.querySelectorAll("item > title"))
        .map(n => (n.textContent || "").trim())
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b, "de"));
      setSelectOptions(areaSelect, items, "Kein Gebiet wählen");
    } catch (err) {
      console.error("Fehler beim Laden der Gebiete:", err);
      setSelectOptions(areaSelect, [], "Kein Gebiet wählen");
    }
  }

  // ============================================================
  // Loader: Cities (XML)
  // ============================================================
  async function loadCitiesXml() {
    if (!citySelect) return console.error('Kein <select id="City"> gefunden!');
    try {
      const res = await fetch(cityApiUrl, { headers: { "Accept": "application/xml" } });
      const txt = await res.text();

      // Falls Server HTML/Fehlerseite liefert, DOMParser meckert nicht – prüfen wir Root
      const xml = new DOMParser().parseFromString(txt, "application/xml");
      if (xml.querySelector("parsererror")) {
        throw new Error("XML parse error");
      }

      const items = Array.from(xml.querySelectorAll("item"));
      const cityObjs = [];

      for (const it of items) {
        const title = textContent(it.querySelector("title"));
        if (!title) continue;

        const areas = extractAreasFromItem(it);
        cityObjs.push({ title, areas });
      }

      allCityItems = cityObjs;

      // Titelliste deduplizieren + sortieren
      const titleSet = new Set(cityObjs.map(o => o.title).filter(Boolean));
      allCityTitles = Array.from(titleSet).sort((a, b) => a.localeCompare(b, "de"));
    } catch (err) {
      console.error("Fehler beim Laden der Städte (XML):", err);
      allCityItems = [];
      allCityTitles = [];
    }
  }

  // ============================================================
  // Index aufbauen: Area (normalisiert) → Set(City-Titel)
  // ============================================================
  function buildAreaIndex() {
    areaToCities.clear();

    for (const it of allCityItems) {
      const title = (it.title || "").trim();
      if (!title) continue;

      const rawAreas = Array.isArray(it.areas) ? it.areas : [];
      for (const raw of rawAreas) {
        const key = normalizeKey(raw);
        if (!key) continue;
        if (!areaToCities.has(key)) areaToCities.set(key, new Set());
        areaToCities.get(key).add(title);
      }
    }
  }

  // ============================================================
  // Render Cities abhängig vom ausgewählten Gebiet
  // ============================================================
  function renderCitiesForArea() {
    if (!citySelect) return;
    const raw = areaSelect?.value ?? "";
    const areaKey = normalizeKey(raw);

    // Kein Gebiet gewählt → alle Städte
    if (!areaKey) {
      setSelectOptions(citySelect, allCityTitles, "Keine Stadt wählen");
      return;
    }

    // Gebiet vorhanden → nur Cities aus dem Index
    const set = areaToCities.get(areaKey);
    if (!set || set.size === 0) {
      // Nichts gefunden → leere Liste (explizit filtern, NICHT alle anzeigen)
      setSelectOptions(citySelect, [], "Keine Stadt verfügbar");
      return;
    }

    const titles = Array.from(set).sort((a, b) => a.localeCompare(b, "de"));
    setSelectOptions(citySelect, titles, "Keine Stadt wählen");
  }

  // ============================================================
  // Kategorien
  // ============================================================
  async function loadCategories() {
    if (!categorySelect) return;
    const sel = typeSelect?.value;
    setSelectOptions(categorySelect, [], "Keine Kategorie wählen");

    const url = xmlUrls[sel];
    if (!url) return;

    try {
      const res = await fetch(url, { headers: { "Accept": "application/xml" } });
      const txt = await res.text();
      const xml = new DOMParser().parseFromString(txt, "application/xml");
      const cats = Array.from(xml.querySelectorAll("Category"))
        .map(cat => cat.getAttribute("Name"))
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b, "de"));

      // Mehrfachauswahl (falls dein <select multiple> nutzt)
      categorySelect.innerHTML = "";
      cats.forEach(name => categorySelect.append(new Option(name, name)));
    } catch (err) {
      console.error("Fehler beim Laden der Kategorien:", err);
      setSelectOptions(categorySelect, [], "Keine Kategorie wählen");
    }
  }

  // ============================================================
  // URL-Builder & Submit
  // ============================================================
  formEl?.addEventListener("submit", (e) => {
    e.preventDefault();

    const type   = typeSelect?.value || "";    // POI | Tour | ...
    const height = String(heightInput?.value || "").trim();
    const op     = logicOpSelect?.value || "OR"; // AND | OR
    const area   = areaSelect?.value || "";
    const city   = citySelect?.value || "";

    const selectedCats = Array.from(categorySelect?.selectedOptions || [])
      .map(o => o.value)
      .filter(Boolean);

    const segments = [];

    if (area) {
      const seg = `area:"${escapeForPath(area)}"`;
      segments.push(encodeURIComponent(seg));
    }

    if (selectedCats.length) {
      const expr = buildCategoryExpression(selectedCats, op);
      segments.push(encodeURIComponent(expr));
    }

    if (city) {
      const seg = `city:"${escapeForPath(city)}"`;
      segments.push(encodeURIComponent(seg));
    }

    const typePath = `search/${encodeURIComponent(type)}`;
    let cleanUrl = `${d1Base}/default_withmap/${typePath}`;
    if (segments.length) cleanUrl += `/${segments.join("/")}`;
    if (showMapCb?.checked) cleanUrl += "/view:map,half";

    const qp = new URLSearchParams({ i_target: "et4pages" });
    if (height) qp.set("i_height", height);
    const fullUrl = `${cleanUrl}?${qp.toString()}`;

    // Embed-Snippet (default/search) mit i_height
    const baseSrc   = `${d1Base}/default/search/${encodeURIComponent(type)}?i_target=et4pages`;
    const fullSrc   = height ? `${baseSrc}&i_height=${encodeURIComponent(height)}` : baseSrc;
    const embedCode = `<script id="et4pages" type="text/javascript" src="${fullSrc}"></script>`;

    if (resultTA)   resultTA.value   = embedCode;
    if (resultNoTA) resultNoTA.value = cleanUrl;

    copyBtn?.classList.remove("hidden");
  });

  // ============================================================
  // Copy Button
  // ============================================================
  copyBtn?.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(resultTA?.value || "");
      alert("Embed-Code in die Zwischenablage kopiert!");
    } catch {
      if (resultTA) {
        resultTA.select();
        document.execCommand("copy");
      }
      alert("Embed-Code in die Zwischenablage kopiert!");
    }
  });
});
