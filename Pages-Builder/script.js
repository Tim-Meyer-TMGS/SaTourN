"use strict";

/**
 * Pages-Builder (SaTourN / destination.one)
 * Korrigiert für:
 *  - ET4-XML mit Default-Namespace (xmlns="http://meta.et4.de/ET2014A")
 *  - XML, das in <texts> HTML enthält (nicht XML-well-formed) → Sanitizing
 *  - &nbsp; in XML → &#160;
 *
 * Hinweis: Für Areas/Cities werden nur Title + Areas-Zuordnung benötigt.
 *          Deshalb wird <texts> entfernt, bevor geparst wird.
 */

document.addEventListener("DOMContentLoaded", () => {
  // ===========================================================================
  // 1) Konfiguration
  // ===========================================================================

  const xmlUrls = {
    POI: "https://api.et4.de/Schema/eTouristV4/Poi/Sachsen-Tourismus/POITree.xml",
    Tour: "https://api.et4.de/Schema/eTouristV4/Tour/Sachsen-Tourismus/TourTree.xml",
    Gastronomie: "https://api.et4.de/Schema/eTouristV4/Gastro/Sachsen-Tourismus/GastroTree.xml",
    Event:
      "https://api.et4.de/Schema/eTouristV4/Veranstaltung/Sachsen-Tourismus/VeranstaltungTree.xml",
    Hotel:
      "https://api.et4.de/Schema/eTouristV4/Vermieter/Sachsen-Tourismus/VermieterTree.xml",
  };

  const proxyBase = "https://satourn.onrender.com/api/search";
  const areaRemoteUrl = `${proxyBase}?type=Area`;
  const cityRemoteUrl = `${proxyBase}?type=City&limit=1000`;

  const areaLocalUrl = "./data/areas.xml";
  const cityLocalUrl = "./data/cities.xml";

  const d1Base = "https://pages.destination.one/de/open-data-sachsen-tourismus";

  // ===========================================================================
  // 2) DOM-Referenzen
  // ===========================================================================

  const typeSelect = document.getElementById("type");
  const areaSelect = document.getElementById("areas");
  const citySelect = document.getElementById("City");
  const categorySelect = document.getElementById("categories");

  const logicOpSelect = document.getElementById("logicOperator");
  const heightInput = document.getElementById("height");
  const showMapCb = document.getElementById("showMap");

  const formEl = document.getElementById("urlForm");
  const resultTA = document.getElementById("resultTA");
  const resultNoTA = document.getElementById("resultNoParams");
  const copyBtn = document.getElementById("copyButton");

  const infoBtn = document.getElementById("infoBtn");
  const infoBox = document.getElementById("infoBox");
  const closeInfoBtn = document.getElementById("closeInfoBox");

  // ===========================================================================
  // 3) State
  // ===========================================================================

  let allCityItems = []; // { title, areas: [] }
  let allCityTitles = [];
  const areaToCities = new Map(); // normalize(area) -> Set(cityTitle)

  // ===========================================================================
  // 4) Helpers
  // ===========================================================================

  function escapeForPath(s) {
    return String(s).replace(/"/g, '\\"');
  }

  async function fetchXmlText(url) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.text();
    } catch (e1) {
      const res = await fetch(url, {
        headers: { Accept: "text/xml,application/xml;q=0.9,*/*;q=0.8" },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.text();
    }
  }

  /**
   * Entfernt <texts>…</texts> (enthält häufig nicht-well-formed HTML)
   * und ersetzt &nbsp; durch &#160; (XML-kompatibel).
   */
  function sanitizeEt4Xml(txt) {
    return String(txt)
      .replace(/<texts[\s\S]*?<\/texts>/gi, "")
      .replace(/&nbsp;/gi, "&#160;");
  }

  function parseXmlOrThrow(txt) {
    const xml = new DOMParser().parseFromString(txt, "application/xml");
    if (xml.querySelector("parsererror")) throw new Error("XML parse error");
    return xml;
  }

  function normalizeKey(s) {
    return (s ?? "")
      .toString()
      .replace(/\u00a0/g, " ")
      .normalize("NFD")
      .replace(/\p{M}/gu, "")
      .replace(/ß/g, "ss")
      .toLowerCase()
      .trim()
      .replace(/\s+/g, " ");
  }

  function setSelectOptions(selectEl, titles, placeholder) {
    if (!selectEl) return;
    const frag = document.createDocumentFragment();
    frag.appendChild(new Option(placeholder, ""));
    for (const t of titles) frag.appendChild(new Option(t, t));
    selectEl.innerHTML = "";
    selectEl.appendChild(frag);
  }

  function buildCategoryExpression(selectedValues, op) {
    const parts = selectedValues.map((v) => `category:"${escapeForPath(v)}"`);
    return parts.join(` ${op} `);
  }

  function textContent(el) {
    return (el?.textContent || "").trim();
  }

  // -------- Namespace-agnostische XML Helper --------

  function firstByLocalName(parent, localName) {
    if (!parent) return null;
    const nodes = parent.getElementsByTagNameNS("*", localName);
    return nodes && nodes.length ? nodes[0] : null;
  }

  function allByLocalName(parent, localName) {
    if (!parent) return [];
    return Array.from(parent.getElementsByTagNameNS("*", localName));
  }

  /**
   * Extrahiert Area-Namen aus einem <item> (namespace-agnostisch).
   * Unterstützt:
   *  - <areas><value>...</value></areas>
   *  - <areas_old><value>...</value></areas_old>
   *  - fallback: Text in areas/areas_old splitten
   */
  function extractAreasFromItemXml(itemEl) {
    const result = new Set();

    // 1) areas / areas_old Container finden
    const areasContainers = [];
    for (const tag of ["areas", "areas_old"]) {
      areasContainers.push(...allByLocalName(itemEl, tag));
    }

    for (const container of areasContainers) {
      // 2) Werteliste <value>
      const values = allByLocalName(container, "value");
      if (values.length) {
        values.forEach((v) => {
          const t = textContent(v);
          if (t) result.add(t);
        });
      } else {
        // 3) Fallback: direkter Text
        const raw = textContent(container);
        raw
          .split(/[;,|]/)
          .map((s) => s.trim())
          .forEach((t) => {
            if (t) result.add(t);
          });
      }
    }

    return Array.from(result);
  }

  function setCitiesStateFromObjs(cityObjs) {
    allCityItems = Array.isArray(cityObjs) ? cityObjs : [];
    const titleSet = new Set(allCityItems.map((o) => o.title).filter(Boolean));
    allCityTitles = Array.from(titleSet).sort((a, b) => a.localeCompare(b, "de"));
  }

  /**
   * Parst Cities aus XML (namespace-agnostisch).
   */
  function parseCitiesFromXmlText(xmlText) {
    const xml = parseXmlOrThrow(xmlText);

    // ET4-XML hat häufig Default-Namespace → querySelectorAll("item") kann leer sein.
    // Daher: getElementsByTagNameNS("*", "item")
    const items = Array.from(xml.getElementsByTagNameNS("*", "item"));
    const cityObjs = [];

    for (const it of items) {
      const titleEl = firstByLocalName(it, "title");
      const title = textContent(titleEl);
      if (!title) continue;

      const areas = extractAreasFromItemXml(it);
      cityObjs.push({ title, areas });
    }

    return cityObjs;
  }

  /**
   * Parst Areas aus XML (namespace-agnostisch) und nutzt nur <item><title>.
   */
  function parseAreasTitlesFromXmlText(xmlText) {
    const xml = parseXmlOrThrow(xmlText);
    const items = Array.from(xml.getElementsByTagNameNS("*", "item"));

    const titles = [];
    for (const it of items) {
      const titleEl = firstByLocalName(it, "title");
      const t = textContent(titleEl);
      if (t) titles.push(t);
    }
    return titles.sort((a, b) => a.localeCompare(b, "de"));
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
  // 6) Init
  // ===========================================================================

  (async function init() {
    await Promise.all([loadAreas(), loadCategories(), loadCitiesAuto()]);
    buildAreaIndex();
    renderCitiesForArea();

    typeSelect?.addEventListener("change", loadCategories);
    areaSelect?.addEventListener("change", renderCitiesForArea);
    areaSelect?.addEventListener("input", renderCitiesForArea);
  })();

  // ===========================================================================
  // 7) Loader: Areas
  // ===========================================================================

  async function loadAreas() {
    if (!areaSelect) {
      console.error('Kein <select id="areas"> gefunden!');
      return;
    }

    const tryLoad = async (url) => {
      const txtRaw = await fetchXmlText(url);
      const txt = sanitizeEt4Xml(txtRaw);
      const titles = parseAreasTitlesFromXmlText(txt);
      setSelectOptions(areaSelect, titles, "Kein Gebiet wählen");
    };

    try {
      await tryLoad(areaLocalUrl);
      return;
    } catch (eLocal) {
      console.warn("Areas lokal nicht ladbar, nutze Proxy:", eLocal);
    }

    try {
      await tryLoad(areaRemoteUrl);
    } catch (eRemote) {
      console.error("Fehler beim Laden der Gebiete:", eRemote);
      setSelectOptions(areaSelect, [], "Kein Gebiet wählen");
    }
  }

  // ===========================================================================
  // 8) Loader: Cities (lokal → Proxy AUTO)
  // ===========================================================================

  async function loadCitiesAuto() {
    if (!citySelect) {
      console.error('Kein <select id="City"> gefunden!');
      return;
    }

    // 1) Local (XML erwartet, aber sanitizen)
    try {
      const xmlTextRaw = await fetchXmlText(cityLocalUrl);
      const xmlText = sanitizeEt4Xml(xmlTextRaw);
      const cityObjs = parseCitiesFromXmlText(xmlText);
      setCitiesStateFromObjs(cityObjs);
      return;
    } catch (eLocal) {
      console.warn("Cities lokal nicht ladbar, nutze Proxy:", eLocal);
    }

    // 2) Remote AUTO (JSON oder XML)
    try {
      const res = await fetch(cityRemoteUrl);
      const contentType = (res.headers.get("content-type") || "").toLowerCase();
      const raw = await res.text();

      const trimmed = raw.trim();
      const looksLikeXml = trimmed.startsWith("<") || trimmed.startsWith("<?xml");
      const looksLikeJson =
        contentType.includes("application/json") || (!looksLikeXml && trimmed.length > 0);

      let cityObjs = [];

      if (looksLikeJson) {
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

          const areasNew = Array.isArray(it?.areas)
            ? it.areas.map((a) => a?.value || "").filter(Boolean)
            : [];
          const areasOld = Array.isArray(it?.areas_old) ? it.areas_old.filter(Boolean) : [];

          cityObjs.push({ title, areas: [...areasNew, ...areasOld] });
        }
      } else {
        const xmlText = sanitizeEt4Xml(looksLikeXml ? raw : await fetchXmlText(cityRemoteUrl));
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

  function renderCitiesForArea() {
    if (!citySelect) return;

    const rawArea = areaSelect?.value ?? "";
    const areaKey = normalizeKey(rawArea);

    if (!areaKey) {
      setSelectOptions(citySelect, allCityTitles, "Keine Stadt wählen");
      return;
    }

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

    const segments = [];

    if (area) segments.push(encodeURIComponent(`area:"${escapeForPath(area)}"`));

    if (selectedCats.length) {
      const expr = buildCategoryExpression(selectedCats, op);
      segments.push(encodeURIComponent(expr));
    }

    if (city) segments.push(encodeURIComponent(`city:"${escapeForPath(city)}"`));

    const typePath = `search/${encodeURIComponent(type)}`;
    let cleanUrl = `${d1Base}/default_withmap/${typePath}`;
    if (segments.length) cleanUrl += `/${segments.join("/")}`;
    if (showMapCb?.checked) cleanUrl += "/view:map,half";

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
      if (resultTA) {
        resultTA.select();
        document.execCommand("copy");
      }
      alert("Embed-Code in die Zwischenablage kopiert!");
    }
  });
});
