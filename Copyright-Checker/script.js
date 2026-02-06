/* Copyright_Checker/script.js
   - Ruft Datensätze typweise nacheinander ab (Type-Whitelist)
   - "City" und "Area" werden ausgeschlossen
   - Pagination via limit/offset pro Type (offset += items.length)
   - Prüft copyrightText nur für echte Medien-Assets (image/video/audio bzw. DAM),
     ignoriert rel=canonical/socialmedia (sonst false positives)
   - Ergänzt bei Treffern einen Pages-Link im Format:
     https://pages.destination.one/de/<experience>/default_withmap/detail/<TYPE>/<global_id>/<URL_TITLE>
     (URL_TITLE kommt aus attributes[].key="URL_TITLE") :contentReference[oaicite:0]{index=0}
*/

const el = (id) => document.getElementById(id);

function esc(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function buildParams(obj) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null || v === "") continue;
    p.set(k, String(v));
  }
  return p.toString();
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function rateLimit(minIntervalMs, state) {
  const now = performance.now();
  const elapsed = now - state.lastStart;
  const wait = Math.max(0, minIntervalMs - elapsed);
  if (wait > 0) await sleep(wait);
  state.lastStart = performance.now();
}

async function fetchJson(baseUrl, params, abortSignal) {
  const url = baseUrl + "?" + buildParams(params);
  const res = await fetch(url, { method: "GET", signal: abortSignal });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status}: ${txt.slice(0, 300)}`);
  }
  return res.json();
}

/* ---------- Response helpers ---------- */

function extractItems(payload) {
  const keys = ["items", "results", "Result", "Documents", "document", "data"];
  for (const k of keys) {
    const v = payload?.[k];
    if (Array.isArray(v)) return v;
    if (v && typeof v === "object") {
      for (const kk of keys) {
        const vv = v?.[kk];
        if (Array.isArray(vv)) return vv;
      }
    }
  }
  for (const v of Object.values(payload || {})) {
    if (Array.isArray(v) && v.length && typeof v[0] === "object") return v;
  }
  return [];
}

function extractTotal(payload) {
  const keys = [
    "total",
    "Total",
    "totalHits",
    "TotalHits",
    "numFound",
    "NumFound",
    "count",
    "Count",
    "hits",
    "Hits",
  ];
  for (const k of keys) {
    const v = payload?.[k];
    if (Number.isInteger(v)) return v;
    if (typeof v === "string" && /^\d+$/.test(v)) return parseInt(v, 10);
  }
  for (const mk of ["meta", "Meta", "info", "Info"]) {
    const meta = payload?.[mk];
    if (meta && typeof meta === "object") {
      for (const k of keys) {
        const v = meta?.[k];
        if (Number.isInteger(v)) return v;
        if (typeof v === "string" && /^\d+$/.test(v)) return parseInt(v, 10);
      }
    }
  }
  return null;
}

function extractId(item) {
  if (item?.id != null) return String(item.id);
  if (item?.global_id != null) return String(item.global_id);
  for (const k of ["Id", "ID", "objectId", "ObjectId", "oid", "Oid"]) {
    if (item?.[k] != null) return String(item[k]);
  }
  return "";
}

function extractGlobalId(item) {
  if (item?.global_id != null) return String(item.global_id);
  if (item?.globalId != null) return String(item.globalId);
  return "";
}

function extractTitle(item) {
  const keys = ["title", "Title", "name", "Name", "headline", "Headline"];
  for (const k of keys) {
    if (item?.[k] != null && String(item[k]).trim())
      return String(item[k]).trim();
  }
  const alt = item?.presentation?.title ?? item?.presentation?.name;
  if (alt != null && String(alt).trim()) return String(alt).trim();
  return "";
}

function getType(item) {
  return (
    item?.type ??
    item?.Type ??
    item?.object_type ??
    item?.objectType ??
    item?.["@type"] ??
    ""
  );
}

function isExcludedTypeName(typeName) {
  const t = String(typeName || "").trim();
  return t === "City" || t === "Area";
}

/* ---------- Pages-Link (destination.one pages) ---------- */

function extractUrlTitle(item) {
  // attributes: [{key:"URL_TITLE", value:"..."}]
  const attrs = item?.attributes;
  if (Array.isArray(attrs)) {
    for (const a of attrs) {
      if (String(a?.key ?? "").toUpperCase() === "URL_TITLE") {
        const v = String(a?.value ?? "").trim();
        if (v) return v;
      }
    }
  }
  // Fallback: attributes_old? (wenn vorhanden)
  const attrsOld = item?.attributes_old;
  if (Array.isArray(attrsOld)) {
    for (const a of attrsOld) {
      if (String(a?.key ?? "").toUpperCase() === "URL_TITLE") {
        const v = String(a?.value ?? "").trim();
        if (v) return v;
      }
    }
  }
  return "";
}

function buildPagesLink(item, experience) {
  const type = String(getType(item) || "").trim();
  const gid = extractGlobalId(item);
  const slug = extractUrlTitle(item);

  if (!experience || !type || !gid || !slug) return "";

  // entspricht deinem Beispiel: /de/<experience>/default_withmap/detail/<TYPE>/<global_id>/<slug>
  const base = `https://pages.destination.one/de/${encodeURIComponent(
    experience
  )}/default_withmap/detail/`;

  return (
    base +
    `${encodeURIComponent(type)}/${encodeURIComponent(gid)}/${encodeURIComponent(slug)}`
  );
}

/* ---------- Copyright check (fixed) ---------- */

function isCheckableMediaObject(mo) {
  const rel = String(mo?.rel ?? "").toLowerCase();
  const type = String(mo?.type ?? "").toLowerCase();
  const url = String(mo?.url ?? "").toLowerCase();

  // reine Referenzen/Links nicht prüfen (sonst false positives)
  if (rel === "canonical" || rel === "socialmedia") return false;

  // echte Medien: Bild/Video/Audio
  if (
    type.startsWith("image/") ||
    type.startsWith("video/") ||
    type.startsWith("audio/")
  ) {
    return true;
  }

  // Fallback: DAM-Assets ohne/mit unzuverlässigem MIME-Type
  if (url.includes("dam.destination.one/")) return true;

  return false;
}

function hasMissingCopyright(item) {
  const mos = item?.media_objects;
  if (!Array.isArray(mos) || mos.length === 0) return false;

  const checkables = mos.filter(isCheckableMediaObject);
  if (checkables.length === 0) return false;

  for (const mo of checkables) {
    const c = mo?.copyrightText;
    if (c === undefined || c === null) return true;
    if (String(c).trim() === "") return true;
  }
  return false;
}

/* ---------- UI helpers ---------- */

function setStatus(text, cls) {
  const s = el("status");
  s.textContent = text;
  s.className = "pill " + cls;
}

function log(msg) {
  const l = el("log");
  l.textContent += msg + "\n";
  l.scrollTop = l.scrollHeight;
}

function addRow({ id, title, mediaCount, pagesLink }) {
  const linkHtml = pagesLink
    ? `<div style="margin-top:6px;">
         <a href="${esc(pagesLink)}" target="_blank" rel="noopener noreferrer">Pages-Link öffnen</a>
       </div>`
    : `<div style="margin-top:6px; opacity:.7;">(kein Pages-Link ableitbar)</div>`;

  const tr = document.createElement("tr");
  tr.innerHTML = `
    <td><code>${esc(id)}</code></td>
    <td>${esc(title)}${linkHtml}</td>
    <td>${esc(mediaCount)}</td>
  `;
  el("tbody").appendChild(tr);
}

function toCsv(rows) {
  const header = ["id", "title", "type", "media_objects_count", "pages_link"];
  const lines = [header.join(",")];
  for (const r of rows) {
    const line = [
      `"${String(r.id).replaceAll('"', '""')}"`,
      `"${String(r.title).replaceAll('"', '""')}"`,
      `"${String(r.type ?? "").replaceAll('"', '""')}"`,
      String(r.mediaCount ?? 0),
      `"${String(r.pagesLink ?? "").replaceAll('"', '""')}"`,
    ];
    lines.push(line.join(","));
  }
  return lines.join("\n");
}

function downloadBlob(filename, data, mime) {
  const blob = new Blob([data], { type: mime });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    URL.revokeObjectURL(a.href);
    a.remove();
  }, 1000);
}

function idsFingerprint(items, n = 30) {
  return items
    .map((it) => extractId(it))
    .filter(Boolean)
    .slice(0, n)
    .join("|");
}

/* ------------------------- Run ------------------------- */

let stopRequested = false;
let currentAbort = null;
let lastMissing = [];

function setButtons(running) {
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
  // reset UI
  el("tbody").innerHTML = "";
  el("log").textContent = "";
  el("missingCount").textContent = "0";
  el("progress").textContent = "0/0";
  el("downloadBtn").disabled = true;
  lastMissing = [];
  stopRequested = false;

  currentAbort = new AbortController();

  const baseUrlRaw =
    el("baseUrl").value.trim() || "https://meta.et4.de/rest.ashx/search/";
  const baseUrl = baseUrlRaw.replace(/\/?$/, "/");

  const experience = el("experience").value.trim();
  const template = el("template").value.trim() || "ET2022A.json";
  const licensekey = el("licensekey").value.trim();

  // Eingabe: comma-separierte Typen. Wenn "All" -> Whitelist (API-schonend) ohne City/Area.
  const typesInput = (el("type").value || "All").trim();

  const limit = Math.max(1, Math.min(500, parseInt(el("limit").value, 10) || 200));

  const rateRaw = parseFloat(el("rate").value);
  const rate = Math.max(0.1, Math.min(2, Number.isFinite(rateRaw) ? rateRaw : 1));
  el("rate").value = String(rate);

  const limiter = {
    minIntervalMs: Math.ceil(1000 / rate),
    state: { lastStart: -1e9 },
  };

  if (!experience) {
    setStatus("error", "err");
    log("Missing experience.");
    return;
  }

  // API-Entlastung: Keine All-Abfrage, sondern Whitelist.
  // Passe diese Liste ggf. an eure realen Types an.
  const defaultWhitelist = [
    "POI",
    "Event",
    "Tour",
    "Accommodation",
    "Gastronomy",
    "Offer",
    "Story",
    "PressRelease",
  ];

  let types = [];
  if (!typesInput || typesInput.toLowerCase() === "all") {
    types = defaultWhitelist.slice();
  } else {
    types = typesInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
  }

  // City/Area sicher ausschließen (auch wenn jemand sie eingibt)
  types = types.filter((t) => !isExcludedTypeName(t));

  if (types.length === 0) {
    setStatus("error", "err");
    log('No types to query (after excluding "City" and "Area").');
    return;
  }

  setButtons(true);
  setStatus("running", "run");

  try {
    let processed = 0;

    // Safety gegen Endlosschleifen
    const maxPagesSafety = 5000;

    // per Type nacheinander abfragen
    for (const type of types) {
      if (stopRequested) throw new Error("Stopped by user.");

      log(`\n=== TYPE: ${type} ===`);

      let offset = 0;
      let pageCount = 0;
      let prevFingerprint = null;
      let total = null;

      while (true) {
        if (stopRequested) throw new Error("Stopped by user.");

        await rateLimit(limiter.minIntervalMs, limiter.state);

        const payload = await fetchJson(
          baseUrl,
          {
            experience,
            type,
            template,
            licensekey,
            q: "",
            limit,
            offset,
          },
          currentAbort.signal
        );

        const items = extractItems(payload);
        if (total === null) total = extractTotal(payload);

        log(`Page: offset=${offset} items=${items.length}` + (total ? ` total=${total}` : ""));

        if (!items.length) break;

        // Detect: offset ignoriert -> gleiche Seite kommt wieder
        const fp = idsFingerprint(items);
        if (prevFingerprint && fp && fp === prevFingerprint) {
          throw new Error(
            `Pagination ignored for type=${type} (same page repeated). Check API params/template.`
          );
        }
        prevFingerprint = fp;

        for (const it of items) {
          const itemType = String(getType(it) || "").trim();

          // City/Area auch serverseitig rausfiltern (falls doch geliefert)
          if (isExcludedTypeName(itemType)) continue;

          processed++;

          const id = extractId(it);
          const title = extractTitle(it);
          const mos = Array.isArray(it?.media_objects) ? it.media_objects : [];

          if (hasMissingCopyright(it)) {
            const pagesLink = buildPagesLink(it, experience);

            lastMissing.push({
              id,
              title,
              type: itemType || type,
              mediaCount: mos.length,
              pagesLink,
            });

            addRow({
              id,
              title,
              mediaCount: mos.length,
              pagesLink,
            });

            el("missingCount").textContent = String(lastMissing.length);
          }

          // Progress: bewusst ohne (unsichere) Gesamtzahl
          el("progress").textContent = `${processed}/?`;
        }

        // robust: offset um tatsächlich gelieferte Anzahl erhöhen
        offset += items.length;

        // optional sauber abbrechen wenn total bekannt
        if (total && offset >= total) break;

        pageCount++;
        if (pageCount > maxPagesSafety) {
          throw new Error(`Safety stop: too many pages for type=${type} (check pagination).`);
        }
      }
    }

    setStatus("done", "ok");
    el("downloadBtn").disabled = lastMissing.length === 0;
    log(`\nDone. Processed=${processed}. Missing=${lastMissing.length}.`);
  } catch (e) {
    setStatus("error", "err");
    log("Error: " + String(e?.message || e));
  } finally {
    setButtons(false);
    currentAbort = null;
  }
});
