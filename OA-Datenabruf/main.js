import { $ } from '../lib/browser.js';
import { fetchText } from '../lib/browser.js';
import { loadJson, saveJson } from '../lib/browser.js';
import { downloadText } from '../lib/browser.js';

const API_BASE = 'https://api-oa.com/api/v2/project/';
const PARALLEL_DEFAULT = 4;
const STORAGE_KEY = 'oaDataLookup.settings';

const ui = {
  statusPill: $('statusPill'),
  statusText: $('statusText'),
  projectKey: $('projectKey'),
  apiKey: $('apiKey'),
  rememberKey: $('rememberKey'),
  display: $('display'),
  ids: $('ids'),
  runBtn: $('runBtn'),
  downloadBtn: $('downloadBtn'),
  viewer: $('viewer'),
};

const state = {
  lastJson: '',
};

function setStatus(kind, text) {
  ui.statusPill.className = `pill ${kind}`;
  ui.statusText.textContent = text;
}

function parseIds(raw) {
  return String(raw || '')
    .split(/[\s,;]+/g)
    .map((value) => value.trim())
    .filter(Boolean);
}

function buildContentUrl({ projectKey, id, display, apiKey }) {
  const base = API_BASE.replace(/\/+$/, '') + '/';
  const project = encodeURIComponent(String(projectKey).trim());
  const idSegment = encodeURIComponent(String(id).trim());
  const url = new URL(`${base}${project}/contents/${idSegment}`);

  if (display) url.searchParams.set('display', display);
  url.searchParams.set('format', 'json');
  url.searchParams.set('key', apiKey);

  return url.toString();
}

function persist() {
  const payload = {
    projectKey: ui.projectKey.value || '',
    display: ui.display.value || 'verbose',
    rememberKey: !!ui.rememberKey.checked,
    apiKey: ui.rememberKey.checked ? ui.apiKey.value || '' : '',
  };
  saveJson(STORAGE_KEY, payload);
}

function hydrate() {
  const stored = loadJson(STORAGE_KEY, {
    projectKey: 'api-sachsen',
    display: 'verbose',
    rememberKey: false,
    apiKey: '',
  });

  ui.projectKey.value = stored.projectKey || 'api-sachsen';
  ui.display.value = stored.display || 'verbose';
  ui.rememberKey.checked = !!stored.rememberKey;
  if (ui.rememberKey.checked && stored.apiKey) {
    ui.apiKey.value = stored.apiKey;
  }
}

async function run() {
  persist();

  const projectKey = String(ui.projectKey.value || '').trim();
  const apiKey = String(ui.apiKey.value || '').trim();
  const display = ui.display.value || 'verbose';
  const ids = parseIds(ui.ids.value);
  const parallel = Math.min(PARALLEL_DEFAULT, ids.length || 1);

  if (!projectKey || !apiKey || !ids.length) {
    setStatus('err', 'missing input');
    ui.viewer.textContent = 'Fehlt: projectKey / apiKey / ids';
    ui.downloadBtn.disabled = true;
    return;
  }

  setStatus('run', 'running');
  ui.viewer.textContent = '';
  ui.downloadBtn.disabled = true;
  state.lastJson = '';

  const results = {};
  let index = 0;

  async function worker() {
    while (index < ids.length) {
      const id = ids[index++];
      const url = buildContentUrl({ projectKey, id, display, apiKey });
      const result = await fetchText(url, { method: 'GET' });

      if (!result.ok) {
        results[id] = {
          _error: true,
          status: result.status,
          contentType: result.contentType,
          body: result.text,
        };
        continue;
      }

      try {
        results[id] = JSON.parse(result.text);
      } catch {
        results[id] = {
          _error: true,
          status: result.status,
          contentType: result.contentType,
          body: result.text,
        };
      }
    }
  }

  await Promise.all(Array.from({ length: parallel }, worker));

  const output = JSON.stringify(results, null, 2);
  state.lastJson = output;
  ui.viewer.textContent = output;
  ui.downloadBtn.disabled = false;
  setStatus('ok', 'done');
}

function download() {
  if (!state.lastJson) return;
  downloadText('outdooractive-data-lookup.json', state.lastJson, 'application/json');
}

function handleRememberToggle() {
  if (!ui.rememberKey.checked) {
    const stored = loadJson(STORAGE_KEY, {});
    stored.apiKey = '';
    stored.rememberKey = false;
    saveJson(STORAGE_KEY, stored);
  }
  persist();
}

function init() {
  if (!ui.statusPill) return;

  hydrate();
  setStatus('run', 'ready');
  ui.runBtn.addEventListener('click', run);
  ui.downloadBtn.addEventListener('click', download);
  ui.rememberKey.addEventListener('change', handleRememberToggle);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
