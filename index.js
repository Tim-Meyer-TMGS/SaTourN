// index.js
import express from 'express';
import cors    from 'cors';
import fetch   from 'node-fetch';
import dotenv  from 'dotenv';

dotenv.config();

const app  = express();
const PORT = process.env.PORT || 3000;

/* ----------------------------- Konfiguration ----------------------------- */

const MAX_LIMIT_CITIES = Number(process.env.MAX_LIMIT_CITIES || 1000);
const MAX_LIMIT_OTHERS = Number(process.env.MAX_LIMIT_OTHERS || 200);

// Welche type-Werte gelten als "Cities"?
const BIG_LIMIT_TYPES = new Set(['city', 'cities', 'orte', 'staedte']);

/* ----------------------------- Utilities ----------------------------- */

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

// Heuristik: erkennt "Cities" in der Query
function looksLikeCitiesQuery(qParamRaw = '') {
  const q = (qParamRaw || '').toLowerCase();
  return (
    q.includes('facet:city') ||
    q.includes('city:') ||
    q.includes('cities:') ||
    q.includes('typ:stadt') ||
    q.includes('type:city')
  );
}

// Entscheidet, ob großes Limit erlaubt ist
function isCitiesRequest({ scope, type, qParam, forceCities }) {
  if (forceCities) return true; // Harte Override-Regel
  const scopeIsCities = String(scope || '').toLowerCase().trim() === 'cities';
  const typeIsCities  = BIG_LIMIT_TYPES.has(String(type || '').toLowerCase().trim());
  const heuristics    = looksLikeCitiesQuery(qParam);
  return scopeIsCities || typeIsCities || heuristics;
}

function computeFinalLimit({ requestedLimit, isCities }) {
  const want = Number(requestedLimit);
  if (Number.isFinite(want)) {
    return isCities ? Math.min(want, MAX_LIMIT_CITIES) : Math.min(want, MAX_LIMIT_OTHERS);
  }
  // kein Limit angefragt -> Defaults
  return isCities ? MAX_LIMIT_CITIES : MAX_LIMIT_OTHERS;
}

/* --------------------------------- Middleware -------------------------------- */

app.use(cors());
app.options('*', cors());
app.use(express.json());

/* --------------------------------- Healthcheck -------------------------------- */

app.get('/', (req, res) => {
  res.send('✅ SaTourN-Proxy alive');
});

/* --------------------------------- API-Proxy --------------------------------- */

app.get('/api/search', async (req, res) => {
  const { type, query = '', isOpenData = 'false', limit, scope, forceCities } = req.query;
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

  // robuste Cities-Erkennung (+ manueller Not-Schalter)
  const cities = isCitiesRequest({
    scope,
    type,
    qParam,
    forceCities: String(forceCities || '') === '1'
  });

  const finalLimit = computeFinalLimit({ requestedLimit: limit, isCities: cities });

  // Ziel-URL (‼️ limit VOR template)
  const targetUrl =
    'https://meta.et4.de/rest.ashx/search/' +
    `?experience=statistik_sachsen` +
    `&licensekey=${licenseKey}` +
    `&type=${encodeURIComponent(type || '')}` +
    `&q=${qParam}` +                 // ⚠️ NICHT nochmal encodeURIComponent
    `&limit=${finalLimit}` +         // <- zuerst limit
    `&template=ET2014A.xml`;         // <- dann template

  // Logging zur Ursachenklärung
  const diag = {
    scope: scope || null,
    type: (type || '').trim() || null,
    requestedLimit: limit || null,
    isCities: cities,
    reason: {
      scope: String(scope || '').toLowerCase().trim() === 'cities',
      type: BIG_LIMIT_TYPES.has(String(type || '').toLowerCase().trim()),
      heuristics: looksLikeCitiesQuery(qParam),
      forceCities: String(forceCities || '') === '1'
    },
    finalLimit
  };
  console.log('👉 /api/search DIAG', JSON.stringify(diag, null, 2));
  console.log('➡️  Proxy →', targetUrl);

  // Sichtbar machen, welches Limit angewendet wurde
  res.setHeader('X-Final-Limit', String(finalLimit));
  res.setHeader('X-Is-Cities', String(cities));

  // Cache nur für Cities (häufige Abrufe)
  const cacheKey = cities ? targetUrl : null;
  if (cacheKey) {
    const cached = getCache(cacheKey);
    if (cached) {
      res.type('application/xml').send(cached);
      return;
    }
  }

  try {
    const controller = new AbortController();
    const timeoutMs = 15000;
    const t = setTimeout(() => controller.abort(), timeoutMs);

    const response = await fetch(targetUrl, { signal: controller.signal });
    clearTimeout(t);

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      console.error('🔥 Upstream-Error:', response.status, errText);
      return res.status(response.status).type('text/plain').send(errText || 'Upstream error');
    }

    const text = await response.text();
    if (cacheKey) setCache(cacheKey, text);
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
