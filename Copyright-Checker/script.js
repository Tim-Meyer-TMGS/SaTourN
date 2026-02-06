const el = (id) => document.getElementById(id);

function esc(s){
  return String(s ?? "")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;");
}

function buildParams(obj){
  const p = new URLSearchParams();
  for (const [k,v] of Object.entries(obj)){
    if (v === undefined || v === null || v === "") continue;
    p.set(k, String(v));
  }
  return p.toString();
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
    throw new Error(`HTTP ${res.status}: ${txt.slice(0, 300)}`);
  }
  return res.json();
}

/**
 * Versucht robust "Items" aus der ET4-Antwort zu ziehen.
 * (ET4 kann je nach Template/Setup andere Wrapper nutzen.)
 */
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
  return "";
}

function extractTitle(item){
  const keys = ["title","Title","name","Name","headline","Headline"];
  for (const k of keys){
    if (item?.[k] != null && String(item[k]).trim()) return String(item[k]).trim();
  }
  // fallback: manche Templates haben verschachtelt
  const alt = item?.presentation?.title ?? item?.presentation?.name;
  if (alt != null && String(alt).trim()) return String(alt).trim();
  return "";
}

function hasMissingCopyright(item){
  const mos = item?.media_objects;
  if (!Array.isArray(mos) || mos.length === 0) return false; // wenn es gar keine media_objects gibt: NICHT melden (kannst du ändern)
  for (const mo of mos){
    const c = mo?.copyrightText;
    if (c === undefined || c === null) return true;
    if (String(c).trim() === "") return true;
  }
  return false;
}

function setStatus(text, cls){
  const s = el("status");
  s.textContent = text;
  s.className = "pill " + cls;
}

function log(msg){
  el("log").textContent += msg + "\n";
  el("log").scrollTop = el("log").scrollHeight;
}

function addRow({id, title, mediaCount}){
  const tr = document.createElement("tr");
  tr.innerHTML = `
    <td><code>${esc(id)}</code></td>
    <td>${esc(title)}</td>
    <td>${esc(mediaCount)}</td>
  `;
  el("tbody").appendChild(tr);
}

function toCsv(rows){
  const header = ["id","title","media_objects_count"];
  const lines = [header.join(",")];
  for (const r of rows){
    const line = [
      `"${String(r.id).replaceAll('"','""')}"`,
      `"${String(r.title).replaceAll('"','""')}"`,
      String(r.mediaCount)
    ];
    lines.push(line.join(","));
  }
  return lines.join("\n");
}

function downloadBlob(filename, data, mime){
  const blob = new Blob([data], { type: mime });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
}

/* ------------------------- Run ------------------------- */

let stopRequested = false;
let currentAbort = null;
let lastMissing = [];

function setButtons(running){
  el("runBtn").disabled = running;
  el("stopBtn").disabled = !running;
}

el("stopBtn").addEventListener("click", () => {
  stopRequested = true;
  if (currentAbort) currentAbort.abort();
  log("Stop requested.");
});

el("downloadBtn").addEventListener("click", () => {
  const csv = toCsv(lastMissing);
  downloadBlob("missing_copyright.csv", csv, "text/csv;charset=utf-8");
});

el("runBtn").addEventListener("click", async () => {
  // reset
  el("tbody").innerHTML = "";
  el("log").textContent = "";
  el("missingCount").textContent = "0";
  el("progress").textContent = "0/0";
  el("downloadBtn").disabled = true;
  lastMissing = [];
  stopRequested = false;

  currentAbort = new AbortController();

  const baseUrl = (el("baseUrl").value.trim() || "https://meta.et4.de/rest.ashx/search/").replace(/\/?$/, "/");
  const experience = el("experience").value.trim();
  const type = el("type").value.trim() || "All";
  const template = el("template").value.trim() || "ET2022A.json";
  const licensekey = el("licensekey").value.trim();

  const limit = Math.max(1, Math.min(500, parseInt(el("limit").value, 10) || 200));

  const rateRaw = parseFloat(el("rate").value);
  const rate = Math.max(0.1, Math.min(2, Number.isFinite(rateRaw) ? rateRaw : 1));
  el("rate").value = String(rate);
  const limiter = { minIntervalMs: Math.ceil(1000 / rate), state: { lastStart: -1e9 } };

  if (!experience){
    setStatus("error","err");
    log("Missing experience.");
    return;
  }

  setButtons(true);
  setStatus("running","run");

  try{
    // 1) Probe für total
    await rateLimit(limiter.minIntervalMs, limiter.state);
    const probe = await fetchJson(baseUrl, {
      experience, type, template, licensekey,
      q: "",
      limit: 1,
      offset: 0
    }, currentAbort.signal);

    const total = extractTotal(probe);
    if (!total || total <= 0){
      log("Could not determine total (total=null/0). Will paginate until empty page.");
    } else {
      log(`Total hits: ${total}`);
    }

    // 2) Pagination
    let offset = 0;
    let processed = 0;

    while (true){
      if (stopRequested) throw new Error("Stopped by user.");

      await rateLimit(limiter.minIntervalMs, limiter.state);
      const payload = await fetchJson(baseUrl, {
        experience, type, template, licensekey,
        q: "",
        limit,
        offset
      }, currentAbort.signal);

      const items = extractItems(payload);
      log(`Page: offset=${offset} items=${items.length}`);

      if (!items.length) break;

      for (const it of items){
        processed++;
        const id = extractId(it);
        const title = extractTitle(it);
        const mos = Array.isArray(it?.media_objects) ? it.media_objects : [];
        if (hasMissingCopyright(it)){
          lastMissing.push({ id, title, mediaCount: mos.length });
          addRow({ id, title, mediaCount: mos.length });
          el("missingCount").textContent = String(lastMissing.length);
        }

        if (total && total > 0){
          el("progress").textContent = `${processed}/${total}`;
        } else {
          el("progress").textContent = `${processed}/?`;
        }
      }

      offset += limit;

      // wenn total bekannt: sauber stoppen
      if (total && offset >= total) break;
    }

    setStatus("done","ok");
    el("downloadBtn").disabled = (lastMissing.length === 0);
    log(`Done. Processed=${processed}. Missing=${lastMissing.length}.`);
  } catch (e){
    setStatus("error","err");
    log("Error: " + String(e?.message || e));
  } finally {
    setButtons(false);
    currentAbort = null;
  }
});
