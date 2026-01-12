"use strict";

/**
 * Pages-Builder – robustes Laden von Areas/Cities aus ET4-XML
 * Fixes:
 *  - entfernt <texts>…</texts> (HTML darin ist oft nicht XML-well-formed)
 *  - ersetzt &nbsp; -> &#160;
 *  - repariert unescaped Ampersands (&) außerhalb von Entities (best-effort)
 *  - Cities: wenn XML-Parse trotzdem fehlschlägt -> tolerant per Regex extrahieren (lokal!)
 *  - Namespace-agnostisches Parsing (Default xmlns)
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
  // 2) DOM
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
    } catch {
      const res = await fetch(url, {
        headers: { Accept: "text/xml,application/xml;q=0.9,*/*;q=0.8" },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.text();
    }
  }

  /**
   * 1) Entfernt <texts>…</texts> (häufig HTML kaputt)
   * 2) &nbsp; -> &#160;
   * 3) Best-effort: unescaped "&" zu "&amp;" (aber Entities wie &amp; bleiben)
   */
  function sanitizeEt4Xml(txt) {
    const noTexts = String(txt)
      .replace(/<texts[\s\S]*?<\/texts>/gi, "")
      .replace(/&nbsp;/gi, "&#160;");

    // unescaped & fixen (alles, was nicht wie &word; oder &#123; aussieht)
    // Achtung: best-effort, kann sehr selten echte Fälle "überfixen", ist hier aber praktisch.
    return noTexts.replace(/&(?![a-zA-Z]+;|#\d+;|#x[0-9a-fA-F]+;)/g, "&amp;");
  }

  function parseXmlOrThrow(txt) {
    const xml = new DOMParser().parseFromString(txt, "application/xml");
    const pe = xml.querySelector("parsererror");
    if (pe) {
      // Browser liefern den konkreten Fehlertext im parsererror-Dokument
      const detail = (pe.textContent || "").trim();
      const msg = detail ? `XML parse error: ${detail}` : "XML parse error";
      throw new Error(msg);
    }
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

  // Namespace-agnostische XML helper
  function firstByLocalName(parent, localName) {
    if (!parent) return null;
    const nodes = parent.getElementsByTagNameNS("*", localName);
    return nodes && nodes.length ? nodes[0] : null;
  }
  function allByLocalName(parent, localName) {
    if (!parent) return [];
    return Array.from(parent.getElementsByTagNameNS("*", localName));
  }

  function extractAreasFromItemXml(itemEl) {
    const result = new Set();

    const containers = [];
    for (const tag of ["areas", "areas_old"]) containers.push(...allByLocalName(itemEl, tag));

    for (const c of containers) {
      const values = allByLocalName(c, "value");
      if (values.length) {
        values.forEach((v) => {
          const t = textContent(v);
          if (t) result.add(t);
        });
      } else {
        const raw = textContent(c);
        raw
          .split(/[;,|]/)
          .map((s) => s.trim())
          .forEach((t) => t && result.add(t));
      }
    }
    return Array.from(result);
  }

  function setCitiesStateFromObjs(cityObjs) {
    allCityItems = Array.isArray(cityObjs) ? cityObjs : [];
    const titleSet = new Set(allCityItems.map((o) => o.title).filter(Boolean));
    allCityTitles = Array.from(titleSet).sort((a, b) => a.localeCompare(b, "de"));
  }

  function parseCitiesFromXmlText(xmlText) {
    const xml = parseXmlOrThrow(xmlText);
    const items = Array.from(xml.getElementsByTagNameNS("*", "item"));
    const out = [];

    for (const it of items) {
      const titleEl = firstByLocalName(it, "title");
      const title = textContent(titleEl);
      if (!title) continue;
      const areas = extractAreasFromItemXml(it);
      out.push({ title, areas });
    }
    return out;
  }

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

  /**
   * Toleranter Fallback (lokal), wenn XML nicht parsebar bleibt:
   * Extrahiert pro <item> ... </item> den <title> und alle <areas>/<areas_old> Werte.
   * Funktioniert auch, wenn irgendwo in der Datei kaputtes Markup steckt.
   */
  function parseCitiesByRegexFallback(rawText) {
    const text = String(rawText);

    const cities = [];
    const itemRe = /<item\b[^>]*>([\s\S]*?)<\/item>/gi;

    let m;
    while ((m = itemRe.exec(text)) !== null) {
      const itemBody = m[1];

      const titleMatch = /<title\b[^>]*>([\s\S]*?)<\/title>/i.exec(itemBody);
      const title = titleMatch ? decodeXmlEntities(stripTags(titleMatch[1]).trim()) : "";
      if (!title) continue;

      const areas = new Set();

      // areas/value
      const areasContainerRe = /<areas\b[^>]*>([\s\S]*?)<\/areas>/gi;
      const areasOldContainerRe = /<areas_old\b[^>]*>([\s\S]*?)<\/areas_old>/gi;

      for (const re of [areasContainerRe, areasOldContainerRe]) {
        let cm;
        while ((cm = re.exec(itemBody)) !== null) {
          const cBody = cm[1];

          const valueRe = /<value\b[^>]*>([\s\S]*?)<\/value>/gi;
          let vm;
          let foundValue = false;

          while ((vm = valueRe.exec(cBody)) !== null) {
            foundValue = true;
            const v = decodeXmlEntities(stripTags(vm[1]).trim());
            if (v) areas.add(v);
          }

          if (!foundValue) {
            const raw = decodeXmlEntities(stripTags(cBody).trim());
            raw
              .split(/[;,|]/)
              .map((s) => s.trim())
              .forEach((t) => t && areas.add(t));
          }
        }
      }

      cities.push({ title, areas: Array.from(areas) });
    }

    return cities;
  }

  function stripTags(s) {
    return String(s).replace(/<[^>]*>/g, "");
  }

  function decodeXmlEntities(s) {
    // Minimal ausreichend für Titel/Areas
    return String(s)
      .replace(/&#160;/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'");
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
  // 7) Areas
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
  // 8) Cities (lokal bevorzugt; bei Parse-Problemen lokaler Regex-Fallback)
  // ===========================================================================

  async function loadCitiesAuto() {
    if (!citySelect) {
      console.error('Kein <select id="City"> gefunden!');
      return;
    }

    // 1) Local
    try {
      const xmlTextRaw = await fetchXmlText(cityLocalUrl);

      // Erst sanitizen & XML parse versuchen
      try {
        const xmlText = sanitizeEt4Xml(xmlTextRaw);
        const cityObjs = parseCitiesFromXmlText(xmlText);
        setCitiesStateFromObjs(cityObjs);
        return;
      } catch (xmlErr) {
        console.warn("Cities lokal: XML-Parse fehlgeschlagen, nutze lokalen Regex-Fallback:", xmlErr);
        const cityObjs = parseCitiesByRegexFallback(xmlTextRaw);
        if (cityObjs.length) {
          setCitiesStateFromObjs(cityObjs);
          return;
        }
        // Wenn auch der Fallback nichts findet, dann erst Proxy
        console.warn("Cities lokal: Regex-Fallback fand keine Einträge – nutze Proxy.");
      }
    } catch (eLocalFetch) {
      console.warn("Cities lokal nicht ladbar (fetch), nutze Proxy:", eLocalFetch);
    }

    // 2) Remote AUTO
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
  // 9) Index: Area -> Cities
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
  // 11) Kategorien
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
  // 12) URL Builder
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
  // 13) Copy
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
