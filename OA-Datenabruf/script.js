(() => {
  const API_BASE = "https://api-oa.com/api/v2/project/"; // Data API v2 base url (docs)

  const el = (id) => document.getElementById(id);

  const ui = {
    statusPill: el("statusPill"),
    statusText: el("statusText"),

    projectKey: el("projectKey"),
    apiKey: el("apiKey"),
    rememberKey: el("rememberKey"),
    lang: el("lang"),
    display: el("display"),
    parallel: el("parallel"),
    ids: el("ids"),

    runBtn: el("runBtn"),
    sampleBtn: el("sampleBtn"),
    resetBtn: el("resetBtn"),
    downloadBtn: el("downloadBtn"),

    countLabel: el("countLabel"),
    resultBody: el("resultBody"),

    viewerLabel: el("viewerLabel"),
    requestUrl: el("requestUrl"),
    viewer: el("viewer"),
    copyBtn: el("copyBtn"),
    openBtn: el("openBtn"),

    indexType: el("indexType"),
    indexCountInput: el("indexCountInput"),
    indexStart: el("indexStart"),
    loadIndexBtn: el("loadIndexBtn"),
    useSelectedBtn: el("useSelectedBtn"),
    indexBody: el("indexBody"),
    indexCount: el("indexCount"),

    log: el("log")
  };

  const state = {
    results: [],       // { id, ok, status, contentType, url, pretty, raw, title }
    selected: null,    // result
    indexItems: []     // { id, lastModifiedAt, importKey, _checked }
  };

  function setStatus(kind, text){
    ui.statusPill.className = `pill ${kind}`;
    ui.statusText.textContent = text;
  }

  function log(msg){
    ui.log.textContent += msg + "\n";
    ui.log.scrollTop = ui.log.scrollHeight;
  }

  function parseIds(raw){
    return (raw || "")
      .split(/[\s,;]+/g)
      .map(s => s.trim())
      .filter(Boolean);
  }

  function maskKey(k){
    const s = String(k || "");
    if (!s) return "";
    if (s.length <= 6) return "••••";
    return s.slice(0, 3) + "••••" + s.slice(-3);
  }

  function safeUrlForLog(urlStr){
    try{
      const u = new URL(urlStr);
      if (u.searchParams.has("key")) u.searchParams.set("key", "***");
      return u.toString();
    }catch{
      return String(urlStr);
    }
  }

  function buildContentUrl({ projectKey, id, lang, display, apiKey }){
    const base = API_BASE.replace(/\/+$/,"") + "/";
    const p = encodeURIComponent(String(projectKey).trim());
    const idSeg = encodeURIComponent(String(id).trim());

    const u = new URL(`${base}${p}/contents/${idSeg}`);
    if (display) u.searchParams.set("display", display);
    if (lang) u.searchParams.set("lang", lang);

    // „Auf Nummer sicher“: JSON als Struktur (format=json ist in den Docs als mandatory genannt)
    u.searchParams.set("format", "json");
    u.searchParams.set("key", apiKey);

    return u.toString();
  }

  function buildIndexUrl({ projectKey, type, count, startIndex, apiKey }){
    const base = API_BASE.replace(/\/+$/,"") + "/";
    const p = encodeURIComponent(String(projectKey).trim());

    const u = new URL(`${base}${p}/contents`);
    u.searchParams.set("type", type);
    u.searchParams.set("typeFields", "id,lastModifiedAt,importKey");
    u.searchParams.set("count", String(count));
    u.searchParams.set("startIndex", String(startIndex));
    u.searchParams.set("format", "json");
    u.searchParams.set("key", apiKey);

    return u.toString();
  }

  async function fetchTextWithMeta(url){
    try{
      const res = await fetch(url, { method: "GET" });
      const text = await res.text();
      const contentType = res.headers.get("content-type") || "";
      return { ok: res.ok, status: res.status, statusText: res.statusText, contentType, text };
    }catch(e){
      return {
        ok: false,
        status: 0,
        statusText: "FETCH_ERROR",
        contentType: "",
        text: String(e?.message || e)
      };
    }
  }

  function toPrettyJson(text){
    try{
      const obj = JSON.parse(text);
      return { ok: true, obj, pretty: JSON.stringify(obj, null, 2) };
    }catch{
      return { ok: false, obj: null, pretty: text };
    }
  }

  function guessTitle(obj){
    if (!obj || typeof obj !== "object") return "—";
    const keys = ["title", "name", "headline"];
    for (const k of keys){
      if (typeof obj[k] === "string" && obj[k].trim()) return obj[k].trim();
    }

    // Breadth-first search (depth-limited) for {title/name/headline}
    const q = [{ v: obj, d: 0 }];
    const seen = new Set();
    while (q.length){
      const { v, d } = q.shift();
      if (!v || typeof v !== "object") continue;
      if (seen.has(v)) continue;
      seen.add(v);

      for (const k of keys){
        if (typeof v[k] === "string" && v[k].trim()) return v[k].trim();
      }

      if (d >= 4) continue;

      if (Array.isArray(v)){
        for (const it of v) q.push({ v: it, d: d + 1 });
      }else{
        for (const kk of Object.keys(v)){
          q.push({ v: v[kk], d: d + 1 });
        }
      }
    }
    return "—";
  }

  function renderResults(){
    ui.resultBody.innerHTML = "";

    for (const r of state.results){
      const tr = document.createElement("tr");

      const preview = (r.pretty || r.raw || "").slice(0, 500) + ((r.pretty || r.raw || "").length > 500 ? "\n…" : "");
      const statusClass = r.ok ? "ok" : "err";

      tr.innerHTML = `
        <td><span class="id">${escapeHtml(r.id)}</span></td>
        <td><span class="${statusClass}">${r.status || 0}</span></td>
        <td>${escapeHtml(r.contentType || "—")}</td>
        <td>${escapeHtml(r.title || "—")}</td>
        <td><pre style="margin:0; white-space:pre-wrap;">${escapeHtml(preview)}</pre></td>
      `;

      tr.addEventListener("click", () => selectResult(r));
      ui.resultBody.appendChild(tr);
    }

    ui.countLabel.textContent = String(state.results.length);
    ui.downloadBtn.disabled = state.results.length === 0;
  }

  function selectResult(r){
    state.selected = r;
    ui.viewerLabel.textContent = r.id;
    ui.requestUrl.textContent = safeUrlForLog(r.url);
    ui.viewer.textContent = r.pretty || r.raw || "—";

    ui.copyBtn.disabled = false;
    ui.openBtn.disabled = false;
  }

  function escapeHtml(s){
    return String(s)
      .replaceAll("&","&amp;")
      .replaceAll("<","&lt;")
      .replaceAll(">","&gt;");
  }

  function resetAll({ keepFields = true } = {}){
    state.results = [];
    state.selected = null;
    state.indexItems = [];

    ui.resultBody.innerHTML = "";
    ui.viewerLabel.textContent = "—";
    ui.requestUrl.textContent = "—";
    ui.viewer.textContent = "Noch keine Daten geladen.";
    ui.log.textContent = "";
    ui.countLabel.textContent = "0";
    ui.indexBody.innerHTML = "";
    ui.indexCount.textContent = "0";
    ui.useSelectedBtn.disabled = true;

    ui.copyBtn.disabled = true;
    ui.openBtn.disabled = true;
    ui.downloadBtn.disabled = true;

    setStatus("run", "ready");

    if (!keepFields){
      ui.projectKey.value = "api-sachsen";
      ui.apiKey.value = "";
      ui.lang.value = "de";
      ui.display.value = "snippet";
      ui.parallel.value = 4;
      ui.ids.value = "";
      ui.rememberKey.checked = false;
    }
  }

  function persist(){
    const payload = {
      projectKey: ui.projectKey.value || "",
      lang: ui.lang.value || "de",
      display: ui.display.value || "snippet",
      parallel: ui.parallel.value || "4",
      rememberKey: !!ui.rememberKey.checked
    };

    // API Key nur speichern, wenn explizit erlaubt
    if (payload.rememberKey){
      payload.apiKey = ui.apiKey.value || "";
    }else{
      payload.apiKey = "";
    }

    localStorage.setItem("oaDataApiTool.settings", JSON.stringify(payload));
  }

  function hydrate(){
    try{
      const raw = localStorage.getItem("oaDataApiTool.settings");
      if (!raw) return;
      const p = JSON.parse(raw);

      ui.projectKey.value = p.projectKey || "api-sachsen";
      ui.lang.value = p.lang || "de";
      ui.display.value = p.display || "snippet";
      ui.parallel.value = p.parallel || "4";
      ui.rememberKey.checked = !!p.rememberKey;

      if (ui.rememberKey.checked && p.apiKey){
        ui.apiKey.value = p.apiKey;
      }
    }catch{
      // ignore
    }
  }

  async function runLookup(){
    persist();
    resetAll({ keepFields: true });

    const projectKey = (ui.projectKey.value || "").trim();
    const apiKey = (ui.apiKey.value || "").trim();
    const lang = (ui.lang.value || "de").trim();
    const display = ui.display.value || "snippet";
    const ids = parseIds(ui.ids.value);
    const parallel = Math.max(1, Math.min(10, Number(ui.parallel.value) || 4));

    if (!projectKey){
      setStatus("err", "missing projectKey");
      log("Fehler: Project Key fehlt.");
      return;
    }
    if (!apiKey){
      setStatus("err", "missing apiKey");
      log("Fehler: API Key fehlt.");
      return;
    }
    if (!ids.length){
      setStatus("err", "missing IDs");
      log("Fehler: Keine IDs eingegeben.");
      return;
    }

    setStatus("run", "running");
    log(`projectKey=${projectKey}`);
    log(`apiKey=${maskKey(apiKey)}`);
    log(`lang=${lang}`);
    log(`display=${display}`);
    log(`format=json`);
    log(`ids=${ids.join(", ")}`);
    log(`parallel=${parallel}`);

    let cursor = 0;
    const workers = Array.from({ length: Math.min(parallel, ids.length) }, () => worker());

    async function worker(){
      while (cursor < ids.length){
        const id = ids[cursor++];
        await fetchOne(id);
      }
    }

    async function fetchOne(id){
      const url = buildContentUrl({ projectKey, id, lang, display, apiKey });
      log(`GET ${safeUrlForLog(url)}`);

      const res = await fetchTextWithMeta(url);
      const parsed = toPrettyJson(res.text);

      const title = parsed.ok ? guessTitle(parsed.obj) : "—";
      const row = {
        id,
        ok: res.ok && parsed.ok,
        status: res.status,
        contentType: res.contentType,
        url,
        raw: res.text,
        pretty: parsed.pretty,
        title
      };

      state.results.push(row);
      renderResults();
    }

    await Promise.all(workers);

    const anyOk = state.results.some(r => r.ok);
    setStatus(anyOk ? "ok" : "err", anyOk ? "done" : "error");
    log("Fertig.");
  }

  async function loadIndex(){
    persist();

    const projectKey = (ui.projectKey.value || "").trim();
    const apiKey = (ui.apiKey.value || "").trim();
    const type = ui.indexType.value || "tour";
    const count = Math.max(1, Math.min(10000, Number(ui.indexCountInput.value) || 200));
    const startIndex = Math.max(0, Number(ui.indexStart.value) || 0);

    if (!projectKey){
      setStatus("err", "missing projectKey");
      log("Fehler: Project Key fehlt (für Index).");
      return;
    }
    if (!apiKey){
      setStatus("err", "missing apiKey");
      log("Fehler: API Key fehlt (für Index).");
      return;
    }

    setStatus("run", "loading index");
    const url = buildIndexUrl({ projectKey, type, count, startIndex, apiKey });
    log(`INDEX GET ${safeUrlForLog(url)}`);

    const res = await fetchTextWithMeta(url);
    const parsed = toPrettyJson(res.text);

    if (!res.ok || !parsed.ok){
      setStatus("err", "index error");
      log(`Index-Fehler: HTTP ${res.status} / JSON parse=${parsed.ok}`);
      return;
    }

    const items = extractIdRecords(parsed.obj);
    state.indexItems = items;

    renderIndexTable();
    ui.useSelectedBtn.disabled = items.length === 0;

    setStatus("ok", "index loaded");
  }

  function extractIdRecords(obj){
    // Ziel: Array von Records {id,lastModifiedAt,importKey}
    const arr = findArrayOfObjectsWithId(obj);
    if (!arr) return [];

    return arr
      .map(o => ({
        id: o?.id ?? o?.ID ?? o?.Id,
        lastModifiedAt: o?.lastModifiedAt ?? o?.lastModified ?? o?.modifiedAt ?? "",
        importKey: o?.importKey ?? "",
        _checked: false
      }))
      .filter(x => x.id !== undefined && x.id !== null && String(x.id).trim() !== "")
      .slice(0, 10000);
  }

  function findArrayOfObjectsWithId(root){
    // BFS, depth-limited
    const q = [{ v: root, d: 0 }];
    while (q.length){
      const { v, d } = q.shift();
      if (d > 5) continue;

      if (Array.isArray(v)){
        const ok = v.length > 0 && v.every(it => it && typeof it === "object" && ("id" in it || "ID" in it || "Id" in it));
        if (ok) return v;

        for (const it of v) q.push({ v: it, d: d + 1 });
        continue;
      }

      if (v && typeof v === "object"){
        // Häufige Container-Schlüssel zuerst
        const preferred = ["data", "contents", "items", "result", "results"];
        for (const k of preferred){
          if (k in v) q.push({ v: v[k], d: d + 1 });
        }
        for (const k of Object.keys(v)){
          if (!preferred.includes(k)) q.push({ v: v[k], d: d + 1 });
        }
      }
    }
    return null;
  }

  function renderIndexTable(){
    ui.indexBody.innerHTML = "";
    ui.indexCount.textContent = String(state.indexItems.length);

    for (let i = 0; i < state.indexItems.length; i++){
      const it = state.indexItems[i];
      const tr = document.createElement("tr");

      tr.innerHTML = `
        <td><input type="checkbox" data-i="${i}"></td>
        <td><span class="id">${escapeHtml(it.id)}</span></td>
        <td>${escapeHtml(it.lastModifiedAt || "—")}</td>
        <td>${escapeHtml(it.importKey || "—")}</td>
      `;

      const cb = tr.querySelector("input[type=checkbox]");
      cb.checked = !!it._checked;
      cb.addEventListener("change", () => {
        it._checked = cb.checked;
      });

      ui.indexBody.appendChild(tr);
    }
  }

  function useSelectedIds(){
    const selected = state.indexItems.filter(x => x._checked).map(x => String(x.id));
    if (!selected.length) return;

    const existing = new Set(parseIds(ui.ids.value));
    const merged = [...existing, ...selected.filter(id => !existing.has(id))];

    ui.ids.value = merged.join("\n");
    log(`Übernommen: ${selected.length} IDs in das IDs-Feld.`);
  }

  function downloadResults(){
    const payload = {
      generatedAt: new Date().toISOString(),
      apiBase: API_BASE,
      projectKey: (ui.projectKey.value || "").trim(),
      lang: (ui.lang.value || "de").trim(),
      display: ui.display.value || "snippet",
      format: "json",
      results: state.results.map(r => ({
        id: r.id,
        ok: r.ok,
        status: r.status,
        contentType: r.contentType,
        url: safeUrlForLog(r.url),
        title: r.title,
        body: r.pretty || r.raw
      }))
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "outdooractive-dataapi-results.json";
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  }

  function openSelected(){
    if (!state.selected) return;
    const text = state.selected.pretty || state.selected.raw || "";
    const blob = new Blob([text], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank", "noopener");
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }

  async function copySelected(){
    if (!state.selected) return;
    const text = state.selected.pretty || state.selected.raw || "";
    try{
      await navigator.clipboard.writeText(text);
      log(`Viewer-Inhalt kopiert (ID ${state.selected.id}).`);
    }catch(e){
      log("Clipboard-Fehler: " + String(e?.message || e));
    }
  }

  function loadSample(){
    ui.projectKey.value = "api-dev-oa";
    ui.apiKey.value = "yourtest-outdoora-ctiveapi";
    ui.lang.value = "de";
    ui.display.value = "verbose";
    ui.parallel.value = 2;
    ui.ids.value = "1373438\n1397449";
    ui.rememberKey.checked = false;
    persist();
    log("Beispieldaten gesetzt (Test-Keys aus der Doku).");
    setStatus("run", "ready");
  }

  // Wire up
  ui.runBtn.addEventListener("click", runLookup);
  ui.sampleBtn.addEventListener("click", loadSample);
  ui.resetBtn.addEventListener("click", () => resetAll({ keepFields: false }));
  ui.downloadBtn.addEventListener("click", downloadResults);

  ui.copyBtn.addEventListener("click", copySelected);
  ui.openBtn.addEventListener("click", openSelected);

  ui.loadIndexBtn.addEventListener("click", loadIndex);
  ui.useSelectedBtn.addEventListener("click", useSelectedIds);

  // Persist on changes (ohne Key automatisch zu speichern)
  ["projectKey","lang","display","parallel"].forEach(id => {
    el(id).addEventListener("change", persist);
  });
  ui.rememberKey.addEventListener("change", () => {
    if (!ui.rememberKey.checked){
      // Key aktiv aus Storage entfernen
      try{
        const raw = localStorage.getItem("oaDataApiTool.settings");
        const p = raw ? JSON.parse(raw) : {};
        p.apiKey = "";
        p.rememberKey = false;
        localStorage.setItem("oaDataApiTool.settings", JSON.stringify(p));
      }catch{
        // ignore
      }
    }
    persist();
  });
  ui.apiKey.addEventListener("change", persist);

  // Init
  hydrate();
  resetAll({ keepFields: true });
  log("Ready.");
})();
