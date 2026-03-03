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
  const heightInput = document.getElementById("height"); // bleibt (UI), aber nicht mehr in URL verwendet
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

  // Robust: sammelt Gebietsinformationen auch dann, wenn Proxy/Export andere Feldnamen nutzt
  function parseCitiesFromXml(xmlText) {
    const parser = new DOMParser();
    const xml = parser.parseFromString(sanitizeXml(xmlText), "application/xml");
    const items = Array.from(xml.getElementsByTagName("item"));
    const out = [];

    const extractAreaLikeTexts = (item) => {
      const names = new Set();

      // Heuristik: alle Felder, deren Tagname "area"/"gebiet"/"region" enthält
      const nodes = item.getElementsByTagName("*");
      for (let i = 0; i < nodes.length; i++) {
        const ln = (nodes[i].localName || nodes[i].tagName || "").toLowerCase();
        if (ln.includes("area") || ln.includes("gebiet") || ln.includes("region")) {
          const t = nodes[i].textContent ? nodes[i].textContent.trim() : "";
          if (t) names.add(t);
        }
      }

      return [...names];
    };

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

      // Fallback-Heuristik (falls nicht in <areas>/<areas_old>)
      extractAreaLikeTexts(it).forEach((t) => areas.add(t));

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

  // Wenn Gebiet gewählt: Städte auf dieses Gebiet einschränken
  function renderCitiesForArea() {
    const areaRaw = (areaSelect.value || "").trim();
    const areaKey = normalizeKey(areaRaw);

    if (!areaKey) {
      setSelect(citySelect, allCityTitles, "Keine Stadt wählen");
      return;
    }

    const result = new Set();

    // 1) Exakt (case-insensitive) gegen die originalen Area-Texte aus den City-Items
    const rawLower = areaRaw.toLowerCase();
    for (const c of allCityItems) {
      for (const a of c.areas || []) {
        if (String(a).trim().toLowerCase() === rawLower) {
          result.add(c.title);
          break;
        }
      }
    }

    // 2) Fallback: Normalisierungs-/Fuzzy-Logik
    if (result.size === 0) {
      for (const [k, set] of areaToCities.entries()) {
        if (k === areaKey || k.includes(areaKey) || areaKey.includes(k)) {
          set.forEach((c) => result.add(c));
        }
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
  // URL Builder (NEUE LOGIK: Pfadbasierte Destination.One URLs)
  // ===========================================================================

  // area:%22VALUE%22 / city:%22VALUE%22 / category:%22VALUE%22
  function encodeQuotedValue(v) {
    return encodeURIComponent(`"${String(v)}"`); // => %22...%22
  }

  /**
   * Erzeugt:
   * - pagesUrl: direkte URL (default_withmap oder default)
   * - scriptEmbed: kompletter <script ... src="..."></script> Block
   *
   * Pages-URL Format:
   * https://pages.destination.one/de/open-data-sachsen-tourismus/<preset>/search/<Type>/[...segmente]
   *
   * Embed-Src:
   * - nutzt immer preset "default" (ohne Karte)
   * - hängt ?i_target=et4pages an
   */
  function buildUrls() {
    const type = typeSelect.value || "Tour";
    const cats = getMultiSelectValues(categorySelect);
    const op = logicOpSelect.value || "OR";
    const area = areaSelect.value || "";
    const city = citySelect.value || "";
    const showMap = !!showMapCb.checked;

    // Base muss immer: .../<preset>/search/
    const preset = showMap ? "default_withmap" : "default";
    const base = `${d1Base}/${preset}/search/`;

    const segments = [];
    segments.push(encodeURIComponent(type));

    // Kategorien:
    // - AND: jede Kategorie als eigenes Segment: /category:%22A%22/category:%22B%22
    // - OR: ein Segment: /category:%22A%22%20OR%20category:%22B%22
    if (cats.length) {
      if (op === "AND") {
        cats.forEach((c) => segments.push(`category:${encodeQuotedValue(c)}`));
      } else {
        let orExpr = `category:${encodeQuotedValue(cats[0])}`;
        for (let i = 1; i < cats.length; i++) {
          orExpr += `%20OR%20category:${encodeQuotedValue(cats[i])}`;
        }
        segments.push(orExpr);
      }
    }

    // Gebiet / Stadt als eigene Segmente
    if (area) segments.push(`area:${encodeQuotedValue(area)}`);
    if (city) segments.push(`city:${encodeQuotedValue(city)}`);

    // Nur Typ => trailing slash (…/Tour/)
    const pagesUrl = base + (segments.length === 1 ? `${segments[0]}/` : segments.join("/"));

    // Embed: immer "default" + i_target
    let embedUrl = pagesUrl.replace("/default_withmap/", "/default/");
    embedUrl += (embedUrl.includes("?") ? "&" : "?") + "i_target=et4pages";

    const scriptEmbed = `<script 
\tid="et4pages" 
\ttype="text/javascript" 
\tsrc="${embedUrl}">
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

    // Wenn Gebiet wechselt: Stadt-Filter aktualisieren (und ggf. Stadt-Auswahl leeren)
    areaSelect.addEventListener("change", () => {
      if (citySelect) citySelect.value = "";
      renderCitiesForArea();
    });
  })();
});
