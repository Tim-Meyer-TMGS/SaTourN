/* Copyright_Checker/script.js
   - Typen nacheinander (ohne City/Area)
   - Pagination: limit/offset (offset += items.length)  [ET4-Doku]
   - Check: fehlendes/leeres Copyright nur bei echten Medien
   - Ausgabe: ID + Titel + Pages-Link(s) + Debug (welches Media-Objekt fehlt)
*/

const el = (id) => document.getElementById(id);

/* ------------------------- small utils ------------------------- */

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

/* ------------------------- ET4 response helpers ------------------------- */

function extractItems(payload) {
  // ET2022A.json liefert i.d.R. payload.items
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
    "overallcount",
    "overallCount",
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
  // meta liefert oft id als Nummer und global_id als p_/t_/...
  if (item?.global_id != null) return String(item.global_id);
  if (item?.globalId != null) return String(item.globalId);
  if (item?.id != null) return String(item.id);
  if (item?.Id != null) return String(item.Id);
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
    if (item?.[k] != null && String(item[k]).trim()) return String(item[k]).trim();
  }
  const alt = item?.presentation?.title ?? item?.presentation?.name;
  if (alt != null && String(alt).trim()) return String(alt).trim();
  return "";
}

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
  return "";
}

function slugifyFallback(title) {
  // Fallback nur, wenn URL_TITLE fehlt
  const s = String(title ?? "").trim().toLowerCase();
  if (!s) return "";
  // Umlaute grob normalisieren
  const map = { ä: "ae", ö: "oe", ü: "ue", ß: "ss" };
  const norm = s.replace(/[äöüß]/g, (m) => map[m] || m);
  return norm
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/* ------------------------- Type logic (ET4 types) ------------------------- */

const TYPE_CANONICAL = {
  poi: "POI",
  tour: "Tour",
  gastro: "Gastro",
  hotel: "Hotel",
  event: "Event",
  city: "City",
  area: "Area",
  package: "Package",
  article: "Article",
  web: "Web",
};

function normalizeType(t) {
  const raw = String(t ?? "").trim();
  if (!raw) return "";
  const key = raw.toLowerCase();
  return TYPE_CANONICAL[key] || raw; // falls ET4 was zusätzliches liefert
}

function getType(item) {
  return normalizeType(
    item?.type ??
      item?.Type ??
      item?.object_type ??
      item?.objectType ??
      item?.["@type"] ??
      ""
  );
}

function isExcludedTypeName(typeName) {
  const t = normalizeType(typeName);
  return t === "City" || t === "Area";
}

/* ------------------------- Pages link logic ------------------------- */

const PAGES_BASE = "https://pages.destination.one";
const PAGES_LANG = "de";
const PAGES_TEMPLATE = "default_withmap"; // passend zu euren Beispielen
const PAGES_MODE = "detail"; // .../<template>/<mode>/<type>/...

function buildPagesLinks(item, metaExperience) {
  const type = getType(item);
  const gid = extractGlobalId(item);
  const urlTitle = extractUrlTitle(item) || slugifyFallback(extractTitle(item));

  if (!type || !gid || !urlTitle) return [];

  // pages-experience: manche nutzen zusätzlich open-data-<experience>
  const expRaw = String(metaExperience ?? "").trim();
  const exps = [];
  if (expRaw) {
    exps.push(expRaw);
    if (!expRaw.toLowerCase().startsWith("open-data-")) {
      exps.push(`open-data-${expRaw}`);
    }
  }

  // Duplikate entfernen
  const uniqExps = [...new Set(exps)];

  return uniqExps.map((exp) => {
    return (
      `${PAGES_BASE}/${PAGES_LANG}/` +
      `${encodeURIComponent(exp)}/` +
      `${encodeURIComponent(PAGES_TEMPLATE)}/` +
      `${encodeURIComponent(PAGES_MODE)}/` +
      `${encodeURIComponent(type)}/` +
      `${encodeURIComponent(gid)}/` +
      `${encodeURIComponent(urlTitle)}`
    );
  });
}

/* ------------------------- Copyright check ------------------------- */

function getMediaCopyrightText(mo) {
  // robust: verschiedene Schreibweisen abfangen
  const candidates = [
    mo?.copyrightText,
    mo?.copyrighttext,
    mo?.copyright,
    mo?.copyright_text,
    mo?.rights,
    mo?.rightsText,
    mo?.rights_text,
  ];
  for (const c of candidates) {
    if (c === undefined || c === null) continue;
    return String(c);
  }
  return null;
}

function isCheckableMediaObject(mo) {
  const rel = String(mo?.rel ?? "").toLowerCase();
  const mime = String(mo?.type ?? "").toLowerCase();
  const url = String(mo?.url ?? "").toLowerCase();

  // reine Referenzen/Links nicht prüfen
  if (rel === "canonical" || rel === "socialmedia") return false;

  // echte Medien: Bild/Video/Audio
  if (mime.startsWith("image/") || mime.startsWith("video/") || mime.startsWith("audio/")) return true;

  // Fallback: DAM-Assets
  if (url.includes("dam.destination.one/")) return true;

  return false;
}

function findMissingCopyrightMedia(item) {
  const mos = item?.media_objects;
  if (!Array.isArray(mos) || mos.length === 0) return { checkable: [], missing: [] };

  const checkable = mos.filter(isCheckableMediaObject);
  const missing = [];

  for (const mo of checkable) {
    const c = getMediaCopyrightText(mo);
    if (c === null) {
      missing.push({
        rel: mo?.rel ?? "",
        id: mo?.id ?? "",
        url: mo?.url ?? "",
        reason: "missing-field",
      });
      continue;
    }
    if (String(c).trim() === "") {
      missing.push({
        rel: mo?.rel ?? "",
        id: mo?.id ?? "",
        url: mo?.url ?? "",
        reason: "empty",
      });
    }
  }

  return { checkable, missing };
}

/* ------------------------- UI helpers ------------------------- */

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

function addRow({ id, title, pagesLinks, checkableCount, missingList }) {
  const links = Array.isArray(pagesLinks) ? pagesLinks : [];
  const linksHtml = links.length
    ? `<div style="margin-top:6px; display:flex; flex-wrap:wrap; gap:10px;">
        ${links
          .map((u, i) => `<a href="${esc(u)}" target="_blank" rel="noopener noreferrer">Pages ${i + 1}</a>`)
          .join("")}
      </div>`
    : `<div style="margin-top:6px; opacity:.7;">(kein Pages-Link ableitbar)</div>`;

  const missingShort = (missingList || [])
    .slice(0, 6)
    .map((m) => `${m.rel || "?"}:${m.id || "?"}`)
    .join(", ");

  const missingHtml = (missingList || []).length
    ? `<div style="margin-top:6px; font-size:12px; opacity:.9;">
         <strong>Fehlend:</strong> ${(missingList || []).length}/${checkableCount}
         <div style="opacity:.85;">${esc(missingShort)}${(missingList || []).length > 6 ? " …" : ""}</div>
       </div>`
    : "";

  const tr = document.createElement("tr");
  tr.innerHTML = `
    <td><code>${esc(id)}</code></td>
    <td>${esc(title)}${linksHtml}${missingHtml}</td>
    <td>${esc(checkableCount)} prüfbar / ${esc((missingList || []).length)} fehlend</td>
  `;
  el("tbody").appendChild(tr);
}

function toCsv(rows) {
  const header = [
    "global_id",
    "title",
    "type",
    "pages_link_1",
    "pages_link_2",
    "checkable_media_count",
    "missing_media_count",
    "missing_media_ids",
    "missing_media_rels",
  ];
  const lines = [header.join(",")];

  for (const r of rows) {
    const links = Array.isArray(r.pagesLinks) ? r.pagesLinks : [];
    const missing = Array.isArray(r.missingMedia) ? r.missingMedia : [];

    const line = [
      `"${String(r.id).replaceAll('"', '""')}"`,
      `"${String(r.title).replaceAll('"', '""')}"`,
      `"${String(r.type).replaceAll('"', '""')}"`,
      `"${String(links[0] ?? "").replaceAll('"', '""')}"`,
      `"${String(links[1] ?? "").replaceAll('"', '""')}"`,
      String(r.checkableCount ?? 0),
      String(missing.length),
      `"${missing.map((m) => m.id).filter(Boolean).join(" | ").replaceAll('"', '""')}"`,
      `"${missing.map((m) => m.rel).filter(Boolean).join(" | ").replaceAll('"', '""')}"`,
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

function idsFingerprint(items, n = 40) {
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

  const baseUrlRaw = el("baseUrl").value.trim() || "https://meta.et4.de/rest.ashx/search/";
  const baseUrl = baseUrlRaw.replace(/\/?$/, "/");

  const experience = el("experience").value.trim();
  const template = el("template").value.trim() || "ET2022A.json";
  const licensekey = el("licensekey").value.trim();

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

  // ET4-Typen (ohne City/Area) – API-entlastend.
  const defaultTypes = ["POI", "Tour", "Gastro", "Hotel", "Event", "Package", "Article", "Web"];

  let types = [];
  if (!typesInput || typesInput.toLowerCase() === "all") {
    types = defaultTypes.slice();
  } else {
    types = typesInput
      .split(",")
      .map((t) => normalizeType(t))
      .filter(Boolean);
  }

  // Exclusions sicher
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
    const maxPagesSafety = 5000;

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

        // Safety: offset ignoriert -> gleiche Seite kommt wieder
        const fp = idsFingerprint(items);
        if (prevFingerprint && fp && fp === prevFingerprint) {
          throw new Error(`Pagination ignored for type=${type} (same page repeated). Check API params/template.`);
        }
        prevFingerprint = fp;

        for (const it of items) {
          const itemType = getType(it);
          if (isExcludedTypeName(itemType)) continue; // falls doch geliefert

          processed++;
          el("progress").textContent = `${processed}/?`;

          const id = extractId(it);
          const title = extractTitle(it);

          const { checkable, missing } = findMissingCopyrightMedia(it);

          // Nur melden, wenn es prüfbare Medien gibt UND mindestens eins fehlt
          if (checkable.length > 0 && missing.length > 0) {
            const pagesLinks = buildPagesLinks(it, experience);

            lastMissing.push({
              id,
              title,
              type: itemType || type,
              pagesLinks,
              checkableCount: checkable.length,
              missingMedia: missing,
            });

            addRow({
              id,
              title,
              pagesLinks,
              checkableCount: checkable.length,
              missingList: missing,
            });

            el("missingCount").textContent = String(lastMissing.length);
          }
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
    log(`\nDone. Processed=${processed}. Findings=${lastMissing.length}.`);
  } catch (e) {
    setStatus("error", "err");
    log("Error: " + String(e?.message || e));
  } finally {
    setButtons(false);
    currentAbort = null;
  }
});
