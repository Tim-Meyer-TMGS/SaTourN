"use strict";

/**
 * Pages-Builder – stabile Version
 * Fixes:
 * 1) cities.xml wird lokal geladen, auch bei kaputtem XML (HTML-Parser-Fallback)
 * 2) Gebiet ↔ Stadt Matching ist tolerant (exakt + includes + normalisiert)
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

  const d1Base = "https://pages.destination.one/de/open-data-sachsen-tourismus";

  const xmlUrls = {
    POI: "https://api.et4.de/Schema/eTouristV4/Poi/Sachsen-Tourismus/POITree.xml",
    Tour: "https://api.et4.de/Schema/eTouristV4/Tour/Sachsen-Tourismus/TourTree.xml",
    Gastronomie:
      "https://api.et4.de/Schema/eTouristV4/Gastro/Sachsen-Tourismus/GastroTree.xml",
    Event:
      "https://api.et4.de/Schema/eTouristV4/Veranstaltung/Sachsen-Tourismus/VeranstaltungTree.xml",
    Hotel:
      "https://api.et4.de/Schema/eTouristV4/Vermieter/Sachsen-Tourismus/VermieterTree.xml",
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
          ...(i.areas || []).map((a) => a.value),
          ...(i.areas_old || []),
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
    if (!url) return;
    const txt = await fetchText(url);
    const xml = new DOMParser().parseFromString(txt, "application/xml");
    const cats = [...xml.querySelectorAll("Category")]
      .map((c) => c.getAttribute("Name"))
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b, "de"));
    setSelect(categorySelect, cats, "Keine Kategorie wählen");
  }

  // ===========================================================================
  // Init
  // ===========================================================================

  (async function init() {
    await Promise.all([loadAreas(), loadCitiesAuto()]);
    renderCitiesForArea();
    typeSelect.addEventListener("change", loadCategories);
    areaSelect.addEventListener("change", renderCitiesForArea);
  })();
});
