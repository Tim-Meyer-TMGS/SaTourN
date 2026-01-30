"use strict";

/**
 * Pages-Builder – Jekyll Version
 * - Lädt Areas & Cities bevorzugt lokal (./data/*.xml), fallback remote via Proxy
 * - Lädt Kategorien pro Typ aus ET4 Category-Tree
 * - Generiert Pages-URL + Script-Source-URL
 * - Copy-to-Clipboard + Info-Modal + Toast
 */

document.addEventListener("DOMContentLoaded", () => {
  // ===========================================================================
  // Konfiguration
  // ===========================================================================

  const proxyBase = "https://satourn.onrender.com/api/search";
  const areaRemoteUrl = `${proxyBase}?type=Area`;
  const cityRemoteUrl = `${proxyBase}?type=City&limit=1000`;

  const areaLocalUrl = "./data/areas.xml";
  const cityLocalUrl = "./data/cities.xml";

  // Basis-URL (wie in deiner bestehenden Datei)
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
  const resultTA = document.getElementById("resultTA");
  const resultNoTA = document.getElementById("resultNoParams");
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
  // Areas
  // ===========================================================================

  async function loadAreas() {
    const load = async (url) => {
      const raw = sanitizeXml(await fetchText(url));
      const doc = new DOMParser().parseFromString(raw, "text/html");
      return [...doc.querySelectorAll("item title")]
        .map((n) => n.textContent.trim())
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b, "de"));
    };

    try {
      setSelect(areaSelect, await load(areaLocalUrl), "Kein Gebiet wählen");
    } catch {
      setSelect(areaSelect, await load(areaRemoteUrl), "Kein Gebiet wählen");
    }
  }

  // ===========================================================================
  // Cities (lokal + lenient)
  // ===========================================================================

  function parseCitiesLenient(text) {
    const doc = new DOMParser().parseFromString(text, "text/html");
    const items = [...doc.querySelectorAll("item")];
    const out = [];

    for (const it of items) {
      const title = it.querySelector("title")?.textContent.trim();
      if (!title) continue;

      const areas = new Set();
      it.querySelectorAll("areas value, areas_old value").forEach((v) => {
        const t = v.textContent.trim();
        if (t) areas.add(t);
      });

      out.push({ title, areas: [...areas] });
    }
    return out;
  }

  async function loadCitiesAuto() {
    try {
      const raw = sanitizeXml(await fetchText(cityLocalUrl));
      const cities = parseCitiesLenient(raw);
      if (cities.length) {
        setCities(cities);
        return;
      }
    } catch {}

    // Proxy nur wenn lokal unmöglich
    const res = await fetch(cityRemoteUrl);
    const data = await res.json();
    const items = data?.results?.[0]?.items || [];
    setCities(
      items.map((i) => ({
        title: i.title,
        areas: [
          ...((i.areas || []).map((a) => a.value)),
          ...((i.areas_old || [])),
        ],
      }))
    );
  }

  function setCities(cities) {
    allCityItems = cities;
    allCityTitles = [...new Set(cities.map((c) => c.title))].sort((a, b) =>
      a.localeCompare(b, "de")
    );
    buildAreaIndex();
  }

  function buildAreaIndex() {
    areaToCities.clear();
    for (const c of allCityItems) {
      for (const a of c.areas) {
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

  // ===========================================================================
  // Kategorien
  // ===========================================================================

  async function loadCategories() {
    const url = xmlUrls[typeSelect.value];
    if (!url) {
      setSelect(categorySelect, [], "Keine Kategorie wählen");
      return;
    }

    const txt = await fetchText(url);
    const xml = new DOMParser().parseFromString(txt, "application/xml");

    const cats = [...xml.querySelectorAll("Category")]
      .map((c) => c.getAttribute("Name"))
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b, "de"));

    // Multi-select: placeholder als erste Option, aber echte Auswahl via selected options
    categorySelect.innerHTML = "";
    categorySelect.append(new Option("Keine Kategorie wählen", ""));
    cats.forEach((c) => categorySelect.append(new Option(c, c)));
  }

  // ===========================================================================
  // URL Builder (robust & lesbar)
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
      // Wir geben Kategorien + Operator separat weiter (transparent für nachgelagerte Auswertung)
      params.set("categories", cats.join("|"));
      params.set("catOp", op);
    }
    if (area) params.set("area", area);
    if (city) params.set("city", city);
    params.set("height", height);
    if (showMap) params.set("showMap", "1");

    return params;
  }

  function buildUrls() {
    const params = buildQueryParams();

    // 1) Pages URL (fürs direkte Öffnen / Teilen)
    const pagesUrl = `${d1Base}/?${params.toString()}`;

    // 2) Script-Source URL (als <script src="..."></script>)
    // Hinweis: Pfad kann bei euch abweichen; wir halten es konsistent, indem wir
    // die gleichen Parameter weiterreichen.
    const scriptUrl = `${d1Base}/snippet.js?${params.toString()}`;

    return { pagesUrl, scriptUrl };
  }

  // ===========================================================================
  // Events
  // ===========================================================================

  formEl.addEventListener("submit", (e) => {
    e.preventDefault();
    const { pagesUrl, scriptUrl } = buildUrls();

    resultNoTA.value = pagesUrl;
    resultTA.value = scriptUrl;

    copyBtn.classList.remove("hidden");
    toastShow("URLs generiert");
  });

  copyBtn.addEventListener("click", async () => {
    const txt = (resultNoTA.value || "").trim() + "\n\n" + (resultTA.value || "").trim();
    try {
      await navigator.clipboard.writeText(txt.trim());
      toastShow("Kopiert");
    } catch {
      // Fallback
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
