/* ==========================
   DZT KG Finder
========================== */

/* ==========================
   Konfiguration
========================== */
const API_KEY     = '3b49f5e2f44665aec87f761d4cafb9d2';
const DS_LIST_URL = 'https://semantify.it/list/CRkyvcqGqeUu';
const FIXED_LANG  = 'de';
const PAGE_SIZE   = 10;

/* ==========================
   State
========================== */
let page = 1;
let lastQuery = '';

document.addEventListener('DOMContentLoaded', () => {
  /* ==========================
     DOM
  ========================== */
  const form     = document.getElementById('searchForm');
  const inputQ   = document.getElementById('q');
  const results  = document.getElementById('results');
  const tpl      = document.getElementById('resultTpl');
  const prevBtn  = document.getElementById('prevBtn');
  const nextBtn  = document.getElementById('nextBtn');
  const countEl  = document.getElementById('count');
  const statusEl = document.getElementById('status');
  const resetBtn = document.getElementById('resetBtn');

  /* ==========================
     UI/Helpers
  ========================== */
  function status(msg, isError = false) {
    statusEl.innerHTML = msg ? (isError ? `<span style="color:#ff6b6b">${escapeHtml(msg)}</span>` : msg) : '';
  }

  function getFirstProp(obj, keys) {
    if (!obj || typeof obj !== 'object') return undefined;
    for (const k of keys) {
      if (Object.prototype.hasOwnProperty.call(obj, k)) return obj[k];
      const hit = Object.keys(obj).find(key =>
        key.endsWith('/' + k.split(':').pop()) || key.endsWith('#' + k.split(':').pop()) || key === k
      );
      if (hit) return obj[hit];
    }
    return undefined;
  }

  function pickLangString(value) {
    if (!value) return '';
    const pick = v => typeof v === 'string' ? v : (v?.['@value'] || v?.value || '');
    if (Array.isArray(value)) {
      const byLang = value.find(v => v && (v['@language'] === FIXED_LANG || v['language'] === FIXED_LANG));
      if (byLang) return pick(byLang);
      const de = value.find(v => v && (v['@language'] === 'de' || v['language'] === 'de'));
      if (de) return pick(de);
      const any = value.find(v => v && (v['@value'] || v['value']));
      return any ? pick(any) : (typeof value[0] === 'string' ? value[0] : '');
    }
    if (typeof value === 'object') return value['@value'] || value['value'] || '';
    return typeof value === 'string' ? value : '';
  }

  function selectPrimaryNode(data, uri) {
    if (!data) return null;
    if (Array.isArray(data)) {
      const byId = data.find(n => n && (n['@id'] === uri || n['@id'] === decodeURIComponent(uri)));
      return byId || data.find(n => n && n['@type']) || data[0];
    }
    if (Array.isArray(data['@graph'])) {
      const exact = data['@graph'].find(n => n && (n['@id'] === uri || n['@id'] === decodeURIComponent(uri)));
      return exact || data['@graph'].find(n => n && n['@type']) || data['@graph'][0];
    }
    return data;
  }

  function indexGraph(data) {
    const map = new Map();
    const push = n => { if (n && typeof n === 'object' && typeof n['@id'] === 'string') map.set(n['@id'], n); };
    if (Array.isArray(data)) data.forEach(push);
    if (Array.isArray(data?.['@graph'])) data['@graph'].forEach(push);
    else if (data && typeof data === 'object') push(data);
    return map;
  }

  function fallbackTitleFromUri(uri) {
    try {
      const last = uri.split(/[/#]/).pop() || uri;
      return decodeURIComponent(last).replace(/[-_]/g, ' ');
    } catch {
      return uri;
    }
  }

  function escapeHtml(s) {
    return String(s)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;");
  }

  /* ==========================
     Bild-Auflösung aus ImageObject
  ========================== */

  function isOnlimEntityUrl(u) {
    try {
      const x = new URL(u);
      return /(^|\.)onlim\.com$/i.test(x.hostname) && /^\/entity\/[a-f0-9-]+/i.test(x.pathname);
    } catch {
      return false;
    }
  }

  async function loadImageObjectContentUrl(onlimEntityUrl) {
    try {
      const u = new URL(onlimEntityUrl);
      const id = u.pathname.split('/').pop();
      const ns = `${u.protocol}//${u.host}/entity`;

      const url = new URL(`https://proxy.opendatagermany.io/api/ts/v1/kg/things/${encodeURIComponent(id)}`);
      url.searchParams.set('ns', ns);

      const res = await fetch(url.toString(), {
        headers: { 'x-api-key': API_KEY, 'accept': 'application/json' }
      });
      if (!res.ok) return '';

      const data = await res.json();
      const arr = Array.isArray(data) ? data : (Array.isArray(data['@graph']) ? data['@graph'] : [data]);
      const imgNode = arr.find(n => n && typeof n === 'object') || {};

      const cu = imgNode['https://schema.org/contentUrl'] || imgNode['http://schema.org/contentUrl'] || imgNode['contentUrl'];
      const toStr = (v) =>
        Array.isArray(v)
          ? (typeof v[0] === 'string' ? v[0] : (v[0]?.['@value'] || v[0]?.['value'] || ''))
          : (typeof v === 'string' ? v : (v?.['@value'] || v?.['value'] || ''));

      const contentUrl = toStr(cu);
      if (contentUrl) return contentUrl;

      const urlProp = imgNode['https://schema.org/url'] || imgNode['url'];
      return toStr(urlProp) || '';
    } catch {
      return '';
    }
  }

  async function resolveImageUrlFromThing(thingUri, node, graphMap) {
    const asStr = (x) => {
      if (!x) return '';
      if (typeof x === 'string') return x;
      if (typeof x === 'object') {
        if (x['@id']) return x['@id'];
        if (x['@value'] || x['value']) return x['@value'] || x['value'];
      }
      return '';
    };

    const fromImageLikeNode = async (imgVal) => {
      if (!imgVal) return '';
      const direct = asStr(imgVal);

      // FIX: RegExp vollständig (hier war in deiner script.js der Abbruch "if (/")
      if (/^https?:\/\//i.test(direct)) {
        if (isOnlimEntityUrl(direct)) return await loadImageObjectContentUrl(direct);
        return direct;
      }

      const id = (typeof imgVal === 'object' && imgVal['@id']) ? imgVal['@id'] : '';
      if (id) {
        if (/^https?:\/\//i.test(id)) {
          if (isOnlimEntityUrl(id)) return await loadImageObjectContentUrl(id);
          return id;
        }
        if (graphMap && graphMap.has(id)) {
          const imgNode = graphMap.get(id);
          const cu = imgNode['https://schema.org/contentUrl'] || imgNode['http://schema.org/contentUrl'] || imgNode['contentUrl'];
          const u2 = imgNode['https://schema.org/url'] || imgNode['url'];
          const toStr = (v) =>
            Array.isArray(v)
              ? (typeof v[0] === 'string' ? v[0] : (v[0]?.['@value'] || v[0]?.['value'] || ''))
              : (typeof v === 'string' ? v : (v?.['@value'] || v?.['value'] || ''));
          return toStr(cu) || toStr(u2) || '';
        }
      }
      return '';
    };

    const propLists = [
      ['https://schema.org/image', 'http://schema.org/image', 'image'],
      ['https://schema.org/thumbnailUrl', 'http://schema.org/thumbnailUrl', 'thumbnailUrl'],
      ['https://schema.org/photo', 'photo'],
      ['https://schema.org/logo', 'logo'],
      ['https://schema.org/hasRepresentation', 'hasRepresentation'],
      ['https://schema.org/depiction', 'depiction']
    ];

    for (const props of propLists) {
      const hitKey = Object.keys(node || {}).find(k =>
        props.includes(k) || props.some(p => k.endsWith('/' + p) || k.endsWith('#' + p))
      );
      if (!hitKey) continue;

      const val = node[hitKey];
      if (Array.isArray(val)) {
        for (const v of val) {
          const url = await fromImageLikeNode(v);
          if (url) return url;
        }
      } else {
        const url = await fromImageLikeNode(val);
        if (url) return url;
      }
    }
    return '';
  }

  /* ==========================
     API Calls
  ========================== */
  async function queryThings({ kw }) {
    const url = new URL('https://proxy.opendatagermany.io/api/ts/v2/kg/things');
    if (kw) url.searchParams.set('kw', kw);
    url.searchParams.set('filterDsList', DS_LIST_URL);

    const res = await fetch(url.toString(), {
      headers: {
        'x-api-key': API_KEY,
        'accept': 'application/json',
        'inLang': FIXED_LANG,
        'page': String(page),
        'page-size': String(PAGE_SIZE)
      }
    });
    if (!res.ok) throw new Error(`Suche fehlgeschlagen (${res.status})`);

    const data = await res.json();
    const items = Array.isArray(data) ? data
      : Array.isArray(data?.data) ? data.data
      : Array.isArray(data?.items) ? data.items
      : Array.isArray(data?.results) ? data.results
      : [];
    return items;
  }

  async function fetchThingById(uri) {
    if (!uri) return null;
    const p = Math.max(uri.lastIndexOf('/'), uri.lastIndexOf('#'));
    const ns = uri.substring(0, p);
    const id = uri.substring(p + 1);

    const url = new URL(`https://proxy.opendatagermany.io/api/ts/v1/kg/things/${encodeURIComponent(id)}`);
    url.searchParams.set('ns', ns);

    const res = await fetch(url.toString(), {
      headers: { 'x-api-key': API_KEY, 'accept': 'application/json', 'inLang': FIXED_LANG, 'x-hop': '3' }
    });
    if (!res.ok) throw new Error(`Abruf fehlgeschlagen (${res.status})`);

    const data = await res.json();
    return { uri, data };
  }

  /* ==========================
     Suche & Rendering
  ========================== */
  function makeKbrLandingUrl(thingUri) {
    const u = new URL('https://app.opendatagermany.io/kbr/landingpage');
    u.searchParams.set('kbr-entity', thingUri);
    u.searchParams.set('lang', FIXED_LANG);
    return u.toString();
  }

  async function renderItem(entry) {
    const { uri, data } = entry;
    const node = selectPrimaryNode(data, uri) || data || {};
    const graphMap = indexGraph(data);
    const el = tpl.content.firstElementChild.cloneNode(true);

    const nameVal = getFirstProp(node, ['https://schema.org/name', 'http://schema.org/name', 'schema:name', 'name', 'rdfs:label']);
    const name = pickLangString(nameVal) || fallbackTitleFromUri(uri);
    el.querySelector('[data-role=title]').textContent = name || 'Ohne Titel';

    let cat = '';
    const typesNode = Array.isArray(node['@type']) ? node['@type'] : (node['@type'] ? [node['@type']] : []);
    if (typesNode.length) {
      cat = typesNode
        .map(t => (typeof t === 'string' ? t : (t['@id'] || '')))
        .map(t => t.split(/[#/]/).pop())
        .filter(Boolean)
        .join(', ');
    } else {
      const catVal = getFirstProp(node, ['https://schema.org/category', 'http://schema.org/category', 'schema:category', 'category']);
      cat = pickLangString(catVal) || '';
    }
    el.querySelector('[data-role=cat]').textContent = cat || '—';

    const landing = makeKbrLandingUrl(uri);
    const a = el.querySelector('[data-role=id]');
    a.href = landing;
    a.textContent = landing;

    const thumb = el.querySelector('[data-role=thumb]');
    try {
      const imgUrl = await resolveImageUrlFromThing(uri, node, graphMap);
      if (imgUrl) {
        const img = new Image();
        img.alt = name || 'Bild';
        img.loading = 'lazy';
        img.decoding = 'async';
        img.onload = () => { thumb.innerHTML = ''; thumb.appendChild(img); };
        img.onerror = () => { thumb.innerHTML = `<a href="${landing}" target="_blank" rel="noopener">Bild öffnen</a>`; };
        img.src = imgUrl;
      } else {
        thumb.innerHTML = `<a href="${landing}" target="_blank" rel="noopener">Bild öffnen</a>`;
      }
    } catch {
      thumb.innerHTML = `<a href="${landing}" target="_blank" rel="noopener">Bild öffnen</a>`;
    }

    results.appendChild(el);
  }

  async function search(query) {
    results.innerHTML = '';
    status(`<span class="spinner"></span> Lädt…`);
    prevBtn.disabled = true;
    nextBtn.disabled = true;
    countEl.textContent = '';

    try {
      let things = await queryThings({ kw: query });
      if (!things.length) {
        status('Keine Treffer. Begriff ändern.');
        return;
      }

      const detailed = await Promise.all(things.map(t => fetchThingById(t['@id']).catch(() => null)));
      for (const entry of detailed.filter(Boolean)) {
        await renderItem(entry);
      }

      status(`${things.length} Treffer.`);
      prevBtn.disabled = page === 1;
      nextBtn.disabled = things.length < PAGE_SIZE;
      countEl.textContent = `Seite ${page}`;
    } catch (err) {
      console.error(err);
      status(err?.message || 'Unerwarteter Fehler', true);
    }
  }

  /* ==========================
     Events
  ========================== */
  prevBtn.addEventListener('click', () => {
    if (page > 1) { page--; search(lastQuery); }
  });

  nextBtn.addEventListener('click', () => {
    page++;
    search(lastQuery);
  });

  resetBtn.addEventListener('click', () => {
    inputQ.value = '';
    page = 1;
    lastQuery = '';
    results.innerHTML = '';
    countEl.textContent = '';
    status('');
    prevBtn.disabled = true;
    nextBtn.disabled = true;
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    page = 1;
    lastQuery = inputQ.value.trim();
    search(lastQuery);
  });
});
