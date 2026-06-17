import { $, buildParams, fetchJson, downloadText, rateLimit, extractItems, extractTotal, extractId, createStatusSetter } from '../lib/browser.js';

const ui = {
  runBtn: $('runBtn'),
  stopBtn: $('stopBtn'),
  downloadAllBtn: $('downloadAllBtn'),
  downloadIndexBtn: $('downloadIndexBtn'),
};

const el = (id) => document.getElementById(id);

const setStatus = createStatusSetter(el('status'));

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseTypes(raw) {
  return String(raw || '').split(',').map((s) => s.trim()).filter(Boolean);
}

function prettySnippet(obj, maxLen = 700) {
  const s = JSON.stringify(obj, null, 2);
  return s.length <= maxLen ? s : `${s.slice(0, maxLen)}\n…`;
}

function getItemId(item) {
  if (!item || typeof item !== 'object') return '';
  if (item.id != null) return String(item.id);
  if (item.Id != null) return String(item.Id);
  if (item.ID != null) return String(item.ID);
  if (item.global_id != null) return String(item.global_id);
  if (item.globalId != null) return String(item.globalId);
  return extractId(item);
}

function getNumericId(id) {
  const value = String(id || '').trim();
  if (/^\d+$/.test(value)) return value;
  return value.match(/^[A-Za-z]+_(\d+)$/)?.[1] || '';
}

function createSearchUrl(baseUrl, params) {
  const query = buildParams(params);
  if (!query) return baseUrl;
  return `${baseUrl}${String(baseUrl).includes('?') ? '&' : '?'}${query}`;
}

function downloadResults(results) {
  for (const r of results) {
    downloadText(`${r.id}.json`, JSON.stringify(r.json, null, 2), 'application/json;charset=utf-8');
  }
}

function renderLog(message) {
  const box = el('logBox');
  if (!box) return;
  box.textContent += message + '\n';
  box.scrollTop = box.scrollHeight;
}

function setButtons(running) {
  if (ui.runBtn) ui.runBtn.disabled = running;
  if (ui.stopBtn) ui.stopBtn.disabled = !running;
}

async function collectIdsForType({ baseUrl, experience, template, licensekey, type, need, limiter, abortSignal }) {
  const ids = new Set();
  const limit = 100;

  await rateLimit(limiter.minIntervalMs, limiter.state);
  const probe = await fetchJson(baseUrl, {
    experience,
    template,
    licensekey,
    type,
    q: '',
    limit: 1,
    offset: 0,
  }, abortSignal);

  const total = extractTotal(probe);
  const maxOffset = total && total > 0 ? Math.max(0, total - limit) : 5000;
  let offset = Math.floor(Math.random() * (maxOffset + 1));
  const pagesNeeded = Math.ceil(need / limit);
  const requestBudget = Math.max(15, pagesNeeded * 6);

  for (let req = 0; req < requestBudget && ids.size < need; req++) {
    await rateLimit(limiter.minIntervalMs, limiter.state);

    const payload = await fetchJson(baseUrl, {
      experience,
      template,
      licensekey,
      type,
      q: '',
      limit,
      offset,
    }, abortSignal);

    const items = extractItems(payload);
    let added = 0;

    for (const it of items) {
      const id = getItemId(it);
      if (id && !ids.has(id)) {
        ids.add(id);
        added++;
      }
      if (ids.size >= need) break;
    }

    renderLog(`IDs ${type}: offset=${offset} items=${items.length} +${added} unique=${ids.size}/${need}`);
    offset += limit;
    if (offset > maxOffset) offset = 0;
    if (!items.length) break;
  }

  return Array.from(ids);
}

async function fetchDetailById({ baseUrl, experience, template, licensekey, type, id, limiter, abortSignal }) {
  const value = String(id || '').trim();
  const numericId = getNumericId(value);
  const queries = [
    numericId ? `id:${numericId}` : '',
    value && value !== numericId ? `id:${value}` : '',
    value ? `global_id:${value}` : '',
    value ? `global_id:"${value}"` : '',
  ].filter(Boolean);

  for (const q of Array.from(new Set(queries))) {
    await rateLimit(limiter.minIntervalMs, limiter.state);

    const payload = await fetchJson(baseUrl, {
      experience,
      template,
      licensekey,
      type,
      q,
      limit: 1,
      offset: 0,
    }, abortSignal);

    const items = extractItems(payload);
    if (items.length) {
      return {
        item: items[0],
        query: q,
      };
    }
  }

  return {
    item: null,
    query: queries[0] || '',
  };
}

function createRow({ type, id, url, jsonSnippet }) {
  const tr = document.createElement('tr');

  const typeCell = document.createElement('td');
  typeCell.textContent = type;

  const idCell = document.createElement('td');
  const idPill = document.createElement('span');
  idPill.className = 'id';
  idPill.textContent = id;
  idCell.appendChild(idPill);

  const urlCell = document.createElement('td');
  const link = document.createElement('a');
  link.href = url;
  link.target = '_blank';
  link.rel = 'noopener';
  link.textContent = url;
  urlCell.appendChild(link);

  const jsonCell = document.createElement('td');
  const pre = document.createElement('pre');
  pre.textContent = jsonSnippet;
  jsonCell.appendChild(pre);

  tr.append(typeCell, idCell, urlCell, jsonCell);
  el('tbody').appendChild(tr);
}

async function init() {
  let stopRequested = false;
  let lastResults = [];
  let currentAbort = null;

  function stop() {
    stopRequested = true;
    if (currentAbort) currentAbort.abort();
    renderLog('Stop requested.');
  }

  ui.downloadAllBtn?.addEventListener('click', () => {
    downloadResults(lastResults);
  });

  ui.downloadIndexBtn?.addEventListener('click', () => {
    const index = lastResults.map(({ type, id, url }) => ({ type, id, url }));
    downloadText('urls.json', JSON.stringify(index, null, 2), 'application/json;charset=utf-8');
  });

  ui.stopBtn?.addEventListener('click', stop);

  ui.runBtn?.addEventListener('click', async () => {
    el('tbody').innerHTML = '';
    el('logBox').textContent = '';
    ui.setStatus = setStatus;
    setStatus('ready', 'run');
    stopRequested = false;
    lastResults = [];
    currentAbort = new AbortController();

    const baseUrl = el('baseUrl').value.trim() || 'https://meta.et4.de/rest.ashx/search/';
    const experience = el('experience').value.trim();
    const template = el('template').value.trim() || 'ET2022A.json';
    const licensekey = el('licensekey').value.trim();
    const types = parseTypes(el('types').value || '');

    if (!experience) { setStatus('Missing experience.', 'err'); return; }
    if (!types.length) { setStatus('Missing types.', 'err'); return; }

    const targetCount = Math.max(1, Math.min(500, parseInt(el('targetCount').value, 10) || 20));
    const rateRaw = parseFloat(el('rate').value);
    const rate = Math.max(0.1, Math.min(2, Number.isFinite(rateRaw) ? rateRaw : 2));
    el('rate').value = String(rate);
    const minIntervalMs = Math.ceil(1000 / rate);

    let plan;
    try {
      plan = JSON.parse(el('plan').value || '{}');
      let sum = 0;
      for (const type of types) {
        const n = Number(plan[type] ?? 0);
        if (!Number.isFinite(n) || n < 0) throw new Error(`Invalid plan value for ${type}`);
        plan[type] = Math.floor(n);
        sum += plan[type];
      }
      if (sum !== targetCount) throw new Error(`Plan sum (${sum}) must equal target (${targetCount}).`);
    } catch {
      const base = Math.floor(targetCount / types.length);
      let rest = targetCount - base * types.length;
      plan = {};
      for (const type of types) plan[type] = base;
      for (let i = 0; i < types.length && rest > 0; i += 1, rest -= 1) plan[types[i]] += 1;
    }

    setStatus('running', 'run');
    renderLog(`baseUrl=${baseUrl}`);
    renderLog(`experience=${experience}`);
    renderLog(`template=${template}`);
    renderLog(`licensekey=${licensekey ? '[set]' : '[empty]'}`);
    renderLog(`types=${types.join(',')}`);
    renderLog(`target=${targetCount}`);
    renderLog(`rate=${rate} req/s (minInterval=${minIntervalMs}ms)`);
    renderLog(`plan=${JSON.stringify(plan)}`);
    setButtons(true);

    try {
      const limiter = { minIntervalMs, state: { lastStart: -1e9 } };
      const idPool = [];

      for (const type of types) {
        if (stopRequested) throw new Error('Stopped by user.');
        const need = plan[type] || 0;
        if (!need) continue;
        const ids = await collectIdsForType({ baseUrl, experience, template, licensekey, type, need, limiter, abortSignal: currentAbort.signal });
        renderLog(`IDs ${type}: ${ids.length}/${need}`);
        for (const id of ids) idPool.push({ type, id });
      }

      const totalToFetch = Math.min(targetCount, idPool.length);
      el('progressMeta').textContent = `0/${totalToFetch}`;
      el('bar').style.width = '0%';
      const seen = new Set();
      let done = 0;

      for (const entry of idPool) {
        if (done >= totalToFetch) break;
        if (stopRequested) throw new Error('Stopped by user.');
        const key = `${entry.type}:${entry.id}`;
        if (seen.has(key)) continue;
        seen.add(key);

        const { item: detail, query } = await fetchDetailById({ baseUrl, experience, template, licensekey, type: entry.type, id: entry.id, limiter, abortSignal: currentAbort.signal });
        if (!detail) {
          renderLog(`Warning: no detail found for ${entry.type}:${entry.id}`);
          continue;
        }

        const url = createSearchUrl(baseUrl, {
          experience,
          template,
          licensekey,
          type: entry.type,
          q: query,
          limit: 1,
          offset: 0,
        });

        lastResults.push({ type: entry.type, id: entry.id, url, json: detail });
        createRow({ type: entry.type, id: entry.id, url, jsonSnippet: prettySnippet(detail) });

        done += 1;
        el('countLabel').textContent = String(lastResults.length);
        el('progressMeta').textContent = `${done}/${totalToFetch}`;
        el('bar').style.width = `${Math.max(0, Math.min(100, (done / totalToFetch) * 100))}%`;
      }

      if (done < targetCount) {
        setStatus(`partial: only ${done}/${targetCount}`, 'run');
        renderLog(`Warning: only ${done}/${targetCount} fetched (ID pool too small).`);
      } else {
        setStatus('done', 'ok');
      }

      ui.downloadAllBtn.disabled = lastResults.length === 0;
      ui.downloadIndexBtn.disabled = lastResults.length === 0;
      el('phaseLabel').textContent = 'done';
    } catch (error) {
      setStatus(`Error: ${String(error.message || error)}`, 'err');
      renderLog(`Error: ${String(error.message || error)}`);
      el('phaseLabel').textContent = 'stopped';
    } finally {
      setButtons(false);
      currentAbort = null;
    }
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
