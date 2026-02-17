(() => {
  const API_BASE = "https://api-oa.com/api/v2/project/"; // Data API v2
  const PARALLEL_DEFAULT = 4; // UI-Feld entfernt, aber weiterhin parallelisiert

  const el = (id) => document.getElementById(id);

  const ui = {
    statusPill: el("statusPill"),
    statusText: el("statusText"),

    projectKey: el("projectKey"),
    apiKey: el("apiKey"),
    rememberKey: el("rememberKey"),
    display: el("display"),
    ids: el("ids"),

    runBtn: el("runBtn"),
    downloadBtn: el("downloadBtn"),
    viewer: el("viewer")
  };

  const state = {
    lastJson: ""
  };

  function setStatus(kind, text){
    ui.statusPill.className = `pill ${kind}`;
    ui.statusText.textContent = text;
  }

  function parseIds(raw){
    return (raw || "")
      .split(/[\s,;]+/g)
      .map(s => s.trim())
      .filter(Boolean);
  }

  function buildContentUrl({ projectKey, id, display, apiKey }){
    const base = API_BASE.replace(/\/+$/,"") + "/";
    const p = encodeURIComponent(String(projectKey).trim());
    const idSeg = encodeURIComponent(String(id).trim());

    const u = new URL(`${base}${p}/contents/${idSeg}`);
    if (display) u.searchParams.set("display", display);

    u.searchParams.set("format", "json");
    u.searchParams.set("key", apiKey);

    return u.toString();
  }

  async function fetchText(url){
    try{
      const res = await fetch(url, { method: "GET" });
      const text = await res.text();
      return { ok: res.ok, status: res.status, contentType: res.headers.get("content-type") || "", text };
    }catch(e){
      return { ok: false, status: 0, contentType: "", text: String(e?.message || e) };
    }
  }

  function persist(){
    const payload = {
      projectKey: ui.projectKey.value || "",
      display: ui.display.value || "verbose",
      rememberKey: !!ui.rememberKey.checked,
      apiKey: ui.rememberKey.checked ? (ui.apiKey.value || "") : ""
    };
    localStorage.setItem("oaDataLookup.settings", JSON.stringify(payload));
  }

  function hydrate(){
    try{
      const raw = localStorage.getItem("oaDataLookup.settings");
      if (!raw) return;
      const p = JSON.parse(raw);

      ui.projectKey.value = p.projectKey || "api-sachsen";
      ui.display.value = p.display || "verbose";
      ui.rememberKey.checked = !!p.rememberKey;
      if (ui.rememberKey.checked && p.apiKey) ui.apiKey.value = p.apiKey;
    }catch{
      // ignore
    }
  }

  async function run(){
    persist();

    const projectKey = (ui.projectKey.value || "").trim();
    const apiKey = (ui.apiKey.value || "").trim();
    const display = ui.display.value || "verbose";
    const ids = parseIds(ui.ids.value);
    const parallel = Math.min(PARALLEL_DEFAULT, ids.length || 1);

    if (!projectKey || !apiKey || !ids.length){
      setStatus("err", "missing input");
      ui.viewer.textContent = "Fehlt: projectKey / apiKey / ids";
      ui.downloadBtn.disabled = true;
      return;
    }

    setStatus("run", "running");
    ui.viewer.textContent = "";
    ui.downloadBtn.disabled = true;
    state.lastJson = "";

    const results = {}; // { "<id>": <json> | <errorObj> }
    let cursor = 0;

    async function worker(){
      while (cursor < ids.length){
        const id = ids[cursor++];
        const url = buildContentUrl({ projectKey, id, display, apiKey });
        const res = await fetchText(url);

        if (!res.ok){
          results[id] = {
            _error: true,
            status: res.status,
            contentType: res.contentType,
            body: res.text
          };
          continue;
        }

        try{
          results[id] = JSON.parse(res.text);
        }catch{
          results[id] = {
            _error: true,
            status: res.status,
            contentType: res.contentType,
            body: res.text
          };
        }
      }
    }

    await Promise.all(Array.from({ length: parallel }, worker));

    const out = JSON.stringify(results, null, 2);
    state.lastJson = out;
    ui.viewer.textContent = out;

    ui.downloadBtn.disabled = false;
    setStatus("ok", "done");
  }

  function download(){
    if (!state.lastJson) return;
    const blob = new Blob([state.lastJson], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "outdooractive-data-lookup.json";
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  }

  ui.runBtn.addEventListener("click", run);
  ui.downloadBtn.addEventListener("click", download);

  ui.rememberKey.addEventListener("change", () => {
    if (!ui.rememberKey.checked){
      try{
        const raw = localStorage.getItem("oaDataLookup.settings");
        const p = raw ? JSON.parse(raw) : {};
        p.apiKey = "";
        p.rememberKey = false;
        localStorage.setItem("oaDataLookup.settings", JSON.stringify(p));
      }catch{
        // ignore
      }
    }
    persist();
  });

  // Init
  hydrate();
  setStatus("run", "ready");
})();
