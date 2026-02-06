/* Copyright_Checker/script.js
   - Findet Datensätze, bei denen mindestens ein Bild/Video in media_objects
     kein (oder leeres) copyrightText hat.
   - Pagination: limit/offset
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

function extractId(item) {
  if (item?.global_id != null) return String(item.global_id);
  if (item?.globalId != null) return String(item.globalId);
  if (item?.id != null && item?.channel != null) return `${String(item.channel)}_${String(item.id)}`;
  if (item?.id != null) return String(item.id);
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
  const header = ["id", "title", "type", "missing_media_count", "missing_media_rel_ids", "pages_link"];
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

el("stopBtn").addEventListener("clic
