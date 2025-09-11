// index.js
import express from 'express';
import cors    from 'cors';
import fetch   from 'node-fetch';
import dotenv  from 'dotenv';
import compression from 'compression';

dotenv.config();

const app  = express();
const PORT = process.env.PORT || 3000;

/* ----------------------------- kleine Utilities ----------------------------- */

// sehr einfacher In-Memory Cache (optional, v.a. für Cities)
const CACHE_TTL_MS = 60 * 60 * 1000; // 1h
const cache = new Map(); // key -> { expires:number, body:string }
const getCache = (key) => {
  const hit = cache.get(key);
  if (!hit) return null;
  if (Date.now() > hit.expires) { cache.delete(key); return null; }
  return hit.body;
};
const setCache = (key, body, ttlMs = CACHE_TTL_MS) => {
  cache.set(key, { expires: Date.now() + ttlMs, body });
};

// Erlaubt große Limits nur für City-Abrufe
const BIG_LIMIT_TYPES = new Set(['city', 'cities', 'orte', 'staedte']); // passe bei Bedarf an
const MAX_LIMIT_BIG   = 1000; // für Cities
const MAX_LIMIT_SMALL = 200;  // für alles andere

function normalizeLimit(type, requested) {
  const want = Number(requested);
  const isBigType = BIG_LIMIT_TYPES.has(String(type || '').toLowerCase());

  if (Number.isFinite(want)) {
    return isBigType ? Math.min(want, MAX_LIMIT_BIG) : Math.min(want, MAX_LIMIT_SMALL);
  }
  // falls kein limit übergeben wurde: für Cities 1000, sonst 200 (oder weglassen – hier bewusst gesetzt)
  return isBigType ? MAX_LIMIT_BIG : MAX_LIMIT_SMALL;
}

/* --------------------------------- Middleware -------------------------------- */

app.use(cors());
app.options('*', cors());
app.use(express.json());
app.use(compression()); // 🚀 spart Bandbreite/RAM

/* --------------------------------- Healthcheck -------------------------------- */

app.get('/', (req, res) => {
  res.send('✅ SaTourN-Proxy alive');
});

/* --------------------------------- API-Proxy --------------------------------- */

app.get('/api/search', async (req, res) => {
  const { type, query = '', isOpenData = 'false', limit } = req.query;
  const licenseKey = process.env.LICENSE_KEY;

  if (!licenseKey) {
    console.error('⚠️ LICENSE_KEY fehlt!');
    return res.status(500).send('Server-Error: LICENSE_KEY fehlt');
  }

  // qParam korrekt zusammenbauen (ohne doppeltes Encoding)
  let qParam = '';
  if (query.startsWith('&q=')) {
    qParam = query.slice(3); // roher Teil
  } else {
    qParam = query;          // z.B. 'area:"XYZ"'
  }

  if (isOpenData === 'true') {
    // CC0 / CC-BY / CC-BY-SA filtern
    qParam += '+AND+attribute_license%3A(CC0+OR+CC-BY+OR+CC-BY-SA)';
  }

  // Limit regelbasiert anwenden (Cities dürfen groß, Rest capped)
  const finalLimit = normalizeLimit(type, limit);

  // Ziel-URL
  const targetUrl =
    'https://meta.et4.de/rest.ashx/search/' +
    `?experience=statistik_sachsen` +
    `&licensekey=${licenseKey}` +
    `&type=${encodeURIComponent(type || '')}` +
    `&q=${qParam}` +                // ⚠️ NICHT nochmal encodeURIComponent
    `&template=ET2014A.xml` +
    `&limit=${finalLimit}`;

  // Cache-Key (inkl. finalLimit, damit capped/uncapped unterschieden wird)
  const cacheKey = targetUrl;

  console.log('👉 Proxy leitet weiter an:', targetUrl);

  // 1) Cache-Hit?
  const cached = getCache(cacheKey);
  if (cached) {
    res.type('application/xml').send(cached);
    return;
  }

  // 2) Upstream call mit Timeout/Abort (stabiler gegen Hänger)
  try {
    const controller = new AbortController();
    const timeoutMs = 15000; // 15s; passe an Render-Plan an
    const t = setTimeout(() => controller.abort(), timeoutMs);

    const response = await fetch(targetUrl, { signal: controller.signal });
    clearTimeout(t);

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      console.error('🔥 Upstream-Error:', response.status, errText);
      return res.status(response.status).type('text/plain').send(errText || 'Upstream error');
    }

    // XML als Text puffern (damit wir cachen können). Wenn du echtes Streaming willst,
    // könntest du hier response.body.pipe(res) nutzen – dann aber ohne Cache.
    const text = await response.text();

    // nur City-Antworten cachen (typisch wiederholte Abrufe)
    if (BIG_LIMIT_TYPES.has(String(type || '').toLowerCase())) {
      setCache(cacheKey, text);
    }

    res.type('application/xml').send(text);
  } catch (err) {
    const isAbort = err && (err.name === 'AbortError' || /aborted|timeout/i.test(String(err)));
    console.error('🔥 Fetch-Error:', err);
    return res.status(isAbort ? 504 : 500).send(`Fetch-Error: ${err.message || err}`);
  }
});

/* ----------------------------------- Start ----------------------------------- */

app.listen(PORT, () => {
  console.log(`Proxy-Server läuft auf Port ${PORT}`);
});
