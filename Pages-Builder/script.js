"use strict";

/**
 * Pages-Builder – Jekyll Version
 * - Lädt Areas bevorzugt lokal (./data/areas.xml), fallback remote via Proxy
 * - Lädt Cities lokal + merged Remote (damit wirklich alle Städte verfügbar sind)
 * - Lädt Kategorien pro Typ aus ET4 Category-Tree
 * - Generiert Pages-URL + Script-Embed (<script ... src="..."></script>)
 * - Copy-to-Clipboard + Info-Modal + Toast
 */

document.addEventListener("DOMContentLoaded", () => {
  // ===========================================================================
  // Konfiguration
  // ===========================================================================

  const proxyBase = "https://satourn.onrender.com/api/search";
  const areaRemoteUrl = `${proxyBase}?type=Area`;

  const areaLocalUrl = "./data/areas.xml";
  const cityLocalUrl = "./data/cities.xml";

  // Basis-URL
  const d1Base = "https://pages.destination.one/de/open-data-sachsen-tourismus";

  const xmlUrls = {
    POI: "https://api.et4.de/Schema/eTouristV4/Poi/Sachsen-Tourismus/POITree.xml",
    Tour: "https://api.et4.de/Schema/eTouristV4/Tour/Sachsen-Tourismus/TourTree.xml",
    Gastronomie: "https://api.et4.de/Schema/eTouristV4/Gastro/Sachsen-Tourismus/GastroTree.xml",
    Event: "https://api.et4.de/Schema/eTouristV4/Veranstaltung/Sachsen-Tourismus/VeranstaltungTree.xml",
    Hotel: "https://api.et4.de/Schema/eTouristV4/Vermieter/Sachsen-Tourismus/VermieterTree.xml",
  };

  // ===========================================================================
  // DOM
  // ===========================================================================

  const typeSelect = document.getElementById("type");
  const areaSelect = document.getElementById("areas");
  const citySelect = document.getElementById("City");
  const categorySelect = document.getElementById("categories");
  const logicOpSelect = document.getElementById("logicOperator");
  const heightInput = document.getElementById("height");
  const showMapCb = document.getElementById("showMap");

  const formEl = document.getElementById("urlForm");
  const resultTA = document.getElementById("resultTA"); // SCRIPT Embed
  const resultNoTA = document.getElementById("resultNoParams"); // Pages URL
  const copyBtn = document.getElementById("copyButton");

  const infoBtn = document.getElementById("infoBtn");
  const infoBox = document.getElementById("infoBox");
  const closeInfoBox = document.getElementById("closeInfoBox");
  const closeInfoBox2 = document.getElementById("closeInfoBox2");
  const toast = document.getElementById("toast");

  // ===========================================================================
  // State
  // ===========================================================================

  let allCityItems = []; // { title, areas[] }
  let allCityTitles = [];
  const areaToCities = new Map(); // normalized area -> Set(city)

  // ===========================================================================
  // Helper
  // ===========================================================================

  async function fetchText(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.text();
  }

  function sanitizeXml(txt) {
    return String(txt)
      .replace(/<texts[\s\S]*?<\/texts>/gi, "")
      .replace(/&nbsp;/gi, " ")
      .replace(/&(?![a-zA-Z]+;|#\d+;|#x[a-fA-F0-9]+;)/g, "&amp;");
  }

  function normalizeKey(s) {
    return (s || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/\p{M}/gu, "")
      .replace(/ß/g, "ss")
      .replace(/\b(region|landkreis|kreis|sachsen)\b/g, "")
      .replace(/[^a-z0-9 ]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function setSelect(select, items, placeholder) {
    select.innerHTML = "";
    select.append(new Option(placeholder, ""));
    items.forEach((t) => select.append(new Option(t, t)));
  }

  function getMultiSelectValues(select) {
    return [...select.options]
      .filter((o) => o.selected)
      .map((o) => o.value)
      .filter(Boolean);
  }

  function toastShow(msg) {
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add("show");
    window.clearTimeout(toast._t);
    toast._t = window.setTimeout(() => toast.classList.remove("show"), 1800);
  }

  function openModal() {
    if (!infoBox) return;
    infoBox.classList.add("open");
    infoBox.setAttribute("aria-hidden", "false");
  }

  function closeModal() {
    if (!infoBox) return;
    infoBox.classList.remove("open");
    infoBox.setAttribute("aria-hidden", "true");
  }

  // ===========================================================================
  // XML Parsing (Areas & Cities) – sicher für echte XML
  // ===========================================================================

  function parseAreasFromXml(xmlText) {
    const parser = new DOMParser();
    const xml = parser.parseFromString(sanitizeXml(xmlText), "application/xml");
    const items = Array.from(xml.getElementsByTagName("item"));

    return items
      .map((it) => it.getElementsByTagName("title")[0]?.textContent?.trim())
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b, "de"));
  }

  function parseCitiesFromXml(xmlText) {
    const parser = new DOMParser();
    const xml = parser.parseFromString(sanitizeXml(xmlText), "application/xml");
    const items = Array.from(xml.getElementsByTagName("item"));
    const out = [];

    for (const it of items) {
      const title = it.getElementsByTagName("title")[0]?.textContent?.trim();
      if (!title) continue;

      const areas = new Set();

      // <areas><value>...</value></areas>
      Array.from(it.getElementsByTagName("areas")).forEach((aNode) => {
        Array.from(aNode.getElementsByTagName("value")).forEach((v) => {
          const t = v.textContent?.trim();
          if (t) areas.add(t);
        });
      });

      // <areas_old> kann Values oder Text enthalten
      Array.from(it.getElementsByTagName("areas_old")).forEach((aOld) => {
        const values = Array.from(aOld.getElementsByTagName("value"));
        if (values.length) {
          values.forEach((v) => {
            const t = v.textContent?.trim();
            if (t) areas.add(t);
          });
        } else {
          const t = aOld.textContent?.trim();
          if (t) areas.add(t);
        }
      });

      out.push({ title, areas: [...areas] });
    }

    return out;
  }

  // ===========================================================================
  // Areas
  // ===========================================================================

  async function loadAreas() {
    try {
      const xmlText = await fetchText(areaLocalUrl);
      setSelect(areaSelect, parseAreasFromXml(xmlText), "Kein Gebiet wählen");
    } catch {
      const xmlText = await fetchText(areaRemoteUrl);
      setSelect(areaSelect, parseAreasFromXml(xmlText), "Kein Gebiet wählen");
    }
  }

  // ===========================================================================
  // Cities – lokal + remote merged
  // ===========================================================================

  function setCities(cities) {
    allCityItems = cities;

    allCityTitles = [...new Set(cities.map((c) => c.title))]
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b, "de"));

    buildAreaIndex();
  }

  function buildAreaIndex() {
    areaToCities.clear();
    for (const c of allCityItems) {
      for (const a of c.areas || []) {
        const k = normalizeKey(a);
        if (!k) continue;
        if (!areaToCities.has(k)) areaToCities.set(k, new Set());
        areaToCities.get(k).add(c.title);
      }
    }
  }

  function renderCitiesForArea() {
    const areaKey = normalizeKey(areaSelect.value);
    if (!areaKey) {
      setSelect(citySelect, allCityTitles, "Keine Stadt wählen");
      return;
    }

    const result = new Set();

    for (const [k, set] of areaToCities.entries()) {
      if (k === areaKey || k.includes(areaKey) || areaKey.includes(k)) {
        set.forEach((c) => result.add(c));
      }
    }

    setSelect(
      citySelect,
      [...result].sort((a, b) => a.localeCompare(b, "de")),
      "Keine Stadt wählen"
    );
  }

  async function loadCitiesAuto() {
    const mergeCities = (base, extra) => {
      const map = new Map();

      const add = (arr) => {
        (arr || []).forEach((c) => {
          if (!c?.title) return;
          const key = c.title.trim();
          if (!map.has(key)) map.set(key, { title: key, areas: [] });
          const cur = map.get(key);
          const mergedAreas = new Set([...(cur.areas || []), ...(c.areas || [])]);
          cur.areas = [...mergedAreas];
        });
      };

      add(base);
      add(extra);
      return [...map.values()];
    };

    let localCities = [];
    let remoteCities = [];

    // 1) Lokal
    try {
      const rawLocal = await fetchText(cityLocalUrl);
      localCities = parseCitiesFromXml(rawLocal);
    } catch {
      localCities = [];
    }

    // 2) Remote ergänzen (immer, oder wenn lokal zu klein)
    const shouldFetchRemote = localCities.length < 300; // Schwelle: lokal wirkt unvollständig
    if (shouldFetchRemote) {
      try {
        const remoteUrl = `${proxyBase}?type=City&limit=5000`;
        const rawRemote = await fetchText(remoteUrl);
        remoteCities = parseCitiesFromXml(rawRemote);
      } catch (e) {
        console.warn("Remote Cities konnten nicht geladen werden:", e);
        remoteCities = [];
      }
    }

    const merged = mergeCities(localCities, remoteCities);
    if (!merged.length) {
      setSelect(citySelect, [], "Keine Stadt wählen");
      return;
    }

    setCities(merged);
  }

  // ===========================================================================
  // Kategorien
  // ===========================================================================

  async function loadCategories() {
    const url = xmlUrls[typeSelect.value];
    categorySelect.innerHTML = "";
    categorySelect.append(new Option("Keine Kategorie wählen", ""));

    if (!url) return;

    const txt = await fetchText(url);
    const xml = new DOMParser().parseFromString(txt, "application/xml");

    const cats = [...xml.querySelectorAll("Category")]
      .map((c) => c.getAttribute("Name"))
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b, "de"));

    cats.forEach((c) => categorySelect.append(new Option(c, c)));
  }

  // ===========================================================================
  // URL Builder
  // ===========================================================================

  function buildQueryParams() {
    const type = typeSelect.value;
    const cats = getMultiSelectValues(categorySelect);
    const op = logicOpSelect.value || "OR";
    const area = areaSelect.value || "";
    const city = citySelect.value || "";
    const height = String(Math.max(200, parseInt(heightInput.value || "400", 10) || 400));
    const showMap = !!showMapCb.checked;

    const params = new URLSearchParams();
    params.set("type", type);

    if (cats.length) {
      params.set("categories", cats.join("|"));
      params.set("catOp", op);
    }
    if (area) params.set("area", area);
    if (city) params.set("city", city);

    params.set("height", height);

    // optional: Map beeinflusst view im Script-Pfad
    if (showMap) params.set("view", "map,large");

    return params;
  }

  /**
   * Erzeugt:
   * - pagesUrl: direkte URL
   * - scriptEmbed: kompletter <script ... src="..."></script> Block
   *
   * Script-Src-Format:
   * https://pages.destination.one/de/open-data-sachsen-tourismus/default/search/Tour/view:map,large?i_target=et4pages&...
   */
  function buildUrls() {
    const params = buildQueryParams();

    // i_target muss immer gesetzt sein
    params.set("i_target", "et4pages");

    const type = params.get("type") || "Tour";

    // view kommt in den Path, nicht in die Query
    const view = params.get("view") || "map,large";
    params.delete("view");

    // Pages URL (für direktes Öffnen/Teilen)
    const pagesUrl = `${d1Base}/?${params.toString()}`;

    // Script src (Path + Query)
    const scriptSrc =
      `${d1Base}/default/search/${encodeURIComponent(type)}` +
      `/view:${encodeURIComponent(view)}?${params.toString()}`;

    const scriptEmbed = `<script
\tid="et4pages"
\ttype="text/javascript"
\tsrc="${scriptSrc}">
</script>`;

    return { pagesUrl, scriptEmbed };
  }

  // ===========================================================================
  // Events
  // ===========================================================================

  formEl.addEventListener("submit", (e) => {
    e.preventDefault();

    const { pagesUrl, scriptEmbed } = buildUrls();

    resultNoTA.value = pagesUrl;
    resultTA.value = scriptEmbed;

    copyBtn.classList.remove("hidden");
    toastShow("URLs generiert");
  });

  copyBtn.addEventListener("click", async () => {
    const txt =
      (resultNoTA.value || "").trim() +
      "\n\n" +
      (resultTA.value || "").trim();

    try {
      await navigator.clipboard.writeText(txt.trim());
      toastShow("Kopiert");
    } catch {
      const tmp = document.createElement("textarea");
      tmp.value = txt.trim();
      document.body.appendChild(tmp);
      tmp.select();
      document.execCommand("copy");
      tmp.remove();
      toastShow("Kopiert");
    }
  });

  infoBtn?.addEventListener("click", openModal);
  closeInfoBox?.addEventListener("click", closeModal);
  closeInfoBox2?.addEventListener("click", closeModal);

  infoBox?.addEventListener("click", (e) => {
    if (e.target && e.target.dataset && e.target.dataset.close) closeModal();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeModal();
  });

  // ===========================================================================
  // Init
  // ===========================================================================

  (async function init() {
    await Promise.all([loadAreas(), loadCitiesAuto()]);
    renderCitiesForArea();
    await loadCategories();

    typeSelect.addEventListener("change", loadCategories);
    areaSelect.addEventListener("change", renderCitiesForArea);
  })();
});
