/**
 * update-pagesbuilder-xml.mjs
 * -----------------------------------------------------------------------------
 * Lädt Areas und Cities über den bestehenden Proxy und schreibt die Ergebnisse
 * als statische XML-Dateien in Pages-Builder/data/.
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
  areas: `${PROXY_BASE}?type=Area`,            // erwartet XML
  cities: `${PROXY_BASE}?type=City&limit=1000` // sollte idealerweise XML liefern
};

async function fetchText(url) {
  const res = await fetch(url, {
    headers: { Accept: "application/xml,text/xml;q=0.9,*/*;q=0.8" },
  });
  if (!res.ok) throw new Error(`${url} -> HTTP ${res.status}`);
  return await res.text();
}

function looksLikeXml(text) {
  const t = (text || "").trim();
  return t.startsWith("<") || t.startsWith("<?xml");
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

  // Harte Validierung: Für Repo-Dateien wollen wir XML.
  // Wenn dein Proxy aktuell Cities als JSON ausliefert (AUTO), bitte Proxy anpassen,
  // damit Cities ebenfalls XML liefert – dann wird hier einfach 1:1 gespeichert.
  if (!looksLikeXml(areasText)) {
    throw new Error("Areas response is not XML. Proxy should return XML for type=Area.");
  }
  if (!looksLikeXml(citiesText)) {
    throw new Error(
      "Cities response is not XML. For repo storage, proxy should return XML for type=City."
    );
  }

  const areasPath = path.join(OUT_DIR, "areas.xml");
  const citiesPath = path.join(OUT_DIR, "cities.xml");

  await writeFileAtomic(areasPath, areasText);
  await writeFileAtomic(citiesPath, citiesText);

  console.log("✅ Updated:");
  console.log(" -", areasPath);
  console.log(" -", citiesPath);
}

main().catch((err) => {
  console.error("❌ update-pagesbuilder-xml failed:", err.message);
  process.exit(1);
});
