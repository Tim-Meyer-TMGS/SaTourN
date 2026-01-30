 // ----------------------------
  // Item Randomizer (slim + safe)
  // - IDs sammeln (paging) -> Details laden (exakt targetCount)
  // - strikt sequenziell
  // - rate <= 2 req/s
  // - licensekey optional
  // ----------------------------

  const el = (id) => document.getElementById(id);

  function esc(s){
    return String(s).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;");
  }
  function buildParams(obj){
    const p = new URLSearchParams();
    for (const [k,v] of Object.entries(obj)){
      if (v === undefined || v === null || v === "") continue;
      p.set(k, String(v));
    }
    return p.toString();
  }

  const ui = {
    setStatus(text, state){
      const s = el("status");
      s.querySelector("span:last-child").textContent = text;
      s.className = "pill " + state;
    },
    setPhase(text){ el("phaseLabel").textContent = text; },
    setCount(n){ el("countLabel").textContent = String(n); },
    setProgress(done, total){
      el("progressMeta").textContent = `${done}/${total}`;
      const pct = total > 0 ? (done / total) * 100 : 0;
      el("bar").style.width = `${Math.max(0, Math.min(100, pct))}%`;
    },
    log(msg){
      const box = el("logBox");
      box.textContent += msg + "\n";
      box.scrollTop = box.scrollHeight;
    },
    reset(){
      el("tbody").innerHTML = "";
      el("logBox").textContent = "";
      ui.setCount(0);
      ui.setPhase("idle");
      ui.setProgress(0,0);
      ui.setStatus("ready","run");
      el("downloadAllBtn").disabled = true;
      el("downloadIndexBtn").disabled = true;
    },
    addRow({type, id, url, jsonSnippet}){
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${esc(type)}</td>
        <td><span class="id">${esc(id)}</span></td>
        <td><a href="${url}" target="_blank" rel="noopener">${url}</a></td>
        <td><pre>${esc(jsonSnippet)}</pre></td>
      `;
      el("tbody").appendChild(tr);
    }
  };

  function parseTypes(raw){
    return raw.split(",").map(s => s.trim()).filter(Boolean);
  }
  function prettySnippet(obj, maxLen=700){
    const s = JSON.stringify(obj, null, 2);
    return s.length <= maxLen ? s : (s.slice(0, maxLen) + "\n…");
  }
  function sleep(ms){ return new Promise(r => setTimeout(r, ms)); }

  async function rateLimit(minIntervalMs, state){
    const now = performance.now();
    const elapsed = now - state.lastStart;
    const wait = Math.max(0, minIntervalMs - elapsed);
    if (wait > 0) await sleep(wait);
    state.lastStart = performance.now();
  }

  async function fetchJson(baseUrl, params, abortSignal){
    const url = baseUrl + "?" + buildParams(params);
    const res = await fetch(url, { method: "GET", signal: abortSignal });
    if (!res.ok){
      const txt = await res.text().catch(() => "");
      throw new Error(`HTTP ${res.status}: ${txt.slice(0, 200)}`);
    }
    return res.json();
  }

  function extractItems(payload){
    const keys = ["items","results","Result","Documents","document","data"];
    for (const k of keys){
      const v = payload?.[k];
      if (Array.isArray(v)) return v;
      if (v && typeof v === "object"){
        for (const kk of keys){
          const vv = v?.[kk];
          if (Array.isArray(vv)) return vv;
        }
      }
    }
    for (const v of Object.values(payload || {})){
      if (Array.isArray(v) && v.length && typeof v[0] === "object") return v;
    }
    return [];
  }

  function extractTotal(payload){
    const keys = ["total","Total","totalHits","TotalHits","numFound","NumFound","count","Count","hits","Hits"];
    for (const k of keys){
      const v = payload?.[k];
      if (Number.isInteger(v)) return v;
      if (typeof v === "string" && /^\d+$/.test(v)) return parseInt(v, 10);
    }
    for (const mk of ["meta","Meta","info","Info"]){
      const meta = payload?.[mk];
      if (meta && typeof meta === "object"){
        for (const k of keys){
          const v = meta?.[k];
          if (Number.isInteger(v)) return v;
          if (typeof v === "string" && /^\d+$/.test(v)) return parseInt(v, 10);
        }
      }
    }
    return null;
  }

  function extractId(item){
    if (item?.id != null) return String(item.id);
    if (item?.global_id != null) return String(item.global_id);
    for (const k of ["Id","ID","objectId","ObjectId","oid","Oid"]){
      if (item?.[k] != null) return String(item[k]);
    }
    return null;
  }

  function getPlan(types, targetCount, planText){
    if (planText && planText.trim()){
      const plan = JSON.parse(planText);
      let sum = 0;
      for (const t of types){
        const n = Number(plan[t] ?? 0);
        if (!Number.isFinite(n) || n < 0) throw new Error(`Invalid plan value for ${t}`);
        plan[t] = Math.floor(n);
        sum += plan[t];
      }
      if (sum !== targetCount) throw new Error(`Plan sum (${sum}) must equal target (${targetCount}).`);
      return plan;
    }
    const base = Math.floor(targetCount / types.length);
    let rest = targetCount - base * types.length;
    const plan = {};
    for (const t of types) plan[t] = base;
    for (let i = 0; i < types.length && rest > 0; i++, rest--) plan[types[i]]++;
    return plan;
  }

  async function collectIdsForType({baseUrl, experience, template, licensekey, type, need, limiter, abortSignal}){
    const ids = new Set();
    const limit = 100;

    await rateLimit(limiter.minIntervalMs, limiter.state);
    const probe = await fetchJson(baseUrl, {
      experience, template, licensekey, type,
      q: "", limit: 1, offset: 0
    }, abortSignal);
    const total = extractTotal(probe);

    const maxOffset = (total && total > 0) ? Math.max(0, total - limit) : 5000;
    let offset = Math.floor(Math.random() * (maxOffset + 1));

    const pagesNeeded = Math.ceil(need / limit);
    const requestBudget = Math.max(15, pagesNeeded * 6);

    for (let req = 0; req < requestBudget && ids.size < need; req++){
      await rateLimit(limiter.minIntervalMs, limiter.state);

      const payload = await fetchJson(baseUrl, {
        experience, template, licensekey, type,
        q: "",
        limit,
        offset
      }, abortSignal);

      const items = extractItems(payload);
      let added = 0;

      for (const it of items){
        const id = extractId(it);
        if (id && !ids.has(id)){
          ids.add(id);
          added++;
        }
        if (ids.size >= need) break;
      }

      ui.log(`IDs ${type}: offset=${offset} items=${items.length} +${added} unique=${ids.size}/${need}`);

      offset = offset + limit;
      if (offset > maxOffset) offset = 0;
      if (!items.length) break;
    }

    return Array.from(ids);
  }

  async function fetchDetailById({baseUrl, experience, template, licensekey, type, id, limiter, abortSignal}){
    await rateLimit(limiter.minIntervalMs, limiter.state);
    const isNumeric = /^\d+$/.test(String(id));
    const field = isNumeric ? "id" : "global_id";

    const payload = await fetchJson(baseUrl, {
      experience, template, licensekey, type,
      q: `${field}:${id}`,
      limit: 1,
      offset: 0
    }, abortSignal);

    const items = extractItems(payload);
    return items.length ? items[0] : payload;
  }

  function downloadBlob(filename, data, mime="application/json"){
    const blob = new Blob([data], { type: mime });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  }

  let stopRequested = false;
  let lastResults = [];
  let currentAbort = null;

  function setButtons(running){
    el("runBtn").disabled = running;
    el("stopBtn").disabled = !running;
  }

  el("stopBtn").addEventListener("click", () => {
    stopRequested = true;
    if (currentAbort) currentAbort.abort();
    ui.log("Stop requested.");
  });

  el("downloadAllBtn").addEventListener("click", () => {
    for (const r of lastResults){
      downloadBlob(`${r.id}.json`, JSON.stringify(r.json, null, 2));
    }
  });

  el("downloadIndexBtn").addEventListener("click", () => {
    const index = lastResults.map(({type,id,url}) => ({type,id,url}));
    downloadBlob("urls.json", JSON.stringify(index, null, 2));
  });

  el("runBtn").addEventListener("click", async () => {
    ui.reset();
    stopRequested = false;
    lastResults = [];
    currentAbort = new AbortController();

    const baseUrl = el("baseUrl").value.trim() || "https://meta.et4.de/rest.ashx/search/";
    const experience = el("experience").value.trim();
    const template = el("template").value.trim() || "ET2022A.json";
    const licensekey = el("licensekey").value.trim();
    const types = parseTypes(el("types").value || "");

    if (!experience){ ui.setStatus("error","err"); ui.log("Missing experience."); return; }
    if (!types.length){ ui.setStatus("error","err"); ui.log("Missing types."); return; }

    const targetCount = Math.max(1, Math.min(500, parseInt(el("targetCount").value, 10) || 20));

    const rateRaw = parseFloat(el("rate").value);
    const rate = Math.max(0.1, Math.min(2, Number.isFinite(rateRaw) ? rateRaw : 2));
    el("rate").value = String(rate);
    const minIntervalMs = Math.ceil(1000 / rate);

    let plan;
    try{
      plan = getPlan(types, targetCount, el("plan").value);
    }catch(e){
      ui.setStatus("error","err");
      ui.log(String(e.message || e));
      return;
    }

    const limiter = { minIntervalMs, state: { lastStart: -1e9 } };

    ui.setStatus("running","run");
    ui.log(`baseUrl=${baseUrl}`);
    ui.log(`experience=${experience}`);
    ui.log(`template=${template}`);
    ui.log(`licensekey=${licensekey ? "[set]" : "[empty]"}`);
    ui.log(`types=${types.join(",")}`);
    ui.log(`target=${targetCount}`);
    ui.log(`rate=${rate} req/s (minInterval=${minIntervalMs}ms)`);
    ui.log(`plan=${JSON.stringify(plan)}`);

    setButtons(true);

    try{
      ui.setPhase("collecting");
      const idPool = [];
      for (const type of types){
        if (stopRequested) throw new Error("Stopped by user.");
        const need = plan[type] || 0;
        if (!need) continue;

        const ids = await collectIdsForType({
          baseUrl, experience, template, licensekey, type, need,
          limiter, abortSignal: currentAbort.signal
        });

        ui.log(`IDs ${type}: ${ids.length}/${need}`);
        for (const id of ids) idPool.push({ type, id });
      }

      ui.setPhase("loading");
      const totalToFetch = Math.min(targetCount, idPool.length);
      ui.setProgress(0, totalToFetch);

      const seen = new Set();
      let done = 0;

      for (const entry of idPool){
        if (done >= totalToFetch) break;
        if (stopRequested) throw new Error("Stopped by user.");

        const key = `${entry.type}:${entry.id}`;
        if (seen.has(key)) continue;
        seen.add(key);

        const detail = await fetchDetailById({
          baseUrl, experience, template, licensekey,
          type: entry.type, id: entry.id,
          limiter, abortSignal: currentAbort.signal
        });

        const isNumeric = /^\d+$/.test(String(entry.id));
        const field = isNumeric ? "id" : "global_id";

        const url = baseUrl + "?" + buildParams({
          experience, template, licensekey,
          type: entry.type,
          q: `${field}:${entry.id}`
        });

        lastResults.push({ type: entry.type, id: entry.id, url, json: detail });
        ui.addRow({ type: entry.type, id: entry.id, url, jsonSnippet: prettySnippet(detail) });

        done++;
        ui.setCount(lastResults.length);
        ui.setProgress(done, totalToFetch);
      }

      if (done < targetCount){
        ui.setStatus("partial","run");
        ui.log(`Warning: only ${done}/${targetCount} fetched (ID pool too small).`);
      }else{
        ui.setStatus("done","ok");
      }

      el("downloadAllBtn").disabled = (lastResults.length === 0);
      el("downloadIndexBtn").disabled = (lastResults.length === 0);
      ui.setPhase("done");
    }catch(e){
      ui.setStatus("error","err");
      ui.log("Error: " + String(e.message || e));
      ui.setPhase("stopped");
    }finally{
      setButtons(false);
      currentAbort = null;
    }
  });

  ui.reset();
  ui.log("Ready.");
