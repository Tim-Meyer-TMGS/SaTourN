/**
 * update-pagesbuilder-json.mjs
 * -----------------------------------------------------------------------------
 * Lädt Areas und Cities über den bestehenden Proxy und schreibt die Ergebnisse
 * als statische JSON-Dateien in Pages-Builder/data/.
 *
 * Motivation:
 *  - Pages-Builder soll primär aus Repo-Dateien laden (schnell, unabhängig).
 *  - Proxy bleibt nur Fallback zur Laufzeit.
 *
 * Hinweis:
 *  - Der Proxy ist die "Single Source of Truth" für ET4/meta-Anbindung.
 *  - Dieses Script speichert 1:1, was der Proxy liefert.
 */

import fs from "node:fs/promises";
import path from "node:path";

const PROXY_BASE = "https://satourn.onrender.com/api/search";
const OUT_DIR = path.resolve("Pages-Builder/data");

const URLS = {
  areas: `${PROXY_BASE}?type=Area`,
  cities: `${PROXY_BASE}?type=City&limit=1000`
};

async function fetchText(url) {
  const res = await fetch(url, {
    headers: { Accept: "application/json,*/*;q=0.8" },
  });
  if (!res.ok) throw new Error(`${url} -> HTTP ${res.status}`);
  return await res.text();
}

function parseAndFormatJson(text, label) {
  try {
    return `${JSON.stringify(JSON.parse(text), null, 2)}\n`;
  } catch {
    throw new Error(`${label} response is not JSON. Proxy should return JSON for this type.`);
  }
}

async function writeFileAtomic(filePath, content) {
  const tmp = `${filePath}.tmp`;
  await fs.writeFile(tmp, content, "utf8");
  await fs.rename(tmp, filePath);
}

async function main() {
  await fs.mkdir(OUT_DIR, { recursive: true });

  const [areasText, citiesText] = await Promise.all([
    fetchText(URLS.areas),
    fetchText(URLS.cities),
  ]);

  const areasJson = parseAndFormatJson(areasText, "Areas");
  const citiesJson = parseAndFormatJson(citiesText, "Cities");

  const areasPath = path.join(OUT_DIR, "areas.json");
  const citiesPath = path.join(OUT_DIR, "cities.json");

  await writeFileAtomic(areasPath, areasJson);
  await writeFileAtomic(citiesPath, citiesJson);

  console.log("Updated:");
  console.log(" -", areasPath);
  console.log(" -", citiesPath);
}

main().catch((err) => {
  console.error("update-pagesbuilder-json failed:", err.message);
  process.exit(1);
});
