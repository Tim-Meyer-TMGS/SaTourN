/* Copyright_Checker/script.js
   - Findet Datensätze, bei denen mindestens ein Bild/Video in media_objects
     kein (oder leeres) copyrightText hat.
   - IGNORIERT Logos (rel="logo") bei der Prüfung
   - Pagination: limit/offset, ABBRUCH NUR wenn items.length < limit (oder 0)
     => total wird NICHT zum Abbruch verwendet (ET4 total ist oft nicht overall)
   - Types nacheinander (ohne City/Area)
   - Ausgabe: ID + Titel + Pages-Link + Anzahl fehlender Medien + Debug-Liste
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
  if (item?.global_id != null) return String(item.global_id);
  if (item?.globalId != null) return String(item.globalId);
  if (item?.id != null && item?.channel != null)
    return `${String(item.channel)}_${String(item.id)}`;
  if (item?.id != null) return String(item.id);
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

/* ------------------------- Type handling ------------------------- */

const CANON_TYPE = {
  poi: "POI",
  tour: "Tour",
  event: "Event",
  gastro: "Gastro",
  hotel: "Hotel",
  package: "Package",
  article: "Article",
  web: "Web",
  city: "City",
  area: "Area",

  gastronomy: "Gastro",
  accommodation: "Hotel",
  offer: "Package",
  pressrelease: "Article",
  story: "Article",
};

function normalizeTypeName(t) {
  const key = String(t ?? "").trim().toLowerCase();
  return CANON_TYPE[key] ?? String(t ?? "").trim();
}

function isExcludedTypeName(typeName) {
  const t = normalizeTypeName(typeName);
  return t === "City" || t === "Area";
}

function defaultTypesNoCityArea() {
  return ["Hotel", "Event", "Gastro", "Tour", "POI", "Package", "Article", "Web"];
}

/* ------------------------- Pages link building ------------------------- */

const PAGES_BASE = "https://pages.destination.one";
const PAGES_LANG = "de";
const PAGES_TEMPLATE = "default_withmap";

function extractUrlTitle(item) {
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

function buildPagesLink(item, pagesExperience) {
  const pagesType = normalizeTypeName(getType(item));
  const gid = extractId(item);
  const slug = extractUrlTitle(item);

  if (!pagesExperience || !pagesType || !gid || !slug) return "";

  return (
    `${PAGES_BASE}/${PAGES_LANG}/` +
    `${encodeURIComponent(pagesExperience)}/` +
    `${encodeURIComponent(PAGES_TEMPLATE)}/detail/` +
    `${encodeURIComponent(pagesType)}/` +
    `${encodeURIComponent(gid)}/` +
    `${encodeURIComponent(slug)}`
  );
}

/* ------------------------- Media copyright check ------------------------- */

function isCheckableMediaObject(mo) {
  const rel = String(mo?.rel ?? "").toLowerCase();
  const mime = String(mo?.type ?? "").toLowerCase();
  const url = String(mo?.url ?? "").toLowerCase();

  // Links nicht prüfen
  if (rel === "canonical" || rel === "socialmedia") return false;

  // Logos ignorieren (auch ohne copyrightText)
  if (rel === "logo") return false;

  // nur Bild/Video
  if (mime.startsWith("image/") || mime.startsWith("video/")) return true;

  // DAM-Fallback
  if (url.includes("dam.destination.one/")) return true;

  return false;
}

function findMissingCopyrightMedia(item) {
  const mos = Array.isArray(item?.media_objects) ? item.media_objects : [];
  const checkables = mos.filter(isCheckableMediaObject);

  const missing = [];
  for (const mo of checkables) {
    const c = mo?.copyrightText;
    if (c === undefined || c === null || String(c).trim() === "") {
      missing.push({
        rel: String(mo?.rel ?? ""),
        id: String(mo?.id ?? ""),
        url: String(mo?.url ?? ""),
      });
    }
  }
  return { checkableCount: checkables.length, missing };
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

function addRow({ id, title, pagesLink, missingMediaCount, missingMedia }) {
  const missingShort =
    missingMediaCount === 0
      ? ""
      : missingMedia
          .slice(0, 5)
          .map((m) => `${m.rel || "?"}${m.id ? " (" + m.id + ")" : ""}`)
          .join(", ");

  const more = missingMediaCount > 5 ? ` (+${missingMediaCount - 5} mehr)` : "";

  const linkHtml = pagesLink
    ? `<a href="${esc(pagesLink)}" target="_blank" rel="noopener noreferrer">Pages-Link</a>`
    : `<span style="opacity:.7;">kein Link</span>`;

  const tr = document.createElement("tr");
  tr.innerHTML = `
    <td><code>${esc(id)}</code></td>
    <td>${esc(title)}<div style="margin-top:6px;">${linkHtml}</div></td>
    <td><strong>${esc(missingMediaCount)}</strong></td>
    <td style="font-size:12px; opacity:.85;">${esc(missingShort)}${esc(more)}</td>
  `;
  el("tbody").appendChild(tr);
}

function toCsv(rows) {
  const header = [
    "id",
    "title",
    "type",
    "missing_media_count",
    "missing_media_rel_ids",
    "pages_link",
  ];
  const lines = [header.join(",")];

  for (const r of rows) {
    const relIds = (r.missingMedia || [])
      .map((m) => `${m.rel || "?"}${m.id ? ":" + m.id : ""}`)
      .join(" | ");

    const line = [
      `"${String(r.id).replaceAll('"', '""')}"`,
      `"${String(r.title).replaceAll('"', '""')}"`,
      `"${String(r.type).replaceAll('"', '""')}"`,
      String(r.missingMediaCount ?? 0),
      `"${relIds.replaceAll('"', '""')}"`,
      `"${String(r.pagesLink || "").replaceAll('"', '""')}"`,
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
  const template = (el("template").value.trim() || "ET2022A.json").trim();
  const licensekey = el("licensekey").value.trim();

  const typesInput = (el("type").value || "All").trim();

  const limit = Math.max(
    1,
    Math.min(500, parseInt(el("limit").value, 10) || 200)
  );

  const rateRaw = parseFloat(el("rate").value);
  const rate = Math.max(
    0.1,
    Math.min(2, Number.isFinite(rateRaw) ? rateRaw : 1)
  );
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

  let types = [];
  if (!typesInput || typesInput.toLowerCase() === "all") {
    types = defaultTypesNoCityArea();
  } else {
    types = typesInput
      .split(",")
      .map((t) => normalizeTypeName(t))
      .map((t) => t.trim())
      .filter(Boolean);
  }

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
    const maxPagesSafety = 12000;

    for (const type of types) {
      if (stopRequested) throw new Error("Stopped by user.");

      log(`\n=== TYPE: ${type} ===`);

      let offset = 0;
      let pageCount = 0;
      let prevFingerprint = null;

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
            limit,
            offset,
          },
          currentAbort.signal
        );

        const items = extractItems(payload);
        const total = extractTotal(payload);

        log(
          `Page: offset=${offset} items=${items.length}` +
            (total ? ` total=${total}` : "")
        );

        if (!items.length) break;

        // Schutz: falls offset ignoriert wird
        const fp = idsFingerprint(items);
        if (prevFingerprint && fp && fp === prevFingerprint) {
          throw new Error(
            `Pagination ignored for type=${type} (same page repeated).`
          );
        }
        prevFingerprint = fp;

        for (const it of items) {
          const itemType = normalizeTypeName(getType(it));
          if (isExcludedTypeName(itemType)) continue;

          processed++;
          el("progress").textContent = `${processed}/?`;

          const { checkableCount, missing } = findMissingCopyrightMedia(it);
          const missingMediaCount = missing.length;

          if (checkableCount > 0 && missingMediaCount > 0) {
            const id = extractId(it);
            const title = extractTitle(it);
            const pagesLink = buildPagesLink(it, experience);

            lastMissing.push({
              id,
              title,
              type: itemType || type,
              missingMediaCount,
              missingMedia: missing,
              pagesLink,
            });

            addRow({
              id,
              title,
              pagesLink,
              missingMediaCount,
              missingMedia: missing,
            });

            el("missingCount").textContent = String(lastMissing.length);
          }
        }

        // offset robust erhöhen
        offset += items.length;
        log(`Next offset=${offset}`);

        // ABBRUCH: letzte Seite (items < limit)
        if (items.length < limit) break;

        pageCount++;
        if (pageCount > maxPagesSafety) {
          throw new Error(
            `Safety stop: too many pages for type=${type} (check pagination).`
          );
        }
      }
    }

    setStatus("done", "ok");
    el("downloadBtn").disabled = lastMissing.length === 0;
    log(
      `\nDone. Processed=${processed}. Missing datasets=${lastMissing.length}.`
    );
  } catch (e) {
    setStatus("error", "err");
    log("Error: " + String(e?.message || e));
  } finally {
    setButtons(false);
    currentAbort = null;
  }
});
