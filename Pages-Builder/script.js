"use strict";

/**
 * SaTourN Embed-URL-Builder (destination.one)
 * - Areas (XML) & Cities (AUTO: JSON ODER XML) via Proxy
 * - City-Liste wird lokal nach gewähltem Gebiet gefiltert (Area → Cities)
 * - Kategorien (AND/OR), optionale Kartenansicht
 * - Embed-Snippet-Ausgabe
 *
 * Enthält robusten XML-Fetch-Helper (um 406/Negotiation-Probleme abzufangen).
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
  const cityApiUrl = `${proxyBase}?type=City&limit=1000`;
// AUTO: JSON oder XML (je nach Proxy)

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
  /** Vereinheitlichte City-Objekte: { title: string, areas: string[] } */
  let allCityItems = [];
  /** City-Titelliste (dedupliziert, sortiert) */
  let allCityTitles = [];
  /** Index: normalisierter Area-Name -> Set<String> (City-Titel) */
  const areaToCities = new Map();

  // ============================================================
  // Helpers
  // ============================================================
  const escapeForPath = (s) => String(s).replace(/"/g, '\\"');

  /** robuster XML-Fetch (zweiter Versuch mit breitem Accept, um 406 zu vermeiden) */
  async function fetchXmlText(url) {
    // 1. Versuch: ohne speziellen Accept-Header
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.text();
    } catch (e1) {
      // 2. Versuch: breiter Accept-Header
      try {
        const res = await fetch(url, {
          headers: {
            "Accept": "text/xml,application/xml;q=0.9,*/*;q=0.8"
          }
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.text();
      } catch (e2) {
        console.error("fetchXmlText failed for", url, e1, e2);
        throw e2;
      }
    }
  }

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

  // Extrahiere Textinhalt eines Elements (trim)
  function textContent(el) {
    return (el?.textContent || "").trim();
  }

  // Sammle alle Area-Namen aus einem <item>-Knoten (robust gg. verschiedene XML-Schemata)
  function extractAreasFromItemXml(itemEl) {
    const result = new Set();

    // 1) Häufig: <areas><value>Erzgebirge</value>...</areas> und <areas_old>
    itemEl.querySelectorAll("areas > value, areas_old > value").forEach(n => {
      const t = textContent(n);
      if (t) result.add(t);
    });

    // 2) Manche liefern <areas><item><value>…</value></item></areas> oder direkte Texte
    itemEl.querySelectorAll("areas, areas_old, area, gebiet, region").forEach(container => {
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
    await Promise.all([loadAreas(), loadCategories(), loadCitiesAuto()]);
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
      const txt = await fetchXmlText(areaApiUrl);
      const xml = new DOMParser().parseFromString(txt, "application/xml");
      if (xml.querySelector("parsererror")) throw new Error("XML parse error");

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
  // Loader: Cities (AUTO → JSON oder XML)
  // ============================================================
  async function loadCitiesAuto() {
    if (!citySelect) return console.error('Kein <select id="City"> gefunden!');
    try {
      const res = await fetch(cityApiUrl);
      const contentType = (res.headers.get("content-type") || "").toLowerCase();
      const raw = await res.text();

      // Hilfsparser
      const parseAsJson = (txt) => { try { return JSON.parse(txt); } catch { return null; } };
      const parseAsXml  = (txt) => new DOMParser().parseFromString(txt, "application/xml");

      let cityObjs = []; // { title, areas[] }

      const looksLikeJson = contentType.includes("application/json")
        || (!raw.trim().startsWith("<") && !raw.trim().startsWith("<?xml"));

      if (looksLikeJson) {
        // ------ JSON-Weg ------
        const data = parseAsJson(raw) || {};
        const items =
          (Array.isArray(data?.items) && data.items) ||
          (Array.isArray(data?.results) && data.results[0]?.items) ||
          [];
        for (const it of items) {
          const title = (it?.title || "").trim();
          if (!title) continue;
          const areasNew = Array.isArray(it?.areas) ? it.areas.map(a => a?.value || "").filter(Boolean) : [];
          const areasOld = Array.isArray(it?.areas_old) ? it.areas_old.filter(Boolean) : [];
          const areas = [...areasNew, ...areasOld];
          cityObjs.push({ title, areas });
        }
      } else {
        // ------ XML-Weg ------
        // nutze fetchXmlText erneut, um 406-Fälle/Negotiation sauber zu handeln
        const xmlText = await (async () => {
          // wenn die erste Antwort bereits XML ist, verwenden
          if (raw.trim().startsWith("<")) return raw;
          // sonst nochmal gezielt per Helper holen
          return await fetchXmlText(cityApiUrl);
        })();

        const xml = parseAsXml(xmlText);
        if (xml.querySelector("parsererror")) throw new Error("XML parse error");

        const items = Array.from(xml.querySelectorAll("item"));
        for (const it of items) {
          const title = (it.querySelector("title")?.textContent || "").trim();
          if (!title) continue;

          const areas = extractAreasFromItemXml(it);
          cityObjs.push({ title, areas });
        }
      }

      // State füllen
      allCityItems = cityObjs;

      // Titelliste deduplizieren + sortieren
      const titleSet = new Set(cityObjs.map(o => o.title).filter(Boolean));
      allCityTitles = Array.from(titleSet).sort((a, b) => a.localeCompare(b, "de"));
    } catch (err) {
      console.error("Fehler beim Laden der Städte (AUTO):", err);
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
      const txt = await fetchXmlText(url);
      const xml = new DOMParser().parseFromString(txt, "application/xml");
      if (xml.querySelector("parsererror")) throw new Error("XML parse error");

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
    const fullUrl = `${cleanUrl}?${qp.toString()}`; // optional zum Debuggen

    // Embed-Snippet (default/search) mit i_height
    const baseSrc   = `${d1Base}/default/search/${encodeURIComponent(type)}/hideSearchForm:1?i_target=et4pages`;
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


