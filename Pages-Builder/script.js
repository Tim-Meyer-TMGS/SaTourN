"use strict";

/**
 * Pages-Builder (SaTourN / destination.one)
 * -----------------------------------------------------------------------------
 * Zweck
 *  - Baut Embed-Snippets und "Clean URLs" für destination.one auf Basis von:
 *      - Content-Type (POI/Tour/Gastro/Event/Hotel) → Kategorien (Tree-XML)
 *      - Gebiet (Area) → aus Areas XML
 *      - Ort (City) → aus Cities XML (inkl. Verknüpfung City ↔ Area)
 *
 * Architektur-Entscheidung (Umbau Schritt 1.2)
 *  - Areas & Cities werden primär aus statischen XML-Dateien im Repo geladen:
 *      ./data/areas.xml
 *      ./data/cities.xml
 *  - Falls diese lokal nicht verfügbar sind (404, CORS, Hosting-Setup),
 *    erfolgt ein Fallback auf den Proxy:
 *      https://satourn.onrender.com/api/search?type=Area
 *      https://satourn.onrender.com/api/search?type=City&limit=1000
 *  - Cities remote kann JSON oder XML liefern (AUTO-Erkennung bleibt bestehen).
 *
 * Vorteile
 *  - Schnelleres Laden, weniger Abhängigkeit vom Proxy zur Laufzeit.
 *  - Offline-/Staging-Fähigkeit (Repo-Dateien können ausgerollt werden).
 *
 * Hinweis
 *  - Dieses Skript ist "framework-free" und läuft im Browser.
 *
 * Basierend auf: Pages-Builder/script.js :contentReference[oaicite:0]{index=0}
 */

document.addEventListener("DOMContentLoaded", () => {
  // ===========================================================================
  // 1) Konfiguration
  // ===========================================================================

  /**
   * Kategorienbäume (ET4) – werden direkt via fetch geladen.
   * Diese XMLs enthalten Kategorien/Tags zur Auswahl.
   */
  const xmlUrls = {
    POI: "https://api.et4.de/Schema/eTouristV4/Poi/Sachsen-Tourismus/POITree.xml",
    Tour: "https://api.et4.de/Schema/eTouristV4/Tour/Sachsen-Tourismus/TourTree.xml",
    Gastronomie: "https://api.et4.de/Schema/eTouristV4/Gastro/Sachsen-Tourismus/GastroTree.xml",
    Event:
      "https://api.et4.de/Schema/eTouristV4/Veranstaltung/Sachsen-Tourismus/VeranstaltungTree.xml",
    Hotel:
      "https://api.et4.de/Schema/eTouristV4/Vermieter/Sachsen-Tourismus/VermieterTree.xml",
  };

  /**
   * Proxy für meta.et4.de/rest.ashx/search (Bereitstellung für Area/City).
   * Remote wird nur verwendet, wenn lokale Repo-Dateien nicht verfügbar sind.
   */
  const proxyBase = "https://satourn.onrender.com/api/search";
  const areaRemoteUrl = `${proxyBase}?type=Area`; // erwartet XML
  const cityRemoteUrl = `${proxyBase}?type=City&limit=1000`; // AUTO: JSON oder XML

  /**
   * Lokale Repo-Dateien (statisches Hosting).
   * Wichtig: Pfade sind relativ zur HTML-Seite, die dieses Script einbindet.
   */
  const areaLocalUrl = "./data/areas.xml";
  const cityLocalUrl = "./data/cities.xml";

  /**
   * destination.one Basis.
   * Daraus wird sowohl die Clean URL als auch der Script-Tag abgeleitet.
   */
  const d1Base = "https://pages.destination.one/de/open-data-sachsen-tourismus";

  // ===========================================================================
  // 2) DOM-Referenzen
  // ===========================================================================

  // Content-Type, Area, City, Kategorien
  const typeSelect = document.getElementById("type");
  const areaSelect = document.getElementById("areas");
  const citySelect = document.getElementById("City"); // bestehende ID beibehalten
  const categorySelect = document.getElementById("categories");

  // Logik / Optionen
  const logicOpSelect = document.getElementById("logicOperator"); // AND | OR
  const heightInput = document.getElementById("height");
  const showMapCb = document.getElementById("showMap");

  // Formular / Ausgabe
  const formEl = document.getElementById("urlForm");
  const resultTA = document.getElementById("resultTA"); // Embed-Snippet
  const resultNoTA = document.getElementById("resultNoParams"); // Clean URL
  const copyBtn = document.getElementById("copyButton");

  // Info-Overlay
  const infoBtn = document.getElementById("infoBtn");
  const infoBox = document.getElementById("infoBox");
  const closeInfoBtn = document.getElementById("closeInfoBox");

  // ===========================================================================
  // 3) State (im Speicher)
  // ===========================================================================

  /**
   * Vereinheitlichte City-Objekte:
   *  - title: Anzeigename der Stadt
   *  - areas: Liste zugeordneter Gebiete (strings, ungefiltert)
   */
  let allCityItems = [];

  /**
   * Deduplizierte, sortierte Liste aller City-Titles.
   * Wird verwendet, wenn kein Gebietfilter aktiv ist.
   */
  let allCityTitles = [];

  /**
   * Index zur schnellen Filterung:
   *  normalize(areaName) -> Set(cityTitle)
   */
  const areaToCities = new Map();

  // ===========================================================================
  // 4) Allgemeine Helper
  // ===========================================================================

  /**
   * Schutz für D1-Query-Syntax in Pfadsegmenten (category:"...").
   * Die Segmente werden später zusätzlich per encodeURIComponent kodiert.
   */
  function escapeForPath(s) {
    return String(s).replace(/"/g, '\\"');
  }

  /**
   * Fetch-Helper für XML/Text:
   *  - 1. Versuch ohne Header (Standard)
   *  - 2. Versuch mit Accept-Headern (hilft gegen 406/Content Negotiation)
   */
  async function fetchXmlText(url) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.text();
    } catch (e1) {
      // Fallback: gezielte Accept-Header
      const res = await fetch(url, {
        headers: { Accept: "text/xml,application/xml;q=0.9,*/*;q=0.8" },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.text();
    }
  }

  /**
   * Minimaler Sanitizer für ET4-Area-XML:
   * - entfernt <texts>…</texts> komplett (dort steckt häufig HTML, das nicht XML-well-formed ist)
   * - ersetzt &nbsp; (kein XML-Standard-Entity) durch &#160;
   */
  function sanitizeEt4AreasXml(txt) {
    return String(txt)
      .replace(/<texts[\s\S]*?<\/texts>/gi, "")
      .replace(/&nbsp;/gi, "&#160;");
  }

  /**
   * XML Parser mit Fehlerprüfung.
   * Wir werfen bei parsererror, um Fehlerfälle zentral zu behandeln.
   */
  function parseXmlOrThrow(txt) {
    const xml = new DOMParser().parseFromString(txt, "application/xml");
    if (xml.querySelector("parsererror")) {
      throw new Error("XML parse error");
    }
    return xml;
  }

  /**
   * String-Normalisierung für robuste Zuordnung (Area-Name → Cities):
   *  - diakritische Zeichen entfernen
   *  - ß vereinheitlichen
   *  - whitespace normalisieren
   */
  function normalizeKey(s) {
    return (s ?? "")
      .toString()
      .replace(/\u00a0/g, " ") // NBSP → Space
      .normalize("NFD") // Diakritika trennen
      .replace(/\p{M}/gu, "") // Diakritika entfernen
      .replace(/ß/g, "ss")
      .toLowerCase()
      .trim()
      .replace(/\s+/g, " ");
  }

  /**
   * Setzt <select>-Optionen effizient (Fragment).
   * placeholder ist immer die erste, leere Option.
   */
  function setSelectOptions(selectEl, titles, placeholder) {
    if (!selectEl) return;
    const frag = document.createDocumentFragment();
    frag.appendChild(new Option(placeholder, ""));
    for (const t of titles) frag.appendChild(new Option(t, t));
    selectEl.innerHTML = "";
    selectEl.appendChild(frag);
  }

  /**
   * Baut category:"X" AND/OR category:"Y" Expression für destination.one.
   */
  function buildCategoryExpression(selectedValues, op) {
    const parts = selectedValues.map((v) => `category:"${escapeForPath(v)}"`);
    return parts.join(` ${op} `);
  }

  /**
   * Safe textContent (immer string, getrimmt).
   */
  function textContent(el) {
    return (el?.textContent || "").trim();
  }

  /**
   * Extrahiert Area-Namen aus einem Cities-XML <item>.
   * Unterschiedliche XML-Schemata werden defensiv unterstützt.
   */
  function extractAreasFromItemXml(itemEl) {
    const result = new Set();

    // Häufige Struktur: <areas><value>...</value></areas>
    itemEl.querySelectorAll("areas > value, areas_old > value").forEach((n) => {
      const t = textContent(n);
      if (t) result.add(t);
    });

    // Fallback: Container ohne <value> → evtl. direkte Texte mit Separatoren
    itemEl
      .querySelectorAll("areas, areas_old, area, gebiet, region")
      .forEach((container) => {
        if (!container.querySelector("value")) {
          const raw = textContent(container);
          raw
            .split(/[;,|]/)
            .map((s) => s.trim())
            .forEach((t) => {
              if (t) result.add(t);
            });
        }
      });

    return Array.from(result);
  }

  /**
   * Vereinheitlicht und setzt City-State (items + titles).
   */
  function setCitiesStateFromObjs(cityObjs) {
    allCityItems = Array.isArray(cityObjs) ? cityObjs : [];
    const titleSet = new Set(allCityItems.map((o) => o.title).filter(Boolean));
    allCityTitles = Array.from(titleSet).sort((a, b) => a.localeCompare(b, "de"));
  }

  /**
   * Parst Cities aus XML-Text in das vereinheitlichte City-Objektformat.
   */
  function parseCitiesFromXmlText(xmlText) {
    const xml = parseXmlOrThrow(xmlText);
    const cityObjs = [];
    const items = Array.from(xml.querySelectorAll("item"));

    for (const it of items) {
      const title = (it.querySelector("title")?.textContent || "").trim();
      if (!title) continue;
      const areas = extractAreasFromItemXml(it);
      cityObjs.push({ title, areas });
    }
    return cityObjs;
  }

  // ===========================================================================
  // 5) Info-Overlay
  // ===========================================================================

  infoBtn?.addEventListener("click", () => (infoBox.style.display = "block"));
  closeInfoBtn?.addEventListener("click", () => (infoBox.style.display = "none"));
  window.addEventListener("click", (e) => {
    if (e.target === infoBox) infoBox.style.display = "none";
  });

  // ===========================================================================
  // 6) Initialisierung
  // ===========================================================================

  (async function init() {
    // Parallel laden: Areas, Kategorien, Cities
    await Promise.all([loadAreas(), loadCategories(), loadCitiesAuto()]);

    // Nach dem Cities-Laden: Index für Area → Cities bauen
    buildAreaIndex();

    // Initiale City-Liste (ggf. gefiltert, falls Area vorselektiert ist)
    renderCitiesForArea();

    // Event bindings
    typeSelect?.addEventListener("change", loadCategories);
    areaSelect?.addEventListener("change", renderCitiesForArea);
    areaSelect?.addEventListener("input", renderCitiesForArea);
  })();

  // ===========================================================================
  // 7) Loader: Areas (lokal → Proxy-Fallback)
  // ===========================================================================

  async function loadAreas() {
    if (!areaSelect) {
      console.error('Kein <select id="areas"> gefunden!');
      return;
    }

    // Kapselt das Laden/Parsen, damit wir denselben Code für local/remote nutzen
    const tryLoad = async (url) => {
      const txtRaw = await fetchXmlText(url);
      const txt = sanitizeEt4AreasXml(txtRaw); // <-- Fix: HTML/Entities entschärfen
      const xml = parseXmlOrThrow(txt);

      const items = Array.from(xml.querySelectorAll("item > title"))
        .map((n) => (n.textContent || "").trim())
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b, "de"));

      setSelectOptions(areaSelect, items, "Kein Gebiet wählen");
    };

    // 1) Local first
    try {
      await tryLoad(areaLocalUrl);
      return;
    } catch (eLocal) {
      console.warn("Areas lokal nicht ladbar, nutze Proxy:", eLocal);
    }

    // 2) Remote fallback
    try {
      await tryLoad(areaRemoteUrl);
    } catch (eRemote) {
      console.error("Fehler beim Laden der Gebiete:", eRemote);
      setSelectOptions(areaSelect, [], "Kein Gebiet wählen");
    }
  }

  // ===========================================================================
  // 8) Loader: Cities (lokal XML → Proxy-Fallback AUTO)
  // ===========================================================================

  /**
   * Lädt Cities in dieser Reihenfolge:
   *  1) Repo-Datei (XML erwartet)
   *  2) Proxy (AUTO: JSON oder XML)
   *
   * Ergebnis wird in allCityItems/allCityTitles geschrieben.
   */
  async function loadCitiesAuto() {
    if (!citySelect) {
      console.error('Kein <select id="City"> gefunden!');
      return;
    }

    // 1) Local: XML-only
    try {
      const xmlText = await fetchXmlText(cityLocalUrl);
      const cityObjs = parseCitiesFromXmlText(xmlText);
      setCitiesStateFromObjs(cityObjs);
      return;
    } catch (eLocal) {
      console.warn("Cities lokal nicht ladbar, nutze Proxy:", eLocal);
    }

    // 2) Remote: AUTO JSON/XML
    try {
      const res = await fetch(cityRemoteUrl);
      const contentType = (res.headers.get("content-type") || "").toLowerCase();
      const raw = await res.text();

      // Heuristik: Wenn Response wie XML aussieht, behandeln wir sie als XML
      const looksLikeXml = raw.trim().startsWith("<") || raw.trim().startsWith("<?xml");
      const looksLikeJson =
        contentType.includes("application/json") || (!looksLikeXml && raw.trim().length > 0);

      let cityObjs = [];

      if (looksLikeJson) {
        // --------------------
        // JSON-Weg (defensiv)
        // --------------------
        let data = null;
        try {
          data = JSON.parse(raw);
        } catch {
          data = null;
        }

        const items =
          (Array.isArray(data?.items) && data.items) ||
          (Array.isArray(data?.results) && data.results[0]?.items) ||
          [];

        for (const it of items) {
          const title = (it?.title || "").trim();
          if (!title) continue;

          // areas kann als Array von { value } kommen, areas_old als strings
          const areasNew = Array.isArray(it?.areas)
            ? it.areas.map((a) => a?.value || "").filter(Boolean)
            : [];
          const areasOld = Array.isArray(it?.areas_old) ? it.areas_old.filter(Boolean) : [];

          cityObjs.push({ title, areas: [...areasNew, ...areasOld] });
        }
      } else {
        // --------------------
        // XML-Weg
        // --------------------
        // Falls raw schon XML ist, nutzen wir raw; sonst via fetchXmlText nachziehen
        const xmlText = looksLikeXml ? raw : await fetchXmlText(cityRemoteUrl);
        cityObjs = parseCitiesFromXmlText(xmlText);
      }

      setCitiesStateFromObjs(cityObjs);
    } catch (err) {
      console.error("Fehler beim Laden der Städte (AUTO):", err);
      allCityItems = [];
      allCityTitles = [];
    }
  }

  // ===========================================================================
  // 9) Index: Area → Cities
  // ===========================================================================

  /**
   * Baut den Index areaToCities neu aus allCityItems.
   * Wird nach (Re-)Laden der Cities aufgerufen.
   */
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

  // ===========================================================================
  // 10) UI: Cities nach Gebiet filtern
  // ===========================================================================

  /**
   * Rendert die City-Auswahl abhängig vom aktuellen Area-Select.
   * - Kein Gebiet ausgewählt → alle Städte
   * - Gebiet ausgewählt → nur Städte aus areaToCities Index
   */
  function renderCitiesForArea() {
    if (!citySelect) return;

    const rawArea = areaSelect?.value ?? "";
    const areaKey = normalizeKey(rawArea);

    // Kein Gebiet → unfiltered
    if (!areaKey) {
      setSelectOptions(citySelect, allCityTitles, "Keine Stadt wählen");
      return;
    }

    // Gebiet → gefiltert
    const set = areaToCities.get(areaKey);
    if (!set || set.size === 0) {
      setSelectOptions(citySelect, [], "Keine Stadt verfügbar");
      return;
    }

    const titles = Array.from(set).sort((a, b) => a.localeCompare(b, "de"));
    setSelectOptions(citySelect, titles, "Keine Stadt wählen");
  }

  // ===========================================================================
  // 11) Kategorien laden (Tree-XML)
  // ===========================================================================

  /**
   * Lädt Kategorien abhängig vom gewählten Type (POI/Tour/…).
   * Erwartet ET4 Tree-XML mit <Category Name="...">.
   */
  async function loadCategories() {
    if (!categorySelect) return;

    const sel = typeSelect?.value;
    setSelectOptions(categorySelect, [], "Keine Kategorie wählen");

    const url = xmlUrls[sel];
    if (!url) return;

    try {
      const txt = await fetchXmlText(url);
      const xml = parseXmlOrThrow(txt);

      const cats = Array.from(xml.querySelectorAll("Category"))
        .map((cat) => cat.getAttribute("Name"))
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b, "de"));

      // Kategorien-Select (typisch: <select multiple>)
      categorySelect.innerHTML = "";
      cats.forEach((name) => categorySelect.append(new Option(name, name)));
    } catch (err) {
      console.error("Fehler beim Laden der Kategorien:", err);
      setSelectOptions(categorySelect, [], "Keine Kategorie wählen");
    }
  }

  // ===========================================================================
  // 12) URL-Builder & Form Submit
  // ===========================================================================

  /**
   * Baut:
   *  - resultNoTA: Clean URL (mit Pfadsegmenten: area/category/city, optional view:map,half)
   *  - resultTA: Embed-Snippet (script src)
   */
  formEl?.addEventListener("submit", (e) => {
    e.preventDefault();

    const type = typeSelect?.value || "";
    const height = String(heightInput?.value || "").trim();
    const op = logicOpSelect?.value || "OR";
    const area = areaSelect?.value || "";
    const city = citySelect?.value || "";

    const selectedCats = Array.from(categorySelect?.selectedOptions || [])
      .map((o) => o.value)
      .filter(Boolean);

    // Pfadsegmente für destination.one: jedes Segment wird einzeln encoded
    const segments = [];

    if (area) segments.push(encodeURIComponent(`area:"${escapeForPath(area)}"`));

    if (selectedCats.length) {
      const expr = buildCategoryExpression(selectedCats, op);
      segments.push(encodeURIComponent(expr));
    }

    if (city) segments.push(encodeURIComponent(`city:"${escapeForPath(city)}"`));

    // Clean URL: base + template + search/<type> + optionale Segmente
    const typePath = `search/${encodeURIComponent(type)}`;
    let cleanUrl = `${d1Base}/default_withmap/${typePath}`;
    if (segments.length) cleanUrl += `/${segments.join("/")}`;
    if (showMapCb?.checked) cleanUrl += "/view:map,half";

    // Embed-Snippet (bestehende D1-Logik beibehalten)
    const baseSrc = `${d1Base}/default/search/${encodeURIComponent(
      type
    )}/hideSearchForm:1?i_target=et4pages`;
    const fullSrc = height ? `${baseSrc}&i_height=${encodeURIComponent(height)}` : baseSrc;
    const embedCode = `<script id="et4pages" type="text/javascript" src="${fullSrc}"></script>`;

    if (resultTA) resultTA.value = embedCode;
    if (resultNoTA) resultNoTA.value = cleanUrl;

    copyBtn?.classList.remove("hidden");
  });

  // ===========================================================================
  // 13) Copy-to-Clipboard
  // ===========================================================================

  copyBtn?.addEventListener("click", async () => {
    const text = resultTA?.value || "";
    try {
      await navigator.clipboard.writeText(text);
      alert("Embed-Code in die Zwischenablage kopiert!");
    } catch {
      // Fallback für ältere Browser
      if (resultTA) {
        resultTA.select();
        document.execCommand("copy");
      }
      alert("Embed-Code in die Zwischenablage kopiert!");
    }
  });
});
